import { X, Package, Building2, Calendar, DollarSign, FileText, CheckCircle, User, Clock, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatIndianDate, formatIndianDateTime } from '@/utils/formatHelpers';
import { formatNotes } from '@/utils/formatNotes';
import type { StockOrder } from '@/types/manageStock';

interface OrderDetailsDialogProps {
  order: StockOrder | null;
  isOpen: boolean;
  onClose: () => void;
  onStatusUpdate?: (orderId: string, newStatus: StockOrder['status']) => void;
}

export default function OrderDetailsDialog({ order, isOpen, onClose, onStatusUpdate }: OrderDetailsDialogProps) {
  if (!isOpen || !order) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Order Details</h2>
            <p className="text-sm text-gray-500 mt-1">Order #{order.order_number}</p>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Material Information */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
              <Package className="w-5 h-5" />
              Material Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Material Name</p>
                <p className="font-medium text-gray-900">{order.materialName}</p>
              </div>
              {order.materialCategory && (
                <div>
                  <p className="text-sm text-gray-600">Category</p>
                  <p className="font-medium text-gray-900">{order.materialCategory}</p>
                </div>
              )}
              {order.materialBatchNumber && (
                <div>
                  <p className="text-sm text-gray-600">Batch Number</p>
                  <p className="font-medium text-gray-900">{order.materialBatchNumber}</p>
                </div>
              )}
            </div>
          </div>

          {/* Order Information */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Order Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Supplier</p>
                <p className="font-medium text-gray-900">{order.supplier}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Order Date</p>
                <p className="font-medium text-gray-900 flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {formatIndianDate(order.orderDate)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Expected Delivery</p>
                <p className="font-medium text-gray-900 flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {formatIndianDate(order.expectedDelivery)}
                </p>
              </div>
              {order.actualDelivery && (
                <div>
                  <p className="text-sm text-gray-600">Actual Delivery</p>
                  <p className="font-medium text-gray-900 flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {formatIndianDate(order.actualDelivery)}
                  </p>
                </div>
              )}
              {order.created_by && (
                <div>
                  <p className="text-sm text-gray-600">Created By</p>
                  <p className="font-medium text-gray-900 flex items-center gap-1">
                    <User className="w-4 h-4" />
                    {order.created_by}
                  </p>
                </div>
              )}
              {(order.createdAt || order.created_at) && (
                <div>
                  <p className="text-sm text-gray-600">Created On</p>
                  <p className="font-medium text-gray-900 flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {formatIndianDateTime(order.createdAt || order.created_at)}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Financial Information */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Financial Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Quantity</p>
                <p className="font-medium text-gray-900">{order.quantity} {order.unit}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Cost Per Unit</p>
                <p className="font-medium text-gray-900">₹{order.costPerUnit}</p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-sm text-gray-600">Total Cost</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(order.totalCost)}</p>
              </div>
            </div>
          </div>

          {/* Additional Information */}
          {(order.minThreshold || order.maxCapacity || order.qualityGrade) && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Additional Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {order.minThreshold && (
                  <div>
                    <p className="text-sm text-gray-600">Min Threshold</p>
                    <p className="font-medium text-gray-900">{order.minThreshold}</p>
                  </div>
                )}
                {order.maxCapacity && (
                  <div>
                    <p className="text-sm text-gray-600">Max Capacity</p>
                    <p className="font-medium text-gray-900">{order.maxCapacity}</p>
                  </div>
                )}
                {order.qualityGrade && (
                  <div>
                    <p className="text-sm text-gray-600">Quality Grade</p>
                    <p className="font-medium text-gray-900">{order.qualityGrade}</p>
                  </div>
                )}
                {order.isRestock && (
                  <div>
                    <p className="text-sm text-gray-600">Order Type</p>
                    <p className="font-medium text-gray-900">Restock</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Status History */}
          {order.status_history && order.status_history.length > 0 && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                <History className="w-5 h-5" />
                Status History
              </h3>
              <div className="space-y-3">
                {order.status_history
                  .slice()
                  .reverse()
                  .map((historyItem, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex-shrink-0 mt-1">
                        <Clock className="w-4 h-4 text-gray-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className={`text-xs ${
                            historyItem.status === 'delivered' ? 'bg-green-100 text-green-800' :
                            historyItem.status === 'shipped' || historyItem.status === 'in-transit' ? 'bg-orange-100 text-orange-800' :
                            historyItem.status === 'approved' ? 'bg-blue-100 text-blue-800' :
                            historyItem.status === 'pending' || historyItem.status === 'ordered' ? 'bg-gray-100 text-gray-800' :
                            historyItem.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {historyItem.status}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            {formatIndianDateTime(historyItem.changed_at)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-gray-600 mb-1">
                          <User className="w-3 h-3" />
                          <span>Changed by: {historyItem.changed_by}</span>
                        </div>
                        {historyItem.notes && (
                          <p className="text-xs text-gray-500 italic">{historyItem.notes}</p>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {(() => {
            const formattedNotes = formatNotes(order.notes);
            return formattedNotes ? (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Notes
                </h3>
                <p className="text-sm text-gray-700 bg-gray-50 p-4 rounded-lg whitespace-pre-wrap break-words">{formattedNotes}</p>
              </div>
            ) : null;
          })()}
        </div>

        {/* Footer with Actions */}
        <div className="p-6 border-t border-gray-200 flex items-center justify-between gap-4">
          <div className="flex-1">
            {(order.status === 'ordered' || order.status === 'pending') && onStatusUpdate && (
              <Button
                variant="outline"
                onClick={() => {
                  onStatusUpdate(order.id, 'approved');
                  onClose();
                }}
              >
                Approve Order
              </Button>
            )}
            {order.status === 'approved' && onStatusUpdate && (
              <Button
                variant="outline"
                onClick={() => {
                  onStatusUpdate(order.id, 'in-transit');
                  onClose();
                }}
              >
                Mark as Shipped
              </Button>
            )}
            {(order.status === 'shipped' || order.status === 'in-transit') && onStatusUpdate && (
              <Button
                className="bg-primary-600 text-white hover:bg-primary-700"
                onClick={() => {
                  onStatusUpdate(order.id, 'delivered');
                  onClose();
                }}
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Mark as Delivered
              </Button>
            )}
          </div>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}

