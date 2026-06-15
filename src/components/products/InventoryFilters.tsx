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
  const [colorCodeMap, setColorCodeMap] = useState<Record<string, string>>({});
  const [patternImageMap, setPatternImageMap] = useState<Record<string, string>>({});
  const [loadingOptions, setLoadingOptions] = useState<boolean>(false);

  useEffect(() => {
    loadFilterOptions();
  }, []);

  const loadFilterOptions = async () => {
    try {
      setLoadingOptions(true);
      const data = await ProductService.getDropdownData();

      const mapOptions = (arr?: { value: string }[]) =>
        (arr || []).map((o) => o.value).filter((v) => v && v !== 'N/A').sort();

      setCategories(mapOptions(data.categories));
      setColors(mapOptions(data.colors));
      setPatterns(mapOptions(data.patterns));

      const nextColorCodeMap: Record<string, string> = {};
      (data.colors || []).forEach((item: any) => {
        if (item?.value && item?.color_code) nextColorCodeMap[item.value] = item.color_code;
      });
      setColorCodeMap(nextColorCodeMap);

      const nextPatternImageMap: Record<string, string> = {};
      (data.patterns || []).forEach((item: any) => {
        if (item?.value && item?.image_url) nextPatternImageMap[item.value] = item.image_url;
      });
      setPatternImageMap(nextPatternImageMap);

      let lengthValues = mapOptions(data.lengths);
      let widthValues = mapOptions(data.widths);
      let weightValues = mapOptions(data.weights);

      if (lengthValues.length === 0 || widthValues.length === 0 || weightValues.length === 0) {
        try {
          const { products } = await ProductService.getProducts({ limit: 1000 });
          const all = products || [];

          if (lengthValues.length === 0) {
            const vals = all.map((p: any) => p.length ? `${p.length} ${p.length_unit || ''}`.trim() : null).filter(Boolean) as string[];
            lengthValues = Array.from(new Set(vals)).sort((a, b) => parseFloat(a) - parseFloat(b));
          }
          if (widthValues.length === 0) {
            const vals = all.map((p: any) => p.width ? `${p.width} ${p.width_unit || ''}`.trim() : null).filter(Boolean) as string[];
            widthValues = Array.from(new Set(vals)).sort((a, b) => parseFloat(a) - parseFloat(b));
          }
          if (weightValues.length === 0) {
            const vals = all.map((p: any) => p.weight ? `${p.weight} ${p.weight_unit || ''}`.trim() : null).filter(Boolean) as string[];
            weightValues = Array.from(new Set(vals)).sort((a, b) => parseFloat(a) - parseFloat(b));
          }
        } catch (e) {
          console.error('Error in fallback filter option loader:', e);
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

  const sortByLabel = (v: string) =>
    v === 'name' ? 'Name' : v === 'stock' ? 'Stock' : v === 'category' ? 'Category' : 'Recent';

  return (
    <div className="mb-4 bg-white rounded-xl border border-gray-200 shadow-sm px-3 py-2.5">
      <div className="flex items-center gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none' }}>

        {/* Search */}
        <div className="shrink-0 w-52">
          <DebouncedSearchInput
            value={filters.search || ''}
            onChange={onSearchChange}
            placeholder="Search products…"
            minCharacters={3}
            debounceMs={500}
            showCounter={false}
          />
        </div>

        <div className="w-px h-6 bg-gray-200 shrink-0" />

        {/* Category */}
        <div className="shrink-0 w-36">
          <MultiSelect
            options={categories.map(c => ({ label: c, value: c }))}
            selected={Array.isArray(filters.category) ? filters.category : filters.category ? [filters.category as string] : []}
            onChange={onCategoryChange}
            placeholder="Category"
            loading={loadingOptions}
          />
        </div>

        {/* Status */}
        <div className="shrink-0 w-36">
          <MultiSelect
            options={[
              { label: 'In Stock', value: 'in-stock' },
              { label: 'Low Stock', value: 'low-stock' },
              { label: 'Out of Stock', value: 'out-of-stock' },
            ]}
            selected={Array.isArray(filters.status) ? filters.status : filters.status ? [filters.status as string] : []}
            onChange={onStatusChange}
            placeholder="Status"
          />
        </div>

        {/* Color */}
        {onColorChange && (
          <div className="shrink-0 w-32">
            <MultiSelect
              options={colors.map(c => ({ label: c, value: c, colorCode: colorCodeMap[c] }))}
              selected={Array.isArray(filters.color) ? filters.color : filters.color ? [filters.color as string] : []}
              onChange={onColorChange}
              placeholder="Color"
              loading={loadingOptions}
            />
          </div>
        )}

        {/* Pattern */}
        {onPatternChange && (
          <div className="shrink-0 w-32">
            <MultiSelect
              options={patterns.map(p => ({ label: p, value: p, imageUrl: patternImageMap[p] }))}
              selected={Array.isArray(filters.pattern) ? filters.pattern : filters.pattern ? [filters.pattern as string] : []}
              onChange={onPatternChange}
              placeholder="Pattern"
              loading={loadingOptions}
            />
          </div>
        )}

        {/* Length */}
        {onLengthChange && (
          <div className="shrink-0 w-28">
            <MultiSelect
              options={lengths.map(l => ({ label: l, value: l }))}
              selected={Array.isArray(filters.length) ? filters.length : filters.length ? [filters.length as string] : []}
              onChange={onLengthChange}
              placeholder="Length"
              loading={loadingOptions}
            />
          </div>
        )}

        {/* Width */}
        {onWidthChange && (
          <div className="shrink-0 w-28">
            <MultiSelect
              options={widths.map(w => ({ label: w, value: w }))}
              selected={Array.isArray(filters.width) ? filters.width : filters.width ? [filters.width as string] : []}
              onChange={onWidthChange}
              placeholder="Width"
              loading={loadingOptions}
            />
          </div>
        )}

        {/* GSM */}
        {onWeightChange && (
          <div className="shrink-0 w-28">
            <MultiSelect
              options={weights.map(w => ({ label: w, value: w }))}
              selected={Array.isArray(filters.weight) ? filters.weight : filters.weight ? [filters.weight as string] : []}
              onChange={onWeightChange}
              placeholder="GSM"
              loading={loadingOptions}
            />
          </div>
        )}

        {onSortChange && (
          <>
            <div className="w-px h-6 bg-gray-200 shrink-0" />

            {/* Sort by */}
            <div className="shrink-0 w-32">
              <Select
                value={filters.sortBy || 'name'}
                onValueChange={(v) => onSortChange(v, filters.sortOrder || 'asc')}
              >
                <SelectTrigger className="h-9 text-sm border-gray-200">
                  <SelectValue>{sortByLabel(filters.sortBy || 'name')}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="stock">Stock</SelectItem>
                  <SelectItem value="category">Category</SelectItem>
                  <SelectItem value="recent">Recent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Sort order toggle */}
            <button
              onClick={() => onSortChange(filters.sortBy || 'name', filters.sortOrder === 'asc' ? 'desc' : 'asc')}
              className="shrink-0 h-9 w-9 flex items-center justify-center rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
              title={filters.sortOrder === 'asc' ? 'Ascending' : 'Descending'}
            >
              {filters.sortOrder === 'asc' ? (
                <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                </svg>
              ) : (
                <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" />
                </svg>
              )}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
