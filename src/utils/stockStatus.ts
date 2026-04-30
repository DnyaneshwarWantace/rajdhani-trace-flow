import type { Product } from '@/types/product';

/**
 * Calculate product status based on current stock and min stock level
 * Rules:
 * - 0 stock = out-of-stock
 * - Stock > 0 but < min_stock_level = low-stock
 * - Stock >= min_stock_level = in-stock
 */
export function calculateStockStatus(product: Product): 'in-stock' | 'low-stock' | 'out-of-stock' | 'active' | 'inactive' | 'discontinued' {
  // If product is inactive or discontinued, return that status
  if (product.status === 'inactive' || product.status === 'discontinued') {
    return product.status;
  }

  const stock = getAvailableStockForStatus(product);
  const minLevel = product.min_stock_level || 0;

  // If stock is 0, it's out of stock
  if (stock === 0) {
    return 'out-of-stock';
  }

  // If stock is less than min level, it's low stock
  if (stock < minLevel) {
    return 'low-stock';
  }

  // Otherwise, it's in stock
  return 'in-stock';
}

function getAvailableStockForStatus(product: Product): number {
  if (product.individual_stock_tracking) {
    if (product.individual_product_stats && typeof product.individual_product_stats.available === 'number') {
      return product.individual_product_stats.available;
    }
    if (typeof product.available_stock === 'number') {
      return product.available_stock;
    }
  }

  if (typeof product.available_stock === 'number') {
    return product.available_stock;
  }

  return product.current_stock || 0;
}

