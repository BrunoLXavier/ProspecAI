#!/bin/bash
# Initialize ProspecAI databases

set -e

echo "[*] Creating ProspecAI database..."
createdb -U postgres prospecia20_db || true

echo "[*] ProspecAI database initialization complete"
