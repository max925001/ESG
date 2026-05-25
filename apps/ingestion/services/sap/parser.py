# apps/ingestion/services/sap/parser.py
import pandas as pd
from typing import Generator, Dict, Any
import logging

logger = logging.getLogger(__name__)

# German and English Header Mapping
SAP_HEADER_MAP = {
    # German headers -> Standardized english keys
    'menge': 'quantity',
    'einheit': 'unit',
    'buchungsdatum': 'posting_date',
    'kraftstofftyp': 'fuel_type',
    'belegnummer': 'invoice_number',
    
    # English equivalents
    'quantity': 'quantity',
    'unit': 'unit',
    'posting date': 'posting_date',
    'posting_date': 'posting_date',
    'fuel type': 'fuel_type',
    'fuel_type': 'fuel_type',
    'invoice number': 'invoice_number',
    'invoice_number': 'invoice_number',
}


class SAPParser:
    @staticmethod
    def parse(file_path: str) -> Generator[Dict[str, Any], None, None]:
        """
        Parses SAP Fuel export CSV file using Pandas.
        Yields row dicts with normalized keys.
        """
        try:
            # Flexible reading with standard fallback encodings
            df = pd.read_csv(file_path, encoding='utf-8')
        except UnicodeDecodeError:
            try:
                df = pd.read_csv(file_path, encoding='latin-1')
            except Exception as e:
                logger.error(f"Failed to read CSV with Latin-1 encoding: {str(e)}")
                raise ValueError(f"Could not read CSV file: {str(e)}")

        # Normalize column header casings
        df.columns = [str(col).strip().lower() for col in df.columns]

        # Apply header translations
        mapped_columns = {}
        for col in df.columns:
            if col in SAP_HEADER_MAP:
                mapped_columns[col] = SAP_HEADER_MAP[col]
            else:
                mapped_columns[col] = col
        df.rename(columns=mapped_columns, inplace=True)

        for index, row in df.iterrows():
            row_dict = row.to_dict()
            # Clean nan values to None
            clean_dict = {
                k: (None if pd.isna(v) else v)
                for k, v in row_dict.items()
            }
            # Add row number (1-indexed for human communication/auditing)
            clean_dict['_row_number'] = index + 1
            yield clean_dict
