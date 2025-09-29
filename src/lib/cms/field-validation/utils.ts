import type { Field } from '../types';
import { Rule } from './Rule.js';

export interface ValidationError {
  level: 'error' | 'warning' | 'info';
  message: string;
}

/**
 * Check if a field is required based on its validation rules
 */
export function isFieldRequired(field: Field): boolean {
  if (!field.validation) return false;
  try {
    const validationFn = Array.isArray(field.validation) ? field.validation[0] : field.validation;
    const rule = validationFn(new Rule());
    return rule.isRequired();
  } catch {
    return false;
  }
}

/**
 * Validate a field value against its validation rules
 */
export async function validateField(
  field: Field,
  value: any,
  context: any = {}
): Promise<{
  isValid: boolean;
  errors: ValidationError[];
}> {
  if (!field.validation) {
    return { isValid: true, errors: [] };
  }

  try {
    const validationFunctions = Array.isArray(field.validation)
      ? field.validation
      : [field.validation];

    const allErrors: ValidationError[] = [];

    for (const validationFn of validationFunctions) {
      const rule = validationFn(new Rule());
      const markers = await rule.validate(value, {
        path: [field.name],
        ...context
      });

      allErrors.push(...markers.map(marker => ({
        level: marker.level,
        message: marker.message
      })));
    }

    const isValid = allErrors.filter(e => e.level === 'error').length === 0;

    return { isValid, errors: allErrors };
  } catch (error) {
    console.error('Validation error:', error);
    return {
      isValid: false,
      errors: [{ level: 'error', message: 'Validation failed' }]
    };
  }
}

/**
 * Get validation CSS classes for input styling
 */
export function getValidationClasses(
  hasValidated: boolean,
  isValid: boolean,
  hasErrors: boolean
): string {
  if (!hasValidated) return '';

  if (hasErrors) {
    return 'border-destructive border-2';
  } else if (isValid) {
    return 'border-green-500 border-2';
  }

  return '';
}
