-- Seed PII Detections for ProspecAI
-- Implements RF-01: LGPD Compliance Agent data

INSERT INTO pii_detections (
    id, tenant_id, source_type, file_name, file_type,
    original_text_encrypted, anonymized_text, entities, total_entities,
    risk_level, overall_risk_level, anonymization_status,
    created_at, updated_at, version
)
SELECT 
    'd1000000-0000-0000-0000-000000000001'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    'document', 'contrato_parceria_industria_x.pdf', 'pdf',
    'ENCRYPTED:Contato: João Silva, CPF 123.456.789-00',
    'Contato: [NOME_ANONIMIZADO], CPF [CPF_ANONIMIZADO]',
    '[{"type":"CPF","value":"[REDACTED]","confidence":0.98},{"type":"PERSON","value":"[REDACTED]","confidence":0.92}]'::jsonb,
    2, 'high', 'high', 'pending_review', now(), now(), 1
WHERE NOT EXISTS (SELECT 1 FROM pii_detections WHERE id = 'd1000000-0000-0000-0000-000000000001'::uuid);

INSERT INTO pii_detections (
    id, tenant_id, source_type, file_name, file_type,
    original_text_encrypted, anonymized_text, entities, total_entities,
    risk_level, overall_risk_level, anonymization_status,
    created_at, updated_at, version
)
SELECT 
    'd1000000-0000-0000-0000-000000000002'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    'spreadsheet', 'lista_fornecedores_2024.xlsx', 'xlsx',
    'ENCRYPTED:Fornecedor ABC Ltda, CNPJ 12.345.678/0001-90',
    'Fornecedor ABC Ltda, CNPJ [CNPJ_ANONIMIZADO]',
    '[{"type":"CNPJ","value":"[REDACTED]","confidence":0.99}]'::jsonb,
    1, 'medium', 'medium', 'anonymized', now(), now(), 1
WHERE NOT EXISTS (SELECT 1 FROM pii_detections WHERE id = 'd1000000-0000-0000-0000-000000000002'::uuid);

INSERT INTO pii_detections (
    id, tenant_id, source_type, file_name, file_type,
    original_text_encrypted, anonymized_text, entities, total_entities,
    risk_level, overall_risk_level, anonymization_status,
    created_at, updated_at, version
)
SELECT 
    'd1000000-0000-0000-0000-000000000003'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    'email', 'proposta_comercial_cliente_y.eml', 'eml',
    'ENCRYPTED:Proposta para Maria Santos, RG 12.345.678-9',
    NULL,
    '[{"type":"PERSON","value":"[REDACTED]","confidence":0.91},{"type":"RG","value":"[REDACTED]","confidence":0.88}]'::jsonb,
    2, 'high', 'high', 'pending_review', now(), now(), 1
WHERE NOT EXISTS (SELECT 1 FROM pii_detections WHERE id = 'd1000000-0000-0000-0000-000000000003'::uuid);

INSERT INTO pii_detections (
    id, tenant_id, source_type, file_name, file_type,
    original_text_encrypted, anonymized_text, entities, total_entities,
    risk_level, overall_risk_level, anonymization_status,
    created_at, updated_at, version
)
SELECT 
    'd1000000-0000-0000-0000-000000000004'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    'document', 'relatorio_projeto_inovacao.docx', 'docx',
    'ENCRYPTED:Responsável técnico: Dr. Carlos Ferreira',
    'Responsável técnico: [NOME_ANONIMIZADO]',
    '[{"type":"PERSON","value":"[REDACTED]","confidence":0.93}]'::jsonb,
    1, 'medium', 'medium', 'anonymized', now(), now(), 1
WHERE NOT EXISTS (SELECT 1 FROM pii_detections WHERE id = 'd1000000-0000-0000-0000-000000000004'::uuid);

INSERT INTO pii_detections (
    id, tenant_id, source_type, file_name, file_type,
    original_text_encrypted, anonymized_text, entities, total_entities,
    risk_level, overall_risk_level, anonymization_status,
    created_at, updated_at, version
)
SELECT 
    'd1000000-0000-0000-0000-000000000005'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    'form', 'cadastro_pesquisador.json', 'json',
    'ENCRYPTED:{"nome":"Ana Paula Lima","cpf":"987.654.321-00"}',
    NULL,
    '[{"type":"PERSON","value":"[REDACTED]","confidence":0.94},{"type":"CPF","value":"[REDACTED]","confidence":0.99}]'::jsonb,
    2, 'high', 'high', 'pending_review', now(), now(), 1
WHERE NOT EXISTS (SELECT 1 FROM pii_detections WHERE id = 'd1000000-0000-0000-0000-000000000005'::uuid);

INSERT INTO pii_detections (
    id, tenant_id, source_type, file_name, file_type,
    original_text_encrypted, anonymized_text, entities, total_entities,
    risk_level, overall_risk_level, anonymization_status,
    created_at, updated_at, version
)
SELECT 
    'd1000000-0000-0000-0000-000000000006'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    'document', 'ata_reuniao_parceiros.pdf', 'pdf',
    'ENCRYPTED:Empresa XYZ, CNPJ 98.765.432/0001-10',
    'Empresa XYZ, CNPJ [CNPJ_ANONIMIZADO]',
    '[{"type":"CNPJ","value":"[REDACTED]","confidence":0.98}]'::jsonb,
    1, 'medium', 'medium', 'anonymized', now(), now(), 1
WHERE NOT EXISTS (SELECT 1 FROM pii_detections WHERE id = 'd1000000-0000-0000-0000-000000000006'::uuid);

INSERT INTO pii_detections (
    id, tenant_id, source_type, file_name, file_type,
    original_text_encrypted, anonymized_text, entities, total_entities,
    risk_level, overall_risk_level, anonymization_status,
    created_at, updated_at, version
)
SELECT 
    'd1000000-0000-0000-0000-000000000007'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    'spreadsheet', 'banco_contatos_industria.csv', 'csv',
    NULL, NULL, '[]'::jsonb,
    0, 'low', 'low', 'no_pii_detected', now(), now(), 1
WHERE NOT EXISTS (SELECT 1 FROM pii_detections WHERE id = 'd1000000-0000-0000-0000-000000000007'::uuid);

INSERT INTO pii_detections (
    id, tenant_id, source_type, file_name, file_type,
    original_text_encrypted, anonymized_text, entities, total_entities,
    risk_level, overall_risk_level, anonymization_status,
    created_at, updated_at, version
)
SELECT 
    'd1000000-0000-0000-0000-000000000008'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    'document', 'termo_confidencialidade.pdf', 'pdf',
    'ENCRYPTED:Signatário: Roberto Mendes, CPF 111.222.333-44',
    NULL,
    '[{"type":"PERSON","value":"[REDACTED]","confidence":0.92},{"type":"CPF","value":"[REDACTED]","confidence":0.99}]'::jsonb,
    2, 'high', 'high', 'pending_review', now(), now(), 1
WHERE NOT EXISTS (SELECT 1 FROM pii_detections WHERE id = 'd1000000-0000-0000-0000-000000000008'::uuid);

-- Additional ingestion jobs
INSERT INTO ingestion_jobs (
    id, tenant_id, name, description, status, source_type,
    total_files, processed_files, total_records, processed_records, failed_records,
    pii_detected_count, pii_anonymized_count, progress_percentage, current_step,
    created_at, updated_at, version
)
SELECT 
    'ij000000-0000-0000-0000-000000000003'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    'Partner Database Integration',
    'Ingestão de dados de parceiros industriais via API REST',
    'processing', 'api_integration',
    5, 3, 8750, 5200, 12, 156, 89, 59.4, 'processing_file_4',
    now(), now(), 1
WHERE NOT EXISTS (SELECT 1 FROM ingestion_jobs WHERE id = 'ij000000-0000-0000-0000-000000000003'::uuid);

INSERT INTO ingestion_jobs (
    id, tenant_id, name, description, status, source_type,
    total_files, processed_files, total_records, processed_records, failed_records,
    pii_detected_count, pii_anonymized_count, progress_percentage, current_step,
    created_at, updated_at, version
)
SELECT 
    'ij000000-0000-0000-0000-000000000004'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    'Research Papers Import',
    'Importação de artigos científicos e publicações acadêmicas',
    'completed', 'file_upload',
    45, 45, 2300, 2300, 0, 67, 67, 100.0, 'completed',
    now(), now(), 1
WHERE NOT EXISTS (SELECT 1 FROM ingestion_jobs WHERE id = 'ij000000-0000-0000-0000-000000000004'::uuid);

INSERT INTO ingestion_jobs (
    id, tenant_id, name, description, status, source_type,
    total_files, processed_files, total_records, processed_records, failed_records,
    pii_detected_count, pii_anonymized_count, progress_percentage, current_step,
    error_message, created_at, updated_at, version
)
SELECT 
    'ij000000-0000-0000-0000-000000000005'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    'Historic Proposals Archive',
    'Digitalização de propostas históricas do arquivo físico',
    'failed', 'file_upload',
    120, 78, 15000, 9750, 234, 412, 298, 65.0, 'error_recovery',
    'OCR processing failed on corrupted PDF files',
    now(), now(), 1
WHERE NOT EXISTS (SELECT 1 FROM ingestion_jobs WHERE id = 'ij000000-0000-0000-0000-000000000005'::uuid);

INSERT INTO ingestion_jobs (
    id, tenant_id, name, description, status, source_type,
    total_files, processed_files, total_records, processed_records, failed_records,
    pii_detected_count, pii_anonymized_count, progress_percentage, current_step,
    created_at, updated_at, version
)
SELECT 
    'ij000000-0000-0000-0000-000000000006'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    'Government Funding Data',
    'Dados de editais de fomento governamental (FINEP, CNPq)',
    'completed', 'web_scraping',
    3, 3, 890, 890, 2, 23, 23, 100.0, 'completed',
    now(), now(), 1
WHERE NOT EXISTS (SELECT 1 FROM ingestion_jobs WHERE id = 'ij000000-0000-0000-0000-000000000006'::uuid);
