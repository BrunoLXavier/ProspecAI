import urllib.request, urllib.error, json, sys

def try_login():
    url = 'http://localhost:8000/api/v1/auth/login'
    payload = {'email': 'admin@prospecai.com', 'password': 'Admin@123'}
    data = json.dumps(payload).encode()
    req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            print('STATUS', resp.status)
            print(resp.read().decode())
    except urllib.error.HTTPError as e:
        print('HTTP', e.code)
        try:
            print(e.read().decode())
        except Exception as ex:
            print('No body:', ex)
    except Exception as e:
        print('ERROR', type(e).__name__, e)

if __name__ == '__main__':
    try_login()
