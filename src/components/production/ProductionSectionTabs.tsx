interface ProductionSectionTabsProps {
  activeSection: 'assigned' | 'all' | 'planned' | 'active' | 'completed' | 'cancelled';
  onSectionChange: (section: 'assigned' | 'all' | 'planned' | 'active' | 'completed' | 'cancelled') => void;
  assignedCount: number;
  allCount: number;
  plannedCount: number;
  activeCount: number;
  completedCount: number;
  cancelledCount: number;
}

export default function ProductionSectionTabs({
  activeSection,
  onSectionChange,
  assignedCount,
  allCount,
  plannedCount,
  activeCount,
  completedCount,
  cancelledCount,
}: ProductionSectionTabsProps) {
  const tabs = [
    { key: 'assigned' as const, label: 'Assigned to Me', count: assignedCount, highlight: true },
    { key: 'all' as const, label: 'All', count: allCount },
    { key: 'planned' as const, label: 'Planned', count: plannedCount },
    { key: 'active' as const, label: 'Active', count: activeCount },
    { key: 'completed' as const, label: 'Completed', count: completedCount },
    { key: 'cancelled' as const, label: 'Cancelled', count: cancelledCount },
  ];

  return (
    <div className="mb-6 w-full">
      <div className="flex items-center gap-2">
        {/* Assigned to Me — visually separated */}
        <button
          onClick={() => onSectionChange('assigned')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg transition-all whitespace-nowrap border ${
            activeSection === 'assigned'
              ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
              : 'bg-white text-blue-600 border-blue-200 hover:bg-blue-50'
          }`}
        >
          Assigned to Me
          <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
            activeSection === 'assigned' ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-700'
          }`}>
            {assignedCount}
          </span>
        </button>

        {/* Divider */}
        <div className="w-px h-6 bg-gray-300 mx-1" />

        {/* Rest of tabs */}
        <div className="flex-1 bg-gray-100 rounded-lg p-1">
          <nav className="flex gap-1" aria-label="Tabs">
            {tabs.slice(1).map(tab => (
              <button
                key={tab.key}
                onClick={() => onSectionChange(tab.key)}
                className={`flex-1 px-4 py-2.5 text-sm font-medium whitespace-nowrap rounded-md transition-all ${
                  activeSection === tab.key
                    ? 'bg-white text-primary-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                {tab.label}
                <span className="ml-2 text-xs text-gray-500">({tab.count})</span>
              </button>
            ))}
          </nav>
        </div>
      </div>
    </div>
  );
}
