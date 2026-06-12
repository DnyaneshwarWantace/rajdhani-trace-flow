import { Package, User, Trash2, Bell } from 'lucide-react';

type TabValue = 'inventory' | 'assigned-tasks' | 'waste-recovery' | 'analytics' | 'notifications';

interface MaterialTabsProps {
  activeTab: TabValue;
  onTabChange: (tab: TabValue) => void;
  unreadCount: number;
  wasteCount: number;
  assignedTaskCount?: number;
  categoryFilter?: string;
}

export default function MaterialTabs({ activeTab, onTabChange, unreadCount, wasteCount, assignedTaskCount = 0, categoryFilter }: MaterialTabsProps) {
  let tabs: { id: TabValue; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'inventory', label: 'Materials', icon: <Package className="w-4 h-4" /> },
    { id: 'assigned-tasks', label: 'Assigned', icon: <User className="w-4 h-4" />, badge: assignedTaskCount },
    { id: 'waste-recovery', label: 'Wastage', icon: <Trash2 className="w-4 h-4" />, badge: wasteCount },
    { id: 'notifications', label: 'Alerts', icon: <Bell className="w-4 h-4" />, badge: unreadCount },
  ];

  if (categoryFilter === 'Ink') {
    tabs = [
      { id: 'inventory', label: 'Inks', icon: <Package className="w-4 h-4" /> },
      { id: 'notifications', label: 'Alerts', icon: <Bell className="w-4 h-4" />, badge: unreadCount },
    ];
  }

  let desktopTabs = [
    { id: 'inventory' as TabValue, label: 'Material Inventory' },
    { id: 'assigned-tasks' as TabValue, label: 'Assigned to Me', badge: assignedTaskCount, badgeColor: 'bg-indigo-100 text-indigo-700' },
    { id: 'waste-recovery' as TabValue, label: 'Waste Recovery', badge: wasteCount, badgeColor: 'bg-orange-100 text-orange-700' },
    { id: 'analytics' as TabValue, label: 'Analytics' },
    { id: 'notifications' as TabValue, label: 'Notifications', badge: unreadCount, badgeColor: 'bg-red-100 text-red-700' },
  ];

  if (categoryFilter === 'Ink') {
    desktopTabs = [
      { id: 'inventory' as TabValue, label: 'Ink Inventory' },
      { id: 'notifications' as TabValue, label: 'Notifications / Alerts', badge: unreadCount, badgeColor: 'bg-red-100 text-red-700' },
    ];
  }

  return (
    <div className="mb-4 lg:mb-6 w-full">
      {/* Mobile: equal-width tabs, no scroll — matches RN app */}
      <div className="lg:hidden flex">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className="flex-1 flex flex-col items-center justify-center gap-1 py-2 relative"
            >
              <span style={{ color: isActive ? '#2563eb' : '#9ca3af' }}>
                {tab.icon}
              </span>
              <span
                className="text-[10px] font-semibold"
                style={{ color: isActive ? '#2563eb' : '#9ca3af' }}
              >
                {tab.label}
              </span>
              {isActive && (
                <span className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full" style={{ backgroundColor: '#2563eb' }} />
              )}
              {tab.badge != null && tab.badge > 0 && (
                <span className="absolute top-1 right-3 w-4 h-4 text-[9px] font-bold bg-red-500 text-white rounded-full flex items-center justify-center">
                  {tab.badge > 9 ? '9+' : tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Desktop: pill tab bar */}
      <div className="hidden lg:block bg-gray-100 rounded-lg p-1 w-full">
        <nav className="flex gap-1 w-full" aria-label="Tabs">
          {desktopTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex-1 px-4 py-2.5 text-sm font-medium whitespace-nowrap rounded-md transition-all flex items-center justify-center gap-2 ${
                activeTab === tab.id
                  ? 'bg-white text-primary-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              {tab.label}
              {tab.badge != null && tab.badge > 0 && (
                <span className={`inline-flex items-center justify-center px-2 py-0.5 text-xs font-semibold rounded-full ${tab.badgeColor}`}>
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}
