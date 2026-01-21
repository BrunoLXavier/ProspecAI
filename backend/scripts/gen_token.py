import os
import jwt
import datetime

ADMIN_ID = 'ba4f4bf9-2daf-4be4-81cb-69bc2b832209'
ADMIN_EMAIL = 'admin@prospecai.com'
TENANT_ID = '00000000-0000-0000-0000-000000000001'

secret = os.environ.get('JWT_SECRET_KEY', 'dev-secret-key-change-in-production')
now = datetime.datetime.utcnow()
payload = {
    'sub': ADMIN_ID,
    'email': ADMIN_EMAIL,
    'tenant_id': TENANT_ID,
    'roles': ['admin'],
    'email_verified': True,
    'iat': int(now.timestamp()),
    'exp': int((now + datetime.timedelta(hours=1)).timestamp()),
    'type': 'access',
    'iss': 'prospecai'
}

print(jwt.encode(payload, secret, algorithm='HS256'))
