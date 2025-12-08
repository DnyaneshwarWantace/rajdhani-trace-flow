import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Mail, Phone, MapPin, Edit, Trash2, Eye } from 'lucide-react';
import { formatCurrency, formatIndianDate } from '@/utils/formatHelpers';
import type { Supplier } from '@/services/supplierService';
import type { StockOrder } from '@/services/manageStockService';

interface SupplierCardProps {
  supplier: Supplier;
  orders: StockOrder[];
  onEdit: (supplier: Supplier) => void;
  onDelete: (supplier: Supplier) => void;
  canDelete: boolean;
}

export default function SupplierCard({ supplier, orders, onEdit, onDelete, canDelete }: SupplierCardProps) {
  const navigate = useNavigate();

  const handleView = () => {
    navigate(`/suppliers/${supplier.id}`);
  };
  const getStatusBadge = (status?: string) => {
    const styles = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-gray-100 text-gray-800',
      suspended: 'bg-red-100 text-red-800',
    };
    return <Badge className={styles[status as keyof typeof styles] || 'bg-gray-100'}>{status || 'Unknown'}</Badge>;
  };

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

  const orderStats = getSupplierOrderStats();

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="font-semibold text-base mb-1">{supplier.name}</h3>
            {supplier.contact_person && <p className="text-xs text-gray-600 mb-2">Contact: {supplier.contact_person}</p>}
            <div className="flex items-center gap-2 flex-wrap">
              {getStatusBadge(supplier.status)}
            </div>
          </div>
        </div>

        <div className="space-y-1.5 text-sm mb-3">
          {supplier.email && (
            <div className="flex items-center gap-2">
              <Mail className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-gray-700 truncate text-xs">{supplier.email}</span>
            </div>
          )}
          {supplier.phone && (
            <div className="flex items-center gap-2">
              <Phone className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-gray-700 text-xs">{supplier.phone}</span>
            </div>
          )}
          {(supplier.address || supplier.city) && (
            <div className="flex items-start gap-2">
              <MapPin className="w-3.5 h-3.5 text-gray-400 mt-0.5" />
              <span className="text-gray-700 text-xs">
                {[supplier.address, supplier.city, supplier.state, supplier.pincode].filter(Boolean).join(', ')}
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
            <span className="text-gray-600 text-xs">Supplier Since:</span>
            <p className="font-medium text-xs">
              {supplier.created_at ? formatIndianDate(supplier.created_at) : 'N/A'}
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
                      <p className="font-medium">{order.order_number || order.id}</p>
                      <p className="text-gray-500">{formatIndianDate(order.orderDate)}</p>
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
                ))}
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1" onClick={handleView}>
            <Eye className="w-3.5 h-3.5 mr-1" />
            View
          </Button>
          <Button variant="outline" size="sm" className="flex-1" onClick={() => onEdit(supplier)}>
            <Edit className="w-3.5 h-3.5 mr-1" />
            Edit
          </Button>
          {canDelete && (
            <Button variant="outline" size="sm" onClick={() => onDelete(supplier)}>
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

