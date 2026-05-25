# apps/common/views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from django.db import connections
from django.core.cache import cache
import redis
import logging

logger = logging.getLogger(__name__)


class HealthCheckView(APIView):
    """
    Shallow health check that returns 200 if the server is up.
    Used for load balancer ping checks.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        return Response({"status": "healthy"}, status=status.HTTP_200_OK)


class ReadinessCheckView(APIView):
    """
    Deep readiness check checking database and Redis connectivity.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        health_status = {
            "status": "ready",
            "components": {
                "database": "unknown",
                "cache": "unknown"
            }
        }
        
        # Check database
        try:
            db_conn = connections['default']
            db_conn.cursor()
            health_status["components"]["database"] = "healthy"
        except Exception as e:
            logger.error(f"Readiness check failed - Database: {str(e)}")
            health_status["status"] = "unhealthy"
            health_status["components"]["database"] = "unhealthy"

        # Check Redis cache
        try:
            # Pings redis via django cache backend
            from django.conf import settings
            client = redis.from_url(settings.REDIS_URL, socket_timeout=2)
            if client.ping():
                health_status["components"]["cache"] = "healthy"
            else:
                health_status["components"]["cache"] = "unhealthy"
                health_status["status"] = "unhealthy"
        except Exception as e:
            logger.error(f"Readiness check failed - Cache: {str(e)}")
            health_status["status"] = "unhealthy"
            health_status["components"]["cache"] = "unhealthy"

        http_status = status.HTTP_200_OK if health_status["status"] == "ready" else status.HTTP_503_SERVICE_UNAVAILABLE
        return Response(health_status, status=http_status)
