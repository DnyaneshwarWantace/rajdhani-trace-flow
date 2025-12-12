import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TruncatedText } from '@/components/ui/TruncatedText';
import { formatDate, formatIndianDateTime, formatIndianDate, formatCurrency } from '@/utils/formatHelpers';
import { 
  Package, 
  ShoppingCart, 
  Factory, 
  Settings, 
  User, 
  Info,
  Plus,
  Edit,
  Trash2,
  ChevronDown,
  ChevronUp,
  Clock,
  Calendar,
  Building2,
  CheckCircle2
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
}

export default function ActivityNotificationCard({ 
  notification, 
  onClick,
  expandedId,
  onExpand,
  onMarkAsRead
}: ActivityNotificationCardProps) {
  const isExpanded = expandedId === notification.id;
  const [orderDetails, setOrderDetails] = useState<StockOrder | null>(null);
  const [loadingOrder, setLoadingOrder] = useState(false);
  
  const activityData = notification.related_data;
  const action = activityData?.action || '';
  const actionCategory = activityData?.action_category || '';
  const userName = activityData?.user_name || 'User';
  const metadata = activityData?.metadata || {};
  
  // Check if this is a purchase order notification
  const isPurchaseOrder = actionCategory === 'PURCHASE_ORDER' || action?.includes('PURCHASE_ORDER');
  const orderNumber = metadata?.order_number || activityData?.target_resource || notification.related_id;
  
  // Fetch purchase order details when expanded
  useEffect(() => {
    if (isExpanded && isPurchaseOrder && orderNumber && !orderDetails && !loadingOrder) {
      loadOrderDetails();
    }
  }, [isExpanded, isPurchaseOrder, orderNumber]);
  
  const loadOrderDetails = async () => {
    if (!orderNumber) return;
    
    try {
      setLoadingOrder(true);
      // Try to find order by order_number or ID
      const { data: orders } = await ManageStockService.getOrders({ limit: 1000 });
      const order = orders.find((o: StockOrder) => 
        o.order_number === orderNumber || 
        o.id === orderNumber ||
        o.id === notification.related_id
      );
      
      if (order) {
        // Get full order details
        const fullOrder = await ManageStockService.getOrderById(order.id);
        if (fullOrder) {
          setOrderDetails(fullOrder);
        } else {
          setOrderDetails(order);
        }
      }
    } catch (error) {
      console.error('Error loading order details:', error);
    } finally {
      setLoadingOrder(false);
    }
  };

  // Get icon based on action
  const getIcon = () => {
    if (action.includes('DELETE')) {
      return <Trash2 className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" />;
    }
    if (action.includes('CREATE')) {
      return <Plus className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />;
    }
    if (action.includes('UPDATE')) {
      return <Edit className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />;
    }

    switch (actionCategory) {
      case 'PRODUCT':
        return <Package className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />;
      case 'MATERIAL':
        return <Factory className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" />;
      case 'ORDER':
        return <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />;
      case 'RECIPE':
      case 'PRODUCTION':
        return <Factory className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600" />;
      case 'SETTINGS':
        return <Settings className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />;
      case 'USER':
        return <User className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />;
      default:
        return <Info className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />;
    }
  };

  // Get badge color based on action
  const getBadgeColor = () => {
    if (action.includes('DELETE')) {
      return 'bg-red-100 text-red-700 border-red-200';
    }
    if (action.includes('CREATE')) {
      return 'bg-green-100 text-green-700 border-green-200';
    }
    if (action.includes('UPDATE')) {
      return 'bg-blue-100 text-blue-700 border-blue-200';
    }
    return 'bg-gray-100 text-gray-700 border-gray-200';
  };

  // Get action label
  const getActionLabel = () => {
    if (action.includes('CREATE')) return 'Created';
    if (action.includes('UPDATE')) return 'Updated';
    if (action.includes('DELETE')) return 'Deleted';
    return 'Action';
  };

  // Mark as read when expanded
  useEffect(() => {
    if (isExpanded && notification.status === 'unread' && onMarkAsRead) {
      onMarkAsRead(notification.id);
    }
  }, [isExpanded, notification.status, notification.id, onMarkAsRead]);

  const handleCardClick = (e: React.MouseEvent) => {
    // Prevent navigation when clicking expand/collapse button
    if ((e.target as HTMLElement).closest('.expand-button')) {
      e.stopPropagation();
      const newExpandedId = isExpanded ? null : notification.id;
      onExpand?.(newExpandedId);
      return;
    }
    // If there are details to show, toggle expand on card click
    if (hasDetails()) {
      const newExpandedId = isExpanded ? null : notification.id;
      onExpand?.(newExpandedId);
    } else if (onClick) {
      onClick();
    }
  };

  // Check if notification has expandable details
  const hasDetails = () => {
    return !!(
      isPurchaseOrder ||
      (metadata?.product_name || metadata?.material_name) ||
      (action.includes('RECIPE') || actionCategory === 'RECIPE') ||
      metadata?.quantity_generated ||
      metadata?.category ||
      (activityData?.changes && Object.keys(activityData.changes).length > 0) ||
      activityData?.target_resource
    );
  };

  return (
    <Card
      className={`transition-all hover:shadow-md ${
        notification.status === 'unread'
          ? 'bg-blue-50/30'
          : notification.status === 'dismissed'
          ? 'bg-gray-50/30 opacity-75'
          : 'bg-white'
      } ${hasDetails() ? 'cursor-pointer' : ''}`}
      onClick={handleCardClick}
    >
      <CardContent className="p-3 sm:p-4">
        <div className="flex gap-2 sm:gap-3">
          {/* Icon */}
          <div className="flex-shrink-0 mt-0.5">
            <div className="w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center">
              {getIcon()}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-2 mb-1 min-w-0">
                  <h3 className={`text-xs sm:text-sm font-semibold min-w-0 flex-1 line-clamp-2 ${
                    notification.status === 'unread' ? 'text-gray-900' : 'text-gray-500'
                  }`}>
                    {notification.title}
                  </h3>
                  {notification.status === 'unread' && (
                    <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1"></div>
                  )}
                </div>
                {notification.message && notification.message !== notification.title && (
                  <p className="text-[10px] sm:text-xs text-gray-600 min-w-0 line-clamp-1">
                    {notification.message}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <Badge className={`${getBadgeColor()} text-[10px] px-1.5 py-0.5`}>
                  {getActionLabel()}
                </Badge>
                {hasDetails() && (
                  <button
                    className="expand-button p-1 hover:bg-gray-100 rounded transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      const newExpandedId = isExpanded ? null : notification.id;
                      onExpand?.(newExpandedId);
                    }}
                    aria-label={isExpanded ? 'Collapse details' : 'Expand details'}
                  >
                    {isExpanded ? (
                      <ChevronUp className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500" />
                    ) : (
                      <ChevronDown className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500" />
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Activity Details - Collapsible */}
            {isExpanded && (
              <div className="mt-3 animate-in slide-in-from-top-2 duration-200">
                {/* Purchase Order Details - Special Layout */}
                {isPurchaseOrder && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-3">
                    {/* Left: Order Info */}
                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <ShoppingCart className="w-4 h-4" />
                        Order Information
                      </h4>
                      
                      {loadingOrder ? (
                        <div className="text-sm text-gray-500">Loading order details...</div>
                      ) : orderDetails ? (
                        <div className="space-y-3">
                          <div>
                            <p className="text-xs font-medium text-gray-600 mb-1">Order Number</p>
                            <p className="text-sm font-semibold text-gray-900">{orderDetails.order_number || orderNumber}</p>
                          </div>
                          
                          <div>
                            <p className="text-xs font-medium text-gray-600 mb-1">Material Name</p>
                            <p className="text-sm text-gray-900 break-words">
                              {orderDetails.materialName ? (
                                <TruncatedText text={orderDetails.materialName} maxLength={60} as="span" />
                              ) : (
                                'N/A'
                              )}
                            </p>
                          </div>
                          
                          <div>
                            <p className="text-xs font-medium text-gray-600 mb-1">Supplier</p>
                            <p className="text-sm text-gray-900 flex items-center gap-1">
                              <Building2 className="w-3 h-3" />
                              {orderDetails.supplier || 'N/A'}
                            </p>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-200">
                            <div>
                              <p className="text-xs font-medium text-gray-600 mb-1">Quantity</p>
                              <p className="text-sm text-gray-900">
                                {orderDetails.quantity} {orderDetails.unit}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs font-medium text-gray-600 mb-1">Total Cost</p>
                              <p className="text-sm font-semibold text-gray-900">
                                {formatCurrency(orderDetails.totalCost)}
                              </p>
                            </div>
                          </div>
                          
                          {orderDetails.orderDate && (
                            <div className="pt-2 border-t border-gray-200">
                              <p className="text-xs font-medium text-gray-600 mb-1">Order Date</p>
                              <p className="text-sm text-gray-900 flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {formatIndianDate(orderDetails.orderDate)}
                              </p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div>
                            <p className="text-xs font-medium text-gray-600 mb-1">Order Number</p>
                            <p className="text-sm font-semibold text-gray-900">{orderNumber}</p>
                          </div>
                          {metadata?.supplier_name && (
                            <div>
                              <p className="text-xs font-medium text-gray-600 mb-1">Supplier</p>
                              <p className="text-sm text-gray-900">{metadata.supplier_name}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    
                    {/* Right: Status Timeline */}
                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        Status Timeline
                      </h4>
                      
                      {loadingOrder ? (
                        <div className="text-sm text-gray-500">Loading timeline...</div>
                      ) : orderDetails?.status_history && orderDetails.status_history.length > 0 ? (
                        <div className="space-y-3">
                          {(orderDetails.status_history as Array<{
                            status: string;
                            changed_by: string;
                            changed_at: string;
                            notes?: string;
                          }>)
                            .slice()
                            .reverse()
                            .map((historyItem: {
                              status: string;
                              changed_by: string;
                              changed_at: string;
                              notes?: string;
                            }, index: number) => {
                              const isLatest = index === 0;
                              const statusColors = {
                                delivered: 'bg-green-100 text-green-800 border-green-200',
                                shipped: 'bg-orange-100 text-orange-800 border-orange-200',
                                'in-transit': 'bg-orange-100 text-orange-800 border-orange-200',
                                approved: 'bg-blue-100 text-blue-800 border-blue-200',
                                pending: 'bg-gray-100 text-gray-800 border-gray-200',
                                ordered: 'bg-gray-100 text-gray-800 border-gray-200',
                                cancelled: 'bg-red-100 text-red-800 border-red-200',
                              };
                              
                              return (
                                <div 
                                  key={index} 
                                  className={`p-2 rounded-lg border ${
                                    isLatest ? statusColors[historyItem.status as keyof typeof statusColors] || 'bg-gray-100' : 'bg-white border-gray-200'
                                  }`}
                                >
                                  <div className="flex items-center justify-between mb-1">
                                    <Badge className={`text-xs ${
                                      statusColors[historyItem.status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'
                                    }`}>
                                      {historyItem.status}
                                    </Badge>
                                    {isLatest && (
                                      <CheckCircle2 className="w-3 h-3 text-green-600" />
                                    )}
                                  </div>
                                  <div className="text-xs text-gray-600 mt-1">
                                    <div className="flex items-center gap-1">
                                      <User className="w-3 h-3" />
                                      <span>{historyItem.changed_by}</span>
                                    </div>
                                    <div className="flex items-center gap-1 mt-1">
                                      <Clock className="w-3 h-3" />
                                      <span>{formatIndianDateTime(historyItem.changed_at)}</span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {/* Current Status */}
                          {orderDetails?.status && (
                            <div className="p-2 rounded-lg border bg-blue-100 border-blue-200">
                              <Badge className="text-xs bg-blue-200 text-blue-800">
                                {orderDetails.status}
                              </Badge>
                              <p className="text-xs text-gray-600 mt-1">
                                Current Status
                              </p>
                            </div>
                          )}
                          
                          {/* Show status change from notification */}
                          {(metadata?.old_status || metadata?.new_status) && (
                            <div className="p-2 rounded-lg border bg-white border-gray-200">
                              <div className="text-xs text-gray-600">
                                <div className="flex items-center gap-1 mb-1">
                                  <span className="font-medium">From:</span>
                                  <Badge className="text-xs bg-gray-100 text-gray-800">
                                    {metadata.old_status || 'N/A'}
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-1">
                                  <span className="font-medium">To:</span>
                                  <Badge className="text-xs bg-blue-100 text-blue-800">
                                    {metadata.new_status || 'N/A'}
                                  </Badge>
                                </div>
                                {activityData?.created_at && (
                                  <div className="flex items-center gap-1 mt-1">
                                    <Clock className="w-3 h-3" />
                                    <span>{formatIndianDateTime(activityData.created_at)}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                          
                          {!orderDetails && !metadata?.old_status && (
                            <p className="text-xs text-gray-500">No status history available</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Regular Activity Details */}
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
              {/* Product/Material Info */}
              {(metadata?.product_name || metadata?.material_name) && (
                <div className="space-y-1 mb-2">
                  <p className="text-xs font-medium text-gray-700">
                    {metadata.product_name ? 'Product' : 'Material'}:
                  </p>
                  <p className="text-xs text-gray-900 break-words">
                    <TruncatedText 
                      text={metadata.product_name || metadata.material_name || ''} 
                      maxLength={80} 
                      as="span" 
                    />
                  </p>
                  {notification.related_id && (
                    <p className="text-xs text-gray-500">
                      ID: {notification.related_id}
                    </p>
                  )}
                </div>
              )}

              {/* Recipe Info */}
              {(action.includes('RECIPE') || actionCategory === 'RECIPE') && (
                <div className="mb-2 pb-2 border-b border-gray-200 space-y-1">
                  {metadata?.recipe_id && (
                    <div>
                      <p className="text-xs font-medium text-gray-700">Recipe ID:</p>
                      <p className="text-xs text-gray-900">{metadata.recipe_id}</p>
                    </div>
                  )}
                  {metadata?.product_name && (
                    <div>
                      <p className="text-xs font-medium text-gray-700">Product:</p>
                      <p className="text-xs text-gray-900">{metadata.product_name}</p>
                      {metadata?.product_id && (
                        <p className="text-xs text-gray-500">ID: {metadata.product_id}</p>
                      )}
                    </div>
                  )}
                  {metadata?.material_count !== undefined && (
                    <div>
                      <p className="text-xs font-medium text-gray-700">Materials:</p>
                      <p className="text-xs text-gray-900">
                        {metadata.material_count} material{metadata.material_count !== 1 ? 's' : ''}
                      </p>
                    </div>
                  )}
                  {metadata?.material_name && (
                    <div>
                      <p className="text-xs font-medium text-gray-700">
                        {action.includes('MATERIAL_ADD') ? 'Added Material' : 
                         action.includes('MATERIAL_REMOVE') ? 'Removed Material' : 'Material'}:
                      </p>
                      <p className="text-xs text-gray-900 break-words">
                        <TruncatedText text={metadata.material_name} maxLength={80} as="span" />
                      </p>
                      {metadata?.quantity_per_sqm && (
                        <p className="text-xs text-gray-500">
                          {metadata.quantity_per_sqm} {metadata.unit || ''}/SQM
                        </p>
                      )}
                      {metadata?.material_type && (
                        <p className="text-xs text-gray-500 capitalize">
                          Type: {metadata.material_type.replace('_', ' ')}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Individual Products Count */}
              {metadata?.quantity_generated && (
                <div className="mb-2 pb-2 border-b border-gray-200">
                  <p className="text-xs font-medium text-gray-700">
                    Individual Products Created:
                  </p>
                  <p className="text-xs text-gray-900 font-semibold">
                    {metadata.quantity_generated} item{metadata.quantity_generated > 1 ? 's' : ''}
                  </p>
                </div>
              )}

              {/* Dropdown Info */}
              {metadata?.category && (
                <div className="space-y-1 mb-2">
                  <p className="text-xs font-medium text-gray-700">Category:</p>
                  <p className="text-xs text-gray-900 capitalize">{metadata.category}</p>
                  {metadata.value && (
                    <p className="text-xs text-gray-500">Value: {metadata.value}</p>
                  )}
                </div>
              )}

              {/* Changes Details - Show what was actually changed */}
              {activityData?.changes && Object.keys(activityData.changes).length > 0 && (
                <div className="mb-2 pb-2 border-b border-gray-200">
                  <p className="text-xs font-medium text-gray-700 mb-2">Changes Made:</p>
                  <div className="space-y-1.5">
                            {Object.entries(activityData.changes).slice(0, 5).map(([field, change]: [string, any]) => {
                      if (typeof change === 'object' && change !== null) {
                        if (change.old !== undefined && change.new !== undefined) {
                          return (
                            <div key={field} className="text-xs break-words">
                              <span className="font-medium text-gray-700 capitalize">{field.replace(/_/g, ' ')}:</span>
                              <span className="text-gray-600 ml-1">
                                "<TruncatedText text={String(change.old)} maxLength={50} as="span" />"
                              </span>
                              <span className="text-gray-400 mx-1">→</span>
                              <span className="text-gray-900 font-medium">
                                "<TruncatedText text={String(change.new)} maxLength={50} as="span" />"
                              </span>
                            </div>
                          );
                        } else if (change.new !== undefined) {
                          return (
                            <div key={field} className="text-xs break-words">
                              <span className="font-medium text-gray-700 capitalize">{field.replace(/_/g, ' ')}:</span>
                              <span className="text-gray-900 font-medium ml-1">
                                "<TruncatedText text={String(change.new)} maxLength={50} as="span" />"
                              </span>
                            </div>
                          );
                        }
                      }
                      return null;
                    })}
                    {Object.keys(activityData.changes).length > 5 && (
                      <p className="text-xs text-gray-500 italic">
                        and {Object.keys(activityData.changes).length - 5} more field{Object.keys(activityData.changes).length - 5 > 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Action Details */}
              {action && (
                <div className="mb-2 pb-2 border-b border-gray-200">
                  <p className="text-xs font-medium text-gray-700">Action:</p>
                  <p className="text-xs text-gray-900 capitalize">{action.replace(/_/g, ' ')}</p>
                  {activityData?.target_resource && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      Resource: <span className="font-medium text-gray-700">{activityData.target_resource}</span>
                    </p>
                  )}
                </div>
              )}

              {/* User Info */}
              <div className="mt-2">
                <p className="text-xs text-gray-500">
                  By: <span className="font-medium text-gray-700">{userName}</span>
                  {activityData?.user_role && (
                    <span className="text-gray-400"> ({activityData.user_role})</span>
                  )}
                </p>
              </div>
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200">
              <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
                <span className="text-xs text-gray-500 capitalize">
                  {notification.module || activityData?.action_category?.toLowerCase() || 'activity'}
                </span>
                {(notification.created_at || activityData?.created_at) && (
                  <>
                    <span className="text-xs text-gray-300">•</span>
                    <span className="text-xs text-gray-500">
                      {formatDate(notification.created_at || activityData?.created_at || '')}
                    </span>
                    {formatIndianDateTime(notification.created_at || activityData?.created_at || '') !== 'N/A' && (
                      <>
                        <span className="text-xs text-gray-300">•</span>
                        <span className="text-xs text-gray-500">
                          {formatIndianDateTime(notification.created_at || activityData?.created_at || '')}
                        </span>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

