# Auth: forgot password + admin force reset (Django)

Frontend: `src/lib/auth-api.ts`, pages `/forgot-password`, `/reset-password?uid=..&token=..`, HR → Credentials.

Assumes your custom user model has `role`, `is_locked`, `must_change_password` (already used by `/api/auth/me/`). Add `password_changed_at = models.DateTimeField(null=True, blank=True)` if you want it.

## settings.py (email)
```python
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'  # console backend for dev
EMAIL_HOST = 'smtp.gmail.com'; EMAIL_PORT = 587; EMAIL_USE_TLS = True
EMAIL_HOST_USER = 'you@school.com'; EMAIL_HOST_PASSWORD = '<app password>'
DEFAULT_FROM_EMAIL = 'Brainstar SMS <you@school.com>'
PASSWORD_RESET_TIMEOUT = 3600  # 1 hour
FRONTEND_URL = 'http://localhost:8080'
```

## core/auth_views.py
```python
from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.contrib.auth.password_validation import validate_password
from django.core.mail import send_mail
from django.utils import timezone
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from rest_framework import permissions, serializers, viewsets, status
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.response import Response

User = get_user_model()

class IsSchoolAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        u = request.user
        return bool(u and u.is_authenticated and (u.is_superuser or getattr(u, 'role', '') in ('admin', 'superadmin')))

@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def password_reset(request):
    email = (request.data.get('email') or '').strip()
    user = User.objects.filter(email__iexact=email, is_active=True).first()
    if user:
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)
        link = f"{settings.FRONTEND_URL}/reset-password?uid={uid}&token={token}"
        send_mail('Reset your Brainstar password',
                  f'Click to reset your password (valid 1 hour):\n{link}\n\nIgnore this if you did not ask.',
                  None, [user.email])
    # Same response whether or not the account exists.
    return Response({'detail': 'If the account exists, a reset link was sent.'})

@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def password_reset_confirm(request):
    try:
        user = User.objects.get(pk=force_str(urlsafe_base64_decode(request.data.get('uid', ''))))
    except Exception:
        return Response({'detail': 'Invalid reset link.'}, status=400)
    if not default_token_generator.check_token(user, request.data.get('token', '')):
        return Response({'detail': 'This reset link is invalid or has expired.'}, status=400)
    pw = request.data.get('new_password', '')
    try:
        validate_password(pw, user)
    except Exception as e:
        return Response({'detail': ' '.join(getattr(e, 'messages', [str(e)]))}, status=400)
    user.set_password(pw)
    user.must_change_password = False
    user.is_locked = False
    user.save()
    return Response({'detail': 'Password updated.'})

@api_view(['POST'])
def change_password(request):
    u = request.user
    if not u.check_password(request.data.get('current_password', '')):
        return Response({'detail': 'Current password is incorrect.'}, status=400)
    pw = request.data.get('new_password', '')
    validate_password(pw, u)
    u.set_password(pw); u.must_change_password = False; u.save()
    return Response({'detail': 'Password changed.'})

class AccountSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'role',
                  'is_active', 'is_locked', 'must_change_password', 'last_login']
        read_only_fields = fields

class AccountViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = User.objects.all().order_by('first_name', 'username')
    serializer_class = AccountSerializer
    permission_classes = [IsSchoolAdmin]

    @action(detail=True, methods=['post'], url_path='force-reset')
    def force_reset(self, request, pk=None):
        user = self.get_object()
        pw = request.data.get('new_password', '')
        validate_password(pw, user)
        user.set_password(pw)
        user.must_change_password = True
        user.is_locked = False
        user.save()
        return Response({'detail': 'Password reset.'})

    @action(detail=True, methods=['post'])
    def lock(self, request, pk=None):
        u = self.get_object()
        if u == request.user:
            return Response({'detail': 'You cannot lock your own account.'}, status=400)
        u.is_locked = True; u.save(); return Response({'detail': 'Locked.'})

    @action(detail=True, methods=['post'])
    def unlock(self, request, pk=None):
        u = self.get_object(); u.is_locked = False; u.save(); return Response({'detail': 'Unlocked.'})
```

## urls.py (inside `api/auth/`)
```python
from rest_framework.routers import DefaultRouter
from . import auth_views as v
router = DefaultRouter()
router.register('users', v.AccountViewSet, basename='account')
urlpatterns = [
    path('password-reset/', v.password_reset),
    path('password-reset/confirm/', v.password_reset_confirm),
    path('change-password/', v.change_password),
] + router.urls
```
Also make your token view refuse sign-in when `user.is_locked` is true.

## Student portal forgot password
Frontend: `/portal/forgot-password` posts `{ student_no, reset_url }`; the email link opens `/portal/reset-password?uid=..&token=..`, which reuses `password-reset/confirm/`.

```python
from students.models import Student

@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def student_password_reset(request):
    student = Student.objects.filter(student_no__iexact=(request.data.get('student_no') or '').strip()).first()
    user = getattr(student, 'user', None)  # OneToOne to the login account
    to = (user and user.email) or (student and student.guardian_email)
    if student and user and to:
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)
        link = f"{settings.FRONTEND_URL}/portal/reset-password?uid={uid}&token={token}"
        send_mail('Reset your Brainstar student portal password',
                  f'Reset the portal password for {student.first_name} ({student.student_no}):\n{link}\n\nValid for 1 hour.',
                  None, [to])
    return Response({'detail': 'If the student exists, a reset link was sent.'})
```
Add `path('student-password-reset/', v.student_password_reset),` to the auth urls.
