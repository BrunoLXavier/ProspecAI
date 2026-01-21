from sqlalchemy import create_engine, text
import os
DATABASE_URL = os.environ.get('DATABASE_URL')
if not DATABASE_URL:
    raise RuntimeError('DATABASE_URL not set')
eng = create_engine(DATABASE_URL.replace('+asyncpg', '') if '+asyncpg' in DATABASE_URL else DATABASE_URL)
with eng.begin() as conn:
    r = conn.execute(text("SELECT 1 FROM information_schema.columns WHERE table_name='login_attempts' AND column_name='timestamp'" )).fetchone()
    if r is None:
        conn.execute(text("ALTER TABLE login_attempts ADD COLUMN timestamp timestamptz DEFAULT now()"))
        conn.execute(text("UPDATE login_attempts SET timestamp = attempted_at WHERE attempted_at IS NOT NULL"))
        print('added timestamp column to login_attempts')
    else:
        print('timestamp column exists')
