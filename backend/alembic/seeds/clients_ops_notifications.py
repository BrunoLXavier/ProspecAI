"""Seed Clients, Opportunities, and Notification Templates

This seed creates:
- 25 clients (5 per institute region) with encrypted PII
- 25 opportunities (5 per institute) with pipeline stages
- 5 notification templates for system events

Revision ID: clients_ops_notifications_seed
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


SEED_CREATED_BY = os.getenv("SEED_CREATED_BY", "00000000-0000-0000-0000-000000000001")

# Stable IDs for clients (25 total - 5 per institute/region)
CLIENT_IDS = {
    # Clients for ISI SVP region (SC)
    'CLIENT_SVP_1': 'c2000000-0000-0000-0000-000000000001',
    'CLIENT_SVP_2': 'c2000000-0000-0000-0000-000000000002',
    'CLIENT_SVP_3': 'c2000000-0000-0000-0000-000000000003',
    'CLIENT_SVP_4': 'c2000000-0000-0000-0000-000000000004',
    'CLIENT_SVP_5': 'c2000000-0000-0000-0000-000000000005',
    # Clients for ISI QV region (SP)
    'CLIENT_QV_1': 'c2000000-0000-0000-0000-000000000006',
    'CLIENT_QV_2': 'c2000000-0000-0000-0000-000000000007',
    'CLIENT_QV_3': 'c2000000-0000-0000-0000-000000000008',
    'CLIENT_QV_4': 'c2000000-0000-0000-0000-000000000009',
    'CLIENT_QV_5': 'c2000000-0000-0000-0000-000000000010',
    # Clients for ISI B&F region (SC)
    'CLIENT_BF_1': 'c2000000-0000-0000-0000-000000000011',
    'CLIENT_BF_2': 'c2000000-0000-0000-0000-000000000012',
    'CLIENT_BF_3': 'c2000000-0000-0000-0000-000000000013',
    'CLIENT_BF_4': 'c2000000-0000-0000-0000-000000000014',
    'CLIENT_BF_5': 'c2000000-0000-0000-0000-000000000015',
    # Clients for ISI II region (RJ/SP)
    'CLIENT_II_1': 'c2000000-0000-0000-0000-000000000016',
    'CLIENT_II_2': 'c2000000-0000-0000-0000-000000000017',
    'CLIENT_II_3': 'c2000000-0000-0000-0000-000000000018',
    'CLIENT_II_4': 'c2000000-0000-0000-0000-000000000019',
    'CLIENT_II_5': 'c2000000-0000-0000-0000-000000000020',
    # Clients for CIS SO region (RS)
    'CLIENT_SO_1': 'c2000000-0000-0000-0000-000000000021',
    'CLIENT_SO_2': 'c2000000-0000-0000-0000-000000000022',
    'CLIENT_SO_3': 'c2000000-0000-0000-0000-000000000023',
    'CLIENT_SO_4': 'c2000000-0000-0000-0000-000000000024',
    'CLIENT_SO_5': 'c2000000-0000-0000-0000-000000000025',
}

# Stable IDs for opportunities
OPPORTUNITY_IDS = {
    # Opportunities for ISI SVP (5)
    'OPP_SVP_1': 'd2000000-0000-0000-0000-000000000001',
    'OPP_SVP_2': 'd2000000-0000-0000-0000-000000000002',
    'OPP_SVP_3': 'd2000000-0000-0000-0000-000000000003',
    'OPP_SVP_4': 'd2000000-0000-0000-0000-000000000004',
    'OPP_SVP_5': 'd2000000-0000-0000-0000-000000000005',
    # Opportunities for ISI QV (5)
    'OPP_QV_1': 'd2000000-0000-0000-0000-000000000006',
    'OPP_QV_2': 'd2000000-0000-0000-0000-000000000007',
    'OPP_QV_3': 'd2000000-0000-0000-0000-000000000008',
    'OPP_QV_4': 'd2000000-0000-0000-0000-000000000009',
    'OPP_QV_5': 'd2000000-0000-0000-0000-000000000010',
    # Opportunities for ISI B&F (5)
    'OPP_BF_1': 'd2000000-0000-0000-0000-000000000011',
    'OPP_BF_2': 'd2000000-0000-0000-0000-000000000012',
    'OPP_BF_3': 'd2000000-0000-0000-0000-000000000013',
    'OPP_BF_4': 'd2000000-0000-0000-0000-000000000014',
    'OPP_BF_5': 'd2000000-0000-0000-0000-000000000015',
    # Opportunities for ISI II (5)
    'OPP_II_1': 'd2000000-0000-0000-0000-000000000016',
    'OPP_II_2': 'd2000000-0000-0000-0000-000000000017',
    'OPP_II_3': 'd2000000-0000-0000-0000-000000000018',
    'OPP_II_4': 'd2000000-0000-0000-0000-000000000019',
    'OPP_II_5': 'd2000000-0000-0000-0000-000000000020',
    # Opportunities for CIS SO (5)
    'OPP_SO_1': 'd2000000-0000-0000-0000-000000000021',
    'OPP_SO_2': 'd2000000-0000-0000-0000-000000000022',
    'OPP_SO_3': 'd2000000-0000-0000-0000-000000000023',
    'OPP_SO_4': 'd2000000-0000-0000-0000-000000000024',
    'OPP_SO_5': 'd2000000-0000-0000-0000-000000000025',
}

# Stable IDs for notification templates
NOTIFICATION_TEMPLATE_IDS = {
    'NEW_OPPORTUNITY': 'b2000000-0000-0000-0000-000000000001',
    'PROPOSAL_UPDATE': 'b2000000-0000-0000-0000-000000000002',
    'DEADLINE_REMINDER': 'b2000000-0000-0000-0000-000000000003',
    'MATCHING_RESULT': 'b2000000-0000-0000-0000-000000000004',
    'STAGE_CHANGE': 'b2000000-0000-0000-0000-000000000005',
}

# 25 Brazilian companies as clients
CLIENTS = [
    # ISI SVP region clients (5) - Manufacturing/Automation
    {
        'id': CLIENT_IDS['CLIENT_SVP_1'],
        'institute_id': INSTITUTE_IDS['ISI_SVP'],
        'name': 'WEG Equipamentos Elétricos S.A.',
        'client_type': 'company',
        'sector': 'Máquinas e Equipamentos Elétricos',
        'size_category': 'Grande',
        'cnpj_encrypted': 'ENCRYPTED:84429695000111',  # Will be encrypted by service
        'email_encrypted': 'ENCRYPTED:inovacao@weg.net',
        'phone_encrypted': 'ENCRYPTED:+554733100100',
        'address_data': {'city': 'Jaraguá do Sul', 'state': 'SC', 'country': 'Brasil'},
        'cnpj_data_source': 'ReceitaWS',
        'detected_demands': ['automação industrial', 'eficiência energética', 'IoT'],
        'engagement_score': 8.5,
    },
    {
        'id': CLIENT_IDS['CLIENT_SVP_2'],
        'institute_id': INSTITUTE_IDS['ISI_SVP'],
        'name': 'Embraco Indústria de Compressores',
        'client_type': 'company',
        'sector': 'Refrigeração Industrial',
        'size_category': 'Grande',
        'cnpj_encrypted': 'ENCRYPTED:83099247000148',
        'email_encrypted': 'ENCRYPTED:pesquisa@embraco.com.br',
        'phone_encrypted': 'ENCRYPTED:+554732210000',
        'address_data': {'city': 'Joinville', 'state': 'SC', 'country': 'Brasil'},
        'cnpj_data_source': 'ReceitaWS',
        'detected_demands': ['compressores eficientes', 'sustentabilidade', 'manufatura 4.0'],
        'engagement_score': 7.8,
    },
    {
        'id': CLIENT_IDS['CLIENT_SVP_3'],
        'institute_id': INSTITUTE_IDS['ISI_SVP'],
        'name': 'Tupy S.A.',
        'client_type': 'company',
        'sector': 'Fundição e Metalurgia',
        'size_category': 'Grande',
        'cnpj_encrypted': 'ENCRYPTED:84683374000194',
        'email_encrypted': 'ENCRYPTED:rd@tupy.com.br',
        'phone_encrypted': 'ENCRYPTED:+554734619000',
        'address_data': {'city': 'Joinville', 'state': 'SC', 'country': 'Brasil'},
        'cnpj_data_source': 'ReceitaWS',
        'detected_demands': ['fundição de precisão', 'novos materiais', 'automação'],
        'engagement_score': 7.2,
    },
    {
        'id': CLIENT_IDS['CLIENT_SVP_4'],
        'institute_id': INSTITUTE_IDS['ISI_SVP'],
        'name': 'Tigre S.A.',
        'client_type': 'company',
        'sector': 'Materiais de Construção',
        'size_category': 'Grande',
        'cnpj_encrypted': 'ENCRYPTED:78614141000196',
        'email_encrypted': 'ENCRYPTED:inovacao@tigre.com.br',
        'phone_encrypted': 'ENCRYPTED:+554733114000',
        'address_data': {'city': 'Joinville', 'state': 'SC', 'country': 'Brasil'},
        'cnpj_data_source': 'ReceitaWS',
        'detected_demands': ['polímeros sustentáveis', 'automação de processos'],
        'engagement_score': 6.9,
    },
    {
        'id': CLIENT_IDS['CLIENT_SVP_5'],
        'institute_id': INSTITUTE_IDS['ISI_SVP'],
        'name': 'Schulz S.A.',
        'client_type': 'company',
        'sector': 'Compressores e Fundição',
        'size_category': 'Média',
        'cnpj_encrypted': 'ENCRYPTED:84693183000168',
        'email_encrypted': 'ENCRYPTED:engenharia@schulz.com.br',
        'phone_encrypted': 'ENCRYPTED:+554734618000',
        'address_data': {'city': 'Joinville', 'state': 'SC', 'country': 'Brasil'},
        'cnpj_data_source': 'ReceitaWS',
        'detected_demands': ['eficiência energética', 'digitalização'],
        'engagement_score': 6.5,
    },
    # ISI QV region clients (5) - Chemistry/Energy
    {
        'id': CLIENT_IDS['CLIENT_QV_1'],
        'institute_id': INSTITUTE_IDS['ISI_QV'],
        'name': 'Braskem S.A.',
        'client_type': 'company',
        'sector': 'Química e Petroquímica',
        'size_category': 'Grande',
        'cnpj_encrypted': 'ENCRYPTED:42150391000170',
        'email_encrypted': 'ENCRYPTED:inovacao@braskem.com.br',
        'phone_encrypted': 'ENCRYPTED:+551141434000',
        'address_data': {'city': 'São Paulo', 'state': 'SP', 'country': 'Brasil'},
        'cnpj_data_source': 'ReceitaWS',
        'detected_demands': ['química verde', 'biopolímeros', 'captura de carbono'],
        'engagement_score': 9.0,
    },
    {
        'id': CLIENT_IDS['CLIENT_QV_2'],
        'institute_id': INSTITUTE_IDS['ISI_QV'],
        'name': 'Raízen S.A.',
        'client_type': 'company',
        'sector': 'Energia e Biocombustíveis',
        'size_category': 'Grande',
        'cnpj_encrypted': 'ENCRYPTED:33453598000123',
        'email_encrypted': 'ENCRYPTED:inovacao@raizen.com.br',
        'phone_encrypted': 'ENCRYPTED:+551131382000',
        'address_data': {'city': 'São Paulo', 'state': 'SP', 'country': 'Brasil'},
        'cnpj_data_source': 'ReceitaWS',
        'detected_demands': ['etanol 2G', 'energia renovável', 'biotecnologia'],
        'engagement_score': 8.8,
    },
    {
        'id': CLIENT_IDS['CLIENT_QV_3'],
        'institute_id': INSTITUTE_IDS['ISI_QV'],
        'name': 'Natura Cosméticos S.A.',
        'client_type': 'company',
        'sector': 'Cosméticos e Higiene',
        'size_category': 'Grande',
        'cnpj_encrypted': 'ENCRYPTED:71673990000177',
        'email_encrypted': 'ENCRYPTED:pesquisa@natura.com.br',
        'phone_encrypted': 'ENCRYPTED:+551145916000',
        'address_data': {'city': 'Cajamar', 'state': 'SP', 'country': 'Brasil'},
        'cnpj_data_source': 'ReceitaWS',
        'detected_demands': ['ingredientes naturais', 'embalagens sustentáveis'],
        'engagement_score': 8.2,
    },
    {
        'id': CLIENT_IDS['CLIENT_QV_4'],
        'institute_id': INSTITUTE_IDS['ISI_QV'],
        'name': 'Eurofarma Laboratórios',
        'client_type': 'company',
        'sector': 'Farmacêutico',
        'size_category': 'Grande',
        'cnpj_encrypted': 'ENCRYPTED:61190096000192',
        'email_encrypted': 'ENCRYPTED:pd@eurofarma.com.br',
        'phone_encrypted': 'ENCRYPTED:+551139870000',
        'address_data': {'city': 'Ribeirão Preto', 'state': 'SP', 'country': 'Brasil'},
        'cnpj_data_source': 'ReceitaWS',
        'detected_demands': ['síntese química', 'biotecnologia', 'processos contínuos'],
        'engagement_score': 7.9,
    },
    {
        'id': CLIENT_IDS['CLIENT_QV_5'],
        'institute_id': INSTITUTE_IDS['ISI_QV'],
        'name': 'BASF Brasil',
        'client_type': 'company',
        'sector': 'Química',
        'size_category': 'Grande',
        'cnpj_encrypted': 'ENCRYPTED:48539407000118',
        'email_encrypted': 'ENCRYPTED:inovacao@basf.com',
        'phone_encrypted': 'ENCRYPTED:+551141974000',
        'address_data': {'city': 'São Bernardo do Campo', 'state': 'SP', 'country': 'Brasil'},
        'cnpj_data_source': 'ReceitaWS',
        'detected_demands': ['catálise', 'sustentabilidade', 'novos materiais'],
        'engagement_score': 7.5,
    },
    # ISI B&F region clients (5) - Textile/Fashion
    {
        'id': CLIENT_IDS['CLIENT_BF_1'],
        'institute_id': INSTITUTE_IDS['ISI_BF'],
        'name': 'Malwee Malhas Ltda',
        'client_type': 'company',
        'sector': 'Têxtil e Confecção',
        'size_category': 'Média',
        'cnpj_encrypted': 'ENCRYPTED:84429628000125',
        'email_encrypted': 'ENCRYPTED:sustentabilidade@malwee.com.br',
        'phone_encrypted': 'ENCRYPTED:+554733717000',
        'address_data': {'city': 'Jaraguá do Sul', 'state': 'SC', 'country': 'Brasil'},
        'cnpj_data_source': 'ReceitaWS',
        'detected_demands': ['fibras sustentáveis', 'tingimento eco', 'reciclagem'],
        'engagement_score': 7.6,
    },
    {
        'id': CLIENT_IDS['CLIENT_BF_2'],
        'institute_id': INSTITUTE_IDS['ISI_BF'],
        'name': 'Karsten S.A.',
        'client_type': 'company',
        'sector': 'Têxtil - Cama, Mesa e Banho',
        'size_category': 'Média',
        'cnpj_encrypted': 'ENCRYPTED:82640558000104',
        'email_encrypted': 'ENCRYPTED:inovacao@karsten.com.br',
        'phone_encrypted': 'ENCRYPTED:+554732219000',
        'address_data': {'city': 'Blumenau', 'state': 'SC', 'country': 'Brasil'},
        'cnpj_data_source': 'ReceitaWS',
        'detected_demands': ['processos limpos', 'qualidade de acabamento'],
        'engagement_score': 7.0,
    },
    {
        'id': CLIENT_IDS['CLIENT_BF_3'],
        'institute_id': INSTITUTE_IDS['ISI_BF'],
        'name': 'Hering S.A.',
        'client_type': 'company',
        'sector': 'Moda e Varejo',
        'size_category': 'Grande',
        'cnpj_encrypted': 'ENCRYPTED:26094103000150',
        'email_encrypted': 'ENCRYPTED:inovacao@hering.com.br',
        'phone_encrypted': 'ENCRYPTED:+554732114000',
        'address_data': {'city': 'Blumenau', 'state': 'SC', 'country': 'Brasil'},
        'cnpj_data_source': 'ReceitaWS',
        'detected_demands': ['moda circular', 'rastreabilidade', 'algodão orgânico'],
        'engagement_score': 7.3,
    },
    {
        'id': CLIENT_IDS['CLIENT_BF_4'],
        'institute_id': INSTITUTE_IDS['ISI_BF'],
        'name': 'Renner S.A.',
        'client_type': 'company',
        'sector': 'Varejo de Moda',
        'size_category': 'Grande',
        'cnpj_encrypted': 'ENCRYPTED:92754738000162',
        'email_encrypted': 'ENCRYPTED:sustentabilidade@lojasrenner.com.br',
        'phone_encrypted': 'ENCRYPTED:+555132181000',
        'address_data': {'city': 'Porto Alegre', 'state': 'RS', 'country': 'Brasil'},
        'cnpj_data_source': 'ReceitaWS',
        'detected_demands': ['economia circular', 'materiais reciclados'],
        'engagement_score': 7.1,
    },
    {
        'id': CLIENT_IDS['CLIENT_BF_5'],
        'institute_id': INSTITUTE_IDS['ISI_BF'],
        'name': 'Döhler S.A.',
        'client_type': 'company',
        'sector': 'Têxtil',
        'size_category': 'Média',
        'cnpj_encrypted': 'ENCRYPTED:84593347000138',
        'email_encrypted': 'ENCRYPTED:qualidade@dohler.com.br',
        'phone_encrypted': 'ENCRYPTED:+554734619000',
        'address_data': {'city': 'Joinville', 'state': 'SC', 'country': 'Brasil'},
        'cnpj_data_source': 'ReceitaWS',
        'detected_demands': ['eficiência hídrica', 'novos acabamentos'],
        'engagement_score': 6.8,
    },
    # ISI II region clients (5) - Industry/Inspection
    {
        'id': CLIENT_IDS['CLIENT_II_1'],
        'institute_id': INSTITUTE_IDS['ISI_II'],
        'name': 'Petrobras S.A.',
        'client_type': 'company',
        'sector': 'Óleo e Gás',
        'size_category': 'Grande',
        'cnpj_encrypted': 'ENCRYPTED:33000167000101',
        'email_encrypted': 'ENCRYPTED:cenpes@petrobras.com.br',
        'phone_encrypted': 'ENCRYPTED:+552135982000',
        'address_data': {'city': 'Rio de Janeiro', 'state': 'RJ', 'country': 'Brasil'},
        'cnpj_data_source': 'ReceitaWS',
        'detected_demands': ['inspeção não destrutiva', 'automação', 'IA industrial'],
        'engagement_score': 9.2,
    },
    {
        'id': CLIENT_IDS['CLIENT_II_2'],
        'institute_id': INSTITUTE_IDS['ISI_II'],
        'name': 'Vale S.A.',
        'client_type': 'company',
        'sector': 'Mineração',
        'size_category': 'Grande',
        'cnpj_encrypted': 'ENCRYPTED:33592510000154',
        'email_encrypted': 'ENCRYPTED:inovacao@vale.com',
        'phone_encrypted': 'ENCRYPTED:+552135431000',
        'address_data': {'city': 'Rio de Janeiro', 'state': 'RJ', 'country': 'Brasil'},
        'cnpj_data_source': 'ReceitaWS',
        'detected_demands': ['monitoramento', 'manutenção preditiva', 'robótica'],
        'engagement_score': 8.9,
    },
    {
        'id': CLIENT_IDS['CLIENT_II_3'],
        'institute_id': INSTITUTE_IDS['ISI_II'],
        'name': 'Embraer S.A.',
        'client_type': 'company',
        'sector': 'Aeroespacial',
        'size_category': 'Grande',
        'cnpj_encrypted': 'ENCRYPTED:07689002000189',
        'email_encrypted': 'ENCRYPTED:inovacao@embraer.com.br',
        'phone_encrypted': 'ENCRYPTED:+551239292000',
        'address_data': {'city': 'São José dos Campos', 'state': 'SP', 'country': 'Brasil'},
        'cnpj_data_source': 'ReceitaWS',
        'detected_demands': ['materiais compostos', 'ensaios não destrutivos', 'IA'],
        'engagement_score': 8.7,
    },
    {
        'id': CLIENT_IDS['CLIENT_II_4'],
        'institute_id': INSTITUTE_IDS['ISI_II'],
        'name': 'CPFL Energia',
        'client_type': 'company',
        'sector': 'Energia Elétrica',
        'size_category': 'Grande',
        'cnpj_encrypted': 'ENCRYPTED:02429144000193',
        'email_encrypted': 'ENCRYPTED:inovacao@cpfl.com.br',
        'phone_encrypted': 'ENCRYPTED:+551937566000',
        'address_data': {'city': 'Campinas', 'state': 'SP', 'country': 'Brasil'},
        'cnpj_data_source': 'ReceitaWS',
        'detected_demands': ['inspeção de linhas', 'drones', 'visão computacional'],
        'engagement_score': 8.0,
    },
    {
        'id': CLIENT_IDS['CLIENT_II_5'],
        'institute_id': INSTITUTE_IDS['ISI_II'],
        'name': 'Transpetro S.A.',
        'client_type': 'company',
        'sector': 'Logística de Óleo e Gás',
        'size_category': 'Grande',
        'cnpj_encrypted': 'ENCRYPTED:02709449000159',
        'email_encrypted': 'ENCRYPTED:tecnologia@transpetro.com.br',
        'phone_encrypted': 'ENCRYPTED:+552138242000',
        'address_data': {'city': 'Rio de Janeiro', 'state': 'RJ', 'country': 'Brasil'},
        'cnpj_data_source': 'ReceitaWS',
        'detected_demands': ['integridade de dutos', 'inspeção robotizada'],
        'engagement_score': 7.8,
    },
    # CIS SO region clients (5) - Services/SMEs
    {
        'id': CLIENT_IDS['CLIENT_SO_1'],
        'institute_id': INSTITUTE_IDS['CIS_SO'],
        'name': 'Marcopolo S.A.',
        'client_type': 'company',
        'sector': 'Automotivo - Ônibus',
        'size_category': 'Grande',
        'cnpj_encrypted': 'ENCRYPTED:88611835000129',
        'email_encrypted': 'ENCRYPTED:inovacao@marcopolo.com.br',
        'phone_encrypted': 'ENCRYPTED:+555432189000',
        'address_data': {'city': 'Caxias do Sul', 'state': 'RS', 'country': 'Brasil'},
        'cnpj_data_source': 'ReceitaWS',
        'detected_demands': ['digitalização', 'gestão 4.0', 'treinamento'],
        'engagement_score': 7.5,
    },
    {
        'id': CLIENT_IDS['CLIENT_SO_2'],
        'institute_id': INSTITUTE_IDS['CIS_SO'],
        'name': 'Tramontina S.A.',
        'client_type': 'company',
        'sector': 'Utilidades Domésticas',
        'size_category': 'Grande',
        'cnpj_encrypted': 'ENCRYPTED:90471600000170',
        'email_encrypted': 'ENCRYPTED:inovacao@tramontina.com.br',
        'phone_encrypted': 'ENCRYPTED:+555439074000',
        'address_data': {'city': 'Carlos Barbosa', 'state': 'RS', 'country': 'Brasil'},
        'cnpj_data_source': 'ReceitaWS',
        'detected_demands': ['produtividade', 'gestão de processos', 'analytics'],
        'engagement_score': 7.2,
    },
    {
        'id': CLIENT_IDS['CLIENT_SO_3'],
        'institute_id': INSTITUTE_IDS['CIS_SO'],
        'name': 'Randon S.A.',
        'client_type': 'company',
        'sector': 'Implementos Rodoviários',
        'size_category': 'Grande',
        'cnpj_encrypted': 'ENCRYPTED:89086144000100',
        'email_encrypted': 'ENCRYPTED:tecnologia@randon.com.br',
        'phone_encrypted': 'ENCRYPTED:+555432189000',
        'address_data': {'city': 'Caxias do Sul', 'state': 'RS', 'country': 'Brasil'},
        'cnpj_data_source': 'ReceitaWS',
        'detected_demands': ['indústria 4.0', 'capacitação', 'lean'],
        'engagement_score': 7.0,
    },
    {
        'id': CLIENT_IDS['CLIENT_SO_4'],
        'institute_id': INSTITUTE_IDS['CIS_SO'],
        'name': 'Metalúrgica Precision Ltda',
        'client_type': 'company',
        'sector': 'Metalurgia',
        'size_category': 'Pequena',
        'cnpj_encrypted': 'ENCRYPTED:78123456000100',
        'email_encrypted': 'ENCRYPTED:contato@precision.ind.br',
        'phone_encrypted': 'ENCRYPTED:+554132419000',
        'address_data': {'city': 'Curitiba', 'state': 'PR', 'country': 'Brasil'},
        'cnpj_data_source': 'ReceitaWS',
        'detected_demands': ['transformação digital', 'gestão básica', 'ERP'],
        'engagement_score': 6.0,
    },
    {
        'id': CLIENT_IDS['CLIENT_SO_5'],
        'institute_id': INSTITUTE_IDS['CIS_SO'],
        'name': 'Indústrias ABC Ltda',
        'client_type': 'company',
        'sector': 'Máquinas e Equipamentos',
        'size_category': 'Média',
        'cnpj_encrypted': 'ENCRYPTED:91234567000145',
        'email_encrypted': 'ENCRYPTED:gestao@industriasabc.com.br',
        'phone_encrypted': 'ENCRYPTED:+555432156000',
        'address_data': {'city': 'Caxias do Sul', 'state': 'RS', 'country': 'Brasil'},
        'cnpj_data_source': 'ReceitaWS',
        'detected_demands': ['BI', 'indicadores', 'dashboard'],
        'engagement_score': 6.5,
    },
]

# Pipeline stages for opportunities
STAGES = ['intelligence', 'qualification', 'proposal', 'negotiation', 'closed_won', 'closed_lost']

# Map opportunity prefix to institute_id for seeding
_OPP_INSTITUTE_MAP = {
    'OPP_SVP_': INSTITUTE_IDS['ISI_SVP'],
    'OPP_QV_': INSTITUTE_IDS['ISI_QV'],
    'OPP_BF_': INSTITUTE_IDS['ISI_BF'],
    'OPP_II_': INSTITUTE_IDS['ISI_II'],
    'OPP_SO_': INSTITUTE_IDS['CIS_SO'],
}


def _resolve_opp_institute(opp_id_value: str) -> str | None:
    """Resolve institute_id from opportunity stable ID."""
    for _prefix, _inst_id in _OPP_INSTITUTE_MAP.items():
        opp_key = next((k for k, v in OPPORTUNITY_IDS.items() if v == opp_id_value), None)
        if opp_key and opp_key.startswith(_prefix):
            return _inst_id
    return None

# 25 opportunities
OPPORTUNITIES = [
    # ISI SVP opportunities (5)
    {
        'id': OPPORTUNITY_IDS['OPP_SVP_1'],
        'title': 'Gêmeo Digital para Linha de Produção WEG',
        'description': 'Desenvolvimento de sistema de Digital Twin para otimização de linha de montagem de motores elétricos.',
        'client_id': CLIENT_IDS['CLIENT_SVP_1'],
        'funding_source_id': FUNDING_IDS['EMBRAPII'],
        'stage': 'proposal',
        'priority': 90,
        'estimated_value': 2500000.00,
        'probability': 0.75,
        'expected_close_date': '2026-04-30',
        'assigned_to': USER_IDS['USER_SVP_1'],
    },
    {
        'id': OPPORTUNITY_IDS['OPP_SVP_2'],
        'title': 'Sistema de Manutenção Preditiva Embraco',
        'description': 'Plataforma IoT para monitoramento e predição de falhas em compressores.',
        'client_id': CLIENT_IDS['CLIENT_SVP_2'],
        'funding_source_id': FUNDING_IDS['FINEP'],
        'stage': 'qualification',
        'priority': 80,
        'estimated_value': 1800000.00,
        'probability': 0.60,
        'expected_close_date': '2026-05-15',
        'assigned_to': USER_IDS['USER_SVP_2'],
    },
    {
        'id': OPPORTUNITY_IDS['OPP_SVP_3'],
        'title': 'Robótica Colaborativa Tupy',
        'description': 'Célula robótica para acabamento de peças fundidas.',
        'client_id': CLIENT_IDS['CLIENT_SVP_3'],
        'funding_source_id': FUNDING_IDS['EMBRAPII'],
        'stage': 'intelligence',
        'priority': 70,
        'estimated_value': 1200000.00,
        'probability': 0.40,
        'expected_close_date': '2026-06-30',
        'assigned_to': USER_IDS['USER_SVP_3'],
    },
    {
        'id': OPPORTUNITY_IDS['OPP_SVP_4'],
        'title': 'Simulação de Processos Tigre',
        'description': 'Ferramenta de simulação para otimização de extrusão de tubos.',
        'client_id': CLIENT_IDS['CLIENT_SVP_4'],
        'funding_source_id': FUNDING_IDS['FINEP'],
        'stage': 'negotiation',
        'priority': 85,
        'estimated_value': 950000.00,
        'probability': 0.80,
        'expected_close_date': '2026-03-31',
        'assigned_to': USER_IDS['USER_SVP_4'],
    },
    {
        'id': OPPORTUNITY_IDS['OPP_SVP_5'],
        'title': 'Automação de Testes Schulz',
        'description': 'Sistema automatizado de testes de compressores de ar.',
        'client_id': CLIENT_IDS['CLIENT_SVP_5'],
        'funding_source_id': None,
        'stage': 'closed_won',
        'priority': 75,
        'estimated_value': 650000.00,
        'probability': 1.00,
        'expected_close_date': '2025-12-15',
        'assigned_to': USER_IDS['USER_SVP_5'],
    },
    # ISI QV opportunities (5)
    {
        'id': OPPORTUNITY_IDS['OPP_QV_1'],
        'title': 'Catalisadores Sustentáveis Braskem',
        'description': 'Desenvolvimento de catalisadores para produção de biopolímeros.',
        'client_id': CLIENT_IDS['CLIENT_QV_1'],
        'funding_source_id': FUNDING_IDS['BNDES'],
        'stage': 'proposal',
        'priority': 95,
        'estimated_value': 4500000.00,
        'probability': 0.70,
        'expected_close_date': '2026-05-31',
        'assigned_to': USER_IDS['USER_QV_1'],
    },
    {
        'id': OPPORTUNITY_IDS['OPP_QV_2'],
        'title': 'Etanol 2G Raízen',
        'description': 'Otimização de processo de produção de etanol de segunda geração.',
        'client_id': CLIENT_IDS['CLIENT_QV_2'],
        'funding_source_id': FUNDING_IDS['BNDES'],
        'stage': 'negotiation',
        'priority': 92,
        'estimated_value': 5200000.00,
        'probability': 0.85,
        'expected_close_date': '2026-04-15',
        'assigned_to': USER_IDS['USER_QV_2'],
    },
    {
        'id': OPPORTUNITY_IDS['OPP_QV_3'],
        'title': 'Embalagens Biodegradáveis Natura',
        'description': 'Desenvolvimento de embalagens 100% biodegradáveis para cosméticos.',
        'client_id': CLIENT_IDS['CLIENT_QV_3'],
        'funding_source_id': FUNDING_IDS['EMBRAPII'],
        'stage': 'qualification',
        'priority': 80,
        'estimated_value': 1800000.00,
        'probability': 0.55,
        'expected_close_date': '2026-06-30',
        'assigned_to': USER_IDS['USER_QV_3'],
    },
    {
        'id': OPPORTUNITY_IDS['OPP_QV_4'],
        'title': 'Síntese Contínua Eurofarma',
        'description': 'Implementação de química de fluxo para intermediários farmacêuticos.',
        'client_id': CLIENT_IDS['CLIENT_QV_4'],
        'funding_source_id': FUNDING_IDS['CNPQ'],
        'stage': 'intelligence',
        'priority': 70,
        'estimated_value': 1500000.00,
        'probability': 0.35,
        'expected_close_date': '2026-08-31',
        'assigned_to': USER_IDS['USER_QV_4'],
    },
    {
        'id': OPPORTUNITY_IDS['OPP_QV_5'],
        'title': 'Tratamento de Efluentes BASF',
        'description': 'Sistema avançado de tratamento de efluentes químicos.',
        'client_id': CLIENT_IDS['CLIENT_QV_5'],
        'funding_source_id': FUNDING_IDS['FINEP'],
        'stage': 'closed_won',
        'priority': 85,
        'estimated_value': 2100000.00,
        'probability': 1.00,
        'expected_close_date': '2025-11-30',
        'assigned_to': USER_IDS['USER_QV_5'],
    },
    # ISI B&F opportunities (5)
    {
        'id': OPPORTUNITY_IDS['OPP_BF_1'],
        'title': 'Fibras Sustentáveis Malwee',
        'description': 'Desenvolvimento de fibras têxteis a partir de resíduos agrícolas.',
        'client_id': CLIENT_IDS['CLIENT_BF_1'],
        'funding_source_id': FUNDING_IDS['CNPQ'],
        'stage': 'proposal',
        'priority': 75,
        'estimated_value': 850000.00,
        'probability': 0.65,
        'expected_close_date': '2026-05-15',
        'assigned_to': USER_IDS['USER_BF_1'],
    },
    {
        'id': OPPORTUNITY_IDS['OPP_BF_2'],
        'title': 'Tingimento Enzimático Karsten',
        'description': 'Processo de tingimento com enzimas para redução do consumo de água.',
        'client_id': CLIENT_IDS['CLIENT_BF_2'],
        'funding_source_id': FUNDING_IDS['FAPESP'],
        'stage': 'qualification',
        'priority': 70,
        'estimated_value': 720000.00,
        'probability': 0.50,
        'expected_close_date': '2026-06-30',
        'assigned_to': USER_IDS['USER_BF_2'],
    },
    {
        'id': OPPORTUNITY_IDS['OPP_BF_3'],
        'title': 'Rastreabilidade Têxtil Hering',
        'description': 'Sistema de rastreabilidade de cadeia de suprimentos têxtil.',
        'client_id': CLIENT_IDS['CLIENT_BF_3'],
        'funding_source_id': FUNDING_IDS['EMBRAPII'],
        'stage': 'intelligence',
        'priority': 65,
        'estimated_value': 580000.00,
        'probability': 0.40,
        'expected_close_date': '2026-07-31',
        'assigned_to': USER_IDS['USER_BF_3'],
    },
    {
        'id': OPPORTUNITY_IDS['OPP_BF_4'],
        'title': 'Materiais Reciclados Renner',
        'description': 'Caracterização e aproveitamento de resíduos têxteis pós-consumo.',
        'client_id': CLIENT_IDS['CLIENT_BF_4'],
        'funding_source_id': None,
        'stage': 'negotiation',
        'priority': 78,
        'estimated_value': 490000.00,
        'probability': 0.75,
        'expected_close_date': '2026-04-30',
        'assigned_to': USER_IDS['USER_BF_4'],
    },
    {
        'id': OPPORTUNITY_IDS['OPP_BF_5'],
        'title': 'Eficiência Hídrica Döhler',
        'description': 'Otimização do consumo de água em processos de acabamento têxtil.',
        'client_id': CLIENT_IDS['CLIENT_BF_5'],
        'funding_source_id': FUNDING_IDS['FINEP'],
        'stage': 'closed_won',
        'priority': 72,
        'estimated_value': 380000.00,
        'probability': 1.00,
        'expected_close_date': '2025-10-31',
        'assigned_to': USER_IDS['USER_BF_5'],
    },
    # ISI II opportunities (5)
    {
        'id': OPPORTUNITY_IDS['OPP_II_1'],
        'title': 'Visão Computacional para Soldas Petrobras',
        'description': 'Sistema de inspeção automatizada de soldas com deep learning.',
        'client_id': CLIENT_IDS['CLIENT_II_1'],
        'funding_source_id': FUNDING_IDS['EMBRAPII'],
        'stage': 'closed_won',
        'priority': 98,
        'estimated_value': 3500000.00,
        'probability': 1.00,
        'expected_close_date': '2025-09-30',
        'assigned_to': USER_IDS['USER_II_1'],
    },
    {
        'id': OPPORTUNITY_IDS['OPP_II_2'],
        'title': 'Manutenção Preditiva Vale',
        'description': 'Plataforma de IA para análise de vibração em correias transportadoras.',
        'client_id': CLIENT_IDS['CLIENT_II_2'],
        'funding_source_id': FUNDING_IDS['FINEP'],
        'stage': 'proposal',
        'priority': 90,
        'estimated_value': 2800000.00,
        'probability': 0.70,
        'expected_close_date': '2026-05-31',
        'assigned_to': USER_IDS['USER_II_2'],
    },
    {
        'id': OPPORTUNITY_IDS['OPP_II_3'],
        'title': 'Digital Twin Inspeção Embraer',
        'description': 'Gêmeo digital para simulação de processos de inspeção aeronáutica.',
        'client_id': CLIENT_IDS['CLIENT_II_3'],
        'funding_source_id': FUNDING_IDS['BNDES'],
        'stage': 'negotiation',
        'priority': 92,
        'estimated_value': 4200000.00,
        'probability': 0.80,
        'expected_close_date': '2026-04-15',
        'assigned_to': USER_IDS['USER_II_3'],
    },
    {
        'id': OPPORTUNITY_IDS['OPP_II_4'],
        'title': 'Drones Inspeção CPFL',
        'description': 'Sistema de drones autônomos para inspeção de linhas de transmissão.',
        'client_id': CLIENT_IDS['CLIENT_II_4'],
        'funding_source_id': FUNDING_IDS['EMBRAPII'],
        'stage': 'qualification',
        'priority': 82,
        'estimated_value': 2100000.00,
        'probability': 0.55,
        'expected_close_date': '2026-06-30',
        'assigned_to': USER_IDS['USER_II_4'],
    },
    {
        'id': OPPORTUNITY_IDS['OPP_II_5'],
        'title': 'Robótica de Inspeção Transpetro',
        'description': 'Robô para inspeção interna de dutos de transporte de petróleo.',
        'client_id': CLIENT_IDS['CLIENT_II_5'],
        'funding_source_id': FUNDING_IDS['FINEP'],
        'stage': 'intelligence',
        'priority': 75,
        'estimated_value': 1900000.00,
        'probability': 0.45,
        'expected_close_date': '2026-08-31',
        'assigned_to': USER_IDS['USER_II_5'],
    },
    # CIS SO opportunities (5)
    {
        'id': OPPORTUNITY_IDS['OPP_SO_1'],
        'title': 'Treinamento VR Marcopolo',
        'description': 'Plataforma de treinamento com realidade virtual para segurança.',
        'client_id': CLIENT_IDS['CLIENT_SO_1'],
        'funding_source_id': FUNDING_IDS['EMBRAPII'],
        'stage': 'proposal',
        'priority': 78,
        'estimated_value': 680000.00,
        'probability': 0.65,
        'expected_close_date': '2026-05-15',
        'assigned_to': USER_IDS['USER_SO_1'],
    },
    {
        'id': OPPORTUNITY_IDS['OPP_SO_2'],
        'title': 'Dashboard Gestão Tramontina',
        'description': 'Plataforma de BI para indicadores de produção.',
        'client_id': CLIENT_IDS['CLIENT_SO_2'],
        'funding_source_id': None,
        'stage': 'closed_won',
        'priority': 70,
        'estimated_value': 320000.00,
        'probability': 1.00,
        'expected_close_date': '2025-11-30',
        'assigned_to': USER_IDS['USER_SO_2'],
    },
    {
        'id': OPPORTUNITY_IDS['OPP_SO_3'],
        'title': 'Lean Digital Randon',
        'description': 'Metodologia de gestão lean com ferramentas digitais.',
        'client_id': CLIENT_IDS['CLIENT_SO_3'],
        'funding_source_id': FUNDING_IDS['FINEP'],
        'stage': 'qualification',
        'priority': 68,
        'estimated_value': 420000.00,
        'probability': 0.50,
        'expected_close_date': '2026-06-30',
        'assigned_to': USER_IDS['USER_SO_3'],
    },
    {
        'id': OPPORTUNITY_IDS['OPP_SO_4'],
        'title': 'Transformação Digital PME Precision',
        'description': 'Programa de digitalização para pequena indústria metalúrgica.',
        'client_id': CLIENT_IDS['CLIENT_SO_4'],
        'funding_source_id': FUNDING_IDS['CNPQ'],
        'stage': 'intelligence',
        'priority': 55,
        'estimated_value': 180000.00,
        'probability': 0.35,
        'expected_close_date': '2026-08-31',
        'assigned_to': USER_IDS['USER_SO_4'],
    },
    {
        'id': OPPORTUNITY_IDS['OPP_SO_5'],
        'title': 'Analytics Industrial ABC',
        'description': 'Implementação de analytics para gestão de produção.',
        'client_id': CLIENT_IDS['CLIENT_SO_5'],
        'funding_source_id': None,
        'stage': 'negotiation',
        'priority': 65,
        'estimated_value': 280000.00,
        'probability': 0.70,
        'expected_close_date': '2026-04-30',
        'assigned_to': USER_IDS['USER_SO_5'],
    },
]

# 5 Notification Templates
NOTIFICATION_TEMPLATES = [
    {
        'id': NOTIFICATION_TEMPLATE_IDS['NEW_OPPORTUNITY'],
        'name': 'new_opportunity',
        'subject': 'Nova Oportunidade Identificada',
        'body': 'Uma nova oportunidade foi identificada: {{opportunity_title}}. '
                'Cliente: {{client_name}}. Valor estimado: R$ {{estimated_value}}. '
                'Acesse o sistema para mais detalhes.',
    },
    {
        'id': NOTIFICATION_TEMPLATE_IDS['PROPOSAL_UPDATE'],
        'name': 'proposal_update',
        'subject': 'Atualização de Proposta',
        'body': 'A proposta {{proposal_title}} foi atualizada. '
                'Novo status: {{status}}. '
                'Por favor, revise as alterações.',
    },
    {
        'id': NOTIFICATION_TEMPLATE_IDS['DEADLINE_REMINDER'],
        'name': 'deadline_reminder',
        'subject': 'Lembrete de Prazo - {{days_remaining}} dias restantes',
        'body': 'O prazo para {{item_type}} "{{item_title}}" está se aproximando. '
                'Data limite: {{deadline_date}}. '
                'Restam {{days_remaining}} dias.',
    },
    {
        'id': NOTIFICATION_TEMPLATE_IDS['MATCHING_RESULT'],
        'name': 'matching_result',
        'subject': 'Resultado de Matching Disponível',
        'body': 'O matching entre {{source_type}} e {{target_type}} foi concluído. '
                'Score de aderência: {{matching_score}}%. '
                'Acesse o relatório completo no sistema.',
    },
    {
        'id': NOTIFICATION_TEMPLATE_IDS['STAGE_CHANGE'],
        'name': 'stage_change',
        'subject': 'Mudança de Estágio - {{opportunity_title}}',
        'body': 'A oportunidade "{{opportunity_title}}" avançou para o estágio {{new_stage}}. '
                'Estágio anterior: {{old_stage}}. '
                'Próximas ações: {{next_actions}}.',
    },
]


def _table_exists(conn, table: str) -> bool:
    r = conn.execute(text("SELECT to_regclass(:t)"), {"t": table}).scalar()
    return r is not None


def seed_clients(conn, tenant_id: str) -> None:
    if not _table_exists(conn, "clients"):
        print("Skipping clients seed: table not present")
        return

    for c in CLIENTS:
        # Insert if not exists
        stmt = text("""
            INSERT INTO clients (
                id, tenant_id, name, client_type, sector, size_category,
                institute_id,
                cnpj_encrypted, email_encrypted, phone_encrypted, address_data,
                cnpj_data_source, detected_demands, engagement_score,
                created_by, updated_by, created_at, updated_at
            )
            SELECT
                :id, :tenant_id, :name, :client_type, :sector, :size_category,
                :institute_id,
                :cnpj_encrypted, :email_encrypted, :phone_encrypted, 
                CAST(:address_data AS jsonb), :cnpj_data_source,
                CAST(:detected_demands AS jsonb), :engagement_score,
                :created_by, :updated_by, now(), now()
            WHERE NOT EXISTS (
                SELECT 1 FROM clients WHERE tenant_id = :tenant_id AND id = :id
            )
        """)

        params = {
            'id': c['id'],
            'tenant_id': tenant_id,
            'name': c['name'],
            'client_type': c['client_type'],
            'sector': c['sector'],
            'size_category': c.get('size_category', 'Média'),
            'institute_id': c.get('institute_id'),
            'cnpj_encrypted': c.get('cnpj_encrypted', ''),
            'email_encrypted': c.get('email_encrypted', ''),
            'phone_encrypted': c.get('phone_encrypted', ''),
            'address_data': json.dumps(c.get('address_data', {})),
            'cnpj_data_source': c.get('cnpj_data_source', ''),
            'detected_demands': json.dumps(c.get('detected_demands', [])),
            'engagement_score': c.get('engagement_score', 5.0),
            'created_by': SEED_CREATED_BY,
            'updated_by': SEED_CREATED_BY,
        }
        conn.execute(stmt, params)

        # Backfill institute_id for existing rows that have NULL
        if c.get('institute_id'):
            conn.execute(text("""
                UPDATE clients
                SET institute_id = :institute_id, updated_at = now()
                WHERE id = :id AND tenant_id = :tenant_id
                  AND institute_id IS NULL
            """), {
                'id': c['id'],
                'tenant_id': tenant_id,
                'institute_id': c['institute_id'],
            })

    print(f"clients seed applied for tenant: {tenant_id} ({len(CLIENTS)} clients)")


def seed_opportunities(conn, tenant_id: str) -> None:
    if not _table_exists(conn, "opportunities"):
        print("Skipping opportunities seed: table not present")
        return

    for o in OPPORTUNITIES:
        # Resolve institute_id from opportunity ID mapping
        inst_id = _resolve_opp_institute(o['id'])

        stmt = text("""
            INSERT INTO opportunities (
                id, tenant_id, title, description, client_id, funding_source_id,
                institute_id,
                stage, priority, estimated_value, probability, expected_close_date,
                assigned_to, created_by, updated_by, created_at, updated_at
            )
            SELECT
                :id, :tenant_id, :title, :description, :client_id, :funding_source_id,
                :institute_id,
                :stage, :priority, :estimated_value, :probability,
                CAST(:expected_close_date AS timestamptz), :assigned_to,
                :created_by, :updated_by, now(), now()
            WHERE NOT EXISTS (
                SELECT 1 FROM opportunities WHERE tenant_id = :tenant_id AND id = :id
            )
        """)

        params = {
            'id': o['id'],
            'tenant_id': tenant_id,
            'title': o['title'],
            'description': o['description'],
            'client_id': o.get('client_id'),
            'funding_source_id': o.get('funding_source_id'),
            'institute_id': inst_id,
            'stage': o['stage'],
            'priority': o.get('priority', 50),
            'estimated_value': o.get('estimated_value', 0),
            'probability': o.get('probability', 0.5),
            'expected_close_date': o.get('expected_close_date'),
            'assigned_to': o.get('assigned_to'),
            'created_by': SEED_CREATED_BY,
            'updated_by': SEED_CREATED_BY,
        }
        conn.execute(stmt, params)

        # Backfill institute_id for existing rows that have NULL
        if inst_id:
            conn.execute(text("""
                UPDATE opportunities
                SET institute_id = :institute_id, updated_at = now()
                WHERE id = :id AND tenant_id = :tenant_id
                  AND institute_id IS NULL
            """), {
                'id': o['id'],
                'tenant_id': tenant_id,
                'institute_id': inst_id,
            })

    print(f"opportunities seed applied for tenant: {tenant_id} ({len(OPPORTUNITIES)} opportunities)")


def seed_notifications(conn, tenant_id: str) -> None:
    if not _table_exists(conn, "notification_templates"):
        print("Skipping notification_templates seed: table not present")
        return

    for n in NOTIFICATION_TEMPLATES:
        stmt = text("""
            INSERT INTO notification_templates (
                id, tenant_id, name, subject, body,
                created_by, updated_by, created_at, updated_at
            )
            SELECT
                :id, :tenant_id, :name, :subject, :body,
                :created_by, :updated_by, now(), now()
            WHERE NOT EXISTS (
                SELECT 1 FROM notification_templates WHERE tenant_id = :tenant_id AND id = :id
            )
        """)
        
        conn.execute(stmt, {
            'id': n['id'],
            'tenant_id': tenant_id,
            'name': n['name'],
            'subject': n['subject'],
            'body': n['body'],
            'created_by': SEED_CREATED_BY,
            'updated_by': SEED_CREATED_BY,
        })

    print(f"notification_templates seed applied for tenant: {tenant_id} ({len(NOTIFICATION_TEMPLATES)} templates)")


def seed_for_tenant(conn, tenant_id: str) -> None:
    seed_clients(conn, tenant_id)
    seed_opportunities(conn, tenant_id)
    seed_notifications(conn, tenant_id)


def seed_for_tenants(conn, tenant_ids: Iterable[str]) -> None:
    for t in tenant_ids:
        seed_for_tenant(conn, t)
