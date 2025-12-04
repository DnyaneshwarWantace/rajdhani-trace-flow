import { Bell, Activity } from 'lucide-react';

interface SectionTabsProps {
  activeTab: 'notifications' | 'logs';
  onTabChange: (tab: 'notifications' | 'logs') => void;
  notificationsCount: number;
  logsCount: number;
  unreadCount: number;
}

export default function SectionTabs({
  activeTab,
  onTabChange,
  notificationsCount,
  logsCount,
  unreadCount,
}: SectionTabsProps) {
  return (
    <div className="mb-6">
      <div className="bg-gray-100 rounded-lg p-1 w-full">
        <nav className="flex gap-1 w-full" aria-label="Tabs">
          <button
            onClick={() => onTabChange('notifications')}
            className={`flex-1 px-4 py-2.5 text-sm font-medium rounded-md transition-all flex items-center justify-center gap-2 ${
              activeTab === 'notifications'
                ? 'bg-white text-primary-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <Bell className="w-4 h-4" />
            Notifications
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 text-xs font-semibold bg-red-100 text-red-700 rounded-full">
                {unreadCount}
              </span>
            )}
            <span className="text-xs text-gray-500">({notificationsCount})</span>
          </button>
          <button
            onClick={() => onTabChange('logs')}
            className={`flex-1 px-4 py-2.5 text-sm font-medium rounded-md transition-all flex items-center justify-center gap-2 ${
              activeTab === 'logs'
                ? 'bg-white text-primary-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <Activity className="w-4 h-4" />
            Activity Logs
            <span className="text-xs text-gray-500">({logsCount})</span>
          </button>
        </nav>
      </div>
    </div>
  );
}

