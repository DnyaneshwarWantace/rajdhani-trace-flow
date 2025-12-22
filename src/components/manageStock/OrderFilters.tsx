import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DebouncedSearchInput } from '@/components/ui/DebouncedSearchInput';
import type { OrderFilters } from '@/types/manageStock';

interface OrderFiltersProps {
  filters: OrderFilters;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: string) => void;
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

        {/* Status Filter */}
        <Select
          value={filters.status || 'all'}
          onValueChange={onStatusChange}
        >
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="ordered">Ordered</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="shipped">Shipped</SelectItem>
            <SelectItem value="in-transit">In Transit</SelectItem>
            <SelectItem value="delivered">Delivered</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

