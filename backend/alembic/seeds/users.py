import os
import uuid
from typing import Iterable, List

from sqlalchemy import text


DEFAULT_USER_PASS_HASH = os.getenv(
    "SEED_USER_PASSWORD_HASH",
    "$2b$12$uDx8Qw0dJp7G3y9Zp1bUZOQkY2QpXQv8O1fYQfZmjvUu5zJkQ7WqK",
)


DEFAULT_USERS = [
    {"suffix": "admin", "first": "Admin", "email_template": "admin+{tag}@example.test", "username_template": "{tag}_admin", "email_verified": True},
    {"suffix": "dev", "first": "Developer", "email_template": "dev+{tag}@example.test", "username_template": "{tag}_dev", "email_verified": False},
    {"suffix": "e2e", "first": "E2E", "email_template": "e2e+{tag}@example.test", "username_template": "{tag}_e2e", "email_verified": True},
]


def seed_for_tenant(conn, tenant_id: str, tenant_name: str = "Tenant") -> None:
    # Ensure a single admin account (align with current users schema)
    # For the primary/default tenant, use the canonical admin address used in deployments.
    if tenant_name.lower().startswith("default"):
        admin_email = "admin@prospecai.com"
    else:
        # Use reserved testing TLD to avoid accidental production-like domains for non-default tenants
        admin_email = f"admin@{tenant_name.lower().replace(' ', '')}.example.test"
    conn.execute(
        text(
            """
            INSERT INTO users (id, tenant_id, email, username, password_hash, first_name, last_name, is_active, email_verified, created_at, updated_at)
            SELECT :id, :tenant_id, :email, :username, :password_hash, :first_name, :last_name, true, true, now(), now()
            WHERE NOT EXISTS (
                SELECT 1 FROM users WHERE tenant_id = :tenant_id AND (email = :email OR username = :username)
            )
            """
        ),
        {
            "id": str(uuid.uuid4()),
            "tenant_id": tenant_id,
            "email": admin_email,
            "username": "admin",
            "password_hash": DEFAULT_USER_PASS_HASH,
            "first_name": tenant_name,
            "last_name": "Administrator",
        },
    )

    # Add a small set of environment/test users
    tag = tenant_id.split("-")[0]
    for u in DEFAULT_USERS:
        email = u["email_template"].format(tag=tag)
        username = u["username_template"].format(tag=tag)
        stmt = text(
            """
            INSERT INTO users (id, tenant_id, email, username, password_hash, first_name, last_name, is_active, email_verified, created_at, updated_at)
            VALUES (:id, :tenant_id, :email, :username, :password_hash, :first_name, :last_name, true, :email_verified, now(), now())
            ON CONFLICT (tenant_id, email) DO NOTHING
            """
        )
        params = {
            "id": str(uuid.uuid4()),
            "tenant_id": tenant_id,
            "email": email,
            "username": username,
            "password_hash": DEFAULT_USER_PASS_HASH,
            "first_name": u["first"],
            "last_name": tenant_name,
            "email_verified": u["email_verified"],
        }
        conn.execute(stmt, params)


def seed_for_tenants(conn, tenant_ids: Iterable[str]) -> List[str]:
    seeded = []
    for t in tenant_ids:
        seed_for_tenant(conn, t)
        seeded.append(t)
    return seeded
