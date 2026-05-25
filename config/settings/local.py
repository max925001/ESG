# config/settings/local.py
from .base import *

DEBUG = True

ALLOWED_HOSTS = ['*']

# Optional: Disable password validators for local dev ease if desired, but keep them for parity.
AUTH_PASSWORD_VALIDATORS = []

# CORS wildcard for easy frontend local connections
CORS_ALLOW_ALL_ORIGINS = True
