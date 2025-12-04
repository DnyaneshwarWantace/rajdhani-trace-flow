import { useState } from 'react';
import { ChevronDown, ChevronUp, Factory, ShoppingCart, Package, ChefHat, User, Activity } from 'lucide-react';
import type { ActivityLogSection } from '@/utils/activityLogCategories';
import type { Notification } from '@/services/notificationService';
import ActivityNotificationCard from './ActivityNotificationCard';

interface ActivityLogSectionProps {
  section: ActivityLogSection;
  onNotificationClick: (notification: Notification) => void;
  getNotificationIcon: (type: string, module: string) => React.ReactNode;
}

export default function ActivityLogSectionComponent({
  section,
  onNotificationClick,
  getNotificationIcon: _getNotificationIcon,
}: ActivityLogSectionProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const getSectionIcon = () => {
    switch (section.category) {
      case 'material':
        return <Factory className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" />;
      case 'product':
        return <Package className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />;
      case 'order':
        return <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />;
      case 'customer':
        return <User className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />;
      case 'supplier':
        return <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600" />;
      case 'production':
        return <ChefHat className="w-4 h-4 sm:w-5 sm:h-5 text-teal-600" />;
      default:
        return <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />;
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
        <div className="mt-2 space-y-3">
          {section.notifications.map((notification) => (
            <ActivityNotificationCard
              key={notification.id}
              notification={notification}
              onClick={() => onNotificationClick(notification)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

