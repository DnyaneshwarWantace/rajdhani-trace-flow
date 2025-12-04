import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ProductFormData } from '@/types/product';

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
        value={formData.min_stock_level}
        onChange={(e) => onFormDataChange({ min_stock_level: Number(e.target.value) })}
        placeholder="e.g., 10"
        min="0"
      />
    </div>
  );
}

