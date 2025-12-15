import { Card, CardContent } from '@/components/ui/card';
import { Package, CheckCircle, X } from 'lucide-react';
import type { Product } from '@/types/product';
import { TruncatedText } from '@/components/ui/TruncatedText';

interface SelectedProductCardProps {
  product: Product;
  onClear: () => void;
}

export default function SelectedProductCard({ product, onClear }: SelectedProductCardProps) {
  return (
    <Card className="border-primary-200 bg-primary-50">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Package className="w-5 h-5 text-primary-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                <p className="font-semibold text-gray-900">
                  <TruncatedText text={product.name} maxLength={60} />
                </p>
              </div>
              {product.category && (
                <p className="text-sm text-gray-600">
                  {product.category}
                  {product.subcategory && ` / ${product.subcategory}`}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClear}
            className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </CardContent>
    </Card>
  );
}


