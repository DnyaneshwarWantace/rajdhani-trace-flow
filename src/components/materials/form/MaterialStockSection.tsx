import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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
  const handleNumericChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (value: string) => void
  ) => {
    const value = e.target.value;
    // Allow max 4 digits before decimal, 2 after decimal
    if (value === '' || /^\d{0,4}(\.\d{0,2})?$/.test(value)) {
      setter(value);
    }
  };

  const handleMinThresholdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Min threshold: max 10 digits
    if (value === '' || /^\d{0,10}$/.test(value)) {
      onMinThresholdChange(value);
    }
  };

  return (
    <div className="grid grid-cols-2 gap-4">
      {showCurrentStock && (
        <div>
          <Label htmlFor="currentStock">Current Stock {isCurrentStockEditable ? '*' : ''}</Label>
          <Input
            id="currentStock"
            type="text"
            value={currentStock}
            onChange={(e) => onCurrentStockChange && handleNumericChange(e, onCurrentStockChange)}
            placeholder="0"
            disabled={!isCurrentStockEditable}
            required={isCurrentStockEditable}
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
          type="text"
          value={minThreshold}
          onChange={handleMinThresholdChange}
          placeholder="10 (auto-set if empty)"
        />
        <p className="text-xs text-muted-foreground mt-1">Max 10 digits - Minimum quantity before alert (default: 10)</p>
      </div>
      <div>
        <Label htmlFor="maxCapacity">Max Stock Capacity</Label>
        <Input
          id="maxCapacity"
          type="text"
          value={maxCapacity}
          onChange={(e) => handleNumericChange(e, onMaxCapacityChange)}
          placeholder="1000 (auto-set if empty)"
        />
        <p className="text-xs text-muted-foreground mt-1">Maximum quantity the inventory can hold (default: 1000)</p>
      </div>
    </div>
  );
}

