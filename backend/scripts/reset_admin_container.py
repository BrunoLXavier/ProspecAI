import os
from sqlalchemy import create_engine, text
import bcrypt

def main():
    url = os.environ.get('DATABASE_URL')
    if not url:
        print('DATABASE_URL not set')
        return 1
    sync_url = url.replace('+asyncpg','')
    engine = create_engine(sync_url)
    new_hash = bcrypt.hashpw(b'Admin@123', bcrypt.gensalt()).decode()
    print('Generated hash:', new_hash)
    with engine.begin() as conn:
        conn.execute(text('UPDATE users SET password_hash = :h WHERE email = :email'), {'h': new_hash, 'email': 'admin@prospecai.com'})
        r = conn.execute(text("SELECT id, email, length(password_hash) as len FROM users WHERE email = :email"), {'email': 'admin@prospecai.com'})
        for row in r:
            print(row)
    return 0

if __name__ == '__main__':
    raise SystemExit(main())
