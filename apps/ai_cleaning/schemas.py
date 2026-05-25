# apps/ai_cleaning/schemas.py
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional


class ColumnMappingSuggestion(BaseModel):
    """
    Suggested mapping from an arbitrary, unknown CSV header to a standard target schema header.
    """
    raw_header: str = Field(..., description="The name of the header in the raw, messy CSV file.")
    suggested_target: str = Field(..., description="Standard column key name (e.g., quantity, record_date, unit).")
    confidence: float = Field(..., description="Confidence score from 0.0 to 1.0.")
    rationale: str = Field(..., description="Explanation of why this mapping was suggested.")


class SchemaInferenceResult(BaseModel):
    """
    Complete schema inference for an unaligned file upload.
    """
    source_type_inference: str = Field(..., description="Inferred category: 'fuel', 'electricity', or 'travel'.")
    confidence: float = Field(..., description="Overall inference confidence score.")
    column_mappings: List[ColumnMappingSuggestion] = Field(default_factory=list)


class CleanedCell(BaseModel):
    """
    Represents a specific cell fix recommendation.
    """
    column_name: str
    original_value: Any
    cleaned_value: Any
    change_type: str = Field(..., description="E.g., 'date_parsing', 'unit_standardization', 'null_filling'")
    rationale: str


class CleanedRowSuggestion(BaseModel):
    """
    Represents a full row auto-clean suggestion containing specific cell recommendations.
    """
    row_number: int
    is_malformed: bool
    cell_fixes: List[CleanedCell] = Field(default_factory=list)
    fully_cleaned_row: Dict[str, Any] = Field(..., description="The fully resolved row data dictionary ready for standard pipelines.")
