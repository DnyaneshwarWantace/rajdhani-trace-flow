import { ArrowLeft, Edit, UserPlus, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ClipboardList } from 'lucide-react';
import type { ProductionBatch } from '@/services/productionService';

interface PlanningStageHeaderProps {
  onBack: () => void;
  onEdit?: () => void;
  onAssign?: () => void;
  batch?: ProductionBatch | null;
  productName?: string;
}

export default function PlanningStageHeader({ onBack, onEdit, onAssign, batch, productName }: PlanningStageHeaderProps) {
  const displayProductName = productName || batch?.product_name || 'Product';
  const batchNumber = batch?.batch_number || batch?.id || '';
  const assignedName = batch?.current_stage_assigned_to_name || batch?.assigned_to_name;

  return (
    <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
      <div className="px-2 sm:px-3 lg:px-4 py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary-100 rounded-lg">
                <ClipboardList className="w-5 h-5 text-primary-600" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  {batchNumber ? `${batchNumber} - ${displayProductName}` : displayProductName}
                </h1>
                <div className="flex items-center gap-3">
                  <p className="text-sm text-gray-600">Planning Stage - Prepare and plan your production batch</p>
                  {assignedName && (
                    <span className="flex items-center gap-1 text-xs text-blue-700 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full">
                      <User className="w-3 h-3" />
                      {assignedName}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Forward to Next Person */}
            {onAssign && (
              <Button
                onClick={onAssign}
                variant="outline"
                size="sm"
                className="text-blue-700 border-blue-300 hover:bg-blue-50"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Forward to Next Person
              </Button>
            )}
            {/* Edit Button - Only show when batch is in planning stage */}
            {batch && batch.status === 'planned' && onEdit && (
              <Button
                onClick={onEdit}
                variant="outline"
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit Batch
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

