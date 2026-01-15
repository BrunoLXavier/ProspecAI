# Implements RF-01: Ingestão e Orquestração de Dados Multiorigem
from typing import Dict, Any, List, Optional
from uuid import UUID
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


class IngestDataUseCase:
    """
    Orchestrates multi-source data ingestion with LGPD compliance.
    Implements RF-01: Ingestão e Orquestração de Dados Multiorigem
    """
    
    def __init__(
        self,
        data_repository,
        kafka_producer,
        lgpd_agent,
        lineage_repository
    ):
        self.data_repository = data_repository
        self.kafka_producer = kafka_producer
        self.lgpd_agent = lgpd_agent
        self.lineage_repository = lineage_repository
    
    async def ingest_from_source(
        self,
        source_name: str,
        data: Dict[str, Any],
        tenant_id: UUID,
        user_id: UUID,
        batch_mode: bool = False
    ) -> Dict[str, Any]:
        """
        Ingest data from a specific source.
        
        Args:
            source_name: Name of the data source (RAIS, INPI, FINEP, etc.)
            data: Raw data to ingest
            tenant_id: Tenant identifier for multi-tenancy
            user_id: User performing the ingestion
            batch_mode: Whether to process in batch or real-time
            
        Returns:
            Dict with ingestion results and statistics
        """
        logger.info(f"Starting ingestion from {source_name} for tenant {tenant_id}")
        
        try:
            # Step 1: Detect and mask PII (RF-01.02 - LGPD Agent)
            pii_detection_result = await self.lgpd_agent.detect_and_mask_pii(data)
            masked_data = pii_detection_result["masked_data"]
            pii_detected = pii_detection_result["pii_fields"]
            
            logger.info(f"PII detection complete. Found {len(pii_detected)} PII fields")
            
            # Step 2: Store data in repository
            ingestion_id = await self.data_repository.store(
                source=source_name,
                data=masked_data,
                tenant_id=tenant_id,
                created_by=user_id,
                metadata={
                    "pii_detected": pii_detected,
                    "batch_mode": batch_mode,
                    "timestamp": datetime.utcnow().isoformat()
                }
            )
            
            # Step 3: Record lineage in Neo4j (RF-01.03)
            await self.lineage_repository.create_lineage(
                ingestion_id=ingestion_id,
                source_name=source_name,
                tenant_id=tenant_id,
                pii_fields=pii_detected
            )
            
            # Step 4: Publish to Kafka for async processing (RF-01.01)
            await self.kafka_producer.send(
                topic="prospecai.ingestion",
                value={
                    "ingestion_id": str(ingestion_id),
                    "source": source_name,
                    "tenant_id": str(tenant_id),
                    "timestamp": datetime.utcnow().isoformat(),
                    "record_count": len(data) if isinstance(data, list) else 1
                }
            )
            
            return {
                "success": True,
                "ingestion_id": str(ingestion_id),
                "source": source_name,
                "records_processed": len(data) if isinstance(data, list) else 1,
                "pii_fields_detected": len(pii_detected),
                "batch_mode": batch_mode
            }
            
        except Exception as e:
            logger.error(f"Ingestion failed: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "source": source_name
            }
    
    async def get_lineage(
        self,
        entity_id: UUID,
        tenant_id: UUID
    ) -> Dict[str, Any]:
        """
        Retrieve data lineage for a specific entity.
        Implements RF-01.03: Rastrear a origem dos dados
        """
        lineage = await self.lineage_repository.get_lineage_graph(
            entity_id=entity_id,
            tenant_id=tenant_id
        )
        return lineage
