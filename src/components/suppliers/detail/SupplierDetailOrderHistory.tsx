import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShoppingBag, Package } from 'lucide-react';
import { formatCurrency, formatIndianDate } from '@/utils/formatHelpers';
import { formatNotes } from '@/utils/formatNotes';
import type { Supplier } from '@/services/supplierService';
import type { StockOrder } from '@/services/manageStockService';

interface SupplierDetailOrderHistoryProps {
  supplier: Supplier;
  orders: StockOrder[];
}

export default function SupplierDetailOrderHistory({ supplier, orders }: SupplierDetailOrderHistoryProps) {
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

  const supplierOrders = getSupplierOrders().sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime());

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShoppingBag className="w-5 h-5" />
          Order History
        </CardTitle>
      </CardHeader>
      <CardContent>
        {supplierOrders.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Package className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-sm">No orders found for this supplier</p>
          </div>
        ) : (
          <div className="space-y-4">
            {supplierOrders.map((order) => (
              <div key={order.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="font-semibold text-gray-900">{order.order_number || order.id}</h4>
                    <p className="text-sm text-gray-500 mt-1">{formatIndianDate(order.orderDate)}</p>
                    {order.expectedDelivery && (
                      <p className="text-xs text-gray-500 mt-1">Expected: {formatIndianDate(order.expectedDelivery)}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-gray-900">{formatCurrency(order.totalCost)}</p>
                    <Badge className={`text-xs mt-1 ${
                      order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                      order.status === 'in-transit' || order.status === 'shipped' ? 'bg-orange-100 text-orange-800' :
                      order.status === 'approved' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {order.status}
                    </Badge>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-gray-500">Material</p>
                    <p className="text-sm font-medium text-gray-900">{order.materialName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Quantity</p>
                    <p className="text-sm font-medium text-gray-900">{Number(order.quantity).toFixed(2)} {order.unit}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Cost/Unit</p>
                    <p className="text-sm font-medium text-gray-900">{formatCurrency(order.costPerUnit)}</p>
                  </div>
                </div>

                {(order.materialCategory || order.materialBatchNumber) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 pt-4 border-t">
                    {order.materialCategory && (
                      <div>
                        <p className="text-xs text-gray-500">Category</p>
                        <p className="text-sm font-medium text-gray-900">{order.materialCategory}</p>
                      </div>
                    )}
                    {order.materialBatchNumber && (
                      <div>
                        <p className="text-xs text-gray-500">Batch Number</p>
                        <p className="text-sm font-medium text-gray-900">{order.materialBatchNumber}</p>
                      </div>
                    )}
                  </div>
                )}

                {order.actualDelivery && (
                  <div className="pt-4 border-t">
                    <div className="flex justify-between text-xs">
                      <span className="text-green-600 font-medium">✓ Delivered</span>
                      <span className="text-gray-500">{formatIndianDate(order.actualDelivery)}</span>
                    </div>
                  </div>
                )}

                {(() => {
                  const formattedNotes = formatNotes(order.notes);
                  return formattedNotes ? (
                    <div className="mt-4 pt-4 border-t">
                      <p className="text-xs text-gray-500 mb-1">Notes</p>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap break-words">{formattedNotes}</p>
                    </div>
                  ) : null;
                })()}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

