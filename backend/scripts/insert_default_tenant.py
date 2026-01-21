from sqlalchemy import create_engine, text
import os

DATABASE_URL = os.environ.get('DATABASE_URL')
if not DATABASE_URL:
    raise RuntimeError('DATABASE_URL not set')

eng = create_engine(DATABASE_URL.replace('+asyncpg', '') if '+asyncpg' in DATABASE_URL else DATABASE_URL)
with eng.begin() as conn:
    # Build a safe INSERT depending on which columns exist in the tenants table
    cols = ['id', 'name', 'slug']
    vals = ["'00000000-0000-0000-0000-000000000001'::uuid", "'Default Tenant'", "'default'"]

    # Find NOT NULL columns without defaults and provide sensible defaults by type
    rows = conn.execute(text("SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_name='tenants'")).fetchall()
    notnull_cols = []
    for r in rows:
        cn = r[0]
        dt = r[1]
        is_nullable = r[2]
        col_def = r[3]
        if cn in ('id', 'name', 'slug', 'created_at', 'updated_at'):
            continue
        if is_nullable == 'NO' and not col_def:
            notnull_cols.append((cn, dt))

    for cn, dt in notnull_cols:
        cols.append(cn)
        if dt in ('uuid'):
            vals.append('gen_random_uuid()')
        elif dt in ('boolean'):
            vals.append('false')
        elif dt.startswith('timestamp') or dt in ('timestamp without time zone','timestamp with time zone','timestamptz'):
            vals.append('now()')
        elif dt in ('integer','numeric','bigint','smallint','double precision'):
            vals.append('0')
        elif dt in ('json','jsonb'):
            vals.append("'{}'::jsonb")
        else:
            vals.append("'seed'")

    cols.extend(['created_at', 'updated_at'])
    vals.extend(['now()', 'now()'])

    sql = f"INSERT INTO tenants ({', '.join(cols)}) VALUES ({', '.join(vals)}) ON CONFLICT (id) DO NOTHING;"
    conn.execute(text(sql))
    print('tenant upserted with columns:', cols)
