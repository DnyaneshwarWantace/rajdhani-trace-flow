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
    notification.type === 'restock_request' ||
    notification.type === 'out_of_stock'
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

  // Create sections with metadata
  const sections: NotificationSection[] = [
    {
      category: 'orders',
      title: 'Order Related',
      icon: null, // Will be set in component
      notifications: categories.orders,
      unreadCount: categories.orders.filter(n => n.status === 'unread').length,
    },
    {
      category: 'production',
      title: 'Production Related',
      icon: null,
      notifications: categories.production,
      unreadCount: categories.production.filter(n => n.status === 'unread').length,
    },
    {
      category: 'stock',
      title: 'Stock Notifications',
      icon: null,
      notifications: categories.stock,
      unreadCount: categories.stock.filter(n => n.status === 'unread').length,
    },
    {
      category: 'activity_logs',
      title: 'Activity Logs',
      icon: null,
      notifications: categories.activity_logs,
      unreadCount: categories.activity_logs.filter(n => n.status === 'unread').length,
    },
    {
      category: 'other',
      title: 'Other Notifications',
      icon: null,
      notifications: categories.other,
      unreadCount: categories.other.filter(n => n.status === 'unread').length,
    },
  ];

  // Filter out empty sections
  return sections.filter(section => section.notifications.length > 0);
};

