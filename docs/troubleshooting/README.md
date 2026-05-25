# SRE & Developer Troubleshooting Handbook

This document contains standard diagnostic checks and recovery procedures for common system failures.

---

## 1. Ingestion Pipeline & Parsing Failures

### Symptom: Upload status is stuck on `PROCESSING` or marked `FAILED`
* **Root Cause 1: Missing Headers**:
  The raw CSV is missing columns required by the parser (e.g. `menge` in SAP fuel).
  * **Diagnostic**: Check the `error_message` column on the `RawUpload` record via the database or API.
  * **Recovery**: Verify column headers match the expected schema or use the **AI Schema Mapping Console** (`/ai-cleaning`) to align headers.
* **Root Cause 2: Date Parsing Failure**:
  Spreadsheet stores date in a format not recognized by the parser (e.g., `2026/05/20` instead of `20.05.2026` or `2026-05-20`).
  * **Recovery**: Modify the date parser rules in `apps/common/utils/dates.py` to support the new format.

---

## 2. Celery Worker Queue Starvation

### Symptom: File status stays in `PENDING` indefinitely
* **Root Cause: Celery Workers are Offline**:
  The Celery worker container is down, or Redis has disconnected.
  * **Diagnostics**:
    ```bash
    # Check Celery worker status inside container
    celery -A config status
    
    # Inspect docker logs
    docker compose logs celery_worker
    ```
  * **Recovery**:
    Restart the Celery and Redis containers:
    ```bash
    docker compose restart redis celery_worker
    ```

---

## 3. JWT Token Session Revocations

### Symptom: Analysts get logged out immediately after refreshing tokens
* **Root Cause: Whitelist Whack-a-Mole**:
  Redis has run out of memory (OOM) or flushed its cache. The refresh JTI cannot be validated.
  * **Diagnostics**:
    ```bash
    # Test Redis connection
    docker compose exec redis redis-cli ping
    ```
  * **Recovery**:
    If Redis is down or caching is disabled, restart the service. In case of memory exhaustion, increase Redis maxmemory limit or update the eviction policy to `volatile-lru`.

---

## 4. Database Lockouts & Migration Inconsistencies

### Symptom: viewsets return 500 error during db insertions
* **Root Cause: Database Lock/Deadlocks**:
  Concurrent Celery task threads are locking database rows (e.g., duplicate checks on identical invoices).
  * **Diagnostics**:
    Check PostgreSQL logs:
    ```bash
    docker compose logs db
    ```
  * **Recovery**:
    Restart the database service to clear deadlocks:
    ```bash
    docker compose restart db
    ```
