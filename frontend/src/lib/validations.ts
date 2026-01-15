/**
 * Zod Validation Schemas for ProspecAI
 * Implements form validation for all entity types
 */
import { z } from 'zod';

// =============================================================================
// Common Validators
// =============================================================================

const requiredString = z.string().min(1, 'Campo obrigatório');
const optionalString = z.string().optional();
const positiveNumber = z.number().positive('Deve ser maior que zero');
const trlValidator = z.number().min(1).max(9);
const emailValidator = z.string().email('Email inválido');
const cnpjValidator = z.string().regex(
  /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/,
  'CNPJ inválido (formato: XX.XXX.XXX/XXXX-XX)'
);

// =============================================================================
// RF-02: Funding Source Schemas
// =============================================================================

export const FundingCategoryEnum = z.enum([
  'NATIONAL', 'REGIONAL', 'INTERNATIONAL', 'PRIVATE', 'CORPORATE'
]);

export const FundingStatusEnum = z.enum([
  'DRAFT', 'OPEN', 'CLOSED', 'SUSPENDED'
]);

export const createFundingSchema = z.object({
  source_name: requiredString.max(200, 'Máximo 200 caracteres'),
  category: FundingCategoryEnum,
  status: FundingStatusEnum.default('DRAFT'),
  deadline: z.string().min(1, 'Data obrigatória'),
  total_amount: positiveNumber,
  focus_areas: z.array(z.string()).min(1, 'Adicione pelo menos uma área'),
  trl_min: trlValidator,
  trl_max: trlValidator,
  description: optionalString,
  requirements: optionalString,
  url: z.string().url('URL inválida').optional().or(z.literal('')),
}).refine(data => data.trl_min <= data.trl_max, {
  message: 'TRL mínimo deve ser menor ou igual ao máximo',
  path: ['trl_min'],
});

export type CreateFundingInput = z.infer<typeof createFundingSchema>;

// =============================================================================
// RF-03: Portfolio/Project Schemas
// =============================================================================

export const ProjectStatusEnum = z.enum([
  'PLANNING', 'ACTIVE', 'COMPLETED', 'SUSPENDED', 'CANCELLED'
]);

export const createProjectSchema = z.object({
  title: requiredString.max(300, 'Máximo 300 caracteres'),
  description: requiredString.min(50, 'Mínimo 50 caracteres'),
  status: ProjectStatusEnum.default('PLANNING'),
  current_trl: trlValidator,
  budget: positiveNumber,
  research_area: requiredString,
  keywords: z.array(z.string()).min(1, 'Adicione pelo menos uma palavra-chave'),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  team_members: z.array(z.string()).optional(),
  lessons_learned: optionalString,
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;

// =============================================================================
// RF-04: CRM Client Schemas
// =============================================================================

export const ClientTypeEnum = z.enum([
  'COMPANY', 'UNIVERSITY', 'RESEARCH_INSTITUTE', 'GOVERNMENT', 'STARTUP', 'OTHER'
]);

export const createClientSchema = z.object({
  name: requiredString.max(200, 'Máximo 200 caracteres'),
  type: ClientTypeEnum,
  cnpj: cnpjValidator.optional().or(z.literal('')),
  contact_email: emailValidator,
  contact_phone: z.string().optional(),
  industry: requiredString,
  address: optionalString,
  website: z.string().url('URL inválida').optional().or(z.literal('')),
  notes: optionalString,
});

export type CreateClientInput = z.infer<typeof createClientSchema>;

export const InteractionTypeEnum = z.enum([
  'CALL', 'EMAIL', 'MEETING', 'VISIT', 'PROPOSAL', 'OTHER'
]);

export const createInteractionSchema = z.object({
  client_id: requiredString,
  type: InteractionTypeEnum,
  subject: requiredString.max(200),
  notes: optionalString,
  detected_demands: z.array(z.string()).optional(),
  follow_up_date: z.string().optional(),
});

export type CreateInteractionInput = z.infer<typeof createInteractionSchema>;

// =============================================================================
// RF-05: Opportunity Schemas
// =============================================================================

export const PipelineStageEnum = z.enum([
  'INTELLIGENCE', 'QUALIFICATION', 'PROPOSAL', 'NEGOTIATION', 
  'CLOSING', 'WON', 'LOST', 'POST_SALE'
]);

export const createOpportunitySchema = z.object({
  title: requiredString.max(300),
  description: requiredString,
  client_id: requiredString,
  funding_source_id: z.string().optional(),
  stage: PipelineStageEnum.default('INTELLIGENCE'),
  estimated_value: positiveNumber,
  probability: z.number().min(0).max(100),
  expected_close_date: z.string().optional(),
  priority_factors: z.object({
    strategic_fit: z.number().min(0).max(100),
    financial_impact: z.number().min(0).max(100),
    probability: z.number().min(0).max(100),
    urgency: z.number().min(0).max(100),
  }).optional(),
});

export type CreateOpportunityInput = z.infer<typeof createOpportunitySchema>;

// =============================================================================
// RF-08: Proposal Schemas
// =============================================================================

export const ProposalStatusEnum = z.enum([
  'DRAFT', 'IN_REVIEW', 'SUBMITTED', 'APPROVED', 'REJECTED'
]);

export const createProposalSchema = z.object({
  title: requiredString.max(300),
  opportunity_id: requiredString,
  funding_source_id: z.string().optional(),
  content: requiredString.min(100, 'Conteúdo mínimo de 100 caracteres'),
  status: ProposalStatusEnum.default('DRAFT'),
  budget_breakdown: z.record(z.number()).optional(),
  team_allocation: z.array(z.object({
    name: z.string(),
    role: z.string(),
    hours: z.number(),
  })).optional(),
});

export type CreateProposalInput = z.infer<typeof createProposalSchema>;

// =============================================================================
// Helper Types
// =============================================================================

export const categoryOptions = [
  { value: 'NATIONAL', label: 'Nacional' },
  { value: 'REGIONAL', label: 'Regional' },
  { value: 'INTERNATIONAL', label: 'Internacional' },
  { value: 'PRIVATE', label: 'Privado' },
  { value: 'CORPORATE', label: 'Corporativo' },
];

export const statusOptions = [
  { value: 'DRAFT', label: 'Rascunho' },
  { value: 'OPEN', label: 'Aberto' },
  { value: 'CLOSED', label: 'Fechado' },
  { value: 'SUSPENDED', label: 'Suspenso' },
];

export const projectStatusOptions = [
  { value: 'PLANNING', label: 'Planejamento' },
  { value: 'ACTIVE', label: 'Ativo' },
  { value: 'COMPLETED', label: 'Concluído' },
  { value: 'SUSPENDED', label: 'Suspenso' },
  { value: 'CANCELLED', label: 'Cancelado' },
];

export const clientTypeOptions = [
  { value: 'COMPANY', label: 'Empresa' },
  { value: 'UNIVERSITY', label: 'Universidade' },
  { value: 'RESEARCH_INSTITUTE', label: 'Instituto de Pesquisa' },
  { value: 'GOVERNMENT', label: 'Governo' },
  { value: 'STARTUP', label: 'Startup' },
  { value: 'OTHER', label: 'Outro' },
];

export const pipelineStageOptions = [
  { value: 'INTELLIGENCE', label: 'Inteligência' },
  { value: 'QUALIFICATION', label: 'Qualificação' },
  { value: 'PROPOSAL', label: 'Proposta' },
  { value: 'NEGOTIATION', label: 'Negociação' },
  { value: 'CLOSING', label: 'Fechamento' },
  { value: 'WON', label: 'Ganho' },
  { value: 'LOST', label: 'Perdido' },
  { value: 'POST_SALE', label: 'Pós-venda' },
];

export const trlOptions = Array.from({ length: 9 }, (_, i) => ({
  value: i + 1,
  label: `TRL ${i + 1}`,
}));
