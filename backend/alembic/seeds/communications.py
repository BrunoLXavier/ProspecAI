"""Seed Communications (threads, messages, meeting minutes)

This seed creates sample communication threads linked to proposals and projects.

Revision ID: communications_seed
Create Date: 2026-01-23 12:00:00
"""
from __future__ import annotations

import json
import uuid
from typing import Iterable
from sqlalchemy import text


# Stable IDs for communication threads
THREAD_IDS = {
    'THREAD_1': 'e1000000-0000-0000-0000-000000000001',
    'THREAD_2': 'e1000000-0000-0000-0000-000000000002',
    'THREAD_3': 'e1000000-0000-0000-0000-000000000003',
}

MESSAGE_IDS = {
    'MSG_1_1': 'e2000000-0000-0000-0000-000000000001',
    'MSG_1_2': 'e2000000-0000-0000-0000-000000000002',
    'MSG_1_3': 'e2000000-0000-0000-0000-000000000003',
    'MSG_2_1': 'e2000000-0000-0000-0000-000000000004',
    'MSG_2_2': 'e2000000-0000-0000-0000-000000000005',
    'MSG_3_1': 'e2000000-0000-0000-0000-000000000006',
}

MINUTE_IDS = {
    'MIN_1': 'e3000000-0000-0000-0000-000000000001',
}

THREADS = [
    {
        'id': THREAD_IDS['THREAD_1'],
        'subject': 'Discussão sobre proposta EMBRAPII - Gêmeo Digital',
        'linked_entity_type': 'proposal',
        'linked_entity_id': None,  # Will be linked dynamically if proposal exists
        'is_auto_created': False,
    },
    {
        'id': THREAD_IDS['THREAD_2'],
        'subject': 'Alinhamento técnico - Projeto Biocombustíveis',
        'linked_entity_type': 'project',
        'linked_entity_id': None,
        'is_auto_created': False,
    },
    {
        'id': THREAD_IDS['THREAD_3'],
        'subject': 'Reunião de acompanhamento mensal',
        'linked_entity_type': None,
        'linked_entity_id': None,
        'is_auto_created': False,
    },
]

MESSAGES = [
    # Thread 1 messages
    {
        'id': MESSAGE_IDS['MSG_1_1'],
        'thread_id': THREAD_IDS['THREAD_1'],
        'author': 'Carlos Silva',
        'author_name': 'Dr. Carlos Silva',
        'body': 'Prezados, estou iniciando a discussão sobre a proposta EMBRAPII para o projeto de Gêmeo Digital. Precisamos definir os entregáveis do primeiro milestone.',
        'message_type': 'text',
    },
    {
        'id': MESSAGE_IDS['MSG_1_2'],
        'thread_id': THREAD_IDS['THREAD_1'],
        'author': 'Marina Costa',
        'author_name': 'Dra. Marina Costa',
        'body': 'Carlos, sugiro focarmos na especificação da arquitetura do sistema e no protótipo de integração com o MES. Podemos marcar uma reunião para alinhar?',
        'message_type': 'text',
    },
    {
        'id': MESSAGE_IDS['MSG_1_3'],
        'thread_id': THREAD_IDS['THREAD_1'],
        'author': 'Carlos Silva',
        'author_name': 'Dr. Carlos Silva',
        'body': 'Perfeito. Marquei reunião para sexta-feira às 14h. Convite enviado por email.',
        'message_type': 'text',
    },
    # Thread 2 messages
    {
        'id': MESSAGE_IDS['MSG_2_1'],
        'thread_id': THREAD_IDS['THREAD_2'],
        'author': 'Roberto Almeida',
        'author_name': 'Dr. Roberto Almeida',
        'body': 'Equipe, os resultados do último experimento de conversão enzimática superaram as expectativas. Taxa de conversão de 87%.',
        'message_type': 'text',
    },
    {
        'id': MESSAGE_IDS['MSG_2_2'],
        'thread_id': THREAD_IDS['THREAD_2'],
        'author': 'Fernanda Lima',
        'author_name': 'Dra. Fernanda Lima',
        'body': 'Excelente resultado! Vou preparar o relatório técnico para envio ao BNDES até sexta. Precisamos documentar as condições de operação.',
        'message_type': 'text',
    },
    # Thread 3 messages
    {
        'id': MESSAGE_IDS['MSG_3_1'],
        'thread_id': THREAD_IDS['THREAD_3'],
        'author': 'admin@prospecai.com',
        'author_name': 'System Administrator',
        'body': 'Lembrete: reunião de acompanhamento mensal agendada para dia 28/01 às 10h. Pauta: revisão de indicadores e planejamento do próximo mês.',
        'message_type': 'text',
    },
]

MEETING_MINUTES = [
    {
        'id': MINUTE_IDS['MIN_1'],
        'thread_id': THREAD_IDS['THREAD_1'],
        'title': 'Ata de Reunião - Kickoff Projeto Gêmeo Digital',
        'content': '''# Ata de Reunião

**Data:** 24/01/2026
**Participantes:** Dr. Carlos Silva, Dra. Marina Costa, Representante VW

## Pauta
1. Apresentação do escopo do projeto
2. Definição de milestones
3. Cronograma preliminar

## Decisões
- Milestone 1: Especificação da arquitetura (30 dias)
- Milestone 2: Protótipo de integração MES (60 dias)
- Milestone 3: Validação em ambiente de produção (90 dias)

## Ações
| Responsável | Ação | Prazo |
|-------------|------|-------|
| Carlos Silva | Elaborar documento de arquitetura | 07/02/2026 |
| Marina Costa | Mapear APIs do sistema MES | 14/02/2026 |

## Próxima Reunião
Data: 07/02/2026 às 14h
''',
        'status': 'approved',
    },
]


def _table_exists(conn, table: str) -> bool:
    r = conn.execute(text("SELECT to_regclass(:t)"), {"t": table}).scalar()
    return r is not None


def seed_for_tenant(conn, tenant_id: str) -> None:
    # Seed threads
    if not _table_exists(conn, "communication_threads"):
        print("Skipping communications seed: communication_threads table not present")
        return

    for thread in THREADS:
        stmt = text("""
            INSERT INTO communication_threads (
                id, tenant_id, subject, linked_entity_type, linked_entity_id,
                is_auto_created, auto_created_confirmed, last_message_at,
                created_at, updated_at
            )
            SELECT
                :id, :tenant_id, :subject, :linked_entity_type, :linked_entity_id,
                :is_auto_created, false, now(),
                now(), now()
            WHERE NOT EXISTS (
                SELECT 1 FROM communication_threads WHERE tenant_id = :tenant_id AND id = :id
            )
        """)
        
        conn.execute(stmt, {
            'id': thread['id'],
            'tenant_id': tenant_id,
            'subject': thread['subject'],
            'linked_entity_type': thread['linked_entity_type'],
            'linked_entity_id': thread['linked_entity_id'],
            'is_auto_created': thread['is_auto_created'],
        })

    # Seed messages
    if _table_exists(conn, "communication_messages"):
        for msg in MESSAGES:
            stmt = text("""
                INSERT INTO communication_messages (
                    id, tenant_id, thread_id, author, author_name, body,
                    message_type, is_auto_created, auto_created_confirmed,
                    created_at, updated_at
                )
                SELECT
                    :id, :tenant_id, :thread_id, :author, :author_name, :body,
                    :message_type, false, false,
                    now() - (random() * interval '7 days'), now()
                WHERE NOT EXISTS (
                    SELECT 1 FROM communication_messages WHERE tenant_id = :tenant_id AND id = :id
                )
            """)
            
            conn.execute(stmt, {
                'id': msg['id'],
                'tenant_id': tenant_id,
                'thread_id': msg['thread_id'],
                'author': msg['author'],
                'author_name': msg['author_name'],
                'body': msg['body'],
                'message_type': msg['message_type'],
            })

    # Seed meeting minutes
    if _table_exists(conn, "meeting_minutes"):
        for minute in MEETING_MINUTES:
            stmt = text("""
                INSERT INTO meeting_minutes (
                    id, tenant_id, thread_id, title, content, status,
                    generated_at, created_at, updated_at
                )
                SELECT
                    :id, :tenant_id, :thread_id, :title, :content, :status,
                    now(), now(), now()
                WHERE NOT EXISTS (
                    SELECT 1 FROM meeting_minutes WHERE tenant_id = :tenant_id AND id = :id
                )
            """)
            
            conn.execute(stmt, {
                'id': minute['id'],
                'tenant_id': tenant_id,
                'thread_id': minute['thread_id'],
                'title': minute['title'],
                'content': minute['content'],
                'status': minute['status'],
            })

    # Update thread last_message_preview
    conn.execute(text("""
        UPDATE communication_threads t
        SET last_message_preview = (
            SELECT body FROM communication_messages m 
            WHERE m.thread_id = t.id 
            ORDER BY m.created_at DESC LIMIT 1
        ),
        last_message_at = (
            SELECT MAX(m.created_at) FROM communication_messages m 
            WHERE m.thread_id = t.id
        )
        WHERE t.tenant_id = :tenant_id
    """), {'tenant_id': tenant_id})

    print(f"communications seed applied for tenant: {tenant_id}")


def seed_for_tenants(conn, tenant_ids: Iterable[str]) -> None:
    for t in tenant_ids:
        seed_for_tenant(conn, t)
