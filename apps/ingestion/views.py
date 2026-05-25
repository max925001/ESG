# apps/ingestion/views.py
import os
import uuid
from django.conf import settings
from django.db import transaction
from django.core.files.storage import FileSystemStorage
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import status, viewsets, views
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from drf_spectacular.utils import extend_schema, OpenApiParameter
from apps.users.permissions import IsESGAnalyst, IsESGManager
from apps.ingestion.models import RawUpload, NormalizedRecord, ValidationIssue, ApprovalRecord, AuditLog
from apps.ingestion.serializers import (
    RawUploadSerializer, 
    RawUploadCreateSerializer, 
    NormalizedRecordSerializer, 
    ValidationIssueSerializer,
    ResolveIssueSerializer,
    ApproveRecordSerializer
)
from apps.ingestion.tasks import process_file_task
import logging

logger = logging.getLogger(__name__)


def create_audit_log(request, action_name: str, table_name: str, record_id: str, changes: dict):
    """Utility to create an AuditLog entry from a request."""
    user = request.user if request.user and request.user.is_authenticated else None
    
    # Extract IP address
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    ip = x_forwarded_for.split(',')[0].strip() if x_forwarded_for else request.META.get('REMOTE_ADDR')
    
    user_agent = request.headers.get('User-Agent', '')[:512]
    
    AuditLog.objects.create(
        user=user,
        action=action_name,
        table_name=table_name,
        record_id=record_id,
        changes=changes,
        ip_address=ip,
        user_agent=user_agent
    )


class UploadViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API viewset to manage file uploads and trigger background jobs.
    """
    queryset = RawUpload.objects.all()
    serializer_class = RawUploadSerializer
    permission_classes = [IsAuthenticated, IsESGAnalyst]

    @extend_schema(
        request=RawUploadCreateSerializer,
        responses={202: RawUploadSerializer},
        summary="Upload a new CSV/JSON file to trigger ingestion"
    )
    def create(self, request):
        serializer = RawUploadCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        uploaded_file = serializer.validated_data['file']
        source_type = serializer.validated_data['source_type']
        
        # Save file to local storage media/uploads/
        media_dir = os.path.join(settings.BASE_DIR, 'media', 'uploads')
        os.makedirs(media_dir, exist_ok=True)
        
        # Use UUID to prevent collisions on filesystem
        unique_name = f"{uuid.uuid4()}_{uploaded_file.name}"
        fs = FileSystemStorage(location=media_dir)
        filename = fs.save(unique_name, uploaded_file)
        full_path = os.path.join(media_dir, filename)

        # Create RawUpload db metadata record
        upload = RawUpload.objects.create(
            user=request.user,
            status=RawUpload.STATUSES.PENDING,
            source_type=source_type,
            original_filename=uploaded_file.name,
            file_path=full_path
        )

        # Create audit entry
        create_audit_log(
            request=request,
            action_name="UPLOAD_FILE",
            table_name="raw_uploads",
            record_id=str(upload.id),
            changes={"source_type": source_type, "filename": uploaded_file.name}
        )

        # Trigger background Celery ingestion job
        process_file_task.delay(str(upload.id))

        response_serializer = self.get_serializer(upload)
        return Response(
            {
                "success": True,
                "data": response_serializer.data
            },
            status=status.HTTP_202_ACCEPTED
        )


class RecordViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API viewset to retrieve normalized ESG records.
    Supports filtering and role-based approvals.
    """
    queryset = NormalizedRecord.objects.all()
    serializer_class = NormalizedRecordSerializer
    permission_classes = [IsAuthenticated, IsESGAnalyst]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['raw_upload', 'standard_category', 'status']

    @extend_schema(
        responses={200: ValidationIssueSerializer(many=True)},
        summary="Get validation warnings or errors for a normalized record"
    )
    @action(detail=True, methods=['get'], url_path='issues')
    def issues(self, request, pk=None):
        record = self.get_object()
        issues = record.validation_issues.all()
        serializer = ValidationIssueSerializer(issues, many=True)
        return Response({
            "success": True,
            "data": serializer.data
        }, status=status.HTTP_200_OK)

    @extend_schema(
        request=ResolveIssueSerializer,
        responses={200: dict},
        summary="Mark all validation issues for a record as resolved"
    )
    @action(detail=True, methods=['post'], url_path='resolve-issues')
    def resolve_issues(self, request, pk=None):
        record = self.get_object()
        serializer = ResolveIssueSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        issues = record.validation_issues.filter(resolved=False)
        count = issues.count()
        
        if count == 0:
            return Response({
                "success": True,
                "data": {"message": "No unresolved issues exist for this record."}
            }, status=status.HTTP_200_OK)

        with transaction.atomic():
            issues.update(resolved=True, resolved_by=request.user)
            
            # Audit log
            create_audit_log(
                request=request,
                action_name="RESOLVE_ISSUES",
                table_name="normalized_records",
                record_id=str(record.id),
                changes={"resolved_issues_count": count, "comments": serializer.validated_data.get('comments', '')}
            )

        return Response({
            "success": True,
            "data": {"message": f"Successfully resolved {count} validation issues."}
        }, status=status.HTTP_200_OK)

    @extend_schema(
        request=ApproveRecordSerializer,
        responses={200: dict},
        summary="ESG Managers approve or reject a normalized record"
    )
    @action(detail=True, methods=['post'], url_path='approve', permission_classes=[IsAuthenticated, IsESGManager])
    def approve(self, request, pk=None):
        record = self.get_object()
        serializer = ApproveRecordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        action_type = serializer.validated_data['action']
        comments = serializer.validated_data.get('comments', '')

        # Check if record has unresolved validation errors (not warnings) before approving
        if action_type == ApprovalRecord.ACTIONS.APPROVED:
            unresolved_errors = record.validation_issues.filter(
                severity=ValidationIssue.SEVERITY_LEVELS.ERROR,
                resolved=False
            ).exists()
            if unresolved_errors:
                return Response({
                    "success": False,
                    "error": {
                        "code": "UNRESOLVED_ERRORS",
                        "message": "Cannot approve record containing unresolved high-severity validation errors.",
                        "details": {}
                    }
                }, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            # Update record status
            old_status = record.status
            record.status = (
                NormalizedRecord.STATUSES.APPROVED 
                if action_type == ApprovalRecord.ACTIONS.APPROVED 
                else NormalizedRecord.STATUSES.REJECTED
            )
            record.save(update_fields=['status'])

            # Store approval decision
            ApprovalRecord.objects.create(
                normalized_record=record,
                approved_by=request.user,
                action=action_type,
                comments=comments
            )

            # Log audit trail
            create_audit_log(
                request=request,
                action_name=f"DECISION_{action_type.upper()}",
                table_name="normalized_records",
                record_id=str(record.id),
                changes={
                    "old_status": old_status, 
                    "new_status": record.status, 
                    "comments": comments
                }
            )

        return Response({
            "success": True,
            "data": {
                "message": f"Record status successfully changed to {record.status}.",
                "record_id": str(record.id)
            }
        }, status=status.HTTP_200_OK)
