import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { NotificationService, type Notification } from '@/services/notificationService';
import { formatDate } from '@/utils/formatHelpers';
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
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const { data } = await NotificationService.getNotifications({ limit: 1000 });
      
      // Filter for product-related notifications
      const productNotifications = data.filter(n => 
        n.module === 'products' || 
        n.related_data?.action_category === 'PRODUCT' ||
        n.related_data?.action?.includes('PRODUCT_')
      );
      
      // Separate notifications and activity logs
      const regularNotifications = productNotifications.filter(n => !n.related_data?.activity_log_id);
      const logs = productNotifications.filter(n => n.related_data?.activity_log_id);
      
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

  const getNotificationIcon = (_type: string, _module: string) => {
    return <Package className="w-4 h-4 text-blue-600" />;
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
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const filteredLogs = activityLogs
    .filter(n => {
      if (filterType !== 'all' && n.type !== filterType) return false;
      if (filterStatus !== 'all' && n.status !== filterStatus) return false;
      if (filterPriority !== 'all' && n.priority !== filterPriority) return false;
      return true;
    })
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

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
          getNotificationIcon={getNotificationIcon}
          formatDate={formatDate}
        />
      </div>
    </Layout>
  );
}

