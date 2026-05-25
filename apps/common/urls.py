# apps/common/urls.py
from django.urls import path
from .views import HealthCheckView, ReadinessCheckView

urlpatterns = [
    path('health/', HealthCheckView.as_view(), name='health-check'),
    path('readiness/', ReadinessCheckView.as_view(), name='readiness-check'),
]
