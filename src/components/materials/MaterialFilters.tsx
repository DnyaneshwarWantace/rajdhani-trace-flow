import { useState, useEffect } from 'react';
import { MultiSelect } from '@/components/ui/multi-select';
import { DebouncedSearchInput } from '@/components/ui/DebouncedSearchInput';
import { MaterialService } from '@/services/materialService';
import type { MaterialFilters } from '@/types/material';

interface MaterialFiltersProps {
  filters: MaterialFilters;
  viewMode: 'grid' | 'table';
  onSearchChange: (value: string) => void;
  onCategoryChange: (values: string[]) => void;
  onStatusChange: (values: string[]) => void;
  onTypeChange?: (values: string[]) => void;
  onColorChange?: (values: string[]) => void;
  onSupplierChange?: (values: string[]) => void;
  onViewModeChange: (mode: 'grid' | 'table') => void;
}

export default function MaterialFilters({
  filters,
  viewMode,
  onSearchChange,
  onStatusChange,
  onTypeChange,
  onColorChange,
  onSupplierChange,
  onViewModeChange,
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
      {/* First Row: Search, Status, View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 mb-3">
        {/* Search */}
        <DebouncedSearchInput
          value={filters.search || ''}
          onChange={onSearchChange}
          placeholder="Search materials (min 3 characters)..."
          minCharacters={3}
          debounceMs={500}
          className="lg:col-span-6"
          showCounter={true}
        />

        {/* Status Filter - Multi-select */}
        <div className="lg:col-span-4">
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

        {/* View Mode Toggle - Only Grid on mobile, both options on desktop */}
        <div className="lg:col-span-2 flex items-center gap-2">
          <span className="text-sm text-gray-600 whitespace-nowrap hidden lg:inline">View:</span>

          {/* Desktop: Show both Table and Grid */}
          <button
            onClick={() => onViewModeChange('table')}
            className={`hidden lg:flex flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              viewMode === 'table'
                ? 'bg-primary-100 text-primary-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Table
          </button>
          <button
            onClick={() => onViewModeChange('grid')}
            className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              viewMode === 'grid'
                ? 'bg-primary-100 text-primary-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Grid
          </button>
        </div>
      </div>

      {/* Second Row: Additional Filters (Type, Color, Supplier) */}
      {(onTypeChange || onColorChange || onSupplierChange) && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
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
    </div>
  );
}

