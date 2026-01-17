#!/usr/bin/env python3
"""
Simple non-interactive login tester.
Runs inside a container and posts JSON to the backend auth login endpoint.
"""
import json
import sys
import urllib.request
import urllib.error


def main():
    url = "http://backend:8000/api/v1/auth/login"
    payload = {"email": "admin@prospecai.com", "password": "Admin@123"}
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            body = resp.read().decode("utf-8")
            print(body)
            print("HTTPSTATUS:", resp.getcode())
            return 0
    except urllib.error.HTTPError as e:
        try:
            body = e.read().decode("utf-8")
        except Exception:
            body = ""
        print(body)
        print("HTTPSTATUS:", e.code)
        return 1
    except Exception as e:
        print("ERROR:", str(e))
        return 2


if __name__ == "__main__":
    sys.exit(main())
