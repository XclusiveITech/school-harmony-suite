# Uniforms: Django/MySQL integration

The frontend is implemented, but these **new endpoints must be installed on your Django server** before catalogues, orders or statements can work. There is no Django source tree or reachable Django server in this workspace. This guide targets the models in BACKEND_FINANCE.md; adapt field names to your actual backend. Do not deploy without the integration tests listed below.

## Setup

Create a Django app named `uniforms`, install Pillow, add the app to INSTALLED_APPS, include its URLs at `/api/uniforms/`, then run `python manage.py makemigrations uniforms` and `python manage.py migrate`. Use MySQL InnoDB for transactions and row locks. Configure MEDIA_ROOT and MEDIA_URL, with production media served by your storage service. The student model needs `user = OneToOneField(settings.AUTH_USER_MODEL, ...)`. Every real student login account uses its registration number as username, and `/api/auth/token/` must accept that identifier. The frontend no longer uses the shared practice password.

## models.py

```python
from django.conf import settings
from django.db import models
from django.db.models import F, Q

class Category(models.Model):
    branch = models.ForeignKey('core.Branch', on_delete=models.PROTECT)
    name = models.CharField(max_length=100)
    class Meta:
        constraints = [models.UniqueConstraint(fields=['branch', 'name'], name='uniform_category_unique')]

class Product(models.Model):
    branch = models.ForeignKey('core.Branch', on_delete=models.PROTECT)
    category = models.ForeignKey(Category, on_delete=models.PROTECT)
    name = models.CharField(max_length=120)
    uniform_type = models.CharField(max_length=80)
    gender = models.CharField(max_length=8, choices=[('Male','Male'),('Female','Female'),('Unisex','Unisex')])
    levels = models.JSONField(default=list)
    image = models.ImageField(upload_to='uniforms/', blank=True, null=True)
    active = models.BooleanField(default=True)
    mandatory = models.BooleanField(default=False)

class Variant(models.Model):
    product = models.ForeignKey(Product, related_name='variants', on_delete=models.PROTECT)
    sku = models.CharField(max_length=60, unique=True)
    size = models.CharField(max_length=40)
    colour = models.CharField(max_length=60)
    currency = models.CharField(max_length=10)
    price = models.DecimalField(max_digits=12, decimal_places=2)
    stock = models.PositiveIntegerField(default=0)
    reserved = models.PositiveIntegerField(default=0)
    active = models.BooleanField(default=True)
    class Meta:
        constraints = [models.CheckConstraint(check=Q(stock__gte=F('reserved')), name='uniform_stock_reservations'), models.CheckConstraint(check=Q(price__gt=0), name='uniform_positive_price')]

class StarterEnrollment(models.Model):
    student = models.OneToOneField('students.Student', on_delete=models.PROTECT)
    created_at = models.DateTimeField(auto_now_add=True)

class StarterRequirement(models.Model):
    enrollment = models.ForeignKey(StarterEnrollment, related_name='requirements', on_delete=models.CASCADE)
    product = models.ForeignKey(Product, on_delete=models.PROTECT)
    required = models.PositiveIntegerField(default=2)
    class Meta:
        constraints = [models.UniqueConstraint(fields=['enrollment','product'], name='uniform_starter_product')]

class Order(models.Model):
    student = models.ForeignKey('students.Student', on_delete=models.PROTECT)
    reference = models.CharField(max_length=60, unique=True)
    request_key = models.UUIDField(unique=True)
    kind = models.CharField(max_length=10, choices=[('Starter','Starter'),('Extra','Extra')])
    status = models.CharField(max_length=30, default='Awaiting payment')
    currency = models.CharField(max_length=10)
    total = models.DecimalField(max_digits=12, decimal_places=2)
    paid = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    invoice = models.OneToOneField('finance.Invoice', on_delete=models.PROTECT)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    created_at = models.DateTimeField(auto_now_add=True)
    collected_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, null=True, related_name='+')
    collected_at = models.DateTimeField(null=True)

class OrderLine(models.Model):
    order = models.ForeignKey(Order, related_name='lines', on_delete=models.PROTECT)
    variant = models.ForeignKey(Variant, on_delete=models.PROTECT)
    description = models.CharField(max_length=200)
    quantity = models.PositiveIntegerField()
    unit_price = models.DecimalField(max_digits=12, decimal_places=2)
    total = models.DecimalField(max_digits=12, decimal_places=2)
    paid = models.DecimalField(max_digits=12, decimal_places=2, default=0)

class Payment(models.Model):
    order = models.ForeignKey(Order, related_name='payments', on_delete=models.PROTECT)
    request_key = models.UUIDField(unique=True)
    reference = models.CharField(max_length=60)
    method = models.CharField(max_length=30)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    status = models.CharField(max_length=10, default='Pending')
    receipt = models.OneToOneField('finance.Receipt', on_delete=models.PROTECT, null=True)
    confirmed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, null=True)
    class Meta:
        constraints = [models.UniqueConstraint(fields=['method','reference'], name='uniform_payment_reference_unique'), models.CheckConstraint(check=Q(amount__gt=0), name='uniform_payment_positive')]

class Allocation(models.Model):
    payment = models.ForeignKey(Payment, related_name='allocations', on_delete=models.PROTECT)
    line = models.ForeignKey(OrderLine, on_delete=models.PROTECT)
    amount = models.DecimalField(max_digits=12, decimal_places=2)

class Audit(models.Model):
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    action = models.CharField(max_length=80)
    object_id = models.CharField(max_length=80)
    detail = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)
```

## security.py

All writes are admin/accountant-only except students creating their own orders or submitting their own payment references. The portal **always** derives the student from `request.user`; never use a submitted student ID. Do not reuse the unrestricted IsAuthenticated-only finance examples for student access.

```python
from rest_framework.exceptions import PermissionDenied
from students.models import Student

def is_accounts(user):
    return user.is_superuser or getattr(user, 'role', '').lower() in ('superadmin','admin','accountant')

def require_accounts(user):
    if not is_accounts(user):
        raise PermissionDenied('Accounts permission required.')

def linked_student(user):
    try:
        return Student.objects.get(user=user)
    except Student.DoesNotExist:
        raise PermissionDenied('No linked student account. Contact the school office.')

def check_branch(user, branch_id):
    # Change branch_id accessor if your User schema uses another field.
    if not user.is_superuser and getattr(user, 'branch_id', None) != int(branch_id):
        raise PermissionDenied('This branch is not assigned to your account.')
```

## services.py — transactional stock and billing

Use your existing finance posting services instead of directly duplicating GL/cashbook transactions. Define `post_invoice(invoice, actor)`, `post_receipt(receipt, actor)`, and `reverse_invoice(invoice, actor)` in `finance.services`; they must update statuses and post/reverse the ledger **exactly once** inside the current transaction. They are project-specific integration points, not included in the simplistic BACKEND_FINANCE.md examples. The code below intentionally imports them so an unconfigured finance installation cannot silently skip ledger posting.

Configure `UNIFORM_REVENUE_GL_CODE`, `UNIFORM_PAYMENT_METHODS` (the existing globally configured names), and `UNIFORM_CURRENCIES` in settings. Do not invent school prices or accounts. Monetary calculations use Decimal, not floats.

```python
from decimal import Decimal, InvalidOperation
from uuid import UUID, uuid4
from django.conf import settings
from django.db import transaction
from django.db.models import Sum
from django.utils import timezone
from rest_framework.exceptions import ValidationError
from finance.models import Invoice, InvoiceLine, Receipt
from finance.services import post_invoice, post_receipt, reverse_invoice
from .models import Product, Variant, StarterEnrollment, StarterRequirement, Order, OrderLine, Payment, Allocation, Audit

ZERO = Decimal('0.00')

def record(actor, action, obj):
    Audit.objects.create(actor=actor, action=action, object_id=str(obj.pk))

def request_uuid(value):
    try:
        return UUID(str(value))
    except (ValueError, TypeError, AttributeError):
        raise ValidationError('A valid request_key UUID is required.')

def amount_value(value):
    try:
        amount = Decimal(str(value))
        if not amount.is_finite() or amount <= 0 or amount != amount.quantize(Decimal('0.01')):
            raise ValidationError('Amount must be positive with at most 2 decimal places.')
        return amount
    except (InvalidOperation, TypeError, ValueError):
        raise ValidationError('Invalid amount.')

def required_products(student):
    return [p for p in Product.objects.filter(branch=student.branch, active=True, mandatory=True)
            if p.gender in ('Unisex', student.gender) and (not p.levels or student.level in p.levels)]

@transaction.atomic
def enroll_starter(student):
    # Call ONLY when enrolling a new student, not when listing existing students.
    entry, created = StarterEnrollment.objects.get_or_create(student=student)
    if created:
        StarterRequirement.objects.bulk_create([StarterRequirement(enrollment=entry, product=p, required=2) for p in required_products(student)])
    return entry

def starter_rows(student):
    rows = []
    for r in StarterRequirement.objects.filter(enrollment__student=student).select_related('product'):
        purchased = OrderLine.objects.filter(order__student=student, variant__product=r.product).exclude(order__status='Cancelled').aggregate(n=Sum('quantity'))['n'] or 0
        rows.append({'product':r.product_id, 'name':r.product.name, 'required':r.required, 'purchased':purchased, 'remaining':max(0,r.required-purchased)})
    return rows

@transaction.atomic
def create_order(student, actor, data):
    # Serialize orders for one student, protecting starter completion and retries.
    student = type(student).objects.select_for_update().get(pk=student.pk)
    key = request_uuid(data.get('request_key'))
    existing = Order.objects.filter(request_key=key).first()
    if existing:
        if existing.student_id != student.pk or existing.created_by_id != actor.pk:
            raise ValidationError('Request key already used.')
        return existing
    selected = data.get('lines')
    if not isinstance(selected, list) or not selected or len(selected) > 100:
        raise ValidationError('Select 1–100 uniform variants.')
    ids = [l.get('variant') for l in selected if isinstance(l, dict)]
    if len(ids) != len(selected) or len(set(ids)) != len(ids) or any(type(i) is not int for i in ids):
        raise ValidationError('Each variant must be selected once with an integer ID.')
    # Stable lock ordering avoids deadlocks between simultaneous orders.
    variants = {v.pk:v for v in Variant.objects.select_for_update().filter(pk__in=ids).order_by('pk')}
    rows = []; currencies = set(); quantities = {}
    for line in selected:
        v = variants.get(line['variant']); q = line.get('quantity')
        if not v or not v.active or not v.product.active or v.product.branch_id != student.branch_id:
            raise ValidationError('Uniform unavailable in this student branch.')
        if type(q) is not int or q <= 0 or q > v.stock-v.reserved:
            raise ValidationError('Quantity exceeds available stock.')
        currencies.add(v.currency); rows.append((v,q)); quantities[v.product_id] = quantities.get(v.product_id,0)+q
    if len(currencies) != 1:
        raise ValidationError('Order currencies must match.')
    kind = data.get('kind')
    if kind not in ('Starter','Extra'):
        raise ValidationError('Unknown order type.')
    requirements = starter_rows(student)
    if kind == 'Starter' and (not requirements or any(quantities.get(r['product'],0) < r['remaining'] for r in requirements)):
        raise ValidationError('Complete all remaining paired starter requirements.')
    if kind == 'Starter' and any(pid not in [r['product'] for r in requirements] for pid in quantities):
        raise ValidationError('Purchase non-starter items as extras.')
    total = sum((v.price*q for v,q in rows), ZERO); currency = currencies.pop()
    code = settings.UNIFORM_REVENUE_GL_CODE
    invoice = Invoice.objects.create(student=student, invoice_number=f'UINV-{uuid4().hex[:20]}', date=timezone.localdate(), currency=currency, total=total, status='Draft')
    order = Order.objects.create(student=student, created_by=actor, reference=f'UNI-{uuid4().hex[:20]}', request_key=key, kind=kind, currency=currency, total=total, invoice=invoice)
    for v,q in rows:
        description = f'Uniform: {v.product.name} | {v.size} | {v.colour} x{q}'
        OrderLine.objects.create(order=order, variant=v, description=description, quantity=q, unit_price=v.price, total=v.price*q)
        InvoiceLine.objects.create(invoice=invoice, description=description, gl_account_code=code, amount=v.price*q)
        v.reserved += q; v.save(update_fields=['reserved'])
    post_invoice(invoice, actor); record(actor,'order-created',order)
    return order

@transaction.atomic
def submit_payment(order, actor, data):
    order = Order.objects.select_for_update().get(pk=order.pk)
    key = request_uuid(data.get('request_key'))
    existing = Payment.objects.filter(request_key=key).first()
    if existing:
        if existing.order_id != order.pk: raise ValidationError('Request key already used.')
        return existing
    amount = amount_value(data.get('amount'))
    reference = str(data.get('reference','')).strip(); method = data.get('method')
    if not reference or len(reference) > 60 or method not in settings.UNIFORM_PAYMENT_METHODS:
        raise ValidationError('A valid payment method and reference are required.')
    pending = order.payments.filter(status='Pending').aggregate(n=Sum('amount'))['n'] or ZERO
    if order.status != 'Awaiting payment' or amount > order.total-order.paid-pending:
        raise ValidationError('Payment exceeds the unsubmitted outstanding amount.')
    if Payment.objects.filter(method=method, reference=reference).exists():
        raise ValidationError('Payment reference already submitted.')
    payment = Payment.objects.create(order=order, amount=amount, method=method, reference=reference, request_key=key)
    record(actor,'payment-submitted',payment); return payment

@transaction.atomic
def decide_payment(order, payment_id, actor, confirm):
    order = Order.objects.select_for_update().get(pk=order.pk)
    payment = Payment.objects.select_for_update().get(pk=payment_id, order=order)
    if payment.status == ('Confirmed' if confirm else 'Rejected'): return order
    if payment.status != 'Pending' or order.status != 'Awaiting payment':
        raise ValidationError('Payment cannot be changed.')
    if not confirm:
        payment.status='Rejected'; payment.save(update_fields=['status']); record(actor,'payment-rejected',payment); return order
    if payment.amount > order.total-order.paid: raise ValidationError('Payment exceeds outstanding balance.')
    # Accounts must verify the reference against the bank/cash records before this action.
    receipt = Receipt.objects.create(student=order.student, receipt_number=f'UREC-{uuid4().hex[:20]}', date=timezone.localdate(), currency=order.currency, amount=payment.amount, reference=payment.reference, payment_mode=payment.method, description=f'Uniform order {order.reference}', status='Draft')
    remaining=payment.amount
    for line in order.lines.select_for_update().order_by('pk'):
        applied=min(remaining,line.total-line.paid)
        if applied>0:
            Allocation.objects.create(payment=payment,line=line,amount=applied); line.paid+=applied; line.save(update_fields=['paid']); remaining-=applied
    if remaining != ZERO: raise ValidationError('Payment allocation mismatch.')
    post_receipt(receipt,actor)
    payment.status='Confirmed'; payment.receipt=receipt; payment.confirmed_by=actor; payment.save()
    order.paid+=payment.amount; order.status='Ready' if order.paid==order.total else 'Awaiting payment'; order.save()
    record(actor,'payment-confirmed',payment); return order

@transaction.atomic
def collect_order(order, actor, reference):
    order=Order.objects.select_for_update().get(pk=order.pk)
    if reference != order.reference: raise ValidationError('Collection reference does not match.')
    if order.status=='Collected': return order
    if order.status!='Ready' or order.paid!=order.total: raise ValidationError('Full confirmed payment is required.')
    lines=list(order.lines.order_by('variant_id'))
    locked={v.pk:v for v in Variant.objects.select_for_update().filter(pk__in=[l.variant_id for l in lines]).order_by('pk')}
    for line in lines:
        v=locked[line.variant_id]
        if v.stock<line.quantity or v.reserved<line.quantity: raise ValidationError('Stock reservation mismatch.')
        v.stock-=line.quantity; v.reserved-=line.quantity; v.save(update_fields=['stock','reserved'])
    order.status='Collected'; order.collected_by=actor; order.collected_at=timezone.now(); order.save()
    record(actor,'order-collected',order); return order

@transaction.atomic
def cancel_order(order, actor):
    order=Order.objects.select_for_update().get(pk=order.pk)
    if order.status=='Cancelled': return order
    if order.paid>0 or order.status!='Awaiting payment': raise ValidationError('Paid orders require the finance refund workflow.')
    lines=list(order.lines.order_by('variant_id'))
    locked={v.pk:v for v in Variant.objects.select_for_update().filter(pk__in=[l.variant_id for l in lines]).order_by('pk')}
    for line in lines:
        v=locked[line.variant_id]; v.reserved-=line.quantity; v.save(update_fields=['reserved'])
    order.payments.filter(status='Pending').update(status='Rejected')
    reverse_invoice(order.invoice,actor); order.status='Cancelled'; order.save(); record(actor,'order-cancelled',order)
    return order
```

## Response contract and endpoint installation

Implement DRF serializers and authenticated views exposing the following contract. All decimal fields serialize as strings. Paginated results are not used for the snapshot. Return clear 400 errors for validations, 403 for access violations and 404 for missing objects. Fetch orders through a scoped queryset before invoking a service; do not load by global ID and check afterwards.

| Method / endpoint | Required behavior |
|---|---|
| GET `dashboard/?branch=ID` | Accounts-only; check_branch; snapshot below |
| GET `portal/` | linked_student; snapshot scoped to their branch and their own orders |
| POST `categories/` | Accounts-only; branch/name; unique within branch |
| POST / PATCH `products/` / `products/ID/` | Accounts-only; branch/category/name/uniform_type/gender/levels/mandatory/active; reject cross-branch category; validate levels list and gender |
| POST / PATCH `variants/` / `variants/ID/` | Accounts-only; product/sku/size/colour/price/currency/stock/active; lock row; never accept reserved; reject stock below reserved or non-integer stock; configured currencies only |
| POST `products/ID/image/` | Accounts-only; MultiPartParser; validate with ImageField/Pillow; limit 5 MB; random server filename; block SVG/scripts; return absolute image URL |
| GET `starter/STUDENT/` | Accounts-only; check student's branch; return starter_rows(student) |
| POST `orders/` | Accounts-only; resolve student from payload and check branch; create_order |
| POST `portal/orders/` | linked_student only; reject/ignore student field; create_order |
| POST `orders/ID/payments/` / `portal/orders/ID/payments/` | staff scoped / linked student owner; submit_payment; pending only |
| POST `orders/ID/payments/PID/confirm/` / `reject/` | Accounts-only; verify owner branch; decide_payment; return serialized order |
| POST `orders/ID/collect/` | Accounts-only; collect_order, reference required |
| POST `orders/ID/cancel/` / `portal/orders/ID/cancel/` | staff scoped / student owner; cancel_order |
| GET `portal/session/` | linked_student; return camelCase student profile compatible with StudentPortalLayout (below) |
| GET `portal/statement/` | linked_student; consolidated statement below |

Snapshot structure matches `src/lib/uniforms-api.ts`:

```json
{
  "categories": [{"id": 1, "name": "Daily wear"}],
  "products": [{"id": 1, "name": "Shirt", "category": 1, "category_name": "Daily wear", "uniform_type": "Shirt", "gender": "Unisex", "levels": [], "image": null, "active": true, "mandatory": true, "variants": []}],
  "orders": [], "starter_requirements": [], "payment_methods": [], "currencies": []
}
```

Numbers above illustrate the response shape only; do not seed invented inventory or prices. Category/variant writes must emit an Audit entry inside their transaction. Variant output includes id, product, sku, size, colour, price, currency, stock, reserved, available=`stock-reserved`, active. Student catalogues should hide inactive products/variants.

Order output includes id, reference, student, student_name, student_no, created_at, kind, status, total, paid, balance=`total-paid`, currency, invoice_number, lines and payments. Each line includes id, variant, description, quantity, unit_price, total, paid. Each payment includes id, reference, method, amount, status, receipt_number and allocations (`line`, `description`, `amount`). Build allocations from payment.allocations.select_related('line').

`portal/session/` returns:

```python
s = linked_student(request.user)
return Response({
    'id':str(s.pk), 'regNumber':s.student_no, 'firstName':s.first_name,
    'lastName':s.last_name, 'gender':s.gender, 'level':s.level,
    'className':s.class_name, 'boardingStatus':s.residence, 'status':s.status,
    'parentName':s.guardian_name, 'parentEmail':s.guardian_email,
    'parentPhone':s.guardian_phone,
})
```

## Enrollment integration

Inside your existing student serializer/view create transaction, call `enroll_starter(student)` after saving the new student. It snapshots applicable mandatory uniforms, a quantity of **2 each**, by branch, gender and level, once only. Do not retroactively create requirements for all existing students. Accounts may deliberately opt a transferred/new intake student in by calling this service. Configure the catalog's mandatory products before intake. Enrollment creates requirements, not an arbitrary-size invoice: students or Accounts select actual sizes/colours before ordering. `starter_rows` counts non-cancelled orders toward purchase completion so refresh/retries cannot duplicate the paired set. Cancelled orders restore requirements. Extras are separately allowed.

## Consolidated statement implementation

Implement `portal/statement/` using **all** of the linked student's processed finance invoices and processed receipts, not uniform orders alone. Emit one debit per invoice line (including each uniform size/colour/quantity) and one credit per receipt. Uniform receipt allocations are attached to that credit, not counted as additional credits. Include currency in every row; keep an independent running balance per currency. Pending/rejected references must not reduce the balance. Sort by date, creation time and PK before calculating balances. Do not append uniform orders a second time: they already have finance invoices and receipts.

Example service for the finance models in BACKEND_FINANCE.md:

```python
from collections import defaultdict
from decimal import Decimal
from finance.models import Invoice, Receipt
from .models import Payment

def statement_for(student):
    rows=[]
    for inv in Invoice.objects.filter(student=student,status='Processed').prefetch_related('lines').order_by('date','pk'):
        for line in inv.lines.order_by('pk'):
            rows.append({'date':str(inv.date),'description':line.description,'reference':inv.invoice_number,'currency':inv.currency,'debit':line.amount,'credit':Decimal('0'),'category':'Uniforms' if line.description.startswith('Uniform:') else 'School billing','sort':(str(inv.date),str(inv.created_at),0,inv.pk,line.pk)})
    payments={p.receipt_id:p for p in Payment.objects.filter(order__student=student,status='Confirmed').prefetch_related('allocations__line')}
    for rec in Receipt.objects.filter(student=student,status='Processed').order_by('date','pk'):
        payment=payments.get(rec.pk)
        allocations=[{'description':a.line.description,'amount':str(a.amount)} for a in payment.allocations.all()] if payment else []
        rows.append({'date':str(rec.date),'description':rec.description or f'Payment - {rec.payment_mode}','reference':rec.receipt_number,'currency':rec.currency,'debit':Decimal('0'),'credit':rec.amount,'category':'Uniform payment' if payment else 'School payment','allocations':allocations,'sort':(str(rec.date),str(rec.created_at),1,rec.pk,0)})
    balances=defaultdict(lambda:Decimal('0'))
    rows.sort(key=lambda row:row['sort'])
    for row in rows:
        row.pop('sort'); c=row['currency']; balances[c]+=row['debit']-row['credit']; row['balance']=str(balances[c]); row['debit']=str(row['debit']); row['credit']=str(row['credit'])
    return {'currencies':sorted(balances),'lines':rows}
```

Your staff fees-statement and balance endpoints must read the same processed invoices/receipts, preserve currencies and expose the uniform allocations. Existing invoice, receipt, debtors and financial report screens then reflect these charges through their normal endpoints. Ensure existing finance endpoints do not permit arbitrary edits/cancellation of uniform-owned documents; route those through the uniform service so stock and billing remain consistent.

## Required server tests before going live

- An actual student JWT can read only their own orders and statement; another student's ID in URL/body is rejected; staff without Accounts permission cannot mutate; cross-branch Accounts requests rejected.
- Two simultaneous orders cannot reserve more than stock; duplicate request_key returns the original order/invoice; fail finance posting and prove stock/order/invoice all roll back.
- Starter requirements snapshot 2 of every applicable mandatory product once for a new student; existing students are untouched; retry enrollment cannot duplicate requirements; gender/level rules respected.
- Invoice prices are fetched from locked variants, not client totals; currency mixing, negative amounts, fractional quantities and inactive variants rejected.
- A pending payment does not reduce debt; repeat confirmation creates only one receipt/posting; rejected reference creates none; partial payment allocations sum exactly to receipt amount.
- Collection requires full confirmed payment and exact reference, decrements stock/reservations once, and remains idempotent on retry.
- Cancel an unpaid order and verify released stock plus finance reversal; paid cancellation is blocked.
- Consolidated statement contains school fees AND itemised uniform charges; each receipt appears exactly once; balances independent per currency.
- Image upload accepts real raster images, rejects spoofed content/oversize/SVG, returns a usable URL and is restricted to Accounts.

## Verification status

Client business-rule tests are in `src/lib/uniforms-rules.test.ts`. The Django server at localhost:8000 is unreachable in this workspace; endpoint installation, MySQL persistence, real login, media upload and finance posting cannot be verified here. No real payment processor is connected: students pay separately and Accounts manually confirms references, as requested.
