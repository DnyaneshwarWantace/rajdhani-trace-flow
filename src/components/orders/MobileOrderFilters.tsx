import { useState, useEffect } from 'react';
import { CustomerService, type Customer } from '@/services/customerService';

const SORT_OPTS = [
  { sortBy: 'order_date',    sortOrder: 'desc', label: 'Newest First' },
  { sortBy: 'order_date',    sortOrder: 'asc',  label: 'Oldest First' },
  { sortBy: 'total_amount',  sortOrder: 'desc', label: 'Amount: High → Low' },
  { sortBy: 'total_amount',  sortOrder: 'asc',  label: 'Amount: Low → High' },
  { sortBy: 'customer_name', sortOrder: 'asc',  label: 'Customer (A → Z)' },
  { sortBy: 'customer_name', sortOrder: 'desc', label: 'Customer (Z → A)' },
];

const STATUS_OPTS = [
  { value: 'pending',    label: 'Pending',   color: 'bg-amber-400' },
  { value: 'accepted',   label: 'Accepted',  color: 'bg-blue-500' },
  { value: 'dispatched', label: 'Shipped',   color: 'bg-purple-500' },
  { value: 'delivered',  label: 'Delivered', color: 'bg-green-500' },
  { value: 'cancelled',  label: 'Cancelled', color: 'bg-red-400' },
];

interface MobileOrderFiltersProps {
  isOpen: boolean;
  mode?: 'sort' | 'filter';
  onClose: () => void;
  filters: {
    search: string;
    status: string[];
    customer_id: string[];
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  };
  onStatusChange: (values: string[]) => void;
  onCustomerChange: (values: string[]) => void;
  onSortChange?: (sortBy: string, sortOrder: 'asc' | 'desc') => void;
  onReset: () => void;
}

export default function MobileOrderFilters({
  isOpen, mode = 'filter', onClose,
  filters, onStatusChange, onCustomerChange, onSortChange, onReset,
}: MobileOrderFiltersProps) {
  const [tmpStatus, setTmpStatus] = useState<string[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [activeTab, setActiveTab] = useState<'status' | 'customer'>('status');

  useEffect(() => {
    CustomerService.getCustomers().then(({ data }) => { if (data) setCustomers(data); });
  }, []);

  useEffect(() => {
    if (isOpen) setTmpStatus(filters.status);
  }, [isOpen]);

  if (!isOpen) return null;

  const toggleStatus = (val: string) =>
    setTmpStatus(prev => prev.includes(val) ? prev.filter(x => x !== val) : [...prev, val]);

  const applyFilter = () => {
    onStatusChange(tmpStatus);
    onClose();
  };

  const totalActive = tmpStatus.length + filters.customer_id.length;

  // ── SORT sheet ─────────────────────────────────────────────────────
  if (mode === 'sort') {
    return (
      <>
        <div className="fixed inset-0 bg-black/45 z-50 lg:hidden" onClick={onClose} />
        <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-white rounded-t-2xl shadow-2xl">
          <div className="px-4 pt-5 pb-2 flex items-center justify-between">
            <span className="text-base font-bold text-gray-900">Sort By</span>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100">
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="pb-4">
            {SORT_OPTS.map((s, i) => {
              const active = (filters.sortBy || 'order_date') === s.sortBy && (filters.sortOrder || 'desc') === s.sortOrder;
              return (
                <button
                  key={s.label}
                  onClick={() => { onSortChange?.(s.sortBy, s.sortOrder as 'asc' | 'desc'); onClose(); }}
                  className={`w-full flex items-center gap-4 px-4 py-4 text-left ${i > 0 ? 'border-t border-gray-100' : ''}`}
                >
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${active ? 'border-blue-600' : 'border-gray-300'}`}>
                    {active && <div className="w-2.5 h-2.5 rounded-full bg-blue-600" />}
                  </div>
                  <span className={`text-sm ${active ? 'font-bold text-blue-600' : 'font-normal text-gray-900'}`}>{s.label}</span>
                </button>
              );
            })}
          </div>
          {/* Footer */}
          <div className="px-4 pb-8 pt-2 border-t border-gray-100 flex gap-3">
            <button onClick={onClose} className="flex-1 h-[52px] rounded-[10px] border border-gray-200 text-[15px] font-semibold text-gray-700">
              Close
            </button>
          </div>
        </div>
      </>
    );
  }

  // ── FILTER sheet — full screen ──────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 lg:hidden bg-white flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-12 pb-3 border-b border-gray-200">
        <span className="text-lg font-bold text-gray-900">Filters</span>
        {totalActive > 0 && (
          <button onClick={() => { setTmpStatus([]); onCustomerChange([]); }} className="text-sm font-bold text-blue-600">
            CLEAR ALL
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="flex flex-1 overflow-hidden">
          {/* Left: tabs */}
          <div className="w-28 flex-shrink-0 bg-gray-50 border-r border-gray-100 overflow-y-auto">
            <button
              onClick={() => setActiveTab('status')}
              className={`w-full text-left px-3 py-4 text-sm border-b border-gray-100 ${activeTab === 'status' ? 'font-semibold text-blue-600 bg-white' : 'font-medium text-gray-500'}`}
            >
              Status
              {tmpStatus.length > 0 && (
                <span className="ml-1 text-xs bg-blue-600 text-white rounded-full px-1.5">{tmpStatus.length}</span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('customer')}
              className={`w-full text-left px-3 py-4 text-sm border-b border-gray-100 ${activeTab === 'customer' ? 'font-semibold text-blue-600 bg-white' : 'font-medium text-gray-500'}`}
            >
              Customer
              {filters.customer_id.length > 0 && (
                <span className="ml-1 text-xs bg-blue-600 text-white rounded-full px-1.5">{filters.customer_id.length}</span>
              )}
            </button>
          </div>

          {/* Right: options */}
          <div className="flex-1 min-w-0 overflow-y-auto p-4 space-y-1">
            {activeTab === 'status' && (
              <>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">Status</p>
                {STATUS_OPTS.map(opt => {
                  const active = tmpStatus.includes(opt.value);
                  return (
                    <button
                      key={opt.value}
                      onClick={() => toggleStatus(opt.value)}
                      className="w-full flex items-center gap-3 py-2.5"
                    >
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${active ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}>
                        {active && (
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${opt.color}`} />
                      <span className={`text-sm font-medium ${active ? 'text-blue-700' : 'text-gray-800'}`}>{opt.label}</span>
                    </button>
                  );
                })}
              </>
            )}

            {activeTab === 'customer' && (
              <>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">Customer</p>
                {customers.map(c => {
                  const active = filters.customer_id.includes(c.id);
                  return (
                    <button
                      key={c.id}
                      onClick={() => {
                        const next = active
                          ? filters.customer_id.filter(x => x !== c.id)
                          : [...filters.customer_id, c.id];
                        onCustomerChange(next);
                      }}
                      className="w-full min-w-0 flex items-center gap-3 py-2.5 overflow-hidden"
                    >
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${active ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}>
                        {active && (
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <span className={`text-sm font-medium text-left truncate ${active ? 'text-blue-700' : 'text-gray-800'}`}>{c.name}</span>
                    </button>
                  );
                })}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Footer — two buttons */}
      <div className="px-4 py-4 border-t border-gray-100 bg-white flex gap-3">
        <button
          onClick={onClose}
          className="flex-1 h-[52px] rounded-[10px] border border-gray-200 text-[15px] font-semibold text-gray-700"
        >
          Close
        </button>
        <button
          onClick={applyFilter}
          className="flex-1 h-[52px] rounded-[10px] bg-blue-600 text-white text-[15px] font-semibold"
        >
          Apply{totalActive > 0 ? ` (${totalActive})` : ''}
        </button>
      </div>
    </div>
  );
}
