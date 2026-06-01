import { Package, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Product } from '@/types/product';

interface ExpectedProductDetailsProps {
  product: Product;
  onEdit?: () => void;
}

export default function ExpectedProductDetails({ product, onEdit }: ExpectedProductDetailsProps) {
  const fields = [
    { label: 'Product', value: product.name },
    product.category && { label: 'Category', value: product.category },
    product.length && { label: 'Length', value: `${product.length} ${product.length_unit || ''}` },
    product.width && { label: 'Width', value: `${product.width} ${product.width_unit || ''}` },
    product.weight && { label: 'GSM', value: `${product.weight} ${product.weight_unit || ''}` },
    product.color && product.color !== 'N/A' && { label: 'Color', value: product.color },
    product.pattern && product.pattern !== 'N/A' && { label: 'Pattern', value: product.pattern },
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <div className="flex items-center gap-4 mb-4 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200 flex-wrap">
      <div className="flex items-center gap-1.5 text-gray-500 flex-shrink-0">
        <Package className="w-4 h-4" />
        <span className="text-xs font-medium">Product</span>
      </div>
      {fields.map((f, i) => (
        <div key={i} className="flex items-center gap-1.5">
          {i > 0 && <span className="text-gray-300 text-xs">·</span>}
          <span className="text-xs text-gray-500">{f.label}:</span>
          <span className="text-xs font-semibold text-gray-800">{f.value}</span>
        </div>
      ))}
      {onEdit && (
        <Button variant="ghost" size="sm" onClick={onEdit} className="ml-auto h-6 px-2 text-xs">
          <Edit className="w-3 h-3 mr-1" /> Edit
        </Button>
      )}
    </div>
  );
}
