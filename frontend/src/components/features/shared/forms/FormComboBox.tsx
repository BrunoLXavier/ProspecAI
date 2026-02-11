/**
 * FormComboBox Component
 * Wrapper around shared ComboBox for react-hook-form Controller integration
 * Bridges the ComboBox UI primitive with form field patterns (label, error, helperText)
 * Implements RF-04, RF-05: Searchable dropdowns with consistent form field API
 */
'use client';

import { FieldError } from 'react-hook-form';
import ComboBox, { ComboBoxOption, ComboBoxProps } from '@/components/features/shared/ui/ComboBox';

export interface FormComboBoxProps extends Omit<ComboBoxProps, 'error' | 'label'> {
  /** Field label */
  label: string;
  /** React Hook Form error */
  error?: FieldError | { message?: string; type?: string };
  /** Helper text shown below the field */
  helperText?: string;
}

/**
 * Usage with react-hook-form Controller:
 *
 * ```tsx
 * <Controller
 *   name="category"
 *   control={control}
 *   render={({ field, fieldState }) => (
 *     <FormComboBox
 *       label={t('category')}
 *       options={categoryOptions}
 *       value={field.value}
 *       onChange={field.onChange}
 *       error={fieldState.error}
 *       searchable
 *       clearable
 *     />
 *   )}
 * />
 * ```
 */
export default function FormComboBox({
  label,
  error,
  helperText,
  ...comboBoxProps
}: FormComboBoxProps) {
  return (
    <ComboBox
      label={label}
      error={error?.message}
      helpText={helperText}
      variant={error ? 'error' : 'default'}
      {...comboBoxProps}
    />
  );
}

export type { ComboBoxOption };
