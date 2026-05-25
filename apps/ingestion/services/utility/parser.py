# apps/ingestion/services/utility/parser.py
import pandas as pd
from typing import Generator, Dict, Any
import logging

logger = logging.getLogger(__name__)

# Utility Header Mapping
UTILITY_HEADER_MAP = {
    'account number': 'account_number',
    'account_number': 'account_number',
    'read date': 'read_date',
    'read_date': 'read_date',
    'usage (mwh)': 'usage_mwh',
    'usage_mwh': 'usage_mwh',
    'usage': 'usage_mwh',
    'invoice number': 'invoice_number',
    'invoice_number': 'invoice_number',
}


class UtilityParser:
    @staticmethod
    def parse(file_path: str) -> Generator[Dict[str, Any], None, None]:
        """
        Parses Utility Electricity export CSV file using Pandas.
        """
        try:
            df = pd.read_csv(file_path, encoding='utf-8')
        except UnicodeDecodeError:
            try:
                df = pd.read_csv(file_path, encoding='latin-1')
            except Exception as e:
                logger.error(f"Failed to read utility CSV: {str(e)}")
                raise ValueError(f"Could not read Utility CSV: {str(e)}")

        df.columns = [str(col).strip().lower() for col in df.columns]

        # Apply header translations
        mapped_columns = {}
        for col in df.columns:
            if col in UTILITY_HEADER_MAP:
                mapped_columns[col] = UTILITY_HEADER_MAP[col]
            else:
                mapped_columns[col] = col
        df.rename(columns=mapped_columns, inplace=True)

        for index, row in df.iterrows():
            row_dict = row.to_dict()
            clean_dict = {
                k: (None if pd.isna(v) else v)
                for k, v in row_dict.items()
            }
            clean_dict['_row_number'] = index + 1
            yield clean_dict
