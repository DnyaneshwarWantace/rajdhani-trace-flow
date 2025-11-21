import AuthService from './authService';

const API_URL = import.meta.env.VITE_API_URL || 'https://rajdhani.wantace.com/api';

// Helper function to get headers with auth token
const getHeaders = () => {
  const token = AuthService.getToken();
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  };
};

export interface Notification {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success' | 'production_request' | 'restock_request' | 'low_stock' | 'order_alert';
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'unread' | 'read' | 'dismissed';
  module: 'orders' | 'products' | 'materials' | 'production';
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

export class MongoDBNotificationService {
  // Create a new notification
  static async createNotification(notificationData: CreateNotificationData): Promise<{ data: Notification | null; error: string | null }> {
    try {
      const response = await fetch(`${API_URL}/notifications`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(notificationData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create notification');
      }

      return { data: result.data, error: null };
    } catch (error) {
      console.error('Error creating notification:', error);
      return { data: null, error: error.message || 'Failed to create notification' };
    }
  }

  // Get all notifications with optional filters
  static async getNotifications(filters?: {
    module?: string;
    status?: string;
    type?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ data: Notification[] | null; error: string | null }> {
    try {
      const queryParams = new URLSearchParams();
      if (filters?.module) queryParams.append('module', filters.module);
      if (filters?.status) queryParams.append('status', filters.status);
      if (filters?.type) queryParams.append('type', filters.type);
      if (filters?.limit) queryParams.append('limit', filters.limit.toString());
      if (filters?.offset) queryParams.append('offset', filters.offset.toString());

      const response = await fetch(`${API_URL}/notifications?${queryParams}`, {
        headers: getHeaders()
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch notifications');
      }

      return { data: result.data, error: null };
    } catch (error) {
      console.error('Error fetching notifications:', error);
      return { data: null, error: error.message || 'Failed to fetch notifications' };
    }
  }

  // Get notifications by module
  static async getNotificationsByModule(module: string): Promise<{ data: Notification[] | null; error: string | null }> {
    return this.getNotifications({ module });
  }

  // Get notification by ID
  static async getNotificationById(id: string): Promise<{ data: Notification | null; error: string | null }> {
    try {
      const response = await fetch(`${API_URL}/notifications/${id}`, {
        headers: getHeaders()
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch notification');
      }

      return { data: result.data, error: null };
    } catch (error) {
      console.error('Error fetching notification:', error);
      return { data: null, error: error.message || 'Failed to fetch notification' };
    }
  }

  // Update notification (partial update)
  static async updateNotification(id: string, updates: Partial<Notification>): Promise<{ data: Notification | null; error: string | null }> {
    try {
      const response = await fetch(`${API_URL}/notifications/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(updates),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update notification');
      }

      return { data: result.data, error: null };
    } catch (error) {
      console.error('Error updating notification:', error);
      return { data: null, error: error.message || 'Failed to update notification' };
    }
  }

  // Update notification status
  static async updateNotificationStatus(id: string, status: 'unread' | 'read' | 'dismissed'): Promise<{ data: Notification | null; error: string | null }> {
    try {
      const response = await fetch(`${API_URL}/notifications/${id}/status`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({ status }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update notification status');
      }

      return { data: result.data, error: null };
    } catch (error) {
      console.error('Error updating notification status:', error);
      return { data: null, error: error.message || 'Failed to update notification status' };
    }
  }

  // Delete notification
  static async deleteNotification(id: string): Promise<{ error: string | null }> {
    try {
      const response = await fetch(`${API_URL}/notifications/${id}`, {
        method: 'DELETE',
        headers: getHeaders()
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete notification');
      }

      return { error: null };
    } catch (error) {
      console.error('Error deleting notification:', error);
      return { error: error.message || 'Failed to delete notification' };
    }
  }

  // Check if notification exists
  static async notificationExists(type: string, related_id: string, status: string = 'unread'): Promise<{ exists: boolean; error: string | null }> {
    try {
      const queryParams = new URLSearchParams({
        type,
        related_id,
        status,
      });

      const response = await fetch(`${API_URL}/notifications/exists?${queryParams}`, {
        headers: getHeaders()
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to check notification existence');
      }

      return { exists: result.exists, error: null };
    } catch (error) {
      console.error('Error checking notification existence:', error);
      return { exists: false, error: error.message || 'Failed to check notification existence' };
    }
  }

  // Get notification counts by module
  static async getNotificationCounts(): Promise<{ data: any[] | null; error: string | null }> {
    try {
      const response = await fetch(`${API_URL}/notifications/counts`, {
        headers: getHeaders()
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch notification counts');
      }

      return { data: result.data, error: null };
    } catch (error) {
      console.error('Error fetching notification counts:', error);
      return { data: null, error: error.message || 'Failed to fetch notification counts' };
    }
  }

  // Mark notification as read
  static async markAsRead(id: string): Promise<{ error: string | null }> {
    const result = await this.updateNotificationStatus(id, 'read');
    return { error: result.error };
  }

  // Mark notification as dismissed
  static async markAsDismissed(id: string): Promise<{ error: string | null }> {
    const result = await this.updateNotificationStatus(id, 'dismissed');
    return { error: result.error };
  }
}

export default MongoDBNotificationService;
