import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import ProductDropdownField from './ProductDropdownField';
import type { ProductFormData } from '@/types/product';
import { validateNumberInput, ValidationPresets, preventInvalidNumberKeys } from '@/utils/numberValidation';

interface ProductStockSectionProps {
  formData: ProductFormData;
  units: string[];
  onFormDataChange: (data: Partial<ProductFormData>) => void;
  onDeleteUnit: (value: string) => Promise<void>;
  reloadDropdowns: () => Promise<void>;
  mode?: 'create' | 'edit' | 'duplicate';
  touchedFields?: Set<string>;
  markFieldTouched?: (fieldName: string) => void;
}

export default function ProductStockSection({
  formData,
  units,
  onFormDataChange,
  onDeleteUnit,
  reloadDropdowns,
  mode = 'create',
  touchedFields = new Set(),
  markFieldTouched = () => {},
}: ProductStockSectionProps) {
  const isEditMode = mode === 'edit';
  const isQuantityDisabled = isEditMode;

  return (
    <>
      {/* Base Quantity and Unit */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="quantity">Base Quantity</Label>
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
            <>
              <Input
                id="quantity"
                type="number"
                value={formData.base_quantity ?? ''}
                onChange={(e) => {
                  const validation = validateNumberInput(e.target.value, ValidationPresets.PRODUCT_QUANTITY);
                  onFormDataChange({ base_quantity: validation.value === '' ? '' as any : parseInt(validation.value) || 0 });
                }}
                onKeyDown={(e) => preventInvalidNumberKeys(e)}
                onBlur={() => markFieldTouched('base_quantity')}
                min="0"
                max="99999"
                step="1"
              />
            </>
          )}
          <p className="text-xs text-gray-500 mt-1">
            {isQuantityDisabled
              ? 'Quantity cannot be edited. Use inventory management to update stock.'
              : 'Initial stock quantity (defaults to 0 if blank)'}
          </p>
        </div>

        <div onBlur={() => markFieldTouched('unit')}>
          <ProductDropdownField
            label="Unit"
            value={formData.unit}
            placeholder="Select unit (e.g., SQM, kg, meters)"
            options={units}
            searchable
            required
            category="unit"
            onValueChange={(value) => {
              onFormDataChange({ unit: value });
            }}
            onDelete={onDeleteUnit}
            reloadDropdowns={reloadDropdowns}
            markFieldTouched={markFieldTouched}
            fieldName="unit"
          />
          {touchedFields.has('unit') && !formData.unit.trim() && (
            <p className="text-xs text-red-500 mt-1">
              Unit is required
            </p>
          )}
          {!touchedFields.has('unit') || formData.unit.trim() ? (
            <p className="text-xs text-gray-500 mt-1">
              Note: Unit is for measurement (SQM, kg, meters, etc.). Stock count is displayed in rolls (1 roll, 2 rolls, etc.) regardless of unit.
            </p>
          ) : null}
        </div>
      </div>

    </>
  );
}
