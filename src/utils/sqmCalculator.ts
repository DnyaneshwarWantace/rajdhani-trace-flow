import { convertToMeters } from './unitConverter';

export function calculateSQM(
  length: string | number,
  width: string | number,
  lengthUnit: string,
  widthUnit: string
): number {
  const lengthNum = typeof length === 'string' ? parseFloat(length) || 0 : length;
  const widthNum = typeof width === 'string' ? parseFloat(width) || 0 : width;

  const lengthM = convertToMeters(lengthNum, lengthUnit);
  const widthM = convertToMeters(widthNum, widthUnit);

  return lengthM * widthM;
}

export function sqmToSquareFeet(sqm: number): number {
  return sqm * 10.76389;
}

export function formatSQMWithSquareFeet(sqm: number): string {
  const sqft = sqmToSquareFeet(sqm);
  return `${sqm.toFixed(4)} sqm (${sqft.toFixed(4)} sqft)`;
}
