import type { Field } from '../types';
export interface ValidationError {
    level: 'error' | 'warning' | 'info';
    message: string;
}
/**
 * Check if a field is required based on its validation rules
 */
export declare function isFieldRequired(field: Field): boolean;
/**
 * Validate a field value against its validation rules
 */
export declare function validateField(field: Field, value: any, context?: any): Promise<{
    isValid: boolean;
    errors: ValidationError[];
}>;
/**
 * Get validation CSS classes for input styling
 */
export declare function getValidationClasses(hasValidated: boolean, isValid: boolean, hasErrors: boolean): string;
//# sourceMappingURL=utils.d.ts.map