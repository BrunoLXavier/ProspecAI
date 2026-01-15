import requests

LOGIN_URL = 'http://localhost:8000/api/v1/auth/login'
REFRESH_URL = 'http://localhost:8000/api/v1/auth/refresh'
creds = {'email':'admin@prospecai.com','password':'Admin@123'}

r = requests.post(LOGIN_URL, json=creds)
print('LOGIN STATUS', r.status_code)
print(r.text)

if r.status_code == 200:
    data = r.json()
    rt = data.get('refresh_token')
    print('REFRESH TOKEN LEN', len(rt) if rt else 'MISSING')
    s = requests.post(REFRESH_URL, json={'refresh_token': rt})
    print('REFRESH STATUS', s.status_code)
    print(s.text)
else:
    print('Login failed; cannot test refresh')
