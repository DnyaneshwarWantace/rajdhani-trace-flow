// Unit Conversion Utilities for Carpet Pricing
// Handles area conversions and pricing calculations

export type AreaUnit = 'sqft' | 'sqm';
export type WeightUnit = 'kg';
export type CountUnit = 'unit'; // Per product unit
export type TextileUnit = 'gsm';

export type PricingUnit = AreaUnit | WeightUnit | CountUnit | TextileUnit;

export interface ProductDimensions {
  // Area/Dimension properties
  width?: number; // in meters
  length?: number; // in meters
  
  // Weight properties
  weight?: number; // in kg
  density?: number; // kg per cubic meter
  
  // Volume properties
  volume?: number; // in liters
  
  // Textile properties
  gsm?: number; // grams per square meter
  denier?: number; // denier (grams per 9000 meters of fiber)
  tex?: number; // tex (grams per 1000 meters of fiber)
  thread_count?: number; // threads per square inch or cm
  fiber_density?: number; // density of fiber material in g/cm³
  
  // Product type
  productType?: 'carpet' | 'raw_material' | 'bulk_product' | 'finished_good' | 'textile' | 'fiber';
}

export interface PricingUnitInfo {
  unit: PricingUnit;
  label: string;
  description: string;
  category: 'area' | 'volume' | 'weight' | 'length' | 'count' | 'textile';
  requiresDimensions: boolean;
  applicableTo: ('carpet' | 'raw_material' | 'bulk_product' | 'finished_good' | 'textile' | 'fiber')[];
}

export const PRICING_UNITS: PricingUnitInfo[] = [
  // Area-based pricing
  {
    unit: 'sqft',
    label: 'Per Square Foot',
    description: 'Price per square foot',
    category: 'area',
    requiresDimensions: true,
    applicableTo: ['carpet', 'finished_good', 'raw_material']
  },
  {
    unit: 'sqm',
    label: 'Per Square Meter',
    description: 'Price per square meter',
    category: 'area',
    requiresDimensions: true,
    applicableTo: ['carpet', 'finished_good', 'raw_material']
  },
  
  // Weight-based pricing
  {
    unit: 'kg',
    label: 'Per Kilogram',
    description: 'Price per kilogram',
    category: 'weight',
    requiresDimensions: true,
    applicableTo: ['raw_material', 'bulk_product', 'carpet', 'finished_good']
  },
  
  // Textile-based pricing
  {
    unit: 'gsm',
    label: 'Per GSM',
    description: 'Price per gram per square meter',
    category: 'textile',
    requiresDimensions: true,
    applicableTo: ['carpet', 'textile', 'fiber', 'finished_good']
  }
];

// Conversion factors (only for the 4 units we support)
const CONVERSION_FACTORS: Record<string, number> = {
  // Area conversions (relative to square meters)
  sqm: 1,
  sqft: 10.764, // 1 sqm = 10.764 sqft
  
  // Weight conversions (relative to kg)
  kg: 1,
  
  // Textile conversions
  gsm: 1 // grams per square meter (base unit)
};

/**
 * Convert area from one unit to another
 */
export function convertArea(value: number, fromUnit: AreaUnit, toUnit: AreaUnit): number {
  if (fromUnit === toUnit) return value;
  
  // Convert to square meters first
  let valueInSqm = value;
  if (fromUnit !== 'sqm') {
    valueInSqm = value / CONVERSION_FACTORS[fromUnit];
  }
  
  // Convert from square meters to target unit
  if (toUnit === 'sqm') {
    return valueInSqm;
  }
  
  return valueInSqm * CONVERSION_FACTORS[toUnit];
}

/**
 * Calculate unit value from product dimensions based on pricing unit
 */
export function calculateUnitValue(dimensions: ProductDimensions, unit: PricingUnit): number {
  const unitInfo = PRICING_UNITS.find(u => u.unit === unit);
  if (!unitInfo) return 0;
  
  switch (unitInfo.category) {
    case 'area':
      if (!dimensions.width || !dimensions.length) return 0;
      const areaInSqm = dimensions.width * dimensions.length;
      return convertUnit(areaInSqm, 'sqm', unit);
      
    case 'volume':
      return 0;
      
    case 'weight':
      if (!dimensions.weight) return 0;
      return convertUnit(dimensions.weight, 'kg', unit);
      
    case 'length':
      return 0;
      
    case 'count':
      return 0;
      
    case 'textile':
      return calculateTextileValue(dimensions, unit);
      
    default:
      return 0;
  }
}

/**
 * Calculate textile unit value based on dimensions
 */
function calculateTextileValue(dimensions: ProductDimensions, unit: PricingUnit): number {
  if (unit === 'gsm') {
    return dimensions.gsm || 0;
  }
  return 0;
}

/**
 * Convert between textile units (only GSM supported)
 */
function convertTextileUnit(value: number, fromUnit: PricingUnit, toUnit: PricingUnit): number {
  if (fromUnit === toUnit) return value;
  return value;
}

/**
 * Convert between units of the same category
 */
function convertUnit(value: number, fromUnit: PricingUnit, toUnit: PricingUnit): number {
  if (fromUnit === toUnit) return value;
  
  if (isTextileUnit(fromUnit) && isTextileUnit(toUnit)) {
    return convertTextileUnit(value, fromUnit, toUnit);
  }
  
  const fromFactor = CONVERSION_FACTORS[fromUnit] || 1;
  const toFactor = CONVERSION_FACTORS[toUnit] || 1;
  
  const baseValue = value / fromFactor;
  return baseValue * toFactor;
}

/**
 * Check if a unit is a textile unit
 */
function isTextileUnit(unit: PricingUnit): boolean {
  return unit === 'gsm';
}

/**
 * Calculate total price based on unit price, quantity, and product dimensions
 */
export function calculateTotalPrice(
  unitPrice: number,
  quantity: number,
  pricingUnit: PricingUnit,
  productDimensions: ProductDimensions,
  lengthUnit?: string,
  widthUnit?: string
): number {
  // For count_unit (unit): simple price * quantity
  if (pricingUnit === 'unit') {
    return unitPrice * quantity;
  }
  
  const unitInfo = PRICING_UNITS.find(u => u.unit === pricingUnit);
  if (!unitInfo) return unitPrice * quantity;
  
  // For SQM pricing: Calculate SQM per product, then price per SQM * SQM per product * quantity
  if (pricingUnit === 'sqm') {
    if (!productDimensions.length || !productDimensions.width) {
      return unitPrice * quantity;
    }
    
    // Convert length and width to meters if needed
    const lengthInM = convertToMeters(productDimensions.length, lengthUnit || 'm');
    const widthInM = convertToMeters(productDimensions.width, widthUnit || 'm');
    const sqmPerProduct = lengthInM * widthInM;
    
    // Price per SQM * SQM per product * quantity
    return unitPrice * sqmPerProduct * quantity;
  }
  
  // For SQFT pricing: Convert to feet, calculate SQFT per product, then price per SQFT * SQFT per product * quantity
  if (pricingUnit === 'sqft') {
    if (!productDimensions.length || !productDimensions.width) {
      return unitPrice * quantity;
    }
    
    // Convert length and width to feet if needed
    const lengthInFt = convertToFeet(productDimensions.length, lengthUnit || 'm');
    const widthInFt = convertToFeet(productDimensions.width, widthUnit || 'm');
    const sqftPerProduct = lengthInFt * widthInFt;
    
    // Price per SQFT * SQFT per product * quantity
    return unitPrice * sqftPerProduct * quantity;
  }
  
  // For GSM pricing: Calculate total GSM for one product, then price per GSM * GSM per product * quantity
  if (pricingUnit === 'gsm') {
    const gsm = productDimensions.gsm || parseFloat(String(productDimensions.weight || '0').replace(/[^\d.-]/g, '')) || 0;
    
    if (gsm <= 0) {
      return unitPrice * quantity;
    }
    
    // Calculate area in SQM for one product
    if (productDimensions.length && productDimensions.width) {
      const lengthInM = convertToMeters(productDimensions.length, lengthUnit || 'm');
      const widthInM = convertToMeters(productDimensions.width, widthUnit || 'm');
      const sqmPerProduct = lengthInM * widthInM;
      
      // Total GSM for one product = GSM * area in SQM
      const totalGsmPerProduct = gsm * sqmPerProduct;
      
      // Price per GSM * total GSM per product * quantity
      return unitPrice * totalGsmPerProduct * quantity;
    }
    
    // If no dimensions, use GSM value directly
    return unitPrice * gsm * quantity;
  }
  
  // For KG pricing: calculate weight from GSM and area, then price per kg * total weight
  if (pricingUnit === 'kg') {
    const gsm = productDimensions.gsm || parseFloat(String(productDimensions.weight || '0').replace(/[^\d.-]/g, '')) || 0;
    if (productDimensions.length && productDimensions.width && gsm > 0) {
      const lengthInM = convertToMeters(productDimensions.length, lengthUnit || 'm');
      const widthInM = convertToMeters(productDimensions.width, widthUnit || 'm');
      const sqmPerProduct = lengthInM * widthInM;
      const weightPerProduct = (gsm * sqmPerProduct) / 1000; // Convert grams to kg
      const totalWeight = weightPerProduct * quantity;
      return unitPrice * totalWeight;
    }
    return unitPrice * quantity;
  }
  
  // Fallback: simple calculation
  return unitPrice * quantity;
}

/**
 * Convert value to meters
 */
function convertToMeters(value: number, unit: string): number {
  const unitLower = unit.toLowerCase();
  switch (unitLower) {
    case 'mm': return value / 1000;
    case 'cm': case 'centimeters': return value / 100;
    case 'feet': case 'ft': return value * 0.3048;
    case 'inches': case 'in': return value * 0.0254;
    case 'yards': case 'yd': return value * 0.9144;
    case 'm': case 'meter': case 'meters': return value;
    default: return value; // Assume meters if unknown
  }
}

/**
 * Convert value to feet
 */
function convertToFeet(value: number, unit: string): number {
  const unitLower = unit.toLowerCase();
  switch (unitLower) {
    case 'mm': return value / 304.8;
    case 'cm': case 'centimeters': return value / 30.48;
    case 'm': case 'meter': case 'meters': return value * 3.28084;
    case 'inches': case 'in': return value / 12;
    case 'yards': case 'yd': return value * 3;
    case 'feet': case 'ft': return value;
    default: return value; // Assume feet if unknown
  }
}

/**
 * Get the unit value of one unit of the product in the specified unit
 */
export function getUnitValue(productDimensions: ProductDimensions, unit: PricingUnit): number {
  return calculateUnitValue(productDimensions, unit);
}

/**
 * Format unit label with proper pluralization
 */
export function formatUnitLabel(unit: PricingUnit, quantity: number = 1): string {
  if (unit === 'unit') {
    return quantity === 1 ? 'product' : 'products';
  }
  
  const unitInfo = PRICING_UNITS.find(u => u.unit === unit);
  if (!unitInfo) return unit;
  
  const label = unitInfo.label.toLowerCase();
  
  if (quantity === 1) {
    return label;
  }
  
  if (label.endsWith('foot')) return label.replace('foot', 'feet');
  if (label.endsWith('meter')) return label.replace('meter', 'meters');
  if (label.endsWith('kilogram')) return label.replace('kilogram', 'kilograms');
  if (label.endsWith('gsm')) return label;
  
  return label;
}

/**
 * Validate if product dimensions are sufficient for the selected pricing unit
 */
export function validateDimensionsForUnit(dimensions: ProductDimensions, unit: PricingUnit): boolean {
  const unitInfo = PRICING_UNITS.find(u => u.unit === unit);
  if (!unitInfo) return false;
  
  if (!unitInfo.requiresDimensions) return true;
  
  switch (unitInfo.category) {
    case 'area':
      return !!(dimensions.width && dimensions.length && dimensions.weight);
    case 'volume':
      return !!(dimensions.volume);
    case 'weight':
      return !!(dimensions.width && dimensions.length && dimensions.weight);
    case 'length':
      return !!(dimensions.width);
    case 'count':
      return true;
    case 'textile':
      return validateTextileDimensions(dimensions, unit);
    default:
      return true;
  }
}

/**
 * Validate textile-specific dimensions
 */
function validateTextileDimensions(dimensions: ProductDimensions, unit: PricingUnit): boolean {
  if (unit === 'gsm') {
    return !!(dimensions.weight || dimensions.gsm);
  }
  return false;
}

/**
 * Get suggested pricing unit based on product type and dimensions
 */
export function getSuggestedPricingUnit(productDimensions: ProductDimensions): PricingUnit {
  if (productDimensions.gsm && productDimensions.gsm > 0) {
    return 'gsm';
  }
  if (productDimensions.width && productDimensions.length) {
    return 'sqm';
  }
  if (productDimensions.weight) {
    return 'kg';
  }
  
  return 'sqm';
}

/**
 * Get available pricing units for a product based on its type and dimensions
 */
export function getAvailablePricingUnits(productDimensions: ProductDimensions): PricingUnit[] {
  const productType = productDimensions.productType;
  
  return PRICING_UNITS
    .filter(unitInfo => {
      if (productType && !unitInfo.applicableTo.includes(productType)) {
        return false;
      }
      
      return !unitInfo.requiresDimensions || validateDimensionsForUnit(productDimensions, unitInfo.unit);
    })
    .map(unitInfo => unitInfo.unit);
}


