# Attendance API — Django changes to apply locally

The frontend Attendance module now talks to your Django backend. Add the pieces below to
`apps/students/` and it will read/write MySQL immediately.

## 1. Model — `apps/students/models.py`

```python
class Attendance(models.Model):
    STATUS = [(s, s) for s in ("Present", "Absent", "Late", "Excused")]

    student = models.ForeignKey("students.Student", on_delete=models.CASCADE, related_name="attendance")
    date = models.DateField()
    status = models.CharField(max_length=10, choices=STATUS, default="Present")
    remarks = models.CharField(max_length=255, blank=True, default="")
    class_name = models.CharField(max_length=50, blank=True, default="")
    recorded_by = models.ForeignKey("core.User", null=True, blank=True, on_delete=models.SET_NULL)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("student", "date")
        ordering = ["-date", "student_id"]
```

## 2. Serializer — `apps/students/serializers.py`

```python
class AttendanceSerializer(serializers.ModelSerializer):
    student_no = serializers.CharField(source="student.student_no", read_only=True)
    student_name = serializers.SerializerMethodField()

    class Meta:
        model = Attendance
        fields = "__all__"
        read_only_fields = ("recorded_by",)

    def get_student_name(self, obj):
        return f"{obj.student.first_name} {obj.student.last_name}"
```

## 3. ViewSet — `apps/students/views.py`

```python
class AttendanceViewSet(viewsets.ModelViewSet):
    queryset = Attendance.objects.select_related("student").all()
    serializer_class = AttendanceSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        p = self.request.query_params
        if p.get("date"):
            qs = qs.filter(date=p["date"])
        if p.get("date_from"):
            qs = qs.filter(date__gte=p["date_from"])
        if p.get("date_to"):
            qs = qs.filter(date__lte=p["date_to"])
        if p.get("class_name"):
            qs = qs.filter(class_name=p["class_name"])
        return qs

    def perform_create(self, serializer):
        serializer.save(recorded_by=self.request.user)

    @action(detail=False, methods=["post"], url_path="bulk")
    def bulk(self, request):
        """Upsert a whole register: {"records": [{student, date, status, remarks, class_name}, ...]}"""
        saved = []
        for row in request.data.get("records", []):
            obj, _ = Attendance.objects.update_or_create(
                student_id=row["student"],
                date=row["date"],
                defaults={
                    "status": row.get("status", "Present"),
                    "remarks": row.get("remarks", ""),
                    "class_name": row.get("class_name", ""),
                    "recorded_by": request.user,
                },
            )
            saved.append(obj)
        return Response(AttendanceSerializer(saved, many=True).data, status=200)
```

## 4. Router — `apps/students/urls.py`

```python
router.register(r"attendance", AttendanceViewSet, basename="attendance")
```

Endpoint becomes `/api/students/attendance/` and `/api/students/attendance/bulk/`.

## 5. Migrate

```powershell
python manage.py makemigrations students
python manage.py migrate students
```

(If the table already exists in your imported SQL dump, use `python manage.py migrate students --fake`.)

## 6. Or add the table straight in MySQL

```sql
CREATE TABLE students_attendance (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  student_id BIGINT NOT NULL,
  date DATE NOT NULL,
  status VARCHAR(10) NOT NULL DEFAULT 'Present',
  remarks VARCHAR(255) NOT NULL DEFAULT '',
  class_name VARCHAR(50) NOT NULL DEFAULT '',
  recorded_by_id BIGINT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  UNIQUE KEY uq_student_date (student_id, date),
  CONSTRAINT fk_att_student FOREIGN KEY (student_id) REFERENCES students_student(id) ON DELETE CASCADE,
  CONSTRAINT fk_att_user FOREIGN KEY (recorded_by_id) REFERENCES core_user(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

## Frontend behaviour

- `src/lib/attendance-api.ts` calls `bulk/` first; if the backend returns 404/405 it falls back to
  one create/patch per student, so the module works even before you add the bulk action.
- `src/pages/Attendance.tsx` loads students from `/api/students/student/` and the register from
  `/api/students/attendance/?date=YYYY-MM-DD`, and re-reads from the database after every save.
