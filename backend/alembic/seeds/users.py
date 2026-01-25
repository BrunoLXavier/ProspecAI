"""Seed Users (25 users - 5 per institute with institute membership and notifications)

This seed creates users for each ISI/CIS institute with proper roles,
user_institutes membership links, and 3 notifications per user.

Revision ID: users_seed
Create Date: 2026-01-24 12:00:00
"""
from __future__ import annotations

import uuid
from typing import Iterable
from sqlalchemy import text

# Inline stable IDs to avoid cross-module import issues in Docker
ADMIN_ID = '00000000-0000-0000-0000-000000000001'

# Institute IDs (copied from institutes.py to avoid import issues)
INSTITUTE_IDS = {
    'ISI_SVP': 'a1000000-0000-0000-0000-000000000001',  # ISI Sistemas Virtuais de Produção
    'ISI_QV': 'a1000000-0000-0000-0000-000000000002',   # ISI Química Verde
    'ISI_BF': 'a1000000-0000-0000-0000-000000000003',   # ISI Biossintéticos e Fibras
    'ISI_II': 'a1000000-0000-0000-0000-000000000004',   # ISI Inspeção e Integridade
    'CIS_SO': 'a1000000-0000-0000-0000-000000000005',   # CIS Soluções Operacionais
}

# BCrypt hash for password "User@123" - all seeded users use this password
USER_PASSWORD_HASH = '$2b$12$LRulWbk7Ol7LHQwVn.8MqOFtpjtRcgZk3Qbsxa7l9q.nv9nv0QR1K'

# Stable IDs for users (for FK references in other seeds)
USER_IDS = {
    # ISI SVP Users
    'USER_SVP_1': 'a2000000-0000-0000-0000-000000000001',
    'USER_SVP_2': 'a2000000-0000-0000-0000-000000000002',
    'USER_SVP_3': 'a2000000-0000-0000-0000-000000000003',
    'USER_SVP_4': 'a2000000-0000-0000-0000-000000000004',
    'USER_SVP_5': 'a2000000-0000-0000-0000-000000000005',
    # ISI QV Users
    'USER_QV_1': 'a2000000-0000-0000-0000-000000000006',
    'USER_QV_2': 'a2000000-0000-0000-0000-000000000007',
    'USER_QV_3': 'a2000000-0000-0000-0000-000000000008',
    'USER_QV_4': 'a2000000-0000-0000-0000-000000000009',
    'USER_QV_5': 'a2000000-0000-0000-0000-000000000010',
    # ISI B&F Users
    'USER_BF_1': 'a2000000-0000-0000-0000-000000000011',
    'USER_BF_2': 'a2000000-0000-0000-0000-000000000012',
    'USER_BF_3': 'a2000000-0000-0000-0000-000000000013',
    'USER_BF_4': 'a2000000-0000-0000-0000-000000000014',
    'USER_BF_5': 'a2000000-0000-0000-0000-000000000015',
    # ISI II Users
    'USER_II_1': 'a2000000-0000-0000-0000-000000000016',
    'USER_II_2': 'a2000000-0000-0000-0000-000000000017',
    'USER_II_3': 'a2000000-0000-0000-0000-000000000018',
    'USER_II_4': 'a2000000-0000-0000-0000-000000000019',
    'USER_II_5': 'a2000000-0000-0000-0000-000000000020',
    # CIS SO Users
    'USER_SO_1': 'a2000000-0000-0000-0000-000000000021',
    'USER_SO_2': 'a2000000-0000-0000-0000-000000000022',
    'USER_SO_3': 'a2000000-0000-0000-0000-000000000023',
    'USER_SO_4': 'a2000000-0000-0000-0000-000000000024',
    'USER_SO_5': 'a2000000-0000-0000-0000-000000000025',
}

# User definitions with institute associations
USERS = [
    # ISI SVP Users (5)
    {
        'id': USER_IDS['USER_SVP_1'],
        'email': 'carlos.silva@isisvp.senai.br',
        'username': 'carlos.silva',
        'first_name': 'Carlos',
        'last_name': 'Silva',
        'role': 'institute_admin',
        'institute_key': 'ISI_SVP',
        'institute_role': 'coordinator',
    },
    {
        'id': USER_IDS['USER_SVP_2'],
        'email': 'marina.costa@isisvp.senai.br',
        'username': 'marina.costa',
        'first_name': 'Marina',
        'last_name': 'Costa',
        'role': 'institute_manager',
        'institute_key': 'ISI_SVP',
        'institute_role': 'manager',
    },
    {
        'id': USER_IDS['USER_SVP_3'],
        'email': 'pedro.santos@isisvp.senai.br',
        'username': 'pedro.santos',
        'first_name': 'Pedro',
        'last_name': 'Santos',
        'role': 'researcher',
        'institute_key': 'ISI_SVP',
        'institute_role': 'researcher',
    },
    {
        'id': USER_IDS['USER_SVP_4'],
        'email': 'ana.rodrigues@isisvp.senai.br',
        'username': 'ana.rodrigues',
        'first_name': 'Ana',
        'last_name': 'Rodrigues',
        'role': 'analyst',
        'institute_key': 'ISI_SVP',
        'institute_role': 'analyst',
    },
    {
        'id': USER_IDS['USER_SVP_5'],
        'email': 'lucas.oliveira@isisvp.senai.br',
        'username': 'lucas.oliveira',
        'first_name': 'Lucas',
        'last_name': 'Oliveira',
        'role': 'viewer',
        'institute_key': 'ISI_SVP',
        'institute_role': 'intern',
    },
    # ISI QV Users (5)
    {
        'id': USER_IDS['USER_QV_1'],
        'email': 'roberto.almeida@isiqv.senai.br',
        'username': 'roberto.almeida',
        'first_name': 'Roberto',
        'last_name': 'Almeida',
        'role': 'institute_admin',
        'institute_key': 'ISI_QV',
        'institute_role': 'coordinator',
    },
    {
        'id': USER_IDS['USER_QV_2'],
        'email': 'fernanda.lima@isiqv.senai.br',
        'username': 'fernanda.lima',
        'first_name': 'Fernanda',
        'last_name': 'Lima',
        'role': 'institute_manager',
        'institute_key': 'ISI_QV',
        'institute_role': 'manager',
    },
    {
        'id': USER_IDS['USER_QV_3'],
        'email': 'gustavo.martins@isiqv.senai.br',
        'username': 'gustavo.martins',
        'first_name': 'Gustavo',
        'last_name': 'Martins',
        'role': 'researcher',
        'institute_key': 'ISI_QV',
        'institute_role': 'researcher',
    },
    {
        'id': USER_IDS['USER_QV_4'],
        'email': 'camila.ferreira@isiqv.senai.br',
        'username': 'camila.ferreira',
        'first_name': 'Camila',
        'last_name': 'Ferreira',
        'role': 'analyst',
        'institute_key': 'ISI_QV',
        'institute_role': 'analyst',
    },
    {
        'id': USER_IDS['USER_QV_5'],
        'email': 'bruno.pereira@isiqv.senai.br',
        'username': 'bruno.pereira',
        'first_name': 'Bruno',
        'last_name': 'Pereira',
        'role': 'viewer',
        'institute_key': 'ISI_QV',
        'institute_role': 'intern',
    },
    # ISI B&F Users (5)
    {
        'id': USER_IDS['USER_BF_1'],
        'email': 'patricia.souza@isibf.senai.br',
        'username': 'patricia.souza',
        'first_name': 'Patrícia',
        'last_name': 'Souza',
        'role': 'institute_admin',
        'institute_key': 'ISI_BF',
        'institute_role': 'coordinator',
    },
    {
        'id': USER_IDS['USER_BF_2'],
        'email': 'ricardo.gomes@isibf.senai.br',
        'username': 'ricardo.gomes',
        'first_name': 'Ricardo',
        'last_name': 'Gomes',
        'role': 'institute_manager',
        'institute_key': 'ISI_BF',
        'institute_role': 'manager',
    },
    {
        'id': USER_IDS['USER_BF_3'],
        'email': 'juliana.castro@isibf.senai.br',
        'username': 'juliana.castro',
        'first_name': 'Juliana',
        'last_name': 'Castro',
        'role': 'researcher',
        'institute_key': 'ISI_BF',
        'institute_role': 'researcher',
    },
    {
        'id': USER_IDS['USER_BF_4'],
        'email': 'thiago.ribeiro@isibf.senai.br',
        'username': 'thiago.ribeiro',
        'first_name': 'Thiago',
        'last_name': 'Ribeiro',
        'role': 'analyst',
        'institute_key': 'ISI_BF',
        'institute_role': 'analyst',
    },
    {
        'id': USER_IDS['USER_BF_5'],
        'email': 'larissa.mendes@isibf.senai.br',
        'username': 'larissa.mendes',
        'first_name': 'Larissa',
        'last_name': 'Mendes',
        'role': 'viewer',
        'institute_key': 'ISI_BF',
        'institute_role': 'intern',
    },
    # ISI II Users (5)
    {
        'id': USER_IDS['USER_II_1'],
        'email': 'andre.oliveira@isiii.senai.br',
        'username': 'andre.oliveira',
        'first_name': 'André',
        'last_name': 'Oliveira',
        'role': 'institute_admin',
        'institute_key': 'ISI_II',
        'institute_role': 'coordinator',
    },
    {
        'id': USER_IDS['USER_II_2'],
        'email': 'lucas.mendes@isiii.senai.br',
        'username': 'lucas.mendes',
        'first_name': 'Lucas',
        'last_name': 'Mendes',
        'role': 'institute_manager',
        'institute_key': 'ISI_II',
        'institute_role': 'manager',
    },
    {
        'id': USER_IDS['USER_II_3'],
        'email': 'beatriz.santos@isiii.senai.br',
        'username': 'beatriz.santos',
        'first_name': 'Beatriz',
        'last_name': 'Santos',
        'role': 'researcher',
        'institute_key': 'ISI_II',
        'institute_role': 'researcher',
    },
    {
        'id': USER_IDS['USER_II_4'],
        'email': 'rafael.dias@isiii.senai.br',
        'username': 'rafael.dias',
        'first_name': 'Rafael',
        'last_name': 'Dias',
        'role': 'analyst',
        'institute_key': 'ISI_II',
        'institute_role': 'analyst',
    },
    {
        'id': USER_IDS['USER_II_5'],
        'email': 'amanda.carvalho@isiii.senai.br',
        'username': 'amanda.carvalho',
        'first_name': 'Amanda',
        'last_name': 'Carvalho',
        'role': 'viewer',
        'institute_key': 'ISI_II',
        'institute_role': 'intern',
    },
    # CIS SO Users (5)
    {
        'id': USER_IDS['USER_SO_1'],
        'email': 'juliana.ferreira@cisso.sesisenai.org.br',
        'username': 'juliana.ferreira',
        'first_name': 'Juliana',
        'last_name': 'Ferreira',
        'role': 'institute_admin',
        'institute_key': 'CIS_SO',
        'institute_role': 'coordinator',
    },
    {
        'id': USER_IDS['USER_SO_2'],
        'email': 'marcos.silva@cisso.sesisenai.org.br',
        'username': 'marcos.silva',
        'first_name': 'Marcos',
        'last_name': 'Silva',
        'role': 'institute_manager',
        'institute_key': 'CIS_SO',
        'institute_role': 'manager',
    },
    {
        'id': USER_IDS['USER_SO_3'],
        'email': 'carolina.santos@cisso.sesisenai.org.br',
        'username': 'carolina.santos',
        'first_name': 'Carolina',
        'last_name': 'Santos',
        'role': 'researcher',
        'institute_key': 'CIS_SO',
        'institute_role': 'researcher',
    },
    {
        'id': USER_IDS['USER_SO_4'],
        'email': 'felipe.lima@cisso.sesisenai.org.br',
        'username': 'felipe.lima',
        'first_name': 'Felipe',
        'last_name': 'Lima',
        'role': 'analyst',
        'institute_key': 'CIS_SO',
        'institute_role': 'analyst',
    },
    {
        'id': USER_IDS['USER_SO_5'],
        'email': 'gabriela.costa@cisso.sesisenai.org.br',
        'username': 'gabriela.costa',
        'first_name': 'Gabriela',
        'last_name': 'Costa',
        'role': 'viewer',
        'institute_key': 'CIS_SO',
        'institute_role': 'intern',
    },
]

# Notification templates per user (3 per user)
NOTIFICATION_TYPES = [
    {
        'type': 'welcome',
        'title': 'Bem-vindo ao ProspecAI',
        'message': 'Sua conta foi criada com sucesso. Explore as funcionalidades do sistema.',
        'is_read': True,
    },
    {
        'type': 'proposal_review',
        'title': 'Proposta aguardando revisão',
        'message': 'Uma nova proposta foi atribuída para sua revisão. Prazo: 7 dias.',
        'is_read': False,
    },
    {
        'type': 'funding_opportunity',
        'title': 'Nova oportunidade de fomento',
        'message': 'Novo edital EMBRAPII disponível com prazo até 30/03/2026.',
        'is_read': False,
    },
]


def _table_exists(conn, table: str) -> bool:
    r = conn.execute(text("SELECT to_regclass(:t)"), {"t": table}).scalar()
    return r is not None


def seed_for_tenant(conn, tenant_id: str) -> None:
    if not _table_exists(conn, "users"):
        print("Skipping users seed: users table not present")
        return

    for user in USERS:
        # Insert user
        stmt = text("""
            INSERT INTO users (
                id, tenant_id, email, username, password_hash,
                first_name, last_name, is_active, email_verified,
                created_at, updated_at
            )
            SELECT
                :id, :tenant_id, :email, :username, :password_hash,
                :first_name, :last_name, true, true,
                now(), now()
            WHERE NOT EXISTS (
                SELECT 1 FROM users WHERE tenant_id = :tenant_id AND email = :email
            )
        """)
        
        conn.execute(stmt, {
            'id': user['id'],
            'tenant_id': tenant_id,
            'email': user['email'],
            'username': user['username'],
            'password_hash': USER_PASSWORD_HASH,
            'first_name': user['first_name'],
            'last_name': user['last_name'],
        })

        # Assign role to user
        if _table_exists(conn, "user_roles"):
            role_stmt = text("""
                INSERT INTO user_roles (id, user_id, role_id, role_name, assigned_at)
                SELECT gen_random_uuid(), :user_id, :role_name, :role_name, now()
                WHERE NOT EXISTS (
                    SELECT 1 FROM user_roles WHERE user_id = :user_id AND role_name = :role_name
                )
            """)
            conn.execute(role_stmt, {
                'user_id': user['id'],
                'role_name': user['role'],
            })

        # Link user to institute
        if _table_exists(conn, "user_institutes"):
            institute_id = INSTITUTE_IDS.get(user['institute_key'])
            if institute_id:
                inst_stmt = text("""
                    INSERT INTO user_institutes (
                        id, tenant_id, user_id, institute_id, role, assigned_at,
                        created_at, updated_at
                    )
                    SELECT
                        gen_random_uuid(), :tenant_id, :user_id, :institute_id, :role, now(),
                        now(), now()
                    WHERE NOT EXISTS (
                        SELECT 1 FROM user_institutes 
                        WHERE user_id = :user_id AND institute_id = :institute_id
                    )
                """)
                conn.execute(inst_stmt, {
                    'tenant_id': tenant_id,
                    'user_id': user['id'],
                    'institute_id': institute_id,
                    'role': user['institute_role'],
                })

        # Create 3 notifications per user
        if _table_exists(conn, "notifications"):
            for i, notif in enumerate(NOTIFICATION_TYPES):
                notif_id = f"n1{user['id'][2:26]}{str(i+1).zfill(6)}"
                notif_stmt = text("""
                    INSERT INTO notifications (
                        id, tenant_id, user_id, type, title, message,
                        is_read, created_at, updated_at
                    )
                    SELECT
                        :id, :tenant_id, :user_id, :type, :title, :message,
                        :is_read, now() - (interval '1 day' * :offset), now()
                    WHERE NOT EXISTS (
                        SELECT 1 FROM notifications WHERE tenant_id = :tenant_id AND id = :id
                    )
                """)
                conn.execute(notif_stmt, {
                    'id': notif_id,
                    'tenant_id': tenant_id,
                    'user_id': user['id'],
                    'type': notif['type'],
                    'title': notif['title'],
                    'message': notif['message'],
                    'is_read': notif['is_read'],
                    'offset': i,
                })

    print(f"users seed applied for tenant: {tenant_id}")


def seed_for_tenants(conn, tenant_ids: Iterable[str]) -> None:
    for t in tenant_ids:
        seed_for_tenant(conn, t)
