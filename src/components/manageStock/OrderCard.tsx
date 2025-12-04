import { Package, Building2, Calendar, CheckCircle, Clock, Truck, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatIndianDate } from '@/utils/formatHelpers';
import { formatNotes } from '@/utils/formatNotes';
import type { StockOrder } from '@/types/manageStock';

interface OrderCardProps {
  order: StockOrder;
  onStatusUpdate: (orderId: string, newStatus: StockOrder['status']) => void;
  onViewDetails: (order: StockOrder) => void;
}

const statusConfig = {
  ordered: { label: 'Ordered', icon: Clock, color: 'bg-gray-100 text-gray-800' },
  pending: { label: 'Pending', icon: Clock, color: 'bg-gray-100 text-gray-800' },
  approved: { label: 'Approved', icon: CheckCircle, color: 'bg-blue-100 text-blue-800' },
  shipped: { label: 'Shipped', icon: Truck, color: 'bg-yellow-100 text-yellow-800' },
  'in-transit': { label: 'In Transit', icon: Truck, color: 'bg-yellow-100 text-yellow-800' },
  delivered: { label: 'Delivered', icon: CheckCircle, color: 'bg-green-100 text-green-800' },
  cancelled: { label: 'Cancelled', icon: AlertTriangle, color: 'bg-red-100 text-red-800' },
};

export default function OrderCard({ order, onStatusUpdate, onViewDetails }: OrderCardProps) {
  const status = statusConfig[order.status];
  const StatusIcon = status.icon;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="space-y-2 flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <Package className="w-5 h-5 text-gray-400" />
            <h3 className="font-semibold text-lg text-gray-900">{order.materialName}</h3>
            <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${status.color}`}>
              <StatusIcon className="w-3 h-3" />
              {status.label}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <Building2 className="w-4 h-4" />
              {order.supplier}
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {formatIndianDate(order.orderDate)}
            </div>
          </div>
        </div>
        <div className="text-left sm:text-right">
          <div className="text-2xl font-bold text-gray-900">{formatCurrency(order.totalCost)}</div>
          <div className="text-sm text-gray-600">
            {order.quantity} {order.unit} × ₹{order.costPerUnit}
          </div>
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
        <div>
          <span className="text-gray-600">Quantity:</span>
          <div className="font-medium text-gray-900">{order.quantity} {order.unit}</div>
        </div>
        <div>
          <span className="text-gray-600">Expected Delivery:</span>
          <div className="font-medium text-gray-900">
            {formatIndianDate(order.expectedDelivery)}
          </div>
        </div>
        <div>
          <span className="text-gray-600">Status:</span>
          <div className="font-medium text-gray-900">{status.label}</div>
        </div>
        {order.actualDelivery && (
          <div>
            <span className="text-gray-600">Delivered:</span>
            <div className="font-medium text-gray-900">
              {formatIndianDate(order.actualDelivery)}
            </div>
          </div>
        )}
      </div>

      {/* Notes */}
      {(() => {
        const formattedNotes = formatNotes(order.notes);
        return formattedNotes ? (
          <div className="text-sm text-gray-600">
            <strong>Notes:</strong> {formattedNotes}
          </div>
        ) : null;
      })()}

      {/* Actions */}
      <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-200">
        {(order.status === 'ordered' || order.status === 'pending') && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onStatusUpdate(order.id, 'approved')}
            className="text-xs"
          >
            Approve
          </Button>
        )}
        {order.status === 'approved' && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onStatusUpdate(order.id, 'in-transit')}
            className="text-xs"
          >
            Mark Shipped
          </Button>
        )}
        {(order.status === 'shipped' || order.status === 'in-transit') && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onStatusUpdate(order.id, 'delivered')}
            className="text-xs"
          >
            Mark Delivered
          </Button>
        )}
        {(order.status === 'ordered' || order.status === 'pending' || order.status === 'approved' || order.status === 'shipped' || order.status === 'in-transit') && (
          <Button
            size="sm"
            variant="destructive"
            onClick={() => onStatusUpdate(order.id, 'cancelled')}
            className="text-xs"
          >
            Cancel Order
          </Button>
        )}
        <Button
          size="sm"
          variant="secondary"
          onClick={() => onViewDetails(order)}
          className="text-xs"
        >
          View Details
        </Button>
      </div>
    </div>
  );
}

