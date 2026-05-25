# apps/ingestion/services/utility/validator.py
from decimal import Decimal
from typing import Generator, Dict, Any
import logging

logger = logging.getLogger(__name__)

# Default limit for high electricity usage (kWh)
HIGH_ELECTRICITY_LIMIT = Decimal('100000')


class UtilityValidator:
    @staticmethod
    def validate(
        raw_row: dict,
        normalized_row: dict,
        historical_invoice_checker=None
    ) -> Generator[Dict[str, Any], None, None]:
        """
        Validates utility electricity normalized row.
        """
        quantity = normalized_row.get('quantity', Decimal('0'))
        unit = normalized_row.get('unit', '')
        invoice_number = normalized_row.get('data', {}).get('invoice_number', '').strip()

        # Rule 1: Missing quantity
        if quantity is None or quantity <= Decimal('0'):
            yield {
                'field_name': 'usage_mwh',
                'severity': 'error',
                'rule_code': 'MISSING_QUANTITY',
                'message': 'Electricity usage quantity is missing or less than or equal to zero.',
                'metadata': {'quantity': str(quantity)}
            }

        # Rule 2: Invalid unit
        if unit != 'kWh':
            yield {
                'field_name': 'unit',
                'severity': 'error',
                'rule_code': 'INVALID_UNIT',
                'message': f"Unsupported unit '{unit}' for electricity category. Must be kWh or MWh.",
                'metadata': {'original_unit': 'MWh'}
            }

        # Rule 3: Suspicious usage threshold
        if quantity > HIGH_ELECTRICITY_LIMIT:
            yield {
                'field_name': 'usage_mwh',
                'severity': 'warning',
                'rule_code': 'SUSPICIOUS_USAGE',
                'message': f"Electricity usage is unusually high (> {HIGH_ELECTRICITY_LIMIT} kWh).",
                'metadata': {'quantity': str(quantity), 'limit': str(HIGH_ELECTRICITY_LIMIT)}
            }

        # Rule 4: Duplicate Invoice
        if invoice_number:
            is_dup = False
            if historical_invoice_checker and invoice_number in historical_invoice_checker:
                is_dup = True
            elif historical_invoice_checker and callable(historical_invoice_checker):
                if historical_invoice_checker(invoice_number):
                    is_dup = True

            if is_dup:
                yield {
                    'field_name': 'invoice_number',
                    'severity': 'error',
                    'rule_code': 'DUPLICATE_INVOICE',
                    'message': f"Duplicate utility invoice number '{invoice_number}' detected.",
                    'metadata': {'invoice_number': invoice_number}
                }
