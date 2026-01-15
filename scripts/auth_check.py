#!/usr/bin/env python3
"""
Simple auth check script: POST /api/v1/auth/login and GET /api/v1/auth/me using standard library.
Saves access token to token.txt in repo root.
"""
import os
import sys
import json
from urllib import request, parse

API_BASE = os.environ.get('API_BASE', 'http://localhost:8000')
EMAIL = os.environ.get('AUTH_EMAIL', 'admin@prospecai.com')
PASSWORD = os.environ.get('AUTH_PASSWORD', 'Admin@123')

login_url = f"{API_BASE}/api/v1/auth/login"
me_url = f"{API_BASE}/api/v1/auth/me"

payload = json.dumps({"email": EMAIL, "password": PASSWORD}).encode('utf-8')

req = request.Request(login_url, data=payload, headers={'Content-Type':'application/json'})
try:
    with request.urlopen(req, timeout=10) as resp:
        body = resp.read().decode('utf-8')
        print('LOGIN RESPONSE:', body)
        data = json.loads(body)
        token = data.get('access_token')
        if not token:
            print('No access_token in login response', file=sys.stderr)
            sys.exit(2)
        # save token
        with open('token.txt', 'w', encoding='utf-8') as f:
            f.write(token)
        print('\nSaved access token to token.txt')
except Exception as e:
    print('Login error:', e, file=sys.stderr)
    sys.exit(1)

# call /me
req2 = request.Request(me_url, headers={'Authorization': f'Bearer {token}'})
try:
    with request.urlopen(req2, timeout=10) as resp:
        body = resp.read().decode('utf-8')
        print('\nME RESPONSE:', body)
except Exception as e:
    print('GET /me error:', e, file=sys.stderr)
    sys.exit(1)
