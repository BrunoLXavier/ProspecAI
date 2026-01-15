import json
import urllib.request

BASE='http://127.0.0.1:8000'

def post(path, data):
    url = BASE + path
    req = urllib.request.Request(url, data=json.dumps(data).encode('utf-8'), headers={'Content-Type':'application/json'})
    resp = urllib.request.urlopen(req, timeout=10)
    return resp.getcode(), json.loads(resp.read().decode())

if __name__ == '__main__':
    status, body = post('/api/v1/auth/login', {'email':'autotest+19@example.com','password':'Aa1!aaaa'})
    if status == 200:
        print(body.get('refresh_token'))
    else:
        print('ERROR', status, body)
