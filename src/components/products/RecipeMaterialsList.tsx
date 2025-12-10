import { Button } from '@/components/ui/button';
import { X, Package } from 'lucide-react';

interface RecipeMaterial {
  materialId: string;
  materialName: string;
  quantity: string;
  unit: string;
  cost?: string;
}

interface RecipeMaterialsListProps {
  materials: RecipeMaterial[];
  onRemove: (index: number) => void;
}

export default function RecipeMaterialsList({ materials, onRemove }: RecipeMaterialsListProps) {
  if (materials.length === 0) {
    return (
      <div className="bg-primary-50 border border-primary-200 p-3 rounded-lg">
        <div className="flex items-center gap-2">
          <Package className="w-4 h-4 text-primary-600" />
          <span className="text-sm text-primary-800 font-medium">No Recipe Added</span>
        </div>
        <p className="text-sm text-primary-700 mt-1">
          You can create the product without a recipe and add it later when editing the product.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Recipe Materials:</label>
      {materials.map((material, index) => (
        <div key={index} className="flex items-center justify-between bg-primary-50 p-3 rounded-lg">
          <div className="flex-1">
            <div className="font-medium">{material.materialName}</div>
            <div className="text-sm text-gray-600">
              {material.quantity} {material.unit}
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onRemove(index);
            }}
            className="text-red-600 hover:bg-red-50"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      ))}
    </div>
  );
}

