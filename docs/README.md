# ESG Data Ingestion & Review Platform Documentation

Welcome to the internal engineering wiki and architecture handbook for the Enterprise ESG Ingestion and Review Platform. This documentation details the system design, implementation patterns, workflows, and developer onboarding procedures.

---

## 1. Project Overview & Business Context

### The Business Problem
Enterprises must declare Scope 1 (direct fuel combustion) and Scope 2 (purchased electricity and travel) greenhouse gas (GHG) emissions for regulatory compliance (e.g. CSRD, SEC rules). However, environmental footprint data is scattered across multiple incompatible formats:
* **SAP spreadsheets**: Contain raw fuel procurement amounts, often formatted in German (e.g., `Menge` for quantity) or non-standard metric keys.
* **Utility electricity bills**: Exported from energy meters in varying unit bases (e.g., MWh, kWh) with manual formatting and data entry errors.
* **Corporate travel exports**: Contain mileage records from booking portals without carbon conversions.

### The Solution
This platform establishes a **modular monolith** ingestion engine that parses, normalizes, validates, and audits Scope 1/2 raw environmental records. Key workflow priorities are:
1. **Automated Normalization**: Converting diverse metrics to standard ISO values (e.g., US Gallons to Liters, MWh to kWh, Miles to Kilometers).
2. **Quality Validation Engines**: Running backend rules to flag issues (e.g., duplicate entries, future dates, suspicious usage spikes).
3. **Manager-Sign-Offs Governance**: Segregating duties so only ESG Managers can finalize records for reporting.
4. **AI-Assisted Operations**: Allowing analysts to map unknown schemas and inspect cell-level parsing repairs.
5. **Auditable Ledger**: Maintaining an immutable audit log of all record updates, logins, and approvals.

---

## 2. Technology Stack

### Backend Services
* **Python 3.12** / **Django 5.0**: Core server framework utilizing service layers.
* **Django REST Framework (DRF)**: Powers the secure JSON REST API endpoints.
* **PostgreSQL**: Durable storage utilizing explicit indexing for high-density audits.
* **Redis**: Acts as the Celery message broker and holds whitelisted JWT token rotation IDs.
* **Celery**: Offloads CSV/JSON ingestion and unit parsing to background workers.
* **Pandas**: Used inside background parser services for efficient spreadsheet processing.

### Frontend Client
* **React 19** / **Vite 8**: SPA framework configured with native asset bundling.
* **TypeScript**: Enforces typing matching the backend schema interfaces.
* **Tailwind CSS v4**: Theme system using HSL variable mappings for Light/Dark modes.
* **AG Grid v35**: High-density grid rendering with virtualized scrolling.
* **Zustand**: Handles global client states (Auth credentials, UI toasts).

---

## 3. Directory Layout

```
ROOT/
├── apps/                    # Backend Modular Apps
│   ├── users/               # Custom User, JWT simple_jwt blacklist cache
│   ├── ingestion/           # Ingestion parsing, models, viewsets, Celery tasks
│   ├── common/              # Global exceptions handler, date/emissions utilities
│   └── ai_cleaning/         # Pydantic schemas, prompt builders, AI contracts
├── config/                  # Core Django Config
│   ├── settings/            # settings.py split (base.py, local.py, production.py)
│   └── urls.py              # Central routing mapping
├── frontend/                # React Vite Workspace
│   ├── src/
│   │   ├── components/      # UI Shell components (Sidebar, Topbar, AppShell)
│   │   ├── store/           # Zustand stores (authStore, uiStore)
│   │   ├── pages/           # Viewpages (Dashboard, IngestionReview, AICleaning, etc.)
│   │   └── lib/             # Axios client interceptors
│   ├── package.json
│   └── vite.config.ts
├── docs/                    # Technical Documentation Suite (THIS DIRECTORY)
├── docker-compose.yml       # Orchestrates app, workers, redis, pg, and pgweb
├── Dockerfile               # Multi-stage Python compiler container
└── manage.py                # Django manager scripts
```

---

## 4. Documentation Index

To explore detailed engineering aspects, navigate to the following manuals:

1. **[System Design & Diagrams](file:///c:/Users/shiva/OneDrive/Desktop/SAP/docs/architecture/README.md)**: Overall architecture, data-flow diagrams, sequence graphs, and lifecycle maps.
2. **[Backend Reference](file:///c:/Users/shiva/OneDrive/Desktop/SAP/docs/backend/README.md)**: Service layer patterns, Celery workers structure, and middleware details.
3. **[Frontend Reference](file:///c:/Users/shiva/OneDrive/Desktop/SAP/docs/frontend/README.md)**: Zustand state managers, AG Grid rendering configurations, and theme setups.
4. **[REST API Specifications](file:///c:/Users/shiva/OneDrive/Desktop/SAP/docs/api/README.md)**: Auth, upload, validation, and approval endpoint schemas.
5. **[Database & Schema Guide](file:///c:/Users/shiva/OneDrive/Desktop/SAP/docs/database/README.md)**: Entity Relationship (ER) diagrams, indexing, constraints, and audit trails.
6. **[Ingestion Pipelines](file:///c:/Users/shiva/OneDrive/Desktop/SAP/docs/ingestion/README.md)**: CSV/JSON parsing algorithms and retry error limits.
7. **[Normalization Rules](file:///c:/Users/shiva/OneDrive/Desktop/SAP/docs/normalization/README.md)**: Conversion formulas, category mapping, and duplicate checks.
8. **[Validation Rules](file:///c:/Users/shiva/OneDrive/Desktop/SAP/docs/validation/README.md)**: Engine criteria, issues desks, and critical blocker thresholds.
9. **[AI Cleaning & Schema Inference](file:///c:/Users/shiva/OneDrive/Desktop/SAP/docs/ai-cleaning/README.md)**: Assistive mapping, confidence metrics, and cell repair protocols.
10. **[Security Specifications](file:///c:/Users/shiva/OneDrive/Desktop/SAP/docs/security/README.md)**: JWT token rotators, role-based controls (RBAC), and sanitization boundaries.
11. **[Authentication & Session Handbook](file:///c:/Users/shiva/OneDrive/Desktop/SAP/docs/auth/README.md)**: Cookie-and-memory hybrid JWT flow, backend rotation view logic, and frontend session restore.
12. **[Deployment & Environment](file:///c:/Users/shiva/OneDrive/Desktop/SAP/docs/deployment/README.md)**: Local configurations, compose networks, and production guidelines.
13. **[Architectural Decisions (ADRs)](file:///c:/Users/shiva/OneDrive/Desktop/SAP/docs/decisions/README.md)**: Context, tradeoffs, and consequences for design paths chosen.
14. **[Troubleshooting Handbook](file:///c:/Users/shiva/OneDrive/Desktop/SAP/docs/troubleshooting/README.md)**: SRE recovery guide for worker failures, database locking, and token expiration.
15. **[Durable Data Model Spec](file:///c:/Users/shiva/OneDrive/Desktop/SAP/docs/MODEL.md)**: Explains multi-tenancy context, Scope 1/2/3 mapping rules, and database schema diagrams.
16. **[Resolved Ambiguities & Choices](file:///c:/Users/shiva/OneDrive/Desktop/SAP/docs/DECISIONS.md)**: Tracks every resolved engineering ambiguity and PM follow-ups.
17. **[Technical Tradeoffs Guide](file:///c:/Users/shiva/OneDrive/Desktop/SAP/docs/TRADEOFFS.md)**: Analyzes three deliberately unbuilt platform features and rationale.
18. **[Data Sources Manual](file:///c:/Users/shiva/OneDrive/Desktop/SAP/docs/SOURCES.md)**: Details researched real-world CSV/JSON specifications and failure points.
