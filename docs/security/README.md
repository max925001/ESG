# System Security Architecture

This document describes the security protocols, encryption parameters, token session whitelisting, and role-based filters of the platform.

---

## 1. Authentication & JWT Whitelist Cache

To maintain high security and allow immediate session revocation (logout), the platform implements a **Redis-backed token whitelist cache**:

```
JWT Access Token (Analyst/Manager) ──► API Request ──► [Auth Middleware]
                                                            │
                                                            ▼
                                                    [Redis Cache Lookup]
                                                   Check: jwt:whitelist:{jti}
                                                            │
                                        ┌───────────────────┴───────────────────┐
                                        ▼                                       ▼
                                  [Key Exists]                           [Key Not Found]
                                  Token is Valid                     Returns 401 Unauthorized
```

### Why Whitelisting Instead of Standard Blacklisting?
In a standard JWT system, access tokens are stateless and cannot be revoked before their expiration time.
1. **Immediate Revocation**: When a user logs out or rotates a token, the corresponding whitelist key is deleted from Redis, invalidating the session immediately.
2. **Mitigating Token Theft**: Stolen tokens become unusable once the session is revoked.

---

## 2. Token Lifetime & Rotation Policies & Secure Storage

The platform enforces strict rules on credential lifetimes and secure storage boundaries to prevent Cross-Site Scripting (XSS) and Cross-Site Request Forgery (CSRF) exploits:

* **Password Hashing**: User passwords are encrypted using **Argon2id** (configured via `django-argon2`).
* **Refresh Token Storage (Cookie-Based)**: 
  * The `refresh_token` (7 days lifetime) is stored in a browser-managed cookie configured with `HttpOnly`, `SameSite=Lax`, and `Secure` flags.
  * Storing it as `HttpOnly` blocks access from client-side JavaScript, neutralizing token theft via XSS vulnerabilities.
* **Access Token & Profile Storage (In-Memory)**:
  * The short-lived `access_token` (15 minutes lifetime) and user metadata profile are stored strictly in-memory in the frontend Zustand store.
  * No tokens or user profile data are saved to `localStorage` or `sessionStorage`.
* **Rotation Policy**:
  * When `/api/v1/auth/refresh/` is called, the old refresh token is deleted from the Redis whitelist, a new access token and rotated refresh token are generated, and the browser cookie is updated. This prevents replay attacks and token reuse.


---

## 3. Role-Based Access Control (RBAC)

The application defines three roles inside the custom User model:

| Role Name | Scope | Authorization Filters |
| :--- | :--- | :--- |
| **`analyst`** | ESG data entry, parsing supervision, and validation. | Can call upload endpoints, view records, and resolve quality desk issues. Blocked from approvals. |
| **`manager`** | Audit review and quality compliance check. | Can call the bulk approval and rejection endpoints. |
| **`admin`** | System configurations and user management. | Inherits all manager and analyst capabilities. |

### API Implementation
Permissions are checked at the DRF controller layer using custom classes:
```python
# apps/users/permissions.py
class IsESGAnalyst(BasePermission):
    def has_permission(self, request, view):
        return request.user.role in ['analyst', 'manager', 'admin']

class IsESGManager(BasePermission):
    def has_permission(self, request, view):
        return request.user.role in ['manager', 'admin']
```

---

## 4. Input & File Ingestion Security

File uploads represent a significant attack vector (e.g. Remote Code Execution, Path Traversal, Denial of Service). The platform implements these controls:

1. **Size Validation**:
   Files are limited to **20MB** (`settings.MAX_UPLOAD_SIZE`) to prevent disk space exhaustion attacks.
2. **Extension Sanitization**:
   The upload endpoint rejects files with extensions other than `.csv` or `.json`.
3. **Randomized File Storage**:
   Upload files are saved using a randomized UUID prefix:
   ```python
   unique_name = f"{uuid.uuid4()}_{uploaded_file.name}"
   ```
   This prevents directory traversal attacks and overwriting existing files on the disk.
