import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { NotificationService, type Notification } from '@/services/notificationService';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Bell, 
  CheckCircle, 
  Info
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { categorizeNotifications } from '@/utils/notificationCategories';
import NotificationSectionComponent from '@/components/notifications/NotificationSection';
import NotificationTabs from '@/components/notifications/NotificationTabs';
import { categorizeActivityLogs } from '@/utils/activityLogCategories';
import ActivityLogTabs from '@/components/notifications/ActivityLogTabs';
import ActivityNotificationCard from '@/components/notifications/ActivityNotificationCard';
import NotificationCategoryTabs from '@/components/notifications/NotificationCategoryTabs';
import MaterialLogFilters from '@/components/notifications/filters/MaterialLogFilters';

type TabValue = 'all' | 'activity_logs';

export default function Notifications() {
  const [activeTab, setActiveTab] = useState<TabValue>('all');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterModule, setFilterModule] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [activeLogCategory, setActiveLogCategory] = useState<string>('all');
  const [activeNotificationCategory, setActiveNotificationCategory] = useState<string>('all');
  const [expandedNotificationId, setExpandedNotificationId] = useState<string | null>(null);
  
  // Category-specific filters for activity logs
  const [materialFilterAction, setMaterialFilterAction] = useState<string>('all');
  const [materialFilterStatus, setMaterialFilterStatus] = useState<string>('all');
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      // Fetch ALL notifications - no filters, no deletion
      const { data } = await NotificationService.getNotifications({
        limit: 1000, // Get a large number to show all
        offset: 0,
      });
      
      // Sort by created_at descending (newest first)
      const sorted = data.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      
      setNotifications(sorted);
    } catch (error) {
      console.error('Error loading notifications:', error);
      toast({
        title: 'Error',
        description: 'Failed to load notifications',
        variant: 'destructive',
      });
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };


  const handleMarkAllAsRead = async () => {
    try {
      const unreadNotifications = notifications.filter(n => n.status === 'unread');
      await Promise.all(
        unreadNotifications.map(n => NotificationService.updateNotificationStatus(n.id, 'read'))
      );
      setNotifications(prev =>
        prev.map(n => ({ ...n, status: n.status === 'unread' ? 'read' as const : n.status }))
      );
      toast({
        title: 'Success',
        description: 'All notifications marked as read',
      });
    } catch (error) {
      console.error('Error marking all as read:', error);
      toast({
        title: 'Error',
        description: 'Failed to mark all notifications as read',
        variant: 'destructive',
      });
    }
  };



  const handleNotificationClick = (notification: Notification) => {
    // Navigate based on module
    if (notification.module === 'products' && notification.related_id) {
      navigate(`/products?highlight=${notification.related_id}`);
    } else if (notification.module === 'materials' && notification.related_id) {
      navigate(`/materials?highlight=${notification.related_id}`);
    } else if (notification.module === 'orders' && notification.related_id) {
      navigate(`/orders?highlight=${notification.related_id}`);
    } else if (notification.module === 'production' && notification.related_id) {
      navigate(`/production?highlight=${notification.related_id}`);
    }
  };

  // Separate notifications by type - memoized
  const allNotifications = useMemo(() =>
    notifications.filter(n => !n.related_data?.activity_log_id),
    [notifications]
  );

  const activityLogNotifications = useMemo(() =>
    notifications.filter(n => n.related_data?.activity_log_id),
    [notifications]
  );

  // Get category counts for activity logs - memoized
  const categoryCounts = useMemo(() => {
    const categorized = categorizeActivityLogs(activityLogNotifications);
    const counts: Record<string, number> = {
      all: activityLogNotifications.length,
      material: 0,
      product: 0,
      order: 0,
      customer: 0,
      supplier: 0,
      production: 0,
    };

    categorized.forEach(section => {
      if (section.category in counts) {
        counts[section.category] = section.notifications.length;
      }
    });

    return counts;
  }, [activityLogNotifications]);
  
  // Filter activity logs by selected category - memoized
  const getFilteredActivityLogs = useMemo(() => {
    let logs = activityLogNotifications;

    // Filter by category first
    if (activeLogCategory !== 'all') {
      const categorized = categorizeActivityLogs(activityLogNotifications);
      const selectedSection = categorized.find(s => s.category === activeLogCategory);
      logs = selectedSection ? selectedSection.notifications : [];
    }

    // Apply category-specific filters
    if (activeLogCategory === 'material') {
      // Filter by action type
      if (materialFilterAction !== 'all') {
        logs = logs.filter(n => {
          const action = n.related_data?.action || '';
          return action === materialFilterAction || action.includes(materialFilterAction);
        });
      }

      // Filter by notification status
      if (materialFilterStatus !== 'all') {
        logs = logs.filter(n => n.status === materialFilterStatus);
      }
    }

    // Sort by date (latest first)
    // For activity logs, use the activity log's created_at from related_data if available
    return logs.sort((a, b) => {
      const dateA = a.related_data?.created_at || a.created_at;
      const dateB = b.related_data?.created_at || b.created_at;
      return new Date(dateB).getTime() - new Date(dateA).getTime();
    });
  }, [activityLogNotifications, activeLogCategory, materialFilterAction, materialFilterStatus]);

  // Filter notifications by selected category - memoized
  const getFilteredNotifications = useMemo(() => {
    if (activeNotificationCategory === 'all') {
      return allNotifications;
    }

    // Filter by category
    const categoryFilters: Record<string, (n: Notification) => boolean> = {
      material: (n) =>
        n.module === 'materials' ||
        n.related_data?.action_category === 'MATERIAL' ||
        n.related_data?.action_category === 'PURCHASE_ORDER' ||
        n.related_data?.action?.includes('MATERIAL_') ||
        n.related_data?.action?.includes('PURCHASE_ORDER_'),
      product: (n) =>
        n.module === 'products' ||
        n.related_data?.action_category === 'PRODUCT' ||
        n.related_data?.action?.includes('PRODUCT_'),
      order: (n) =>
        (n.module === 'orders' && !n.related_data?.action?.includes('PURCHASE_ORDER')) ||
        (n.related_data?.action_category === 'ORDER' && !n.related_data?.action?.includes('PURCHASE_ORDER')) ||
        (n.related_data?.action?.includes('ORDER_') && !n.related_data?.action?.includes('PURCHASE_ORDER')),
      customer: (n) =>
        n.related_data?.action_category === 'CLIENT' ||
        n.related_data?.action?.includes('CLIENT_') ||
        n.related_data?.action?.includes('CUSTOMER_'),
      supplier: (n) =>
        n.related_data?.action?.includes('SUPPLIER_'),
      production: (n) =>
        n.module === 'production' ||
        n.related_data?.action_category === 'RECIPE' ||
        n.related_data?.action_category === 'PRODUCTION' ||
        n.related_data?.action?.includes('RECIPE_') ||
        n.related_data?.action?.includes('PRODUCTION_'),
    };

    const filter = categoryFilters[activeNotificationCategory];
    return filter ? allNotifications.filter(filter) : allNotifications;
  }, [allNotifications, activeNotificationCategory]);

  // Get notification category counts - memoized
  const notificationCategoryCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: allNotifications.length,
      material: 0,
      product: 0,
      order: 0,
      customer: 0,
      supplier: 0,
      production: 0,
    };

    allNotifications.forEach(n => {
      if (n.module === 'materials' || n.related_data?.action_category === 'MATERIAL' || n.related_data?.action_category === 'PURCHASE_ORDER' || n.related_data?.action?.includes('MATERIAL_') || n.related_data?.action?.includes('PURCHASE_ORDER_')) {
        counts.material++;
      } else if (n.module === 'products' || n.related_data?.action_category === 'PRODUCT' || n.related_data?.action?.includes('PRODUCT_')) {
        counts.product++;
      } else if ((n.module === 'orders' && !n.related_data?.action?.includes('PURCHASE_ORDER')) || (n.related_data?.action_category === 'ORDER' && !n.related_data?.action?.includes('PURCHASE_ORDER'))) {
        counts.order++;
      } else if (n.related_data?.action_category === 'CLIENT' || n.related_data?.action?.includes('CLIENT_') || n.related_data?.action?.includes('CUSTOMER_')) {
        counts.customer++;
      } else if (n.related_data?.action?.includes('SUPPLIER_')) {
        counts.supplier++;
      } else if (n.module === 'production' || n.related_data?.action_category === 'RECIPE' || n.related_data?.action_category === 'PRODUCTION' || n.related_data?.action?.includes('RECIPE_') || n.related_data?.action?.includes('PRODUCTION_')) {
        counts.production++;
      }
    });

    return counts;
  }, [allNotifications]);

  // Filter notifications based on active tab - memoized
  const baseNotifications = useMemo(() =>
    activeTab === 'activity_logs'
      ? getFilteredActivityLogs
      : getFilteredNotifications,
    [activeTab, getFilteredActivityLogs, getFilteredNotifications]
  );

  // Filter notifications - keep original order, don't re-sort by status - memoized
  const filteredNotifications = useMemo(() =>
    baseNotifications.filter(n => {
      if (filterType !== 'all' && n.type !== filterType) return false;
      if (filterStatus !== 'all' && n.status !== filterStatus) return false;
      if (filterModule !== 'all' && n.module !== filterModule) return false;
      if (filterPriority !== 'all' && n.priority !== filterPriority) return false;
      return true;
    }),
    [baseNotifications, filterType, filterStatus, filterModule, filterPriority]
  );

  const unreadCount = useMemo(() =>
    notifications.filter(n => n.status === 'unread').length,
    [notifications]
  );

  const allUnreadCount = useMemo(() =>
    allNotifications.filter(n => n.status === 'unread').length,
    [allNotifications]
  );

  const activityUnreadCount = useMemo(() =>
    activityLogNotifications.filter(n => n.status === 'unread').length,
    [activityLogNotifications]
  );

  // Memoize callback functions
  const handleMarkAsRead = useCallback(async (id: string) => {
    try {
      await NotificationService.updateNotificationStatus(id, 'read');
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, status: 'read' as const } : n)
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }, []);

  const handleExpand = useCallback((id: string | null) => {
    setExpandedNotificationId(id);
  }, []);

  return (
    <Layout>
      <div>
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Notifications</h1>
                {unreadCount > 0 && (
                  <Badge className="bg-red-500 text-white">
                    {unreadCount} Unread
                  </Badge>
                )}
              </div>
              <p className="text-gray-600 mt-1">
                {activeTab === 'activity_logs' 
                  ? 'View all activity logs and system actions.'
                  : 'View all your notifications. Notifications are never deleted and remain in the system.'}
              </p>
            </div>
            {unreadCount > 0 && (
              <Button
                onClick={handleMarkAllAsRead}
                className="bg-primary-600 hover:bg-primary-700"
              >
                Mark All as Read
              </Button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <NotificationTabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
          allNotificationsCount={allNotifications.length}
          activityLogsCount={activityLogNotifications.length}
          allUnreadCount={allUnreadCount}
          activityUnreadCount={activityUnreadCount}
        />

        {/* Category Tabs - Show based on active tab */}
        {activeTab === 'all' ? (
          <NotificationCategoryTabs
            activeCategory={activeNotificationCategory}
            onCategoryChange={setActiveNotificationCategory}
            categoryCounts={notificationCategoryCounts}
          />
        ) : (
          <ActivityLogTabs
            activeCategory={activeLogCategory}
            onCategoryChange={setActiveLogCategory}
            categoryCounts={categoryCounts}
          />
        )}

        {/* Stats - Only show for All Notifications tab */}
        {activeTab === 'all' && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Unread</p>
                    <p className="text-2xl font-bold text-blue-600">{allUnreadCount}</p>
                  </div>
                  <Bell className="w-8 h-8 text-blue-600 opacity-50" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Read</p>
                    <p className="text-2xl font-bold text-gray-600">{allNotifications.filter(n => n.status === 'read').length}</p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-gray-600 opacity-50" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total</p>
                    <p className="text-2xl font-bold text-gray-700">{allNotifications.length}</p>
                  </div>
                  <Info className="w-8 h-8 text-gray-600 opacity-50" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* General Filters - Show for All Notifications tab OR All Logs category in Activity Logs */}
        {(activeTab === 'all' || (activeTab === 'activity_logs' && activeLogCategory === 'all')) && (
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-700 mb-1 block">Type</label>
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="low_stock">Low Stock</SelectItem>
                      <SelectItem value="restock_request">Restock Request</SelectItem>
                      <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                      <SelectItem value="production_request">Production Request</SelectItem>
                      <SelectItem value="order_alert">Order Alert</SelectItem>
                      <SelectItem value="info">Info</SelectItem>
                      <SelectItem value="warning">Warning</SelectItem>
                      <SelectItem value="error">Error</SelectItem>
                      <SelectItem value="success">Success</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-700 mb-1 block">Status</label>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="unread">Unread</SelectItem>
                      <SelectItem value="read">Read</SelectItem>
                      <SelectItem value="dismissed">Dismissed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-700 mb-1 block">Module</label>
                  <Select value={filterModule} onValueChange={setFilterModule}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Modules" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Modules</SelectItem>
                      <SelectItem value="products">Products</SelectItem>
                      <SelectItem value="materials">Materials</SelectItem>
                      <SelectItem value="orders">Orders</SelectItem>
                      <SelectItem value="production">Production</SelectItem>
                    </SelectContent>
                  </Select>
        </div>

                <div>
                  <label className="text-xs font-medium text-gray-700 mb-1 block">Priority</label>
                  <Select value={filterPriority} onValueChange={setFilterPriority}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Priorities" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Priorities</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Category-specific filters for Activity Logs */}
        {activeTab === 'activity_logs' && activeLogCategory === 'material' && (
          <MaterialLogFilters
            filterAction={materialFilterAction}
            filterStatus={materialFilterStatus}
            onActionChange={setMaterialFilterAction}
            onStatusChange={setMaterialFilterStatus}
          />
        )}

        {/* Notifications List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Bell className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 text-lg">No notifications found</p>
              <p className="text-gray-500 text-sm mt-2">Try adjusting your filters</p>
            </CardContent>
          </Card>
        ) : activeTab === 'activity_logs' ? (
          // Activity Logs Tab - Show activity log notifications
          <div>
            {/* Activity Logs List */}
            {filteredNotifications.length > 0 ? (
          <div className="space-y-3">
            {filteredNotifications.map((notification) => (
                  <div key={notification.id} id={`notification-${notification.id}`}>
                    <ActivityNotificationCard
                      notification={notification}
                      onClick={() => handleNotificationClick(notification)}
                      expandedId={expandedNotificationId}
                      onExpand={handleExpand}
                      onMarkAsRead={handleMarkAsRead}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <Bell className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-600 text-lg">No activity logs found</p>
                  <p className="text-gray-500 text-sm mt-2">Try adjusting your filters or select a different category</p>
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          // All Notifications Tab - Show regular notifications in sections
          <div className="space-y-6">
            {categorizeNotifications(filteredNotifications).map((section) => (
              <Card key={section.category} className="overflow-hidden">
                <CardContent className="p-0">
                  <NotificationSectionComponent
                    section={section}
                    onNotificationClick={handleNotificationClick}
                    compact={false}
                    expandedId={expandedNotificationId}
                    onExpand={handleExpand}
                    onMarkAsRead={handleMarkAsRead}
                  />
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
