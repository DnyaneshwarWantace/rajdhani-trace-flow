import { useState } from 'react';
import type { Product } from '@/types/product';
import { formatStockRolls } from '@/utils/stockFormatter';
import { calculateStockStatus } from '@/utils/stockStatus';
import { formatIndianNumberWithDecimals } from '@/utils/formatHelpers';
import { Package, Edit, Eye, Copy, BarChart3, Factory, QrCode, FileText, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import ImageViewDialog from '@/components/ui/ImageViewDialog';

interface ProductCardProps {
  product: Product;
  onEdit?: (product: Product) => void;
  onDuplicate?: (product: Product) => void;
  onView?: (product: Product) => void;
  onStock?: (product: Product) => void;
  onProduction?: (product: Product) => void;
  onQRCode?: (product: Product) => void;
  onDelete?: (product: Product) => void;
  canDelete?: boolean;
  showActions?: boolean;
  variant?: 'default' | 'compact' | 'detailed';
  isSelected?: boolean;
  onClick?: () => void;
}

export default function ProductCard({
  product,
  onEdit,
  onDuplicate,
  onView,
  onStock,
  onProduction,
  onQRCode,
  onDelete,
  canDelete = false,
  showActions = true,
  variant: _variant = 'default',
  isSelected = false,
  onClick,
}: ProductCardProps) {
  const [isImageViewOpen, setIsImageViewOpen] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'in-stock':
      case 'active':
        return 'bg-green-500';
      case 'low-stock':
        return 'bg-orange-500';
      case 'out-of-stock':
        return 'bg-red-500';
      case 'inactive':
        return 'bg-gray-400';
      case 'discontinued':
        return 'bg-red-500';
      default:
        return 'bg-gray-400';
    }
  };

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl border transition-all duration-200 overflow-hidden group ${
        isSelected
          ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-300 shadow-lg'
          : 'border-gray-200 hover:border-primary-300 hover:shadow-lg'
      } ${onClick ? 'cursor-pointer' : ''}`}
    >
      {/* Image Section - Compact */}
      <div className="relative h-40 bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            onClick={(e) => {
              e.stopPropagation();
              setIsImageViewOpen(true);
            }}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 cursor-pointer"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100">
            <Package className="w-12 h-12 text-primary-400" />
          </div>
        )}
        
        {/* Status Indicator - Top Right */}
        <div className="absolute top-2 right-2 flex items-center gap-2">
          {product.has_recipe && (
            <Badge className="bg-blue-500 text-white text-xs px-2 py-0.5 flex items-center gap-1">
              <FileText className="w-3 h-3" />
              Recipe
            </Badge>
          )}
          {(() => {
            const calculatedStatus = calculateStockStatus(product);
            return (
              <div className={`w-3 h-3 rounded-full ${getStatusColor(calculatedStatus)} shadow-lg`} />
            );
          })()}
        </div>
      </div>

      {/* Content Section - Clean and Compact */}
      <div className="p-3">
        {/* Title */}
        <h3 className="font-semibold text-gray-900 text-xs mb-2 leading-tight line-clamp-2">
          {product.name}
        </h3>

        {/* Essential Info - Single Row */}
        <div className="space-y-1.5 mb-2">
          {/* QR Code */}
          {product.qr_code && onQRCode && (
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-gray-500">QR</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onQRCode(product);
                }}
                className="p-1 text-primary-600 hover:bg-primary-50 rounded transition-colors"
                title={`QR Code: ${product.qr_code}`}
              >
                <QrCode className="w-3 h-3" />
              </button>
            </div>
          )}
          {/* Category */}
          <div className="flex items-center justify-between text-[10px] gap-1">
            <span className="text-gray-500 flex-shrink-0">Cat</span>
            <span className="font-medium text-gray-900 text-right truncate min-w-0">{product.category}</span>
          </div>

          {/* Color - Only show if available and not N/A */}
          {product.color && product.color.trim() !== '' && product.color.toLowerCase() !== 'n/a' && (
            <div className="flex items-center justify-between text-[10px] gap-1">
              <span className="text-gray-500 flex-shrink-0">Color</span>
              <span className="font-medium text-gray-900 text-right truncate min-w-0">{product.color}</span>
            </div>
          )}

          {/* Pattern - Only show if available and not N/A */}
          {product.pattern && product.pattern.trim() !== '' && product.pattern.toLowerCase() !== 'n/a' && (
            <div className="flex items-center justify-between text-[10px] gap-1">
              <span className="text-gray-500 flex-shrink-0">Pattern</span>
              <span className="font-medium text-gray-900 text-right truncate min-w-0">{product.pattern}</span>
            </div>
          )}

          {/* Stock */}
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-gray-500">Stock</span>
            <span className="font-bold text-primary-600">
              {product.individual_stock_tracking && product.individual_product_stats
                ? `${formatStockRolls(product.individual_product_stats.available)} / ${product.individual_product_stats.total}`
                : formatStockRolls(product.current_stock)}
              {product.individual_stock_tracking && !product.individual_product_stats && (
                <span className="text-gray-400 ml-1">/ {product.individual_products_count || 0}</span>
              )}
            </span>
          </div>

          {/* Dimensions with SQM and Weight */}
          <div className="space-y-0.5">
            <div className="flex items-center justify-between text-[10px] gap-1">
              <span className="text-gray-500 flex-shrink-0">Dim</span>
              <span className="font-medium text-gray-900 text-right truncate min-w-0">
                {product.dimensions_display || `${product.length}${product.length_unit} × ${product.width}${product.width_unit}`}
              </span>
            </div>
            {product.sqm && (
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-gray-500">SQM</span>
                <span className="font-medium text-gray-900 truncate">{formatIndianNumberWithDecimals(product.sqm, 2)}</span>
              </div>
            )}
            {product.weight && (
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-gray-500">Weight</span>
                <span className="font-medium text-gray-900 truncate">{product.weight} {product.weight_unit}</span>
              </div>
            )}
          </div>
        </div>

        {/* Actions - Only if needed */}
        {showActions && (
          <div className="pt-2 border-t border-gray-100">
            <div className="grid grid-cols-2 gap-1.5">
              {onView && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onView(product);
                  }}
                  className="flex items-center justify-center gap-1 px-2 py-1.5 text-[10px] font-medium text-primary-600 bg-primary-50 rounded-md hover:bg-primary-100 transition-colors"
                >
                  <Eye className="w-3 h-3" />
                  View
                </button>
              )}
              {onEdit && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(product);
                  }}
                  className="flex items-center justify-center gap-1 px-2 py-1.5 text-[10px] font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                >
                  <Edit className="w-3 h-3" />
                  Edit
                </button>
              )}
            </div>
            {(onDuplicate || onStock || onProduction || (canDelete && onDelete)) && (
              <div className={`grid ${canDelete && onDelete ? 'grid-cols-4' : 'grid-cols-3'} gap-1.5 mt-1.5`}>
                {onDuplicate && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDuplicate(product);
                    }}
                    className="flex items-center justify-center px-1.5 py-1.5 text-[10px] font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                    title="Duplicate"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                )}
                {onStock && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onStock(product);
                    }}
                    className="flex items-center justify-center px-1.5 py-1.5 text-[10px] font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors"
                    title="Stock"
                  >
                    <BarChart3 className="w-3 h-3" />
                  </button>
                )}
                {onProduction && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onProduction(product);
                    }}
                    className="flex items-center justify-center px-1.5 py-1.5 text-[10px] font-medium text-green-600 bg-green-50 rounded-md hover:bg-green-100 transition-colors"
                    title="Produce"
                  >
                    <Factory className="w-3 h-3" />
                  </button>
                )}
                {canDelete && onDelete && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(product);
                    }}
                    className="flex items-center justify-center px-1.5 py-1.5 text-[10px] font-medium text-red-600 bg-red-50 rounded-md hover:bg-red-100 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Image View Dialog */}
      {product.image_url && (
        <ImageViewDialog
          isOpen={isImageViewOpen}
          onClose={() => setIsImageViewOpen(false)}
          imageUrl={product.image_url}
          alt={product.name}
        />
      )}
    </div>
  );
}
