# Backend for Academics, Examinations & Continuous Assessment

The frontend pages below now read/write **only** through the Django API — no dummy data:

| Page | Endpoints used |
| --- | --- |
| Academics → Subjects | `/api/academics/subject/` |
| Academics → Classes | `/api/academics/classroom/` (+ `/api/students/student/` for headcount) |
| Academics → Continuous Assessment | `/api/academics/catask/`, `/api/academics/casubmission/` (+ optional `casubmission/bulk/`) |
| Examinations | `/api/exams/examtype/`, `/api/exams/exam/`, `/api/exams/result/` (+ optional `result/bulk/`) |

Add the following to the Django project (apps `academics` and `exams`).

## 1. Models

```python
# apps/academics/models.py
from django.db import models

class Subject(models.Model):
    code = models.CharField(max_length=20, unique=True)
    name = models.CharField(max_length=120)
    type = models.CharField(max_length=20, default='Theory')       # Theory | Practical
    ca_percent = models.PositiveIntegerField(default=30)
    classes = models.JSONField(default=list, blank=True)           # ["Form 3A", ...]
    teacher_name = models.CharField(max_length=120, blank=True)
    branch = models.ForeignKey('core.Branch', null=True, blank=True, on_delete=models.SET_NULL)

class ClassRoom(models.Model):
    name = models.CharField(max_length=60, unique=True)
    level = models.CharField(max_length=60)
    capacity = models.PositiveIntegerField(default=40)
    class_teacher = models.CharField(max_length=120, blank=True)
    branch = models.ForeignKey('core.Branch', null=True, blank=True, on_delete=models.SET_NULL)

class CATask(models.Model):
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name='ca_tasks')
    class_name = models.CharField(max_length=60)
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    type = models.CharField(max_length=20, default='Homework')     # Homework | In-Class Test | Project
    due_date = models.DateField()
    total_marks = models.PositiveIntegerField(default=50)
    status = models.CharField(max_length=20, default='Published')  # Published | Draft
    created_at = models.DateTimeField(auto_now_add=True)

class CASubmission(models.Model):
    task = models.ForeignKey(CATask, on_delete=models.CASCADE, related_name='submissions')
    student = models.ForeignKey('students.Student', on_delete=models.CASCADE)
    status = models.CharField(max_length=20, default='Pending')    # Pending | Submitted | Graded
    mark = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    feedback = models.TextField(blank=True)
    submitted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ('task', 'student')
```

```python
# apps/exams/models.py
from django.db import models

class ExamType(models.Model):
    name = models.CharField(max_length=100, unique=True)
    weight = models.PositiveIntegerField(default=70)
    term = models.CharField(max_length=40, blank=True)

class Exam(models.Model):
    exam_type = models.ForeignKey(ExamType, on_delete=models.CASCADE)
    subject = models.ForeignKey('academics.Subject', on_delete=models.CASCADE)
    class_name = models.CharField(max_length=60)
    date = models.DateField()
    start_time = models.TimeField(null=True, blank=True)
    end_time = models.TimeField(null=True, blank=True)
    venue = models.CharField(max_length=80, blank=True)
    total_marks = models.PositiveIntegerField(default=100)

class ExamResult(models.Model):
    exam = models.ForeignKey(Exam, on_delete=models.CASCADE, related_name='results')
    student = models.ForeignKey('students.Student', on_delete=models.CASCADE)
    mark = models.DecimalField(max_digits=6, decimal_places=2)
    comment = models.CharField(max_length=255, blank=True)

    class Meta:
        unique_together = ('exam', 'student')
```

## 2. Serializers (read-only helper fields the UI displays)

```python
class SubjectSerializer(serializers.ModelSerializer):
    class Meta: model = Subject; fields = '__all__'

class ClassRoomSerializer(serializers.ModelSerializer):
    student_count = serializers.SerializerMethodField()
    class Meta: model = ClassRoom; fields = '__all__'
    def get_student_count(self, obj):
        from apps.students.models import Student
        return Student.objects.filter(class_name=obj.name).count()

class CATaskSerializer(serializers.ModelSerializer):
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    class Meta: model = CATask; fields = '__all__'

class CASubmissionSerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField()
    student_no = serializers.CharField(source='student.student_no', read_only=True)
    class Meta: model = CASubmission; fields = '__all__'
    def get_student_name(self, o): return f"{o.student.first_name} {o.student.last_name}"

class ExamSerializer(serializers.ModelSerializer):
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    exam_type_name = serializers.CharField(source='exam_type.name', read_only=True)
    class Meta: model = Exam; fields = '__all__'

class ExamResultSerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField()
    student_no = serializers.CharField(source='student.student_no', read_only=True)
    subject_name = serializers.CharField(source='exam.subject.name', read_only=True)
    total_marks = serializers.IntegerField(source='exam.total_marks', read_only=True)
    percentage = serializers.SerializerMethodField()
    class Meta: model = ExamResult; fields = '__all__'
    def get_student_name(self, o): return f"{o.student.first_name} {o.student.last_name}"
    def get_percentage(self, o): return round(float(o.mark) / (o.exam.total_marks or 100) * 100, 2)
```

## 3. ViewSets + routes

```python
# apps/academics/views.py
class SubjectViewSet(viewsets.ModelViewSet):
    queryset = Subject.objects.all().order_by('name')
    serializer_class = SubjectSerializer
    permission_classes = [IsAuthenticated]

class ClassRoomViewSet(viewsets.ModelViewSet):
    queryset = ClassRoom.objects.all().order_by('name')
    serializer_class = ClassRoomSerializer
    permission_classes = [IsAuthenticated]

class CATaskViewSet(viewsets.ModelViewSet):
    serializer_class = CATaskSerializer
    permission_classes = [IsAuthenticated]
    def get_queryset(self):
        qs = CATask.objects.all().order_by('-due_date')
        cn = self.request.query_params.get('class_name')
        return qs.filter(class_name=cn) if cn else qs

class CASubmissionViewSet(viewsets.ModelViewSet):
    serializer_class = CASubmissionSerializer
    permission_classes = [IsAuthenticated]
    def get_queryset(self):
        qs = CASubmission.objects.select_related('student', 'task')
        task = self.request.query_params.get('task')
        return qs.filter(task_id=task) if task else qs

    @action(detail=False, methods=['post'])
    def bulk(self, request):
        out = []
        for row in request.data.get('records', []):
            obj, _ = CASubmission.objects.update_or_create(
                task_id=row['task'], student_id=row['student'],
                defaults={k: v for k, v in row.items() if k not in ('task', 'student')})
            out.append(obj.id)
        return Response({'saved': len(out)})
```

`exams/views.py` mirrors this: `ExamTypeViewSet`, `ExamViewSet` (filter on `class_name`),
`ExamResultViewSet` (filter on `exam`, plus the same `bulk` action keyed on `exam`+`student`).

```python
# urls.py
router = DefaultRouter()
router.register('subject', SubjectViewSet)
router.register('classroom', ClassRoomViewSet)
router.register('catask', CATaskViewSet, basename='catask')
router.register('casubmission', CASubmissionViewSet, basename='casubmission')
# project urls.py
path('api/academics/', include('apps.academics.urls')),
path('api/exams/', include('apps.exams.urls')),
```

Then: `python manage.py makemigrations academics exams && python manage.py migrate`.

## 4. MySQL tables (if you prefer applying SQL directly)

```sql
CREATE TABLE academics_subject (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(20) NOT NULL UNIQUE,
  name VARCHAR(120) NOT NULL,
  type VARCHAR(20) NOT NULL DEFAULT 'Theory',
  ca_percent INT UNSIGNED NOT NULL DEFAULT 30,
  classes JSON NULL,
  teacher_name VARCHAR(120) NOT NULL DEFAULT '',
  branch_id BIGINT NULL
) ENGINE=InnoDB;

CREATE TABLE academics_classroom (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(60) NOT NULL UNIQUE,
  level VARCHAR(60) NOT NULL,
  capacity INT UNSIGNED NOT NULL DEFAULT 40,
  class_teacher VARCHAR(120) NOT NULL DEFAULT '',
  branch_id BIGINT NULL
) ENGINE=InnoDB;

CREATE TABLE academics_catask (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  subject_id BIGINT NOT NULL,
  class_name VARCHAR(60) NOT NULL,
  title VARCHAR(200) NOT NULL,
  description LONGTEXT NOT NULL,
  type VARCHAR(20) NOT NULL DEFAULT 'Homework',
  due_date DATE NOT NULL,
  total_marks INT UNSIGNED NOT NULL DEFAULT 50,
  status VARCHAR(20) NOT NULL DEFAULT 'Published',
  created_at DATETIME(6) NOT NULL,
  CONSTRAINT fk_catask_subject FOREIGN KEY (subject_id) REFERENCES academics_subject(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE academics_casubmission (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  task_id BIGINT NOT NULL,
  student_id BIGINT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'Pending',
  mark DECIMAL(6,2) NULL,
  feedback LONGTEXT NOT NULL,
  submitted_at DATETIME(6) NULL,
  UNIQUE KEY uniq_task_student (task_id, student_id),
  CONSTRAINT fk_casub_task FOREIGN KEY (task_id) REFERENCES academics_catask(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE exams_examtype (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  weight INT UNSIGNED NOT NULL DEFAULT 70,
  term VARCHAR(40) NOT NULL DEFAULT ''
) ENGINE=InnoDB;

CREATE TABLE exams_exam (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  exam_type_id BIGINT NOT NULL,
  subject_id BIGINT NOT NULL,
  class_name VARCHAR(60) NOT NULL,
  date DATE NOT NULL,
  start_time TIME NULL,
  end_time TIME NULL,
  venue VARCHAR(80) NOT NULL DEFAULT '',
  total_marks INT UNSIGNED NOT NULL DEFAULT 100,
  CONSTRAINT fk_exam_type FOREIGN KEY (exam_type_id) REFERENCES exams_examtype(id) ON DELETE CASCADE,
  CONSTRAINT fk_exam_subject FOREIGN KEY (subject_id) REFERENCES academics_subject(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE exams_examresult (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  exam_id BIGINT NOT NULL,
  student_id BIGINT NOT NULL,
  mark DECIMAL(6,2) NOT NULL,
  comment VARCHAR(255) NOT NULL DEFAULT '',
  UNIQUE KEY uniq_exam_student (exam_id, student_id),
  CONSTRAINT fk_result_exam FOREIGN KEY (exam_id) REFERENCES exams_exam(id) ON DELETE CASCADE
) ENGINE=InnoDB;
```

## Notes

- The frontend tolerates a missing route (404 → empty list), so you can roll the apps out one at a time.
- `bulk/` endpoints are optional; without them the UI falls back to one request per row.
- `classes` on a subject may be a JSON array or a comma-separated string — both are handled.
