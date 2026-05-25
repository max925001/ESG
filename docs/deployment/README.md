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
  * `REDIS_URL`: Endpoint ## 5. Recommended: 100% Free-Tier Unified Vercel Deployment Guide

To avoid modern web browser blocks on **third-party cookies** (since subdomains under public suffixes like `.vercel.app` are treated as separate domains, causing browsers to block cross-site cookies), we deploy **both the frontend and backend inside a single Vercel Project**. 

This hosts the entire platform on the **exact same domain** (e.g. `esg-platform.vercel.app`), making the session cookie **First-Party (Same-Site)** which bypasses all browser blocks.

### Single-Project Routing Topography

```
                       ┌───────────────────────────────┐
                       │      Vercel Deployment        │
                       │  (esg-platform.vercel.app)    │
                       └───────────────┬───────────────┘
                                       │
                ┌──────────────────────┴──────────────────────┐
                │                                             │
                ▼                                             ▼
     [Requests: /api/*]                              [Requests: /*]
     Routed to: @vercel/python                       Routed to: React static
     (config/wsgi.py lambda)                         (frontend/dist/index.html)
```

---

### Step 1: Database Setup (Neon)
Connect to your Neon database cluster:
* **ConnectionString (DATABASE_URL)**:
  ```
  postgresql://neondb_owner:npg_pHknr3c7wqQj@ep-restless-paper-ao1b8l71-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
  ```

---

### Step 2: Redis Whitelist Cache (Upstash)
* **ConnectionString (REDIS_URL)**:
  ```
  rediss://default:gQAAAAAAAZ0DAAIgcDE0N2JmZjIwNWZmYzc0YjFiOWVhMzM2M2YzY2Y0OGJjNA@funny-chigger-105731.upstash.io:6379
  ```

---

### Step 3: Deployment Setup on Vercel
We have configured the root **[vercel.json](file:///c:/Users/shiva/OneDrive/Desktop/SAP/vercel.json)** file to build both the Python backend and the static Vite frontend under a single project domain.

#### Setup Instructions:
1. Go to your [Vercel Dashboard](https://vercel.com) and click **Add New** $\rightarrow$ **Project**.
2. Connect your GitHub Repository and click **Import** next to your `max925001/ESG` repo.
3. Configure the following project parameters:
   * **Project Name**: `esg-platform`
   * **Framework Preset**: `Other` *(Vercel will read `vercel.json` and build both segments)*
   * **Root Directory**: `.` *(leave as repository root)*
4. Expand the **Environment Variables** section and add the following keys and values:
   * `DJANGO_SETTINGS_MODULE` = `config.settings.base`
   * `DEBUG` = `False`
   * `SECRET_KEY` = `django-insecure-prod-key-for-esg-portal-99`
   * `DATABASE_URL` = `postgresql://neondb_owner:npg_pHknr3c7wqQj@ep-restless-paper-ao1b8l71-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require`
   * `REDIS_URL` = `rediss://default:gQAAAAAAAZ0DAAIgcDE0N2JmZjIwNWZmYzc0YjFiOWVhMzM2M2YzY2Y0OGJjNA@funny-chigger-105731.upstash.io:6379`
   * `CELERY_BROKER_URL` = `rediss://default:gQAAAAAAAZ0DAAIgcDE0N2JmZjIwNWZmYzc0YjFiOWVhMzM2M2YzY2Y0OGJjNA@funny-chigger-105731.upstash.io:6379`
   * `CELERY_RESULT_BACKEND` = `rediss://default:gQAAAAAAAZ0DAAIgcDE0N2JmZjIwNWZmYzc0YjFiOWVhMzM2M2YzY2Y0OGJjNA@funny-chigger-105731.upstash.io:6379`
2. Connect your GitHub repository and set the **Root Directory** to `frontend` (Vercel will prompt you for this, select the `frontend` subfolder).
3. Configure the following project options:
   * **Framework Preset**: `Vite`
   * **Build Command**: `npm run build`
   * **Output Directory**: `dist`
4. Add the following **Environment Variable**:
   * `VITE_API_URL` = `https://esg-api.vercel.app` (Set to the public Vercel URL of your backend project from Step 3)
5. Click **Deploy**. Copy the resulting Vercel URL and add it to your backend's `CORS_ALLOWED_ORIGINS` environment variables list on Vercel.


