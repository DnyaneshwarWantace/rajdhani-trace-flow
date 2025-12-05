import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import ProductDropdownField from './ProductDropdownField';
import type { ProductFormData } from '@/types/product';

interface ProductStockSectionProps {
  formData: ProductFormData;
  units: string[];
  onFormDataChange: (data: Partial<ProductFormData>) => void;
  onDeleteUnit: (value: string) => Promise<void>;
  reloadDropdowns: () => Promise<void>;
  mode?: 'create' | 'edit' | 'duplicate';
}

export default function ProductStockSection({
  formData,
  units,
  onFormDataChange,
  onDeleteUnit,
  reloadDropdowns,
  mode = 'create',
}: ProductStockSectionProps) {
  const isEditMode = mode === 'edit';
  const isQuantityDisabled = isEditMode;

  return (
    <>
      {/* Base Quantity and Unit */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="quantity">Base Quantity *</Label>
          {isQuantityDisabled ? (
            <div className="flex items-center gap-2">
              <Input
                id="quantity"
                type="number"
                value={formData.base_quantity}
                readOnly
                disabled
                className="bg-gray-100 cursor-not-allowed"
              />
              <span className="text-sm text-gray-500">(Read Only)</span>
            </div>
          ) : (
            <Input
              id="quantity"
              type="number"
              value={formData.base_quantity}
              onChange={(e) => {
                const value = e.target.value;
                // Prevent entering 0 directly
                if (value === '' || (parseFloat(value) > 0 && /^\d*\.?\d*$/.test(value))) {
                  onFormDataChange({ base_quantity: Number(value) || 0 });
                } else if (value === '0') {
                  onFormDataChange({ base_quantity: 0 }); // Allow 0 temporarily but will be validated
                }
              }}
              onBlur={(e) => {
                const value = parseFloat(e.target.value);
                // Clear if invalid (NaN or <= 0)
                if (isNaN(value) || value <= 0) {
                  onFormDataChange({ base_quantity: 0 });
                }
              }}
              placeholder="Enter quantity (min: 1)"
              min="1"
              step="1"
              required
            />
          )}
          <p className="text-xs text-gray-500 mt-1">
            {isQuantityDisabled
              ? 'Quantity cannot be edited. Use inventory management to update stock.'
              : 'Initial stock quantity'}
          </p>
        </div>

        <ProductDropdownField
          label="Unit"
          value={formData.unit}
          placeholder="Select unit (e.g., SQM, kg, meters)"
          options={units}
          searchable
          required
          category="unit"
          onValueChange={(value) => onFormDataChange({ unit: value })}
          onDelete={onDeleteUnit}
          reloadDropdowns={reloadDropdowns}
        />
        <p className="text-xs text-gray-500 mt-1">
          Note: Unit is for measurement (SQM, kg, meters, etc.). Stock count is displayed in rolls (1 roll, 2 rolls, etc.) regardless of unit.
        </p>
      </div>

      {/* Individual Stock Tracking */}
      <div>
        <Label className="text-sm font-medium mb-2 block">Individual Stock Tracking</Label>
        <div className="flex gap-4">
          <label className="flex items-center space-x-2">
            <input
              type="radio"
              name="individualStockTracking"
              value="yes"
              checked={formData.individual_stock_tracking === true}
              onChange={() => onFormDataChange({ individual_stock_tracking: true })}
              className="text-primary-600"
            />
            <span className="text-sm">Yes, track individual pieces (with QR codes)</span>
          </label>
          <label className="flex items-center space-x-2">
            <input
              type="radio"
              name="individualStockTracking"
              value="no"
              checked={formData.individual_stock_tracking === false}
              onChange={() => onFormDataChange({ individual_stock_tracking: false })}
              className="text-primary-600"
            />
            <span className="text-sm">No, bulk tracking only (no QR codes)</span>
          </label>
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          {formData.individual_stock_tracking
            ? 'Each piece will have a unique QR code for individual tracking'
            : 'Product will be tracked as bulk quantity without individual QR codes'}
        </div>
      </div>
    </>
  );
}

