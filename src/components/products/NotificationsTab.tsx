import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatIndianDateTime } from '@/utils/formatHelpers';
import {
  Bell,
  CheckCircle,
  X,
  ArrowRight,
  RefreshCw,
  Clock,
  Factory,
  AlertCircle,
  Info,
  ChevronDown,
  ChevronUp,
  Loader2,
} from 'lucide-react';
import { NotificationService, type Notification } from '@/services/notificationService';
import { useToast } from '@/hooks/use-toast';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination-primitives';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface NotificationsTabProps {
  products: any[]; // Product list to check individual stock tracking
}

// Cache for notifications - persist across tab switches
const notificationCache = {
  data: null as Notification[] | null,
  timestamp: 0,
  TTL: 30000, // 30 seconds cache
};

export default function NotificationsTab({ products }: NotificationsTabProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [isAddingToProduction, setIsAddingToProduction] = useState<string | null>(null);
  const [expandedNotifications, setExpandedNotifications] = useState<Set<string>>(new Set());

  const toggleNotification = (notificationId: string) => {
    setExpandedNotifications(prev => {
      const newSet = new Set(prev);
      if (newSet.has(notificationId)) {
        newSet.delete(notificationId);
      } else {
        newSet.add(notificationId);
      }
      return newSet;
    });
  };

  useEffect(() => {
    loadNotifications();
  }, [page, pageSize]);

  const loadNotifications = async () => {
    try {
      setLoading(true);

      const LIMIT = pageSize;
      const currentOffset = (page - 1) * pageSize;

      // Fetch ONLY real product notifications (exclude activity-log copies) with pagination
      const { data, totalNotifications } = await NotificationService.getNotifications({
        module: 'products',
        include_logs: 'false',
        limit: LIMIT,
        offset: currentOffset,
      });

      // Data already excludes activity logs at query level
      setNotifications(data || []);
      setTotalCount(totalNotifications || 0); // Set total count of REAL notifications only

      console.log('✅ Loaded', (data || []).length, 'product notifications, Total:', totalNotifications);
    } catch (error) {
      console.error('Error loading notifications:', error);
      toast({
        title: 'Error',
        description: 'Failed to load notifications',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Removed automatic infinite scroll - now using manual "Load More" button

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await NotificationService.updateNotificationStatus(notificationId, 'read');
      // Update the notification status to 'read' instead of removing it
      const updatedNotifications = notifications.map(n =>
        n.id === notificationId ? { ...n, status: 'read' as const } : n
      );
      setNotifications(updatedNotifications);

      // Update cache
      notificationCache.data = updatedNotifications;
      notificationCache.timestamp = Date.now();

      toast({
        title: 'Success',
        description: 'Notification marked as read',
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      toast({
        title: 'Error',
        description: 'Failed to mark notification as read',
        variant: 'destructive',
      });
    }
  };

  const handleResolveNotification = async (notificationId: string) => {
    try {
      await NotificationService.updateNotificationStatus(notificationId, 'dismissed');
      const updatedNotifications = notifications.filter(n => n.id !== notificationId);
      setNotifications(updatedNotifications);

      // Update cache
      notificationCache.data = updatedNotifications;
      notificationCache.timestamp = Date.now();

      toast({
        title: 'Success',
        description: 'Notification dismissed',
      });
    } catch (error) {
      console.error('Error resolving notification:', error);
      toast({
        title: 'Error',
        description: 'Failed to dismiss notification',
        variant: 'destructive',
      });
    }
  };

  const handleClearAllNotifications = async () => {
    try {
      const notificationPromises = notifications.map(notification =>
        NotificationService.updateNotificationStatus(notification.id, 'dismissed')
      );
      await Promise.all(notificationPromises);
      setNotifications([]);
      toast({
        title: 'Success',
        description: 'All notifications cleared',
      });
    } catch (error) {
      console.error('Error clearing all notifications:', error);
      toast({
        title: 'Error',
        description: 'Failed to clear notifications',
        variant: 'destructive',
      });
    }
  };

  const handleAddToProductionFromNotification = async (notification: Notification) => {
    if (!notification.related_data?.productId) return;

    const productId = notification.related_data.productId;
    setIsAddingToProduction(productId);

    try {
      // Navigate to new batch page with the product data
      navigate('/production/create', {
        state: {
          product: {
            id: productId,
            name: notification.related_data.productName,
            category: notification.related_data.category,
          },
        },
      });

      // Mark notification as read
      await NotificationService.updateNotificationStatus(notification.id, 'read');

      // Reload notifications for current page
      await loadNotifications();

      toast({
        title: 'Success',
        description: `Product "${notification.related_data.productName}" added to production`,
      });
    } catch (error) {
      console.error('Error adding product to production:', error);
      toast({
        title: 'Error',
        description: 'Failed to add product to production',
        variant: 'destructive',
      });
    } finally {
      setIsAddingToProduction(null);
    }
  };

  // Check if product has individual stock tracking
  const hasIndividualStock = (productId: string) => {
    const product = products.find(p => (p.id || p._id) === productId);
    return product?.individual_stock_tracking === true;
  };

  // Get notification icon based on type
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'low_stock':
      case 'out_of_stock':
        return <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-orange-500" />;
      case 'production_request':
        return <Factory className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />;
      default:
        return <Info className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" />;
    }
  };

  // Get priority badge color
  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'high':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'medium':
        return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'low':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {notifications.length > 0 ? (
        <>
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="p-2 bg-primary-50 rounded-lg flex-shrink-0">
                <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-primary-600" />
              </div>
              <div className="min-w-0">
                <h2 className="text-base sm:text-lg font-semibold text-gray-900 truncate">Product Notifications</h2>
                <p className="text-xs sm:text-sm text-gray-500">
                  Showing {notifications.length} of {totalCount} total
                  ({notifications.filter(n => n.status === 'unread').length} unread)
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearAllNotifications}
              className="text-gray-600 hover:text-gray-900 text-xs sm:text-sm w-full sm:w-auto"
            >
              Clear All
            </Button>
          </div>

          {/* Notifications List */}
          <div className="space-y-3">
            {notifications.map((notification) => {
              const isExpanded = expandedNotifications.has(notification.id);

              return (
                <Card key={notification.id} className={`border transition-colors ${
                  notification.status === 'unread' 
                    ? 'border-gray-200 hover:border-gray-300 bg-white' 
                    : 'border-gray-100 hover:border-gray-200 bg-gray-50'
                }`}>
                  <CardContent className="p-3 sm:p-4">
                    {/* Header - Always visible */}
                    <div
                      className="flex items-start gap-2 sm:gap-3 cursor-pointer"
                      onClick={() => toggleNotification(notification.id)}
                    >
                      {/* Icon */}
                      <div className="flex-shrink-0 mt-0.5">
                        <div className="w-4 h-4 sm:w-5 sm:h-5">
                          {getNotificationIcon(notification.type)}
                        </div>
                      </div>

                      {/* Collapsed Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-1 sm:gap-2">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-[11px] sm:text-sm text-gray-900 line-clamp-1 break-all">{notification.title}</h4>
                            {!isExpanded && (
                              <>
                              <p className="text-[10px] sm:text-xs text-gray-600 line-clamp-1 break-all">{notification.message}</p>
                                {notification.related_data?.created_by_user && (
                                  <p className="text-[10px] sm:text-xs text-gray-500 mt-1">
                                    By: <span className="font-semibold text-gray-700">{notification.related_data.created_by_user}</span>
                                  </p>
                                )}
                              </>
                            )}
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <Badge
                              variant="outline"
                              className={`text-[9px] sm:text-[10px] font-medium px-1 py-0 ${getPriorityColor(notification.priority)}`}
                            >
                              {notification.priority}
                            </Badge>
                            {isExpanded ? (
                              <ChevronUp className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400 flex-shrink-0" />
                            ) : (
                              <ChevronDown className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400 flex-shrink-0" />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Expanded Content */}
                    {isExpanded && (
                      <div className="mt-3 ml-8 sm:ml-9">
                        <p className="text-xs sm:text-sm text-gray-600 mb-3 break-words">{notification.message}</p>

                        {/* Related Data */}
                        {notification.related_data && (
                          <div className="bg-gray-50 rounded-lg p-2 sm:p-3 mb-3 space-y-1.5 overflow-hidden">
                            {/* Order-Related Stock Alert Details */}
                            {(notification.type === 'production_request' || notification.type === 'restock_request') && notification.related_data.order_number && (
                              <div className="border-b border-gray-200 pb-2 mb-2">
                                <p className="text-xs font-semibold text-gray-700 mb-1.5">Order Details</p>
                                <div className="space-y-1">
                                  {notification.related_data.order_number && (
                                    <div className="flex items-center gap-2 text-xs">
                                      <span className="text-gray-500 font-medium">Order Number:</span>
                                      <span className="text-gray-900 font-mono">{notification.related_data.order_number}</span>
                                    </div>
                                  )}
                                  {notification.related_data.customer_name && (
                                    <div className="flex items-center gap-2 text-xs">
                                      <span className="text-gray-500 font-medium">Customer:</span>
                                      <span className="text-gray-900">{notification.related_data.customer_name}</span>
                                    </div>
                                  )}
                                  {notification.related_data.expected_delivery && (
                                    <div className="flex items-center gap-2 text-xs">
                                      <span className="text-gray-500 font-medium">Delivery:</span>
                                      <span className="text-red-700 font-semibold">
                                        {new Date(notification.related_data.expected_delivery).toLocaleDateString('en-IN')}
                                      </span>
                                    </div>
                                  )}
                                  <div className="flex items-center gap-4 text-xs mt-2 pt-2 border-t border-gray-200">
                                    <div>
                                      <span className="text-gray-500 font-medium">Required:</span>
                                      <span className="text-blue-700 font-semibold ml-1">{notification.related_data.quantity_ordered} {notification.related_data.unit}</span>
                                    </div>
                                    <div>
                                      <span className="text-gray-500 font-medium">Available:</span>
                                      <span className="text-green-700 font-semibold ml-1">{notification.related_data.available_stock} {notification.related_data.unit}</span>
                                    </div>
                                    <div>
                                      <span className="text-gray-500 font-medium">Need:</span>
                                      <span className="text-red-700 font-semibold ml-1">{notification.related_data.shortfall} {notification.related_data.unit}</span>
                                    </div>
                                  </div>

                                  {/* Product/Material Details */}
                                  {(notification.related_data.product_details || notification.related_data.material_details) && (
                                    <div className="mt-2 pt-2 border-t border-gray-200">
                                      <p className="text-xs font-semibold text-gray-700 mb-1">Product Details</p>
                                      <div className="grid grid-cols-2 gap-2">
                                        {notification.related_data.product_details?.color && (
                                          <div className="text-xs">
                                            <span className="text-gray-500">Color:</span>
                                            <span className="text-gray-900 ml-1">{notification.related_data.product_details.color}</span>
                                          </div>
                                        )}
                                        {notification.related_data.product_details?.pattern && (
                                          <div className="text-xs">
                                            <span className="text-gray-500">Pattern:</span>
                                            <span className="text-gray-900 ml-1">{notification.related_data.product_details.pattern}</span>
                                          </div>
                                        )}
                                        {notification.related_data.product_details?.width && (
                                          <div className="text-xs">
                                            <span className="text-gray-500">Width:</span>
                                            <span className="text-gray-900 ml-1">
                                              {notification.related_data.product_details.width}{notification.related_data.product_details.width_unit || ''}
                                            </span>
                                          </div>
                                        )}
                                        {notification.related_data.product_details?.length && (
                                          <div className="text-xs">
                                            <span className="text-gray-500">Length:</span>
                                            <span className="text-gray-900 ml-1">
                                              {notification.related_data.product_details.length}{notification.related_data.product_details.length_unit || ''}
                                            </span>
                                          </div>
                                        )}
                                        {notification.related_data.product_details?.weight && (
                                          <div className="text-xs">
                                            <span className="text-gray-500">GSM:</span>
                                            <span className="text-gray-900 ml-1">
                                              {notification.related_data.product_details.weight}{notification.related_data.product_details.weight_unit || ''}
                                            </span>
                                          </div>
                                        )}
                                        {notification.related_data.product_details?.category && (
                                          <div className="text-xs">
                                            <span className="text-gray-500">Category:</span>
                                            <span className="text-gray-900 ml-1">{notification.related_data.product_details.category}</span>
                                          </div>
                                        )}
                                        {notification.related_data.material_details?.color && (
                                          <div className="text-xs">
                                            <span className="text-gray-500">Color:</span>
                                            <span className="text-gray-900 ml-1">{notification.related_data.material_details.color}</span>
                                          </div>
                                        )}
                                        {notification.related_data.material_details?.supplier && (
                                          <div className="text-xs">
                                            <span className="text-gray-500">Supplier:</span>
                                            <span className="text-gray-900 ml-1">{notification.related_data.material_details.supplier}</span>
                                          </div>
                                        )}
                                        {notification.related_data.material_details?.category && (
                                          <div className="text-xs">
                                            <span className="text-gray-500">Category:</span>
                                            <span className="text-gray-900 ml-1">{notification.related_data.material_details.category}</span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Production Batch Details */}
                            {(notification.related_data.batch_number || notification.related_data.batch_id) && (
                              <div className="border-b border-gray-200 pb-2 mb-2">
                                <p className="text-xs font-semibold text-gray-700 mb-1.5">Production Batch Details</p>
                                {notification.related_data.batch_number && (
                                  <div className="flex items-center gap-2 text-xs">
                                    <span className="text-gray-500 font-medium">Batch Number:</span>
                                    <span className="text-gray-900 font-mono">{notification.related_data.batch_number}</span>
                                  </div>
                                )}
                                {notification.related_data.product_name && (
                                  <div className="flex items-start gap-2 text-xs mt-1">
                                    <span className="text-gray-500 font-medium flex-shrink-0">For Product:</span>
                                    <div className="flex-1">
                                      <span className="text-gray-900 break-words">{notification.related_data.product_name}</span>
                                      {notification.related_data.product_id && (
                                        <span className="text-gray-500 ml-1">({notification.related_data.product_id})</span>
                                      )}
                                    </div>
                                  </div>
                                )}
                                {(notification.related_data.product_category || notification.related_data.product_subcategory) && (
                                  <div className="flex items-center gap-2 text-xs mt-1">
                                    <span className="text-gray-500 font-medium">Category:</span>
                                    <span className="text-gray-900">
                                      {notification.related_data.product_category || ''}
                                      {notification.related_data.product_subcategory ? ` > ${notification.related_data.product_subcategory}` : ''}
                                    </span>
                                  </div>
                                )}
                                {notification.related_data.planned_quantity && (
                                  <div className="flex items-center gap-2 text-xs mt-1">
                                    <span className="text-gray-500 font-medium">Planned Quantity:</span>
                                    <span className="text-gray-900">{notification.related_data.planned_quantity} units</span>
                                  </div>
                                )}
                                {notification.related_data.product_image && (
                                  <div className="mt-2">
                                    <img 
                                      src={notification.related_data.product_image} 
                                      alt={notification.related_data.product_name || 'Product'} 
                                      className="w-16 h-16 object-cover rounded border border-gray-200"
                                      onError={(e) => {
                                        (e.target as HTMLImageElement).style.display = 'none';
                                      }}
                                    />
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Product/Material Details */}
                            {(notification.related_data.productName || notification.related_data.material_name) && (
                              <div className="flex items-start gap-2 text-xs">
                                <span className="text-gray-500 font-medium flex-shrink-0">
                                  {notification.related_data.material_name ? 'Material' : 'Product'}:
                                </span>
                                <span className="text-gray-900 break-words">
                                  {notification.related_data.productName || notification.related_data.material_name}
                                </span>
                              </div>
                            )}
                            {(notification.related_data.requiredQuantity || notification.related_data.required_quantity !== undefined) && (
                              <div className="flex items-start gap-2 text-xs">
                                <span className="text-gray-500 font-medium flex-shrink-0">Required:</span>
                                <span className="text-gray-900 font-semibold">
                                  {notification.related_data.requiredQuantity 
                                    ? `${notification.related_data.requiredQuantity} products`
                                    : `${notification.related_data.required_quantity?.toFixed(2)} ${notification.related_data.unit || ''}`
                                  }
                                </span>
                              </div>
                            )}
                            {(notification.related_data.availableStock !== undefined || notification.related_data.available_quantity !== undefined) && (
                              <div className="flex items-start gap-2 text-xs">
                                <span className="text-gray-500 font-medium flex-shrink-0">Available:</span>
                                <span className="text-gray-900">
                                  {notification.related_data.availableStock !== undefined
                                    ? `${notification.related_data.availableStock} products`
                                    : `${notification.related_data.available_quantity} ${notification.related_data.unit || ''}`
                                  }
                                </span>
                              </div>
                            )}
                            {(notification.related_data.shortfall || notification.related_data.shortage !== undefined) && (
                              <div className="flex items-start gap-2 text-xs">
                                <span className="text-gray-500 font-medium flex-shrink-0">Shortage:</span>
                                <span className="text-red-600 font-semibold">
                                  {notification.related_data.shortfall 
                                    ? `${notification.related_data.shortfall} products`
                                    : `${notification.related_data.shortage?.toFixed(2)} ${notification.related_data.unit || ''}`
                                  }
                                </span>
                              </div>
                            )}
                            {notification.related_data.threshold && (
                              <div className="flex items-start gap-2 text-xs">
                                <span className="text-gray-500 font-medium flex-shrink-0">Threshold:</span>
                                <span className="text-gray-900">{notification.related_data.threshold} units</span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Footer */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                          <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1.5 text-xs text-gray-400">
                            <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0" />
                              <span className="truncate">
                                {notification.created_at
                                  ? (formatIndianDateTime(notification.created_at) !== 'N/A'
                                      ? formatIndianDateTime(notification.created_at)
                                      : new Date(notification.created_at).toLocaleString('en-IN'))
                                  : 'Just now'}
                              </span>
                            </div>
                            {notification.related_data?.created_by_user && (
                              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                <span className="font-medium">By:</span>
                                <span className="text-gray-900 font-semibold">{notification.related_data.created_by_user}</span>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
                            {/* Product Low Stock - Go to Production Button */}
                            {notification.type === 'production_request' && notification.related_data?.product_id && (
                              <Button
                                size="sm"
                                className="bg-blue-600 text-white hover:bg-blue-700 h-7 sm:h-8 text-xs flex-1 sm:flex-initial"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate('/production/create', {
                                    state: {
                                      product: {
                                        id: notification.related_data.product_id,
                                        name: notification.related_data.product_name,
                                        ...notification.related_data.product_details
                                      },
                                      fromNotification: true,
                                      requiredQuantity: notification.related_data.shortfall,
                                      order_number: notification.related_data.order_number,
                                      customer_name: notification.related_data.customer_name,
                                      expected_delivery: notification.related_data.expected_delivery
                                    }
                                  });
                                }}
                              >
                                <Factory className="w-3 h-3 mr-1" />
                                <span className="truncate">Go to Production</span>
                              </Button>
                            )}

                            {/* Material Low Stock - Order Material Button */}
                            {notification.type === 'restock_request' && notification.related_data?.material_id && (
                              <Button
                                size="sm"
                                className="bg-green-600 text-white hover:bg-green-700 h-7 sm:h-8 text-xs flex-1 sm:flex-initial"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate('/materials/manage-stock', {
                                    state: {
                                      selectedMaterial: {
                                        id: notification.related_data.material_id,
                                        name: notification.related_data.material_name,
                                        ...notification.related_data.material_details
                                      },
                                      fromNotification: true,
                                      requiredQuantity: notification.related_data.shortfall,
                                      orderNumber: notification.related_data.order_number
                                    }
                                  });
                                }}
                              >
                                <ArrowRight className="w-3 h-3 mr-1" />
                                <span className="truncate">Order Material</span>
                              </Button>
                            )}

                            {/* Production Planning Low Stock - Original Add to Production */}
                            {notification.type === 'low_stock' && notification.related_data && hasIndividualStock(notification.related_data.productId) && (
                                <Button
                                  size="sm"
                                  className="bg-primary-600 text-white hover:bg-primary-700 h-7 sm:h-8 text-xs flex-1 sm:flex-initial"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAddToProductionFromNotification(notification);
                                  }}
                                  disabled={isAddingToProduction === notification.related_data?.productId}
                                >
                                  {isAddingToProduction === notification.related_data?.productId ? (
                                    <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                                  ) : (
                                    <ArrowRight className="w-3 h-3 mr-1" />
                                  )}
                                  <span className="truncate">{isAddingToProduction === notification.related_data?.productId ? 'Adding...' : 'Add to Production'}</span>
                                </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 sm:h-8 text-xs text-gray-600 hover:text-gray-900"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMarkAsRead(notification.id);
                              }}
                            >
                              Mark Read
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 sm:h-8 text-xs text-gray-600 hover:text-red-600 px-2"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleResolveNotification(notification.id);
                              }}
                            >
                              <X className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Pagination Controls */}
          <div className="mt-4 sm:mt-6 w-full">
            <Pagination className="w-full">
              <PaginationContent className="w-full justify-center flex-wrap gap-1">
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => {
                      if (page > 1) setPage(page - 1);
                    }}
                    className={`${page === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'} h-8 w-8 sm:h-10 sm:w-auto text-xs sm:text-sm`}
                  />
                </PaginationItem>

                {(() => {
                  const totalPages = Math.max(1, Math.ceil((totalCount || 0) / pageSize));
                  const pages: (number | 'ellipsis')[] = [];

                  if (totalPages <= 7) {
                    for (let i = 1; i <= totalPages; i++) pages.push(i);
                  } else {
                    pages.push(1);
                    if (page > 3) pages.push('ellipsis');
                    const start = Math.max(2, page - 1);
                    const end = Math.min(totalPages - 1, page + 1);
                    for (let i = start; i <= end; i++) {
                      if (i !== 1 && i !== totalPages) pages.push(i);
                    }
                    if (page < totalPages - 2) pages.push('ellipsis');
                    if (totalPages > 1) pages.push(totalPages);
                  }

                  return pages.map((p, index) => (
                    <PaginationItem
                      key={index}
                      className={p === 'ellipsis' ? 'hidden sm:block' : ''}
                    >
                      {p === 'ellipsis' ? (
                        <PaginationEllipsis />
                      ) : (
                        <PaginationLink
                          isActive={p === page}
                          onClick={() => setPage(p as number)}
                          className={`cursor-pointer h-8 w-8 sm:h-10 sm:w-10 text-xs sm:text-sm p-0 ${
                            Math.abs((p as number) - page) > 1 &&
                            (p as number) !== 1 &&
                            (p as number) !== Math.max(1, Math.ceil((totalCount || 0) / pageSize))
                              ? 'hidden sm:flex'
                              : ''
                          }`}
                        >
                          {p}
                        </PaginationLink>
                      )}
                    </PaginationItem>
                  ));
                })()}

                <PaginationItem>
                  <PaginationNext
                    onClick={() => {
                      const totalPages = Math.max(1, Math.ceil((totalCount || 0) / pageSize));
                      if (page < totalPages) setPage(page + 1);
                    }}
                    className={`${page >= Math.max(1, Math.ceil((totalCount || 0) / pageSize)) ? 'pointer-events-none opacity-50' : 'cursor-pointer'} h-8 w-8 sm:h-10 sm:w-auto text-xs sm:text-sm`}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>

            {/* Pagination Info and Page Size Selector */}
            <div className="mt-3 sm:mt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs sm:text-sm text-gray-600 text-center sm:text-left">
                {totalCount === 0 ? (
                  'Showing 0 of 0 notifications'
                ) : (
                  <>
                    Showing {(page - 1) * pageSize + 1} to{' '}
                    {Math.min((page - 1) * pageSize + notifications.length, totalCount)} of{' '}
                    {totalCount} notifications
                  </>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm text-gray-600 whitespace-nowrap">
                  Per page:
                </span>
                <Select
                  value={pageSize.toString()}
                  onValueChange={(value) => {
                    const newSize = parseInt(value, 10);
                    setPageSize(newSize);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-16 sm:w-20 h-8 sm:h-10 text-xs sm:text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="p-3 bg-green-50 rounded-full w-fit mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">All Caught Up!</h3>
            <p className="text-sm text-gray-500">No pending product notifications or alerts.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

