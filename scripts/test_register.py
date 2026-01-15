import json
import urllib.request

url='http://localhost:8000/api/v1/auth/register'
data=json.dumps({"email":"autotest+10@example.com","username":"autotest10","password":"Aa1!aaaa","full_name":"Auto Test"}).encode('utf-8')
req=urllib.request.Request(url,data=data,headers={'Content-Type':'application/json'})
try:
    resp=urllib.request.urlopen(req,timeout=10)
    print('STATUS',resp.status)
    print(resp.read().decode())
except Exception as e:
    print('ERROR',e)
