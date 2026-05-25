# Deliberate Technical Tradeoffs

To ensure the platform remained stable, auditable, and regulatory-compliant, we deliberately excluded certain features during the initial design phase. This document explains those tradeoffs.

---

## 1. Automated AI Cell Repair (AI Cleaning)
* **What was excluded**: An automated background agent that automatically overwrites corrupted data cells (e.g. replacing a malformed string with inferred numeric values) during the parsing phase before the analyst sees it.
* **Why we did not build it**:
  * **Audit Violations**: Automated modifications by AI models violate strict ESG auditing guidelines. Carbon compliance auditors require full proof of data lineage. If a machine-learning model alters historical quantities without user supervision, the system loses its auditable lineage.
  * **Hallucination Risk**: An LLM might infer a missing quantity as `500` instead of `50`, introducing incorrect carbon calculations.
  * **Solution implemented instead**: Established an **interactive AI mapping workspace** that exposes confidence percentages and semantic matching explanations, leaving the final repair decision to a human analyst.

---

## 2. Direct Inline Grid Mutation of Normalized Values
* **What was excluded**: Allowing analysts to edit quantities or units directly inside the AG Grid cells in the Review Workspace.
* **Why we did not build it**:
  * **Breaks Ingestion Lineage**: Letting users edit cells directly breaks the association with the raw source files (`raw_records`). If a cell quantity is changed from `1000` to `500` in the database, the system can no longer explain *how* that number was derived from the raw CSV file.
  * **Solution implemented instead**: Analysts must either:
    1. Re-upload a corrected source file with a higher version index, or
    2. Document and resolve the issue via the Validation Issues desk using commentary overrides (leaving the base number intact but adding context for the audit trail).

---

## 3. Dynamic Custom Validation Rule Creation UI
* **What was excluded**: A user interface allowing analysts to write custom validation rules (e.g., inputting regex statements or SQL logic) directly in the web browser.
* **Why we did not build it**:
  * **Security Risks**: Letting users input arbitrary matching logic introduces risks of SQL injection or server performance exhaustion (e.g. regular expressions vulnerable to ReDoS attacks).
  * **Testing Gaps**: Dynamic rules cannot be unit-tested. Code changes should run through a continuous integration pipeline to ensure they do not introduce regression issues.
  * **Solution implemented instead**: Codified all validation rules inside a structured validation service (`apps/ingestion/services/validators.py`) that executes pre-compiled, unit-tested validation rules.
