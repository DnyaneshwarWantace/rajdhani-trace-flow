import { useNavigate } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';

interface ProductStockErrorProps {
  error: string;
}

export default function ProductStockError({ error }: ProductStockErrorProps) {
  const navigate = useNavigate();

  return (
    <div className="p-6">
      <div className="max-w-2xl mx-auto text-center py-12">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-8 h-8 text-red-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Product Not Found</h2>
        <p className="text-gray-600 mb-6">{error || 'The product you are looking for does not exist.'}</p>
        <button
          onClick={() => navigate('/products')}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          Back to Products
        </button>
      </div>
    </div>
  );
}

