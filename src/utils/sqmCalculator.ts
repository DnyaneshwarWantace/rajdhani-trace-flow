/**
 * Calculate SQM (Square Meters) from dimensions
 * Matches the logic from old frontend code
 */
export function calculateSQM(
  length: string | number,
  width: string | number,
  lengthUnit: string,
  widthUnit: string
): number {
  const lengthNum = typeof length === 'string' ? parseFloat(length) || 0 : length;
  const widthNum = typeof width === 'string' ? parseFloat(width) || 0 : width;

  // Convert to meters
  const convertToMeters = (value: number, unit: string): number => {
    const unitLower = unit.toLowerCase();
    switch (unitLower) {
      case 'mm':
        return value / 1000;
      case 'cm':
      case 'centimeters':
        return value / 100;
      case 'feet':
      case 'ft':
        return value * 0.3048; // 1 foot = 0.3048 meters
      case 'inches':
      case 'in':
        return value * 0.0254; // 1 inch = 0.0254 meters
      case 'yards':
      case 'yd':
        return value * 0.9144; // 1 yard = 0.9144 meters
      case 'm':
      case 'meter':
      case 'meters':
        return value;
      default:
        return value; // Assume meters if unknown
    }
  };

  const lengthM = convertToMeters(lengthNum, lengthUnit);
  const widthM = convertToMeters(widthNum, widthUnit);

  return lengthM * widthM;
}

/**
 * Convert SQM to Square Feet
 */
export function sqmToSquareFeet(sqm: number): number {
  return sqm * 10.7639; // 1 sqm = 10.7639 sqft
}

/**
 * Format SQM with square feet
 */
export function formatSQMWithSquareFeet(sqm: number): string {
  const sqft = sqmToSquareFeet(sqm);
  return `${sqm.toFixed(4)} sqm (${sqft.toFixed(4)} sqft)`;
}

