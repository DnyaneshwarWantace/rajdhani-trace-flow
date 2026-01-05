interface ProductionSectionTabsProps {
  activeSection: 'all' | 'planned' | 'active' | 'completed' | 'cancelled';
  onSectionChange: (section: 'all' | 'planned' | 'active' | 'completed' | 'cancelled') => void;
  allCount: number;
  plannedCount: number;
  activeCount: number;
  completedCount: number;
  cancelledCount: number;
}

export default function ProductionSectionTabs({
  activeSection,
  onSectionChange,
  allCount,
  plannedCount,
  activeCount,
  completedCount,
  cancelledCount,
}: ProductionSectionTabsProps) {
  return (
    <div className="mb-6 w-full">
      <div className="bg-gray-100 rounded-lg p-1 w-full">
        <nav className="flex gap-1 w-full" aria-label="Tabs">
          <button
            onClick={() => onSectionChange('all')}
            className={`flex-1 px-4 py-2.5 text-sm font-medium whitespace-nowrap rounded-md transition-all ${
              activeSection === 'all'
                ? 'bg-white text-primary-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            All
            <span className="ml-2 text-xs text-gray-500">({allCount})</span>
          </button>
          <button
            onClick={() => onSectionChange('planned')}
            className={`flex-1 px-4 py-2.5 text-sm font-medium whitespace-nowrap rounded-md transition-all ${
              activeSection === 'planned'
                ? 'bg-white text-primary-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            Planned
            <span className="ml-2 text-xs text-gray-500">({plannedCount})</span>
          </button>
          <button
            onClick={() => onSectionChange('active')}
            className={`flex-1 px-4 py-2.5 text-sm font-medium whitespace-nowrap rounded-md transition-all ${
              activeSection === 'active'
                ? 'bg-white text-primary-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            Active
            <span className="ml-2 text-xs text-gray-500">({activeCount})</span>
          </button>
          <button
            onClick={() => onSectionChange('completed')}
            className={`flex-1 px-4 py-2.5 text-sm font-medium whitespace-nowrap rounded-md transition-all ${
              activeSection === 'completed'
                ? 'bg-white text-primary-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            Completed
            <span className="ml-2 text-xs text-gray-500">({completedCount})</span>
          </button>
          <button
            onClick={() => onSectionChange('cancelled')}
            className={`flex-1 px-4 py-2.5 text-sm font-medium whitespace-nowrap rounded-md transition-all ${
              activeSection === 'cancelled'
                ? 'bg-white text-primary-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            Cancelled
            <span className="ml-2 text-xs text-gray-500">({cancelledCount})</span>
          </button>
        </nav>
      </div>
    </div>
  );
}


