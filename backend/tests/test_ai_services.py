"""
Unit Tests for AI/ML Services
Tests AI components with mock data
"""
import pytest
from infrastructure.ai.lgpd_agent import LGPDAgent
from infrastructure.ai.matching_engine import MatchingEngine
from infrastructure.ai.nlp_service import NLPService


class TestLGPDAgent:
    """
    Test LGPD Agent for PII detection and masking
    Implements RF-01.02
    """
    
    def setup_method(self):
        """Setup test fixtures"""
        # Provide a valid 32-byte AES key (for AES-256)
        encryption_key = b"0123456789abcdef0123456789abcdef"  # 32 bytes
        self.agent = LGPDAgent(encryption_key=encryption_key)
    
    def test_detect_cpf(self):
        """Test CPF detection"""
        text = "Meu CPF é 123.456.789-00"
        results = self.agent.detect_pii(text)
        
        assert len(results) == 1
        assert results[0]['type'] == 'cpf'
        assert results[0]['value'] == '123.456.789-00'
        assert results[0]['confidence'] > 0.95
    
    def test_detect_cnpj(self):
        """Test CNPJ detection"""
        text = "CNPJ: 12.345.678/0001-90"
        results = self.agent.detect_pii(text)
        
        assert len(results) == 1
        assert results[0]['type'] == 'cnpj'
        assert results[0]['value'] == '12.345.678/0001-90'
    
    def test_detect_email(self):
        """Test email detection"""
        text = "Contato: usuario@empresa.com.br"
        results = self.agent.detect_pii(text)
        
        assert len(results) == 1
        assert results[0]['type'] == 'email'
        assert results[0]['value'] == 'usuario@empresa.com.br'
    
    def test_mask_cpf_irreversible(self):
        """Test irreversible CPF masking"""
        text = "CPF: 123.456.789-00"
        masked = self.agent.mask_pii(text, reversible=False)
        
        assert "123.456.789-00" not in masked
        assert "***" in masked or "XXX" in masked
    
    def test_mask_email_reversible(self):
        """Test reversible email masking (pseudonymization)"""
        text = "Email: usuario@empresa.com"
        masked = self.agent.mask_pii(text, reversible=True)
        
        # Should be pseudonymized with a token
        assert "usuario@empresa.com" not in masked
        assert "PII_TOKEN_" in masked or masked != text
    
    def test_multiple_pii_detection(self):
        """Test detection of multiple PII types"""
        text = "João Silva, CPF 123.456.789-00, email: joao@email.com, fone: (11) 98765-4321"
        results = self.agent.detect_pii(text)
        
        # Should detect CPF, email, and phone
        assert len(results) >= 3
        types_found = {r['type'] for r in results}
        assert 'cpf' in types_found
        assert 'email' in types_found
        assert 'phone' in types_found


class TestMatchingEngine:
    """
    Test Matching Engine algorithm
    Implements RF-06
    """
    
    def setup_method(self):
        """Setup test fixtures"""
        self.engine = MatchingEngine()
    
    def test_calculate_composite_score(self):
        """Test composite score calculation with formula"""
        technical = 0.8
        financial = 0.7
        strategic = 0.9
        
        score = self.engine.calculate_composite_score(
            technical_viability=technical,
            financial_viability=financial,
            strategic_alignment=strategic,
        )
        
        # Formula: (0.8 * 0.4) + (0.7 * 0.3) + (0.9 * 0.3) = 0.8
        expected = (technical * 0.4) + (financial * 0.3) + (strategic * 0.3)
        assert abs(score - expected) < 0.01
        assert 0 <= score <= 1
    
    def test_calculate_technical_viability(self):
        """Test technical viability calculation"""
        project_data = {
            'current_trl': 6,
            'research_area': 'Indústria 4.0',
            'methodology': 'Agile development',
        }
        
        funding_data = {
            'trl_min': 3,
            'trl_max': 9,
            'focus_areas': ['Indústria 4.0', 'IoT'],
        }
        
        viability = self.engine.calculate_technical_viability(
            project_data, funding_data
        )
        
        assert isinstance(viability, float)
        assert 0 <= viability <= 1
        # Should be high since TRL is within range and area matches
        assert viability > 0.6
    
    def test_calculate_financial_viability(self):
        """Test financial viability calculation"""
        project_budget = 1000000.0
        funding_amount = 1500000.0
        
        viability = self.engine.calculate_financial_viability(
            project_budget, funding_amount
        )
        
        assert isinstance(viability, float)
        assert 0 <= viability <= 1
        # Budget fits within funding, should score high
        assert viability > 0.7
    
    def test_low_score_when_trl_mismatch(self):
        """Test that TRL mismatch results in lower score"""
        project_data = {
            'current_trl': 2,  # Very early stage
            'research_area': 'Test',
            'methodology': 'Test',
        }
        
        funding_data = {
            'trl_min': 7,  # Only accepts mature projects
            'trl_max': 9,
            'focus_areas': ['Test'],
        }
        
        viability = self.engine.calculate_technical_viability(
            project_data, funding_data
        )
        
        # Should be low due to TRL mismatch
        assert viability < 0.5


class TestNLPService:
    """
    Test NLP Service for demand detection
    Implements RF-04
    """
    
    def setup_method(self):
        """Setup test fixtures"""
        self.nlp = NLPService()
    
    def test_detect_funding_demand(self):
        """Test detection of funding-related demands"""
        text = "Precisamos de recursos financeiros para o projeto de inovação"
        demands = self.nlp.detect_implicit_demands(text)
        
        assert 'funding' in demands
        assert demands['funding']['confidence'] > 0.6
    
    def test_detect_technology_demand(self):
        """Test detection of technology demands"""
        text = "Queremos implementar automação e inteligência artificial"
        demands = self.nlp.detect_implicit_demands(text)
        
        assert 'technology' in demands
        assert 'ai' in demands['technology']['keywords'] or 'automation' in demands['technology']['keywords']
    
    def test_detect_multiple_demands(self):
        """Test detection of multiple demand categories"""
        text = """
        Precisamos de financiamento para desenvolver tecnologia 
        sustentável com foco em inovação e parceria com universidades
        """
        demands = self.nlp.detect_implicit_demands(text)
        
        # Should detect funding, technology, sustainability, and partnership
        assert len(demands) >= 3
        assert 'funding' in demands
        assert 'sustainability' in demands or 'technology' in demands
    
    def test_no_demands_in_neutral_text(self):
        """Test that neutral text doesn't trigger false positives"""
        text = "A reunião está marcada para amanhã às 10h"
        demands = self.nlp.detect_implicit_demands(text)
        
        # Should detect very few or no demands
        assert len(demands) <= 1
