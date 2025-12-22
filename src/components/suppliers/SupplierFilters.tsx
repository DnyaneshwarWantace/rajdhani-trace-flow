import { Card, CardContent } from '@/components/ui/card';
import { DebouncedSearchInput } from '@/components/ui/DebouncedSearchInput';

interface SupplierFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
}

export default function SupplierFilters({
  searchTerm,
  onSearchChange,
}: SupplierFiltersProps) {
  return (
    <Card className="mb-6">
      <CardContent className="p-4">
        <div className="flex flex-col lg:flex-row gap-3">
          <DebouncedSearchInput
            value={searchTerm}
            onChange={onSearchChange}
            placeholder="Search suppliers (min 3 characters)..."
            minCharacters={3}
            debounceMs={500}
            className="flex-1"
            showCounter={true}
          />
        </div>
      </CardContent>
    </Card>
  );
}

