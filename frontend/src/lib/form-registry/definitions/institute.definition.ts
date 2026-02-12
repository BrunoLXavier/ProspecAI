/**
 * Institute Entity Form Definition — RF-03
 * Single source of truth for institute form fields, validation,
 * tabs, filters, and statistics mapping.
 *
 * i18n keys reference the `institutes` namespace in locale files.
 * Field names match backend snake_case (API interceptors handle conversion).
 */
import { registerEntity, EntityFormDefinition } from '../types';

export interface InstituteFormData {
  nome: string;
  nome_fantasia: string;
  isi_sigla: string;
  cnpj: string;
  descricao: string;
  status: string;
  status_operacional: string;
  endereco_rua: string;
  endereco_numero: string;
  endereco_complemento: string;
  endereco_bairro: string;
  endereco_cep: string;
  endereco_cidade: string;
  endereco_uf: string;
  area_predial_m2: number;
  phone: string;
  website: string;
  logo_url: string;
  maturidade_gestao: string;
  maturidade_base_tecnologica: string;
  maturidade_produtos_servicos: string;
  maturidade_cooperacao: string;
  credenciamento_cati: boolean;
  credenciamento_ed: boolean;
}

export const instituteDefinition: EntityFormDefinition<InstituteFormData> = registerEntity<InstituteFormData>({
  entityKey: 'institutes',
  i18nNamespace: 'institutes',
  resource: 'institutes',
  instituteScoped: false,
  apiEndpoint: '/api/v1/institutes',
  statisticsModule: 'institutes',
  gridCols: 2,

  defaultValues: {
    nome: '',
    nome_fantasia: '',
    isi_sigla: '',
    cnpj: '',
    descricao: '',
    status: 'active',
    status_operacional: 'operational',
    endereco_rua: '',
    endereco_numero: '',
    endereco_complemento: '',
    endereco_bairro: '',
    endereco_cep: '',
    endereco_cidade: '',
    endereco_uf: '',
    area_predial_m2: 0,
    phone: '',
    website: '',
    logo_url: '',
    maturidade_gestao: '',
    maturidade_base_tecnologica: '',
    maturidade_produtos_servicos: '',
    maturidade_cooperacao: '',
    credenciamento_cati: false,
    credenciamento_ed: false,
  },

  tabs: [
    {
      key: 'basic',
      nameKey: 'tabs.basic',
      fields: ['nome', 'nome_fantasia', 'isi_sigla', 'cnpj', 'status', 'status_operacional', 'descricao'],
      gridCols: 2,
    },
    {
      key: 'address',
      nameKey: 'tabs.address',
      fields: ['endereco_rua', 'endereco_numero', 'endereco_complemento', 'endereco_bairro', 'endereco_cep', 'endereco_cidade', 'endereco_uf', 'area_predial_m2'],
      gridCols: 2,
    },
    {
      key: 'contact',
      nameKey: 'tabs.contact',
      fields: ['phone', 'website', 'logo_url'],
      gridCols: 2,
    },
    {
      key: 'maturity',
      nameKey: 'tabs.maturity',
      fields: ['maturidade_gestao', 'maturidade_base_tecnologica', 'maturidade_produtos_servicos', 'maturidade_cooperacao', 'credenciamento_cati', 'credenciamento_ed'],
      gridCols: 2,
    },
  ],

  fields: [
    {
      name: 'nome',
      type: 'text',
      labelKey: 'fields.nome',
      colSpan: 2,
      rules: [
        { type: 'required', messageKey: 'required' },
        { type: 'maxLength', value: 500, messageKey: 'maxLength', messageParams: { max: 500 } },
      ],
    },
    {
      name: 'nome_fantasia',
      type: 'text',
      labelKey: 'fields.nome_fantasia',
    },
    {
      name: 'isi_sigla',
      type: 'text',
      labelKey: 'fields.isi_sigla',
      rules: [{ type: 'required', messageKey: 'required' }],
    },
    {
      name: 'cnpj',
      type: 'text',
      labelKey: 'cnpj',
      rules: [{ type: 'cnpj', messageKey: 'cnpj' }],
    },
    {
      name: 'status',
      type: 'select',
      labelKey: 'status',
      options: [
        { value: 'active', labelKey: 'statuses.active' },
        { value: 'inactive', labelKey: 'statuses.inactive' },
        { value: 'prospect', labelKey: 'statuses.prospect' },
      ],
    },
    {
      name: 'status_operacional',
      type: 'select',
      labelKey: 'fields.status_operacional',
      options: [
        { value: 'operational', labelKey: 'statuses.active' },
        { value: 'maintenance', labelKey: 'statuses.inactive' },
      ],
    },
    {
      name: 'descricao',
      type: 'textarea',
      labelKey: 'fields.descricao',
      rows: 4,
      showCount: true,
      colSpan: 2,
      rules: [{ type: 'maxLength', value: 5000, messageKey: 'maxLength', messageParams: { max: 5000 } }],
    },
    {
      name: 'endereco_rua',
      type: 'text',
      labelKey: 'fields.endereco_rua',
      colSpan: 2,
    },
    {
      name: 'endereco_numero',
      type: 'text',
      labelKey: 'fields.endereco_numero',
    },
    {
      name: 'endereco_complemento',
      type: 'text',
      labelKey: 'fields.endereco_complemento',
    },
    {
      name: 'endereco_bairro',
      type: 'text',
      labelKey: 'fields.endereco_bairro',
    },
    {
      name: 'endereco_cep',
      type: 'text',
      labelKey: 'fields.endereco_cep',
    },
    {
      name: 'endereco_cidade',
      type: 'text',
      labelKey: 'fields.endereco_cidade',
    },
    {
      name: 'endereco_uf',
      type: 'text',
      labelKey: 'fields.endereco_uf',
    },
    {
      name: 'area_predial_m2',
      type: 'number',
      labelKey: 'fields.area_predial_m2',
      min: 0,
      rules: [{ type: 'min', value: 0, messageKey: 'min', messageParams: { min: 0 } }],
    },
    {
      name: 'phone',
      type: 'tel',
      labelKey: 'phone',
    },
    {
      name: 'website',
      type: 'url',
      labelKey: 'website',
      rules: [{ type: 'url', messageKey: 'url' }],
    },
    {
      name: 'logo_url',
      type: 'url',
      labelKey: 'fields.logo_url',
      rules: [{ type: 'url', messageKey: 'url' }],
    },
    {
      name: 'maturidade_gestao',
      type: 'select',
      labelKey: 'fields.maturidade_gestao',
      helperTextKey: 'maturity_hint',
      options: [
        { value: 'basic', labelKey: 'statuses.active' },
        { value: 'intermediate', labelKey: 'statuses.inactive' },
        { value: 'advanced', labelKey: 'statuses.prospect' },
      ],
    },
    {
      name: 'maturidade_base_tecnologica',
      type: 'select',
      labelKey: 'fields.maturidade_base_tecnologica',
      options: [
        { value: 'basic', labelKey: 'statuses.active' },
        { value: 'intermediate', labelKey: 'statuses.inactive' },
        { value: 'advanced', labelKey: 'statuses.prospect' },
      ],
    },
    {
      name: 'maturidade_produtos_servicos',
      type: 'select',
      labelKey: 'fields.maturidade_produtos_servicos',
      options: [
        { value: 'basic', labelKey: 'statuses.active' },
        { value: 'intermediate', labelKey: 'statuses.inactive' },
        { value: 'advanced', labelKey: 'statuses.prospect' },
      ],
    },
    {
      name: 'maturidade_cooperacao',
      type: 'select',
      labelKey: 'fields.maturidade_cooperacao',
      options: [
        { value: 'basic', labelKey: 'statuses.active' },
        { value: 'intermediate', labelKey: 'statuses.inactive' },
        { value: 'advanced', labelKey: 'statuses.prospect' },
      ],
    },
    {
      name: 'credenciamento_cati',
      type: 'switch',
      labelKey: 'fields.credenciamento_cati',
      helperTextKey: 'accreditation_hint',
    },
    {
      name: 'credenciamento_ed',
      type: 'switch',
      labelKey: 'fields.credenciamento_ed',
      helperTextKey: 'accreditation_hint',
    },
  ],

  filters: [
    { key: 'search', labelKey: 'filters.search', type: 'text', placeholderKey: 'filters.searchPlaceholder' },
    { key: 'city', labelKey: 'filters.city', type: 'text', placeholderKey: 'filters.cityPlaceholder' },
  ],
});
