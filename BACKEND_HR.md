# Backend: HR & Payroll (staff, salaries, payroll runs, payslips)

Django app `hr`, mounted at `/api/hr/`. Frontend client: `src/lib/hr-api.ts`;
pages: `src/pages/hr/StaffList.tsx`, `src/pages/hr/Payroll.tsx`.

Payroll rules kept identical to the previous frontend logic:
tax 8% of gross, pension 4% of gross, unpaid-leave daily rate = salary / 22.

## models.py

```python
from django.db import models
from core.models import Branch

STAFF_STATUS = [('Active', 'Active'), ('On Leave', 'On Leave'), ('Inactive', 'Inactive')]


class Staff(models.Model):
    employee_id = models.CharField(max_length=30, unique=True)
    first_name = models.CharField(max_length=60)
    last_name = models.CharField(max_length=60)
    email = models.EmailField()
    phone = models.CharField(max_length=30, blank=True)
    role = models.CharField(max_length=60, blank=True)
    department = models.CharField(max_length=60, blank=True)
    status = models.CharField(max_length=12, choices=STAFF_STATUS, default='Active')
    salary = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    branch = models.ForeignKey(Branch, null=True, blank=True, on_delete=models.SET_NULL)
    joined_at = models.DateField(null=True, blank=True)


class LeaveRequest(models.Model):
    staff = models.ForeignKey(Staff, on_delete=models.CASCADE, related_name='leave_requests')
    type = models.CharField(max_length=30)
    start_date = models.DateField()
    end_date = models.DateField()
    days = models.DecimalField(max_digits=6, decimal_places=1, default=0)
    paid = models.BooleanField(default=True)
    status = models.CharField(max_length=12, default='Pending')
    reason = models.CharField(max_length=200, blank=True)


class PayrollRun(models.Model):
    period = models.CharField(max_length=7, unique=True)   # YYYY-MM
    status = models.CharField(max_length=12, default='Draft')
    created_at = models.DateTimeField(auto_now_add=True)


class Payslip(models.Model):
    run = models.ForeignKey(PayrollRun, on_delete=models.CASCADE, related_name='payslips')
    staff = models.ForeignKey(Staff, on_delete=models.CASCADE)
    gross = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    tax = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    pension = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    unpaid_days = models.DecimalField(max_digits=6, decimal_places=1, default=0)
    leave_deduction = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_deductions = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    net = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    class Meta:
        unique_together = ('run', 'staff')
```

## serializers.py

```python
from rest_framework import serializers
from .models import Staff, LeaveRequest, PayrollRun, Payslip


class StaffSerializer(serializers.ModelSerializer):
    branch_name = serializers.CharField(source='branch.name', read_only=True)

    class Meta:
        model = Staff
        fields = '__all__'


class LeaveRequestSerializer(serializers.ModelSerializer):
    staff_name = serializers.SerializerMethodField()

    class Meta:
        model = LeaveRequest
        fields = '__all__'

    def get_staff_name(self, obj):
        return f'{obj.staff.first_name} {obj.staff.last_name}'


class PayslipSerializer(serializers.ModelSerializer):
    staff_name = serializers.SerializerMethodField()
    employee_id = serializers.CharField(source='staff.employee_id', read_only=True)

    class Meta:
        model = Payslip
        fields = '__all__'

    def get_staff_name(self, obj):
        return f'{obj.staff.first_name} {obj.staff.last_name}'


class PayrollRunSerializer(serializers.ModelSerializer):
    payslip_count = serializers.IntegerField(source='payslips.count', read_only=True)

    class Meta:
        model = PayrollRun
        fields = ['id', 'period', 'status', 'created_at', 'payslip_count']
        read_only_fields = ['status', 'created_at']
```

## views.py

```python
from decimal import Decimal
from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Staff, LeaveRequest, PayrollRun, Payslip
from .serializers import (StaffSerializer, LeaveRequestSerializer,
                          PayrollRunSerializer, PayslipSerializer)

TAX_RATE = Decimal('0.08')
PENSION_RATE = Decimal('0.04')
WORKING_DAYS = Decimal('22')


class StaffViewSet(viewsets.ModelViewSet):
    queryset = Staff.objects.all().order_by('employee_id')
    serializer_class = StaffSerializer
    permission_classes = [permissions.IsAuthenticated]


class LeaveRequestViewSet(viewsets.ModelViewSet):
    queryset = LeaveRequest.objects.select_related('staff').order_by('-start_date')
    serializer_class = LeaveRequestSerializer
    permission_classes = [permissions.IsAuthenticated]


class PayrollRunViewSet(viewsets.ModelViewSet):
    queryset = PayrollRun.objects.order_by('-period')
    serializer_class = PayrollRunSerializer
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=True, methods=['post'])
    def generate(self, request, pk=None):
        run = self.get_object()
        run.payslips.all().delete()
        for s in Staff.objects.exclude(status='Inactive'):
            gross = Decimal(s.salary)
            unpaid = sum(
                (Decimal(l.days) for l in s.leave_requests.filter(status='Approved', paid=False)),
                Decimal('0'),
            )
            tax = gross * TAX_RATE
            pension = gross * PENSION_RATE
            leave_ded = (gross / WORKING_DAYS) * unpaid
            total = tax + pension + leave_ded
            Payslip.objects.create(
                run=run, staff=s, gross=gross, tax=tax, pension=pension,
                unpaid_days=unpaid, leave_deduction=leave_ded,
                total_deductions=total, net=gross - total,
            )
        run.status = 'Generated'
        run.save()
        return Response(self.get_serializer(run).data)


class PayslipViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = PayslipSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = Payslip.objects.select_related('staff', 'run')
        run = self.request.query_params.get('run')
        return qs.filter(run_id=run) if run else qs
```

## urls.py

```python
from rest_framework.routers import DefaultRouter
from .views import StaffViewSet, LeaveRequestViewSet, PayrollRunViewSet, PayslipViewSet

router = DefaultRouter()
router.register('staff', StaffViewSet)
router.register('leaverequest', LeaveRequestViewSet)
router.register('payrollrun', PayrollRunViewSet)
router.register('payslip', PayslipViewSet, basename='payslip')
urlpatterns = router.urls
```

Project `urls.py`: `path('api/hr/', include('hr.urls'))`.

## MySQL DDL

```sql
CREATE TABLE hr_staff (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  employee_id VARCHAR(30) NOT NULL UNIQUE,
  first_name VARCHAR(60) NOT NULL,
  last_name VARCHAR(60) NOT NULL,
  email VARCHAR(254) NOT NULL,
  phone VARCHAR(30) NOT NULL DEFAULT '',
  role VARCHAR(60) NOT NULL DEFAULT '',
  department VARCHAR(60) NOT NULL DEFAULT '',
  status VARCHAR(12) NOT NULL DEFAULT 'Active',
  salary DECIMAL(12,2) NOT NULL DEFAULT 0,
  branch_id BIGINT NULL,
  joined_at DATE NULL
);

CREATE TABLE hr_leaverequest (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  staff_id BIGINT NOT NULL,
  type VARCHAR(30) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  days DECIMAL(6,1) NOT NULL DEFAULT 0,
  paid TINYINT(1) NOT NULL DEFAULT 1,
  status VARCHAR(12) NOT NULL DEFAULT 'Pending',
  reason VARCHAR(200) NOT NULL DEFAULT '',
  CONSTRAINT fk_leave_staff FOREIGN KEY (staff_id) REFERENCES hr_staff(id) ON DELETE CASCADE
);

CREATE TABLE hr_payrollrun (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  period VARCHAR(7) NOT NULL UNIQUE,
  status VARCHAR(12) NOT NULL DEFAULT 'Draft',
  created_at DATETIME(6) NOT NULL
);

CREATE TABLE hr_payslip (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  run_id BIGINT NOT NULL,
  staff_id BIGINT NOT NULL,
  gross DECIMAL(12,2) NOT NULL DEFAULT 0,
  tax DECIMAL(12,2) NOT NULL DEFAULT 0,
  pension DECIMAL(12,2) NOT NULL DEFAULT 0,
  unpaid_days DECIMAL(6,1) NOT NULL DEFAULT 0,
  leave_deduction DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_deductions DECIMAL(12,2) NOT NULL DEFAULT 0,
  net DECIMAL(12,2) NOT NULL DEFAULT 0,
  UNIQUE KEY uniq_run_staff (run_id, staff_id),
  CONSTRAINT fk_slip_run FOREIGN KEY (run_id) REFERENCES hr_payrollrun(id) ON DELETE CASCADE,
  CONSTRAINT fk_slip_staff FOREIGN KEY (staff_id) REFERENCES hr_staff(id) ON DELETE CASCADE
);
```
