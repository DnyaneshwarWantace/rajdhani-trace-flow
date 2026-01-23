import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ProductFormData } from '@/types/product';
import { validateNumberInput, ValidationPresets } from '@/utils/numberValidation';

interface ProductStockLevelsSectionProps {
  formData: ProductFormData;
  onFormDataChange: (data: Partial<ProductFormData>) => void;
}

export default function ProductStockLevelsSection({
  formData,
  onFormDataChange,
}: ProductStockLevelsSectionProps) {
  return (
    <div>
      <Label htmlFor="minStock">Min Stock Level</Label>
      <Input
        id="minStock"
        type="number"
        value={formData.min_stock_level || ''}
        onChange={(e) => {
          const validation = validateNumberInput(e.target.value, ValidationPresets.STOCK_LEVEL);
          onFormDataChange({ min_stock_level: validation.value === '' ? 0 : parseInt(validation.value) || 0 });
        }}
        min="0"
        max="99999"
        step="1"
      />
    </div>
  );
}

