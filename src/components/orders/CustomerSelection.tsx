import { useState } from 'react';
import { Search, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
    const s = searchTerm.toLowerCase();
    return (
      customer.name?.toLowerCase().includes(s) ||
      customer.phone?.toLowerCase().includes(s) ||
      customer.email?.toLowerCase().includes(s) ||
      customer.gst_number?.toLowerCase().includes(s) ||
      customer.company_name?.toLowerCase().includes(s) ||
      customer.city?.toLowerCase().includes(s)
    );
  });

  const content = (
    <div className="h-full flex flex-col gap-3">
      {showToggleButtons && (
        <div className="flex gap-4 flex-shrink-0">
          <Button variant="default" className="flex-1 bg-primary-600 hover:bg-primary-700 text-white" disabled>
            Select Existing Customer
          </Button>
          <Button variant="outline" onClick={onShowNewCustomerForm} className="flex-1">
            <UserPlus className="w-4 h-4 mr-2" />
            Add New Customer
          </Button>
        </div>
      )}

      {/* Search bar */}
      <div className="relative flex-shrink-0">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5 pointer-events-none" />
        <input
          placeholder="Search by name, phone, GST, city…"
          className="w-full h-8 pl-8 pr-3 rounded-md border border-slate-200 bg-white text-[12.5px] focus:outline-none focus:border-slate-400 focus:ring-0"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          autoFocus
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-slate-400">{filteredCustomers.length}</span>
      </div>

      {filteredCustomers.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-6">No customers found</p>
      ) : (
        <div className="flex-1 min-h-0 bg-white border border-slate-200 rounded-md overflow-hidden flex flex-col">
          {/* Table header */}
          <div className="grid grid-cols-[2fr_1.3fr_1.5fr_1.5fr] px-3 h-9 items-center bg-slate-50 border-b border-slate-200 flex-shrink-0">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Name</span>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Phone</span>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">GST</span>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Address</span>
          </div>
          {/* Table rows */}
          <div className="flex-1 overflow-y-auto">
            {filteredCustomers.map((customer) => {
              const isSelected = selectedCustomer?.id === customer.id;
              const address = [customer.city, customer.state].filter(Boolean).join(', ');
              return (
                <div
                  key={customer.id}
                  onClick={() => onSelectCustomer(customer)}
                  className="grid grid-cols-[2fr_1.3fr_1.5fr_1.5fr] px-3 py-2 cursor-pointer border-b border-slate-100 last:border-0 transition-colors hover:bg-slate-50"
                  style={isSelected ? { background: '#eff6ff', borderLeft: '2px solid #2563eb', paddingLeft: 10 } : {}}
                >
                  <div className="min-w-0 pr-2">
                    <p className="text-[12.5px] font-medium truncate" style={{ color: isSelected ? '#1d4ed8' : '#0f172a' }}>
                      {customer.name}
                    </p>
                    {customer.company_name && customer.company_name !== customer.name && (
                      <p className="text-[11px] text-slate-400 truncate">{customer.company_name}</p>
                    )}
                  </div>
                  <p className="text-[12px] text-slate-600 truncate pr-2 tabular-nums self-center">{customer.phone || '—'}</p>
                  <p className="text-[11px] text-slate-500 truncate pr-2 font-mono self-center">{customer.gst_number || '—'}</p>
                  <div className="min-w-0 self-center">
                    <p className="text-[12px] text-slate-700 truncate">{address || '—'}</p>
                    {customer.pincode && <p className="text-[10.5px] text-slate-400 tabular-nums">{customer.pincode}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
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
