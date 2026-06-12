import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { MaterialService } from '@/services/materialService';
import { DropdownService } from '@/services/dropdownService';
import type { MaterialFilters } from '@/types/material';

interface MaterialMobileFilterSheetProps {
  filters: MaterialFilters;
  onApply: (f: Partial<MaterialFilters>) => void;
  onClose: () => void;
  excludeCategories?: string[];
}

const FILTER_SECTIONS = [
  { key: 'status',   label: 'Stock Status' },
  { key: 'category', label: 'Category' },
  { key: 'type',     label: 'Type' },
  { key: 'color',    label: 'Color' },
  { key: 'supplier', label: 'Supplier' },
] as const;

type FilterKey = typeof FILTER_SECTIONS[number]['key'];

const STATUS_OPTIONS = [
  { label: 'In Stock',      value: 'in-stock' },
  { label: 'Low Stock',     value: 'low-stock' },
  { label: 'Out of Stock',  value: 'out-of-stock' },
  { label: 'Overstock',     value: 'overstock' },
];

export default function MaterialMobileFilterSheet({ filters, onApply, onClose, excludeCategories = [] }: MaterialMobileFilterSheetProps) {
  const [activeSection, setActiveSection] = useState<FilterKey>('status');
  const [options, setOptions] = useState<Record<string, string[]>>({
    category: [], type: [], color: [], supplier: [],
  });
  const [selected, setSelected] = useState<Record<FilterKey, string[]>>({
    status:   Array.isArray(filters.status)   ? filters.status   : filters.status   ? [filters.status as string]   : [],
    category: Array.isArray(filters.category) ? filters.category : filters.category ? [filters.category as string] : [],
    type:     Array.isArray(filters.type)     ? filters.type     : filters.type     ? [filters.type as string]     : [],
    color:    Array.isArray(filters.color)    ? filters.color    : filters.color    ? [filters.color as string]    : [],
    supplier: Array.isArray(filters.supplier) ? filters.supplier : filters.supplier ? [filters.supplier as string] : [],
  });

  useEffect(() => {
    loadOptions();
  }, []);

  const loadOptions = async () => {
    try {
      const { materials } = await MaterialService.getMaterials({ limit: 1000, usage_type: excludeCategories?.includes('Ink') ? 'per_batch' : undefined });

      const catFromDropdown = await DropdownService.getOptionsByCategory('material_category')
        .then((opts: any[]) => opts.map((o: any) => o.value).filter(Boolean))
        .catch(() => []);
      const catFromMaterials = Array.from(new Set(materials.map((m: any) => m.category).filter((c: any) => c && c !== 'N/A')));
      let cats = Array.from(new Set([...catFromDropdown, ...catFromMaterials])).sort() as string[];
      if (excludeCategories?.length) cats = cats.filter(c => !excludeCategories.includes(c));

      const types = Array.from(new Set(materials.map((m: any) => m.type).filter((t: any) => t && t !== 'N/A'))).sort() as string[];
      const colors = Array.from(new Set(materials.map((m: any) => m.color).filter((c: any) => c && c !== 'N/A'))).sort() as string[];
      const suppliers = Array.from(new Set(materials.map((m: any) => m.supplier_name).filter(Boolean))).sort() as string[];

      setOptions({ category: cats, type: types, color: colors, supplier: suppliers });
    } catch {}
  };

  const toggle = (key: FilterKey, value: string) => {
    setSelected(prev => {
      const arr = prev[key];
      return { ...prev, [key]: arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value] };
    });
  };

  const currentOptions: string[] = activeSection === 'status'
    ? STATUS_OPTIONS.map(o => o.value)
    : options[activeSection] || [];

  const currentLabels: Record<string, string> = activeSection === 'status'
    ? Object.fromEntries(STATUS_OPTIONS.map(o => [o.value, o.label]))
    : {};

  const statusColors: Record<string, string> = {
    'in-stock': '#16a34a', 'low-stock': '#ea580c', 'out-of-stock': '#dc2626', 'overstock': '#7c3aed',
  };

  const totalSelected = Object.values(selected).flat().length;

  return createPortal(
    <>
      <div className="fixed inset-0 z-[60] bg-black/40" onClick={onClose} />
      <div className="fixed inset-0 z-[61] bg-white flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100 flex-shrink-0">
          <p className="text-xl font-bold text-gray-900">Filters</p>
          {totalSelected > 0 && (
            <button
              onClick={() => setSelected({ status: [], category: [], type: [], color: [], supplier: [] })}
              className="text-sm font-bold text-blue-600"
            >
              CLEAR ALL
            </button>
          )}
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
                      {activeSection === 'status' && statusColors[val] && (
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: statusColors[val] }} />
                      )}
                      <span className="text-sm text-gray-800">{label}</span>
                    </button>
                    <div className="h-px bg-gray-100 mx-4" />
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 pb-8 pt-3 border-t border-gray-100 flex-shrink-0">
          <button
            onClick={() => { onApply(selected); onClose(); }}
            className="w-full h-14 rounded-2xl text-white font-bold text-base"
            style={{ backgroundColor: '#2563eb' }}
          >
            APPLY{totalSelected > 0 ? ` (${totalSelected})` : ''}
          </button>
        </div>
      </div>
    </>,
    document.body
  );
}
