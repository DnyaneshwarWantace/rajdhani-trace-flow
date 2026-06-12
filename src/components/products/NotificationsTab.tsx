import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatIndianDateTime, formatIndianDate } from '@/utils/formatHelpers';
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
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-3 pb-24">
      {notifications.length > 0 ? (
        <>
          {/* Header */}
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center">
                <Bell className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900">Notifications</p>
                <p className="text-xs text-gray-400">{totalCount} total · {notifications.filter(n => n.status === 'unread').length} unread</p>
              </div>
            </div>
            <button
              onClick={handleClearAllNotifications}
              className="text-xs font-semibold text-red-500 border border-red-200 rounded-lg px-3 py-1.5"
            >
              Clear All
            </button>
          </div>

          {/* Notification cards */}
          <div className="space-y-3">
            {notifications.map((notification) => {
              const isExpanded = expandedNotifications.has(notification.id);
              const priorityDot: Record<string, string> = {
                high: 'bg-red-500', medium: 'bg-amber-500', low: 'bg-blue-400',
              };
              const priorityLabel: Record<string, string> = {
                high: 'HIGH', medium: 'MED', low: 'LOW',
              };
              const dot = priorityDot[notification.priority?.toLowerCase()] || 'bg-gray-400';
              const badge = priorityLabel[notification.priority?.toLowerCase()] || notification.priority?.toUpperCase();

              return (
                <div key={notification.id} className={`bg-white rounded-2xl border overflow-hidden ${notification.status === 'unread' ? 'border-gray-200' : 'border-gray-100'}`}>
                  {/* Collapsed row */}
                  <button
                    className="w-full text-left px-4 pt-3.5 pb-3 flex items-start gap-3"
                    onClick={() => toggleNotification(notification.id)}
                  >
                    <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                      <Bell className="w-4 h-4 text-gray-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <p className="text-sm font-bold text-gray-900 line-clamp-1 flex-1">{notification.title}</p>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white ${dot}`}>
                            <span className="w-1.5 h-1.5 rounded-full bg-white/60 inline-block" />
                            {badge}
                          </span>
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-gray-400" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-400" />}
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 line-clamp-2">{notification.message}</p>
                    </div>
                  </button>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="border-t border-gray-100 bg-gray-50 px-4 py-3 space-y-2">
                      {notification.related_data?.order_number && (
                        <div className="flex justify-between text-xs"><span className="text-gray-500">Order</span><span className="font-bold text-gray-900">{notification.related_data.order_number}</span></div>
                      )}
                      {notification.related_data?.customer_name && (
                        <div className="flex justify-between text-xs"><span className="text-gray-500">Customer</span><span className="font-bold text-gray-900">{notification.related_data.customer_name}</span></div>
                      )}
                      {(notification.related_data?.shortfall ?? notification.related_data?.shortage) !== undefined && (
                        <div className="flex justify-between text-xs"><span className="text-gray-500">Shortage</span><span className="font-bold text-red-600">{notification.related_data?.shortfall ?? notification.related_data?.shortage}</span></div>
                      )}
                      {notification.created_at && (
                        <div className="flex items-center gap-1 text-xs text-gray-400">
                          <Clock className="w-3 h-3" />
                          {formatIndianDateTime(notification.created_at)}
                        </div>
                      )}
                      {/* Actions */}
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleMarkAsRead(notification.id); }}
                          className="flex-1 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 bg-white"
                        >
                          Mark Read
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleResolveNotification(notification.id); }}
                          className="flex-1 py-2 rounded-xl border border-red-200 text-xs font-semibold text-red-600 bg-white"
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <p className="text-base font-bold text-gray-900 mb-1">All Caught Up!</p>
          <p className="text-sm text-gray-400">No pending alerts.</p>
        </div>
      )}
    </div>
  );
}

