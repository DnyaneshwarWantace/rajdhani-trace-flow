import { Card, CardContent } from '@/components/ui/card';
import { MultiSelect } from '@/components/ui/multi-select';
import { DebouncedSearchInput } from '@/components/ui/DebouncedSearchInput';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ProductionFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  priorityFilter: string[];
  onPriorityFilterChange: (values: string[]) => void;
  sortBy?: 'start_date' | 'batch_number' | 'product_name' | 'priority' | 'completion_date';
  sortOrder?: 'asc' | 'desc';
  onSortChange?: (sortBy: 'start_date' | 'batch_number' | 'product_name' | 'priority' | 'completion_date', sortOrder: 'asc' | 'desc') => void;
}

export default function ProductionFilters({
  searchTerm,
  onSearchChange,
  priorityFilter,
  onPriorityFilterChange,
  sortBy = 'start_date',
  sortOrder = 'desc',
  onSortChange,
}: ProductionFiltersProps) {
  return (
    <Card className="mb-6">
      <CardContent className="p-4">
        <div className="flex flex-col lg:flex-row gap-3">
          <DebouncedSearchInput
            value={searchTerm}
            onChange={onSearchChange}
            placeholder="Search by batch number, product name (min 3 characters)..."
            minCharacters={3}
            debounceMs={500}
            className="flex-1"
            showCounter={true}
          />
          <div className="w-full lg:w-48">
            <MultiSelect
              options={[
                { label: 'Low', value: 'low' },
                { label: 'Medium', value: 'medium' },
                { label: 'High', value: 'high' },
                { label: 'Urgent', value: 'urgent' },
              ]}
              selected={priorityFilter}
              onChange={onPriorityFilterChange}
              placeholder="All Priority"
            />
          </div>
        </div>

        {/* Sorting Controls */}
        {onSortChange && (
          <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-200">
            <span className="text-sm font-medium text-gray-700 whitespace-nowrap">Sort by:</span>
            <Select
              value={sortBy}
              onValueChange={(value) => onSortChange(value as 'start_date' | 'batch_number' | 'product_name' | 'priority' | 'completion_date', sortOrder)}
            >
              <SelectTrigger className="w-[180px] h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="start_date">Start Date</SelectItem>
                <SelectItem value="batch_number">Batch Number</SelectItem>
                <SelectItem value="product_name">Product Name</SelectItem>
                <SelectItem value="priority">Priority</SelectItem>
                <SelectItem value="completion_date">Completion Date</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={sortOrder}
              onValueChange={(value: 'asc' | 'desc') => onSortChange(sortBy, value)}
            >
              <SelectTrigger className="w-[130px] h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="asc">Ascending</SelectItem>
                <SelectItem value="desc">Descending</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

