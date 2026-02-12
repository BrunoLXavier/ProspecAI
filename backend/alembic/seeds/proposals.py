"""Seed Proposals and Proposal Versions

This seed creates:
- 25 proposals (5 per institute) with varying statuses
- 50 proposal versions (2 versions per proposal)

Revision ID: proposals_seed
Create Date: 2026-01-24 12:00:00
"""
from __future__ import annotations

import json
import os
from typing import Iterable
from sqlalchemy import text

# Inline stable IDs to avoid cross-module import issues in Docker
INSTITUTE_IDS = {
    'ISI_SVP': 'a1000000-0000-0000-0000-000000000001',
    'ISI_QV': 'a1000000-0000-0000-0000-000000000002',
    'ISI_BF': 'a1000000-0000-0000-0000-000000000003',
    'ISI_II': 'a1000000-0000-0000-0000-000000000004',
    'CIS_SO': 'a1000000-0000-0000-0000-000000000005',
}

FUNDING_IDS = {
    'EMBRAPII': 'f1000000-0000-0000-0000-000000000001',
    'FINEP': 'f1000000-0000-0000-0000-000000000002',
    'BNDES': 'f1000000-0000-0000-0000-000000000003',
    'CNPQ': 'f1000000-0000-0000-0000-000000000004',
    'FAPESP': 'f1000000-0000-0000-0000-000000000005',
}

USER_IDS = {
    'USER_SVP_1': 'a2000000-0000-0000-0000-000000000001',
    'USER_SVP_2': 'a2000000-0000-0000-0000-000000000002',
    'USER_SVP_3': 'a2000000-0000-0000-0000-000000000003',
    'USER_SVP_4': 'a2000000-0000-0000-0000-000000000004',
    'USER_SVP_5': 'a2000000-0000-0000-0000-000000000005',
    'USER_QV_1': 'a2000000-0000-0000-0000-000000000006',
    'USER_QV_2': 'a2000000-0000-0000-0000-000000000007',
    'USER_QV_3': 'a2000000-0000-0000-0000-000000000008',
    'USER_QV_4': 'a2000000-0000-0000-0000-000000000009',
    'USER_QV_5': 'a2000000-0000-0000-0000-000000000010',
    'USER_BF_1': 'a2000000-0000-0000-0000-000000000011',
    'USER_BF_2': 'a2000000-0000-0000-0000-000000000012',
    'USER_BF_3': 'a2000000-0000-0000-0000-000000000013',
    'USER_BF_4': 'a2000000-0000-0000-0000-000000000014',
    'USER_BF_5': 'a2000000-0000-0000-0000-000000000015',
    'USER_II_1': 'a2000000-0000-0000-0000-000000000016',
    'USER_II_2': 'a2000000-0000-0000-0000-000000000017',
    'USER_II_3': 'a2000000-0000-0000-0000-000000000018',
    'USER_II_4': 'a2000000-0000-0000-0000-000000000019',
    'USER_II_5': 'a2000000-0000-0000-0000-000000000020',
    'USER_SO_1': 'a2000000-0000-0000-0000-000000000021',
    'USER_SO_2': 'a2000000-0000-0000-0000-000000000022',
    'USER_SO_3': 'a2000000-0000-0000-0000-000000000023',
    'USER_SO_4': 'a2000000-0000-0000-0000-000000000024',
    'USER_SO_5': 'a2000000-0000-0000-0000-000000000025',
}

OPPORTUNITY_IDS = {
    'OPP_SVP_1': 'd2000000-0000-0000-0000-000000000001',
    'OPP_SVP_2': 'd2000000-0000-0000-0000-000000000002',
    'OPP_SVP_3': 'd2000000-0000-0000-0000-000000000003',
    'OPP_SVP_4': 'd2000000-0000-0000-0000-000000000004',
    'OPP_SVP_5': 'd2000000-0000-0000-0000-000000000005',
    'OPP_QV_1': 'd2000000-0000-0000-0000-000000000006',
    'OPP_QV_2': 'd2000000-0000-0000-0000-000000000007',
    'OPP_QV_3': 'd2000000-0000-0000-0000-000000000008',
    'OPP_QV_4': 'd2000000-0000-0000-0000-000000000009',
    'OPP_QV_5': 'd2000000-0000-0000-0000-000000000010',
    'OPP_BF_1': 'd2000000-0000-0000-0000-000000000011',
    'OPP_BF_2': 'd2000000-0000-0000-0000-000000000012',
    'OPP_BF_3': 'd2000000-0000-0000-0000-000000000013',
    'OPP_BF_4': 'd2000000-0000-0000-0000-000000000014',
    'OPP_BF_5': 'd2000000-0000-0000-0000-000000000015',
    'OPP_II_1': 'd2000000-0000-0000-0000-000000000016',
    'OPP_II_2': 'd2000000-0000-0000-0000-000000000017',
    'OPP_II_3': 'd2000000-0000-0000-0000-000000000018',
    'OPP_II_4': 'd2000000-0000-0000-0000-000000000019',
    'OPP_II_5': 'd2000000-0000-0000-0000-000000000020',
    'OPP_SO_1': 'd2000000-0000-0000-0000-000000000021',
    'OPP_SO_2': 'd2000000-0000-0000-0000-000000000022',
    'OPP_SO_3': 'd2000000-0000-0000-0000-000000000023',
    'OPP_SO_4': 'd2000000-0000-0000-0000-000000000024',
    'OPP_SO_5': 'd2000000-0000-0000-0000-000000000025',
}


SEED_CREATED_BY = os.getenv("SEED_CREATED_BY", "00000000-0000-0000-0000-000000000001")

# Stable IDs for proposals (25 total - 5 per institute)
PROPOSAL_IDS = {
    # Proposals for ISI SVP (5)
    'PROP_SVP_1': 'e2000000-0000-0000-0000-000000000001',
    'PROP_SVP_2': 'e2000000-0000-0000-0000-000000000002',
    'PROP_SVP_3': 'e2000000-0000-0000-0000-000000000003',
    'PROP_SVP_4': 'e2000000-0000-0000-0000-000000000004',
    'PROP_SVP_5': 'e2000000-0000-0000-0000-000000000005',
    # Proposals for ISI QV (5)
    'PROP_QV_1': 'e2000000-0000-0000-0000-000000000006',
    'PROP_QV_2': 'e2000000-0000-0000-0000-000000000007',
    'PROP_QV_3': 'e2000000-0000-0000-0000-000000000008',
    'PROP_QV_4': 'e2000000-0000-0000-0000-000000000009',
    'PROP_QV_5': 'e2000000-0000-0000-0000-000000000010',
    # Proposals for ISI B&F (5)
    'PROP_BF_1': 'e2000000-0000-0000-0000-000000000011',
    'PROP_BF_2': 'e2000000-0000-0000-0000-000000000012',
    'PROP_BF_3': 'e2000000-0000-0000-0000-000000000013',
    'PROP_BF_4': 'e2000000-0000-0000-0000-000000000014',
    'PROP_BF_5': 'e2000000-0000-0000-0000-000000000015',
    # Proposals for ISI II (5)
    'PROP_II_1': 'e2000000-0000-0000-0000-000000000016',
    'PROP_II_2': 'e2000000-0000-0000-0000-000000000017',
    'PROP_II_3': 'e2000000-0000-0000-0000-000000000018',
    'PROP_II_4': 'e2000000-0000-0000-0000-000000000019',
    'PROP_II_5': 'e2000000-0000-0000-0000-000000000020',
    # Proposals for CIS SO (5)
    'PROP_SO_1': 'e2000000-0000-0000-0000-000000000021',
    'PROP_SO_2': 'e2000000-0000-0000-0000-000000000022',
    'PROP_SO_3': 'e2000000-0000-0000-0000-000000000023',
    'PROP_SO_4': 'e2000000-0000-0000-0000-000000000024',
    'PROP_SO_5': 'e2000000-0000-0000-0000-000000000025',
}

# Stable IDs for proposal versions (50 total - 2 per proposal)
PROPOSAL_VERSION_IDS = {
    # Versions for SVP proposals
    'VER_SVP_1_V1': 'f2000000-0000-0000-0000-000000000001',
    'VER_SVP_1_V2': 'f2000000-0000-0000-0000-000000000002',
    'VER_SVP_2_V1': 'f2000000-0000-0000-0000-000000000003',
    'VER_SVP_2_V2': 'f2000000-0000-0000-0000-000000000004',
    'VER_SVP_3_V1': 'f2000000-0000-0000-0000-000000000005',
    'VER_SVP_3_V2': 'f2000000-0000-0000-0000-000000000006',
    'VER_SVP_4_V1': 'f2000000-0000-0000-0000-000000000007',
    'VER_SVP_4_V2': 'f2000000-0000-0000-0000-000000000008',
    'VER_SVP_5_V1': 'f2000000-0000-0000-0000-000000000009',
    'VER_SVP_5_V2': 'f2000000-0000-0000-0000-000000000010',
    # Versions for QV proposals
    'VER_QV_1_V1': 'f2000000-0000-0000-0000-000000000011',
    'VER_QV_1_V2': 'f2000000-0000-0000-0000-000000000012',
    'VER_QV_2_V1': 'f2000000-0000-0000-0000-000000000013',
    'VER_QV_2_V2': 'f2000000-0000-0000-0000-000000000014',
    'VER_QV_3_V1': 'f2000000-0000-0000-0000-000000000015',
    'VER_QV_3_V2': 'f2000000-0000-0000-0000-000000000016',
    'VER_QV_4_V1': 'f2000000-0000-0000-0000-000000000017',
    'VER_QV_4_V2': 'f2000000-0000-0000-0000-000000000018',
    'VER_QV_5_V1': 'f2000000-0000-0000-0000-000000000019',
    'VER_QV_5_V2': 'f2000000-0000-0000-0000-000000000020',
    # Versions for B&F proposals
    'VER_BF_1_V1': 'f2000000-0000-0000-0000-000000000021',
    'VER_BF_1_V2': 'f2000000-0000-0000-0000-000000000022',
    'VER_BF_2_V1': 'f2000000-0000-0000-0000-000000000023',
    'VER_BF_2_V2': 'f2000000-0000-0000-0000-000000000024',
    'VER_BF_3_V1': 'f2000000-0000-0000-0000-000000000025',
    'VER_BF_3_V2': 'f2000000-0000-0000-0000-000000000026',
    'VER_BF_4_V1': 'f2000000-0000-0000-0000-000000000027',
    'VER_BF_4_V2': 'f2000000-0000-0000-0000-000000000028',
    'VER_BF_5_V1': 'f2000000-0000-0000-0000-000000000029',
    'VER_BF_5_V2': 'f2000000-0000-0000-0000-000000000030',
    # Versions for II proposals
    'VER_II_1_V1': 'f2000000-0000-0000-0000-000000000031',
    'VER_II_1_V2': 'f2000000-0000-0000-0000-000000000032',
    'VER_II_2_V1': 'f2000000-0000-0000-0000-000000000033',
    'VER_II_2_V2': 'f2000000-0000-0000-0000-000000000034',
    'VER_II_3_V1': 'f2000000-0000-0000-0000-000000000035',
    'VER_II_3_V2': 'f2000000-0000-0000-0000-000000000036',
    'VER_II_4_V1': 'f2000000-0000-0000-0000-000000000037',
    'VER_II_4_V2': 'f2000000-0000-0000-0000-000000000038',
    'VER_II_5_V1': 'f2000000-0000-0000-0000-000000000039',
    'VER_II_5_V2': 'f2000000-0000-0000-0000-000000000040',
    # Versions for SO proposals
    'VER_SO_1_V1': 'f2000000-0000-0000-0000-000000000041',
    'VER_SO_1_V2': 'f2000000-0000-0000-0000-000000000042',
    'VER_SO_2_V1': 'f2000000-0000-0000-0000-000000000043',
    'VER_SO_2_V2': 'f2000000-0000-0000-0000-000000000044',
    'VER_SO_3_V1': 'f2000000-0000-0000-0000-000000000045',
    'VER_SO_3_V2': 'f2000000-0000-0000-0000-000000000046',
    'VER_SO_4_V1': 'f2000000-0000-0000-0000-000000000047',
    'VER_SO_4_V2': 'f2000000-0000-0000-0000-000000000048',
    'VER_SO_5_V1': 'f2000000-0000-0000-0000-000000000049',
    'VER_SO_5_V2': 'f2000000-0000-0000-0000-000000000050',
}

# Status options: draft, in_review, approved, submitted, rejected, archived
PROPOSALS = [
    # ISI SVP proposals (5)
    {
        'id': PROPOSAL_IDS['PROP_SVP_1'],
        'title': 'Gêmeo Digital WEG - Linha de Motores',
        'description': 'Proposta para desenvolvimento de sistema Digital Twin para linha de montagem de motores elétricos de média tensão.',
        'current_status': 'submitted',
        'opportunity_id': OPPORTUNITY_IDS['OPP_SVP_1'],
        'funding_source_id': FUNDING_IDS['EMBRAPII'],
        'owner_id': USER_IDS['USER_SVP_1'],
        'current_version': 2,
        'executive_summary': 'Sistema de simulação digital em tempo real que replica a linha de produção física, permitindo otimização de processos, previsão de falhas e redução de custos operacionais.',
        'technical_content': 'Integração de sensores IoT, modelagem 3D paramétrica, algoritmos de machine learning para previsão de qualidade e dashboard de visualização em tempo real.',
        'budget_data': {'total': 2500000, 'embrapii': 833333, 'company': 833333, 'senai': 833334, 'duration_months': 24},
        'latest_adherence_score': 0.92,
        'collaborators': [USER_IDS['USER_SVP_2'], USER_IDS['USER_SVP_3']],
        'tags': ['digital twin', 'industria 4.0', 'IoT', 'machine learning'],
        'versions': [
            {'key': 'VER_SVP_1_V1', 'version_number': 1, 'content': 'Versão inicial da proposta com escopo básico.', 'commit_message': 'Criação inicial da proposta', 'adherence_score': 0.78},
            {'key': 'VER_SVP_1_V2', 'version_number': 2, 'content': 'Versão revisada com detalhamento técnico e orçamentário.', 'commit_message': 'Revisão após feedback EMBRAPII', 'adherence_score': 0.92},
        ],
    },
    {
        'id': PROPOSAL_IDS['PROP_SVP_2'],
        'title': 'Manutenção Preditiva Embraco - Compressores',
        'description': 'Plataforma IoT para monitoramento contínuo e predição de falhas em compressores herméticos.',
        'current_status': 'in_review',
        'opportunity_id': OPPORTUNITY_IDS['OPP_SVP_2'],
        'funding_source_id': FUNDING_IDS['FINEP'],
        'owner_id': USER_IDS['USER_SVP_2'],
        'current_version': 2,
        'executive_summary': 'Sistema de monitoramento baseado em sensores de vibração, temperatura e corrente elétrica para detecção precoce de anomalias.',
        'technical_content': 'Rede de sensores wireless, edge computing, algoritmos de anomaly detection e integração com sistemas MES.',
        'budget_data': {'total': 1800000, 'finep': 1080000, 'company': 720000, 'duration_months': 18},
        'latest_adherence_score': 0.85,
        'collaborators': [USER_IDS['USER_SVP_1']],
        'tags': ['IoT', 'manutenção preditiva', 'edge computing'],
        'versions': [
            {'key': 'VER_SVP_2_V1', 'version_number': 1, 'content': 'Escopo inicial focado em vibração.', 'commit_message': 'Proposta inicial', 'adherence_score': 0.72},
            {'key': 'VER_SVP_2_V2', 'version_number': 2, 'content': 'Expansão para múltiplos sensores e edge computing.', 'commit_message': 'Ampliação do escopo', 'adherence_score': 0.85},
        ],
    },
    {
        'id': PROPOSAL_IDS['PROP_SVP_3'],
        'title': 'Célula Robótica Tupy - Acabamento de Fundidos',
        'description': 'Desenvolvimento de célula robótica colaborativa para operações de acabamento em peças fundidas.',
        'current_status': 'draft',
        'opportunity_id': OPPORTUNITY_IDS['OPP_SVP_3'],
        'funding_source_id': FUNDING_IDS['EMBRAPII'],
        'owner_id': USER_IDS['USER_SVP_3'],
        'current_version': 1,
        'executive_summary': 'Célula com robô colaborativo para rebarbação, esmerilhamento e inspeção visual automatizada.',
        'technical_content': 'Robótica colaborativa, visão computacional para controle adaptativo, sensores de força/torque.',
        'budget_data': {'total': 1200000, 'embrapii': 400000, 'company': 400000, 'senai': 400000, 'duration_months': 18},
        'latest_adherence_score': 0.68,
        'collaborators': [],
        'tags': ['robótica', 'cobot', 'fundição'],
        'versions': [
            {'key': 'VER_SVP_3_V1', 'version_number': 1, 'content': 'Rascunho inicial da proposta.', 'commit_message': 'Criação do draft', 'adherence_score': 0.68},
            {'key': 'VER_SVP_3_V2', 'version_number': 2, 'content': 'Em elaboração.', 'commit_message': 'Atualização parcial', 'adherence_score': None},
        ],
    },
    {
        'id': PROPOSAL_IDS['PROP_SVP_4'],
        'title': 'Simulação Extrusão Tigre - Polímeros',
        'description': 'Ferramenta de simulação computacional para otimização de processos de extrusão de tubos de PVC.',
        'current_status': 'approved',
        'opportunity_id': OPPORTUNITY_IDS['OPP_SVP_4'],
        'funding_source_id': FUNDING_IDS['FINEP'],
        'owner_id': USER_IDS['USER_SVP_4'],
        'current_version': 2,
        'executive_summary': 'Software de simulação com modelos reológicos avançados para predição de qualidade e otimização de parâmetros.',
        'technical_content': 'Modelagem CFD, reologia de polímeros, otimização multi-objetivo, validação experimental.',
        'budget_data': {'total': 950000, 'finep': 570000, 'company': 380000, 'duration_months': 15},
        'latest_adherence_score': 0.88,
        'collaborators': [USER_IDS['USER_SVP_5']],
        'tags': ['simulação', 'CFD', 'polímeros', 'extrusão'],
        'versions': [
            {'key': 'VER_SVP_4_V1', 'version_number': 1, 'content': 'Proposta técnica inicial.', 'commit_message': 'Versão inicial', 'adherence_score': 0.75},
            {'key': 'VER_SVP_4_V2', 'version_number': 2, 'content': 'Versão final aprovada.', 'commit_message': 'Revisão final', 'adherence_score': 0.88},
        ],
    },
    {
        'id': PROPOSAL_IDS['PROP_SVP_5'],
        'title': 'Automação Testes Schulz - Compressores de Ar',
        'description': 'Sistema automatizado de testes funcionais e de performance para compressores de ar.',
        'current_status': 'archived',
        'opportunity_id': OPPORTUNITY_IDS['OPP_SVP_5'],
        'funding_source_id': None,
        'owner_id': USER_IDS['USER_SVP_5'],
        'current_version': 2,
        'executive_summary': 'Bancada automatizada com ciclos de teste padronizados, coleta de dados e geração automática de relatórios.',
        'technical_content': 'Automação de bancada, instrumentação de vazão/pressão/temperatura, software de controle.',
        'budget_data': {'total': 650000, 'company': 650000, 'duration_months': 12},
        'latest_adherence_score': 0.95,
        'collaborators': [],
        'tags': ['automação', 'testes', 'qualidade'],
        'lessons_learned': ['Prototipagem rápida acelerou validação', 'Documentação detalhada facilitou homologação'],
        'versions': [
            {'key': 'VER_SVP_5_V1', 'version_number': 1, 'content': 'Proposta inicial.', 'commit_message': 'Criação', 'adherence_score': 0.82},
            {'key': 'VER_SVP_5_V2', 'version_number': 2, 'content': 'Versão final executada.', 'commit_message': 'Finalização', 'adherence_score': 0.95},
        ],
    },
    # ISI QV proposals (5)
    {
        'id': PROPOSAL_IDS['PROP_QV_1'],
        'title': 'Catalisadores Verdes Braskem - Biopolímeros',
        'description': 'Desenvolvimento de catalisadores sustentáveis para produção de polietileno verde.',
        'current_status': 'submitted',
        'opportunity_id': OPPORTUNITY_IDS['OPP_QV_1'],
        'funding_source_id': FUNDING_IDS['BNDES'],
        'owner_id': USER_IDS['USER_QV_1'],
        'current_version': 2,
        'executive_summary': 'Pesquisa e desenvolvimento de catalisadores baseados em materiais de fontes renováveis com alta eficiência catalítica.',
        'technical_content': 'Síntese de catalisadores, caracterização avançada, testes em planta piloto, scale-up.',
        'budget_data': {'total': 4500000, 'bndes': 2700000, 'company': 1800000, 'duration_months': 36},
        'latest_adherence_score': 0.89,
        'collaborators': [USER_IDS['USER_QV_2'], USER_IDS['USER_QV_3']],
        'tags': ['catálise', 'química verde', 'biopolímeros'],
        'versions': [
            {'key': 'VER_QV_1_V1', 'version_number': 1, 'content': 'Projeto inicial de pesquisa.', 'commit_message': 'Proposta inicial', 'adherence_score': 0.76},
            {'key': 'VER_QV_1_V2', 'version_number': 2, 'content': 'Versão revisada com plano de scale-up.', 'commit_message': 'Inclusão de plano piloto', 'adherence_score': 0.89},
        ],
    },
    {
        'id': PROPOSAL_IDS['PROP_QV_2'],
        'title': 'Etanol 2G Raízen - Otimização de Bioprocesso',
        'description': 'Otimização de enzimas e processo fermentativo para produção de etanol de segunda geração.',
        'current_status': 'approved',
        'opportunity_id': OPPORTUNITY_IDS['OPP_QV_2'],
        'funding_source_id': FUNDING_IDS['BNDES'],
        'owner_id': USER_IDS['USER_QV_2'],
        'current_version': 2,
        'executive_summary': 'Desenvolvimento de coquetel enzimático otimizado e linhagens de levedura de alto desempenho.',
        'technical_content': 'Engenharia de enzimas, evolução dirigida de leveduras, modelagem de bioprocessos.',
        'budget_data': {'total': 5200000, 'bndes': 3120000, 'company': 2080000, 'duration_months': 30},
        'latest_adherence_score': 0.91,
        'collaborators': [USER_IDS['USER_QV_1']],
        'tags': ['biotecnologia', 'etanol 2G', 'enzimas'],
        'versions': [
            {'key': 'VER_QV_2_V1', 'version_number': 1, 'content': 'Proposta conceitual.', 'commit_message': 'Draft inicial', 'adherence_score': 0.80},
            {'key': 'VER_QV_2_V2', 'version_number': 2, 'content': 'Projeto detalhado aprovado.', 'commit_message': 'Versão final', 'adherence_score': 0.91},
        ],
    },
    {
        'id': PROPOSAL_IDS['PROP_QV_3'],
        'title': 'Embalagens Biodegradáveis Natura',
        'description': 'Desenvolvimento de embalagens cosméticas 100% biodegradáveis.',
        'current_status': 'in_review',
        'opportunity_id': OPPORTUNITY_IDS['OPP_QV_3'],
        'funding_source_id': FUNDING_IDS['EMBRAPII'],
        'owner_id': USER_IDS['USER_QV_3'],
        'current_version': 2,
        'executive_summary': 'Pesquisa de materiais biodegradáveis com propriedades de barreira adequadas para cosméticos.',
        'technical_content': 'Blendas poliméricas biodegradáveis, revestimentos de barreira, testes de degradação.',
        'budget_data': {'total': 1800000, 'embrapii': 600000, 'company': 600000, 'senai': 600000, 'duration_months': 24},
        'latest_adherence_score': 0.82,
        'collaborators': [USER_IDS['USER_QV_4']],
        'tags': ['embalagens', 'biodegradável', 'sustentabilidade'],
        'versions': [
            {'key': 'VER_QV_3_V1', 'version_number': 1, 'content': 'Escopo inicial.', 'commit_message': 'Proposta inicial', 'adherence_score': 0.70},
            {'key': 'VER_QV_3_V2', 'version_number': 2, 'content': 'Versão com testes de barreira.', 'commit_message': 'Revisão técnica', 'adherence_score': 0.82},
        ],
    },
    {
        'id': PROPOSAL_IDS['PROP_QV_4'],
        'title': 'Química de Fluxo Eurofarma - Intermediários',
        'description': 'Implementação de química de fluxo contínuo para síntese de intermediários farmacêuticos.',
        'current_status': 'draft',
        'opportunity_id': OPPORTUNITY_IDS['OPP_QV_4'],
        'funding_source_id': FUNDING_IDS['CNPQ'],
        'owner_id': USER_IDS['USER_QV_4'],
        'current_version': 1,
        'executive_summary': 'Transição de processos batch para fluxo contínuo com maior segurança e eficiência.',
        'technical_content': 'Reatores de microcanais, intensificação de processos, PAT (Process Analytical Technology).',
        'budget_data': {'total': 1500000, 'cnpq': 600000, 'company': 900000, 'duration_months': 24},
        'latest_adherence_score': 0.65,
        'collaborators': [],
        'tags': ['química de fluxo', 'farmacêutico', 'processos contínuos'],
        'versions': [
            {'key': 'VER_QV_4_V1', 'version_number': 1, 'content': 'Rascunho em elaboração.', 'commit_message': 'Draft inicial', 'adherence_score': 0.65},
            {'key': 'VER_QV_4_V2', 'version_number': 2, 'content': 'Em desenvolvimento.', 'commit_message': 'Atualização', 'adherence_score': None},
        ],
    },
    {
        'id': PROPOSAL_IDS['PROP_QV_5'],
        'title': 'Tratamento Efluentes BASF - Sistema Avançado',
        'description': 'Sistema avançado de tratamento de efluentes com recuperação de produtos químicos.',
        'current_status': 'archived',
        'opportunity_id': OPPORTUNITY_IDS['OPP_QV_5'],
        'funding_source_id': FUNDING_IDS['FINEP'],
        'owner_id': USER_IDS['USER_QV_5'],
        'current_version': 2,
        'executive_summary': 'Planta de tratamento com processos oxidativos avançados e recuperação de solventes.',
        'technical_content': 'POA (Processos Oxidativos Avançados), membranas, destilação, economia circular.',
        'budget_data': {'total': 2100000, 'finep': 1260000, 'company': 840000, 'duration_months': 20},
        'latest_adherence_score': 0.94,
        'collaborators': [],
        'tags': ['efluentes', 'economia circular', 'tratamento'],
        'lessons_learned': ['Integração com processos existentes foi crítica', 'Automação reduziu custos operacionais'],
        'versions': [
            {'key': 'VER_QV_5_V1', 'version_number': 1, 'content': 'Proposta inicial.', 'commit_message': 'Criação', 'adherence_score': 0.83},
            {'key': 'VER_QV_5_V2', 'version_number': 2, 'content': 'Versão final com resultados.', 'commit_message': 'Encerramento', 'adherence_score': 0.94},
        ],
    },
    # ISI B&F proposals (5)
    {
        'id': PROPOSAL_IDS['PROP_BF_1'],
        'title': 'Fibras Agrícolas Malwee - Sustentabilidade',
        'description': 'Desenvolvimento de fibras têxteis a partir de resíduos agrícolas.',
        'current_status': 'in_review',
        'opportunity_id': OPPORTUNITY_IDS['OPP_BF_1'],
        'funding_source_id': FUNDING_IDS['CNPQ'],
        'owner_id': USER_IDS['USER_BF_1'],
        'current_version': 2,
        'executive_summary': 'Processo para extração e processamento de fibras de resíduos de cana e milho.',
        'technical_content': 'Hidrólise enzimática, fiação úmida, caracterização de fibras.',
        'budget_data': {'total': 850000, 'cnpq': 340000, 'company': 510000, 'duration_months': 18},
        'latest_adherence_score': 0.78,
        'collaborators': [USER_IDS['USER_BF_2']],
        'tags': ['fibras naturais', 'sustentabilidade', 'têxtil'],
        'versions': [
            {'key': 'VER_BF_1_V1', 'version_number': 1, 'content': 'Conceito inicial.', 'commit_message': 'Draft', 'adherence_score': 0.65},
            {'key': 'VER_BF_1_V2', 'version_number': 2, 'content': 'Versão com testes laboratoriais.', 'commit_message': 'Revisão técnica', 'adherence_score': 0.78},
        ],
    },
    {
        'id': PROPOSAL_IDS['PROP_BF_2'],
        'title': 'Tingimento Enzimático Karsten',
        'description': 'Processo de tingimento têxtil utilizando enzimas para redução de água e energia.',
        'current_status': 'draft',
        'opportunity_id': OPPORTUNITY_IDS['OPP_BF_2'],
        'funding_source_id': FUNDING_IDS['FAPESP'],
        'owner_id': USER_IDS['USER_BF_2'],
        'current_version': 1,
        'executive_summary': 'Substituição de processos químicos tradicionais por enzimáticos.',
        'technical_content': 'Enzimas lacases, processos de baixa temperatura, solidez de cor.',
        'budget_data': {'total': 720000, 'fapesp': 288000, 'company': 432000, 'duration_months': 15},
        'latest_adherence_score': 0.60,
        'collaborators': [],
        'tags': ['tingimento', 'enzimas', 'sustentabilidade'],
        'versions': [
            {'key': 'VER_BF_2_V1', 'version_number': 1, 'content': 'Proposta preliminar.', 'commit_message': 'Criação', 'adherence_score': 0.60},
            {'key': 'VER_BF_2_V2', 'version_number': 2, 'content': 'Em elaboração.', 'commit_message': 'WIP', 'adherence_score': None},
        ],
    },
    {
        'id': PROPOSAL_IDS['PROP_BF_3'],
        'title': 'Rastreabilidade Têxtil Hering - Blockchain',
        'description': 'Sistema de rastreabilidade de cadeia de suprimentos têxtil com blockchain.',
        'current_status': 'draft',
        'opportunity_id': OPPORTUNITY_IDS['OPP_BF_3'],
        'funding_source_id': FUNDING_IDS['EMBRAPII'],
        'owner_id': USER_IDS['USER_BF_3'],
        'current_version': 1,
        'executive_summary': 'Plataforma de rastreabilidade do algodão ao produto final.',
        'technical_content': 'Blockchain permissionada, IoT para rastreio, certificação digital.',
        'budget_data': {'total': 580000, 'embrapii': 193333, 'company': 193333, 'senai': 193334, 'duration_months': 12},
        'latest_adherence_score': 0.55,
        'collaborators': [],
        'tags': ['blockchain', 'rastreabilidade', 'sustentabilidade'],
        'versions': [
            {'key': 'VER_BF_3_V1', 'version_number': 1, 'content': 'Conceito inicial.', 'commit_message': 'Draft', 'adherence_score': 0.55},
            {'key': 'VER_BF_3_V2', 'version_number': 2, 'content': 'Em desenvolvimento.', 'commit_message': 'Update', 'adherence_score': None},
        ],
    },
    {
        'id': PROPOSAL_IDS['PROP_BF_4'],
        'title': 'Reciclagem Têxtil Renner - Pós-consumo',
        'description': 'Caracterização e reaproveitamento de resíduos têxteis pós-consumo.',
        'current_status': 'approved',
        'opportunity_id': OPPORTUNITY_IDS['OPP_BF_4'],
        'funding_source_id': None,
        'owner_id': USER_IDS['USER_BF_4'],
        'current_version': 2,
        'executive_summary': 'Metodologia para separação, caracterização e reciclagem de tecidos mistos.',
        'technical_content': 'Classificação automatizada, processos de reciclagem mecânica e química.',
        'budget_data': {'total': 490000, 'company': 490000, 'duration_months': 10},
        'latest_adherence_score': 0.85,
        'collaborators': [USER_IDS['USER_BF_1']],
        'tags': ['reciclagem', 'economia circular', 'têxtil'],
        'versions': [
            {'key': 'VER_BF_4_V1', 'version_number': 1, 'content': 'Proposta inicial.', 'commit_message': 'Criação', 'adherence_score': 0.72},
            {'key': 'VER_BF_4_V2', 'version_number': 2, 'content': 'Versão aprovada.', 'commit_message': 'Aprovação', 'adherence_score': 0.85},
        ],
    },
    {
        'id': PROPOSAL_IDS['PROP_BF_5'],
        'title': 'Eficiência Hídrica Döhler - Acabamento',
        'description': 'Otimização do consumo de água em processos de acabamento têxtil.',
        'current_status': 'archived',
        'opportunity_id': OPPORTUNITY_IDS['OPP_BF_5'],
        'funding_source_id': FUNDING_IDS['FINEP'],
        'owner_id': USER_IDS['USER_BF_5'],
        'current_version': 2,
        'executive_summary': 'Redução de 40% no consumo de água através de processos otimizados.',
        'technical_content': 'Reuso de água, processos de baixo banho, automação de dosagem.',
        'budget_data': {'total': 380000, 'finep': 228000, 'company': 152000, 'duration_months': 12},
        'latest_adherence_score': 0.92,
        'collaborators': [],
        'tags': ['eficiência hídrica', 'sustentabilidade', 'acabamento'],
        'lessons_learned': ['Engajamento de operadores foi essencial', 'Medição contínua garantiu resultados'],
        'versions': [
            {'key': 'VER_BF_5_V1', 'version_number': 1, 'content': 'Projeto inicial.', 'commit_message': 'Criação', 'adherence_score': 0.78},
            {'key': 'VER_BF_5_V2', 'version_number': 2, 'content': 'Projeto concluído.', 'commit_message': 'Encerramento', 'adherence_score': 0.92},
        ],
    },
    # ISI II proposals (5)
    {
        'id': PROPOSAL_IDS['PROP_II_1'],
        'title': 'Visão Computacional Petrobras - Soldas',
        'description': 'Sistema de inspeção automatizada de soldas industriais com deep learning.',
        'current_status': 'archived',
        'opportunity_id': OPPORTUNITY_IDS['OPP_II_1'],
        'funding_source_id': FUNDING_IDS['EMBRAPII'],
        'owner_id': USER_IDS['USER_II_1'],
        'current_version': 2,
        'executive_summary': 'Sistema de visão com IA para detecção de defeitos em soldas com 98% de acurácia.',
        'technical_content': 'Redes neurais convolucionais, câmeras industriais, edge computing.',
        'budget_data': {'total': 3500000, 'embrapii': 1166667, 'company': 1166667, 'senai': 1166666, 'duration_months': 24},
        'latest_adherence_score': 0.97,
        'collaborators': [USER_IDS['USER_II_2'], USER_IDS['USER_II_3']],
        'tags': ['visão computacional', 'deep learning', 'inspeção', 'soldas'],
        'lessons_learned': ['Dataset diversificado foi crucial', 'Validação em campo melhorou robustez'],
        'versions': [
            {'key': 'VER_II_1_V1', 'version_number': 1, 'content': 'Proposta técnica.', 'commit_message': 'Criação', 'adherence_score': 0.88},
            {'key': 'VER_II_1_V2', 'version_number': 2, 'content': 'Projeto finalizado com sucesso.', 'commit_message': 'Encerramento', 'adherence_score': 0.97},
        ],
    },
    {
        'id': PROPOSAL_IDS['PROP_II_2'],
        'title': 'IA Manutenção Preditiva Vale - Correias',
        'description': 'Plataforma de IA para análise de vibração em correias transportadoras.',
        'current_status': 'submitted',
        'opportunity_id': OPPORTUNITY_IDS['OPP_II_2'],
        'funding_source_id': FUNDING_IDS['FINEP'],
        'owner_id': USER_IDS['USER_II_2'],
        'current_version': 2,
        'executive_summary': 'Sistema de monitoramento com previsão de falhas em rolamentos e esteiras.',
        'technical_content': 'Sensores de vibração wireless, machine learning, dashboard operacional.',
        'budget_data': {'total': 2800000, 'finep': 1680000, 'company': 1120000, 'duration_months': 20},
        'latest_adherence_score': 0.86,
        'collaborators': [USER_IDS['USER_II_1']],
        'tags': ['manutenção preditiva', 'mineração', 'IA'],
        'versions': [
            {'key': 'VER_II_2_V1', 'version_number': 1, 'content': 'Proposta inicial.', 'commit_message': 'Draft', 'adherence_score': 0.75},
            {'key': 'VER_II_2_V2', 'version_number': 2, 'content': 'Versão submetida.', 'commit_message': 'Submissão FINEP', 'adherence_score': 0.86},
        ],
    },
    {
        'id': PROPOSAL_IDS['PROP_II_3'],
        'title': 'Digital Twin Embraer - Inspeção Aeronáutica',
        'description': 'Gêmeo digital para simulação e otimização de processos de inspeção aeronáutica.',
        'current_status': 'approved',
        'opportunity_id': OPPORTUNITY_IDS['OPP_II_3'],
        'funding_source_id': FUNDING_IDS['BNDES'],
        'owner_id': USER_IDS['USER_II_3'],
        'current_version': 2,
        'executive_summary': 'Ambiente virtual para planejamento e simulação de inspeções estruturais.',
        'technical_content': 'Modelagem 3D, realidade aumentada, integração com sistemas PLM.',
        'budget_data': {'total': 4200000, 'bndes': 2520000, 'company': 1680000, 'duration_months': 30},
        'latest_adherence_score': 0.90,
        'collaborators': [USER_IDS['USER_II_4']],
        'tags': ['digital twin', 'aeronáutica', 'inspeção'],
        'versions': [
            {'key': 'VER_II_3_V1', 'version_number': 1, 'content': 'Proposta conceitual.', 'commit_message': 'Conceito', 'adherence_score': 0.80},
            {'key': 'VER_II_3_V2', 'version_number': 2, 'content': 'Projeto detalhado aprovado.', 'commit_message': 'Aprovação BNDES', 'adherence_score': 0.90},
        ],
    },
    {
        'id': PROPOSAL_IDS['PROP_II_4'],
        'title': 'Drones Autônomos CPFL - Linhas de Transmissão',
        'description': 'Sistema de drones autônomos para inspeção de linhas de transmissão.',
        'current_status': 'in_review',
        'opportunity_id': OPPORTUNITY_IDS['OPP_II_4'],
        'funding_source_id': FUNDING_IDS['EMBRAPII'],
        'owner_id': USER_IDS['USER_II_4'],
        'current_version': 2,
        'executive_summary': 'Frota de drones com navegação autônoma e análise de imagens por IA.',
        'technical_content': 'Navegação autônoma, visão computacional, detecção de anomalias.',
        'budget_data': {'total': 2100000, 'embrapii': 700000, 'company': 700000, 'senai': 700000, 'duration_months': 18},
        'latest_adherence_score': 0.80,
        'collaborators': [USER_IDS['USER_II_5']],
        'tags': ['drones', 'energia', 'inspeção'],
        'versions': [
            {'key': 'VER_II_4_V1', 'version_number': 1, 'content': 'Proposta inicial.', 'commit_message': 'Draft', 'adherence_score': 0.68},
            {'key': 'VER_II_4_V2', 'version_number': 2, 'content': 'Versão com testes de campo.', 'commit_message': 'Revisão com PoC', 'adherence_score': 0.80},
        ],
    },
    {
        'id': PROPOSAL_IDS['PROP_II_5'],
        'title': 'Robótica Inspeção Transpetro - Dutos',
        'description': 'Robô para inspeção interna de dutos de transporte de petróleo.',
        'current_status': 'draft',
        'opportunity_id': OPPORTUNITY_IDS['OPP_II_5'],
        'funding_source_id': FUNDING_IDS['FINEP'],
        'owner_id': USER_IDS['USER_II_5'],
        'current_version': 1,
        'executive_summary': 'Robô PIG inteligente com sensores de ultrassom e navegação autônoma.',
        'technical_content': 'Robótica, sensores de espessura, mapeamento 3D interno.',
        'budget_data': {'total': 1900000, 'finep': 1140000, 'company': 760000, 'duration_months': 24},
        'latest_adherence_score': 0.62,
        'collaborators': [],
        'tags': ['robótica', 'inspeção', 'dutos'],
        'versions': [
            {'key': 'VER_II_5_V1', 'version_number': 1, 'content': 'Conceito inicial.', 'commit_message': 'Draft', 'adherence_score': 0.62},
            {'key': 'VER_II_5_V2', 'version_number': 2, 'content': 'Em desenvolvimento.', 'commit_message': 'WIP', 'adherence_score': None},
        ],
    },
    # CIS SO proposals (5)
    {
        'id': PROPOSAL_IDS['PROP_SO_1'],
        'title': 'Treinamento VR Marcopolo - Segurança',
        'description': 'Plataforma de treinamento com realidade virtual para procedimentos de segurança.',
        'current_status': 'submitted',
        'opportunity_id': OPPORTUNITY_IDS['OPP_SO_1'],
        'funding_source_id': FUNDING_IDS['EMBRAPII'],
        'owner_id': USER_IDS['USER_SO_1'],
        'current_version': 2,
        'executive_summary': 'Ambiente imersivo para treinamento de segurança em linhas de montagem.',
        'technical_content': 'VR headsets, simulação física, gamificação, analytics de aprendizado.',
        'budget_data': {'total': 680000, 'embrapii': 226667, 'company': 226667, 'senai': 226666, 'duration_months': 12},
        'latest_adherence_score': 0.83,
        'collaborators': [USER_IDS['USER_SO_2']],
        'tags': ['VR', 'treinamento', 'segurança'],
        'versions': [
            {'key': 'VER_SO_1_V1', 'version_number': 1, 'content': 'Proposta inicial.', 'commit_message': 'Draft', 'adherence_score': 0.70},
            {'key': 'VER_SO_1_V2', 'version_number': 2, 'content': 'Versão submetida.', 'commit_message': 'Submissão', 'adherence_score': 0.83},
        ],
    },
    {
        'id': PROPOSAL_IDS['PROP_SO_2'],
        'title': 'Dashboard BI Tramontina - Produção',
        'description': 'Plataforma de Business Intelligence para indicadores de produção.',
        'current_status': 'archived',
        'opportunity_id': OPPORTUNITY_IDS['OPP_SO_2'],
        'funding_source_id': None,
        'owner_id': USER_IDS['USER_SO_2'],
        'current_version': 2,
        'executive_summary': 'Dashboard interativo com KPIs de produtividade, qualidade e eficiência.',
        'technical_content': 'ETL, data warehouse, Power BI customizado.',
        'budget_data': {'total': 320000, 'company': 320000, 'duration_months': 8},
        'latest_adherence_score': 0.95,
        'collaborators': [],
        'tags': ['BI', 'analytics', 'produção'],
        'lessons_learned': ['Envolvimento de usuários finais foi essencial', 'Iterações rápidas melhoraram adoção'],
        'versions': [
            {'key': 'VER_SO_2_V1', 'version_number': 1, 'content': 'Projeto inicial.', 'commit_message': 'Criação', 'adherence_score': 0.80},
            {'key': 'VER_SO_2_V2', 'version_number': 2, 'content': 'Projeto concluído.', 'commit_message': 'Encerramento', 'adherence_score': 0.95},
        ],
    },
    {
        'id': PROPOSAL_IDS['PROP_SO_3'],
        'title': 'Lean Digital Randon - Gestão',
        'description': 'Metodologia de gestão lean com ferramentas digitais integradas.',
        'current_status': 'in_review',
        'opportunity_id': OPPORTUNITY_IDS['OPP_SO_3'],
        'funding_source_id': FUNDING_IDS['FINEP'],
        'owner_id': USER_IDS['USER_SO_3'],
        'current_version': 2,
        'executive_summary': 'Digitalização de práticas lean manufacturing com monitoramento em tempo real.',
        'technical_content': 'Kanban digital, andon eletrônico, dashboards de OEE.',
        'budget_data': {'total': 420000, 'finep': 252000, 'company': 168000, 'duration_months': 10},
        'latest_adherence_score': 0.75,
        'collaborators': [USER_IDS['USER_SO_1']],
        'tags': ['lean', 'digital', 'gestão'],
        'versions': [
            {'key': 'VER_SO_3_V1', 'version_number': 1, 'content': 'Conceito inicial.', 'commit_message': 'Draft', 'adherence_score': 0.62},
            {'key': 'VER_SO_3_V2', 'version_number': 2, 'content': 'Versão com casos de uso.', 'commit_message': 'Detalhamento', 'adherence_score': 0.75},
        ],
    },
    {
        'id': PROPOSAL_IDS['PROP_SO_4'],
        'title': 'Transformação Digital Precision - PME',
        'description': 'Programa de digitalização básica para pequena indústria metalúrgica.',
        'current_status': 'draft',
        'opportunity_id': OPPORTUNITY_IDS['OPP_SO_4'],
        'funding_source_id': FUNDING_IDS['CNPQ'],
        'owner_id': USER_IDS['USER_SO_4'],
        'current_version': 1,
        'executive_summary': 'Implementação de ERP simplificado e controle de produção básico.',
        'technical_content': 'ERP cloud, controle de estoque, gestão de ordens.',
        'budget_data': {'total': 180000, 'cnpq': 72000, 'company': 108000, 'duration_months': 6},
        'latest_adherence_score': 0.55,
        'collaborators': [],
        'tags': ['transformação digital', 'PME', 'ERP'],
        'versions': [
            {'key': 'VER_SO_4_V1', 'version_number': 1, 'content': 'Proposta preliminar.', 'commit_message': 'Draft', 'adherence_score': 0.55},
            {'key': 'VER_SO_4_V2', 'version_number': 2, 'content': 'Em elaboração.', 'commit_message': 'WIP', 'adherence_score': None},
        ],
    },
    {
        'id': PROPOSAL_IDS['PROP_SO_5'],
        'title': 'Analytics Industrial ABC - Produção',
        'description': 'Implementação de analytics para gestão de produção industrial.',
        'current_status': 'approved',
        'opportunity_id': OPPORTUNITY_IDS['OPP_SO_5'],
        'funding_source_id': None,
        'owner_id': USER_IDS['USER_SO_5'],
        'current_version': 2,
        'executive_summary': 'Sistema de análise de dados de produção com predição de gargalos.',
        'technical_content': 'Coleta de dados MES, machine learning, visualização.',
        'budget_data': {'total': 280000, 'company': 280000, 'duration_months': 8},
        'latest_adherence_score': 0.82,
        'collaborators': [],
        'tags': ['analytics', 'produção', 'IA'],
        'versions': [
            {'key': 'VER_SO_5_V1', 'version_number': 1, 'content': 'Proposta inicial.', 'commit_message': 'Criação', 'adherence_score': 0.70},
            {'key': 'VER_SO_5_V2', 'version_number': 2, 'content': 'Versão aprovada.', 'commit_message': 'Aprovação', 'adherence_score': 0.82},
        ],
    },
]


# Map proposal prefix to institute_id for seeding
_PROP_INSTITUTE_MAP = {
    'PROP_SVP_': INSTITUTE_IDS['ISI_SVP'],
    'PROP_QV_': INSTITUTE_IDS['ISI_QV'],
    'PROP_BF_': INSTITUTE_IDS['ISI_BF'],
    'PROP_II_': INSTITUTE_IDS['ISI_II'],
    'PROP_SO_': INSTITUTE_IDS['CIS_SO'],
}


def _resolve_prop_institute(prop_id_value: str) -> str | None:
    """Resolve institute_id from proposal stable ID."""
    for _prefix, _inst_id in _PROP_INSTITUTE_MAP.items():
        prop_key = next((k for k, v in PROPOSAL_IDS.items() if v == prop_id_value), None)
        if prop_key and prop_key.startswith(_prefix):
            return _inst_id
    return None


def _table_exists(conn, table: str) -> bool:
    r = conn.execute(text("SELECT to_regclass(:t)"), {"t": table}).scalar()
    return r is not None


def seed_proposals(conn, tenant_id: str) -> None:
    if not _table_exists(conn, "proposals"):
        print("Skipping proposals seed: table not present")
        return

    for p in PROPOSALS:
        inst_id = _resolve_prop_institute(p['id'])

        stmt = text("""
            INSERT INTO proposals (
                id, tenant_id, title, description, current_status,
                opportunity_id, funding_source_id, owner_id, institute_id,
                current_version, executive_summary, technical_content,
                budget_data, latest_adherence_score, collaborators, tags,
                lessons_learned, created_by, updated_by, created_at, updated_at
            )
            SELECT
                :id, :tenant_id, :title, :description, :current_status,
                :opportunity_id, :funding_source_id, :owner_id, :institute_id,
                :current_version, :executive_summary, :technical_content,
                CAST(:budget_data AS jsonb), :latest_adherence_score,
                CAST(:collaborators AS jsonb), CAST(:tags AS jsonb),
                CAST(:lessons_learned AS jsonb),
                :created_by, :updated_by, now(), now()
            WHERE NOT EXISTS (
                SELECT 1 FROM proposals WHERE tenant_id = :tenant_id AND id = :id
            )
        """)
        
        conn.execute(stmt, {
            'id': p['id'],
            'tenant_id': tenant_id,
            'title': p['title'],
            'description': p.get('description', ''),
            'current_status': p['current_status'],
            'opportunity_id': p.get('opportunity_id'),
            'funding_source_id': p.get('funding_source_id'),
            'owner_id': p.get('owner_id'),
            'institute_id': inst_id,
            'current_version': p.get('current_version', 1),
            'executive_summary': p.get('executive_summary', ''),
            'technical_content': p.get('technical_content', ''),
            'budget_data': json.dumps(p.get('budget_data', {})),
            'latest_adherence_score': p.get('latest_adherence_score'),
            'collaborators': json.dumps(p.get('collaborators', [])),
            'tags': json.dumps(p.get('tags', [])),
            'lessons_learned': json.dumps(p.get('lessons_learned', [])),
            'created_by': SEED_CREATED_BY,
            'updated_by': SEED_CREATED_BY,
        })

        # Backfill institute_id for existing rows that have NULL
        if inst_id:
            conn.execute(text("""
                UPDATE proposals
                SET institute_id = :institute_id, updated_at = now()
                WHERE id = :id AND tenant_id = :tenant_id
                  AND institute_id IS NULL
            """), {
                'id': p['id'],
                'tenant_id': tenant_id,
                'institute_id': inst_id,
            })

    print(f"proposals seed applied for tenant: {tenant_id} ({len(PROPOSALS)} proposals)")


def seed_proposal_versions(conn, tenant_id: str) -> None:
    if not _table_exists(conn, "proposal_versions"):
        print("Skipping proposal_versions seed: table not present")
        return

    versions_count = 0
    for p in PROPOSALS:
        for v in p.get('versions', []):
            version_id = PROPOSAL_VERSION_IDS.get(v['key'])
            if not version_id:
                continue
                
            parent_version_id = None
            if v['version_number'] > 1:
                # Find parent version
                parent_key = v['key'].replace(f"_V{v['version_number']}", f"_V{v['version_number']-1}")
                parent_version_id = PROPOSAL_VERSION_IDS.get(parent_key)
            
            # Build content as JSON
            version_content = {
                'title': p['title'],
                'content': v['content'],
                'commit_message': v['commit_message'],
                'adherence_score': v.get('adherence_score'),
                'parent_version_id': parent_version_id,
            }
            
            stmt = text("""
                INSERT INTO proposal_versions (
                    id, proposal_id, version, content, created_at, created_by
                )
                SELECT
                    :id, :proposal_id, :version, CAST(:content AS jsonb), now(), :created_by
                WHERE NOT EXISTS (
                    SELECT 1 FROM proposal_versions WHERE id = :id
                )
            """)
            
            conn.execute(stmt, {
                'id': version_id,
                'proposal_id': p['id'],
                'version': v['version_number'],
                'content': json.dumps(version_content),
                'created_by': SEED_CREATED_BY,
            })
            versions_count += 1

    print(f"proposal_versions seed applied for tenant: {tenant_id} ({versions_count} versions)")


def seed_for_tenant(conn, tenant_id: str) -> None:
    seed_proposals(conn, tenant_id)
    seed_proposal_versions(conn, tenant_id)


def seed_for_tenants(conn, tenant_ids: Iterable[str]) -> None:
    for t in tenant_ids:
        seed_for_tenant(conn, t)
