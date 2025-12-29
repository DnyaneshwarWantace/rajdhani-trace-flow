import { useState } from 'react';
import { Search, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Customer } from '@/services/customerService';

interface CustomerSelectionProps {
  customers: Customer[];
  selectedCustomer: Customer | null;
  onSelectCustomer: (customer: Customer) => void;
  onShowNewCustomerForm?: () => void;
  showToggleButtons?: boolean;
}

export default function CustomerSelection({
  customers,
  selectedCustomer,
  onSelectCustomer,
  onShowNewCustomerForm,
  showToggleButtons = true,
}: CustomerSelectionProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredCustomers = customers.filter(customer => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      customer.name?.toLowerCase().includes(search) ||
      customer.email?.toLowerCase().includes(search) ||
      customer.phone?.toLowerCase().includes(search)
    );
  });

  const content = (
    <div className="space-y-4">
      {showToggleButtons && (
        <div className="flex gap-4">
          <Button variant="default" className="flex-1" disabled>
            Select Existing Customer
          </Button>
          <Button variant="outline" onClick={onShowNewCustomerForm} className="flex-1">
            <UserPlus className="w-4 h-4 mr-2" />
            Add New Customer
          </Button>
        </div>
      )}

      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search customers..."
            className="pl-10"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="grid gap-2 max-h-64 overflow-y-auto">
          {filteredCustomers.map(customer => (
            <div
              key={customer.id}
              className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                selectedCustomer?.id === customer.id
                  ? 'border-primary bg-primary/5'
                  : 'border-gray-200 hover:bg-gray-50'
              }`}
              onClick={() => onSelectCustomer(customer)}
            >
              <div className="font-medium">{customer.name}</div>
              {customer.company_name && (
                <div className="text-sm text-gray-600">{customer.company_name}</div>
              )}
              <div className="text-sm text-gray-600">
                {customer.email} • {customer.phone}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  if (showToggleButtons) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Customer Information</CardTitle>
        </CardHeader>
        <CardContent>{content}</CardContent>
      </Card>
    );
  }

  return content;
}

