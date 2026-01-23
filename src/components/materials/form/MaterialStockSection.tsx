import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { validateNumberInput, ValidationPresets } from '@/utils/numberValidation';

interface MaterialStockSectionProps {
  currentStock: string;
  minThreshold: string;
  maxCapacity: string;
  showCurrentStock: boolean;
  isCurrentStockEditable?: boolean;
  onCurrentStockChange?: (value: string) => void;
  onMinThresholdChange: (value: string) => void;
  onMaxCapacityChange: (value: string) => void;
}

export default function MaterialStockSection({
  currentStock,
  minThreshold,
  maxCapacity,
  showCurrentStock,
  isCurrentStockEditable = false,
  onCurrentStockChange,
  onMinThresholdChange,
  onMaxCapacityChange,
}: MaterialStockSectionProps) {

  return (
    <div className="grid grid-cols-2 gap-4">
      {showCurrentStock && (
        <div>
          <Label htmlFor="currentStock">Current Stock {isCurrentStockEditable ? '*' : ''}</Label>
          <Input
            id="currentStock"
            type="number"
            value={currentStock}
            onChange={(e) => {
              if (onCurrentStockChange) {
                const validation = validateNumberInput(e.target.value, ValidationPresets.MATERIAL_QUANTITY);
                onCurrentStockChange(validation.value);
              }
            }}
            disabled={!isCurrentStockEditable}
            required={isCurrentStockEditable}
            min="0"
            max="99999.99"
            step="0.01"
            className={!isCurrentStockEditable ? 'bg-gray-100 cursor-not-allowed' : ''}
          />
          {!isCurrentStockEditable ? (
            <p className="text-xs text-orange-600 mt-1 font-medium">
              ⚠️ Contact admin to edit quantity
            </p>
          ) : (
            <p className="text-xs text-muted-foreground mt-1">Current quantity in stock</p>
          )}
        </div>
      )}
      <div>
        <Label htmlFor="minThreshold">Min Stock Threshold</Label>
        <Input
          id="minThreshold"
          type="number"
          value={minThreshold}
          onChange={(e) => {
            const validation = validateNumberInput(e.target.value, ValidationPresets.STOCK_LEVEL);
            onMinThresholdChange(validation.value);
          }}
          min="0"
          max="99999"
          step="1"
        />
        <p className="text-xs text-muted-foreground mt-1">Minimum quantity before alert (default: 10)</p>
      </div>
      <div>
        <Label htmlFor="maxCapacity">Max Stock Capacity</Label>
        <Input
          id="maxCapacity"
          type="number"
          value={maxCapacity}
          onChange={(e) => {
            const validation = validateNumberInput(e.target.value, ValidationPresets.MATERIAL_QUANTITY);
            onMaxCapacityChange(validation.value);
          }}
          min="0"
          max="99999.99"
          step="0.01"
        />
        <p className="text-xs text-muted-foreground mt-1">Maximum quantity the inventory can hold (default: 1000)</p>
      </div>
    </div>
  );
}

