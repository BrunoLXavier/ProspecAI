/**
 * User Entity Form Definition — RF-09
 * Single source of truth for user management form fields, validation,
 * tabs, filters, and statistics mapping.
 *
 * i18n keys reference the `users` namespace in locale files.
 * Field names match backend snake_case (API interceptors handle conversion).
 */
import { registerEntity, EntityFormDefinition } from '../types';

export interface UserFormData {
  name: string;
  email: string;
  role: string;
  password: string;
  confirm_password: string;
  is_active: boolean;
}

export const userDefinition: EntityFormDefinition<UserFormData> = registerEntity<UserFormData>({
  entityKey: 'users',
  i18nNamespace: 'users',
  resource: 'users',
  instituteScoped: false,
  apiEndpoint: '/api/v1/admin/users',
  statisticsModule: 'users',
  gridCols: 2,

  defaultValues: {
    name: '',
    email: '',
    role: 'viewer',
    password: '',
    confirm_password: '',
    is_active: true,
  },

  tabs: [
    {
      key: 'basic',
      nameKey: 'form.basicInfo',
      fields: ['name', 'email', 'role', 'is_active'],
      gridCols: 2,
    },
    {
      key: 'credentials',
      nameKey: 'form.credentials',
      fields: ['password', 'confirm_password'],
      gridCols: 2,
    },
  ],

  fields: [
    {
      name: 'name',
      type: 'text',
      labelKey: 'name',
      colSpan: 2,
      rules: [
        { type: 'required', messageKey: 'required' },
        { type: 'maxLength', value: 200, messageKey: 'maxLength', messageParams: { max: 200 } },
      ],
    },
    {
      name: 'email',
      type: 'email',
      labelKey: 'email',
      colSpan: 2,
      rules: [
        { type: 'required', messageKey: 'required' },
        { type: 'email', messageKey: 'email' },
      ],
    },
    {
      name: 'role',
      type: 'select',
      labelKey: 'role',
      rules: [{ type: 'required', messageKey: 'required' }],
      options: [
        { value: 'admin', labelKey: 'roleTypes.admin', color: 'purple' },
        { value: 'manager', labelKey: 'roleTypes.manager', color: 'blue' },
        { value: 'analyst', labelKey: 'roleTypes.analyst', color: 'green' },
        { value: 'editor', labelKey: 'roleTypes.editor', color: 'orange' },
        { value: 'viewer', labelKey: 'roleTypes.viewer', color: 'gray' },
      ],
    },
    {
      name: 'is_active',
      type: 'switch',
      labelKey: 'status',
    },
    {
      name: 'password',
      type: 'password',
      labelKey: 'password',
      rules: [
        { type: 'minLength', value: 8, messageKey: 'minLength', messageParams: { min: 8 } },
      ],
    },
    {
      name: 'confirm_password',
      type: 'password',
      labelKey: 'confirmPassword',
      rules: [
        { type: 'custom', messageKey: 'passwordMismatch', validate: (value, formValues) => value === formValues.password },
      ],
    },
  ],

  filters: [
    { key: 'search', labelKey: 'searchPlaceholder', type: 'text', placeholderKey: 'searchPlaceholder' },
    {
      key: 'role', labelKey: 'role', type: 'select',
      options: [
        { value: '', labelKey: 'filters.allRoles' },
        { value: 'admin', labelKey: 'roleTypes.admin' },
        { value: 'manager', labelKey: 'roleTypes.manager' },
        { value: 'analyst', labelKey: 'roleTypes.analyst' },
        { value: 'editor', labelKey: 'roleTypes.editor' },
        { value: 'viewer', labelKey: 'roleTypes.viewer' },
      ],
    },
    {
      key: 'status', labelKey: 'status', type: 'select',
      options: [
        { value: '', labelKey: 'filters.allStatus' },
        { value: 'active', labelKey: 'active' },
        { value: 'inactive', labelKey: 'inactive' },
      ],
    },
  ],
});
