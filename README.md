<<<<<<< HEAD
# ProspecAI
=======
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

## Architecture

### Clean Architecture Layers

```
backend/
├── domain/           # Business entities and rules (RF-01 to RF-09)
├── use_cases/        # Application logic orchestration
├── adapters/         # Database and API implementations
│   ├── database/     # PostgreSQL + Neo4j
│   └── external/     # External APIs (CNPJ, etc.)
└── infrastructure/   # FastAPI framework, Kafka, etc.

frontend/
├── src/
│   ├── app/          # Next.js 14 pages (App Router)
│   ├── components/   # React components (Headless UI)
│   └── lib/          # Utilities and i18n
```

### Technology Stack

| Layer | Technology |
|-------|------------|
| Backend | FastAPI (Python 3.11) + Pydantic v2 |
| Frontend | Next.js 14 (TypeScript) + Tailwind CSS |
| Databases | PostgreSQL 15 (RLS) + Neo4j (graphs) |
| Messaging | Apache Kafka |
| Authentication | Internal JWT (no external IdP) |
| AI/ML | MLflow + BERTimbau (NER) |
| Storage | MinIO (S3-compatible) |
| Monitoring | Grafana + Prometheus |

## Prerequisites

- Docker & Docker Compose
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

## Architecture

### Clean Architecture Layers

```
backend/
├── domain/           # Business entities and rules (RF-01 to RF-09)
├── use_cases/        # Application logic orchestration
├── adapters/         # Database and API implementations
│   ├── database/     # PostgreSQL + Neo4j
│   └── external/     # External APIs (CNPJ, etc.)
└── infrastructure/   # FastAPI framework, Kafka, etc.

frontend/
├── src/
│   ├── app/          # Next.js 14 pages (App Router)
│   ├── components/   # React components (Headless UI)
│   └── lib/          # Utilities and i18n
```

### Technology Stack

| Layer | Technology |
|-------|------------|
| Backend | FastAPI (Python 3.11) + Pydantic v2 |
| Frontend | Next.js 14 (TypeScript) + Tailwind CSS |
| Databases | PostgreSQL 15 (RLS) + Neo4j (graphs) |
| Messaging | Apache Kafka |
| Authentication | Internal JWT (no external IdP) |
| AI/ML | MLflow + BERTimbau (NER) |
| Storage | MinIO (S3-compatible) |
| Monitoring | Grafana + Prometheus |

## Prerequisites

- Docker & Docker Compose
- Node.js 20+ (for local frontend development)
- Python 3.11+ (for local backend development)

## Quick Start

### 1. Clone and Configure

```bash
git clone <repository-url>
cd "ProspecIA 2.0"

# Copy environment template
cp backend/.env.template backend/.env
```

### 2. Start All Services

```bash
docker-compose up -d
```

This will start:
- PostgreSQL (port 5432)
- Neo4j (ports 7474, 7687)
- Kafka + Zookeeper (port 9092)
- MinIO (ports 9000, 9001)
- MLflow (port 5000)
- Grafana (port 3001)
- Backend API (port 8000)
- Frontend (port 3000)

### 3. Access the Application

- **Frontend**: http://localhost:3000
- **API Docs**: http://localhost:8000/api/docs
- **Grafana**: http://localhost:3001 (admin/admin)
- **Neo4j Browser**: http://localhost:7474 (neo4j/changeme)
 - **Authentication provider**: internal JWT (no external IdP)

## Development

### Backend

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run migrations
alembic upgrade head

# Start development server
uvicorn main:app --reload
```

### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

## Key Requirements Implementation

### RF-06: Matching Algorithm

```python
# Formula: Score = (Technical * 0.4) + (Financial * 0.3) + (Strategic * 0.3)
composite_score = (
    technical_feasibility_score * 0.4 +
    financial_viability_score * 0.3 +
    strategic_alignment_score * 0.3
)
```

### RNF-01: AES-256 Encryption for PII

All PII fields (CNPJ, email, financial values) are encrypted at the application layer before storage.

### RNF-02: Row-Level Security (RLS)

PostgreSQL RLS policies enforce `tenant_id` isolation:

```sql
CREATE POLICY tenant_isolation_policy ON funding_sources
USING (tenant_id = current_setting('app.current_tenant')::uuid);
```

### RNF-04: Human-in-the-Loop

All AI suggestions display confidence badges:
- 🟢 Green (>80%)
- 🟡 Yellow (60-80%)
- 🔴 Red (<60%)

Manual validation required before final decisions.

### RNF-05: i18n Support

Frontend supports:
- 🇧🇷 Português (pt-BR)
- 🇺🇸 English (en-US)
- 🇪🇸 Español (es-ES)

## Testing

### Backend (pytest)

```bash
cd backend

# All tests
pytest

# With coverage report
pytest --cov=. --cov-report=html

# Unit tests only
pytest tests/unit/ -v

# Integration tests only
pytest tests/integration/ -v
```

### Test Coverage

| Level | Framework | Files | Test Cases |
|-------|-----------|-------|------------|
| Unit Tests | pytest | 1 | 20+ |
| Integration | pytest-asyncio | 3 | 50+ |
| E2E Tests | none | 0 | 0 |
| **Total** | - | **9** | **125+** |

See [docs/TESTING.md](docs/TESTING.md) for detailed testing guide.

## API Documentation

Full API documentation available at `/api/docs` after starting the backend.

### Example: Create Funding Source

```bash
curl -X POST http://localhost:8000/api/v1/funding \
  -H "Content-Type: application/json" \
  -H "X-Tenant-ID: <your-tenant-id>" \
  -d '{
    "name": "FINEP Inovação",
    "instrument_type": "grant",
    "trl_min": 3,
    "trl_max": 9,
    "total_amount": 5000000.00,
    "submission_start": "2026-02-01T00:00:00Z",
    "submission_end": "2026-03-31T23:59:59Z"
  }'
```

## License

MIT License - see LICENSE file for details.

## Contributors

- SENAI ProspecAI Team

## Support

For questions or issues, please contact: support@prospecai.com

---

## Project Stats

| Metric | Value |
|--------|-------|
| Backend Files | 60+ |
| Frontend Files | 55+ |
| API Endpoints | 65 |
| React Components | 30+ |
| Test Files | 9 |
| Test Cases | 125+ |
| Docker Services | 10 |
| Requirements Fulfilled | 100% |

**Last Updated:** January 11, 2026 | **Version:** 1.0.0

See [docs/STATUS.md](docs/STATUS.md) for implementation status.
See [docs/implementation_history.md](docs/implementation_history.md) for detailed history.

---

**Built with ❤️ following Clean Architecture principles and SOLID design patterns**
