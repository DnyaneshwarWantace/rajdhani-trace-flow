import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface ProductFiltersProps {
  category: string;
  subcategory: string;
  onCategoryChange: (value: string) => void;
  onSubcategoryChange: (value: string) => void;
  categories: string[];
  subcategories: string[];
}

export default function ProductFilters({
  category,
  subcategory,
  onCategoryChange,
  onSubcategoryChange,
  categories,
  subcategories,
}: ProductFiltersProps) {
  // Show all subcategories (can be filtered by category if needed in future)
  const filteredSubcategories = subcategories;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <Label htmlFor="category-filter" className="text-sm font-medium text-gray-700">
          Category
        </Label>
        <Select value={category || 'all'} onValueChange={(value) => onCategoryChange(value === 'all' ? '' : value)}>
          <SelectTrigger id="category-filter" className="mt-1">
            <SelectValue placeholder="All Categories" />
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
        <Label htmlFor="subcategory-filter" className="text-sm font-medium text-gray-700">
          Subcategory
        </Label>
        <Select value={subcategory || 'all'} onValueChange={(value) => onSubcategoryChange(value === 'all' ? '' : value)}>
          <SelectTrigger id="subcategory-filter" className="mt-1">
            <SelectValue placeholder="All Subcategories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Subcategories</SelectItem>
            {filteredSubcategories.filter(sub => sub && sub.trim()).map((sub) => (
              <SelectItem key={sub} value={sub}>
                {sub}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

