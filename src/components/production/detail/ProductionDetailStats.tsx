import { Card, CardContent } from '@/components/ui/card';
import { Package, CheckCircle, Clock, TrendingUp } from 'lucide-react';
import type { ProductionBatch } from '@/services/productionService';

interface ProductionDetailStatsProps {
  batch: ProductionBatch;
}

export default function ProductionDetailStats({ batch }: ProductionDetailStatsProps) {
  const efficiency = batch.planned_quantity > 0 && batch.actual_quantity
    ? ((batch.actual_quantity / batch.planned_quantity) * 100).toFixed(1)
    : '0';

  const getProgressPercentage = () => {
    if (batch.status === 'completed') return 100;
    if (batch.status === 'in_progress' || batch.status === 'in_production') return 50;
    if (batch.status === 'planned') return 0;
    return 0;
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <Card>
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm text-gray-600 mb-1">Planned Quantity</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">
                {batch.planned_quantity}
              </p>
            </div>
            <div className="flex-shrink-0 ml-4">
              <Package className="w-8 h-8 sm:w-10 sm:h-10 text-blue-600 opacity-50" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm text-gray-600 mb-1">Actual Quantity</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">
                {batch.actual_quantity || 0}
              </p>
              {batch.actual_quantity && batch.actual_quantity !== batch.planned_quantity && (
                <p className="text-xs text-gray-500 mt-1">
                  {batch.actual_quantity > batch.planned_quantity ? '+' : ''}
                  {batch.actual_quantity - batch.planned_quantity} difference
                </p>
              )}
            </div>
            <div className="flex-shrink-0 ml-4">
              <CheckCircle className="w-8 h-8 sm:w-10 sm:h-10 text-green-600 opacity-50" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm text-gray-600 mb-1">Efficiency</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">
                {efficiency}%
              </p>
            </div>
            <div className="flex-shrink-0 ml-4">
              <TrendingUp className="w-8 h-8 sm:w-10 sm:h-10 text-purple-600 opacity-50" />
            </div>
          </div>
          <div className="mt-3">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="h-2 rounded-full transition-all bg-primary-600"
                style={{ width: `${getProgressPercentage()}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {getProgressPercentage()}% complete
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm text-gray-600 mb-1">Duration</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">
                {batch.start_date && batch.completion_date
                  ? `${Math.ceil((new Date(batch.completion_date).getTime() - new Date(batch.start_date).getTime()) / (1000 * 60 * 60 * 24))} days`
                  : batch.start_date
                  ? 'In Progress'
                  : 'Not Started'}
              </p>
            </div>
            <div className="flex-shrink-0 ml-4">
              <Clock className="w-8 h-8 sm:w-10 sm:h-10 text-orange-600 opacity-50" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


