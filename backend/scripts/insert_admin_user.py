from sqlalchemy import create_engine, text
import os

DATABASE_URL = os.environ.get('DATABASE_URL')
if not DATABASE_URL:
    raise RuntimeError('DATABASE_URL not set')

eng = create_engine(DATABASE_URL.replace('+asyncpg', '') if '+asyncpg' in DATABASE_URL else DATABASE_URL)
ADMIN_ID = 'ba4f4bf9-2daf-4be4-81cb-69bc2b832209'
TENANT_ID = '00000000-0000-0000-0000-000000000001'
ADMIN_EMAIL = 'admin@prospecai.com'
ADMIN_HASH = '$2b$12$qr3hqVrfnETJMhNAwiEWFOfpp8jPHMVgiEvMtBzlbTmvOxSRe0Nfy'

with eng.begin() as conn:
    # Create roles
    conn.execute(text("INSERT INTO roles (name) VALUES ('admin') ON CONFLICT (name) DO NOTHING;"))
    conn.execute(text("INSERT INTO roles (name) VALUES ('superadmin') ON CONFLICT (name) DO NOTHING;"))
    conn.execute(text("INSERT INTO roles (name) VALUES ('developer') ON CONFLICT (name) DO NOTHING;"))

    # Create admin user if missing
    conn.execute(text(
        """
        INSERT INTO users (id, tenant_id, email, username, password_hash, first_name, last_name, email_verified, is_active, created_at, updated_at)
        SELECT :id, :tenant_id, :email, :username, :password_hash, :first_name, :last_name, true, true, now(), now()
        WHERE NOT EXISTS (SELECT 1 FROM users WHERE tenant_id = :tenant_id AND email = :email)
        """
    ), {
        'id': ADMIN_ID,
        'tenant_id': TENANT_ID,
        'email': ADMIN_EMAIL,
        'username': 'admin',
        'password_hash': ADMIN_HASH,
        'first_name': 'System',
        'last_name': 'Administrator'
    })

    # Assign roles
    conn.execute(text(
        """
        INSERT INTO user_roles (id, user_id, role_id, role_name, assigned_at)
        SELECT gen_random_uuid(), u.id, 'admin', 'admin', now() FROM users u
        WHERE u.email = :email AND u.tenant_id = :tenant_id
        AND NOT EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = u.id AND ur.role_id = 'admin')
        """
    ), {'email': ADMIN_EMAIL, 'tenant_id': TENANT_ID})

    conn.execute(text(
        """
        INSERT INTO user_roles (id, user_id, role_id, role_name, assigned_at)
        SELECT gen_random_uuid(), u.id, 'superadmin', 'superadmin', now() FROM users u
        WHERE u.email = :email AND u.tenant_id = :tenant_id
        AND NOT EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = u.id AND ur.role_id = 'superadmin')
        """
    ), {'email': ADMIN_EMAIL, 'tenant_id': TENANT_ID})

    print('admin upserted')
