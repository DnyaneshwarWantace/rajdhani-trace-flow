import { Card, CardContent } from '@/components/ui/card';
import { Bell, Activity } from 'lucide-react';
import type { Notification } from '@/services/notificationService';
import ActivityNotificationCard from '@/components/notifications/ActivityNotificationCard';
import NotificationSectionComponent from '@/components/notifications/NotificationSection';
import { categorizeNotifications } from '@/utils/notificationCategories';

interface SectionContentProps {
  activeTab: 'notifications' | 'logs';
  notifications: Notification[];
  activityLogs: Notification[];
  loading: boolean;
  onNotificationClick: (notification: Notification) => void;
}

export default function SectionContent({
  activeTab,
  notifications,
  activityLogs,
  loading,
  onNotificationClick,
}: SectionContentProps) {
  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full mx-auto"></div>
          <p className="text-gray-600 mt-4">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  if (activeTab === 'notifications') {
    if (notifications.length === 0) {
      return (
        <Card>
          <CardContent className="p-8 text-center">
            <Bell className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 text-lg">No notifications found</p>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="space-y-6">
        {categorizeNotifications(notifications).map((section) => (
          <Card key={section.category} className="overflow-hidden">
            <CardContent className="p-0">
              <NotificationSectionComponent
                section={section}
                onNotificationClick={onNotificationClick}
                compact={false}
              />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Activity Logs Tab
  if (activityLogs.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Activity className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600 text-lg">No activity logs found</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {activityLogs.map((notification) => (
        <ActivityNotificationCard
          key={notification.id}
          notification={notification}
          onClick={() => onNotificationClick(notification)}
        />
      ))}
    </div>
  );
}

