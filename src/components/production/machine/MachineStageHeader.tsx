import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Trash2, RefreshCw } from 'lucide-react';
import type { ProductionBatch } from '@/services/productionService';

interface MachineStageHeaderProps {
  batch: ProductionBatch;
  onBack: () => void;
  onWastage: () => void;
  onRefresh: () => void;
  shift?: 'day' | 'night';
  wastageDisabled?: boolean;
}

export default function MachineStageHeader({
  batch,
  onBack,
  onWastage,
  onRefresh,
  shift,
  wastageDisabled = false,
}: MachineStageHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">Machine Operations</h1>
            {shift && (
              <Badge className={
                shift === 'day' 
                  ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' 
                  : 'bg-indigo-100 text-indigo-800 border border-indigo-200'
              }>
                {shift === 'day' ? '☀️ Day Shift' : '🌙 Night Shift'}
              </Badge>
            )}
          </div>
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
          disabled={wastageDisabled}
          size="lg"
          className="bg-orange-600 hover:bg-orange-700 text-white flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Trash2 className="w-4 h-4" />
          Wastage Stage
        </Button>
      </div>
    </div>
  );
}

