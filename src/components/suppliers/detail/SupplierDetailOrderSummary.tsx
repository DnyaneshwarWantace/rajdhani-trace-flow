import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign } from 'lucide-react';
import { formatCurrency, formatIndianDate } from '@/utils/formatHelpers';
import type { Supplier } from '@/services/supplierService';
import type { StockOrder } from '@/services/manageStockService';

interface SupplierDetailOrderSummaryProps {
  supplier: Supplier;
  orders: StockOrder[];
}

export default function SupplierDetailOrderSummary({ supplier, orders }: SupplierDetailOrderSummaryProps) {
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

  const supplierOrders = getSupplierOrders();
  const totalValue = supplierOrders.reduce((sum, order) => sum + (order.totalCost || 0), 0);
  const totalOrders = supplierOrders.length;
  const lastOrderDate = supplierOrders.length > 0 
    ? supplierOrders.sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime())[0].orderDate
    : 'No orders';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="w-5 h-5" />
          Order Summary
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-blue-50 rounded-lg">
            <p className="text-xs text-gray-600 mb-1">Total Orders</p>
            <p className="text-2xl font-bold text-gray-900">{totalOrders}</p>
          </div>
          <div className="p-4 bg-green-50 rounded-lg">
            <p className="text-xs text-gray-600 mb-1">Total Value</p>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(totalValue)}</p>
          </div>
          <div className="p-4 bg-purple-50 rounded-lg md:col-span-2">
            <p className="text-xs text-gray-600 mb-1">Last Order</p>
            <p className="text-sm font-medium text-gray-900">
              {lastOrderDate === 'No orders' ? 'No orders' : formatIndianDate(lastOrderDate)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

