import { useNavigate } from 'react-router-dom';
import { User, ArrowRight, TrendingUp } from 'lucide-react';
import { formatCurrency } from '@/utils/formatHelpers';

interface CustomerData {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  totalOrders: number;
  totalRevenue: number;
}

interface TopCustomersProps {
  customers: CustomerData[];
  loading: boolean;
}

export default function TopCustomers({ customers, loading }: TopCustomersProps) {
  const navigate = useNavigate();

  // Sort by revenue
  const topCustomers = [...customers].sort((a, b) => b.totalRevenue - a.totalRevenue).slice(0, 5);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Top Customers</h2>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Top Customers</h2>
        <button
          onClick={() => navigate('/customers')}
          className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
        >
          View All
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {topCustomers.length === 0 ? (
        <div className="text-center py-8">
          <User className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500">No customers yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {topCustomers.map((customer, index) => (
            <div
              key={customer.id}
              onClick={() => navigate(`/customers/${customer.id}`)}
              className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <User className="w-5 h-5 text-indigo-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {customer.name}
                  </p>
                  <p className="text-xs text-gray-500">{customer.totalOrders} orders</p>
                </div>
              </div>

              <div className="flex items-center gap-2 ml-3">
                {index < 3 && (
                  <TrendingUp className="w-4 h-4 text-green-600" />
                )}
                <span className="text-sm font-semibold text-gray-900 whitespace-nowrap">
                  {formatCurrency(customer.totalRevenue, { full: true })}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
