# Backend: Payables (Suppliers, Bills, Payments)

Django app `finance`, mounted at `/api/finance/`. The frontend client is
`src/lib/payables-api.ts`.

## models.py

```python
from django.db import models
from students.models import Student
from .models import Receipt

BILL_STATUS = [('Unpaid', 'Unpaid'), ('Partial', 'Partial'), ('Paid', 'Paid'), ('Cancelled', 'Cancelled')]

class Supplier(models.Model):
    code = models.CharField(max_length=20, unique=True)
    name = models.CharField(max_length=120)
    contact = models.CharField(max_length=100, blank=True, null=True)
    phone = models.CharField(max_length=20, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    bank_details = models.TextField(blank=True, null=True)
    tax_number = models.CharField(max_length=50, blank=True, null=True)
    payment_terms = models.IntegerField(default=30)
    status = models.CharField(max_length=10, default='Active')

class SupplierBill(models.Model):
    supplier = models.ForeignKey(Supplier, on_delete=models.PROTECT, related_name='bills')
    bill_no = models.CharField(max_length=50)
    date = models.DateField()
    due_date = models.DateField()
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    paid = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    currency = models.CharField(max_length=10, default='USD')
    description = models.TextField(blank=True)
    gl_account_code = models.CharField(max_length=20, blank=True, null=True)
    status = models.CharField(max_length=12, choices=BILL_STATUS, default='Unpaid')

class SupplierPayment(models.Model):
    supplier = models.ForeignKey(Supplier, on_delete=models.PROTECT, related_name='payments')
    bill = models.ForeignKey(SupplierBill, on_delete=models.SET_NULL, null=True, blank=True, related_name='payments')
    date = models.DateField()
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    method = models.CharField(max_length=30)
    reference = models.CharField(max_length=60, blank=True, null=True)
    description = models.TextField(blank=True, null=True)

class SupplierStatementLine(models.Model):
    supplier = models.ForeignKey(Supplier, on_delete=models.CASCADE, related_name='statement_lines')
    date = models.DateField()
    reference = models.CharField(max_length=60, blank=True, null=True)
    description = models.TextField(blank=True, null=True)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    matched = models.BooleanField(default=False)
    matched_bill = models.ForeignKey(SupplierBill, on_delete=models.SET_NULL, null=True, blank=True)

class DebtorStatementLine(models.Model):
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='statement_lines')
    date = models.DateField()
    description = models.CharField(max_length=255)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    reference = models.CharField(max_length=60, blank=True, null=True)
    matched_receipt = models.ForeignKey(Receipt, on_delete=models.SET_NULL, null=True, blank=True)
```

## serializers.py

```python
from rest_framework import serializers
from .models import Supplier, SupplierBill, SupplierPayment, SupplierStatementLine, DebtorStatementLine

class SupplierSerializer(serializers.ModelSerializer):
    class Meta:
        model = Supplier
        fields = '__all__'

class SupplierBillSerializer(serializers.ModelSerializer):
    supplier_name = serializers.CharField(source='supplier.name', read_only=True)
    class Meta:
        model = SupplierBill
        fields = '__all__'

class SupplierPaymentSerializer(serializers.ModelSerializer):
    supplier_name = serializers.CharField(source='supplier.name', read_only=True)
    class Meta:
        model = SupplierPayment
        fields = '__all__'

    def create(self, validated_data):
        payment = SupplierPayment.objects.create(**validated_data)
        if payment.bill:
            bill = payment.bill
            bill.paid += payment.amount
            if bill.paid >= bill.amount:
                bill.status = 'Paid'
            elif bill.paid > 0:
                bill.status = 'Partial'
            bill.save()
        return payment

class SupplierStatementLineSerializer(serializers.ModelSerializer):
    class Meta:
        model = SupplierStatementLine
        fields = '__all__'

class DebtorStatementLineSerializer(serializers.ModelSerializer):
    class Meta:
        model = DebtorStatementLine
        fields = '__all__'
```

## views.py

```python
from rest_framework import viewsets
from .models import Supplier, SupplierBill, SupplierPayment, SupplierStatementLine, DebtorStatementLine
from .serializers import (SupplierSerializer, SupplierBillSerializer, SupplierPaymentSerializer, 
                          SupplierStatementLineSerializer, DebtorStatementLineSerializer)

class SupplierViewSet(viewsets.ModelViewSet):
    queryset = Supplier.objects.all()
    serializer_class = SupplierSerializer

class SupplierBillViewSet(viewsets.ModelViewSet):
    queryset = SupplierBill.objects.all()
    serializer_class = SupplierBillSerializer

class SupplierPaymentViewSet(viewsets.ModelViewSet):
    queryset = SupplierPayment.objects.all()
    serializer_class = SupplierPaymentSerializer

class SupplierStatementLineViewSet(viewsets.ModelViewSet):
    queryset = SupplierStatementLine.objects.all()
    serializer_class = SupplierStatementLineSerializer

class DebtorStatementLineViewSet(viewsets.ModelViewSet):
    queryset = DebtorStatementLine.objects.all()
    serializer_class = DebtorStatementLineSerializer
```

## urls.py

```python
router.register('supplier', SupplierViewSet)
router.register('supplierbill', SupplierBillViewSet)
router.register('supplierpayment', SupplierPaymentViewSet)
router.register('supplierstatementline', SupplierStatementLineViewSet)
router.register('debtorstatementline', DebtorStatementLineViewSet)
```

## MySQL DDL

```sql
CREATE TABLE finance_supplier (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(120) NOT NULL,
    contact VARCHAR(100),
    phone VARCHAR(20),
    email VARCHAR(254),
    address TEXT,
    bank_details TEXT,
    tax_number VARCHAR(50),
    payment_terms INT NOT NULL DEFAULT 30,
    status VARCHAR(10) NOT NULL DEFAULT 'Active'
);

CREATE TABLE finance_supplierbill (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    supplier_id BIGINT NOT NULL,
    bill_no VARCHAR(50) NOT NULL,
    date DATE NOT NULL,
    due_date DATE NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    paid DECIMAL(12,2) NOT NULL DEFAULT 0,
    currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    description TEXT,
    gl_account_code VARCHAR(20),
    status VARCHAR(12) NOT NULL DEFAULT 'Unpaid',
    CONSTRAINT fk_bill_supplier FOREIGN KEY (supplier_id) REFERENCES finance_supplier(id)
);

CREATE TABLE finance_supplierpayment (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    supplier_id BIGINT NOT NULL,
    bill_id BIGINT,
    date DATE NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    method VARCHAR(30) NOT NULL,
    reference VARCHAR(60),
    description TEXT,
    CONSTRAINT fk_pay_supplier FOREIGN KEY (supplier_id) REFERENCES finance_supplier(id),
    CONSTRAINT fk_pay_bill FOREIGN KEY (bill_id) REFERENCES finance_supplierbill(id)
);

CREATE TABLE finance_supplierstatementline (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    supplier_id BIGINT NOT NULL,
    date DATE NOT NULL,
    reference VARCHAR(60),
    description TEXT,
    amount DECIMAL(12,2) NOT NULL,
    matched BOOLEAN NOT NULL DEFAULT FALSE,
    matched_bill_id BIGINT,
    CONSTRAINT fk_ssl_supplier FOREIGN KEY (supplier_id) REFERENCES finance_supplier(id),
    CONSTRAINT fk_ssl_bill FOREIGN KEY (matched_bill_id) REFERENCES finance_supplierbill(id)
);

CREATE TABLE finance_debtorstatementline (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    student_id BIGINT NOT NULL,
    date DATE NOT NULL,
    description VARCHAR(255) NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    reference VARCHAR(60),
    matched_receipt_id BIGINT,
    CONSTRAINT fk_dsl_student FOREIGN KEY (student_id) REFERENCES students_student(id),
    CONSTRAINT fk_dsl_receipt FOREIGN KEY (matched_receipt_id) REFERENCES finance_receipt(id)
);
```
