"""
Reports API Router
Implements RF-09: Dynamic Report Builder with schema introspection, visual query building,
and multi-format export (HTML, CSV, JSON, PDF, XLSX).
"""
from datetime import datetime
from typing import List, Optional, Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from fastapi.responses import HTMLResponse, StreamingResponse, JSONResponse
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from infrastructure.dependencies import get_db_session, get_current_user_id, get_current_tenant_id
from services.dynamic_report_service import DynamicReportService


# =============================================================================
# SCHEMAS
# =============================================================================

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


class PreviewRequest(BaseModel):
    """Schema for query preview request."""
    query_config: QueryConfig
    limit: int = Field(default=10, le=100)


class GenerateRequest(BaseModel):
    """Schema for report generation request."""
    template_id: UUID
    format: str = Field(default='html', pattern='^(html|csv|json|pdf|xlsx)$')
    parameters: Optional[dict] = None


# =============================================================================
# ROUTER
# =============================================================================

router = APIRouter(prefix="/api/v1/reports", tags=["Reports"])


def get_report_service(db: AsyncSession = Depends(get_db_session)) -> DynamicReportService:
    return DynamicReportService(db)


# =============================================================================
# SCHEMA INTROSPECTION ENDPOINTS
# =============================================================================

@router.get("/schema/tables", response_model=List[TableSummary])
async def list_reportable_tables(
    current_user_id: UUID = Depends(get_current_user_id),
    service: DynamicReportService = Depends(get_report_service)
):
    """
    Get list of tables available for reporting.
    Returns table names, display names, and field counts.
    """
    # TODO: Extract user permissions from current_user
    user_permissions = None
    tables = service.get_reportable_tables(user_permissions)
    return [TableSummary(**t) for t in tables]


@router.get("/schema/tables/{table_name}", response_model=TableSchema)
async def get_table_schema(
    table_name: str,
    current_user_id: UUID = Depends(get_current_user_id),
    service: DynamicReportService = Depends(get_report_service)
):
    """
    Get detailed schema for a specific table.
    Includes fields, types, and available relationships.
    """
    schema = service.get_table_schema(table_name)
    if not schema:
        raise HTTPException(status_code=404, detail=f"Table '{table_name}' not found")
    
    return TableSchema(
        table_name=schema['table_name'],
        display_name=schema['display_name'],
        description=schema.get('description'),
        fields=[FieldSchema(**f) for f in schema['fields']],
        relationships=[RelationshipSchema(
            target_table=r['target_table'],
            target_display_name=r.get('target_display_name', r['target_table']),
            join_field=r['join_field'],
            target_field=r['target_field'],
            label=r['label'],
            type=r['type']
        ) for r in schema.get('relationships', [])]
    )


@router.get("/schema/tables/{table_name}/joins", response_model=List[RelationshipSchema])
async def get_available_joins(
    table_name: str,
    current_user_id: UUID = Depends(get_current_user_id),
    service: DynamicReportService = Depends(get_report_service)
):
    """
    Get available join options for a base table.
    Useful for building multi-table reports.
    """
    joins = service.get_available_joins(table_name)
    return [RelationshipSchema(
        target_table=j['target_table'],
        target_display_name=j['target_display_name'],
        join_field=j['join_field'],
        target_field=j['target_field'],
        label=j['label'],
        type=j['type']
    ) for j in joins]


# =============================================================================
# TEMPLATE CRUD ENDPOINTS
# =============================================================================

@router.get("/templates", response_model=List[ReportTemplateResponse])
async def list_templates(
    visibility: Optional[str] = Query(None, pattern='^(private|institute|all_tenants)$'),
    category: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user_id: UUID = Depends(get_current_user_id),
    tenant_id: UUID = Depends(get_current_tenant_id),
    service: DynamicReportService = Depends(get_report_service)
):
    """
    List report templates visible to the current user.
    Includes user's private templates, institute templates, and system templates.
    """
    user_id = current_user_id
    institute_id = current_user.get('institute_id')
    if institute_id and isinstance(institute_id, str):
        institute_id = UUID(institute_id)
    
    templates = await service.list_templates(
        tenant_id=tenant_id,
        user_id=user_id,
        institute_id=institute_id,
        visibility=visibility,
        category=category,
        limit=limit,
        offset=offset
    )
    
    return [ReportTemplateResponse.model_validate(t) for t in templates]


@router.get("/templates/{template_id}", response_model=ReportTemplateResponse)
async def get_template(
    template_id: UUID,
    current_user_id: UUID = Depends(get_current_user_id),
    tenant_id: UUID = Depends(get_current_tenant_id),
    service: DynamicReportService = Depends(get_report_service)
):
    """Get a report template by ID."""
    template = await service.get_template(template_id, tenant_id)
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    return ReportTemplateResponse.model_validate(template)


@router.post("/templates", response_model=ReportTemplateResponse, status_code=status.HTTP_201_CREATED)
async def create_template(
    data: ReportTemplateCreate,
    current_user_id: UUID = Depends(get_current_user_id),
    tenant_id: UUID = Depends(get_current_tenant_id),
    service: DynamicReportService = Depends(get_report_service)
):
    """Create a new report template."""
    user_id = current_user_id
    
    try:
        template = await service.create_template(
            tenant_id=tenant_id,
            name=data.name,
            query_config=data.query_config.model_dump(),
            created_by=user_id,
            description=data.description,
            visibility=data.visibility,
            institute_id=data.institute_id,
            display_config=data.display_config.model_dump() if data.display_config else None,
            output_formats=data.output_formats,
            schedule_cron=data.schedule_cron,
            schedule_enabled=data.schedule_enabled,
            schedule_recipients=data.schedule_recipients,
            category=data.category,
            tags=data.tags
        )
        return ReportTemplateResponse.model_validate(template)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/templates/{template_id}", response_model=ReportTemplateResponse)
async def update_template(
    template_id: UUID,
    data: ReportTemplateUpdate,
    current_user_id: UUID = Depends(get_current_user_id),
    tenant_id: UUID = Depends(get_current_tenant_id),
    service: DynamicReportService = Depends(get_report_service)
):
    """Update an existing report template."""
    user_id = current_user_id
    
    updates = data.model_dump(exclude_unset=True)
    
    # Convert nested models to dicts
    if 'query_config' in updates and updates['query_config']:
        updates['query_config'] = updates['query_config'].model_dump() if hasattr(updates['query_config'], 'model_dump') else updates['query_config']
    if 'display_config' in updates and updates['display_config']:
        updates['display_config'] = updates['display_config'].model_dump() if hasattr(updates['display_config'], 'model_dump') else updates['display_config']
    
    try:
        template = await service.update_template(template_id, tenant_id, user_id, updates)
        if not template:
            raise HTTPException(status_code=404, detail="Template not found")
        return ReportTemplateResponse.model_validate(template)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/templates/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_template(
    template_id: UUID,
    current_user_id: UUID = Depends(get_current_user_id),
    tenant_id: UUID = Depends(get_current_tenant_id),
    service: DynamicReportService = Depends(get_report_service)
):
    """Delete a report template (soft delete)."""
    success = await service.delete_template(template_id, tenant_id)
    if not success:
        raise HTTPException(status_code=404, detail="Template not found")
    return None


# =============================================================================
# QUERY PREVIEW ENDPOINT
# =============================================================================

@router.post("/preview", response_model=dict)
async def preview_query(
    data: PreviewRequest,
    current_user_id: UUID = Depends(get_current_user_id),
    tenant_id: UUID = Depends(get_current_tenant_id),
    service: DynamicReportService = Depends(get_report_service)
):
    """
    Preview query results without creating a report.
    Returns a limited number of rows for validation.
    """
    try:
        rows = await service.preview_query(
            query_config=data.query_config.model_dump(),
            tenant_id=tenant_id,
            limit=data.limit
        )
        return {
            "row_count": len(rows),
            "preview_limit": data.limit,
            "data": rows
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# =============================================================================
# REPORT GENERATION ENDPOINTS
# =============================================================================

@router.post("/generate/{format}")
async def generate_report(
    format: str,
    data: GenerateRequest,
    current_user_id: UUID = Depends(get_current_user_id),
    tenant_id: UUID = Depends(get_current_tenant_id),
    service: DynamicReportService = Depends(get_report_service)
):
    """
    Generate a report from a template in the specified format.
    Supports: html, csv, json, pdf, xlsx
    """
    user_id = current_user_id
    
    # Validate format
    valid_formats = ['html', 'csv', 'json', 'pdf', 'xlsx']
    if format not in valid_formats:
        raise HTTPException(status_code=400, detail=f"Invalid format. Must be one of: {', '.join(valid_formats)}")
    
    try:
        instance, content = await service.generate_report(
            template_id=data.template_id,
            tenant_id=tenant_id,
            user_id=user_id,
            format=format,
            parameters=data.parameters
        )
        
        # Return appropriate response based on format
        if format == 'html':
            return HTMLResponse(content=content, status_code=200)
        
        elif format == 'json':
            return JSONResponse(content=content, status_code=200)
        
        elif format == 'csv':
            return Response(
                content=content,
                media_type='text/csv',
                headers={
                    'Content-Disposition': f'attachment; filename="report_{instance.id}.csv"'
                }
            )
        
        elif format == 'xlsx':
            return Response(
                content=content,
                media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                headers={
                    'Content-Disposition': f'attachment; filename="report_{instance.id}.xlsx"'
                }
            )
        
        elif format == 'pdf':
            return Response(
                content=content,
                media_type='application/pdf',
                headers={
                    'Content-Disposition': f'attachment; filename="report_{instance.id}.pdf"'
                }
            )
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Report generation failed: {str(e)}")


# =============================================================================
# REPORT INSTANCES (HISTORY) ENDPOINTS
# =============================================================================

@router.get("", response_model=List[ReportInstanceResponse])
async def list_generated_reports(
    template_id: Optional[UUID] = None,
    status: Optional[str] = Query(None, pattern='^(pending|processing|completed|failed)$'),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user_id: UUID = Depends(get_current_user_id),
    tenant_id: UUID = Depends(get_current_tenant_id),
    service: DynamicReportService = Depends(get_report_service)
):
    """List generated reports (report instances)."""
    user_id = current_user_id
    
    instances = await service.list_instances(
        tenant_id=tenant_id,
        user_id=user_id,
        template_id=template_id,
        status=status,
        limit=limit,
        offset=offset
    )
    
    return [ReportInstanceResponse.model_validate(i) for i in instances]


@router.get("/{report_id}", response_model=ReportInstanceResponse)
async def get_generated_report(
    report_id: UUID,
    current_user_id: UUID = Depends(get_current_user_id),
    tenant_id: UUID = Depends(get_current_tenant_id),
    service: DynamicReportService = Depends(get_report_service)
):
    """Get a specific generated report by ID."""
    instance = await service.get_instance(report_id, tenant_id)
    if not instance:
        raise HTTPException(status_code=404, detail="Report not found")
    
    return ReportInstanceResponse.model_validate(instance)


@router.delete("/{report_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_generated_report(
    report_id: UUID,
    current_user_id: UUID = Depends(get_current_user_id),
    tenant_id: UUID = Depends(get_current_tenant_id),
    service: DynamicReportService = Depends(get_report_service)
):
    """Delete a generated report (soft delete)."""
    success = await service.delete_instance(report_id, tenant_id)
    if not success:
        raise HTTPException(status_code=404, detail="Report not found")
    return None
