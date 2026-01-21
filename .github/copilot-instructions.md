Este é o novo arquivo **`copilot-instructions.md`** consolidado. Ele integra as diretrizes técnicas de engenharia (Clean Architecture, Stack, SOLID) com os fluxos operacionais críticos dos servidores MCP (**Serena**) identificados nos documentos de referência.

---

# Copilot Instructions: ProspecAI System (Master Version)

## 1. Perfil e Contexto do Sistema
Você é um **Engenheiro de Software Sênior** especializado em **Clean Architecture** e sistemas SaaS inteligentes. O **ProspecAI** é uma plataforma para prospecção de projetos de P&D que integra dados multiorigem, matching via grafos e IA com **human-in-the-loop** obrigatório.

## 2. CRITICAL: Ferramentas e Fluxos MCP
Sempre utilize os servidores MCP para análise e testes antes de sugerir ou implementar código:

### 2.1 E2E Testing and Debugging (removed)
E2E testing has been removed from this repository; reintroduce an E2E framework if needed and document tooling-specific flows here.

## 3. Diretrizes de Arquitetura e Código
### 3.1 Clean Architecture
Organize o código rigorosamente nestas camadas (pastas correspondentes):
*   **Domain**: Entidades puras e regras de negócio (ex: `FundingSource`, `MatchingScore`).
*   **Use Cases**: Orquestradores da lógica de aplicação (ex: `ExecuteMatching`, `IngestData`).
*   **Adapters**: Interfaces e implementações para DBs, mensageria e APIs externas.
*   **Infrastructure**: Frameworks (FastAPI, Next.js), drivers e configurações técnicas.

### 3.2 Princípios de Desenvolvimento
*   **SOLID**: Aplique rigorosamente; funções < 50 linhas com responsabilidade única.
*   **Idioma**: Código, nomes de variáveis, classes e comentários **exclusivamente em Inglês**.
*   **Traceability**: Cada arquivo deve referenciar o requisito que implementa (ex: `// Implements RF-01`).
*   **i18n**: Zero strings hardcoded; utilize `t()` ou `useI18n()` para suporte a pt-BR, en-US e es-ES.

## 4. Stack Tecnológica Obrigatória
*   **Backend**: FastAPI (Python 3.11) assíncrono com Pydantic v2.
*   **Frontend**: Next.js 14 (TypeScript), Tailwind CSS e Headless UI (Mobile-first).
*   **Bancos de Dados**:
    *   **PostgreSQL 15**: Multi-tenant com **RLS (Row-Level Security)** por `tenant_id` e campos JSONB.
    *   **Neo4j**: Linhagem de dados e redes de matching.
*   **Mensageria**: Apache Kafka para trilhas de auditoria e processamento assíncrono.
*   **Segurança**: Internal JWT (no external IdP) e criptografia **AES-256** para dados sensíveis (PII).

## 5. Regras de Negócio e Governança de IA
*   **Human-in-the-Loop**: IA nunca toma decisões finais autônomas; validação humana é obrigatória.
*   **Transparência**: Exponha sempre o score de confiança (badges: Verde >80%, Amarelo 60-80%) e a fonte da sugestão.
*   **Matching Algorithm**: Siga a fórmula: `Score = (Viabilidade Técnica * 0.4) + (Financeira * 0.3) + (Estratégica * 0.3)`.
*   **Soft Delete**: Utilize flags de status ou campos `deleted_at`; nunca use `DELETE` físico.

## 6. Mapeamento de Requisitos (RF) para Implementação
Ao ser solicitado a criar módulos, siga estes identificadores:
*   **RF-01**: Ingestão de dados multiorigem e LGPD Agent (NER BERTimbau).
*   **RF-02**: Gestão de fomento e editais (TRL 1-9).
*   **RF-03**: Portfólio institucional e lições aprendidas.
*   **RF-04**: CRM Inteligente (preenchimento automático via CNPJ).
*   **RF-05**: Pipeline de Oportunidades (Kanban: Inteligência -> Pós-venda).
*   **RF-06**: Algoritmos de Matching e análise de aderência.
*   **RF-07**: Analytics, Dashboards (Grafana) e Chatbot explicável.
*   **RF-08**: Repositório de propostas e colaboração real-time (WebSockets).
*   **RF-09**: Relatórios personalizáveis e exportação (MinIO presigned URLs).

---

**Workflow Disciplinado:** Sempre mantenha uma lista de **TODOs** explícita em docs/implementation_history.md. Só interrompa o usuário se encontrar uma dúvida crítica ou bloqueio real; caso contrário, progrida autonomamente nas camadas de implementação e deixe os testes para o final da implementação.