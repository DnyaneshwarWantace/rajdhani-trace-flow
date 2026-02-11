import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Eye, ClipboardList, Factory, Copy, AlertTriangle } from 'lucide-react';
import { formatDate } from '@/utils/formatHelpers';
import { TruncatedText } from '@/components/ui/TruncatedText';
import type { ProductionBatch } from '@/services/productionService';

interface ProductionCardProps {
  batch: ProductionBatch;
  onDelete: (batch: ProductionBatch) => void;
  onDuplicate?: (batch: ProductionBatch) => void;
  canDelete: boolean;
  allBatches?: ProductionBatch[];
}

export default function ProductionCard({ batch, onDelete, onDuplicate, canDelete, allBatches = [] }: ProductionCardProps) {
  const navigate = useNavigate();

  const isOverdue = (batch: ProductionBatch): boolean => {
    if (!batch.completion_date || batch.status === 'completed' || batch.status === 'cancelled') {
      return false;
    }
    const completionDate = new Date(batch.completion_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    completionDate.setHours(0, 0, 0, 0);
    return completionDate < today;
  };

  const handleView = () => {
    navigate(`/production/${batch.id}`);
  };

  const getCurrentStage = () => {
    // Determine current stage based on batch status
    // This logic should match your backend stage tracking
    if (batch.status === 'cancelled') return 'cancelled';
    if (batch.status === 'planned') return 'planning';
    if (batch.status === 'in_progress' || batch.status === 'in_production') {
      // You can add more logic here to determine exact stage
      return 'machine'; // Default to machine for active batches
    }
    if (batch.status === 'completed') return 'completed';
    return 'planning';
  };

  const handleStageClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const stage = getCurrentStage();
    if (stage === 'cancelled') navigate(`/production/${batch.id}`);
    else if (stage === 'planning') navigate(`/production/planning?batchId=${batch.id}`);
    else if (stage === 'machine') navigate(`/production/${batch.id}/machine`);
  };

  // Check if a batch can be duplicated
  const canDuplicate = () => {
    if (batch.status !== 'completed') return false;
    if (!onDuplicate) return false;
    
    // Check if this batch has already been duplicated and the duplicate is not completed
    const existingDuplicate = allBatches.find(
      (b) => b.duplicated_from === batch.id && b.status !== 'completed'
    );
    
    return !existingDuplicate;
  };

  const getStageButton = () => {
    const stage = getCurrentStage();

    if (stage === 'cancelled') {
      return (
        <Badge
          role="button"
          tabIndex={0}
          className="bg-red-100 text-red-700 border-red-300 px-2 py-1 w-full justify-center cursor-pointer hover:bg-red-200 transition-colors"
          onClick={handleStageClick}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleStageClick(e as unknown as React.MouseEvent); } }}
        >
          <X className="w-3 h-3 mr-1 inline" />
          Cancelled
        </Badge>
      );
    }

    if (stage === 'planning') {
      return (
        <Button variant="outline" size="sm" className="w-full text-xs py-1 h-7 bg-blue-50 border-blue-300 text-blue-700" onClick={handleStageClick}>
          <ClipboardList className="w-3 h-3 mr-1" />
          Planning
        </Button>
      );
    }

    if (stage === 'machine') {
      return (
        <Button variant="outline" size="sm" className="w-full text-xs py-1 h-7 bg-green-50 border-green-300 text-green-700" onClick={handleStageClick}>
          <Factory className="w-3 h-3 mr-1" />
          Machine
        </Button>
      );
    }

    return null;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
      case 'in_production':
        return 'bg-blue-100 text-blue-800';
      case 'planned':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    if (status === 'in_progress' || status === 'in_production') {
      return 'ACTIVE';
    }
    return status.replace('_', ' ').toUpperCase();
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="p-3">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <h3 className="font-semibold text-sm mb-1">{batch.batch_number}</h3>
            <TruncatedText text={batch.product_name || 'N/A'} maxLength={40} className="text-xs text-gray-600 mb-1" />
            <div className="flex items-center gap-1 flex-wrap">
              <Badge className={`${getStatusColor(batch.status)} text-[10px] px-1.5 py-0.5`}>
                {getStatusLabel(batch.status)}
              </Badge>
              <Badge className={`${getPriorityColor(batch.priority)} text-[10px] px-1.5 py-0.5`}>
                {batch.priority.toUpperCase()}
              </Badge>
            </div>
          </div>
        </div>

        <div className="space-y-1 text-[10px] mb-2">
          <div className="flex justify-between gap-2">
            <span className="text-gray-600 flex-shrink-0">Quantity:</span>
            <span className="font-medium text-gray-900">
              {batch.planned_quantity}
            </span>
          </div>

          {/* Product Details */}
          {batch.category && (
            <div className="flex justify-between items-start gap-2 min-w-0">
              <span className="text-gray-600 flex-shrink-0">Category:</span>
              <span className="text-gray-900 min-w-0 flex-1 text-right break-words line-clamp-1">
                {batch.category}
                {batch.subcategory && (
                  <span className="text-gray-500"> / {batch.subcategory}</span>
                )}
              </span>
            </div>
          )}
          {(batch.length || batch.width) && (
            <div className="flex justify-between items-start gap-2 min-w-0">
              <span className="text-gray-600 flex-shrink-0">Dimensions:</span>
              <span className="text-gray-900 min-w-0 flex-1 text-right break-words line-clamp-1">
                {batch.length && `${batch.length}${batch.length_unit || ''}`}
                {batch.length && batch.width && ' × '}
                {batch.width && `${batch.width}${batch.width_unit || ''}`}
              </span>
            </div>
          )}
          {batch.weight && batch.weight !== 'N/A' && (
            <div className="flex justify-between gap-2">
              <span className="text-gray-600 flex-shrink-0">Weight:</span>
              <span className="font-medium text-gray-900 truncate">
                {batch.weight} {batch.weight_unit || ''}
              </span>
            </div>
          )}
          {batch.color && batch.color !== 'N/A' && (
            <div className="flex justify-between items-start gap-2 min-w-0">
              <span className="text-gray-600 flex-shrink-0">Color:</span>
              <span className="text-gray-900 min-w-0 flex-1 text-right break-words line-clamp-1">{batch.color}</span>
            </div>
          )}
          {batch.pattern && batch.pattern !== 'N/A' && (
            <div className="flex justify-between items-start gap-2 min-w-0">
              <span className="text-gray-600 flex-shrink-0">Pattern:</span>
              <span className="text-gray-900 min-w-0 flex-1 text-right break-words line-clamp-1">{batch.pattern}</span>
            </div>
          )}

          {batch.start_date && (
            <div className="flex justify-between gap-2">
              <span className="text-gray-600 flex-shrink-0">Started:</span>
              <span className="font-medium text-gray-900 truncate">{formatDate(batch.start_date)}</span>
            </div>
          )}
          {batch.completion_date && (
            <div className="flex flex-col gap-1">
              {batch.status === 'completed' ? (
                <>
                  <div className="flex justify-between gap-2">
                    <span className="text-gray-600 flex-shrink-0 text-xs">Expected:</span>
                    <span className="text-gray-500 text-xs truncate">{formatDate(batch.completion_date)}</span>
                  </div>
                  {batch.final_stage?.completed_at && (
                    <div className="flex justify-between gap-2">
                      <span className="text-gray-600 flex-shrink-0 text-xs">Actual:</span>
                      <span className="font-medium text-gray-900 text-xs truncate">{formatDate(batch.final_stage.completed_at)}</span>
                    </div>
                  )}
                </>
              ) : (
                <div className={`flex justify-between gap-2 ${isOverdue(batch) ? 'items-start' : ''}`}>
                  <span className="text-gray-600 flex-shrink-0">Expected:</span>
                  <div className={`flex items-center gap-1 ${isOverdue(batch) ? 'text-red-600 font-medium' : 'text-gray-900'}`}>
                    {isOverdue(batch) && <AlertTriangle className="w-3 h-3 flex-shrink-0" />}
                    <span className="truncate">{formatDate(batch.completion_date)}</span>
                  </div>
                </div>
              )}
            </div>
          )}
          {batch.operator && (
            <div className="flex justify-between items-start gap-2 min-w-0">
              <span className="text-gray-600 flex-shrink-0">Operator:</span>
              <span className="text-gray-900 min-w-0 flex-1 text-right break-words line-clamp-1">{batch.operator}</span>
            </div>
          )}
          {batch.supervisor && (
            <div className="flex justify-between items-start gap-2 min-w-0">
              <span className="text-gray-600 flex-shrink-0">Supervisor:</span>
              <span className="text-gray-900 min-w-0 flex-1 text-right break-words line-clamp-1">{batch.supervisor}</span>
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          {getStageButton()}
          <div className="flex gap-1.5">
            <Button variant="outline" size="sm" className="flex-1 text-xs py-1 h-7" onClick={handleView}>
              <Eye className="w-3 h-3 mr-1" />
              View
            </Button>
            {/* Show Duplicate button for completed batches that can be duplicated */}
            {canDuplicate() && (
              <Button
                variant="outline"
                size="sm"
                className="text-xs py-1 h-7 px-2 text-green-600 hover:text-green-900 hover:bg-green-50 border-green-300"
                onClick={() => onDuplicate?.(batch)}
                title="Duplicate Batch"
              >
                <Copy className="w-3 h-3" />
              </Button>
            )}
            {/* Only show Cancel button for planned stage */}
            {batch.status === 'planned' && canDelete && (
              <Button
                variant="outline"
                size="sm"
                className="text-xs py-1 h-7 px-2 text-red-600 hover:text-red-900 hover:bg-red-50 border-red-300"
                onClick={() => onDelete(batch)}
                title="Cancel Production"
              >
                <X className="w-3 h-3 mr-1" />
                Cancel
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

