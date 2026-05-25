# apps/ingestion/services/travel/parser.py
import json
from typing import Generator, Dict, Any
import logging

logger = logging.getLogger(__name__)

# Travel Header Mapping
TRAVEL_HEADER_MAP = {
    'employee id': 'employee_id',
    'employee_id': 'employee_id',
    'departure airport': 'departure_airport',
    'departure_airport': 'departure_airport',
    'arrival airport': 'arrival_airport',
    'arrival_airport': 'arrival_airport',
    'distance miles': 'distance_miles',
    'distance_miles': 'distance_miles',
    'distance': 'distance_miles',
    'booking date': 'booking_date',
    'booking_date': 'booking_date',
    'ticket number': 'ticket_number',
    'ticket_number': 'ticket_number',
}


class TravelParser:
    @staticmethod
    def parse(file_path: str) -> Generator[Dict[str, Any], None, None]:
        """
        Parses corporate travel JSON files.
        Supports standard JSON arrays, or objects containing records lists.
        """
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
        except Exception as e:
            logger.error(f"Failed to parse travel JSON file: {str(e)}")
            raise ValueError(f"Could not read JSON file: {str(e)}")

        records = []
        if isinstance(data, list):
            records = data
        elif isinstance(data, dict):
            # Try to find a list field inside the dict
            for key, val in data.items():
                if isinstance(val, list):
                    records = val
                    break
            else:
                # If no list is found, wrap the dict in a list
                records = [data]
        else:
            raise ValueError("Invalid JSON format. Expected JSON array or object.")

        for index, record in enumerate(records):
            if not isinstance(record, dict):
                logger.warning(f"Skipped non-dictionary JSON record at position {index}")
                continue

            # Normalize keys to lowercase/stripped
            normalized_record = {}
            for k, v in record.items():
                clean_key = str(k).strip().lower()
                target_key = TRAVEL_HEADER_MAP.get(clean_key, clean_key)
                normalized_record[target_key] = v

            normalized_record['_row_number'] = index + 1
            yield normalized_record
