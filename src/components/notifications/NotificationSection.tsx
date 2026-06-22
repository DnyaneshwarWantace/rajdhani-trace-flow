import { useState } from 'react';
import { ChevronDown, ChevronUp, ShoppingCart, Factory, AlertTriangle, Activity, Bell } from 'lucide-react';
import type { NotificationSection } from '@/utils/notificationCategories';
import type { Notification } from '@/services/notificationService';
import ActivityNotificationCard from './ActivityNotificationCard';

interface NotificationSectionProps {
  section: NotificationSection;
  onNotificationClick: (notification: Notification) => void;
  compact?: boolean; // For dropdown view
  expandedId?: string | null;
  onExpand?: (id: string | null) => void;
  onMarkAsRead?: (id: string) => Promise<void>;
  selectable?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
}

export default function NotificationSectionComponent({
  section,
  onNotificationClick,
  compact = false,
  expandedId,
  onExpand,
  onMarkAsRead,
  selectable = false,
  selectedIds,
  onToggleSelect,
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
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 rounded-2xl transition-colors active:bg-gray-100"
      >
        <div className="flex items-center gap-2">
          {getSectionIcon()}
          <h4 className="text-sm font-bold text-gray-800">{section.title}</h4>
          {section.unreadCount > 0 && (
            <span className="px-1.5 py-0.5 text-[9px] font-extrabold bg-red-500 text-white rounded-full min-w-[18px] text-center">
              {section.unreadCount}
            </span>
          )}
          <span className="text-[11px] text-gray-400 font-medium">({section.notifications.length})</span>
        </div>
        {isExpanded
          ? <ChevronUp className="w-4 h-4 text-gray-400" />
          : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>

      {/* Section Notifications */}
      {isExpanded && (
        <div className={`mt-2 ${compact ? 'space-y-1' : 'space-y-2.5'}`}>
          {section.notifications.map((notification) => (
            <div key={notification.id} id={`notification-${notification.id}`}>
              <ActivityNotificationCard
                notification={notification}
                onClick={() => onNotificationClick(notification)}
                expandedId={expandedId}
                onExpand={onExpand}
                onMarkAsRead={onMarkAsRead}
                selectable={selectable}
                selected={selectedIds?.has(notification.id)}
                onToggleSelect={onToggleSelect}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

