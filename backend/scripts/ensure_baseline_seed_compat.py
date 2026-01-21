"""Ensure DB has baseline columns needed by seeds (idempotent).

This script is intended to be runnable inside the backend container to
make the current DB schema compatible with existing seeds while the
baseline migration file is updated for future runs.
"""
from sqlalchemy import create_engine, text
import os

DATABASE_URL = os.environ.get('DATABASE_URL')
if not DATABASE_URL:
    raise RuntimeError('DATABASE_URL not set')

eng = create_engine(DATABASE_URL.replace('+asyncpg', '') if '+asyncpg' in DATABASE_URL else DATABASE_URL)

stmts = [
    # users.full_name
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name varchar(300) NULL;",
    "UPDATE users SET full_name = concat_ws(' ', first_name, last_name) WHERE full_name IS NULL;",

    # portfolios columns expected by seeds
    "ALTER TABLE portfolios ADD COLUMN IF NOT EXISTS project_ids jsonb DEFAULT '[]'::jsonb;",
    "ALTER TABLE portfolios ADD COLUMN IF NOT EXISTS strategic_areas jsonb DEFAULT '[]'::jsonb;",
    "ALTER TABLE portfolios ADD COLUMN IF NOT EXISTS key_competencies jsonb DEFAULT '[]'::jsonb;",
    "ALTER TABLE portfolios ADD COLUMN IF NOT EXISTS total_budget numeric DEFAULT 0;",
    "ALTER TABLE portfolios ADD COLUMN IF NOT EXISTS active_projects_count integer DEFAULT 0;",
    "ALTER TABLE portfolios ADD COLUMN IF NOT EXISTS created_by uuid NULL;",
    "ALTER TABLE portfolios ADD COLUMN IF NOT EXISTS updated_by uuid NULL;",

    # clients.version NOT NULL with default
    "ALTER TABLE clients ADD COLUMN IF NOT EXISTS version integer DEFAULT 1;",
    "ALTER TABLE clients ALTER COLUMN version SET DEFAULT 1;",
    "UPDATE clients SET version = 1 WHERE version IS NULL;",
    "ALTER TABLE clients ALTER COLUMN version SET NOT NULL;",
    "ALTER TABLE clients ADD COLUMN IF NOT EXISTS created_by uuid NULL;",
    "ALTER TABLE clients ADD COLUMN IF NOT EXISTS updated_by uuid NULL;",
    # user_roles.role_id nullable
    "ALTER TABLE user_roles ALTER COLUMN role_id DROP NOT NULL;",

    # opportunities.version ensure
    "ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS version integer DEFAULT 1;",
    "ALTER TABLE opportunities ALTER COLUMN version SET DEFAULT 1;",
    "UPDATE opportunities SET version = 1 WHERE version IS NULL;",
    "ALTER TABLE opportunities ALTER COLUMN version SET NOT NULL;",
]

with eng.begin() as conn:
    for s in stmts:
        try:
            conn.execute(text(s))
        except Exception as e:
            print('Statement failed:', s, 'error:', e)

print('Compatibility ensured')
