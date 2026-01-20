"""
Normalize user emails to safe domains

Revision ID: 022_normalize_user_emails
Revises: 021_add_pii_rules_table
Create Date: 2026-01-20 17:30:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.sql import text

# revision identifiers, used by Alembic.
revision: str = '022_normalize_user_emails'
down_revision: Union[str, None] = '021_add_pii_rules_table'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()

    # 1) Lowercase all emails to normalize
    conn.execute(text("UPDATE users SET email = lower(email) WHERE email IS NOT NULL;"))

    # 2) Replace known reserved or test domains with a safe domain
    reserved_domains = ['example', 'example.test', 'localhost', 'invalid', 'test']
    for d in reserved_domains:
        # replace the domain part with example.com
        conn.execute(text(
            "UPDATE users SET email = regexp_replace(email, '@.*$', '@example.com') WHERE split_part(email, '@', 2) = :dom;"
        ), {'dom': d})

    # 3) Append .com where domain part has no dot (e.g., user@company -> user@company.com)
    conn.execute(text(
        "UPDATE users SET email = email || '.com' WHERE split_part(email, '@', 2) NOT LIKE '%.%';"
    ))

    # 4) Optional: ensure uniqueness not violated. We don't enforce uniqueness here; if conflicts arise,
    # the DBA should resolve them manually. This migration favors safety over hard deletes.


def downgrade() -> None:
    # Downgrade is intentionally a no-op because normalization is data-correcting.
    # Reverting could re-introduce invalid emails.
    pass
