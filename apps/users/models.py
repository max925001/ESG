# apps/users/models.py
from django.db import models
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin, BaseUserManager
from apps.common.models import BaseModel, SoftDeleteManager


class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('Users must have an email address')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_verified', True)
        extra_fields.setdefault('role', User.ROLES.ADMIN)

        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')

        return self.create_user(email, password, **extra_fields)


class User(BaseModel, AbstractBaseUser, PermissionsMixin):
    class ROLES(models.TextChoices):
        ANALYST = 'analyst', 'ESG Analyst'
        MANAGER = 'manager', 'ESG Manager'
        ADMIN = 'admin', 'System Administrator'

    email = models.EmailField(unique=True, max_length=255, db_index=True)
    first_name = models.CharField(max_length=150, blank=True)
    last_name = models.CharField(max_length=150, blank=True)
    
    role = models.CharField(
        max_length=20,
        choices=ROLES.choices,
        default=ROLES.ANALYST,
        db_index=True
    )
    
    is_verified = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []

    # Use standard manager for auth-related lookups so Django admin / auth can see all including soft-deleted if needed,
    # but filter soft-deleted by default. Let's configure custom managers.
    objects = UserManager()

    class Meta:
        db_table = 'users'
        indexes = [
            models.Index(fields=['email', 'deleted_at']),
        ]

    def __str__(self):
        return f"{self.email} ({self.role})"
