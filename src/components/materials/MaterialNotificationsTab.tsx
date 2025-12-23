import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TruncatedText } from '@/components/ui/TruncatedText';
import { formatIndianDateTime } from '@/utils/formatHelpers';
import { Bell, CheckCircle, Loader2, Clock, AlertTriangle, AlertCircle, Info, X, ChevronDown, ChevronUp } from 'lucide-react';
import { NotificationService, type Notification } from '@/services/notificationService';
import { useToast } from '@/hooks/use-toast';

interface MaterialNotificationsTabProps {
  notifications: Notification[];
  loading?: boolean;
}

export default function MaterialNotificationsTab({ notifications: propNotifications, loading: propLoading = false }: MaterialNotificationsTabProps) {
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>(propNotifications);
  const [loading, setLoading] = useState(propLoading);
  const [expandedNotificationId, setExpandedNotificationId] = useState<string | null>(null);

  // Update local state when props change
  useEffect(() => {
    setNotifications(propNotifications);
    setLoading(propLoading);
  }, [propNotifications, propLoading]);

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await NotificationService.updateNotificationStatus(notificationId, 'read');
      // Update status locally instead of removing
      setNotifications(prev => prev.map(n =>
        n.id === notificationId ? { ...n, status: 'read' as const } : n
      ));
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

  // Get notification icon based on type
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'low_stock':
      case 'out_of_stock':
        return <AlertCircle className="w-5 h-5 text-orange-500" />;
      case 'reorder_alert':
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      default:
        return <Info className="w-5 h-5 text-gray-500" />;
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
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {notifications.length > 0 ? (
        <>
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary-50 rounded-lg">
                <Bell className="w-5 h-5 text-primary-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Material Notifications</h2>
                <p className="text-sm text-gray-500">
                  {notifications.filter(n => n.status === 'unread').length} unread, {notifications.filter(n => n.status === 'read').length} read
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearAllNotifications}
              className="text-gray-600 hover:text-gray-900"
            >
              Clear All
            </Button>
          </div>

          {/* Notifications List */}
          <div className="space-y-3">
            {notifications.map((notification) => {
              const isExpanded = expandedNotificationId === notification.id;
              const hasDetails = notification.related_data && (
                (notification.related_data.materialName && notification.related_data.materialName.trim()) ||
                notification.related_data.currentStock !== undefined ||
                notification.related_data.available_quantity !== undefined ||
                (notification.related_data.minThreshold && notification.related_data.minThreshold > 0) ||
                (notification.related_data.category && notification.related_data.category.trim()) ||
                notification.related_data.batch_number ||
                notification.related_data.product_name ||
                notification.related_data.required_quantity !== undefined ||
                notification.related_data.shortage !== undefined
              );

              return (
                <Card
                  key={notification.id}
                  className={`border-0 shadow-sm hover:shadow-md transition-shadow ${
                    notification.status === 'unread'
                      ? 'bg-blue-50'
                      : 'bg-white'
                  } ${hasDetails ? 'cursor-pointer' : ''}`}
                  onClick={() => hasDetails && setExpandedNotificationId(isExpanded ? null : notification.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      {/* Icon */}
                      <div className="flex-shrink-0 mt-0.5">
                        {getNotificationIcon(notification.type)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 overflow-hidden">
                        <div className="flex items-start justify-between gap-3 mb-1">
                          <div className="flex-1 min-w-0 overflow-hidden">
                            <h4 className="font-semibold text-gray-900 mb-1 break-words min-w-0">
                              <TruncatedText text={notification.title} maxLength={100} as="span" className="inline-block" />
                            </h4>
                            {notification.message && notification.message.trim() && notification.message !== notification.title && (
                              <p className="text-sm text-gray-600 break-words min-w-0">
                                <TruncatedText text={notification.message} maxLength={150} as="span" className="inline-block" />
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Badge
                              variant="outline"
                              className={`text-xs font-medium ${getPriorityColor(notification.priority)}`}
                            >
                              {notification.priority}
                            </Badge>
                            {hasDetails && (
                              <button
                                className="p-1 hover:bg-gray-100 rounded transition-colors"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setExpandedNotificationId(isExpanded ? null : notification.id);
                                }}
                                aria-label={isExpanded ? 'Collapse details' : 'Expand details'}
                              >
                                {isExpanded ? (
                                  <ChevronUp className="w-4 h-4 text-gray-500" />
                                ) : (
                                  <ChevronDown className="w-4 h-4 text-gray-500" />
                                )}
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Related Data - Collapsible */}
                        {isExpanded && hasDetails && (
                          <div className="bg-gray-50 rounded-lg p-3 my-2 space-y-1.5 animate-in slide-in-from-top-2 duration-200">
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
                                    <span className="text-gray-500 font-medium flex-shrink-0">Product:</span>
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

                            {/* Material Details */}
                            {notification.related_data.materialName && notification.related_data.materialName.trim() && (
                              <div className="flex items-start gap-2 text-xs min-w-0">
                                <span className="text-gray-500 font-medium flex-shrink-0">Material:</span>
                                <span className="text-gray-900 break-words min-w-0 flex-1">
                                  <TruncatedText text={notification.related_data.materialName} maxLength={80} as="span" className="inline-block" />
                                </span>
                              </div>
                            )}
                            {notification.related_data.required_quantity !== undefined && (
                              <div className="flex items-center gap-2 text-xs">
                                <span className="text-gray-500 font-medium">Required:</span>
                                <span className="text-gray-900 font-semibold">{notification.related_data.required_quantity.toFixed(2)} {notification.related_data.unit || ''}</span>
                              </div>
                            )}
                            {(notification.related_data.available_quantity !== undefined || notification.related_data.currentStock !== undefined) && (
                              <div className="flex items-center gap-2 text-xs">
                                <span className="text-gray-500 font-medium">Available:</span>
                                <span className="text-gray-900">
                                  {notification.related_data.available_quantity !== undefined 
                                    ? `${notification.related_data.available_quantity} ${notification.related_data.unit || ''}`
                                    : `${notification.related_data.currentStock} ${notification.related_data.unit || ''}`
                                  }
                                </span>
                              </div>
                            )}
                            {notification.related_data.shortage !== undefined && notification.related_data.shortage > 0 && (
                              <div className="flex items-center gap-2 text-xs">
                                <span className="text-gray-500 font-medium">Shortage:</span>
                                <span className="text-red-600 font-semibold">{notification.related_data.shortage.toFixed(2)} {notification.related_data.unit || ''}</span>
                              </div>
                            )}
                            {notification.related_data.minThreshold && notification.related_data.minThreshold > 0 && (
                              <div className="flex items-center gap-2 text-xs">
                                <span className="text-gray-500 font-medium">Min Threshold:</span>
                                <span className="text-gray-900">{notification.related_data.minThreshold} {notification.related_data.unit || ''}</span>
                              </div>
                            )}
                            {notification.related_data.category && notification.related_data.category.trim() && !notification.related_data.product_category && (
                              <div className="flex items-center gap-2 text-xs">
                                <span className="text-gray-500 font-medium">Category:</span>
                                <span className="text-gray-900">{notification.related_data.category}</span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Footer */}
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center gap-1.5 text-xs text-gray-400">
                            <Clock className="w-3.5 h-3.5" />
                            <span>
                              {notification.created_at
                                ? (() => {
                                    try {
                                      const date = new Date(notification.created_at);
                                      if (isNaN(date.getTime())) {
                                        return 'Just now';
                                      }
                                      // Use relative time for recent notifications, full date for older ones
                                      const now = new Date();
                                      const diffMs = now.getTime() - date.getTime();
                                      const diffMins = Math.floor(diffMs / 60000);
                                      const diffHours = Math.floor(diffMs / 3600000);
                                      const diffDays = Math.floor(diffMs / 86400000);

                                      if (diffMins < 1) return 'Just now';
                                      if (diffMins < 60) return `${diffMins} min ago`;
                                      if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
                                      if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
                                      return formatIndianDateTime(notification.created_at);
                                    } catch {
                                      return 'Just now';
                                    }
                                  })()
                                : 'Just now'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {notification.status === 'unread' && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 text-xs text-blue-600 hover:text-blue-900"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMarkAsRead(notification.id);
                                }}
                              >
                                Mark Read
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 text-xs text-gray-600 hover:text-red-600"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleResolveNotification(notification.id);
                              }}
                            >
                              <X className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
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
            <p className="text-sm text-gray-500">No pending material notifications or alerts.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

