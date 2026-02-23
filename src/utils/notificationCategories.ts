import type { Notification } from '@/services/notificationService';

export type NotificationCategory = 
  | 'orders' 
  | 'production' 
  | 'stock' 
  | 'activity_logs' 
  | 'other';

export interface NotificationSection {
  category: NotificationCategory;
  title: string;
  icon: React.ReactNode;
  notifications: Notification[];
  unreadCount: number;
}

export const getNotificationCategory = (notification: Notification): NotificationCategory => {
  // Check if it's an activity log notification
  if (notification.related_data?.activity_log_id) {
    return 'activity_logs';
  }

  // Check for order-related
  if (notification.module === 'orders' || notification.type === 'order_alert') {
    return 'orders';
  }

  // Check for production-related
  if (notification.module === 'production' || notification.type === 'production_request') {
    return 'production';
  }

  // Check for stock-related
  if (
    notification.type === 'low_stock' ||
    notification.type === 'restock_request'
  ) {
    return 'stock';
  }
  
  // Check for out_of_stock in message or title
  if (
    notification.message?.toLowerCase().includes('out of stock') ||
    notification.title?.toLowerCase().includes('out of stock')
  ) {
    return 'stock';
  }

  // Default to other
  return 'other';
};

export const categorizeNotifications = (notifications: Notification[]): NotificationSection[] => {
  const categories: Record<NotificationCategory, Notification[]> = {
    orders: [],
    production: [],
    stock: [],
    activity_logs: [],
    other: [],
  };

  // Categorize notifications
  notifications.forEach(notification => {
    const category = getNotificationCategory(notification);
    categories[category].push(notification);
  });

  // Sort by date descending (newest first); support created_at or createdAt
  const getTime = (n: Notification & { createdAt?: string }) =>
    new Date(n.created_at || (n as any).createdAt || 0).getTime();
  const sortByNewest = (list: Notification[]) =>
    [...list].sort((a, b) => getTime(b) - getTime(a));

  // Create sections with metadata; notifications in each section are newest first
  const sections: NotificationSection[] = [
    {
      category: 'orders',
      title: 'Order Related',
      icon: null,
      notifications: sortByNewest(categories.orders),
      unreadCount: categories.orders.filter(n => n.status === 'unread').length,
    },
    {
      category: 'production',
      title: 'Production Related',
      icon: null,
      notifications: sortByNewest(categories.production),
      unreadCount: categories.production.filter(n => n.status === 'unread').length,
    },
    {
      category: 'stock',
      title: 'Stock Notifications',
      icon: null,
      notifications: sortByNewest(categories.stock),
      unreadCount: categories.stock.filter(n => n.status === 'unread').length,
    },
    {
      category: 'activity_logs',
      title: 'Activity Logs',
      icon: null,
      notifications: sortByNewest(categories.activity_logs),
      unreadCount: categories.activity_logs.filter(n => n.status === 'unread').length,
    },
    {
      category: 'other',
      title: 'Other Notifications',
      icon: null,
      notifications: sortByNewest(categories.other),
      unreadCount: categories.other.filter(n => n.status === 'unread').length,
    },
  ];

  // Filter out empty sections
  const nonEmpty = sections.filter(section => section.notifications.length > 0);

  // Sort sections by newest notification first (new first, old last)
  nonEmpty.sort((a, b) => {
    const aNewest = getTime(a.notifications[0]);
    const bNewest = getTime(b.notifications[0]);
    return bNewest - aNewest;
  });

  return nonEmpty;
};

