/**
 * Form Validation Utilities
 * Centralized validation rules and helpers for all forms
 */

export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  patternMessage?: string;
  min?: number;
  max?: number;
  custom?: (value: any) => string | null; // Returns error message or null
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  fieldErrors: { [key: string]: string };
}

export const VALIDATION_RULES = {
  // Name validations
  PRODUCT_NAME: {
    required: true,
    minLength: 2,
    maxLength: 100,
    pattern: /^[a-zA-Z0-9\s\-_.,()]+$/,
    patternMessage: 'Name can only contain letters, numbers, spaces, and -_.,()',
  } as ValidationRule,

  MATERIAL_NAME: {
    required: true,
    minLength: 2,
    maxLength: 100,
    pattern: /^[a-zA-Z0-9\s\-_.,()]+$/,
    patternMessage: 'Name can only contain letters, numbers, spaces, and -_.,()',
  } as ValidationRule,

  // Multiple words, alphabetic only, max 50 words, 20 chars per word
  MULTI_WORD_ALPHABETIC: {
    required: true,
    pattern: /^[a-zA-Z\s]+$/,
    patternMessage: 'Can only contain letters (a-z, A-Z) and spaces',
    custom: (value: string) => {
      if (!value) return null;
      const trimmed = value.trim();
      const words = trimmed.split(/\s+/).filter(w => w.length > 0);
      
      // Check word count (max 50 words)
      if (words.length > 50) {
        return 'Maximum 50 words allowed';
      }
      
      // Check each word length (max 20 characters per word)
      const longWords = words.filter(word => word.length > 20);
      if (longWords.length > 0) {
        return `Each word can be maximum 20 characters. Words exceeding: ${longWords.slice(0, 3).join(', ')}`;
      }
      
      return null;
    },
  } as ValidationRule,

  CUSTOMER_NAME: {
    required: true,
    minLength: 2,
    maxLength: 100,
    pattern: /^[a-zA-Z\s\-'.]+$/,
    patternMessage: 'Name can only contain letters, spaces, hyphens, apostrophes, and periods',
  } as ValidationRule,

  SUPPLIER_NAME: {
    required: true,
    minLength: 2,
    maxLength: 100,
    pattern: /^[a-zA-Z0-9\s\-_.,()&]+$/,
    patternMessage: 'Name can only contain letters, numbers, spaces, and -_.,()&',
  } as ValidationRule,

  // Text fields
  NOTES: {
    required: false,
    maxLength: 1000,
    pattern: /^[a-zA-Z0-9\s\-_.,()!?@#$%&*:;'"\n\r]+$/,
    patternMessage: 'Notes contain invalid characters',
  } as ValidationRule,

  DESCRIPTION: {
    required: false,
    maxLength: 500,
  } as ValidationRule,

  // Numeric validations
  QUANTITY: {
    required: true,
    min: 0,
    max: 999999,
    pattern: /^\d*\.?\d+$/,
    patternMessage: 'Must be a valid number',
  } as ValidationRule,

  COST: {
    required: true,
    min: 0.01,
    max: 999999.99,
    pattern: /^\d*\.?\d+$/,
    patternMessage: 'Must be a valid number greater than 0',
  } as ValidationRule,

  STOCK_LEVEL: {
    required: true,
    min: 0,
    max: 999999,
    pattern: /^\d+$/,
    patternMessage: 'Must be a positive whole number',
  } as ValidationRule,

  DIMENSION: {
    required: true,
    min: 0.01,
    max: 9999.99,
    pattern: /^\d*\.?\d+$/,
    patternMessage: 'Must be a valid number greater than 0',
  } as ValidationRule,

  // Contact validations
  PHONE: {
    required: false,
    minLength: 10,
    maxLength: 15,
    pattern: /^[\d\s\-\+()]+$/,
    patternMessage: 'Phone number can only contain digits, spaces, -, +, and ()',
  } as ValidationRule,

  EMAIL: {
    required: false,
    maxLength: 100,
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    patternMessage: 'Please enter a valid email address',
  } as ValidationRule,

  // Address validations
  ADDRESS: {
    required: false,
    maxLength: 200,
    pattern: /^[a-zA-Z0-9\s\-_.,#/]+$/,
    patternMessage: 'Address contains invalid characters',
  } as ValidationRule,

  CITY: {
    required: false,
    maxLength: 50,
    pattern: /^[a-zA-Z\s\-']+$/,
    patternMessage: 'City can only contain letters, spaces, hyphens, and apostrophes',
  } as ValidationRule,

  PINCODE: {
    required: false,
    minLength: 6,
    maxLength: 10,
    pattern: /^\d+$/,
    patternMessage: 'Pincode must be numeric',
  } as ValidationRule,

  // Date validations
  DATE: {
    required: false,
    custom: (value: string) => {
      if (!value) return null;
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        return 'Please enter a valid date';
      }
      return null;
    },
  } as ValidationRule,

  // Category/Unit validations
  CATEGORY: {
    required: true,
    minLength: 1,
    maxLength: 50,
  } as ValidationRule,

  UNIT: {
    required: true,
    minLength: 1,
    maxLength: 20,
    pattern: /^[a-zA-Z0-9\s]+$/,
    patternMessage: 'Unit can only contain letters, numbers, and spaces',
  } as ValidationRule,
};

/**
 * Validate a single field value against a rule
 */
export function validateField(
  value: any,
  rule: ValidationRule,
  fieldName: string
): string | null {
  // Convert value to string for validation
  const stringValue = value !== null && value !== undefined ? String(value).trim() : '';

  // Required check
  if (rule.required && (!stringValue || stringValue === '')) {
    return `${fieldName} is required`;
  }

  // Skip other validations if field is empty and not required
  if (!stringValue && !rule.required) {
    return null;
  }

  // Min length check
  if (rule.minLength && stringValue.length < rule.minLength) {
    return `${fieldName} must be at least ${rule.minLength} characters`;
  }

  // Max length check
  if (rule.maxLength && stringValue.length > rule.maxLength) {
    return `${fieldName} must be no more than ${rule.maxLength} characters`;
  }

  // Pattern check
  if (rule.pattern && !rule.pattern.test(stringValue)) {
    return rule.patternMessage || `${fieldName} format is invalid`;
  }

  // Numeric min/max checks
  if (rule.min !== undefined || rule.max !== undefined) {
    const numValue = parseFloat(stringValue);
    if (isNaN(numValue)) {
      return `${fieldName} must be a valid number`;
    }
    if (rule.min !== undefined && numValue < rule.min) {
      return `${fieldName} must be at least ${rule.min}`;
    }
    if (rule.max !== undefined && numValue > rule.max) {
      return `${fieldName} must be no more than ${rule.max}`;
    }
  }

  // Custom validation
  if (rule.custom) {
    const customError = rule.custom(value);
    if (customError) {
      return customError;
    }
  }

  return null;
}

/**
 * Validate multiple fields at once
 */
export function validateFields(
  data: { [key: string]: any },
  rules: { [key: string]: ValidationRule },
  fieldLabels?: { [key: string]: string }
): ValidationResult {
  const errors: string[] = [];
  const fieldErrors: { [key: string]: string } = {};

  for (const [fieldName, rule] of Object.entries(rules)) {
    const fieldLabel = fieldLabels?.[fieldName] || fieldName;
    const value = data[fieldName];
    const error = validateField(value, rule, fieldLabel);

    if (error) {
      errors.push(error);
      fieldErrors[fieldName] = error;
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    fieldErrors,
  };
}

/**
 * Get character count helper for input fields
 */
export function getCharacterCount(value: string | number | undefined, maxLength: number): {
  current: number;
  max: number;
  remaining: number;
  isOverLimit: boolean;
} {
  const current = value ? String(value).length : 0;
  return {
    current,
    max: maxLength,
    remaining: Math.max(0, maxLength - current),
    isOverLimit: current > maxLength,
  };
}

/**
 * Format validation error for display
 */
export function formatValidationErrors(errors: string[]): string {
  if (errors.length === 0) return '';
  if (errors.length === 1) return errors[0];
  return `Please fix the following:\n${errors.map((e, i) => `${i + 1}. ${e}`).join('\n')}`;
}

