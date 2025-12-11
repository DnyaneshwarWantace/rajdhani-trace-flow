import { useNavigate } from 'react-router-dom';
import type { Product } from '@/types/product';
import { ArrowLeft } from 'lucide-react';
import { TruncatedText } from '@/components/ui/TruncatedText';

interface ProductStockHeaderProps {
  product: Product;
  productId: string;
}

export default function ProductStockHeader({ product, productId }: ProductStockHeaderProps) {
  const navigate = useNavigate();

  return (
    <div className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-4 min-w-0 flex-1">
          <button
            onClick={() => navigate(`/products/${productId}`)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Individual Stock</h1>
            <div className="mt-1 min-w-0">
              <TruncatedText
                text={product.name}
                maxLength={60}
                className="text-sm text-gray-600 break-words"
                as="p"
              />
            </div>
          </div>
        </div>
        <button
          onClick={() => navigate(`/products/${productId}`)}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap flex-shrink-0"
        >
          View Product Details
        </button>
      </div>
    </div>
  );
}

