import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Search, X, Calculator } from 'lucide-react';
import MaterialSelectorDialog from './MaterialSelectorDialog';
import { calculateSQM, formatSQMWithSquareFeet } from '@/utils/sqmCalculator';
import { calculateProductRatio } from '@/utils/productRatioCalculator';

interface RecipeMaterial {
  materialId: string;
  materialName: string;
  quantity: string;
  unit: string;
  cost?: string;
}

interface RecipeMaterialFormProps {
  newMaterial: RecipeMaterial;
  onMaterialChange: (material: RecipeMaterial) => void;
  onAdd: () => void;
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
  targetProduct,
}: RecipeMaterialFormProps) {
  const [showMaterialSelector, setShowMaterialSelector] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);

  // Calculate SQM for target product
  const targetSQM = targetProduct 
    ? calculateSQM(
        targetProduct.length,
        targetProduct.width,
        targetProduct.length_unit,
        targetProduct.width_unit
      )
    : 0;

  const handleMaterialSelect = (selected: RecipeMaterial) => {
    // If it's a product, we need to auto-calculate the ratio
    // For now, just set the material - ratio calculation will be handled by MaterialSelectorDialog
    onMaterialChange(selected);
    setShowMaterialSelector(false);
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
      {/* SQM Calculation Display */}
      {targetProduct && targetProduct.length && targetProduct.width && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Calculator className="w-4 h-4 text-blue-600" />
            <Label className="text-sm font-semibold text-blue-900">Product SQM Calculation</Label>
          </div>
          <div className="text-xs sm:text-sm text-blue-800 space-y-1">
            <p>
              <span className="font-medium">Dimensions:</span> {targetProduct.length} {targetProduct.length_unit} × {targetProduct.width} {targetProduct.width_unit}
            </p>
            <p>
              <span className="font-medium">Area:</span> {formatSQMWithSquareFeet(targetSQM)}
            </p>
            <p className="text-xs text-blue-700 mt-2">
              Recipe materials are calculated for <strong>1 SQM</strong> of this product. System will automatically scale based on production quantity.
            </p>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <Label htmlFor="materialSelect">Select Material or Product *</Label>
          <div className="space-y-2">
            {/* Current Selection Display */}
            {newMaterial.materialId ? (
              <div className="flex items-center justify-between p-3 bg-primary-50 border border-primary-200 rounded-lg">
                <div className="flex-1">
                  <div className="font-medium text-primary-900">{newMaterial.materialName}</div>
                  <div className="text-sm text-primary-700">
                    {isProduct ? 'Product' : 'Raw Material'}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    onMaterialChange({
                      materialId: '',
                      materialName: '',
                      quantity: '',
                      unit: '',
                      cost: '',
                    })
                  }
                  className="text-red-600 hover:text-red-700"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                onClick={() => setShowMaterialSelector(true)}
                className="w-full h-12 border-dashed border-2 border-gray-300 hover:border-primary-400 hover:bg-primary-50"
              >
                <Search className="w-4 h-4 mr-2" />
                Click to search and select material or product
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
              type="text"
              value={newMaterial.quantity}
              onChange={(e) => {
                const value = e.target.value;
                if (value === '' || /^\d*\.?\d*$/.test(value)) {
                  onMaterialChange({ ...newMaterial, quantity: value });
                }
              }}
              placeholder={isProduct ? 'Auto-calculated for products' : 'e.g., 0.5, 2.5, 0.2'}
            />
            <p className="text-xs text-gray-500 mt-1">
              {isProduct
                ? 'Quantity per 1 SQM (auto-calculated based on product dimensions, or edit manually)'
                : 'Quantity needed for 1 SQM of this product (supports decimals like 0.5kg, 0.2 pieces)'}
            </p>
            {isProduct && newMaterial.quantity && (
              <p className="text-xs text-blue-600 mt-1">
                For 1 SQM of target product, you need {newMaterial.quantity} {newMaterial.unit} of this product
              </p>
            )}
          </div>
          <div>
            <Label htmlFor="materialUnit">Unit *</Label>
            <Input
              id="materialUnit"
              value={newMaterial.unit}
              onChange={(e) => onMaterialChange({ ...newMaterial, unit: e.target.value })}
              placeholder="e.g., kg, meters, pieces"
            />
          </div>
        </div>
      </div>

      <Button
        onClick={onAdd}
        className="w-full mt-4"
        disabled={!newMaterial.materialId || !newMaterial.quantity || !newMaterial.unit}
      >
        <Plus className="w-4 h-4 mr-2" />
        Add Material to Recipe
      </Button>

      <MaterialSelectorDialog
        isOpen={showMaterialSelector}
        onClose={() => setShowMaterialSelector(false)}
        onSelect={handleMaterialSelect}
        targetProduct={targetProduct}
      />
    </div>
  );
}

