from sqlalchemy import create_engine, text
import os
DATABASE_URL = os.environ.get('DATABASE_URL')
if not DATABASE_URL:
    raise RuntimeError('DATABASE_URL not set')
eng = create_engine(DATABASE_URL.replace('+asyncpg', '') if '+asyncpg' in DATABASE_URL else DATABASE_URL)
with eng.begin() as conn:
    for row in conn.execute(text('SELECT id, name FROM tenants LIMIT 10')).fetchall():
        print(row)
