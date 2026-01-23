import { forwardRef } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { validateNumberInput, ValidationPresets } from '@/utils/numberValidation';

interface MaterialCostSectionProps {
  costPerUnit: string;
  onCostPerUnitChange: (value: string) => void;
  hasError?: boolean;
}

const MaterialCostSection = forwardRef<HTMLInputElement, MaterialCostSectionProps>(
  ({ costPerUnit, onCostPerUnitChange, hasError = false }, ref) => {
    return (
      <div>
        <Label htmlFor="costPerUnit">Cost/Unit (₹)</Label>
        <Input
          ref={ref}
          id="costPerUnit"
          type="number"
          value={costPerUnit}
          onChange={(e) => {
            const validation = validateNumberInput(e.target.value, ValidationPresets.PRICE);
            onCostPerUnitChange(validation.value);
          }}
          min="0"
          max="9999999.99"
          step="0.01"
          className={hasError ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}
        />
        <p className="text-xs text-muted-foreground mt-1">Cost per unit</p>
      </div>
    );
  }
);

MaterialCostSection.displayName = 'MaterialCostSection';

export default MaterialCostSection;

