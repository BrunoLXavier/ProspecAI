#!/usr/bin/env python3
"""Check Alembic migration files for a single head without requiring Alembic installed.

Scans `backend/alembic/baseline/versions` for `revision` and `down_revision` values
and computes the DAG heads. Exits 0 when single head, 1 when multiple heads, 2 if none.
"""
import os
import re
import sys


def parse_migration_file(path):
    rev = None
    down = None
    with open(path, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            m = re.match(r"^revision\s*=\s*['\"]([0-9a-zA-Z_]+)['\"]", line)
            if m:
                rev = m.group(1)
            m = re.match(r"^down_revision\s*=\s*(['\"])(.*?)\1", line)
            if m:
                val = m.group(2)
                if val == 'None' or val == 'none' or val == '':
                    down = None
                else:
                    down = val
            if rev and (down is not None or 'down_revision' in line):
                # continue to capture possible later assignments
                pass
    return rev, down


def main():
    base = os.path.join(os.getcwd(), 'backend', 'alembic', 'baseline', 'versions')
    if not os.path.isdir(base):
        print('Migration folder not found:', base)
        return 2
    files = [os.path.join(base, f) for f in os.listdir(base) if f.endswith('.py')]
    revs = {}
    down_map = {}
    for f in files:
        rev, down = parse_migration_file(f)
        if rev:
            revs[rev] = f
            down_map[rev] = down

    if not revs:
        print('No revision files detected')
        return 2

    # compute children set to find heads (revs with no children)
    children = {r: [] for r in revs}
    for r, d in down_map.items():
        if d and d in children:
            children[d].append(r)

    heads = [r for r, ch in children.items() if not ch]
    if not heads:
        print('No heads found')
        return 2
    if len(heads) > 1:
        print('Multiple alembic heads detected:')
        for h in heads:
            print(' -', h, '->', revs.get(h))
        return 1
    print('Single alembic head:', heads[0], '->', revs.get(heads[0]))
    return 0


if __name__ == '__main__':
    sys.exit(main())
