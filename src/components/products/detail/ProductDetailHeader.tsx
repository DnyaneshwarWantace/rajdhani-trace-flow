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

    </div>
  );
}

