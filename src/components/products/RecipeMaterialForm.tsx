import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Search, X } from 'lucide-react';
import MaterialSelectorDialog from './MaterialSelectorDialog';
// import { calculateSQM } from '@/utils/sqmCalculator';
import { TruncatedText } from '@/components/ui/TruncatedText';
import { validateNumberInput, ValidationPresets, preventInvalidNumberKeys } from '@/utils/numberValidation';

interface RecipeMaterial {
  materialId: string;
  materialName: string;
  quantity: string;
  unit: string;
  cost?: string;
  materialType?: 'product' | 'raw_material';
}

interface RecipeMaterialFormProps {
  newMaterial: RecipeMaterial;
  onMaterialChange: (material: RecipeMaterial) => void;
  onAdd: () => void;
  /** Called when user confirms multiple selections from the dialog */
  onAddMultiple?: (materials: RecipeMaterial[]) => void;
  targetProduct?: {
    length: string;
    width: string;
    length_unit: string;
    width_unit: string;
  };
}

export default function RecipeMaterialForm({
  newMaterial,
  onMaterialChange,
  onAdd,
  onAddMultiple,
  targetProduct,
}: RecipeMaterialFormProps) {
  const [showMaterialSelector, setShowMaterialSelector] = useState(false);
  /** Called when user confirms all selected items in the dialog */
  const handleMultipleSelect = (selected: RecipeMaterial[]) => {
    if (onAddMultiple && selected.length > 0) {
      onAddMultiple(selected);
    }
  };

  // Check if the selected material is a product based on the unit field
  // Products typically have units like 'roll', 'sqm', etc., while materials have 'kg', 'liters', etc.
  const isProduct = newMaterial.materialId && (
    newMaterial.unit === 'roll' || 
    newMaterial.unit === 'rolls' || 
    newMaterial.unit === 'sqm' ||
    newMaterial.unit === 'SQM'
  );

  return (
    <div className="bg-gray-50 p-4 rounded-lg mb-4">
      <div className="space-y-4">
        <div>
          <Label htmlFor="materialSelect">Select Material or Product *</Label>
          <div className="space-y-2">
            {/* Current Selection Display */}
            {newMaterial.materialId ? (
              <div className="flex items-center justify-between p-3 bg-primary-50 border border-primary-200 rounded-lg">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-primary-900">
                    <TruncatedText text={newMaterial.materialName} maxLength={50} as="span" />
                  </div>
                  <div className="text-sm text-primary-700">
                    {isProduct ? 'Product' : 'Raw Material'}
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onMaterialChange({
                      materialId: '',
                      materialName: '',
                      quantity: '',
                      unit: '',
                      cost: '',
                    });
                  }}
                  className="text-red-600 hover:text-red-700"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowMaterialSelector(true)}
                className="w-full h-12 border-dashed border-2 border-gray-300 hover:border-primary-400 hover:bg-primary-50"
              >
                <Search className="w-4 h-4 mr-2" />
                Click to search and select materials or products (pick multiple at once)
              </Button>
            )}
          </div>
        </div>

        {/* Quantity for Base Unit */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="materialQuantity">Quantity *</Label>
            <Input
              id="materialQuantity"
              type="number"
              value={newMaterial.quantity}
              onChange={(e) => {
                const validation = validateNumberInput(e.target.value, ValidationPresets.RECIPE_QUANTITY);
                onMaterialChange({ ...newMaterial, quantity: validation.value });
              }}
              onKeyDown={(e) => {
                preventInvalidNumberKeys(e);
                // Prevent form submission on Enter key
                if (e.key === 'Enter') {
                  e.preventDefault();
                  e.stopPropagation();
                }
              }}
              min="0"
              max="9999.999"
              step="0.001"
            />
            <p className="text-xs text-gray-500 mt-1">
              {isProduct
                ? 'Quantity per 1 SQM (auto-calculated based on product dimensions, or edit manually)'
                : 'Quantity needed for 1 SQM of this product (supports decimals like 0.5kg, 0.2 pieces)'}
            </p>
          </div>
          <div>
            <Label htmlFor="materialUnit">Unit *</Label>
            <Input
              id="materialUnit"
              value={newMaterial.unit}
              onChange={(e) => onMaterialChange({ ...newMaterial, unit: e.target.value })}
              onKeyDown={(e) => {
                // Prevent form submission on Enter key
                if (e.key === 'Enter') {
                  e.preventDefault();
                  e.stopPropagation();
                }
              }}
              placeholder="e.g., kg, meters, pieces"
            />
          </div>
        </div>
      </div>

      <Button
        type="button"
        onClick={onAdd}
        className="w-full mt-4"
        disabled={
          !newMaterial.materialId || 
          !newMaterial.quantity || 
          !newMaterial.unit ||
          parseFloat(newMaterial.quantity) <= 0
        }
      >
        <Plus className="w-4 h-4 mr-2" />
        Add Material to Recipe
      </Button>

      <MaterialSelectorDialog
        isOpen={showMaterialSelector}
        onClose={() => setShowMaterialSelector(false)}
        onSelectMultiple={handleMultipleSelect}
        targetProduct={targetProduct}
      />
    </div>
  );
}

