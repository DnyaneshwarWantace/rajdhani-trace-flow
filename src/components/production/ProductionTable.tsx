import type { ProductionBatch } from '@/services/productionService';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Eye, ClipboardList, Factory, Trash, Package, CheckCircle, Copy, AlertTriangle } from 'lucide-react';
import { TruncatedText } from '@/components/ui/TruncatedText';
import { formatDate } from '@/utils/formatHelpers';
import { useNavigate } from 'react-router-dom';

interface ProductionTableProps {
  batches: ProductionBatch[];
  onView: (batch: ProductionBatch) => void;
  onDelete: (batch: ProductionBatch) => void;
  onDuplicate?: (batch: ProductionBatch) => void;
  canDelete: boolean;
  allBatches?: ProductionBatch[]; // All batches to check for duplicates
}

export default function ProductionTable({
  batches,
  onView,
  onDelete,
  onDuplicate,
  canDelete,
  allBatches = [],
}: ProductionTableProps) {
  const getAttachedOrderNumbers = (notes?: string): string[] => {
    if (!notes) return [];
    const match = notes.match(/Attached Orders:\s*(.+)$/i);
    if (!match?.[1]) return [];
    const raw = match[1]
      .split('·')[0]
      .trim();
    const idMatches = raw.match(/[A-Z]{2,}-\d{6}-\d{3,}/g) || [];
    const parsed = (idMatches.length > 0 ? idMatches : raw.split(','))
      .map((s) => s.trim())
      .filter(Boolean);
    return Array.from(new Set(parsed));
  };
  const getAttachedOrderCustomers = (notes?: string): string[] => {
    if (!notes) return [];
    const match = notes.match(/Attached Customers:\s*(.+)$/i);
    if (match?.[1]) {
      const parsed = match[1]
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .map((entry) => entry.split(':').slice(1).join(':').trim())
        .filter(Boolean);
      if (parsed.length > 0) return Array.from(new Set(parsed));
    }
    const fallback = notes.match(/Order\s+[A-Z]{2,}-\d{6}-\d{3,}\s+For\s+(.+?)(?:\s*·|$)/i)?.[1]?.trim();
    return fallback ? [fallback] : [];
  };
  const getAttachedOrderCustomerMap = (notes?: string): Record<string, string> => {
    if (!notes) return {};
    const map: Record<string, string> = {};
    const orderIds = getAttachedOrderNumbers(notes);
    const customersRawMatch = notes.match(/Attached Customers:\s*(.+)$/i);
    const customersRaw = customersRawMatch?.[1] || '';
    if (customersRaw) {
      const entries = customersRaw.split(',').map((s) => s.trim()).filter(Boolean);
      entries.forEach((entry, idx) => {
        const [left, ...rightParts] = entry.split(':');
        const possibleOrderId = (left || '').trim();
        const possibleCustomer = rightParts.join(':').trim();
        if (possibleCustomer && /[A-Z]{2,}-\d{6}-\d{3,}/.test(possibleOrderId)) {
          map[possibleOrderId] = possibleCustomer;
          return;
        }
        if (orderIds[idx] && entry) {
          map[orderIds[idx]] = possibleCustomer || entry;
        }
      });
    }
    if (Object.keys(map).length === 0) {
      const fallback = notes.match(/Order\s+([A-Z]{2,}-\d{6}-\d{3,})\s+For\s+(.+?)(?:\s*·|$)/i);
      if (fallback?.[1] && fallback?.[2]) {
        map[fallback[1].trim()] = fallback[2].trim();
      }
    }
    return map;
  };
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

  // Check if a batch can be duplicated
  const canDuplicate = (batch: ProductionBatch) => {
    if (batch.status !== 'completed') return false;
    if (!onDuplicate) return false;
    
    // Check if this batch has already been duplicated and the duplicate is not completed
    const existingDuplicate = allBatches.find(
      (b) => b.duplicated_from === batch.id && b.status !== 'completed'
    );
    
    return !existingDuplicate;
  };

  // Determine current stage based on batch stage fields (fast, no API calls)
  const getCurrentStage = (batch: ProductionBatch) => {
    // If batch is cancelled, show cancelled
    if (batch.status === 'cancelled') {
      return 'cancelled';
    }

    // If batch is completed, show completed
    if (batch.status === 'completed') {
      return 'completed';
    }

    // If batch is planned, show planning
    if (batch.status === 'planned') {
      return 'planning';
    }

    // For in_progress/in_production batches. Order: planning → machine → individual products → wastage (last).
    if (batch.status === 'in_progress' || batch.status === 'in_production') {
      // Batch fully completed
      if (batch.final_stage?.status === 'completed' || batch.wastage_stage?.status === 'completed') {
        return 'completed';
      }

      // Wastage in progress → current step is wastage
      if (batch.wastage_stage?.status === 'in_progress') {
        return 'wastage';
      }

      // Machine completed → next is individual products (then wastage)
      if (batch.machine_stage?.status === 'completed') {
        return 'individual_products';
      }
      if (batch.machine_stage?.status === 'in_progress' || batch.machine_stage?.status === 'not_started') {
        // If machine stage exists and planning is completed, show machine
        if (batch.planning_stage?.status === 'completed') {
          return 'machine';
        }
      }

      // Check planning stage
      if (batch.planning_stage?.status === 'completed') {
        return 'machine';
      }

      // If batch is in_production but no stage info, default to machine
      return 'machine';
    }

    // Default fallback
    return 'planning';
  };

  const handleStageClick = (e: React.MouseEvent, batch: ProductionBatch) => {
    e.stopPropagation();
    const stage = getCurrentStage(batch);
    if (stage === 'planning') navigate(`/production/planning?batchId=${batch.id}`);
    else if (stage === 'machine') navigate(`/production/${batch.id}/machine`);
    else if (stage === 'wastage') navigate(`/production/${batch.id}/wastage`);
    else if (stage === 'individual_products') navigate(`/production/${batch.id}/individual-products`);
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

    if (stage === 'individual_products') {
      return (
        <Button variant="outline" size="sm" className="text-xs py-1 h-7 bg-purple-50 border-purple-300 text-purple-700" onClick={(e) => handleStageClick(e, batch)}>
          <Package className="w-3 h-3 mr-1" />
          Ind. Products
        </Button>
      );
    }

    if (stage === 'completed') {
      return (
        <Badge className="bg-green-100 text-green-700 border-green-300 px-2 py-1">
          <CheckCircle className="w-3 h-3 mr-1 inline" />
          Completed
        </Badge>
      );
    }

    if (stage === 'cancelled') {
      return (
        <Badge className="bg-red-100 text-red-700 border-red-300 px-2 py-1">
          <X className="w-3 h-3 mr-1 inline" />
          Cancelled
        </Badge>
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
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left text-gray-500">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Batch No.</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Due Date</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stage</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {batches.map((batch) => (
              <tr
                key={batch.id}
                className="hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={(e) => handleStageClick(e, batch)}
              >
                <td className="px-4 py-2">
                  <div className="text-sm font-medium text-gray-900 whitespace-nowrap">
                    {batch.batch_number}
                  </div>
                </td>
                <td className="px-4 py-2 max-w-[150px]">
                  <div className="text-sm text-gray-900 truncate"><TruncatedText text={batch.product_name || 'N/A'} maxLength={20} as="span" /></div>
                  <div className="text-[11px] text-gray-500 mt-0.5 truncate"><TruncatedText text={`${batch.final_target_display || batch.product_name || 'Product'} (${batch.planned_quantity})`} maxLength={25} as="span" /></div>
                </td>
                <td className="px-4 py-2 max-w-[130px]">
                  {(batch.order_number || batch.customer_name || getAttachedOrderNumbers(batch.notes).length > 0) ? (
                    <div className="space-y-0.5">
                      {(() => {
                        const attachedOrders = getAttachedOrderNumbers(batch.notes);
                        const orderCustomerMap = getAttachedOrderCustomerMap(batch.notes);
                        const primaryOrder = batch.order_number || attachedOrders[0] || 'Linked Order';
                        const primaryCustomer =
                          batch.customer_name ||
                          orderCustomerMap[primaryOrder] ||
                          getAttachedOrderCustomers(batch.notes)[0] ||
                          'Customer not linked';
                        return (
                          <>
                            <div className="text-xs font-medium text-gray-900 truncate">{primaryOrder}</div>
                            <div className="text-xs text-gray-600 truncate">{primaryCustomer}</div>
                          </>
                        );
                      })()}
                      {getAttachedOrderNumbers(batch.notes).length > 1 && (
                        <div className="text-[11px] text-indigo-700 truncate">
                          +{getAttachedOrderNumbers(batch.notes).length - 1} more
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400 whitespace-nowrap">No order</span>
                  )}
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900" data-quantity={batch.planned_quantity}>
                  {batch.planned_quantity}
                </td>
                <td className="px-4 py-2 whitespace-nowrap">
                  <div className="flex flex-col gap-1">
                    <Badge className={getStatusColor(batch.status)}>
                      {getStatusLabel(batch.status)}
                    </Badge>
                    <Badge className={`${getPriorityColor(batch.priority)} text-[10px] px-1.5 py-0`}>
                      {batch.priority.toUpperCase()}
                    </Badge>
                  </div>
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-xs">
                  {batch.completion_date ? (
                    <div className="flex flex-col gap-0.5">
                      {batch.status === 'completed' ? (
                        <>
                          <div className="text-gray-400">Exp: {formatDate(batch.completion_date)}</div>
                          {batch.final_stage?.completed_at && (
                            <div className="text-gray-900 font-medium">Act: {formatDate(batch.final_stage.completed_at)}</div>
                          )}
                        </>
                      ) : (
                        <div className={`flex items-center gap-1 ${isOverdue(batch) ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                          {isOverdue(batch) && <AlertTriangle className="w-3 h-3" />}
                          {formatDate(batch.completion_date)}
                        </div>
                      )}
                    </div>
                  ) : '-'}
                </td>
                <td className="px-4 py-2 whitespace-nowrap">
                  {getStageButton(batch)}
                </td>
                <td className="px-4 py-2 whitespace-nowrap">
                  {(() => {
                    const name = batch.current_stage_assigned_to_name || batch.assigned_to_name;
                    if (name) {
                      return (
                        <span className="flex items-center gap-1.5 text-xs text-gray-700">
                          <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-semibold text-xs shrink-0">
                            {name.charAt(0).toUpperCase()}
                          </span>
                          <span className="truncate max-w-[100px]">{name}</span>
                        </span>
                      );
                    }
                    return <span className="text-xs text-gray-400">—</span>;
                  })()}
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onView(batch)}
                      className="text-blue-600 hover:text-blue-900 hover:bg-blue-50"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    {/* Show Duplicate button for completed batches that can be duplicated */}
                    {canDuplicate(batch) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDuplicate?.(batch)}
                        className="text-green-600 hover:text-green-900 hover:bg-green-50"
                        title="Duplicate Batch"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    )}
                    {/* Only show Cancel button for planned stage */}
                    {batch.status === 'planned' && canDelete && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDelete(batch)}
                        className="text-red-600 hover:text-red-900 hover:bg-red-50 h-7 w-7 p-0"
                        title="Cancel Production"
                      >
                        <X className="w-4 h-4" />
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

