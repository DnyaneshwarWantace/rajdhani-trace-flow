import { LayoutGrid, BarChart2, Bell, Trash2 } from 'lucide-react';

type TabValue = 'inventory' | 'analytics' | 'notifications' | 'wastage';

interface ProductTabsProps {
  activeTab: TabValue;
  onTabChange: (tab: TabValue) => void;
  unreadCount: number;
}

export default function ProductTabs({ activeTab, onTabChange, unreadCount }: ProductTabsProps) {
  const mobileTabs: { value: TabValue; label: string; icon: React.ReactNode }[] = [
    { value: 'inventory',     label: 'Inventory', icon: <LayoutGrid className="w-4 h-4" /> },
    { value: 'notifications', label: 'Alerts',    icon: <Bell className="w-4 h-4" /> },
    { value: 'wastage',       label: 'Wastage',   icon: <Trash2 className="w-4 h-4" /> },
  ];

  const tabs: { value: TabValue; label: string; mobileLabel: string; icon: React.ReactNode }[] = [
    { value: 'inventory',      label: 'Product Inventory', mobileLabel: 'Inventory',  icon: <LayoutGrid className="w-4 h-4" /> },
    { value: 'analytics',      label: 'Analytics',         mobileLabel: 'Analytics',  icon: <BarChart2 className="w-4 h-4" /> },
    { value: 'notifications',  label: 'Notifications',     mobileLabel: 'Alerts',     icon: <Bell className="w-4 h-4" /> },
    { value: 'wastage',        label: 'Wastage',           mobileLabel: 'Wastage',    icon: <Trash2 className="w-4 h-4" /> },
  ];

  return (
    <div className="mb-4 w-full">
      {/* Mobile tabs — 3 tabs, no Analytics */}
      <div className="lg:hidden flex border-b border-gray-200 bg-white">
        {mobileTabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => onTabChange(tab.value)}
            className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium transition-colors relative ${
              activeTab === tab.value ? 'text-blue-600' : 'text-gray-400'
            }`}
          >
            {tab.icon}
            <span className="flex items-center gap-1">
              {tab.label}
              {tab.value === 'notifications' && unreadCount > 0 && (
                <span className="inline-flex items-center justify-center w-4 h-4 text-[9px] font-bold bg-red-500 text-white rounded-full">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </span>
            {activeTab === tab.value && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* Desktop tabs */}
      <div className="hidden lg:block bg-gray-100 rounded-lg p-1 w-full">
        <nav className="flex gap-1 w-full">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => onTabChange(tab.value)}
              className={`flex-1 px-4 py-2.5 text-sm font-medium whitespace-nowrap rounded-md transition-all flex items-center justify-center gap-2 ${
                activeTab === tab.value
                  ? 'bg-white text-primary-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              {tab.label}
              {tab.value === 'notifications' && unreadCount > 0 && (
                <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-semibold bg-red-100 text-red-700 rounded-full">
                  {unreadCount}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}
