import type { Product } from '@/types/product';
import { formatStockRolls } from '@/utils/stockFormatter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, AlertCircle, TrendingUp } from 'lucide-react';

interface ProductDetailStockProps {
  product: Product;
}

export default function ProductDetailStock({ product }: ProductDetailStockProps) {
  // Get real-time available stock from individual_product_stats
  const availableStock = product.individual_stock_tracking && product.individual_product_stats
    ? product.individual_product_stats.available
    : product.current_stock;

  const totalStock = product.individual_stock_tracking && product.individual_product_stats
    ? product.individual_product_stats.total
    : product.current_stock;

  const stockPercentage = product.max_stock_level > 0
    ? Math.min((availableStock / product.max_stock_level) * 100, 100)
    : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Package className="w-5 h-5 text-primary-600" />
          Stock Management
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stock Level Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Available Stock</span>
            <span className="font-medium text-gray-900">
              {formatStockRolls(availableStock)} {product.individual_stock_tracking && totalStock > 0 && `/ ${totalStock}`} / {product.max_stock_level} rolls
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-primary-600 h-2.5 rounded-full transition-all"
              style={{ width: `${stockPercentage}%` }}
            />
          </div>
        </div>

        {/* Stock Details Grid */}
        <div className="grid grid-cols-2 gap-4 pt-2">
          <div className="space-y-1">
            <p className="text-xs text-gray-600 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              Reorder Point
            </p>
            <p className="text-sm font-medium text-gray-900">
              {product.reorder_point} rolls
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-gray-600 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" />
              Base Quantity
            </p>
            <p className="text-sm font-medium text-gray-900">
              {product.base_quantity} {product.unit}
            </p>
          </div>
        </div>

        {/* Individual Tracking */}
        {product.individual_stock_tracking && product.individual_product_stats && (
          <div className="pt-2 border-t border-gray-200 space-y-2">
            <p className="text-xs text-gray-600 mb-1 font-medium">Individual Items Breakdown</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-600">Available:</span>
                <span className="font-medium text-green-600">{product.individual_product_stats.available}</span>
              </div>
              {product.individual_product_stats.in_production > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">In Production:</span>
                  <span className="font-medium text-blue-600">{product.individual_product_stats.in_production}</span>
                </div>
              )}
              {product.individual_product_stats.sold > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Sold:</span>
                  <span className="font-medium text-purple-600">{product.individual_product_stats.sold}</span>
                </div>
              )}
              {product.individual_product_stats.damaged > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Damaged:</span>
                  <span className="font-medium text-red-600">{product.individual_product_stats.damaged}</span>
                </div>
              )}
              <div className="flex justify-between col-span-2 pt-1 border-t">
                <span className="text-gray-600 font-medium">Total:</span>
                <span className="font-medium text-gray-900">{product.individual_product_stats.total}</span>
              </div>
            </div>
          </div>
        )}
        {product.individual_stock_tracking && !product.individual_product_stats && (
          <div className="pt-2 border-t border-gray-200">
            <p className="text-xs text-gray-600 mb-1">Individual Items</p>
            <p className="text-sm font-medium text-gray-900">
              {product.individual_products_count || 0} items tracked
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

