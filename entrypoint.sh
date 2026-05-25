#!/bin/sh
# entrypoint.sh

set -e

# Wait for PostgreSQL
if [ -n "$DATABASE_URL" ]; then
    URL_WITHOUT_PROTO=$(echo "$DATABASE_URL" | sed -E 's/^postgresql?:\/\///')
    URL_WITHOUT_CRED=$(echo "$URL_WITHOUT_PROTO" | sed -E 's/^[^@]+@//')
    DB_HOST=$(echo "$URL_WITHOUT_CRED" | sed -E 's/^([^:\/]+).*/\1/')
    DB_PORT=$(echo "$URL_WITHOUT_CRED" | sed -E 's/^[^:]+:([0-9]+).*/\1/')
    if [ -z "$DB_PORT" ] || ! echo "$DB_PORT" | grep -Eq '^[0-9]+$'; then
        DB_PORT=5432
    fi
    echo "Waiting for postgres on $DB_HOST:$DB_PORT..."
    while ! nc -z "$DB_HOST" "$DB_PORT"; do
      sleep 0.1
    done
    echo "PostgreSQL started"
elif [ -n "$DB_HOST" ]; then
    echo "Waiting for postgres on $DB_HOST:$DB_PORT..."
    while ! nc -z "$DB_HOST" "$DB_PORT"; do
      sleep 0.1
    done
    echo "PostgreSQL started"
fi

# Wait for Redis
if [ -n "$REDIS_URL" ]; then
    # Strip protocol prefix (redis:// or rediss://)
    URL_WITHOUT_PROTO=$(echo "$REDIS_URL" | sed -E 's/^rediss?:\/\///')
    
    # Strip user:password if present (everything up to '@')
    URL_WITHOUT_CRED=$(echo "$URL_WITHOUT_PROTO" | sed -E 's/^[^@]+@//')
    
    # Extract host (everything up to the colon or slash)
    REDIS_HOST=$(echo "$URL_WITHOUT_CRED" | sed -E 's/^([^:\/]+).*/\1/')
    
    # Extract port (everything between colon and next slash or end)
    REDIS_PORT=$(echo "$URL_WITHOUT_CRED" | sed -E 's/^[^:]+:([0-9]+).*/\1/')
    
    if [ -z "$REDIS_PORT" ]; then
        REDIS_PORT=6379
    fi
    echo "Waiting for redis on $REDIS_HOST:$REDIS_PORT..."
    while ! nc -z "$REDIS_HOST" "$REDIS_PORT"; do
      sleep 0.1
    done
    echo "Redis started"
fi

# Run migrations and collect static files only for the web process (avoiding concurrent race conditions in Celery workers)
IS_WEB_PROCESS=false
if [ "$RUN_MIGRATIONS" = "true" ]; then
    IS_WEB_PROCESS=true
elif [ "$1" = "python" ] && [ "$2" = "manage.py" ] && [ "$3" = "runserver" ]; then
    IS_WEB_PROCESS=true
elif [ "$1" = "gunicorn" ]; then
    IS_WEB_PROCESS=true
fi

if [ "$IS_WEB_PROCESS" = "true" ]; then
    echo "Running database migrations..."
    python manage.py migrate --noinput

    echo "Collecting static files..."
    python manage.py collectstatic --noinput --clear || true
fi

exec "$@"
