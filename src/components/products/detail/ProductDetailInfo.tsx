import type { Product } from '@/types/product';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ProductDetailInfoProps {
  product: Product;
}

export default function ProductDetailInfo({ product }: ProductDetailInfoProps) {
  const infoItems = [
    { label: 'Product ID', value: product.id, type: 'text' },
    { label: 'Category', value: product.category, type: 'badge' },
    { label: 'Subcategory', value: product.subcategory, type: 'badge', optional: true },
    { label: 'Color', value: product.color, type: 'badge', optional: true },
    { label: 'Pattern', value: product.pattern, type: 'badge', optional: true },
    { label: 'Unit', value: product.unit, type: 'text' },
  ].filter(item => item.value || !item.optional);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base sm:text-lg">Basic Information</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {infoItems.map((item, index) => (
            <div key={index} className="space-y-1 min-w-0">
              <p className="text-xs sm:text-sm text-gray-600">{item.label}</p>
              <p className="text-xs sm:text-sm font-medium text-gray-900 font-mono break-words">
                {item.value || 'N/A'}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

