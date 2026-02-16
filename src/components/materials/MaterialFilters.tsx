import { useState, useEffect } from 'react';
import { MultiSelect } from '@/components/ui/multi-select';
import { DebouncedSearchInput } from '@/components/ui/DebouncedSearchInput';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MaterialService } from '@/services/materialService';
import type { MaterialFilters } from '@/types/material';

interface MaterialFiltersProps {
  filters: MaterialFilters;
  onSearchChange: (value: string) => void;
  onCategoryChange: (values: string[]) => void;
  onStatusChange: (values: string[]) => void;
  onTypeChange?: (values: string[]) => void;
  onColorChange?: (values: string[]) => void;
  onSupplierChange?: (values: string[]) => void;
  onSortChange?: (sortBy: string, sortOrder: 'asc' | 'desc') => void;
}

export default function MaterialFilters({
  filters,
  onSearchChange,
  onStatusChange,
  onTypeChange,
  onColorChange,
  onSupplierChange,
  onSortChange,
}: MaterialFiltersProps) {
  const [types, setTypes] = useState<string[]>([]);
  const [colors, setColors] = useState<string[]>([]);
  const [suppliers, setSuppliers] = useState<string[]>([]);

  useEffect(() => {
    loadFilterOptions();
  }, []);

  const loadFilterOptions = async () => {
    try {
      // Load filter options from materials
      const { materials } = await MaterialService.getMaterials({ limit: 1000 });

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
      {/* First Row: Search + Status on large only */}
      <div className="flex flex-wrap items-center gap-3 mb-3 lg:grid lg:grid-cols-12">
        {/* Search - grows on tablet, 6 cols on lg */}
        <div className="flex-1 min-w-0 lg:col-span-6">
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

        {/* Status - large screens only */}
        <div className="hidden lg:block lg:col-span-6">
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
      </div>

      {/* Second Row: Type, Color, Supplier - large screens only */}
      {(onTypeChange || onColorChange || onSupplierChange) && (
        <div className="hidden lg:grid grid-cols-1 lg:grid-cols-3 gap-3 mb-3">
          {/* Type Filter - Multi-select */}
          {onTypeChange && (
            <MultiSelect
              options={types.map(type => ({ label: type, value: type }))}
              selected={Array.isArray(filters.type) ? filters.type : (filters.type ? [filters.type] : [])}
              onChange={onTypeChange}
              placeholder="All Types"
            />
          )}

          {/* Color Filter - Multi-select */}
          {onColorChange && (
            <MultiSelect
              options={colors.map(color => ({ label: color, value: color }))}
              selected={Array.isArray(filters.color) ? filters.color : (filters.color ? [filters.color] : [])}
              onChange={onColorChange}
              placeholder="All Colors"
            />
          )}

          {/* Supplier Filter - Multi-select */}
          {onSupplierChange && (
            <MultiSelect
              options={suppliers.map(supplier => ({ label: supplier, value: supplier }))}
              selected={Array.isArray(filters.supplier) ? filters.supplier : (filters.supplier ? [filters.supplier] : [])}
              onChange={onSupplierChange}
              placeholder="All Suppliers"
            />
          )}
        </div>
      )}

      {/* Sorting Controls */}
      {onSortChange && (
        <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-200">
          <span className="text-sm font-medium text-gray-700 whitespace-nowrap">Sort by:</span>
          <Select
            value={filters.sortBy || 'name'}
            onValueChange={(value) => onSortChange(value, filters.sortOrder || 'asc')}
          >
            <SelectTrigger className="w-[200px] h-9 text-sm">
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
            <SelectTrigger className="w-[130px] h-9 text-sm">
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
  );
}

