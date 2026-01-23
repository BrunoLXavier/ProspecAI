"""Seed Infrastructures (laboratories linked to institutes)

This seed creates laboratory infrastructures for each ISI/CIS institute.

Revision ID: infrastructures_seed
Create Date: 2026-01-23 12:00:00
"""
from __future__ import annotations

import json
import uuid
from typing import Iterable
from sqlalchemy import text

# Import stable institute IDs
from alembic.seeds.institutes import INSTITUTE_IDS


# Stable IDs for infrastructures
INFRA_IDS = {
    'LAB_SVP_1': 'c1000000-0000-0000-0000-000000000001',
    'LAB_SVP_2': 'c1000000-0000-0000-0000-000000000002',
    'LAB_QV_1': 'c1000000-0000-0000-0000-000000000003',
    'LAB_BF_1': 'c1000000-0000-0000-0000-000000000004',
    'LAB_II_1': 'c1000000-0000-0000-0000-000000000005',
    'LAB_II_2': 'c1000000-0000-0000-0000-000000000006',
    'LAB_SO_1': 'c1000000-0000-0000-0000-000000000007',
}

INFRASTRUCTURES = [
    # ISI SVP Labs
    {
        'id': INFRA_IDS['LAB_SVP_1'],
        'instituto_id': INSTITUTE_IDS['ISI_SVP'],
        'nome': 'Laboratório de Simulação Virtual',
        'name': 'Virtual Simulation Lab',
        'descricao': 'Laboratório equipado com sistemas de simulação de processos industriais, CAD/CAM/CAE e modelagem 3D para manufatura digital.',
        'email_laboratorio': 'lab.simulacao@isisvp.senai.br',
        'email_responsavel': 'carlos.silva@isisvp.senai.br',
        'telefone': '(47) 3441-7700',
        'site_url': 'https://isisvp.senai.br/laboratorios/simulacao',
        'area_predial_m2': 250,
        'status_isi': 'Operacional',
        'maturidade_gestao': 'A',
        'maturidade_base_tecnologica': 4.5,
        'maturidade_laboratorial': 4.3,
        'plataformas_tecnologicas': ['Simulação', 'CAD/CAM', 'Digital Twin'],
        'areas_conhecimento': ['Engenharia de Produção', 'Ciência da Computação'],
        'equipamentos': [
            {'nome': 'Servidor de Simulação', 'marca': 'Dell', 'modelo': 'PowerEdge R750', 'quantidade': 3},
            {'nome': 'Estação de Trabalho CAD', 'marca': 'HP', 'modelo': 'Z8 G4', 'quantidade': 10},
            {'nome': 'Sistema de Realidade Virtual', 'marca': 'HTC', 'modelo': 'Vive Pro 2', 'quantidade': 2},
        ],
    },
    {
        'id': INFRA_IDS['LAB_SVP_2'],
        'instituto_id': INSTITUTE_IDS['ISI_SVP'],
        'nome': 'Laboratório de Manufatura 4.0',
        'name': 'Industry 4.0 Manufacturing Lab',
        'descricao': 'Linha de produção piloto com robôs colaborativos, sensores IoT e sistemas de controle integrados para testes de conceitos de Indústria 4.0.',
        'email_laboratorio': 'lab.manufatura@isisvp.senai.br',
        'email_responsavel': 'marina.costa@isisvp.senai.br',
        'telefone': '(47) 3441-7701',
        'site_url': 'https://isisvp.senai.br/laboratorios/manufatura',
        'area_predial_m2': 400,
        'status_isi': 'Operacional',
        'maturidade_gestao': 'A',
        'maturidade_base_tecnologica': 4.2,
        'maturidade_laboratorial': 4.0,
        'plataformas_tecnologicas': ['IoT Industrial', 'Robótica', 'Automação'],
        'areas_conhecimento': ['Engenharia Mecatrônica', 'Automação Industrial'],
        'equipamentos': [
            {'nome': 'Robô Colaborativo', 'marca': 'Universal Robots', 'modelo': 'UR10e', 'quantidade': 2},
            {'nome': 'PLC Industrial', 'marca': 'Siemens', 'modelo': 'S7-1500', 'quantidade': 4},
            {'nome': 'Gateway IoT', 'marca': 'Advantech', 'modelo': 'UNO-2484G', 'quantidade': 6},
        ],
    },
    # ISI QV Lab
    {
        'id': INFRA_IDS['LAB_QV_1'],
        'instituto_id': INSTITUTE_IDS['ISI_QV'],
        'nome': 'Laboratório de Química Analítica Verde',
        'name': 'Green Analytical Chemistry Lab',
        'descricao': 'Laboratório para análise e desenvolvimento de processos químicos sustentáveis, síntese de biocombustíveis e caracterização de materiais.',
        'email_laboratorio': 'lab.analitica@isiqv.senai.br',
        'email_responsavel': 'roberto.almeida@isiqv.senai.br',
        'telefone': '(21) 2563-4500',
        'site_url': 'https://isiqv.senai.br/laboratorios/analitica',
        'area_predial_m2': 300,
        'status_isi': 'Operacional',
        'maturidade_gestao': 'A',
        'maturidade_base_tecnologica': 4.6,
        'maturidade_laboratorial': 4.5,
        'plataformas_tecnologicas': ['Química Verde', 'Biocombustíveis', 'Análise Instrumental'],
        'areas_conhecimento': ['Química', 'Engenharia Química'],
        'equipamentos': [
            {'nome': 'Cromatógrafo', 'marca': 'Agilent', 'modelo': '7890B GC', 'quantidade': 2},
            {'nome': 'Espectrômetro de Massas', 'marca': 'Thermo Fisher', 'modelo': 'Q Exactive', 'quantidade': 1},
            {'nome': 'Reator de Bancada', 'marca': 'Parr', 'modelo': '4848', 'quantidade': 3},
        ],
    },
    # ISI B&F Lab
    {
        'id': INFRA_IDS['LAB_BF_1'],
        'instituto_id': INSTITUTE_IDS['ISI_BF'],
        'nome': 'Laboratório de Fibras e Polímeros',
        'name': 'Fibers and Polymers Lab',
        'descricao': 'Laboratório para desenvolvimento e caracterização de fibras têxteis, polímeros biossintéticos e materiais avançados.',
        'email_laboratorio': 'lab.fibras@isibf.senai.br',
        'email_responsavel': 'patricia.souza@isibf.senai.br',
        'telefone': '(21) 2582-1400',
        'site_url': 'https://isibf.senai.br/laboratorios/fibras',
        'area_predial_m2': 280,
        'status_isi': 'Operacional',
        'maturidade_gestao': 'B',
        'maturidade_base_tecnologica': 4.0,
        'maturidade_laboratorial': 3.8,
        'plataformas_tecnologicas': ['Biossintéticos', 'Polímeros', 'Têxtil'],
        'areas_conhecimento': ['Engenharia de Materiais', 'Química'],
        'equipamentos': [
            {'nome': 'Extrusora de Polímeros', 'marca': 'Brabender', 'modelo': 'Plasti-Corder', 'quantidade': 1},
            {'nome': 'Máquina Universal de Ensaios', 'marca': 'Instron', 'modelo': '5982', 'quantidade': 1},
            {'nome': 'Microscópio Eletrônico', 'marca': 'JEOL', 'modelo': 'JSM-6510', 'quantidade': 1},
        ],
    },
    # ISI II Labs
    {
        'id': INFRA_IDS['LAB_II_1'],
        'instituto_id': INSTITUTE_IDS['ISI_II'],
        'nome': 'Laboratório de Visão Computacional',
        'name': 'Computer Vision Lab',
        'descricao': 'Laboratório equipado com sistemas de visão computacional, câmeras industriais e infraestrutura de processamento de imagens para inspeção automatizada.',
        'email_laboratorio': 'lab.visao@isiii.senai.br',
        'email_responsavel': 'andre.oliveira@isiii.senai.br',
        'telefone': '(11) 3528-2000',
        'site_url': 'https://isiii.senai.br/laboratorios/visao',
        'area_predial_m2': 200,
        'status_isi': 'Operacional',
        'maturidade_gestao': 'A',
        'maturidade_base_tecnologica': 4.4,
        'maturidade_laboratorial': 4.2,
        'plataformas_tecnologicas': ['Visão Computacional', 'IA', 'Deep Learning'],
        'areas_conhecimento': ['Ciência da Computação', 'Engenharia Elétrica'],
        'equipamentos': [
            {'nome': 'Câmera Industrial', 'marca': 'Basler', 'modelo': 'acA4112-30um', 'quantidade': 8},
            {'nome': 'GPU Server', 'marca': 'NVIDIA', 'modelo': 'DGX A100', 'quantidade': 1},
            {'nome': 'Sistema de Iluminação', 'marca': 'CCS', 'modelo': 'LED Dome', 'quantidade': 4},
        ],
    },
    {
        'id': INFRA_IDS['LAB_II_2'],
        'instituto_id': INSTITUTE_IDS['ISI_II'],
        'nome': 'Laboratório de Ensaios Não Destrutivos',
        'name': 'Non-Destructive Testing Lab',
        'descricao': 'Laboratório especializado em técnicas de END: ultrassom, radiografia, partículas magnéticas e líquidos penetrantes.',
        'email_laboratorio': 'lab.end@isiii.senai.br',
        'email_responsavel': 'lucas.mendes@isiii.senai.br',
        'telefone': '(11) 3528-2001',
        'site_url': 'https://isiii.senai.br/laboratorios/end',
        'area_predial_m2': 350,
        'status_isi': 'Operacional',
        'maturidade_gestao': 'A',
        'maturidade_base_tecnologica': 4.3,
        'maturidade_laboratorial': 4.4,
        'plataformas_tecnologicas': ['END', 'Ultrassom', 'Radiografia Industrial'],
        'areas_conhecimento': ['Engenharia de Materiais', 'Engenharia Mecânica'],
        'equipamentos': [
            {'nome': 'Ultrassom Phased Array', 'marca': 'Olympus', 'modelo': 'OmniScan X3', 'quantidade': 2},
            {'nome': 'Equipamento de Raios-X', 'marca': 'GE', 'modelo': 'Isovolt 225', 'quantidade': 1},
            {'nome': 'Yoke Magnético', 'marca': 'Magnaflux', 'modelo': 'Y-7', 'quantidade': 3},
        ],
    },
    # CIS SO Lab
    {
        'id': INFRA_IDS['LAB_SO_1'],
        'instituto_id': INSTITUTE_IDS['CIS_SO'],
        'nome': 'Espaço de Inovação e Design Thinking',
        'name': 'Innovation and Design Thinking Space',
        'descricao': 'Espaço colaborativo para workshops de inovação, design thinking, prototipagem rápida e desenvolvimento de soluções organizacionais.',
        'email_laboratorio': 'espaco.inovacao@cisso.sesisenai.org.br',
        'email_responsavel': 'juliana.ferreira@cisso.sesisenai.org.br',
        'telefone': '(41) 3271-9000',
        'site_url': 'https://cisso.sesisenai.org.br/espacos/inovacao',
        'area_predial_m2': 180,
        'status_isi': 'Operacional',
        'maturidade_gestao': 'B',
        'maturidade_base_tecnologica': 3.5,
        'maturidade_laboratorial': 3.6,
        'plataformas_tecnologicas': ['Design Thinking', 'Gestão', 'Transformação Digital'],
        'areas_conhecimento': ['Administração', 'Design'],
        'equipamentos': [
            {'nome': 'Display Interativo', 'marca': 'Microsoft', 'modelo': 'Surface Hub 2S', 'quantidade': 2},
            {'nome': 'Impressora 3D', 'marca': 'Ultimaker', 'modelo': 'S5', 'quantidade': 1},
            {'nome': 'Kit de Prototipagem', 'marca': 'Arduino', 'modelo': 'Starter Kit', 'quantidade': 10},
        ],
    },
]


def _table_exists(conn, table: str) -> bool:
    r = conn.execute(text("SELECT to_regclass(:t)"), {"t": table}).scalar()
    return r is not None


def seed_for_tenant(conn, tenant_id: str) -> None:
    if not _table_exists(conn, "infrastructures"):
        print("Skipping infrastructures seed: table not present")
        return

    for infra in INFRASTRUCTURES:
        stmt = text("""
            INSERT INTO infrastructures (
                id, tenant_id, instituto_id, nome, name, descricao, description,
                email_laboratorio, email_responsavel, telefone, site_url,
                area_predial_m2, status_isi, maturidade_gestao,
                maturidade_base_tecnologica, maturidade_laboratorial,
                plataformas_tecnologicas, areas_conhecimento, equipamentos,
                created_at, updated_at
            )
            SELECT
                :id, :tenant_id, :instituto_id, :nome, :name, :descricao, :descricao,
                :email_laboratorio, :email_responsavel, :telefone, :site_url,
                :area_predial_m2, :status_isi, :maturidade_gestao,
                :maturidade_base_tecnologica, :maturidade_laboratorial,
                CAST(:plataformas_tecnologicas AS jsonb), CAST(:areas_conhecimento AS jsonb), CAST(:equipamentos AS json),
                now(), now()
            WHERE NOT EXISTS (
                SELECT 1 FROM infrastructures WHERE tenant_id = :tenant_id AND id = :id
            )
        """)
        
        conn.execute(stmt, {
            'id': infra['id'],
            'tenant_id': tenant_id,
            'instituto_id': infra['instituto_id'],
            'nome': infra['nome'],
            'name': infra['name'],
            'descricao': infra['descricao'],
            'email_laboratorio': infra['email_laboratorio'],
            'email_responsavel': infra['email_responsavel'],
            'telefone': infra['telefone'],
            'site_url': infra['site_url'],
            'area_predial_m2': infra['area_predial_m2'],
            'status_isi': infra['status_isi'],
            'maturidade_gestao': infra['maturidade_gestao'],
            'maturidade_base_tecnologica': infra['maturidade_base_tecnologica'],
            'maturidade_laboratorial': infra['maturidade_laboratorial'],
            'plataformas_tecnologicas': json.dumps(infra['plataformas_tecnologicas']),
            'areas_conhecimento': json.dumps(infra['areas_conhecimento']),
            'equipamentos': json.dumps(infra['equipamentos']),
        })

    print(f"infrastructures seed applied for tenant: {tenant_id}")


def seed_for_tenants(conn, tenant_ids: Iterable[str]) -> None:
    for t in tenant_ids:
        seed_for_tenant(conn, t)
