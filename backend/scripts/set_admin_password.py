import os
from sqlalchemy import create_engine, text

def main():
    url = os.environ.get('DATABASE_URL')
    if not url:
        print('DATABASE_URL not set')
        return 1
    sync_url = url.replace('+asyncpg','')
    print('Connecting to', sync_url)
    engine = create_engine(sync_url)
    # Password hash for plaintext 'Admin@123'
    pwd = '$2b$12$LRulWbk7Ol7LHQwVn.8MqOFtpjtRcgZk3Qbsxa7l9q.nv9nv0QR1K'
    email = 'admin@prospecai.com'
    with engine.begin() as conn:
        conn.execute(text("UPDATE users SET password_hash = :pwd WHERE email = :email"), {'pwd': pwd, 'email': email})
        r = conn.execute(text("SELECT length(password_hash) as len, password_hash FROM users WHERE email = :email"), {'email': email})
        for row in r:
            print('len=', row.len)
            print('password_hash=', row.password_hash)
    return 0

if __name__ == '__main__':
    raise SystemExit(main())
