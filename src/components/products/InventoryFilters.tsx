import { useState, useEffect } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MultiSelect } from '@/components/ui/multi-select';
import { DebouncedSearchInput } from '@/components/ui/DebouncedSearchInput';
import { ProductService } from '@/services/productService';
import type { ProductFilters } from '@/types/product';

interface InventoryFiltersProps {
  filters: ProductFilters;
  viewMode: 'grid' | 'table' | 'grouped';
  onSearchChange: (value: string) => void;
  onCategoryChange: (values: string[]) => void;
  onStatusChange: (value: string) => void;
  onViewModeChange: (mode: 'grid' | 'table' | 'grouped') => void;
  onColorChange?: (values: string[]) => void;
  onPatternChange?: (values: string[]) => void;
  onLengthChange?: (values: string[]) => void;
  onWidthChange?: (values: string[]) => void;
  onWeightChange?: (values: string[]) => void;
}

export default function InventoryFilters({
  filters,
  viewMode,
  onSearchChange,
  onCategoryChange,
  onStatusChange,
  onViewModeChange,
  onColorChange,
  onPatternChange,
  onLengthChange,
  onWidthChange,
  onWeightChange,
}: InventoryFiltersProps) {
  const [categories, setCategories] = useState<string[]>([]);
  const [colors, setColors] = useState<string[]>([]);
  const [patterns, setPatterns] = useState<string[]>([]);
  const [lengths, setLengths] = useState<string[]>([]);
  const [widths, setWidths] = useState<string[]>([]);
  const [weights, setWeights] = useState<string[]>([]);

  useEffect(() => {
    loadFilterOptions();
  }, []);

  const loadFilterOptions = async () => {
    try {
      // Fetch all products to extract unique filter values
      const response = await ProductService.getProducts({ limit: 1000 });
      const products = response.products || [];

      // Extract unique categories
      const uniqueCategories = Array.from(
        new Set(products.map((p: any) => p.category).filter(Boolean))
      ).sort();
      setCategories(uniqueCategories);

      // Extract unique colors
      const uniqueColors = Array.from(
        new Set(products.map((p: any) => p.color).filter((c) => c && c !== 'N/A'))
      ).sort();
      setColors(uniqueColors);

      // Extract unique patterns
      const uniquePatterns = Array.from(
        new Set(products.map((p: any) => p.pattern).filter((p) => p && p !== 'N/A'))
      ).sort();
      setPatterns(uniquePatterns);

      // Extract unique lengths with units
      const lengthsWithUnits = products
        .map((p: any) => {
          if (!p.length) return null;
          const unit = p.length_unit || '';
          return `${p.length} ${unit}`.trim();
        })
        .filter((v): v is string => Boolean(v));
      const uniqueLengths = Array.from(new Set(lengthsWithUnits))
        .sort((a, b) => parseFloat(a) - parseFloat(b));
      setLengths(uniqueLengths);

      // Extract unique widths with units
      const widthsWithUnits = products
        .map((p: any) => {
          if (!p.width) return null;
          const unit = p.width_unit || '';
          return `${p.width} ${unit}`.trim();
        })
        .filter((v): v is string => Boolean(v));
      const uniqueWidths = Array.from(new Set(widthsWithUnits))
        .sort((a, b) => parseFloat(a) - parseFloat(b));
      setWidths(uniqueWidths);

      // Extract unique weights with units
      const weightsWithUnits = products
        .map((p: any) => {
          if (!p.weight) return null;
          const unit = p.weight_unit || '';
          return `${p.weight} ${unit}`.trim();
        })
        .filter((v): v is string => Boolean(v));
      const uniqueWeights = Array.from(new Set(weightsWithUnits))
        .sort((a, b) => parseFloat(a) - parseFloat(b));
      setWeights(uniqueWeights);
    } catch (error) {
      console.error('Error loading filter options:', error);
    }
  };

  return (
    <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      {/* First Row: Search, Category, Status, View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 mb-3">
        {/* Search */}
        <DebouncedSearchInput
          value={filters.search || ''}
          onChange={onSearchChange}
          placeholder="Search products (min 3 characters)..."
          minCharacters={3}
          debounceMs={500}
          className="lg:col-span-4"
          showCounter={true}
        />

        {/* Category Filter - Multi-select */}
        <div className="lg:col-span-3">
          <MultiSelect
            options={categories.map(cat => ({ label: cat, value: cat }))}
            selected={Array.isArray(filters.category) ? filters.category : (filters.category ? [filters.category] : [])}
            onChange={onCategoryChange}
            placeholder="All Categories"
          />
        </div>

        {/* Status Filter */}
        <div className="lg:col-span-3">
          <Select value={filters.status || 'all'} onValueChange={(value) => onStatusChange(value === 'all' ? '' : value)}>
            <SelectTrigger>
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="in-stock">In Stock</SelectItem>
              <SelectItem value="low-stock">Low Stock</SelectItem>
              <SelectItem value="out-of-stock">Out of Stock</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* View Mode Toggle - Only Grid on mobile, all options on desktop */}
        <div className="lg:col-span-3 flex items-center gap-2">
          <span className="text-sm text-gray-600 whitespace-nowrap hidden lg:inline">View:</span>

          {/* Desktop: Show all 3 options */}
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
          <button
            onClick={() => onViewModeChange('grouped')}
            className={`hidden lg:flex flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              viewMode === 'grouped'
                ? 'bg-primary-100 text-primary-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Grouped
          </button>
        </div>
      </div>

      {/* Second Row: Additional Filters (Color, Pattern, Length, Width, Weight) */}
      {(onColorChange || onPatternChange || onLengthChange || onWidthChange || onWeightChange) && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Color Filter - Multi-select */}
          {onColorChange && (
            <MultiSelect
              options={colors.map(color => ({ label: color, value: color }))}
              selected={Array.isArray(filters.color) ? filters.color : (filters.color ? [filters.color] : [])}
              onChange={onColorChange}
              placeholder="All Colors"
            />
          )}

          {/* Pattern Filter - Multi-select */}
          {onPatternChange && (
            <MultiSelect
              options={patterns.map(pattern => ({ label: pattern, value: pattern }))}
              selected={Array.isArray(filters.pattern) ? filters.pattern : (filters.pattern ? [filters.pattern] : [])}
              onChange={onPatternChange}
              placeholder="All Patterns"
            />
          )}

          {/* Length Filter - Multi-select */}
          {onLengthChange && (
            <MultiSelect
              options={lengths.map(length => ({ label: length, value: length }))}
              selected={Array.isArray(filters.length) ? filters.length : (filters.length ? [filters.length] : [])}
              onChange={onLengthChange}
              placeholder="All Lengths"
            />
          )}

          {/* Width Filter - Multi-select */}
          {onWidthChange && (
            <MultiSelect
              options={widths.map(width => ({ label: width, value: width }))}
              selected={Array.isArray(filters.width) ? filters.width : (filters.width ? [filters.width] : [])}
              onChange={onWidthChange}
              placeholder="All Widths"
            />
          )}

          {/* Weight Filter - Multi-select */}
          {onWeightChange && (
            <MultiSelect
              options={weights.map(weight => ({ label: weight, value: weight }))}
              selected={Array.isArray(filters.weight) ? filters.weight : (filters.weight ? [filters.weight] : [])}
              onChange={onWeightChange}
              placeholder="All Weights"
            />
          )}
        </div>
      )}
    </div>
  );
}

