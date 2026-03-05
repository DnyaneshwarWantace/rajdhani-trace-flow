import { useNavigate } from 'react-router-dom';
import { Package, ArrowRight, AlertTriangle } from 'lucide-react';
import type { Product } from '@/types/product';

interface InventoryAlertsProps {
  products: Product[];
  loading: boolean;
}

export default function InventoryAlerts({ products, loading }: InventoryAlertsProps) {
  const navigate = useNavigate();

  // Filter products with low or out of stock
  const lowStockProducts = products.filter((product) => {
    const stock = product.current_stock || 0;
    const minStock = product.min_stock_level || 0;
    return stock <= minStock || stock === 0;
  });

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 h-full min-h-[280px] flex flex-col">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Inventory Alerts</h2>
        <div className="flex items-center justify-center flex-1 py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 h-full flex flex-col min-h-[280px]">
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <h2 className="text-lg font-semibold text-gray-900">Inventory Alerts</h2>
        <button
          onClick={() => navigate('/products')}
          className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
        >
          View All
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {lowStockProducts.length === 0 ? (
        <div className="text-center py-8 flex-1 flex flex-col items-center justify-center">
          <Package className="w-12 h-12 text-green-400 mx-auto mb-3" />
          <p className="text-gray-500">All products are well stocked!</p>
        </div>
      ) : (
        <div className="space-y-3 flex-1 min-h-0">
          {lowStockProducts.slice(0, 5).map((product) => {
            const isOutOfStock = (product.current_stock || 0) === 0;
            const stockStatus = isOutOfStock ? 'Out of Stock' : 'Low Stock';
            const statusColor = isOutOfStock ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700';

            return (
              <div
                key={product.id || product._id}
                onClick={() => navigate(`/products/${product.id || product._id}`)}
                className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className={`w-10 h-10 ${isOutOfStock ? 'bg-red-50' : 'bg-orange-50'} rounded-lg flex items-center justify-center flex-shrink-0`}>
                    {isOutOfStock ? (
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                    ) : (
                      <Package className="w-5 h-5 text-orange-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {product.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {product.category} {product.subcategory ? `• ${product.subcategory}` : ''}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-3">
                  <span className="text-sm text-gray-700 font-medium whitespace-nowrap">
                    {product.current_stock || 0} / {product.min_stock_level || 0}
                  </span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor} whitespace-nowrap`}>
                    {stockStatus}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
