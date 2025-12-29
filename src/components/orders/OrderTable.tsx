import { ShoppingCart, User, Calendar, CheckCircle, Clock, Factory, Package, Truck, AlertTriangle, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatIndianDate } from '@/utils/formatHelpers';
import type { Order } from '@/services/orderService';
import { TruncatedText } from '@/components/ui/TruncatedText';

interface OrderTableProps {
  orders: Order[];
  onStatusUpdate: (orderId: string, newStatus: string) => void;
  onViewDetails: (order: Order) => void;
}

const statusConfig: Record<string, { label: string; icon: any; color: string }> = {
  pending: { label: 'Pending', icon: Clock, color: 'bg-yellow-100 text-yellow-800' },
  accepted: { label: 'Accepted', icon: CheckCircle, color: 'bg-blue-100 text-blue-800' },
  in_production: { label: 'In Production', icon: Factory, color: 'bg-purple-100 text-purple-800' },
  ready: { label: 'Ready', icon: Package, color: 'bg-indigo-100 text-indigo-800' },
  dispatched: { label: 'Dispatched', icon: Truck, color: 'bg-orange-100 text-orange-800' },
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
                Order
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                Customer
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                Items
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                Total
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                Date
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {orders.map((order) => {
              const status = statusConfig[order.status] || statusConfig.pending;
              const StatusIcon = status.icon;

              return (
                <tr key={order.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => onViewDetails(order)}>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <ShoppingCart className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-gray-900">
                          {order.orderNumber || order.id}
                        </div>
                        <div className="text-sm text-gray-500">
                          {order.items?.length || 0} item{(order.items?.length || 0) !== 1 ? 's' : ''}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <div className="text-sm text-gray-900 truncate">
                        <TruncatedText text={order.customerName} maxLength={20} as="span" />
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-900">
                    <div className="max-w-md">
                      {order.items && order.items.length > 0 ? (
                        <div className="space-y-1">
                          {order.items.map((item, idx) => (
                            <div key={idx} className="text-xs">
                              <div className="font-medium text-gray-900">{item.productName}</div>
                              <div className="text-gray-600 flex flex-wrap gap-x-2 gap-y-0.5">
                                <span>Qty: {item.quantity} {item.count_unit || item.unit || 'units'}</span>
                                {item.length && item.width && (
                                  <span>• Size: {item.length}{item.length_unit} × {item.width}{item.width_unit}</span>
                                )}
                                {item.weight && (
                                  <span>• {item.weight}{item.weight_unit}</span>
                                )}
                                {item.color && (
                                  <span>• {item.color}</span>
                                )}
                                {item.pattern && (
                                  <span>• {item.pattern}</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-500">No items</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {formatCurrency(order.totalAmount)}
                    </div>
                    {order.outstandingAmount > 0 && (
                      <div className="text-xs text-red-600">
                        Outstanding: {formatCurrency(order.outstandingAmount)}
                      </div>
                    )}
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
                      {formatIndianDate(order.orderDate)}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      {order.status === 'pending' && (
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onStatusUpdate(order.id, 'accepted');
                          }}
                          className="text-xs bg-blue-600 hover:bg-blue-700"
                        >
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Accept
                        </Button>
                      )}
                      {order.status === 'accepted' && (
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onStatusUpdate(order.id, 'dispatched');
                          }}
                          className="text-xs bg-orange-600 hover:bg-orange-700"
                        >
                          <Package className="w-3 h-3 mr-1" />
                          Dispatch
                        </Button>
                      )}
                      {order.status === 'dispatched' && (
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onStatusUpdate(order.id, 'delivered');
                          }}
                          className="text-xs bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Deliver
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          onViewDetails(order);
                        }}
                        className="text-xs"
                      >
                        <Eye className="w-3 h-3 mr-1" />
                        View
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


