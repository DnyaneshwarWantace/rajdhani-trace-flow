/**
 * Formats stock quantity with proper pluralization for rolls
 * @param quantity - The stock quantity
 * @returns Formatted string like "1 roll" or "10 rolls"
 */
export function formatStockRolls(quantity: number): string {
  return `${quantity} ${quantity === 1 ? 'roll' : 'rolls'}`;
}

