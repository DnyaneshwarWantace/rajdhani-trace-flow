import ValueUnitDropdownField from './ValueUnitDropdownField';
import type { ProductFormData } from '@/types/product';

interface ProductDimensionsSectionProps {
  formData: ProductFormData;
  lengthUnits: string[];
  widthUnits: string[];
  weightUnits: string[];
  lengths: string[]; // Combined values like "5 m"
  widths: string[]; // Combined values like "10 feet"
  weights: string[]; // Combined values like "600 GSM"
  onFormDataChange: (data: Partial<ProductFormData>) => void;
  onReload: () => Promise<void>;
  touchedFields?: Set<string>;
  markFieldTouched?: (fieldName: string) => void;
}

export default function ProductDimensionsSection({
  formData,
  lengthUnits,
  widthUnits,
  weightUnits,
  lengths,
  widths,
  weights,
  onFormDataChange,
  onReload,
  touchedFields = new Set(),
  markFieldTouched = () => {},
}: ProductDimensionsSectionProps) {
  const lengthEmpty = !formData.length || !String(formData.length).trim();
  const lengthUnitEmpty = !formData.length_unit || !String(formData.length_unit).trim();
  const widthEmpty = !formData.width || !String(formData.width).trim();
  const widthUnitEmpty = !formData.width_unit || !String(formData.width_unit).trim();
  const weightEmpty = !formData.weight || !String(formData.weight).trim();
  const weightUnitEmpty = !formData.weight_unit || !String(formData.weight_unit).trim();

  return (
    <>
      {/* Length and Width */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <ValueUnitDropdownField
            label="Length"
            value={formData.length || ''}
            unit={formData.length_unit || ''}
            combinedValues={lengths}
            unitOptions={lengthUnits}
            category="length"
            placeholder="e.g., 5"
            required
            description="Required for SQM calculation"
            onValueChange={(value) => {
              onFormDataChange({ length: value });
            }}
            onUnitChange={(unit) => {
              onFormDataChange({ length_unit: unit });
            }}
            onCombinedChange={(value, unit) => {
              onFormDataChange({ length: value, length_unit: unit });
            }}
            onReload={onReload}
            markFieldTouched={markFieldTouched}
            fieldName="length"
          />
          {touchedFields.has('length') && (lengthEmpty || lengthUnitEmpty) && (
            <p className="text-xs text-red-500 mt-1">
              Length and unit are required
            </p>
          )}
        </div>

        <div>
          <ValueUnitDropdownField
            label="Width"
            value={formData.width || ''}
            unit={formData.width_unit || ''}
            combinedValues={widths}
            unitOptions={widthUnits}
            category="width"
            placeholder="e.g., 10"
            required
            description="Required for SQM calculation"
            onValueChange={(value) => {
              onFormDataChange({ width: value });
            }}
            onUnitChange={(unit) => {
              onFormDataChange({ width_unit: unit });
            }}
            onCombinedChange={(value, unit) => {
              onFormDataChange({ width: value, width_unit: unit });
            }}
            onReload={onReload}
            markFieldTouched={markFieldTouched}
            fieldName="width"
          />
          {touchedFields.has('width') && (widthEmpty || widthUnitEmpty) && (
            <p className="text-xs text-red-500 mt-1">
              Width and unit are required
            </p>
          )}
        </div>
      </div>

      {/* Weight field - Full width */}
      <div>
        <ValueUnitDropdownField
          label="GSM"
          value={formData.weight || ''}
          unit={formData.weight_unit || ''}
          combinedValues={weights}
          unitOptions={weightUnits}
          category="weight"
          placeholder="e.g., 3"
          required={true}
          description="Required"
          onValueChange={(value) => {
            onFormDataChange({ weight: value });
          }}
          onUnitChange={(unit) => {
            onFormDataChange({ weight_unit: unit });
          }}
          onCombinedChange={(value, unit) => {
            onFormDataChange({ weight: value, weight_unit: unit });
          }}
          onReload={onReload}
          markFieldTouched={markFieldTouched}
          fieldName="weight"
        />
        {touchedFields.has('weight') && (weightEmpty || weightUnitEmpty) && (
          <p className="text-xs text-red-500 mt-1">
            GSM and unit are required
          </p>
        )}
      </div>
    </>
  );
}

