/**
 * Entity Definition Registry — Auto-Registration Barrel
 * Importing this file registers ALL entity definitions in the Form Registry.
 *
 * IMPORTANT: This file MUST be imported at the app root (layout.tsx or providers)
 * to ensure all definitions are available before any modal or page renders.
 *
 * Implements RF-01 through RF-09: Central entity definition registry
 */

// Core entity definitions — each calls registerEntity() on import
export { fundingDefinition } from './funding.definition';
export { clientDefinition } from './client.definition';
export { opportunityDefinition } from './opportunity.definition';
export { proposalDefinition } from './proposal.definition';
export { portfolioProjectDefinition } from './portfolio-project.definition';
export { teamDefinition } from './team.definition';
export { infrastructureDefinition } from './infrastructure.definition';
export { instituteDefinition } from './institute.definition';
export { reportDefinition } from './report.definition';
export { userDefinition } from './user.definition';
export { communicationDefinition } from './communication.definition';
export { feedbackDefinition } from './feedback.definition';
export { ingestionDefinition } from './ingestion.definition';

// Re-export form data types
export type { FundingFormData } from './funding.definition';
export type { ClientFormData } from './client.definition';
export type { OpportunityFormData } from './opportunity.definition';
export type { ProposalFormData } from './proposal.definition';
export type { PortfolioProjectFormData } from './portfolio-project.definition';
export type { TeamFormData } from './team.definition';
export type { InfrastructureFormData } from './infrastructure.definition';
export type { InstituteFormData } from './institute.definition';
export type { ReportFormData } from './report.definition';
export type { UserFormData } from './user.definition';
export type { CommunicationFormData } from './communication.definition';
export type { FeedbackFormData } from './feedback.definition';
export type { IngestionFormData } from './ingestion.definition';
