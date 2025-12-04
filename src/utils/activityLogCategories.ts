import type { Notification } from '@/services/notificationService';

export interface ActivityLogSection {
  category: string;
  title: string;
  notifications: Notification[];
  unreadCount: number;
}

export function categorizeActivityLogs(notifications: Notification[]): ActivityLogSection[] {
  const sections: Record<string, Notification[]> = {
    material: [],
    product: [],
    order: [],
    customer: [],
    supplier: [],
    production: [],
    other: [],
  };

  notifications.forEach((notification) => {
    const activityData = notification.related_data;
    const action = activityData?.action || '';
    const actionCategory = activityData?.action_category || '';

    const module = notification.module || '';

    // Material - all material and purchase order related
    if (
      actionCategory === 'MATERIAL' ||
      actionCategory === 'PURCHASE_ORDER' ||
      action.includes('MATERIAL_') ||
      action.includes('PURCHASE_ORDER_') ||
      module === 'materials'
    ) {
      sections.material.push(notification);
    }
    // Product - all product related
    else if (
      actionCategory === 'PRODUCT' ||
      action.includes('PRODUCT_') ||
      module === 'products'
    ) {
      sections.product.push(notification);
    }
    // Order - customer orders
    else if (
      actionCategory === 'ORDER' ||
      action.includes('ORDER_') ||
      (module === 'orders' && !action.includes('PURCHASE_ORDER'))
    ) {
      sections.order.push(notification);
    }
    // Customer - customer related operations
    else if (
      actionCategory === 'CLIENT' ||
      action.includes('CLIENT_') ||
      action.includes('CUSTOMER_')
    ) {
      sections.customer.push(notification);
    }
    // Supplier - supplier related operations
    else if (
      action.includes('SUPPLIER_')
    ) {
      sections.supplier.push(notification);
    }
    // Production - recipe and production related
    else if (
      actionCategory === 'RECIPE' ||
      actionCategory === 'PRODUCTION' ||
      action.includes('RECIPE_') ||
      action.includes('PRODUCTION_') ||
      module === 'production'
    ) {
      sections.production.push(notification);
    }
    // Everything else
    else {
      sections.other.push(notification);
    }
  });

  const sectionTitles: Record<string, string> = {
    material: 'Material',
    product: 'Product',
    order: 'Order',
    customer: 'Customer',
    supplier: 'Supplier',
    production: 'Production',
    other: 'Other Activities',
  };

  return Object.entries(sections)
    .filter(([_, notifications]) => notifications.length > 0)
    .map(([category, notifications]) => ({
      category,
      title: sectionTitles[category] || category,
      notifications,
      unreadCount: notifications.filter((n) => n.status === 'unread').length,
    }))
    .sort((a, b) => b.unreadCount - a.unreadCount || b.notifications.length - a.notifications.length);
}
