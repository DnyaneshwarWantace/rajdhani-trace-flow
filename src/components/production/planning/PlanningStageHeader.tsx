import { ArrowLeft, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ClipboardList } from 'lucide-react';
import type { ProductionBatch } from '@/services/productionService';

interface PlanningStageHeaderProps {
  onBack: () => void;
  onEdit?: () => void;
  batch?: ProductionBatch | null;
  productName?: string;
}

export default function PlanningStageHeader({ onBack, onEdit, batch, productName }: PlanningStageHeaderProps) {
  const displayProductName = productName || batch?.product_name || 'Product';
  const batchNumber = batch?.batch_number || batch?.id || '';
  
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
                <p className="text-sm text-gray-600">Planning Stage - Prepare and plan your production batch</p>
              </div>
            </div>
          </div>
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
  );
}

