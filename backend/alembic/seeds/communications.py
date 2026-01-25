"""Seed Communications (threads, messages, participants, meeting minutes)

This seed creates:
- 15 communication threads linked to proposals and opportunities
- 45 messages (3 per thread)
- 30 thread participants (2 per thread)
- 10 meeting minutes

Revision ID: communications_seed
Create Date: 2026-01-24 12:00:00
"""
from __future__ import annotations

import json
import os
from typing import Iterable
from sqlalchemy import text

# Inline stable IDs to avoid cross-module import issues in Docker
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

# Stable IDs for communication threads (15 total - 3 per institute)
THREAD_IDS = {
    # ISI SVP threads (3)
    'THREAD_SVP_1': 'e1000000-0000-0000-0000-000000000001',
    'THREAD_SVP_2': 'e1000000-0000-0000-0000-000000000002',
    'THREAD_SVP_3': 'e1000000-0000-0000-0000-000000000003',
    # ISI QV threads (3)
    'THREAD_QV_1': 'e1000000-0000-0000-0000-000000000004',
    'THREAD_QV_2': 'e1000000-0000-0000-0000-000000000005',
    'THREAD_QV_3': 'e1000000-0000-0000-0000-000000000006',
    # ISI B&F threads (3)
    'THREAD_BF_1': 'e1000000-0000-0000-0000-000000000007',
    'THREAD_BF_2': 'e1000000-0000-0000-0000-000000000008',
    'THREAD_BF_3': 'e1000000-0000-0000-0000-000000000009',
    # ISI II threads (3)
    'THREAD_II_1': 'e1000000-0000-0000-0000-000000000010',
    'THREAD_II_2': 'e1000000-0000-0000-0000-000000000011',
    'THREAD_II_3': 'e1000000-0000-0000-0000-000000000012',
    # CIS SO threads (3)
    'THREAD_SO_1': 'e1000000-0000-0000-0000-000000000013',
    'THREAD_SO_2': 'e1000000-0000-0000-0000-000000000014',
    'THREAD_SO_3': 'e1000000-0000-0000-0000-000000000015',
}

# Stable IDs for messages (45 total - 3 per thread)
MESSAGE_IDS = {f'MSG_{i}': f'e2000000-0000-0000-0000-{str(i).zfill(12)}' for i in range(1, 46)}

# Stable IDs for thread participants (30 total - 2 per thread)
PARTICIPANT_IDS = {f'PART_{i}': f'e3000000-0000-0000-0000-{str(i).zfill(12)}' for i in range(1, 31)}

# Stable IDs for meeting minutes (10 total)
MINUTE_IDS = {f'MIN_{i}': f'e4000000-0000-0000-0000-{str(i).zfill(12)}' for i in range(1, 11)}

# 15 Communication threads
THREADS = [
    # ISI SVP threads
    {
        'id': THREAD_IDS['THREAD_SVP_1'],
        'subject': 'Proposta Gêmeo Digital WEG - Discussão Técnica',
        'linked_entity_type': 'proposal',
        'linked_entity_id': PROPOSAL_IDS['PROP_SVP_1'],
        'is_auto_created': False,
        'participants': [USER_IDS['USER_SVP_1'], USER_IDS['USER_SVP_2']],
    },
    {
        'id': THREAD_IDS['THREAD_SVP_2'],
        'subject': 'Manutenção Preditiva Embraco - Alinhamento',
        'linked_entity_type': 'opportunity',
        'linked_entity_id': OPPORTUNITY_IDS['OPP_SVP_2'],
        'is_auto_created': False,
        'participants': [USER_IDS['USER_SVP_2'], USER_IDS['USER_SVP_3']],
    },
    {
        'id': THREAD_IDS['THREAD_SVP_3'],
        'subject': 'Robótica Colaborativa Tupy - Especificações',
        'linked_entity_type': 'proposal',
        'linked_entity_id': PROPOSAL_IDS['PROP_SVP_3'],
        'is_auto_created': False,
        'participants': [USER_IDS['USER_SVP_3'], USER_IDS['USER_SVP_4']],
    },
    # ISI QV threads
    {
        'id': THREAD_IDS['THREAD_QV_1'],
        'subject': 'Catalisadores Braskem - Resultados de Síntese',
        'linked_entity_type': 'proposal',
        'linked_entity_id': PROPOSAL_IDS['PROP_QV_1'],
        'is_auto_created': False,
        'participants': [USER_IDS['USER_QV_1'], USER_IDS['USER_QV_2']],
    },
    {
        'id': THREAD_IDS['THREAD_QV_2'],
        'subject': 'Etanol 2G Raízen - Acompanhamento',
        'linked_entity_type': 'proposal',
        'linked_entity_id': PROPOSAL_IDS['PROP_QV_2'],
        'is_auto_created': False,
        'participants': [USER_IDS['USER_QV_2'], USER_IDS['USER_QV_3']],
    },
    {
        'id': THREAD_IDS['THREAD_QV_3'],
        'subject': 'Embalagens Natura - Testes de Barreira',
        'linked_entity_type': 'opportunity',
        'linked_entity_id': OPPORTUNITY_IDS['OPP_QV_3'],
        'is_auto_created': False,
        'participants': [USER_IDS['USER_QV_3'], USER_IDS['USER_QV_4']],
    },
    # ISI B&F threads
    {
        'id': THREAD_IDS['THREAD_BF_1'],
        'subject': 'Fibras Sustentáveis Malwee - Caracterização',
        'linked_entity_type': 'proposal',
        'linked_entity_id': PROPOSAL_IDS['PROP_BF_1'],
        'is_auto_created': False,
        'participants': [USER_IDS['USER_BF_1'], USER_IDS['USER_BF_2']],
    },
    {
        'id': THREAD_IDS['THREAD_BF_2'],
        'subject': 'Tingimento Enzimático Karsten - Protocolo',
        'linked_entity_type': 'proposal',
        'linked_entity_id': PROPOSAL_IDS['PROP_BF_2'],
        'is_auto_created': False,
        'participants': [USER_IDS['USER_BF_2'], USER_IDS['USER_BF_3']],
    },
    {
        'id': THREAD_IDS['THREAD_BF_3'],
        'subject': 'Rastreabilidade Hering - Arquitetura Blockchain',
        'linked_entity_type': 'opportunity',
        'linked_entity_id': OPPORTUNITY_IDS['OPP_BF_3'],
        'is_auto_created': False,
        'participants': [USER_IDS['USER_BF_3'], USER_IDS['USER_BF_4']],
    },
    # ISI II threads
    {
        'id': THREAD_IDS['THREAD_II_1'],
        'subject': 'Visão Computacional Petrobras - Validação',
        'linked_entity_type': 'proposal',
        'linked_entity_id': PROPOSAL_IDS['PROP_II_1'],
        'is_auto_created': False,
        'participants': [USER_IDS['USER_II_1'], USER_IDS['USER_II_2']],
    },
    {
        'id': THREAD_IDS['THREAD_II_2'],
        'subject': 'IA Vale - Dataset de Treinamento',
        'linked_entity_type': 'proposal',
        'linked_entity_id': PROPOSAL_IDS['PROP_II_2'],
        'is_auto_created': False,
        'participants': [USER_IDS['USER_II_2'], USER_IDS['USER_II_3']],
    },
    {
        'id': THREAD_IDS['THREAD_II_3'],
        'subject': 'Drones CPFL - Testes de Campo',
        'linked_entity_type': 'opportunity',
        'linked_entity_id': OPPORTUNITY_IDS['OPP_II_4'],
        'is_auto_created': False,
        'participants': [USER_IDS['USER_II_4'], USER_IDS['USER_II_5']],
    },
    # CIS SO threads
    {
        'id': THREAD_IDS['THREAD_SO_1'],
        'subject': 'VR Marcopolo - Design de Cenários',
        'linked_entity_type': 'proposal',
        'linked_entity_id': PROPOSAL_IDS['PROP_SO_1'],
        'is_auto_created': False,
        'participants': [USER_IDS['USER_SO_1'], USER_IDS['USER_SO_2']],
    },
    {
        'id': THREAD_IDS['THREAD_SO_2'],
        'subject': 'Dashboard Tramontina - Requisitos',
        'linked_entity_type': 'proposal',
        'linked_entity_id': PROPOSAL_IDS['PROP_SO_2'],
        'is_auto_created': False,
        'participants': [USER_IDS['USER_SO_2'], USER_IDS['USER_SO_3']],
    },
    {
        'id': THREAD_IDS['THREAD_SO_3'],
        'subject': 'Lean Digital Randon - Implementação',
        'linked_entity_type': 'opportunity',
        'linked_entity_id': OPPORTUNITY_IDS['OPP_SO_3'],
        'is_auto_created': False,
        'participants': [USER_IDS['USER_SO_3'], USER_IDS['USER_SO_4']],
    },
]

# 45 Messages (3 per thread)
MESSAGES = [
    # Thread SVP 1 messages
    {'id': MESSAGE_IDS['MSG_1'], 'thread_id': THREAD_IDS['THREAD_SVP_1'], 'author_id': USER_IDS['USER_SVP_1'],
     'author_name': 'Pesquisador ISI SVP 1', 'body': 'Prezados, iniciamos a discussão sobre a arquitetura do Gêmeo Digital. Precisamos definir a stack tecnológica a ser utilizada.', 'message_type': 'text'},
    {'id': MESSAGE_IDS['MSG_2'], 'thread_id': THREAD_IDS['THREAD_SVP_1'], 'author_id': USER_IDS['USER_SVP_2'],
     'author_name': 'Pesquisador ISI SVP 2', 'body': 'Sugiro utilizarmos Unity para a visualização 3D e Azure Digital Twins para a plataforma de simulação. Posso preparar uma PoC.', 'message_type': 'text'},
    {'id': MESSAGE_IDS['MSG_3'], 'thread_id': THREAD_IDS['THREAD_SVP_1'], 'author_id': USER_IDS['USER_SVP_1'],
     'author_name': 'Pesquisador ISI SVP 1', 'body': 'Ótima sugestão! Vamos agendar uma reunião para discutir os detalhes da integração com o MES da WEG.', 'message_type': 'text'},
    
    # Thread SVP 2 messages
    {'id': MESSAGE_IDS['MSG_4'], 'thread_id': THREAD_IDS['THREAD_SVP_2'], 'author_id': USER_IDS['USER_SVP_2'],
     'author_name': 'Pesquisador ISI SVP 2', 'body': 'Os sensores de vibração chegaram. Podemos iniciar os testes de bancada na próxima semana.', 'message_type': 'text'},
    {'id': MESSAGE_IDS['MSG_5'], 'thread_id': THREAD_IDS['THREAD_SVP_2'], 'author_id': USER_IDS['USER_SVP_3'],
     'author_name': 'Pesquisador ISI SVP 3', 'body': 'Excelente! Vou preparar o setup de coleta de dados. Precisamos definir a taxa de amostragem.', 'message_type': 'text'},
    {'id': MESSAGE_IDS['MSG_6'], 'thread_id': THREAD_IDS['THREAD_SVP_2'], 'author_id': USER_IDS['USER_SVP_2'],
     'author_name': 'Pesquisador ISI SVP 2', 'body': 'Para análise de vibração, recomendo 10kHz no mínimo. Vou verificar a capacidade do gateway IoT.', 'message_type': 'text'},
    
    # Thread SVP 3 messages
    {'id': MESSAGE_IDS['MSG_7'], 'thread_id': THREAD_IDS['THREAD_SVP_3'], 'author_id': USER_IDS['USER_SVP_3'],
     'author_name': 'Pesquisador ISI SVP 3', 'body': 'A Tupy enviou as especificações das peças a serem trabalhadas. São 3 famílias diferentes de componentes.', 'message_type': 'text'},
    {'id': MESSAGE_IDS['MSG_8'], 'thread_id': THREAD_IDS['THREAD_SVP_3'], 'author_id': USER_IDS['USER_SVP_4'],
     'author_name': 'Pesquisador ISI SVP 4', 'body': 'Analisei os dados. O cobot UR10e é adequado para a carga máxima de 8kg. Posso simular as trajetórias.', 'message_type': 'text'},
    {'id': MESSAGE_IDS['MSG_9'], 'thread_id': THREAD_IDS['THREAD_SVP_3'], 'author_id': USER_IDS['USER_SVP_3'],
     'author_name': 'Pesquisador ISI SVP 3', 'body': 'Perfeito. Por favor, inclua a análise de tempo de ciclo na simulação. A meta é 45 segundos por peça.', 'message_type': 'text'},
    
    # Thread QV 1 messages
    {'id': MESSAGE_IDS['MSG_10'], 'thread_id': THREAD_IDS['THREAD_QV_1'], 'author_id': USER_IDS['USER_QV_1'],
     'author_name': 'Pesquisador ISI QV 1', 'body': 'Resultados promissores! O novo catalisador apresentou 15% mais eficiência que o benchmark.', 'message_type': 'text'},
    {'id': MESSAGE_IDS['MSG_11'], 'thread_id': THREAD_IDS['THREAD_QV_1'], 'author_id': USER_IDS['USER_QV_2'],
     'author_name': 'Pesquisador ISI QV 2', 'body': 'Ótimo resultado! Precisamos validar a estabilidade térmica. Vou preparar os testes de envelhecimento.', 'message_type': 'text'},
    {'id': MESSAGE_IDS['MSG_12'], 'thread_id': THREAD_IDS['THREAD_QV_1'], 'author_id': USER_IDS['USER_QV_1'],
     'author_name': 'Pesquisador ISI QV 1', 'body': 'Importante. A Braskem quer ver dados de pelo menos 500h de operação contínua.', 'message_type': 'text'},
    
    # Thread QV 2 messages
    {'id': MESSAGE_IDS['MSG_13'], 'thread_id': THREAD_IDS['THREAD_QV_2'], 'author_id': USER_IDS['USER_QV_2'],
     'author_name': 'Pesquisador ISI QV 2', 'body': 'O novo coquetel enzimático aumentou a taxa de conversão de celulose em 23%.', 'message_type': 'text'},
    {'id': MESSAGE_IDS['MSG_14'], 'thread_id': THREAD_IDS['THREAD_QV_2'], 'author_id': USER_IDS['USER_QV_3'],
     'author_name': 'Pesquisador ISI QV 3', 'body': 'Impressionante! Qual foi a temperatura ótima? Precisamos otimizar o consumo energético.', 'message_type': 'text'},
    {'id': MESSAGE_IDS['MSG_15'], 'thread_id': THREAD_IDS['THREAD_QV_2'], 'author_id': USER_IDS['USER_QV_2'],
     'author_name': 'Pesquisador ISI QV 2', 'body': 'Entre 50-55°C. Vamos testar com o sistema de recuperação de calor para reduzir custos.', 'message_type': 'text'},
    
    # Thread QV 3 messages
    {'id': MESSAGE_IDS['MSG_16'], 'thread_id': THREAD_IDS['THREAD_QV_3'], 'author_id': USER_IDS['USER_QV_3'],
     'author_name': 'Pesquisador ISI QV 3', 'body': 'Os testes de permeabilidade ao vapor estão dentro da especificação para cosméticos.', 'message_type': 'text'},
    {'id': MESSAGE_IDS['MSG_17'], 'thread_id': THREAD_IDS['THREAD_QV_3'], 'author_id': USER_IDS['USER_QV_4'],
     'author_name': 'Pesquisador ISI QV 4', 'body': 'Excelente! A Natura solicitou também testes de compatibilidade com fragrâncias. Já estão programados?', 'message_type': 'text'},
    {'id': MESSAGE_IDS['MSG_18'], 'thread_id': THREAD_IDS['THREAD_QV_3'], 'author_id': USER_IDS['USER_QV_3'],
     'author_name': 'Pesquisador ISI QV 3', 'body': 'Sim, programados para a próxima semana. Utilizaremos 5 fragrâncias diferentes da linha principal.', 'message_type': 'text'},
    
    # Thread BF 1 messages
    {'id': MESSAGE_IDS['MSG_19'], 'thread_id': THREAD_IDS['THREAD_BF_1'], 'author_id': USER_IDS['USER_BF_1'],
     'author_name': 'Pesquisador ISI B&F 1', 'body': 'As fibras extraídas do bagaço apresentaram comprimento médio de 2.5mm. Adequado para fiação.', 'message_type': 'text'},
    {'id': MESSAGE_IDS['MSG_20'], 'thread_id': THREAD_IDS['THREAD_BF_1'], 'author_id': USER_IDS['USER_BF_2'],
     'author_name': 'Pesquisador ISI B&F 2', 'body': 'Ótimo! Precisamos avaliar a resistência à tração. A Malwee exige mínimo de 3 cN/dtex.', 'message_type': 'text'},
    {'id': MESSAGE_IDS['MSG_21'], 'thread_id': THREAD_IDS['THREAD_BF_1'], 'author_id': USER_IDS['USER_BF_1'],
     'author_name': 'Pesquisador ISI B&F 1', 'body': 'Os testes preliminares indicam 3.2 cN/dtex. Vamos confirmar com amostragem estatística.', 'message_type': 'text'},
    
    # Thread BF 2 messages
    {'id': MESSAGE_IDS['MSG_22'], 'thread_id': THREAD_IDS['THREAD_BF_2'], 'author_id': USER_IDS['USER_BF_2'],
     'author_name': 'Pesquisador ISI B&F 2', 'body': 'O processo enzimático reduziu o consumo de água em 65% comparado ao convencional.', 'message_type': 'text'},
    {'id': MESSAGE_IDS['MSG_23'], 'thread_id': THREAD_IDS['THREAD_BF_2'], 'author_id': USER_IDS['USER_BF_3'],
     'author_name': 'Pesquisador ISI B&F 3', 'body': 'Impressionante! E quanto à solidez da cor? A Karsten precisa de nota mínima 4 na escala de cinzas.', 'message_type': 'text'},
    {'id': MESSAGE_IDS['MSG_24'], 'thread_id': THREAD_IDS['THREAD_BF_2'], 'author_id': USER_IDS['USER_BF_2'],
     'author_name': 'Pesquisador ISI B&F 2', 'body': 'Alcançamos nota 4-5 nos testes. Estamos otimizando o pH para melhorar ainda mais.', 'message_type': 'text'},
    
    # Thread BF 3 messages
    {'id': MESSAGE_IDS['MSG_25'], 'thread_id': THREAD_IDS['THREAD_BF_3'], 'author_id': USER_IDS['USER_BF_3'],
     'author_name': 'Pesquisador ISI B&F 3', 'body': 'A arquitetura blockchain foi definida. Usaremos Hyperledger Fabric por ser permissionada.', 'message_type': 'text'},
    {'id': MESSAGE_IDS['MSG_26'], 'thread_id': THREAD_IDS['THREAD_BF_3'], 'author_id': USER_IDS['USER_BF_4'],
     'author_name': 'Pesquisador ISI B&F 4', 'body': 'Boa escolha. Como vamos integrar os dados dos fornecedores de algodão?', 'message_type': 'text'},
    {'id': MESSAGE_IDS['MSG_27'], 'thread_id': THREAD_IDS['THREAD_BF_3'], 'author_id': USER_IDS['USER_BF_3'],
     'author_name': 'Pesquisador ISI B&F 3', 'body': 'Vamos usar APIs REST e QR codes para entrada de dados nas fazendas. App mobile já está em desenvolvimento.', 'message_type': 'text'},
    
    # Thread II 1 messages
    {'id': MESSAGE_IDS['MSG_28'], 'thread_id': THREAD_IDS['THREAD_II_1'], 'author_id': USER_IDS['USER_II_1'],
     'author_name': 'Pesquisador ISI II 1', 'body': 'O modelo de deep learning alcançou 98.2% de acurácia na detecção de trincas em soldas.', 'message_type': 'text'},
    {'id': MESSAGE_IDS['MSG_29'], 'thread_id': THREAD_IDS['THREAD_II_1'], 'author_id': USER_IDS['USER_II_2'],
     'author_name': 'Pesquisador ISI II 2', 'body': 'Excelente! Qual foi a taxa de falsos positivos? A Petrobras é muito exigente nesse aspecto.', 'message_type': 'text'},
    {'id': MESSAGE_IDS['MSG_30'], 'thread_id': THREAD_IDS['THREAD_II_1'], 'author_id': USER_IDS['USER_II_1'],
     'author_name': 'Pesquisador ISI II 1', 'body': 'Menos de 0.5%. O modelo foi treinado com 50.000 imagens reais da plataforma P-70.', 'message_type': 'text'},
    
    # Thread II 2 messages
    {'id': MESSAGE_IDS['MSG_31'], 'thread_id': THREAD_IDS['THREAD_II_2'], 'author_id': USER_IDS['USER_II_2'],
     'author_name': 'Pesquisador ISI II 2', 'body': 'O dataset de vibração de correias está pronto. 2TB de dados de 6 meses de operação.', 'message_type': 'text'},
    {'id': MESSAGE_IDS['MSG_32'], 'thread_id': THREAD_IDS['THREAD_II_2'], 'author_id': USER_IDS['USER_II_3'],
     'author_name': 'Pesquisador ISI II 3', 'body': 'Quantas falhas reais temos no dataset? Precisamos de casos positivos para treinar o modelo.', 'message_type': 'text'},
    {'id': MESSAGE_IDS['MSG_33'], 'thread_id': THREAD_IDS['THREAD_II_2'], 'author_id': USER_IDS['USER_II_2'],
     'author_name': 'Pesquisador ISI II 2', 'body': '47 falhas documentadas com causa raiz identificada. Já marquei os eventos no dataset.', 'message_type': 'text'},
    
    # Thread II 3 messages
    {'id': MESSAGE_IDS['MSG_34'], 'thread_id': THREAD_IDS['THREAD_II_3'], 'author_id': USER_IDS['USER_II_4'],
     'author_name': 'Pesquisador ISI II 4', 'body': 'O primeiro voo autônomo foi um sucesso! O drone percorreu 5km de linha sem intervenção.', 'message_type': 'text'},
    {'id': MESSAGE_IDS['MSG_35'], 'thread_id': THREAD_IDS['THREAD_II_3'], 'author_id': USER_IDS['USER_II_5'],
     'author_name': 'Pesquisador ISI II 5', 'body': 'Ótimo! E o sistema de detecção de anomalias em isoladores funcionou corretamente?', 'message_type': 'text'},
    {'id': MESSAGE_IDS['MSG_36'], 'thread_id': THREAD_IDS['THREAD_II_3'], 'author_id': USER_IDS['USER_II_4'],
     'author_name': 'Pesquisador ISI II 4', 'body': 'Sim, detectou 3 isoladores com flash-over potencial. Validamos com inspeção terrestre.', 'message_type': 'text'},
    
    # Thread SO 1 messages
    {'id': MESSAGE_IDS['MSG_37'], 'thread_id': THREAD_IDS['THREAD_SO_1'], 'author_id': USER_IDS['USER_SO_1'],
     'author_name': 'Pesquisador CIS SO 1', 'body': 'O cenário de segurança para a linha de pintura está pronto. Inclui 12 situações de risco.', 'message_type': 'text'},
    {'id': MESSAGE_IDS['MSG_38'], 'thread_id': THREAD_IDS['THREAD_SO_1'], 'author_id': USER_IDS['USER_SO_2'],
     'author_name': 'Pesquisador CIS SO 2', 'body': 'Precisamos adicionar o cenário de trabalho em altura. Foi solicitado pela equipe de SST da Marcopolo.', 'message_type': 'text'},
    {'id': MESSAGE_IDS['MSG_39'], 'thread_id': THREAD_IDS['THREAD_SO_1'], 'author_id': USER_IDS['USER_SO_1'],
     'author_name': 'Pesquisador CIS SO 1', 'body': 'Anotado. Vou incluir até sexta-feira. Também vamos adicionar quiz de avaliação no final.', 'message_type': 'text'},
    
    # Thread SO 2 messages
    {'id': MESSAGE_IDS['MSG_40'], 'thread_id': THREAD_IDS['THREAD_SO_2'], 'author_id': USER_IDS['USER_SO_2'],
     'author_name': 'Pesquisador CIS SO 2', 'body': 'Levantei os 15 KPIs principais que a Tramontina quer monitorar. Está em anexo.', 'message_type': 'text'},
    {'id': MESSAGE_IDS['MSG_41'], 'thread_id': THREAD_IDS['THREAD_SO_2'], 'author_id': USER_IDS['USER_SO_3'],
     'author_name': 'Pesquisador CIS SO 3', 'body': 'Analisei a lista. Sugiro priorizar OEE, produtividade e qualidade na primeira entrega.', 'message_type': 'text'},
    {'id': MESSAGE_IDS['MSG_42'], 'thread_id': THREAD_IDS['THREAD_SO_2'], 'author_id': USER_IDS['USER_SO_2'],
     'author_name': 'Pesquisador CIS SO 2', 'body': 'Concordo. Vou preparar o modelo de dados e a proposta de visualização para validação.', 'message_type': 'text'},
    
    # Thread SO 3 messages
    {'id': MESSAGE_IDS['MSG_43'], 'thread_id': THREAD_IDS['THREAD_SO_3'], 'author_id': USER_IDS['USER_SO_3'],
     'author_name': 'Pesquisador CIS SO 3', 'body': 'O piloto de Kanban digital na célula de montagem reduziu WIP em 35%.', 'message_type': 'text'},
    {'id': MESSAGE_IDS['MSG_44'], 'thread_id': THREAD_IDS['THREAD_SO_3'], 'author_id': USER_IDS['USER_SO_4'],
     'author_name': 'Pesquisador CIS SO 4', 'body': 'Resultado expressivo! Vamos escalar para as outras 4 células conforme planejado?', 'message_type': 'text'},
    {'id': MESSAGE_IDS['MSG_45'], 'thread_id': THREAD_IDS['THREAD_SO_3'], 'author_id': USER_IDS['USER_SO_3'],
     'author_name': 'Pesquisador CIS SO 3', 'body': 'Sim, já agendei o treinamento dos operadores. Rollout em 3 semanas.', 'message_type': 'text'},
]

# 10 Meeting minutes
MEETING_MINUTES = [
    {
        'id': MINUTE_IDS['MIN_1'],
        'thread_id': THREAD_IDS['THREAD_SVP_1'],
        'title': 'Ata - Kickoff Gêmeo Digital WEG',
        'content': '''# Ata de Reunião - Kickoff Projeto

**Data:** 24/01/2026 | **Duração:** 2h

## Participantes
- Equipe ISI SVP
- Representantes WEG

## Pauta e Decisões
1. **Arquitetura**: Aprovado uso de Unity + Azure Digital Twins
2. **Milestones**: M1 em 30 dias (especificação), M2 em 60 dias (PoC)
3. **Integração MES**: Mapeamento de APIs prioritário

## Ações
| Responsável | Ação | Prazo |
|-------------|------|-------|
| Pesquisador SVP 1 | Documento de arquitetura | 07/02/2026 |
| Pesquisador SVP 2 | PoC de visualização | 14/02/2026 |
''',
        'status': 'approved',
    },
    {
        'id': MINUTE_IDS['MIN_2'],
        'thread_id': THREAD_IDS['THREAD_QV_1'],
        'title': 'Ata - Revisão Resultados Catalisadores',
        'content': '''# Ata de Reunião - Resultados Experimentais

**Data:** 20/01/2026 | **Duração:** 1.5h

## Participantes
- Equipe ISI QV
- Braskem - P&D

## Resultados Apresentados
- Eficiência catalítica: +15% vs benchmark
- Seletividade: 94.5%
- Vida útil estimada: 2.000h

## Próximos Passos
1. Testes de estabilidade térmica (500h)
2. Preparação para scale-up piloto
''',
        'status': 'approved',
    },
    {
        'id': MINUTE_IDS['MIN_3'],
        'thread_id': THREAD_IDS['THREAD_QV_2'],
        'title': 'Ata - Acompanhamento Etanol 2G',
        'content': '''# Ata de Reunião - Status do Projeto

**Data:** 22/01/2026 | **Duração:** 1h

## Status
- Experimentos de bancada: 100% concluídos
- Resultados: conversão de 87% (meta: 85%)
- Próxima fase: testes em planta piloto

## Pendências
- Agendamento de uso da planta piloto Raízen
- Contratação de operador de processo
''',
        'status': 'approved',
    },
    {
        'id': MINUTE_IDS['MIN_4'],
        'thread_id': THREAD_IDS['THREAD_BF_1'],
        'title': 'Ata - Caracterização de Fibras',
        'content': '''# Ata de Reunião - Resultados de Caracterização

**Data:** 18/01/2026 | **Duração:** 1h

## Resultados
- Comprimento médio: 2.5mm ± 0.3mm
- Resistência: 3.2 cN/dtex
- Elongação: 12%

## Conclusões
- Fibras adequadas para fiação
- Necessário otimizar processo de extração
''',
        'status': 'approved',
    },
    {
        'id': MINUTE_IDS['MIN_5'],
        'thread_id': THREAD_IDS['THREAD_II_1'],
        'title': 'Ata - Validação Sistema de Visão',
        'content': '''# Ata de Reunião - Validação em Campo

**Data:** 15/01/2026 | **Duração:** 3h

## Testes Realizados
- 500 imagens de soldas reais
- Ambiente de plataforma offshore

## Resultados
- Acurácia: 98.2%
- Falsos positivos: 0.48%
- Tempo de inferência: 0.3s/imagem

## Aprovação
Sistema aprovado para fase de produção
''',
        'status': 'approved',
    },
    {
        'id': MINUTE_IDS['MIN_6'],
        'thread_id': THREAD_IDS['THREAD_II_3'],
        'title': 'Ata - Testes de Voo Autônomo',
        'content': '''# Ata de Reunião - Resultados de Campo

**Data:** 12/01/2026 | **Duração:** 4h

## Testes Realizados
- Voo autônomo de 5km
- Captura de 2.000 imagens de isoladores
- Detecção automática de anomalias

## Resultados
- 3 anomalias detectadas e confirmadas
- Autonomia de voo: 45 minutos
- Precisão de navegação: 98%
''',
        'status': 'draft',
    },
    {
        'id': MINUTE_IDS['MIN_7'],
        'thread_id': THREAD_IDS['THREAD_SO_1'],
        'title': 'Ata - Revisão Cenários VR',
        'content': '''# Ata de Reunião - Design de Cenários

**Data:** 10/01/2026 | **Duração:** 2h

## Cenários Aprovados
1. Segurança em pintura
2. Trabalho em altura
3. Operação de empilhadeira
4. Trabalho confinado

## Pendências
- Adicionar mais 3 cenários solicitados
- Implementar sistema de pontuação
''',
        'status': 'approved',
    },
    {
        'id': MINUTE_IDS['MIN_8'],
        'thread_id': THREAD_IDS['THREAD_SO_2'],
        'title': 'Ata - Definição KPIs Dashboard',
        'content': '''# Ata de Reunião - Requisitos de BI

**Data:** 08/01/2026 | **Duração:** 1.5h

## KPIs Prioritários (Fase 1)
1. OEE por linha
2. Produtividade horária
3. Taxa de qualidade
4. MTBF/MTTR
5. Custo por peça

## Fontes de Dados
- SAP ERP
- Sistema MES
- Planilhas legadas
''',
        'status': 'approved',
    },
    {
        'id': MINUTE_IDS['MIN_9'],
        'thread_id': THREAD_IDS['THREAD_SVP_2'],
        'title': 'Ata - Setup Sensores IoT',
        'content': '''# Ata de Reunião - Planejamento de Instalação

**Data:** 05/01/2026 | **Duração:** 1h

## Sensores
- 20 acelerômetros triaxiais
- 10 sensores de temperatura
- 5 sensores de corrente

## Cronograma
- Semana 1: Instalação mecânica
- Semana 2: Configuração de rede
- Semana 3: Validação de coleta
''',
        'status': 'approved',
    },
    {
        'id': MINUTE_IDS['MIN_10'],
        'thread_id': THREAD_IDS['THREAD_II_2'],
        'title': 'Ata - Preparação Dataset ML',
        'content': '''# Ata de Reunião - Machine Learning

**Data:** 03/01/2026 | **Duração:** 2h

## Dataset
- 2TB de dados de vibração
- 6 meses de operação contínua
- 47 eventos de falha rotulados

## Próximos Passos
1. Limpeza e normalização
2. Feature engineering
3. Split treino/teste/validação
''',
        'status': 'draft',
    },
]


def _table_exists(conn, table: str) -> bool:
    r = conn.execute(text("SELECT to_regclass(:t)"), {"t": table}).scalar()
    return r is not None


def seed_threads(conn, tenant_id: str) -> None:
    if not _table_exists(conn, "communication_threads"):
        print("Skipping communication_threads seed: table not present")
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
            'linked_entity_type': thread.get('linked_entity_type'),
            'linked_entity_id': thread.get('linked_entity_id'),
            'is_auto_created': thread.get('is_auto_created', False),
        })

    print(f"communication_threads seed applied for tenant: {tenant_id} ({len(THREADS)} threads)")


def seed_thread_participants(conn, tenant_id: str) -> None:
    if not _table_exists(conn, "communication_thread_participants"):
        print("Skipping communication_thread_participants seed: table not present")
        return

    participant_count = 0
    participant_idx = 1
    for thread in THREADS:
        for user_id in thread.get('participants', []):
            part_id = PARTICIPANT_IDS.get(f'PART_{participant_idx}')
            if not part_id:
                continue
            
            stmt = text("""
                INSERT INTO communication_thread_participants (
                    id, tenant_id, thread_id, user_id, 
                    role, added_at, added_by
                )
                SELECT
                    :id, :tenant_id, :thread_id, :user_id,
                    'participant', now(), :added_by
                WHERE NOT EXISTS (
                    SELECT 1 FROM communication_thread_participants 
                    WHERE tenant_id = :tenant_id AND thread_id = :thread_id AND user_id = :user_id
                )
            """)
            
            conn.execute(stmt, {
                'id': part_id,
                'tenant_id': tenant_id,
                'thread_id': thread['id'],
                'user_id': user_id,
                'added_by': SEED_CREATED_BY,
            })
            participant_count += 1
            participant_idx += 1

    print(f"communication_thread_participants seed applied for tenant: {tenant_id} ({participant_count} participants)")


def seed_messages(conn, tenant_id: str) -> None:
    if not _table_exists(conn, "communication_messages"):
        print("Skipping communication_messages seed: table not present")
        return

    for i, msg in enumerate(MESSAGES):
        # Stagger message times
        time_offset = f"interval '{len(MESSAGES) - i} hours'"
        
        stmt = text(f"""
            INSERT INTO communication_messages (
                id, tenant_id, thread_id, author, author_name, body,
                message_type, is_auto_created, auto_created_confirmed,
                created_at, updated_at
            )
            SELECT
                :id, :tenant_id, :thread_id, :author, :author_name, :body,
                :message_type, false, false,
                now() - {time_offset}, now()
            WHERE NOT EXISTS (
                SELECT 1 FROM communication_messages WHERE tenant_id = :tenant_id AND id = :id
            )
        """)
        
        conn.execute(stmt, {
            'id': msg['id'],
            'tenant_id': tenant_id,
            'thread_id': msg['thread_id'],
            'author': msg.get('author_id', SEED_CREATED_BY),
            'author_name': msg.get('author_name', 'System'),
            'body': msg['body'],
            'message_type': msg.get('message_type', 'text'),
        })

    print(f"communication_messages seed applied for tenant: {tenant_id} ({len(MESSAGES)} messages)")


def seed_meeting_minutes(conn, tenant_id: str) -> None:
    if not _table_exists(conn, "meeting_minutes"):
        print("Skipping meeting_minutes seed: table not present")
        return

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

    print(f"meeting_minutes seed applied for tenant: {tenant_id} ({len(MEETING_MINUTES)} minutes)")


def update_thread_previews(conn, tenant_id: str) -> None:
    """Update last message preview for all threads."""
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


def seed_for_tenant(conn, tenant_id: str) -> None:
    seed_threads(conn, tenant_id)
    seed_thread_participants(conn, tenant_id)
    seed_messages(conn, tenant_id)
    seed_meeting_minutes(conn, tenant_id)
    update_thread_previews(conn, tenant_id)
    print(f"communications seed completed for tenant: {tenant_id}")


def seed_for_tenants(conn, tenant_ids: Iterable[str]) -> None:
    for t in tenant_ids:
        seed_for_tenant(conn, t)
