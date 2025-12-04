import type { Product } from '@/types/product';
import { formatStockRolls } from '@/utils/stockFormatter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, AlertCircle, TrendingUp } from 'lucide-react';

interface ProductDetailStockProps {
  product: Product;
}

export default function ProductDetailStock({ product }: ProductDetailStockProps) {
  const stockPercentage = product.max_stock_level > 0
    ? Math.min((product.current_stock / product.max_stock_level) * 100, 100)
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
            <span className="text-gray-600">Stock Level</span>
            <span className="font-medium text-gray-900">
              {formatStockRolls(product.current_stock)} / {product.max_stock_level} rolls
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
        {product.individual_stock_tracking && (
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

