import { Factory, Package, ShoppingCart, Users, Building2, ChefHat, Activity } from 'lucide-react';

interface ActivityLogTabsProps {
  activeCategory: string;
  onCategoryChange: (category: string) => void;
  categoryCounts: Record<string, number>;
}

export default function ActivityLogTabs({
  activeCategory,
  onCategoryChange,
  categoryCounts,
}: ActivityLogTabsProps) {
  const categories = [
    { id: 'all', label: 'All Logs', icon: Activity },
    { id: 'material', label: 'Material', icon: Factory },
    { id: 'product', label: 'Product', icon: Package },
    { id: 'order', label: 'Order', icon: ShoppingCart },
    { id: 'customer', label: 'Customer', icon: Users },
    { id: 'supplier', label: 'Supplier', icon: Building2 },
    { id: 'production', label: 'Production', icon: ChefHat },
  ];

  return (
    <div className="mb-6 w-full">
      <div className="bg-gray-100 rounded-lg p-1 w-full">
        <nav className="flex gap-1 w-full flex-wrap" aria-label="Activity Log Categories">
          {categories.map((category) => {
            const Icon = category.icon;
            const count = categoryCounts[category.id] || 0;
            const isActive = activeCategory === category.id;
            
            return (
              <button
                key={category.id}
                onClick={() => onCategoryChange(category.id)}
                className={`flex-1 min-w-[120px] px-3 py-2.5 text-sm font-medium whitespace-nowrap rounded-md transition-all flex items-center justify-center gap-2 ${
                  isActive
                    ? 'bg-white text-primary-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{category.label}</span>
                <span className="sm:hidden">{category.label.split(' ')[0]}</span>
                {count > 0 && (
                  <span className={`px-1.5 py-0.5 text-xs rounded-full ${
                    isActive 
                      ? 'bg-primary-100 text-primary-700' 
                      : 'bg-gray-200 text-gray-700'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

