#!/usr/bin/env python3
import json
from urllib import request

LOGIN_URL = 'http://localhost:8000/api/v1/auth/login'
PAYLOAD = json.dumps({"email":"admin@prospecai.com","password":"admin"}).encode('utf-8')
headers = {
    'Content-Type': 'application/json',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36',
    'Referer': 'http://localhost:3000/'
}
req = request.Request(LOGIN_URL, data=PAYLOAD, headers=headers)
print('Prepared request headers:')
for k, v in req.header_items():
    print(f'{k}: {v}')

try:
    with request.urlopen(req, timeout=10) as resp:
        print('\nResponse status:', resp.status)
        body = resp.read().decode('utf-8')
        print('Response body:', body)
except Exception as e:
    try:
        res = e.fp.read().decode('utf-8')
        print('\nError response body:', res)
    except Exception:
        print('\nRequest error:', e)
