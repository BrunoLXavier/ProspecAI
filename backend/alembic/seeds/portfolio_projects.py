"""Seed Portfolio Projects (institutional R&D projects)

This seed creates portfolio projects linked to each ISI/CIS institute.
These are detailed project records with company info, outcomes, and metrics.

Revision ID: portfolio_projects_seed
Create Date: 2026-01-23 12:00:00
"""
from __future__ import annotations

import json
import uuid
from typing import Iterable
from sqlalchemy import text

# Import stable IDs
from alembic.seeds.institutes import INSTITUTE_IDS
from alembic.seeds.teams import TEAM_IDS
from alembic.seeds.infrastructures import INFRA_IDS


# Stable IDs for portfolio projects
PROJECT_IDS = {
    'PROJ_SVP_1': 'd1000000-0000-0000-0000-000000000001',
    'PROJ_SVP_2': 'd1000000-0000-0000-0000-000000000002',
    'PROJ_QV_1': 'd1000000-0000-0000-0000-000000000003',
    'PROJ_BF_1': 'd1000000-0000-0000-0000-000000000004',
    'PROJ_II_1': 'd1000000-0000-0000-0000-000000000005',
    'PROJ_II_2': 'd1000000-0000-0000-0000-000000000006',
    'PROJ_SO_1': 'd1000000-0000-0000-0000-000000000007',
}

PORTFOLIO_PROJECTS = [
    # ISI SVP Projects
    {
        'id': PROJECT_IDS['PROJ_SVP_1'],
        'instituto_id': INSTITUTE_IDS['ISI_SVP'],
        'nome': 'Gêmeo Digital para Linha de Montagem Automotiva',
        'descricao': 'Desenvolvimento de sistema de gêmeo digital para otimização de linha de montagem, reduzindo tempo de setup e aumentando eficiência produtiva.',
        'trl_entrada': 3,
        'trl_saida': 6,
        'categoria_solucao_resultante': 'Software',
        'modalidade_fomento': 'Lei de Informática',
        'edital_fomento': 'Chamada EMBRAPII 2025/01',
        'areas_conhecimento': ['Engenharia de Produção', 'Ciência da Computação'],
        'macroareas_pesquisa': ['Indústria 4.0', 'Manufatura Digital'],
        'plataformas_tecnologicas': ['Digital Twin', 'IoT', 'Simulação'],
        'tematicas': ['Automação', 'Otimização de Processos'],
        'parceiros': [{'nome': 'UFSC', 'tipo': 'ICT'}, {'nome': 'EMBRAPII', 'tipo': 'Fomento'}],
        'empresa_atendida_tipo': 'Grande',
        'empresa_atendida_nome': 'Volkswagen do Brasil',
        'empresa_atendida_cnpj': '59.104.422/0001-50',
        'empresa_atendida_cidade': 'São Bernardo do Campo',
        'empresa_atendida_uf': 'SP',
        'empresa_atendida_setor_cnae': 'C29.1',
        'empresa_atendida_depoimento': 'O projeto permitiu reduzir em 35% o tempo de setup da linha de montagem.',
        'status': 'Concluído',
        'pode_ser_divulgado': True,
        'data_inicio': '2024-03-01',
        'data_fim': '2025-09-30',
        'valor_total': 2500000.00,
        'equipe_ids': [TEAM_IDS['TEAM_SVP_1'], TEAM_IDS['TEAM_SVP_2']],
        'infraestrutura_ids': [INFRA_IDS['LAB_SVP_1'], INFRA_IDS['LAB_SVP_2']],
        'indicadores': {'reducao_tempo_setup': 35, 'aumento_produtividade': 18, 'roi_estimado': 2.5},
        'licoes_aprendidas': 'Integração com sistemas legados requer análise detalhada da arquitetura existente.',
    },
    {
        'id': PROJECT_IDS['PROJ_SVP_2'],
        'instituto_id': INSTITUTE_IDS['ISI_SVP'],
        'nome': 'Plataforma de Realidade Aumentada para Treinamento Industrial',
        'descricao': 'Desenvolvimento de plataforma de RA para capacitação de operadores em processos de manufatura complexos.',
        'trl_entrada': 2,
        'trl_saida': 5,
        'categoria_solucao_resultante': 'Software',
        'modalidade_fomento': 'FINEP',
        'edital_fomento': 'FINEP Inovação 2024',
        'areas_conhecimento': ['Engenharia de Software', 'Educação'],
        'macroareas_pesquisa': ['Indústria 4.0', 'Educação Profissional'],
        'plataformas_tecnologicas': ['Realidade Aumentada', 'Mobile'],
        'tematicas': ['Treinamento', 'Capacitação'],
        'parceiros': [{'nome': 'Microsoft', 'tipo': 'Empresa'}],
        'empresa_atendida_tipo': 'Grande',
        'empresa_atendida_nome': 'WEG Equipamentos Elétricos',
        'empresa_atendida_cnpj': '84.429.695/0001-11',
        'empresa_atendida_cidade': 'Jaraguá do Sul',
        'empresa_atendida_uf': 'SC',
        'empresa_atendida_setor_cnae': 'C27.1',
        'status': 'Ativo',
        'pode_ser_divulgado': True,
        'data_inicio': '2025-01-15',
        'data_fim': '2026-06-30',
        'valor_total': 1800000.00,
        'equipe_ids': [TEAM_IDS['TEAM_SVP_2']],
        'infraestrutura_ids': [INFRA_IDS['LAB_SVP_1']],
        'indicadores': {'operadores_treinados': 150, 'reducao_tempo_treinamento': 40},
    },
    # ISI QV Project
    {
        'id': PROJECT_IDS['PROJ_QV_1'],
        'instituto_id': INSTITUTE_IDS['ISI_QV'],
        'nome': 'Biocombustível de Segunda Geração a partir de Resíduos Agrícolas',
        'descricao': 'Pesquisa e desenvolvimento de processo para produção de etanol 2G utilizando resíduos da cana-de-açúcar.',
        'trl_entrada': 4,
        'trl_saida': 7,
        'categoria_solucao_resultante': 'Processo',
        'modalidade_fomento': 'BNDES',
        'edital_fomento': 'BNDES Fundo Clima',
        'areas_conhecimento': ['Química', 'Engenharia Química'],
        'macroareas_pesquisa': ['Energia Renovável', 'Sustentabilidade'],
        'plataformas_tecnologicas': ['Biotecnologia', 'Química Verde'],
        'tematicas': ['Biocombustíveis', 'Economia Circular'],
        'parceiros': [{'nome': 'Petrobras', 'tipo': 'Empresa'}, {'nome': 'UFRJ', 'tipo': 'ICT'}],
        'empresa_atendida_tipo': 'Grande',
        'empresa_atendida_nome': 'Raízen S.A.',
        'empresa_atendida_cnpj': '33.453.598/0001-23',
        'empresa_atendida_cidade': 'São Paulo',
        'empresa_atendida_uf': 'SP',
        'empresa_atendida_setor_cnae': 'C19.3',
        'empresa_atendida_depoimento': 'O processo desenvolvido viabiliza a utilização de 100% dos resíduos agrícolas.',
        'status': 'Concluído',
        'pode_ser_divulgado': True,
        'data_inicio': '2023-06-01',
        'data_fim': '2025-12-31',
        'valor_total': 4200000.00,
        'equipe_ids': [TEAM_IDS['TEAM_QV_1'], TEAM_IDS['TEAM_QV_2']],
        'infraestrutura_ids': [INFRA_IDS['LAB_QV_1']],
        'indicadores': {'rendimento_processo': 85, 'reducao_emissoes_co2': 60, 'patentes_depositadas': 2},
        'licoes_aprendidas': 'Scale-up de processos biotecnológicos requer validação extensiva em planta piloto.',
    },
    # ISI B&F Project
    {
        'id': PROJECT_IDS['PROJ_BF_1'],
        'instituto_id': INSTITUTE_IDS['ISI_BF'],
        'nome': 'Fibras Têxteis Biodegradáveis de Alto Desempenho',
        'descricao': 'Desenvolvimento de fibras têxteis 100% biodegradáveis com propriedades mecânicas comparáveis a sintéticos.',
        'trl_entrada': 2,
        'trl_saida': 5,
        'categoria_solucao_resultante': 'Produto',
        'modalidade_fomento': 'CNPq',
        'edital_fomento': 'CNPq Universal 2024',
        'areas_conhecimento': ['Engenharia de Materiais', 'Química'],
        'macroareas_pesquisa': ['Materiais Avançados', 'Sustentabilidade'],
        'plataformas_tecnologicas': ['Biossintéticos', 'Têxtil'],
        'tematicas': ['Moda Sustentável', 'Economia Circular'],
        'parceiros': [{'nome': 'ABIT', 'tipo': 'Associação'}],
        'empresa_atendida_tipo': 'Média',
        'empresa_atendida_nome': 'Malwee Malhas Ltda',
        'empresa_atendida_cnpj': '84.429.628/0001-25',
        'empresa_atendida_cidade': 'Jaraguá do Sul',
        'empresa_atendida_uf': 'SC',
        'empresa_atendida_setor_cnae': 'C14.1',
        'status': 'Ativo',
        'pode_ser_divulgado': True,
        'data_inicio': '2025-02-01',
        'data_fim': '2027-01-31',
        'valor_total': 1200000.00,
        'equipe_ids': [TEAM_IDS['TEAM_BF_1']],
        'infraestrutura_ids': [INFRA_IDS['LAB_BF_1']],
        'indicadores': {'biodegradabilidade': 95, 'resistencia_tracao_mpa': 450},
    },
    # ISI II Projects
    {
        'id': PROJECT_IDS['PROJ_II_1'],
        'instituto_id': INSTITUTE_IDS['ISI_II'],
        'nome': 'Sistema de Inspeção por Visão Computacional para Soldas',
        'descricao': 'Desenvolvimento de sistema automatizado de inspeção de soldas utilizando deep learning e visão computacional.',
        'trl_entrada': 3,
        'trl_saida': 7,
        'categoria_solucao_resultante': 'Software',
        'modalidade_fomento': 'EMBRAPII',
        'edital_fomento': 'Chamada EMBRAPII IA 2024',
        'areas_conhecimento': ['Ciência da Computação', 'Engenharia Mecânica'],
        'macroareas_pesquisa': ['Inteligência Artificial', 'Qualidade'],
        'plataformas_tecnologicas': ['Deep Learning', 'Visão Computacional'],
        'tematicas': ['Inspeção Automatizada', 'Controle de Qualidade'],
        'parceiros': [{'nome': 'USP', 'tipo': 'ICT'}],
        'empresa_atendida_tipo': 'Grande',
        'empresa_atendida_nome': 'Petrobras',
        'empresa_atendida_cnpj': '33.000.167/0001-01',
        'empresa_atendida_cidade': 'Rio de Janeiro',
        'empresa_atendida_uf': 'RJ',
        'empresa_atendida_setor_cnae': 'B06.0',
        'empresa_atendida_depoimento': 'Reduzimos em 70% o tempo de inspeção com maior precisão.',
        'status': 'Concluído',
        'pode_ser_divulgado': True,
        'data_inicio': '2024-01-01',
        'data_fim': '2025-06-30',
        'valor_total': 3100000.00,
        'equipe_ids': [TEAM_IDS['TEAM_II_1'], TEAM_IDS['TEAM_II_2']],
        'infraestrutura_ids': [INFRA_IDS['LAB_II_1'], INFRA_IDS['LAB_II_2']],
        'indicadores': {'acuracia_deteccao': 98.5, 'reducao_tempo_inspecao': 70, 'falsos_positivos': 1.2},
        'licoes_aprendidas': 'Dataset balanceado é crítico para performance do modelo de deep learning.',
    },
    {
        'id': PROJECT_IDS['PROJ_II_2'],
        'instituto_id': INSTITUTE_IDS['ISI_II'],
        'nome': 'Drone Autônomo para Inspeção de Linhas de Transmissão',
        'descricao': 'Desenvolvimento de drone com sistema de visão para inspeção automatizada de linhas de transmissão elétrica.',
        'trl_entrada': 4,
        'trl_saida': 6,
        'categoria_solucao_resultante': 'Sistema',
        'modalidade_fomento': 'ANEEL P&D',
        'edital_fomento': 'ANEEL P&D 2024',
        'areas_conhecimento': ['Engenharia Elétrica', 'Robótica'],
        'macroareas_pesquisa': ['Energia', 'Robótica'],
        'plataformas_tecnologicas': ['Drones', 'Visão Computacional', 'Navegação Autônoma'],
        'tematicas': ['Inspeção Remota', 'Manutenção Preditiva'],
        'parceiros': [{'nome': 'ITA', 'tipo': 'ICT'}],
        'empresa_atendida_tipo': 'Grande',
        'empresa_atendida_nome': 'CPFL Energia',
        'empresa_atendida_cnpj': '02.429.144/0001-93',
        'empresa_atendida_cidade': 'Campinas',
        'empresa_atendida_uf': 'SP',
        'empresa_atendida_setor_cnae': 'D35.1',
        'status': 'Ativo',
        'pode_ser_divulgado': True,
        'data_inicio': '2025-03-01',
        'data_fim': '2026-12-31',
        'valor_total': 2800000.00,
        'equipe_ids': [TEAM_IDS['TEAM_II_1']],
        'infraestrutura_ids': [INFRA_IDS['LAB_II_1']],
        'indicadores': {'autonomia_voo_min': 45, 'precisao_localizacao_cm': 10},
    },
    # CIS SO Project
    {
        'id': PROJECT_IDS['PROJ_SO_1'],
        'instituto_id': INSTITUTE_IDS['CIS_SO'],
        'nome': 'Transformação Digital para PMEs Industriais',
        'descricao': 'Metodologia e ferramentas para acelerar a transformação digital de pequenas e médias empresas do setor industrial.',
        'trl_entrada': 5,
        'trl_saida': 8,
        'categoria_solucao_resultante': 'Metodologia',
        'modalidade_fomento': 'SEBRAE',
        'edital_fomento': 'Programa ALI 2024',
        'areas_conhecimento': ['Administração', 'Tecnologia da Informação'],
        'macroareas_pesquisa': ['Gestão', 'Transformação Digital'],
        'plataformas_tecnologicas': ['Cloud', 'Gestão'],
        'tematicas': ['Competitividade', 'Inovação Organizacional'],
        'parceiros': [{'nome': 'SEBRAE-PR', 'tipo': 'Fomento'}],
        'empresa_atendida_tipo': 'Pequena',
        'empresa_atendida_nome': 'Metalúrgica Precision Ltda',
        'empresa_atendida_cnpj': '78.123.456/0001-00',
        'empresa_atendida_cidade': 'Curitiba',
        'empresa_atendida_uf': 'PR',
        'empresa_atendida_setor_cnae': 'C25.1',
        'empresa_atendida_depoimento': 'A metodologia nos permitiu digitalizar processos críticos em 6 meses.',
        'status': 'Concluído',
        'pode_ser_divulgado': True,
        'data_inicio': '2024-06-01',
        'data_fim': '2025-05-31',
        'valor_total': 450000.00,
        'equipe_ids': [TEAM_IDS['TEAM_SO_1']],
        'infraestrutura_ids': [INFRA_IDS['LAB_SO_1']],
        'indicadores': {'empresas_atendidas': 25, 'aumento_produtividade_medio': 22, 'nps': 92},
        'licoes_aprendidas': 'Engajamento da liderança é fator crítico de sucesso na transformação digital.',
    },
]


def _table_exists(conn, table: str) -> bool:
    r = conn.execute(text("SELECT to_regclass(:t)"), {"t": table}).scalar()
    return r is not None


def seed_for_tenant(conn, tenant_id: str) -> None:
    if not _table_exists(conn, "portfolio_projects"):
        print("Skipping portfolio_projects seed: table not present")
        return

    for proj in PORTFOLIO_PROJECTS:
        stmt = text("""
            INSERT INTO portfolio_projects (
                id, tenant_id, instituto_id, nome, descricao, trl_entrada, trl_saida,
                categoria_solucao_resultante, modalidade_fomento, edital_fomento,
                areas_conhecimento, macroareas_pesquisa, plataformas_tecnologicas,
                tematicas, parceiros, empresa_atendida_tipo, empresa_atendida_nome,
                empresa_atendida_cnpj, empresa_atendida_cidade, empresa_atendida_uf,
                empresa_atendida_setor_cnae, empresa_atendida_depoimento,
                status, pode_ser_divulgado, data_inicio, data_fim, valor_total,
                equipe_ids, infraestrutura_ids, indicadores, licoes_aprendidas,
                created_at, updated_at
            )
            SELECT
                :id, :tenant_id, :instituto_id, :nome, :descricao, :trl_entrada, :trl_saida,
                :categoria_solucao_resultante, :modalidade_fomento, :edital_fomento,
                CAST(:areas_conhecimento AS jsonb), CAST(:macroareas_pesquisa AS jsonb),
                CAST(:plataformas_tecnologicas AS jsonb), CAST(:tematicas AS jsonb),
                CAST(:parceiros AS jsonb), :empresa_atendida_tipo, :empresa_atendida_nome,
                :empresa_atendida_cnpj, :empresa_atendida_cidade, :empresa_atendida_uf,
                :empresa_atendida_setor_cnae, :empresa_atendida_depoimento,
                :status, :pode_ser_divulgado, CAST(:data_inicio AS timestamptz), CAST(:data_fim AS timestamptz), :valor_total,
                CAST(:equipe_ids AS jsonb), CAST(:infraestrutura_ids AS jsonb),
                CAST(:indicadores AS jsonb), :licoes_aprendidas,
                now(), now()
            WHERE NOT EXISTS (
                SELECT 1 FROM portfolio_projects WHERE tenant_id = :tenant_id AND id = :id
            )
        """)
        
        conn.execute(stmt, {
            'id': proj['id'],
            'tenant_id': tenant_id,
            'instituto_id': proj['instituto_id'],
            'nome': proj['nome'],
            'descricao': proj['descricao'],
            'trl_entrada': proj.get('trl_entrada'),
            'trl_saida': proj['trl_saida'],
            'categoria_solucao_resultante': proj.get('categoria_solucao_resultante'),
            'modalidade_fomento': proj.get('modalidade_fomento'),
            'edital_fomento': proj.get('edital_fomento'),
            'areas_conhecimento': json.dumps(proj.get('areas_conhecimento', [])),
            'macroareas_pesquisa': json.dumps(proj.get('macroareas_pesquisa', [])),
            'plataformas_tecnologicas': json.dumps(proj.get('plataformas_tecnologicas', [])),
            'tematicas': json.dumps(proj.get('tematicas', [])),
            'parceiros': json.dumps(proj.get('parceiros', [])),
            'empresa_atendida_tipo': proj.get('empresa_atendida_tipo'),
            'empresa_atendida_nome': proj.get('empresa_atendida_nome'),
            'empresa_atendida_cnpj': proj.get('empresa_atendida_cnpj'),
            'empresa_atendida_cidade': proj.get('empresa_atendida_cidade'),
            'empresa_atendida_uf': proj.get('empresa_atendida_uf'),
            'empresa_atendida_setor_cnae': proj.get('empresa_atendida_setor_cnae'),
            'empresa_atendida_depoimento': proj.get('empresa_atendida_depoimento'),
            'status': proj['status'],
            'pode_ser_divulgado': proj.get('pode_ser_divulgado', True),
            'data_inicio': proj.get('data_inicio'),
            'data_fim': proj.get('data_fim'),
            'valor_total': proj.get('valor_total'),
            'equipe_ids': json.dumps(proj.get('equipe_ids', [])),
            'infraestrutura_ids': json.dumps(proj.get('infraestrutura_ids', [])),
            'indicadores': json.dumps(proj.get('indicadores', {})),
            'licoes_aprendidas': proj.get('licoes_aprendidas'),
        })

    print(f"portfolio_projects seed applied for tenant: {tenant_id}")


def seed_for_tenants(conn, tenant_ids: Iterable[str]) -> None:
    for t in tenant_ids:
        seed_for_tenant(conn, t)
