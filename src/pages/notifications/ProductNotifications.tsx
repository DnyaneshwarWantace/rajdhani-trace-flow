import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { NotificationService, type Notification } from '@/services/notificationService';
import { Package } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import SectionHeader from '@/components/notifications/sections/SectionHeader';
import SectionTabs from '@/components/notifications/sections/SectionTabs';
import SectionFilters from '@/components/notifications/sections/SectionFilters';
import SectionContent from '@/components/notifications/sections/SectionContent';

export default function ProductNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [activityLogs, setActivityLogs] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'notifications' | 'logs'>('notifications');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    loadData();

    // Auto-refresh every 10 seconds to catch new notifications
    const refreshInterval = setInterval(() => {
      loadData();
    }, 10000);

    return () => clearInterval(refreshInterval);
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const { data } = await NotificationService.getNotifications({ limit: 1000 });

      console.log('📦 Product Notifications - All notifications:', data.length);
      console.log('📦 Sample notifications:', data.slice(0, 5).map(n => ({
        type: n.type,
        module: n.module,
        title: n.title
      })));

      // Look for Arena Carpet notification specifically
      const arenaNotif = data.find(n => n.title.includes('Arena Carpet'));
      if (arenaNotif) {
        console.log('🎯 FOUND Arena Carpet notification:', {
          title: arenaNotif.title,
          type: arenaNotif.type,
          module: arenaNotif.module,
          status: arenaNotif.status,
          id: arenaNotif.id
        });
      } else {
        console.log('❌ Arena Carpet notification NOT found in data');
      }

      // Filter for product-related notifications
      const productNotifications = data.filter(n =>
        n.module === 'products' ||
        n.related_data?.action_category === 'PRODUCT' ||
        n.related_data?.action?.includes('PRODUCT_')
      );

      console.log('📦 Product Notifications - Filtered:', productNotifications.length);

      // Check if Arena is in filtered
      const arenaInFiltered = productNotifications.find(n => n.title.includes('Arena Carpet'));
      console.log('🎯 Arena Carpet in filtered?', !!arenaInFiltered);

      // Separate notifications and activity logs
      const regularNotifications = productNotifications.filter(n => !n.related_data?.activity_log_id);
      const logs = productNotifications.filter(n => n.related_data?.activity_log_id);

      console.log('📦 Product Notifications - Regular:', regularNotifications.length, 'Logs:', logs.length);

      setNotifications(regularNotifications);
      setActivityLogs(logs);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load notifications',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (notification.module === 'products' && notification.related_id) {
      navigate(`/products?highlight=${notification.related_id}`);
    }
  };

  // Apply filters and sort by date (latest first)
  const filteredNotifications = notifications
    .filter(n => {
      if (filterType !== 'all' && n.type !== filterType) return false;
      if (filterStatus !== 'all' && n.status !== filterStatus) return false;
      if (filterPriority !== 'all' && n.priority !== filterPriority) return false;
      return true;
    })
    .sort((a, b) => {
      // For activity logs, use the activity log's created_at from related_data if available
      const dateA = a.related_data?.created_at || a.created_at;
      const dateB = b.related_data?.created_at || b.created_at;
      return new Date(dateB).getTime() - new Date(dateA).getTime();
    });

  const filteredLogs = activityLogs
    .filter(n => {
      if (filterType !== 'all' && n.type !== filterType) return false;
      if (filterStatus !== 'all' && n.status !== filterStatus) return false;
      if (filterPriority !== 'all' && n.priority !== filterPriority) return false;
      return true;
    })
    .sort((a, b) => {
      // For activity logs, use the activity log's created_at from related_data if available
      const dateA = a.related_data?.created_at || a.created_at;
      const dateB = b.related_data?.created_at || b.created_at;
      return new Date(dateB).getTime() - new Date(dateA).getTime();
    });

  const unreadCount = notifications.filter(n => n.status === 'unread').length;

  return (
    <Layout>
      <div>
        <SectionHeader
          title="Product Notifications"
          description="View all product related notifications and logs"
          icon={<Package className="w-8 h-8 text-blue-600" />}
        />

        <SectionTabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
          notificationsCount={filteredNotifications.length}
          logsCount={filteredLogs.length}
          unreadCount={unreadCount}
        />

        <SectionFilters
          filterType={filterType}
          filterStatus={filterStatus}
          filterPriority={filterPriority}
          onTypeChange={setFilterType}
          onStatusChange={setFilterStatus}
          onPriorityChange={setFilterPriority}
        />

        <SectionContent
          activeTab={activeTab}
          notifications={filteredNotifications}
          activityLogs={filteredLogs}
          loading={loading}
          onNotificationClick={handleNotificationClick}
        />
      </div>
    </Layout>
  );
}

