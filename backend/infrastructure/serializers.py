from __future__ import annotations
from datetime import date, datetime
from uuid import UUID
from enum import Enum
from typing import Any


def to_primitive(value: Any) -> Any:
    """Convert common domain/entity objects to JSON-safe primitives.

    - UUID -> str
    - datetime/date -> ISO string
    - Enum -> value
    - lists/tuples/sets/dicts -> recursively convert
    - objects with `model_dump`/`dict`/`__dict__` -> convert their mapping
    - fallback -> str(value)
    """
    if value is None:
        return None
    if isinstance(value, (str, int, float, bool)):
        return value
    if isinstance(value, UUID):
        return str(value)
    if isinstance(value, (datetime, date)):
        try:
            return value.isoformat()
        except Exception:
            return str(value)
    if isinstance(value, Enum):
        return value.value
    if isinstance(value, dict):
        return {k: to_primitive(v) for k, v in value.items()}
    if isinstance(value, (list, tuple, set)):
        return [to_primitive(v) for v in value]

    # Pydantic v2 objects
    try:
        if hasattr(value, "model_dump"):
            return to_primitive(value.model_dump())
    except Exception:
        pass

    # objects with dict / __dict__
    try:
        if hasattr(value, "dict") and callable(value.dict):
            return to_primitive(value.dict())
    except Exception:
        pass

    try:
        attrs = getattr(value, "__dict__", None)
        if isinstance(attrs, dict):
            return to_primitive(attrs)
    except Exception:
        pass

    # Fallback: try to collect public attributes
    result = {}
    try:
        for name in dir(value):
            if name.startswith("_"):
                continue
            try:
                v = getattr(value, name)
            except Exception:
                continue
            if callable(v):
                continue
            result[name] = to_primitive(v)
    except Exception:
        pass

    if result:
        return result

    return str(value)
