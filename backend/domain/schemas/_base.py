# Domain Schemas - Base Module
# Shared imports and utilities for all Pydantic request/response schemas
# Phase 9A: Schema extraction from routers into domain/schemas/

from datetime import datetime, date
from typing import Any, Dict, List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

__all__ = [
    "BaseModel",
    "ConfigDict",
    "Field",
    "Any",
    "Dict",
    "List",
    "Optional",
    "UUID",
    "datetime",
    "date",
]
