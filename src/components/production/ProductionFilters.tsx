import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { MultiSelect } from '@/components/ui/multi-select';
import { Search } from 'lucide-react';

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
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              placeholder="Search by batch number, product name..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>
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

