import { useState } from 'react';
import { ChevronDown, ChevronUp, ShoppingCart, Factory, AlertTriangle, Activity, Bell } from 'lucide-react';
import type { NotificationSection } from '@/utils/notificationCategories';
import type { Notification } from '@/services/notificationService';
import ActivityNotificationCard from './ActivityNotificationCard';

interface NotificationSectionProps {
  section: NotificationSection;
  onNotificationClick: (notification: Notification) => void;
  getNotificationIcon: (type: string, module: string) => React.ReactNode;
  getNotificationBgColor: (type: string, priority: string) => string;
  formatDate: (date: string) => string;
  compact?: boolean; // For dropdown view
  expandedId?: string | null;
  onExpand?: (id: string | null) => void;
  onMarkAsRead?: (id: string) => Promise<void>;
}

export default function NotificationSectionComponent({
  section,
  onNotificationClick,
  getNotificationIcon,
  getNotificationBgColor,
  formatDate,
  compact = false,
  expandedId,
  onExpand,
  onMarkAsRead,
}: NotificationSectionProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const getSectionIcon = () => {
    switch (section.category) {
      case 'orders':
        return <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />;
      case 'production':
        return <Factory className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" />;
      case 'stock':
        return <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600" />;
      case 'activity_logs':
        return <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />;
      default:
        return <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />;
    }
  };

  if (section.notifications.length === 0) {
    return null;
  }

  return (
    <div className="mb-4 last:mb-0">
      {/* Section Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
      >
        <div className="flex items-center gap-2 sm:gap-3">
          {getSectionIcon()}
          <h4 className="text-sm sm:text-base font-semibold text-gray-900">
            {section.title}
          </h4>
          {section.unreadCount > 0 && (
            <span className="px-2 py-0.5 text-xs font-medium bg-red-500 text-white rounded-full">
              {section.unreadCount}
            </span>
          )}
          <span className="text-xs text-gray-500">
            ({section.notifications.length})
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-gray-500" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-500" />
        )}
      </button>

      {/* Section Notifications */}
      {isExpanded && (
        <div className={`mt-2 ${compact ? 'space-y-0.5' : 'space-y-3'}`}>
          {section.notifications.map((notification) => (
            <div key={notification.id} id={`notification-${notification.id}`}>
              <ActivityNotificationCard
                notification={notification}
                onClick={() => onNotificationClick(notification)}
                expandedId={expandedId}
                onExpand={onExpand}
                onMarkAsRead={onMarkAsRead}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

