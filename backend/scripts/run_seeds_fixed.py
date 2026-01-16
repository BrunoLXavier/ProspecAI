from __future__ import annotations

"""Run alembic seed helpers from Docker/CI.

Usage:
  python scripts/run_seeds_fixed.py --tenants <comma-separated-tenant-ids>
"""

import argparse
import os
from sqlalchemy import create_engine


def run(tenant_ids, modules=None):
    DATABASE_URL = os.getenv("DATABASE_URL")
    if not DATABASE_URL:
        raise RuntimeError("DATABASE_URL is not set")

    eng = create_engine(DATABASE_URL.replace('+asyncpg', '')) if '+asyncpg' in DATABASE_URL else create_engine(DATABASE_URL)
    with eng.begin() as conn:
        modnames = modules or [
            'alembic.seeds.users',
            'alembic.seeds.funding',
            'alembic.seeds.report_templates',
            'alembic.seeds.llm_configs',
            'alembic.seeds.pii_detections',
            'alembic.seeds.clients_ops_notifications',
        ]
        for mn in modnames:
            tried = []
            mod = None
            # Try module name as-is, and with a 'backend.' prefix for environments
            for candidate in (mn, f"backend.{mn}"):
                try:
                    mod = __import__(candidate, fromlist=['seed_for_tenants'])
                    break
                except Exception as e:
                    tried.append((candidate, str(e)))
            if mod is None:
                # Last-resort: try loading directly from filesystem path (/app/alembic/seeds/...)
                path_parts = mn.split('.')
                # expect pattern like 'alembic.seeds.users'
                if len(path_parts) >= 3:
                    filename = path_parts[-1] + '.py'
                    file_path = os.path.join('/app', *path_parts[:-1], filename)
                    if os.path.exists(file_path):
                        try:
                            import importlib.util
                            spec = importlib.util.spec_from_file_location(mn, file_path)
                            mod = importlib.util.module_from_spec(spec)
                            spec.loader.exec_module(mod)
                        except Exception as e:
                            print(f"Failed to load {file_path}: {e}")
                    else:
                        print(f"Module {mn} not found and file {file_path} does not exist; attempts: {tried}")
                if mod is None:
                    print(f"Failed to import {mn}; attempts: {tried}")
                    continue
            if hasattr(mod, 'seed_for_tenants'):
                print(f"Seeding {mn} for tenants: {tenant_ids}")
                try:
                    mod.seed_for_tenants(conn, tenant_ids)
                except Exception as e:
                    print(f"Error seeding {mn}: {e}")
            else:
                print(f"Module {mn} has no seed_for_tenants; skipping")


def parse_args():
    p = argparse.ArgumentParser()
    p.add_argument('--tenants', help='Comma-separated tenant UUIDs')
    p.add_argument('--modules', help='Comma-separated module names to run (optional)')
    return p.parse_args()


def main():
    args = parse_args()
    tenants = []
    if args.tenants:
        tenants = [t.strip() for t in args.tenants.split(',') if t.strip()]
    elif os.getenv('SEED_TENANT_IDS'):
        tenants = [t.strip() for t in os.getenv('SEED_TENANT_IDS').split(',') if t.strip()]
    else:
        raise RuntimeError('No tenants provided via --tenants or SEED_TENANT_IDS env var')

    modules = None
    if args.modules:
        modules = [m.strip() for m in args.modules.split(',') if m.strip()]

    run(tenants, modules)


if __name__ == '__main__':
    main()
