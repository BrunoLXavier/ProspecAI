/**
 * Portfolio Project Entity Form Definition — RF-03
 * i18n keys reference the `portfolio` namespace in locale files.
 */
import { registerEntity, EntityFormDefinition } from '../types';

export interface PortfolioProjectFormData {
  title: string;
  description: string;
  status: string;
  institute_id: string;
  start_date: string;
  end_date: string;
  budget: number;
  trl: number;
  research_area: string;
  keywords: string[];
  lessons_learned: string;
}

export const portfolioProjectDefinition: EntityFormDefinition<PortfolioProjectFormData> = registerEntity<PortfolioProjectFormData>({
  entityKey: 'portfolio',
  i18nNamespace: 'portfolio',
  resource: 'portfolio',
  instituteScoped: true,
  apiEndpoint: '/api/v1/portfolio',
  statisticsModule: 'portfolio',
  gridCols: 1,

  defaultValues: {
    title: '',
    description: '',
    status: 'planning',
    institute_id: '',
    start_date: '',
    end_date: '',
    budget: 0,
    trl: 1,
    research_area: '',
    keywords: [],
    lessons_learned: '',
  },

  tabs: [
    { key: 'basic', nameKey: 'tabs.basic', fields: ['title', 'description', 'status', 'institute_id', 'start_date', 'end_date'], gridCols: 1 },
    { key: 'technical', nameKey: 'tabs.financial', fields: ['budget', 'trl', 'research_area', 'keywords'], gridCols: 1 },
    { key: 'lessons', nameKey: 'tabs.lessons', fields: ['lessons_learned'], gridCols: 1 },
  ],

  fields: [
    {
      name: 'title', type: 'text', labelKey: 'projectTitle', placeholderKey: 'projectTitlePlaceholder',
      colSpan: 2,
      rules: [{ type: 'required', messageKey: 'required' }, { type: 'maxLength', value: 500, messageKey: 'maxLength', messageParams: { max: 500 } }],
    },
    {
      name: 'description', type: 'textarea', labelKey: 'description', placeholderKey: 'descriptionPlaceholder',
      rows: 4, colSpan: 2,
    },
    {
      name: 'status', type: 'select', labelKey: 'statusLabel',
      rules: [{ type: 'required', messageKey: 'required' }],
      options: [
        { value: 'planning', labelKey: 'status.planning' },
        { value: 'active', labelKey: 'status.active' },
        { value: 'completed', labelKey: 'status.completed' },
        { value: 'suspended', labelKey: 'status.suspended' },
      ],
    },
    {
      name: 'institute_id', type: 'combobox', labelKey: 'institute', placeholderKey: 'selectInstitutePlaceholder',
    },
    { name: 'start_date', type: 'date', labelKey: 'startDate' },
    { name: 'end_date', type: 'date', labelKey: 'endDate' },
    {
      name: 'budget', type: 'currency', labelKey: 'budget',
      rules: [{ type: 'min', value: 0, messageKey: 'min', messageParams: { min: 0 } }],
    },
    {
      name: 'trl', type: 'slider', labelKey: 'trl',
      min: 1, max: 9, step: 1, formatValue: (v: number) => `TRL ${v}`, colorVariant: 'primary',
    },
    {
      name: 'research_area', type: 'select', labelKey: 'area',
      options: [
        { value: 'industry_4_0', labelKey: 'areas.industry_4_0' },
        { value: 'sustainability', labelKey: 'areas.sustainability' },
        { value: 'health', labelKey: 'areas.health' },
        { value: 'agribusiness', labelKey: 'areas.agribusiness' },
      ],
    },
    {
      name: 'keywords', type: 'tags', labelKey: 'keywords', placeholderKey: 'keywordsPlaceholder',
      colSpan: 2, maxTags: 15, tagVariant: 'primary',
    },
    {
      name: 'lessons_learned', type: 'textarea', labelKey: 'lessonsLearned', placeholderKey: 'lessonsLearnedPlaceholder',
      rows: 8, showCount: true, colSpan: 1,
      rules: [{ type: 'maxLength', value: 10000, messageKey: 'maxLength', messageParams: { max: 10000 } }],
    },
  ],

  filters: [
    { key: 'search', labelKey: 'searchPlaceholder', type: 'text', placeholderKey: 'searchPlaceholder' },
    {
      key: 'status', labelKey: 'statusLabel', type: 'select',
      options: [
        { value: '', labelKey: 'filters.allStatus' },
        { value: 'planning', labelKey: 'status.planning' },
        { value: 'active', labelKey: 'status.active' },
        { value: 'completed', labelKey: 'status.completed' },
        { value: 'suspended', labelKey: 'status.suspended' },
      ],
    },
    {
      key: 'researchArea', labelKey: 'area', type: 'select',
      options: [
        { value: '', labelKey: 'filters.allAreas' },
        { value: 'industry_4_0', labelKey: 'areas.industry_4_0' },
        { value: 'sustainability', labelKey: 'areas.sustainability' },
        { value: 'health', labelKey: 'areas.health' },
        { value: 'agribusiness', labelKey: 'areas.agribusiness' },
      ],
    },
  ],
});

export default portfolioProjectDefinition;
