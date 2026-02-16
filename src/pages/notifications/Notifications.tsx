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
import { MultiSelect } from '@/components/ui/multi-select';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Bell, 
  CheckCircle, 
  Info,
  Trash2,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
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
  const [filterTypes, setFilterTypes] = useState<string[]>([]);
  const [filterStatuses, setFilterStatuses] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'date' | 'type' | 'status'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [activeLogCategory, setActiveLogCategory] = useState<string>('all');
  const [activeNotificationCategory, setActiveNotificationCategory] = useState<string>('all');
  const [expandedNotificationId, setExpandedNotificationId] = useState<string | null>(null);
  
  // Category-specific filters for activity logs
  const [materialFilterAction, setMaterialFilterAction] = useState<string>('all');
  const [materialFilterStatus, setMaterialFilterStatus] = useState<string>('all');
  const [monthFilter, setMonthFilter] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

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

  // Month options from notifications (unique year-months, newest first)
  const monthOptions = useMemo(() => {
    const dates = notifications.map(n => {
      const raw = n.created_at || (n as any).createdAt || n.related_data?.created_at || '';
      return raw ? new Date(raw) : null;
    }).filter((d): d is Date => d !== null && !Number.isNaN(d.getTime()));
    const set = new Set<string>();
    dates.forEach(d => set.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`));
    return Array.from(set).sort().reverse().map(ym => {
      const [y, m] = ym.split('-').map(Number);
      const label = new Date(y, m - 1, 1).toLocaleString('en-IN', { month: 'long', year: 'numeric' });
      return { value: ym, label };
    });
  }, [notifications]);

  // Filter notifications (multi-select: empty = all, + month) - memoized
  const filteredNotifications = useMemo(() =>
    baseNotifications.filter(n => {
      if (filterTypes.length > 0 && !filterTypes.includes(n.type)) return false;
      if (filterStatuses.length > 0 && !filterStatuses.includes(n.status)) return false;
      if (monthFilter !== 'all') {
        const raw = n.created_at || (n as any).createdAt || n.related_data?.created_at || '';
        if (!raw) return false;
        const d = new Date(raw);
        const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (ym !== monthFilter) return false;
      }
      return true;
    }),
    [baseNotifications, filterTypes, filterStatuses, monthFilter]
  );

  // Sort filtered notifications - memoized
  const sortedNotifications = useMemo(() => {
    const list = [...filteredNotifications];
    const mult = sortOrder === 'asc' ? 1 : -1;
    const getDateTs = (n: Notification): number => {
      const raw = n.created_at || (n as any).createdAt || n.related_data?.created_at || (n.related_data as any)?.createdAt || '';
      if (!raw) return 0;
      const ts = new Date(raw).getTime();
      return Number.isNaN(ts) ? 0 : ts;
    };
    list.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'date') {
        cmp = getDateTs(a) - getDateTs(b);
      } else if (sortBy === 'type') {
        cmp = (a.type || '').localeCompare(b.type || '');
      } else if (sortBy === 'status') {
        cmp = (a.status || '').localeCompare(b.status || '');
      }
      return mult * cmp;
    });
    return list;
  }, [filteredNotifications, sortBy, sortOrder]);

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

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAllOnPage = useCallback(() => {
    setSelectedIds(new Set(sortedNotifications.map(n => n.id)));
  }, [sortedNotifications]);

  const deselectAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const handleDeleteSelected = useCallback(() => {
    setShowDeleteConfirm(true);
  }, []);

  const confirmDeleteSelected = useCallback(async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) {
      setShowDeleteConfirm(false);
      return;
    }
    setDeleting(true);
    try {
      await Promise.all(ids.map(id => NotificationService.deleteNotification(id)));
      setNotifications(prev => prev.filter(n => !selectedIds.has(n.id)));
      setSelectedIds(new Set());
      setShowDeleteConfirm(false);
      toast({
        title: 'Deleted',
        description: `${ids.length} notification(s) deleted permanently.`,
      });
    } catch (error) {
      console.error('Error deleting notifications:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete some notifications.',
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
    }
  }, [selectedIds, toast]);

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
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-700 mb-0.5 block">Month</label>
                  <Select value={monthFilter} onValueChange={setMonthFilter}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="All time" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All time</SelectItem>
                      {monthOptions.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700 mb-0.5 block">Type</label>
                  <MultiSelect
                    options={[
                      { label: 'Low Stock', value: 'low_stock' },
                      { label: 'Restock Request', value: 'restock_request' },
                      { label: 'Out of Stock', value: 'out_of_stock' },
                      { label: 'Production Request', value: 'production_request' },
                      { label: 'Order Alert', value: 'order_alert' },
                      { label: 'Warning', value: 'warning' },
                      { label: 'Activity Log', value: 'activity_log' },
                      { label: 'Info', value: 'info' },
                      { label: 'Success', value: 'success' },
                      { label: 'Error', value: 'error' },
                    ]}
                    selected={filterTypes}
                    onChange={setFilterTypes}
                    placeholder="All Types"
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700 mb-0.5 block">Status</label>
                  <MultiSelect
                    options={[
                      { label: 'Unread', value: 'unread' },
                      { label: 'Read', value: 'read' },
                      { label: 'Dismissed', value: 'dismissed' },
                    ]}
                    selected={filterStatuses}
                    onChange={setFilterStatuses}
                    placeholder="All Status"
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700 mb-0.5 block">Sort by</label>
                  <Select value={sortBy} onValueChange={(v: 'date' | 'type' | 'status') => setSortBy(v)}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="date">Date</SelectItem>
                      <SelectItem value="type">Type</SelectItem>
                      <SelectItem value="status">Status</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700 mb-0.5 block">Order</label>
                  <Select value={sortOrder} onValueChange={(v: 'asc' | 'desc') => setSortOrder(v)}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="desc">Descending</SelectItem>
                      <SelectItem value="asc">Ascending</SelectItem>
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

        {/* Admin: Select and Delete toolbar */}
        {isAdmin && sortedNotifications.length > 0 && (
          <Card className="mb-4">
            <CardContent className="p-3 flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" onClick={selectAllOnPage}>
                Select all on page
              </Button>
              <Button variant="outline" size="sm" onClick={deselectAll}>
                Deselect all
              </Button>
              <span className="text-sm text-gray-600">
                {selectedIds.size} selected
              </span>
              {selectedIds.size > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDeleteSelected}
                  className="ml-auto bg-red-600 hover:bg-red-700 text-white"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete selected ({selectedIds.size})
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Notifications List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : sortedNotifications.length === 0 ? (
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
            {sortedNotifications.length > 0 ? (
          <div className="space-y-3">
            {sortedNotifications.map((notification) => (
                  <div key={notification.id} id={`notification-${notification.id}`}>
                    <ActivityNotificationCard
                      notification={notification}
                      onClick={() => handleNotificationClick(notification)}
                      expandedId={expandedNotificationId}
                      onExpand={handleExpand}
                      onMarkAsRead={handleMarkAsRead}
                      selectable={isAdmin}
                      selected={selectedIds.has(notification.id)}
                      onToggleSelect={toggleSelect}
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
            {categorizeNotifications(sortedNotifications).map((section) => (
              <Card key={section.category} className="overflow-hidden">
                <CardContent className="p-0">
                  <NotificationSectionComponent
                    section={section}
                    onNotificationClick={handleNotificationClick}
                    compact={false}
                    expandedId={expandedNotificationId}
                    onExpand={handleExpand}
                    onMarkAsRead={handleMarkAsRead}
                    selectable={isAdmin}
                    selectedIds={selectedIds}
                    onToggleSelect={toggleSelect}
                  />
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

        {/* Delete confirmation (admin only) */}
        <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete selected notifications?</DialogTitle>
              <DialogDescription>
                This will permanently delete {selectedIds.size} notification(s) or log(s). This action cannot be undone. Only admins can delete notifications.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDeleteConfirm(false)} disabled={deleting}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={confirmDeleteSelected} disabled={deleting} className="bg-red-600 hover:bg-red-700 text-white">
                {deleting ? 'Deleting...' : 'Delete permanently'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
    </Layout>
  );
}
