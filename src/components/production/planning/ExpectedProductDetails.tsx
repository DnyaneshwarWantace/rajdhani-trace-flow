import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Product } from '@/types/product';

interface ExpectedProductDetailsProps {
  product: Product;
  onEdit?: () => void;
}

export default function ExpectedProductDetails({ product, onEdit }: ExpectedProductDetailsProps) {
  return (
    <Card className="mb-6">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Package className="w-5 h-5" />
          Expected Product Details
        </CardTitle>
        {onEdit && (
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-gray-600 mb-1">Name:</p>
            <p className="font-medium text-gray-900">{product.name}</p>
          </div>

          {product.category && (
            <div>
              <p className="text-sm text-gray-600 mb-1">Category:</p>
              <p className="font-medium text-gray-900">{product.category}</p>
            </div>
          )}

          {product.length && (
            <div>
              <p className="text-sm text-gray-600 mb-1">Length:</p>
              <p className="font-medium text-gray-900">
                {product.length} {product.length_unit || ''}
              </p>
            </div>
          )}

          {product.width && (
            <div>
              <p className="text-sm text-gray-600 mb-1">Width:</p>
              <p className="font-medium text-gray-900">
                {product.width} {product.width_unit || ''}
              </p>
            </div>
          )}

          {product.weight && (
            <div>
              <p className="text-sm text-gray-600 mb-1">Weight:</p>
              <p className="font-medium text-gray-900">
                {product.weight} {product.weight_unit || ''}
              </p>
            </div>
          )}

          {product.color && product.color !== 'N/A' && (
            <div>
              <p className="text-sm text-gray-600 mb-1">Color:</p>
              <p className="font-medium text-gray-900">{product.color}</p>
            </div>
          )}

          {product.pattern && product.pattern !== 'N/A' && (
            <div>
              <p className="text-sm text-gray-600 mb-1">Pattern:</p>
              <p className="font-medium text-gray-900">{product.pattern}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
