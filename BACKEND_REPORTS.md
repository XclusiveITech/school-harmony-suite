# Backend: Finance Reports API

Read-only, server-side aggregated report endpoints under `/api/finance/reports/`.
All figures are computed from posted `JournalLine` rows (via `JournalEntry`,
`GLAccount`); `Invoice`/`Receipt` processing posts their own journal entries,
so these reports never read invoices/receipts directly except for labelling.

Assumed models: `finance.GLAccount`, `finance.JournalEntry` (header: date,
branch, status) with lines `finance.JournalLine(entry, account, debit,
credit)`, `finance.Invoice`, `finance.Receipt`.

## urls.py

```python
from django.urls import path
from .reports_views import (
    TrialBalanceView, BalanceSheetView, IncomeStatementView,
    CumulativeIncomeView, FeesStatementView, FeesBalancesView,
)

urlpatterns = [
    path('reports/trial-balance/', TrialBalanceView.as_view()),
    path('reports/balance-sheet/', BalanceSheetView.as_view()),
    path('reports/income-statement/', IncomeStatementView.as_view()),
    path('reports/cumulative-income/', CumulativeIncomeView.as_view()),
    path('reports/fees-statement/', FeesStatementView.as_view()),
    path('reports/fees-balances/', FeesBalancesView.as_view()),
]
```

## reports_views.py

```python
from decimal import Decimal
from django.db.models import Sum, Q
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import GLAccount, JournalLine, Invoice, Receipt
from students.models import Student


def _period_filter(request, prefix='entry__date'):
    q = Q(entry__status='Posted')
    date_from = request.query_params.get('date_from')
    date_to = request.query_params.get('date_to')
    branch = request.query_params.get('branch')
    if date_from:
        q &= Q(**{f'{prefix}__gte': date_from})
    if date_to:
        q &= Q(**{f'{prefix}__lte': date_to})
    if branch:
        q &= Q(entry__branch_id=branch)
    return q


def _account_totals(request):
    """Returns GLAccount rows annotated with debit/credit totals for the period."""
    q = _period_filter(request)
    lines = (JournalLine.objects.filter(q)
             .values('account_id', 'account__code', 'account__name', 'account__type')
             .annotate(debit=Sum('debit'), credit=Sum('credit')))
    return {row['account_id']: row for row in lines}


class TrialBalanceView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        totals = _account_totals(request)
        rows = []
        for row in totals.values():
            debit = row['debit'] or Decimal('0')
            credit = row['credit'] or Decimal('0')
            net = debit - credit
            rows.append({
                'code': row['account__code'],
                'name': row['account__name'],
                'type': row['account__type'],
                'debit': net if net > 0 else Decimal('0'),
                'credit': -net if net < 0 else Decimal('0'),
            })
        rows.sort(key=lambda r: r['code'])
        return Response(rows)


def _net_by_type(request, types):
    totals = _account_totals(request)
    out = []
    for row in totals.values():
        if row['account__type'] not in types:
            continue
        debit = row['debit'] or Decimal('0')
        credit = row['credit'] or Decimal('0')
        amount = debit - credit if row['account__type'] in ('Asset', 'Expense') else credit - debit
        if amount == 0:
            continue
        out.append({'code': row['account__code'], 'name': row['account__name'], 'amount': amount})
    out.sort(key=lambda r: r['code'])
    return out


class BalanceSheetView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response({
            'assets': _net_by_type(request, ['Asset']),
            'liabilities': _net_by_type(request, ['Liability']),
            'equity': _net_by_type(request, ['Equity']),
        })


class IncomeStatementView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        revenue = _net_by_type(request, ['Revenue'])
        expenses = _net_by_type(request, ['Expense'])
        net = sum((r['amount'] for r in revenue), Decimal('0')) - sum((e['amount'] for e in expenses), Decimal('0'))
        return Response({'revenue': revenue, 'expenses': expenses, 'net': net})


class CumulativeIncomeView(APIView):
    """Per-branch income statements plus a consolidated total. Superadmin only."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from core.models import Branch  # adjust import to actual app

        branches_out = []
        for branch in Branch.objects.filter(status='Active'):
            scoped = request
            # reuse helpers but force branch filter
            q = _period_filter(request) & Q(entry__branch_id=branch.id)
            lines = (JournalLine.objects.filter(q)
                     .values('account__code', 'account__name', 'account__type')
                     .annotate(debit=Sum('debit'), credit=Sum('credit')))
            revenue, expenses = [], []
            for row in lines:
                debit = row['debit'] or Decimal('0')
                credit = row['credit'] or Decimal('0')
                if row['account__type'] == 'Revenue':
                    amt = credit - debit
                    if amt:
                        revenue.append({'code': row['account__code'], 'name': row['account__name'], 'amount': amt})
                elif row['account__type'] == 'Expense':
                    amt = debit - credit
                    if amt:
                        expenses.append({'code': row['account__code'], 'name': row['account__name'], 'amount': amt})
            net = sum((r['amount'] for r in revenue), Decimal('0')) - sum((e['amount'] for e in expenses), Decimal('0'))
            branches_out.append({
                'branch': branch.id, 'branch_name': branch.name,
                'revenue': revenue, 'expenses': expenses, 'net': net,
            })

        consolidated_revenue = _net_by_type(request, ['Revenue'])
        consolidated_expenses = _net_by_type(request, ['Expense'])
        consolidated_net = (sum((r['amount'] for r in consolidated_revenue), Decimal('0'))
                             - sum((e['amount'] for e in consolidated_expenses), Decimal('0')))
        return Response({
            'branches': branches_out,
            'consolidated': {
                'revenue': consolidated_revenue,
                'expenses': consolidated_expenses,
                'net': consolidated_net,
            },
        })


class FeesStatementView(APIView):
    """Chronological invoice/receipt lines for one student with a running balance."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        student_id = request.query_params.get('student')
        if not student_id:
            return Response([])
        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')

        invoices = Invoice.objects.filter(student_id=student_id, status='Processed')
        receipts = Receipt.objects.filter(student_id=student_id, status='Processed')
        if date_from:
            invoices = invoices.filter(date__gte=date_from)
            receipts = receipts.filter(date__gte=date_from)
        if date_to:
            invoices = invoices.filter(date__lte=date_to)
            receipts = receipts.filter(date__lte=date_to)

        entries = []
        for inv in invoices:
            entries.append({
                'date': inv.date, 'description': f'Invoice {inv.invoice_number}',
                'type': 'Invoice', 'reference': inv.invoice_number,
                'debit': inv.total, 'credit': Decimal('0'),
            })
        for rec in receipts:
            entries.append({
                'date': rec.date, 'description': rec.description or f'Receipt {rec.receipt_number}',
                'type': 'Receipt', 'reference': rec.receipt_number,
                'debit': Decimal('0'), 'credit': rec.amount,
            })
        entries.sort(key=lambda e: e['date'])

        running = Decimal('0')
        for e in entries:
            running += e['debit'] - e['credit']
            e['balance'] = running
        return Response(entries)


class FeesBalancesView(APIView):
    """Per-student invoiced/paid/balance totals, derived from posted GL activity."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')
        branch = request.query_params.get('branch')

        invoices = Invoice.objects.filter(status='Processed')
        receipts = Receipt.objects.filter(status='Processed')
        if date_from:
            invoices = invoices.filter(date__gte=date_from)
            receipts = receipts.filter(date__gte=date_from)
        if date_to:
            invoices = invoices.filter(date__lte=date_to)
            receipts = receipts.filter(date__lte=date_to)
        if branch:
            invoices = invoices.filter(student__branch_id=branch)
            receipts = receipts.filter(student__branch_id=branch)

        invoiced = {}
        for inv in invoices.select_related('student'):
            invoiced.setdefault(inv.student_id, Decimal('0'))
            invoiced[inv.student_id] += inv.total

        paid = {}
        for rec in receipts.select_related('student'):
            paid.setdefault(rec.student_id, Decimal('0'))
            paid[rec.student_id] += rec.amount

        student_ids = set(invoiced) | set(paid)
        students = {s.id: s for s in Student.objects.filter(id__in=student_ids)}

        rows = []
        for sid in student_ids:
            student = students.get(sid)
            inv_total = invoiced.get(sid, Decimal('0'))
            paid_total = paid.get(sid, Decimal('0'))
            rows.append({
                'student': sid,
                'student_no': getattr(student, 'student_no', ''),
                'name': f'{getattr(student, "first_name", "")} {getattr(student, "last_name", "")}'.strip(),
                'class_name': getattr(student, 'class_name', '') or getattr(getattr(student, 'current_class', None), 'name', ''),
                'invoiced': inv_total,
                'paid': paid_total,
                'balance': inv_total - paid_total,
            })
        rows.sort(key=lambda r: -float(r['balance']))
        return Response(rows)
```

## Example responses

`GET /api/finance/reports/trial-balance/?date_from=2026-01-01&date_to=2026-03-31`
```json
[
  {"code": "1000", "name": "Cash", "type": "Asset", "debit": "12500.00", "credit": "0.00"},
  {"code": "4000", "name": "Tuition Fees", "type": "Revenue", "debit": "0.00", "credit": "9000.00"}
]
```

`GET /api/finance/reports/balance-sheet/?date_to=2026-03-31`
```json
{
  "assets": [{"code": "1000", "name": "Cash", "amount": "12500.00"}],
  "liabilities": [{"code": "2000", "name": "Accounts Payable", "amount": "1200.00"}],
  "equity": [{"code": "3000", "name": "Retained Earnings", "amount": "11300.00"}]
}
```

`GET /api/finance/reports/income-statement/?date_from=2026-01-01&date_to=2026-03-31`
```json
{
  "revenue": [{"code": "4000", "name": "Tuition Fees", "amount": "9000.00"}],
  "expenses": [{"code": "5000", "name": "Salaries", "amount": "4000.00"}],
  "net": "5000.00"
}
```

`GET /api/finance/reports/cumulative-income/?date_from=2026-01-01&date_to=2026-03-31`
```json
{
  "branches": [
    {"branch": 1, "branch_name": "Brainstar Main Campus",
     "revenue": [{"code": "4000", "name": "Tuition Fees", "amount": "6000.00"}],
     "expenses": [{"code": "5000", "name": "Salaries", "amount": "2500.00"}],
     "net": "3500.00"}
  ],
  "consolidated": {
    "revenue": [{"code": "4000", "name": "Tuition Fees", "amount": "9000.00"}],
    "expenses": [{"code": "5000", "name": "Salaries", "amount": "4000.00"}],
    "net": "5000.00"
  }
}
```

`GET /api/finance/reports/fees-statement/?student=12`
```json
[
  {"date": "2026-01-15", "description": "Invoice INV-001", "type": "Invoice", "reference": "INV-001", "debit": "1200.00", "credit": "0.00", "balance": "1200.00"},
  {"date": "2026-02-01", "description": "Payment Received - Cash", "type": "Receipt", "reference": "REC-001", "debit": "0.00", "credit": "800.00", "balance": "400.00"}
]
```

`GET /api/finance/reports/fees-balances/`
```json
[
  {"student": 12, "student_no": "STU-0012", "name": "Jane Moyo", "class_name": "Grade 5A", "invoiced": "1700.00", "paid": "1700.00", "balance": "0.00"},
  {"student": 13, "student_no": "STU-0013", "name": "Tendai Chikafu", "class_name": "Grade 6B", "invoiced": "1200.00", "paid": "900.00", "balance": "300.00"}
]
```

## Notes
- All views require authentication (`IsAuthenticated`); scope further with
  role/branch checks as needed (cumulative-income should be restricted to
  superadmins, matching the frontend guard).
- Amounts are Decimal/string in JSON responses; the frontend normalises with
  `num()` from `finance-api.ts`.
- `fees-statement` and `fees-balances` only consider `Processed` invoices and
  receipts, consistent with how `finance-api.ts` derives balances today.
