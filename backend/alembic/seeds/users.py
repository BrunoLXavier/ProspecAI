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
        # Also ensure legacy alias used in some test scripts is present
        alias_email = "admin@prospecia"
        # Use a stable admin id for the default tenant so dev-bypass auth can map to it
        admin_id = os.getenv("SEED_ADMIN_ID", "00000000-0000-0000-0000-000000000001")
    else:
        # Use reserved testing TLD to avoid accidental production-like domains for non-default tenants
        admin_email = f"admin@{tenant_name.lower().replace(' ', '')}.example.test"
        # Generate a fresh id for non-default tenants
        admin_id = str(uuid.uuid4())
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
            "id": admin_id,
            "tenant_id": tenant_id,
            "email": admin_email,
            "username": "admin",
            "password_hash": DEFAULT_USER_PASS_HASH,
            "first_name": tenant_name,
            "last_name": "Administrator",
        },
    )

    # Legacy alias insertion (for convenience in local dev/tests)
    try:
        conn.execute(
            text(
                """
                INSERT INTO users (id, tenant_id, email, username, password_hash, first_name, last_name, is_active, email_verified, created_at, updated_at)
                SELECT :id2, :tenant_id, :alias_email, :username, :password_hash, :first_name, :last_name, true, true, now(), now()
                WHERE NOT EXISTS (
                    SELECT 1 FROM users WHERE tenant_id = :tenant_id AND email = :alias_email
                )
                """
            ),
            {
                "id2": str(uuid.uuid4()),
                "tenant_id": tenant_id,
                "alias_email": alias_email,
                "username": "admin",
                "password_hash": DEFAULT_USER_PASS_HASH,
                "first_name": tenant_name,
                "last_name": "Administrator",
            },
        )
    except Exception:
        # best effort, continue if alias insert fails
        pass

    # Ensure the admin role association exists for the admin user. Use the existing user id when present.
    # Insert a user_roles row only if not already present.
    conn.execute(
        text(
            """
            INSERT INTO user_roles (id, user_id, role_id, tenant_id, assigned_at)
            SELECT :ur_id, u.id, :role_id, u.tenant_id, now()
            FROM users u
            WHERE u.tenant_id = :tenant_id
              AND u.email = :email
              AND NOT EXISTS (
                SELECT 1 FROM user_roles ur WHERE ur.user_id = u.id AND ur.role_id = :role_id
              )
            """
        ),
        {
            "ur_id": str(uuid.uuid4()),
            "tenant_id": tenant_id,
            "email": admin_email,
            "role_id": "admin",
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

        # Add role association for seeded test users (map suffix to role id)
        role_map = {"admin": "admin", "dev": "developer", "e2e": "e2e"}
        role_id = role_map.get(u.get("suffix"), None)
        if role_id:
            conn.execute(
                text(
                    """
                    INSERT INTO user_roles (id, user_id, role_id, tenant_id, assigned_at)
                    SELECT :ur_id, u.id, :role_id, u.tenant_id, now()
                    FROM users u
                    WHERE u.tenant_id = :tenant_id
                      AND u.email = :email
                      AND NOT EXISTS (
                        SELECT 1 FROM user_roles ur WHERE ur.user_id = u.id AND ur.role_id = :role_id
                      )
                    """
                ),
                {
                    "ur_id": str(uuid.uuid4()),
                    "tenant_id": tenant_id,
                    "email": email,
                    "role_id": role_id,
                },
            )


def seed_for_tenants(conn, tenant_ids: Iterable[str]) -> List[str]:
    seeded = []
    for t in tenant_ids:
        seed_for_tenant(conn, t)
        seeded.append(t)
    return seeded
