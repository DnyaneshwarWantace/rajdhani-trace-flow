import { Button } from '@/components/ui/button';
import { ArrowLeft, RefreshCw, Trash2 } from 'lucide-react';
import type { ProductionBatch } from '@/services/productionService';

interface IndividualProductsStageHeaderProps {
  batch: ProductionBatch;
  onBack: () => void;
  onProceedToWastage: () => void;
  onRefresh: () => void;
  canProceed?: boolean;
}

export default function IndividualProductsStageHeader({
  batch,
  onBack,
  onProceedToWastage,
  onRefresh,
  canProceed = false,
}: IndividualProductsStageHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Individual Product Details</h1>
          <p className="text-sm text-gray-600 mt-1">
            Batch: {batch.batch_number} • Product: {batch.product_name || 'N/A'}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          className="flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </Button>
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

