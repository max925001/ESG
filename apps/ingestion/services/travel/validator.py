# apps/ingestion/services/travel/validator.py
from decimal import Decimal
from datetime import date
from typing import Generator, Dict, Any
import logging

logger = logging.getLogger(__name__)


class TravelValidator:
    @staticmethod
    def validate(
        raw_row: dict,
        normalized_row: dict,
        historical_invoice_checker=None
    ) -> Generator[Dict[str, Any], None, None]:
        """
        Validates corporate travel record.
        """
        quantity = normalized_row.get('quantity', Decimal('0'))
        unit = normalized_row.get('unit', '')
        record_date = normalized_row.get('record_date')
        ticket_number = normalized_row.get('data', {}).get('ticket_number', '').strip()

        # Rule 1: Missing quantity (distance)
        if quantity is None or quantity <= Decimal('0'):
            yield {
                'field_name': 'distance_miles',
                'severity': 'error',
                'rule_code': 'MISSING_QUANTITY',
                'message': 'Travel distance is missing or less than or equal to zero.',
                'metadata': {'quantity': str(quantity)}
            }

        # Rule 2: Invalid unit
        if unit != 'km':
            yield {
                'field_name': 'unit',
                'severity': 'error',
                'rule_code': 'INVALID_UNIT',
                'message': f"Unsupported unit '{unit}' for travel category. Must be km or miles.",
                'metadata': {'original_unit': 'miles'}
            }

        # Rule 3: Future Booking Date (Warning)
        if record_date and record_date > date.today():
            yield {
                'field_name': 'booking_date',
                'severity': 'warning',
                'rule_code': 'FUTURE_DATE',
                'message': f"Booking date '{record_date}' is in the future.",
                'metadata': {'booking_date': str(record_date), 'current_date': str(date.today())}
            }

        # Rule 4: Duplicate Ticket Number
        if ticket_number:
            is_dup = False
            if historical_invoice_checker and ticket_number in historical_invoice_checker:
                is_dup = True
            elif historical_invoice_checker and callable(historical_invoice_checker):
                if historical_invoice_checker(ticket_number):
                    is_dup = True

            if is_dup:
                yield {
                    'field_name': 'ticket_number',
                    'severity': 'error',
                    'rule_code': 'DUPLICATE_INVOICE',
                    'message': f"Duplicate ticket number '{ticket_number}' detected.",
                    'metadata': {'ticket_number': ticket_number}
                }
