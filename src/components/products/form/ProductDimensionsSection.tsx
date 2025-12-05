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
}: ProductDimensionsSectionProps) {
  return (
    <>
      {/* Length and Width */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
          onValueChange={(value) => onFormDataChange({ length: value })}
          onUnitChange={(unit) => onFormDataChange({ length_unit: unit })}
          onReload={onReload}
        />

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
          onValueChange={(value) => onFormDataChange({ width: value })}
          onUnitChange={(unit) => onFormDataChange({ width_unit: unit })}
          onReload={onReload}
        />
      </div>

      {/* Weight field - Full width */}
      <ValueUnitDropdownField
        label="Weight"
        value={formData.weight || ''}
        unit={formData.weight_unit || ''}
        combinedValues={weights}
        unitOptions={weightUnits}
        category="weight"
        placeholder="e.g., 3"
        required
        description="Required for product specification"
        onValueChange={(value) => onFormDataChange({ weight: value })}
        onUnitChange={(unit) => onFormDataChange({ weight_unit: unit })}
        onReload={onReload}
      />
    </>
  );
}

