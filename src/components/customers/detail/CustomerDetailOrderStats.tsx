import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package } from 'lucide-react';
import type { Customer } from '@/services/customerService';
import type { Order } from '@/services/orderService';

interface CustomerDetailOrderStatsProps {
  customer: Customer;
  orders: Order[];
}

export default function CustomerDetailOrderStats({ customer, orders }: CustomerDetailOrderStatsProps) {
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

  const statusStats = getCustomerOrderStatusStats();

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
            <p className="text-xs text-gray-600">Completed</p>
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
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
              <span>Pending</span>
            </div>
            <span className="font-medium">{statusStats.pending}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span>Accepted</span>
            </div>
            <span className="font-medium">{statusStats.accepted}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
              <span>Dispatched</span>
            </div>
            <span className="font-medium">{statusStats.dispatched}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span>Delivered</span>
            </div>
            <span className="font-medium">{statusStats.delivered}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span>Cancelled</span>
            </div>
            <span className="font-medium">{statusStats.cancelled}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

