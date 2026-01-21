import subprocess
import requests

# get token from gen_token.py
proc = subprocess.run(["python", "scripts/gen_token.py"], capture_output=True, text=True)
if proc.returncode != 0:
    print('FAILED to generate token:', proc.stderr)
    raise SystemExit(1)
TOKEN = proc.stdout.strip()
headers = {"Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json"}

endpoints = [
    "/api/v1/llm-config",
    "/api/v1/admin/llm-config",
    "/api/v1/calendar/events",
    "/api/v1/ingestion/jobs",
    "/api/v1/analytics/overview?period=month",
    "/api/v1/funding/",
    "/api/v1/crm/clients",
    "/api/v1/feedback/statistics",
    "/api/v1/feedback/",
    "/api/v1/lgpd/detections/statistics",
    "/api/v1/lgpd/detections?status=pending_review",
]

base = "http://127.0.0.1:8000"

for p in endpoints:
    url = base + p
    print('\n===', p, '===')
    try:
        r = requests.get(url, headers=headers, timeout=10)
        print('STATUS', r.status_code)
        ct = r.headers.get('content-type','')
        if 'application/json' in ct:
            try:
                js = r.json()
                print('BODY (truncated):', str(js)[:1000])
            except Exception as e:
                print('JSON parse error:', e)
        else:
            print('BODY (text):', r.text[:500])
    except Exception as e:
        print('ERROR', repr(e))
