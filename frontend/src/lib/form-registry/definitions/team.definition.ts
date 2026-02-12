/**
 * Team Member Entity Form Definition
 * i18n keys reference the `teams` namespace in locale files.
 * Field names match backend snake_case schema.
 */
import { registerEntity, EntityFormDefinition } from '../types';

export interface TeamFormData {
  nome: string;
  cargo: string;
  departamento: string;
  especializacao: string;
  vinculo_principal: string;
  experiencia_anos: number;
  formacao: string;
  email_profissional: string;
  telefone_profissional: string;
  lattes_url: string;
  linkedin_url: string;
  orcid: string;
  researchgate: string;
}

export const teamDefinition: EntityFormDefinition<TeamFormData> = registerEntity<TeamFormData>({
  entityKey: 'teams',
  i18nNamespace: 'teams',
  resource: 'teams',
  instituteScoped: true,
  apiEndpoint: '/api/v1/teams',
  statisticsModule: 'teams',
  gridCols: 2,

  defaultValues: {
    nome: '',
    cargo: '',
    departamento: '',
    especializacao: '',
    vinculo_principal: 'CLT',
    experiencia_anos: 0,
    formacao: '',
    email_profissional: '',
    telefone_profissional: '',
    lattes_url: '',
    linkedin_url: '',
    orcid: '',
    researchgate: '',
  },

  tabs: [
    { key: 'personal', nameKey: 'tabs.basic', fields: ['nome', 'cargo', 'departamento', 'especializacao', 'vinculo_principal', 'experiencia_anos', 'formacao'], gridCols: 2 },
    { key: 'contact', nameKey: 'tabs.contact', fields: ['email_profissional', 'telefone_profissional'], gridCols: 2 },
    { key: 'academic', nameKey: 'tabs.academic', fields: ['lattes_url', 'linkedin_url', 'orcid', 'researchgate'], gridCols: 2 },
  ],

  fields: [
    {
      name: 'nome', type: 'text', labelKey: 'name', colSpan: 2,
      rules: [{ type: 'required', messageKey: 'required' }, { type: 'maxLength', value: 200, messageKey: 'maxLength', messageParams: { max: 200 } }],
    },
    { name: 'cargo', type: 'text', labelKey: 'role' },
    { name: 'departamento', type: 'text', labelKey: 'department' },
    { name: 'especializacao', type: 'text', labelKey: 'specialization' },
    {
      name: 'vinculo_principal', type: 'select', labelKey: 'bond',
      rules: [{ type: 'required', messageKey: 'required' }],
      options: [
        { value: 'CLT', labelKey: 'bonds.clt' },
        { value: 'Bolsista', labelKey: 'bonds.bolsista' },
        { value: 'Consultor', labelKey: 'bonds.consultor' },
        { value: 'Estagiário', labelKey: 'bonds.estagiario' },
        { value: 'PJ', labelKey: 'bonds.pj' },
        { value: 'Outro', labelKey: 'bonds.outro' },
      ],
    },
    { name: 'experiencia_anos', type: 'number', labelKey: 'experience' },
    { name: 'formacao', type: 'text', labelKey: 'education' },
    {
      name: 'email_profissional', type: 'email', labelKey: 'professionalEmail',
      rules: [{ type: 'email', messageKey: 'email' }],
    },
    { name: 'telefone_profissional', type: 'tel', labelKey: 'professionalPhone' },
    { name: 'lattes_url', type: 'url', labelKey: 'fields.lattes_url', rules: [{ type: 'url', messageKey: 'url' }] },
    { name: 'linkedin_url', type: 'url', labelKey: 'fields.linkedin_url', rules: [{ type: 'url', messageKey: 'url' }] },
    { name: 'orcid', type: 'text', labelKey: 'fields.orcid' },
    { name: 'researchgate', type: 'text', labelKey: 'fields.researchgate' },
  ],

  filters: [
    { key: 'search', labelKey: 'filters.search', type: 'text', placeholderKey: 'filters.searchPlaceholder' },
  ],
});

export default teamDefinition;
