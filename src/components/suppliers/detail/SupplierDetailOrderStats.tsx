import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package } from 'lucide-react';
import type { Supplier } from '@/services/supplierService';
import type { StockOrder } from '@/services/manageStockService';

interface SupplierDetailOrderStatsProps {
  supplier: Supplier;
  orders: StockOrder[];
}

export default function SupplierDetailOrderStats({ supplier, orders }: SupplierDetailOrderStatsProps) {
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

  const statusStats = getSupplierOrderStatusStats();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="w-5 h-5" />
          Order Statistics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <p className="text-2xl font-bold text-blue-600">{statusStats.totalOrders}</p>
            <p className="text-xs text-gray-600">Total</p>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <p className="text-2xl font-bold text-green-600">{statusStats.completedOrders}</p>
            <p className="text-xs text-gray-600">Delivered</p>
          </div>
          <div className="text-center p-3 bg-orange-50 rounded-lg">
            <p className="text-2xl font-bold text-orange-600">{statusStats.inProgressOrders}</p>
            <p className="text-xs text-gray-600">In Progress</p>
          </div>
          <div className="text-center p-3 bg-purple-50 rounded-lg">
            <p className="text-2xl font-bold text-purple-600">{statusStats.completionRate}%</p>
            <p className="text-xs text-gray-600">Success Rate</p>
          </div>
        </div>
        
        <div className="space-y-2 pt-4 border-t">
          <div className="flex items-center justify-between text-sm">
            <span>Pending</span>
            <span className="font-medium">{statusStats.pending}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span>Approved</span>
            <span className="font-medium">{statusStats.approved}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span>In Transit</span>
            <span className="font-medium">{statusStats['in-transit']}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span>Delivered</span>
            <span className="font-medium">{statusStats.delivered}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

