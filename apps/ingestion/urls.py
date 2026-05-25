# apps/ingestion/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import UploadViewSet, RecordViewSet

router = DefaultRouter()
router.register(r'records', RecordViewSet, basename='normalized-record')
router.register(r'', UploadViewSet, basename='raw-upload')  # Registered at root of uploads url config

urlpatterns = [
    path('', include(router.urls)),
]
