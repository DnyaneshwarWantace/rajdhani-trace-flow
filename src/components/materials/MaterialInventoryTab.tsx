import { useState, useEffect, useRef, useCallback } from 'react';
import { Loader2, Eye, Edit, Plus, Droplets, AlignLeft, SlidersHorizontal, X } from 'lucide-react';
import MaterialTable from './MaterialTable';
import MaterialCard from './MaterialCard';
import MaterialPagination from './MaterialPagination';
import MaterialMobileFilterSheet from './MaterialMobileFilterSheet';
import type { RawMaterial, MaterialFilters } from '@/types/material';
import { MaterialService } from '@/services/materialService';
import { formatIndianNumberWithDecimals } from '@/utils/formatHelpers';
import { useDropdownVisualMaps } from '@/hooks/useDropdownVisualMaps';
import { DebouncedSearchInput } from '@/components/ui/DebouncedSearchInput';
import { createPortal } from 'react-dom';

interface MaterialInventoryTabProps {
  materials: RawMaterial[];
  loading: boolean;
  error: string | null;
  filters: MaterialFilters;
  viewMode: 'grid' | 'table';
  totalMaterials: number;
  onSearchChange: (value: string) => void;
  onCategoryChange: (values: string[]) => void;
  onStatusChange: (values: string[]) => void;
  onTypeChange?: (values: string[]) => void;
  onColorChange?: (values: string[]) => void;
  onSupplierChange?: (values: string[]) => void;
  onSortChange?: (sortBy: string, sortOrder: 'asc' | 'desc') => void;
  onViewModeChange: (mode: 'grid' | 'table') => void;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
  onView?: (material: RawMaterial) => void;
  onEdit?: (material: RawMaterial) => void;
  onOrder?: (material: RawMaterial) => void;
  onRecordUsage?: (material: RawMaterial) => void;
  excludeCategories?: string[];
  hideCategoryFilter?: boolean;
  mobileApiUsageType?: string;
}

// ─── Mobile card (2-column grid, matches RN app) ─────────────────────────────
function MobileGridCard({ material, onView, onEdit, onOrder, onRecordUsage }: {
  material: RawMaterial;
  onView?: (m: RawMaterial) => void;
  onEdit?: (m: RawMaterial) => void;
  onOrder?: (m: RawMaterial) => void;
  onRecordUsage?: (m: RawMaterial) => void;
}) {
  const { colorCodeMap } = useDropdownVisualMaps();

  const getStatusStyle = (s: string) => {
    switch (s) {
      case 'in-stock': case 'active': return { bg: 'bg-green-500', label: 'In Stock' };
      case 'low-stock': return { bg: 'bg-orange-500', label: 'Low Stock' };
      case 'out-of-stock': return { bg: 'bg-red-500', label: 'Out of Stock' };
      case 'overstock': return { bg: 'bg-purple-500', label: 'Overstock' };
      default: return { bg: 'bg-gray-400', label: s };
    }
  };

  const style = getStatusStyle(material.status);
  const stock = Number(material.current_stock ?? 0);
  const maxStock = Number(material.max_capacity ?? material.reorder_point ?? 0);
  const stockPct = maxStock > 0 ? Math.min(100, (stock / maxStock) * 100) : (stock > 0 ? 100 : 0);

  const barColor = material.status === 'in-stock' || (material.status as string) === 'active' ? '#22c55e'
    : material.status === 'low-stock' ? '#f97316'
    : material.status === 'out-of-stock' ? '#ef4444'
    : material.status === 'overstock' ? '#a855f7'
    : '#6b7280';

  const colorHex = material.color && material.color !== 'N/A'
    ? (colorCodeMap[material.color] || colorCodeMap[material.color?.toLowerCase()])
    : null;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden" onClick={() => onView?.(material)}>
      {/* Image area */}
      <div className="relative w-full" style={{ paddingTop: '66%' }}>
        {material.image_url ? (
          <img
            src={material.image_url}
            alt={material.name}
            className="absolute inset-0 w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
            <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 10V11" />
            </svg>
          </div>
        )}
        {/* Status badge */}
        <span className={`absolute top-2 left-2 px-2 py-0.5 rounded-full text-white text-[10px] font-bold ${style.bg}`}>
          {style.label}
        </span>
        {colorHex && (
          <span className="absolute top-2 right-2 w-4 h-4 rounded-full border-2 border-white shadow" style={{ backgroundColor: colorHex }} />
        )}
      </div>

      {/* Body */}
      <div className="p-2.5">
        <p className="text-xs font-bold text-gray-900 leading-tight line-clamp-2 mb-0.5">{material.name}</p>
        <p className="text-[10px] text-gray-400 mb-2">
          {material.category}{material.type && material.type !== 'N/A' ? ` · ${material.type}` : ''}
        </p>

        {/* Stock bar */}
        <div className="mb-1.5">
          <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: `${stockPct}%`, backgroundColor: barColor }} />
          </div>
        </div>

        {/* Stock numbers */}
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-bold" style={{ color: barColor }}>
            {formatIndianNumberWithDecimals(stock, 1)} {material.unit}
          </span>
          {material.max_capacity > 0 && (
            <span className="text-[10px] text-gray-400">/{material.max_capacity}</span>
          )}
        </div>

        {/* Supplier */}
        {material.supplier_name && (
          <p className="text-[10px] text-gray-400 truncate mb-1">{material.supplier_name}</p>
        )}

        {/* Price */}
        {material.cost_per_unit != null && material.cost_per_unit > 0 && (
          <p className="text-[11px] font-semibold text-gray-700 mb-2">
            ₹{material.cost_per_unit.toFixed(2)}/{material.unit}
          </p>
        )}

        {/* Actions — icon + label below, like RN app */}
        <div className="flex border-t border-gray-100 mt-1">
          {onView && (
            <button onClick={(e) => { e.stopPropagation(); onView(material); }} className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-blue-500 active:bg-blue-50">
              <Eye className="w-3.5 h-3.5" />
              <span className="text-[9px] font-semibold">View</span>
            </button>
          )}
          {onEdit && (
            <>
              <div className="w-px bg-gray-100" />
              <button onClick={(e) => { e.stopPropagation(); onEdit(material); }} className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-green-500 active:bg-green-50">
                <Edit className="w-3.5 h-3.5" />
                <span className="text-[9px] font-semibold">Edit</span>
              </button>
            </>
          )}
          {onOrder && (
            <>
              <div className="w-px bg-gray-100" />
              <button onClick={(e) => { e.stopPropagation(); onOrder(material); }} className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-orange-500 active:bg-orange-50">
                <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
                <span className="text-[9px] font-semibold">Restock</span>
              </button>
            </>
          )}
          {onRecordUsage && material.category?.toLowerCase().trim() === 'ink' && (
            <>
              <div className="w-px bg-gray-100" />
              <button onClick={(e) => { e.stopPropagation(); onRecordUsage(material); }} className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-violet-500 active:bg-violet-50">
                <Droplets className="w-3.5 h-3.5" />
                <span className="text-[9px] font-semibold">Record</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Mobile sort/filter bottom sheets ────────────────────────────────────────
function SortSheet({ filters, onSortChange, onClose }: {
  filters: MaterialFilters;
  onSortChange: (by: string, order: 'asc' | 'desc') => void;
  onClose: () => void;
}) {
  const options = [
    { value: 'name', label: 'Name' },
    { value: 'stock', label: 'Stock Level' },
    { value: 'category', label: 'Category' },
    { value: 'type', label: 'Material Type' },
    { value: 'supplier', label: 'Supplier' },
    { value: 'recent', label: 'Recently Added' },
  ];

  return createPortal(
    <div className="fixed inset-0 z-50" onClick={onClose}>
      <div className="absolute inset-0" style={{ backgroundColor: 'rgba(0,0,0,0.45)' }} />
      <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mt-3 mb-2" />
        <div className="flex items-center justify-between px-4 pb-3">
          <span className="text-base font-bold text-gray-900">Sort By</span>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div className="px-4 pb-2 flex gap-2 border-b border-gray-100 mb-1">
          {(['asc', 'desc'] as const).map((order) => (
            <button
              key={order}
              onClick={() => onSortChange(filters.sortBy || 'name', order)}
              className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors ${
                (filters.sortOrder || 'asc') === order ? 'text-white' : 'bg-gray-100 text-gray-600'
              }`}
              style={(filters.sortOrder || 'asc') === order ? { backgroundColor: '#2563eb' } : {}}
            >
              {order === 'asc' ? 'A → Z' : 'Z → A'}
            </button>
          ))}
        </div>
        <div className="pb-8">
          {options.map((opt) => {
            const isActive = (filters.sortBy || 'name') === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => { onSortChange(opt.value, filters.sortOrder as 'asc' | 'desc' || 'asc'); onClose(); }}
                className={`w-full flex items-center justify-between px-4 py-3 text-sm transition-colors ${isActive ? 'font-bold' : 'text-gray-700'}`}
                style={isActive ? { color: '#2563eb' } : {}}
              >
                {opt.label}
                {isActive && <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#2563eb' }} />}
              </button>
            );
          })}
        </div>
      </div>
    </div>,
    document.body
  );
}

function FilterSheet({ filters, onStatusChange, onClose }: {
  filters: MaterialFilters;
  onStatusChange: (v: string[]) => void;
  onClose: () => void;
}) {
  const statusOptions = [
    { value: 'in-stock', label: 'In Stock', color: 'bg-green-500' },
    { value: 'low-stock', label: 'Low Stock', color: 'bg-orange-500' },
    { value: 'out-of-stock', label: 'Out of Stock', color: 'bg-red-500' },
    { value: 'overstock', label: 'Overstock', color: 'bg-purple-500' },
  ];
  const selectedStatus = Array.isArray(filters.status) ? filters.status : (filters.status ? [filters.status] : []);

  const toggle = (val: string) => {
    onStatusChange(selectedStatus.includes(val) ? selectedStatus.filter((s) => s !== val) : [...selectedStatus, val]);
  };

  return createPortal(
    <div className="fixed inset-0 z-50" onClick={onClose}>
      <div className="absolute inset-0" style={{ backgroundColor: 'rgba(0,0,0,0.45)' }} />
      <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mt-3 mb-2" />
        <div className="flex items-center justify-between px-4 pb-3">
          <span className="text-base font-bold text-gray-900">Filter by Status</span>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div className="px-4 pb-8 space-y-2">
          {statusOptions.map((opt) => {
            const isOn = selectedStatus.includes(opt.value);
            return (
              <button
                key={opt.value}
                onClick={() => toggle(opt.value)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                  isOn ? 'border-blue-300 bg-blue-50 text-blue-800' : 'border-gray-200 bg-white text-gray-700'
                }`}
              >
                <span className={`w-2.5 h-2.5 rounded-full ${opt.color}`} />
                {opt.label}
                {isOn && <span className="ml-auto text-blue-600 text-xs font-bold">✓</span>}
              </button>
            );
          })}
          {selectedStatus.length > 0 && (
            <button
              onClick={() => { onStatusChange([]); onClose(); }}
              className="w-full py-3 text-sm font-semibold text-red-500 border border-red-100 rounded-xl active:bg-red-50"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function MaterialInventoryTab({
  materials,
  loading,
  error,
  filters,
  viewMode,
  totalMaterials,
  onSearchChange,
  onCategoryChange,
  onStatusChange,
  onTypeChange,
  onColorChange,
  onSupplierChange,
  onSortChange,
  onViewModeChange: _onViewModeChange,
  onPageChange,
  onLimitChange,
  onView,
  onEdit,
  onOrder,
  onRecordUsage,
  excludeCategories,
  hideCategoryFilter,
  mobileApiUsageType,
}: MaterialInventoryTabProps) {
  const [showSort, setShowSort] = useState(false);
  const [showFilter, setShowFilter] = useState(false);

  // Mobile infinite scroll — self-contained, does NOT touch desktop pagination
  const MOBILE_PAGE_SIZE = 30;
  const [mobileMaterials, setMobileMaterials] = useState<RawMaterial[]>([]);
  const [mobileHasMore, setMobileHasMore] = useState(true);
  const [mobileLoadingMore, setMobileLoadingMore] = useState(false);
  const mobileOffsetRef = useRef(0);
  const mobileLoadingRef = useRef(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const loadMobileMaterials = useCallback(async (offset: number, isReset = false) => {
    if (mobileLoadingRef.current && !isReset) return;
    mobileLoadingRef.current = true;
    try {
      if (!isReset) setMobileLoadingMore(true);
      const apiFilters: any = {
        category: filters.category && (filters.category as string[]).length > 0 ? filters.category : undefined,
        usage_type: mobileApiUsageType || undefined,
        status: filters.status && (filters.status as string[]).length > 0 ? filters.status : undefined,
        type: filters.type && (filters.type as string[]).length > 0 ? filters.type : undefined,
        color: filters.color && (filters.color as string[]).length > 0 ? filters.color : undefined,
        supplier: filters.supplier && (filters.supplier as string[]).length > 0 ? filters.supplier : undefined,
        search: filters.search || undefined,
        sortBy: filters.sortBy || 'name',
        sortOrder: filters.sortOrder || 'asc',
        limit: MOBILE_PAGE_SIZE,
        offset,
      };
      Object.keys(apiFilters).forEach(k => apiFilters[k] === undefined && delete apiFilters[k]);
      const { materials: data } = await MaterialService.getMaterials(apiFilters);
      setMobileMaterials(prev => isReset ? data : [...prev, ...data]);
      mobileOffsetRef.current = offset + data.length;
      setMobileHasMore(data.length === MOBILE_PAGE_SIZE);
    } catch {}
    finally { setMobileLoadingMore(false); mobileLoadingRef.current = false; }
  }, [filters, mobileApiUsageType]);

  // Reset mobile list when filters change
  useEffect(() => {
    mobileOffsetRef.current = 0;
    setMobileMaterials([]);
    setMobileHasMore(true);
    loadMobileMaterials(0, true);
  }, [loadMobileMaterials]);

  // IntersectionObserver sentinel
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && mobileHasMore && !mobileLoadingRef.current) {
          loadMobileMaterials(mobileOffsetRef.current);
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [mobileHasMore, loadMobileMaterials]);

  const activeFilterCount = [
    ...(Array.isArray(filters.status)   ? filters.status   : filters.status   ? [filters.status]   : []),
    ...(!hideCategoryFilter ? (Array.isArray(filters.category) ? filters.category : filters.category ? [filters.category] : []) : []),
    ...(Array.isArray(filters.type)     ? filters.type     : filters.type     ? [filters.type]     : []),
    ...(Array.isArray(filters.color)    ? filters.color    : filters.color    ? [filters.color]    : []),
    ...(Array.isArray(filters.supplier) ? filters.supplier : filters.supplier ? [filters.supplier] : []),
  ].length;

  return (
    <>
      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-primary-600 mx-auto mb-4" />
            <p className="text-gray-600">Loading materials...</p>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Materials List */}
      {!loading && !error && (
        <>
          {/* Desktop View */}
          <div className="hidden lg:block">
            {viewMode === 'table' ? (
              <MaterialTable materials={materials} onView={onView} onEdit={onEdit} onOrder={onOrder} onRecordUsage={onRecordUsage} />
            ) : (
              <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
                {materials.map((material) => (
                  <div key={material._id} className="break-inside-avoid">
                    <MaterialCard material={material} onView={onView} onEdit={onEdit} onOrder={onOrder} onRecordUsage={onRecordUsage} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Mobile View */}
          <div className="lg:hidden">
            {/* Search bar */}
            <div className="mb-3">
              <DebouncedSearchInput
                value={filters.search || ''}
                onChange={onSearchChange}
                placeholder="Search by name, category, supplier..."
                minCharacters={3}
                debounceMs={500}
                className="w-full"
                showCounter={false}
              />
            </div>

            {/* Active filter chips */}
            {activeFilterCount > 0 && (
              <div className="flex gap-2 mb-3 flex-wrap">
                {(Array.isArray(filters.status) ? filters.status : filters.status ? [filters.status] : []).map((s) => (
                  <span key={`status-${s}`} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-medium border border-blue-100">
                    {s.replace(/-/g, ' ')}
                    <button onClick={() => onStatusChange((Array.isArray(filters.status) ? filters.status as string[] : []).filter((x) => x !== s))}><X className="w-3 h-3" /></button>
                  </span>
                ))}
                {!hideCategoryFilter && (Array.isArray(filters.category) ? filters.category : filters.category ? [filters.category] : []).map((c) => (
                  <span key={`cat-${c}`} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-medium border border-blue-100">
                    {c}
                    <button onClick={() => onCategoryChange((Array.isArray(filters.category) ? filters.category as string[] : []).filter((x) => x !== c))}><X className="w-3 h-3" /></button>
                  </span>
                ))}
                {(Array.isArray(filters.type) ? filters.type : filters.type ? [filters.type] : []).map((t) => (
                  <span key={`type-${t}`} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-medium border border-blue-100">
                    {t}
                    <button onClick={() => onTypeChange?.((Array.isArray(filters.type) ? filters.type as string[] : []).filter((x) => x !== t))}><X className="w-3 h-3" /></button>
                  </span>
                ))}
                {(Array.isArray(filters.color) ? filters.color : filters.color ? [filters.color] : []).map((c) => (
                  <span key={`color-${c}`} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-medium border border-blue-100">
                    {c}
                    <button onClick={() => onColorChange?.((Array.isArray(filters.color) ? filters.color as string[] : []).filter((x) => x !== c))}><X className="w-3 h-3" /></button>
                  </span>
                ))}
                {(Array.isArray(filters.supplier) ? filters.supplier : filters.supplier ? [filters.supplier] : []).map((s) => (
                  <span key={`sup-${s}`} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-medium border border-blue-100">
                    {s}
                    <button onClick={() => onSupplierChange?.((Array.isArray(filters.supplier) ? filters.supplier as string[] : []).filter((x) => x !== s))}><X className="w-3 h-3" /></button>
                  </span>
                ))}
              </div>
            )}

            {/* masonry 2-column grid */}
            <div className="flex gap-3 pb-32">
              <div className="flex-1 flex flex-col gap-3">
                {mobileMaterials.filter((_, i) => i % 2 === 0).map((material) => (
                  <MobileGridCard
                    key={material._id || material.id}
                    material={material}
                    onView={onView}
                    onEdit={onEdit}
                    onOrder={onOrder}
                    onRecordUsage={onRecordUsage}
                  />
                ))}
              </div>
              <div className="flex-1 flex flex-col gap-3">
                {mobileMaterials.filter((_, i) => i % 2 === 1).map((material) => (
                  <MobileGridCard
                    key={material._id || material.id}
                    material={material}
                    onView={onView}
                    onEdit={onEdit}
                    onOrder={onOrder}
                    onRecordUsage={onRecordUsage}
                  />
                ))}
              </div>
            </div>

            {/* Infinite scroll sentinel */}
            <div ref={sentinelRef} className="h-4" />
            {mobileLoadingMore && (
              <div className="flex justify-center py-4">
                <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-blue-600" />
              </div>
            )}

            {/* Empty state */}
            {mobileMaterials.length === 0 && !loading && !mobileLoadingMore && (
              <div className="py-16 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 10V11" />
                  </svg>
                </div>
                <p className="text-gray-500 text-sm">No materials found</p>
                {(filters.search || activeFilterCount > 0) && (
                  <p className="text-gray-400 text-xs mt-1">Try adjusting your search or filters</p>
                )}
              </div>
            )}

            {/* Sticky SORT / FILTER bar — matches RN app */}
            <div className="fixed bottom-16 left-0 right-0 z-20 flex border-t border-gray-200 bg-white">
              <button
                onClick={() => setShowSort(true)}
                className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold text-gray-700 active:bg-gray-50"
              >
                <AlignLeft className="w-4 h-4" />
                SORT
              </button>
              <div className="w-px bg-gray-200" />
              <button
                onClick={() => setShowFilter(true)}
                className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold active:bg-gray-50 relative"
                style={activeFilterCount > 0 ? { color: '#2563eb' } : { color: '#374151' }}
              >
                <SlidersHorizontal className="w-4 h-4" />
                FILTER
                {activeFilterCount > 0 && (
                  <span className="absolute top-1.5 right-6 w-4 h-4 text-[9px] font-bold bg-blue-600 text-white rounded-full flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Empty State (desktop) */}
          {materials.length === 0 && !loading && (
            <div className="hidden lg:block bg-white rounded-lg border border-gray-200 p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Materials Found</h3>
              <p className="text-gray-600">
                {filters.search || filters.category || filters.status ? 'Try adjusting your filters' : 'No materials have been added yet'}
              </p>
            </div>
          )}

          {/* Pagination (desktop only) */}
          {materials.length > 0 && (
            <div className="hidden lg:block">
              <MaterialPagination totalMaterials={totalMaterials} filters={filters} onPageChange={onPageChange} onLimitChange={onLimitChange} />
            </div>
          )}
        </>
      )}

      {/* Bottom sheets */}
      {showSort && (
        <SortSheet
          filters={filters}
          onSortChange={(by, order) => { onSortChange?.(by, order); setShowSort(false); }}
          onClose={() => setShowSort(false)}
        />
      )}
      {showFilter && (
        <MaterialMobileFilterSheet
          filters={filters}
          excludeCategories={excludeCategories}
          hideCategorySection={hideCategoryFilter}
          onApply={(f) => {
            if (f.status !== undefined) onStatusChange(f.status as string[]);
            if (f.category !== undefined) onCategoryChange(f.category as string[]);
            if (f.type !== undefined) onTypeChange?.(f.type as string[]);
            if (f.color !== undefined) onColorChange?.(f.color as string[]);
            if (f.supplier !== undefined) onSupplierChange?.(f.supplier as string[]);
          }}
          onClose={() => setShowFilter(false)}
        />
      )}
    </>
  );
}
