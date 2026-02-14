"""Update feedback records: resolve FB_1, FB_2, FB_3

Revision ID: update_feedback_records
Revises:
Create Date: 2026-02-13 12:00:00.000000

Updates existing seed feedback records to reflect resolved status
after implementing the requested features/fixes (Phase 17).
"""
from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = 'update_feedback_records'
down_revision = None
branch_labels = None
depends_on = None

# Known feedback IDs from seeds
FB_1_ID = 'f1000000-0000-0000-0000-000000000001'
FB_2_ID = 'f1000000-0000-0000-0000-000000000002'
FB_3_ID = 'f1000000-0000-0000-0000-000000000003'


def upgrade():
    conn = op.get_bind()

    # FB_1: TRL filter was already implemented — close retroactively
    conn.execute(text("""
        UPDATE feedbacks
        SET status = 'resolved',
            response = 'Filtro por TRL implementado na página de Portfólio (range TRL 1-9). Disponível via painel de filtros.',
            resolved_at = now(),
            updated_at = now()
        WHERE id = :fid AND status != 'resolved'
    """), {"fid": FB_1_ID})

    # FB_2: TRL chart institute filter bug — now fixed
    conn.execute(text("""
        UPDATE feedbacks
        SET status = 'resolved',
            response = 'Corrigido: gráfico TRL agora aceita filtro por instituto selecionado e atualiza automaticamente.',
            resolved_at = now(),
            updated_at = now()
        WHERE id = :fid AND status != 'resolved'
    """), {"fid": FB_2_ID})

    # FB_3: Excel export for opportunities — now implemented
    conn.execute(text("""
        UPDATE feedbacks
        SET status = 'resolved',
            response = 'Exportação Excel implementada. Botão disponível no cabeçalho da página de Oportunidades.',
            resolved_at = now(),
            updated_at = now()
        WHERE id = :fid
    """), {"fid": FB_3_ID})


def downgrade():
    conn = op.get_bind()

    # Revert FB_1 to open
    conn.execute(text("""
        UPDATE feedbacks
        SET status = 'open', response = NULL, resolved_at = NULL, updated_at = now()
        WHERE id = :fid
    """), {"fid": FB_1_ID})

    # Revert FB_2 to in_progress
    conn.execute(text("""
        UPDATE feedbacks
        SET status = 'in_progress', response = NULL, resolved_at = NULL, updated_at = now()
        WHERE id = :fid
    """), {"fid": FB_2_ID})

    # Revert FB_3 response
    conn.execute(text("""
        UPDATE feedbacks
        SET response = 'Funcionalidade implementada na versão 2.1.0', updated_at = now()
        WHERE id = :fid
    """), {"fid": FB_3_ID})
