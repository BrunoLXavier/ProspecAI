"""Create test users per tenant and emit .env entries.
"""
from __future__ import annotations

import argparse
import asyncio
import secrets
from uuid import uuid4
import os

from adapters.database.connection import get_db_context
from adapters.database import models as db_models
from domain.entities.user import User as DomainUser


async def create_users_for_tenant(tenant_id: str):
    passwords = {"admin": secrets.token_urlsafe(10), "dev": secrets.token_urlsafe(10), "e2e": secrets.token_urlsafe(10)}
    created = []
    async with get_db_context() as session:
        for role in ["admin", "dev", "e2e"]:
            email = f"{role}+{tenant_id.split('-')[0]}@example.test"
            username = f"{tenant_id.split('-')[0]}_{role}"
            pw = passwords[role]
            pw_hash = DomainUser.hash_password(pw)
            user = db_models.UserModel(id=uuid4(), tenant_id=tenant_id, email=email, username=username, password_hash=pw_hash, is_active=True, email_verified=True)
            session.add(user)
            created.append({"email": email, "username": username, "password": pw})
    return created


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--tenants", required=True)
    parser.add_argument("--out", help="Output file to write env lines")
    args = parser.parse_args()
    tenants = [t.strip() for t in args.tenants.split(',') if t.strip()]
    results = []
    for t in tenants:
        created = asyncio.run(create_users_for_tenant(t))
        for i, c in enumerate(created, start=1):
            key_prefix = f"TEST_T{tenants.index(t)+1}_{i}"
            results.append(f"{key_prefix}_EMAIL={c['email']}")
            results.append(f"{key_prefix}_PASSWORD={c['password']}")
    if args.out:
        with open(args.out, 'w', encoding='utf-8') as fh:
            fh.write('\n'.join(results))
        print(f"Wrote {len(results)} entries to {args.out}")
    else:
        for r in results:
            print(r)


if __name__ == '__main__':
    main()
"""
Create test users for one or more tenants.

Usage examples:
  python -m backend.scripts.create_test_users --tenants 00000000-0000-0000-0000-000000000001 --mode create --out .env.test

This script connects to the application's test DB using the same DB
configuration (reads DATABASE_URL from env via adapters.database.connection).
It supports `create`, `rotate`, and `cleanup` modes.

Notes:
- Passwords are generated securely and hashed using the domain `User.hash_password`.
- PII is pseudonymized and output passwords are printed only to stdout / .env.test.
"""
from __future__ import annotations

import asyncio
import argparse
import secrets
import os
from uuid import uuid4
from typing import List

from backend.adapters.database.connection import get_db_context
from backend.adapters.database import models as db_models
from backend.domain.entities.user import User as DomainUser


DEFAULT_ROLES = {
    "admin": "admin",
    "dev": "developer",
    "e2e": "e2e",
}


async def create_users_for_tenant(tenant_id: str) -> List[dict]:
    """Create three test users for a tenant and return list of credential dicts.

    Each dict: {email, username, password, user_id}
    """
    created = []
    # passwords generated and stored only here; only hashes saved to DB
    passwords = {
        "admin": secrets.token_urlsafe(10),
        "dev": secrets.token_urlsafe(10),
        "e2e": secrets.token_urlsafe(10),
    }

    async with get_db_context() as session:
        for role_key, role_name in DEFAULT_ROLES.items():
            uid = uuid4()
            email = f"{role_key}+{tenant_id.split('-')[0]}@example.test"
            username = f"{tenant_id.split('-')[0]}_{role_key}"
            plain_pw = passwords[role_key]
            pw_hash = DomainUser.hash_password(plain_pw)

            user = db_models.UserModel(
                id=uid,
                tenant_id=tenant_id,
                email=email,
                username=username,
                password_hash=pw_hash,
                first_name=role_key.capitalize(),
                last_name=f"Tenant{tenant_id.split('-')[0]}",
                is_active=True,
                email_verified=True,
            )

            # Upsert - check existence by tenant+email
            exists_q = await session.execute(
                db_models.UserModel.__table__.select().where(
                    (db_models.UserModel.tenant_id == tenant_id) & (db_models.UserModel.email == email)
                )
            )
            row = exists_q.first()
            if row:
                # update password_hash (rotate) and ensure active
                await session.execute(
                    db_models.UserModel.__table__.update()
                    .where((db_models.UserModel.tenant_id == tenant_id) & (db_models.UserModel.email == email))
                    .values(password_hash=pw_hash, is_active=True)
                )
                created.append({"email": email, "username": username, "password": plain_pw, "user_id": str(row.id)})
            else:
                session.add(user)
                # assign role
                role_assoc = db_models.UserRoleModel(
                    id=uuid4(), user_id=uid, role_id=role_name, tenant_id=tenant_id
                )
                session.add(role_assoc)
                created.append({"email": email, "username": username, "password": plain_pw, "user_id": str(uid)})

        # commit happens in context manager
    return created


async def cleanup_users_for_tenant(tenant_id: str) -> int:
    """Soft-delete seeded users for a tenant. Returns number of users marked deleted."""
    count = 0
    async with get_db_context() as session:
        q = db_models.UserModel.__table__.update().where(
            db_models.UserModel.tenant_id == tenant_id
        ).values(deleted_at="now()", is_active=False)
        res = await session.execute(q)
        # SQLAlchemy async returns rowcount on .rowcount attribute
        try:
            count = res.rowcount
        except Exception:
            count = 0
    return count


async def main(args: argparse.Namespace):
    tenants = [t.strip() for t in args.tenants.split(",") if t.strip()]
    out_lines = []

    for idx, tenant in enumerate(tenants, start=1):
        if args.mode == "create" or args.mode == "rotate":
            created = await create_users_for_tenant(tenant)
            for i, c in enumerate(created, start=1):
                key_prefix = f"TEST_T{idx}_{i}"
                out_lines.append(f"{key_prefix}_EMAIL={c['email']}")
                out_lines.append(f"{key_prefix}_USERNAME={c['username']}")
                out_lines.append(f"{key_prefix}_PASSWORD={c['password']}")

        elif args.mode == "cleanup":
            num = await cleanup_users_for_tenant(tenant)
            out_lines.append(f"CLEANED_{tenant}={num}")

    if args.out:
        with open(args.out, "w", encoding="utf-8") as fh:
            for line in out_lines:
                fh.write(line + "\n")
        print(f"Wrote {len(out_lines)} entries to {args.out}")
    else:
        for line in out_lines:
            # print shell-friendly exports (POSIX)
            print(f"export {line}")


def build_arg_parser() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Create test users for tenants and emit env variables")
    p.add_argument("--tenants", required=True, help="Comma-separated tenant UUIDs")
    p.add_argument("--mode", choices=["create", "rotate", "cleanup"], default="create")
    p.add_argument("--out", required=False, help="Output file path for env lines (e.g. .env.test)")
    return p


if __name__ == "__main__":
    parser = build_arg_parser()
    parsed = parser.parse_args()
    asyncio.run(main(parsed))
