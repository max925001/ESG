# Architectural Decisions & Ambiguities Resolved

This document outlines the ambiguities resolved during development, the reasoning behind specific technical decisions, the exact subset of data handled from each source, and key questions we would pose to the Product Manager.

---

## 1. Ambiguities Resolved

### 1. In-Memory vs. Local Token Storage
* **Ambiguity**: Storing JWT tokens and user profile records in the browser's `localStorage` is insecure and violates enterprise compliance, yet many standard React templates store them there for convenience.
* **Resolution**: Migrated the frontend to a hybrid cookie-and-memory flow. The long-lived `refresh_token` is stored as an `HttpOnly` cookie set by Django, while the short-lived `access_token` and user profile parameters are stored strictly in-memory in Zustand. Theme preferences remain in `localStorage` since they contain no sensitive credentials.

### 2. Floats vs. Decimals for Quantities
* **Ambiguity**: The initial requirements did not specify the required numerical precision for environmental quantities. Standardizing to Float fields can cause floating-point arithmetic errors (e.g., `0.1 + 0.2 = 0.30000000000000004`).
* **Resolution**: Overrode the database model and serialization layers to enforce `DecimalField(max_digits=20, decimal_places=4)`. This guarantees exact precision matching corporate audit guidelines.

### 3. Date Formatting Inconsistencies
* **Ambiguity**: SAP fuel logs contained German date strings (`Buchungsdatum`, formatted as `DD.MM.YYYY`), corporate travel JSON exports used epoch milliseconds (`1779235200000`), and utility bills used ISO dates (`YYYY-MM-DD`).
* **Resolution**: Built a robust, unified date parser service on the backend (`apps/common/services/parsers.py`) that executes a deterministic parsing waterfall. It tries ISO format, falls back to German/slash layouts, and handles numeric Unix epochs in both seconds and milliseconds, avoiding parsing failures.

### 4. Overriding Validation Errors
* **Ambiguity**: The system flags validation issues (e.g. `SUSPICIOUS_USAGE` warnings or `FUTURE_DATE` errors). It was unclear if resolving a validation issue should modify the underlying record or merely add a commentary overlay.
* **Resolution**: Established that the raw record and the normalized record value remain unmodified to preserve lineage integrity. The resolution instead updates the `resolved` boolean in the `validation_issues` table and links a user-provided commentary explaining the anomaly. Managers can then sign off on the record knowing the context.

---

## 2. Source Subsets Handled & Ignored

For each of the three raw data sources, the backend parser services filter out noise to keep database indices optimized:

### 1. SAP Fuel Procurement CSV
* **Handled Subset**:
  * `Belegnummer` (Invoice number, mapped to normalized invoice tracking).
  * `Buchungsdatum` (Booking date, parsed into Standard Date).
  * `Menge` (Quantity, parsed as Decimal, replacing German commas with dots).
  * `Einheit` (Unit, mapped to converter).
  * `Kraftstoffart` (Fuel type, used to catalog emissions).
* **Ignored Subset**:
  * Cost Center fields, general ledger codes, driver IDs, and vehicle odometer readings. These are transactional accounting fields and do not affect Scope 1 GHG emissions calculations.

### 2. Utility Electricity Bill CSV
* **Handled Subset**:
  * `invoice_num` (Invoice number).
  * `bill_date` (Billing date).
  * `consumption` (Used to calculate Scope 2 usage).
  * `unit` (kWh or MWh, translated to kWh).
* **Ignored Subset**:
  * Demand peaks (kW), reactive power (kVAR), meter service IDs, tax line items, and facility addresses.

### 3. Corporate Travel JSON Export
* **Handled Subset**:
  * `booking_id` (Unique record code).
  * `booking_date` (Epoch milliseconds, parsed to Date).
  * `distance` (Numeric distance).
  * `unit` (Miles or Kilometers, standardized to Kilometers).
  * `mode` (flight, train, car, used for Scope 3 emissions factors mapping).
* **Ignored Subset**:
  * Passenger seat selection, airline booking class (Business vs. Coach), loyalty account numbers, and baggage fees.

---

## 3. Product Manager Clarifying Questions

If we could interview the Product Manager, we would prioritize these clarifying questions:

1. **Emission Factor Strategy**:
   * *Question*: "Are Scope 1, 2, and 3 emission factors (e.g., CO2e per Liter of diesel or kWh of energy) static, or do they change depending on location and reporting year? Should we implement a dynamic `EmissionFactor` model linking geographical zip codes to local grids?"
2. **Organization and Hierarchy**:
   * *Question*: "Should multi-tenancy support child subsidiaries under a single parent tenant? If so, does an ESG manager at the parent company require consolidated read access to child records without direct record mutation access?"
3. **Data Repair Authorization**:
   * *Question*: "Can analysts directly edit normalized quantities if they notice a typo, or must they always reject the record and request a new file upload? If direct edits are permitted, does that require an additional manager approval trigger?"
