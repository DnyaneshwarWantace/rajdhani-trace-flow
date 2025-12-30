import { ShoppingCart, User, CheckCircle, Clock, Factory, Package, Truck, AlertTriangle, Eye, Edit, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatIndianDate } from '@/utils/formatHelpers';
import type { Order } from '@/services/orderService';
import { TruncatedText } from '@/components/ui/TruncatedText';
import { useNavigate } from 'react-router-dom';
import { calculateSQM } from '@/utils/sqmCalculator';

interface OrderCardProps {
  order: Order;
  onStatusUpdate: (orderId: string, newStatus: string) => void;
  onViewDetails: (order: Order) => void;
}

const statusConfig: Record<string, { label: string; icon: any; color: string }> = {
  pending: { label: 'Pending', icon: Clock, color: 'bg-yellow-100 text-yellow-800' },
  accepted: { label: 'Accepted', icon: CheckCircle, color: 'bg-blue-100 text-blue-800' },
  in_production: { label: 'In Production', icon: Factory, color: 'bg-purple-100 text-purple-800' },
  ready: { label: 'Ready', icon: Package, color: 'bg-indigo-100 text-indigo-800' },
  dispatched: { label: 'Dispatched', icon: Truck, color: 'bg-orange-100 text-orange-800' },
  delivered: { label: 'Delivered', icon: CheckCircle, color: 'bg-green-100 text-green-800' },
  cancelled: { label: 'Cancelled', icon: AlertTriangle, color: 'bg-red-100 text-red-800' },
};

export default function OrderCard({ order, onStatusUpdate, onViewDetails }: OrderCardProps) {
  const status = statusConfig[order.status] || statusConfig.pending;
  const StatusIcon = status.icon;
  const navigate = useNavigate();

  // Check if order needs individual product selection (for products, not raw materials)
  const needsIndividualProductSelection = (order: Order) => {
    return order.items?.some(item =>
      item.productType === 'product' &&
      (!item.selectedProducts || item.selectedProducts.length === 0)
    );
  };

  const canDispatchOrder = (order: Order) => {
    // For products: need individual products selected
    // For raw materials: can dispatch without selection
    return !needsIndividualProductSelection(order);
  };

  const handleDispatch = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (canDispatchOrder(order)) {
      onStatusUpdate(order.id, 'dispatched');
    } else {
      navigate(`/orders/${order.id}`);
    }
  };

  const handleDeliver = (e: React.MouseEvent) => {
    e.stopPropagation();
    onStatusUpdate(order.id, 'delivered');
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-shadow cursor-pointer" onClick={() => onViewDetails(order)}>
      {/* Status Bar at top */}
      <div className={`h-1 ${
        order.status === 'delivered' ? 'bg-green-500' :
        order.status === 'dispatched' ? 'bg-orange-500' :
        order.status === 'accepted' ? 'bg-blue-500' :
        'bg-yellow-500'
      }`} />

      <div className="p-4">
        {/* Header with Order Number and Status */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-gray-400" />
            <h3 className="font-semibold text-base">{order.orderNumber || order.id}</h3>
          </div>
          <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${status.color}`}>
            <StatusIcon className="w-3 h-3" />
            {status.label}
          </span>
        </div>

        {/* Customer */}
        <div className="flex items-center gap-1 text-sm text-gray-600 mb-2">
          <User className="w-4 h-4" />
          <TruncatedText text={order.customerName} maxLength={30} as="span" />
        </div>

        {/* Progress Bar */}
        {(order.status === 'accepted' || order.status === 'dispatched' || order.status === 'delivered') && (
          <div className="mb-3">
            <div className="text-xs text-gray-600 mb-1">Order Progress</div>
            <div className="flex items-center gap-2">
              {/* Accept */}
              <div className="flex-1 text-center">
                <div className={`h-1 rounded ${
                  order.status === 'accepted' || order.status === 'dispatched' || order.status === 'delivered'
                    ? 'bg-blue-500'
                    : 'bg-gray-200'
                }`} />
                <div className="text-xs mt-1">Accept</div>
              </div>
              {/* Dispatch */}
              <div className="flex-1 text-center">
                <div className={`h-1 rounded ${
                  order.status === 'dispatched' || order.status === 'delivered'
                    ? 'bg-orange-500'
                    : 'bg-gray-200'
                }`} />
                <div className="text-xs mt-1">Dispatch</div>
              </div>
              {/* Delivered */}
              <div className="flex-1 text-center">
                <div className={`h-1 rounded ${
                  order.status === 'delivered'
                    ? 'bg-green-500'
                    : 'bg-gray-200'
                }`} />
                <div className="text-xs mt-1">Delivered</div>
              </div>
            </div>
          </div>
        )}

        {/* Dates Grid */}
        <div className="grid grid-cols-2 gap-3 text-sm mb-3">
          <div>
            <div className="text-gray-600 text-xs">Order Date:</div>
            <div className="font-medium">{formatIndianDate(order.orderDate)}</div>
          </div>
          {order.expectedDelivery && (
            <div>
              <div className="text-gray-600 text-xs">Expected Delivery:</div>
              <div className="font-medium">{formatIndianDate(order.expectedDelivery)}</div>
            </div>
          )}
        </div>

        {/* Items Count and Total */}
        <div className="grid grid-cols-2 gap-3 text-sm mb-3">
          <div>
            <div className="text-gray-600 text-xs">Items:</div>
            <div className="font-medium">{order.items?.length || 0} products</div>
          </div>
          <div>
            <div className="text-gray-600 text-xs">Total Amount:</div>
            <div className="font-medium">{formatCurrency(order.totalAmount)}</div>
          </div>
        </div>

        {/* Order Items Details */}
        {order.items && order.items.length > 0 && (
          <div className="p-3 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2 text-sm">
              {order.status === 'delivered' ? 'Items Delivered:' : 'Order Items:'}
            </h4>
            <div className="space-y-2">
              {order.items.map((item, index) => {
                // Calculate SQM for products if dimensions are available
                let sqm = 0;
                let gsm = '';
                
                if (item.productType === 'product' && item.length && item.width) {
                  const length = parseFloat(item.length);
                  const width = parseFloat(item.width);
                  const lengthUnit = item.length_unit || 'm';
                  const widthUnit = item.width_unit || 'm';
                  
                  if (length > 0 && width > 0) {
                    sqm = calculateSQM(length, width, lengthUnit, widthUnit);
                  }
                }
                
                // Extract GSM from weight if available
                if (item.weight) {
                  const weightStr = String(item.weight);
                  const gsmMatch = weightStr.match(/(\d+)\s*GSM/i) || weightStr.match(/(\d+)\s*gsm/i);
                  if (gsmMatch) {
                    gsm = gsmMatch[1] + ' GSM';
                  } else if (item.weight_unit && item.weight_unit.toUpperCase().includes('GSM')) {
                    gsm = item.weight + ' ' + item.weight_unit;
                  }
                }
                
                return (
                  <div key={index} className="p-2 bg-white rounded border text-xs">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-medium text-sm">{item.productName}</div>
                        <div className="text-xs text-gray-600 mt-1 space-y-0.5">
                          <div>
                            {item.productType === 'raw_material' ? 'Raw Material' : 'Finished Product'} • Qty: {Number(item.quantity).toFixed(2)} {item.productType === 'raw_material' ? (item.unit || 'units') : (item.count_unit || 'rolls')}
                          </div>
                          {item.productType === 'product' && (
                            <>
                              {/* Dimensions */}
                              {(item.length || item.width) && (
                                <div className="flex items-center gap-1 flex-wrap">
                                  <span className="font-medium">Size:</span>
                                  {item.length && <span>{item.length} {item.length_unit || 'm'}</span>}
                                  {item.length && item.width && <span>×</span>}
                                  {item.width && <span>{item.width} {item.width_unit || 'm'}</span>}
                                  {sqm > 0 && <span className="text-blue-600">({sqm.toFixed(2)} SQM)</span>}
                                </div>
                              )}
                              {/* Weight */}
                              {item.weight && (
                                <div>
                                  <span className="font-medium">Weight:</span> {item.weight} {item.weight_unit || 'kg'}
                                  {gsm && <span className="text-purple-600 ml-1">({gsm})</span>}
                                </div>
                              )}
                              {/* Color */}
                              {item.color && (
                                <div>
                                  <span className="font-medium">Color:</span> {item.color}
                                </div>
                              )}
                              {/* Pattern */}
                              {item.pattern && (
                                <div>
                                  <span className="font-medium">Pattern:</span> {item.pattern}
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                      <div className="text-sm font-medium ml-3">
                        {formatCurrency(item.totalPrice)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Delivery Address for Delivered Orders */}
        {order.status === 'delivered' && order.delivery_address && (() => {
          const address = typeof order.delivery_address === 'string'
            ? JSON.parse(order.delivery_address)
            : order.delivery_address;

          return (
            <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
              <h4 className="text-sm font-medium text-green-800 mb-2 flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Delivered To:
              </h4>
              <div className="text-sm text-green-700">
                <div className="font-medium">{address.address}</div>
                <div className="text-green-600">
                  {address.city}, {address.state} - {address.pincode}
                </div>
                <div className="text-xs text-green-600 mt-1">✓ Address preserved from order creation</div>
              </div>
            </div>
          );
        })()}

        {/* Summary Grid */}
        <div className="grid grid-cols-2 gap-3 text-sm mt-3">
          <div>
            <div className="text-gray-600 text-xs">Paid:</div>
            <div className="font-semibold text-green-600">{formatCurrency(order.paidAmount)}</div>
          </div>
          <div>
            <div className="text-gray-600 text-xs">Outstanding:</div>
            <div className={`font-semibold ${order.outstandingAmount > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {formatCurrency(order.outstandingAmount)}
            </div>
          </div>
        </div>

        {/* Status-based Action Buttons */}
        {order.status === 'pending' && (
          <div className="mt-3 bg-yellow-50 p-3 rounded-lg">
            <div className="flex items-center gap-2 text-yellow-700 font-medium mb-2 text-xs">
              <Clock className="w-4 h-4" />
              <span>Order Pending - Awaiting Acceptance</span>
            </div>
            <Button
              className="w-full bg-blue-600 hover:bg-blue-700"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onStatusUpdate(order.id, 'accepted');
              }}
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Accept Order
            </Button>
          </div>
        )}

        {order.status === 'accepted' && (
          <div className="mt-3 bg-blue-50 p-3 rounded-lg">
            <div className="flex items-center gap-2 text-blue-700 font-medium mb-2 text-xs">
              <CheckCircle className="w-4 h-4" />
              <span>Order Accepted - Ready for Dispatch</span>
            </div>
            {canDispatchOrder(order) ? (
              <Button
                className="w-full bg-orange-600 hover:bg-orange-700"
                size="sm"
                onClick={handleDispatch}
              >
                <Package className="w-4 h-4 mr-2" />
                Dispatch Order
              </Button>
            ) : (
              <>
                <Button
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  size="sm"
                  onClick={handleDispatch}
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Select Individual Products
                </Button>
                <div className="text-xs text-gray-600 text-center mt-1">
                  Individual product selection required
                </div>
              </>
            )}
          </div>
        )}

        {order.status === 'dispatched' && (
          <div className="mt-3 bg-orange-50 p-3 rounded-lg">
            <div className="flex items-center gap-2 text-orange-700 font-medium mb-2 text-xs">
              <Package className="w-4 h-4" />
              <span>Order Dispatched - Ready to Deliver</span>
            </div>
            <Button
              className="w-full bg-green-600 hover:bg-green-700"
              size="sm"
              onClick={handleDeliver}
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Mark as Delivered
            </Button>
          </div>
        )}

        {order.status === 'delivered' && (
          <div className="mt-3 bg-green-50 p-3 rounded-lg">
            <div className="flex items-center gap-2 text-green-700 font-medium mb-2 text-xs">
              <CheckCircle className="w-4 h-4" />
              <span>Order Delivered Successfully</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm mb-2">
              <div className="flex justify-between">
                <span>Paid:</span>
                <span className="font-medium text-green-600">{formatCurrency(order.paidAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span>Outstanding:</span>
                <span className={`font-medium ${order.outstandingAmount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {formatCurrency(order.outstandingAmount)}
                </span>
              </div>
            </div>
            <div className="text-xs text-green-600">
              Delivered on {order.deliveredAt ? new Date(order.deliveredAt).toLocaleDateString() : 'N/A'}
            </div>
          </div>
        )}

        {/* View Details Button */}
        <Button
          size="sm"
          variant="outline"
          onClick={(e) => {
            e.stopPropagation();
            onViewDetails(order);
          }}
          className="w-full mt-3 text-xs"
        >
          <Eye className="w-3 h-3 mr-1" />
          View Details
        </Button>
      </div>
    </div>
  );
}


