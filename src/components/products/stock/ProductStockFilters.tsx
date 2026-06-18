import { useState, useEffect } from 'react';
import { Search, MapPin, ChevronDown, X, Check, SlidersHorizontal } from 'lucide-react';
import { MultiSelect } from '@/components/ui/multi-select';
import { DropdownService } from '@/services/dropdownService';

interface ProductStockFiltersProps {
  searchTerm: string;
  statusFilter: string[];
  locationFilter: string[];
  startDate: string;
  endDate: string;
  sortBy: 'qr_code' | 'status' | 'created_at';
  sortOrder: 'asc' | 'desc';
  onSearchChange: (value: string) => void;
  onStatusChange: (values: string[]) => void;
  onLocationChange: (values: string[]) => void;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onSortChange: (sortBy: 'qr_code' | 'status' | 'created_at', sortOrder: 'asc' | 'desc') => void;
}

const STATUS_OPTIONS = [
  { label: 'Available',     value: 'available' },
  { label: 'In Production', value: 'in_production' },
  { label: 'Used',          value: 'used' },
  { label: 'Reserved',      value: 'reserved' },
  { label: 'Sold',          value: 'sold' },
  { label: 'Damaged',       value: 'damaged' },
];

const SORT_BY_OPTIONS = [
  { label: 'Recently Added', value: 'created_at' },
  { label: 'QR Code',        value: 'qr_code' },
  { label: 'Status',         value: 'status' },
];

const SORT_ORDER_OPTIONS = [
  { label: 'Newest First', value: 'desc' },
  { label: 'Oldest First', value: 'asc' },
];

function SimpleDropdown({
  options,
  value,
  onChange,
  placeholder,
}: {
  options: { label: string; value: string }[];
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const label = options.find(o => o.value === value)?.label ?? placeholder;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-2 h-10 px-3.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:border-gray-300 transition-colors"
      >
        <span className="truncate">{label}</span>
        <ChevronDown className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 mt-1.5 w-full bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
            {options.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => { onChange(opt.value); setOpen(false); }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 text-sm hover:bg-gray-50 transition-colors ${
                  value === opt.value ? 'text-blue-600 font-semibold bg-blue-50' : 'text-gray-700'
                }`}
              >
                {opt.label}
                {value === opt.value && <Check className="w-3.5 h-3.5" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function ProductStockFilters({
  searchTerm,
  statusFilter,
  locationFilter,
  startDate,
  endDate,
  sortBy,
  sortOrder,
  onSearchChange,
  onStatusChange,
  onLocationChange,
  onStartDateChange,
  onEndDateChange,
  onSortChange,
}: ProductStockFiltersProps) {
  const [locationOptions, setLocationOptions] = useState<{ label: string; value: string }[]>([]);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    DropdownService.getDropdownsByCategory('storage_location')
      .then(list => setLocationOptions(list.map(d => ({ label: d.value, value: d.value }))))
      .catch(() => setLocationOptions([]));
  }, []);

  const activeFilterCount = statusFilter.length + locationFilter.length + (startDate ? 1 : 0) + (endDate ? 1 : 0);

  const clearAll = () => {
    onStatusChange([]);
    onLocationChange([]);
    onStartDateChange('');
    onEndDateChange('');
  };

  return (
    <div className="space-y-2">
      {/* Search + filter toggle row — always visible */}
      <div className="flex items-center gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => onSearchChange(e.target.value)}
            placeholder="Search by QR code, roll no, inspector…"
            className="w-full h-10 pl-10 pr-4 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-colors"
          />
          {searchTerm && (
            <button onClick={() => onSearchChange('')} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="w-3.5 h-3.5 text-gray-400" />
            </button>
          )}
        </div>

        {/* Mobile: filter toggle button */}
        <button
          type="button"
          onClick={() => setMobileOpen(o => !o)}
          className={`lg:hidden flex items-center gap-1.5 h-10 px-3.5 rounded-xl border text-sm font-semibold transition-colors ${
            activeFilterCount > 0
              ? 'bg-blue-600 border-blue-600 text-white'
              : 'bg-white border-gray-200 text-gray-600'
          }`}
        >
          <SlidersHorizontal className="w-4 h-4" />
          {activeFilterCount > 0 && <span className="text-xs">{activeFilterCount}</span>}
        </button>
      </div>

      {/* Desktop: always show filters inline */}
      <div className="hidden lg:flex flex-wrap items-center gap-3">
        <div className="w-52">
          <MultiSelect
            options={STATUS_OPTIONS}
            selected={statusFilter}
            onChange={onStatusChange}
            placeholder="All Status"
          />
        </div>

        <div className="w-52 relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none z-10" />
          <div className="pl-8">
            <MultiSelect
              options={locationOptions}
              selected={locationFilter}
              onChange={onLocationChange}
              placeholder="All Locations"
            />
          </div>
        </div>

        {/* Date range — one line */}
        <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-xl overflow-hidden h-10 px-3">
          <input
            type="date"
            value={startDate}
            onChange={e => onStartDateChange(e.target.value)}
            className="text-sm text-gray-700 outline-none bg-transparent w-32"
          />
          <span className="text-gray-300 text-xs">→</span>
          <input
            type="date"
            value={endDate}
            onChange={e => onEndDateChange(e.target.value)}
            className="text-sm text-gray-700 outline-none bg-transparent w-32"
          />
        </div>

        <div className="h-5 w-px bg-gray-200" />

        <div className="w-40">
          <SimpleDropdown
            options={SORT_BY_OPTIONS}
            value={sortBy}
            onChange={v => onSortChange(v as typeof sortBy, sortOrder)}
          />
        </div>
        <div className="w-36">
          <SimpleDropdown
            options={SORT_ORDER_OPTIONS}
            value={sortOrder}
            onChange={v => onSortChange(sortBy, v as typeof sortOrder)}
          />
        </div>

        {activeFilterCount > 0 && (
          <button onClick={clearAll} className="flex items-center gap-1 text-xs text-red-500 font-semibold hover:text-red-700">
            <X className="w-3 h-3" /> Clear
          </button>
        )}
      </div>

      {/* Mobile: expandable filter panel */}
      {mobileOpen && (
        <div className="lg:hidden bg-white border border-gray-200 rounded-2xl p-4 space-y-3 shadow-sm">
          {/* Status */}
          <div>
            <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide mb-1.5">Status</p>
            <MultiSelect
              options={STATUS_OPTIONS}
              selected={statusFilter}
              onChange={onStatusChange}
              placeholder="All Status"
            />
          </div>

          {/* Location — icon inside */}
          <div>
            <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide mb-1.5">Location</p>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none z-10" />
              <div className="pl-8">
                <MultiSelect
                  options={locationOptions}
                  selected={locationFilter}
                  onChange={onLocationChange}
                  placeholder="All Locations"
                />
              </div>
            </div>
          </div>

          {/* Date range — both on one line */}
          <div>
            <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide mb-1.5">Date Range</p>
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5">
              <input
                type="date"
                value={startDate}
                onChange={e => onStartDateChange(e.target.value)}
                className="flex-1 text-sm text-gray-700 bg-transparent outline-none"
              />
              <span className="text-gray-300 text-xs shrink-0">→</span>
              <input
                type="date"
                value={endDate}
                onChange={e => onEndDateChange(e.target.value)}
                className="flex-1 text-sm text-gray-700 bg-transparent outline-none"
              />
            </div>
          </div>

          {/* Sort — both on one line */}
          <div>
            <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide mb-1.5">Sort</p>
            <div className="grid grid-cols-2 gap-2">
              <SimpleDropdown
                options={SORT_BY_OPTIONS}
                value={sortBy}
                onChange={v => onSortChange(v as typeof sortBy, sortOrder)}
              />
              <SimpleDropdown
                options={SORT_ORDER_OPTIONS}
                value={sortOrder}
                onChange={v => onSortChange(sortBy, v as typeof sortOrder)}
              />
            </div>
          </div>

          {activeFilterCount > 0 && (
            <button onClick={clearAll} className="w-full flex items-center justify-center gap-1.5 py-2 text-sm text-red-500 font-semibold border border-red-100 rounded-xl bg-red-50">
              <X className="w-3.5 h-3.5" /> Clear all filters
            </button>
          )}
        </div>
      )}
    </div>
  );
}
