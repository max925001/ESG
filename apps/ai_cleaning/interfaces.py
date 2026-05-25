# apps/ai_cleaning/interfaces.py
from abc import ABC, abstractmethod
from typing import List, Dict, Any
from .schemas import SchemaInferenceResult, CleanedRowSuggestion, ColumnMappingSuggestion


class ISchemaInferenceService(ABC):
    """
    Interface for service that reads an unknown CSV/Excel export,
    analyzes headers using an LLM, and returns standard mappings.
    """
    @abstractmethod
    def infer_schema(self, file_path: str) -> SchemaInferenceResult:
        """
        Analyzes the columns in the messy file and suggests mappings to target models.
        """
        pass


class IRowCleansingService(ABC):
    """
    Interface for service that takes a raw, messy row with column mapping context,
    runs LLM cleaning/validation routines, and outputs a cleaned model.
    """
    @abstractmethod
    def clean_row(
        self, 
        row_number: int,
        raw_row_data: Dict[str, Any], 
        mappings: List[ColumnMappingSuggestion]
    ) -> CleanedRowSuggestion:
        """
        Cleans and fixes value issues within a single raw data row.
        """
        pass
