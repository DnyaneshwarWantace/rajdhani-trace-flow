import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { User, Mail, Phone, MapPin, Building, Calendar, DollarSign, Package, ShoppingBag, Edit, X } from 'lucide-react';
import { formatCurrency, formatIndianDate } from '@/utils/formatHelpers';
import type { Customer } from '@/services/customerService';
import type { Order } from '@/services/orderService';

interface CustomerDetailsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
  orders: Order[];
  onEdit: (customer: Customer) => void;
}

export default function CustomerDetailsDialog({
  isOpen,
  onClose,
  customer,
  orders,
  onEdit,
}: CustomerDetailsDialogProps) {
  if (!isOpen || !customer) return null;

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

  const getCustomerOrderStats = () => {
    const customerOrders = getCustomerOrders();
    const totalValue = customerOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
    const totalOrders = customerOrders.length;
    const lastOrderDate = customerOrders.length > 0 
      ? customerOrders.sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime())[0].orderDate
      : 'No orders';
    
    return {
      totalOrders,
      totalValue,
      lastOrderDate,
      orders: customerOrders
    };
  };

  const getCustomerPaymentSummary = () => {
    const customerOrders = getCustomerOrders();
    const totalPaid = customerOrders.reduce((sum, order) => sum + (order.paidAmount || 0), 0);
    const totalOutstanding = customerOrders.reduce((sum, order) => sum + (order.outstandingAmount || 0), 0);
    const totalValue = customerOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
    
    return {
      totalPaid,
      totalOutstanding,
      totalValue,
      paymentPercentage: totalValue > 0 ? Math.round((totalPaid / totalValue) * 100) : 0
    };
  };

  const getCustomerOrderStatusStats = () => {
    const customerOrders = getCustomerOrders();
    const statusCounts = {
      pending: 0,
      accepted: 0,
      in_production: 0,
      ready: 0,
      dispatched: 0,
      delivered: 0,
      cancelled: 0
    };
    
    customerOrders.forEach(order => {
      const status = order.status || 'pending';
      if (statusCounts.hasOwnProperty(status)) {
        statusCounts[status as keyof typeof statusCounts]++;
      }
    });
    
    const totalOrders = customerOrders.length;
    const completedOrders = statusCounts.delivered;
    const inProgressOrders = statusCounts.accepted + statusCounts.in_production + statusCounts.ready + statusCounts.dispatched;
    const completionRate = totalOrders > 0 ? Math.round((completedOrders / totalOrders) * 100) : 0;
    
    return {
      ...statusCounts,
      totalOrders,
      completedOrders,
      inProgressOrders,
      completionRate
    };
  };

  const orderStats = getCustomerOrderStats();
  const paymentSummary = getCustomerPaymentSummary();
  const statusStats = getCustomerOrderStatusStats();
  const customerOrdersList = orderStats.orders.sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime());

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <User className="w-5 h-5" />
              {customer.name}
            </h2>
            <p className="text-sm text-gray-500 mt-1">Complete customer information and order history</p>
          </div>
          <button onClick={onClose} type="button" className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardContent className="p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Personal Information
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <span>{customer.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <span>{customer.phone}</span>
                  </div>
                  {(customer.address || customer.city) && (
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                      <span className="text-xs">
                        {[customer.address, customer.city, customer.state, customer.pincode].filter(Boolean).join(', ')}
                      </span>
                    </div>
                  )}
                  {customer.gst_number && (
                    <div className="flex items-center gap-2">
                      <Building className="w-4 h-4 text-gray-400" />
                      <span className="text-xs">GST: {customer.gst_number}</span>
                    </div>
                  )}
                  {customer.registration_date && (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span className="text-xs">Customer since: {formatIndianDate(customer.registration_date)}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Financial Summary
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Orders:</span>
                    <span className="font-medium">{orderStats.totalOrders}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Value:</span>
                    <span className="font-medium">{formatCurrency(paymentSummary.totalValue)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Paid:</span>
                    <span className="font-medium text-green-600">{formatCurrency(paymentSummary.totalPaid)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Outstanding:</span>
                    <span className="font-medium text-red-600">{formatCurrency(paymentSummary.totalOutstanding)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Payment %:</span>
                    <span className="font-medium">{paymentSummary.paymentPercentage}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Package className="w-4 h-4" />
                Order Status Overview
              </h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <p className="text-xl font-bold text-blue-600">{statusStats.totalOrders}</p>
                    <p className="text-xs text-gray-600">Total Orders</p>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <p className="text-xl font-bold text-green-600">{statusStats.completedOrders}</p>
                    <p className="text-xs text-gray-600">Completed</p>
                  </div>
                  <div className="text-center p-3 bg-orange-50 rounded-lg">
                    <p className="text-xl font-bold text-orange-600">{statusStats.inProgressOrders}</p>
                    <p className="text-xs text-gray-600">In Progress</p>
                  </div>
                  <div className="text-center p-3 bg-purple-50 rounded-lg">
                    <p className="text-xl font-bold text-purple-600">{statusStats.completionRate}%</p>
                    <p className="text-xs text-gray-600">Success Rate</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                  <div className="flex items-center justify-between p-2 bg-gray-50 rounded text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                      <span>Pending</span>
                    </div>
                    <span className="font-medium">{statusStats.pending}</span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-blue-50 rounded text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <span>Accepted</span>
                    </div>
                    <span className="font-medium">{statusStats.accepted}</span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-orange-50 rounded text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                      <span>Dispatched</span>
                    </div>
                    <span className="font-medium">{statusStats.dispatched}</span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-green-50 rounded text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span>Delivered</span>
                    </div>
                    <span className="font-medium">{statusStats.delivered}</span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-red-50 rounded text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      <span>Cancelled</span>
                    </div>
                    <span className="font-medium">{statusStats.cancelled}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <ShoppingBag className="w-4 h-4" />
                Order History
              </h3>
              {customerOrdersList.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="text-sm">No orders found for this customer</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {customerOrdersList.map((order) => (
                    <div key={order.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h4 className="font-medium">{order.orderNumber}</h4>
                          <p className="text-sm text-gray-500">{formatIndianDate(order.orderDate)}</p>
                          {order.workflowStep && (
                            <p className="text-xs text-gray-500 mt-1">Workflow: {order.workflowStep}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{formatCurrency(order.totalAmount)}</p>
                          <Badge className={`text-xs ${
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
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm mb-3">
                        <div>
                          <span className="text-gray-600">Items:</span>
                          <p className="font-medium">{order.items.length} {order.items.some(item => item.productType === 'raw_material') ? 'items' : 'products'}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Paid:</span>
                          <p className="font-medium text-green-600">{formatCurrency(order.paidAmount || 0)}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Outstanding:</span>
                          <p className="font-medium text-red-600">{formatCurrency(order.outstandingAmount || 0)}</p>
                        </div>
                      </div>

                      <div className="mt-3 pt-3 border-t">
                        <h5 className="text-sm font-medium mb-2">Order Items:</h5>
                        <div className="space-y-2">
                          {order.items.map((item, index) => (
                            <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                              <div className="flex-1">
                                <div className="font-medium">{item.productName}</div>
                                <div className="text-xs text-gray-600">
                                  {item.productType === 'raw_material' ? 'Raw Material' : 'Finished Product'} • 
                                  Qty: {Number(item.quantity).toFixed(2)} •
                                  ₹{formatCurrency(item.unitPrice)}/unit
                                </div>
                                {item.selectedProducts && item.selectedProducts.length > 0 && (
                                  <div className="text-xs text-blue-600 mt-1">
                                    Individual IDs: {item.selectedProducts.map((p: any) => p.qrCode || p.id).join(', ')}
                                  </div>
                                )}
                              </div>
                              <div className="text-sm font-medium">
                                {formatCurrency(item.totalPrice || 0)}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {(order.acceptedAt || order.dispatchedAt || order.deliveredAt) && (
                        <div className="mt-3 pt-3 border-t">
                          <h5 className="text-sm font-medium mb-2">Order Timeline:</h5>
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
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 flex-shrink-0">
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button onClick={() => {
            onClose();
            onEdit(customer);
          }}>
            <Edit className="w-4 h-4 mr-2" />
            Edit Customer
          </Button>
        </div>
      </div>
    </div>
  );
}

