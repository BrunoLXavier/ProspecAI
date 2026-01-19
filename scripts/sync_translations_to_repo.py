#!/usr/bin/env python3
"""Sync translations folder to git and optionally open a PR.

Usage:
  python scripts/sync_translations_to_repo.py

Behavior:
  - Detects unstaged/uncommitted changes under `frontend/src/locales`.
  - If changes exist, creates a timestamped branch, commits and pushes.
  - If `GITHUB_TOKEN` and `GITHUB_REPO` (owner/repo) are set, attempts to create a PR.

Notes:
  - Designed to run from repository root.
  - In environments without auth, the script will create a local branch and commit
    and will print the git commands to push manually.
"""
from __future__ import annotations

import datetime
import os
import subprocess
import sys
import json
from pathlib import Path

LOCALES_PATH = Path("frontend/src/locales")
REPO_ROOT = Path.cwd()


def run(cmd, **kwargs):
    return subprocess.run(cmd, check=False, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, **kwargs)


def has_changes():
    if not LOCALES_PATH.exists():
        print(f"Locales path not found: {LOCALES_PATH}")
        return False
    p = run(["git", "status", "--porcelain", str(LOCALES_PATH)])
    return bool(p.stdout.strip())


def git(arg_list):
    p = run(["git"] + arg_list)
    if p.returncode != 0:
        raise RuntimeError(f"git {' '.join(arg_list)} failed: {p.stderr.strip()}")
    return p.stdout.strip()


def main():
    if not (REPO_ROOT / ".git").exists():
        print("Not a git repository (no .git found at current working directory). Run from repo root.")
        sys.exit(1)

    if not has_changes():
        print("No changes detected in frontend/src/locales.")
        return

    now = datetime.datetime.utcnow().strftime("%Y%m%d-%H%M%S")
    branch = f"translations-sync-{now}"

    print(f"Creating branch {branch} and committing changes under {LOCALES_PATH}...")
    try:
        git(["checkout", "-b", branch])
    except Exception as e:
        print(f"Failed to create branch: {e}")
        sys.exit(1)

    try:
        git(["add", str(LOCALES_PATH)])
        git(["commit", "-m", f"Sync translations: update locales ({now})"])
    except Exception as e:
        print(f"Commit failed: {e}")
        print("You may need to resolve conflicts or stage files manually.")
        sys.exit(1)

    # Try a normal push first
    pushed = False
    try:
        print("Pushing branch to origin...")
        git(["push", "-u", "origin", branch])
        pushed = True
    except Exception:
        # Fallback to token-based push if configured
        token = os.getenv("GITHUB_TOKEN")
        repo = os.getenv("GITHUB_REPO")  # owner/repo
        if token and repo:
            push_url = f"https://x-access-token:{token}@github.com/{repo}.git"
            try:
                git(["push", push_url, branch])
                pushed = True
            except Exception as e:
                print(f"Push with token failed: {e}")
        else:
            print("Push failed and no GITHUB_TOKEN/GITHUB_REPO available for token-based push.")

    print()
    if not pushed:
        print("Branch created and committed locally.")
        print(f"To push manually: git push -u origin {branch}")
        return

    print("Branch pushed.")

    # Optionally create a PR
    token = os.getenv("GITHUB_TOKEN")
    repo = os.getenv("GITHUB_REPO")
    if token and repo:
        try:
            import requests
        except Exception:
            print("Requests library not available; skipping PR creation. Install 'requests' to enable PR creation.")
            return

        # Determine default branch (try 'main' then 'master')
        base = os.getenv("GITHUB_BASE_BRANCH", "main")
        pr_title = f"Sync translations: locales update ({now})"
        pr_body = "Automatic sync of translation files. Please review and merge." 
        api_url = f"https://api.github.com/repos/{repo}/pulls"
        headers = {"Authorization": f"token {token}", "Accept": "application/vnd.github.v3+json"}
        payload = {"title": pr_title, "head": branch, "base": base, "body": pr_body}
        resp = requests.post(api_url, headers=headers, data=json.dumps(payload))
        if resp.status_code in (200, 201):
            data = resp.json()
            print(f"PR created: {data.get('html_url')}")
        else:
            print(f"Failed to create PR: {resp.status_code} {resp.text}")
    else:
        print("No GITHUB_TOKEN/GITHUB_REPO configured — skipping PR creation.")


if __name__ == "__main__":
    main()
