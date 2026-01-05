import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Mail, Phone, MapPin, Edit, Eye } from 'lucide-react';
import { formatCurrency, formatIndianDate } from '@/utils/formatHelpers';
import type { Customer } from '@/services/customerService';
import type { Order } from '@/services/orderService';

interface CustomerCardProps {
  customer: Customer;
  orders: Order[];
  onEdit: (customer: Customer) => void;
  onDelete: (customer: Customer) => void;
  canDelete: boolean;
}

export default function CustomerCard({ customer, orders, onEdit }: CustomerCardProps) {
  const navigate = useNavigate();

  const handleView = () => {
    navigate(`/customers/${customer.id}`);
  };
  const getStatusBadge = (status: string) => {
    const styles = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-gray-100 text-gray-800',
      suspended: 'bg-red-100 text-red-800',
      new: 'bg-blue-100 text-blue-800',
    };
    return <Badge className={styles[status as keyof typeof styles] || 'bg-gray-100'}>{status}</Badge>;
  };

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

  const orderStats = getCustomerOrderStats();

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="font-semibold text-base mb-1">{customer.name}</h3>
            {customer.company_name && <p className="text-xs text-gray-600 mb-2">{customer.company_name}</p>}
            <div className="flex items-center gap-2 flex-wrap">
              {getStatusBadge(customer.status)}
              <Badge variant="outline" className="text-xs">{customer.customer_type}</Badge>
            </div>
          </div>
        </div>

        <div className="space-y-1.5 text-sm mb-3">
          <div className="flex items-center gap-2">
            <Mail className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-gray-700 truncate text-xs">{customer.email}</span>
          </div>
          <div className="flex items-center gap-2">
            <Phone className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-gray-700 text-xs">{customer.phone}</span>
          </div>
          {(customer.address || customer.city) && (
            <div className="flex items-start gap-2">
              <MapPin className="w-3.5 h-3.5 text-gray-400 mt-0.5" />
              <span className="text-gray-700 text-xs">
                {[customer.address, customer.city, customer.state, customer.pincode].filter(Boolean).join(', ')}
              </span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm mb-3 pt-3 border-t">
          <div>
            <span className="text-gray-600 text-xs">Total Orders:</span>
            <p className="font-medium text-sm">{orderStats.totalOrders}</p>
          </div>
          <div>
            <span className="text-gray-600 text-xs">Total Value:</span>
            <p className="font-medium text-sm">{formatCurrency(orderStats.totalValue)}</p>
          </div>
          <div>
            <span className="text-gray-600 text-xs">Last Order:</span>
            <p className="font-medium text-xs">
              {orderStats.lastOrderDate === 'No orders' 
                ? 'No orders' 
                : formatIndianDate(orderStats.lastOrderDate)
              }
            </p>
          </div>
          <div>
            <span className="text-gray-600 text-xs">Customer Since:</span>
            <p className="font-medium text-xs">
              {customer.registration_date ? formatIndianDate(customer.registration_date) : 'N/A'}
            </p>
          </div>
        </div>

        {orderStats.orders.length > 0 && (
          <div className="mb-3">
            <h4 className="text-xs font-medium text-gray-600 mb-2">Recent Orders</h4>
            <div className="space-y-1.5">
              {orderStats.orders
                .sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime())
                .slice(0, 3)
                .map((order) => (
                  <div key={order.id} className="flex items-center justify-between p-2 bg-gray-50 rounded text-xs">
                    <div>
                      <p className="font-medium">{order.orderNumber}</p>
                      <p className="text-gray-500">{formatIndianDate(order.orderDate)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatCurrency(order.totalAmount)}</p>
                      <Badge className={`text-xs ${
                        order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                        order.status === 'dispatched' ? 'bg-orange-100 text-orange-800' :
                        order.status === 'accepted' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {order.status}
                      </Badge>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1" onClick={handleView}>
            <Eye className="w-3.5 h-3.5 mr-1" />
            View
          </Button>
          <Button variant="outline" size="sm" className="flex-1" onClick={() => onEdit(customer)}>
            <Edit className="w-3.5 h-3.5 mr-1" />
            Edit
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

