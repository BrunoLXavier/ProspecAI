import json
import sys
from pathlib import Path

if len(sys.argv) < 2:
    print('Usage: validate_json.py <path-to-json>')
    sys.exit(2)

p = Path(sys.argv[1])
if not p.exists():
    print('ERROR: file not found', p)
    sys.exit(1)

try:
    with p.open('r', encoding='utf-8') as f:
        json.load(f)
    print('OK: JSON valid')
except Exception as e:
    print('ERROR:', e)
    sys.exit(1)
