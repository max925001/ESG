# AI Ingestion Assistance & Column Mapping

This document details the AI-assisted schema mapping models, confidence scoring systems, human-in-the-loop controls, and cell repair mechanisms.

---

## 1. Human-in-the-Loop AI Design

The platform adopts a **Human-in-the-Loop (HITL)** design pattern for AI-assisted operations:

```
Unknown Raw CSV ──> AI Inference Engine ──> Proposes Category & Column Maps
                                                  │
                                                  ▼
                                      [Supervisor Dashboard]
                                      * Analyst reviews mapping
                                      * Overrides low-confidence projections
                                      * Reviews cell-level auto-repairs
                                                  │
                                                  ▼
                                    Approved Mappings committed to DB
```

### Why Assistive Rather Than Autonomous?
1. **Compliance Requirements**: GHG emissions calculations must be legally defensible. Fully autonomous AI mapping exposes the firm to compliance liabilities if the model misinterprets a column.
2. **Deterministic Fallbacks**: Analysts can review, edit, and approve the mappings prior to database write-lock, guaranteeing data integrity.

---

## 2. Inferred Columns Schema Models

The `ai_cleaning` app contracts define the structure of inference results:

### 1. `ColumnMappingSuggestion`
Represents an AI mapping projection for an individual column header:
```typescript
interface ColumnMappingSuggestion {
  raw_header: string;        // E.g., "Menge"
  suggested_target: string;  // E.g., "quantity"
  confidence: number;        // Confidence score (0 to 100)
  rationale: string;         // Explanation rationale
}
```

### 2. `SchemaInferenceResult`
Represents the combined inference result for the uploaded file:
```typescript
interface SchemaInferenceResult {
  source_type_inference: 'fuel' | 'electricity' | 'travel';
  confidence: number;
  column_mappings: ColumnMappingSuggestion[];
}
```

---

## 3. Cell-Level Reparations & Diffs

In addition to header mapping, the parsing system corrects minor value formatting errors during CSV parsing, logging them as **Cell Repairs**:

| Row Number | Raw Column | Original String Value | Corrected Value | AI Repair Rationale |
| :--- | :--- | :--- | :--- | :--- |
| **Row 3** | `Menge` | `N/A` | `0.0000` | Substituted invalid non-numeric string with zero baseline. |
| **Row 5** | `usage_mwh` | `10.5 MWh` | `10500 kWh` | Extracted numerical value and scaled MWh to standard kWh. |
| **Row 8** | `kraftstoff` | `petro` | `petrol` | Corrected spelling anomaly to match Standard fuel catalog keys. |

---

## 4. Future Scalability: Embedding Vector Mappings

To scale AI inference efficiency across diverse enterprise spreadsheets:
1. **Semantic Vector Search**:
   Future versions will generate vector embeddings for raw headers (using models like `text-embedding-ada-002`) and compute cosine similarity against standard target labels. This allows mapping headers in any language without maintaining rigid dictionaries.
2. **Reinforcement Caching**:
   When an analyst overrides an AI mapping suggestion, the correction is saved in a vector mapping cache. The system uses this feedback to update future inference confidence parameters.
