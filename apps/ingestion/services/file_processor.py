# apps/ingestion/services/file_processor.py
from django.db import transaction
from apps.ingestion.models import RawUpload, RawRecord, NormalizedRecord, ValidationIssue
from apps.ingestion.services.sap.parser import SAPParser
from apps.ingestion.services.sap.normalizer import SAPNormalizer
from apps.ingestion.services.sap.validator import SAPValidator

from apps.ingestion.services.utility.parser import UtilityParser
from apps.ingestion.services.utility.normalizer import UtilityNormalizer
from apps.ingestion.services.utility.validator import UtilityValidator

from apps.ingestion.services.travel.parser import TravelParser
from apps.ingestion.services.travel.normalizer import TravelNormalizer
from apps.ingestion.services.travel.validator import TravelValidator

import logging

logger = logging.getLogger(__name__)


class FileProcessorService:
    @staticmethod
    def process_file(upload_id: str) -> None:
        """
        Coordinates parsing, raw storage, normalization, and validation
        for an uploaded file inside a transaction block.
        """
        try:
            upload = RawUpload.objects.get(id=upload_id)
        except RawUpload.DoesNotExist:
            logger.error(f"Cannot process upload. Upload {upload_id} not found.")
            return

        # Check current status
        if upload.status in [RawUpload.STATUSES.PROCESSING, RawUpload.STATUSES.COMPLETED]:
            logger.warning(f"Upload {upload_id} is already in state {upload.status}. Skipping.")
            return

        logger.info(f"Starting ingestion process for upload {upload_id} ({upload.source_type})")
        
        # Set state to PROCESSING
        upload.status = RawUpload.STATUSES.PROCESSING
        upload.save(update_fields=['status'])

        # Resolve pipeline components based on source type
        if upload.source_type == RawUpload.SOURCE_TYPES.SAP:
            parser = SAPParser
            normalizer = SAPNormalizer
            validator = SAPValidator
        elif upload.source_type == RawUpload.SOURCE_TYPES.UTILITY:
            parser = UtilityParser
            normalizer = UtilityNormalizer
            validator = UtilityValidator
        elif upload.source_type == RawUpload.SOURCE_TYPES.TRAVEL:
            parser = TravelParser
            normalizer = TravelNormalizer
            validator = TravelValidator
        else:
            upload.status = RawUpload.STATUSES.FAILED
            upload.error_message = f"Unsupported source type: {upload.source_type}"
            upload.save(update_fields=['status', 'error_message'])
            return

        # Keep track of local invoice duplicates during this file run
        local_invoice_cache = set()
        
        # Helper function to check historical duplicates in the DB
        def make_db_duplicate_checker(source_type, current_upload_id):
            def check_db(invoice_num):
                # Search JSONB field for invoice_number or ticket_number
                if source_type == 'travel':
                    return NormalizedRecord.objects.filter(
                        standard_category='travel',
                        data__ticket_number=invoice_num
                    ).exclude(raw_upload_id=current_upload_id).exists()
                else:
                    return NormalizedRecord.objects.filter(
                        standard_category=source_type,
                        data__invoice_number=invoice_num
                    ).exclude(raw_upload_id=current_upload_id).exists()
            return check_db

        db_duplicate_checker = make_db_duplicate_checker(upload.source_type, upload.id)

        # Combined validator checker that queries memory cache and database
        def composite_duplicate_checker(invoice_num):
            if not invoice_num:
                return False
            # Check local file first
            if invoice_num in local_invoice_cache:
                return True
            # Check DB
            if db_duplicate_checker(invoice_num):
                return True
            # Cache it locally for subsequent rows in this same file
            local_invoice_cache.add(invoice_num)
            return False

        row_count = 0
        
        try:
            # We process rows and save within atomic transactions
            with transaction.atomic():
                for raw_row in parser.parse(upload.file_path):
                    row_number = raw_row.get('_row_number')
                    
                    # Store RawRecord
                    # Filter out helper row number field
                    raw_data_clean = {k: v for k, v in raw_row.items() if k != '_row_number'}
                    raw_record = RawRecord.objects.create(
                        raw_upload=upload,
                        row_number=row_number,
                        data=raw_data_clean
                    )
                    row_count += 1

                    # Attempt Normalization
                    try:
                        normalized_data = normalizer.normalize(raw_data_clean)
                        
                        # Store NormalizedRecord
                        normalized_record = NormalizedRecord.objects.create(
                            raw_upload=upload,
                            raw_record=raw_record,
                            record_date=normalized_data['record_date'],
                            standard_category=normalized_data['standard_category'],
                            quantity=normalized_data['quantity'],
                            unit=normalized_data['unit'],
                            data=normalized_data['data'],
                            status=NormalizedRecord.STATUSES.PENDING
                        )

                        # Run Validation checks
                        for issue in validator.validate(
                            raw_row=raw_data_clean,
                            normalized_row=normalized_data,
                            historical_invoice_checker=composite_duplicate_checker
                        ):
                            ValidationIssue.objects.create(
                                normalized_record=normalized_record,
                                raw_record=raw_record,
                                field_name=issue['field_name'],
                                severity=issue['severity'],
                                rule_code=issue['rule_code'],
                                message=issue['message'],
                                metadata=issue['metadata']
                            )

                    except Exception as norm_err:
                        logger.warning(f"Normalization failed for row {row_number} in upload {upload.id}: {str(norm_err)}")
                        # Save validation issue without normalized_record (normalization failed)
                        ValidationIssue.objects.create(
                            raw_record=raw_record,
                            field_name='row',
                            severity=ValidationIssue.SEVERITY_LEVELS.ERROR,
                            rule_code='MALFORMED_ROW',
                            message=f"Normalization failed: {str(norm_err)}",
                            metadata={'error': str(norm_err)}
                        )

            # Update upload status on success
            upload.status = RawUpload.STATUSES.COMPLETED
            upload.row_count = row_count
            upload.save(update_fields=['status', 'row_count'])
            logger.info(f"Ingestion completed successfully for upload {upload.id}. Processed {row_count} rows.")

        except Exception as e:
            logger.exception(f"Fatal error processing upload {upload.id}")
            upload.status = RawUpload.STATUSES.FAILED
            upload.error_message = f"Process failed: {str(e)}"
            upload.save(update_fields=['status', 'error_message'])
            raise e
