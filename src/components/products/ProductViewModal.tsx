import type { Product } from '@/types/product';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import ProductDetailHeader from './detail/ProductDetailHeader';
import ProductDetailStats from './detail/ProductDetailStats';
import ProductDetailInfo from './detail/ProductDetailInfo';
import ProductDetailDimensions from './detail/ProductDetailDimensions';
import ProductDetailStock from './detail/ProductDetailStock';
import ProductDetailActions from './detail/ProductDetailActions';

interface ProductViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  onEdit?: (product: Product) => void;
  onDuplicate?: (product: Product) => void;
  onStockAdjust?: (product: Product) => void;
  onProduction?: (product: Product) => void;
}

export default function ProductViewModal({
  isOpen,
  onClose,
  product,
  onEdit,
  onDuplicate,
  onStockAdjust,
  onProduction,
}: ProductViewModalProps) {
  if (!isOpen || !product) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden p-0">
        <div className="overflow-y-auto max-h-[90vh]">
          {/* Header with Image */}
          <ProductDetailHeader product={product} onClose={onClose} />

          {/* Stats Cards */}
          <ProductDetailStats product={product} />

          {/* Content Sections */}
          <div className="p-6 space-y-6">
            {/* Basic Information */}
            <ProductDetailInfo product={product} />

            {/* Dimensions */}
            <ProductDetailDimensions product={product} />

            {/* Stock Management */}
            <ProductDetailStock product={product} />

            {/* Notes */}
            {product.notes && (
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <h3 className="text-sm font-semibold text-gray-900 mb-2">Notes</h3>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{product.notes}</p>
              </div>
            )}
          </div>

          {/* Actions Footer */}
          <ProductDetailActions
            onEdit={onEdit ? () => onEdit(product) : undefined}
            onDuplicate={onDuplicate ? () => onDuplicate(product) : undefined}
            onStockAdjust={onStockAdjust ? () => onStockAdjust(product) : undefined}
            onProduction={onProduction ? () => onProduction(product) : undefined}
            onClose={onClose}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
