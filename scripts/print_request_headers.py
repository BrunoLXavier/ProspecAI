#!/usr/bin/env python3
"""
Prepare a urllib Request like `auth_check.py` and print headers that would be sent.
Also perform the request and print response status/body.
"""
import json
from urllib import request

LOGIN_URL = 'http://localhost:8000/api/v1/auth/login'
PAYLOAD = json.dumps({"email":"admin@prospecai.com","password":"admin"}).encode('utf-8')

req = request.Request(LOGIN_URL, data=PAYLOAD, headers={'Content-Type':'application/json'})
print('Prepared request headers:')
for k, v in req.header_items():
    print(f'{k}: {v}')

try:
    with request.urlopen(req, timeout=10) as resp:
        print('\nResponse status:', resp.status)
        body = resp.read().decode('utf-8')
        print('Response body:', body)
except Exception as e:
    print('\nRequest error:', e)
