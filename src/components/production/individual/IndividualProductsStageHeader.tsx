import { Button } from '@/components/ui/button';
import { ArrowLeft, RefreshCw, CheckCircle } from 'lucide-react';
import type { ProductionBatch } from '@/services/productionService';

interface IndividualProductsStageHeaderProps {
  batch: ProductionBatch;
  onBack: () => void;
  onComplete: () => void;
  onRefresh: () => void;
  canComplete?: boolean;
}

export default function IndividualProductsStageHeader({
  batch,
  onBack,
  onComplete,
  onRefresh,
  canComplete = false,
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
          onClick={onComplete}
          size="lg"
          disabled={!canComplete}
          className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2 disabled:opacity-50"
        >
          <CheckCircle className="w-4 h-4" />
          Complete Production
        </Button>
      </div>
    </div>
  );
}

