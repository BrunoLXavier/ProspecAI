from __future__ import annotations

"""Idempotent admin seed for startup.

Provides `seed_for_tenants(conn, tenant_ids)` so the seed runner can ensure
the canonical admin user and roles exist for each tenant passed.
"""

from sqlalchemy import text

ADMIN_ID = 'ba4f4bf9-2daf-4be4-81cb-69bc2b832209'
ADMIN_EMAIL = 'admin@prospecai.com'
ADMIN_HASH = '$2b$12$qr3hqVrfnETJMhNAwiEWFOfpp8jPHMVgiEvMtBzlbTmvOxSRe0Nfy'
ADMIN_USERNAME = 'admin'


def seed_for_tenants(conn, tenant_ids: list[str]):
    # Ensure roles exist
    conn.execute(text("INSERT INTO roles (name) VALUES ('admin') ON CONFLICT (name) DO NOTHING;"))
    conn.execute(text("INSERT INTO roles (name) VALUES ('superadmin') ON CONFLICT (name) DO NOTHING;"))
    conn.execute(text("INSERT INTO roles (name) VALUES ('developer') ON CONFLICT (name) DO NOTHING;"))

    for tenant_id in tenant_ids:
        # Upsert admin user for tenant
        conn.execute(text(
            """
            INSERT INTO users (id, tenant_id, email, username, password_hash, first_name, last_name, email_verified, is_active, created_at, updated_at)
            SELECT :id, :tenant_id, :email, :username, :password_hash, :first_name, :last_name, true, true, now(), now()
            WHERE NOT EXISTS (SELECT 1 FROM users WHERE tenant_id = :tenant_id AND email = :email)
            """), {
            'id': ADMIN_ID,
            'tenant_id': tenant_id,
            'email': ADMIN_EMAIL,
            'username': ADMIN_USERNAME,
            'password_hash': ADMIN_HASH,
            'first_name': 'System',
            'last_name': 'Administrator'
        })

        # Assign roles idempotently
        conn.execute(text(
            """
            INSERT INTO user_roles (id, user_id, role_id, role_name, assigned_at)
            SELECT gen_random_uuid(), u.id, 'admin', 'admin', now() FROM users u
            WHERE u.email = :email AND u.tenant_id = :tenant_id
            AND NOT EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = u.id AND ur.role_id = 'admin')
            """), {'email': ADMIN_EMAIL, 'tenant_id': tenant_id})

        conn.execute(text(
            """
            INSERT INTO user_roles (id, user_id, role_id, role_name, assigned_at)
            SELECT gen_random_uuid(), u.id, 'superadmin', 'superadmin', now() FROM users u
            WHERE u.email = :email AND u.tenant_id = :tenant_id
            AND NOT EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = u.id AND ur.role_id = 'superadmin')
            """), {'email': ADMIN_EMAIL, 'tenant_id': tenant_id})

    print('admin seed applied for tenants:', tenant_ids)
