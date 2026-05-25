# apps/common/utils/units.py
from decimal import Decimal, InvalidOperation
from typing import Union, Optional

# Constants
GALLON_TO_LITER = Decimal('3.785411784')
MILE_TO_KM = Decimal('1.609344')


def convert_gallons_to_liters(val: Union[int, float, Decimal, str]) -> Decimal:
    """Convert US Gallons to Liters."""
    try:
        dec_val = Decimal(str(val))
        return (dec_val * GALLON_TO_LITER).quantize(Decimal('0.0001'))
    except (InvalidOperation, ValueError, TypeError):
        raise ValueError(f"Invalid numeric value for gallon conversion: {val}")


def convert_mwh_to_kwh(val: Union[int, float, Decimal, str]) -> Decimal:
    """Convert Megawatt Hours (MWh) to Kilowatt Hours (kWh)."""
    try:
        dec_val = Decimal(str(val))
        return (dec_val * Decimal('1000')).quantize(Decimal('0.0001'))
    except (InvalidOperation, ValueError, TypeError):
        raise ValueError(f"Invalid numeric value for MWh conversion: {val}")


def convert_miles_to_km(val: Union[int, float, Decimal, str]) -> Decimal:
    """Convert Miles to Kilometers."""
    try:
        dec_val = Decimal(str(val))
        return (dec_val * MILE_TO_KM).quantize(Decimal('0.0001'))
    except (InvalidOperation, ValueError, TypeError):
        raise ValueError(f"Invalid numeric value for mile conversion: {val}")


def standardize_unit(unit_str: str) -> str:
    """
    Standardize a unit abbreviation or spelling to our platform standard.
    Supported standards: 'liters', 'kwh', 'km'
    """
    if not unit_str:
        return ""
    
    clean_unit = unit_str.strip().lower()
    
    liter_aliases = {'l', 'ltr', 'liters', 'liter', 'litre', 'litres', 'gallons', 'gallon', 'gal'}
    kwh_aliases = {'kwh', 'kilowatt-hour', 'kilowatt hour', 'kilowatt hours', 'mwh', 'megawatt hour', 'megawatt hours'}
    km_aliases = {'km', 'kilometer', 'kilometers', 'kilometre', 'kilometres', 'mile', 'miles', 'mi'}

    if clean_unit in liter_aliases:
        return 'L'
    if clean_unit in kwh_aliases:
        return 'kWh'
    if clean_unit in km_aliases:
        return 'km'
        
    return unit_str  # Return original if unrecognized
