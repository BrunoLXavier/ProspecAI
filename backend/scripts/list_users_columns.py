from sqlalchemy import create_engine, text
import os
DATABASE_URL = os.environ.get('DATABASE_URL')
if not DATABASE_URL:
    raise RuntimeError('DATABASE_URL not set')
eng = create_engine(DATABASE_URL.replace('+asyncpg', '') if '+asyncpg' in DATABASE_URL else DATABASE_URL)
with eng.begin() as conn:
    rows = conn.execute(text("SELECT column_name, data_type FROM information_schema.columns WHERE table_name='users' ORDER BY ordinal_position")).fetchall()
    for r in rows:
        print(r[0], r[1])
