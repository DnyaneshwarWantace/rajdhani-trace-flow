import { Package, Building2, Calendar, CheckCircle, Clock, Truck, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatIndianDate } from '@/utils/formatHelpers';
import type { StockOrder } from '@/types/manageStock';
import { TruncatedText } from '@/components/ui/TruncatedText';

interface OrderTableProps {
  orders: StockOrder[];
  onStatusUpdate: (orderId: string, newStatus: StockOrder['status']) => void;
  onViewDetails: (order: StockOrder) => void;
}

const statusConfig = {
  ordered: { label: 'Ordered', icon: Clock, color: 'bg-gray-100 text-gray-800' },
  pending: { label: 'Pending', icon: Clock, color: 'bg-gray-100 text-gray-800' },
  approved: { label: 'Approved', icon: CheckCircle, color: 'bg-blue-100 text-blue-800' },
  shipped: { label: 'Shipped', icon: Truck, color: 'bg-yellow-100 text-yellow-800' },
  'in-transit': { label: 'In Transit', icon: Truck, color: 'bg-yellow-100 text-yellow-800' },
  delivered: { label: 'Delivered', icon: CheckCircle, color: 'bg-green-100 text-green-800' },
  cancelled: { label: 'Cancelled', icon: AlertTriangle, color: 'bg-red-100 text-red-800' },
};

export default function OrderTable({ orders, onStatusUpdate, onViewDetails }: OrderTableProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                Material
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                Supplier
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                Quantity
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                Total Cost
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                Expected Delivery
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {orders.map((order) => {
              const status = statusConfig[order.status];
              const StatusIcon = status.icon;

              return (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-gray-900">
                          <TruncatedText text={order.materialName} maxLength={40} as="span" />
                        </div>
                        <div className="text-sm text-gray-500">{order.order_number}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-900">{order.supplier}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                    {order.quantity} {order.unit}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{formatCurrency(order.totalCost)}</div>
                    <div className="text-xs text-gray-500">
                      {order.costPerUnit > 0 ? formatCurrency(order.costPerUnit) : '₹0'} per {order.unit}
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 w-fit ${status.color}`}>
                      <StatusIcon className="w-3 h-3" />
                      {status.label}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      {formatIndianDate(order.expectedDelivery)}
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {(order.status === 'ordered' || order.status === 'pending') && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onStatusUpdate(order.id, 'approved')}
                          className="text-xs"
                        >
                          Approve
                        </Button>
                      )}
                      {order.status === 'approved' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onStatusUpdate(order.id, 'in-transit')}
                          className="text-xs"
                        >
                          Ship
                        </Button>
                      )}
                      {(order.status === 'shipped' || order.status === 'in-transit') && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onStatusUpdate(order.id, 'delivered')}
                          className="text-xs"
                        >
                          Deliver
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => onViewDetails(order)}
                        className="text-xs"
                      >
                        Details
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

