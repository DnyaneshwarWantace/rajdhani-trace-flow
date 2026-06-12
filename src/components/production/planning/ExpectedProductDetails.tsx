import { Package, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDropdownVisualMaps } from '@/hooks/useDropdownVisualMaps';
import type { Product } from '@/types/product';

interface ExpectedProductDetailsProps {
  product: Product;
  onEdit?: () => void;
}

export default function ExpectedProductDetails({ product, onEdit }: ExpectedProductDetailsProps) {
  const { colorCodeMap, patternImageMap } = useDropdownVisualMaps();

  const fields = [
    { label: 'Product', value: product.name },
    product.category && { label: 'Category', value: product.category },
    product.length && { label: 'Length', value: `${product.length.replace(/[^\d.]/g, '')} ${product.length_unit || 'm'}` },
    product.width && { label: 'Width', value: `${product.width.replace(/[^\d.]/g, '')} ${product.width_unit || 'm'}` },
    product.weight && { label: 'GSM', value: `${product.weight.replace(/[^\d.]/g, '')} ${product.weight_unit || 'GSM'}` },
  ].filter(Boolean) as { label: string; value: string }[];

  const colorCode = product.color && product.color !== 'N/A' ? colorCodeMap[product.color] : null;
  const patternImg = product.pattern && product.pattern !== 'N/A' ? patternImageMap[product.pattern] : null;

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

      {product.color && product.color !== 'N/A' && (
        <div className="flex items-center gap-1.5">
          <span className="text-gray-300 text-xs">·</span>
          <span className="text-xs text-gray-500">Color:</span>
          <span className="flex items-center gap-1">
            {colorCode && (
              <span className="w-3.5 h-3.5 rounded-full border border-black/10 shrink-0 inline-block" style={{ backgroundColor: colorCode }} />
            )}
            <span className="text-xs font-semibold text-gray-800">{product.color}</span>
          </span>
        </div>
      )}

      {product.pattern && product.pattern !== 'N/A' && (
        <div className="flex items-center gap-1.5">
          <span className="text-gray-300 text-xs">·</span>
          <span className="text-xs text-gray-500">Pattern:</span>
          <span className="flex items-center gap-1">
            {patternImg && (
              <img src={patternImg} alt="" className="w-4 h-4 rounded object-cover border border-black/10 shrink-0" />
            )}
            <span className="text-xs font-semibold text-gray-800">{product.pattern}</span>
          </span>
        </div>
      )}

      {onEdit && (
        <Button variant="ghost" size="sm" onClick={onEdit} className="ml-auto h-6 px-2 text-xs">
          <Edit className="w-3 h-3 mr-1" /> Edit
        </Button>
      )}
    </div>
  );
}
