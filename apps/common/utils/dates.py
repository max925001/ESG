# apps/common/utils/dates.py
from datetime import datetime, date
import pandas as pd
from typing import Union, Optional


def parse_date(date_val: Union[str, int, float, date, datetime]) -> date:
    """
    Tries to parse date value of diverse types and formats:
    - date or datetime instances
    - ISO formats: YYYY-MM-DD
    - German format: DD.MM.YYYY
    - Slash format: DD/MM/YYYY or MM/DD/YYYY (handled via pandas parser)
    - Epoch timestamp in milliseconds or seconds
    
    Returns standard datetime.date object.
    Raises ValueError if parsing fails.
    """
    if not date_val:
        raise ValueError("Empty date value provided")

    if isinstance(date_val, datetime):
        return date_val.date()
    if isinstance(date_val, date):
        return date_val

    # Handle float/int timestamps
    if isinstance(date_val, (int, float)):
        return _parse_timestamp(date_val)

    # Handle string value
    val_str = str(date_val).strip()
    
    # Try parsing timestamp as string
    if val_str.isdigit() or (val_str.replace('.', '', 1).isdigit() and val_str.count('.') == 1):
        try:
            return _parse_timestamp(float(val_str))
        except ValueError:
            pass

    # Specific common format attempts
    formats = [
        '%Y-%m-%d',
        '%d.%m.%Y',
        '%Y/%m/%d',
        '%d/%m/%Y',
        '%Y-%m-%dT%H:%M:%SZ',
        '%Y-%m-%dT%H:%M:%S.%fZ',
        '%Y-%m-%d %H:%M:%S',
    ]
    for fmt in formats:
        try:
            return datetime.strptime(val_str, fmt).date()
        except ValueError:
            continue

    # Fallback to pandas flexible parser
    try:
        ts = pd.to_datetime(val_str, errors='raise')
        return ts.date()
    except Exception as e:
        raise ValueError(f"Could not parse date '{date_val}': {str(e)}")


def _parse_timestamp(ts: Union[int, float]) -> date:
    """Helper to convert unix timestamps (seconds or milliseconds) to date."""
    try:
        # Check if milliseconds (usually >= 1e11)
        if ts > 1e11:
            ts = ts / 1000.0
        return datetime.fromtimestamp(ts).date()
    except Exception as e:
        raise ValueError(f"Invalid timestamp value: {ts}. Details: {str(e)}")
