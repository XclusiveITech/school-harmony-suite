# Tuckshop Backend (Django + DRF + MySQL)

The frontend Tuckshop module (`src/pages/Tuckshop.tsx`, `src/lib/tuckshop-store.ts`,
`src/lib/tuckshop-api.ts`) reads and writes exclusively through these endpoints —
there is no dummy data left in the module.

```
GET/POST/PATCH  /api/tuckshop/product/
GET/POST        /api/tuckshop/shift/        POST /api/tuckshop/shift/<id>/close/
GET/POST        /api/tuckshop/sale/         POST /api/tuckshop/sale/<id>/void/  |  /refund/
GET/POST        /api/tuckshop/wastage/
```

## app: tuckshop/models.py

```python
from django.db import models
from django.utils import timezone


class TuckProduct(models.Model):
    sku = models.CharField(max_length=40, unique=True)
    name = models.CharField(max_length=150)
    barcode = models.CharField(max_length=60, blank=True, null=True)
    unit_cost = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    selling_price = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    stock = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    reorder_level = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    active = models.BooleanField(default=True)


class TuckShift(models.Model):
    ref = models.CharField(max_length=20, unique=True, blank=True)
    operator = models.CharField(max_length=120)
    opened_at = models.DateTimeField(default=timezone.now)
    closed_at = models.DateTimeField(null=True, blank=True)
    opening_cash = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    declared_cash = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    expected_cash = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    variance = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    status = models.CharField(max_length=10, default='Open')  # Open | Closed
    notes = models.TextField(blank=True, null=True)

    def save(self, *a, **kw):
        if not self.ref:
            self.ref = f"SH-{(TuckShift.objects.count() + 1):04d}"
        super().save(*a, **kw)


class TuckSale(models.Model):
    ref = models.CharField(max_length=20, unique=True, blank=True)
    date = models.DateTimeField(default=timezone.now)
    shift = models.ForeignKey(TuckShift, null=True, blank=True, on_delete=models.SET_NULL, related_name='sales')
    operator = models.CharField(max_length=120)
    payment_method = models.CharField(max_length=20)   # Cash | Student Card | Parent Account
    student_id = models.CharField(max_length=40, blank=True, null=True)
    student_name = models.CharField(max_length=150, blank=True, null=True)
    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    cogs = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    status = models.CharField(max_length=10, default='Completed')  # Completed | Voided | Refunded
    void_reason = models.CharField(max_length=200, blank=True, null=True)

    def save(self, *a, **kw):
        if not self.ref:
            self.ref = f"S-{(TuckSale.objects.count() + 1):04d}"
        super().save(*a, **kw)


class TuckSaleLine(models.Model):
    sale = models.ForeignKey(TuckSale, related_name='lines', on_delete=models.CASCADE)
    product = models.ForeignKey(TuckProduct, on_delete=models.PROTECT)
    quantity = models.DecimalField(max_digits=12, decimal_places=2)
    unit_price = models.DecimalField(max_digits=12, decimal_places=2)
    unit_cost = models.DecimalField(max_digits=12, decimal_places=2, default=0)


class TuckWastage(models.Model):
    ref = models.CharField(max_length=24, unique=True, blank=True)
    date = models.DateTimeField(default=timezone.now)
    product = models.ForeignKey(TuckProduct, on_delete=models.PROTECT)
    quantity = models.DecimalField(max_digits=12, decimal_places=2)
    reason = models.CharField(max_length=120)
    cost = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    operator = models.CharField(max_length=120, blank=True, null=True)

    def save(self, *a, **kw):
        if not self.ref:
            self.ref = f"WST-{(TuckWastage.objects.count() + 1):04d}"
        super().save(*a, **kw)
```

## app: tuckshop/serializers.py

```python
from rest_framework import serializers
from .models import TuckProduct, TuckShift, TuckSale, TuckSaleLine, TuckWastage


class TuckProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = TuckProduct
        fields = '__all__'


class TuckShiftSerializer(serializers.ModelSerializer):
    class Meta:
        model = TuckShift
        fields = '__all__'
        read_only_fields = ('ref', 'expected_cash', 'variance')


class TuckSaleLineSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)

    class Meta:
        model = TuckSaleLine
        fields = ('id', 'product', 'product_name', 'quantity', 'unit_price', 'unit_cost')
        read_only_fields = ('unit_cost',)


class TuckSaleSerializer(serializers.ModelSerializer):
    lines = TuckSaleLineSerializer(many=True)

    class Meta:
        model = TuckSale
        fields = '__all__'
        read_only_fields = ('ref', 'subtotal', 'cogs', 'status', 'void_reason')

    def create(self, validated):
        lines = validated.pop('lines')
        sale = TuckSale.objects.create(**validated)
        subtotal = cogs = 0
        for l in lines:
            product = l['product']
            qty = l['quantity']
            if product.stock < qty:
                sale.delete()
                raise serializers.ValidationError(f'Insufficient stock for {product.name}')
            TuckSaleLine.objects.create(
                sale=sale, product=product, quantity=qty,
                unit_price=l['unit_price'], unit_cost=product.unit_cost)
            product.stock = product.stock - qty
            product.save(update_fields=['stock'])
            subtotal += qty * l['unit_price']
            cogs += qty * product.unit_cost
        sale.subtotal, sale.cogs = subtotal, cogs
        sale.save(update_fields=['subtotal', 'cogs'])
        return sale


class TuckWastageSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)

    class Meta:
        model = TuckWastage
        fields = '__all__'
        read_only_fields = ('ref', 'cost')

    def create(self, validated):
        product = validated['product']
        validated['cost'] = product.unit_cost * validated['quantity']
        obj = super().create(validated)
        product.stock = product.stock - obj.quantity
        product.save(update_fields=['stock'])
        return obj
```

## app: tuckshop/views.py

```python
from django.utils import timezone
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import TuckProduct, TuckShift, TuckSale, TuckWastage
from .serializers import (TuckProductSerializer, TuckShiftSerializer,
                          TuckSaleSerializer, TuckWastageSerializer)


class TuckProductViewSet(viewsets.ModelViewSet):
    queryset = TuckProduct.objects.all().order_by('name')
    serializer_class = TuckProductSerializer


class TuckShiftViewSet(viewsets.ModelViewSet):
    queryset = TuckShift.objects.all().order_by('-opened_at')
    serializer_class = TuckShiftSerializer

    @action(detail=True, methods=['post'])
    def close(self, request, pk=None):
        shift = self.get_object()
        cash_sales = sum(s.subtotal for s in shift.sales.filter(status='Completed', payment_method='Cash'))
        refunds = sum(s.subtotal for s in shift.sales.filter(status='Refunded', payment_method='Cash'))
        declared = float(request.data.get('declared_cash') or 0)
        expected = float(shift.opening_cash) + float(cash_sales) - float(refunds)
        shift.declared_cash = declared
        shift.expected_cash = expected
        shift.variance = declared - expected
        shift.notes = request.data.get('notes') or shift.notes
        shift.status = 'Closed'
        shift.closed_at = timezone.now()
        shift.save()
        return Response(TuckShiftSerializer(shift).data)


class TuckSaleViewSet(viewsets.ModelViewSet):
    queryset = TuckSale.objects.prefetch_related('lines').order_by('-date')
    serializer_class = TuckSaleSerializer

    def _restock(self, sale):
        for line in sale.lines.all():
            line.product.stock = line.product.stock + line.quantity
            line.product.save(update_fields=['stock'])

    @action(detail=True, methods=['post'])
    def void(self, request, pk=None):
        return self._settle(self.get_object(), 'Voided', request.data.get('reason', ''))

    @action(detail=True, methods=['post'])
    def refund(self, request, pk=None):
        return self._settle(self.get_object(), 'Refunded', request.data.get('reason', ''))

    def _settle(self, sale, status, reason):
        if sale.status != 'Completed':
            return Response({'detail': 'Only completed sales can be changed'}, status=400)
        self._restock(sale)
        sale.status, sale.void_reason = status, reason
        sale.save(update_fields=['status', 'void_reason'])
        return Response(TuckSaleSerializer(sale).data)


class TuckWastageViewSet(viewsets.ModelViewSet):
    queryset = TuckWastage.objects.all().order_by('-date')
    serializer_class = TuckWastageSerializer
```

## Router (project urls.py)

```python
from rest_framework.routers import DefaultRouter
from tuckshop.views import (TuckProductViewSet, TuckShiftViewSet,
                            TuckSaleViewSet, TuckWastageViewSet)

tuck = DefaultRouter()
tuck.register('product', TuckProductViewSet)
tuck.register('shift', TuckShiftViewSet)
tuck.register('sale', TuckSaleViewSet)
tuck.register('wastage', TuckWastageViewSet)

urlpatterns += [path('api/tuckshop/', include(tuck.urls))]
```

## MySQL DDL (if you prefer raw SQL over migrations)

```sql
CREATE TABLE tuckshop_tuckproduct (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  sku VARCHAR(40) NOT NULL UNIQUE,
  name VARCHAR(150) NOT NULL,
  barcode VARCHAR(60) NULL,
  unit_cost DECIMAL(12,2) NOT NULL DEFAULT 0,
  selling_price DECIMAL(12,2) NOT NULL DEFAULT 0,
  stock DECIMAL(12,2) NOT NULL DEFAULT 0,
  reorder_level DECIMAL(12,2) NOT NULL DEFAULT 0,
  active TINYINT(1) NOT NULL DEFAULT 1
);

CREATE TABLE tuckshop_tuckshift (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  ref VARCHAR(20) NOT NULL UNIQUE,
  operator VARCHAR(120) NOT NULL,
  opened_at DATETIME(6) NOT NULL,
  closed_at DATETIME(6) NULL,
  opening_cash DECIMAL(12,2) NOT NULL DEFAULT 0,
  declared_cash DECIMAL(12,2) NULL,
  expected_cash DECIMAL(12,2) NULL,
  variance DECIMAL(12,2) NULL,
  status VARCHAR(10) NOT NULL DEFAULT 'Open',
  notes LONGTEXT NULL
);

CREATE TABLE tuckshop_tucksale (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  ref VARCHAR(20) NOT NULL UNIQUE,
  date DATETIME(6) NOT NULL,
  shift_id BIGINT NULL,
  operator VARCHAR(120) NOT NULL,
  payment_method VARCHAR(20) NOT NULL,
  student_id VARCHAR(40) NULL,
  student_name VARCHAR(150) NULL,
  subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
  cogs DECIMAL(12,2) NOT NULL DEFAULT 0,
  status VARCHAR(10) NOT NULL DEFAULT 'Completed',
  void_reason VARCHAR(200) NULL,
  CONSTRAINT fk_sale_shift FOREIGN KEY (shift_id) REFERENCES tuckshop_tuckshift(id) ON DELETE SET NULL
);

CREATE TABLE tuckshop_tucksaleline (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  sale_id BIGINT NOT NULL,
  product_id BIGINT NOT NULL,
  quantity DECIMAL(12,2) NOT NULL,
  unit_price DECIMAL(12,2) NOT NULL,
  unit_cost DECIMAL(12,2) NOT NULL DEFAULT 0,
  CONSTRAINT fk_line_sale FOREIGN KEY (sale_id) REFERENCES tuckshop_tucksale(id) ON DELETE CASCADE,
  CONSTRAINT fk_line_product FOREIGN KEY (product_id) REFERENCES tuckshop_tuckproduct(id)
);

CREATE TABLE tuckshop_tuckwastage (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  ref VARCHAR(24) NOT NULL UNIQUE,
  date DATETIME(6) NOT NULL,
  product_id BIGINT NOT NULL,
  quantity DECIMAL(12,2) NOT NULL,
  reason VARCHAR(120) NOT NULL,
  cost DECIMAL(12,2) NOT NULL DEFAULT 0,
  operator VARCHAR(120) NULL,
  CONSTRAINT fk_wastage_product FOREIGN KEY (product_id) REFERENCES tuckshop_tuckproduct(id)
);
```

After adding the app: `python manage.py makemigrations tuckshop && python manage.py migrate`.
Add tuckshop items on the Price List tab (or seed `tuckshop_tuckproduct`) — the POS lists
every product with stock on hand and a selling price.
