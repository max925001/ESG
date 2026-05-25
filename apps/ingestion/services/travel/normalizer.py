# apps/ingestion/services/travel/normalizer.py
from decimal import Decimal
from apps.common.utils.units import convert_miles_to_km, standardize_unit
from apps.common.utils.dates import parse_date
import logging

logger = logging.getLogger(__name__)


class TravelNormalizer:
    @staticmethod
    def normalize(raw_row: dict) -> dict:
        """
        Normalizes raw corporate travel JSON dict.
        Distance in miles is converted to kilometers (km).
        """
        raw_distance = raw_row.get('distance_miles')
        raw_date = raw_row.get('booking_date')
        ticket_number = str(raw_row.get('ticket_number', '')).strip()
        employee_id = str(raw_row.get('employee_id', '')).strip()
        departure_airport = str(raw_row.get('departure_airport', '')).strip()
        arrival_airport = str(raw_row.get('arrival_airport', '')).strip()

        # Parse date
        try:
            record_date = parse_date(raw_date)
        except Exception as e:
            raise ValueError(f"Failed to parse booking date '{raw_date}': {str(e)}")

        # Parse numeric distance
        if raw_distance is None or raw_distance == "":
            quantity = Decimal('0')
        else:
            try:
                clean_dist_str = str(raw_distance).replace(',', '').strip()
                quantity = Decimal(clean_dist_str)
            except Exception:
                raise ValueError(f"Invalid distance numeric format: {raw_distance}")

        # Convert miles -> km
        final_quantity = convert_miles_to_km(quantity)
        std_unit = 'km'

        return {
            'record_date': record_date,
            'standard_category': 'travel',
            'quantity': final_quantity,
            'unit': std_unit,
            'data': {
                'ticket_number': ticket_number,
                'employee_id': employee_id,
                'departure_airport': departure_airport,
                'arrival_airport': arrival_airport,
                'original_quantity': str(raw_distance),
                'original_unit': 'miles'
            }
        }
