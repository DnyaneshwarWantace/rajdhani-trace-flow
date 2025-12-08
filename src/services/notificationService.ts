import { getApiUrl } from '@/utils/apiConfig';

const API_URL = getApiUrl();

export interface Notification {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success' | 'production_request' | 'restock_request' | 'low_stock' | 'order_alert' | 'activity_log';
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'unread' | 'read' | 'dismissed';
  module: 'orders' | 'products' | 'materials' | 'production' | 'activity';
  related_id?: string;
  related_data?: any;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CreateNotificationData {
  type: Notification['type'];
  title: string;
  message: string;
  priority?: Notification['priority'];
  status?: Notification['status'];
  module: Notification['module'];
  related_id?: string;
  related_data?: any;
  created_by?: string;
}

export class NotificationService {
  private static getHeaders(): HeadersInit {
    const token = localStorage.getItem('auth_token');
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  // Get all notifications with optional filters
  static async getNotifications(filters?: {
    module?: string;
    status?: string;
    type?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ data: Notification[]; total: number }> {
    try {
      const queryParams = new URLSearchParams();
      if (filters?.module) queryParams.append('module', filters.module);
      if (filters?.status) queryParams.append('status', filters.status);
      if (filters?.type) queryParams.append('type', filters.type);
      if (filters?.limit) queryParams.append('limit', filters.limit.toString());
      if (filters?.offset) queryParams.append('offset', filters.offset.toString());

      const response = await fetch(`${API_URL}/notifications?${queryParams}`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch notifications');
      }

      const result = await response.json();
      return {
        data: result.data || [],
        total: result.total || 0,
      };
    } catch (error) {
      console.error('Error fetching notifications:', error);
      return { data: [], total: 0 };
    }
  }

  // Get notifications by module
  static async getNotificationsByModule(module: string): Promise<Notification[]> {
    const { data } = await this.getNotifications({ module });
    return data;
  }

  // Get notification by ID
  static async getNotificationById(id: string): Promise<Notification | null> {
    try {
      const response = await fetch(`${API_URL}/notifications/${id}`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch notification');
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error('Error fetching notification:', error);
      return null;
    }
  }

  // Update notification (partial update)
  static async updateNotification(id: string, updates: Partial<Notification>): Promise<Notification | null> {
    try {
      const response = await fetch(`${API_URL}/notifications/${id}`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error('Failed to update notification');
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error('Error updating notification:', error);
      return null;
    }
  }

  // Update notification status
  static async updateNotificationStatus(id: string, status: 'unread' | 'read' | 'dismissed'): Promise<Notification | null> {
    try {
      const response = await fetch(`${API_URL}/notifications/${id}/status`, {
        method: 'PATCH',
        headers: this.getHeaders(),
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        throw new Error('Failed to update notification status');
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error('Error updating notification status:', error);
      return null;
    }
  }

  // Delete notification
  static async deleteNotification(id: string): Promise<void> {
    try {
      const response = await fetch(`${API_URL}/notifications/${id}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error('Failed to delete notification');
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
      throw error;
    }
  }

  // Create a new notification
  static async createNotification(notificationData: CreateNotificationData): Promise<Notification | null> {
    try {
      // Ensure module is valid (backend only accepts: orders, products, materials, production)
      const validModules = ['orders', 'products', 'materials', 'production'];
      const dataToSend = { ...notificationData };
      
      if (dataToSend.module && !validModules.includes(dataToSend.module)) {
        console.warn('Invalid module value:', dataToSend.module, 'Valid modules:', validModules);
        // Map 'activity' to 'products' as fallback, or default to 'products'
        dataToSend.module = 'products';
      }

      console.log('Creating notification with data:', {
        type: dataToSend.type,
        title: dataToSend.title,
        module: dataToSend.module,
        priority: dataToSend.priority,
        status: dataToSend.status
      });

      const response = await fetch(`${API_URL}/notifications`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(dataToSend),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Failed to create notification:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData,
          sentData: dataToSend
        });
        throw new Error(errorData.error || errorData.details || 'Failed to create notification');
      }

      const result = await response.json();
      console.log('Notification created successfully:', result.data?.id);
      return result.data;
    } catch (error) {
      console.error('Error creating notification:', error);
      return null;
    }
  }
}

