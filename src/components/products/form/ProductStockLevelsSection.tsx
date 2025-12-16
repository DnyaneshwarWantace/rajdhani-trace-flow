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
  const handleMinStockChange = (value: string) => {
    // Allow only numbers with max 10 digits
    if (/^\d{0,10}$/.test(value)) {
      onFormDataChange({ min_stock_level: value === '' ? 0 : Number(value) });
    }
  };

  return (
    <div>
      <Label htmlFor="minStock">Min Stock Level</Label>
      <Input
        id="minStock"
        type="text"
        value={formData.min_stock_level || ''}
        onChange={(e) => handleMinStockChange(e.target.value)}
        placeholder="e.g., 10"
      />
      <p className="text-xs text-muted-foreground mt-1">Max 10 digits</p>
    </div>
  );
}

