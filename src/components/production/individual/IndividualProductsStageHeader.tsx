import { Button } from '@/components/ui/button';
import { ArrowLeft, Trash2, User } from 'lucide-react';
import type { ProductionBatch } from '@/services/productionService';
import ProductAttributePreview from '@/components/ui/ProductAttributePreview';

interface IndividualProductsStageHeaderProps {
  batch: ProductionBatch;
  onBack: () => void;
  onProceedToWastage: () => void;
  canProceed?: boolean;
}

export default function IndividualProductsStageHeader({
  batch,
  onBack,
  onProceedToWastage,
  canProceed = false,
}: IndividualProductsStageHeaderProps) {
  const assignedName = batch.current_stage_assigned_to_name || batch.assigned_to_name;

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">Individual Product Details</h1>
            {assignedName && (
              <span className="flex items-center gap-1 text-xs text-blue-700 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full">
                <User className="w-3 h-3" />
                {assignedName}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600 mt-1">
            Batch: {batch.batch_number} • Product: {batch.product_name || 'N/A'}
          </p>
          <ProductAttributePreview
            color={batch.color}
            pattern={batch.pattern}
            length={batch.length}
            width={batch.width}
            lengthUnit={batch.length_unit}
            widthUnit={batch.width_unit}
            compact
            className="mt-1"
          />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button
          onClick={onProceedToWastage}
          size="lg"
          disabled={!canProceed}
          className="bg-orange-600 hover:bg-orange-700 text-white flex items-center gap-2 disabled:opacity-50"
        >
          <Trash2 className="w-4 h-4" />
          Proceed to Wastage
        </Button>
      </div>
    </div>
  );
}
