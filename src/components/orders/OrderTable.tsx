import { ShoppingCart, User, Calendar, CheckCircle, Clock, Factory, Package, Truck, AlertTriangle, Eye, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatIndianDate } from '@/utils/formatHelpers';
import type { Order } from '@/services/orderService';
import { TruncatedText } from '@/components/ui/TruncatedText';
import OrderProductionInfo from './OrderProductionInfo';

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
  dispatched: { label: 'Shipped', icon: Truck, color: 'bg-orange-100 text-orange-800' },
  delivered: { label: 'Delivered', icon: CheckCircle, color: 'bg-green-100 text-green-800' },
  cancelled: { label: 'Cancelled', icon: AlertTriangle, color: 'bg-red-100 text-red-800' },
};

export default function OrderTable({ orders, onStatusUpdate, onViewDetails }: OrderTableProps) {

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full table-fixed">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider w-[12%] min-w-[100px]">
                Order
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider w-[18%] min-w-[120px]">
                Customer & Total
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider w-[20%] min-w-[140px]">
                Items
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider w-[12%] min-w-[90px]">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider w-[22%] min-w-[220px]">
                Date & Production
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider w-[16%] min-w-[120px]">
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
                    <div className="flex items-start gap-2">
                      <User className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <div className="text-sm text-gray-900 truncate">
                          <TruncatedText text={order.customerName} maxLength={18} as="span" />
                        </div>
                        <div className="text-sm font-medium text-gray-900 mt-1">
                          {formatCurrency(order.totalAmount)}
                        </div>
                        {order.outstandingAmount > 0 && (
                          <div className="text-xs text-red-600">
                            Due: {formatCurrency(order.outstandingAmount)}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-900">
                    <div className="max-w-[200px]">
                      {order.items && order.items.length > 0 ? (
                        <div className="space-y-1">
                          {order.items.slice(0, 2).map((item, idx) => (
                            <div key={idx} className="text-xs">
                              <div className="font-medium text-gray-900 truncate">
                                <TruncatedText text={item.productName} maxLength={25} as="span" />
                              </div>
                              <div className="text-gray-600 truncate">
                                Qty: {Number(item.quantity).toFixed(2)} {item.count_unit || item.unit || 'units'}
                              </div>
                            </div>
                          ))}
                          {order.items.length > 2 && (
                            <div className="text-xs text-gray-500">
                              +{order.items.length - 2} more item{order.items.length - 2 > 1 ? 's' : ''}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-500">No items</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 w-fit ${status.color}`}>
                      <StatusIcon className="w-3 h-3" />
                      {status.label}
                    </span>
                  </td>
                  <td className="px-4 py-4 w-[22%] min-w-[220px]" onClick={(e) => e.stopPropagation()}>
                    <div className="space-y-1 min-w-[200px]">
                      <div className="space-y-0.5 text-sm">
                        <div className="flex items-center gap-1 text-gray-900">
                          <Calendar className="w-3 h-3 text-gray-400 shrink-0" />
                          <span className="text-xs text-gray-600">Order:</span>
                          <span>{formatIndianDate(order.orderDate)}</span>
                        </div>
                        {order.expectedDelivery && (() => {
                          const expectedDate = new Date(order.expectedDelivery.split('T')[0]);
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          expectedDate.setHours(0, 0, 0, 0);
                          const notDelivered = order.status !== 'delivered';
                          const isOverdue = notDelivered && expectedDate < today;
                          return (
                            <div className={`flex items-center gap-1 ${isOverdue ? 'text-red-600 font-medium' : 'text-gray-900'}`}>
                              <Calendar className={`w-3 h-3 shrink-0 ${isOverdue ? 'text-red-500' : 'text-gray-400'}`} />
                              <span className="text-xs text-gray-600">Expected:</span>
                              <span>{formatIndianDate(order.expectedDelivery)}</span>
                            </div>
                          );
                        })()}
                      </div>
                      {(order.status === 'pending' || order.status === 'accepted') ? (
                        <div className="text-xs">
                          <OrderProductionInfo order={order} compact />
                        </div>
                      ) : (
                        <div className="min-h-[3.5rem]" aria-hidden />
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center justify-end gap-2">
                      {order.status === 'pending' && (
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onStatusUpdate(order.id, 'accepted');
                          }}
                          className="text-xs bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Accept
                        </Button>
                      )}
                      {order.status === 'accepted' && (() => {
                        // Check if order has products that need individual product selection
                        const hasProductItems = order.items?.some(item => item.productType === 'product');
                        const allProductsHaveIndividuals = order.items
                          ?.filter(item => item.productType === 'product')
                          .every(item => item.selectedProducts && item.selectedProducts.length > 0);

                        // Show dispatch only if no product items OR all products have individual products selected
                        if (!hasProductItems || allProductsHaveIndividuals) {
                          return (
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                onStatusUpdate(order.id, 'dispatched');
                              }}
                              className="text-xs bg-orange-600 hover:bg-orange-700 text-white"
                            >
                              <Package className="w-3 h-3 mr-1" />
                              Ship
                            </Button>
                          );
                        } else {
                          // Show "Select Individual Products" button instead
                          return (
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                onViewDetails(order);
                              }}
                              className="text-xs bg-blue-600 hover:bg-blue-700 text-white"
                            >
                              <Edit className="w-3 h-3 mr-1" />
                              Select Individual Products
                            </Button>
                          );
                        }
                      })()}
                      {order.status === 'dispatched' && (
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onStatusUpdate(order.id, 'delivered');
                          }}
                          className="text-xs bg-green-600 hover:bg-green-700 text-white"
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
                        title="View order details"
                      >
                        <Eye className="w-3 h-3" />
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


