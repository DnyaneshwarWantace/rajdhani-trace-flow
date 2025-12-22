import { Button } from '@/components/ui/button';
import { ArrowLeft, Package, RefreshCw } from 'lucide-react';
import type { ProductionBatch } from '@/services/productionService';

interface WastageStageHeaderProps {
  batch: ProductionBatch;
  onBack: () => void;
  onIndividualProducts: () => void;
  onRefresh: () => void;
}

export default function WastageStageHeader({
  batch,
  onBack,
  onIndividualProducts,
  onRefresh,
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
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </Button>
        <Button
          onClick={onIndividualProducts}
          size="lg"
          className="bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-2"
        >
          <Package className="w-4 h-4" />
          Individual Products
        </Button>
      </div>
    </div>
  );
}

