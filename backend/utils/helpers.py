from datetime import datetime
from typing import Any, Dict

def serialize_datetime(obj: Any) -> Any:
    """Convert datetime objects to ISO format strings"""
    if isinstance(obj, datetime):
        return obj.isoformat()
    elif isinstance(obj, dict):
        return {k: serialize_datetime(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [serialize_datetime(item) for item in obj]
    return obj

def convert_datetime_fields(doc: Dict, fields: list) -> Dict:
    """Convert ISO string datetime fields back to datetime objects"""
    for field in fields:
        if field in doc and isinstance(doc[field], str):
            try:
                doc[field] = datetime.fromisoformat(doc[field])
            except:
                pass
    return doc
