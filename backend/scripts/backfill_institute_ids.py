"""Quick backfill script for institute_id on clients, opportunities, proposals.
Run via: docker exec prospecai-backend python /app/scripts/backfill_institute_ids.py
"""
import sys
import os

sys.path.insert(0, "/app")
os.chdir("/app")

from sqlalchemy import create_engine, text

DATABASE_URL = "postgresql://postgres:changeme@postgres:5432/prospecai"
TENANT_ID = "00000000-0000-0000-0000-000000000001"

# Institute IDs
ISI_SVP = "a1000000-0000-0000-0000-000000000001"
ISI_QV = "a1000000-0000-0000-0000-000000000002"
ISI_BF = "a1000000-0000-0000-0000-000000000003"
ISI_II = "a1000000-0000-0000-0000-000000000004"
CIS_SO = "a1000000-0000-0000-0000-000000000005"

# Client ID -> Institute ID mapping (matches seed data)
CLIENT_INSTITUTE_MAP = {
    "c2000000-0000-0000-0000-000000000001": ISI_SVP,  # WEG
    "c2000000-0000-0000-0000-000000000002": ISI_SVP,  # Embraco
    "c2000000-0000-0000-0000-000000000003": ISI_SVP,  # Tupy
    "c2000000-0000-0000-0000-000000000004": ISI_SVP,  # Tigre
    "c2000000-0000-0000-0000-000000000005": ISI_SVP,  # Schulz
    "c2000000-0000-0000-0000-000000000006": ISI_QV,   # Braskem
    "c2000000-0000-0000-0000-000000000007": ISI_QV,   # Raizen
    "c2000000-0000-0000-0000-000000000008": ISI_QV,   # Natura
    "c2000000-0000-0000-0000-000000000009": ISI_QV,   # Eurofarma
    "c2000000-0000-0000-0000-000000000010": ISI_QV,   # BASF
    "c2000000-0000-0000-0000-000000000011": ISI_BF,   # CPFL
    "c2000000-0000-0000-0000-000000000012": ISI_BF,   # Siemens
    "c2000000-0000-0000-0000-000000000013": ISI_BF,   # Stellantis
    "c2000000-0000-0000-0000-000000000014": ISI_BF,   # Mercedes-Benz
    "c2000000-0000-0000-0000-000000000015": ISI_BF,   # Votorantim
    "c2000000-0000-0000-0000-000000000016": ISI_II,   # Samsung
    "c2000000-0000-0000-0000-000000000017": ISI_II,   # Positivo
    "c2000000-0000-0000-0000-000000000018": ISI_II,   # TOTVS
    "c2000000-0000-0000-0000-000000000019": ISI_II,   # CI&T
    "c2000000-0000-0000-0000-000000000020": ISI_II,   # Neoway
    "c2000000-0000-0000-0000-000000000021": CIS_SO,   # JBS
    "c2000000-0000-0000-0000-000000000022": CIS_SO,   # BRF
    "c2000000-0000-0000-0000-000000000023": CIS_SO,   # Marfrig
    "c2000000-0000-0000-0000-000000000024": CIS_SO,   # Aurora
    "c2000000-0000-0000-0000-000000000025": CIS_SO,   # Seara
}

# Opportunity ID -> Institute ID mapping
OPP_INSTITUTE_MAP = {
    # SVP opportunities (001-005)
    "d2000000-0000-0000-0000-000000000001": ISI_SVP,
    "d2000000-0000-0000-0000-000000000002": ISI_SVP,
    "d2000000-0000-0000-0000-000000000003": ISI_SVP,
    "d2000000-0000-0000-0000-000000000004": ISI_SVP,
    "d2000000-0000-0000-0000-000000000005": ISI_SVP,
    # QV opportunities (006-010)
    "d2000000-0000-0000-0000-000000000006": ISI_QV,
    "d2000000-0000-0000-0000-000000000007": ISI_QV,
    "d2000000-0000-0000-0000-000000000008": ISI_QV,
    "d2000000-0000-0000-0000-000000000009": ISI_QV,
    "d2000000-0000-0000-0000-000000000010": ISI_QV,
    # BF opportunities (011-015)
    "d2000000-0000-0000-0000-000000000011": ISI_BF,
    "d2000000-0000-0000-0000-000000000012": ISI_BF,
    "d2000000-0000-0000-0000-000000000013": ISI_BF,
    "d2000000-0000-0000-0000-000000000014": ISI_BF,
    "d2000000-0000-0000-0000-000000000015": ISI_BF,
    # II opportunities (016-020)
    "d2000000-0000-0000-0000-000000000016": ISI_II,
    "d2000000-0000-0000-0000-000000000017": ISI_II,
    "d2000000-0000-0000-0000-000000000018": ISI_II,
    "d2000000-0000-0000-0000-000000000019": ISI_II,
    "d2000000-0000-0000-0000-000000000020": ISI_II,
    # SO opportunities (021-025)
    "d2000000-0000-0000-0000-000000000021": CIS_SO,
    "d2000000-0000-0000-0000-000000000022": CIS_SO,
    "d2000000-0000-0000-0000-000000000023": CIS_SO,
    "d2000000-0000-0000-0000-000000000024": CIS_SO,
    "d2000000-0000-0000-0000-000000000025": CIS_SO,
}

# Proposal ID -> Institute ID mapping (from prefix pattern in seed)
PROP_INSTITUTE_MAP = {
    # SVP proposals
    "e2000000-0000-0000-0000-000000000001": ISI_SVP,
    "e2000000-0000-0000-0000-000000000002": ISI_SVP,
    "e2000000-0000-0000-0000-000000000003": ISI_SVP,
    "e2000000-0000-0000-0000-000000000004": ISI_SVP,
    "e2000000-0000-0000-0000-000000000005": ISI_SVP,
    # QV proposals
    "e2000000-0000-0000-0000-000000000006": ISI_QV,
    "e2000000-0000-0000-0000-000000000007": ISI_QV,
    "e2000000-0000-0000-0000-000000000008": ISI_QV,
    "e2000000-0000-0000-0000-000000000009": ISI_QV,
    "e2000000-0000-0000-0000-000000000010": ISI_QV,
    # BF proposals
    "e2000000-0000-0000-0000-000000000011": ISI_BF,
    "e2000000-0000-0000-0000-000000000012": ISI_BF,
    "e2000000-0000-0000-0000-000000000013": ISI_BF,
    "e2000000-0000-0000-0000-000000000014": ISI_BF,
    "e2000000-0000-0000-0000-000000000015": ISI_BF,
    # II proposals
    "e2000000-0000-0000-0000-000000000016": ISI_II,
    "e2000000-0000-0000-0000-000000000017": ISI_II,
    "e2000000-0000-0000-0000-000000000018": ISI_II,
    "e2000000-0000-0000-0000-000000000019": ISI_II,
    "e2000000-0000-0000-0000-000000000020": ISI_II,
    # SO proposals
    "e2000000-0000-0000-0000-000000000021": CIS_SO,
    "e2000000-0000-0000-0000-000000000022": CIS_SO,
    "e2000000-0000-0000-0000-000000000023": CIS_SO,
    "e2000000-0000-0000-0000-000000000024": CIS_SO,
    "e2000000-0000-0000-0000-000000000025": CIS_SO,
}


def main():
    engine = create_engine(DATABASE_URL)
    with engine.connect() as conn:
        updated = {"clients": 0, "opportunities": 0, "proposals": 0}

        # Backfill clients
        for cid, iid in CLIENT_INSTITUTE_MAP.items():
            r = conn.execute(text("""
                UPDATE clients SET institute_id = :iid, updated_at = now()
                WHERE id = :cid AND institute_id IS NULL
            """), {"cid": cid, "iid": iid})
            updated["clients"] += r.rowcount

        # Backfill opportunities
        for oid, iid in OPP_INSTITUTE_MAP.items():
            r = conn.execute(text("""
                UPDATE opportunities SET institute_id = :iid, updated_at = now()
                WHERE id = :oid AND institute_id IS NULL
            """), {"oid": oid, "iid": iid})
            updated["opportunities"] += r.rowcount

        # Backfill proposals
        for pid, iid in PROP_INSTITUTE_MAP.items():
            r = conn.execute(text("""
                UPDATE proposals SET institute_id = :iid, updated_at = now()
                WHERE id = :pid AND institute_id IS NULL
            """), {"pid": pid, "iid": iid})
            updated["proposals"] += r.rowcount

        conn.commit()

        for table, count in updated.items():
            print(f"  {table}: {count} rows updated")

        # Verify
        for table in ["clients", "opportunities", "proposals"]:
            r = conn.execute(text(f"SELECT COUNT(*), COUNT(institute_id) FROM {table}"))
            row = r.fetchone()
            print(f"  {table}: total={row[0]}, with_institute_id={row[1]}")

    engine.dispose()
    print("Backfill complete!")


if __name__ == "__main__":
    main()
