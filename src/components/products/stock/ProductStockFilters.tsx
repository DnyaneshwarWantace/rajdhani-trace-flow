import { useState, useEffect } from 'react';
import { Search, X, AlignJustify, SlidersHorizontal, Check, MapPin } from 'lucide-react';
import { MultiSelect } from '@/components/ui/multi-select';
import { DropdownService } from '@/services/dropdownService';
import { MobileDateField } from '@/components/ui/MobileDatePickerSheet';

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

type FilterSection = 'status' | 'location' | 'date';

const FILTER_SECTIONS: { key: FilterSection; label: string }[] = [
  { key: 'status',   label: 'Status' },
  { key: 'location', label: 'Location' },
  { key: 'date',     label: 'Date Range' },
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

  // local filter state while sheet is open
  const [activeSection, setActiveSection] = useState<FilterSection>('status');
  const [localStatus, setLocalStatus] = useState<string[]>([]);
  const [localLocation, setLocalLocation] = useState<string[]>([]);
  const [localStart, setLocalStart] = useState('');
  const [localEnd, setLocalEnd] = useState('');

  useEffect(() => {
    DropdownService.getDropdownsByCategory('storage_location')
      .then(list => setLocationOptions(list.map(d => ({ label: d.value, value: d.value }))))
      .catch(() => setLocationOptions([]));
  }, []);

  const activeFilterCount = statusFilter.length + locationFilter.length + (startDate ? 1 : 0) + (endDate ? 1 : 0);

  const openFilter = () => {
    setLocalStatus(statusFilter);
    setLocalLocation(locationFilter);
    setLocalStart(startDate);
    setLocalEnd(endDate);
    setActiveSection('status');
    setShowFilter(true);
  };

  const applyFilter = () => {
    onStatusChange(localStatus);
    onLocationChange(localLocation);
    onStartDateChange(localStart);
    onEndDateChange(localEnd);
    setShowFilter(false);
  };

  const clearLocal = () => {
    setLocalStatus([]);
    setLocalLocation([]);
    setLocalStart('');
    setLocalEnd('');
  };

  const toggleLocal = (section: FilterSection, value: string) => {
    if (section === 'status') {
      setLocalStatus(prev => prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]);
    } else if (section === 'location') {
      setLocalLocation(prev => prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]);
    }
  };

  const localCount = localStatus.length + localLocation.length + (localStart ? 1 : 0) + (localEnd ? 1 : 0);

  const sectionCount = (key: FilterSection) => {
    if (key === 'status') return localStatus.length;
    if (key === 'location') return localLocation.length;
    if (key === 'date') return (localStart ? 1 : 0) + (localEnd ? 1 : 0);
    return 0;
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
          <button
            onClick={() => { onStatusChange([]); onLocationChange([]); onStartDateChange(''); onEndDateChange(''); }}
            className="flex items-center gap-1 text-xs text-red-500 font-semibold hover:text-red-700"
          >
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
          onClick={openFilter}
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

      {/* FILTER — full-screen two-panel (matches MobileFilterSheet) */}
      {showFilter && (
        <>
          <div className="fixed inset-0 z-[60] bg-black/40" onClick={() => setShowFilter(false)} />
          <div className="fixed inset-0 z-[61] bg-white flex flex-col lg:hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100">
              <p className="text-xl font-bold text-gray-900">Filters</p>
              <button onClick={() => setShowFilter(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100">
                <X className="w-4 h-4 text-gray-600" />
              </button>
            </div>

            {/* Two-panel body */}
            <div className="flex flex-1 overflow-hidden">
              {/* Left — section list */}
              <div className="w-32 bg-gray-50 border-r border-gray-100 overflow-y-auto shrink-0">
                {FILTER_SECTIONS.map(section => {
                  const count = sectionCount(section.key);
                  return (
                    <button
                      key={section.key}
                      onClick={() => setActiveSection(section.key)}
                      className={`w-full text-left px-4 py-3.5 text-sm font-medium border-l-2 transition-colors ${
                        activeSection === section.key
                          ? 'border-blue-600 text-blue-600 bg-white'
                          : 'border-transparent text-gray-600'
                      }`}
                    >
                      {section.label}
                      {count > 0 && (
                        <span className="ml-1 text-[10px] font-bold text-blue-600">({count})</span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Right — options */}
              <div className="flex-1 overflow-y-auto">
                {activeSection === 'status' && STATUS_OPTIONS.map(opt => {
                  const isSelected = localStatus.includes(opt.value);
                  return (
                    <div key={opt.value}>
                      <button
                        onClick={() => toggleLocal('status', opt.value)}
                        className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
                      >
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 ${
                          isSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
                        }`}>
                          {isSelected && (
                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        <span className="text-sm text-gray-800">{opt.label}</span>
                      </button>
                      <div className="h-px bg-gray-100 mx-4" />
                    </div>
                  );
                })}

                {activeSection === 'location' && (
                  locationOptions.length === 0
                    ? <p className="text-sm text-gray-400 px-4 py-6 text-center">No locations</p>
                    : locationOptions.map(opt => {
                        const isSelected = localLocation.includes(opt.value);
                        return (
                          <div key={opt.value}>
                            <button
                              onClick={() => toggleLocal('location', opt.value)}
                              className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
                            >
                              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 ${
                                isSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
                              }`}>
                                {isSelected && (
                                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                              </div>
                              <span className="text-sm text-gray-800">{opt.label}</span>
                            </button>
                            <div className="h-px bg-gray-100 mx-4" />
                          </div>
                        );
                      })
                )}

                {activeSection === 'date' && (
                  <div className="px-4 py-4 space-y-4">
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">From</p>
                      <MobileDateField
                        value={localStart}
                        onChange={setLocalStart}
                        placeholder="Select start date"
                        title="From Date"
                      />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">To</p>
                      <MobileDateField
                        value={localEnd}
                        onChange={setLocalEnd}
                        placeholder="Select end date"
                        title="To Date"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Apply button */}
            <div className="px-5 pb-8 pt-3 border-t border-gray-100">
              {localCount > 0 && (
                <button
                  onClick={clearLocal}
                  className="w-full text-sm text-gray-500 mb-2 text-center"
                >
                  Clear all filters ({localCount})
                </button>
              )}
              <button
                onClick={applyFilter}
                className="w-full h-14 rounded-2xl bg-blue-600 text-white font-bold text-base"
              >
                APPLY
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
