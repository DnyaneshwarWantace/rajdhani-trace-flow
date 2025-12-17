import { Button } from '@/components/ui/button';
import { ArrowLeft, Trash2, RefreshCw } from 'lucide-react';
import type { ProductionBatch } from '@/services/productionService';

interface MachineStageHeaderProps {
  batch: ProductionBatch;
  onBack: () => void;
  onWastage: () => void;
  onRefresh: () => void;
}

export default function MachineStageHeader({
  batch,
  onBack,
  onWastage,
  onRefresh,
}: MachineStageHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Machine Operations</h1>
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
          onClick={onWastage}
          className="bg-orange-600 hover:bg-orange-700 flex items-center gap-2"
        >
          <Trash2 className="w-4 h-4" />
          Wastage Stage
        </Button>
      </div>
    </div>
  );
}

