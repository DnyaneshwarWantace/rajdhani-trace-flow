import { useState, useEffect } from 'react';
import { MultiSelect } from '@/components/ui/multi-select';
import { DebouncedSearchInput } from '@/components/ui/DebouncedSearchInput';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ProductService } from '@/services/productService';
import type { ProductFilters } from '@/types/product';

interface InventoryFiltersProps {
  filters: ProductFilters;
  onSearchChange: (value: string) => void;
  onCategoryChange: (values: string[]) => void;
  onStatusChange: (values: string[]) => void;
  onColorChange?: (values: string[]) => void;
  onPatternChange?: (values: string[]) => void;
  onLengthChange?: (values: string[]) => void;
  onWidthChange?: (values: string[]) => void;
  onWeightChange?: (values: string[]) => void;
  onSortChange?: (sortBy: string, sortOrder: 'asc' | 'desc') => void;
}

export default function InventoryFilters({
  filters,
  onSearchChange,
  onCategoryChange,
  onStatusChange,
  onColorChange,
  onPatternChange,
  onLengthChange,
  onWidthChange,
  onWeightChange,
  onSortChange,
}: InventoryFiltersProps) {
  const [categories, setCategories] = useState<string[]>([]);
  const [colors, setColors] = useState<string[]>([]);
  const [patterns, setPatterns] = useState<string[]>([]);
  const [lengths, setLengths] = useState<string[]>([]);
  const [widths, setWidths] = useState<string[]>([]);
  const [weights, setWeights] = useState<string[]>([]);
  const [loadingOptions, setLoadingOptions] = useState<boolean>(false);

  useEffect(() => {
    loadFilterOptions();
  }, []);

  const loadFilterOptions = async () => {
    try {
      setLoadingOptions(true);
      // Use optimized dropdown-data API; fallback to products for any missing group
      const data = await ProductService.getDropdownData();

      const mapOptions = (arr?: { value: string }[]) =>
        (arr || [])
          .map((o) => o.value)
          .filter((v) => v && v !== 'N/A')
          .sort();

      // Categories / color / pattern from dropdown API
      setCategories(mapOptions(data.categories));
      setColors(mapOptions(data.colors));
      setPatterns(mapOptions(data.patterns));

      // Length / width / weight: prefer dropdown API, but if missing, fallback to scanning products
      let lengthValues = mapOptions(data.lengths);
      let widthValues = mapOptions(data.widths);
      let weightValues = mapOptions(data.weights);

      if (lengthValues.length === 0 || widthValues.length === 0 || weightValues.length === 0) {
        try {
          const { products } = await ProductService.getProducts({ limit: 1000 });
          const all = products || [];

          if (lengthValues.length === 0) {
            const lengthsWithUnits = all
              .map((p: any) => {
                if (!p.length) return null;
                const unit = p.length_unit || '';
                return `${p.length} ${unit}`.trim();
              })
              .filter((v): v is string => Boolean(v));
            lengthValues = Array.from(new Set(lengthsWithUnits)).sort((a, b) => parseFloat(a) - parseFloat(b));
          }

          if (widthValues.length === 0) {
            const widthsWithUnits = all
              .map((p: any) => {
                if (!p.width) return null;
                const unit = p.width_unit || '';
                return `${p.width} ${unit}`.trim();
              })
              .filter((v): v is string => Boolean(v));
            widthValues = Array.from(new Set(widthsWithUnits)).sort((a, b) => parseFloat(a) - parseFloat(b));
          }

          if (weightValues.length === 0) {
            const weightsWithUnits = all
              .map((p: any) => {
                if (!p.weight) return null;
                const unit = p.weight_unit || '';
                return `${p.weight} ${unit}`.trim();
              })
              .filter((v): v is string => Boolean(v));
            weightValues = Array.from(new Set(weightsWithUnits)).sort((a, b) => parseFloat(a) - parseFloat(b));
          }
        } catch (fallbackError) {
          console.error('Error in fallback filter option loader:', fallbackError);
        }
      }

      setLengths(lengthValues);
      setWidths(widthValues);
      setWeights(weightValues);
    } catch (error) {
      console.error('Error loading filter options:', error);
    } finally {
      setLoadingOptions(false);
    }
  };

  return (
    <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      {/* First Row: Search, Category, Status */}
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
            loading={loadingOptions}
          />
        </div>

        {/* Status Filter - Multi-select */}
        <div className="lg:col-span-5">
          <MultiSelect
            options={[
              { label: 'In Stock', value: 'in-stock' },
              { label: 'Low Stock', value: 'low-stock' },
              { label: 'Out of Stock', value: 'out-of-stock' },
            ]}
            selected={Array.isArray(filters.status) ? filters.status : (filters.status ? [filters.status] : [])}
            onChange={onStatusChange}
            placeholder="All Status"
          />
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
              loading={loadingOptions}
            />
          )}

          {/* Pattern Filter - Multi-select */}
          {onPatternChange && (
            <MultiSelect
              options={patterns.map(pattern => ({ label: pattern, value: pattern }))}
              selected={Array.isArray(filters.pattern) ? filters.pattern : (filters.pattern ? [filters.pattern] : [])}
              onChange={onPatternChange}
              placeholder="All Patterns"
              loading={loadingOptions}
            />
          )}

          {/* Length Filter - Multi-select */}
          {onLengthChange && (
            <MultiSelect
              options={lengths.map(length => ({ label: length, value: length }))}
              selected={Array.isArray(filters.length) ? filters.length : (filters.length ? [filters.length] : [])}
              onChange={onLengthChange}
              placeholder="All Lengths"
              loading={loadingOptions}
            />
          )}

          {/* Width Filter - Multi-select */}
          {onWidthChange && (
            <MultiSelect
              options={widths.map(width => ({ label: width, value: width }))}
              selected={Array.isArray(filters.width) ? filters.width : (filters.width ? [filters.width] : [])}
              onChange={onWidthChange}
              placeholder="All Widths"
              loading={loadingOptions}
            />
          )}

          {/* Weight Filter - Multi-select */}
          {onWeightChange && (
            <MultiSelect
              options={weights.map(weight => ({ label: weight, value: weight }))}
              selected={Array.isArray(filters.weight) ? filters.weight : (filters.weight ? [filters.weight] : [])}
              onChange={onWeightChange}
              placeholder="All Weights"
              loading={loadingOptions}
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
            <SelectTrigger className="w-[160px] h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="stock">Stock</SelectItem>
              <SelectItem value="category">Category</SelectItem>
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

