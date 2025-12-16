import { useState, useEffect } from 'react';
import { MultiSelect } from '@/components/ui/multi-select';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { DropdownService } from '@/services/dropdownService';
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
  onCategoryChange,
  onStatusChange,
  onTypeChange,
  onColorChange,
  onSupplierChange,
  onViewModeChange,
}: MaterialFiltersProps) {
  const [categories, setCategories] = useState<string[]>([]);
  const [types, setTypes] = useState<string[]>([]);
  const [colors, setColors] = useState<string[]>([]);
  const [suppliers, setSuppliers] = useState<string[]>([]);

  useEffect(() => {
    loadFilterOptions();
  }, []);

  const loadFilterOptions = async () => {
    try {
      // Load categories from dropdown service
      const categoryOptions = await DropdownService.getDropdownsByCategory('material_category');
      setCategories(categoryOptions.map((opt) => opt.value).filter(Boolean));

      // Load other filter options from materials
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
      {/* First Row: Search, Category, Status, View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 mb-3">
        {/* Search */}
        <div className="relative lg:col-span-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            type="text"
            placeholder="Search materials..."
            value={filters.search || ''}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2"
          />
        </div>

        {/* Category Filter - Multi-select */}
        <div className="lg:col-span-3">
          <MultiSelect
            options={categories.map(cat => ({ label: cat, value: cat }))}
            selected={Array.isArray(filters.category) ? filters.category : (filters.category ? [filters.category] : [])}
            onChange={onCategoryChange}
            placeholder="All Categories"
          />
        </div>

        {/* Status Filter - Multi-select */}
        <div className="lg:col-span-3">
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

