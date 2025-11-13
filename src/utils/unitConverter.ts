// Unit Conversion Utilities for Carpet Pricing
// Handles area conversions and pricing calculations

export type AreaUnit = 'sqft' | 'sqm';
export type VolumeUnit = never; // Not used anymore
export type WeightUnit = 'kg';
export type LengthUnit = never; // Not used anymore
export type CountUnit = never; // Not used anymore
export type TextileUnit = 'gsm';

export type PricingUnit = AreaUnit | VolumeUnit | WeightUnit | LengthUnit | CountUnit | TextileUnit;

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
      // No volume-based units supported anymore
      return 0;
      
    case 'weight':
      if (!dimensions.weight) return 0;
      return convertUnit(dimensions.weight, 'kg', unit);
      
    case 'length':
      // No length-based units supported anymore
      return 0;
      
    case 'count':
      // No count-based units supported anymore
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
    // GSM is already in grams per square meter
    return dimensions.gsm || 0;
  }
  return 0;
}

/**
 * Convert between textile units (only GSM supported)
 */
function convertTextileUnit(value: number, fromUnit: PricingUnit, toUnit: PricingUnit): number {
  if (fromUnit === toUnit) return value;
  // Only GSM is supported, so return value as-is
  return value;
}

/**
 * Convert between units of the same category
 */
function convertUnit(value: number, fromUnit: PricingUnit, toUnit: PricingUnit): number {
  if (fromUnit === toUnit) return value;
  
  // Handle textile units separately
  if (isTextileUnit(fromUnit) && isTextileUnit(toUnit)) {
    return convertTextileUnit(value, fromUnit, toUnit);
  }
  
  const fromFactor = CONVERSION_FACTORS[fromUnit] || 1;
  const toFactor = CONVERSION_FACTORS[toUnit] || 1;
  
  // Convert to base unit first, then to target unit
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
  productDimensions: ProductDimensions
): number {
  const unitInfo = PRICING_UNITS.find(u => u.unit === pricingUnit);
  if (!unitInfo) return 0;
  
  // No count-based units anymore, removed
  
  // For GSM pricing: price per GSM * GSM value * total area (SQM) * quantity
  if (pricingUnit === 'gsm') {
    const gsm = productDimensions.weight || productDimensions.gsm || 0; // GSM is stored in weight field
    const areaPerUnit = (productDimensions.length || 0) * (productDimensions.width || 0); // SQM per unit
    const totalArea = areaPerUnit * quantity; // Total SQM for all units
    
    // If GSM or area is 0, return simple calculation as fallback
    if (gsm <= 0 || areaPerUnit <= 0) {
      return unitPrice * quantity;
    }
    
    // Price = price per GSM * GSM * total SQM
    return unitPrice * gsm * totalArea;
  }
  
  // For SQM pricing: price per SQM * SQM per unit * quantity
  if (pricingUnit === 'sqm') {
    const areaPerUnit = (productDimensions.length || 0) * (productDimensions.width || 0); // SQM per unit
    const totalArea = areaPerUnit * quantity; // Total SQM for all units
    // Price = price per SQM * total SQM
    return unitPrice * totalArea;
  }
  
  // For KG pricing: calculate weight from GSM and area, then price per kg * total weight
  if (pricingUnit === 'kg') {
    const gsm = productDimensions.weight || productDimensions.gsm || 0; // GSM is in weight field
    const areaPerUnit = (productDimensions.length || 0) * (productDimensions.width || 0); // SQM per unit
    if (gsm > 0 && areaPerUnit > 0) {
      // Weight per unit in kg = (GSM × Area in sqm) / 1000
      const weightPerUnit = (gsm * areaPerUnit) / 1000;
      const totalWeight = weightPerUnit * quantity;
      // Price = price per kg * total weight
      return unitPrice * totalWeight;
    }
    return 0;
  }
  
  // Calculate unit value based on dimensions for other units
  const unitValue = calculateUnitValue(productDimensions, pricingUnit);
  const totalValue = unitValue * quantity;
  return unitPrice * totalValue;
}

// Removed getCountMultiplier - no count-based units

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
  const unitInfo = PRICING_UNITS.find(u => u.unit === unit);
  if (!unitInfo) return unit;
  
  const label = unitInfo.label.toLowerCase();
  
  if (quantity === 1) {
    return label;
  }
  
  // Simple pluralization rules
  if (label.endsWith('piece')) return label.replace('piece', 'pieces');
  if (label.endsWith('roll')) return label.replace('roll', 'rolls');
  if (label.endsWith('foot')) return label.replace('foot', 'feet');
  if (label.endsWith('meter')) return label.replace('meter', 'meters');
  if (label.endsWith('yard')) return label.replace('yard', 'yards');
  if (label.endsWith('Linear Yard')) return label.replace('Linear Yard', 'Linear Yards');
  if (label.endsWith('kilogram')) return label.replace('kilogram', 'kilograms');
  if (label.endsWith('liter')) return label.replace('liter', 'liters');
  if (label.endsWith('gram')) return label.replace('gram', 'grams');
  if (label.endsWith('ton')) return label.replace('ton', 'tons');
  if (label.endsWith('gallon')) return label.replace('gallon', 'gallons');
  if (label.endsWith('dozen')) return label.replace('dozen', 'dozens');
  if (label.endsWith('hundred')) return label.replace('hundred', 'hundreds');
  if (label.endsWith('thousand')) return label.replace('thousand', 'thousands');
  if (label.endsWith('gsm')) return label; // GSM doesn't change
  if (label.endsWith('denier')) return label; // Denier doesn't change
  if (label.endsWith('tex')) return label; // Tex doesn't change
  if (label.endsWith('thread count')) return label.replace('thread count', 'thread counts');
  
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
      // SQM and SQFT require length, width, AND weight (GSM)
      return !!(dimensions.width && dimensions.length && dimensions.weight);
    case 'volume':
      return !!(dimensions.volume);
    case 'weight':
      // KG requires length, width, and weight (GSM) to calculate
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
    // GSM is stored in the weight field
    return !!(dimensions.weight || dimensions.gsm);
  }
  return false;
}

/**
 * Get suggested pricing unit based on product type and dimensions
 */
export function getSuggestedPricingUnit(productDimensions: ProductDimensions): PricingUnit {
  const productType = productDimensions.productType;
  
  // Prioritize GSM if available, then SQM, then kg
  if (productDimensions.gsm && productDimensions.gsm > 0) {
    return 'gsm';
  }
  if (productDimensions.width && productDimensions.length) {
    return 'sqm';
  }
  if (productDimensions.weight) {
    return 'kg';
  }
  
  // Default to SQM
  return 'sqm';
}

/**
 * Get available pricing units for a product based on its type and dimensions
 */
export function getAvailablePricingUnits(productDimensions: ProductDimensions): PricingUnit[] {
  const productType = productDimensions.productType;
  
  return PRICING_UNITS
    .filter(unitInfo => {
      // Check if unit is applicable to this product type
      if (productType && !unitInfo.applicableTo.includes(productType)) {
        return false;
      }
      
      // Check if dimensions are sufficient
      return !unitInfo.requiresDimensions || validateDimensionsForUnit(productDimensions, unitInfo.unit);
    })
    .map(unitInfo => unitInfo.unit);
}
