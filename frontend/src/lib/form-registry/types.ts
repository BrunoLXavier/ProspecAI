/**
 * Form Registry — Type Definitions
 * Single source of truth for entity form structure, validation rules,
 * filter configuration, and ACL resource mapping.
 *
 * Inspired by Joomla XML form definitions: every entity declares its fields,
 * tabs, filters, and permissions in a typed registry object. The FormRenderer
 * and EntityModal consume these definitions — manual JSX form building is
 * prohibited.
 *
 * Implements RF-01 through RF-09: Standardized entity form infrastructure
 */

// ─── Field Type Mapping ──────────────────────────────────────────────────────
// Maps 1:1 to shared/forms/ components

export type FieldType =
  | 'text'        // FormInput type="text"
  | 'email'       // FormInput type="email"
  | 'password'    // FormInput type="password"
  | 'number'      // FormInput type="number"
  | 'url'         // FormInput type="url"
  | 'tel'         // FormInput type="tel"
  | 'textarea'    // FormTextarea
  | 'select'      // FormSelect
  | 'combobox'    // FormComboBox (searchable dropdown)
  | 'date'        // FormDatePicker
  | 'datetime'    // FormDatePicker includeTime=true
  | 'currency'    // FormCurrencyInput
  | 'tags'        // FormTagInput
  | 'slider'      // FormSlider
  | 'checkbox'    // FormCheckbox
  | 'radio'       // FormRadio
  | 'switch'      // FormSwitch
  | 'hidden';     // Hidden field (no UI rendered)

// ─── Validation Rules ────────────────────────────────────────────────────────
// Declarative rules — buildZodSchema() converts these to Zod schemas with t()

export interface ValidationRule {
  /** Rule type */
  type:
    | 'required'
    | 'minLength'
    | 'maxLength'
    | 'min'
    | 'max'
    | 'email'
    | 'url'
    | 'cnpj'
    | 'pattern'
    | 'custom';

  /** Numeric parameter for min/max/minLength/maxLength */
  value?: number;

  /** Regex pattern string for 'pattern' type */
  pattern?: string;

  /** i18n key for the error message (resolved via t()) */
  messageKey: string;

  /** Interpolation params for the message key (e.g., { max: 200 }) */
  messageParams?: Record<string, string | number>;

  /** Custom validation function for 'custom' type */
  validate?: (value: any, formValues: any) => boolean;
}

// ─── Select/Radio/ComboBox Option ────────────────────────────────────────────

export interface OptionDefinition {
  /** Raw enum value (stored in DB) */
  value: string | number;
  /** i18n key for the display label — resolved via t() */
  labelKey: string;
  /** Optional color variant for badges */
  color?: 'green' | 'yellow' | 'red' | 'blue' | 'gray' | 'purple' | 'orange';
  /** Whether this option is disabled */
  disabled?: boolean;
}

// ─── Field Definition ────────────────────────────────────────────────────────

export type FieldVisibility = 'create' | 'edit' | 'view' | 'all';

export interface FieldDefinition {
  /** Unique field name (matches form/entity key, camelCase) */
  name: string;

  /** Field type — maps to shared/forms/ component */
  type: FieldType;

  /** i18n key for the field label */
  labelKey: string;

  /** i18n key for placeholder text */
  placeholderKey?: string;

  /** i18n key for helper text */
  helperTextKey?: string;

  /** Validation rules (declarative) */
  rules?: ValidationRule[];

  /** Options for select/combobox/radio fields */
  options?: OptionDefinition[];

  /** When the field is visible */
  visibleIn?: FieldVisibility[];

  /** Default value */
  defaultValue?: any;

  /** Number of grid columns this field spans (1-4, default 1) */
  colSpan?: 1 | 2 | 3 | 4;

  /** Whether field is read-only in edit mode */
  readOnlyInEdit?: boolean;

  /** Whether field is read-only in view mode (default true) */
  readOnlyInView?: boolean;

  /** Conditional visibility function */
  showWhen?: (formValues: any) => boolean;

  // ── Type-specific props ─────────────────────────────────────────────────

  /** For textarea: number of rows */
  rows?: number;

  /** For textarea: show character count */
  showCount?: boolean;

  /** For number/slider: min value */
  min?: number;

  /** For number/slider: max value */
  max?: number;

  /** For number/slider: step */
  step?: number;

  /** For slider: format value display */
  formatValue?: (value: number) => string;

  /** For slider: color variant */
  colorVariant?: 'primary' | 'info' | 'success' | 'warning' | 'danger';

  /** For tags: max number of tags */
  maxTags?: number;

  /** For tags: tag color variant */
  tagVariant?: 'primary' | 'secondary' | 'neutral' | 'info';

  /** For date: include time */
  includeTime?: boolean;

  /** For combobox: searchable */
  searchable?: boolean;

  /** For combobox: clearable */
  clearable?: boolean;

  /** For combobox: allow multiple selection */
  multiple?: boolean;

  /** For switch: color variant */
  switchColor?: 'primary' | 'success' | 'warning';

  /** For checkbox/radio: size */
  inputSize?: 'sm' | 'md' | 'lg';

  /** For radio: layout direction */
  direction?: 'horizontal' | 'vertical';

  /** For input: left icon (Heroicon component name) */
  leftIconName?: string;

  /** For input: right icon */
  rightIconName?: string;
}

// ─── Tab Definition ──────────────────────────────────────────────────────────

export interface TabDefinition {
  /** Unique tab key */
  key: string;
  /** i18n key for the tab name */
  nameKey: string;
  /** Heroicon name for the tab icon */
  iconName?: string;
  /** Field names in this tab (order matters) */
  fields: string[];
  /** Grid columns for this tab's form layout (default 2) */
  gridCols?: 1 | 2 | 3 | 4;
}

// ─── Filter Definition ──────────────────────────────────────────────────────

export interface FilterFieldDefinition {
  /** Filter key (used in query params) */
  key: string;
  /** i18n key for the filter label */
  labelKey: string;
  /** Filter type — maps to FilterPanel field types */
  type: 'select' | 'text' | 'date' | 'number' | 'range' | 'checkbox';
  /** Options for select filters */
  options?: OptionDefinition[];
  /** i18n key for placeholder */
  placeholderKey?: string;
  /** Default value */
  defaultValue?: string | number | boolean;
  /** For range: min key suffix */
  minKey?: string;
  /** For range: max key suffix */
  maxKey?: string;
  /** For number: min value */
  min?: number;
  /** For number: max value */
  max?: number;
}

// ─── Statistics Module Mapping ───────────────────────────────────────────────

export type StatisticsModule =
  | 'funding'
  | 'portfolio'
  | 'crm'
  | 'opportunities'
  | 'proposals'
  | 'users'
  | 'ingestion'
  | 'pii-analysis'
  | 'reports'
  | 'translations'
  | 'institutes'
  | 'teams'
  | 'infrastructure'
  | 'communications'
  | 'feedback';

// ─── Entity Form Definition ─────────────────────────────────────────────────

export interface EntityFormDefinition<T = any> {
  /** Unique entity key (e.g., 'funding', 'client') */
  entityKey: string;

  /** i18n namespace for this entity's labels */
  i18nNamespace: string;

  /** ACL resource name from acl.json (e.g., 'funding', 'crm', 'opportunities') */
  resource: string;

  /** Whether this entity is scoped by institute (has institute_id FK) */
  instituteScoped: boolean;

  /** API endpoint base path (e.g., '/api/v1/funding') */
  apiEndpoint: string;

  /** Field definitions — order determines default rendering order */
  fields: FieldDefinition[];

  /** Tab definitions — if provided, fields are grouped into tabs */
  tabs?: TabDefinition[];

  /** Filter definitions for the CRUD page's FilterPanel */
  filters: FilterFieldDefinition[];

  /** Statistics module for ConfigurableStatisticsBar */
  statisticsModule?: StatisticsModule;

  /** Default values for create mode */
  defaultValues: Partial<T>;

  /** Grid columns for form layout when no tabs (default 2) */
  gridCols?: 1 | 2 | 3 | 4;

  /** Custom Zod refinements (cross-field validation) */
  refinements?: Array<{
    validate: (data: any) => boolean;
    messageKey: string;
    path: string[];
  }>;
}

// ─── Registry ────────────────────────────────────────────────────────────────

/** Central registry of all entity form definitions */
const entityRegistry = new Map<string, EntityFormDefinition>();

/**
 * Register an entity form definition.
 * Called once per entity definition file (e.g., funding.definition.ts)
 */
export function registerEntity<T>(definition: EntityFormDefinition<T>): EntityFormDefinition<T> {
  entityRegistry.set(definition.entityKey, definition as EntityFormDefinition);
  return definition;
}

/**
 * Get a registered entity definition by key.
 * Throws if not found — ensures definitions are always loaded.
 */
export function getEntityDefinition<T = any>(entityKey: string): EntityFormDefinition<T> {
  const definition = entityRegistry.get(entityKey);
  if (!definition) {
    throw new Error(
      `[FormRegistry] Entity "${entityKey}" not found. Ensure its definition file is imported.`
    );
  }
  return definition as EntityFormDefinition<T>;
}

/**
 * Get all registered entity definitions.
 */
export function getAllEntityDefinitions(): EntityFormDefinition[] {
  return Array.from(entityRegistry.values());
}

/**
 * Check if an entity is registered.
 */
export function hasEntityDefinition(entityKey: string): boolean {
  return entityRegistry.has(entityKey);
}
