import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface MaterialStockSectionProps {
  currentStock: string;
  minThreshold: string;
  maxCapacity: string;
  reorderPoint: string;
  showCurrentStock: boolean;
  isCurrentStockEditable?: boolean;
  onCurrentStockChange?: (value: string) => void;
  onMinThresholdChange: (value: string) => void;
  onMaxCapacityChange: (value: string) => void;
  onReorderPointChange: (value: string) => void;
}

export default function MaterialStockSection({
  currentStock,
  minThreshold,
  maxCapacity,
  reorderPoint,
  showCurrentStock,
  isCurrentStockEditable = false,
  onCurrentStockChange,
  onMinThresholdChange,
  onMaxCapacityChange,
  onReorderPointChange,
}: MaterialStockSectionProps) {
  const handleNumericChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (value: string) => void
  ) => {
    const value = e.target.value;
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setter(value);
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
        <Label htmlFor="minThreshold">Min Stock Threshold *</Label>
        <Input
          id="minThreshold"
          type="text"
          value={minThreshold}
          onChange={(e) => handleNumericChange(e, onMinThresholdChange)}
          placeholder="10"
          required
        />
        <p className="text-xs text-muted-foreground mt-1">Minimum quantity before low stock alert</p>
      </div>
      <div>
        <Label htmlFor="maxCapacity">Max Stock Capacity *</Label>
        <Input
          id="maxCapacity"
          type="text"
          value={maxCapacity}
          onChange={(e) => handleNumericChange(e, onMaxCapacityChange)}
          placeholder="1000"
          required
        />
        <p className="text-xs text-muted-foreground mt-1">Maximum quantity the inventory can hold</p>
      </div>
      <div>
        <Label htmlFor="reorderPoint">Reorder Point *</Label>
        <Input
          id="reorderPoint"
          type="text"
          value={reorderPoint}
          onChange={(e) => handleNumericChange(e, onReorderPointChange)}
          placeholder="50"
          required
        />
        <p className="text-xs text-muted-foreground mt-1">Quantity at which a new order should be placed</p>
      </div>
    </div>
  );
}

