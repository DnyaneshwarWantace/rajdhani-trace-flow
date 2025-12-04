import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Ruler, Weight } from 'lucide-react';
import type { IndividualProduct, Product } from '@/types/product';

interface IndividualProductDimensionsProps {
  individualProduct: IndividualProduct;
  product: Product;
}

export default function IndividualProductDimensions({
  individualProduct,
  product,
}: IndividualProductDimensionsProps) {
  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="text-xl font-semibold text-gray-900 flex items-center gap-2">
          <Ruler className="w-5 h-5 text-primary-600" />
          Dimensions
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-x-8 gap-y-4 text-sm">
        {individualProduct.final_length && (
          <div>
            <p className="text-gray-600">Final Length</p>
            <p className="font-medium text-gray-900">
              {individualProduct.final_length.includes(' ')
                ? individualProduct.final_length
                : `${individualProduct.final_length} ${product.length_unit || 'feet'}`}
            </p>
          </div>
        )}

        {individualProduct.final_width && (
          <div>
            <p className="text-gray-600">Final Width</p>
            <p className="font-medium text-gray-900">
              {individualProduct.final_width.includes(' ')
                ? individualProduct.final_width
                : `${individualProduct.final_width} ${product.width_unit || 'feet'}`}
            </p>
          </div>
        )}

        {individualProduct.final_weight && (
          <div className="flex items-start gap-2">
            <Weight className="w-4 h-4 text-gray-400 mt-0.5" />
            <div>
              <p className="text-gray-600">Final Weight</p>
              <p className="font-medium text-gray-900">
                {individualProduct.final_weight.includes(' ')
                  ? individualProduct.final_weight
                  : `${individualProduct.final_weight} ${product.weight_unit || 'kg'}`}
              </p>
            </div>
          </div>
        )}

        {!individualProduct.final_length && !individualProduct.final_width && !individualProduct.final_weight && (
          <div className="sm:col-span-3 text-center py-4 text-gray-500">
            No dimension data available
          </div>
        )}
      </CardContent>
    </Card>
  );
}

