"""Seed Funding Sources (5 major Brazilian R&D funding agencies)

This seed creates realistic funding sources from major Brazilian agencies:
EMBRAPII, FINEP, BNDES, CNPq, and FAPESP with 2026 deadlines.

Revision ID: funding_seed
Create Date: 2026-01-24 12:00:00
"""
from __future__ import annotations

import os
from typing import Iterable, List
from sqlalchemy import text


SEED_CREATED_BY = os.getenv("SEED_CREATED_BY", "00000000-0000-0000-0000-000000000001")

# Stable IDs for funding sources
FUNDING_IDS = {
    'EMBRAPII': 'f1000000-0000-0000-0000-000000000001',
    'FINEP': 'f1000000-0000-0000-0000-000000000002',
    'BNDES': 'f1000000-0000-0000-0000-000000000003',
    'CNPQ': 'f1000000-0000-0000-0000-000000000004',
    'FAPESP': 'f1000000-0000-0000-0000-000000000005',
}

# Realistic Brazilian R&D Funding Sources
FUNDING_SOURCES = [
    {
        'id': FUNDING_IDS['EMBRAPII'],
        'name': 'EMBRAPII - Chamada Indústria 4.0 2026',
        'description': 'Chamada pública para projetos de P&D em parceria com Unidades EMBRAPII, '
                       'focada em tecnologias da Indústria 4.0: IoT, IA, Digital Twin, Robótica e Manufatura Avançada. '
                       'Recursos não reembolsáveis de até 1/3 do valor do projeto.',
        'institution': 'EMBRAPII - Empresa Brasileira de Pesquisa e Inovação Industrial',
        'instrument_type': 'subvention',
        'trl_min': 3,
        'trl_max': 6,
        'total_amount': 50000000.00,
        'available_amount': 50000000.00,
        'currency': 'BRL',
        'submission_start': '2026-03-01 00:00:00-03:00',
        'submission_end': '2026-06-30 23:59:59-03:00',
        'execution_start': '2026-08-01 00:00:00-03:00',
        'execution_end': '2028-07-31 23:59:59-03:00',
        'status': 'open',
        'source_organization': 'EMBRAPII',
        'url': 'https://embrapii.org.br/chamadas/',
        'requirements': 'Empresa brasileira com mínimo de 1 ano de CNPJ ativo. '
                        'Contrapartida mínima de 1/3 do valor total do projeto.',
        'eligibility_criteria': 'Projetos de PD&I em parceria com Unidades EMBRAPII credenciadas. '
                                'TRL de entrada entre 3 e 5. Prazo máximo de execução: 24 meses.',
    },
    {
        'id': FUNDING_IDS['FINEP'],
        'name': 'FINEP Inovacred Manufatura Verde 2026',
        'description': 'Financiamento reembolsável para projetos de inovação focados em sustentabilidade, '
                       'economia circular e descarbonização industrial. Taxa de juros subsidiada (TJLP + 1% a.a.). '
                       'Prazo de carência de até 36 meses.',
        'institution': 'FINEP - Financiadora de Estudos e Projetos',
        'instrument_type': 'loan',
        'trl_min': 4,
        'trl_max': 8,
        'total_amount': 200000000.00,
        'available_amount': 200000000.00,
        'currency': 'BRL',
        'submission_start': '2026-02-01 00:00:00-03:00',
        'submission_end': '2026-05-31 23:59:59-03:00',
        'execution_start': '2026-07-01 00:00:00-03:00',
        'execution_end': '2029-06-30 23:59:59-03:00',
        'status': 'open',
        'source_organization': 'FINEP/MCTI',
        'url': 'https://www.finep.gov.br/apoio-e-financiamento-externa/programas-e-linhas',
        'requirements': 'Empresas de pequeno, médio e grande porte com sede no Brasil. '
                        'Faturamento mínimo de R$ 3 milhões/ano. Score de crédito satisfatório.',
        'eligibility_criteria': 'Projetos de inovação com foco em sustentabilidade. '
                                'Mínimo de 60% dos recursos aplicados em P&D. '
                                'Valor mínimo do projeto: R$ 1 milhão.',
    },
    {
        'id': FUNDING_IDS['BNDES'],
        'name': 'BNDES Fundo Clima - Tecnologias Limpas 2026',
        'description': 'Linha de financiamento do BNDES para apoio a projetos de desenvolvimento e produção '
                       'de tecnologias limpas, eficiência energética e energia renovável. '
                       'Condições diferenciadas: juros de TLP + 0,9% a.a. e prazo de até 20 anos.',
        'institution': 'BNDES - Banco Nacional de Desenvolvimento Econômico e Social',
        'instrument_type': 'loan',
        'trl_min': 5,
        'trl_max': 9,
        'total_amount': 500000000.00,
        'available_amount': 500000000.00,
        'currency': 'BRL',
        'submission_start': '2026-01-15 00:00:00-03:00',
        'submission_end': '2026-12-15 23:59:59-03:00',
        'execution_start': '2026-03-01 00:00:00-03:00',
        'execution_end': '2030-12-31 23:59:59-03:00',
        'status': 'open',
        'source_organization': 'BNDES',
        'url': 'https://www.bndes.gov.br/wps/portal/site/home/financiamento/fundo-clima',
        'requirements': 'Empresas brasileiras de qualquer porte. Análise de crédito padrão BNDES. '
                        'Apresentação de estudo de viabilidade técnica e econômica.',
        'eligibility_criteria': 'Projetos com comprovada redução de emissões de GEE. '
                                'Alinhamento com Contribuição Nacionalmente Determinada (NDC). '
                                'Financiamento de até 80% do valor do projeto.',
    },
    {
        'id': FUNDING_IDS['CNPQ'],
        'name': 'CNPq Universal 2026 - Todas as Áreas',
        'description': 'Chamada Universal CNPq para apoio a projetos de pesquisa científica, tecnológica e de inovação '
                       'em todas as áreas do conhecimento. Faixas de financiamento: A (até R$ 50 mil), '
                       'B (R$ 50-120 mil) e C (R$ 120-500 mil).',
        'institution': 'CNPq - Conselho Nacional de Desenvolvimento Científico e Tecnológico',
        'instrument_type': 'grant',
        'trl_min': 1,
        'trl_max': 4,
        'total_amount': 150000000.00,
        'available_amount': 150000000.00,
        'currency': 'BRL',
        'submission_start': '2026-04-01 00:00:00-03:00',
        'submission_end': '2026-06-15 23:59:59-03:00',
        'execution_start': '2026-09-01 00:00:00-03:00',
        'execution_end': '2029-08-31 23:59:59-03:00',
        'status': 'open',
        'source_organization': 'CNPq/MCTI',
        'url': 'https://www.gov.br/cnpq/pt-br/acesso-a-informacao/acoes-e-programas/programas/chamadas-publicas',
        'requirements': 'Pesquisadores doutores vinculados a ICTs brasileiras. '
                        'Currículo Lattes atualizado nos últimos 6 meses. '
                        'Produção científica nos últimos 5 anos.',
        'eligibility_criteria': 'Projetos de pesquisa básica ou aplicada. '
                                'Prazo máximo de execução: 36 meses. '
                                'Vedada a contratação de bolsas com recursos do projeto.',
    },
    {
        'id': FUNDING_IDS['FAPESP'],
        'name': 'FAPESP PIPE Fase 2 - Inovação Tecnológica 2026',
        'description': 'Programa FAPESP de Pesquisa Inovativa em Pequenas Empresas - Fase 2 para desenvolvimento '
                       'de produto, processo ou serviço inovador. Apoio de até R$ 1 milhão por projeto. '
                       'Contrapartida da empresa de 50% em recursos próprios.',
        'institution': 'FAPESP - Fundação de Amparo à Pesquisa do Estado de São Paulo',
        'instrument_type': 'grant',
        'trl_min': 4,
        'trl_max': 7,
        'total_amount': 80000000.00,
        'available_amount': 80000000.00,
        'currency': 'BRL',
        'submission_start': '2026-03-15 00:00:00-03:00',
        'submission_end': '2026-05-15 23:59:59-03:00',
        'execution_start': '2026-07-01 00:00:00-03:00',
        'execution_end': '2028-06-30 23:59:59-03:00',
        'status': 'open',
        'source_organization': 'FAPESP',
        'url': 'https://fapesp.br/pipe/',
        'requirements': 'Pequenas empresas com sede no Estado de São Paulo. '
                        'Mínimo de 2 funcionários em regime CLT. '
                        'Aprovação prévia na Fase 1 ou dispensa justificada.',
        'eligibility_criteria': 'Projetos de P&D com potencial comercial demonstrado. '
                                'Pesquisador Principal com dedicação mínima de 8h/semana. '
                                'Prazo de execução: 24 meses.',
    },
]


def _table_exists(conn, table: str) -> bool:
    r = conn.execute(text("SELECT to_regclass(:t)"), {"t": table}).scalar()
    return r is not None


def _column_exists(conn, table: str, column: str) -> bool:
    r = conn.execute(
        text("SELECT 1 FROM information_schema.columns WHERE table_name=:t AND column_name=:c"),
        {"t": table, "c": column}
    ).scalar()
    return r is not None


def seed_for_tenant(conn, tenant_id: str) -> List[str]:
    if not _table_exists(conn, "funding_sources"):
        print("Skipping funding seed: funding_sources table not present")
        return []

    # Detect schema variations
    has_institution = _column_exists(conn, "funding_sources", "institution")
    has_trl_min = _column_exists(conn, "funding_sources", "trl_min")
    has_requirements = _column_exists(conn, "funding_sources", "requirements")
    has_execution_start = _column_exists(conn, "funding_sources", "execution_start")
    has_version = _column_exists(conn, "funding_sources", "version")

    seeded = []
    
    for f in FUNDING_SOURCES:
        # Build INSERT statement based on schema
        if has_trl_min and has_institution:
            # Full schema with all fields
            base_columns = """
                id, tenant_id, name, description, institution, instrument_type,
                trl_min, trl_max, total_amount, available_amount, currency,
                submission_start, submission_end, status, source_organization, url
            """
            base_values = """
                :id, :tenant_id, :name, :description, :institution, :instrument_type,
                :trl_min, :trl_max, :total_amount, :available_amount, :currency,
                CAST(:submission_start AS timestamptz), CAST(:submission_end AS timestamptz),
                :status, :source_organization, :url
            """
            
            params = {
                'id': f['id'],
                'tenant_id': tenant_id,
                'name': f['name'],
                'description': f['description'],
                'institution': f['institution'],
                'instrument_type': f['instrument_type'],
                'trl_min': f['trl_min'],
                'trl_max': f['trl_max'],
                'total_amount': f['total_amount'],
                'available_amount': f['available_amount'],
                'currency': f['currency'],
                'submission_start': f['submission_start'],
                'submission_end': f['submission_end'],
                'status': f['status'],
                'source_organization': f['source_organization'],
                'url': f['url'],
            }
            
            # Add optional columns if they exist
            if has_requirements:
                base_columns += ", requirements, eligibility_criteria"
                base_values += ", :requirements, :eligibility_criteria"
                params['requirements'] = f.get('requirements', '')
                params['eligibility_criteria'] = f.get('eligibility_criteria', '')
            
            if has_execution_start:
                base_columns += ", execution_start, execution_end"
                base_values += ", CAST(:execution_start AS timestamptz), CAST(:execution_end AS timestamptz)"
                params['execution_start'] = f.get('execution_start')
                params['execution_end'] = f.get('execution_end')
            
            base_columns += ", created_by, updated_by, created_at, updated_at"
            base_values += ", :created_by, :updated_by, now(), now()"
            params['created_by'] = SEED_CREATED_BY
            params['updated_by'] = SEED_CREATED_BY
            
            if has_version:
                base_columns += ", version"
                base_values += ", 1"
            
            stmt = text(f"""
                INSERT INTO funding_sources ({base_columns})
                SELECT {base_values}
                WHERE NOT EXISTS (
                    SELECT 1 FROM funding_sources WHERE tenant_id = :tenant_id AND id = :id
                )
            """)
            
            conn.execute(stmt, params)
            seeded.append(f['name'])
        else:
            # Minimal schema fallback
            stmt = text("""
                INSERT INTO funding_sources (
                    id, tenant_id, name, description, instrument_type,
                    trl_range, total_amount, available_amount, currency,
                    submission_start, submission_end, status, source_organization,
                    created_by, updated_by, created_at, updated_at
                )
                SELECT
                    :id, :tenant_id, :name, :description, :instrument_type,
                    int4range(:trl_min, :trl_max, '[]'), :total_amount, :available_amount, :currency,
                    CAST(:submission_start AS timestamptz), CAST(:submission_end AS timestamptz),
                    :status, :source_organization,
                    :created_by, :updated_by, now(), now()
                WHERE NOT EXISTS (
                    SELECT 1 FROM funding_sources WHERE tenant_id = :tenant_id AND id = :id
                )
            """)
            
            conn.execute(stmt, {
                'id': f['id'],
                'tenant_id': tenant_id,
                'name': f['name'],
                'description': f['description'],
                'instrument_type': f['instrument_type'],
                'trl_min': f['trl_min'],
                'trl_max': f['trl_max'],
                'total_amount': f['total_amount'],
                'available_amount': f['available_amount'],
                'currency': f['currency'],
                'submission_start': f['submission_start'],
                'submission_end': f['submission_end'],
                'status': f['status'],
                'source_organization': f['source_organization'],
                'created_by': SEED_CREATED_BY,
                'updated_by': SEED_CREATED_BY,
            })
            seeded.append(f['name'])

    print(f"funding_sources seed applied for tenant: {tenant_id} ({len(seeded)} sources)")
    return seeded


def seed_for_tenants(conn, tenant_ids: Iterable[str]) -> List[str]:
    all_seeded = []
    for t in tenant_ids:
        seeded = seed_for_tenant(conn, t)
        all_seeded.extend(seeded)
    return all_seeded

