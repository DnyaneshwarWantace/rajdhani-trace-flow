import { Bell, Activity } from 'lucide-react';

type TabValue = 'all' | 'activity_logs';

interface NotificationTabsProps {
  activeTab: TabValue;
  onTabChange: (tab: TabValue) => void;
  allNotificationsCount: number;
  activityLogsCount: number;
  allUnreadCount: number;
  activityUnreadCount: number;
}

export default function NotificationTabs({
  activeTab,
  onTabChange,
  allNotificationsCount,
  activityLogsCount,
  allUnreadCount,
  activityUnreadCount,
}: NotificationTabsProps) {
  return (
    <div className="mb-6 w-full">
      <div className="bg-gray-100 rounded-lg p-1 w-full">
        <nav className="flex gap-1 w-full" aria-label="Tabs">
          <button
            onClick={() => onTabChange('all')}
            className={`flex-1 px-4 py-2.5 text-sm font-medium whitespace-nowrap rounded-md transition-all flex items-center justify-center gap-2 ${
              activeTab === 'all'
                ? 'bg-white text-primary-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <Bell className="w-4 h-4" />
            <span className="hidden sm:inline">All </span>Notifications
            {allUnreadCount > 0 && (
              <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-semibold bg-red-100 text-red-700 rounded-full">
                {allUnreadCount}
              </span>
            )}
            <span className="text-xs text-gray-500 ml-1">({allNotificationsCount})</span>
          </button>
          <button
            onClick={() => onTabChange('activity_logs')}
            className={`flex-1 px-4 py-2.5 text-sm font-medium whitespace-nowrap rounded-md transition-all flex items-center justify-center gap-2 ${
              activeTab === 'activity_logs'
                ? 'bg-white text-primary-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <Activity className="w-4 h-4" />
            Activity Logs
            {activityUnreadCount > 0 && (
              <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-semibold bg-red-100 text-red-700 rounded-full">
                {activityUnreadCount}
              </span>
            )}
            <span className="text-xs text-gray-500 ml-1">({activityLogsCount})</span>
          </button>
        </nav>
      </div>
    </div>
  );
}

