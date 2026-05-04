import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Factory, Calendar, Clock, AlertCircle, User, ClipboardList, ChevronRight } from 'lucide-react';
import { ProductionService, type ProductionBatch, type ProductionTask } from '@/services/productionService';
import { formatIndianDate } from '@/utils/formatHelpers';
import type { Order } from '@/services/orderService';

interface OrderProductionInfoProps {
  order: Order;
  compact?: boolean;
}

export default function OrderProductionInfo({ order, compact = false }: OrderProductionInfoProps) {
  const navigate = useNavigate();
  const [productionBatches, setProductionBatches] = useState<ProductionBatch[]>([]);
  const [productionTasks, setProductionTasks] = useState<ProductionTask[]>([]);
  const [loading, setLoading] = useState(false);

  const normalizedOrderItems: Array<{
    productType: string;
    productId: string;
    productName: string;
    quantity: number;
  }> = (((order as any)?.items || []) as any[]).map((item: any) => ({
    productType: item.productType || item.product_type,
    productId: item.productId || item.product_id,
    productName: item.productName || item.product_name,
    quantity: Number(item.quantity || 0),
  }));

  const firstProductItem = normalizedOrderItems.find(item => item.productType === 'product' && item.productId);
  const compactMinHeight = 'min-h-[3.5rem]';
  const orderId = order?.id;

  useEffect(() => {
    if (orderId) loadProductionInfo();
  }, [orderId]);

  const getAttachedOrderNumbers = (notes?: string): string[] => {
    if (!notes) return [];
    const match = notes.match(/Attached Orders:\s*(.+)$/i);
    if (!match?.[1]) return [];
    const raw = match[1].split('·')[0].trim();
    const orderNos = raw.match(/[A-Z]{2,}-\d{6}-\d{3,}/g) || [];
    return Array.from(new Set(orderNos.map((v) => v.trim()).filter(Boolean)));
  };

  const getAttachedOrderIds = (notes?: string): string[] => {
    if (!notes) return [];
    const match = notes.match(/Attached Order IDs:\s*(.+?)(?:\s*·|$)/i);
    if (!match?.[1]) return [];
    return Array.from(
      new Set(match[1].split(',').map((v) => v.trim()).filter(Boolean))
    );
  };

  const loadProductionInfo = async () => {
    setLoading(true);
    try {
      const productIds = normalizedOrderItems
        .filter((item) => item.productType === 'product' && item.productId)
        .map((item) => item.productId)
        .filter((id, index, self) => self.indexOf(id) === index) || [];

      const [productBatchesResults, orderBatchesResult, allBatchesResult, tasksResult] = await Promise.all([
        productIds.length > 0
          ? Promise.all(productIds.map(productId =>
              ProductionService.getBatches({ product_id: productId, status: 'all' })
            ))
          : Promise.resolve([]),
        ProductionService.getBatches({ order_id: order.id }),
        ProductionService.getBatches({ limit: 500 }),
        ProductionService.getTasks({ order_id: order.id, limit: 50 }),
      ]);

      const allBatches: ProductionBatch[] = [];
      productBatchesResults.forEach(({ data }) => {
        if (data) allBatches.push(...data.filter((b: ProductionBatch) => b.status !== 'cancelled'));
      });
      const { data: orderBatches } = orderBatchesResult;
      if (orderBatches) allBatches.push(...orderBatches.filter((b) => b.status !== 'cancelled'));

      const orderNo = order.orderNumber || '';
      const linkedFromAll = (allBatchesResult.data || []).filter((b) => {
        if (b.status === 'cancelled') return false;
        if (b.order_id === order.id) return true;
        if (orderNo && b.order_number === orderNo) return true;
        if (getAttachedOrderIds(b.notes).includes(order.id)) return true;
        return getAttachedOrderNumbers(b.notes).includes(orderNo);
      });
      allBatches.push(...linkedFromAll);

      const uniqueBatches = allBatches.filter((batch, index, self) =>
        index === self.findIndex(b => b.id === batch.id)
      );
      uniqueBatches.sort((a, b) => {
        const dateA = a.completion_date ? new Date(a.completion_date).getTime() : 0;
        const dateB = b.completion_date ? new Date(b.completion_date).getTime() : 0;
        return dateA - dateB;
      });

      setProductionBatches(uniqueBatches);

      // Show active tasks (not completed/cancelled)
      const activeTasks = (tasksResult.data || []).filter(
        t => !['completed', 'cancelled'].includes(t.status)
      );
      setProductionTasks(activeTasks);
    } catch (error) {
      console.error('Error loading production info:', error);
      setProductionBatches([]);
      setProductionTasks([]);
    } finally {
      setLoading(false);
    }
  };

  const getBatchStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in_progress':
      case 'in_production': return 'bg-blue-100 text-blue-800';
      case 'planned': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getBatchStatusLabel = (status: string) => {
    switch (status) {
      case 'in_progress':
      case 'in_production': return 'In Production';
      case 'planned': return 'Planned';
      case 'completed': return 'Completed';
      default: return status.replace('_', ' ');
    }
  };

  const getTaskStatusColor = (status: string) => {
    switch (status) {
      case 'assigned': return 'bg-blue-100 text-blue-800';
      case 'in_progress': return 'bg-purple-100 text-purple-800';
      case 'planning': return 'bg-amber-100 text-amber-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTaskStatusLabel = (status: string) => {
    switch (status) {
      case 'assigned': return 'Assigned';
      case 'in_progress': return 'In Progress';
      case 'planning': return 'Planning';
      default: return status;
    }
  };

  const handleGoToProduction = () => {
    if (!firstProductItem) return;
    navigate('/production/create', {
      state: {
        fromOrder: true,
        orderId: order.id,
        productId: firstProductItem.productId,
        productName: firstProductItem.productName,
        planned_quantity: firstProductItem.quantity ?? 0,
        expected_delivery: order.expectedDelivery,
        order_number: order.orderNumber || order.id,
        customer_name: order.customerName || '',
      },
    });
  };

  if (loading) {
    if (compact) {
      return (
        <div className={`${compactMinHeight} flex flex-col justify-center`}>
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <Clock className="w-3 h-3 animate-spin shrink-0" />
            <span>Loading production…</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
            <Calendar className="w-3 h-3 shrink-0" />
            <span>Complete: —</span>
          </div>
        </div>
      );
    }
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Clock className="w-4 h-4 animate-spin" />
            <span>Loading production info...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const hasTasks = productionTasks.length > 0;
  const hasBatches = productionBatches.length > 0;

  // Compact view
  if (compact) {
    if (!hasTasks && !hasBatches) {
      return (
        <div className={`${compactMinHeight} flex flex-col justify-center`}>
          <div className="flex items-center gap-2 text-xs flex-wrap">
            <AlertCircle className="w-3 h-3 text-gray-500 shrink-0" />
            <span className="text-gray-600">Production not started</span>
            {firstProductItem && (
              <Button
                size="sm"
                variant="outline"
                className="h-6 text-xs ml-1 shrink-0"
                onClick={(e) => { e.stopPropagation(); handleGoToProduction(); }}
              >
                <Factory className="w-3 h-3 mr-1" />
                Go to Production
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
            <Calendar className="w-3 h-3 shrink-0" />
            <span>Complete: —</span>
          </div>
        </div>
      );
    }

    const earliestBatch = hasBatches ? productionBatches[0] : null;
    const completionDate = earliestBatch?.completion_date ? formatIndianDate(earliestBatch.completion_date) : '—';
    const firstTask = hasTasks ? productionTasks[0] : null;

    return (
      <div className={`${compactMinHeight} flex flex-col justify-center gap-0.5`}>
        {hasBatches && (
          <div className="flex items-center gap-2 text-xs">
            <Factory className="w-3 h-3 text-blue-600 shrink-0" />
            <span className="text-gray-700 font-medium">Production Started</span>
            <span className="text-gray-500">· Complete: {completionDate}</span>
          </div>
        )}
        {!hasBatches && firstTask && (
          <div className="flex items-center gap-2 text-xs">
            <ClipboardList className="w-3 h-3 text-purple-600 shrink-0" />
            <span className="text-gray-700 font-medium">Assigned to {firstTask.assigned_to_name}</span>
          </div>
        )}
      </div>
    );
  }

  // Full view
  if (!hasTasks && !hasBatches) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 text-sm">
              <AlertCircle className="w-4 h-4 text-gray-500" />
              <span className="text-gray-600">Production not started</span>
            </div>
            {firstProductItem && (
              <Button size="sm" className="bg-blue-600 text-white hover:bg-blue-700" onClick={handleGoToProduction}>
                <Factory className="w-4 h-4 mr-2" />
                Go to Production
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  const stageLabelMap: Record<string, string> = {
    planning: 'Material Selection',
    machine: 'Machine Operations',
    individual: 'Individual Details',
    wastage: 'Waste Generation',
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <Factory className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-base">Production Information</h3>
          </div>
          {firstProductItem && (
            <Button size="sm" variant="outline" className="shrink-0" onClick={handleGoToProduction}>
              <Factory className="w-4 h-4 mr-2" />
              New batch
            </Button>
          )}
        </div>

        <div className="space-y-3">
          {/* Production tasks — assigned but not yet batched */}
          {productionTasks.map((task) => (
            <div key={task.id} className="p-3 bg-purple-50 rounded-lg border border-purple-200">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <ClipboardList className="w-4 h-4 text-purple-600 shrink-0" />
                  <div>
                    <div className="font-medium text-sm text-gray-900">{task.stage_product_name}</div>
                    {task.final_product_name && task.final_product_name !== task.stage_product_name && (
                      <div className="text-xs text-gray-500 mt-0.5">for {task.final_product_name}</div>
                    )}
                  </div>
                </div>
                <Badge className={getTaskStatusColor(task.status)}>
                  {getTaskStatusLabel(task.status)}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs mt-2">
                <div className="flex items-center gap-1">
                  <User className="w-3 h-3 text-gray-500" />
                  <span className="text-gray-600">Assigned to:</span>
                  <span className="font-medium ml-1 text-purple-800">{task.assigned_to_name}</span>
                </div>
                <div>
                  <span className="text-gray-600">Qty:</span>
                  <span className="font-medium ml-1">{task.planned_quantity}</span>
                </div>
              </div>
              <div className="mt-2">
                <p className="text-[11px] text-purple-700 font-medium">Task assigned — production batch not yet created</p>
              </div>
            </div>
          ))}

          {/* Production batches */}
          {productionBatches.map((batch) => {
            const currentStageLabel = batch.current_stage ? stageLabelMap[batch.current_stage] || batch.current_stage : null;
            const assignedName = batch.current_stage_assigned_to_name || batch.assigned_to_name;

            return (
              <div key={batch.id} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="font-medium text-sm text-gray-900">{batch.batch_number}</div>
                    {batch.product_name && (
                      <div className="text-xs text-gray-600 mt-1">{batch.product_name}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getBatchStatusColor(batch.status)}>
                      {getBatchStatusLabel(batch.status)}
                    </Badge>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0 text-gray-400 hover:text-gray-700"
                      onClick={() => navigate(`/production/planning?batchId=${batch.id}`)}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs mt-2">
                  <div>
                    <span className="text-gray-600">Quantity:</span>
                    <span className="font-medium ml-1">{batch.planned_quantity}</span>
                  </div>
                  {batch.completion_date && (
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-gray-500" />
                      <span className="text-gray-600">Complete:</span>
                      <span className="font-medium ml-1">{formatIndianDate(batch.completion_date)}</span>
                    </div>
                  )}
                  {currentStageLabel && (
                    <div className="col-span-2 flex items-center gap-1 mt-1">
                      <Factory className="w-3 h-3 text-blue-500" />
                      <span className="text-gray-600">Stage:</span>
                      <span className="font-medium ml-1 text-blue-700">{currentStageLabel}</span>
                    </div>
                  )}
                  {assignedName && (
                    <div className="col-span-2 flex items-center gap-1">
                      <User className="w-3 h-3 text-gray-500" />
                      <span className="text-gray-600">Assigned to:</span>
                      <span className="font-medium ml-1">{assignedName}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
