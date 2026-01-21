from sqlalchemy import create_engine, text
import os
DATABASE_URL = os.environ.get('DATABASE_URL')
if not DATABASE_URL:
    raise RuntimeError('DATABASE_URL not set')
eng = create_engine(DATABASE_URL.replace('+asyncpg', '') if '+asyncpg' in DATABASE_URL else DATABASE_URL)
with eng.begin() as conn:
    cols = [
        ("email_config", "'{}'::jsonb"),
        ("security_config", "'{}'::jsonb"),
        ("contact_form_config", "'{}'::jsonb"),
        ("email_templates", "'{}'::jsonb"),
    ]
    for name, default in cols:
        r = conn.execute(text("SELECT 1 FROM information_schema.columns WHERE table_name='system_config' AND column_name=:c"), {'c': name}).fetchone()
        if r is None:
            conn.execute(text(f"ALTER TABLE system_config ADD COLUMN {name} jsonb DEFAULT {default}"))
            print(f"Added column {name}")
        else:
            print(f"Column {name} already exists")
    # Touch a row to ensure repository can select
    # If no rows exist insert a default one for global config
    r = conn.execute(text("SELECT 1 FROM system_config LIMIT 1")).fetchone()
    if r is None:
        conn.execute(text("INSERT INTO system_config (id, tenant_id, config_key, config_value, created_at, updated_at) VALUES (gen_random_uuid(), NULL, 'email_config', '{}'::jsonb, now(), now())"))
        print('Inserted placeholder system_config row')
    else:
        print('system_config rows exist')
