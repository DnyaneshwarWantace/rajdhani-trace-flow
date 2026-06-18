import { useState, useEffect } from 'react';
import { Search, X, AlignJustify, SlidersHorizontal, Check, MapPin } from 'lucide-react';
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

const SORT_BY_OPTIONS: { label: string; value: 'qr_code' | 'status' | 'created_at' }[] = [
  { label: 'Recently Added', value: 'created_at' },
  { label: 'QR Code',        value: 'qr_code' },
  { label: 'Status',         value: 'status' },
];

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
  const [showSort, setShowSort] = useState(false);
  const [showFilter, setShowFilter] = useState(false);

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
    <>
      {/* Search bar — always visible */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        <input
          type="text"
          value={searchTerm}
          onChange={e => onSearchChange(e.target.value)}
          placeholder="Search by QR code, roll no, inspector…"
          className="w-full h-10 pl-10 pr-9 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-colors"
        />
        {searchTerm && (
          <button onClick={() => onSearchChange('')} className="absolute right-3 top-1/2 -translate-y-1/2">
            <X className="w-3.5 h-3.5 text-gray-400" />
          </button>
        )}
      </div>

      {/* Desktop: inline filter row */}
      <div className="hidden lg:flex flex-wrap items-center gap-3">
        <div className="w-52">
          <MultiSelect options={STATUS_OPTIONS} selected={statusFilter} onChange={onStatusChange} placeholder="All Status" />
        </div>
        <div className="w-52 relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none z-10" />
          <div className="pl-8">
            <MultiSelect options={locationOptions} selected={locationFilter} onChange={onLocationChange} placeholder="All Locations" />
          </div>
        </div>
        <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-xl overflow-hidden h-10 px-3">
          <input type="date" value={startDate} onChange={e => onStartDateChange(e.target.value)} className="text-sm text-gray-700 outline-none bg-transparent w-32" />
          <span className="text-gray-300 text-xs">→</span>
          <input type="date" value={endDate} onChange={e => onEndDateChange(e.target.value)} className="text-sm text-gray-700 outline-none bg-transparent w-32" />
        </div>
        <div className="h-5 w-px bg-gray-200" />
        <div className="flex gap-2">
          {SORT_BY_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => onSortChange(opt.value, sortBy === opt.value && sortOrder === 'desc' ? 'asc' : 'desc')}
              className={`h-9 px-3 rounded-xl text-sm font-medium border transition-colors ${
                sortBy === opt.value ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-gray-200 text-gray-600'
              }`}
            >
              {opt.label}
              {sortBy === opt.value && <span className="ml-1">{sortOrder === 'desc' ? '↓' : '↑'}</span>}
            </button>
          ))}
        </div>
        {activeFilterCount > 0 && (
          <button onClick={clearAll} className="flex items-center gap-1 text-xs text-red-500 font-semibold hover:text-red-700">
            <X className="w-3 h-3" /> Clear
          </button>
        )}
      </div>

      {/* Mobile: fixed bottom SORT | FILTER bar */}
      <div className="lg:hidden fixed bottom-16 left-0 right-0 z-40 flex border-t border-gray-200 bg-white">
        <button
          onClick={() => { setShowSort(true); setShowFilter(false); }}
          className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold text-gray-700 border-r border-gray-200"
        >
          <AlignJustify className="w-4 h-4" />
          SORT
          {sortBy !== 'created_at' && <span className="w-2 h-2 rounded-full bg-blue-500 ml-0.5" />}
        </button>
        <button
          onClick={() => { setShowFilter(true); setShowSort(false); }}
          className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold text-gray-700"
        >
          <SlidersHorizontal className="w-4 h-4" />
          FILTER
          {activeFilterCount > 0 && (
            <span className="ml-0.5 w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* SORT bottom sheet */}
      {showSort && (
        <>
          <div className="lg:hidden fixed inset-0 z-50 bg-black/40" onClick={() => setShowSort(false)} />
          <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl" style={{ zIndex: 51 }}>
            <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-gray-100">
              <p className="text-base font-bold text-gray-900">Sort By</p>
              <button onClick={() => setShowSort(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100">
                <X className="w-4 h-4 text-gray-600" />
              </button>
            </div>
            <div className="px-5 py-3 space-y-1">
              {SORT_BY_OPTIONS.map(opt => (
                <div key={opt.value}>
                  <button
                    onClick={() => { onSortChange(opt.value, sortOrder); setShowSort(false); }}
                    className={`w-full flex items-center justify-between text-left px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                      sortBy === opt.value ? 'bg-blue-50 text-blue-700 font-bold' : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {opt.label}
                    {sortBy === opt.value && <Check className="w-4 h-4 text-blue-600" />}
                  </button>
                  <div className="h-px bg-gray-100 mx-1" />
                </div>
              ))}
              <div className="pt-2 pb-6">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 px-1">Order</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => { onSortChange(sortBy, 'asc'); setShowSort(false); }}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors ${sortOrder === 'asc' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
                  >
                    Oldest First
                  </button>
                  <button
                    onClick={() => { onSortChange(sortBy, 'desc'); setShowSort(false); }}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors ${sortOrder === 'desc' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
                  >
                    Newest First
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* FILTER bottom sheet */}
      {showFilter && (
        <>
          <div className="lg:hidden fixed inset-0 z-50 bg-black/40" onClick={() => setShowFilter(false)} />
          <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl" style={{ zIndex: 51 }}>
            <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-gray-100">
              <p className="text-base font-bold text-gray-900">Filter</p>
              <div className="flex items-center gap-2">
                {activeFilterCount > 0 && (
                  <button onClick={clearAll} className="text-xs text-red-500 font-semibold px-3 py-1.5 rounded-lg bg-red-50">
                    Clear all
                  </button>
                )}
                <button onClick={() => setShowFilter(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100">
                  <X className="w-4 h-4 text-gray-600" />
                </button>
              </div>
            </div>
            <div className="px-5 py-4 space-y-5 pb-10 overflow-y-auto max-h-[75vh]">
              {/* Status */}
              <div>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-2">Status</p>
                <div className="flex flex-wrap gap-2">
                  {STATUS_OPTIONS.map(opt => {
                    const active = statusFilter.includes(opt.value);
                    return (
                      <button
                        key={opt.value}
                        onClick={() => onStatusChange(active ? statusFilter.filter(v => v !== opt.value) : [...statusFilter, opt.value])}
                        className={`px-3.5 py-2 rounded-xl text-sm font-semibold border transition-colors ${
                          active ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-200'
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Location */}
              {locationOptions.length > 0 && (
                <div>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-2">Location</p>
                  <div className="flex flex-wrap gap-2">
                    {locationOptions.map(opt => {
                      const active = locationFilter.includes(opt.value);
                      return (
                        <button
                          key={opt.value}
                          onClick={() => onLocationChange(active ? locationFilter.filter(v => v !== opt.value) : [...locationFilter, opt.value])}
                          className={`px-3.5 py-2 rounded-xl text-sm font-semibold border transition-colors ${
                            active ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-200'
                          }`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Date range */}
              <div>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-2">Date Range</p>
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
            </div>
          </div>
        </>
      )}
    </>
  );
}
