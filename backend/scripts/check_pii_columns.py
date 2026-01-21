import os
import sqlalchemy as sa
from sqlalchemy import create_engine, text

url = os.environ.get('DATABASE_URL')
if not url:
    print('DATABASE_URL not set')
    raise SystemExit(1)
if '+asyncpg' in url:
    sync_url = url.replace('+asyncpg','')
else:
    sync_url = url
eng = create_engine(sync_url)
with eng.begin() as conn:
    r = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='pii_detections' ORDER BY ordinal_position"))
    cols = [row[0] for row in r]
    print(cols)
