"""Seed Feedbacks and Activity (audit logs as activity stream)

This seed creates sample feedback entries and activity/audit records.

Revision ID: activity_feedback_seed
Create Date: 2026-01-23 12:00:00
"""
from __future__ import annotations

import json
import uuid
from typing import Iterable
from sqlalchemy import text


FEEDBACK_IDS = {
    'FB_1': 'f1000000-0000-0000-0000-000000000001',
    'FB_2': 'f1000000-0000-0000-0000-000000000002',
    'FB_3': 'f1000000-0000-0000-0000-000000000003',
}

FEEDBACKS = [
    {
        'id': FEEDBACK_IDS['FB_1'],
        'feedback_type': 'feature_request',
        'severity': 'medium',
        'description': 'Seria útil ter um filtro por TRL na página de projetos para facilitar a busca.',
        'page_url': '/portfolio',
        'page_title': 'Portfólio de Projetos',
        'status': 'open',
    },
    {
        'id': FEEDBACK_IDS['FB_2'],
        'feedback_type': 'bug_report',
        'severity': 'high',
        'description': 'O gráfico de distribuição de TRL não está atualizando corretamente após filtrar por instituto.',
        'page_url': '/dashboard',
        'page_title': 'Dashboard',
        'status': 'in_progress',
    },
    {
        'id': FEEDBACK_IDS['FB_3'],
        'feedback_type': 'ui_feedback',
        'severity': 'low',
        'description': 'Sugestão de melhoria: adicionar exportação para Excel na listagem de oportunidades.',
        'page_url': '/opportunities',
        'page_title': 'Oportunidades',
        'status': 'resolved',
        'response': 'Funcionalidade implementada na versão 2.1.0',
    },
]

ACTIVITY_LOGS = [
    {
        'entity_type': 'project',
        'action': 'create',
        'before_state': None,
        'after_state': {'name': 'Gêmeo Digital para Linha de Montagem', 'trl_current': 3},
    },
    {
        'entity_type': 'proposal',
        'action': 'update',
        'before_state': {'status': 'draft'},
        'after_state': {'status': 'submitted'},
    },
    {
        'entity_type': 'opportunity',
        'action': 'create',
        'before_state': None,
        'after_state': {'name': 'Projeto de Automação Industrial', 'stage': 'intelligence'},
    },
    {
        'entity_type': 'client',
        'action': 'update',
        'before_state': {'sector': 'Indústria'},
        'after_state': {'sector': 'Indústria Automotiva'},
    },
    {
        'entity_type': 'funding_source',
        'action': 'create',
        'before_state': None,
        'after_state': {'name': 'Edital EMBRAPII 2026', 'status': 'open'},
    },
]


def _table_exists(conn, table: str) -> bool:
    r = conn.execute(text("SELECT to_regclass(:t)"), {"t": table}).scalar()
    return r is not None


def seed_for_tenant(conn, tenant_id: str) -> None:
    # Get admin user for this tenant
    admin_result = conn.execute(
        text("SELECT id FROM users WHERE tenant_id = :tenant_id LIMIT 1"),
        {"tenant_id": tenant_id}
    ).fetchone()
    admin_id = admin_result[0] if admin_result else 'ba4f4bf9-2daf-4be4-81cb-69bc2b832209'

    # Seed feedbacks
    if _table_exists(conn, "feedbacks"):
        for fb in FEEDBACKS:
            stmt = text("""
                INSERT INTO feedbacks (
                    id, tenant_id, user_id, feedback_type, severity, description,
                    page_url, page_title, status, response, created_at, updated_at
                )
                SELECT
                    :id, :tenant_id, :user_id, :feedback_type, :severity, :description,
                    :page_url, :page_title, :status, :response, 
                    now() - (random() * interval '30 days'), now()
                WHERE NOT EXISTS (
                    SELECT 1 FROM feedbacks WHERE tenant_id = :tenant_id AND id = :id
                )
            """)
            
            conn.execute(stmt, {
                'id': fb['id'],
                'tenant_id': tenant_id,
                'user_id': admin_id,
                'feedback_type': fb['feedback_type'],
                'severity': fb['severity'],
                'description': fb['description'],
                'page_url': fb['page_url'],
                'page_title': fb['page_title'],
                'status': fb['status'],
                'response': fb.get('response'),
            })

    # Seed activity logs (audit_logs)
    if _table_exists(conn, "audit_logs"):
        for i, log in enumerate(ACTIVITY_LOGS):
            log_id = str(uuid.uuid4())
            entity_id = str(uuid.uuid4())
            
            stmt = text("""
                INSERT INTO audit_logs (
                    id, tenant_id, entity_type, entity_id, action, timestamp,
                    user_id, before_state, after_state, created_at, updated_at
                )
                SELECT
                    :id, :tenant_id, :entity_type, :entity_id, :action, 
                    now() - (interval '1 day' * :offset),
                    :user_id, CAST(:before_state AS jsonb), CAST(:after_state AS jsonb), 
                    now(), now()
                WHERE NOT EXISTS (
                    SELECT 1 FROM audit_logs WHERE tenant_id = :tenant_id 
                    AND entity_type = :entity_type AND action = :action
                    AND after_state::text = :after_state
                    LIMIT 1
                )
            """)
            
            try:
                conn.execute(stmt, {
                    'id': log_id,
                    'tenant_id': tenant_id,
                    'entity_type': log['entity_type'],
                    'entity_id': entity_id,
                    'action': log['action'],
                    'offset': i + 1,
                    'user_id': admin_id,
                    'before_state': json.dumps(log['before_state']) if log['before_state'] else None,
                    'after_state': json.dumps(log['after_state']),
                })
            except Exception:
                # Skip if already exists or constraint violation
                pass

    print(f"activity_feedback seed applied for tenant: {tenant_id}")


def seed_for_tenants(conn, tenant_ids: Iterable[str]) -> None:
    for t in tenant_ids:
        seed_for_tenant(conn, t)
