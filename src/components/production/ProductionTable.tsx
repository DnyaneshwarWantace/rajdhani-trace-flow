import type { ProductionBatch } from '@/services/productionService';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, Eye, ClipboardList, Factory, Trash, Package } from 'lucide-react';
import { TruncatedText } from '@/components/ui/TruncatedText';
import { formatDate } from '@/utils/formatHelpers';
import { useNavigate } from 'react-router-dom';

interface ProductionTableProps {
  batches: ProductionBatch[];
  onView: (batch: ProductionBatch) => void;
  onEdit: (batch: ProductionBatch) => void;
  onDelete: (batch: ProductionBatch) => void;
  canDelete: boolean;
}

export default function ProductionTable({
  batches,
  onView,
  onEdit,
  onDelete,
  canDelete,
}: ProductionTableProps) {
  const navigate = useNavigate();

  const getCurrentStage = (batch: ProductionBatch) => {
    if (batch.status === 'planned') return 'planning';
    if (batch.status === 'in_progress' || batch.status === 'in_production') {
      return 'machine';
    }
    if (batch.status === 'completed') return 'completed';
    return 'planning';
  };

  const handleStageClick = (e: React.MouseEvent, batch: ProductionBatch) => {
    e.stopPropagation();
    const stage = getCurrentStage(batch);
    if (stage === 'planning') navigate(`/production/planning?batchId=${batch.id}`);
    else if (stage === 'machine') navigate(`/production/${batch.id}/machine`);
    else if (stage === 'wastage') navigate(`/production/${batch.id}/wastage`);
    else if (stage === 'individual-products') navigate(`/production/${batch.id}/individual-products`);
  };

  const getStageButton = (batch: ProductionBatch) => {
    const stage = getCurrentStage(batch);

    if (stage === 'planning') {
      return (
        <Button variant="outline" size="sm" className="text-xs py-1 h-7 bg-blue-50 border-blue-300 text-blue-700" onClick={(e) => handleStageClick(e, batch)}>
          <ClipboardList className="w-3 h-3 mr-1" />
          Planning
        </Button>
      );
    }

    if (stage === 'machine') {
      return (
        <Button variant="outline" size="sm" className="text-xs py-1 h-7 bg-green-50 border-green-300 text-green-700" onClick={(e) => handleStageClick(e, batch)}>
          <Factory className="w-3 h-3 mr-1" />
          Machine
        </Button>
      );
    }

    if (stage === 'wastage') {
      return (
        <Button variant="outline" size="sm" className="text-xs py-1 h-7 bg-orange-50 border-orange-300 text-orange-700" onClick={(e) => handleStageClick(e, batch)}>
          <Trash className="w-3 h-3 mr-1" />
          Wastage
        </Button>
      );
    }

    if (stage === 'individual-products') {
      return (
        <Button variant="outline" size="sm" className="text-xs py-1 h-7 bg-purple-50 border-purple-300 text-purple-700" onClick={(e) => handleStageClick(e, batch)}>
          <Package className="w-3 h-3 mr-1" />
          Products
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
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left text-gray-500">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Batch Number
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Product
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Quantity
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Priority
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Start Date
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Completion Date
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Stage
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {batches.map((batch) => (
              <tr
                key={batch.id}
                className="hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => onView(batch)}
              >
                <td className="px-4 py-4">
                  <div className="text-sm font-medium text-gray-900">
                    {batch.batch_number}
                  </div>
                </td>
                <td className="px-4 py-4">
                  <TruncatedText text={batch.product_name || 'N/A'} maxLength={30} className="text-sm text-gray-900" />
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900" data-quantity={batch.planned_quantity}>
                  {batch.planned_quantity}
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <Badge className={getStatusColor(batch.status)}>
                    {getStatusLabel(batch.status)}
                  </Badge>
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <Badge className={getPriorityColor(batch.priority)}>
                    {batch.priority.toUpperCase()}
                  </Badge>
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                  {batch.start_date ? formatDate(batch.start_date) : '-'}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                  {batch.completion_date ? formatDate(batch.completion_date) : '-'}
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  {getStageButton(batch)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onView(batch)}
                      className="text-blue-600 hover:text-blue-900 hover:bg-blue-50"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(batch)}
                      className="text-primary-600 hover:text-primary-900 hover:bg-primary-50"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    {canDelete && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDelete(batch)}
                        className="text-red-600 hover:text-red-900 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

