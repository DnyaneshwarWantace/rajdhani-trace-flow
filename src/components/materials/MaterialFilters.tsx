import { useState, useEffect } from 'react';
import { MultiSelect } from '@/components/ui/multi-select';
import { DebouncedSearchInput } from '@/components/ui/DebouncedSearchInput';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MaterialService } from '@/services/materialService';
import { DropdownService } from '@/services/dropdownService';
import type { MaterialFilters } from '@/types/material';
import { SlidersHorizontal, ChevronDown, ChevronUp } from 'lucide-react';

interface MaterialFiltersProps {
  filters: MaterialFilters;
  onSearchChange: (value: string) => void;
  onCategoryChange?: (values: string[]) => void;
  onStatusChange: (values: string[]) => void;
  onTypeChange?: (values: string[]) => void;
  onColorChange?: (values: string[]) => void;
  onSupplierChange?: (values: string[]) => void;
  onSortChange?: (sortBy: string, sortOrder: 'asc' | 'desc') => void;
  /** Categories to hide from the filter (e.g. ["Ink"] so Ink is only in Ink Management) */
  excludeCategories?: string[];
}

export default function MaterialFilters({
  filters,
  onSearchChange,
  onCategoryChange,
  onStatusChange,
  onTypeChange,
  onColorChange,
  onSupplierChange,
  onSortChange,
  excludeCategories = [],
}: MaterialFiltersProps) {
  const [categories, setCategories] = useState<string[]>([]);
  const [types, setTypes] = useState<string[]>([]);
  const [colors, setColors] = useState<string[]>([]);
  const [suppliers, setSuppliers] = useState<string[]>([]);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  useEffect(() => {
    loadFilterOptions();
  }, [excludeCategories?.join(',')]);

  const loadFilterOptions = async () => {
    try {
      // Load category options from dropdown (material_category) so all configured options show
      const categoryOptions = await DropdownService.getOptionsByCategory('material_category');
      const fromDropdown = categoryOptions
        .filter((opt: any) => opt.value && opt.value.trim() !== '')
        .map((opt: any) => opt.value.trim());

      // Also get categories from materials (in case some exist in DB but not in dropdown)
      const { materials } = await MaterialService.getMaterials({
        limit: 1000,
        ...(excludeCategories?.includes('Ink') ? { usage_type: 'per_batch' } : {}),
      });
      const fromMaterials = Array.from(
        new Set(materials.map((m: any) => m.category).filter((c) => c && String(c).trim() !== '' && c !== 'N/A'))
      );
      let uniqueCategories = Array.from(new Set([...fromDropdown, ...fromMaterials])).sort();
      if (excludeCategories?.length) {
        uniqueCategories = uniqueCategories.filter((c) => !excludeCategories!.includes(c));
      }
      setCategories(uniqueCategories);

      // Extract unique types
      const uniqueTypes = Array.from(
        new Set(materials.map((m: any) => m.type).filter((t) => t && t !== 'N/A'))
      ).sort();
      setTypes(uniqueTypes);

      // Extract unique colors
      const uniqueColors = Array.from(
        new Set(materials.map((m: any) => m.color).filter((c) => c && c !== 'N/A'))
      ).sort();
      setColors(uniqueColors);

      // Extract unique suppliers
      const uniqueSuppliers = Array.from(
        new Set(materials.map((m: any) => m.supplier_name).filter(Boolean))
      ).sort();
      setSuppliers(uniqueSuppliers);
    } catch (error) {
      console.error('Error loading filter options:', error);
    }
  };
  const activeFilterCount = [
    ...(Array.isArray(filters.status) ? filters.status : []),
    ...(Array.isArray(filters.category) ? filters.category : []),
    ...(Array.isArray(filters.type) ? filters.type : []),
    ...(Array.isArray(filters.color) ? filters.color : []),
    ...(Array.isArray(filters.supplier) ? filters.supplier : []),
  ].length;

  return (
    <>
      {/* Mobile layout */}
      <div className="lg:hidden mb-4">
        {/* Search + filter toggle row */}
        <div className="flex gap-2">
          <div className="flex-1 min-w-0">
            <DebouncedSearchInput
              value={filters.search || ''}
              onChange={onSearchChange}
              placeholder="Search materials..."
              minCharacters={3}
              debounceMs={500}
              className="w-full"
              showCounter={false}
            />
          </div>
          <button
            onClick={() => setMobileFiltersOpen((v) => !v)}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3 h-10 rounded-xl border text-sm font-medium transition-colors ${
              activeFilterCount > 0
                ? 'border-blue-300 bg-blue-50 text-blue-700'
                : 'border-gray-200 bg-white text-gray-600'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            {activeFilterCount > 0 && (
              <span className="inline-flex items-center justify-center w-4 h-4 text-[9px] font-bold bg-blue-600 text-white rounded-full">
                {activeFilterCount}
              </span>
            )}
            {mobileFiltersOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Expandable filter panel */}
        {mobileFiltersOpen && (
          <div className="mt-3 bg-white rounded-2xl border border-gray-200 p-3 space-y-3 shadow-sm">
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Status</p>
              <MultiSelect
                options={[
                  { label: 'In Stock', value: 'in-stock' },
                  { label: 'Low Stock', value: 'low-stock' },
                  { label: 'Out of Stock', value: 'out-of-stock' },
                  { label: 'Overstock', value: 'overstock' },
                ]}
                selected={Array.isArray(filters.status) ? filters.status : (filters.status ? [filters.status] : [])}
                onChange={onStatusChange}
                placeholder="All Status"
              />
            </div>
            {onTypeChange && (
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Type</p>
                <MultiSelect
                  options={types.map(type => ({ label: type, value: type }))}
                  selected={Array.isArray(filters.type) ? filters.type : (filters.type ? [filters.type] : [])}
                  onChange={onTypeChange}
                  placeholder="All Types"
                />
              </div>
            )}
            {onCategoryChange && (
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Category</p>
                <MultiSelect
                  options={categories.map(cat => ({ label: cat, value: cat }))}
                  selected={Array.isArray(filters.category) ? filters.category : (filters.category ? [filters.category] : [])}
                  onChange={onCategoryChange}
                  placeholder="All Categories"
                />
              </div>
            )}
            {onColorChange && (
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Color</p>
                <MultiSelect
                  options={colors.map(color => ({ label: color, value: color }))}
                  selected={Array.isArray(filters.color) ? filters.color : (filters.color ? [filters.color] : [])}
                  onChange={onColorChange}
                  placeholder="All Colors"
                />
              </div>
            )}
            {onSupplierChange && (
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Supplier</p>
                <MultiSelect
                  options={suppliers.map(supplier => ({ label: supplier, value: supplier }))}
                  selected={Array.isArray(filters.supplier) ? filters.supplier : (filters.supplier ? [filters.supplier] : [])}
                  onChange={onSupplierChange}
                  placeholder="All Suppliers"
                />
              </div>
            )}
            {onSortChange && (
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Sort By</p>
                <div className="flex gap-2">
                  <Select
                    value={filters.sortBy || 'name'}
                    onValueChange={(value) => onSortChange(value, filters.sortOrder || 'asc')}
                  >
                    <SelectTrigger className="h-9 text-sm flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="name">Name</SelectItem>
                      <SelectItem value="stock">Stock</SelectItem>
                      <SelectItem value="category">Category</SelectItem>
                      <SelectItem value="type">Type</SelectItem>
                      <SelectItem value="supplier">Supplier</SelectItem>
                      <SelectItem value="recent">Recent</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select
                    value={filters.sortOrder || 'asc'}
                    onValueChange={(value: 'asc' | 'desc') => onSortChange(filters.sortBy || 'name', value)}
                  >
                    <SelectTrigger className="h-9 text-sm w-[110px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="asc">A → Z</SelectItem>
                      <SelectItem value="desc">Z → A</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Desktop layout */}
      <div className="hidden lg:block mb-6 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className={`grid grid-cols-1 gap-3 mb-3 sm:grid-cols-2 lg:grid-cols-3 ${onCategoryChange ? 'lg:grid-cols-4' : ''}`}>
          <div className="min-w-0">
            <DebouncedSearchInput
              value={filters.search || ''}
              onChange={onSearchChange}
              placeholder="Search materials (min 3 characters)..."
              minCharacters={3}
              debounceMs={500}
              className="w-full"
              showCounter={true}
            />
          </div>
          <div className="min-w-0">
            <MultiSelect
              options={[
                { label: 'In Stock', value: 'in-stock' },
                { label: 'Low Stock', value: 'low-stock' },
                { label: 'Out of Stock', value: 'out-of-stock' },
                { label: 'Overstock', value: 'overstock' },
              ]}
              selected={Array.isArray(filters.status) ? filters.status : (filters.status ? [filters.status] : [])}
              onChange={onStatusChange}
              placeholder="All Status"
            />
          </div>
          {onTypeChange && (
            <div className="min-w-0">
              <MultiSelect
                options={types.map(type => ({ label: type, value: type }))}
                selected={Array.isArray(filters.type) ? filters.type : (filters.type ? [filters.type] : [])}
                onChange={onTypeChange}
                placeholder="All Types"
              />
            </div>
          )}
          {onCategoryChange && (
            <div className="min-w-0">
              <MultiSelect
                options={categories.map(cat => ({ label: cat, value: cat }))}
                selected={Array.isArray(filters.category) ? filters.category : (filters.category ? [filters.category] : [])}
                onChange={onCategoryChange}
                placeholder="All Categories"
              />
            </div>
          )}
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {onColorChange && (
            <div className="min-w-0">
              <MultiSelect
                options={colors.map(color => ({ label: color, value: color }))}
                selected={Array.isArray(filters.color) ? filters.color : (filters.color ? [filters.color] : [])}
                onChange={onColorChange}
                placeholder="All Colors"
              />
            </div>
          )}
          {onSupplierChange && (
            <div className="min-w-0">
              <MultiSelect
                options={suppliers.map(supplier => ({ label: supplier, value: supplier }))}
                selected={Array.isArray(filters.supplier) ? filters.supplier : (filters.supplier ? [filters.supplier] : [])}
                onChange={onSupplierChange}
                placeholder="All Suppliers"
              />
            </div>
          )}
          {onSortChange && (
            <div className="flex flex-wrap items-center gap-2 min-w-0">
              <span className="text-sm font-medium text-gray-700 whitespace-nowrap">Sort by</span>
              <Select
                value={filters.sortBy || 'name'}
                onValueChange={(value) => onSortChange(value, filters.sortOrder || 'asc')}
              >
                <SelectTrigger className="h-9 text-sm flex-1 min-w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="stock">Stock</SelectItem>
                  <SelectItem value="category">Category</SelectItem>
                  <SelectItem value="type">Material Type</SelectItem>
                  <SelectItem value="supplier">Supplier</SelectItem>
                  <SelectItem value="recent">Recently Added</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={filters.sortOrder || 'asc'}
                onValueChange={(value: 'asc' | 'desc') => onSortChange(filters.sortBy || 'name', value)}
              >
                <SelectTrigger className="h-9 text-sm w-[130px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="asc">Ascending</SelectItem>
                  <SelectItem value="desc">Descending</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

