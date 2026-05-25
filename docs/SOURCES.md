# Data Sources Specifications & Analysis

This document details the real-world formatting of our three primary ingestion sources, lessons learned during integration, sample datasets, and potential failure points in a production environment.

---

## 1. SAP Fuel Procurement Logs (CSV)

### Real-World Format Research
SAP ERP systems export fuel card transactions (such as Shell, DKV, or custom fleet cards) in CSV format. These files list fleet purchases, transaction timestamps, odometer readings, fuel types, and quantities.

### Key Learnings
* **German Locales**: SAP exports are commonly generated using German ERP templates. This leads to semicolon delimiters (`;` instead of `,`) and commas as decimal separators (e.g. `100,50` instead of `100.50`).
* **Header Mappings**: Standard fields include `Buchungsdatum` (booking date), `Belegnummer` (invoice/receipt number), `Menge` (quantity), and `Einheit` (unit of measurement).
* **Scope Classification**: Mapped as **Scope 1** emissions since fuel is combusted directly in company-owned vehicles or generator units.

### Sample Data
```csv
Belegnummer;Buchungsdatum;Menge;Einheit;Kraftstoffart
INV-SAP-101;20.05.2026;1000,00;gallons;diesel
INV-SAP-102;21.05.2026;500,50;liters;petrol
```
* *Why this format*: Uses semicolons as delimiters and commas as decimals to represent real-world German SAP exports.

### Real Deployment Breaking Points
* **Header Language Shifts**: If SAP changes its export template language (e.g. exporting in English headers like `Booking Date` instead of `Buchungsdatum`), the regex-based mapper will fail to resolve the columns.
* **Locale Divergence**: If some SAP servers export using commas for decimals while others export using dots, the string-to-decimal parser will interpret `1.000` as `1` instead of `1000`, under-reporting emissions by a factor of 1000.

---

## 2. Utility Electricity Bills (CSV)

### Real-World Format Research
Electric utility companies (such as PG&E, National Grid, or ConEd) export commercial meter billing histories in CSV formats, listing multi-tier tariffs, peak usage periods, taxes, and consumption totals.

### Key Learnings
* **Multi-Line Complexity**: A single electric invoice often contains dozens of line items (distribution charges, local taxes, meter maintenance fees) that do not represent energy consumption.
* **Aggregations**: Summing every row in a utility bill results in massive double-counting. The ingestion service must target only specific total consumption rows (typically identified by matching units like `kWh` or `MWh`).
* **Scope Classification**: Mapped as **Scope 2** emissions since electricity represents indirect energy consumed by company operations.

### Sample Data
```csv
invoice_num,bill_date,consumption,unit,meter_id
INV-ELEC-201,2026-05-15,45.2,MWh,MET-9988
INV-ELEC-202,2026-05-16,3500.0,kWh,MET-9988
```
* *Why this format*: Mimics a commercial electric provider output detailing consumption metrics and meter IDs using standard ISO formats.

### Real Deployment Breaking Points
* **Tier Billing Shifts**: If the utility company moves to multi-meter split billing or inserts separate tiers (e.g., peak vs. off-peak hours) into separate rows without a clear aggregator, the parser might fail to isolate the total consumption row.
* **Unit Omissions**: If the provider omits the unit column (assuming it defaults to kWh) but begins billing in MWh, the system will under-report emissions by a factor of 1,000.

---

## 3. Corporate Travel API Logs (JSON)

### Real-World Format Research
Third-party travel booking platforms (such as Concur, TripActions, or Expedia Corporate Travel) export flight, rail, and hotel itineraries via REST APIs in JSON payloads.

### Key Learnings
* **Timestamp Formatting**: Dates are commonly delivered as Unix epochs in milliseconds (e.g. `1779235200000`).
* **Varying Metrics**: Domestic flights can report distances in miles, whereas European rail bookings default to kilometers.
* **Scope Classification**: Mapped as **Scope 3 (Category 6: Business Travel)** since emissions are produced by third-party transport operators.

### Sample Data
```json
[
  {
    "booking_id": "TRV-901",
    "booking_date": 1779235200000,
    "mode": "flight",
    "distance": 1200.00,
    "unit": "miles",
    "passenger": "John Doe"
  },
  {
    "booking_id": "TRV-902",
    "booking_date": 1779321600000,
    "mode": "train",
    "distance": 320.50,
    "unit": "km",
    "passenger": "Sarah Smith"
  }
]
```
* *Why this format*: Mimics API payloads with epoch timestamps, diverse modes of travel, and varying distance metrics.

### Real Deployment Breaking Points
* **Schema Drift**: If the corporate travel API updates its payload schema (e.g. nesting distance within a child node like `{"journey": {"distance": 1200}}`), the flat parser will throw `KeyError` exceptions.
* **Missing Units**: If the API stops sending the `unit` field and assumes the client knows the unit based on mode of travel, calculations can be off by 60% (if miles are parsed as kilometers).
