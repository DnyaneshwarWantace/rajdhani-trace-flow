import type { Product } from '@/types/product';
import { calculateStockStatus } from '@/utils/stockStatus';
import { Badge } from '@/components/ui/badge';
import { Package } from 'lucide-react';

interface ProductDetailHeaderProps {
  product: Product;
}

export default function ProductDetailHeader({ product }: ProductDetailHeaderProps) {
  const status = calculateStockStatus(product);
  
  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'in-stock':
        return 'default';
      case 'low-stock':
        return 'secondary';
      case 'out-of-stock':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  return (
    <div className="relative">
      {/* Image Section - Larger for page view */}
      <div className="relative h-80 bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="w-24 h-24 text-gray-400" />
          </div>
        )}

        {/* Status Badge */}
        <div className="absolute top-6 left-6">
          <Badge variant={getStatusVariant(status)} className="text-sm px-4 py-1.5 shadow-lg">
            {status.replace('-', ' ')}
          </Badge>
        </div>
      </div>

      {/* Title Section */}
      <div className="bg-white px-6 py-6 border-b border-gray-200">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-3">{product.name}</h1>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm text-gray-500 font-mono bg-gray-50 px-3 py-1 rounded-md">
              {product.id}
            </span>
            {product.category && (
              <Badge variant="outline" className="text-sm px-3 py-1">
                {product.category}
              </Badge>
            )}
            {product.subcategory && (
              <Badge variant="outline" className="text-sm px-3 py-1">
                {product.subcategory}
              </Badge>
            )}
            {product.color && (
              <Badge variant="outline" className="text-sm px-3 py-1">
                {product.color}
              </Badge>
            )}
            {product.pattern && (
              <Badge variant="outline" className="text-sm px-3 py-1">
                {product.pattern}
              </Badge>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

