import { Button } from '@/components/ui/button';
import { ArrowLeft, CheckCircle, RefreshCw } from 'lucide-react';
import type { ProductionBatch } from '@/services/productionService';

interface WastageStageHeaderProps {
  batch: ProductionBatch;
  onBack: () => void;
  onCompleteProduction: () => void;
  onRefresh: () => void;
  completeDisabled?: boolean;
  isCompleting?: boolean;
}

export default function WastageStageHeader({
  batch,
  onBack,
  onCompleteProduction,
  onRefresh,
  completeDisabled = false,
  isCompleting = false,
}: WastageStageHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Wastage Tracking</h1>
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
          disabled={isCompleting}
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </Button>
        <Button
          onClick={onCompleteProduction}
          size="lg"
          disabled={completeDisabled || isCompleting}
          className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2 disabled:opacity-50"
        >
          {isCompleting ? (
            <>
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Completing...
            </>
          ) : (
            <>
              <CheckCircle className="w-4 h-4" />
              Complete Production
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

