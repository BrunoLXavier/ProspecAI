import json
import urllib.request

BASE='http://127.0.0.1:8000'

def post(path, data):
    url = BASE + path
    req = urllib.request.Request(url, data=json.dumps(data).encode('utf-8'), headers={'Content-Type':'application/json'})
    resp = urllib.request.urlopen(req, timeout=10)
    return resp.getcode(), json.loads(resp.read().decode())

try:
    # Login
    status, body = post('/api/v1/auth/login', {'email':'autotest+19@example.com','password':'Aa1!aaaa'})
    print('LOGIN', status)
    print(json.dumps(body, indent=2))
    access = body.get('access_token')
    refresh = body.get('refresh_token')

    # Call protected /me with access token
    req = urllib.request.Request(BASE + '/api/v1/auth/me', headers={'Authorization': f'Bearer {access}'})
    resp = urllib.request.urlopen(req, timeout=10)
    print('ME', resp.getcode(), resp.read().decode())

    # Refresh
    status, body = post('/api/v1/auth/refresh', {'refresh_token': refresh})
    print('REFRESH', status)
    print(json.dumps(body, indent=2))
    new_access = body.get('access_token')

    # Call protected /me with refreshed access token
    req = urllib.request.Request(BASE + '/api/v1/auth/me', headers={'Authorization': f'Bearer {new_access}'})
    resp = urllib.request.urlopen(req, timeout=10)
    print('ME_AFTER_REFRESH', resp.getcode(), resp.read().decode())

except Exception as e:
    print('ERROR', e)
