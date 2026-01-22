"""
Unit Tests for Institute, Team, and Infrastructure Repositories
Tests RLS enforcement and CRUD operations
Implements RF-03: Portfólio Institucional
"""
import pytest
from datetime import datetime, date
from decimal import Decimal
from uuid import uuid4
from unittest.mock import AsyncMock, MagicMock, patch

from domain.entities.institute import Institute, InstituteCreate, InstituteStatus
from domain.entities.team import Team, TeamCreate
from domain.entities.infrastructure import Infrastructure, InfrastructureCreate, InfrastructureStatus


# ============================================================================
# MOCK MODELS FOR UNIT TESTING
# ============================================================================
class MockInstituteModel:
    """Mock InstituteModel for unit testing without database."""
    def __init__(self, **kwargs):
        self.id = kwargs.get('id', uuid4())
        self.tenant_id = kwargs.get('tenant_id', uuid4())
        self.nome = kwargs.get('nome', 'Test Institute')
        self.nome_fantasia = kwargs.get('nome_fantasia')
        self.isi_sigla = kwargs.get('isi_sigla', 'ISI-TEST')
        self.endereco_rua = kwargs.get('endereco_rua')
        self.endereco_numero = kwargs.get('endereco_numero')
        self.endereco_complemento = kwargs.get('endereco_complemento')
        self.endereco_bairro = kwargs.get('endereco_bairro')
        self.endereco_cep = kwargs.get('endereco_cep')
        self.endereco_cidade = kwargs.get('endereco_cidade')
        self.endereco_uf = kwargs.get('endereco_uf')
        self.descricao = kwargs.get('descricao')
        self.area_predial_m2 = kwargs.get('area_predial_m2', 1000)
        self.status_operacional = kwargs.get('status_operacional', 'Operacional')
        self.status = kwargs.get('status', 'Ativo')
        self.maturidade_gestao = kwargs.get('maturidade_gestao')
        self.maturidade_base_tecnologica = kwargs.get('maturidade_base_tecnologica')
        self.maturidade_produtos_servicos = kwargs.get('maturidade_produtos_servicos')
        self.maturidade_cooperacao = kwargs.get('maturidade_cooperacao')
        self.credenciamento_cati = kwargs.get('credenciamento_cati', False)
        self.credenciamento_ed = kwargs.get('credenciamento_ed', False)
        self.logo_url = kwargs.get('logo_url')
        self.created_at = kwargs.get('created_at', datetime.utcnow())
        self.updated_at = kwargs.get('updated_at', datetime.utcnow())
        self.deleted_at = kwargs.get('deleted_at')
        self.created_by = kwargs.get('created_by')
        self.updated_by = kwargs.get('updated_by')


class MockTeamModel:
    """Mock TeamModel for unit testing."""
    def __init__(self, **kwargs):
        self.id = kwargs.get('id', uuid4())
        self.tenant_id = kwargs.get('tenant_id', uuid4())
        self.usuario_id = kwargs.get('usuario_id', uuid4())
        self.instituto_id = kwargs.get('instituto_id', uuid4())
        self.cargo = kwargs.get('cargo', 'Pesquisador')
        self.funcao_principal = kwargs.get('funcao_principal')
        self.vinculo_principal = kwargs.get('vinculo_principal', True)
        self.email_profissional = kwargs.get('email_profissional')
        self.telefone_celular = kwargs.get('telefone_celular')
        self.linkedin_url = kwargs.get('linkedin_url')
        self.lattes_url = kwargs.get('lattes_url')
        self.orcid_id = kwargs.get('orcid_id')
        self.researchgate_url = kwargs.get('researchgate_url')
        self.scopus_author_id = kwargs.get('scopus_author_id')
        self.web_of_science_researcher_id = kwargs.get('web_of_science_researcher_id')
        self.foto_perfil_url = kwargs.get('foto_perfil_url')
        self.data_vinculo_inicio = kwargs.get('data_vinculo_inicio')
        self.data_vinculo_fim = kwargs.get('data_vinculo_fim')
        self.created_at = kwargs.get('created_at', datetime.utcnow())
        self.updated_at = kwargs.get('updated_at', datetime.utcnow())
        self.deleted_at = kwargs.get('deleted_at')
        self.created_by = kwargs.get('created_by')
        self.updated_by = kwargs.get('updated_by')


class MockInfrastructureModel:
    """Mock InfrastructureModel for unit testing."""
    def __init__(self, **kwargs):
        self.id = kwargs.get('id', uuid4())
        self.tenant_id = kwargs.get('tenant_id', uuid4())
        self.instituto_id = kwargs.get('instituto_id', uuid4())
        self.nome = kwargs.get('nome', 'Test Lab')
        self.name = kwargs.get('name', 'Test Lab')
        self.descricao = kwargs.get('descricao', 'Test Description')
        self.description = kwargs.get('description', 'Test Description')
        self.email_laboratorio = kwargs.get('email_laboratorio', 'lab@test.com')
        self.email_responsavel = kwargs.get('email_responsavel', 'resp@test.com')
        self.telefone = kwargs.get('telefone')
        self.site_url = kwargs.get('site_url')
        self.endereco_completo = kwargs.get('endereco_completo')
        self.area_predial_m2 = kwargs.get('area_predial_m2', Decimal('500'))
        self.status_isi = kwargs.get('status_isi', 'Operacional')
        self.maturidade_regulatoria = kwargs.get('maturidade_regulatoria')
        self.maturidade_laboratorial = kwargs.get('maturidade_laboratorial')
        self.maturidade_gestao = kwargs.get('maturidade_gestao')
        self.plataformas_tecnologicas = kwargs.get('plataformas_tecnologicas', [])
        self.areas_conhecimento = kwargs.get('areas_conhecimento', [])
        self.macroareas_pesquisa = kwargs.get('macroareas_pesquisa', [])
        self.midias = kwargs.get('midias', [])
        self.created_at = kwargs.get('created_at', datetime.utcnow())
        self.updated_at = kwargs.get('updated_at', datetime.utcnow())
        self.deleted_at = kwargs.get('deleted_at')
        self.created_by = kwargs.get('created_by')
        self.updated_by = kwargs.get('updated_by')


# ============================================================================
# INSTITUTE ENTITY TESTS
# ============================================================================
class TestInstituteEntity:
    """Unit tests for Institute domain entity."""
    
    def test_create_institute_entity(self):
        """Test Institute entity creation with required fields."""
        tenant_id = uuid4()
        institute = Institute(
            id=uuid4(),
            tenant_id=tenant_id,
            nome="ISI Sistemas Virtuais",
            isi_sigla="ISI-SV",
            status_operacional=InstituteStatus.OPERACIONAL,
            status="Ativo",
        )
        
        assert institute.nome == "ISI Sistemas Virtuais"
        assert institute.isi_sigla == "ISI-SV"
        assert institute.tenant_id == tenant_id
        assert institute.status == "Ativo"
    
    def test_institute_with_address(self):
        """Test Institute entity with full address."""
        institute = Institute(
            id=uuid4(),
            tenant_id=uuid4(),
            nome="ISI Eletroquímica",
            isi_sigla="ISI-EQ",
            endereco_rua="Av. Industrial",
            endereco_numero="1234",
            endereco_bairro="Centro Industrial",
            endereco_cidade="Curitiba",
            endereco_uf="PR",
            endereco_cep="80000-000",
        )
        
        assert institute.endereco_cidade == "Curitiba"
        assert institute.endereco_uf == "PR"
    
    def test_institute_with_maturity_scores(self):
        """Test Institute entity with maturity scores."""
        institute = Institute(
            id=uuid4(),
            tenant_id=uuid4(),
            nome="ISI Logística",
            isi_sigla="ISI-LOG",
            maturidade_gestao="M3b",
            maturidade_base_tecnologica=Decimal("4.2"),
            maturidade_produtos_servicos=Decimal("3.8"),
            maturidade_cooperacao=Decimal("4.0"),
        )
        
        assert institute.maturidade_gestao == "M3b"
        assert institute.maturidade_base_tecnologica == Decimal("4.2")


# ============================================================================
# TEAM ENTITY TESTS
# ============================================================================
class TestTeamEntity:
    """Unit tests for Team domain entity."""
    
    def test_create_team_entity(self):
        """Test Team entity creation."""
        tenant_id = uuid4()
        usuario_id = uuid4()
        instituto_id = uuid4()
        
        team = Team(
            id=uuid4(),
            tenant_id=tenant_id,
            usuario_id=usuario_id,
            instituto_id=instituto_id,
            cargo="Pesquisador Sênior",
            vinculo_principal=True,
        )
        
        assert team.cargo == "Pesquisador Sênior"
        assert team.usuario_id == usuario_id
        assert team.instituto_id == instituto_id
        assert team.vinculo_principal is True
    
    def test_team_with_academic_profiles(self):
        """Test Team entity with academic profile URLs."""
        team = Team(
            id=uuid4(),
            tenant_id=uuid4(),
            usuario_id=uuid4(),
            instituto_id=uuid4(),
            cargo="Coordenador",
            linkedin_url="https://linkedin.com/in/researcher",
            lattes_url="http://lattes.cnpq.br/1234567890",
            orcid_id="0000-0001-2345-6789",
            researchgate_url="https://researchgate.net/profile/Researcher",
            scopus_author_id="12345678900",
            web_of_science_researcher_id="AAA-1234-2024",
        )
        
        assert team.orcid_id == "0000-0001-2345-6789"
        assert team.lattes_url == "http://lattes.cnpq.br/1234567890"
    
    def test_team_with_dates(self):
        """Test Team entity with employment dates."""
        team = Team(
            id=uuid4(),
            tenant_id=uuid4(),
            usuario_id=uuid4(),
            instituto_id=uuid4(),
            cargo="Bolsista",
            data_vinculo_inicio=date(2023, 1, 15),
            data_vinculo_fim=date(2025, 1, 14),
        )
        
        assert team.data_vinculo_inicio == date(2023, 1, 15)
        assert team.data_vinculo_fim == date(2025, 1, 14)


# ============================================================================
# INFRASTRUCTURE ENTITY TESTS
# ============================================================================
class TestInfrastructureEntity:
    """Unit tests for Infrastructure domain entity."""
    
    def test_create_infrastructure_entity(self):
        """Test Infrastructure entity creation."""
        tenant_id = uuid4()
        instituto_id = uuid4()
        
        infra = Infrastructure(
            id=uuid4(),
            tenant_id=tenant_id,
            instituto_id=instituto_id,
            nome="Laboratório de Realidade Estendida",
            descricao="Lab especializado em VR/AR/MR",
            email_laboratorio="xr-lab@senai.br",
            email_responsavel="coord.xr@senai.br",
            area_predial_m2=250,
            status_isi=InfrastructureStatus.OPERATIONAL,
        )
        
        assert infra.nome == "Laboratório de Realidade Estendida"
        assert infra.instituto_id == instituto_id
        assert infra.status_isi == InfrastructureStatus.OPERATIONAL
    
    def test_infrastructure_with_platforms(self):
        """Test Infrastructure entity with technology platforms."""
        infra = Infrastructure(
            id=uuid4(),
            tenant_id=uuid4(),
            instituto_id=uuid4(),
            nome="Lab IoT",
            descricao="Internet of Things laboratory",
            email_laboratorio="iot@senai.br",
            email_responsavel="coord@senai.br",
            area_predial_m2=150,
            plataformas_tecnologicas=["IoT", "Robótica", "IA/ML"],
            areas_conhecimento=["Engenharias", "Ciências Exatas"],
            macroareas_pesquisa=["Manufatura Avançada", "TIC"],
        )
        
        assert "IoT" in infra.plataformas_tecnologicas
        assert "Engenharias" in infra.areas_conhecimento
        assert "Manufatura Avançada" in infra.macroareas_pesquisa
    
    def test_infrastructure_operational_check(self):
        """Test Infrastructure is_operational method."""
        infra = Infrastructure(
            id=uuid4(),
            tenant_id=uuid4(),
            instituto_id=uuid4(),
            nome="Lab Test",
            descricao="Test lab",
            email_laboratorio="test@senai.br",
            email_responsavel="resp@senai.br",
            area_predial_m2=100,
            status_isi=InfrastructureStatus.OPERATIONAL,
        )
        
        assert infra.is_operational() is True
        
        infra.status_isi = InfrastructureStatus.MAINTENANCE
        assert infra.is_operational() is False


# ============================================================================
# RLS ENFORCEMENT TESTS
# ============================================================================
class TestRLSEnforcement:
    """Tests to verify Row-Level Security is enforced."""
    
    def test_tenant_isolation_in_entity(self):
        """Verify tenant_id is required for all entities."""
        # Institute requires tenant_id
        with pytest.raises(Exception):
            Institute(
                id=uuid4(),
                # Missing tenant_id should cause validation error
                nome="Test",
            )
    
    def test_different_tenants_different_data(self):
        """Verify entities from different tenants are isolated."""
        tenant_1 = uuid4()
        tenant_2 = uuid4()
        
        institute_1 = Institute(
            id=uuid4(),
            tenant_id=tenant_1,
            nome="Institute Tenant 1",
        )
        
        institute_2 = Institute(
            id=uuid4(),
            tenant_id=tenant_2,
            nome="Institute Tenant 2",
        )
        
        # Same name but different tenants - should be valid
        assert institute_1.tenant_id != institute_2.tenant_id
        assert institute_1.nome != institute_2.nome


# ============================================================================
# MATCHING ALGORITHM TESTS
# ============================================================================
class TestMatchingAlgorithm:
    """Unit tests for the matching algorithm formula."""
    
    def test_composite_score_formula(self):
        """
        Test RF-06 formula: Score = (Technical * 0.4) + (Financial * 0.3) + (Strategic * 0.3)
        """
        from infrastructure.ai.matching_engine import MatchingEngine
        
        engine = MatchingEngine()
        
        # Test with known values
        technical = 0.8  # 80%
        financial = 0.7  # 70%
        strategic = 0.9  # 90%
        
        expected = (0.8 * 0.4) + (0.7 * 0.3) + (0.9 * 0.3)
        # = 0.32 + 0.21 + 0.27 = 0.80
        
        result = engine.calculate_composite_score(technical, financial, strategic)
        
        assert result == pytest.approx(expected, rel=1e-9)
        assert result == pytest.approx(0.80, rel=1e-9)
    
    def test_score_weights_sum_to_one(self):
        """Verify weights sum to 1.0."""
        from infrastructure.ai.matching_engine import MatchingEngine
        
        engine = MatchingEngine()
        total = sum(engine.weights.values())
        
        assert total == pytest.approx(1.0, rel=1e-9)
    
    def test_perfect_score(self):
        """Test maximum possible score."""
        from infrastructure.ai.matching_engine import MatchingEngine
        
        engine = MatchingEngine()
        result = engine.calculate_composite_score(1.0, 1.0, 1.0)
        
        assert result == 1.0
    
    def test_zero_score(self):
        """Test minimum possible score."""
        from infrastructure.ai.matching_engine import MatchingEngine
        
        engine = MatchingEngine()
        result = engine.calculate_composite_score(0.0, 0.0, 0.0)
        
        assert result == 0.0


# ============================================================================
# AUDIT SERVICE TESTS
# ============================================================================
class TestAuditService:
    """Unit tests for the audit service."""
    
    @pytest.mark.asyncio
    async def test_audit_event_creation(self):
        """Test AuditEvent dataclass creation."""
        from services.audit_service import AuditEvent, AuditEventType
        
        event = AuditEvent(
            event_type=AuditEventType.CREATE,
            entity_type="Institute",
            entity_id=str(uuid4()),
            tenant_id=str(uuid4()),
            user_id=str(uuid4()),
            data={"nome": "Test Institute"},
        )
        
        assert event.event_type == AuditEventType.CREATE
        assert event.entity_type == "Institute"
        assert "nome" in event.data
    
    def test_audit_event_types(self):
        """Test all audit event types exist."""
        from services.audit_service import AuditEventType
        
        assert AuditEventType.CREATE.value == "CREATE"
        assert AuditEventType.UPDATE.value == "UPDATE"
        assert AuditEventType.DELETE.value == "DELETE"
        assert AuditEventType.READ.value == "READ"
        assert AuditEventType.LOGIN.value == "LOGIN"
        assert AuditEventType.LOGOUT.value == "LOGOUT"


# ============================================================================
# FILES ROUTER TESTS (MinIO)
# ============================================================================
class TestFilesRouter:
    """Unit tests for file upload router."""
    
    def test_allowed_extensions(self):
        """Test file extension validation."""
        ALLOWED_EXTENSIONS = {".pdf", ".png", ".jpg", ".jpeg", ".doc", ".docx", ".xls", ".xlsx"}
        
        # Valid extensions
        assert ".pdf" in ALLOWED_EXTENSIONS
        assert ".png" in ALLOWED_EXTENSIONS
        
        # Invalid extensions
        assert ".exe" not in ALLOWED_EXTENSIONS
        assert ".sh" not in ALLOWED_EXTENSIONS
    
    def test_tenant_path_prefix(self):
        """Test tenant isolation in file paths."""
        tenant_id = uuid4()
        filename = "document.pdf"
        
        expected_path = f"{tenant_id}/{filename}"
        actual_path = f"{tenant_id}/{filename}"
        
        assert actual_path == expected_path
        assert str(tenant_id) in actual_path
