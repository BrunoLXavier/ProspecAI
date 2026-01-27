/**
 * Report Builder Page Component
 * Visual interface for creating and editing dynamic reports
 * Implements RF-09: Customizable reports based on database structure
 */
'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  DocumentTextIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckIcon,
  XMarkIcon,
  DocumentArrowDownIcon,
  ClockIcon,
  CogIcon,
} from '@heroicons/react/24/outline';
import PageHeader from '@/components/ui/PageHeader';
import TableSelector from './TableSelector';
import FieldSelector from './FieldSelector';
import FilterBuilder from './FilterBuilder';
import JoinBuilder from './JoinBuilder';
import OrderByBuilder from './OrderByBuilder';
import QueryPreview from './QueryPreview';
import {
  useCreateTemplate,
  useUpdateTemplate,
  useReportTemplate,
  useGenerateReport,
  downloadReport,
  getReportFilename,
} from '@/hooks/useReportBuilder';
import type {
  QueryConfig,
  DisplayConfig,
  FilterConfig,
  JoinConfig,
  OrderByConfig,
  OutputFormat,
} from '@/types/features/report-builder';

// Wizard steps
const STEPS = [
  { id: 'table', label: 'Select Table', icon: '1' },
  { id: 'fields', label: 'Choose Fields', icon: '2' },
  { id: 'joins', label: 'Join Tables', icon: '3' },
  { id: 'filters', label: 'Add Filters', icon: '4' },
  { id: 'order', label: 'Sort & Preview', icon: '5' },
  { id: 'save', label: 'Save & Export', icon: '6' },
] as const;

type StepId = typeof STEPS[number]['id'];

export default function ReportBuilderPage() {
  const t = useTranslations('reports');
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('edit');

  // Load existing template if editing
  const { data: existingTemplate, isLoading: isLoadingTemplate } = useReportTemplate(editId);

  // Wizard state
  const [currentStep, setCurrentStep] = useState<StepId>('table');

  // Query configuration state
  const [baseTable, setBaseTable] = useState<string | null>(
    existingTemplate?.query_config?.base_table || null
  );
  const [selectedFields, setSelectedFields] = useState<string[]>(
    existingTemplate?.query_config?.selected_fields || []
  );
  const [joins, setJoins] = useState<JoinConfig[]>(
    (existingTemplate?.query_config?.joins || []).map(j => ({
      ...j,
      id: crypto.randomUUID()
    }))
  );
  const [filters, setFilters] = useState<FilterConfig[]>(
    (existingTemplate?.query_config?.filters || []).map(f => ({
      ...f,
      id: crypto.randomUUID()
    }))
  );
  const [orderBy, setOrderBy] = useState<OrderByConfig[]>(
    (existingTemplate?.query_config?.order_by || []).map(o => ({
      ...o,
      id: crypto.randomUUID()
    }))
  );
  const [limit, setLimit] = useState<number>(
    existingTemplate?.query_config?.limit || 1000
  );

  // Template metadata
  const [templateName, setTemplateName] = useState(existingTemplate?.name || '');
  const [templateDescription, setTemplateDescription] = useState(existingTemplate?.description || '');
  const [visibility, setVisibility] = useState<'private' | 'institute' | 'all_tenants'>(
    existingTemplate?.visibility || 'private'
  );
  const [outputFormats, setOutputFormats] = useState<OutputFormat[]>(
    existingTemplate?.output_formats || ['html', 'csv', 'json', 'pdf', 'xlsx']
  );
  const [scheduleCron, setScheduleCron] = useState(existingTemplate?.schedule_cron || '');
  const [scheduleEnabled, setScheduleEnabled] = useState(existingTemplate?.schedule_enabled || false);

  // Update state when template loads
  useState(() => {
    if (existingTemplate) {
      setBaseTable(existingTemplate.query_config?.base_table || null);
      setSelectedFields(existingTemplate.query_config?.selected_fields || []);
      setJoins((existingTemplate.query_config?.joins || []).map(j => ({
        ...j,
        id: crypto.randomUUID()
      })));
      setFilters((existingTemplate.query_config?.filters || []).map(f => ({
        ...f,
        id: crypto.randomUUID()
      })));
      setOrderBy((existingTemplate.query_config?.order_by || []).map(o => ({
        ...o,
        id: crypto.randomUUID()
      })));
      setLimit(existingTemplate.query_config?.limit || 1000);
      setTemplateName(existingTemplate.name || '');
      setTemplateDescription(existingTemplate.description || '');
      setVisibility(existingTemplate.visibility || 'private');
      setOutputFormats(existingTemplate.output_formats || ['html', 'csv', 'json', 'pdf', 'xlsx']);
      setScheduleCron(existingTemplate.schedule_cron || '');
      setScheduleEnabled(existingTemplate.schedule_enabled || false);
    }
  });

  // Mutations
  const createMutation = useCreateTemplate();
  const updateMutation = useUpdateTemplate();
  const generateMutation = useGenerateReport();

  // Build query config
  const queryConfig: QueryConfig = useMemo(() => ({
    base_table: baseTable || '',
    selected_fields: selectedFields.length > 0 ? selectedFields : ['*'],
    joins: joins.length > 0 ? joins : undefined,
    filters: filters.length > 0 ? filters.map(({ id, ...rest }) => rest) : undefined,
    order_by: orderBy.length > 0 ? orderBy.map(({ id, ...rest }) => rest) : undefined,
    limit,
  }), [baseTable, selectedFields, joins, filters, orderBy, limit]);

  // Validation
  const isQueryValid = baseTable !== null && selectedFields.length > 0;
  const isTemplateValid = isQueryValid && templateName.trim().length > 0;

  // Step validation
  const canProceed = (step: StepId): boolean => {
    switch (step) {
      case 'table':
        return baseTable !== null;
      case 'fields':
        return selectedFields.length > 0;
      case 'joins':
      case 'filters':
      case 'order':
        return true; // Optional steps
      case 'save':
        return isTemplateValid;
      default:
        return false;
    }
  };

  const currentStepIndex = STEPS.findIndex(s => s.id === currentStep);

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

  const handleSave = async () => {
    if (!isTemplateValid) return;

    const payload = {
      name: templateName,
      description: templateDescription,
      visibility,
      query_config: queryConfig,
      display_config: {} as DisplayConfig,
      output_formats: outputFormats,
      schedule_cron: scheduleCron || undefined,
      schedule_enabled: scheduleEnabled,
    };

    try {
      if (editId) {
        await updateMutation.mutateAsync({ id: editId, ...payload });
      } else {
        await createMutation.mutateAsync(payload);
      }
      router.push('/reports');
    } catch (error) {
      console.error('Failed to save template:', error);
    }
  };

  const handleGenerate = async (format: OutputFormat) => {
    if (!editId && !isTemplateValid) return;

    try {
      // If we have a saved template, use it
      const templateId = editId || 'preview';
      
      const result = await generateMutation.mutateAsync({
        templateId,
        format,
      });

      if (result instanceof Blob) {
        downloadReport(result, getReportFilename(templateName || 'report', format));
      } else if (format === 'html') {
        // Open HTML in new window
        const html = typeof result === 'string' ? result : JSON.stringify(result);
        const newWindow = window.open();
        if (newWindow) {
          newWindow.document.write(html);
        }
      }
    } catch (error) {
      console.error('Failed to generate report:', error);
    }
  };

  if (isLoadingTemplate && editId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <PageHeader
        title={editId ? (t('editReport') || 'Edit Report') : (t('createReport') || 'Create Report')}
        subtitle={t('reportBuilderSubtitle') || 'Build custom reports using the visual query builder'}
      />

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Step indicator */}
        <nav className="mb-8">
          <ol className="flex items-center justify-between">
            {STEPS.map((step, index) => {
              const isActive = step.id === currentStep;
              const isCompleted = index < currentStepIndex;
              const isClickable = index <= currentStepIndex + 1 && (index === 0 || canProceed(STEPS[index - 1].id));

              return (
                <li key={step.id} className="flex-1 relative">
                  {index > 0 && (
                    <div 
                      className={`absolute top-4 left-0 w-full h-0.5 -translate-y-1/2 -ml-1/2
                        ${isCompleted ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}`}
                    />
                  )}
                  <button
                    onClick={() => isClickable && setCurrentStep(step.id)}
                    disabled={!isClickable}
                    className={`relative flex flex-col items-center group ${!isClickable ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <span
                      className={`
                        w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium z-10
                        ${isActive
                          ? 'bg-blue-600 text-white ring-4 ring-blue-100 dark:ring-blue-900'
                          : isCompleted
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                        }
                        ${isClickable && !isActive ? 'group-hover:bg-blue-500 group-hover:text-white' : ''}
                      `}
                    >
                      {isCompleted ? <CheckIcon className="w-4 h-4" /> : step.icon}
                    </span>
                    <span 
                      className={`mt-2 text-xs font-medium hidden sm:block
                        ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}
                      `}
                    >
                      {step.label}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>

        {/* Step content */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          {currentStep === 'table' && (
            <TableSelector
              selectedTable={baseTable}
              onSelect={(table) => {
                setBaseTable(table);
                setSelectedFields([]);
                setJoins([]);
              }}
            />
          )}

          {currentStep === 'fields' && baseTable && (
            <FieldSelector
              baseTable={baseTable}
              selectedFields={selectedFields}
              onFieldsChange={setSelectedFields}
              joins={joins}
            />
          )}

          {currentStep === 'joins' && baseTable && (
            <JoinBuilder
              baseTable={baseTable}
              joins={joins}
              onJoinsChange={setJoins}
            />
          )}

          {currentStep === 'filters' && baseTable && (
            <FilterBuilder
              baseTable={baseTable}
              filters={filters}
              onFiltersChange={setFilters}
            />
          )}

          {currentStep === 'order' && baseTable && (
            <div className="space-y-6">
              <OrderByBuilder
                baseTable={baseTable}
                selectedFields={selectedFields}
                orderBy={orderBy}
                onOrderByChange={setOrderBy}
              />
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('resultLimit') || 'Result Limit'}
                </label>
                <input
                  type="number"
                  value={limit}
                  onChange={(e) => setLimit(Math.min(10000, Math.max(1, Number(e.target.value))))}
                  min={1}
                  max={10000}
                  className="w-32 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                             bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <QueryPreview queryConfig={queryConfig} isValid={isQueryValid} />
            </div>
          )}

          {currentStep === 'save' && (
            <div className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('templateName') || 'Report Name'} *
                  </label>
                  <input
                    type="text"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    placeholder={t('enterReportName') || 'Enter report name...'}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                               bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('visibility') || 'Visibility'}
                  </label>
                  <select
                    value={visibility}
                    onChange={(e) => setVisibility(e.target.value as typeof visibility)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                               bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="private">{t('private') || 'Private (Only me)'}</option>
                    <option value="institute">{t('institute') || 'Institute members'}</option>
                    <option value="all_tenants">{t('allTenants') || 'All users'}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('description') || 'Description'}
                </label>
                <textarea
                  value={templateDescription}
                  onChange={(e) => setTemplateDescription(e.target.value)}
                  rows={3}
                  placeholder={t('enterDescription') || 'Enter description...'}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                             bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('outputFormats') || 'Output Formats'}
                </label>
                <div className="flex flex-wrap gap-2">
                  {(['html', 'csv', 'json', 'pdf', 'xlsx'] as OutputFormat[]).map(format => (
                    <button
                      key={format}
                      onClick={() => {
                        if (outputFormats.includes(format)) {
                          setOutputFormats(outputFormats.filter(f => f !== format));
                        } else {
                          setOutputFormats([...outputFormats, format]);
                        }
                      }}
                      className={`
                        px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors
                        ${outputFormats.includes(format)
                          ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300'
                          : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'
                        }
                      `}
                    >
                      {format.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={scheduleEnabled}
                      onChange={(e) => setScheduleEnabled(e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <ClockIcon className="w-5 h-5 text-gray-400" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {t('enableSchedule') || 'Enable scheduled generation'}
                    </span>
                  </label>
                </div>

                {scheduleEnabled && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t('cronExpression') || 'Cron Expression'}
                    </label>
                    <input
                      type="text"
                      value={scheduleCron}
                      onChange={(e) => setScheduleCron(e.target.value)}
                      placeholder="0 8 * * 1 (Every Monday at 8am)"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                                 bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm"
                    />
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {t('cronHelp') || 'Format: minute hour day month weekday'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Navigation buttons */}
        <div className="flex items-center justify-between mt-6">
          <button
            onClick={() => router.push('/reports')}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            <XMarkIcon className="w-5 h-5" />
            {t('cancel') || 'Cancel'}
          </button>

          <div className="flex items-center gap-3">
            {currentStepIndex > 0 && (
              <button
                onClick={goPrev}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                           text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <ArrowLeftIcon className="w-4 h-4" />
                {t('back') || 'Back'}
              </button>
            )}

            {currentStepIndex < STEPS.length - 1 ? (
              <button
                onClick={goNext}
                disabled={!canProceed(currentStep)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg
                           hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('next') || 'Next'}
                <ArrowRightIcon className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleSave}
                disabled={!isTemplateValid || createMutation.isPending || updateMutation.isPending}
                className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg
                           hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                <CheckIcon className="w-5 h-5" />
                {editId ? (t('saveChanges') || 'Save Changes') : (t('saveTemplate') || 'Save Template')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
