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
          onChange={(e) => {
            let inputValue = e.target.value;

            // Allow ALL characters - no character restrictions
            // Only enforce: max 50 words, max 20 characters per word

            // Split by spaces to get words (preserve all spaces)
            const words = inputValue.split(/\s+/).filter(w => w.length > 0);
            
            // Limit to 50 words - if exceeded, truncate at the 50th word
            if (words.length > 50) {
              // Find position where 50th word ends
              let wordCount = 0;
              let pos = inputValue.length;
              for (let i = 0; i < inputValue.length; i++) {
                // Check if we're at the start of a word (non-space after space or start of string)
                if (inputValue[i] !== ' ' && (i === 0 || inputValue[i - 1] === ' ')) {
                  wordCount++;
                  if (wordCount === 50) {
                    // Find the end of this 50th word
                    let endPos = i;
                    while (endPos < inputValue.length && inputValue[endPos] !== ' ') {
                      endPos++;
                    }
                    pos = endPos;
                    break;
                  }
                }
              }
              inputValue = inputValue.substring(0, pos);
            }

            // Limit each word to 20 characters (preserve spaces)
            const parts = inputValue.split(/(\s+)/);
            const processedParts = parts.map(part => {
              if (/^\s+$/.test(part)) {
                // It's a space sequence, keep it as-is
                return part;
              } else if (part.trim().length > 0) {
                // It's a word, limit to 20 characters
                return part.length > 20 ? part.slice(0, 20) : part;
              }
              return part;
            });

            inputValue = processedParts.join('');

            onFormDataChange({ name: inputValue });
          }}
          placeholder="e.g., Traditional Persian Carpet"
          required
        />
        {(() => {
          const wordCount = formData.name.trim() ? formData.name.trim().split(/\s+/).filter(w => w.length > 0).length : 0;
          const words = formData.name.trim() ? formData.name.trim().split(/\s+/).filter(w => w.length > 0) : [];
          const hasLongWord = words.some(word => word.length > 20);
          const totalChars = formData.name.length;
          return (
            <p className="text-xs text-muted-foreground mt-1">
              {wordCount}/50 words • Max 20 characters per word • {totalChars} total characters
              {hasLongWord && <span className="text-red-600 ml-1">(Some words exceed 20 characters)</span>}
            </p>
          );
        })()}
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
          placeholder="Select subcategory"
          options={subcategories}
          required
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

