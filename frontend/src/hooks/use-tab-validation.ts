/**
 * useTabValidation — Cross-Tab Validation Error Mapping Hook
 * Maps react-hook-form field errors to tab definitions, enabling
 * error badges on step indicators and auto-navigation to errored tabs.
 *
 * Works with both form-registry TabDefinition[] and manual field→tab maps.
 *
 * Implements RF-01 through RF-09: Cross-tab validation awareness
 */
'use client';

import { useMemo } from 'react';
import type { FieldErrors } from 'react-hook-form';
import type { TabDefinition } from '@/lib/form-registry/types';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TabValidationState {
  /** Number of fields with errors in this tab */
  errorCount: number;
  /** Names of fields with errors in this tab */
  errorFields: string[];
  /** Whether all required fields in this tab have valid values */
  isComplete: boolean;
}

export interface UseTabValidationResult {
  /** Validation state per tab key */
  tabStates: Record<string, TabValidationState>;
  /** Index of the first tab that has errors (null if no errors) */
  firstTabWithError: number | null;
  /** Total error count across all tabs */
  totalErrors: number;
  /** Tab keys that have errors, in order */
  tabsWithErrors: string[];
}

// ─── Hook ────────────────────────────────────────────────────────────────────

/**
 * Map form errors to tabs using form-registry TabDefinition[].
 *
 * @param errors - react-hook-form FieldErrors
 * @param tabs - TabDefinition[] from form registry (or manual equivalent)
 * @param requiredFields - Set of field names that are required (for isComplete)
 * @param formValues - Current form values (for isComplete check)
 */
export function useTabValidation(
  errors: FieldErrors,
  tabs: TabDefinition[] | undefined,
  requiredFields?: Set<string>,
  formValues?: Record<string, any>,
): UseTabValidationResult {
  return useMemo(() => {
    if (!tabs || tabs.length === 0) {
      return {
        tabStates: {},
        firstTabWithError: null,
        totalErrors: 0,
        tabsWithErrors: [],
      };
    }

    const errorKeys = new Set(Object.keys(errors));
    const tabStates: Record<string, TabValidationState> = {};
    let firstTabWithError: number | null = null;
    let totalErrors = 0;
    const tabsWithErrors: string[] = [];

    tabs.forEach((tab, index) => {
      const errorFields = tab.fields.filter((field) => errorKeys.has(field));
      const errorCount = errorFields.length;
      totalErrors += errorCount;

      // Check completion: all required fields in this tab must have non-empty values
      let isComplete = true;
      if (requiredFields && formValues) {
        const tabRequiredFields = tab.fields.filter((f) => requiredFields.has(f));
        isComplete = tabRequiredFields.length > 0
          ? tabRequiredFields.every((f) => {
              const val = formValues[f];
              if (val === undefined || val === null || val === '') return false;
              if (Array.isArray(val) && val.length === 0) return false;
              return true;
            })
          : true; // No required fields in this tab → considered complete
      }

      // If there are errors, the tab is not complete
      if (errorCount > 0) {
        isComplete = false;
        if (firstTabWithError === null) {
          firstTabWithError = index;
        }
        tabsWithErrors.push(tab.key);
      }

      tabStates[tab.key] = {
        errorCount,
        errorFields,
        isComplete,
      };
    });

    return {
      tabStates,
      firstTabWithError,
      totalErrors,
      tabsWithErrors,
    };
  }, [errors, tabs, requiredFields, formValues]);
}

// ─── Helper: Extract required fields from definition ─────────────────────────

/**
 * Build a Set of required field names from an entity definition's fields.
 * Useful for passing to useTabValidation.
 */
export function getRequiredFieldNames(
  fields: Array<{ name: string; rules?: Array<{ type: string }> }>,
): Set<string> {
  const required = new Set<string>();
  for (const field of fields) {
    if (field.rules?.some((r) => r.type === 'required')) {
      required.add(field.name);
    }
  }
  return required;
}

export default useTabValidation;
