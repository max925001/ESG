# apps/common/middleware.py
import time
import json
import uuid
import logging
from contextvars import ContextVar
from django.utils.deprecation import MiddlewareMixin
from django.conf import settings

# Thread-safe ContextVar to store correlation ID
correlation_id_ctx = ContextVar('correlation_id', default='N/A')

logger = logging.getLogger('structured_logger')


class CorrelationIdFilter(logging.Filter):
    """
    Django logging filter to append correlation_id context to log records.
    """
    def filter(self, record):
        record.correlation_id = correlation_id_ctx.get()
        return True


class CorrelationIdMiddleware(MiddlewareMixin):
    """
    Middleware that reads/writes correlation IDs from request headers
    and sets them in thread context for logging and database audits.
    """
    def process_request(self, request):
        correlation_id = request.headers.get('X-Correlation-ID') or str(uuid.uuid4())
        correlation_id_ctx.set(correlation_id)
        request.correlation_id = correlation_id

    def process_response(self, request, response):
        correlation_id = getattr(request, 'correlation_id', None)
        if correlation_id:
            response['X-Correlation-ID'] = correlation_id
        # Reset the context variable to default
        correlation_id_ctx.set('N/A')
        return response


class StructuredLoggingMiddleware(MiddlewareMixin):
    """
    Middleware that intercepts requests and logs details in a structured
    JSON format, detailing latency, endpoints, users, and status codes.
    """
    def process_request(self, request):
        request.start_time = time.time()

    def process_response(self, request, response):
        if not hasattr(request, 'start_time'):
            return response

        duration = time.time() - request.start_time
        user_id = 'Anonymous'
        if request.user and request.user.is_authenticated:
            user_id = str(request.user.id)

        log_data = {
            'timestamp': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
            'correlation_id': correlation_id_ctx.get(),
            'user_id': user_id,
            'method': request.method,
            'path': request.path,
            'status_code': response.status_code,
            'duration_ms': round(duration * 1000, 2),
            'ip': self._get_client_ip(request),
            'user_agent': request.headers.get('User-Agent', '')
        }

        # Log to structured log handler
        logger.info(json.dumps(log_data))

        return response

    def _get_client_ip(self, request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0].strip()
        else:
            ip = request.META.get('REMOTE_ADDR', '')
        return ip
