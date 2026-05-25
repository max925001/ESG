# Deployment and Infrastructure Configurations

This document explains the Docker-based container architecture, environment configuration variables, local development setup, and production deployment considerations.

---

## 1. Container Topology

The application infrastructure is fully containerized using Docker and orchestrated using Docker Compose. The environment consists of 7 services:

```
                  ┌──────────────────────────────────────────────┐
                  │                 Vite Client                  │
                  │                 (Port 3000)                  │
                  └──────────────────────┬───────────────────────┘
                                         │
                                         ▼
                  ┌──────────────────────────────────────────────┐
                  │                  Django Web                  │
                  │                 (Port 8000)                  │
                  └───────┬──────────────────────────────┬───────┘
                          │                              │
                          ▼                              ▼
              ┌──────────────────────┐        ┌──────────────────────┐
              │      PostgreSQL      │        │        Redis         │
              │     (Port 5432)      │        │     (Port 6379)      │
              └───────────┬──────────┘        └──────────┬───────────┘
                          │                              │
                          ▼                              ▼
              ┌──────────────────────┐        ┌──────────────────────┐
              │        Pgweb         │        │   Redis Commander    │
              │     (Port 8081)      │        │     (Port 8082)      │
              └──────────────────────┘        └──────────────────────┘
                          ▲                              ▲
                          │                              │
                          └────── Celery Worker / Beat ──┘
```

### Services Description
1. **`web`**: Runs the Django API server.
2. **`db`**: Runs PostgreSQL (Base transactional data store).
3. **`redis`**: Serves as the Celery message broker and the JWT session store.
4. **`celery_worker`**: Runs Celery background workers that execute CSV/JSON parsing.
5. **`celery_beat`**: Scheduled worker triggering daily compliance alerts.
6. **`pgweb`**: Visual client to query database rows (Dev mode only).
7. **`redis-commander`**: Visual interface to manage Redis caches (Dev mode only).

---

## 2. Dockerfile Design

Location: [Dockerfile](file:///c:/Users/shiva/OneDrive/Desktop/SAP/Dockerfile)

The backend container is built using a **multi-stage build** process to optimize container size and build speed:

```
Stage 1: Builder ──► Base Python ──► Install system libraries ──► Compile wheels ──► Cached Wheels
                                                                                           │
                                                                                           ▼
Stage 2: Runner  ──► Base Python ──► Copy wheels only ──► Install dependencies ──► Running Container
```

* **Security**: The runner stage creates a non-root user `django-user` and grants it permission to media directories, preventing host-level vulnerability exposures.

---

## 3. Environment Variables Configuration

The platform reads environment variables from a `.env` file at root. An example configuration is provided in **`.env.example`**:

* **Django Settings**:
  * `DEBUG`: Set to `True` for development, `False` for production.
  * `SECRET_KEY`: Central security key used to sign database sessions and templates.
* **Database Mappings**:
  * `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`: PostgreSQL connection details.
* **Redis Connections**:
  * `REDIS_URL`: Endpoint address for the Redis cache broker (e.g. `redis://redis:6379/0`).

---

## 4. Production Considerations

When transitioning from local development to production, configure the following parameters:

1. **Security Settings**:
   * Turn `DEBUG` to `False` in environment settings to hide traceback details from end users.
   * Update all passwords and secret keys with random high-entropy strings.
2. **Disable Visual Web Clients**:
   * Remove the `pgweb` and `redis-commander` containers from `docker-compose.yml` to prevent expose of backend metrics.
3. **Application Servers**:
   * Run the Django application using a production WSGI HTTP server (e.g. **Gunicorn**) with multiple worker threads, rather than the default `manage.py runserver` dev script.
4. **Database Volumes & Backups**:
   * Mount PostgreSQL data directory to durable persistent host volumes. Configure daily automated backup cron tasks.

---

## 5. 100% Free-Tier Vercel Deployment Guide

This section outlines how to deploy both the **React Frontend** and **Django Backend** to **Vercel** using entirely free serverless hosting services, backed by Neon PostgreSQL and Upstash Redis.

### Vercel Serverless Architecture

| Component | Vercel Deployment Method | Configurations |
| :--- | :--- | :--- |
| **Backend API** | Vercel Serverless Functions (`@vercel/python`) | Runs on Python 3.12, routes mapped in `vercel.json`. |
| **Ingestion Tasks** | Synchronous Eager Execution | **Celery workers cannot run as background processes in serverless functions.** We set `CELERY_TASK_ALWAYS_EAGER=True` to run parsing tasks synchronously within the Lambda execution context. |
| **Frontend client** | Vercel Static Hosting | Built from the `frontend/` subdirectory. |

---

### Step 1: Database Setup (Neon)
The system connects to your Neon database cluster:
* **ConnectionString (DATABASE_URL)**:
  ```
  postgresql://neondb_owner:npg_pHknr3c7wqQj@ep-restless-paper-ao1b8l71-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
  ```
* **Django Config**:
  `config/settings/base.py` automatically parses this URL and establishes connections with SSL enabled (`sslmode=require`).

---

### Step 2: Redis Whitelist Cache (Upstash)
Upstash handles JWT session whitelists and Celery task metadata:
* **ConnectionString (REDIS_URL)**:
  ```
  rediss://default:gQAAAAAAAZ0DAAIgcDE0N2JmZjIwNWZmYzc0YjFiOWVhMzM2M2YzY2Y0OGJjNA@funny-chigger-105731.upstash.io:6379
  ```

---

### Step 3: Backend Vercel Serverless Deployment
To deploy your Django project to Vercel, we created two files in the repository root:
1. **[vercel.json](file:///c:/Users/shiva/OneDrive/Desktop/SAP/vercel.json)**: Configures the Python 3.12 builder and routes all `/api/(.*)` requests to `config/wsgi.py`.
2. **[wsgi.py](file:///c:/Users/shiva/OneDrive/Desktop/SAP/config/wsgi.py)**: Added the `app = application` alias so Vercel can find the serverless entrypoint.

#### Deploying the Backend on Vercel:
1. Go to your [Vercel Dashboard](https://vercel.com) and click **Add New Project**.
2. Connect your GitHub Repository.
3. Configure the following project parameters:
   * **Project Name**: `esg-api`
   * **Framework Preset**: `Other` (Vercel will detect `vercel.json` and build Python automatically)
   * **Root Directory**: `.` (leave as repository root)
4. Add the following **Environment Variables** in the Vercel dashboard:
   * `DJANGO_SETTINGS_MODULE` = `config.settings.base` (Ensures Django uses base settings for Neon/Upstash)
   * `DEBUG` = `False`
   * `SECRET_KEY` = `your_django_high_entropy_secret_key`
   * `DATABASE_URL` = `postgresql://neondb_owner:npg_pHknr3c7wqQj@ep-restless-paper-ao1b8l71-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require`
   * `REDIS_URL` = `rediss://default:gQAAAAAAAZ0DAAIgcDE0N2JmZjIwNWZmYzc0YjFiOWVhMzM2M2YzY2Y0OGJjNA@funny-chigger-105731.upstash.io:6379`
   * `CELERY_BROKER_URL` = `rediss://default:gQAAAAAAAZ0DAAIgcDE0N2JmZjIwNWZmYzc0YjFiOWVhMzM2M2YzY2Y0OGJjNA@funny-chigger-105731.upstash.io:6379`
   * `CELERY_RESULT_BACKEND` = `rediss://default:gQAAAAAAAZ0DAAIgcDE0N2JmZjIwNWZmYzc0YjFiOWVhMzM2M2YzY2Y0OGJjNA@funny-chigger-105731.upstash.io:6379`
   * `CELERY_TASK_ALWAYS_EAGER` = `True` (Critical: Tells the backend to process parsing synchronously within the serverless function thread instead of waiting for a celery worker daemon)
   * `JWT_SECRET_KEY` = `your_jwt_signing_secret`

   * `CORS_ALLOWED_ORIGINS` = `https://your-frontend.vercel.app` (Replace with your actual Vercel client URL from Step 4 once deployed)
5. Click **Deploy**. Copy the resulting Vercel URL (e.g. `https://esg-api.vercel.app`).

---

### Step 4: Frontend Vercel Static Deployment
1. Go to your Vercel Dashboard and click **Add New Project**.
2. Connect your GitHub repository and set the **Root Directory** to `frontend` (Vercel will prompt you for this, select the `frontend` subfolder).
3. Configure the following project options:
   * **Framework Preset**: `Vite`
   * **Build Command**: `npm run build`
   * **Output Directory**: `dist`
4. Add the following **Environment Variable**:
   * `VITE_API_URL` = `https://esg-api.vercel.app` (Set to the public Vercel URL of your backend project from Step 3)
5. Click **Deploy**. Copy the resulting Vercel URL and add it to your backend's `CORS_ALLOWED_ORIGINS` environment variables list on Vercel.


