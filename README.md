# ProspecAI - Intelligent R&D Project Prospecting Platform

[![Clean Architecture](https://img.shields.io/badge/architecture-clean-blue.svg)](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
[![Python 3.11](https://img.shields.io/badge/python-3.11-blue.svg)](https://www.python.org/downloads/release/python-3110/)
[![Next.js 14](https://img.shields.io/badge/next.js-14-black.svg)](https://nextjs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Overview

**ProspecAI** is a SaaS platform for intelligent R&D project prospecting that integrates multi-source data, AI-powered matching algorithms, and human-in-the-loop validation to optimize the discovery and management of research funding opportunities.

### Key Features

- 🔄 **Multi-Source Data Ingestion** (RF-01) with LGPD compliance and automatic PII detection
- 💰 **Funding Management** (RF-02) with AI-assisted field extraction
- 📊 **Institutional Portfolio** (RF-03) with TRL tracking and lessons learned
- 🤝 **Intelligent CRM** (RF-04) with CNPJ auto-fill and implicit demand detection
- 📈 **Opportunity Pipeline** (RF-05) with Kanban visualization and transparent scoring
- 🎯 **Strategic Matching** (RF-06) using graph algorithms (Neo4j)
- 📉 **Analytics & Chatbot** (RF-07) with predictive insights
- 📝 **Proposal Management** (RF-08) with Git-like versioning
- 📑 **Reports & Export** (RF-09) with Power BI integration

---

## Architecture

### Clean Architecture Layers

```
backend/
├── domain/           # Business entities and rules (RF-01 to RF-09)
│   └── entities/     # Pydantic v2 models (FundingSource, Client, Opportunity, etc.)
├── use_cases/        # Application logic orchestration (ExecuteMatching, IngestData, etc.)
├── adapters/         # Database and API implementations
│   ├── database/     # PostgreSQL + Neo4j (SQLAlchemy models, connection)
│   ├── repositories/ # Data access layer
│   └── external/     # External APIs (CNPJ, etc.)
├── services/         # Business logic services (AI, analytics, audit, etc.)
│   ├── core/         # Email, encryption services
│   ├── ai/           # AI/ML pipelines
│   └── templates/    # Report/notification templates
├── routers/          # FastAPI route handlers
└── infrastructure/   # Framework config, JWT, DI container, WebSocket

frontend/
├── src/
│   ├── app/              # Next.js 14 pages (App Router) — 7 CRUD pages standardized
│   ├── components/
│   │   └── features/
│   │       ├── shared/
│   │       │   ├── ui/       # BaseModal, EntityModal, ConfirmModal, Pagination, ViewToggle
│   │       │   └── forms/    # FormInput, FormSelect, FormSlider, FormSwitch, etc.
│   │       └── {entity}/    # Board/Pipeline views per entity
│   ├── contexts/         # ACLContext, ToastContext, AuthContext, LocaleContext
│   ├── hooks/            # useCrudPage, useEntityForm, useDebounce
│   ├── lib/
│   │   ├── api-client.ts     # Axios + camelCase↔snake_case interceptors
│   │   └── form-registry/    # ★ Entity definitions (single source of truth)
│   │       ├── types.ts, build-zod-schema.ts, FormRenderer.tsx
│   │       └── definitions/  # 7 entity definitions (funding, client, team, etc.)
│   └── messages/         # i18n JSON (pt-BR, en-US, es-ES)
```

### Frontend Standardization (Phase 8)

All 7 CRUD entities follow a **single standardized pattern**:

| Component | Purpose |
|-----------|---------|
| **Entity Definition** (`lib/form-registry/definitions/`) | Declares fields, tabs, filters, validation, ACL in one file |
| **`useCrudPage` hook** | View modes, filters, pagination, modal state, React Query |
| **`EntityModal`** | Unified CRUD modal: BaseModal + ModalTabs + FormRenderer + useEntityForm + ACL |
| **`FormRenderer`** | Auto-renders form fields from definition — no manual JSX |
| **`buildZodSchema`** | Dynamic Zod validation from definition + i18n error messages |

**Prohibited:** Entity-specific modal components, direct Dialog/Transition imports, hardcoded strings, `snake_case` in frontend. See `frontend/.eslintrc.json` for enforcement.

### Technology Stack

| Layer | Technology | Details |
|-------|------------|---------|
| Backend | FastAPI (Python 3.11) | Async, Pydantic v2 |
| Frontend | Next.js 14 (TypeScript) | App Router, Tailwind CSS, Headless UI |
| Forms | react-hook-form + Zod | Dynamic schemas from entity definitions |
| Data Fetching | TanStack React Query v5 | Via `useCrudPage` hook |
| Databases | PostgreSQL 15 + Neo4j | RLS multi-tenant + graph matching |
| Messaging | Apache Kafka | Audit trails, async processing |
| Authentication | Internal JWT | No external IdP |
| AI/ML | BERTimbau (NER) + Sentence-Transformers | PII detection, semantic matching |
| Translation | Argos Translate + next-intl | pt-BR, en-US, es-ES |
| Storage | MinIO (S3-compatible) | Presigned URLs for exports |
| Monitoring | Grafana + Prometheus | Service health dashboards |

---

## Database Schema

> Full schema: consolidated migration at `backend/alembic/versions/20260123_consolidated_schema.py`

### Core Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `tenants` | Multi-tenant isolation | `name`, `slug`, `settings (jsonb)` |
| `users` | System users | `email`, `password_hash`, `tenant_id` (RLS) |
| `roles` / `user_roles` | RBAC permissions | `permissions (jsonb)` |
| `institutes` | Institutions (centers, universities) | `name`, `maturidade`, `metadata (jsonb)` |
| `teams` | Team members | `usuario_id`, `instituto_id`, `metadata (jsonb)` |
| `infrastructures` | Lab resources/equipment | `instituto_id`, `equipamentos (json)`, `capacity (jsonb)` |
| `funding_sources` | Funding opportunities/editais | `instrument_type`, `trl_min/max`, `total_amount`, `status` |
| `clients` | CRM contacts | `name`, `cnpj_encrypted`, `sector`, `detected_demands (json)` |
| `opportunities` | Pipeline stages | `stage`, `client_id`, `funding_source_id`, `probability_score` |
| `proposals` | Proposal metadata | `title`, `current_status`, `opportunity_id`, `funding_source_id` |
| `proposal_versions` | Version history (Git-like) | `proposal_id`, `version`, `content (jsonb)` |
| `matching_scores` | Matching algorithm results | `technical_score`, `financial_score`, `strategic_score`, `composite_score` |
| `portfolios` / `portfolio_projects` | Institutional project portfolio | `project_ids (jsonb)`, `trl_current/target`, `lessons_learned` |
| `pii_detections` | LGPD PII detection | `entities (jsonb)`, `anonymized_text`, `risk_level` |
| `ingestion_jobs` / `ingestion_sources` | Data ingestion pipeline | `status`, `pii_detected_count`, `progress_percentage` |
| `feedbacks` | User feedback system | `feedback_type`, `severity`, `annotation_data (jsonb)` |
| `communication_threads` / `messages` | Internal messaging | Threads, messages, attachments, meeting minutes |
| `audit_logs` | Full audit trail | Action, entity, user, timestamp, diff |

### Security Features

- **Row-Level Security (RLS)**: All tenant-scoped tables enforce `tenant_id` isolation via PostgreSQL policies
- **AES-256 Encryption**: PII fields (CNPJ, email, phone) encrypted at application layer
- **Soft Delete**: `deleted_at` timestamp — no physical DELETEs

---

## Prerequisites

- Docker & Docker Compose
- Node.js 20+ (for local frontend development)
- Python 3.11+ (for local backend development)

## Quick Start

### 1. Clone and Configure

```bash
git clone <repository-url>
cd "ProspecIA 2.0"
cp backend/.env.template backend/.env
```

### 2. Start All Services

```bash
docker-compose up -d
```

Services started:
- PostgreSQL (5432) · Neo4j (7474, 7687) · Kafka + Zookeeper (9092)
- MinIO (9000, 9001) · Grafana (3001) · Backend API (8000) · Frontend (3000)

### 3. Access the Application

| Service | URL | Credentials |
|---------|-----|-------------|
| Frontend | http://localhost:3000 | Login via app |
| API Docs | http://localhost:8000/api/docs | — |
| Grafana | http://localhost:3001 | admin/admin |
| Neo4j Browser | http://localhost:7474 | neo4j/changeme |

## Development

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
alembic upgrade head
uvicorn main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Docker Rebuild

```bash
# With cache (fast)
.\rebuild-docker.bat

# Without cache (clean)
.\rebuild-docker.bat --no-cache

# Frontend only
.\rebuild-docker.bat frontend
```

---

## Key Requirements Implementation

### RF-06: Matching Algorithm

```python
# Score = (Technical * 0.4) + (Financial * 0.3) + (Strategic * 0.3)
composite_score = (
    technical_feasibility_score * 0.4 +
    financial_viability_score * 0.3 +
    strategic_alignment_score * 0.3
)
```

### Human-in-the-Loop (RNF-04)

All AI suggestions display confidence badges:
- 🟢 Green (>80%) · 🟡 Yellow (60-80%) · 🔴 Red (<60%)

Manual validation required before final decisions.

### i18n Support (RNF-05)

- 🇧🇷 Português (pt-BR) · 🇺🇸 English (en-US) · 🇪🇸 Español (es-ES)
- Validation: `npm run validate-i18n` syncs keys across locales

---

## Testing

```bash
cd backend
pytest                              # All tests
pytest --cov=. --cov-report=html    # With coverage
```

---

## Project Stats

| Metric | Value |
|--------|-------|
| Backend Files | 60+ |
| Frontend Files | 55+ |
| API Endpoints | 65 |
| React Components | 30+ |
| Docker Services | 10 |
| i18n Keys | 2700+ (3 locales) |
| DB Tables | 25+ |
| Entity Definitions | 7 (standardized) |

**Last Updated:** February 11, 2026 | **Version:** 2.0.0

See [docs/implementation_history.md](docs/implementation_history.md) for detailed implementation history.

---

**Built with ❤️ following Clean Architecture principles and SOLID design patterns**
