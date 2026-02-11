/**
 * Report Builder Types
 * TypeScript types for the Visual Report Builder
 */

export interface FieldSchema {
  name: string;
  type: 'uuid' | 'string' | 'text' | 'integer' | 'decimal' | 'boolean' | 'datetime' | 'json';
  display_name: string;
  filterable: boolean;
  sortable: boolean;
}

export interface RelationshipSchema {
  target_table: string;
  target_display_name: string;
  join_field: string;
  target_field: string;
  label: string;
  type: 'one_to_many' | 'many_to_one' | 'many_to_many';
  target_fields?: FieldSchema[];
}

export interface TableSchema {
  table_name: string;
  display_name: string;
  description?: string;
  fields: FieldSchema[];
  relationships: RelationshipSchema[];
}

export interface TableSummary {
  table_name: string;
  display_name: string;
  description?: string;
  field_count: number;
  display_order: number;
}

export interface FilterConfig {
  id: string;
  field: string;
  operator: FilterOperator;
  value: string | number | boolean | string[] | null;
}

export type FilterOperator = 
  | 'eq' 
  | 'neq' 
  | 'gt' 
  | 'gte' 
  | 'lt' 
  | 'lte' 
  | 'like' 
  | 'ilike' 
  | 'in' 
  | 'not_in' 
  | 'is_null' 
  | 'is_not_null' 
  | 'between';

export interface JoinConfig {
  id: string;
  table: string;
  on: Record<string, string>;
  type: 'LEFT' | 'INNER' | 'RIGHT';
}

export interface OrderByConfig {
  id: string;
  field: string;
  direction: 'asc' | 'desc';
}

// API types (without id fields - used for API requests)
export interface FilterConfigAPI {
  field: string;
  operator: FilterOperator;
  value: string | number | boolean | string[] | null;
}

export interface JoinConfigAPI {
  table: string;
  on: Record<string, string>;
  type: 'LEFT' | 'INNER' | 'RIGHT';
}

export interface OrderByConfigAPI {
  field: string;
  direction: 'asc' | 'desc';
}

export interface QueryConfig {
  base_table: string;
  selected_fields: string[];
  joins?: JoinConfigAPI[];
  filters?: FilterConfigAPI[];
  group_by?: string[];
  order_by?: OrderByConfigAPI[];
  limit: number;
}

export interface DisplayConfig {
  chart_type?: 'table' | 'bar' | 'line' | 'pie' | 'area';
  x_axis?: string;
  y_axis?: string;
  colors?: Record<string, string>;
  title?: string;
}

export interface ReportTemplate {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  visibility: 'private' | 'institute' | 'all_tenants';
  institute_id?: string;
  query_config: QueryConfig;
  display_config: DisplayConfig;
  output_formats: OutputFormat[];
  schedule_cron?: string;
  schedule_enabled: boolean;
  schedule_recipients: string[];
  category?: string;
  tags: string[];
  run_count: number;
  last_run_at?: string;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export type OutputFormat = 'html' | 'csv' | 'json' | 'pdf' | 'xlsx';

export interface ReportInstance {
  id: string;
  template_id?: string;
  format: OutputFormat;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  parameters: Record<string, unknown>;
  file_path?: string;
  file_size?: number;
  row_count?: number;
  started_at?: string;
  completed_at?: string;
  error_message?: string;
  expires_at?: string;
  created_at: string;
  created_by: string;
}

export interface PreviewResult {
  row_count: number;
  preview_limit: number;
  data: Record<string, unknown>[];
}

// Filter operator display names
export const FILTER_OPERATORS: Record<FilterOperator, string> = {
  eq: 'Equals',
  neq: 'Not Equals',
  gt: 'Greater Than',
  gte: 'Greater Than or Equal',
  lt: 'Less Than',
  lte: 'Less Than or Equal',
  like: 'Contains',
  ilike: 'Contains (case-insensitive)',
  in: 'In List',
  not_in: 'Not In List',
  is_null: 'Is Empty',
  is_not_null: 'Is Not Empty',
  between: 'Between',
};

// Get applicable operators for a field type
export function getOperatorsForType(type: FieldSchema['type']): FilterOperator[] {
  switch (type) {
    case 'string':
    case 'text':
      return ['eq', 'neq', 'like', 'ilike', 'in', 'not_in', 'is_null', 'is_not_null'];
    case 'integer':
    case 'decimal':
      return ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'between', 'in', 'is_null', 'is_not_null'];
    case 'datetime':
      return ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'between', 'is_null', 'is_not_null'];
    case 'boolean':
      return ['eq', 'neq', 'is_null', 'is_not_null'];
    case 'uuid':
      return ['eq', 'neq', 'in', 'not_in', 'is_null', 'is_not_null'];
    default:
      return ['eq', 'neq', 'is_null', 'is_not_null'];
  }
}
