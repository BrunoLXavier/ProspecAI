"""Seed script to insert sample audit log entries for local development.
Run with: python scripts/seed_activity.py
"""
import asyncio
from datetime import datetime
import uuid

from adapters.database.connection import get_db_context
from adapters.database.models import AuditLogModel
from sqlalchemy import insert
import sqlalchemy as sa


TENANT_ID = uuid.UUID('00000000-0000-0000-0000-000000000001')


async def seed():
    async with get_db_context() as session:
        # Insert a few sample audit log rows if none exist for tenant
        q = await session.execute(
            sa.text("SELECT COUNT(1) FROM audit_logs WHERE tenant_id = :t"),
            {"t": str(TENANT_ID)}
        )
        count = q.scalar_one()
        if count and count > 0:
            print("Sample audit logs already present; skipping seeding.")
            return

        now = datetime.utcnow()
        samples = [
            {
                "id": uuid.uuid4(),
                "tenant_id": TENANT_ID,
                "entity_type": "opportunity",
                "entity_id": uuid.uuid4(),
                "action": "CREATE",
            "user_id": uuid.uuid4(),
            "user_role": "admin",
                    "created_at": now,
                    "updated_at": now,
                    "created_by": uuid.uuid4(),  # Set to user_id
                    "updated_by": uuid.uuid4(),  # Set to user_id
                "timestamp": now,
                "notes": "Seeded opportunity created for dashboard",
                "diff": None,
                "success": True,
            },
            {
                "id": uuid.uuid4(),
                "tenant_id": TENANT_ID,
                "entity_type": "proposal",
                "entity_id": uuid.uuid4(),
                "action": "UPDATE",
                "user_id": uuid.uuid4(),
                "user_role": "user",
                    "created_at": now,
                    "updated_at": now,
                    "created_by": uuid.uuid4(),  # Set to user_id
                    "updated_by": uuid.uuid4(),  # Set to user_id
                "timestamp": now,
                "notes": "Seeded proposal updated",
                "diff": None,
                "success": True,
            }
        ]

        # Introspect actual columns present in the audit_logs table and insert
        col_rows = await session.execute(sa.text("SELECT column_name FROM information_schema.columns WHERE table_name='audit_logs'"))
        present = {r[0] for r in col_rows.fetchall()}

        for s in samples:
            base_params = {
                "id": str(s["id"]),
                "tenant_id": str(s["tenant_id"]),
                "entity_type": s["entity_type"],
                "entity_id": str(s["entity_id"]),
                "action": s["action"],
                "timestamp": s["timestamp"],
                "user_id": str(s["user_id"]),
                "user_role": s.get("user_role"),
                "before_state": None,
                "after_state": None,
                "diff": s.get("diff"),
                "session_id": None,
                "request_id": None,
                "notes": s.get("notes"),
                "success": s.get("success", True),
                "created_at": s.get("created_at"),
                "updated_at": s.get("updated_at"),
                "created_by": str(s.get("created_by")) if s.get("created_by") else str(s.get("user_id")),
                "updated_by": str(s.get("updated_by")) if s.get("updated_by") else str(s.get("user_id")),
                "version": 1,
            }

            cols_to_insert = [c for c in [
                "id", "tenant_id", "entity_type", "entity_id", "action", "timestamp", "user_id", "user_role",
                "before_state", "after_state", "diff", "session_id", "request_id", "notes", "success",
                "created_at", "updated_at", "created_by", "updated_by", "version"
            ] if c in present]

            if not cols_to_insert:
                continue

            cols_sql = ", ".join(cols_to_insert)
            vals_sql = ", ".join(
                [f":{c}" for c in cols_to_insert]
            )
            insert_sql = sa.text(f"INSERT INTO audit_logs ({cols_sql}) VALUES ({vals_sql})")

            params = {k: base_params[k] for k in cols_to_insert}
            await session.execute(insert_sql, params)

        print(f"Inserted {len(samples)} sample audit log entries for tenant {TENANT_ID}")


if __name__ == '__main__':
    asyncio.run(seed())
