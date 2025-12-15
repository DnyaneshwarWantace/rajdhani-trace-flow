import { ArrowLeft, Edit, Factory } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TruncatedText } from '@/components/ui/TruncatedText';
import type { ProductionBatch } from '@/services/productionService';

interface ProductionDetailHeaderProps {
  batch: ProductionBatch;
  onBack: () => void;
  onEdit: () => void;
}

export default function ProductionDetailHeader({
  batch,
  onBack,
  onEdit,
}: ProductionDetailHeaderProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'in_progress':
      case 'in_production':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'planned':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
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
        return 'bg-red-100 text-red-700 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'low':
        return 'bg-gray-100 text-gray-700 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
      <div className="flex items-center gap-3 sm:gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="flex-shrink-0"
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 bg-primary-100 rounded-lg flex items-center justify-center">
            <Factory className="w-5 h-5 sm:w-6 sm:h-6 text-primary-600" />
          </div>
          <div className="min-w-0 flex-1 overflow-hidden">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 break-words">
              <TruncatedText text={batch.batch_number} maxLength={60} as="span" className="inline-block max-w-full" />
            </h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge className={getStatusColor(batch.status)}>
                {getStatusLabel(batch.status)}
              </Badge>
              <Badge className={getPriorityColor(batch.priority)}>
                {batch.priority.toUpperCase()}
              </Badge>
              {batch.product_name && (
                <Badge variant="outline" className="text-xs">
                  <TruncatedText text={batch.product_name} maxLength={30} />
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>
      <Button
        onClick={onEdit}
        className="w-full sm:w-auto"
        variant="outline"
      >
        <Edit className="w-4 h-4 mr-2" />
        Edit Batch
      </Button>
    </div>
  );
}


