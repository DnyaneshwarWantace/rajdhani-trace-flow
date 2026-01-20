import { useNavigate } from 'react-router-dom';
import { ShoppingCart, User, ArrowRight } from 'lucide-react';
import { formatCurrency } from '@/utils/formatHelpers';
import type { Order } from '@/services/orderService';

interface RecentOrdersProps {
  orders: Order[];
  loading: boolean;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-700' },
  accepted: { label: 'Accepted', color: 'bg-blue-100 text-blue-700' },
  in_production: { label: 'In Production', color: 'bg-purple-100 text-purple-700' },
  ready: { label: 'Ready', color: 'bg-indigo-100 text-indigo-700' },
  dispatched: { label: 'Dispatched', color: 'bg-orange-100 text-orange-700' },
  delivered: { label: 'Delivered', color: 'bg-green-100 text-green-700' },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-700' },
};

export default function RecentOrders({ orders, loading }: RecentOrdersProps) {
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Orders</h2>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Recent Orders</h2>
        <button
          onClick={() => navigate('/orders')}
          className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
        >
          View All
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-8">
          <ShoppingCart className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500">No orders yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.slice(0, 5).map((order) => {
            const status = statusConfig[order.status] || statusConfig.pending;
            return (
              <div
                key={order.id}
                onClick={() => navigate(`/orders/${order.id}`)}
                className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
              >
                {/* Left Side - Icon, Order Number, Customer Name */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <ShoppingCart className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {order.orderNumber || order.id}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                      <User className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">{order.customerName}</span>
                    </div>
                  </div>
                </div>

                {/* Right Side - Total Value and Status */}
                <div className="flex items-center gap-3 ml-3">
                  <div className="text-right">
                    <span className="text-base font-bold text-gray-900 whitespace-nowrap block">
                      {formatCurrency(order.totalAmount)}
                    </span>
                    {order.gstAmount && parseFloat(order.gstAmount.toString()) > 0 && (
                      <span className="text-xs text-gray-500 whitespace-nowrap">
                        (incl. GST)
                      </span>
                    )}
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${status.color} whitespace-nowrap`}>
                    {status.label}
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
