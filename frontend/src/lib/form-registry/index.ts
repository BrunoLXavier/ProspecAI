/**
 * Form Registry — Public API
 * Re-exports all types, builders, and registry functions
 * from a single entry point.
 *
 * Usage:
 *   import { registerEntity, getEntityDefinition, buildZodSchema } from '@/lib/form-registry';
 */

// Types
export type {
  FieldType,
  ValidationRule,
  OptionDefinition,
  FieldVisibility,
  FieldDefinition,
  TabDefinition,
  FilterFieldDefinition,
  StatisticsModule,
  EntityFormDefinition,
} from './types';

// Registry functions
export {
  registerEntity,
  getEntityDefinition,
  getAllEntityDefinitions,
  hasEntityDefinition,
} from './types';

// Schema builder
export {
  buildZodSchema,
  getFieldsForMode,
  getFieldsByTab,
} from './build-zod-schema';

// FormRenderer component
export { default as FormRenderer } from './FormRenderer';
export type { FormRendererProps, FormMode } from './FormRenderer';

// Entity definitions (auto-registers on import)
export * from './definitions';
