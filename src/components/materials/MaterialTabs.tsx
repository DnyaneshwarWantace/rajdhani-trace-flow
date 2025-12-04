type TabValue = 'inventory' | 'waste-recovery' | 'analytics' | 'notifications';

interface MaterialTabsProps {
  activeTab: TabValue;
  onTabChange: (tab: TabValue) => void;
  unreadCount: number;
  wasteCount: number;
}

export default function MaterialTabs({ activeTab, onTabChange, unreadCount, wasteCount }: MaterialTabsProps) {
  return (
    <div className="mb-6 w-full">
      <div className="bg-gray-100 rounded-lg p-1 w-full">
        <nav className="flex gap-1 w-full" aria-label="Tabs">
          <button
            onClick={() => onTabChange('inventory')}
            className={`flex-1 px-4 py-2.5 text-sm font-medium whitespace-nowrap rounded-md transition-all ${
              activeTab === 'inventory'
                ? 'bg-white text-primary-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <span className="hidden sm:inline">Material </span>Inventory
          </button>
          <button
            onClick={() => onTabChange('waste-recovery')}
            className={`flex-1 px-4 py-2.5 text-sm font-medium whitespace-nowrap rounded-md transition-all flex items-center justify-center gap-2 ${
              activeTab === 'waste-recovery'
                ? 'bg-white text-primary-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <span className="hidden sm:inline">Waste Recovery</span>
            <span className="sm:hidden">Waste</span>
            {wasteCount > 0 && (
              <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-semibold bg-orange-100 text-orange-700 rounded-full">
                {wasteCount}
              </span>
            )}
          </button>
          <button
            onClick={() => onTabChange('analytics')}
            className={`flex-1 px-4 py-2.5 text-sm font-medium whitespace-nowrap rounded-md transition-all ${
              activeTab === 'analytics'
                ? 'bg-white text-primary-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            Analytics
          </button>
          <button
            onClick={() => onTabChange('notifications')}
            className={`flex-1 px-4 py-2.5 text-sm font-medium whitespace-nowrap rounded-md transition-all flex items-center justify-center gap-2 ${
              activeTab === 'notifications'
                ? 'bg-white text-primary-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <span className="hidden sm:inline">Notifications</span>
            <span className="sm:hidden">Alerts</span>
            {unreadCount > 0 && (
              <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-semibold bg-red-100 text-red-700 rounded-full">
                {unreadCount}
              </span>
            )}
          </button>
        </nav>
      </div>
    </div>
  );
}

