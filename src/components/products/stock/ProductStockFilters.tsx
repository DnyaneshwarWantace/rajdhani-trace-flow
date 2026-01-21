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
  startDate: string;
  endDate: string;
  sortBy: 'qr_code' | 'status' | 'created_at';
  sortOrder: 'asc' | 'desc';
  onSearchChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onSortChange: (sortBy: 'qr_code' | 'status' | 'created_at', sortOrder: 'asc' | 'desc') => void;
}

export default function ProductStockFilters({
  searchTerm,
  statusFilter,
  startDate,
  endDate,
  sortBy,
  sortOrder,
  onSearchChange,
  onStatusChange,
  onStartDateChange,
  onEndDateChange,
  onSortChange,
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

        {/* Sorting Controls */}
        <div className="flex items-center gap-3 pt-3 border-t border-gray-200">
          <span className="text-sm font-medium text-gray-700 whitespace-nowrap">Sort by:</span>
          <Select
            value={sortBy}
            onValueChange={(value) => onSortChange(value as 'qr_code' | 'status' | 'created_at', sortOrder)}
          >
            <SelectTrigger className="w-[160px] h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="created_at">Recently Added</SelectItem>
              <SelectItem value="qr_code">QR Code</SelectItem>
              <SelectItem value="status">Status</SelectItem>
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
      </div>
    </div>
  );
}

