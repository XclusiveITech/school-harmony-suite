# Assets backend (Django app `assets`)

Frontend: `src/lib/assets-api.ts` → `/api/assets/asset/`, `/api/assets/assignment/`.

## models.py
```python
from django.db import models

class Asset(models.Model):
    name = models.CharField(max_length=200)
    category = models.CharField(max_length=100)
    purchase_date = models.DateField(null=True, blank=True)
    cost = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    depreciation_rate = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    current_value = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    location = models.CharField(max_length=200, blank=True)
    serial_numbers = models.JSONField(default=list)
    created_at = models.DateTimeField(auto_now_add=True)

class AssetAssignment(models.Model):
    TYPES = [('Student', 'Student'), ('Staff', 'Staff')]
    CONDITIONS = [(c, c) for c in ['Excellent', 'Good', 'Fair', 'Poor', 'Damaged']]
    asset = models.ForeignKey(Asset, on_delete=models.CASCADE, related_name='assignments')
    serial_number = models.CharField(max_length=100)
    assigned_to_type = models.CharField(max_length=10, choices=TYPES)
    student = models.ForeignKey('students.Student', null=True, blank=True, on_delete=models.SET_NULL)
    staff = models.ForeignKey('hr.Staff', null=True, blank=True, on_delete=models.SET_NULL)
    assigned_to_name = models.CharField(max_length=200, blank=True)
    room_number = models.CharField(max_length=50, blank=True)
    condition = models.CharField(max_length=10, choices=CONDITIONS, default='Good')
    date_assigned = models.DateField()
    notes = models.TextField(blank=True)

    class Meta:
        unique_together = ('asset', 'serial_number')
```

## serializers.py / views.py
```python
from rest_framework import serializers, viewsets, permissions
from .models import Asset, AssetAssignment

class AssetSerializer(serializers.ModelSerializer):
    class Meta: model = Asset; fields = '__all__'

class AssetAssignmentSerializer(serializers.ModelSerializer):
    class Meta: model = AssetAssignment; fields = '__all__'

class AssetViewSet(viewsets.ModelViewSet):
    queryset = Asset.objects.all().order_by('name')
    serializer_class = AssetSerializer
    permission_classes = [permissions.IsAuthenticated]

class AssetAssignmentViewSet(viewsets.ModelViewSet):
    queryset = AssetAssignment.objects.select_related('asset').order_by('-date_assigned')
    serializer_class = AssetAssignmentSerializer
    permission_classes = [permissions.IsAuthenticated]
```

## urls.py (included at `api/assets/`)
```python
from rest_framework.routers import DefaultRouter
from .views import AssetViewSet, AssetAssignmentViewSet
router = DefaultRouter()
router.register('asset', AssetViewSet)
router.register('assignment', AssetAssignmentViewSet)
urlpatterns = router.urls
```
Add `'assets'` to `INSTALLED_APPS`, `path('api/assets/', include('assets.urls'))` to the project urls, then run `python manage.py makemigrations assets && python manage.py migrate`.
