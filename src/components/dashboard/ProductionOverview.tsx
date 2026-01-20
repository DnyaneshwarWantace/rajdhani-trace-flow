import { useNavigate } from 'react-router-dom';
import { Factory, ArrowRight, Clock, Play, CheckCircle, AlertCircle } from 'lucide-react';

interface ProductionBatch {
  id: string;
  batch_number: string;
  product_name?: string;
  planned_quantity: number;
  actual_quantity?: number;
  status: 'planned' | 'in_progress' | 'in_production' | 'completed' | 'cancelled' | 'on_hold';
  completion_date?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

interface ProductionOverviewProps {
  batches: ProductionBatch[];
  loading: boolean;
}

const statusConfig: Record<string, { label: string; icon: any; color: string }> = {
  planned: { label: 'Planned', icon: Clock, color: 'bg-gray-100 text-gray-700' },
  in_progress: { label: 'In Progress', icon: Play, color: 'bg-blue-100 text-blue-700' },
  in_production: { label: 'In Production', icon: Factory, color: 'bg-purple-100 text-purple-700' },
  completed: { label: 'Completed', icon: CheckCircle, color: 'bg-green-100 text-green-700' },
  on_hold: { label: 'On Hold', icon: AlertCircle, color: 'bg-orange-100 text-orange-700' },
  cancelled: { label: 'Cancelled', icon: AlertCircle, color: 'bg-red-100 text-red-700' },
};

const priorityConfig: Record<string, { color: string }> = {
  low: { color: 'bg-gray-100 text-gray-600' },
  medium: { color: 'bg-blue-100 text-blue-600' },
  high: { color: 'bg-red-100 text-red-600' },
  urgent: { color: 'bg-red-200 text-red-800' },
};

export default function ProductionOverview({ batches, loading }: ProductionOverviewProps) {
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Production Overview</h2>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Production Overview</h2>
        <button
          onClick={() => navigate('/production')}
          className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
        >
          View All
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {batches.length === 0 ? (
        <div className="text-center py-8">
          <Factory className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500">No active production batches</p>
        </div>
      ) : (
        <div className="space-y-3">
          {batches.slice(0, 5).map((batch) => {
            const status = statusConfig[batch.status] || statusConfig.planned;
            const priority = priorityConfig[batch.priority] || priorityConfig.medium;
            const StatusIcon = status.icon;

            return (
              <div
                key={batch.id}
                onClick={() => navigate(`/production/${batch.id}`)}
                className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Factory className="w-5 h-5 text-orange-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {batch.batch_number}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{batch.product_name || 'Product'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${priority.color} whitespace-nowrap`}>
                    {batch.priority.toUpperCase()}
                  </span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${status.color} flex items-center gap-1 whitespace-nowrap`}>
                    <StatusIcon className="w-3 h-3" />
                    {status.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
