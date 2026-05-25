# Platform System Architecture & Workflows

This document explains the technical architecture, request-response pipelines, and asynchronous execution lifecycles of the ESG Data Ingestion and Review Platform.

---

## 1. System Components Diagram

The platform is designed as a **Modular Monolith** backend supporting a React Single-Page Application (SPA) frontend. 

```mermaid
graph TD
    %% Frontend Layer
    subgraph Frontend_Client [Frontend Client Workspace]
        UI[React 19 SPA] --> Zustand[Zustand Local Store]
        UI --> AG[AG Grid v35 Virtual Grid]
        UI --> Axios[Axios API Client]
    end

    %% Network / Gateway
    Axios -->|HTTPS + Bearer JWT| Proxy[Vite Dev Proxy / Gateway]

    %% Backend Layer
    subgraph Backend_Server [Django REST Backend API]
        Proxy --> Router[Django URL Router]
        Router --> AuthM[JWT / Redis Session Middleware]
        AuthM --> Viewsets[DRF Viewsets & Controllers]
        Viewsets --> Services[Service Ingestion Layer]
        Services --> ORM[Django ORM]
    end

    %% Background Workers & Cache
    subgraph Worker_Broker [Broker & Session Stores]
        AuthM -->|Read/Write Whitelist IDs| Redis[(Redis Cache & Session Storage)]
        Viewsets -->|Dispatch Task| Redis
        Redis -->|Queue Tasks| Celery[Celery Background Workers]
        Celery -->|Pandas Parsing & Normalizing| ORM
    end

    %% Database Storage
    subgraph Data_Storage [Persistent Storage]
        ORM --> PostgreSQL[(PostgreSQL DB)]
    end

    classDef client fill:#d1fae5,stroke:#059669,stroke-width:2px;
    classDef server fill:#dbeafe,stroke:#2563eb,stroke-width:2px;
    classDef storage fill:#fef3c7,stroke:#d97706,stroke-width:2px;
    
    class UI,Zustand,AG,Axios client;
    class Router,AuthM,Viewsets,Services,ORM,Celery server;
    class Redis,PostgreSQL storage;
```

---

## 2. Authentication & Token Rotation Sequence

The platform uses JWT Access/Refresh token authentication with a Redis-backed session whitelist. If a refresh token is reused, or an active logout is executed, the session is invalidated instantly.

```mermaid
sequenceDiagram
    autonumber
    actor User as ESG Analyst / Manager
    participant App as React Client (Zustand)
    participant API as Django REST API
    participant Cache as Redis Session Store

    %% Registration & Login
    User->>App: Submits Login credentials
    App->>API: POST /api/v1/auth/login/ (JSON)
    API->>API: Validates credentials (Argon2)
    API->>Cache: Set whitelist keys: access_jti / refresh_jti
    API-->>App: HTTP 202 Success: Access Token + Refresh Token + Profile
    App->>App: Saves credentials in Zustand store

    %% Request with Access Token
    App->>API: GET /api/v1/uploads/records/ (Authorization: Bearer Access)
    API->>Cache: Checks if Access Token JTI is in active whitelist
    Cache-->>API: JTI is Valid
    API-->>App: HTTP 200: Normalized records list

    %% Token Expiration & Rotation
    Note over App, API: Access Token expires (15 minutes limit)
    App->>API: GET /api/v1/uploads/records/ (Authorization: Bearer Access)
    API-->>App: HTTP 401 Unauthorized (Token Expired)
    
    App->>API: POST /api/v1/auth/refresh/ (JSON Payload: Refresh Token)
    API->>Cache: Checks if Refresh JTI is in active whitelist
    Cache-->>API: JTI is Valid
    API->>Cache: Revokes (deletes) old Refresh JTI from whitelist
    API->>Cache: Sets new Access JTI and Refresh JTI in whitelist
    API-->>App: HTTP 200: Returns New Access + New Refresh
    App->>App: Overwrites credentials in Zustand store
    App->>API: Retries failed request (Authorization: Bearer New Access)
    API-->>App: HTTP 200: Normalized records list
```

---

## 3. End-to-End Ingestion Request Flow

When an Analyst ingests a CSV or JSON file, parsing and unit normalizing is executed asynchronously in the background.

```mermaid
flowchart TD
    A[Analyst selects SAP File] --> B[React: Dropzone Validation]
    B -->|Check Extension & Size < 20MB| C[Form Data POST to /api/v1/uploads/]
    C --> D[Django: Save File to media/uploads/]
    D --> E[Django: Create RawUpload Record status=PENDING]
    E --> F[Django: Write Audit Log UPLOAD_FILE]
    F --> G[Celery: Dispatch Task process_file_task.delay]
    G -->|Returns HTTP 202 Accepted| H[React: Ingestion state=PENDING]

    subgraph Celery Background Work [Celery Worker Execution]
        I[Load Ingestion Service: SAP/Utility/Travel] --> J[Pandas: Parse Raw Rows]
        J --> K[Parser: Extract Row Numbers and JSON payloads]
        K --> L[Normalizer: Convert Units & Standardize Dates]
        L --> M[Validator: Scan Validation Rules]
        M --> N[ORM: Save RawRecords & NormalizedRecords]
        N --> O[ORM: Save ValidationIssues in DB]
        O --> P[Update RawUpload status=COMPLETED]
    end
    
    G -.-> I
    P -.-> Q[React: Polls status=COMPLETED]
    Q --> R[React: AG Grid loads list and Validation Desk updates]
```

---

## 4. Record Approval Lifecycle

Normalized records must undergo manager reviews before inclusion in GHG emission reports.

```mermaid
sequenceDiagram
    autonumber
    actor Manager as ESG Manager
    participant App as React Client
    participant API as Django REST API
    participant DB as PostgreSQL DB
    participant Ledger as AuditLog Table

    Manager->>App: Opens /approvals workspace
    App->>API: GET /api/v1/uploads/records/ (Query: status=PENDING)
    API-->>App: Returns array of pending records with quality warnings
    App->>App: Disables Approve button if critical issues exist
    Manager->>App: Fills comments and clicks "Approve Record"
    App->>API: POST /api/v1/uploads/records/{id}/approve/ (action=approved)
    
    API->>API: Validates IsESGManager role
    API->>API: Verifies record has no unresolved validation errors
    
    rect rgb(30, 41, 59)
        Note over API, DB: Transaction boundary
        API->>DB: Updates normalized_records.status = 'APPROVED'
        API->>DB: Inserts row into approval_records table
        API->>Ledger: Inserts row into audit_logs table
    end
    
    API-->>App: HTTP 200: Success status change message
    App->>App: Updates grid locally and triggers fetchRecords()
    App-->>Manager: Displays success toast banner
```
