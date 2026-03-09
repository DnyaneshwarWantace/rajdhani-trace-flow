import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, ArrowRight, Building2, Truck, CheckCircle, Clock } from 'lucide-react';
import { formatCurrency, formatDate } from '@/utils/formatHelpers';
import { ManageStockService, type StockOrder } from '@/services/manageStockService';

const statusConfig: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  pending: { label: 'Pending', color: 'bg-gray-100 text-gray-700', icon: Clock },
  approved: { label: 'Approved', color: 'bg-blue-100 text-blue-700', icon: CheckCircle },
  shipped: { label: 'Shipped', color: 'bg-orange-100 text-orange-700', icon: Truck },
  delivered: { label: 'Delivered', color: 'bg-green-100 text-green-700', icon: CheckCircle },
};

interface ManageStockOverviewProps {
  orders?: StockOrder[];
  loading?: boolean;
}

export default function ManageStockOverview({ orders: ordersFromParent, loading: parentLoading }: ManageStockOverviewProps = {}) {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<StockOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const useParentData = ordersFromParent !== undefined;
  const displayOrders = useParentData ? (ordersFromParent ?? []) : orders;
  const displayLoading = useParentData ? (parentLoading ?? false) : loading;

  useEffect(() => {
    if (useParentData) return;
    let cancelled = false;
    ManageStockService.getOrders({ limit: 5 })
      .then(({ data }) => {
        if (!cancelled) setOrders(data || []);
      })
      .catch(() => {
        if (!cancelled) setOrders([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [useParentData]);

  if (displayLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 h-full min-h-[280px] flex flex-col">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Manage Stock</h2>
        <div className="flex items-center justify-center flex-1 py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 h-full min-h-[280px] flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Manage Stock</h2>
        <button
          onClick={() => navigate('/manage-stock')}
          className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
        >
          View All
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {displayOrders.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 py-8">
          <ClipboardList className="w-12 h-12 text-gray-400 mb-3" />
          <p className="text-gray-500">No stock orders yet</p>
        </div>
      ) : (
        <div className="space-y-3 flex-1">
          {displayOrders.map((order) => {
            const status = statusConfig[order.status] || statusConfig.pending;
            const StatusIcon = status.icon;
            return (
              <div
                key={order.id}
                onClick={() => navigate('/manage-stock')}
                className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 bg-slate-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <ClipboardList className="w-5 h-5 text-slate-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {order.order_number}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                      <Building2 className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">{order.supplier}</span>
                    </div>
                    {order.orderDate && (
                      <p className="text-xs text-gray-400 mt-0.5">{formatDate(order.orderDate)}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 ml-3">
                  <div className="text-right">
                    <span className="text-base font-bold text-gray-900 whitespace-nowrap block">
                      {formatCurrency(order.totalCost)}
                    </span>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${status.color} whitespace-nowrap flex items-center gap-1`}>
                    <StatusIcon className="w-3 h-3" />
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
