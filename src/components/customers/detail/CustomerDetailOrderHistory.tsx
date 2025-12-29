import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ShoppingBag, Package, Edit, Check, X } from 'lucide-react';
import { formatCurrency, formatIndianDate } from '@/utils/formatHelpers';
import { OrderService } from '@/services/orderService';
import { useToast } from '@/hooks/use-toast';
import type { Customer } from '@/services/customerService';
import type { Order } from '@/services/orderService';

interface CustomerDetailOrderHistoryProps {
  customer: Customer;
  orders: Order[];
  onOrderUpdated?: () => void;
}

export default function CustomerDetailOrderHistory({ customer, orders, onOrderUpdated }: CustomerDetailOrderHistoryProps) {
  const { toast } = useToast();
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [editedPaidAmount, setEditedPaidAmount] = useState<number>(0);
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

  const handleEditPayment = (order: Order) => {
    setEditingOrderId(order.id);
    setEditedPaidAmount(order.paidAmount || 0);
  };

  const handleSavePayment = async (orderId: string) => {
    try {
      const { error } = await OrderService.updateOrderPayment(orderId, editedPaidAmount);

      if (error) {
        toast({
          title: 'Error',
          description: error,
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Success',
        description: 'Payment updated successfully',
      });

      setEditingOrderId(null);
      if (onOrderUpdated) {
        onOrderUpdated();
      }
    } catch (error) {
      console.error('Error updating payment:', error);
      toast({
        title: 'Error',
        description: 'Failed to update payment',
        variant: 'destructive',
      });
    }
  };

  const handleCancelEdit = () => {
    setEditingOrderId(null);
    setEditedPaidAmount(0);
  };

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
                    <p className="text-xs text-gray-500 mb-1">Paid</p>
                    {editingOrderId === order.id ? (
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          value={editedPaidAmount}
                          onChange={(e) => setEditedPaidAmount(parseFloat(e.target.value) || 0)}
                          className="h-8 w-32"
                          min="0"
                          step="0.01"
                        />
                        <Button size="sm" onClick={() => handleSavePayment(order.id)} className="h-8 w-8 p-0">
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={handleCancelEdit} className="h-8 w-8 p-0">
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-green-600">{formatCurrency(order.paidAmount || 0)}</p>
                        {(order.status === 'dispatched' || order.status === 'delivered') && (
                          <Button size="sm" variant="ghost" onClick={() => handleEditPayment(order)} className="h-6 w-6 p-0">
                            <Edit className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Outstanding</p>
                    <p className="text-sm font-medium text-red-600">{formatCurrency(order.outstandingAmount || 0)}</p>
                  </div>
                </div>

                {order.items.length > 0 && (
                  <div className="pt-4 border-t">
                    <p className="text-xs font-medium text-gray-700 mb-2">Order Items:</p>
                    <div className="space-y-4">
                      {order.items.map((item, index) => (
                        <div key={index} className="border rounded-lg p-3 bg-gray-50">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex-1">
                              <p className="font-medium text-gray-900">{item.productName}</p>
                              <p className="text-xs text-gray-600">
                                {item.productType === 'raw_material' ? 'Raw Material' : 'Finished Product'} •
                                Qty: {item.quantity} •
                                {formatCurrency(item.unitPrice)}/unit
                              </p>
                            </div>
                            <p className="text-sm font-medium text-gray-900">{formatCurrency(item.totalPrice || 0)}</p>
                          </div>

                          {item.selectedProducts && item.selectedProducts.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-gray-200">
                              <p className="text-xs font-medium text-gray-700 mb-2">
                                Individual Products: {item.selectedProducts.length}
                              </p>
                              <div className="overflow-x-auto">
                                <table className="w-full border-collapse border border-gray-300">
                                  <thead className="bg-gray-100">
                                    <tr>
                                      <th className="border border-gray-300 p-2 text-left text-xs font-medium text-gray-700">#</th>
                                      <th className="border border-gray-300 p-2 text-left text-xs font-medium text-gray-700">Product ID</th>
                                      <th className="border border-gray-300 p-2 text-left text-xs font-medium text-gray-700">QR Code</th>
                                      <th className="border border-gray-300 p-2 text-left text-xs font-medium text-gray-700">Serial Number</th>
                                      <th className="border border-gray-300 p-2 text-left text-xs font-medium text-gray-700">Status</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {item.selectedProducts.map((product: any, idx: number) => (
                                      <tr key={idx} className="hover:bg-gray-50">
                                        <td className="border border-gray-300 p-2 text-xs text-gray-600">{idx + 1}</td>
                                        <td className="border border-gray-300 p-2 text-xs font-mono text-gray-900">
                                          {product.individual_product_id || product.id || '—'}
                                        </td>
                                        <td className="border border-gray-300 p-2 text-xs font-mono text-gray-900">
                                          {product.qr_code || product.qrCode || '—'}
                                        </td>
                                        <td className="border border-gray-300 p-2 text-xs text-gray-900">
                                          {product.serial_number || product.serialNumber || '—'}
                                        </td>
                                        <td className="border border-gray-300 p-2">
                                          <Badge
                                            variant="outline"
                                            className={`text-xs ${
                                              order.status === 'dispatched' || order.status === 'delivered'
                                                ? 'bg-orange-50 text-orange-700 border-orange-300'
                                                : 'bg-green-50 text-green-700 border-green-300'
                                            }`}
                                          >
                                            {order.status === 'dispatched' || order.status === 'delivered' ? 'Dispatched' : 'Reserved'}
                                          </Badge>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}
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

