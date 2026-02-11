## Estrutura do Banco de Dados (resumo consolidado)

Este documento sumariza a estrutura atual do banco de dados conforme a migration consolidada em [backend/alembic/versions/20260123_consolidated_schema.py](backend/alembic/versions/20260123_consolidated_schema.py#L1).

Observações gerais:

- Extensões PostgreSQL usadas: `pgcrypto`, `btree_gist`.
- Muitas tabelas possuem `tenant_id` para multi-tenant e políticas RLS habilitadas.
- Campos JSON/JSONB são amplamente usados para flexibilidade (metadata, content, settings, etc.).
- Convenção: `id uuid PRIMARY KEY DEFAULT gen_random_uuid()` na maioria das tabelas; timestamps: `created_at`, `updated_at`, `deleted_at`.

Tabelas principais (com link para a criação na migration):

- `tenants`: tabela de tenants e controle (PK `id`). [backend/alembic/versions/20260123_consolidated_schema.py](backend/alembic/versions/20260123_consolidated_schema.py#L40)
  - Campos chave: `id`, `name`, `slug` (UNIQUE), `is_active`, `settings (jsonb)`, `created_at`, `updated_at`, `deleted_at`.

- `roles`: papéis do sistema. [backend/alembic/versions/20260123_consolidated_schema.py](backend/alembic/versions/20260123_consolidated_schema.py#L61)
  - `id`, `name` (UNIQUE), `permissions (jsonb)`, `is_system`.

- `system_config`: chaves/valores de configuração por tenant. [backend/alembic/versions/20260123_consolidated_schema.py](backend/alembic/versions/20260123_consolidated_schema.py#L72)
  - `tenant_id`, `config_key` (UNIQUE por tenant), `config_value (jsonb)`, `email_config`, `security_config`.

- `users`: usuários do sistema. [backend/alembic/versions/20260123_consolidated_schema.py](backend/alembic/versions/20260123_consolidated_schema.py#L93)
  - Campos chave: `id`, `tenant_id`, `email` (UNIQUE por tenant), `username` (UNIQUE por tenant), `password_hash`, `full_name`, `cpf`, `perfil`, `email_verified`, `is_active`, `created_at`, `updated_at`, `deleted_at`.

- `user_roles`: associação usuário → role. [backend/alembic/versions/20260123_consolidated_schema.py](backend/alembic/versions/20260123_consolidated_schema.py#L121)
  - `user_id`, `role_id`, `role_name`, `assigned_at` (UNIQUE user_id+role_id).

- `refresh_tokens`: tokens de refresh. [backend/alembic/versions/20260123_consolidated_schema.py](backend/alembic/versions/20260123_consolidated_schema.py#L135)
  - `user_id`, `token_hash` (UNIQUE), `token_type`, `expires_at`, `used`, `created_at`.

- `login_attempts`: tentativas de login. [backend/alembic/versions/20260123_consolidated_schema.py](backend/alembic/versions/20260123_consolidated_schema.py#L150)
  - `email`, `ip_address (inet)`, `success`, `timestamp`, `tenant_id`, `failure_reason`.

- `institutes`: instituições (centros, universidades, empresas). [backend/alembic/versions/20260123_consolidated_schema.py](backend/alembic/versions/20260123_consolidated_schema.py#L169)
  - Campos extensos: `id`, `tenant_id`, `name`, `descricao`, endereço, maturidade (numeric), `metadata (jsonb)`, `created_at`, `updated_at`, `deleted_at`.

- `user_institutes`: vínculo usuário→instituto. [backend/alembic/versions/20260123_consolidated_schema.py](backend/alembic/versions/20260123_consolidated_schema.py#L211)
  - `user_id`, `institute_id`, `tenant_id`, `role`, timestamps.

- `teams`: membros/equipes institucionais. [backend/alembic/versions/20260123_consolidated_schema.py](backend/alembic/versions/20260123_consolidated_schema.py#L234)
  - `usuario_id`, `instituto_id`, `member_ids (jsonb)`, `metadata (jsonb)`, `created_at`, `updated_at`, `deleted_at`.

- `infrastructures`: recursos/instrumentação. [backend/alembic/versions/20260123_consolidated_schema.py](backend/alembic/versions/20260123_consolidated_schema.py#L274)
  - Campos: `instituto_id`, `nome`, `descricao`, `plataformas_tecnologicas (jsonb)`, `areas_conhecimento (jsonb)`, `equipamentos (json)`, `capacity (jsonb)`, `metadata`.

- `funding_sources`: editais e fontes de fomento. [backend/alembic/versions/20260123_consolidated_schema.py](backend/alembic/versions/20260123_consolidated_schema.py#L318)
  - `name`, `description`, `instrument_type`, `trl_min`, `trl_max`, `total_amount`, `available_amount`, `currency`, `submission_start`, `submission_end`, `status`, `details (jsonb)`.

- `portfolios`: portfólios institucionais. [backend/alembic/versions/20260123_consolidated_schema.py](backend/alembic/versions/20260123_consolidated_schema.py#L352)
  - `project_ids (jsonb)`, `strategic_areas (jsonb)`, `total_budget`, contadores.

- `projects`: projetos (genéricos). [backend/alembic/versions/20260123_consolidated_schema.py](backend/alembic/versions/20260123_consolidated_schema.py#L372)
  - `portfolio_id`, `institute_id`, `name`, `title`, `description`, `status`, `trl_current`, `trl_target`, `budget`, `objectives (jsonb)`, `infrastructure (jsonb)`.

- `portfolio_projects`: projetos institucionais detalhados. [backend/alembic/versions/20260123_consolidated_schema.py](backend/alembic/versions/20260123_consolidated_schema.py#L409)
  - Campos específicos em PT (ex: `nome`, `descricao`, `trl_saida`, `parceiros (jsonb)`, `midias (jsonb)`, `equipe_ids (jsonb)`, `lessons_learned (jsonb)`).

- `clients`: CRM — clientes. [backend/alembic/versions/20260123_consolidated_schema.py](backend/alembic/versions/20260123_consolidated_schema.py#L467)
  - `name`, `document_number`, `client_type`, `sector`, `metadata (jsonb)`, `version`, timestamps.

- `interactions`: histórico de interações CRM. [backend/alembic/versions/20260123_consolidated_schema.py](backend/alembic/versions/20260123_consolidated_schema.py#L485)
  - `user_id`, `target_id`, `target_type`, `interaction_type`, `payload (jsonb)`, `created_at`.

- `opportunities`: pipeline de oportunidades. [backend/alembic/versions/20260123_consolidated_schema.py](backend/alembic/versions/20260123_consolidated_schema.py#L499)
  - `proposal_id`, `client_id`, `funding_source_id`, `stage`, `value`, `priority`, `probability_score`, `expected_close_date`, `deleted_at`.

- `proposals`: propostas (meta). [backend/alembic/versions/20260123_consolidated_schema.py](backend/alembic/versions/20260123_consolidated_schema.py#L531)
  - `opportunity_id`, `funding_source_id`, `title`, `current_status`, `current_version`, `head_version_id`, `adherence (jsonb)`, `deleted_at`.

- `proposal_versions`: versões de propostas (conteúdo JSON). [backend/alembic/versions/20260123_consolidated_schema.py](backend/alembic/versions/20260123_consolidated_schema.py#L557)
  - `proposal_id`, `version`, `content (jsonb)`, `created_at`.

- `matching_scores`: pontuações de matching (algoritmo). [backend/alembic/versions/20260123_consolidated_schema.py](backend/alembic/versions/20260123_consolidated_schema.py#L572)
  - `opportunity_id`, `project_id`, `funding_source_id`, `technical_score`, `financial_score`, `strategic_score`, `composite_score`, `calculation_details (jsonb)`, `confidence_level`, `validation_status`.

- `feedbacks`: feedbacks do sistema. [backend/alembic/versions/20260123_consolidated_schema.py](backend/alembic/versions/20260123_consolidated_schema.py#L605)
  - `feedback_type`, `severity`, `description`, `page_url`, `entity_type`, `entity_id`, `annotation_data (jsonb)`, `status`, `response`, `deleted_at`.

- `llm_configs`: configurações de LLM por tenant. [backend/alembic/versions/20260123_consolidated_schema.py](backend/alembic/versions/20260123_consolidated_schema.py#L647)
  - `provider`, `model_name`, `encrypted_api_key`, `temperature`, `max_tokens`, `settings (jsonb)`, `version`.

- `ingestion_jobs` e `ingestion_sources`: pipeline de ingestão de dados. [backend/alembic/versions/20260123_consolidated_schema.py](backend/alembic/versions/20260123_consolidated_schema.py#L677) / [backend/alembic/versions/20260123_consolidated_schema.py](backend/alembic/versions/20260123_consolidated_schema.py#L711)
  - Jobs: `status`, contadores (files, records), `pii_detected_count`, `progress_percentage`, `settings (jsonb)`.
  - Sources: `job_id`, `file_name`, `file_path`, `file_size_bytes`, `status`, `pii_detection_id`, `metadata (jsonb)`.

- `pii_detections` e `pii_detection_rules`: detecção/anonimização PII. [backend/alembic/versions/20260123_consolidated_schema.py](backend/alembic/versions/20260123_consolidated_schema.py#L742) / [backend/alembic/versions/20260123_consolidated_schema.py](backend/alembic/versions/20260123_consolidated_schema.py#L790)
  - `entities (jsonb)`, `original_text_encrypted` (texto sensível armazenado criptografado), `anonymized_text`, `risk_level`, `anonymization_status`, timestamps e auditoria.

- `report_templates` e `report_instances`: templates e execuções de relatórios. [backend/alembic/versions/20260123_consolidated_schema.py](backend/alembic/versions/20260123_consolidated_schema.py#L808) / [backend/alembic/versions/20260123_consolidated_schema.py](backend/alembic/versions/20260123_consolidated_schema.py#L825)

- `statistics_aggregates`: agregações analíticas. [backend/alembic/versions/20260123_consolidated_schema.py](backend/alembic/versions/20260123_consolidated_schema.py#L842)

- `audit_logs`: trilha de auditoria. [backend/alembic/versions/20260123_consolidated_schema.py](backend/alembic/versions/20260123_consolidated_schema.py#L858)

- Tabelas de comunicação (threads, mensagens, anexos, minutes, participantes, drafts). [backend/alembic/versions/20260123_consolidated_schema.py](backend/alembic/versions/20260123_consolidated_schema.py#L890)
  - `communication_threads`, `communication_messages`, `communication_attachments`, `meeting_minutes`, `communication_thread_participants`, `communication_drafts`.

- `notification_templates`: templates de notificação. [backend/alembic/versions/20260123_consolidated_schema.py](backend/alembic/versions/20260123_consolidated_schema.py#L1023)

Contraintes e FKs

- O script adiciona constraints foreign key idempotentes para algumas relações (ex: mensagens → threads, attachments → threads, minutes → threads, drafts → threads, ingestion_sources.pii_detection_id → pii_detections).

RLS (Row Level Security)

- O migration habilita políticas RLS por padrão em muitas tabelas e cria policies genéricas de tenant isolation — ver bloco RLS no final da migration. [backend/alembic/versions/20260123_consolidated_schema.py](backend/alembic/versions/20260123_consolidated_schema.py#L1008)

Migrations adicionais que enriquecem o schema

- Existem migrations posteriores que adicionam colunas e ajustes (ex: `20260132_funding_trl_range.py`, `20260133_clients_missing_cols.py`, `20260134_funding_ai_extracted_data.py`, `20260138_proposal_template_system.py`, `20260139_proposal_versions.py`). Veja [backend/alembic/versions/](backend/alembic/versions/) para detalhes.

Fontes primárias usadas para este resumo:

- Migration consolidada: [backend/alembic/versions/20260123_consolidated_schema.py](backend/alembic/versions/20260123_consolidated_schema.py#L1)
- Outras migrations: [backend/alembic/versions/](backend/alembic/versions/)
- Modelos de domínio Pydantic: [backend/domain/entities/](backend/domain/entities/)

Se quiser, eu posso:

- Gerar uma versão mais detalhada que inclua todas as colunas para cada tabela (copiando os blocos `CREATE TABLE`) — isso gerará um arquivo maior.
- Extrair as constraints e índices em seções separadas.
- Gerar diagramas ER básicos (PNG/SVG) a partir deste schema.

---
_Gerado automaticamente a partir das migrations do projeto._
