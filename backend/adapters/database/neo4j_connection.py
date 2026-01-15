# Neo4j Connection for Graph Database
from neo4j import AsyncGraphDatabase, AsyncDriver
from typing import Optional, Dict, Any
import os
from dotenv import load_dotenv
import logging

load_dotenv()
logger = logging.getLogger(__name__)


class Neo4jConnection:
    """
    Neo4j connection manager for lineage tracking and matching graphs.
    Implements RF-01.03 and RF-06 graph visualization.
    """
    
    def __init__(self):
        self.uri = os.getenv("NEO4J_URI", "bolt://localhost:7687")
        self.user = os.getenv("NEO4J_USER", "neo4j")
        self.password = os.getenv("NEO4J_PASSWORD", "changeme")
        self._driver: Optional[AsyncDriver] = None
    
    async def connect(self) -> None:
        """Establish connection to Neo4j."""
        if not self._driver:
            self._driver = AsyncGraphDatabase.driver(
                self.uri,
                auth=(self.user, self.password)
            )
            logger.info(f"Connected to Neo4j at {self.uri}")
    
    async def close(self) -> None:
        """Close Neo4j connection."""
        if self._driver:
            await self._driver.close()
            self._driver = None
            logger.info("Neo4j connection closed")
    
    async def execute_query(
        self,
        query: str,
        parameters: Optional[Dict[str, Any]] = None
    ) -> list:
        """Execute a Cypher query."""
        if not self._driver:
            await self.connect()
        
        async with self._driver.session() as session:
            result = await session.run(query, parameters or {})
            records = await result.data()
            return records
    
    async def create_lineage_node(
        self,
        ingestion_id: str,
        source_name: str,
        tenant_id: str,
        metadata: Dict[str, Any]
    ) -> None:
        """
        Create a lineage node in Neo4j for data tracking.
        Implements RF-01.03: Rastrear a origem dos dados
        """
        query = """
        CREATE (n:DataLineage {
            ingestion_id: $ingestion_id,
            source: $source_name,
            tenant_id: $tenant_id,
            timestamp: datetime(),
            metadata: $metadata
        })
        RETURN n
        """
        
        await self.execute_query(
            query,
            {
                "ingestion_id": ingestion_id,
                "source_name": source_name,
                "tenant_id": tenant_id,
                "metadata": metadata
            }
        )
        
        logger.info(f"Created lineage node for ingestion {ingestion_id}")
    
    async def create_matching_graph(
        self,
        opportunity_id: str,
        matches: list,
        tenant_id: str
    ) -> Dict[str, Any]:
        """
        Create a matching graph in Neo4j for visualization.
        Implements RF-06: Representação em grafo
        """
        # Create opportunity node
        opportunity_query = """
        MERGE (o:Opportunity {id: $opportunity_id, tenant_id: $tenant_id})
        RETURN o
        """
        
        await self.execute_query(
            opportunity_query,
            {"opportunity_id": opportunity_id, "tenant_id": tenant_id}
        )
        
        # Create capability and funding nodes with relationships
        for match in matches:
            match_query = """
            MATCH (o:Opportunity {id: $opportunity_id})
            MERGE (c:Capability {id: $capability_id})
            MERGE (f:Funding {id: $funding_id})
            CREATE (o)-[r1:MATCHED_WITH {
                score: $composite_score,
                technical: $technical,
                financial: $financial,
                strategic: $strategic,
                formula: $formula
            }]->(c)
            CREATE (c)-[r2:FUNDED_BY]->(f)
            RETURN o, c, f, r1, r2
            """
            
            await self.execute_query(
                match_query,
                {
                    "opportunity_id": opportunity_id,
                    "capability_id": str(match.capability_id),
                    "funding_id": str(match.funding_source_id),
                    "composite_score": float(match.composite_score),
                    "technical": float(match.technical_feasibility_score),
                    "financial": float(match.financial_viability_score),
                    "strategic": float(match.strategic_alignment_score),
                    "formula": match.calculation_formula
                }
            )
        
        # Get graph data for visualization
        viz_query = """
        MATCH (o:Opportunity {id: $opportunity_id})-[r:MATCHED_WITH]->(c:Capability)-[:FUNDED_BY]->(f:Funding)
        RETURN o, r, c, f
        ORDER BY r.score DESC
        LIMIT 10
        """
        
        graph_data = await self.execute_query(
            viz_query,
            {"opportunity_id": opportunity_id}
        )
        
        logger.info(f"Created matching graph for opportunity {opportunity_id}")
        
        return {"nodes": len(graph_data), "relationships": graph_data}


# Global Neo4j connection instance
neo4j_connection = Neo4jConnection()
