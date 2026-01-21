Esta é a Especificação de Requisitos de Software (ERS) para o sistema **ProspecAI**, redigida conforme a norma **ISO/IEC/IEEE 29148**, desenhada para servir como fonte da verdade para o desenvolvimento via Github Copilot.

---

# Especificação de Requisitos: ProspecAI (v3.0)

## 1. Introdução
### 1.1 Propósito
Este documento define os requisitos funcionais e não funcionais do **ProspecAI**, um sistema SaaS inteligente para prospecção de projetos de P&D. Ele serve como base para a implementação, garantindo que o Github Copilot tenha contexto completo sobre arquitetura, modelos de dados e regras de negócio.

### 1.2 Escopo
O sistema abrange desde a ingestão de dados multiorigem até o matching inteligente de demandas e capacidades, integrando IA com validação humana obrigatória (**human-in-the-loop**).

### 1.3 Glossário
*   **TRL (Technology Readiness Level):** Nível de maturidade tecnológica (1 a 9).
*   **PLN/NLP:** Processamento de Linguagem Natural para análise de textos e detecção de PII.
*   **PII (Personally Identifiable Information):** Dados sensíveis (CPF, e-mail) protegidos pela LGPD.
*   **Human-in-the-loop:** Exigência de validação humana para qualquer decisão ou sugestão da IA.
*   **Matching:** Algoritmo de emparelhamento entre demandas, capacidades e fomento.

---

## 2. Visão Geral do Sistema e Arquitetura
Para garantir a **rastreabilidade**, o código deve seguir a **Clean Architecture**, dividindo-se em:
1.  **Domain:** Entidades e regras de negócio puras.
2.  **Use Cases:** Orquestradores de lógica da aplicação.
3.  **Adapters/Interfaces:** Implementações de bancos (PostgreSQL, Neo4j) e APIs.
4.  **Infrastructure:** Frameworks (FastAPI, Next.js).

**Stack Tecnológica Obrigatória:**
*   **Backend:** FastAPI (Python 3.11).
*   **Frontend:** Next.js 14 (TypeScript) com Tailwind CSS.
*   **Bancos:** PostgreSQL 15 (Relacional/JSONB) e Neo4j (Grafos).
*   **Mensageria:** Apache Kafka para trilhas de auditoria e processamento assíncrono.
*   **IA:** MLflow para rastreio de modelos; BERTimbau para NER (Reconhecimento de Entidades Nomeadas).

---

## 3. Requisitos Funcionais (RF)

### RF-01: Ingestão e Orquestração de Dados Multiorigem
*   **Descrição:** O sistema deve ingerir dados de fontes públicas (RAIS, INPI, FINEP, etc.), privadas e internas.
*   **Sub-requisitos:**
    *   **RF-01.01:** Suporte a processamento em batch e real-time via Kafka.
    *   **RF-01.02 (LGPD Agent):** Uso de IA para detectar PII e aplicar mascaramento reversível ou anonimização.
    *   **RF-01.03 (Linhagem):** Rastrear a origem dos dados no Neo4j.
*   **Rastreabilidade no Código:** Comentários devem referenciar `[RF-01]` em `IngestaoService` e `IngestaoRepository`.

### RF-02: Gestão de Fontes de Fomento
*   **Descrição:** Cadastro e monitoramento de editais e oportunidades de financiamento.
*   **Campos Obrigatórios:** Nome, Tipo de Instrumento, TRL Mín/Máx (1-9), Valor Disponível, Prazos.
*   **IA Auxiliar:** Sugestão automática de preenchimento de campos com base no texto do edital (confiança exibida em badges: Verde >80%, Amarelo 60-80%).

### RF-03: Gestão do Portfólio Institucional
*   **Descrição:** Cadastro versionado de projetos, equipes, competências e infraestrutura.
*   **Regra de Negócio:** Todo projeto deve estar associado a um nível TRL e a um histórico de lições aprendidas.

### RF-04: CRM Inteligente
*   **Descrição:** Gestão de clientes e interações com sugestão de "demandas implícitas" via PLN.
*   **Funcionalidade:** Preenchimento automático de dados cadastrais via integração com API de CNPJ (Receita Federal).

### RF-05: Pipeline de Oportunidades
*   **Descrição:** Visualização Kanban com estágios: Inteligência → Validação → Abordagem → Registro → Conversão → Pós-venda.
*   **Métrica:** Cálculo de score de priorização (0-100) com exibição transparente da fórmula.

### RF-06: Matching Estratégico
*   **Descrição:** Algoritmo para calcular a aderência entre Demandas + Capacidades + Fomento.
*   **Fórmula Base:** `Score = (Viabilidade Técnica * 0.4) + (Financeira * 0.3) + (Estratégica * 0.3)`.
*   **Visualização:** Representação em grafo no Neo4j para identificar redes de conexão.

### RF-07: Analytics e Assistente (Chatbot)
*   **Descrição:** Dashboard com projeções preditivas e chatbot explicável para consultas em linguagem natural.
*   **Observabilidade:** Dashboards no Grafana para monitorar taxas de ingestão e erros.

### RF-08: Gestão de Propostas e Conhecimento
*   **Descrição:** Repositório versionado (estilo Git) para documentos, com colaboração em tempo real e análise de aderência de propostas ao edital via IA.

### RF-09: Relatórios e Exportação
*   **Descrição:** Geração de relatórios operacionais (PDF/CSV) e integração com Power BI.

---

## 4. Requisitos Não Funcionais (RNF)

*   **RNF-01 (Segurança):** Criptografia **AES-256** para dados PII (e-mails, CNPJ) e valores monetários.
*   **RNF-02 (Acesso):** Controle via **RBAC** (Admin, Gestor, Analista, Viewer) com segurança em nível de linha (**RLS**) no PostgreSQL.
*   **RNF-03 (Desempenho):** Consultas em filtros avançados devem responder em **<2 segundos** para até 1 milhão de registros.
*   **RNF-04 (Ética de IA):** Todas as sugestões de IA devem exibir o score de confiança e permitir substituição manual (Human-in-the-loop).
*   **RNF-05 (i18n):** Suporte nativo a Português (pt-BR), Inglês (en-US) e Espanhol (es-ES) sem strings hardcoded (uso de `t()`).
*   **RNF-06 (Auditoria):** Logs de alteração mantidos por **5 anos**, contendo timestamp, ID do usuário, ação e diff (antes/depois).

---

## 5. Diretrizes de Implementação (Instruções para o Copilot)
1.  **Idioma:** Todo o código, comentários e documentação técnica devem ser em **Inglês**.
2.  **Solid & Clean:** Aplique rigorosamente os princípios SOLID. Funções não devem exceder 50 linhas.
3.  **Traceability:** Cada classe de serviço deve conter no cabeçalho o ID do requisito que implementa (ex: `// Implements RF-01`).
4.  **Soft Delete:** Nunca use `DELETE` físico. Utilize flags de status ou `deleted_at`.
5.  **Multi-tenancy:** Utilize `tenant_id` em todas as tabelas para isolamento lógico de dados.

---
**Metáfora para implementação:** Imagine o ProspecAI como um **maestro de orquestra**: a IA sugere a partitura e o ritmo (matching e ingestão), mas o regente humano tem a batuta final, decidindo quais notas serão tocadas no pipeline de oportunidades.

---

## 6. Production Infrastructure Implementation

### 6.1 Docker Stack & Service Orchestration
- **Status:** 100% of 11 services running and healthy (Backend, Frontend, PostgreSQL 15, Neo4j 5.16, Redis 7, Kafka 7.5, Zookeeper, external IdP (removed), Grafana, MLflow, MinIO)
- **Startup:** Use `start-docker.bat` for reliable, sequenced initialization and health checks (recommended for Windows). Manual `docker-compose up -d` is supported but may have timing issues.
- **Dependency Ordering:** Infrastructure tier (Postgres, Redis, Zookeeper, MinIO, MLflow, Grafana) → Kafka → Neo4j → Backend → Frontend.
- **Health Checks:** All critical services have health checks and status validation before dependent services start.
- **Credentials:**
  - PostgreSQL: postgres:changeme @localhost:5432
  - Neo4j: neo4j:changeme @localhost:7687
  - MinIO: minioadmin:minioadmin
  - Authentication provider: internal JWT (no external IdP)
  - Grafana: admin:admin

### 6.2 Key Fixes & Improvements (2026-01-12)
- **Backend Watchfiles:** Removed `--reload` from backend command to fix Windows/Docker inotify issues.
- **Neo4j PID Issue:** Cleaned volumes and ensured fresh initialization to avoid stale PID errors.
- **Service Sequencing:** Implemented strict dependency sequencing and health validation for all containers.
- **Automated Startup:** Batch script provides clear status, error handling, and health validation.
- **All services tested and verified working.**

### 6.3 Quick Commands & Troubleshooting
- **Start all services:**
  ```bash
  C:\Projetos\SENAI\"ProspecIA 2.0"\start-docker.bat
  # or
  docker-compose up -d
  ```
- **Check status:**
  ```bash
  docker-compose ps
  docker-compose logs -f backend
  curl http://localhost:8000/health
  ```
- **Stop all:**
  ```bash
  docker-compose down
  ```
- **Hard reset (remove all data):**
  ```bash
  docker-compose down -v
  # Then run: start-docker.bat
  ```
- **Access points:**
  - Frontend: http://localhost:3000
  - Backend API: http://localhost:8000
  - API Docs: http://localhost:8000/docs
  - Neo4j: http://localhost:7474
  - Authentication provider: internal JWT (no external IdP)
  - Grafana: http://localhost:3001
  - MinIO: http://localhost:9001
  - MLflow: http://localhost:5000

### 6.4 Performance & Verification
- **Build & Startup:** ~80 seconds (build + start all services)
- **First startup:** May take 2-3 minutes for all services to become healthy
- **Model download:** Backend downloads BERTimbau model on first request (~1GB)
- **Memory usage:** 4-6GB RAM for all services
- **Disk usage:** ~50GB (including model caches and volumes)
- **Health endpoint:** ~5-10ms response
- **API responses:** 200 OK
- **Database queries:** Responding

### 6.5 Documentation & Reporting
- All infrastructure, status, and quick start documentation consolidated into this requirements file.
- For full command reference, see QUICK_REFERENCE.md (now deprecated, content merged here).
- Implementation history and technical reports are tracked in implementation_history.md.

## 7. Testing Guide

### 7.1 Backend Testing (Python/pytest)

**Estrutura de Testes:**
```
backend/tests/
├── conftest.py                    # Fixtures globais
├── unit/
│   └── test_entities.py           # Testes de entidades de domínio
└── integration/
    ├── test_analytics_api.py      # API de analytics
    ├── test_reports_api.py        # API de relatórios
    └── test_files_api.py          # API de arquivos
```

**Executando Testes:**
```bash
cd backend

# Todos os testes
pytest

# Com coverage
pytest --cov=. --cov-report=html

# Apenas unit tests
pytest tests/unit/ -v

# Apenas integration tests
pytest tests/integration/ -v

# Teste específico
pytest tests/unit/test_entities.py::TestFundingSource -v
```

### 7.2 Frontend Testing (E2E removed)

Frontend E2E tests have been removed from this repository. If you need to add E2E tests later, reintroduce a test framework and related configuration.


### 7.3 Coverage Goals

| Nível | Mínimo | Ideal |
|-------|--------|-------|
| Unit Tests | 70% | 85% |
| Integration Tests | 60% | 80% |
| E2E (Critical Paths) | 100% | 100% |

---

## 8. Quick Reference Commands

### Docker Commands
```bash
# Start all services
docker-compose up -d

# Rebuild and start
docker-compose up -d --build

# View all containers
docker ps -a

# Check service logs
docker-compose logs backend --tail 50
docker-compose logs -f backend

# Full stack restart
docker-compose down
docker-compose up -d

# Clean rebuild
docker-compose down -v
docker-compose up -d --build
```

### Health Checks
```bash
# Backend health
curl http://localhost:8000/health

# PostgreSQL
docker-compose exec postgres psql -U prospecai -d prospecai -c "SELECT version();"

# Neo4j
docker-compose exec neo4j cypher-shell -u neo4j -p password "MATCH (n) RETURN count(n)"

# Redis
docker-compose exec redis redis-cli ping
```

### Test Commands
```bash
# Backend tests
docker-compose exec backend pytest tests/ -v

# Frontend E2E tests: removed from repository
# To re-enable, add an E2E framework and scripts under `frontend/`
```

### Service URLs
| Service | URL | Notes |
|---------|-----|-------|
| Backend API | http://localhost:8000 | FastAPI backend |
| Backend Docs | http://localhost:8000/docs | Swagger UI |
| Frontend | http://localhost:3000 | Next.js app |
| Neo4j Browser | http://localhost:7474 | Graph DB UI |
| Grafana | http://localhost:3001 | Monitoring |
| MinIO Console | http://localhost:9000 | S3 storage |
| MLflow | http://localhost:5000 | Model tracking |
| Authentication (internal JWT) | n/a | internal JWT (no external IdP) |

---

## 9. Security Checklist

| Item | Status | Notes |
|------|--------|-------|
| Database RLS | ✅ Ready | Row-Level Security via tenant_id |
| Password Security | ✅ Ready | Bcrypt hashing implemented |
| CORS | ✅ Configured | Origins properly restricted |
| HTTPS | ⏳ TLS Needed | Configure in production |
| API Rate Limiting | ⏳ Optional | Consider adding middleware |
| Input Validation | ✅ Pydantic | All endpoints validated |
| SQL Injection Prevention | ✅ ORM | SQLAlchemy parameterized queries |

---

## 10. Production Deployment Checklist

### Pre-Deployment Verification
- [ ] Backend API healthy and operational
- [ ] All 11 Docker services running
- [ ] Database migrations ready (Alembic)
- [ ] E2E tests created and executed
- [ ] Code quality standards met (Clean Architecture)
- [ ] Load testing completed
- [ ] Security audit completed
- [ ] Performance optimization completed

### Deployment Steps
```bash
# 1. Backup current database
docker-compose exec postgres pg_dump -U postgres prospecai > backup.sql

# 2. Deploy code changes
git pull origin main

# 3. Rebuild Docker images
docker-compose build

# 4. Start services with health checks
docker-compose up -d

# 5. Verify all services healthy
docker-compose ps

# 6. Run smoke tests
curl http://localhost:8000/health
curl http://localhost:3000
```