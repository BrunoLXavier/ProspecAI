/**
 * FormRenderer — Automatic Form Field Renderer
 * Reads an EntityFormDefinition and renders the appropriate shared/forms
 * components. This is the SINGLE rendering engine for all entity forms.
 *
 * Manual JSX form building is prohibited — all modals and forms MUST
 * use FormRenderer to render fields from the Form Registry.
 *
 * Implements RF-01 through RF-09: Standardized form rendering
 */
'use client';

import React, { Fragment, useMemo } from 'react';
import {
  Control,
  Controller,
  UseFormRegister,
  FieldErrors,
  UseFormWatch,
} from 'react-hook-form';
import { useTranslations } from 'next-intl';
import type { FieldDefinition, EntityFormDefinition, TabDefinition, FieldVisibility } from './types';

// Shared form components
import FormInput from '@/components/features/shared/forms/FormInput';
import FormSelect from '@/components/features/shared/forms/FormSelect';
import FormTextarea from '@/components/features/shared/forms/FormTextarea';
import FormDatePicker from '@/components/features/shared/forms/FormDatePicker';
import FormCurrencyInput from '@/components/features/shared/forms/FormCurrencyInput';
import FormTagInput from '@/components/features/shared/forms/FormTagInput';
import FormSlider from '@/components/features/shared/forms/FormSlider';
import FormCheckbox from '@/components/features/shared/forms/FormCheckbox';
import FormRadio from '@/components/features/shared/forms/FormRadio';
import FormSwitch from '@/components/features/shared/forms/FormSwitch';
import FormComboBox from '@/components/features/shared/forms/FormComboBox';

// ─── Types ───────────────────────────────────────────────────────────────────

export type FormMode = 'create' | 'edit' | 'view';

export interface FormRendererProps {
  /** Entity form definition from the registry */
  definition: EntityFormDefinition;
  /** Current form mode */
  mode: FormMode;
  /** react-hook-form control object */
  control: Control<any>;
  /** react-hook-form register function */
  register: UseFormRegister<any>;
  /** react-hook-form errors object */
  errors: FieldErrors;
  /** react-hook-form watch function (for conditional visibility) */
  watch: UseFormWatch<any>;
  /** Only render fields for a specific tab (by tab key) */
  tabKey?: string;
  /** Override grid columns (default from definition or 2) */
  gridCols?: 1 | 2 | 3 | 4;
  /** Additional className for the grid container */
  className?: string;
  /** Slot: content rendered before the form fields */
  beforeFields?: React.ReactNode;
  /** Slot: content rendered after the form fields */
  afterFields?: React.ReactNode;
}

// ─── Grid Column Classes ─────────────────────────────────────────────────────

const gridColsClass: Record<number, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
};

const colSpanClass: Record<number, string> = {
  1: 'col-span-1',
  2: 'col-span-1 sm:col-span-2',
  3: 'col-span-1 sm:col-span-2 lg:col-span-3',
  4: 'col-span-1 sm:col-span-2 lg:col-span-4',
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function FormRenderer({
  definition,
  mode,
  control,
  register,
  errors,
  watch,
  tabKey,
  gridCols,
  className = '',
  beforeFields,
  afterFields,
}: FormRendererProps) {
  const t = useTranslations(definition.i18nNamespace);
  const tCommon = useTranslations('common');
  const tValidation = useTranslations('validation');

  const formValues = watch();

  // Get visible fields for current mode and optional tab
  const visibleFields = useMemo(() => {
    let fields = definition.fields.filter((field) => {
      // Check mode visibility
      if (field.visibleIn && field.visibleIn.length > 0) {
        const visible = field.visibleIn.includes(mode as FieldVisibility) || field.visibleIn.includes('all');
        if (!visible) return false;
      }
      // Check conditional visibility
      if (field.showWhen && !field.showWhen(formValues)) return false;
      // Check tab membership
      if (tabKey && definition.tabs) {
        const tab = definition.tabs.find((t: TabDefinition) => t.key === tabKey);
        if (tab && !tab.fields.includes(field.name)) return false;
      }
      return true;
    });

    return fields;
  }, [definition, mode, tabKey, formValues]);

  // Determine grid columns
  const effectiveGridCols = gridCols
    || (tabKey && definition.tabs
      ? definition.tabs.find((t: TabDefinition) => t.key === tabKey)?.gridCols
      : undefined)
    || definition.gridCols
    || 1;

  const isViewMode = mode === 'view';

  // Resolve an i18n key: try namespace first, then common
  const resolveLabel = (key: string): string => {
    try {
      return t(key);
    } catch {
      try {
        return tCommon(key);
      } catch {
        return key;
      }
    }
  };

  // Resolve option labels
  const resolveOptions = (field: FieldDefinition) => {
    if (!field.options) return [];
    return field.options.map((opt) => ({
      value: opt.value,
      label: resolveLabel(opt.labelKey),
    }));
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {beforeFields}

      <div className={`grid ${gridColsClass[effectiveGridCols]} gap-5`}>
        {visibleFields.map((field) => {
          const isReadOnly =
            isViewMode
              ? (field.readOnlyInView !== false)
              : !!(mode === 'edit' && field.readOnlyInEdit);

          const fieldError = errors[field.name];
          const label = resolveLabel(field.labelKey);
          const placeholder = field.placeholderKey ? resolveLabel(field.placeholderKey) : undefined;
          const helperText = field.helperTextKey ? resolveLabel(field.helperTextKey) : undefined;
          const spanClass = field.colSpan ? colSpanClass[field.colSpan] : 'col-span-1';

          return (
            <div key={field.name} className={spanClass}>
              {renderField(field, {
                control,
                register,
                error: fieldError as any,
                label,
                placeholder,
                helperText,
                isReadOnly,
                isViewMode,
                options: resolveOptions(field),
              })}
            </div>
          );
        })}
      </div>

      {afterFields}
    </div>
  );
}

// ─── Field Renderer ──────────────────────────────────────────────────────────

interface FieldRenderContext {
  control: Control<any>;
  register: UseFormRegister<any>;
  error: any;
  label: string;
  placeholder?: string;
  helperText?: string;
  isReadOnly: boolean;
  isViewMode: boolean;
  options: Array<{ value: string | number; label: string }>;
}

function renderField(field: FieldDefinition, ctx: FieldRenderContext): React.ReactNode {
  const { control, register, error, label, placeholder, helperText, isReadOnly, isViewMode, options } = ctx;
  const isRequired = field.rules?.some((r) => r.type === 'required') ?? false;

  switch (field.type) {
    case 'text':
    case 'email':
    case 'password':
    case 'url':
    case 'tel':
    case 'number':
      return (
        <FormInput
          label={label}
          type={field.type === 'number' ? 'number' : field.type}
          placeholder={placeholder}
          helperText={helperText}
          error={error}
          disabled={isReadOnly}
          required={isRequired}
          {...register(field.name, { valueAsNumber: field.type === 'number' })}
        />
      );

    case 'textarea':
      return (
        <FormTextarea
          label={label}
          placeholder={placeholder}
          helperText={helperText}
          error={error}
          disabled={isReadOnly}
          required={isRequired}
          rows={field.rows}
          showCount={field.showCount}
          maxLength={field.rules?.find((r) => r.type === 'maxLength')?.value}
          {...register(field.name)}
        />
      );

    case 'select':
      return (
        <FormSelect
          label={label}
          options={options}
          placeholder={placeholder}
          helperText={helperText}
          error={error}
          disabled={isReadOnly}
          required={isRequired}
          {...register(field.name)}
        />
      );

    case 'combobox':
      return (
        <Controller
          name={field.name}
          control={control}
          render={({ field: formField, fieldState }) => (
            <FormComboBox
              label={label}
              options={options.map((o) => ({
                value: String(o.value),
                label: o.label,
              }))}
              value={formField.value}
              onChange={formField.onChange}
              error={fieldState.error}
              helperText={helperText}
              searchable={field.searchable ?? true}
              clearable={field.clearable ?? true}
              disabled={isReadOnly}
            />
          )}
        />
      );

    case 'date':
    case 'datetime':
      return (
        <FormDatePicker
          label={label}
          helperText={helperText}
          error={error}
          disabled={isReadOnly}
          required={isRequired}
          includeTime={field.type === 'datetime'}
          {...register(field.name)}
        />
      );

    case 'currency':
      return (
        <Controller
          name={field.name}
          control={control}
          render={({ field: formField, fieldState }) => (
            <FormCurrencyInput
              label={label}
              value={formField.value}
              onChange={formField.onChange}
              error={fieldState.error}
              helperText={helperText}
              disabled={isReadOnly}
              required={isRequired}
            />
          )}
        />
      );

    case 'tags':
      return (
        <Controller
          name={field.name}
          control={control}
          render={({ field: formField, fieldState }) => (
            <FormTagInput
              label={label}
              value={formField.value ?? []}
              onChange={formField.onChange}
              error={fieldState.error}
              helperText={helperText}
              disabled={isReadOnly}
              required={isRequired}
              maxTags={field.maxTags}
              tagVariant={field.tagVariant}
              placeholder={placeholder}
            />
          )}
        />
      );

    case 'slider':
      return (
        <Controller
          name={field.name}
          control={control}
          render={({ field: formField, fieldState }) => (
            <FormSlider
              label={label}
              value={formField.value}
              onChange={formField.onChange}
              error={fieldState.error}
              helperText={helperText}
              disabled={isReadOnly}
              required={isRequired}
              min={field.min}
              max={field.max}
              step={field.step}
              formatValue={field.formatValue}
              colorVariant={field.colorVariant}
            />
          )}
        />
      );

    case 'checkbox':
      return (
        <FormCheckbox
          label={label}
          error={error}
          disabled={isReadOnly}
          checkboxSize={field.inputSize}
          {...register(field.name)}
        />
      );

    case 'radio':
      return (
        <FormRadio
          label={label}
          options={options.map((o) => ({
            value: String(o.value),
            label: o.label,
          }))}
          error={error}
          helperText={helperText}
          direction={field.direction}
          radioSize={field.inputSize}
          required={isRequired}
          {...register(field.name)}
        />
      );

    case 'switch':
      return (
        <Controller
          name={field.name}
          control={control}
          render={({ field: formField, fieldState }) => (
            <FormSwitch
              label={label}
              checked={formField.value ?? false}
              onChange={formField.onChange}
              error={fieldState.error}
              disabled={isReadOnly}
              switchSize={field.inputSize}
              colorVariant={field.switchColor}
            />
          )}
        />
      );

    case 'hidden':
      return (
        <input type="hidden" {...register(field.name)} />
      );

    default:
      return null;
  }
}

export { FormRenderer };
