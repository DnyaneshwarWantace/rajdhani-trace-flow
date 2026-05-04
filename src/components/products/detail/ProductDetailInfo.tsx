import type { Product } from '@/types/product';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import ProductAttributePreview from '@/components/ui/ProductAttributePreview';

interface ProductDetailInfoProps {
  product: Product;
}

function isMeaningfulAttr(s?: string | null): boolean {
  if (s == null) return false;
  const t = String(s).trim();
  if (!t) return false;
  const low = t.toLowerCase();
  return low !== 'n/a' && low !== 'na';
}

export default function ProductDetailInfo({ product }: ProductDetailInfoProps) {
  const showAppearance =
    isMeaningfulAttr(product.color) ||
    isMeaningfulAttr(product.pattern) ||
    (isMeaningfulAttr(product.length) && isMeaningfulAttr(product.width));

  const infoItems = [
    { label: 'Product ID', value: product.id, type: 'text' },
    { label: 'Category', value: product.category, type: 'badge' },
    { label: 'Subcategory', value: product.subcategory, type: 'badge', optional: true },
    { label: 'Unit', value: product.unit, type: 'text' },
  ].filter(item => item.value || !item.optional);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base sm:text-lg">Basic Information</CardTitle>
      </CardHeader>
      <CardContent>
        {showAppearance && (
          <div className="mb-4 pb-4 border-b border-gray-100">
            <p className="text-xs sm:text-sm text-gray-600 mb-2">Color, pattern & dimensions</p>
            <ProductAttributePreview
              color={product.color}
              pattern={product.pattern}
              length={product.length}
              width={product.width}
              lengthUnit={product.length_unit}
              widthUnit={product.width_unit}
            />
          </div>
        )}
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

