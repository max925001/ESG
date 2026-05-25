# apps/ingestion/services/sap/validator.py
from decimal import Decimal
from typing import Generator, Dict, Any, List
from django.db import models
import logging

logger = logging.getLogger(__name__)

# Default limit for high fuel usage (liters)
HIGH_FUEL_LIMIT = Decimal('50000')


class SAPValidator:
    @staticmethod
    def validate(
        raw_row: dict,
        normalized_row: dict,
        historical_invoice_checker=None
    ) -> Generator[Dict[str, Any], None, None]:
        """
        Validates SAP normalized record against rules.
        Yields issue dicts if validation rules fail:
        {
            "field_name": str,
            "severity": "warning" | "error",
            "rule_code": str,
            "message": str,
            "metadata": dict
        }
        """
        # Rule 1: Missing / Zero Quantity (Error)
        quantity = normalized_row.get('quantity', Decimal('0'))
        if quantity is None or quantity <= Decimal('0'):
            yield {
                'field_name': 'quantity',
                'severity': 'error',
                'rule_code': 'MISSING_QUANTITY',
                'message': 'Ingestion quantity is missing or less than or equal to zero.',
                'metadata': {'quantity': str(quantity)}
            }

        # Rule 2: Invalid unit (Error)
        unit = normalized_row.get('unit', '')
        if unit != 'L':
            yield {
                'field_name': 'unit',
                'severity': 'error',
                'rule_code': 'INVALID_UNIT',
                'message': f"Unsupported unit '{unit}' for fuel category. Must be Liter (L) or Gallon (gal).",
                'metadata': {'original_unit': raw_row.get('unit')}
            }

        # Rule 3: High fuel usage threshold (Warning)
        if quantity > HIGH_FUEL_LIMIT:
            yield {
                'field_name': 'quantity',
                'severity': 'warning',
                'rule_code': 'SUSPICIOUS_USAGE',
                'message': f"Fuel usage is unusually high (> {HIGH_FUEL_LIMIT} Liters).",
                'metadata': {'quantity': str(quantity), 'limit': str(HIGH_FUEL_LIMIT)}
            }

        # Rule 4: Duplicate Invoice (Error)
        invoice_number = normalized_row.get('data', {}).get('invoice_number', '').strip()
        if invoice_number:
            is_dup = False
            # Check within the parser's local cache
            if historical_invoice_checker and invoice_number in historical_invoice_checker:
                is_dup = True
            
            # Or query the database if checker function is provided
            elif historical_invoice_checker and callable(historical_invoice_checker):
                if historical_invoice_checker(invoice_number):
                    is_dup = True

            if is_dup:
                yield {
                    'field_name': 'invoice_number',
                    'severity': 'error',
                    'rule_code': 'DUPLICATE_INVOICE',
                    'message': f"Duplicate invoice number '{invoice_number}' detected.",
                    'metadata': {'invoice_number': invoice_number}
                }
