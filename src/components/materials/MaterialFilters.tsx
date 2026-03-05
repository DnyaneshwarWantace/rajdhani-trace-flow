import { useState, useEffect } from 'react';
import { MultiSelect } from '@/components/ui/multi-select';
import { DebouncedSearchInput } from '@/components/ui/DebouncedSearchInput';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MaterialService } from '@/services/materialService';
import { DropdownService } from '@/services/dropdownService';
import type { MaterialFilters } from '@/types/material';

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
      const { materials } = await MaterialService.getMaterials({ limit: 1000 });
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
  return (
    <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      {/* Row 1: Search, All Status, All Type (+ All Categories when on Materials) */}
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

      {/* Row 2: All Colors, All Suppliers, Sorting */}
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
  );
}

