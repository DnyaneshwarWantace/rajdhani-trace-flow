import { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MultiSelect } from '@/components/ui/multi-select';
import { CustomerService, type Customer } from '@/services/customerService';

interface OrderFiltersProps {
  filters: {
    search: string;
    status: string[];
    customer_id: string[];
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  };
  onSearchChange: (value: string) => void;
  onStatusChange: (values: string[]) => void;
  onCustomerChange: (values: string[]) => void;
  onSortChange?: (sortBy: string, sortOrder: 'asc' | 'desc') => void;
}

export default function OrderFilters({
  filters,
  onSearchChange,
  onStatusChange,
  onCustomerChange,
  onSortChange,
}: OrderFiltersProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    const { data } = await CustomerService.getCustomers();
    if (data) {
      setCustomers(data);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
      {/* Search - Flexible, takes remaining space */}
      <div className="flex-1 w-full sm:w-auto min-w-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search orders..."
            value={filters.search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 h-9 text-sm"
          />
        </div>
      </div>

      {/* Status Filter - Multi-select */}
      <div className="w-full sm:w-64 flex-shrink-0">
        <MultiSelect
          options={[
            { label: 'Pending', value: 'pending' },
            { label: 'Accepted', value: 'accepted' },
            { label: 'Dispatched', value: 'dispatched' },
            { label: 'Delivered', value: 'delivered' },
            { label: 'Cancelled', value: 'cancelled' },
          ]}
          selected={filters.status}
          onChange={onStatusChange}
          placeholder="All Status"
        />
      </div>

      {/* Customer Filter - Multi-select */}
      <div className="w-full sm:w-64 flex-shrink-0">
        <MultiSelect
          options={customers.map((customer) => ({
            label: customer.name,
            value: customer.id,
          }))}
          selected={filters.customer_id}
          onChange={onCustomerChange}
          placeholder="All Customers"
        />
      </div>

      {/* Sorting Controls - Fixed width */}
      {onSortChange && (
        <div className="flex items-center gap-2 w-full sm:w-auto flex-shrink-0">
          <span className="text-sm font-medium text-gray-700 whitespace-nowrap hidden sm:inline">Sort:</span>
          <Select
            value={filters.sortBy || 'order_date'}
            onValueChange={(value) => onSortChange!(value, filters.sortOrder || 'desc')}
          >
            <SelectTrigger className="w-full sm:w-[170px] h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="order_date">Order Date</SelectItem>
              <SelectItem value="order_number">Order Number</SelectItem>
              <SelectItem value="customer_name">Customer Name</SelectItem>
              <SelectItem value="total_amount">Total Amount</SelectItem>
              <SelectItem value="expected_delivery">Expected Delivery</SelectItem>
              <SelectItem value="status">Status</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={filters.sortOrder || 'desc'}
            onValueChange={(value: 'asc' | 'desc') => onSortChange!(filters.sortBy || 'order_date', value)}
          >
            <SelectTrigger className="w-full sm:w-[140px] h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="asc">Ascending</SelectItem>
              <SelectItem value="desc">Descending</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}


