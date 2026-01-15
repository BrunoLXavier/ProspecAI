# External API Client for CNPJ data
# Implements RF-04: Preenchimento automático via API de CNPJ
import httpx
from typing import Dict, Any, Optional
import logging
from datetime import datetime

logger = logging.getLogger(__name__)


class CNPJAPIClient:
    """
    Client for fetching company data from CNPJ API.
    Implements RF-04: Integração com API de CNPJ (Receita Federal)
    """
    
    def __init__(self, api_url: str = "https://brasilapi.com.br/api/cnpj/v1", timeout: int = 10):
        self.api_url = api_url
        self.timeout = timeout
    
    async def fetch_cnpj(self, cnpj: str) -> Dict[str, Any]:
        """
        Fetch company data from CNPJ API.
        
        Args:
            cnpj: CNPJ number (14 digits)
            
        Returns:
            Dict with company data and confidence score
        """
        # Clean CNPJ (remove formatting)
        clean_cnpj = cnpj.replace(".", "").replace("/", "").replace("-", "")
        
        if len(clean_cnpj) != 14:
            raise ValueError("CNPJ must have 14 digits")
        
        logger.info(f"Fetching CNPJ data for {clean_cnpj}")
        
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(f"{self.api_url}/{clean_cnpj}")
                response.raise_for_status()
                
                data = response.json()
                
                # Transform API response to our format
                transformed = self._transform_response(data)
                
                logger.info(f"CNPJ data fetched successfully for {clean_cnpj}")
                
                return {
                    **transformed,
                    "confidence": 1.0,  # API data is authoritative
                    "source": "BrasilAPI",
                    "fetched_at": datetime.utcnow().isoformat()
                }
                
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error fetching CNPJ {clean_cnpj}: {e}")
            return {
                "error": f"CNPJ not found or API error: {e.response.status_code}",
                "confidence": 0.0
            }
        
        except Exception as e:
            logger.error(f"Error fetching CNPJ {clean_cnpj}: {e}")
            return {
                "error": str(e),
                "confidence": 0.0
            }
    
    def _transform_response(self, api_data: Dict[str, Any]) -> Dict[str, Any]:
        """Transform API response to application format."""
        return {
            "nome": api_data.get("razao_social", api_data.get("nome_fantasia")),
            "nome_fantasia": api_data.get("nome_fantasia"),
            "cnpj": api_data.get("cnpj"),
            "email": api_data.get("email"),
            "telefone": self._format_phone(api_data),
            "endereco": {
                "logradouro": api_data.get("logradouro"),
                "numero": api_data.get("numero"),
                "complemento": api_data.get("complemento"),
                "bairro": api_data.get("bairro"),
                "municipio": api_data.get("municipio"),
                "uf": api_data.get("uf"),
                "cep": api_data.get("cep")
            },
            "porte": api_data.get("porte"),
            "natureza_juridica": api_data.get("natureza_juridica"),
            "atividade_principal": api_data.get("cnae_fiscal_descricao"),
            "data_abertura": api_data.get("data_inicio_atividade"),
            "situacao_cadastral": api_data.get("descricao_situacao_cadastral")
        }
    
    def _format_phone(self, api_data: Dict[str, Any]) -> Optional[str]:
        """Format phone number from API data."""
        ddd = api_data.get("ddd_telefone_1")
        phone = api_data.get("telefone_1")
        
        if ddd and phone:
            return f"({ddd}) {phone}"
        
        return None
