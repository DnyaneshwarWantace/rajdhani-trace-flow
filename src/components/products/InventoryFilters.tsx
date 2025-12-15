import { useState, useEffect } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ProductService } from '@/services/productService';
import type { ProductFilters } from '@/types/product';

interface InventoryFiltersProps {
  filters: ProductFilters;
  viewMode: 'grid' | 'table';
  onSearchChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onViewModeChange: (mode: 'grid' | 'table') => void;
  onColorChange?: (value: string) => void;
  onPatternChange?: (value: string) => void;
  onLengthChange?: (value: string) => void;
  onWidthChange?: (value: string) => void;
  onWeightChange?: (value: string) => void;
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

      // Extract unique lengths, widths, weights
      const uniqueLengths = Array.from(
        new Set(products.map((p: any) => p.length).filter(Boolean))
      ).sort((a, b) => parseFloat(a) - parseFloat(b));
      setLengths(uniqueLengths);

      const uniqueWidths = Array.from(
        new Set(products.map((p: any) => p.width).filter(Boolean))
      ).sort((a, b) => parseFloat(a) - parseFloat(b));
      setWidths(uniqueWidths);

      const uniqueWeights = Array.from(
        new Set(products.map((p: any) => p.weight).filter(Boolean))
      ).sort((a, b) => parseFloat(a) - parseFloat(b));
      setWeights(uniqueWeights);
    } catch (error) {
      console.error('Error loading filter options:', error);
    }
  };

  return (
    <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      {/* First Row: Search, Category, Status, View */}
      <div className="flex flex-col lg:flex-row gap-3 items-start lg:items-center mb-3">
        {/* Search */}
        <div className="relative flex-1 w-full lg:w-auto">
          <input
            type="text"
            placeholder="Search products..."
            value={filters.search || ''}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-colors"
          />
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        {/* Category Filter */}
        <div className="w-full lg:w-48">
          <Select value={filters.category || 'all'} onValueChange={(value) => onCategoryChange(value === 'all' ? '' : value)}>
            <SelectTrigger>
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Status Filter */}
        <div className="w-full lg:w-48">
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

        {/* View Mode Toggle */}
        <div className="flex items-center gap-2 w-full lg:w-auto">
          <span className="text-sm text-gray-600 whitespace-nowrap">View:</span>
          <button
            onClick={() => onViewModeChange('table')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              viewMode === 'table'
                ? 'bg-primary-100 text-primary-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Table
          </button>
          <button
            onClick={() => onViewModeChange('grid')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              viewMode === 'grid'
                ? 'bg-primary-100 text-primary-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Grid
          </button>
        </div>
      </div>

      {/* Second Row: Additional Filters (Color, Pattern, Length, Width, Weight) */}
      {(onColorChange || onPatternChange || onLengthChange || onWidthChange || onWeightChange) && (
        <>
          {/* Row 2a: Color, Pattern */}
          {(onColorChange || onPatternChange) && (
            <div className="flex flex-col lg:flex-row gap-3 items-start lg:items-center">
              {/* Color Filter */}
              {onColorChange && colors.length > 0 && (
                <div className="w-full lg:w-48">
                  <Select value={filters.color || 'all'} onValueChange={(value) => onColorChange(value === 'all' ? '' : value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Colors" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Colors</SelectItem>
                      {colors.map((color) => (
                        <SelectItem key={color} value={color}>
                          {color}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Pattern Filter */}
              {onPatternChange && patterns.length > 0 && (
                <div className="w-full lg:w-48">
                  <Select value={filters.pattern || 'all'} onValueChange={(value) => onPatternChange(value === 'all' ? '' : value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Patterns" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Patterns</SelectItem>
                      {patterns.map((pattern) => (
                        <SelectItem key={pattern} value={pattern}>
                          {pattern}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

          {/* Row 2b: Length, Width, Weight */}
          {(onLengthChange || onWidthChange || onWeightChange) && (
            <div className="flex flex-col lg:flex-row gap-3 items-start lg:items-center mt-3">
              {/* Length Filter */}
              {onLengthChange && lengths.length > 0 && (
                <div className="w-full lg:w-48">
                  <Select value={filters.length || 'all'} onValueChange={(value) => onLengthChange(value === 'all' ? '' : value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Lengths" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Lengths</SelectItem>
                      {lengths.map((length) => (
                        <SelectItem key={length} value={length}>
                          {length}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Width Filter */}
              {onWidthChange && widths.length > 0 && (
                <div className="w-full lg:w-48">
                  <Select value={filters.width || 'all'} onValueChange={(value) => onWidthChange(value === 'all' ? '' : value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Widths" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Widths</SelectItem>
                      {widths.map((width) => (
                        <SelectItem key={width} value={width}>
                          {width}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Weight Filter */}
              {onWeightChange && weights.length > 0 && (
                <div className="w-full lg:w-48">
                  <Select value={filters.weight || 'all'} onValueChange={(value) => onWeightChange(value === 'all' ? '' : value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Weights" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Weights</SelectItem>
                      {weights.map((weight) => (
                        <SelectItem key={weight} value={weight}>
                          {weight}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

