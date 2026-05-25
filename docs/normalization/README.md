# Data Normalization Engine

This document explains the technical implementation of the normalization layer, standardizing unit conversions, dates, categories, and duplicate records checks.

---

## 1. Rule-Based vs. AI-Driven Normalization

The platform uses a hybrid approach to parse raw data:

```
Raw Column Names ──> [AI Mapping Inference] ──> Standard Headers
                                                       │
                                                       ▼
Raw Cell Values  ──> [Rule-Based Normalizer] ──> Exact Normalized Values
                     - Deterministic math
                     - Exact date parsing
                     - Hard unit scaling
```

### Why Rule-Based for Values?
While AI is used to *infer header mapping rules* for column layouts, the actual cell-value normalization (converting gallons to liters, converting dates, and scaling metrics) is strictly **rule-based and deterministic**:
1. **Mathematical Auditability**: Financial and environmental auditors require mathematical correctness. AI models are non-deterministic and can introduce unpredictable rounding errors.
2. **Deterministic Conversions**: Converting US Gallons to Liters must always use the exact physical scale factor (`3.785411784`), which rule-based systems guarantee.

---

## 2. Ingestion Conversion Calculations

The normalization engines (located in `apps/ingestion/services/{source}/normalizer.py`) execute the following scaling equations:

### 1. Liquid Fuels (SAP Ingestion)
* **Standard Unit**: Liters (`L`).
* **Conversions**:
  * If the input unit is `gallons` (US), scale by **`3.785411784`**:
    $$\text{Quantity (L)} = \text{Quantity (Gallons)} \times 3.785411784$$
  * If the input unit is `liters` or `L`, keep the value.
  * Other units trigger validation errors.

### 2. Electricity (Utility Ingestion)
* **Standard Unit**: Kilowatt-hours (`kWh`).
* **Conversions**:
  * Electricity is often billed in Megawatt-hours (`MWh`). The normalizer scales this by **`1000.0`**:
    $$\text{Quantity (kWh)} = \text{Quantity (MWh)} \times 1000.0$$
  * Kilowatt-hours (`kWh`) are kept as is.

### 3. Business Travel (Travel Ingestion)
* **Standard Unit**: Kilometers (`km`).
* **Conversions**:
  * Corporate travel mileage is commonly exported in miles. The normalizer scales this by **`1.609344`**:
    $$\text{Quantity (km)} = \text{Quantity (Miles)} \times 1.609344$$

---

## 3. Date Standardization Engine

Location: [dates.py](file:///c:/Users/shiva/OneDrive/Desktop/SAP/apps/common/utils/dates.py)

Raw spreadsheets store posting dates in varying string formats depending on localized ERP configurations. The custom date parser attempts to resolve strings into a standardized ISO date (`YYYY-MM-DD`):

```
Input String 
   │
   ├─► German Format? (e.g. "20.05.2026") ──► Parse via "DD.MM.YYYY" ──► ISO Date
   │
   ├─► ISO Format?    (e.g. "2026-05-20") ──► Parse via "YYYY-MM-DD" ──► ISO Date
   │
   └─► Epoch Millis?  (e.g. 1779264000)   ──► Parse from Timestamp   ──► ISO Date
```

If the string doesn't match any of these patterns, the normalizer throws a `ValueError`, which flags the ingestion session as `FAILED` and logs the invalid value.

---

## 4. Duplicate Invoice Detection

To prevent carbon double-counting, the normalization layer performs duplicate record checks:

```python
# During Ingestion execution
duplicate_exists = NormalizedRecord.objects.filter(
    standard_category=category,
    record_date=normalized_date,
    quantity=normalized_quantity,
    data__invoice_number=invoice_number
).exists()
```
If a duplicate is detected, the validator flags the record as `PENDING` but logs a high-severity `ValidationIssue` with code `DUPLICATE_INVOICE`, notifying the analyst of duplicate data.
