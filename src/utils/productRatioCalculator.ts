import { convertToMeters } from './unitConverter';

function calculateSQM(length: string | number, width: string | number, lengthUnit: string, widthUnit: string): number {
  const lengthNum = typeof length === 'string' ? parseFloat(length) || 0 : length;
  const widthNum = typeof width === 'string' ? parseFloat(width) || 0 : width;
  return convertToMeters(lengthNum, lengthUnit) * convertToMeters(widthNum, widthUnit);
}

export function calculateProductRatio(sourceProduct: any, targetProduct: any): number {
  const sourceLengthUnit = sourceProduct.length_unit || sourceProduct.lengthUnit || '';
  const sourceWidthUnit = sourceProduct.width_unit || sourceProduct.widthUnit || '';
  const targetLengthUnit = targetProduct.length_unit || targetProduct.lengthUnit || '';
  const targetWidthUnit = targetProduct.width_unit || targetProduct.widthUnit || '';

  if (!sourceLengthUnit || !sourceWidthUnit || !targetLengthUnit || !targetWidthUnit) {
    return 0;
  }

  const sourceSQM = calculateSQM(sourceProduct.length, sourceProduct.width, sourceLengthUnit, sourceWidthUnit);

  if (sourceSQM === 0) return 0;
  return 1 / sourceSQM;
}
