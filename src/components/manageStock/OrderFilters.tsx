import { MultiSelect } from '@/components/ui/multi-select';
import { DebouncedSearchInput } from '@/components/ui/DebouncedSearchInput';
import type { OrderFilters } from '@/types/manageStock';

interface OrderFiltersProps {
  filters: OrderFilters;
  onSearchChange: (value: string) => void;
  onStatusChange: (values: string[]) => void;
}

export default function OrderFilters({
  filters,
  onSearchChange,
  onStatusChange,
}: OrderFiltersProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <DebouncedSearchInput
          value={filters.search}
          onChange={onSearchChange}
          placeholder="Search materials or suppliers (min 3 characters)..."
          minCharacters={3}
          debounceMs={500}
          className="flex-1"
          showCounter={true}
        />

        {/* Status Filter - Multi-select */}
        <div className="w-full sm:w-64 flex-shrink-0">
          <MultiSelect
            options={[
              { label: 'Pending', value: 'pending' },
              { label: 'Approved', value: 'approved' },
              { label: 'Shipped', value: 'shipped' },
              { label: 'Delivered', value: 'delivered' },
            ]}
            selected={Array.isArray(filters.status) ? filters.status : filters.status === 'all' ? [] : [filters.status]}
            onChange={onStatusChange}
            placeholder="All Status"
          />
        </div>
      </div>
    </div>
  );
}

