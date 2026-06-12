import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { ProductService } from '@/services/productService';
import type { ProductFilters } from '@/types/product';

interface MobileFilterSheetProps {
  filters: ProductFilters;
  onApply: (f: Partial<ProductFilters>) => void;
  onClose: () => void;
}

const FILTER_SECTIONS = [
  { key: 'category',  label: 'Category' },
  { key: 'status',    label: 'Stock Status' },
  { key: 'color',     label: 'Color' },
  { key: 'pattern',   label: 'Pattern' },
  { key: 'length',    label: 'Length' },
  { key: 'width',     label: 'Width' },
  { key: 'weight',    label: 'GSM' },
] as const;

type FilterKey = typeof FILTER_SECTIONS[number]['key'];

const STATUS_OPTIONS = [
  { label: 'In Stock',      value: 'in-stock' },
  { label: 'Low Stock',     value: 'low-stock' },
  { label: 'Out of Stock',  value: 'out-of-stock' },
];

export default function MobileFilterSheet({ filters, onApply, onClose }: MobileFilterSheetProps) {
  const [activeSection, setActiveSection] = useState<FilterKey>('category');
  const [options, setOptions] = useState<Record<string, string[]>>({
    category: [], color: [], pattern: [], length: [], width: [], weight: [],
  });
  const [selected, setSelected] = useState<Record<FilterKey, string[]>>({
    category: Array.isArray(filters.category) ? filters.category : filters.category ? [filters.category as string] : [],
    status:   Array.isArray(filters.status)   ? filters.status   : filters.status   ? [filters.status as string]   : [],
    color:    Array.isArray(filters.color)    ? filters.color    : filters.color    ? [filters.color as string]    : [],
    pattern:  Array.isArray(filters.pattern)  ? filters.pattern  : filters.pattern  ? [filters.pattern as string]  : [],
    length:   Array.isArray(filters.length)   ? filters.length   : filters.length   ? [filters.length as string]   : [],
    width:    Array.isArray(filters.width)    ? filters.width    : filters.width    ? [filters.width as string]    : [],
    weight:   Array.isArray(filters.weight)   ? filters.weight   : filters.weight   ? [filters.weight as string]   : [],
  });

  useEffect(() => {
    ProductService.getDropdownData().then((data) => {
      const map = (arr?: { value: string }[]) =>
        (arr || []).map(o => o.value).filter(v => v && v !== 'N/A').sort();
      setOptions({
        category: map(data.categories),
        color:    map(data.colors),
        pattern:  map(data.patterns),
        length:   map(data.lengths),
        width:    map(data.widths),
        weight:   map(data.weights),
      });
    }).catch(() => {});
  }, []);

  const toggle = (key: FilterKey, value: string) => {
    setSelected(prev => {
      const arr = prev[key];
      return { ...prev, [key]: arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value] };
    });
  };

  const currentOptions = activeSection === 'status'
    ? STATUS_OPTIONS.map(o => o.value)
    : options[activeSection] || [];

  const currentLabels: Record<string, string> = activeSection === 'status'
    ? Object.fromEntries(STATUS_OPTIONS.map(o => [o.value, o.label]))
    : {};

  const totalSelected = Object.values(selected).flat().length;

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/40" onClick={onClose} />
      <div className="fixed inset-0 z-[61] bg-white flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100">
          <p className="text-xl font-bold text-gray-900">Filters</p>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100">
            <X className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        {/* Two-panel body */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left — section list */}
          <div className="w-32 bg-gray-50 border-r border-gray-100 overflow-y-auto shrink-0">
            {FILTER_SECTIONS.map(section => {
              const count = selected[section.key].length;
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
            {currentOptions.length === 0 ? (
              <p className="text-sm text-gray-400 px-4 py-6 text-center">No options</p>
            ) : (
              currentOptions.map((val) => {
                const label = currentLabels[val] || val;
                const isSelected = selected[activeSection].includes(val);
                return (
                  <div key={val}>
                    <button
                      onClick={() => toggle(activeSection, val)}
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
                      <span className="text-sm text-gray-800">{label}</span>
                    </button>
                    <div className="h-px bg-gray-100 mx-4" />
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Apply button */}
        <div className="px-5 pb-8 pt-3 border-t border-gray-100">
          {totalSelected > 0 && (
            <button
              onClick={() => setSelected({ category: [], status: [], color: [], pattern: [], length: [], width: [], weight: [] })}
              className="w-full text-sm text-gray-500 mb-2 text-center"
            >
              Clear all filters ({totalSelected})
            </button>
          )}
          <button
            onClick={() => onApply(selected)}
            className="w-full h-14 rounded-2xl bg-blue-600 text-white font-bold text-base"
          >
            APPLY
          </button>
        </div>
      </div>
    </>
  );
}
