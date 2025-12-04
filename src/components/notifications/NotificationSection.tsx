import { useState } from 'react';
import { ChevronDown, ChevronUp, ShoppingCart, Factory, AlertTriangle, Activity, Bell } from 'lucide-react';
import type { NotificationSection } from '@/utils/notificationCategories';
import type { Notification } from '@/services/notificationService';

interface NotificationSectionProps {
  section: NotificationSection;
  onNotificationClick: (notification: Notification) => void;
  getNotificationIcon: (type: string, module: string) => React.ReactNode;
  getNotificationBgColor: (type: string, priority: string) => string;
  formatDate: (date: string) => string;
  compact?: boolean; // For dropdown view
}

export default function NotificationSectionComponent({
  section,
  onNotificationClick,
  getNotificationIcon,
  getNotificationBgColor,
  formatDate,
  compact = false,
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
        <div className={`mt-2 ${compact ? 'space-y-0.5' : 'space-y-2'}`}>
          {section.notifications.map((notification) => (
            <button
              key={notification.id}
              onClick={() => onNotificationClick(notification)}
              className={`w-full text-left p-2 sm:p-3 hover:bg-gray-50 transition-colors border-l-4 rounded-r-lg ${
                notification.status === 'unread'
                  ? getNotificationBgColor(notification.type, notification.priority)
                  : 'bg-white border-transparent'
              }`}
            >
              <div className="flex items-start gap-2 sm:gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  {getNotificationIcon(notification.type, notification.module)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs sm:text-sm font-medium ${
                        notification.status === 'unread' ? 'text-gray-900' : 'text-gray-700'
                      }`}>
                        {notification.title}
                      </p>
                      <p className={`text-xs text-gray-600 mt-1 ${compact ? 'line-clamp-1' : 'line-clamp-2'}`}>
                        {notification.message}
                      </p>
                      {!compact && (
                        <div className="flex items-center gap-1.5 sm:gap-2 mt-2 flex-wrap">
                          <span className="text-xs text-gray-400 capitalize">
                            {notification.module}
                          </span>
                          <span className="text-xs text-gray-300">•</span>
                          <span className="text-xs text-gray-400">
                            {formatDate(notification.created_at)}
                          </span>
                          {notification.priority === 'urgent' && (
                            <>
                              <span className="text-xs text-gray-300">•</span>
                              <span className="text-xs font-medium text-red-600">Urgent</span>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                    {notification.status === 'unread' && (
                      <div className="w-2 h-2 bg-primary-600 rounded-full flex-shrink-0 mt-1"></div>
                    )}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

