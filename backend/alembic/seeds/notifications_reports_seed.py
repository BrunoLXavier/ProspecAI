"""
Seed script for Notifications and Report Templates
Creates sample notifications and system report templates.
"""
import asyncio
from uuid import uuid4, UUID
from datetime import datetime, timedelta

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select

# Import models
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from adapters.database.models import (
    NotificationModel, UserNotificationPreferenceModel,
    ReportTemplateModel, ReportInstanceModel, ReportableTableModel
)


# Default tenant and user IDs (should match your seeded data)
DEFAULT_TENANT_ID = UUID("00000000-0000-0000-0000-000000000001")
SYSTEM_USER_ID = UUID("00000000-0000-0000-0000-000000000001")


async def seed_reportable_tables(session: AsyncSession):
    """Seed the reportable_tables metadata table."""
    
    tables = [
        {
            "id": uuid4(),
            "table_name": "funding_sources",
            "display_name": "Funding Sources",
            "description": "Funding opportunities, grants, and programs available for R&D projects",
            "fields": [
                {"name": "id", "type": "uuid", "display_name": "ID", "filterable": True, "sortable": True},
                {"name": "name", "type": "string", "display_name": "Name", "filterable": True, "sortable": True},
                {"name": "institution", "type": "string", "display_name": "Institution", "filterable": True, "sortable": True},
                {"name": "instrument_type", "type": "string", "display_name": "Instrument Type", "filterable": True, "sortable": True},
                {"name": "total_amount", "type": "decimal", "display_name": "Total Amount", "filterable": True, "sortable": True},
                {"name": "status", "type": "string", "display_name": "Status", "filterable": True, "sortable": True},
                {"name": "submission_start", "type": "datetime", "display_name": "Submission Start", "filterable": True, "sortable": True},
                {"name": "submission_end", "type": "datetime", "display_name": "Submission End", "filterable": True, "sortable": True},
            ],
            "relationships": [
                {"target_table": "projects", "join_field": "id", "target_field": "funding_id", "label": "Related Projects"}
            ],
            "display_order": 1,
            "enabled": True
        },
        {
            "id": uuid4(),
            "table_name": "projects",
            "display_name": "Projects",
            "description": "Research and development projects in the portfolio",
            "fields": [
                {"name": "id", "type": "uuid", "display_name": "ID", "filterable": True, "sortable": True},
                {"name": "title", "type": "string", "display_name": "Title", "filterable": True, "sortable": True},
                {"name": "status", "type": "string", "display_name": "Status", "filterable": True, "sortable": True},
                {"name": "trl_current", "type": "integer", "display_name": "Current TRL", "filterable": True, "sortable": True},
                {"name": "budget", "type": "decimal", "display_name": "Budget", "filterable": True, "sortable": True},
                {"name": "start_date", "type": "datetime", "display_name": "Start Date", "filterable": True, "sortable": True},
                {"name": "end_date", "type": "datetime", "display_name": "End Date", "filterable": True, "sortable": True},
            ],
            "relationships": [
                {"target_table": "portfolios", "join_field": "portfolio_id", "target_field": "id", "label": "Portfolio"}
            ],
            "display_order": 2,
            "enabled": True
        },
        {
            "id": uuid4(),
            "table_name": "opportunities",
            "display_name": "Opportunities",
            "description": "Business opportunities in the CRM pipeline",
            "fields": [
                {"name": "id", "type": "uuid", "display_name": "ID", "filterable": True, "sortable": True},
                {"name": "title", "type": "string", "display_name": "Title", "filterable": True, "sortable": True},
                {"name": "stage", "type": "string", "display_name": "Stage", "filterable": True, "sortable": True},
                {"name": "probability", "type": "decimal", "display_name": "Probability", "filterable": True, "sortable": True},
                {"name": "expected_value", "type": "decimal", "display_name": "Expected Value", "filterable": True, "sortable": True},
                {"name": "status", "type": "string", "display_name": "Status", "filterable": True, "sortable": True},
            ],
            "relationships": [],
            "requires_permission": "crm:read",
            "display_order": 3,
            "enabled": True
        },
    ]
    
    for table_data in tables:
        # Check if already exists
        existing = await session.execute(
            select(ReportableTableModel).where(ReportableTableModel.table_name == table_data["table_name"])
        )
        if existing.scalar_one_or_none():
            print(f"  Reportable table '{table_data['table_name']}' already exists, skipping")
            continue
        
        table = ReportableTableModel(**table_data)
        session.add(table)
    
    await session.commit()
    print(f"✓ Seeded {len(tables)} reportable tables")


async def seed_report_templates(session: AsyncSession, tenant_id: UUID, user_id: UUID):
    """Seed system report templates."""
    
    templates = [
        {
            "id": uuid4(),
            "tenant_id": tenant_id,
            "name": "Funding Sources Overview",
            "description": "Summary of all active funding sources with amounts and deadlines",
            "visibility": "all_tenants",
            "query_config": {
                "base_table": "funding_sources",
                "selected_fields": ["name", "institution", "instrument_type", "total_amount", "status", "submission_start", "submission_end"],
                "filters": [{"field": "status", "operator": "eq", "value": "active"}],
                "order_by": [{"field": "submission_end", "direction": "asc"}],
                "limit": 100
            },
            "display_config": {
                "chart_type": "table",
                "title": "Active Funding Sources"
            },
            "output_formats": ["html", "csv", "json", "pdf", "xlsx"],
            "category": "Funding",
            "tags": ["funding", "overview", "system"],
            "created_by": user_id,
            "updated_by": user_id
        },
        {
            "id": uuid4(),
            "tenant_id": tenant_id,
            "name": "Project Status Report",
            "description": "Projects grouped by status with TRL levels and budgets",
            "visibility": "all_tenants",
            "query_config": {
                "base_table": "projects",
                "selected_fields": ["title", "status", "trl_current", "budget", "start_date", "end_date"],
                "order_by": [{"field": "status", "direction": "asc"}, {"field": "title", "direction": "asc"}],
                "limit": 200
            },
            "display_config": {
                "chart_type": "table",
                "title": "Project Status Overview"
            },
            "output_formats": ["html", "csv", "json", "pdf", "xlsx"],
            "category": "Portfolio",
            "tags": ["projects", "status", "system"],
            "created_by": user_id,
            "updated_by": user_id
        },
        {
            "id": uuid4(),
            "tenant_id": tenant_id,
            "name": "Upcoming Deadlines",
            "description": "Funding sources with submission deadlines in the next 30 days",
            "visibility": "all_tenants",
            "query_config": {
                "base_table": "funding_sources",
                "selected_fields": ["name", "institution", "total_amount", "submission_end"],
                "filters": [
                    {"field": "status", "operator": "eq", "value": "active"},
                    {"field": "submission_end", "operator": "gte", "value": "$today"},
                    {"field": "submission_end", "operator": "lte", "value": "$today_plus_30"}
                ],
                "order_by": [{"field": "submission_end", "direction": "asc"}],
                "limit": 50
            },
            "display_config": {
                "chart_type": "table",
                "title": "Upcoming Submission Deadlines"
            },
            "output_formats": ["html", "csv", "json", "pdf"],
            "schedule_cron": "0 8 * * 1",  # Every Monday at 8am
            "schedule_enabled": False,
            "category": "Deadlines",
            "tags": ["deadlines", "urgent", "system"],
            "created_by": user_id,
            "updated_by": user_id
        },
        {
            "id": uuid4(),
            "tenant_id": tenant_id,
            "name": "High-Value Opportunities",
            "description": "Opportunities with expected value above threshold",
            "visibility": "all_tenants",
            "query_config": {
                "base_table": "opportunities",
                "selected_fields": ["title", "stage", "probability", "expected_value", "status"],
                "filters": [
                    {"field": "expected_value", "operator": "gte", "value": 100000}
                ],
                "order_by": [{"field": "expected_value", "direction": "desc"}],
                "limit": 50
            },
            "display_config": {
                "chart_type": "table",
                "title": "High-Value Opportunities"
            },
            "output_formats": ["html", "csv", "json", "pdf", "xlsx"],
            "category": "CRM",
            "tags": ["opportunities", "high-value", "system"],
            "created_by": user_id,
            "updated_by": user_id
        },
    ]
    
    for tpl_data in templates:
        # Check if already exists
        existing = await session.execute(
            select(ReportTemplateModel).where(
                ReportTemplateModel.name == tpl_data["name"],
                ReportTemplateModel.tenant_id == tenant_id
            )
        )
        if existing.scalar_one_or_none():
            print(f"  Report template '{tpl_data['name']}' already exists, skipping")
            continue
        
        template = ReportTemplateModel(**tpl_data)
        session.add(template)
    
    await session.commit()
    print(f"✓ Seeded {len(templates)} report templates")


async def seed_sample_notifications(session: AsyncSession, tenant_id: UUID, user_id: UUID):
    """Seed sample notifications for testing."""
    
    now = datetime.utcnow()
    
    notifications = [
        {
            "id": uuid4(),
            "tenant_id": tenant_id,
            "user_id": user_id,
            "title": "Welcome to ProspecAI!",
            "body": "Your account has been set up successfully. Start exploring funding opportunities and managing your R&D portfolio.",
            "notification_type": "info",
            "priority": "normal",
            "action_url": "/dashboard",
            "channels": ["in_app"],
            "delivery_status": {"in_app": "delivered"},
            "read": False,
            "dismissed": False,
            "created_by": user_id,
            "updated_by": user_id
        },
        {
            "id": uuid4(),
            "tenant_id": tenant_id,
            "user_id": user_id,
            "title": "New Matching Results Available",
            "body": "3 new funding opportunities match your project 'AI-Powered Healthcare'. Click to review the matches.",
            "notification_type": "matching",
            "priority": "high",
            "entity_type": "matching_result",
            "action_url": "/matching",
            "channels": ["in_app", "email"],
            "delivery_status": {"in_app": "delivered", "email": "pending"},
            "read": False,
            "dismissed": False,
            "created_by": user_id,
            "updated_by": user_id
        },
        {
            "id": uuid4(),
            "tenant_id": tenant_id,
            "user_id": user_id,
            "title": "Deadline Approaching",
            "body": "FAPESP Innovation grant submission deadline is in 7 days. Make sure your proposal is ready!",
            "notification_type": "deadline",
            "priority": "urgent",
            "entity_type": "funding_source",
            "action_url": "/funding",
            "channels": ["in_app", "email"],
            "delivery_status": {"in_app": "delivered", "email": "sent"},
            "read": False,
            "dismissed": False,
            "expires_at": now + timedelta(days=7),
            "created_by": user_id,
            "updated_by": user_id
        },
        {
            "id": uuid4(),
            "tenant_id": tenant_id,
            "user_id": user_id,
            "title": "Proposal Submitted Successfully",
            "body": "Your proposal 'Smart Agriculture IoT Platform' has been submitted to FINEP. Confirmation number: #2026-0124-001",
            "notification_type": "success",
            "priority": "normal",
            "entity_type": "proposal",
            "action_url": "/proposals",
            "channels": ["in_app"],
            "delivery_status": {"in_app": "delivered"},
            "read": True,
            "read_at": now - timedelta(hours=2),
            "dismissed": False,
            "created_by": user_id,
            "updated_by": user_id
        },
    ]
    
    for notif_data in notifications:
        notification = NotificationModel(**notif_data)
        session.add(notification)
    
    await session.commit()
    print(f"✓ Seeded {len(notifications)} sample notifications")


async def main():
    """Run the seed script."""
    import os
    
    database_url = os.getenv(
        "DATABASE_URL",
        "postgresql+asyncpg://postgres:postgres@localhost:5432/prospecai"
    )
    
    print(f"Connecting to database...")
    engine = create_async_engine(database_url, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        print("\n=== Seeding Notifications & Reports ===\n")
        
        await seed_reportable_tables(session)
        await seed_report_templates(session, DEFAULT_TENANT_ID, SYSTEM_USER_ID)
        await seed_sample_notifications(session, DEFAULT_TENANT_ID, SYSTEM_USER_ID)
        
        print("\n=== Seed Complete ===\n")
    
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
