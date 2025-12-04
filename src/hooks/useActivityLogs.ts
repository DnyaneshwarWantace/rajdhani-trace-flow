import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import SocketService, { type ActivityLog } from '@/services/socketService';
import { convertActivityLogToNotification } from '@/services/activityLogNotificationService';
import { useToast } from '@/hooks/use-toast';

export const useActivityLogs = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const socketServiceRef = useRef<SocketService | null>(null);

  useEffect(() => {
    if (!user?.email || !user?.role) {
      return;
    }

    // Get Socket.IO service instance
    const socketService = SocketService.getInstance();
    socketServiceRef.current = socketService;

    // Connect to Socket.IO
    socketService.connect(user.email, user.role);

    // Listen for new activity logs
    const handleNewActivity = async (activityLog: ActivityLog) => {
      try {
        console.log('📨 Received activity log:', activityLog);
        
        // Convert activity log to notification
        const notification = await convertActivityLogToNotification(activityLog);
        
        if (notification) {
          console.log('✅ Created notification from activity log:', notification);
          
          // Show toast for important actions
          if (
            activityLog.action.includes('CREATE') ||
            activityLog.action.includes('DELETE') ||
            activityLog.action.includes('STATUS_CHANGE') ||
            activityLog.status_code >= 400
          ) {
            toast({
              title: notification.title,
              description: notification.message,
              variant: activityLog.status_code >= 400 ? 'destructive' : 'default',
            });
          }
        } else {
          console.log('⚠️ Activity log was skipped (no notification created):', activityLog.action);
        }
      } catch (error) {
        console.error('❌ Error handling activity log:', error, activityLog);
      }
    };

    socketService.on('new-activity', handleNewActivity);

    // Cleanup on unmount
    return () => {
      socketService.off('new-activity', handleNewActivity);
      // Only disconnect if socket is actually connected
      // In React strict mode, effects run twice, so we need to be careful
      if (socketService.isConnected()) {
        socketService.disconnect();
      }
    };
  }, [user?.email, user?.role, toast]);

  return {
    isConnected: socketServiceRef.current?.isConnected() || false,
  };
};

