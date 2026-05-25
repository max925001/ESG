# Architectural Decision Records (ADRs)

This document contains the Architectural Decision Records (ADRs) detailing core technology selections, design tradeoffs, and system designs constraints.

---

## ADR-1: Modular Monolith Backend Architecture

### Context
The platform must ingest corporate Scope 1/2 emissions files. While different source data structures scale independently, they share database transactions and authentication checks. Setting up microservices introduces network latency, distributed database challenges (e.g., Saga patterns), and high infrastructure management overhead.

### Decision
We will build the application as a **Modular Monolith** using Django. Different domains (users, files, normalizations, and AI schema helpers) are isolated inside distinct Django applications (`apps/users/`, `apps/ingestion/`, etc.).

### Consequences
* **Pros**: Simple transactional boundaries (local DB transactions), shared user authorization contexts, single repository management, and simple deployment.
* **Cons**: All services share the same database and CPU resource limits. If one module (like a file parser) consumes excessive CPU, it can affect API request responsiveness.
* **Tradeoff Mitigation**: We run heavy calculations (such as parsing large spreadsheets) asynchronously in background Celery worker threads, isolating CPU load.

---

## ADR-2: PostgreSQL + Redis Data Store Design

### Context
ESG compliance requires strict ACID compliance and auditing capabilities (e.g., locking records once approved). Concurrently, token validation checks must happen on every API request.

### Decision
* Use **PostgreSQL** for persistent records storage, validation histories, and audit ledgers.
* Use **Redis** for transient caching, Celery task queuing, and the JWT token whitelist cache.

### Consequences
* **ACID Durability**: PostgreSQL guarantees that database writes for record approvals, audit trails, and status updates succeed or fail together.
* **Token Speeds**: Redis lookup speeds ($<1\text{ms}$) prevent token validation checks from delaying API requests.

---

## ADR-3: Rule-Based Ingest Value Normalization

### Context
Large Language Models (LLMs) can infer column mappings when header names are unknown. However, they are non-deterministic and can produce incorrect numeric transformations or formatting errors.

### Decision
We will use **deterministic rule-based python functions** for all cell value transformations (e.g. converting gallons to liters, converting dates, and scaling metrics). We limit AI utilization to **header mapping suggestions** before processing.

### Consequences
* **Compliance Accuracy**: Carbon accounting calculations are 100% mathematically correct and auditable.
* **Traceability**: If a conversion is questioned, auditors can trace the exact logic back to static code calculations rather than opaque LLM prompts.

---

## ADR-4: Virtualized AG Grid in Review Workspace

### Context
Analysts must review large tables of ESG records, requiring sorting, filters, and custom rendering. Rendering thousands of DOM table rows degrades browser performance.

### Decision
Use **AG Grid** (Community Edition) with row virtualization and pagination for the primary review workspace dashboard.

### Consequences
* **Performance**: Virtualized grid engines only render rows visible in the viewport, maintaining fast load times even with large datasets.
* **Feature Rich**: AG Grid provides sorting, column resizing, and filtering out of the box, saving development time.
