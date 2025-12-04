type TabValue = 'inventory' | 'analytics' | 'notifications';

interface ProductTabsProps {
  activeTab: TabValue;
  onTabChange: (tab: TabValue) => void;
  unreadCount: number;
}

export default function ProductTabs({ activeTab, onTabChange, unreadCount }: ProductTabsProps) {
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
            <span className="hidden sm:inline">Product </span>Inventory
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

