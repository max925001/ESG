#!/usr/bin/env bash

# Exit immediately if a command exits with a non-zero status
set -e

echo "Starting Celery worker in the background..."
# Run Celery background worker with concurrency=1 to stay within Render's 512MB RAM limit
celery -A config worker --loglevel=info --concurrency=1 &

echo "Starting Gunicorn server..."
# Bind Gunicorn to the dynamic port provided by Render
gunicorn config.wsgi:application --bind 0.0.0.0:$PORT --workers 2 --threads 4 --timeout 120
