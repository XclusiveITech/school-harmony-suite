# Backend: Fees Structure & Billing

Django app `finance`, mounted at `/api/finance/`. The frontend client is
`src/lib/fees-api.ts`.

## models.py

```python
from django.db import models
from .models import GLAccount, Invoice, InvoiceLine
from students.models import Student

FEE_STATUS = [('Draft', 'Draft'), ('Active', 'Active'), ('Archived', 'Archived')]

class FeeStructure(models.Model):
    name = models.CharField(max_length=120)
    level = models.CharField(max_length=50)
    class_name = models.CharField(max_length=50, blank=True, null=True)
    term = models.CharField(max_length=20)
    year = models.CharField(max_length=10)
    currency = models.CharField(max_length=10, default='USD')
    version = models.IntegerField(default=1)
    status = models.CharField(max_length=12, choices=FEE_STATUS, default='Draft')
    effective_from = models.DateField()
    parent = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

class FeeItem(models.Model):
    fee_structure = models.ForeignKey(FeeStructure, on_delete=models.CASCADE, related_name='items')
    name = models.CharField(max_length=120)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    gl_account = models.ForeignKey(GLAccount, on_delete=models.PROTECT)
    mandatory = models.BooleanField(default=True)
```

## serializers.py

```python
from rest_framework import serializers
from .models import FeeStructure, FeeItem

class FeeItemSerializer(serializers.ModelSerializer):
    gl_account_code = serializers.CharField(source='gl_account.code', read_only=True)
    class Meta:
        model = FeeItem
        fields = ['id', 'name', 'amount', 'gl_account', 'gl_account_code', 'mandatory']

class FeeStructureSerializer(serializers.ModelSerializer):
    items = FeeItemSerializer(many=True)
    class Meta:
        model = FeeStructure
        fields = '__all__'

    def create(self, validated_data):
        items_data = validated_data.pop('items')
        fs = FeeStructure.objects.create(**validated_data)
        for item_data in items_data:
            FeeItem.objects.create(fee_structure=fs, **item_data)
        return fs
```

## views.py

```python
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import FeeStructure, FeeItem, Invoice, InvoiceLine
from .serializers import FeeStructureSerializer
from students.models import Student

class FeeStructureViewSet(viewsets.ModelViewSet):
    queryset = FeeStructure.objects.all()
    serializer_class = FeeStructureSerializer

    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):
        fs = self.get_object()
        # Archive previous active for same level/term
        FeeStructure.objects.filter(
            level=fs.level, 
            term=fs.term, 
            year=fs.year, 
            status='Active'
        ).update(status='Archived')
        fs.status = 'Active'
        fs.save()
        return Response(self.get_serializer(fs).data)

    @action(detail=True, methods=['post'])
    def new_version(self, request, pk=None):
        fs = self.get_object()
        # Clone as draft version+1
        new_fs = FeeStructure.objects.create(
            name=fs.name,
            level=fs.level,
            class_name=fs.class_name,
            term=fs.term,
            year=fs.year,
            currency=fs.currency,
            version=fs.version + 1,
            status='Draft',
            effective_from=fs.effective_from,
            parent=fs
        )
        for item in fs.items.all():
            FeeItem.objects.create(
                fee_structure=new_fs,
                name=item.name,
                amount=item.amount,
                gl_account=item.gl_account,
                mandatory=item.mandatory
            )
        return Response(self.get_serializer(new_fs).data)

    @action(detail=True, methods=['post'])
    def bill_students(self, request, pk=None):
        fs = self.get_object()
        # Filter students matching level/class
        students = Student.objects.filter(level=fs.level)
        if fs.class_name:
            students = students.filter(class_name=fs.class_name)
        
        count = 0
        for student in students:
            inv = Invoice.objects.create(
                date=fs.effective_from,
                student=student,
                currency=fs.currency,
                status='Draft'
            )
            for item in fs.items.filter(mandatory=True):
                InvoiceLine.objects.create(
                    invoice=inv,
                    description=item.name,
                    gl_account_code=item.gl_account.code,
                    amount=item.amount
                )
            inv.recalc()
            inv.save()
            count += 1
        return Response({'count': count})
```

## urls.py

```python
router.register('feestructure', FeeStructureViewSet)
```

## MySQL DDL

```sql
CREATE TABLE finance_feestructure (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    level VARCHAR(50) NOT NULL,
    class_name VARCHAR(50),
    term VARCHAR(20) NOT NULL,
    year VARCHAR(10) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    version INT NOT NULL DEFAULT 1,
    status VARCHAR(12) NOT NULL DEFAULT 'Draft',
    effective_from DATE NOT NULL,
    parent_id BIGINT,
    created_at DATETIME(6) NOT NULL,
    CONSTRAINT fk_fs_parent FOREIGN KEY (parent_id) REFERENCES finance_feestructure(id) ON DELETE SET NULL
);

CREATE TABLE finance_feeitem (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    fee_structure_id BIGINT NOT NULL,
    name VARCHAR(120) NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    gl_account_id BIGINT NOT NULL,
    mandatory BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT fk_fi_structure FOREIGN KEY (fee_structure_id) REFERENCES finance_feestructure(id) ON DELETE CASCADE,
    CONSTRAINT fk_fi_account FOREIGN KEY (gl_account_id) REFERENCES finance_glaccount(id)
);
```
