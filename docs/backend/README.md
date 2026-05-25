# Backend Systems Reference Guide

This document describes the structure, execution layers, and integration interfaces of the Django REST backend.

---

## 1. Modular Monolith Architecture

The backend is structured as a **Modular Monolith**. Each distinct domain is isolated in its own Django application folder under the `apps/` directory, minimizing circular dependencies and enforcing clean boundaries.

```
apps/
├── users/           # Authentication and authorization (RBAC)
├── ingestion/       # File parsing, normalization engines, validation, approvals
├── common/          # Cross-cutting concerns: logging, middleware, utilities
└── ai_cleaning/     # Prompt configurations and validation contracts
```

### Domain Boundaries
1. **`users` App**: Owns user account records, Argon2 security credentials, and token caching mechanisms. It does not import from `ingestion` or `ai_cleaning`.
2. **`ingestion` App**: Handles spreadsheet loading, GHG unit normalizations, compliance rules matching, and managers workflow signatures. It imports from `users` (for user profiles and managers authorization checks).
3. **`common` App**: Contains reusable modules (such as date formats converters, HSL badge mappings, and JSON logging formatters) used by all apps. It is a dependency-free utility layer.
4. **`ai_cleaning` App**: Contains Pydantic interfaces and prompts contracts to validate custom incoming LLM schemas mapping overrides.

---

## 2. Request Processing Layers

Every incoming API request transitions through these execution blocks:

```
Request ──> [Nginx/Gateway] ──> [CorrelationID Middleware] ──> [JWT Middleware] ──> [URL Router] ──> [Viewset Controller] ──> [Service Layer] ──> [Django ORM] ──> Database
```

### 1. Middleware Layer
* **`CorrelationIdMiddleware`** (in `apps/common/middleware.py`): Extracts or generates a unique UUID (correlation ID) for every request, setting it in a local thread context so that all downstream log lines carry this ID.
* **`JWTAuthentication`**: Resolves the Bearer token in the `Authorization` header, validating the signature against the database and ensuring its unique token ID (`jti`) is currently whitelisted in Redis.

### 2. Viewset Controllers
Viewsets (in `apps/ingestion/views.py`) are strictly limited to handling HTTP operations, status code mappings, and routing requests to the appropriate service methods. **Business logic is prohibited inside Viewsets.**

### 3. Service Layer
The actual business logic—such as parsing spreadsheets, matching columns, computing unit multipliers, and checking validation thresholds—is encapsulated in separate service modules (in `apps/ingestion/services/`). This isolates database transactions and facilitates unit testing.

### 4. Serializer Validation
Serializers validate data structures (data types, lengths, email formats). Business rule validation (e.g. usage threshold checks) is handled downstream by the service layer, keeping serializers reusable and thin.

---

## 3. Asynchronous Tasks with Celery

File parsing can require significant processing time (especially for multi-thousand-row spreadsheets), so this work is delegated to Celery background workers.

```
Upload Endpoint (POST) ──> Save File ──> Dispatch Celery Task ──> Return 202 Accepted Immediately
                                               │
                                               ▼
                                      [Celery Worker Thread]
                                    1. Read file using Pandas
                                    2. Parse and normalize rows
                                    3. Validate rules & log DB
```

### Task Resilience & Retry Strategy
Celery tasks are configured to handle transient errors (e.g., database lockouts or Redis disconnects) using exponential backoff:
```python
# apps/ingestion/tasks.py
@shared_task(
    bind=True,
    max_retries=3,
    default_retry_delay=5,
    autoretry_for=(OperationalError, DatabaseError)
)
def process_file_task(self, upload_id):
    ...
```
If a task encounters database connectivity failures, it retries up to 3 times before moving the ingestion status to `FAILED` and documenting the traceback in the `error_message` column of the `RawUpload` record.

---

## 4. Exception & Error Enveloping

The platform enforces a standardized REST error response schema. A global DRF exception handler intercepts all API errors (including model validation errors and permission denials) and formats them into a predictable envelope:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Cannot approve record containing unresolved high-severity validation errors.",
    "details": {
      "unresolved_errors_count": 2
    }
  }
}
```

* **Exception Handler Implementation**: Location: [exceptions.py](file:///c:/Users/shiva/OneDrive/Desktop/SAP/apps/common/exceptions.py).
* **Benefits**: Frontend clients can use a single centralized interceptor to parse and display validation or authorization messages directly inside forms and toast banners.

---

## 5. Redis Key Map

Redis acts as a high-performance message broker, whitelist register, and temporary state store:

| Key Pattern | Data Type | Purpose | TTL |
| :--- | :--- | :--- | :--- |
| `jwt:whitelist:{user_id}:{jti}` | String | Registers valid active JWT session identifiers. | Token Lifetime (e.g. 15m / 7d) |
| `celery` | List | Queue structures holding pending async tasks. | Transient |
| `rate_limit:{ip}` | String | Counters for IP-based rate limiting gates. | 1 Minute |
