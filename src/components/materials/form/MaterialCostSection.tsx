import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface MaterialCostSectionProps {
  costPerUnit: string;
  onCostPerUnitChange: (value: string) => void;
}

export default function MaterialCostSection({
  costPerUnit,
  onCostPerUnitChange,
}: MaterialCostSectionProps) {
  const handleNumericChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      onCostPerUnitChange(value);
    }
  };

  return (
    <div>
      <Label htmlFor="costPerUnit">Cost/Unit (₹) *</Label>
      <Input
        id="costPerUnit"
        type="text"
        value={costPerUnit}
        onChange={handleNumericChange}
        placeholder="450"
        required
      />
      <p className="text-xs text-muted-foreground mt-1">Cost per unit</p>
    </div>
  );
}

