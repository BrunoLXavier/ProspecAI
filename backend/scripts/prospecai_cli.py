#!/usr/bin/env python3
"""ProspecAI CLI - Unified utility commands for development and CI.

Usage:
    python scripts/prospecai_cli.py <command> [options]

Commands:
    token           Generate JWT token for admin user
    check           Check API endpoints health
    verify-seeds    Verify seed data presence
    create-users    Create/rotate test users
    
Examples:
    python scripts/prospecai_cli.py token
    python scripts/prospecai_cli.py check --base-url http://localhost:8000
    python scripts/prospecai_cli.py verify-seeds --tenants 00000000-0000-0000-0000-000000000001
    python scripts/prospecai_cli.py create-users --tenants 00000000-0000-0000-0000-000000000001 --mode create
"""
from __future__ import annotations

import argparse
import asyncio
import datetime
import os
import secrets
import sys
from typing import List
from uuid import uuid4

# =============================================================================
# TOKEN GENERATION
# =============================================================================

ADMIN_ID = 'ba4f4bf9-2daf-4be4-81cb-69bc2b832209'
ADMIN_EMAIL = 'admin@prospecai.com'
DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000001'


def generate_token(
    user_id: str = ADMIN_ID,
    email: str = ADMIN_EMAIL,
    tenant_id: str = DEFAULT_TENANT_ID,
    roles: List[str] = None,
    expires_hours: int = 1
) -> str:
    """Generate a JWT token for API access."""
    try:
        import jwt
    except ImportError:
        print("Error: PyJWT not installed. Run: pip install PyJWT", file=sys.stderr)
        sys.exit(1)
    
    if roles is None:
        roles = ['admin']
    
    secret = os.environ.get('JWT_SECRET_KEY', 'dev-secret-key-change-in-production')
    now = datetime.datetime.utcnow()
    
    payload = {
        'sub': user_id,
        'email': email,
        'tenant_id': tenant_id,
        'roles': roles,
        'email_verified': True,
        'iat': int(now.timestamp()),
        'exp': int((now + datetime.timedelta(hours=expires_hours)).timestamp()),
        'type': 'access',
        'iss': 'prospecai'
    }
    
    return jwt.encode(payload, secret, algorithm='HS256')


def cmd_token(args: argparse.Namespace) -> int:
    """Generate and print JWT token."""
    token = generate_token(
        user_id=args.user_id or ADMIN_ID,
        email=args.email or ADMIN_EMAIL,
        tenant_id=args.tenant_id or DEFAULT_TENANT_ID,
        expires_hours=args.expires or 1
    )
    print(token)
    return 0


# =============================================================================
# ENDPOINT HEALTH CHECK
# =============================================================================

DEFAULT_ENDPOINTS = [
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


def cmd_check(args: argparse.Namespace) -> int:
    """Check API endpoints for health."""
    try:
        import requests
    except ImportError:
        print("Error: requests not installed. Run: pip install requests", file=sys.stderr)
        return 1
    
    # Generate token
    tenant_id = args.tenant_id or DEFAULT_TENANT_ID
    token = generate_token(tenant_id=tenant_id)
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "X-Tenant-ID": tenant_id
    }
    
    base_url = args.base_url.rstrip('/')
    endpoints = args.endpoints.split(',') if args.endpoints else DEFAULT_ENDPOINTS
    
    failed = 0
    for endpoint in endpoints:
        url = base_url + endpoint
        print(f'\n=== {endpoint} ===')
        try:
            r = requests.get(url, headers=headers, timeout=args.timeout)
            status = r.status_code
            print(f'STATUS: {status}')
            
            if status >= 400:
                failed += 1
                print(f'ERROR: {r.text[:500]}')
            elif 'application/json' in r.headers.get('content-type', ''):
                try:
                    js = r.json()
                    print(f'BODY (truncated): {str(js)[:500]}')
                except Exception as e:
                    print(f'JSON parse error: {e}')
            else:
                print(f'BODY (text): {r.text[:300]}')
        except Exception as e:
            failed += 1
            print(f'ERROR: {repr(e)}')
    
    print(f'\n=== Summary: {len(endpoints) - failed}/{len(endpoints)} endpoints OK ===')
    return 1 if failed > 0 else 0


# =============================================================================
# SEED VERIFICATION
# =============================================================================

REQUIRED_TABLES = ["users", "funding_sources", "institutes"]
OPTIONAL_TABLES = [
    "clients", "opportunities", "llm_configs", "pii_detections",
    "report_templates", "teams", "infrastructures", "portfolio_projects",
    "communication_threads", "feedbacks"
]


def cmd_verify_seeds(args: argparse.Namespace) -> int:
    """Verify seed data is present in database."""
    from sqlalchemy import create_engine, text, bindparam
    
    # Make text and bindparam available to helper functions
    global _sql_text, _sql_bindparam
    _sql_text = text
    _sql_bindparam = bindparam
    
    tenants = _get_tenants(args.tenants)
    
    DATABASE_URL = os.getenv("DATABASE_URL")
    if not DATABASE_URL:
        print("DATABASE_URL is not set", file=sys.stderr)
        return 2
    
    engine_url = DATABASE_URL.replace("+asyncpg", "") if "+asyncpg" in DATABASE_URL else DATABASE_URL
    eng = create_engine(engine_url)
    
    failed = False
    with eng.connect() as conn:
        print(f"Verifying seeds for tenants: {tenants}")
        
        # Check required tables
        for table in REQUIRED_TABLES:
            if not _table_exists(conn, table):
                print(f"[ERROR] Required table missing: {table}")
                failed = True
                continue
            
            cnt = _count_rows(conn, table, tenants)
            print(f"[OK] Table {table} exists; rows for tenants: {cnt}")
            
            if cnt <= 0:
                print(f"[ERROR] Required data missing in {table}")
                failed = True
        
        # Check optional tables
        for table in OPTIONAL_TABLES:
            if not _table_exists(conn, table):
                print(f"[WARN] Optional table not present: {table}")
                continue
            
            cnt = _count_rows(conn, table, tenants)
            print(f"[OK] Optional table {table} rows: {cnt}")
    
    if failed:
        print("\nSeed verification FAILED", file=sys.stderr)
        return 3
    
    print("\nSeed verification PASSED")
    return 0


def _table_exists(conn, table_name: str) -> bool:
    q = _sql_text("SELECT 1 FROM information_schema.tables WHERE table_name = :t LIMIT 1")
    r = conn.execute(q, {"t": table_name})
    return r.first() is not None


def _column_exists(conn, table_name: str, column_name: str) -> bool:
    q = _sql_text("SELECT 1 FROM information_schema.columns WHERE table_name = :t AND column_name = :c LIMIT 1")
    r = conn.execute(q, {"t": table_name, "c": column_name})
    return r.first() is not None


def _count_rows(conn, table_name: str, tenants: List[str]) -> int:
    has_tenant = _column_exists(conn, table_name, "tenant_id")
    if has_tenant and tenants:
        q = _sql_text(f"SELECT count(1) FROM {table_name} WHERE tenant_id IN :t").bindparams(
            _sql_bindparam("t", expanding=True)
        )
        r = conn.execute(q, {"t": tenants})
    else:
        q = _sql_text(f"SELECT count(1) FROM {table_name}")
        r = conn.execute(q)
    row = r.first()
    return int(row[0]) if row else 0


def _get_tenants(tenants_arg: str) -> List[str]:
    if tenants_arg:
        return [t.strip() for t in tenants_arg.split(",") if t.strip()]
    env = os.getenv("SEED_TENANT_IDS")
    if env:
        return [t.strip() for t in env.split(",") if t.strip()]
    return [DEFAULT_TENANT_ID]


# =============================================================================
# TEST USER CREATION
# =============================================================================

DEFAULT_ROLES = {"admin": "admin", "dev": "developer", "e2e": "e2e"}


async def _create_users_for_tenant(tenant_id: str) -> List[dict]:
    """Create test users for a tenant."""
    # Import here to avoid loading DB at CLI parse time
    from adapters.database.connection import get_db_context
    from adapters.database import models as db_models
    from domain.entities.user import User as DomainUser
    
    created = []
    passwords = {role: secrets.token_urlsafe(10) for role in DEFAULT_ROLES}
    
    async with get_db_context() as session:
        for role_key, role_name in DEFAULT_ROLES.items():
            uid = uuid4()
            email = f"{role_key}+{tenant_id.split('-')[0]}@example.test"
            username = f"{tenant_id.split('-')[0]}_{role_key}"
            plain_pw = passwords[role_key]
            pw_hash = DomainUser.hash_password(plain_pw)
            
            # Check if user exists
            exists_q = await session.execute(
                db_models.UserModel.__table__.select().where(
                    (db_models.UserModel.tenant_id == tenant_id) & 
                    (db_models.UserModel.email == email)
                )
            )
            row = exists_q.first()
            
            if row:
                # Rotate password
                await session.execute(
                    db_models.UserModel.__table__.update()
                    .where((db_models.UserModel.tenant_id == tenant_id) & (db_models.UserModel.email == email))
                    .values(password_hash=pw_hash, is_active=True)
                )
                created.append({"email": email, "username": username, "password": plain_pw, "user_id": str(row.id)})
            else:
                # Create new user
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
                session.add(user)
                created.append({"email": email, "username": username, "password": plain_pw, "user_id": str(uid)})
    
    return created


async def _cleanup_users_for_tenant(tenant_id: str) -> int:
    """Soft-delete test users for a tenant."""
    from adapters.database.connection import get_db_context
    from adapters.database import models as db_models
    
    async with get_db_context() as session:
        q = db_models.UserModel.__table__.update().where(
            db_models.UserModel.tenant_id == tenant_id
        ).values(deleted_at="now()", is_active=False)
        res = await session.execute(q)
        return getattr(res, 'rowcount', 0)


def cmd_create_users(args: argparse.Namespace) -> int:
    """Create or rotate test users."""
    tenants = _get_tenants(args.tenants)
    out_lines = []
    
    for idx, tenant in enumerate(tenants, start=1):
        if args.mode in ("create", "rotate"):
            created = asyncio.run(_create_users_for_tenant(tenant))
            for i, c in enumerate(created, start=1):
                key_prefix = f"TEST_T{idx}_{i}"
                out_lines.append(f"{key_prefix}_EMAIL={c['email']}")
                out_lines.append(f"{key_prefix}_USERNAME={c['username']}")
                out_lines.append(f"{key_prefix}_PASSWORD={c['password']}")
        
        elif args.mode == "cleanup":
            num = asyncio.run(_cleanup_users_for_tenant(tenant))
            out_lines.append(f"CLEANED_{tenant}={num}")
    
    if args.out:
        with open(args.out, "w", encoding="utf-8") as fh:
            fh.write('\n'.join(out_lines) + '\n')
        print(f"Wrote {len(out_lines)} entries to {args.out}")
    else:
        for line in out_lines:
            print(f"export {line}")
    
    return 0


# =============================================================================
# CLI MAIN
# =============================================================================

def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="ProspecAI CLI - Unified utility commands",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__
    )
    subparsers = parser.add_subparsers(dest='command', help='Available commands')
    
    # Token command
    p_token = subparsers.add_parser('token', help='Generate JWT token')
    p_token.add_argument('--user-id', help=f'User ID (default: {ADMIN_ID})')
    p_token.add_argument('--email', help=f'Email (default: {ADMIN_EMAIL})')
    p_token.add_argument('--tenant-id', help=f'Tenant ID (default: {DEFAULT_TENANT_ID})')
    p_token.add_argument('--expires', type=int, default=1, help='Token expiry in hours (default: 1)')
    
    # Check command
    p_check = subparsers.add_parser('check', help='Check API endpoints health')
    p_check.add_argument('--base-url', default='http://127.0.0.1:8000', help='Base URL')
    p_check.add_argument('--endpoints', help='Comma-separated endpoints (default: common endpoints)')
    p_check.add_argument('--timeout', type=int, default=10, help='Request timeout in seconds')
    p_check.add_argument('--tenant-id', help=f'Tenant ID for X-Tenant-ID header (default: {DEFAULT_TENANT_ID})')
    
    # Verify seeds command
    p_verify = subparsers.add_parser('verify-seeds', help='Verify seed data presence')
    p_verify.add_argument('--tenants', help='Comma-separated tenant UUIDs')
    
    # Create users command
    p_users = subparsers.add_parser('create-users', help='Create/rotate test users')
    p_users.add_argument('--tenants', help='Comma-separated tenant UUIDs')
    p_users.add_argument('--mode', choices=['create', 'rotate', 'cleanup'], default='create')
    p_users.add_argument('--out', help='Output file for env variables')
    
    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        return 0
    
    commands = {
        'token': cmd_token,
        'check': cmd_check,
        'verify-seeds': cmd_verify_seeds,
        'create-users': cmd_create_users,
    }
    
    handler = commands.get(args.command)
    if handler:
        return handler(args)
    else:
        parser.print_help()
        return 1


if __name__ == '__main__':
    sys.exit(main())
