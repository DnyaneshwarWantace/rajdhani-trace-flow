import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatIndianDateTime } from '@/utils/formatHelpers';
import { Bell, CheckCircle, X, ArrowRight, RefreshCw, Clock, Factory, AlertCircle, Info, ChevronDown, ChevronUp } from 'lucide-react';
import { NotificationService, type Notification } from '@/services/notificationService';
import { useToast } from '@/hooks/use-toast';

interface NotificationsTabProps {
  products: any[]; // Product list to check individual stock tracking
}

export default function NotificationsTab({ products }: NotificationsTabProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
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
  }, []);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      // Load production notifications (these are production requests for products)
      const productionNotifications = await NotificationService.getNotificationsByModule('production');
      
      // Load product notifications (low stock, out of stock, etc.)
      const productNotifications = await NotificationService.getNotificationsByModule('products');
      
      // Filter for unread notifications
      const unreadProductionNotifications = (productionNotifications || []).filter(n => n.status === 'unread');
      const unreadProductNotifications = (productNotifications || []).filter(n => n.status === 'unread');
      
      // Combine both types of notifications (both are product-related)
      // Production notifications are production requests for products
      // Product notifications are stock alerts for products
      const combinedNotifications = [...unreadProductionNotifications, ...unreadProductNotifications];
      
      setNotifications(combinedNotifications);
      console.log('📢 Loaded notifications:', combinedNotifications.length);
      console.log('📢 Production notifications:', unreadProductionNotifications.length);
      console.log('📢 Product notifications:', unreadProductNotifications.length);
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

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await NotificationService.updateNotificationStatus(notificationId, 'read');
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
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
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
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
      navigate('/production/new-batch', {
        state: {
          selectedProduct: {
            id: productId,
            name: notification.related_data.productName,
            category: notification.related_data.category,
          },
        },
      });

      // Mark notification as read
      await NotificationService.updateNotificationStatus(notification.id, 'read');

      // Reload notifications
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
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-8 h-8 animate-spin text-primary-600" />
      </div>
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
                <p className="text-xs sm:text-sm text-gray-500">{notifications.length} unread notification{notifications.length !== 1 ? 's' : ''}</p>
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
                <Card key={notification.id} className="border border-gray-200 hover:border-gray-300 transition-colors">
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
                              <p className="text-[10px] sm:text-xs text-gray-600 line-clamp-1 break-all">{notification.message}</p>
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
                            {notification.related_data.productName && (
                              <div className="flex items-start gap-2 text-xs">
                                <span className="text-gray-500 font-medium flex-shrink-0">Product:</span>
                                <span className="text-gray-900 break-words">{notification.related_data.productName}</span>
                              </div>
                            )}
                            {notification.related_data.requiredQuantity && (
                              <div className="flex items-start gap-2 text-xs">
                                <span className="text-gray-500 font-medium flex-shrink-0">Required:</span>
                                <span className="text-gray-900">{notification.related_data.requiredQuantity} products</span>
                              </div>
                            )}
                            {notification.related_data.availableStock !== undefined && (
                              <div className="flex items-start gap-2 text-xs">
                                <span className="text-gray-500 font-medium flex-shrink-0">Available:</span>
                                <span className="text-gray-900">{notification.related_data.availableStock} products</span>
                              </div>
                            )}
                            {notification.related_data.shortfall && (
                              <div className="flex items-start gap-2 text-xs">
                                <span className="text-gray-500 font-medium flex-shrink-0">Shortfall:</span>
                                <span className="text-red-600 font-semibold">{notification.related_data.shortfall} products</span>
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
                          <div className="flex items-center gap-1.5 text-xs text-gray-400">
                            <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0" />
                            <span className="truncate">{formatIndianDateTime(notification.created_at)}</span>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
                            {notification.type === 'production_request' || notification.type === 'low_stock' || notification.type === 'order_alert' ? (
                              notification.related_data && hasIndividualStock(notification.related_data.productId) ? (
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
                              ) : (
                                <span className="text-xs text-gray-500">Bulk Product</span>
                              )
                            ) : null}
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

