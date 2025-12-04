/**
 * Calculate SQM from dimensions
 */
function calculateSQM(length: string | number, width: string | number, lengthUnit: string, widthUnit: string): number {
  const lengthNum = typeof length === 'string' ? parseFloat(length) || 0 : length;
  const widthNum = typeof width === 'string' ? parseFloat(width) || 0 : width;
  
  // Convert to meters
  const convertToMeters = (value: number, unit: string): number => {
    switch (unit.toLowerCase()) {
      case 'feet':
      case 'ft':
        return value * 0.3048;
      case 'meters':
      case 'm':
        return value;
      case 'cm':
      case 'centimeters':
        return value / 100;
      case 'inches':
      case 'in':
        return value * 0.0254;
      default:
        return value;
    }
  };

  const lengthM = convertToMeters(lengthNum, lengthUnit);
  const widthM = convertToMeters(widthNum, widthUnit);
  
  return lengthM * widthM;
}

/**
 * Calculate the ratio of source product needed for 1 SQM of target product
 * Matches the logic from old frontend Products.tsx
 * @param sourceProduct - The product being used as ingredient
 * @param targetProduct - The product being produced
 * @returns Ratio (how many units of source product per 1 SQM of target)
 */
export function calculateProductRatio(sourceProduct: any, targetProduct: any): number {
  // Use the actual units from the product data (no hardcoded defaults)
  const sourceLengthUnit = sourceProduct.length_unit || sourceProduct.lengthUnit || '';
  const sourceWidthUnit = sourceProduct.width_unit || sourceProduct.widthUnit || '';
  const targetLengthUnit = targetProduct.length_unit || targetProduct.lengthUnit || '';
  const targetWidthUnit = targetProduct.width_unit || targetProduct.widthUnit || '';
  
  // If units are missing, return 0 (can't calculate ratio)
  if (!sourceLengthUnit || !sourceWidthUnit || !targetLengthUnit || !targetWidthUnit) {
    return 0;
  }
  
  const sourceSQM = calculateSQM(sourceProduct.length, sourceProduct.width, sourceLengthUnit, sourceWidthUnit);
  const targetSQM = calculateSQM(targetProduct.length, targetProduct.width, targetLengthUnit, targetWidthUnit);
  
  // Calculate how many units of source product are needed for 1 SQM of target product
  // Formula: 1 / sourceSQM (units of source per 1 SQM of target)
  const unitsPerSQM = sourceSQM > 0 ? 1 / sourceSQM : 0;
  
  if (sourceSQM === 0) return 0;
  return unitsPerSQM;
}

