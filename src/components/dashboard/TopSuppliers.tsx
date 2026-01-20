import { useNavigate } from 'react-router-dom';
import { Building2, ArrowRight, Package } from 'lucide-react';
import { formatCurrency } from '@/utils/formatHelpers';

interface SupplierData {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  totalOrders: number;
  totalSpent: number;
}

interface TopSuppliersProps {
  suppliers: SupplierData[];
  loading: boolean;
}

export default function TopSuppliers({ suppliers, loading }: TopSuppliersProps) {
  const navigate = useNavigate();

  // Sort by total spent
  const topSuppliers = [...suppliers].sort((a, b) => b.totalSpent - a.totalSpent).slice(0, 5);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Top Suppliers</h2>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Top Suppliers</h2>
        <button
          onClick={() => navigate('/suppliers')}
          className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
        >
          View All
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {topSuppliers.length === 0 ? (
        <div className="text-center py-8">
          <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500">No suppliers yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {topSuppliers.map((supplier) => (
            <div
              key={supplier.id}
              onClick={() => navigate(`/suppliers/${supplier.id}`)}
              className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-10 h-10 bg-teal-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-5 h-5 text-teal-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {supplier.name}
                  </p>
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    <Package className="w-3 h-3" />
                    {supplier.totalOrders} orders
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 ml-3">
                <span className="text-sm font-semibold text-gray-900 whitespace-nowrap">
                  {formatCurrency(supplier.totalSpent)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
