import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Building2, Calendar, CheckCircle, Clock, Truck, AlertTriangle, Eye } from 'lucide-react';
import { formatCurrency, formatIndianDate } from '@/utils/formatHelpers';
import type { StockOrder } from '@/types/manageStock';

interface OrderCardNewProps {
  order: StockOrder;
  onStatusUpdate: (orderId: string, newStatus: StockOrder['status']) => void;
  onViewDetails: (order: StockOrder) => void;
}

const statusConfig = {
  ordered: { label: 'Ordered', icon: Clock, color: 'bg-gray-100 text-gray-700 border-gray-200' },
  pending: { label: 'Pending', icon: Clock, color: 'bg-gray-100 text-gray-700 border-gray-200' },
  approved: { label: 'Approved', icon: CheckCircle, color: 'bg-blue-100 text-blue-700 border-blue-200' },
  shipped: { label: 'Shipped', icon: Truck, color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  'in-transit': { label: 'In Transit', icon: Truck, color: 'bg-orange-100 text-orange-700 border-orange-200' },
  delivered: { label: 'Delivered', icon: CheckCircle, color: 'bg-green-100 text-green-700 border-green-200' },
  cancelled: { label: 'Cancelled', icon: AlertTriangle, color: 'bg-red-100 text-red-700 border-red-200' },
};

export default function OrderCardNew({ order, onStatusUpdate, onViewDetails }: OrderCardNewProps) {
  const status = statusConfig[order.status];
  const StatusIcon = status.icon;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-3">
        {/* Header */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-xs text-gray-900 line-clamp-2 break-words mb-1">
              {order.materialName}
            </h3>
            <div className="flex items-center gap-1 text-[10px] text-gray-500">
              <Building2 className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{order.supplier}</span>
            </div>
          </div>
          <Badge variant="outline" className={`${status.color} text-[9px] px-1.5 py-0 flex-shrink-0 ml-2`}>
            <StatusIcon className="w-2.5 h-2.5 mr-0.5" />
            {status.label}
          </Badge>
        </div>

        {/* Cost - Prominent */}
        <div className="bg-primary-50 rounded-md p-2 mb-2">
          <div className="text-lg font-bold text-primary-700">{formatCurrency(order.totalCost)}</div>
          <div className="text-[9px] text-primary-600">
            {order.quantity} {order.unit} × ₹{order.costPerUnit}
          </div>
        </div>

        {/* Details Grid */}
        <div className="space-y-1.5 text-[10px] mb-2">
          <div className="flex items-center justify-between">
            <span className="text-gray-500 flex-shrink-0">Order #</span>
            <span className="text-gray-900 font-mono truncate ml-2">{order.order_number}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-500 flex items-center gap-1">
              <Calendar className="w-2.5 h-2.5" />
              Order Date
            </span>
            <span className="text-gray-900">{formatIndianDate(order.orderDate)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-500">Expected</span>
            <span className="text-gray-900">{formatIndianDate(order.expectedDelivery)}</span>
          </div>
          {order.actualDelivery && (
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Delivered</span>
              <span className="text-green-600 font-medium">{formatIndianDate(order.actualDelivery)}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-1.5 pt-2 border-t border-gray-100">
          {/* Quick Actions */}
          <div className="flex gap-1.5">
            {(order.status === 'ordered' || order.status === 'pending') && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onStatusUpdate(order.id, 'approved')}
                className="flex-1 text-[10px] py-1 h-auto text-blue-600 hover:bg-blue-50 border-blue-200"
              >
                <CheckCircle className="w-3 h-3 mr-1" />
                Approve
              </Button>
            )}
            {order.status === 'approved' && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onStatusUpdate(order.id, 'in-transit')}
                className="flex-1 text-[10px] py-1 h-auto text-orange-600 hover:bg-orange-50 border-orange-200"
              >
                <Truck className="w-3 h-3 mr-1" />
                Ship
              </Button>
            )}
            {(order.status === 'shipped' || order.status === 'in-transit') && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onStatusUpdate(order.id, 'delivered')}
                className="flex-1 text-[10px] py-1 h-auto text-green-600 hover:bg-green-50 border-green-200"
              >
                <CheckCircle className="w-3 h-3 mr-1" />
                Deliver
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => onViewDetails(order)}
              className="flex-1 text-[10px] py-1 h-auto"
            >
              <Eye className="w-3 h-3 mr-1" />
              Details
            </Button>
          </div>

          {/* Cancel Button - Only show before approval */}
          {(order.status === 'ordered' || order.status === 'pending') && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onStatusUpdate(order.id, 'cancelled')}
              className="w-full text-[10px] py-1 h-auto text-red-600 hover:bg-red-50 border-red-200"
            >
              <AlertTriangle className="w-3 h-3 mr-1" />
              Cancel Order
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
