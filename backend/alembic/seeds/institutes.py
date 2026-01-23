"""Seed SENAI ISI/CIS Institutes

Based on real SENAI Innovation Institutes (ISIs) and Innovation Centers (CIS):
- ISI SVP: Instituto SENAI de Inovação em Sistemas Virtuais de Produção (Joinville/SC)
- ISI QV: Instituto SENAI de Inovação em Química Verde (Rio de Janeiro/RJ)  
- ISI B&F: Instituto SENAI de Inovação em Biossintéticos e Fibras (Rio de Janeiro/RJ)
- ISI II: Instituto SENAI de Inovação em Inspeção Inteligente (São Paulo/SP)
- CIS SO: Centro de Inovação SESI/SENAI em Soluções Organizacionais (Curitiba/PR)

Revision ID: institutes_seed
Create Date: 2026-01-23 12:00:00
"""
from __future__ import annotations

import uuid
from typing import Iterable
from sqlalchemy import text


# Stable IDs for institutes (for FK references in other seeds)
INSTITUTE_IDS = {
    'ISI_SVP': 'a1000000-0000-0000-0000-000000000001',
    'ISI_QV': 'a1000000-0000-0000-0000-000000000002',
    'ISI_BF': 'a1000000-0000-0000-0000-000000000003',
    'ISI_II': 'a1000000-0000-0000-0000-000000000004',
    'CIS_SO': 'a1000000-0000-0000-0000-000000000005',
}

INSTITUTES = [
    {
        'id': INSTITUTE_IDS['ISI_SVP'],
        'name': 'ISI em Sistemas Virtuais de Produção',
        'nome': 'Instituto SENAI de Inovação em Sistemas Virtuais de Produção',
        'isi_sigla': 'ISI SVP',
        'code': 'ISI-SVP',
        'description': 'Specializes in digital manufacturing, virtual simulation, Industry 4.0, digital twins, and smart factory solutions.',
        'descricao': 'Especializado em manufatura digital, simulação virtual, Indústria 4.0, gêmeos digitais e soluções de fábrica inteligente. Desenvolve tecnologias para otimização de processos produtivos através de sistemas virtuais.',
        'nome_fantasia': 'ISI Sistemas Virtuais',
        'endereco_rua': 'Rua Arno Waldemar Döhler',
        'endereco_numero': '957',
        'endereco_bairro': 'Zona Industrial Norte',
        'endereco_cep': '89219-510',
        'endereco_cidade': 'Joinville',
        'endereco_uf': 'SC',
        'area_predial_m2': 4500,
        'status_operacional': 'Operacional',
        'status': 'Ativo',
        'maturidade_gestao': 'A',
        'maturidade_base_tecnologica': 4.2,
        'maturidade_produtos_servicos': 4.0,
        'maturidade_cooperacao': 3.8,
        'credenciamento_cati': True,
        'credenciamento_ed': True,
    },
    {
        'id': INSTITUTE_IDS['ISI_QV'],
        'name': 'ISI em Química Verde',
        'nome': 'Instituto SENAI de Inovação em Química Verde',
        'isi_sigla': 'ISI QV',
        'code': 'ISI-QV',
        'description': 'Focuses on sustainable chemistry, green processes, biofuels, bio-based materials, and environmental solutions.',
        'descricao': 'Focado em química sustentável, processos verdes, biocombustíveis, materiais de base biológica e soluções ambientais. Desenvolve alternativas sustentáveis para a indústria química.',
        'nome_fantasia': 'ISI Química Verde',
        'endereco_rua': 'Rua Mariz e Barros',
        'endereco_numero': '678',
        'endereco_bairro': 'Tijuca',
        'endereco_cep': '20270-003',
        'endereco_cidade': 'Rio de Janeiro',
        'endereco_uf': 'RJ',
        'area_predial_m2': 3200,
        'status_operacional': 'Operacional',
        'status': 'Ativo',
        'maturidade_gestao': 'A',
        'maturidade_base_tecnologica': 4.5,
        'maturidade_produtos_servicos': 4.3,
        'maturidade_cooperacao': 4.1,
        'credenciamento_cati': True,
        'credenciamento_ed': True,
    },
    {
        'id': INSTITUTE_IDS['ISI_BF'],
        'name': 'ISI em Biossintéticos e Fibras',
        'nome': 'Instituto SENAI de Inovação em Biossintéticos e Fibras',
        'isi_sigla': 'ISI B&F',
        'code': 'ISI-BF',
        'description': 'Specializes in biosynthetic materials, textile fibers, sustainable polymers, and advanced materials for fashion and industry.',
        'descricao': 'Especializado em materiais biossintéticos, fibras têxteis, polímeros sustentáveis e materiais avançados para moda e indústria. Desenvolve soluções inovadoras em biotecnologia aplicada a fibras.',
        'nome_fantasia': 'ISI Biossintéticos',
        'endereco_rua': 'Avenida Brasil',
        'endereco_numero': '19999',
        'endereco_bairro': 'Parada de Lucas',
        'endereco_cep': '21241-000',
        'endereco_cidade': 'Rio de Janeiro',
        'endereco_uf': 'RJ',
        'area_predial_m2': 2800,
        'status_operacional': 'Operacional',
        'status': 'Ativo',
        'maturidade_gestao': 'B',
        'maturidade_base_tecnologica': 3.9,
        'maturidade_produtos_servicos': 3.7,
        'maturidade_cooperacao': 3.5,
        'credenciamento_cati': True,
        'credenciamento_ed': False,
    },
    {
        'id': INSTITUTE_IDS['ISI_II'],
        'name': 'ISI em Inspeção Inteligente',
        'nome': 'Instituto SENAI de Inovação em Inspeção Inteligente',
        'isi_sigla': 'ISI II',
        'code': 'ISI-II',
        'description': 'Focuses on non-destructive testing, computer vision, AI-based inspection, quality control, and predictive maintenance.',
        'descricao': 'Focado em ensaios não destrutivos, visão computacional, inspeção baseada em IA, controle de qualidade e manutenção preditiva. Desenvolve soluções inteligentes para inspeção industrial.',
        'nome_fantasia': 'ISI Inspeção Inteligente',
        'endereco_rua': 'Rua Santa Cruz',
        'endereco_numero': '1396',
        'endereco_bairro': 'Vila Mariana',
        'endereco_cep': '04121-001',
        'endereco_cidade': 'São Paulo',
        'endereco_uf': 'SP',
        'area_predial_m2': 3800,
        'status_operacional': 'Operacional',
        'status': 'Ativo',
        'maturidade_gestao': 'A',
        'maturidade_base_tecnologica': 4.4,
        'maturidade_produtos_servicos': 4.2,
        'maturidade_cooperacao': 4.0,
        'credenciamento_cati': True,
        'credenciamento_ed': True,
    },
    {
        'id': INSTITUTE_IDS['CIS_SO'],
        'name': 'CIS em Soluções Organizacionais',
        'nome': 'Centro de Inovação SESI SENAI em Soluções Organizacionais',
        'isi_sigla': 'CIS SO',
        'code': 'CIS-SO',
        'description': 'Innovation center focused on organizational solutions, digital transformation, process optimization, and management innovation.',
        'descricao': 'Centro de inovação focado em soluções organizacionais, transformação digital, otimização de processos e inovação em gestão. Atua na melhoria da competitividade das empresas.',
        'nome_fantasia': 'CIS Soluções Organizacionais',
        'endereco_rua': 'Avenida Cândido de Abreu',
        'endereco_numero': '200',
        'endereco_bairro': 'Centro Cívico',
        'endereco_cep': '80530-902',
        'endereco_cidade': 'Curitiba',
        'endereco_uf': 'PR',
        'area_predial_m2': 2500,
        'status_operacional': 'Operacional',
        'status': 'Ativo',
        'maturidade_gestao': 'B',
        'maturidade_base_tecnologica': 3.6,
        'maturidade_produtos_servicos': 3.8,
        'maturidade_cooperacao': 4.2,
        'credenciamento_cati': False,
        'credenciamento_ed': True,
    },
]


def _table_exists(conn, table: str) -> bool:
    r = conn.execute(text("SELECT to_regclass(:t)"), {"t": table}).scalar()
    return r is not None


def seed_for_tenant(conn, tenant_id: str) -> None:
    if not _table_exists(conn, "institutes"):
        print("Skipping institutes seed: table not present")
        return

    for inst in INSTITUTES:
        stmt = text("""
            INSERT INTO institutes (
                id, tenant_id, name, nome, isi_sigla, code, description, descricao,
                nome_fantasia, endereco_rua, endereco_numero, endereco_bairro, endereco_cep,
                endereco_cidade, endereco_uf, area_predial_m2, status_operacional, status,
                maturidade_gestao, maturidade_base_tecnologica, maturidade_produtos_servicos,
                maturidade_cooperacao, credenciamento_cati, credenciamento_ed,
                created_at, updated_at
            )
            SELECT
                :id, :tenant_id, :name, :nome, :isi_sigla, :code, :description, :descricao,
                :nome_fantasia, :endereco_rua, :endereco_numero, :endereco_bairro, :endereco_cep,
                :endereco_cidade, :endereco_uf, :area_predial_m2, :status_operacional, :status,
                :maturidade_gestao, :maturidade_base_tecnologica, :maturidade_produtos_servicos,
                :maturidade_cooperacao, :credenciamento_cati, :credenciamento_ed,
                now(), now()
            WHERE NOT EXISTS (
                SELECT 1 FROM institutes WHERE tenant_id = :tenant_id AND isi_sigla = :isi_sigla
            )
        """)
        
        conn.execute(stmt, {
            'id': inst['id'],
            'tenant_id': tenant_id,
            'name': inst['name'],
            'nome': inst['nome'],
            'isi_sigla': inst['isi_sigla'],
            'code': inst['code'],
            'description': inst['description'],
            'descricao': inst['descricao'],
            'nome_fantasia': inst['nome_fantasia'],
            'endereco_rua': inst['endereco_rua'],
            'endereco_numero': inst['endereco_numero'],
            'endereco_bairro': inst['endereco_bairro'],
            'endereco_cep': inst['endereco_cep'],
            'endereco_cidade': inst['endereco_cidade'],
            'endereco_uf': inst['endereco_uf'],
            'area_predial_m2': inst['area_predial_m2'],
            'status_operacional': inst['status_operacional'],
            'status': inst['status'],
            'maturidade_gestao': inst['maturidade_gestao'],
            'maturidade_base_tecnologica': inst['maturidade_base_tecnologica'],
            'maturidade_produtos_servicos': inst['maturidade_produtos_servicos'],
            'maturidade_cooperacao': inst['maturidade_cooperacao'],
            'credenciamento_cati': inst['credenciamento_cati'],
            'credenciamento_ed': inst['credenciamento_ed'],
        })

    print(f"institutes seed applied for tenant: {tenant_id}")


def seed_for_tenants(conn, tenant_ids: Iterable[str]) -> None:
    for t in tenant_ids:
        seed_for_tenant(conn, t)
