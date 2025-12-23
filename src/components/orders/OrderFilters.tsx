import { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CustomerService, type Customer } from '@/services/customerService';

interface OrderFiltersProps {
  filters: {
    search: string;
    status: string;
    customer_id: string;
  };
  onSearchChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onCustomerChange: (value: string) => void;
}

export default function OrderFilters({
  filters,
  onSearchChange,
  onStatusChange,
  onCustomerChange,
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
    <div className="flex flex-col sm:flex-row gap-3 flex-1">
      {/* Search */}
      <div className="flex-1">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search orders..."
            value={filters.search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Status Filter */}
      <Select value={filters.status} onValueChange={onStatusChange}>
        <SelectTrigger className="w-full sm:w-[180px]">
          <SelectValue placeholder="All Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Status</SelectItem>
          <SelectItem value="pending">Pending</SelectItem>
          <SelectItem value="accepted">Accepted</SelectItem>
          <SelectItem value="in_production">In Production</SelectItem>
          <SelectItem value="ready">Ready</SelectItem>
          <SelectItem value="dispatched">Dispatched</SelectItem>
          <SelectItem value="delivered">Delivered</SelectItem>
          <SelectItem value="cancelled">Cancelled</SelectItem>
        </SelectContent>
      </Select>

      {/* Customer Filter */}
      <Select value={filters.customer_id} onValueChange={onCustomerChange}>
        <SelectTrigger className="w-full sm:w-[240px]">
          <SelectValue placeholder="All Customers" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Customers</SelectItem>
          {customers.map((customer) => (
            <SelectItem key={customer.id} value={customer.id}>
              <div className="flex flex-col py-1">
                <div className="font-medium text-gray-900">{customer.name}</div>
                {customer.phone && (
                  <div className="text-xs text-gray-600">Phone: {customer.phone}</div>
                )}
                {customer.email && (
                  <div className="text-xs text-gray-600">Email: {customer.email}</div>
                )}
                {customer.gst_number && (
                  <div className="text-xs text-gray-600">GST: {customer.gst_number}</div>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}


