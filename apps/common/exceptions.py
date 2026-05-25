# apps/common/exceptions.py
from rest_framework.views import exception_handler
from rest_framework.exceptions import APIException, ValidationError
from rest_framework import status
import logging

logger = logging.getLogger(__name__)


class BaseAPIException(APIException):
    status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
    default_detail = 'A server error occurred.'
    default_code = 'SERVER_ERROR'

    def __init__(self, detail=None, code=None, details=None):
        super().__init__(detail, code)
        self.details = details or {}


class AuthenticationFailedException(BaseAPIException):
    status_code = status.HTTP_401_UNAUTHORIZED
    default_detail = 'Authentication credentials were not provided or are invalid.'
    default_code = 'UNAUTHORIZED'


class PermissionDeniedException(BaseAPIException):
    status_code = status.HTTP_403_FORBIDDEN
    default_detail = 'You do not have permission to perform this action.'
    default_code = 'FORBIDDEN'


class RecordNotFoundException(BaseAPIException):
    status_code = status.HTTP_404_NOT_FOUND
    default_detail = 'The requested record could not be found.'
    default_code = 'NOT_FOUND'


class ValidationException(BaseAPIException):
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = 'Validation failed.'
    default_code = 'VALIDATION_ERROR'


class ConflictException(BaseAPIException):
    status_code = status.HTTP_409_CONFLICT
    default_detail = 'A conflict occurred with the current state of the resource.'
    default_code = 'CONFLICT'


def custom_exception_handler(exc, context):
    """
    Custom exception handler that returns standard JSON response:
    {
      "success": false,
      "error": {
        "code": "ERROR_CODE",
        "message": "Human readable message",
        "details": {}
      }
    }
    """
    # Call DRF's default exception handler first to get the standard response
    response = exception_handler(exc, context)

    # Logging exceptions
    request = context.get('request')
    correlation_id = getattr(request, 'correlation_id', 'N/A') if request else 'N/A'
    logger.exception(f"Exception raised. Correlation ID: {correlation_id}. Error: {str(exc)}")

    if response is not None:
        # Standardize the error response format
        details = {}
        code = 'SERVER_ERROR'
        message = response.data.get('detail', str(exc))

        if isinstance(exc, ValidationError):
            code = 'VALIDATION_ERROR'
            message = 'Input validation failed.'
            # DRF's ValidationError detail is list/dict of field errors
            details = response.data
        elif hasattr(exc, 'default_code'):
            code = exc.default_code
            
        if hasattr(exc, 'details'):
            details = exc.details

        # If details contains 'detail', remove it so we don't duplicate
        if isinstance(details, dict):
            details.pop('detail', None)

        response.data = {
            'success': False,
            'error': {
                'code': code,
                'message': str(message),
                'details': details
            }
        }
    else:
        # For non-DRF unhandled exceptions (e.g. database errors or python code errors)
        # We wrap them as a 500 error in production
        from django.conf import settings
        
        message = str(exc) if settings.DEBUG else 'An internal server error occurred.'
        
        from rest_framework.response import Response
        response = Response(
            data={
                'success': False,
                'error': {
                    'code': 'INTERNAL_SERVER_ERROR',
                    'message': message,
                    'details': {}
                }
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

    return response
