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
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination-primitives';

type TabValue = 'all' | 'activity_logs';

export default function Notifications() {
  const [activeTab, setActiveTab] = useState<TabValue>('all');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  // Total regular notifications from backend (currently only logged)
  const [totalNotifications, setTotalNotifications] = useState(0);
  const [totalActivityLogs, setTotalActivityLogs] = useState(0);
  const [backendCategoryCounts, setBackendCategoryCounts] = useState<Record<string, number>>({});
  const [filterTypes, setFilterTypes] = useState<string[]>([]);
  const [filterStatuses, setFilterStatuses] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'date' | 'type' | 'status'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [activeLogCategory, setActiveLogCategory] = useState<string>('all');
  const [activeNotificationCategory, setActiveNotificationCategory] = useState<string>('all');
  const [expandedNotificationId, setExpandedNotificationId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [globalUnread, setGlobalUnread] = useState(0);
  const [globalRead, setGlobalRead] = useState(0);
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);

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

  // Reset to first page whenever tab changes
  useEffect(() => {
    setPage(1);
  }, [activeTab]);

  // Reset to first page whenever high-level filters change so we don't
  // end up requesting an out-of-range page that looks "empty".
  useEffect(() => {
    setPage(1);
  }, [monthFilter, sortBy, sortOrder, filterTypes, filterStatuses, activeLogCategory]);

  // On initial mount, prefetch global activity log totals so the Activity Logs
  // tab badge shows the correct count even before the tab is opened.
  useEffect(() => {
    (async () => {
      try {
        const resp = await NotificationService.getNotifications({
          limit: 1,
          offset: 0,
          // Do not disable logs here – we just want the totals and category counts.
        });
        setTotalActivityLogs(resp.totalActivityLogs || 0);
        setBackendCategoryCounts(resp.activityLogCategoryCounts || {});
      } catch (e) {
        console.error('Error prefetching activity log totals:', e);
      }
    })();
  }, []);

  useEffect(() => {
    // Load notifications whenever page, pageSize, tab, log category, or global filters change
    loadNotifications();
  }, [page, pageSize, activeTab, activeLogCategory, monthFilter, sortBy, sortOrder, filterTypes, filterStatuses]);

  // Load ONE page of notifications/logs from the backend (server-side pagination)
  const loadNotifications = async () => {
    try {
      setLoading(true);

      const limit = pageSize;
      const offset = (page - 1) * pageSize;

      // For the main All Notifications tab, we only want REAL notifications, not logs.
      // For the Activity Logs tab, we want both (notifications will be filtered out in UI).
      const include_logs = activeTab === 'all' ? 'false' : undefined;

      // When on Activity Logs tab and a specific category is selected (Material, Product, etc.),
      // use the backend "module" filter so each category tab can page through its own logs.
      let moduleParam: string | undefined;
      if (activeTab === 'activity_logs') {
        if (activeLogCategory === 'material') {
          moduleParam = 'materials';
        } else if (activeLogCategory === 'product') {
          moduleParam = 'products';
        } else if (activeLogCategory === 'order') {
          moduleParam = 'orders';
        } else if (activeLogCategory === 'production') {
          moduleParam = 'production';
        }
        // For "all", "customer", "supplier" we leave module undefined to include all logs.
      }

      // Map top-level filters into backend query params.
      const statusParam =
        activeTab === 'all' && filterStatuses.length > 0
          ? filterStatuses.join(',')
          : undefined;
      const typeParam =
        activeTab === 'all' && filterTypes.length === 1
          ? filterTypes[0]
          : undefined;
      const monthParam = monthFilter !== 'all' ? monthFilter : undefined;

      const response = await NotificationService.getNotifications({
        limit,
        offset,
        include_logs,
        module: moduleParam,
        status: statusParam,
        type: typeParam,
        sortBy,
        sortOrder,
        month: monthParam,
      });

      const {
        data,
        totalNotifications: notifCount,
        totalActivityLogs: logsCount,
        activityLogCategoryCounts,
        unreadNotifications,
        readNotifications,
        months,
      } = response;

      // Sort this page by created_at descending (newest first)
      const sorted = (data || []).sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setNotifications(sorted);
      setHasMore(false);

      // Update month options from backend whenever provided
      if (months && months.length > 0) {
        setAvailableMonths(months);
      }

      // For real notifications tab (include_logs === 'false') keep global notification stats in sync.
      if (include_logs === 'false') {
        setTotalNotifications(notifCount || 0);
        setGlobalUnread(unreadNotifications || 0);
        setGlobalRead(readNotifications || 0);
      } else {
        // For any response that actually includes logs, update global logs stats and category counts.
        setTotalActivityLogs(logsCount || 0);
        setBackendCategoryCounts(activityLogCategoryCounts || {});
      }

      console.log('✅ Loaded notifications page:', page, 'size:', pageSize, 'items:', sorted.length);
      console.log('   Regular notifications total:', notifCount, 'Activity logs total:', logsCount);
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

  // Removed automatic infinite scroll - now using manual "Load More" button

  // Load all notifications at once
  const handleLoadAll = async () => {
    try {
      setLoadingMore(true);
      await loadNotifications();
      toast({
        title: 'Success',
        description: 'Loaded all notifications',
      });
    } catch (error) {
      console.error('Error loading all notifications:', error);
      toast({
        title: 'Error',
        description: 'Failed to load all notifications',
        variant: 'destructive',
      });
    } finally {
      setLoadingMore(false);
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
    // Use backend counts instead of calculating from loaded items
    const counts: Record<string, number> = {
      all: totalActivityLogs,
      material: (backendCategoryCounts['MATERIAL'] || 0) + (backendCategoryCounts['PURCHASE_ORDER'] || 0),
      product: backendCategoryCounts['PRODUCT'] || 0,
      order: backendCategoryCounts['ORDER'] || 0,
      customer: backendCategoryCounts['CUSTOMER'] || 0,
      supplier: backendCategoryCounts['SUPPLIER'] || 0,
      production: (backendCategoryCounts['PRODUCTION'] || 0) + (backendCategoryCounts['RECIPE'] || 0),
    };

    return counts;
  }, [totalActivityLogs, backendCategoryCounts]);

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

  // Month options for filter, using backend-provided list of all months
  const monthOptions = useMemo(
    () =>
      availableMonths.map((ym) => {
        const [y, m] = ym.split('-').map(Number);
        const label = new Date(y, m - 1, 1).toLocaleString('en-IN', {
          month: 'long',
          year: 'numeric',
        });
        return { value: ym, label };
      }),
    [availableMonths]
  );

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

  // Server-side pagination over sorted notifications (we only have one page in memory)
  const isActivityTab = activeTab === 'activity_logs';
  const totalItemsForTab = useMemo(() => {
    if (!isActivityTab) {
      // All Notifications tab: use global notification total from backend
      return totalNotifications;
    }

    // Activity Logs tab:
    // When "All Logs" is selected, use global logs total.
    // When a specific category (Material, Product, etc.) is selected,
    // use the backend category totals so pagination reflects that section.
    if (activeLogCategory === 'all') {
      return totalActivityLogs;
    }

    return categoryCounts[activeLogCategory] || 0;
  }, [isActivityTab, totalNotifications, activeLogCategory, totalActivityLogs, categoryCounts]);

  const totalPages = Math.max(1, Math.ceil((totalItemsForTab || 0) / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedNotifications = sortedNotifications;

  // Build page list with ellipsis, same pattern as ProductPagination
  const pages: (number | 'ellipsis')[] = useMemo(() => {
    const result: (number | 'ellipsis')[] = [];

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        result.push(i);
      }
    } else {
      result.push(1);

      if (currentPage > 3) {
        result.push('ellipsis');
      }

      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        if (i !== 1 && i !== totalPages) {
          result.push(i);
        }
      }

      if (currentPage < totalPages - 2) {
        result.push('ellipsis');
      }

      if (totalPages > 1) {
        result.push(totalPages);
      }
    }

    return result;
  }, [currentPage, totalPages]);

  const unreadCount = useMemo(
    () => notifications.filter(n => n.status === 'unread').length,
    [notifications]
  );

  // Unread badge for the main Notifications tab uses globalUnread from backend.
  const allUnreadCount = globalUnread;

  // Activity logs are system history and are treated as already-read,
  // so we don't show an "unread" bubble for them.
  const activityUnreadCount = 0;

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
    setSelectedIds(new Set(pagedNotifications.map(n => n.id)));
  }, [pagedNotifications]);

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

    // Separate real notifications from activity log notifications
    const realNotificationIds = ids.filter(id => !id.startsWith('activity_'));
    const activityLogIds = ids.filter(id => id.startsWith('activity_'));

    setDeleting(true);
    try {
      const deletePromises = [];

      // Delete real notifications
      if (realNotificationIds.length > 0) {
        deletePromises.push(
          ...realNotificationIds.map(id => NotificationService.deleteNotification(id))
        );
      }

      // Delete activity logs (extract MongoDB ObjectId from activity_ prefix)
      if (activityLogIds.length > 0) {
        const activityLogObjectIds = activityLogIds.map(id => id.replace('activity_', ''));
        deletePromises.push(
          ...activityLogObjectIds.map(id =>
            fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000/api'}/activity-logs/${id}`, {
              method: 'DELETE',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
              },
            })
          )
        );
      }

      await Promise.all(deletePromises);

      // Remove deleted items from UI
      setNotifications(prev => prev.filter(n => !ids.includes(n.id)));
      setSelectedIds(new Set());
      setShowDeleteConfirm(false);

      const totalDeleted = realNotificationIds.length + activityLogIds.length;
      toast({
        title: 'Deleted',
        description: `${totalDeleted} item(s) deleted permanently. ${realNotificationIds.length} notification(s), ${activityLogIds.length} activity log(s).`,
      });
    } catch (error) {
      console.error('Error deleting items:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete some items.',
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
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                  {activeTab === 'activity_logs' ? 'Activity Logs' : 'Notifications'}
                </h1>
                {unreadCount > 0 && (
                  <Badge className="bg-red-500 text-white">
                    {unreadCount} Unread
                  </Badge>
                )}
              </div>
              <p className="text-gray-600 mt-1">
                {activeTab === 'activity_logs'
                  ? `View all activity logs and system actions. Total: ${totalActivityLogs} logs`
                  : `View all your notifications. Total: ${totalNotifications} notifications`}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={handleMarkAllAsRead}
                disabled={unreadCount === 0}
                className="bg-primary-600 hover:bg-primary-700 disabled:opacity-50"
              >
                Mark All as Read {unreadCount > 0 && `(${unreadCount})`}
              </Button>
              {hasMore && (
                <Button
                  onClick={handleLoadAll}
                  disabled={loadingMore}
                  variant="outline"
                  className="border-primary-600 text-primary-600 hover:bg-primary-50"
                >
                  {loadingMore ? 'Loading...' : 'Load All'}
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <NotificationTabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
          // Use backend totals for tab badges
          allNotificationsCount={totalNotifications}
          activityLogsCount={totalActivityLogs}
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
                    <p className="text-2xl font-bold text-blue-600">{globalUnread}</p>
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
                    <p className="text-2xl font-bold text-gray-600">{globalRead}</p>
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
                    <p className="text-2xl font-bold text-gray-700">{totalNotifications}</p>
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
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-sm">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Month</label>
                  <Select value={monthFilter} onValueChange={setMonthFilter}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="All time" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="font-semibold">
                        All time
                      </SelectItem>
                      {monthOptions.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Type</label>
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
                    className="h-9 text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Status</label>
                  <MultiSelect
                    options={[
                      { label: 'Unread', value: 'unread' },
                      { label: 'Read', value: 'read' },
                      { label: 'Dismissed', value: 'dismissed' },
                    ]}
                    selected={filterStatuses}
                    onChange={setFilterStatuses}
                    placeholder="All Status"
                    className="h-9 text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Sort by</label>
                  <Select value={sortBy} onValueChange={(v: 'date' | 'type' | 'status') => setSortBy(v)}>
                    <SelectTrigger className="h-9 text-sm">
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
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Order</label>
                  <Select value={sortOrder} onValueChange={(v: 'asc' | 'desc') => setSortOrder(v)}>
                    <SelectTrigger className="h-9 text-sm">
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
          <div className="space-y-6">
            {/* Activity Logs List */}
            {pagedNotifications.length > 0 ? (
              <div className="space-y-3">
                {pagedNotifications.map((notification) => (
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
                  <p className="text-gray-500 text-sm mt-2">
                    Try adjusting your filters or select a different category
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Pagination Controls (shared with All Notifications tab) */}
            <div className="mt-4 sm:mt-6 w-full">
              <Pagination className="w-full">
                <PaginationContent className="w-full justify-center flex-wrap gap-1">
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => {
                        if (currentPage > 1) setPage(currentPage - 1);
                      }}
                      className={`${
                        currentPage === 1
                          ? 'pointer-events-none opacity-50'
                          : 'cursor-pointer'
                      } h-8 w-8 sm:h-10 sm:w-auto text-xs sm:text-sm`}
                    />
                  </PaginationItem>

                  {/* Page Numbers - same responsive behaviour as ProductPagination */}
                  {pages.map((p, index) => (
                    <PaginationItem
                      key={index}
                      className={p === 'ellipsis' ? 'hidden sm:block' : ''}
                    >
                      {p === 'ellipsis' ? (
                        <PaginationEllipsis />
                      ) : (
                        <PaginationLink
                          isActive={p === currentPage}
                          onClick={() => setPage(p as number)}
                          className={`cursor-pointer h-8 w-8 sm:h-10 sm:w-10 text-xs sm:text-sm p-0 ${
                            Math.abs((p as number) - currentPage) > 1 &&
                            (p as number) !== 1 &&
                            (p as number) !== totalPages
                              ? 'hidden sm:flex'
                              : ''
                          }`}
                        >
                          {p}
                        </PaginationLink>
                      )}
                    </PaginationItem>
                  ))}

                  <PaginationItem>
                    <PaginationNext
                      onClick={() => {
                        if (currentPage < totalPages) setPage(currentPage + 1);
                      }}
                      className={`${
                        currentPage >= totalPages
                          ? 'pointer-events-none opacity-50'
                          : 'cursor-pointer'
                      } h-8 w-8 sm:h-10 sm:w-auto text-xs sm:text-sm`}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>

              <div className="mt-3 sm:mt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-xs sm:text-sm text-gray-600 text-center sm:text-left">
                  Showing {(currentPage - 1) * pageSize + 1} to{' '}
                  {Math.min(currentPage * pageSize, totalItemsForTab)} of {totalItemsForTab}{' '}
                  {isActivityTab ? 'logs' : 'notifications'}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs sm:text-sm text-gray-600 whitespace-nowrap">
                    Per page:
                  </span>
                  <Select
                    value={pageSize.toString()}
                    onValueChange={(value) => {
                      const newSize = parseInt(value);
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
          </div>
        ) : (
          // All Notifications Tab - Show regular notifications in sections
          <div className="space-y-6">
            {categorizeNotifications(sortedNotifications, sortBy, sortOrder).map((section) => (
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

            {/* Pagination Controls */}
            <div className="mt-4 sm:mt-6 w-full">
              <Pagination className="w-full">
                <PaginationContent className="w-full justify-center flex-wrap gap-1">
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => {
                        if (currentPage > 1) setPage(currentPage - 1);
                      }}
                      className={`${currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'} h-8 w-8 sm:h-10 sm:w-auto text-xs sm:text-sm`}
                    />
                  </PaginationItem>

                  {/* Page Numbers - same responsive behaviour as ProductPagination */}
                  {pages.map((p, index) => (
                    <PaginationItem
                      key={index}
                      className={p === 'ellipsis' ? 'hidden sm:block' : ''}
                    >
                      {p === 'ellipsis' ? (
                        <PaginationEllipsis />
                      ) : (
                        <PaginationLink
                          isActive={p === currentPage}
                          onClick={() => setPage(p as number)}
                          className={`cursor-pointer h-8 w-8 sm:h-10 sm:w-10 text-xs sm:text-sm p-0 ${
                            Math.abs((p as number) - currentPage) > 1 &&
                            (p as number) !== 1 &&
                            (p as number) !== totalPages
                              ? 'hidden sm:flex'
                              : ''
                          }`}
                        >
                          {p}
                        </PaginationLink>
                      )}
                    </PaginationItem>
                  ))}

                  <PaginationItem>
                    <PaginationNext
                      onClick={() => {
                        if (currentPage < totalPages) setPage(currentPage + 1);
                      }}
                      className={`${currentPage >= totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'} h-8 w-8 sm:h-10 sm:w-auto text-xs sm:text-sm`}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>

              {/* Pagination Info and Page Size Selector */}
              <div className="mt-3 sm:mt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-xs sm:text-sm text-gray-600 text-center sm:text-left">
                  Showing {(currentPage - 1) * pageSize + 1} to{' '}
                  {Math.min(currentPage * pageSize, totalItemsForTab)} of {totalItemsForTab}{' '}
                  {isActivityTab ? 'logs' : 'notifications'}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs sm:text-sm text-gray-600 whitespace-nowrap">Per page:</span>
                  <Select
                    value={pageSize.toString()}
                    onValueChange={(value) => {
                      const newSize = parseInt(value);
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
