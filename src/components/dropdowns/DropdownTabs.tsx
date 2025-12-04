type TabType = 'product' | 'material' | 'production';

interface DropdownTabsProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export default function DropdownTabs({ activeTab, onTabChange }: DropdownTabsProps) {
  return (
    <div className="mb-6 w-full">
      <div className="bg-gray-100 rounded-lg p-1 w-full">
        <nav className="flex gap-1 w-full" aria-label="Tabs">
          <button
            onClick={() => onTabChange('product')}
            className={`flex-1 px-4 py-2.5 text-sm font-medium whitespace-nowrap rounded-md transition-all ${
              activeTab === 'product'
                ? 'bg-white text-primary-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <span className="hidden sm:inline">Product </span>Dropdowns
          </button>
          <button
            onClick={() => onTabChange('material')}
            className={`flex-1 px-4 py-2.5 text-sm font-medium whitespace-nowrap rounded-md transition-all ${
              activeTab === 'material'
                ? 'bg-white text-primary-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <span className="hidden sm:inline">Material </span>Dropdowns
          </button>
          <button
            onClick={() => onTabChange('production')}
            className={`flex-1 px-4 py-2.5 text-sm font-medium whitespace-nowrap rounded-md transition-all ${
              activeTab === 'production'
                ? 'bg-white text-primary-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <span className="hidden sm:inline">Production </span>Dropdowns
          </button>
        </nav>
      </div>
    </div>
  );
}

