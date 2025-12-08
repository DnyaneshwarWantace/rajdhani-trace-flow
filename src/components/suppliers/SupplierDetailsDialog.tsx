import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Building, Mail, Phone, MapPin, Calendar, DollarSign, Package, ShoppingBag, Edit, X } from 'lucide-react';
import { formatCurrency, formatIndianDate } from '@/utils/formatHelpers';
import type { Supplier } from '@/services/supplierService';
import type { StockOrder } from '@/services/manageStockService';

interface SupplierDetailsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  supplier: Supplier | null;
  orders: StockOrder[];
  onEdit: (supplier: Supplier) => void;
}

export default function SupplierDetailsDialog({
  isOpen,
  onClose,
  supplier,
  orders,
  onEdit,
}: SupplierDetailsDialogProps) {
  if (!isOpen || !supplier) return null;

  const getSupplierOrders = () => {
    const supplierName = supplier.name || '';
    return orders.filter(order => {
      if (order.supplier_id && order.supplier_id === supplier.id) {
        return true;
      }
      if (!order.supplier_id && supplierName && order.supplier && 
          order.supplier.toLowerCase().trim() === supplierName.toLowerCase().trim()) {
        return true;
      }
      return false;
    });
  };

  const getSupplierOrderStats = () => {
    const supplierOrders = getSupplierOrders();
    const totalValue = supplierOrders.reduce((sum, order) => sum + (order.totalCost || 0), 0);
    const totalOrders = supplierOrders.length;
    const lastOrderDate = supplierOrders.length > 0 
      ? supplierOrders.sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime())[0].orderDate
      : 'No orders';
    
    return {
      totalOrders,
      totalValue,
      lastOrderDate,
      orders: supplierOrders
    };
  };

  const getSupplierOrderStatusStats = () => {
    const supplierOrders = getSupplierOrders();
    const statusCounts = {
      ordered: 0,
      pending: 0,
      approved: 0,
      shipped: 0,
      'in-transit': 0,
      delivered: 0,
      cancelled: 0
    };
    
    supplierOrders.forEach(order => {
      const status = order.status || 'pending';
      if (statusCounts.hasOwnProperty(status)) {
        statusCounts[status as keyof typeof statusCounts]++;
      }
    });
    
    const totalOrders = supplierOrders.length;
    const completedOrders = statusCounts.delivered;
    const inProgressOrders = statusCounts.approved + statusCounts.shipped + statusCounts['in-transit'];
    const completionRate = totalOrders > 0 ? Math.round((completedOrders / totalOrders) * 100) : 0;
    
    return {
      ...statusCounts,
      totalOrders,
      completedOrders,
      inProgressOrders,
      completionRate
    };
  };

  const orderStats = getSupplierOrderStats();
  const statusStats = getSupplierOrderStatusStats();
  const supplierOrdersList = orderStats.orders.sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime());

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <Building className="w-5 h-5" />
              {supplier.name}
            </h2>
            <p className="text-sm text-gray-500 mt-1">Complete supplier information and order history</p>
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
                  <Building className="w-4 h-4" />
                  Contact Information
                </h3>
                <div className="space-y-2 text-sm">
                  {supplier.contact_person && (
                    <div className="flex items-center gap-2">
                      <Building className="w-4 h-4 text-gray-400" />
                      <span>Contact: {supplier.contact_person}</span>
                    </div>
                  )}
                  {supplier.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-gray-400" />
                      <span>{supplier.email}</span>
                    </div>
                  )}
                  {supplier.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-gray-400" />
                      <span>{supplier.phone}</span>
                    </div>
                  )}
                  {(supplier.address || supplier.city) && (
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                      <span className="text-xs">
                        {[supplier.address, supplier.city, supplier.state, supplier.pincode].filter(Boolean).join(', ')}
                      </span>
                    </div>
                  )}
                  {supplier.gst_number && (
                    <div className="flex items-center gap-2">
                      <Building className="w-4 h-4 text-gray-400" />
                      <span className="text-xs">GST: {supplier.gst_number}</span>
                    </div>
                  )}
                  {supplier.created_at && (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span className="text-xs">Supplier since: {formatIndianDate(supplier.created_at)}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Order Summary
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Orders:</span>
                    <span className="font-medium">{orderStats.totalOrders}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Value:</span>
                    <span className="font-medium">{formatCurrency(orderStats.totalValue)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Last Order:</span>
                    <span className="font-medium text-xs">
                      {orderStats.lastOrderDate === 'No orders' 
                        ? 'No orders' 
                        : formatIndianDate(orderStats.lastOrderDate)
                      }
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Completion Rate:</span>
                    <span className="font-medium">{statusStats.completionRate}%</span>
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
                    <p className="text-xs text-gray-600">Delivered</p>
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
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <div className="flex items-center justify-between p-2 bg-gray-50 rounded text-xs">
                    <span>Pending</span>
                    <span className="font-medium">{statusStats.pending}</span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-blue-50 rounded text-xs">
                    <span>Approved</span>
                    <span className="font-medium">{statusStats.approved}</span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-orange-50 rounded text-xs">
                    <span>In Transit</span>
                    <span className="font-medium">{statusStats['in-transit']}</span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-green-50 rounded text-xs">
                    <span>Delivered</span>
                    <span className="font-medium">{statusStats.delivered}</span>
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
              {supplierOrdersList.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="text-sm">No orders found for this supplier</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {supplierOrdersList.map((order) => (
                    <div key={order.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h4 className="font-medium">{order.order_number || order.id}</h4>
                          <p className="text-sm text-gray-500">{formatIndianDate(order.orderDate)}</p>
                          {order.expectedDelivery && (
                            <p className="text-xs text-gray-500 mt-1">
                              Expected: {formatIndianDate(order.expectedDelivery)}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{formatCurrency(order.totalCost)}</p>
                          <Badge className={`text-xs ${
                            order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                            order.status === 'in-transit' || order.status === 'shipped' ? 'bg-orange-100 text-orange-800' :
                            order.status === 'approved' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {order.status}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm mb-3">
                        <div>
                          <span className="text-gray-600">Material:</span>
                          <p className="font-medium">{order.materialName}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Quantity:</span>
                          <p className="font-medium">{order.quantity} {order.unit}</p>
                        </div>
                        <div>
                          <span className="text-gray-600">Cost/Unit:</span>
                          <p className="font-medium">{formatCurrency(order.costPerUnit)}</p>
                        </div>
                      </div>

                      {(order.materialCategory || order.materialBatchNumber) && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-3">
                          {order.materialCategory && (
                            <div>
                              <span className="text-gray-600">Category:</span>
                              <p className="font-medium">{order.materialCategory}</p>
                            </div>
                          )}
                          {order.materialBatchNumber && (
                            <div>
                              <span className="text-gray-600">Batch:</span>
                              <p className="font-medium">{order.materialBatchNumber}</p>
                            </div>
                          )}
                        </div>
                      )}

                      {order.actualDelivery && (
                        <div className="mt-3 pt-3 border-t">
                          <div className="flex justify-between text-xs">
                            <span className="text-green-600">✓ Delivered</span>
                            <span className="text-gray-500">{formatIndianDate(order.actualDelivery)}</span>
                          </div>
                        </div>
                      )}

                      {order.notes && (
                        <div className="mt-3 pt-3 border-t">
                          <p className="text-xs text-gray-600">
                            <span className="font-medium">Notes:</span> {order.notes}
                          </p>
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
            onEdit(supplier);
          }}>
            <Edit className="w-4 h-4 mr-2" />
            Edit Supplier
          </Button>
        </div>
      </div>
    </div>
  );
}

