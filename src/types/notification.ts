// Re-export from notificationService for consistency
export type { Notification } from '@/services/notificationService';

export interface NotificationFilters {
  type?: string;
  is_read?: boolean;
  priority?: string;
}
