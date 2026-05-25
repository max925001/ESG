# apps/ingestion/tasks.py
from celery import shared_task
from django.db import DatabaseError
from apps.ingestion.models import RawUpload
from apps.ingestion.services.file_processor import FileProcessorService
import logging

logger = logging.getLogger('structured_logger')


@shared_task(
    bind=True,
    max_retries=3,
    default_retry_delay=60,
    acks_late=True  # Ensure task is acknowledged only after successful run or explicit failure
)
def process_file_task(self, upload_id: str) -> str:
    """
    Celery task that triggers the data ingestion, normalization, and validation pipelines.
    Supports structured retries for transient errors (e.g. database locks/intermittent drops).
    """
    logger.info(f"Celery worker picked up task for upload {upload_id}")
    
    try:
        FileProcessorService.process_file(upload_id)
        return f"Upload {upload_id} processed successfully."
        
    except DatabaseError as exc:
        # Transient database connectivity/lock errors
        logger.warning(
            f"Transient database error processing upload {upload_id}. "
            f"Retrying task in {self.default_retry_delay}s. Attempt {self.request.retries + 1}/{self.max_retries}"
        )
        try:
            self.retry(exc=exc)
        except self.MaxRetriesExceededError:
            # Dead letter logic: Mark upload as failed after exhausting retries
            logger.error(f"Celery task retries exhausted. Marking upload {upload_id} as FAILED.")
            _mark_upload_as_failed(upload_id, f"Database retries exhausted: {str(exc)}")
            raise exc

    except Exception as exc:
        # Fatal/unhandled errors
        logger.error(f"Fatal error processing upload {upload_id} inside Celery worker: {str(exc)}")
        _mark_upload_as_failed(upload_id, f"Fatal error: {str(exc)}")
        raise exc


def _mark_upload_as_failed(upload_id: str, message: str) -> None:
    """Helper to safely transition raw upload to FAILED state outside main transaction."""
    try:
        RawUpload.objects.filter(id=upload_id).update(
            status=RawUpload.STATUSES.FAILED,
            error_message=message
        )
    except Exception as e:
        logger.critical(f"Failed to mark upload {upload_id} as failed in database: {str(e)}")
