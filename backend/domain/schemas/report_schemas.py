# Report Schemas
# Domain Layer - Request/Response schemas for Reports API
# Implements RF-09: Dynamic Report Builder
# Extracted from routers/reports_router.py — Phase 9A

from domain.schemas._base import *


# ============================================================================
# Schema Introspection Models
# ============================================================================

class FieldSchema(BaseModel):
    """Schema for a table field."""
    name: str
    type: str
    display_name: str
    filterable: bool = True
    sortable: bool = True


class RelationshipSchema(BaseModel):
    """Schema for a table relationship."""
    target_table: str
    target_display_name: str
    join_field: str
    target_field: str
    label: str
    type: str


class TableSchema(BaseModel):
    """Schema for a reportable table."""
    table_name: str
    display_name: str
    description: Optional[str] = None
    fields: List[FieldSchema]
    relationships: List[RelationshipSchema]


class TableSummary(BaseModel):
    """Summary of a reportable table."""
    table_name: str
    display_name: str
    description: Optional[str] = None
    field_count: int
    display_order: int


# ============================================================================
# Query Configuration Models
# ============================================================================

class JoinConfig(BaseModel):
    """Configuration for a table join."""
    table: str
    on: dict
    type: str = 'LEFT'


class FilterConfig(BaseModel):
    """Configuration for a query filter."""
    field: str
    operator: str = 'eq'
    value: Any


class OrderByConfig(BaseModel):
    """Configuration for ordering."""
    field: str
    direction: str = 'asc'


class QueryConfig(BaseModel):
    """Full query configuration for dynamic reports."""
    base_table: str
    selected_fields: List[str] = Field(default=['*'])
    joins: Optional[List[JoinConfig]] = None
    filters: Optional[List[FilterConfig]] = None
    group_by: Optional[List[str]] = None
    order_by: Optional[List[OrderByConfig]] = None
    limit: int = Field(default=1000, le=10000)


class DisplayConfig(BaseModel):
    """Configuration for report display."""
    chart_type: Optional[str] = None
    x_axis: Optional[str] = None
    y_axis: Optional[str] = None
    colors: Optional[dict] = None
    title: Optional[str] = None


# ============================================================================
# Report Template CRUD Models
# ============================================================================

class ReportTemplateCreate(BaseModel):
    """Schema for creating a report template."""
    name: str = Field(..., max_length=200)
    description: Optional[str] = None
    visibility: str = Field(default='private', pattern='^(private|institute|all_tenants)$')
    institute_id: Optional[UUID] = None
    query_config: QueryConfig
    display_config: Optional[DisplayConfig] = None
    output_formats: List[str] = Field(default=['html', 'csv', 'json', 'pdf', 'xlsx'])
    schedule_cron: Optional[str] = None
    schedule_enabled: bool = False
    schedule_recipients: Optional[List[str]] = None
    category: Optional[str] = None
    tags: Optional[List[str]] = None


class ReportTemplateUpdate(BaseModel):
    """Schema for updating a report template."""
    name: Optional[str] = Field(default=None, max_length=200)
    description: Optional[str] = None
    visibility: Optional[str] = Field(default=None, pattern='^(private|institute|all_tenants)$')
    institute_id: Optional[UUID] = None
    query_config: Optional[QueryConfig] = None
    display_config: Optional[DisplayConfig] = None
    output_formats: Optional[List[str]] = None
    schedule_cron: Optional[str] = None
    schedule_enabled: Optional[bool] = None
    schedule_recipients: Optional[List[str]] = None
    category: Optional[str] = None
    tags: Optional[List[str]] = None


class ReportTemplateResponse(BaseModel):
    """Schema for report template response."""
    id: UUID
    tenant_id: UUID
    name: str
    description: Optional[str] = None
    visibility: str
    institute_id: Optional[UUID] = None
    query_config: dict
    display_config: dict
    output_formats: List[str]
    schedule_cron: Optional[str] = None
    schedule_enabled: bool
    schedule_recipients: List[str]
    category: Optional[str] = None
    tags: List[str]
    run_count: int
    last_run_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    created_by: UUID

    class Config:
        from_attributes = True


class ReportInstanceResponse(BaseModel):
    """Schema for report instance (generated report) response."""
    id: UUID
    template_id: Optional[UUID] = None
    format: str
    status: str
    parameters: dict
    file_path: Optional[str] = None
    file_size: Optional[int] = None
    row_count: Optional[int] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    error_message: Optional[str] = None
    expires_at: Optional[datetime] = None
    created_at: datetime
    created_by: UUID

    class Config:
        from_attributes = True


# ============================================================================
# Request Models
# ============================================================================

class PreviewRequest(BaseModel):
    """Schema for query preview request."""
    query_config: QueryConfig
    limit: int = Field(default=10, le=100)


class GenerateRequest(BaseModel):
    """Schema for report generation request."""
    template_id: UUID
    format: str = Field(default='html', pattern='^(html|csv|json|pdf|xlsx)$')
    parameters: Optional[dict] = None
