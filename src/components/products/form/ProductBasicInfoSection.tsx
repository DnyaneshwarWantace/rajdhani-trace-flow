import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import ProductDropdownField from './ProductDropdownField';
import type { ProductFormData } from '@/types/product';

interface ProductBasicInfoSectionProps {
  formData: ProductFormData;
  categories: string[];
  subcategories: string[];
  colors: string[];
  patterns: string[];
  onFormDataChange: (data: Partial<ProductFormData>) => void;
  onDeleteCategory: (value: string) => Promise<void>;
  onDeleteSubcategory: (value: string) => Promise<void>;
  onDeleteColor: (value: string) => Promise<void>;
  onDeletePattern: (value: string) => Promise<void>;
  reloadDropdowns: () => Promise<void>;
}

export default function ProductBasicInfoSection({
  formData,
  categories,
  subcategories,
  colors,
  patterns,
  onFormDataChange,
  onDeleteCategory,
  onDeleteSubcategory,
  onDeleteColor,
  onDeletePattern,
  reloadDropdowns,
}: ProductBasicInfoSectionProps) {
  return (
    <>
      {/* Product Name */}
      <div>
        <Label htmlFor="productName">Product Name *</Label>
        <Input
          id="productName"
          value={formData.name}
          onChange={(e) => onFormDataChange({ name: e.target.value })}
          placeholder="e.g., Traditional Persian Carpet"
          required
        />
      </div>

      {/* Category and Subcategory */}
      <div className="grid grid-cols-2 gap-4">
        <ProductDropdownField
          label="Category"
          value={formData.category}
          placeholder="Select category"
          options={categories}
          required
          category="category"
          onValueChange={(value) => onFormDataChange({ category: value })}
          onDelete={onDeleteCategory}
          reloadDropdowns={reloadDropdowns}
        />

        <ProductDropdownField
          label="Subcategory"
          value={formData.subcategory || ''}
          placeholder="Select subcategory (optional)"
          options={subcategories}
          allowNA
          category="subcategory"
          onValueChange={(value) => onFormDataChange({ subcategory: value })}
          onDelete={onDeleteSubcategory}
          reloadDropdowns={reloadDropdowns}
        />
      </div>

      {/* Color and Pattern */}
      <div className="grid grid-cols-2 gap-4">
        <ProductDropdownField
          label="Color"
          value={formData.color || ''}
          placeholder="Select color"
          options={colors}
          searchable
          allowNA
          category="color"
          onValueChange={(value) => onFormDataChange({ color: value })}
          onDelete={onDeleteColor}
          reloadDropdowns={reloadDropdowns}
        />

        <ProductDropdownField
          label="Pattern"
          value={formData.pattern || ''}
          placeholder="Select pattern"
          options={patterns}
          allowNA
          category="pattern"
          onValueChange={(value) => onFormDataChange({ pattern: value })}
          onDelete={onDeletePattern}
          reloadDropdowns={reloadDropdowns}
        />
      </div>
    </>
  );
}

