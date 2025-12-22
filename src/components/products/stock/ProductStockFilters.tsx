import { Calendar } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DebouncedSearchInput } from '@/components/ui/DebouncedSearchInput';

interface ProductStockFiltersProps {
  searchTerm: string;
  statusFilter: string;
  qualityFilter: string;
  startDate: string;
  endDate: string;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onQualityChange: (value: string) => void;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
}

export default function ProductStockFilters({
  searchTerm,
  statusFilter,
  qualityFilter,
  startDate,
  endDate,
  onSearchChange,
  onStatusChange,
  onQualityChange,
  onStartDateChange,
  onEndDateChange,
}: ProductStockFiltersProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="space-y-4">
        {/* First Row: Search and Filters */}
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <DebouncedSearchInput
            value={searchTerm}
            onChange={onSearchChange}
            placeholder="Search by QR code, ID, or inspector (min 3 characters)..."
            minCharacters={3}
            debounceMs={500}
            className="flex-1"
            showCounter={true}
          />

          {/* Status Filter */}
          <Select value={statusFilter} onValueChange={onStatusChange}>
            <SelectTrigger className="w-full lg:w-48">
              <SelectValue placeholder="Filter by Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="available">Available</SelectItem>
              <SelectItem value="sold">Sold</SelectItem>
              <SelectItem value="damaged">Damaged</SelectItem>
              <SelectItem value="returned">Returned</SelectItem>
            </SelectContent>
          </Select>

          {/* Quality Filter */}
          <Select value={qualityFilter} onValueChange={onQualityChange}>
            <SelectTrigger className="w-full lg:w-48">
              <SelectValue placeholder="Filter by Quality" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Quality</SelectItem>
              <SelectItem value="A+">A+ Grade</SelectItem>
              <SelectItem value="A">A Grade</SelectItem>
              <SelectItem value="B">B Grade</SelectItem>
              <SelectItem value="C">C Grade</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Second Row: Date Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Calendar className="w-5 h-5 text-gray-400" />
            </div>
            <Input
              type="date"
              placeholder="Start Date"
              value={startDate}
              onChange={(e) => onStartDateChange(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Calendar className="w-5 h-5 text-gray-400" />
            </div>
            <Input
              type="date"
              placeholder="End Date"
              value={endDate}
              onChange={(e) => onEndDateChange(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

