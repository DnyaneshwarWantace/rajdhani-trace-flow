import type { Product } from '@/types/product';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatIndianNumberWithDecimals } from '@/utils/formatHelpers';
import { Ruler, Weight } from 'lucide-react';

interface ProductDetailDimensionsProps {
  product: Product;
}

export default function ProductDetailDimensions({ product }: ProductDetailDimensionsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Ruler className="w-5 h-5 text-primary-600" />
          Dimensions
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1">
            <p className="text-sm text-gray-600">Length</p>
            <p className="text-sm font-medium text-gray-900">
              {product.length} {product.length_unit}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-gray-600">Width</p>
            <p className="text-sm font-medium text-gray-900">
              {product.width} {product.width_unit}
            </p>
          </div>
          {product.sqm && (
            <div className="space-y-1">
              <p className="text-sm text-gray-600">SQM</p>
              <p className="text-sm font-medium text-gray-900">
                {formatIndianNumberWithDecimals(product.sqm, 2)}
              </p>
            </div>
          )}
          {product.weight && (
            <div className="space-y-1 md:col-span-3">
              <p className="text-sm text-gray-600 flex items-center gap-2">
                <Weight className="w-4 h-4" />
                Weight
              </p>
              <p className="text-sm font-medium text-gray-900">
                {product.weight} {product.weight_unit}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

