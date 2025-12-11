import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { NotificationService, type Notification } from '@/services/notificationService';
import { ShoppingCart } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import SectionHeader from '@/components/notifications/sections/SectionHeader';
import SectionTabs from '@/components/notifications/sections/SectionTabs';
import SectionFilters from '@/components/notifications/sections/SectionFilters';
import SectionContent from '@/components/notifications/sections/SectionContent';

export default function OrderNotifications() {
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
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const { data } = await NotificationService.getNotifications({ limit: 1000 });
      
      // Filter for order-related notifications (customer orders, not purchase orders)
      const orderNotifications = data.filter(n => 
        (n.module === 'orders' && !n.related_data?.action?.includes('PURCHASE_ORDER')) ||
        (n.related_data?.action_category === 'ORDER' && !n.related_data?.action?.includes('PURCHASE_ORDER')) ||
        (n.related_data?.action?.includes('ORDER_') && !n.related_data?.action?.includes('PURCHASE_ORDER'))
      );
      
      // Separate notifications and activity logs
      const regularNotifications = orderNotifications.filter(n => !n.related_data?.activity_log_id);
      const logs = orderNotifications.filter(n => n.related_data?.activity_log_id);
      
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
    if (notification.module === 'orders' && notification.related_id) {
      navigate(`/orders?highlight=${notification.related_id}`);
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
          title="Order Notifications"
          description="View all customer order related notifications and logs"
          icon={<ShoppingCart className="w-8 h-8 text-purple-600" />}
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

