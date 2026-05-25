# apps/ingestion/services/sap/normalizer.py
from decimal import Decimal
from apps.common.utils.units import convert_gallons_to_liters, standardize_unit
from apps.common.utils.dates import parse_date
import logging

logger = logging.getLogger(__name__)


class SAPNormalizer:
    @staticmethod
    def normalize(raw_row: dict) -> dict:
        """
        Normalizes raw SAP fuel row dict.
        Returns a dict containing standard platform fields:
        {
            "record_date": datetime.date,
            "standard_category": "fuel",
            "quantity": Decimal,
            "unit": "L",
            "data": {
                "invoice_number": str,
                "fuel_type": str,
                "original_quantity": float/str,
                "original_unit": str
            }
        }
        """
        raw_quantity = raw_row.get('quantity')
        raw_unit = str(raw_row.get('unit', '')).strip()
        raw_date = raw_row.get('posting_date')
        invoice_number = str(raw_row.get('invoice_number', '')).strip()
        fuel_type = str(raw_row.get('fuel_type', '')).strip()

        # Parse date
        try:
            record_date = parse_date(raw_date)
        except Exception as e:
            raise ValueError(f"Failed to parse SAP posting date '{raw_date}': {str(e)}")

        # Clean / convert numeric quantity
        if raw_quantity is None or raw_quantity == "":
            quantity = Decimal('0')
        else:
            try:
                # Remove spaces or commas if any
                clean_qty_str = str(raw_quantity).replace(',', '').strip()
                quantity = Decimal(clean_qty_str)
            except Exception:
                raise ValueError(f"Invalid quantity numeric format: {raw_quantity}")

        # Unit Conversion
        std_unit = standardize_unit(raw_unit)
        final_quantity = quantity

        if raw_unit.lower() in ['gallons', 'gallon', 'gal']:
            final_quantity = convert_gallons_to_liters(quantity)
            std_unit = 'L'
        
        return {
            'record_date': record_date,
            'standard_category': 'fuel',
            'quantity': final_quantity,
            'unit': std_unit,
            'data': {
                'invoice_number': invoice_number,
                'fuel_type': fuel_type,
                'original_quantity': str(raw_quantity),
                'original_unit': raw_unit
            }
        }
