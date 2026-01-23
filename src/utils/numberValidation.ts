/**
 * Number Input Validation Utilities
 * Prevents scientific notation and enforces business-specific limits
 * for carpet manufacturing ERP system
 */

export interface NumberValidationConfig {
  min?: number;
  max?: number;
  decimals?: number;
  allowNegative?: boolean;
}

/**
 * Validates and formats numeric input to prevent scientific notation
 * and enforce business limits
 */
export const validateNumberInput = (
  value: string,
  config: NumberValidationConfig = {}
): { isValid: boolean; value: string; error?: string } => {
  const {
    min = 0,
    max = 99999999,
    decimals = 2,
    allowNegative = false,
  } = config;

  // Empty string is valid (allows clearing the field)
  if (value === '') {
    return { isValid: true, value: '' };
  }

  // Check for scientific notation (e, E, +)
  if (/[eE+]/.test(value)) {
    return {
      isValid: false,
      value: value.replace(/[eE+]/g, ''),
      error: 'Scientific notation not allowed',
    };
  }

  // Allow only numbers, decimal point, and optionally minus sign
  const regex = allowNegative ? /^-?\d*\.?\d*$/ : /^\d*\.?\d*$/;
  if (!regex.test(value)) {
    return {
      isValid: false,
      value: value.replace(/[^0-9.-]/g, ''),
      error: 'Invalid characters',
    };
  }

  // Check decimal places
  const parts = value.split('.');
  if (parts.length > 2) {
    return {
      isValid: false,
      value: parts[0] + '.' + parts.slice(1).join(''),
      error: 'Multiple decimal points',
    };
  }

  if (parts[1] && parts[1].length > decimals) {
    return {
      isValid: false,
      value: parts[0] + '.' + parts[1].slice(0, decimals),
      error: `Maximum ${decimals} decimal places`,
    };
  }

  // Check range
  const numValue = parseFloat(value);
  if (!isNaN(numValue)) {
    if (numValue < min) {
      return {
        isValid: false,
        value: min.toString(),
        error: `Minimum value is ${min}`,
      };
    }
    if (numValue > max) {
      return {
        isValid: false,
        value: max.toString(),
        error: `Maximum value is ${max}`,
      };
    }
  }

  return { isValid: true, value };
};

/**
 * Preset validation configs for common business scenarios
 */
export const ValidationPresets = {
  // Product/Order Quantity (whole numbers only - rolls, pieces)
  PRODUCT_QUANTITY: {
    min: 0,
    max: 99999,
    decimals: 0,
    allowNegative: false,
  },

  // Raw Material Quantity (allows decimals - kg, meters, sqm)
  MATERIAL_QUANTITY: {
    min: 0,
    max: 99999.99,
    decimals: 2,
    allowNegative: false,
  },

  // Recipe Quantity per SQM (very precise decimals)
  RECIPE_QUANTITY: {
    min: 0,
    max: 9999.999,
    decimals: 3,
    allowNegative: false,
  },

  // Price/Cost (currency - INR)
  PRICE: {
    min: 0,
    max: 9999999.99,
    decimals: 2,
    allowNegative: false,
  },

  // Small amounts (discount amounts, adjustments)
  AMOUNT: {
    min: 0,
    max: 9999999.99,
    decimals: 2,
    allowNegative: false,
  },

  // Percentage (GST rate, discount percentage)
  PERCENTAGE: {
    min: 0,
    max: 100,
    decimals: 2,
    allowNegative: false,
  },

  // Dimensions (length, width in feet/meters)
  DIMENSION: {
    min: 0,
    max: 9999.99,
    decimals: 2,
    allowNegative: false,
  },

  // Weight (in kg, grams, GSM)
  WEIGHT: {
    min: 0,
    max: 99999.99,
    decimals: 2,
    allowNegative: false,
  },

  // Stock levels (min/max stock, reorder point)
  STOCK_LEVEL: {
    min: 0,
    max: 99999,
    decimals: 0,
    allowNegative: false,
  },

  // Display order for dropdowns
  DISPLAY_ORDER: {
    min: 0,
    max: 9999,
    decimals: 0,
    allowNegative: false,
  },
};

/**
 * Format number for display (removes trailing zeros after decimal)
 */
export const formatNumberDisplay = (value: number | string, decimals: number = 2): string => {
  if (value === '' || value === null || value === undefined) return '';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '';

  // Format with specified decimals, then remove trailing zeros
  return num.toFixed(decimals).replace(/\.?0+$/, '');
};

/**
 * Safe number parser - prevents scientific notation
 */
export const safeParseFloat = (value: string | number): number => {
  if (typeof value === 'number') return value;
  if (!value || value === '') return 0;

  // Remove scientific notation if present
  const cleaned = String(value).replace(/[eE+]/g, '');
  const parsed = parseFloat(cleaned);

  return isNaN(parsed) ? 0 : parsed;
};

/**
 * Safe number parser for integers
 */
export const safeParseInt = (value: string | number): number => {
  if (typeof value === 'number') return Math.floor(value);
  if (!value || value === '') return 0;

  // Remove scientific notation if present
  const cleaned = String(value).replace(/[eE+]/g, '');
  const parsed = parseInt(cleaned, 10);

  return isNaN(parsed) ? 0 : parsed;
};

/**
 * Check if a number is in scientific notation
 */
export const isScientificNotation = (value: string | number): boolean => {
  return /[eE+]/.test(String(value));
};

/**
 * Clamp number within range
 */
export const clampNumber = (value: number, min: number, max: number): number => {
  return Math.min(Math.max(value, min), max);
};
