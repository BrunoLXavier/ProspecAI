/**
 * buildZodSchema — Dynamic Zod Schema Generator
 * Converts EntityFormDefinition validation rules into Zod schemas
 * with i18n-ized error messages via t().
 *
 * This is the SINGLE SOURCE OF TRUTH for form validation.
 * Manual Zod schema creation is prohibited — all schemas derive
 * from entity definitions in the Form Registry.
 *
 * Implements RF-01 through RF-09: i18n-ized validation
 */

import { z, ZodTypeAny, ZodObject, ZodRawShape } from 'zod';
import type { FieldDefinition, EntityFormDefinition, ValidationRule, FieldVisibility } from './types';

type TranslationFn = (key: string, params?: Record<string, string | number>) => string;

// ─── Rule → Zod Transformer ─────────────────────────────────────────────────

function applyRulesToField(
  baseSchema: ZodTypeAny,
  rules: ValidationRule[],
  t: TranslationFn
): ZodTypeAny {
  let schema = baseSchema;

  for (const rule of rules) {
    const msg = t(rule.messageKey, rule.messageParams);

    switch (rule.type) {
      case 'required':
        if (schema instanceof z.ZodString) {
          schema = (schema as z.ZodString).min(1, msg);
        }
        break;

      case 'minLength':
        if (schema instanceof z.ZodString && rule.value !== undefined) {
          schema = (schema as z.ZodString).min(rule.value, msg);
        }
        break;

      case 'maxLength':
        if (schema instanceof z.ZodString && rule.value !== undefined) {
          schema = (schema as z.ZodString).max(rule.value, msg);
        }
        break;

      case 'min':
        if (schema instanceof z.ZodNumber && rule.value !== undefined) {
          schema = (schema as z.ZodNumber).min(rule.value, msg);
        }
        break;

      case 'max':
        if (schema instanceof z.ZodNumber && rule.value !== undefined) {
          schema = (schema as z.ZodNumber).max(rule.value, msg);
        }
        break;

      case 'email':
        if (schema instanceof z.ZodString) {
          schema = (schema as z.ZodString).email(msg);
        }
        break;

      case 'url':
        if (schema instanceof z.ZodString) {
          schema = (schema as z.ZodString).url(msg);
        }
        break;

      case 'cnpj':
        if (schema instanceof z.ZodString) {
          schema = (schema as z.ZodString).regex(
            /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/,
            msg
          );
        }
        break;

      case 'pattern':
        if (schema instanceof z.ZodString && rule.pattern) {
          schema = (schema as z.ZodString).regex(new RegExp(rule.pattern), msg);
        }
        break;

      // 'custom' rules are handled at the refinement level
    }
  }

  return schema;
}

// ─── Field → Zod Base Type ──────────────────────────────────────────────────

function getBaseZodType(field: FieldDefinition): ZodTypeAny {
  switch (field.type) {
    case 'text':
    case 'email':
    case 'password':
    case 'url':
    case 'tel':
    case 'textarea':
    case 'date':
    case 'datetime':
    case 'hidden':
      return z.string();

    case 'number':
    case 'currency':
    case 'slider':
      return z.number();

    case 'select':
    case 'combobox':
    case 'radio':
      return z.string();

    case 'checkbox':
    case 'switch':
      return z.boolean();

    case 'tags':
      return z.array(z.string());

    default:
      return z.any();
  }
}

// ─── Main Builder ────────────────────────────────────────────────────────────

/**
 * Build a Zod schema from an EntityFormDefinition.
 * 
 * @param definition - Entity form definition from the registry
 * @param t - Translation function (from useTranslations or useI18n)
 * @param mode - Current form mode (affects which fields are included)
 * @returns Zod object schema with i18n error messages
 */
export function buildZodSchema<T = any>(
  definition: EntityFormDefinition<T>,
  t: TranslationFn,
  mode: 'create' | 'edit' | 'view' = 'create'
): ZodObject<ZodRawShape> {
  const shape: ZodRawShape = {};

  for (const field of definition.fields) {
    // Skip fields not visible in current mode
    if (field.visibleIn && field.visibleIn.length > 0) {
      const isVisible = field.visibleIn.includes(mode as FieldVisibility) || field.visibleIn.includes('all');
      if (!isVisible) continue;
    }

    // Skip hidden fields from validation
    if (field.type === 'hidden') {
      shape[field.name] = z.any().optional();
      continue;
    }

    let fieldSchema = getBaseZodType(field);

    // Apply validation rules
    if (field.rules && field.rules.length > 0) {
      fieldSchema = applyRulesToField(fieldSchema, field.rules, t);
    }

    // Check if field is required (has a 'required' rule)
    const isRequired = field.rules?.some((r) => r.type === 'required');
    if (!isRequired) {
      // Make optional: for strings allow empty, for others use .optional()
      if (fieldSchema instanceof z.ZodString) {
        fieldSchema = fieldSchema.optional().or(z.literal(''));
      } else if (fieldSchema instanceof z.ZodArray) {
        fieldSchema = fieldSchema.optional().default([]);
      } else {
        fieldSchema = fieldSchema.optional();
      }
    }

    shape[field.name] = fieldSchema;
  }

  let schema = z.object(shape);

  // Apply cross-field refinements
  if (definition.refinements) {
    for (const refinement of definition.refinements) {
      schema = schema.refine(
        refinement.validate,
        {
          message: t(refinement.messageKey),
          path: refinement.path,
        }
      ) as any;
    }
  }

  return schema;
}

/**
 * Get filtered fields for a specific mode
 */
export function getFieldsForMode(
  definition: EntityFormDefinition,
  mode: 'create' | 'edit' | 'view'
): FieldDefinition[] {
  return definition.fields.filter((field) => {
    if (!field.visibleIn || field.visibleIn.length === 0) return true;
    return field.visibleIn.includes(mode) || field.visibleIn.includes('all');
  });
}

/**
 * Get fields grouped by tab for a specific mode
 */
export function getFieldsByTab(
  definition: EntityFormDefinition,
  mode: 'create' | 'edit' | 'view'
): Map<string, FieldDefinition[]> {
  const visibleFields = getFieldsForMode(definition, mode);
  const fieldMap = new Map(visibleFields.map((f) => [f.name, f]));
  const grouped = new Map<string, FieldDefinition[]>();

  if (definition.tabs) {
    for (const tab of definition.tabs) {
      const tabFields = tab.fields
        .map((name) => fieldMap.get(name))
        .filter(Boolean) as FieldDefinition[];
      if (tabFields.length > 0) {
        grouped.set(tab.key, tabFields);
      }
    }
  } else {
    grouped.set('_default', visibleFields);
  }

  return grouped;
}
