import { useNavigate } from 'react-router-dom';
import type { Product } from '@/types/product';
import { ArrowLeft } from 'lucide-react';

interface ProductStockHeaderProps {
  product: Product;
  productId: string;
}

export default function ProductStockHeader({ product, productId }: ProductStockHeaderProps) {
  const navigate = useNavigate();

  return (
    <div className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate(`/products/${productId}`)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Individual Stock</h1>
            <p className="text-sm text-gray-600 mt-1">{product.name}</p>
          </div>
        </div>
        <button
          onClick={() => navigate(`/products/${productId}`)}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          View Product Details
        </button>
      </div>
    </div>
  );
}

