# REST API Reference Specifications

This document defines the REST API endpoints, schemas, authentication requirements, and validation logic of the ESG platform.

---

## 1. Authentication Endpoints

### POST `/api/v1/auth/register/`
* **Purpose**: Register a new user profile.
* **Why it exists**: Provides access control registration with role-based identities (`analyst` or `manager`).
* **Authentication**: None.
* **Request Body**:
  ```json
  {
    "email": "analyst@company.com",
    "password": "SecurePassword123!",
    "first_name": "John",
    "last_name": "Doe",
    "role": "analyst"
  }
  ```
* **Validation**:
  * `email`: Unique email string.
  * `password`: Minimum 10 characters.
  * `role`: Must be one of `analyst`, `manager`, or `admin`.
* **Response (201 Created)**:
  ```json
  {
    "success": true,
    "data": {
      "id": "8a871108-5ac3-4813-8605-a3cbfc2317e5",
      "email": "analyst@company.com",
      "first_name": "John",
      "last_name": "Doe",
      "role": "analyst",
      "is_verified": true
    }
  }
  ```

---

### POST `/api/v1/auth/login/`
* **Purpose**: Authenticate credentials and retrieve the access token and user metadata, while setting the HttpOnly refresh token cookie.
* **Why it exists**: Secure entry point for session establishment.
* **Authentication**: None.
* **Request Body**:
  ```json
  {
    "email": "analyst@company.com",
    "password": "SecurePassword123!"
  }
  ```
* **Response Headers**:
  * `Set-Cookie`: `refresh_token=eyJhbGciOiJIUzI1Ni...; HttpOnly; SameSite=Lax; Path=/;` (and `Secure` in production)
* **Response (202 Accepted)**:
  ```json
  {
    "success": true,
    "data": {
      "access": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "user": {
        "id": "8a871108-5ac3-4813-8605-a3cbfc2317e5",
        "email": "analyst@company.com",
        "role": "analyst"
      }
    }
  }
  ```

---

### POST `/api/v1/auth/refresh/`
* **Purpose**: Rotate refresh tokens and get a new access token.
* **Why it exists**: Ensures access tokens remain short-lived (15 minutes) while allowing user sessions to continue securely via cookie rotation without prompting credentials.
* **Request Cookie / Body**:
  * The endpoint automatically reads the `refresh_token` from the HttpOnly request cookies. (Alternatively supports payload `"refresh": "..."` for non-browser clients).
* **Response Headers**:
  * `Set-Cookie`: `refresh_token=eyJhbGciOiJIUzI1Ni.new...; HttpOnly; SameSite=Lax; Path=/;` (new rotated refresh token)
* **Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": {
      "access": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.new..."
    }
  }
  ```

---

### POST `/api/v1/auth/logout/`
* **Purpose**: De-authenticate user, revoke active session in Redis, and delete the refresh token cookie.
* **Why it exists**: Clear active sessions and prevent session hijacking.
* **Authentication**: JWT Access Token.
* **Response Headers**:
  * `Set-Cookie`: `refresh_token=; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=/;` (deletes cookie)
* **Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": {
      "message": "Successfully logged out and session revoked."
    }
  }
  ```


---

## 2. Ingestion & Uploads Endpoints

### POST `/api/v1/uploads/`
* **Purpose**: Upload a raw sustainability spreadsheet to trigger the parsing task.
* **Why it exists**: Acts as the data entry gateway for raw ESG records.
* **Authentication**: JWT Access Token (Analyst permissions required).
* **Request Form-Data**:
  * `source_type`: `sap` | `utility` | `travel`
  * `file`: Binary file attachment (CSV or JSON).
* **Validation**:
  * File size must not exceed **20MB** (`settings.MAX_UPLOAD_SIZE`).
  * File extensions must match `allowed_extensions` (CSV for `sap`/`utility`, JSON for `travel`).
* **Response (202 Accepted)**:
  ```json
  {
    "success": true,
    "data": {
      "id": "707d0091-55a2-4528-a52a-de3eceef2ed2",
      "status": "PENDING",
      "source_type": "sap",
      "original_filename": "sap_fuel_may2026.csv",
      "row_count": null,
      "error_message": null,
      "created_at": "2026-05-25T07:10:00Z"
    }
  }
  ```

---

### GET `/api/v1/uploads/`
* **Purpose**: List history of upload sessions.
* **Response (200 OK)**:
  ```json
  [
    {
      "id": "707d0091-55a2-4528-a52a-de3eceef2ed2",
      "status": "COMPLETED",
      "source_type": "sap",
      "original_filename": "sap_fuel_may2026.csv",
      "row_count": 4,
      "error_message": null,
      "created_at": "2026-05-25T07:10:00Z"
    }
  ]
  ```

---

## 3. Normalized Records Endpoints

### GET `/api/v1/uploads/records/`
* **Purpose**: Retrieve parsed, normalized ESG records.
* **Why it exists**: Feeds records to the analyst review grid.
* **Authentication**: JWT Access Token.
* **Query Parameters**:
  * `raw_upload`: Filter records by upload session ID.
  * `standard_category`: Filter by `fuel` | `electricity` | `travel`.
  * `status`: Filter by `PENDING` | `APPROVED` | `REJECTED`.
* **Response (200 OK)**:
  ```json
  [
    {
      "id": "rec-1",
      "raw_upload": "707d0091-55a2-4528-a52a-de3eceef2ed2",
      "raw_record": "raw-rec-1",
      "record_date": "2026-05-20",
      "standard_category": "fuel",
      "quantity": "3785.4118",
      "unit": "L",
      "data": {
        "invoice_number": "INV-SAP-101",
        "fuel_type": "diesel",
        "original_quantity": "1000",
        "original_unit": "gallons"
      },
      "status": "PENDING",
      "created_at": "2026-05-25T07:10:02Z"
    }
  ]
  ```

---

### POST `/api/v1/uploads/records/{id}/approve/`
* **Purpose**: Finalize record status (Approve or Reject).
* **Why it exists**: Provides manager sign-off governance for audit controls.
* **Authentication**: JWT Access Token (Manager/Admin role required).
* **Request Body**:
  ```json
  {
    "action": "approved",
    "comments": "Reviewed fuel log invoice details. Conformed."
  }
  ```
* **Validation**:
  * `action`: Must be one of `approved` or `rejected`.
  * **Cannot approve records containing unresolved errors** (e.g. `severity='error'`). If errors exist, returns `400 Bad Request`.
* **Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": {
      "message": "Record status successfully changed to APPROVED.",
      "record_id": "rec-1"
    }
  }
  ```

---

## 4. Quality Rules & Issues Endpoints

### GET `/api/v1/uploads/records/{id}/issues/`
* **Purpose**: List quality warnings or critical errors for a record.
* **Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "issue-1",
        "normalized_record": "rec-1",
        "field_name": "quantity",
        "severity": "warning",
        "rule_code": "SUSPICIOUS_USAGE",
        "message": "Fuel usage is unusually high (> 50000 Liters).",
        "metadata": { "quantity": "55000.0", "limit": "50000" },
        "resolved": false,
        "resolved_by_email": null
      }
    ]
  }
  ```

---

### POST `/api/v1/uploads/records/{id}/resolve-issues/`
* **Purpose**: Mark quality issues for a record as resolved.
* **Why it exists**: Allows analysts to provide commentaries explaining data anomalies.
* **Request Body**:
  ```json
  {
    "comments": "Consumption verified against warehouse utility meters."
  }
  ```
* **Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": {
      "message": "Successfully resolved 1 validation issues."
    }
  }
  ```
