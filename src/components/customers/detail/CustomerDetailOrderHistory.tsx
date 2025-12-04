import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShoppingBag, Package } from 'lucide-react';
import { formatCurrency, formatIndianDate } from '@/utils/formatHelpers';
import type { Customer } from '@/services/customerService';
import type { Order } from '@/services/orderService';

interface CustomerDetailOrderHistoryProps {
  customer: Customer;
  orders: Order[];
}

export default function CustomerDetailOrderHistory({ customer, orders }: CustomerDetailOrderHistoryProps) {
  const getCustomerOrders = () => {
    const customerName = customer.name || '';
    return orders.filter(order => {
      if (order.customerId && order.customerId === customer.id) {
        return true;
      }
      if (!order.customerId && customerName && order.customerName && 
          order.customerName.toLowerCase().trim() === customerName.toLowerCase().trim()) {
        return true;
      }
      return false;
    });
  };

  const customerOrders = getCustomerOrders().sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime());

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShoppingBag className="w-5 h-5" />
          Order History
        </CardTitle>
      </CardHeader>
      <CardContent>
        {customerOrders.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Package className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-sm">No orders found for this customer</p>
          </div>
        ) : (
          <div className="space-y-4">
            {customerOrders.map((order) => (
              <div key={order.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="font-semibold text-gray-900">{order.orderNumber}</h4>
                    <p className="text-sm text-gray-500 mt-1">{formatIndianDate(order.orderDate)}</p>
                    {order.workflowStep && (
                      <p className="text-xs text-gray-500 mt-1">Workflow: {order.workflowStep}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-gray-900">{formatCurrency(order.totalAmount)}</p>
                    <Badge className={`text-xs mt-1 ${
                      order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                      order.status === 'dispatched' ? 'bg-orange-100 text-orange-800' :
                      order.status === 'accepted' ? 'bg-blue-100 text-blue-800' :
                      order.status === 'pending' ? 'bg-gray-100 text-gray-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {order.status}
                    </Badge>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-gray-500">Items</p>
                    <p className="text-sm font-medium text-gray-900">
                      {order.items.length} {order.items.some(item => item.productType === 'raw_material') ? 'items' : 'products'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Paid</p>
                    <p className="text-sm font-medium text-green-600">{formatCurrency(order.paidAmount || 0)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Outstanding</p>
                    <p className="text-sm font-medium text-red-600">{formatCurrency(order.outstandingAmount || 0)}</p>
                  </div>
                </div>

                {order.items.length > 0 && (
                  <div className="pt-4 border-t">
                    <p className="text-xs font-medium text-gray-700 mb-2">Order Items:</p>
                    <div className="space-y-2">
                      {order.items.map((item, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">{item.productName}</p>
                            <p className="text-xs text-gray-600">
                              {item.productType === 'raw_material' ? 'Raw Material' : 'Finished Product'} • 
                              Qty: {item.quantity} • 
                              {formatCurrency(item.unitPrice)}/unit
                            </p>
                            {item.selectedProducts && item.selectedProducts.length > 0 && (
                              <p className="text-xs text-blue-600 mt-1">
                                Individual IDs: {item.selectedProducts.map((p: any) => p.qrCode || p.id).join(', ')}
                              </p>
                            )}
                          </div>
                          <p className="text-sm font-medium text-gray-900">{formatCurrency(item.totalPrice || 0)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {(order.acceptedAt || order.dispatchedAt || order.deliveredAt) && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-xs font-medium text-gray-700 mb-2">Order Timeline:</p>
                    <div className="space-y-1 text-xs">
                      {order.acceptedAt && (
                        <div className="flex justify-between">
                          <span className="text-blue-600">✓ Accepted</span>
                          <span className="text-gray-500">{formatIndianDate(order.acceptedAt)}</span>
                        </div>
                      )}
                      {order.dispatchedAt && (
                        <div className="flex justify-between">
                          <span className="text-orange-600">✓ Dispatched</span>
                          <span className="text-gray-500">{formatIndianDate(order.dispatchedAt)}</span>
                        </div>
                      )}
                      {order.deliveredAt && (
                        <div className="flex justify-between">
                          <span className="text-green-600">✓ Delivered</span>
                          <span className="text-gray-500">{formatIndianDate(order.deliveredAt)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

