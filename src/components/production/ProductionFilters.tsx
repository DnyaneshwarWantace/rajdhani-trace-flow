import { Card, CardContent } from '@/components/ui/card';
import { MultiSelect } from '@/components/ui/multi-select';
import { DebouncedSearchInput } from '@/components/ui/DebouncedSearchInput';

interface ProductionFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  priorityFilter: string[];
  onPriorityFilterChange: (values: string[]) => void;
}

export default function ProductionFilters({
  searchTerm,
  onSearchChange,
  priorityFilter,
  onPriorityFilterChange,
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
      </CardContent>
    </Card>
  );
}

