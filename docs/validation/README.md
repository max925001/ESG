# Data Quality Validation Engine

This document details the quality validation rules engine, severity levels, threshold rules, and issues resolution workflows.

---

## 1. Validation Architecture & Workflows

Validation runs in the background immediately after the normalization layer parses and saves records:

```
Ingested Record ──> Validation Engine ──> Scans active rule sets
                                                │
                 ┌──────────────────────────────┴──────────────────────────────┐
                 ▼                                                             ▼
     [Critical Blockers (Error)]                                   [Quality Anomalies (Warning)]
     - Quantity <= 0                                               - Future Dates
     - Mapped unit errors                                          - Suspicious Spike (>50k L)
                 │                                                             │
                 ▼                                                             ▼
     DB: Log ValidationIssue                                       DB: Log ValidationIssue
     * Block approvals!                                            * Flag on UI (Do not block)
```

---

## 2. Severity Classifications & Rules Map

Validation issues are stored in the database with one of the following severity levels:

### 1. `error` (Hard Blockers)
Anomalies that indicate corrupted or invalid source data. **A record containing any unresolved `error` issues cannot be approved by a Manager.**
* **Rule `MISSING_QUANTITY`**:
  * **Trigger**: Quantity is missing, null, or $\le 0$.
  * **Message**: *"Ingestion quantity is missing or less than or equal to zero."*
  * **Severity**: `error`.

### 2. `warning` (Soft Quality Warnings)
Anomalies indicating suspicious data spikes or timing conflicts. These do not block manager sign-off but should be investigated.
* **Rule `FUTURE_DATE`**:
  * **Trigger**: Invoice posting date is greater than the current system calendar date.
  * **Message**: *"Booking date 'YYYY-MM-DD' is in the future."*
  * **Severity**: `warning`.
* **Rule `SUSPICIOUS_USAGE`**:
  * **Trigger**: Fuel usage $> 50,000$ Liters, or electricity usage $> 100,000$ kWh.
  * **Message**: *"Usage is unusually high."*
  * **Severity**: `warning`.
* **Rule `DUPLICATE_INVOICE`**:
  * **Trigger**: Match found with identical quantity, date, and invoice number.
  * **Message**: *"Duplicate transaction records detected."*
  * **Severity**: `warning`.

---

## 3. Issues Desk Resolution Workflow

When validation issues are flagged:

1. **Review Workspace Highlight**:
   The `IngestionReview` table highlights the rows with issues. Clicking the alert badge opens the detail sidebar panel.
2. **Desk Resolution**:
   Analysts navigate to `/validation` (Quality Issues Desk) to inspect issues across all files:
   ```typescript
   // POST /api/v1/uploads/records/{record_id}/resolve-issues/
   // Payload: { "comments": "Meter readings verified manually" }
   ```
3. **Audit State update**:
   The backend marks the issue record as `resolved=True`, records the timestamp, and links the analyst user profile to the issue. This allows managers to approve the record immediately.
