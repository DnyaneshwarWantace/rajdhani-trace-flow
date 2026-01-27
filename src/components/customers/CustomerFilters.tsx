import { Card, CardContent } from '@/components/ui/card';
import { MultiSelect } from '@/components/ui/multi-select';
import { DebouncedSearchInput } from '@/components/ui/DebouncedSearchInput';

interface CustomerFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  typeFilter: string[];
  onTypeFilterChange: (values: string[]) => void;
}

export default function CustomerFilters({
  searchTerm,
  onSearchChange,
  typeFilter,
  onTypeFilterChange,
}: CustomerFiltersProps) {
  return (
    <Card className="mb-6">
      <CardContent className="p-4">
        <div className="flex flex-col lg:flex-row gap-3">
          <DebouncedSearchInput
            value={searchTerm}
            onChange={onSearchChange}
            placeholder="Search customers (min 3 characters)..."
            minCharacters={3}
            debounceMs={500}
            className="flex-1"
            showCounter={true}
          />
          <div className="w-full lg:w-64">
            <MultiSelect
              options={[
                { label: 'Individual', value: 'individual' },
                { label: 'Business', value: 'business' },
              ]}
              selected={typeFilter}
              onChange={onTypeFilterChange}
              placeholder="All Types"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

