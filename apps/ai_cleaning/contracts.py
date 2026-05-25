# apps/ai_cleaning/contracts.py
from typing import List, Dict, Any


class PromptPayloadBuilder:
    """
    Standard builder contract that packages file structures and row examples
    into prompt payload blocks for safe and context-preserving LLM parsing.
    """
    
    @staticmethod
    def build_schema_inference_prompt(headers: List[str], sample_rows: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Builds a JSON payload detailing the prompt inputs.
        """
        system_instruction = (
            "You are an expert ESG data normalization assistant. "
            "Your job is to analyze the headers and sample rows of a messy, custom enterprise export "
            "and suggest how to map its fields into one of three standard categories: "
            "'fuel' (Enterprise Fuel Procurement), 'electricity' (Utility Electricity Consumption), "
            "or 'travel' (Corporate Business Travel)."
        )
        
        user_prompt = {
            "task": "Match custom columns to standard target fields (record_date, quantity, unit, invoice_number).",
            "detected_raw_headers": headers,
            "sample_records": sample_rows,
            "target_definitions": {
                "record_date": "The date of purchase, invoice date, read date, or travel booking date.",
                "quantity": "The physical numeric quantity consumed (e.g. usage, distance, amount).",
                "unit": "The unit of measure (e.g. kWh, Liters, Gallons, Miles, Kilometers).",
                "invoice_number": "Unique invoice tracking string, bill document, or ticket number."
            }
        }
        
        return {
            "system_instruction": system_instruction,
            "prompt_payload": user_prompt
        }

    @staticmethod
    def build_row_cleanse_prompt(
        row_number: int,
        raw_row_data: Dict[str, Any], 
        mappings: List[Dict[str, str]]
    ) -> Dict[str, Any]:
        """
        Builds prompt payload for cleaning specific row data.
        """
        return {
            "system_instruction": "Identify malformed values (unparseable dates, negative quantities, wrong characters) and output cleaned fields conforming to standard mappings.",
            "row_context": {
                "row_number": row_number,
                "data": raw_row_data,
                "column_mappings": mappings
            }
        }
