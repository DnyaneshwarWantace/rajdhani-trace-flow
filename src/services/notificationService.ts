import { supabase, supabaseAdmin, Notification } from '@/lib/supabase';
import { generateUniqueId } from '@/lib/idGenerator';

export class NotificationService {
  // Create a new notification
  static async createNotification(notification: Omit<Notification, 'id' | 'created_at' | 'updated_at'>): Promise<{ data: Notification | null; error: string | null }> {
    try {
      const client = supabaseAdmin || supabase;
      if (!client) {
        throw new Error('Supabase client not initialized');
      }

      // Generate a unique ID for the notification
      const notificationWithId = {
        ...notification,
        id: await generateUniqueId('NOTIF')
      };

      const { data, error } = await client
        .from('notifications')
        .insert([notificationWithId])
        .select()
        .single();

      if (error) throw error;

      return { data, error: null };
    } catch (error) {
      console.error('Error creating notification:', error);
      return { data: null, error: error.message || 'Failed to create notification' };
    }
  }

  // Get all notifications
  static async getNotifications(): Promise<{ data: Notification[] | null; error: string | null }> {
    try {
      const client = supabaseAdmin || supabase;
      if (!client) {
        throw new Error('Supabase client not initialized');
      }

      const { data, error } = await client
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return { data, error: null };
    } catch (error) {
      console.error('Error fetching notifications:', error);
      return { data: null, error: error.message || 'Failed to fetch notifications' };
    }
  }

  // Get notifications by module
  static async getNotificationsByModule(module: string): Promise<{ data: Notification[] | null; error: string | null }> {
    try {
      const client = supabaseAdmin || supabase;
      if (!client) {
        throw new Error('Supabase client not initialized');
      }

      const { data, error } = await client
        .from('notifications')
        .select('*')
        .eq('module', module)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return { data, error: null };
    } catch (error) {
      console.error('Error fetching notifications by module:', error);
      return { data: null, error: error.message || 'Failed to fetch notifications' };
    }
  }

  // Get unread notifications
  static async getUnreadNotifications(): Promise<{ data: Notification[] | null; error: string | null }> {
    try {
      const client = supabaseAdmin || supabase;
      if (!client) {
        throw new Error('Supabase client not initialized');
      }

      const { data, error } = await client
        .from('notifications')
        .select('*')
        .eq('status', 'unread')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return { data, error: null };
    } catch (error) {
      console.error('Error fetching unread notifications:', error);
      return { data: null, error: error.message || 'Failed to fetch unread notifications' };
    }
  }

  // Mark notification as read
  static async markAsRead(notificationId: string): Promise<{ data: Notification | null; error: string | null }> {
    try {
      const client = supabaseAdmin || supabase;
      if (!client) {
        throw new Error('Supabase client not initialized');
      }

      const { data, error } = await client
        .from('notifications')
        .update({ 
          status: 'read',
          updated_at: new Date().toISOString()
        })
        .eq('id', notificationId)
        .select()
        .single();

      if (error) throw error;

      return { data, error: null };
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return { data: null, error: error.message || 'Failed to mark notification as read' };
    }
  }

  // Mark notification as dismissed
  static async markAsDismissed(notificationId: string): Promise<{ data: Notification | null; error: string | null }> {
    try {
      const client = supabaseAdmin || supabase;
      if (!client) {
        throw new Error('Supabase client not initialized');
      }

      const { data, error } = await client
        .from('notifications')
        .update({ 
          status: 'dismissed',
          updated_at: new Date().toISOString()
        })
        .eq('id', notificationId)
        .select()
        .single();

      if (error) throw error;

      return { data, error: null };
    } catch (error) {
      console.error('Error dismissing notification:', error);
      return { data: null, error: error.message || 'Failed to dismiss notification' };
    }
  }

  // Delete notification
  static async deleteNotification(notificationId: string): Promise<{ error: string | null }> {
    try {
      if (!supabase) {
        throw new Error('Supabase client not initialized');
      }

      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;

      return { error: null };
    } catch (error) {
      console.error('Error deleting notification:', error);
      return { error: error.message || 'Failed to delete notification' };
    }
  }

  // Clean up notifications related to an order
  static async cleanupOrderNotifications(orderId: string): Promise<{ error: string | null }> {
    try {
      if (!supabase) {
        throw new Error('Supabase client not initialized');
      }

      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('related_data->>orderId', orderId);

      if (error) throw error;

      return { error: null };
    } catch (error) {
      console.error('Error cleaning up order notifications:', error);
      return { error: error.message || 'Failed to cleanup order notifications' };
    }
  }

  // Check if notification already exists (to prevent duplicates)
  static async notificationExists(
    type: string, 
    relatedId: string, 
    status: string = 'unread'
  ): Promise<{ exists: boolean; error: string | null }> {
    try {
      const client = supabaseAdmin || supabase;
      if (!client) {
        throw new Error('Supabase client not initialized');
      }

      const { data, error } = await client
        .from('notifications')
        .select('id')
        .eq('type', type)
        .eq('related_id', relatedId)
        .eq('status', status)
        .limit(1);

      if (error) throw error;

      return { exists: data && data.length > 0, error: null };
    } catch (error) {
      console.error('Error checking notification existence:', error);
      return { exists: false, error: error.message || 'Failed to check notification existence' };
    }
  }
}