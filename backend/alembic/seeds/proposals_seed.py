# Implements RF-08: Detailed Seeds for Proposal Templates and Proposals
"""
Seed data for Proposal Templates and Sample Proposals

This module creates:
1. Standard proposal templates for each funding type (B&F, FINEP, EMBRAPII, BNDES, Direct)
2. Field templates with specific fields per funding source
3. Sample proposals with multiple versions and field values
4. Auto-fill suggestions for demonstration

Run with: python -m alembic.seeds.proposals_seed
"""
from uuid import UUID, uuid4
from datetime import datetime, timedelta
from typing import List, Dict, Any
import asyncio
import logging

logger = logging.getLogger(__name__)

# Fixed UUIDs for reproducibility
TENANT_ID = UUID("11111111-1111-1111-1111-111111111111")
ADMIN_USER_ID = UUID("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa")
ANALYST_USER_ID = UUID("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb")

# Funding Source IDs (must match existing funding sources)
FUNDING_SOURCE_EMBRAPII = UUID("f1111111-1111-1111-1111-111111111111")
FUNDING_SOURCE_FINEP = UUID("f2222222-2222-2222-2222-222222222222")
FUNDING_SOURCE_BNDES = UUID("f3333333-3333-3333-3333-333333333333")
FUNDING_SOURCE_BF = UUID("f4444444-4444-4444-4444-444444444444")
FUNDING_SOURCE_DIRECT = UUID("f5555555-5555-5555-5555-555555555555")

# Project IDs for linking proposals
PROJECT_TEXTILE = UUID("p1111111-1111-1111-1111-111111111111")
PROJECT_AEROSPACE = UUID("p2222222-2222-2222-2222-222222222222")
PROJECT_AUTOMOTIVE = UUID("p3333333-3333-3333-3333-333333333333")

# Template IDs
TEMPLATE_GENERIC = UUID("00000000-0000-0000-0001-000000000001")
TEMPLATE_EMBRAPII = UUID("00000000-0000-0000-0001-000000000002")
TEMPLATE_FINEP = UUID("00000000-0000-0000-0001-000000000003")
TEMPLATE_BNDES = UUID("00000000-0000-0000-0001-000000000004")
TEMPLATE_BF = UUID("00000000-0000-0000-0001-000000000005")
TEMPLATE_DIRECT = UUID("00000000-0000-0000-0001-000000000006")


# =====================================================
# PROPOSAL TEMPLATES DATA
# =====================================================

PROPOSAL_TEMPLATES = [
    {
        "id": TEMPLATE_GENERIC,
        "name": "Template Genérico",
        "description": "Template padrão para propostas sem fonte de fomento específica",
        "template_type": "generic",
        "funding_source_id": None,
        "is_default": True,
        "is_active": True,
        "tenant_id": TENANT_ID,
        "created_by": ADMIN_USER_ID,
    },
    {
        "id": TEMPLATE_EMBRAPII,
        "name": "Template EMBRAPII",
        "description": "Template para propostas submetidas à EMBRAPII - Unidades credenciadas",
        "template_type": "embrapii",
        "funding_source_id": FUNDING_SOURCE_EMBRAPII,
        "is_default": True,
        "is_active": True,
        "tenant_id": TENANT_ID,
        "created_by": ADMIN_USER_ID,
    },
    {
        "id": TEMPLATE_FINEP,
        "name": "Template FINEP",
        "description": "Template para editais FINEP - Subvenção Econômica, FNDCT, etc.",
        "template_type": "finep",
        "funding_source_id": FUNDING_SOURCE_FINEP,
        "is_default": True,
        "is_active": True,
        "tenant_id": TENANT_ID,
        "created_by": ADMIN_USER_ID,
    },
    {
        "id": TEMPLATE_BNDES,
        "name": "Template BNDES",
        "description": "Template para linhas de financiamento BNDES (Finem, PSI, etc.)",
        "template_type": "bndes",
        "funding_source_id": FUNDING_SOURCE_BNDES,
        "is_default": True,
        "is_active": True,
        "tenant_id": TENANT_ID,
        "created_by": ADMIN_USER_ID,
    },
    {
        "id": TEMPLATE_BF,
        "name": "Template B&F (Bens de Capital e Ferramental)",
        "description": "Template para projetos da Linha de Bens de Capital e Ferramental Aeronáutico",
        "template_type": "bf",
        "funding_source_id": FUNDING_SOURCE_BF,
        "is_default": True,
        "is_active": True,
        "tenant_id": TENANT_ID,
        "created_by": ADMIN_USER_ID,
    },
    {
        "id": TEMPLATE_DIRECT,
        "name": "Template Contratação Direta",
        "description": "Template para projetos de contratação direta com empresas",
        "template_type": "direct_contract",
        "funding_source_id": FUNDING_SOURCE_DIRECT,
        "is_default": True,
        "is_active": True,
        "tenant_id": TENANT_ID,
        "created_by": ADMIN_USER_ID,
    },
]


# =====================================================
# FIELD TEMPLATES (Template-specific fields)
# =====================================================

def get_embrapii_specific_fields() -> List[Dict[str, Any]]:
    """Fields specific to EMBRAPII proposals."""
    return [
        {
            "field_key": "embrapii_unit",
            "label": "Unidade EMBRAPII",
            "field_type": "select",
            "order": 100,
            "required": True,
            "help_text": "Unidade EMBRAPII credenciada que executará o projeto",
            "options": [
                {"value": "senai_ipt", "label": "SENAI/IPT - São Paulo"},
                {"value": "senai_cimatec", "label": "SENAI CIMATEC - Bahia"},
                {"value": "senai_isiqv", "label": "SENAI ISIQV - Química Verde"},
                {"value": "inpe", "label": "INPE - Aeroespacial"},
                {"value": "int", "label": "INT - Materiais"},
            ],
            "auto_fill_prompt": "Identifique qual unidade EMBRAPII está envolvida no projeto",
        },
        {
            "field_key": "company_contribution_percent",
            "label": "Contrapartida da Empresa (%)",
            "field_type": "number",
            "order": 101,
            "required": True,
            "help_text": "Percentual mínimo de 33% de contrapartida financeira",
            "validation_rules": {"min": 33, "max": 100},
            "auto_fill_prompt": "Extraia o percentual de contrapartida financeira da empresa",
        },
        {
            "field_key": "technical_challenges",
            "label": "Desafios Técnicos",
            "field_type": "textarea",
            "order": 102,
            "required": True,
            "help_text": "Descrição dos principais desafios técnicos que justificam a pesquisa",
            "auto_fill_prompt": "Liste os desafios técnicos e barreiras tecnológicas mencionados",
        },
        {
            "field_key": "innovation_degree",
            "label": "Grau de Inovação",
            "field_type": "select",
            "order": 103,
            "required": True,
            "options": [
                {"value": "incremental", "label": "Incremental"},
                {"value": "radical", "label": "Radical"},
                {"value": "disruptive", "label": "Disruptiva"},
            ],
        },
    ]


def get_finep_specific_fields() -> List[Dict[str, Any]]:
    """Fields specific to FINEP proposals."""
    return [
        {
            "field_key": "finep_line",
            "label": "Linha FINEP",
            "field_type": "select",
            "order": 100,
            "required": True,
            "options": [
                {"value": "subvencao", "label": "Subvenção Econômica"},
                {"value": "fndct", "label": "FNDCT - Fundo Nacional"},
                {"value": "tecnova", "label": "Tecnova II"},
                {"value": "inovacred", "label": "Inovacred"},
            ],
        },
        {
            "field_key": "economic_relevance",
            "label": "Relevância Econômica",
            "field_type": "textarea",
            "order": 101,
            "required": True,
            "help_text": "Justificativa de impacto econômico nacional",
            "auto_fill_prompt": "Identifique argumentos sobre impacto econômico e geração de emprego",
        },
        {
            "field_key": "strategic_sector",
            "label": "Setor Estratégico",
            "field_type": "select",
            "order": 102,
            "required": True,
            "options": [
                {"value": "aerospace", "label": "Aeroespacial e Defesa"},
                {"value": "health", "label": "Saúde"},
                {"value": "agriculture", "label": "Agronegócio"},
                {"value": "energy", "label": "Energia"},
                {"value": "tic", "label": "TIC"},
                {"value": "industry4", "label": "Indústria 4.0"},
            ],
        },
        {
            "field_key": "intellectual_property",
            "label": "Propriedade Intelectual",
            "field_type": "textarea",
            "order": 103,
            "required": False,
            "help_text": "Estratégia de proteção de PI e patentes esperadas",
        },
        {
            "field_key": "sustainability_impact",
            "label": "Impacto Ambiental/Sustentabilidade",
            "field_type": "textarea",
            "order": 104,
            "required": False,
            "auto_fill_prompt": "Identifique menções a sustentabilidade, redução de emissões ou impacto ambiental",
        },
    ]


def get_bndes_specific_fields() -> List[Dict[str, Any]]:
    """Fields specific to BNDES proposals."""
    return [
        {
            "field_key": "bndes_product",
            "label": "Produto BNDES",
            "field_type": "select",
            "order": 100,
            "required": True,
            "options": [
                {"value": "finem", "label": "BNDES Finem"},
                {"value": "finame", "label": "BNDES Finame"},
                {"value": "automatico", "label": "BNDES Automático"},
                {"value": "psi", "label": "PSI - Inovação"},
            ],
        },
        {
            "field_key": "credit_amount_requested",
            "label": "Valor do Crédito Solicitado (R$)",
            "field_type": "currency",
            "order": 101,
            "required": True,
        },
        {
            "field_key": "collateral_description",
            "label": "Descrição das Garantias",
            "field_type": "textarea",
            "order": 102,
            "required": True,
            "help_text": "Descreva as garantias oferecidas para o financiamento",
        },
        {
            "field_key": "economic_viability",
            "label": "Análise de Viabilidade Econômica",
            "field_type": "textarea",
            "order": 103,
            "required": True,
            "help_text": "TIR, VPL, Payback esperados",
            "auto_fill_prompt": "Extraia indicadores financeiros como TIR, VPL, payback, ROI",
        },
        {
            "field_key": "jobs_generated",
            "label": "Empregos Gerados",
            "field_type": "number",
            "order": 104,
            "required": False,
            "help_text": "Quantidade estimada de empregos diretos e indiretos",
        },
    ]


def get_bf_specific_fields() -> List[Dict[str, Any]]:
    """Fields specific to B&F (Bens de Capital e Ferramental) proposals."""
    return [
        {
            "field_key": "bf_category",
            "label": "Categoria B&F",
            "field_type": "select",
            "order": 100,
            "required": True,
            "help_text": "Categoria do projeto dentro do programa B&F",
            "options": [
                {"value": "ferramental", "label": "Ferramental Aeronáutico"},
                {"value": "maquinas", "label": "Máquinas e Equipamentos"},
                {"value": "dispositivos", "label": "Dispositivos de Montagem"},
                {"value": "gabaritos", "label": "Gabaritos"},
                {"value": "moldes", "label": "Moldes e Matrizes"},
            ],
        },
        {
            "field_key": "aircraft_program",
            "label": "Programa de Aeronave",
            "field_type": "text",
            "order": 101,
            "required": True,
            "help_text": "Nome do programa de aeronave (ex: KC-390, E2-Jets)",
            "auto_fill_prompt": "Identifique o programa de aeronave mencionado",
        },
        {
            "field_key": "part_number",
            "label": "Part Number / Conjunto",
            "field_type": "text",
            "order": 102,
            "required": False,
            "help_text": "Número da peça ou conjunto afetado",
        },
        {
            "field_key": "oem_partner",
            "label": "Parceiro OEM",
            "field_type": "text",
            "order": 103,
            "required": True,
            "help_text": "OEM parceiro no projeto (ex: Embraer, Boeing)",
            "auto_fill_prompt": "Identifique a empresa OEM/fabricante de aeronaves envolvida",
        },
        {
            "field_key": "production_rate_impact",
            "label": "Impacto na Taxa de Produção",
            "field_type": "textarea",
            "order": 104,
            "required": False,
            "help_text": "Como o projeto impacta a taxa de produção (rate)",
        },
        {
            "field_key": "certification_requirements",
            "label": "Requisitos de Certificação",
            "field_type": "array",
            "order": 105,
            "required": False,
            "help_text": "Certificações necessárias (ANAC, FAA, EASA, AS9100, Nadcap)",
        },
        {
            "field_key": "offset_agreement",
            "label": "Acordo de Offset",
            "field_type": "textarea",
            "order": 106,
            "required": False,
            "help_text": "Detalhes do acordo de offset/compensação tecnológica",
            "auto_fill_prompt": "Identifique menções a acordos de offset ou compensação",
        },
    ]


def get_direct_contract_fields() -> List[Dict[str, Any]]:
    """Fields specific to direct contract proposals."""
    return [
        {
            "field_key": "contracting_company",
            "label": "Empresa Contratante",
            "field_type": "text",
            "order": 100,
            "required": True,
            "auto_fill_prompt": "Identifique o nome da empresa que está contratando o projeto",
        },
        {
            "field_key": "company_cnpj",
            "label": "CNPJ da Empresa",
            "field_type": "text",
            "order": 101,
            "required": True,
            "validation_rules": {"pattern": r"^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$"},
            "auto_fill_prompt": "Extraia o CNPJ da empresa contratante",
        },
        {
            "field_key": "contract_type",
            "label": "Tipo de Contrato",
            "field_type": "select",
            "order": 102,
            "required": True,
            "options": [
                {"value": "pdi", "label": "P&D&I"},
                {"value": "consultoria", "label": "Consultoria Técnica"},
                {"value": "servicos", "label": "Prestação de Serviços"},
                {"value": "misto", "label": "Misto"},
            ],
        },
        {
            "field_key": "payment_terms",
            "label": "Condições de Pagamento",
            "field_type": "textarea",
            "order": 103,
            "required": True,
            "help_text": "Descreva marcos de pagamento e condições",
        },
        {
            "field_key": "confidentiality_level",
            "label": "Nível de Confidencialidade",
            "field_type": "select",
            "order": 104,
            "required": True,
            "options": [
                {"value": "public", "label": "Público"},
                {"value": "internal", "label": "Uso Interno"},
                {"value": "confidential", "label": "Confidencial"},
                {"value": "restricted", "label": "Restrito"},
            ],
        },
    ]


TEMPLATE_FIELDS = {
    TEMPLATE_EMBRAPII: get_embrapii_specific_fields(),
    TEMPLATE_FINEP: get_finep_specific_fields(),
    TEMPLATE_BNDES: get_bndes_specific_fields(),
    TEMPLATE_BF: get_bf_specific_fields(),
    TEMPLATE_DIRECT: get_direct_contract_fields(),
}


# =====================================================
# SAMPLE PROPOSALS
# =====================================================

SAMPLE_PROPOSALS = [
    # Proposal 1: B&F Textile Aeronautico (based on user's PDF)
    {
        "id": UUID("00000001-0001-0001-0001-000000000001"),
        "title": "Desenvolvimento de Tecnologia para Fabricação de Componentes Têxteis Aeronáuticos",
        "description": "Projeto para desenvolvimento de processos avançados de fabricação de componentes têxteis estruturais para aplicação aeronáutica, em parceria com a cadeia de fornecedores do setor.",
        "funding_source_id": FUNDING_SOURCE_BF,
        "template_id": TEMPLATE_BF,
        "project_id": PROJECT_TEXTILE,
        "status": "submitted",
        "current_version": 3,
        "adherence_score": 0.87,
        "tenant_id": TENANT_ID,
        "created_by": ANALYST_USER_ID,
        "field_values": {
            "title": "Desenvolvimento de Tecnologia para Fabricação de Componentes Têxteis Aeronáuticos",
            "executive_summary": "Este projeto visa desenvolver competências nacionais para a produção de componentes têxteis técnicos de alta performance para aplicação em estruturas aeronáuticas. A iniciativa contempla o desenvolvimento de processos de tecelagem 3D, tratamentos superficiais e qualificação de materiais segundo normas aeronáuticas internacionais.",
            "objectives": [
                "Desenvolver processos de tecelagem 3D para pré-formas estruturais",
                "Qualificar materiais segundo normas AMS e MIL-SPEC",
                "Estabelecer linha piloto com capacidade de 500 kg/mês",
                "Obter certificação AS9100 para a linha de produção",
                "Reduzir em 30% o custo de importação de componentes similares"
            ],
            "expected_results": [
                "3 patentes de processos depositadas",
                "Linha piloto operacional até M18",
                "5 fornecedores da cadeia qualificados",
                "Substituição de 40% das importações no programa-alvo"
            ],
            "justification": "O Brasil importa anualmente cerca de US$ 50 milhões em componentes têxteis aeronáuticos. O desenvolvimento de capacidade nacional não apenas reduz a dependência externa como fortalece a cadeia produtiva e gera empregos qualificados. A tecnologia desenvolvida poderá ser aplicada também nos setores automotivo e de defesa.",
            "methodology": "O projeto será executado em 5 fases: (1) Pesquisa de estado da arte e definição de requisitos; (2) Desenvolvimento de processos laboratoriais; (3) Scale-up para linha piloto; (4) Qualificação e testes de validação; (5) Transferência tecnológica e documentação.",
            "trl_initial": 3,
            "trl_target": 7,
            "budget": {
                "equipamentos": 2500000,
                "material_consumo": 800000,
                "recursos_humanos": 1200000,
                "viagens": 150000,
                "terceiros": 350000,
                "total": 5000000
            },
            "schedule": {
                "Fase 1 - Pesquisa": {"start": "2024-01", "end": "2024-04"},
                "Fase 2 - Desenvolvimento Lab": {"start": "2024-05", "end": "2024-10"},
                "Fase 3 - Scale-up": {"start": "2024-11", "end": "2025-06"},
                "Fase 4 - Qualificação": {"start": "2025-07", "end": "2025-12"},
                "Fase 5 - Transferência": {"start": "2026-01", "end": "2026-06"}
            },
            "team": [
                {"name": "Dr. Carlos Silva", "role": "Coordenador Técnico", "institution": "SENAI", "hours_per_week": 40},
                {"name": "Eng. Maria Santos", "role": "Líder de Processos", "institution": "SENAI", "hours_per_week": 40},
                {"name": "Dr. João Oliveira", "role": "Especialista Materiais", "institution": "IPT", "hours_per_week": 20},
                {"name": "Eng. Ana Costa", "role": "Qualidade/Certificação", "institution": "SENAI", "hours_per_week": 30}
            ],
            "infrastructure": "Laboratório de Ensaios Mecânicos, Linha Piloto de Tecelagem, Sala Limpa Classe 10.000, Autoclave 2m³",
            # B&F specific fields
            "bf_category": "ferramental",
            "aircraft_program": "KC-390",
            "part_number": "KC390-STR-TEX-001",
            "oem_partner": "Embraer S.A.",
            "production_rate_impact": "Capacidade para suportar rate de 12 aeronaves/ano",
            "certification_requirements": ["AS9100D", "Nadcap - Composites", "ANAC - DOA"],
            "offset_agreement": "Projeto desenvolvido no âmbito do acordo de offset Brasil-Suécia para o programa Gripen, com transferência de know-how da SAAB.",
        },
        "versions": [
            {
                "version_number": 1,
                "commit_message": "Versão inicial da proposta - escopo preliminar",
                "changes_summary": "Criação da proposta com estrutura básica e objetivos preliminares",
                "created_by": ANALYST_USER_ID,
                "created_at": datetime(2024, 1, 15, 10, 30),
            },
            {
                "version_number": 2,
                "commit_message": "Revisão após feedback do OEM - ajuste de escopo e cronograma",
                "changes_summary": "Incluído Part Number específico, ajustado cronograma para 30 meses, adicionados requisitos de certificação",
                "created_by": ANALYST_USER_ID,
                "created_at": datetime(2024, 2, 5, 14, 15),
            },
            {
                "version_number": 3,
                "commit_message": "Versão final para submissão - orçamento detalhado aprovado",
                "changes_summary": "Orçamento revisado pela diretoria, equipe confirmada, acordo de offset documentado",
                "created_by": ADMIN_USER_ID,
                "created_at": datetime(2024, 2, 20, 9, 0),
            },
        ],
    },
    
    # Proposal 2: EMBRAPII - Materiais Compósitos
    {
        "id": UUID("00000001-0001-0001-0001-000000000002"),
        "title": "Desenvolvimento de Compósitos Termoplásticos para Estruturas Aeronáuticas",
        "description": "Pesquisa aplicada para desenvolvimento de materiais compósitos termoplásticos com foco em redução de peso e custo de fabricação de componentes estruturais secundários.",
        "funding_source_id": FUNDING_SOURCE_EMBRAPII,
        "template_id": TEMPLATE_EMBRAPII,
        "project_id": PROJECT_AEROSPACE,
        "status": "approved",
        "current_version": 2,
        "adherence_score": 0.92,
        "tenant_id": TENANT_ID,
        "created_by": ANALYST_USER_ID,
        "field_values": {
            "title": "Desenvolvimento de Compósitos Termoplásticos para Estruturas Aeronáuticas",
            "executive_summary": "Projeto de desenvolvimento de compósitos termoplásticos reforçados com fibra de carbono (CF-PEEK) para aplicação em estruturas secundárias de aeronaves comerciais, visando redução de 15% no peso e 25% no custo de fabricação comparado a compósitos termofixos.",
            "objectives": [
                "Desenvolver formulações de PEEK/CF otimizadas para conformação rápida",
                "Validar processo de stamp forming para geometrias complexas",
                "Caracterizar propriedades mecânicas segundo CMH-17",
                "Demonstrar viabilidade técnico-econômica para produção seriada"
            ],
            "justification": "Compósitos termoplásticos oferecem vantagens de processamento (ciclos mais curtos, soldabilidade, reciclabilidade) que podem revolucionar a fabricação de estruturas aeronáuticas.",
            "methodology": "Abordagem TRL-driven iniciando em TRL 2 (conceito) avançando para TRL 5 (validação em ambiente relevante).",
            "trl_initial": 2,
            "trl_target": 5,
            "budget": {
                "pesquisa": 800000,
                "equipamentos": 1200000,
                "materiais": 400000,
                "total": 2400000
            },
            "schedule": {
                "Fase 1": {"start": "2024-03", "end": "2024-08"},
                "Fase 2": {"start": "2024-09", "end": "2025-02"},
                "Fase 3": {"start": "2025-03", "end": "2025-08"}
            },
            "team": [
                {"name": "Dra. Paula Mendes", "role": "Coordenadora", "institution": "SENAI CIMATEC", "hours_per_week": 40},
                {"name": "MSc. Roberto Lima", "role": "Pesquisador", "institution": "SENAI CIMATEC", "hours_per_week": 40}
            ],
            # EMBRAPII specific
            "embrapii_unit": "senai_cimatec",
            "company_contribution_percent": 40,
            "technical_challenges": "Processamento de PEEK requer temperaturas acima de 380°C, controle preciso de cristalização e conformação sob pressão. O desafio é desenvolver processo produtivo economicamente viável.",
            "innovation_degree": "radical",
        },
        "versions": [
            {
                "version_number": 1,
                "commit_message": "Proposta inicial submetida à EMBRAPII",
                "changes_summary": "Versão inicial com escopo técnico e orçamento preliminar",
                "created_by": ANALYST_USER_ID,
                "created_at": datetime(2024, 3, 1, 11, 0),
            },
            {
                "version_number": 2,
                "commit_message": "Ajustes após análise técnica EMBRAPII",
                "changes_summary": "Contrapartida ajustada para 40%, cronograma revisado, escopo refinado",
                "created_by": ANALYST_USER_ID,
                "created_at": datetime(2024, 3, 15, 16, 30),
            },
        ],
    },
    
    # Proposal 3: FINEP - IA para Qualidade
    {
        "id": UUID("00000001-0001-0001-0001-000000000003"),
        "title": "Sistema de Visão Computacional e IA para Inspeção de Qualidade em Linha de Produção Aeronáutica",
        "description": "Desenvolvimento de sistema integrado de visão computacional com deep learning para detecção automática de defeitos em componentes aeronáuticos durante o processo produtivo.",
        "funding_source_id": FUNDING_SOURCE_FINEP,
        "template_id": TEMPLATE_FINEP,
        "project_id": PROJECT_AEROSPACE,
        "status": "under_review",
        "current_version": 1,
        "adherence_score": 0.78,
        "tenant_id": TENANT_ID,
        "created_by": ADMIN_USER_ID,
        "field_values": {
            "title": "Sistema de Visão Computacional e IA para Inspeção de Qualidade em Linha de Produção Aeronáutica",
            "executive_summary": "Projeto para desenvolvimento de sistema de inspeção automatizada utilizando câmeras de alta resolução e algoritmos de deep learning para detecção de defeitos superficiais, dimensionais e de montagem em componentes aeronáuticos, reduzindo tempo de inspeção em 70% e aumentando taxa de detecção para 99.5%.",
            "objectives": [
                "Desenvolver algoritmos de detecção baseados em CNN/Transformer",
                "Criar base de dados anotada com 100.000+ imagens de defeitos",
                "Integrar sistema com linha de produção existente",
                "Validar em ambiente de produção real"
            ],
            "justification": "A inspeção manual de componentes aeronáuticos é processo demorado e sujeito a variabilidade. Sistemas automatizados aumentam produtividade e confiabilidade.",
            "methodology": "Desenvolvimento ágil com sprints quinzenais, integração contínua e validação incremental em ambiente produtivo.",
            "trl_initial": 4,
            "trl_target": 8,
            "budget": {
                "hardware": 600000,
                "software": 300000,
                "pessoal": 900000,
                "total": 1800000
            },
            # FINEP specific
            "finep_line": "subvencao",
            "economic_relevance": "Potencial de redução de custo de qualidade em R$ 5 milhões/ano por linha. Tecnologia exportável para outros países do Mercosul.",
            "strategic_sector": "industry4",
            "intellectual_property": "Previsão de 2 patentes de software e 1 de processo. Licenciamento para outras empresas do setor.",
            "sustainability_impact": "Redução de retrabalho diminui consumo de energia e materiais. Menor desperdício de componentes rejeitados.",
        },
    },
    
    # Proposal 4: Direct Contract - Consultoria Automotiva
    {
        "id": UUID("00000001-0001-0001-0001-000000000004"),
        "title": "Consultoria para Implementação de Manufatura Aditiva em Ferramentaria Automotiva",
        "description": "Projeto de consultoria técnica para diagnóstico e implementação de tecnologias de manufatura aditiva na ferramentaria de montadora automotiva.",
        "funding_source_id": FUNDING_SOURCE_DIRECT,
        "template_id": TEMPLATE_DIRECT,
        "project_id": PROJECT_AUTOMOTIVE,
        "status": "draft",
        "current_version": 1,
        "adherence_score": None,
        "tenant_id": TENANT_ID,
        "created_by": ANALYST_USER_ID,
        "field_values": {
            "title": "Consultoria para Implementação de Manufatura Aditiva em Ferramentaria Automotiva",
            "executive_summary": "Projeto de consultoria técnica especializada para apoiar a implementação de tecnologias de impressão 3D metálica (DMLS/SLM) na ferramentaria da empresa, visando redução de lead time de 8 para 2 semanas em ferramentas de tryout.",
            "objectives": [
                "Realizar diagnóstico do parque atual de ferramentaria",
                "Selecionar casos de uso prioritários para AM",
                "Especificar equipamentos e processos adequados",
                "Treinar equipe técnica (20 pessoas)"
            ],
            "budget": {
                "consultoria": 450000,
                "treinamento": 50000,
                "total": 500000
            },
            # Direct contract specific
            "contracting_company": "Volkswagen do Brasil Indústria de Veículos Automotores Ltda",
            "company_cnpj": "59.104.422/0001-50",
            "contract_type": "consultoria",
            "payment_terms": "30% na assinatura, 40% na entrega do diagnóstico, 30% na conclusão dos treinamentos",
            "confidentiality_level": "confidential",
        },
    },
]


async def seed_proposal_templates(db_session) -> None:
    """Seed proposal templates into database."""
    from adapters.database.models import ProposalTemplateModel, ProposalFieldTemplateModel
    from sqlalchemy import select
    
    logger.info("Seeding proposal templates...")
    
    for template_data in PROPOSAL_TEMPLATES:
        # Check if already exists
        stmt = select(ProposalTemplateModel).where(
            ProposalTemplateModel.id == template_data["id"]
        )
        existing = await db_session.execute(stmt)
        if existing.scalar_one_or_none():
            logger.info(f"Template {template_data['name']} already exists, skipping")
            continue
        
        template = ProposalTemplateModel(
            id=template_data["id"],
            name=template_data["name"],
            description=template_data["description"],
            template_type=template_data["template_type"],
            funding_source_id=template_data.get("funding_source_id"),
            is_default=template_data["is_default"],
            is_active=template_data["is_active"],
            tenant_id=template_data["tenant_id"],
            created_by=template_data["created_by"],
            updated_by=template_data["created_by"],
        )
        db_session.add(template)
        
        # Add field templates
        fields = TEMPLATE_FIELDS.get(template_data["id"], [])
        for idx, field_data in enumerate(fields):
            field = ProposalFieldTemplateModel(
                id=uuid4(),
                template_id=template_data["id"],
                field_key=field_data["field_key"],
                label=field_data["label"],
                field_type=field_data["field_type"],
                order=field_data.get("order", idx * 10),
                required=field_data.get("required", False),
                help_text=field_data.get("help_text"),
                placeholder=field_data.get("placeholder"),
                validation_rules=field_data.get("validation_rules"),
                options=field_data.get("options"),
                auto_fill_prompt=field_data.get("auto_fill_prompt"),
                tenant_id=template_data["tenant_id"],
                created_by=template_data["created_by"],
                updated_by=template_data["created_by"],
            )
            db_session.add(field)
        
        logger.info(f"Created template: {template_data['name']} with {len(fields)} fields")
    
    await db_session.commit()


async def seed_proposals(db_session) -> None:
    """Seed sample proposals into database."""
    from adapters.database.models import (
        ProposalModel, ProposalVersionModel, ProposalFieldValueModel
    )
    from sqlalchemy import select
    
    logger.info("Seeding sample proposals...")
    
    for proposal_data in SAMPLE_PROPOSALS:
        # Check if already exists
        stmt = select(ProposalModel).where(
            ProposalModel.id == proposal_data["id"]
        )
        existing = await db_session.execute(stmt)
        if existing.scalar_one_or_none():
            logger.info(f"Proposal {proposal_data['title'][:50]}... already exists, skipping")
            continue
        
        # Create proposal
        proposal = ProposalModel(
            id=proposal_data["id"],
            title=proposal_data["title"],
            description=proposal_data["description"],
            status=proposal_data["status"],
            funding_source_id=proposal_data.get("funding_source_id"),
            template_id=proposal_data.get("template_id"),
            project_id=proposal_data.get("project_id"),
            current_version=proposal_data["current_version"],
            latest_adherence_score=proposal_data.get("adherence_score"),
            tenant_id=proposal_data["tenant_id"],
            created_by=proposal_data["created_by"],
            updated_by=proposal_data["created_by"],
        )
        db_session.add(proposal)
        
        # Add field values
        field_values = proposal_data.get("field_values", {})
        for field_key, value in field_values.items():
            field_value = ProposalFieldValueModel(
                id=uuid4(),
                proposal_id=proposal_data["id"],
                field_key=field_key,
                value=value,
                is_ai_suggested=False,
                is_confirmed=True,
                confirmed_by=proposal_data["created_by"],
                confirmed_at=datetime.utcnow(),
                tenant_id=proposal_data["tenant_id"],
                created_by=proposal_data["created_by"],
                updated_by=proposal_data["created_by"],
            )
            db_session.add(field_value)
        
        # Add versions
        versions = proposal_data.get("versions", [])
        for version_data in versions:
            version = ProposalVersionModel(
                id=uuid4(),
                proposal_id=proposal_data["id"],
                version_number=version_data["version_number"],
                content_snapshot={"field_values": field_values},
                changes_summary=version_data.get("changes_summary"),
                commit_message=version_data.get("commit_message"),
                tenant_id=proposal_data["tenant_id"],
                created_by=version_data["created_by"],
                created_at=version_data.get("created_at", datetime.utcnow()),
            )
            db_session.add(version)
        
        logger.info(f"Created proposal: {proposal_data['title'][:50]}... with {len(field_values)} fields, {len(versions)} versions")
    
    await db_session.commit()


async def run_seeds() -> None:
    """Main entry point for running seeds."""
    from adapters.database.db import get_async_session_maker
    from sqlalchemy.ext.asyncio import AsyncSession
    
    logger.info("Starting proposal seeds...")
    
    async_session_maker = get_async_session_maker()
    
    async with async_session_maker() as session:
        await seed_proposal_templates(session)
        await seed_proposals(session)
    
    logger.info("Proposal seeds completed!")


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(run_seeds())
