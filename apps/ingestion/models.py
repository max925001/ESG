# apps/ingestion/models.py
import uuid
from django.db import models
from django.conf import settings
from apps.common.models import BaseModel


class RawUpload(BaseModel):
    class STATUSES(models.TextChoices):
        PENDING = 'PENDING', 'Pending Processing'
        PROCESSING = 'PROCESSING', 'Processing File'
        COMPLETED = 'COMPLETED', 'Completed Ingestion'
        FAILED = 'FAILED', 'Ingestion Failed'

    class SOURCE_TYPES(models.TextChoices):
        SAP = 'sap', 'SAP Fuel Procurement'
        UTILITY = 'utility', 'Utility Electricity'
        TRAVEL = 'travel', 'Corporate Travel'

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='uploads'
    )
    status = models.CharField(
        max_length=20,
        choices=STATUSES.choices,
        default=STATUSES.PENDING,
        db_index=True
    )
    source_type = models.CharField(
        max_length=20,
        choices=SOURCE_TYPES.choices,
        db_index=True
    )
    original_filename = models.CharField(max_length=255)
    file_path = models.CharField(max_length=512)
    row_count = models.IntegerField(null=True, blank=True)
    error_message = models.TextField(null=True, blank=True)

    class Meta:
        db_table = 'raw_uploads'
        ordering = ['-created_at']


class RawRecord(BaseModel):
    raw_upload = models.ForeignKey(
        RawUpload,
        on_delete=models.CASCADE,
        related_name='raw_records'
    )
    row_number = models.IntegerField()
    data = models.JSONField()

    class Meta:
        db_table = 'raw_records'
        unique_together = ('raw_upload', 'row_number')
        ordering = ['row_number']


class NormalizedRecord(BaseModel):
    class STATUSES(models.TextChoices):
        PENDING = 'PENDING', 'Pending Analyst Approval'
        APPROVED = 'APPROVED', 'Approved and Finalized'
        REJECTED = 'REJECTED', 'Rejected'

    class CATEGORIES(models.TextChoices):
        FUEL = 'fuel', 'Fuel Consumption'
        ELECTRICITY = 'electricity', 'Electricity Consumption'
        TRAVEL = 'travel', 'Business Travel'

    raw_upload = models.ForeignKey(
        RawUpload,
        on_delete=models.CASCADE,
        related_name='normalized_records'
    )
    raw_record = models.ForeignKey(
        RawRecord,
        on_delete=models.CASCADE,
        related_name='normalized_records'
    )
    record_date = models.DateField(db_index=True)
    standard_category = models.CharField(
        max_length=20,
        choices=CATEGORIES.choices,
        db_index=True
    )
    quantity = models.DecimalField(max_digits=20, decimal_places=4)
    unit = models.CharField(max_length=20)
    data = models.JSONField(help_text="Normalized and standardized JSON attributes")
    status = models.CharField(
        max_length=20,
        choices=STATUSES.choices,
        default=STATUSES.PENDING,
        db_index=True
    )

    class Meta:
        db_table = 'normalized_records'
        ordering = ['-record_date']


class ValidationIssue(BaseModel):
    class SEVERITY_LEVELS(models.TextChoices):
        WARNING = 'warning', 'Warning (Review Advised)'
        ERROR = 'error', 'Error (Ingestion Blocked)'

    normalized_record = models.ForeignKey(
        NormalizedRecord,
        on_delete=models.CASCADE,
        related_name='validation_issues',
        null=True,
        blank=True
    )
    raw_record = models.ForeignKey(
        RawRecord,
        on_delete=models.CASCADE,
        related_name='validation_issues'
    )
    field_name = models.CharField(max_length=100)
    severity = models.CharField(
        max_length=20,
        choices=SEVERITY_LEVELS.choices,
        default=SEVERITY_LEVELS.WARNING,
        db_index=True
    )
    rule_code = models.CharField(max_length=50, db_index=True)
    message = models.TextField()
    metadata = models.JSONField(null=True, blank=True)
    
    resolved = models.BooleanField(default=False, db_index=True)
    resolved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='resolved_issues'
    )

    class Meta:
        db_table = 'validation_issues'
        ordering = ['-created_at']


class ApprovalRecord(BaseModel):
    class ACTIONS(models.TextChoices):
        APPROVED = 'approved', 'Approved'
        REJECTED = 'rejected', 'Rejected'

    normalized_record = models.ForeignKey(
        NormalizedRecord,
        on_delete=models.CASCADE,
        related_name='approvals'
    )
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='approvals'
    )
    action = models.CharField(max_length=20, choices=ACTIONS.choices)
    comments = models.TextField(null=True, blank=True)

    class Meta:
        db_table = 'approval_records'
        ordering = ['-created_at']


class AuditLog(models.Model):
    """
    Immutable audit logging records. Does not inherit soft-delete capabilities.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        null=True,
        related_name='audit_logs'
    )
    action = models.CharField(max_length=100, db_index=True)
    table_name = models.CharField(max_length=100)
    record_id = models.UUIDField(db_index=True)
    changes = models.JSONField()
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=512, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = 'audit_logs'
        ordering = ['-created_at']
