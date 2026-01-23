"""Seed Teams (researchers/professionals linked to institutes)

This seed creates team members for each ISI/CIS institute.
Each team member is a professional with their research profile.

Revision ID: teams_seed
Create Date: 2026-01-23 12:00:00
"""
from __future__ import annotations

import uuid
from typing import Iterable
from sqlalchemy import text

# Import stable institute IDs
from alembic.seeds.institutes import INSTITUTE_IDS


# Stable IDs for team members (for FK references)
TEAM_IDS = {
    'TEAM_SVP_1': 'b1000000-0000-0000-0000-000000000001',
    'TEAM_SVP_2': 'b1000000-0000-0000-0000-000000000002',
    'TEAM_QV_1': 'b1000000-0000-0000-0000-000000000003',
    'TEAM_QV_2': 'b1000000-0000-0000-0000-000000000004',
    'TEAM_BF_1': 'b1000000-0000-0000-0000-000000000005',
    'TEAM_II_1': 'b1000000-0000-0000-0000-000000000006',
    'TEAM_II_2': 'b1000000-0000-0000-0000-000000000007',
    'TEAM_SO_1': 'b1000000-0000-0000-0000-000000000008',
}

# User IDs that will be created (admin + test users)
USER_IDS = {
    'ADMIN': 'ba4f4bf9-2daf-4be4-81cb-69bc2b832209',
}

TEAMS = [
    # ISI SVP Team Members
    {
        'id': TEAM_IDS['TEAM_SVP_1'],
        'instituto_id': INSTITUTE_IDS['ISI_SVP'],
        'name': 'Dr. Carlos Silva',
        'cargo': 'Pesquisador Sênior',
        'funcao_principal': 'Coordenador de Projetos em Manufatura Digital',
        'vinculo_principal': True,
        'email_profissional': 'carlos.silva@isisvp.senai.br',
        'telefone_celular': '(47) 99999-1001',
        'linkedin_url': 'https://linkedin.com/in/carlossilva-svp',
        'lattes_url': 'http://lattes.cnpq.br/0000000000000001',
        'orcid_id': '0000-0001-0001-0001',
    },
    {
        'id': TEAM_IDS['TEAM_SVP_2'],
        'instituto_id': INSTITUTE_IDS['ISI_SVP'],
        'name': 'Dra. Marina Costa',
        'cargo': 'Pesquisadora',
        'funcao_principal': 'Especialista em Simulação e Gêmeos Digitais',
        'vinculo_principal': True,
        'email_profissional': 'marina.costa@isisvp.senai.br',
        'telefone_celular': '(47) 99999-1002',
        'linkedin_url': 'https://linkedin.com/in/marinacosta-svp',
        'lattes_url': 'http://lattes.cnpq.br/0000000000000002',
        'orcid_id': '0000-0001-0001-0002',
    },
    # ISI QV Team Members
    {
        'id': TEAM_IDS['TEAM_QV_1'],
        'instituto_id': INSTITUTE_IDS['ISI_QV'],
        'name': 'Dr. Roberto Almeida',
        'cargo': 'Diretor de Pesquisa',
        'funcao_principal': 'Coordenador de Química Sustentável',
        'vinculo_principal': True,
        'email_profissional': 'roberto.almeida@isiqv.senai.br',
        'telefone_celular': '(21) 99999-2001',
        'linkedin_url': 'https://linkedin.com/in/robertoalmeida-qv',
        'lattes_url': 'http://lattes.cnpq.br/0000000000000003',
        'orcid_id': '0000-0001-0002-0001',
    },
    {
        'id': TEAM_IDS['TEAM_QV_2'],
        'instituto_id': INSTITUTE_IDS['ISI_QV'],
        'name': 'Dra. Fernanda Lima',
        'cargo': 'Pesquisadora',
        'funcao_principal': 'Especialista em Biocombustíveis',
        'vinculo_principal': True,
        'email_profissional': 'fernanda.lima@isiqv.senai.br',
        'telefone_celular': '(21) 99999-2002',
        'linkedin_url': 'https://linkedin.com/in/fernandalima-qv',
        'lattes_url': 'http://lattes.cnpq.br/0000000000000004',
        'orcid_id': '0000-0001-0002-0002',
    },
    # ISI B&F Team Member
    {
        'id': TEAM_IDS['TEAM_BF_1'],
        'instituto_id': INSTITUTE_IDS['ISI_BF'],
        'name': 'Dra. Patrícia Souza',
        'cargo': 'Pesquisadora Sênior',
        'funcao_principal': 'Coordenadora de Biossintéticos',
        'vinculo_principal': True,
        'email_profissional': 'patricia.souza@isibf.senai.br',
        'telefone_celular': '(21) 99999-3001',
        'linkedin_url': 'https://linkedin.com/in/patriciasouza-bf',
        'lattes_url': 'http://lattes.cnpq.br/0000000000000005',
        'orcid_id': '0000-0001-0003-0001',
    },
    # ISI II Team Members
    {
        'id': TEAM_IDS['TEAM_II_1'],
        'instituto_id': INSTITUTE_IDS['ISI_II'],
        'name': 'Dr. André Oliveira',
        'cargo': 'Pesquisador Sênior',
        'funcao_principal': 'Coordenador de Visão Computacional',
        'vinculo_principal': True,
        'email_profissional': 'andre.oliveira@isiii.senai.br',
        'telefone_celular': '(11) 99999-4001',
        'linkedin_url': 'https://linkedin.com/in/andreoliveira-ii',
        'lattes_url': 'http://lattes.cnpq.br/0000000000000006',
        'orcid_id': '0000-0001-0004-0001',
    },
    {
        'id': TEAM_IDS['TEAM_II_2'],
        'instituto_id': INSTITUTE_IDS['ISI_II'],
        'name': 'Dr. Lucas Mendes',
        'cargo': 'Pesquisador',
        'funcao_principal': 'Especialista em Ensaios Não Destrutivos',
        'vinculo_principal': True,
        'email_profissional': 'lucas.mendes@isiii.senai.br',
        'telefone_celular': '(11) 99999-4002',
        'linkedin_url': 'https://linkedin.com/in/lucasmendes-ii',
        'lattes_url': 'http://lattes.cnpq.br/0000000000000007',
        'orcid_id': '0000-0001-0004-0002',
    },
    # CIS SO Team Member
    {
        'id': TEAM_IDS['TEAM_SO_1'],
        'instituto_id': INSTITUTE_IDS['CIS_SO'],
        'name': 'Dra. Juliana Ferreira',
        'cargo': 'Consultora Sênior',
        'funcao_principal': 'Coordenadora de Transformação Digital',
        'vinculo_principal': True,
        'email_profissional': 'juliana.ferreira@cisso.sesisenai.org.br',
        'telefone_celular': '(41) 99999-5001',
        'linkedin_url': 'https://linkedin.com/in/julianaferreira-so',
        'lattes_url': 'http://lattes.cnpq.br/0000000000000008',
        'orcid_id': '0000-0001-0005-0001',
    },
]


def _table_exists(conn, table: str) -> bool:
    r = conn.execute(text("SELECT to_regclass(:t)"), {"t": table}).scalar()
    return r is not None


def seed_for_tenant(conn, tenant_id: str) -> None:
    if not _table_exists(conn, "teams"):
        print("Skipping teams seed: table not present")
        return

    for team in TEAMS:
        # Generate unique usuario_id for each team member to avoid constraint violation
        usuario_id = team['id']  # Use team ID as usuario_id for uniqueness
        
        stmt = text("""
            INSERT INTO teams (
                id, tenant_id, usuario_id, instituto_id, name, cargo, funcao_principal,
                vinculo_principal, email_profissional, telefone_celular,
                linkedin_url, lattes_url, orcid_id,
                data_vinculo_inicio, created_at, updated_at
            )
            SELECT
                :id, :tenant_id, :usuario_id, :instituto_id, :name, :cargo, :funcao_principal,
                :vinculo_principal, :email_profissional, :telefone_celular,
                :linkedin_url, :lattes_url, :orcid_id,
                now() - interval '1 year', now(), now()
            WHERE NOT EXISTS (
                SELECT 1 FROM teams WHERE tenant_id = :tenant_id AND id = :id
            )
        """)
        
        conn.execute(stmt, {
            'id': team['id'],
            'tenant_id': tenant_id,
            'usuario_id': usuario_id,  # Use team ID to ensure uniqueness
            'instituto_id': team['instituto_id'],
            'name': team['name'],
            'cargo': team['cargo'],
            'funcao_principal': team['funcao_principal'],
            'vinculo_principal': team['vinculo_principal'],
            'email_profissional': team['email_profissional'],
            'telefone_celular': team['telefone_celular'],
            'linkedin_url': team['linkedin_url'],
            'lattes_url': team['lattes_url'],
            'orcid_id': team['orcid_id'],
        })

    print(f"teams seed applied for tenant: {tenant_id}")


def seed_for_tenants(conn, tenant_ids: Iterable[str]) -> None:
    for t in tenant_ids:
        seed_for_tenant(conn, t)
