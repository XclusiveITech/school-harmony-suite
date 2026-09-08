# Backend: Finance (invoices, receipts/payments, balances)

Django app `finance`, mounted at `/api/finance/`. The frontend client is
`src/lib/finance-api.ts`; the pages are `src/pages/finance/Invoices.tsx` and
`src/pages/finance/Receipts.tsx`.

## models.py

```python
from django.db import models
from students.models import Student

STATUS = [('Draft', 'Draft'), ('Processed', 'Processed'), ('Cancelled', 'Cancelled')]


class GLAccount(models.Model):
    code = models.CharField(max_length=20, unique=True)
    name = models.CharField(max_length=120)
    type = models.CharField(max_length=30)  # Asset / Liability / Equity / Revenue / Expense

    def __str__(self):
        return f'{self.code} {self.name}'


class Invoice(models.Model):
    invoice_number = models.CharField(max_length=30, unique=True, blank=True)
    date = models.DateField()
    student = models.ForeignKey(Student, on_delete=models.PROTECT, related_name='invoices')
    currency = models.CharField(max_length=10, default='USD')
    total = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    status = models.CharField(max_length=12, choices=STATUS, default='Draft')
    created_at = models.DateTimeField(auto_now_add=True)

    def recalc(self):
        self.total = sum(l.amount for l in self.lines.all())

    def save(self, *args, **kwargs):
        if not self.invoice_number:
            n = Invoice.objects.count() + 1
            self.invoice_number = f'INV-{n:04d}'
        super().save(*args, **kwargs)


class InvoiceLine(models.Model):
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name='lines')
    description = models.CharField(max_length=200)
    gl_account_code = models.CharField(max_length=20)
    amount = models.DecimalField(max_digits=12, decimal_places=2)


class Receipt(models.Model):
    receipt_number = models.CharField(max_length=30, unique=True, blank=True)
    date = models.DateField()
    student = models.ForeignKey(Student, on_delete=models.PROTECT, related_name='receipts')
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    payment_mode = models.CharField(max_length=30)
    currency = models.CharField(max_length=10, default='USD')
    reference = models.CharField(max_length=60, blank=True)
    description = models.CharField(max_length=200, blank=True)
    status = models.CharField(max_length=12, choices=STATUS, default='Draft')
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        if not self.receipt_number:
            n = Receipt.objects.count() + 1
            self.receipt_number = f'REC-{n:04d}'
        super().save(*args, **kwargs)
```

## serializers.py

```python
from rest_framework import serializers
from .models import GLAccount, Invoice, InvoiceLine, Receipt


class GLAccountSerializer(serializers.ModelSerializer):
    class Meta:
        model = GLAccount
        fields = '__all__'


class InvoiceLineSerializer(serializers.ModelSerializer):
    class Meta:
        model = InvoiceLine
        fields = ['id', 'description', 'gl_account_code', 'amount']


class InvoiceSerializer(serializers.ModelSerializer):
    lines = InvoiceLineSerializer(many=True)
    student_name = serializers.SerializerMethodField()
    student_no = serializers.CharField(source='student.student_no', read_only=True)

    class Meta:
        model = Invoice
        fields = ['id', 'invoice_number', 'date', 'student', 'student_name', 'student_no',
                  'currency', 'total', 'status', 'lines']
        read_only_fields = ['invoice_number', 'total']

    def get_student_name(self, obj):
        return f'{obj.student.first_name} {obj.student.last_name}'

    def create(self, validated):
        lines = validated.pop('lines', [])
        invoice = Invoice.objects.create(**validated)
        for line in lines:
            InvoiceLine.objects.create(invoice=invoice, **line)
        invoice.recalc()
        invoice.save()
        return invoice


class ReceiptSerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField()
    student_no = serializers.CharField(source='student.student_no', read_only=True)

    class Meta:
        model = Receipt
        fields = '__all__'
        read_only_fields = ['receipt_number']

    def get_student_name(self, obj):
        return f'{obj.student.first_name} {obj.student.last_name}'
```

## views.py

```python
from django.db.models import Sum
from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from students.models import Student
from .models import GLAccount, Invoice, Receipt
from .serializers import GLAccountSerializer, InvoiceSerializer, ReceiptSerializer


class GLAccountViewSet(viewsets.ModelViewSet):
    queryset = GLAccount.objects.all().order_by('code')
    serializer_class = GLAccountSerializer
    permission_classes = [permissions.IsAuthenticated]


class InvoiceViewSet(viewsets.ModelViewSet):
    queryset = Invoice.objects.prefetch_related('lines').select_related('student').order_by('-date', '-id')
    serializer_class = InvoiceSerializer
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        inv = self.get_object(); inv.status = 'Cancelled'; inv.save()
        return Response(self.get_serializer(inv).data)

    @action(detail=True, methods=['post'])
    def process(self, request, pk=None):
        inv = self.get_object(); inv.status = 'Processed'; inv.save()
        return Response(self.get_serializer(inv).data)


class ReceiptViewSet(viewsets.ModelViewSet):
    queryset = Receipt.objects.select_related('student').order_by('-date', '-id')
    serializer_class = ReceiptSerializer
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        rec = self.get_object(); rec.status = 'Cancelled'; rec.save()
        return Response(self.get_serializer(rec).data)

    @action(detail=True, methods=['post'])
    def process(self, request, pk=None):
        rec = self.get_object(); rec.status = 'Processed'; rec.save()
        return Response(self.get_serializer(rec).data)


class BalanceList(APIView):
    """GET /api/finance/balance/ — invoiced vs paid per student."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        rows = []
        for s in Student.objects.all():
            invoiced = s.invoices.filter(status='Processed').aggregate(t=Sum('total'))['t'] or 0
            paid = s.receipts.filter(status='Processed').aggregate(t=Sum('amount'))['t'] or 0
            rows.append({
                'student': s.id,
                'student_name': f'{s.first_name} {s.last_name}',
                'student_no': s.student_no,
                'invoiced': invoiced,
                'paid': paid,
                'balance': invoiced - paid,
            })
        return Response(rows)
```

## urls.py

```python
from rest_framework.routers import DefaultRouter
from django.urls import path, include
from .views import GLAccountViewSet, InvoiceViewSet, ReceiptViewSet, BalanceList

router = DefaultRouter()
router.register('glaccount', GLAccountViewSet)
router.register('invoice', InvoiceViewSet)
router.register('receipt', ReceiptViewSet)

urlpatterns = [
    path('balance/', BalanceList.as_view()),
    path('', include(router.urls)),
]
```

Project `urls.py`: `path('api/finance/', include('finance.urls'))`.

If `/api/finance/balance/` is missing, the frontend falls back to computing
balances from the invoices and receipts it already fetched.

## MySQL DDL

```sql
CREATE TABLE finance_glaccount (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(20) NOT NULL UNIQUE,
  name VARCHAR(120) NOT NULL,
  type VARCHAR(30) NOT NULL
);

CREATE TABLE finance_invoice (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  invoice_number VARCHAR(30) NOT NULL UNIQUE,
  date DATE NOT NULL,
  student_id BIGINT NOT NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'USD',
  total DECIMAL(12,2) NOT NULL DEFAULT 0,
  status VARCHAR(12) NOT NULL DEFAULT 'Draft',
  created_at DATETIME(6) NOT NULL,
  CONSTRAINT fk_inv_student FOREIGN KEY (student_id) REFERENCES students_student(id)
);

CREATE TABLE finance_invoiceline (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  invoice_id BIGINT NOT NULL,
  description VARCHAR(200) NOT NULL,
  gl_account_code VARCHAR(20) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  CONSTRAINT fk_line_invoice FOREIGN KEY (invoice_id) REFERENCES finance_invoice(id) ON DELETE CASCADE
);

CREATE TABLE finance_receipt (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  receipt_number VARCHAR(30) NOT NULL UNIQUE,
  date DATE NOT NULL,
  student_id BIGINT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  payment_mode VARCHAR(30) NOT NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'USD',
  reference VARCHAR(60) NOT NULL DEFAULT '',
  description VARCHAR(200) NOT NULL DEFAULT '',
  status VARCHAR(12) NOT NULL DEFAULT 'Draft',
  created_at DATETIME(6) NOT NULL,
  CONSTRAINT fk_rec_student FOREIGN KEY (student_id) REFERENCES students_student(id)
);
```
