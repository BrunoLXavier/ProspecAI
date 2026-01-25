/**
 * Report Builder Page
 * Visual query builder for creating custom reports
 * Implements RF-09: Dynamic Reports
 */
'use client';

import { useState, useMemo, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckIcon,
  TableCellsIcon,
  FunnelIcon,
  ArrowsUpDownIcon,
  DocumentTextIcon,
  PlayIcon,
  DocumentArrowDownIcon,
  Cog6ToothIcon,
  LinkIcon,
} from '@heroicons/react/24/outline';
import apiClient from '@/lib/api-client';
import PageHeader from '@/components/ui/PageHeader';

// =============================================================================
// Types
// =============================================================================

interface TableSummary {
  table_name: string;
  display_name: string;
  description?: string;
  field_count: number;
}

interface FieldSchema {
  name: string;
  type: string;
  display_name: string;
  filterable: boolean;
  sortable: boolean;
}

interface TableSchema {
  table_name: string;
  display_name: string;
  description?: string;
  fields: FieldSchema[];
  relationships: RelationshipSchema[];
}

interface RelationshipSchema {
  target_table: string;
  target_display_name: string;
  join_field: string;
  target_field: string;
  label: string;
  type: string;
}

interface FilterConfig {
  id: string;
  field: string;
  operator: string;
  value: string | number | boolean | null;
}

interface JoinConfig {
  id: string;
  table: string;
  on: Record<string, string>;
  type: 'LEFT' | 'INNER' | 'RIGHT';
}

interface OrderByConfig {
  id: string;
  field: string;
  direction: 'asc' | 'desc';
}

interface QueryConfig {
  base_table: string;
  selected_fields: string[];
  joins?: Array<{ table: string; on: Record<string, string>; type: string }>;
  filters?: Array<{ field: string; operator: string; value: unknown }>;
  order_by?: Array<{ field: string; direction: string }>;
  limit: number;
}

interface PreviewResult {
  row_count: number;
  preview_limit: number;
  data: Record<string, unknown>[];
}

// =============================================================================
// Step Configuration
// =============================================================================

type StepId = 'table' | 'fields' | 'joins' | 'filters' | 'order' | 'preview' | 'save';

const STEPS: { id: StepId; label: string; icon: React.ReactNode }[] = [
  { id: 'table', label: 'Select Table', icon: <TableCellsIcon className="w-5 h-5" /> },
  { id: 'fields', label: 'Choose Fields', icon: <DocumentTextIcon className="w-5 h-5" /> },
  { id: 'joins', label: 'Add Joins', icon: <LinkIcon className="w-5 h-5" /> },
  { id: 'filters', label: 'Add Filters', icon: <FunnelIcon className="w-5 h-5" /> },
  { id: 'order', label: 'Sort & Limit', icon: <ArrowsUpDownIcon className="w-5 h-5" /> },
  { id: 'preview', label: 'Preview', icon: <PlayIcon className="w-5 h-5" /> },
  { id: 'save', label: 'Save Template', icon: <Cog6ToothIcon className="w-5 h-5" /> },
];

// =============================================================================
// Filter Operators
// =============================================================================

const FILTER_OPERATORS: Record<string, string> = {
  eq: 'Equals',
  neq: 'Not Equals',
  gt: 'Greater Than',
  gte: 'Greater or Equal',
  lt: 'Less Than',
  lte: 'Less or Equal',
  like: 'Contains',
  ilike: 'Contains (case-insensitive)',
  is_null: 'Is Empty',
  is_not_null: 'Is Not Empty',
};

// =============================================================================
// Main Component
// =============================================================================

export default function ReportBuilderPage() {
  const t = useTranslations('reports');
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const editId = searchParams.get('edit');

  // Step state
  const [currentStep, setCurrentStep] = useState<StepId>('table');

  // Query configuration state
  const [baseTable, setBaseTable] = useState<string | null>(null);
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [joins, setJoins] = useState<JoinConfig[]>([]);
  const [filters, setFilters] = useState<FilterConfig[]>([]);
  const [orderBy, setOrderBy] = useState<OrderByConfig[]>([]);
  const [limit, setLimit] = useState<number>(1000);

  // Template metadata
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [visibility, setVisibility] = useState<'private' | 'institute' | 'all_tenants'>('private');
  const [outputFormats, setOutputFormats] = useState<string[]>(['html', 'csv', 'json']);

  // Preview state
  const [previewData, setPreviewData] = useState<PreviewResult | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // Fetch available tables
  const { data: tables = [], isLoading: tablesLoading } = useQuery<TableSummary[]>({
    queryKey: ['report-tables'],
    queryFn: async () => {
      try {
        const resp = await apiClient.get<TableSummary[]>('/api/v1/reports/schema/tables');
        return resp ?? [];
      } catch {
        return [];
      }
    },
  });

  // Fetch table schema when base table is selected
  const { data: tableSchema } = useQuery<TableSchema | undefined>({
    queryKey: ['report-table-schema', baseTable],
    queryFn: async () => {
      if (!baseTable) return undefined;
      const resp = await apiClient.get<TableSchema>(`/api/v1/reports/schema/tables/${baseTable}`);
      return resp;
    },
    enabled: !!baseTable,
  });

  // Fetch available joins for base table
  const { data: availableJoins = [] } = useQuery<RelationshipSchema[]>({
    queryKey: ['report-table-joins', baseTable],
    queryFn: async () => {
      if (!baseTable) return [];
      const resp = await apiClient.get<RelationshipSchema[]>(`/api/v1/reports/schema/tables/${baseTable}/joins`);
      return resp ?? [];
    },
    enabled: !!baseTable,
  });

  // Build query config
  const queryConfig: QueryConfig = useMemo(() => ({
    base_table: baseTable || '',
    selected_fields: selectedFields.length > 0 ? selectedFields : ['*'],
    joins: joins.length > 0 ? joins.map(j => ({ table: j.table, on: j.on, type: j.type })) : undefined,
    filters: filters.length > 0 ? filters.map(f => ({ field: f.field, operator: f.operator, value: f.value })) : undefined,
    order_by: orderBy.length > 0 ? orderBy.map(o => ({ field: o.field, direction: o.direction })) : undefined,
    limit,
  }), [baseTable, selectedFields, joins, filters, orderBy, limit]);

  // Preview mutation
  const previewMutation = useMutation({
    mutationFn: async () => {
      const resp = await apiClient.post<PreviewResult>('/api/v1/reports/preview', {
        query_config: queryConfig,
        limit: 10,
      });
      return resp;
    },
    onSuccess: (data) => {
      setPreviewData(data);
      setPreviewError(null);
    },
    onError: (error: Error) => {
      setPreviewError(error.message);
      setPreviewData(null);
    },
  });

  // Save template mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: templateName,
        description: templateDescription,
        visibility,
        query_config: queryConfig,
        display_config: {},
        output_formats: outputFormats,
        schedule_enabled: false,
        schedule_recipients: [],
        tags: [],
      };

      if (editId) {
        await apiClient.put(`/api/v1/reports/templates/${editId}`, payload);
      } else {
        await apiClient.post('/api/v1/reports/templates', payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report-templates'] });
      router.push('/reports');
    },
  });

  // Step navigation
  const currentStepIndex = STEPS.findIndex(s => s.id === currentStep);

  const canProceed = useCallback((step: StepId): boolean => {
    switch (step) {
      case 'table': return baseTable !== null;
      case 'fields': return selectedFields.length > 0;
      case 'joins':
      case 'filters':
      case 'order':
        return true;
      case 'preview': return true;
      case 'save': return templateName.trim().length > 0;
      default: return false;
    }
  }, [baseTable, selectedFields, templateName]);

  const goNext = () => {
    if (currentStepIndex < STEPS.length - 1) {
      setCurrentStep(STEPS[currentStepIndex + 1].id);
    }
  };

  const goPrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStep(STEPS[currentStepIndex - 1].id);
    }
  };

  // Field toggle
  const toggleField = (fieldName: string) => {
    setSelectedFields(prev =>
      prev.includes(fieldName)
        ? prev.filter(f => f !== fieldName)
        : [...prev, fieldName]
    );
  };

  // Filter management
  const addFilter = () => {
    const defaultField = tableSchema?.fields[0]?.name || '';
    setFilters(prev => [...prev, {
      id: crypto.randomUUID(),
      field: defaultField,
      operator: 'eq',
      value: '',
    }]);
  };

  const updateFilter = (id: string, updates: Partial<FilterConfig>) => {
    setFilters(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  const removeFilter = (id: string) => {
    setFilters(prev => prev.filter(f => f.id !== id));
  };

  // Order management
  const addOrderBy = () => {
    const defaultField = tableSchema?.fields[0]?.name || '';
    setOrderBy(prev => [...prev, {
      id: crypto.randomUUID(),
      field: defaultField,
      direction: 'asc',
    }]);
  };

  const updateOrderBy = (id: string, updates: Partial<OrderByConfig>) => {
    setOrderBy(prev => prev.map(o => o.id === id ? { ...o, ...updates } : o));
  };

  const removeOrderBy = (id: string) => {
    setOrderBy(prev => prev.filter(o => o.id !== id));
  };

  // Join management
  const addJoin = (relationship: RelationshipSchema) => {
    setJoins(prev => [...prev, {
      id: crypto.randomUUID(),
      table: relationship.target_table,
      on: { [relationship.join_field]: relationship.target_field },
      type: 'LEFT',
    }]);
  };

  const removeJoin = (id: string) => {
    setJoins(prev => prev.filter(j => j.id !== id));
  };

  // =============================================================================
  // Render Steps
  // =============================================================================

  const renderTableStep = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white">
        {t('selectBaseTable') || 'Select Base Table'}
      </h3>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        {t('selectBaseTableDesc') || 'Choose the primary data source for your report'}
      </p>

      {tablesLoading ? (
        <div className="animate-pulse space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="grid gap-3">
          {tables.map(table => (
            <button
              key={table.table_name}
              onClick={() => {
                setBaseTable(table.table_name);
                setSelectedFields([]);
                setJoins([]);
                setFilters([]);
                setOrderBy([]);
              }}
              className={`flex items-center justify-between p-4 rounded-lg border-2 transition-all
                ${baseTable === table.table_name
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'
                }`}
            >
              <div className="text-left">
                <div className="font-medium text-gray-900 dark:text-white">
                  {table.display_name}
                </div>
                {table.description && (
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {table.description}
                  </div>
                )}
                <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  {table.field_count} fields
                </div>
              </div>
              {baseTable === table.table_name && (
                <CheckIcon className="w-5 h-5 text-blue-500" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );

  const renderFieldsStep = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white">
        {t('selectFields') || 'Select Fields'}
      </h3>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        {t('selectFieldsDesc') || 'Choose which columns to include in your report'}
      </p>

      {tableSchema && (
        <div className="grid gap-2">
          <button
            onClick={() => setSelectedFields(tableSchema.fields.map(f => f.name))}
            className="text-sm text-blue-600 hover:text-blue-700 text-left"
          >
            {t('selectAll') || 'Select All'}
          </button>
          <button
            onClick={() => setSelectedFields([])}
            className="text-sm text-gray-500 hover:text-gray-700 text-left"
          >
            {t('clearAll') || 'Clear All'}
          </button>

          <div className="border rounded-lg divide-y dark:border-gray-700 dark:divide-gray-700 max-h-96 overflow-y-auto">
            {tableSchema.fields.map(field => (
              <label
                key={field.name}
                className="flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedFields.includes(field.name)}
                  onChange={() => toggleField(field.name)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <div className="flex-1">
                  <div className="font-medium text-gray-900 dark:text-white">
                    {field.display_name}
                  </div>
                  <div className="text-xs text-gray-500">
                    {field.name} ({field.type})
                  </div>
                </div>
              </label>
            ))}
          </div>

          <div className="text-sm text-gray-500">
            {selectedFields.length} of {tableSchema.fields.length} fields selected
          </div>
        </div>
      )}
    </div>
  );

  const renderJoinsStep = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white">
        {t('addJoins') || 'Add Table Joins'} <span className="text-sm font-normal text-gray-500">(Optional)</span>
      </h3>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        {t('addJoinsDesc') || 'Include data from related tables'}
      </p>

      {/* Current joins */}
      {joins.length > 0 && (
        <div className="space-y-2 mb-4">
          {joins.map(join => (
            <div key={join.id} className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <span className="font-medium">{join.table}</span>
              <button
                onClick={() => removeJoin(join.id)}
                className="text-red-500 hover:text-red-700"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Available joins */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {t('availableRelations') || 'Available Relations'}
        </h4>
        {availableJoins.length === 0 ? (
          <p className="text-sm text-gray-500 italic">No related tables available</p>
        ) : (
          <div className="grid gap-2">
            {availableJoins
              .filter(rel => !joins.some(j => j.table === rel.target_table))
              .map(rel => (
                <button
                  key={rel.target_table}
                  onClick={() => addJoin(rel)}
                  className="flex items-center justify-between p-3 border rounded-lg hover:border-blue-300 dark:border-gray-700"
                >
                  <div className="text-left">
                    <div className="font-medium">{rel.target_display_name}</div>
                    <div className="text-xs text-gray-500">{rel.label}</div>
                  </div>
                  <LinkIcon className="w-4 h-4 text-gray-400" />
                </button>
              ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderFiltersStep = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white">
        {t('addFilters') || 'Add Filters'} <span className="text-sm font-normal text-gray-500">(Optional)</span>
      </h3>

      {filters.map((filter, idx) => (
        <div key={filter.id} className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          {idx > 0 && <span className="text-xs text-gray-500 px-2">AND</span>}
          <select
            value={filter.field}
            onChange={(e) => updateFilter(filter.id, { field: e.target.value })}
            className="flex-1 px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
          >
            {tableSchema?.fields.filter(f => f.filterable).map(f => (
              <option key={f.name} value={f.name}>{f.display_name}</option>
            ))}
          </select>
          <select
            value={filter.operator}
            onChange={(e) => updateFilter(filter.id, { operator: e.target.value })}
            className="w-40 px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
          >
            {Object.entries(FILTER_OPERATORS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
          {!['is_null', 'is_not_null'].includes(filter.operator) && (
            <input
              type="text"
              value={filter.value as string}
              onChange={(e) => updateFilter(filter.id, { value: e.target.value })}
              placeholder="Value"
              className="flex-1 px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
            />
          )}
          <button
            onClick={() => removeFilter(filter.id)}
            className="p-2 text-red-500 hover:text-red-700"
          >
            ×
          </button>
        </div>
      ))}

      <button
        onClick={addFilter}
        className="flex items-center gap-2 text-blue-600 hover:text-blue-700"
      >
        <FunnelIcon className="w-4 h-4" />
        {t('addFilter') || 'Add Filter'}
      </button>
    </div>
  );

  const renderOrderStep = () => (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          {t('sorting') || 'Sorting'} <span className="text-sm font-normal text-gray-500">(Optional)</span>
        </h3>

        {orderBy.map(order => (
          <div key={order.id} className="flex items-center gap-2">
            <select
              value={order.field}
              onChange={(e) => updateOrderBy(order.id, { field: e.target.value })}
              className="flex-1 px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
            >
              {tableSchema?.fields.filter(f => f.sortable).map(f => (
                <option key={f.name} value={f.name}>{f.display_name}</option>
              ))}
            </select>
            <select
              value={order.direction}
              onChange={(e) => updateOrderBy(order.id, { direction: e.target.value as 'asc' | 'desc' })}
              className="w-32 px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
            >
              <option value="asc">Ascending</option>
              <option value="desc">Descending</option>
            </select>
            <button
              onClick={() => removeOrderBy(order.id)}
              className="p-2 text-red-500 hover:text-red-700"
            >
              ×
            </button>
          </div>
        ))}

        <button
          onClick={addOrderBy}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-700"
        >
          <ArrowsUpDownIcon className="w-4 h-4" />
          {t('addSorting') || 'Add Sorting'}
        </button>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {t('rowLimit') || 'Row Limit'}
        </label>
        <input
          type="number"
          value={limit}
          onChange={(e) => setLimit(parseInt(e.target.value) || 1000)}
          min={1}
          max={100000}
          className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
        />
      </div>
    </div>
  );

  const renderPreviewStep = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          {t('preview') || 'Preview Results'}
        </h3>
        <button
          onClick={() => previewMutation.mutate()}
          disabled={previewMutation.isPending}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          <PlayIcon className="w-4 h-4" />
          {previewMutation.isPending ? 'Loading...' : 'Run Preview'}
        </button>
      </div>

      {previewError && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300">
          {previewError}
        </div>
      )}

      {previewData && (
        <div className="space-y-2">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Showing {previewData.data.length} of {previewData.row_count} rows
          </p>
          <div className="overflow-x-auto border rounded-lg dark:border-gray-700">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  {selectedFields.map(field => (
                    <th key={field} className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      {field}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {previewData.data.map((row, idx) => (
                  <tr key={idx}>
                    {selectedFields.map(field => (
                      <td key={field} className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">
                        {String(row[field] ?? '')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );

  const renderSaveStep = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white">
        {t('saveTemplate') || 'Save Report Template'}
      </h3>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('templateName') || 'Template Name'} *
          </label>
          <input
            type="text"
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            placeholder="My Custom Report"
            className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('description') || 'Description'}
          </label>
          <textarea
            value={templateDescription}
            onChange={(e) => setTemplateDescription(e.target.value)}
            rows={3}
            placeholder="Describe what this report shows..."
            className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('visibility') || 'Visibility'}
          </label>
          <select
            value={visibility}
            onChange={(e) => setVisibility(e.target.value as typeof visibility)}
            className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
          >
            <option value="private">Private (Only me)</option>
            <option value="institute">My Institute</option>
            <option value="all_tenants">All Users</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('outputFormats') || 'Output Formats'}
          </label>
          <div className="flex flex-wrap gap-2">
            {['html', 'csv', 'json', 'pdf', 'xlsx'].map(format => (
              <label key={format} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={outputFormats.includes(format)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setOutputFormats(prev => [...prev, format]);
                    } else {
                      setOutputFormats(prev => prev.filter(f => f !== format));
                    }
                  }}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600"
                />
                <span className="uppercase text-sm">{format}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      <button
        onClick={() => saveMutation.mutate()}
        disabled={saveMutation.isPending || !templateName.trim()}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium"
      >
        <DocumentArrowDownIcon className="w-5 h-5" />
        {saveMutation.isPending ? 'Saving...' : (editId ? 'Update Template' : 'Save Template')}
      </button>
    </div>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'table': return renderTableStep();
      case 'fields': return renderFieldsStep();
      case 'joins': return renderJoinsStep();
      case 'filters': return renderFiltersStep();
      case 'order': return renderOrderStep();
      case 'preview': return renderPreviewStep();
      case 'save': return renderSaveStep();
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <PageHeader
        title={editId ? (t('editReport') || 'Edit Report') : (t('createReport') || 'Create Report')}
        subtitle={t('reportBuilderSubtitle') || 'Build custom reports using the visual query builder'}
      />

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Step indicator */}
        <nav className="mb-8">
          <ol className="flex items-center justify-between overflow-x-auto">
            {STEPS.map((step, index) => {
              const isActive = step.id === currentStep;
              const isCompleted = index < currentStepIndex;
              const isClickable = index <= currentStepIndex + 1;

              return (
                <li key={step.id} className="flex items-center">
                  <button
                    onClick={() => isClickable && setCurrentStep(step.id)}
                    disabled={!isClickable}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-blue-600 text-white'
                        : isCompleted
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                        : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                    } ${isClickable ? 'cursor-pointer hover:opacity-80' : 'cursor-not-allowed opacity-50'}`}
                  >
                    {isCompleted ? <CheckIcon className="w-5 h-5" /> : step.icon}
                    <span className="hidden sm:inline text-sm font-medium">{step.label}</span>
                  </button>
                  {index < STEPS.length - 1 && (
                    <div className="w-8 h-0.5 bg-gray-200 dark:bg-gray-700 mx-1" />
                  )}
                </li>
              );
            })}
          </ol>
        </nav>

        {/* Step content */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 mb-6">
          {renderCurrentStep()}
        </div>

        {/* Navigation buttons */}
        <div className="flex justify-between">
          <button
            onClick={goPrev}
            disabled={currentStepIndex === 0}
            className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800 disabled:opacity-50"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            Back
          </button>

          {currentStep !== 'save' && (
            <button
              onClick={goNext}
              disabled={!canProceed(currentStep)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              Next
              <ArrowRightIcon className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
