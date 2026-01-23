import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { MultiSelect } from '@/components/ui/multi-select';

interface ProductFiltersProps {
  category: string;
  subcategoriesSelected: string[];
  colorsSelected: string[];
  patternsSelected: string[];
  lengthsSelected: string[];
  widthsSelected: string[];
  weightsSelected: string[];
  onCategoryChange: (value: string) => void;
  onSubcategoriesChange: (values: string[]) => void;
  onColorsChange: (values: string[]) => void;
  onPatternsChange: (values: string[]) => void;
  onLengthsChange: (values: string[]) => void;
  onWidthsChange: (values: string[]) => void;
  onWeightsChange: (values: string[]) => void;
  categories: string[];
  subcategories: string[];
  colors: string[];
  patterns: string[];
  lengths: string[];
  widths: string[];
  weights: string[];
}

export default function ProductFilters({
  category,
  subcategoriesSelected,
  colorsSelected,
  patternsSelected,
  lengthsSelected,
  widthsSelected,
  weightsSelected,
  onCategoryChange,
  onSubcategoriesChange,
  onColorsChange,
  onPatternsChange,
  onLengthsChange,
  onWidthsChange,
  onWeightsChange,
  categories,
  subcategories,
  colors,
  patterns,
  lengths,
  widths,
  weights,
}: ProductFiltersProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
      <div>
        <Label htmlFor="category-filter" className="text-xs font-medium text-gray-700">
          Category
        </Label>
        <Select value={category || 'all'} onValueChange={(value) => onCategoryChange(value === 'all' ? '' : value)}>
          <SelectTrigger id="category-filter" className="mt-1 h-8 text-xs">
            <SelectValue placeholder="All" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.filter(cat => cat && cat.trim()).map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="subcategory-filter" className="text-xs font-medium text-gray-700">
          Subcategory
        </Label>
        <div className="mt-1">
          <MultiSelect
            options={subcategories
              .filter((sub) => sub && sub.trim())
              .map((sub) => ({ label: sub, value: sub }))}
            selected={subcategoriesSelected}
            onChange={onSubcategoriesChange}
            placeholder="All"
            className="h-8 text-xs"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="color-filter" className="text-xs font-medium text-gray-700">
          Color
        </Label>
        <div className="mt-1">
          <MultiSelect
            options={colors.map((color) => ({ label: color, value: color }))}
            selected={colorsSelected}
            onChange={onColorsChange}
            placeholder="All"
            className="h-8 text-xs"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="pattern-filter" className="text-xs font-medium text-gray-700">
          Pattern
        </Label>
        <div className="mt-1">
          <MultiSelect
            options={patterns.map((pattern) => ({ label: pattern, value: pattern }))}
            selected={patternsSelected}
            onChange={onPatternsChange}
            placeholder="All"
            className="h-8 text-xs"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="length-filter" className="text-xs font-medium text-gray-700">
          Length
        </Label>
        <div className="mt-1">
          <MultiSelect
            options={lengths.map((length) => ({ label: length, value: length }))}
            selected={lengthsSelected}
            onChange={onLengthsChange}
            placeholder="All"
            className="h-8 text-xs"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="width-filter" className="text-xs font-medium text-gray-700">
          Width
        </Label>
        <div className="mt-1">
          <MultiSelect
            options={widths.map((width) => ({ label: width, value: width }))}
            selected={widthsSelected}
            onChange={onWidthsChange}
            placeholder="All"
            className="h-8 text-xs"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="weight-filter" className="text-xs font-medium text-gray-700">
          Weight
        </Label>
        <div className="mt-1">
          <MultiSelect
            options={weights.map((weight) => ({ label: weight, value: weight }))}
            selected={weightsSelected}
            onChange={onWeightsChange}
            placeholder="All"
            className="h-8 text-xs"
          />
        </div>
      </div>
    </div>
  );
}
