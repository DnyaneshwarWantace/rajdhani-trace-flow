import { useState, useEffect, useCallback } from 'react';
import { TruncatedText } from '@/components/ui/TruncatedText';
import { formatIndianDateTime, formatIndianDate, formatCurrency } from '@/utils/formatHelpers';
import {
  Package, ShoppingCart, Factory, Settings, User, Info, Plus, Edit, Trash2,
  ChevronDown, ChevronUp, Clock, Calendar, Building2, CheckCircle2, AlertTriangle,
} from 'lucide-react';
import type { Notification } from '@/services/notificationService';
import { ManageStockService } from '@/services/manageStockService';
import type { StockOrder } from '@/types/manageStock';

interface ActivityNotificationCardProps {
  notification: Notification;
  onClick?: () => void;
  expandedId?: string | null;
  onExpand?: (id: string | null) => void;
  onMarkAsRead?: (id: string) => void;
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: (id: string) => void;
}

export default function ActivityNotificationCard({
  notification,
  onClick,
  expandedId,
  onExpand,
  onMarkAsRead,
  selectable = false,
  selected = false,
  onToggleSelect,
}: ActivityNotificationCardProps) {
  const isExpanded = expandedId === notification.id;
  const [orderDetails, setOrderDetails] = useState<StockOrder | null>(null);
  const [loadingOrder, setLoadingOrder] = useState(false);

  const activityData = notification.related_data;
  const action = activityData?.action || '';
  const actionCategory = activityData?.action_category || '';
  const userName = notification.related_data?.created_by_user || activityData?.user_name || activityData?.created_by_user || '';
  const metadata = activityData?.metadata || {};
  const notificationDate = notification.created_at || (notification as any).createdAt || notification.updated_at || activityData?.created_at;
  const dateDisplay = notificationDate ? formatIndianDateTime(notificationDate) : '—';

  const isPurchaseOrder = actionCategory === 'PURCHASE_ORDER' || action?.includes('PURCHASE_ORDER');
  const orderNumber = metadata?.order_number || activityData?.target_resource || notification.related_id;

  const loadOrderDetails = useCallback(async () => {
    if (!orderNumber) return;
    try {
      setLoadingOrder(true);
      const { data: orders } = await ManageStockService.getOrders({ limit: 1000 });
      const order = orders.find((o: StockOrder) =>
        o.order_number === orderNumber || o.id === orderNumber || o.id === notification.related_id
      );
      if (order) {
        const fullOrder = await ManageStockService.getOrderById(order.id);
        setOrderDetails(fullOrder || order);
      }
    } catch {}
    finally { setLoadingOrder(false); }
  }, [orderNumber, notification.related_id]);

  useEffect(() => {
    if (isExpanded && isPurchaseOrder && orderNumber && !orderDetails && !loadingOrder) {
      loadOrderDetails();
    }
  }, [isExpanded, isPurchaseOrder, orderNumber, orderDetails, loadingOrder, loadOrderDetails]);

  useEffect(() => {
    if (isExpanded && notification.status === 'unread' && onMarkAsRead) {
      onMarkAsRead(notification.id);
    }
  }, [isExpanded, notification.status, notification.id, onMarkAsRead]);

  const getActionBadge = () => {
    if (action.includes('DELETE')) return { label: 'Deleted', dot: 'bg-red-500' };
    if (action.includes('CREATE')) return { label: 'Created', dot: 'bg-green-500' };
    if (action.includes('UPDATE')) return { label: 'Updated', dot: 'bg-blue-500' };
    if (action.includes('STATUS')) return { label: 'Status', dot: 'bg-amber-500' };
    return { label: 'Action', dot: 'bg-gray-400' };
  };

  const getIcon = () => {
    if (action.includes('DELETE')) return <Trash2 className="w-4 h-4 text-red-500" />;
    if (action.includes('CREATE')) return <Plus className="w-4 h-4 text-green-500" />;
    if (action.includes('UPDATE')) return <Edit className="w-4 h-4 text-blue-500" />;
    switch (actionCategory) {
      case 'PRODUCT': return <Package className="w-4 h-4 text-blue-500" />;
      case 'MATERIAL': return <Factory className="w-4 h-4 text-indigo-500" />;
      case 'PURCHASE_ORDER': return <ShoppingCart className="w-4 h-4 text-purple-500" />;
      case 'ORDER': return <ShoppingCart className="w-4 h-4 text-purple-500" />;
      case 'RECIPE':
      case 'PRODUCTION': return <Factory className="w-4 h-4 text-orange-500" />;
      case 'SETTINGS': return <Settings className="w-4 h-4 text-gray-500" />;
      case 'USER': return <User className="w-4 h-4 text-gray-500" />;
      default: return <Info className="w-4 h-4 text-gray-400" />;
    }
  };

  const getIconBg = () => {
    if (action.includes('DELETE')) return 'bg-red-50';
    if (action.includes('CREATE')) return 'bg-green-50';
    if (action.includes('UPDATE')) return 'bg-blue-50';
    switch (actionCategory) {
      case 'MATERIAL': return 'bg-indigo-50';
      case 'PURCHASE_ORDER':
      case 'ORDER': return 'bg-purple-50';
      case 'RECIPE':
      case 'PRODUCTION': return 'bg-orange-50';
      default: return 'bg-gray-50';
    }
  };

  const hasDetails = () => !!(
    isPurchaseOrder || metadata?.product_name || metadata?.material_name ||
    action.includes('RECIPE') || actionCategory === 'RECIPE' ||
    metadata?.quantity_generated || metadata?.category ||
    (activityData?.changes && Object.keys(activityData.changes).length > 0) ||
    activityData?.target_resource || notification.type === 'order_alert' ||
    notification.related_data?.order_number || notification.related_data?.product_details ||
    notification.related_data?.material_details || metadata?.batch_number
  );

  const badge = getActionBadge();
  const isUnread = notification.status === 'unread';

  const handleClick = (e: React.MouseEvent) => {
    if (hasDetails()) {
      onExpand?.(isExpanded ? null : notification.id);
    } else if (onClick) {
      onClick();
    }
  };

  return (
    <div
      className={`rounded-2xl border overflow-hidden transition-all ${
        selected ? 'border-blue-400 shadow-md' :
        isUnread ? 'bg-white border-blue-100 shadow-sm' : 'bg-white border-gray-100'
      } ${hasDetails() ? 'cursor-pointer' : ''}`}
      onClick={handleClick}
    >
      {isUnread && <div className="h-0.5 bg-gradient-to-r from-blue-500 to-blue-300" />}

      <div className="px-4 pt-3.5 pb-3 flex items-start gap-3">
        {selectable && onToggleSelect && (
          <div className="shrink-0 flex items-center pt-1" onClick={e => e.stopPropagation()}>
            <input
              type="checkbox"
              checked={selected}
              onChange={() => onToggleSelect(notification.id)}
              className="h-4 w-4 rounded border-gray-300 text-blue-600"
            />
          </div>
        )}

        {/* Icon */}
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${getIconBg()}`}>
          {getIcon()}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-0.5">
            <p className={`text-sm font-bold line-clamp-1 flex-1 ${isUnread ? 'text-gray-900' : 'text-gray-600'}`}>
              {notification.title}
            </p>
            <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
              <span className={`inline-flex items-center gap-1 text-[9px] font-extrabold px-1.5 py-0.5 rounded-full text-white ${badge.dot}`}>
                <span className="w-1 h-1 rounded-full bg-white/60 inline-block" />
                {badge.label}
              </span>
              {hasDetails() && (
                isExpanded
                  ? <ChevronUp className="w-3.5 h-3.5 text-gray-300" />
                  : <ChevronDown className="w-3.5 h-3.5 text-gray-300" />
              )}
            </div>
          </div>
          {notification.message && notification.message !== notification.title && (
            <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">{notification.message}</p>
          )}
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {userName && (
              <span className="text-[10px] text-gray-400">
                By <span className="font-semibold text-gray-600">{userName}</span>
              </span>
            )}
            {notificationDate && (
              <div className="flex items-center gap-0.5">
                <Clock className="w-2.5 h-2.5 text-gray-300" />
                <span className="text-[10px] text-gray-300">{dateDisplay}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Expanded Detail */}
      {isExpanded && (
        <div className="border-t border-gray-50 bg-gray-50/70 px-4 py-3 space-y-2" onClick={e => e.stopPropagation()}>

          {/* Purchase Order Details */}
          {isPurchaseOrder && (
            <div className="space-y-2">
              <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">Order Info</p>
              {loadingOrder ? (
                <div className="flex items-center gap-2 py-2">
                  <div className="w-4 h-4 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin" />
                  <span className="text-xs text-gray-400">Loading order...</span>
                </div>
              ) : (
                <>
                  {(orderDetails?.order_number || orderNumber) && (
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400">Order #</span>
                      <span className="font-bold text-gray-800">{orderDetails?.order_number || orderNumber}</span>
                    </div>
                  )}
                  {orderDetails?.materialName && (
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400">Material</span>
                      <span className="font-bold text-gray-800 max-w-[60%] text-right line-clamp-1">{orderDetails.materialName}</span>
                    </div>
                  )}
                  {orderDetails?.supplier && (
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400">Supplier</span>
                      <span className="font-bold text-gray-800">{orderDetails.supplier}</span>
                    </div>
                  )}
                  {orderDetails?.quantity && (
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400">Quantity</span>
                      <span className="font-bold text-gray-800">{orderDetails.quantity} {orderDetails.unit}</span>
                    </div>
                  )}
                  {orderDetails?.totalCost !== undefined && (
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400">Total Cost</span>
                      <span className="font-bold text-gray-800">{formatCurrency(orderDetails.totalCost)}</span>
                    </div>
                  )}
                  {(metadata?.old_status || metadata?.new_status) && (
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400">Status</span>
                      <span className="font-bold text-gray-800">{metadata.old_status || '—'} → {metadata.new_status || '—'}</span>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Production / Restock request */}
          {(notification.type === 'production_request' || notification.type === 'restock_request') && notification.related_data && (
            <div className="space-y-2">
              {notification.related_data.order_number && (
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">Order</span>
                  <span className="font-bold text-gray-800">{notification.related_data.order_number}</span>
                </div>
              )}
              {notification.related_data.customer_name && (
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">Customer</span>
                  <span className="font-bold text-gray-800">{notification.related_data.customer_name}</span>
                </div>
              )}
              {(notification.related_data.product_name || notification.related_data.material_name) && (
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">{notification.type === 'production_request' ? 'Product' : 'Material'}</span>
                  <span className="font-bold text-gray-800 max-w-[60%] text-right line-clamp-1">
                    {notification.related_data.product_name || notification.related_data.material_name}
                  </span>
                </div>
              )}
              {/* Stock mini-table */}
              <div className="flex border border-gray-200 rounded-xl overflow-hidden mt-1 bg-white">
                {[
                  { label: 'Required', val: notification.related_data.quantity_ordered || 0, color: 'text-blue-600' },
                  { label: 'Available', val: notification.related_data.available_stock || 0, color: 'text-green-600' },
                  { label: 'Shortage', val: notification.related_data.shortfall || 0, color: 'text-red-500' },
                ].map((item, i) => (
                  <div key={item.label} className={`flex-1 flex flex-col items-center py-2 ${i > 0 ? 'border-l border-gray-200' : ''}`}>
                    <span className={`text-xs font-extrabold ${item.color}`}>{item.val}</span>
                    <span className="text-[9px] text-gray-400 uppercase tracking-wide">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Production Batch */}
          {(action.includes('PRODUCTION') || actionCategory === 'PRODUCTION') && metadata?.batch_number && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">Batch Details</p>
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Batch #</span>
                <span className="font-bold text-gray-800">{metadata.batch_number}</span>
              </div>
              {metadata.product_name && (
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">Product</span>
                  <span className="font-bold text-gray-800 max-w-[60%] text-right line-clamp-1">{metadata.product_name}</span>
                </div>
              )}
              {metadata.planned_quantity && (
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">Qty</span>
                  <span className="font-bold text-gray-800">{metadata.planned_quantity} units</span>
                </div>
              )}
            </div>
          )}

          {/* Recipe */}
          {(action.includes('RECIPE') || actionCategory === 'RECIPE') && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">Recipe Details</p>
              {metadata?.product_name && (
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">Product</span>
                  <span className="font-bold text-gray-800">{metadata.product_name}</span>
                </div>
              )}
              {metadata?.material_name && (
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">Material</span>
                  <span className="font-bold text-gray-800">{metadata.material_name}</span>
                </div>
              )}
              {metadata?.material_count !== undefined && (
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">Materials</span>
                  <span className="font-bold text-gray-800">{metadata.material_count}</span>
                </div>
              )}
            </div>
          )}

          {/* Recipe changes */}
          {metadata?.added_materials?.length > 0 && (
            <div className="space-y-1">
              <p className="text-[10px] font-extrabold text-green-600 uppercase tracking-wider">Added ({metadata.added_materials.length})</p>
              {metadata.added_materials.slice(0, 3).map((mat: any, i: number) => (
                <div key={i} className="text-xs text-gray-700 flex justify-between">
                  <span>{mat.material_name}</span>
                  <span className="text-gray-500">{mat.quantity_required} {mat.unit}</span>
                </div>
              ))}
              {metadata.added_materials.length > 3 && <p className="text-[10px] text-gray-400">+{metadata.added_materials.length - 3} more</p>}
            </div>
          )}
          {metadata?.removed_materials?.length > 0 && (
            <div className="space-y-1">
              <p className="text-[10px] font-extrabold text-red-500 uppercase tracking-wider">Removed ({metadata.removed_materials.length})</p>
              {metadata.removed_materials.slice(0, 3).map((mat: any, i: number) => (
                <div key={i} className="text-xs text-gray-700 flex justify-between">
                  <span>{mat.material_name}</span>
                  <span className="text-gray-500">{mat.quantity_required} {mat.unit}</span>
                </div>
              ))}
            </div>
          )}
          {metadata?.changed_materials?.length > 0 && (
            <div className="space-y-1">
              <p className="text-[10px] font-extrabold text-blue-500 uppercase tracking-wider">Changed ({metadata.changed_materials.length})</p>
              {metadata.changed_materials.slice(0, 3).map((mat: any, i: number) => (
                <div key={i} className="text-xs text-gray-700">
                  {mat.material_name}: {mat.old_quantity} → {mat.new_quantity} {mat.unit}
                </div>
              ))}
            </div>
          )}

          {/* Raw materials used */}
          {metadata?.raw_materials?.length > 0 && (
            <div className="space-y-1">
              <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">Materials Used</p>
              {metadata.raw_materials.slice(0, 3).map((mat: any, i: number) => (
                <div key={i} className="flex justify-between text-xs">
                  <span className="text-gray-700">{mat.material_name}</span>
                  <span className="text-gray-500">{mat.quantity_used} {mat.unit}</span>
                </div>
              ))}
              {metadata.raw_materials.length > 3 && <p className="text-[10px] text-gray-400">+{metadata.raw_materials.length - 3} more</p>}
            </div>
          )}

          {/* Changes */}
          {activityData?.changes && Object.keys(activityData.changes).length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">Changes</p>
              {Object.entries(activityData.changes).slice(0, 5).map(([field, change]: [string, any]) => {
                if (typeof change === 'object' && change !== null) {
                  if (change.old !== undefined && change.new !== undefined) {
                    return (
                      <div key={field} className="text-xs">
                        <span className="text-gray-400 capitalize">{field.replace(/_/g, ' ')}: </span>
                        <span className="text-gray-500 line-through">{String(change.old).slice(0, 30)}</span>
                        <span className="text-gray-300 mx-1">→</span>
                        <span className="font-bold text-gray-800">{String(change.new).slice(0, 30)}</span>
                      </div>
                    );
                  }
                }
                return null;
              })}
              {Object.keys(activityData.changes).length > 5 && (
                <p className="text-[10px] text-gray-400">+{Object.keys(activityData.changes).length - 5} more fields</p>
              )}
            </div>
          )}

          {/* Wastage */}
          {metadata?.waste_type && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-extrabold text-red-500 uppercase tracking-wider">Wastage</p>
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Type</span>
                <span className="font-bold text-gray-800 capitalize">{metadata.waste_type}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Quantity</span>
                <span className="font-bold text-red-500">{metadata.quantity} {metadata.unit}</span>
              </div>
              {metadata.reason && (
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">Reason</span>
                  <span className="font-bold text-gray-800 max-w-[60%] text-right">{metadata.reason}</span>
                </div>
              )}
            </div>
          )}

          {/* Product/Material general */}
          {(metadata?.product_name || metadata?.material_name) && !action.includes('RECIPE') && actionCategory !== 'RECIPE' && !action.includes('PRODUCTION') && actionCategory !== 'PRODUCTION' && (
            <div className="flex justify-between text-xs">
              <span className="text-gray-400">{metadata.product_name ? 'Product' : 'Material'}</span>
              <span className="font-bold text-gray-800 max-w-[65%] text-right line-clamp-1">
                {metadata.product_name || metadata.material_name}
              </span>
            </div>
          )}

          {/* Action */}
          {action && !isPurchaseOrder && (
            <div className="flex justify-between text-xs pt-1 border-t border-gray-100 mt-1">
              <span className="text-gray-400">Action</span>
              <span className="font-bold text-gray-700 capitalize">{action.replace(/_/g, ' ').toLowerCase()}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
