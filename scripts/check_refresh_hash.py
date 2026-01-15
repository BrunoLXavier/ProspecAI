"""
Check stored refresh token hash vs computed SHA-256 hash.

Usage (inside backend container):
  python scripts/check_refresh_hash.py --token <REFRESH_TOKEN>

It will compute the SHA-256 hex digest of the provided token using
the same function as `RefreshToken.hash_token` and then query the
database for a matching `token_hash` in the `refresh_tokens` table.

Requires environment/config used by the app (DB URL). Run inside
the backend container where env is configured.
"""
import argparse
import asyncio
import hashlib
import os
import json
import sys

from adapters.database.connection import AsyncSessionLocal
from adapters.repositories.refresh_token_repository import RefreshTokenRepository
from domain.entities.refresh_token import RefreshToken


def compute_hash(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


async def run(token: str):
    token_hash = compute_hash(token)
    print(f"Computed hash: {token_hash}")

    async with AsyncSessionLocal() as session:
        repo = RefreshTokenRepository(session)
        stored = await repo.get_by_token(token_hash)
        if not stored:
            print("No token row found for that hash.")
            # Optionally show latest token rows for the user if present
            return 2

        # Print details
        out = {
            "id": str(stored.id),
            "user_id": str(stored.user_id),
            "token_type": stored.token_type.value if hasattr(stored.token_type, 'value') else str(stored.token_type),
            "used": stored.used,
            "expires_at": stored.expires_at.isoformat() if stored.expires_at else None,
            "created_at": stored.created_at.isoformat() if stored.created_at else None,
            "created_by_ip": stored.created_by_ip,
            "token_hash": stored.token_hash
        }
        print(json.dumps(out, indent=2))
        if stored.token_hash == token_hash:
            print("MATCH: computed hash equals stored token_hash")
            return 0
        else:
            print("MISMATCH: computed hash DOES NOT equal stored token_hash")
            return 3


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--token", required=True, help="Refresh token string")
    args = parser.parse_args()

    code = asyncio.run(run(args.token))
    sys.exit(code)


if __name__ == '__main__':
    main()
