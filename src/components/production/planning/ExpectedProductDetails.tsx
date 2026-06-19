import { Package, Ruler, Weight, Tag, Palette, Boxes } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { useDropdownVisualMaps } from '@/hooks/useDropdownVisualMaps';
import type { Product } from '@/types/product';
import ColorSwatch from '@/components/ui/ColorSwatch';

interface ExpectedProductDetailsProps {
  product: Product;
  plannedQuantity?: number;
  materialsCount?: number;
  countUnit?: string;
}

export default function ExpectedProductDetails({
  product,
  plannedQuantity,
  materialsCount,
  countUnit,
}: ExpectedProductDetailsProps) {
  const { colorCodeMap, patternImageMap } = useDropdownVisualMaps();

  const colorCode = product.color && product.color !== 'N/A' && product.color !== 'NA' ? colorCodeMap[product.color] : null;
  const patternImg = product.pattern && product.pattern !== 'N/A' && product.pattern !== 'NA' ? patternImageMap[product.pattern] : null;

  const dimStr = product.length && product.width
    ? `${product.length.replace(/[^\d.]/g, '')}${product.length_unit || 'm'} × ${product.width.replace(/[^\d.]/g, '')}${product.width_unit || 'm'}`
    : null;
  const gsmStr = product.weight && product.weight !== 'N/A' ? `${product.weight.replace(/[^\d.]/g, '')} ${product.weight_unit || 'GSM'}` : null;

  return (
    <Card className="bg-white rounded-2xl border border-gray-150 shadow-sm overflow-hidden mb-6">
      <div className="flex">
        {/* Left Visual Area — full height of card, fixed width aspect-like */}
        <div className="relative w-[35%] sm:w-[22%] md:w-[15%] shrink-0 bg-gray-50 flex items-center justify-center border-r border-gray-100" style={{ minHeight: 120 }}>
          {product.image_url ? (
            <img src={product.image_url} alt={product.name} className="absolute inset-0 w-full h-full object-cover" />
          ) : patternImg ? (
            <img src={patternImg} alt={product.pattern || ''} className="absolute inset-0 w-full h-full object-cover" />
          ) : colorCode ? (
            <div className="absolute inset-0" style={{ backgroundColor: colorCode }} />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <Package className="w-8 h-8 text-gray-300" />
            </div>
          )}
        </div>

        {/* Right Details Area */}
        <div className="flex-1 min-w-0 p-3 sm:p-4 flex flex-col justify-between">
          <div>
            {/* Header: Title & Category */}
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <p className="text-sm sm:text-base font-bold text-gray-900 leading-tight line-clamp-2">{product.name}</p>
              {product.category && (
                <span className="text-[10px] text-gray-400 font-semibold bg-gray-100 px-2 py-0.5 rounded-full shrink-0">
                  {product.category}
                </span>
              )}
            </div>

            {/* Color Dot & Name */}
            {product.color && product.color !== 'N/A' && product.color !== 'NA' && (
              <div className="flex items-center gap-1.5 mb-1.5">
                {colorCode ? (
                  <ColorSwatch colorCode={colorCode} className="w-3 h-3 border border-gray-200" />
                ) : (
                  <div className="w-3 h-3 rounded-full bg-gray-300 shrink-0" />
                )}
                <span className="text-xs text-gray-605 font-medium">{product.color}</span>
              </div>
            )}

            {/* Pattern / Texture */}
            {product.pattern && product.pattern !== 'N/A' && product.pattern !== 'NA' && (
              <div className="flex items-center gap-1.5 mb-1.5">
                {patternImg ? (
                  <img src={patternImg} alt="" className="w-4 h-4 rounded object-cover border border-gray-300 shrink-0" />
                ) : (
                  <Tag className="w-3 h-3 text-gray-400" />
                )}
                <span className="text-xs text-gray-605 font-medium">{product.pattern}</span>
              </div>
            )}

            {/* Dimensions & GSM */}
            {(dimStr || gsmStr) && (
              <p className="text-xs text-gray-500 mb-1">
                {[dimStr, gsmStr].filter(Boolean).join(' · ')}
              </p>
            )}
          </div>

          {/* Batch Stats inside details section, shown side-by-side */}
          {(plannedQuantity !== undefined || materialsCount !== undefined) && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-2 border-t border-gray-100 mt-2">
              {plannedQuantity !== undefined && plannedQuantity > 0 && (
                <div className="flex items-center gap-1.5 text-xs text-gray-600">
                  <Package className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                  <span className="font-bold text-gray-900">{plannedQuantity} {countUnit || 'rolls'}</span>
                  <span className="text-[9px] text-gray-400 font-semibold uppercase">Target</span>
                </div>
              )}
              {materialsCount !== undefined && (
                <div className="flex items-center gap-1.5 text-xs text-gray-600">
                  <Boxes className="w-3.5 h-3.5 text-green-500 shrink-0" />
                  <span className="font-bold text-gray-900">{materialsCount}</span>
                  <span className="text-[9px] text-gray-400 font-semibold uppercase">Materials</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
