# apps/ingestion/services/utility/normalizer.py
from decimal import Decimal
from apps.common.utils.units import convert_mwh_to_kwh, standardize_unit
from apps.common.utils.dates import parse_date
import logging

logger = logging.getLogger(__name__)


class UtilityNormalizer:
    @staticmethod
    def normalize(raw_row: dict) -> dict:
        """
        Normalizes raw utility electricity row dict.
        Usage (MWh) is converted to kWh.
        """
        raw_usage = raw_row.get('usage_mwh')
        raw_date = raw_row.get('read_date')
        invoice_number = str(raw_row.get('invoice_number', '')).strip()
        account_number = str(raw_row.get('account_number', '')).strip()

        # Parse date
        try:
            record_date = parse_date(raw_date)
        except Exception as e:
            raise ValueError(f"Failed to parse read date '{raw_date}': {str(e)}")

        # Parse numeric usage
        if raw_usage is None or raw_usage == "":
            quantity = Decimal('0')
        else:
            try:
                clean_usage_str = str(raw_usage).replace(',', '').strip()
                quantity = Decimal(clean_usage_str)
            except Exception:
                raise ValueError(f"Invalid usage numeric format: {raw_usage}")

        # Convert MWh -> kWh
        final_quantity = convert_mwh_to_kwh(quantity)
        std_unit = 'kWh'

        return {
            'record_date': record_date,
            'standard_category': 'electricity',
            'quantity': final_quantity,
            'unit': std_unit,
            'data': {
                'invoice_number': invoice_number,
                'account_number': account_number,
                'original_quantity': str(raw_usage),
                'original_unit': 'MWh'
            }
        }
