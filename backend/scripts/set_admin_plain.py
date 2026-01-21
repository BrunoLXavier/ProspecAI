import os
import bcrypt
from sqlalchemy import create_engine, text

DATABASE_URL = os.environ.get('DATABASE_URL')
if not DATABASE_URL:
    raise RuntimeError('DATABASE_URL not set')
eng = create_engine(DATABASE_URL.replace('+asyncpg', '') if '+asyncpg' in DATABASE_URL else DATABASE_URL)
new_hash = bcrypt.hashpw(b'Admin@123', bcrypt.gensalt()).decode()
with eng.begin() as conn:
    conn.execute(text("UPDATE users SET password_hash = :h WHERE email = :e"), {'h': new_hash, 'e': 'admin@prospecai.com'})
    print('admin password updated')
