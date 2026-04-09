import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, FileText, RefreshCw, UserPlus, User } from 'lucide-react';
import type { ProductionBatch } from '@/services/productionService';

interface MachineStageHeaderProps {
  batch: ProductionBatch;
  onBack: () => void;
  onWastage: () => void;
  onRefresh: () => void;
  onAssign?: () => void;
  shift?: 'day' | 'night';
  wastageDisabled?: boolean;
}

export default function MachineStageHeader({
  batch,
  onBack,
  onWastage,
  onRefresh,
  onAssign,
  shift,
  wastageDisabled = false,
}: MachineStageHeaderProps) {
  const assignedName = batch.current_stage_assigned_to_name || batch.assigned_to_name;

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
        </div>
      </div>
      <div className="flex items-center gap-2">
        {onAssign && (
          <Button
            variant="outline"
            size="sm"
            onClick={onAssign}
            className="text-blue-700 border-blue-300 hover:bg-blue-50"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Forward to Next Person
          </Button>
        )}
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
          className="bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <FileText className="w-4 h-4" />
          Individual Products
        </Button>
      </div>
    </div>
  );
}

