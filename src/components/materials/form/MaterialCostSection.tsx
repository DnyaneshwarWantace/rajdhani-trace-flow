import { forwardRef } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface MaterialCostSectionProps {
  costPerUnit: string;
  onCostPerUnitChange: (value: string) => void;
  hasError?: boolean;
}

const MaterialCostSection = forwardRef<HTMLInputElement, MaterialCostSectionProps>(
  ({ costPerUnit, onCostPerUnitChange, hasError = false }, ref) => {
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
          ref={ref}
          id="costPerUnit"
          type="text"
          value={costPerUnit}
          onChange={handleNumericChange}
          placeholder="450"
          required
          className={hasError ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}
        />
        <p className="text-xs text-muted-foreground mt-1">Cost per unit</p>
      </div>
    );
  }
);

MaterialCostSection.displayName = 'MaterialCostSection';

export default MaterialCostSection;

