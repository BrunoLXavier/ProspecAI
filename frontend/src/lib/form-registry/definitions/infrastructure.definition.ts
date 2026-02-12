/**
 * Infrastructure Entity Form Definition
 * i18n keys reference the `infrastructure` namespace in locale files.
 * Field names match backend snake_case schema.
 */
import { registerEntity, EntityFormDefinition } from '../types';

export interface InfrastructureFormData {
  name: string;
  tipo: string;
  status: string;
  descricao: string;
  endereco: string;
  email_responsavel: string;
  telefone_responsavel: string;
  area_m2: number;
  capacidade_atendimentos: number;
  maturidade_gestao: number;
  maturidade_base_tecnologica: number;
  maturidade_produtos_servicos: number;
  maturidade_cooperacao: number;
  maturidade_regulatoria: number;
  maturidade_laboratorial: number;
}

export const infrastructureDefinition: EntityFormDefinition<InfrastructureFormData> = registerEntity<InfrastructureFormData>({
  entityKey: 'infrastructure',
  i18nNamespace: 'infrastructure',
  resource: 'infrastructure',
  instituteScoped: true,
  apiEndpoint: '/api/v1/infrastructures',
  statisticsModule: 'infrastructure',
  gridCols: 2,

  defaultValues: {
    name: '',
    tipo: '',
    status: 'available',
    descricao: '',
    endereco: '',
    email_responsavel: '',
    telefone_responsavel: '',
    area_m2: 0,
    capacidade_atendimentos: 0,
    maturidade_gestao: 0,
    maturidade_base_tecnologica: 0,
    maturidade_produtos_servicos: 0,
    maturidade_cooperacao: 0,
    maturidade_regulatoria: 0,
    maturidade_laboratorial: 0,
  },

  tabs: [
    { key: 'basic', nameKey: 'tabs.basic', fields: ['name', 'tipo', 'status', 'descricao', 'endereco'], gridCols: 2 },
    { key: 'contact', nameKey: 'tabs.contact', fields: ['email_responsavel', 'telefone_responsavel', 'area_m2', 'capacidade_atendimentos'], gridCols: 2 },
    { key: 'maturity', nameKey: 'tabs.maturity', fields: ['maturidade_gestao', 'maturidade_base_tecnologica', 'maturidade_produtos_servicos', 'maturidade_cooperacao', 'maturidade_regulatoria', 'maturidade_laboratorial'], gridCols: 2 },
  ],

  fields: [
    {
      name: 'name', type: 'text', labelKey: 'name', colSpan: 2,
      rules: [{ type: 'required', messageKey: 'required' }, { type: 'maxLength', value: 300, messageKey: 'maxLength', messageParams: { max: 300 } }],
    },
    {
      name: 'tipo', type: 'select', labelKey: 'type',
      rules: [{ type: 'required', messageKey: 'required' }],
      options: [
        { value: 'Laboratório', labelKey: 'types.laboratorio' },
        { value: 'Oficina', labelKey: 'types.oficina' },
        { value: 'Fábrica', labelKey: 'types.fabrica' },
        { value: 'Escritório', labelKey: 'types.escritorio' },
        { value: 'Data Center', labelKey: 'types.dataCenter' },
        { value: 'Outro', labelKey: 'types.outro' },
      ],
    },
    {
      name: 'status', type: 'select', labelKey: 'status',
      options: [
        { value: 'available', labelKey: 'available' },
        { value: 'booked', labelKey: 'booked' },
        { value: 'maintenance', labelKey: 'maintenance' },
      ],
    },
    {
      name: 'descricao', type: 'textarea', labelKey: 'description', rows: 4, colSpan: 2,
      rules: [{ type: 'maxLength', value: 5000, messageKey: 'maxLength', messageParams: { max: 5000 } }],
    },
    { name: 'endereco', type: 'text', labelKey: 'location', colSpan: 2 },
    {
      name: 'email_responsavel', type: 'email', labelKey: 'email',
      rules: [{ type: 'email', messageKey: 'email' }],
    },
    { name: 'telefone_responsavel', type: 'tel', labelKey: 'phone' },
    { name: 'area_m2', type: 'number', labelKey: 'areaM2' },
    { name: 'capacidade_atendimentos', type: 'number', labelKey: 'units' },
    { name: 'maturidade_gestao', type: 'slider', labelKey: 'maturityManagement', min: 0, max: 5, step: 1, colorVariant: 'primary' },
    { name: 'maturidade_base_tecnologica', type: 'slider', labelKey: 'maturityTechBase', min: 0, max: 5, step: 1, colorVariant: 'info' },
    { name: 'maturidade_produtos_servicos', type: 'slider', labelKey: 'maturityProducts', min: 0, max: 5, step: 1, colorVariant: 'success' },
    { name: 'maturidade_cooperacao', type: 'slider', labelKey: 'maturityCooperation', min: 0, max: 5, step: 1, colorVariant: 'warning' },
    { name: 'maturidade_regulatoria', type: 'slider', labelKey: 'maturityRegulatory', min: 0, max: 5, step: 1, colorVariant: 'danger' },
    { name: 'maturidade_laboratorial', type: 'slider', labelKey: 'maturityLab', min: 0, max: 5, step: 1, colorVariant: 'primary' },
  ],

  filters: [
    { key: 'search', labelKey: 'filters.search', type: 'text', placeholderKey: 'filters.searchPlaceholder' },
  ],
});

export default infrastructureDefinition;
