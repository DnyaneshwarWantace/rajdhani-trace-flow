import { createContext, useContext, useState, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { NotificationService } from '@/services/notificationService';

interface NotificationContextType {
  unreadCount: number;
  refreshCount: () => Promise<void>;
  isLoading: boolean;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  // Load cached count from localStorage immediately
  const [unreadCount, setUnreadCount] = useState(() => {
    const cached = localStorage.getItem('notification_count');
    return cached ? parseInt(cached, 10) : 0;
  });
  const [isLoading, setIsLoading] = useState(false);
  const isMounted = useRef(true);

  const loadUnreadCount = async () => {
    if (!isMounted.current) return;

    try {
      // Only fetch 1 notification, we just need the total count
      const { total } = await NotificationService.getNotifications({
        status: 'unread',
        limit: 1,
      });
      if (isMounted.current) {
        setUnreadCount(total);
        localStorage.setItem('notification_count', total.toString());
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Error loading unread count:', error);
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  };

  // Load on mount ONCE
  useEffect(() => {
    isMounted.current = true;
    loadUnreadCount();
    // Refresh every 30 seconds
    const interval = setInterval(loadUnreadCount, 30000);
    return () => {
      isMounted.current = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <NotificationContext.Provider value={{ unreadCount, refreshCount: loadUnreadCount, isLoading }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
}
