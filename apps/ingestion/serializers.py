# apps/ingestion/serializers.py
import os
from rest_framework import serializers
from django.conf import settings
from apps.ingestion.models import RawUpload, RawRecord, NormalizedRecord, ValidationIssue, ApprovalRecord


class RawUploadSerializer(serializers.ModelSerializer):
    class Meta:
        model = RawUpload
        fields = ['id', 'user', 'status', 'source_type', 'original_filename', 'row_count', 'error_message', 'created_at', 'updated_at']
        read_only_fields = ['id', 'user', 'status', 'original_filename', 'row_count', 'error_message', 'created_at', 'updated_at']


class RawUploadCreateSerializer(serializers.Serializer):
    source_type = serializers.ChoiceField(choices=RawUpload.SOURCE_TYPES.choices)
    file = serializers.FileField()

    def validate_file(self, value):
        # 1. Size Validation
        if value.size > settings.MAX_UPLOAD_SIZE:
            max_mb = settings.MAX_UPLOAD_SIZE / (1024 * 1024)
            raise serializers.ValidationError(f"File size exceeds limit of {max_mb}MB.")

        # 2. Extension Validation
        ext = os.path.splitext(value.name)[1].lower()
        if ext not in settings.ALLOWED_UPLOAD_EXTENSIONS:
            raise serializers.ValidationError(
                f"Unsupported file extension '{ext}'. Only {settings.ALLOWED_UPLOAD_EXTENSIONS} files are allowed."
            )

        return value


class NormalizedRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = NormalizedRecord
        fields = ['id', 'raw_upload', 'raw_record', 'record_date', 'standard_category', 'quantity', 'unit', 'data', 'status', 'created_at']
        read_only_fields = ['id', 'raw_upload', 'raw_record', 'created_at']


class ValidationIssueSerializer(serializers.ModelSerializer):
    resolved_by_email = serializers.EmailField(source='resolved_by.email', read_only=True)

    class Meta:
        model = ValidationIssue
        fields = [
            'id', 'normalized_record', 'raw_record', 'field_name', 
            'severity', 'rule_code', 'message', 'metadata', 
            'resolved', 'resolved_by', 'resolved_by_email', 'created_at'
        ]
        read_only_fields = ['id', 'normalized_record', 'raw_record', 'severity', 'rule_code', 'message', 'metadata', 'resolved_by', 'resolved_by_email', 'created_at']


class ResolveIssueSerializer(serializers.Serializer):
    # Field to capture comments or explanation during resolution
    comments = serializers.CharField(required=False, allow_blank=True, max_length=500)


class ApproveRecordSerializer(serializers.Serializer):
    action = serializers.ChoiceField(choices=ApprovalRecord.ACTIONS.choices)
    comments = serializers.CharField(required=False, allow_blank=True, max_length=1000)
