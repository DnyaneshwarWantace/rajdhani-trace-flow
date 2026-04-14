import { useEffect, useState } from 'react';
import { ShoppingCart, Calendar, CheckCircle, Clock, Factory, Package, Truck, AlertTriangle, Eye, Edit, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatIndianDate } from '@/utils/formatHelpers';
import { OrderService, type Order, type OrderItem } from '@/services/orderService';
import { TruncatedText } from '@/components/ui/TruncatedText';
import SendToProductionModal from '@/components/production/SendToProductionModal';
import AssignMaterialTaskModal from '@/components/orders/AssignMaterialTaskModal';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ProductionService } from '@/services/productionService';

interface OrderTableProps {
  orders: Order[];
  onStatusUpdate: (orderId: string, newStatus: string) => void;
  onViewDetails: (order: Order) => void;
  onCreateMaterialTask: (order: Order, payload: { assigned_to_id?: string; material_id?: string }) => Promise<void>;
}

const statusConfig: Record<string, { label: string; icon: any; color: string }> = {
  pending: { label: 'Pending', icon: Clock, color: 'bg-yellow-100 text-yellow-800' },
  accepted: { label: 'Accepted', icon: CheckCircle, color: 'bg-blue-100 text-blue-800' },
  in_production: { label: 'In Production', icon: Factory, color: 'bg-purple-100 text-purple-800' },
  ready: { label: 'Ready', icon: Package, color: 'bg-indigo-100 text-indigo-800' },
  dispatched: { label: 'Shipped', icon: Truck, color: 'bg-orange-100 text-orange-800' },
  delivered: { label: 'Delivered', icon: CheckCircle, color: 'bg-green-100 text-green-800' },
  cancelled: { label: 'Cancelled', icon: AlertTriangle, color: 'bg-red-100 text-red-800' },
};

export default function OrderTable({ orders, onStatusUpdate, onViewDetails, onCreateMaterialTask }: OrderTableProps) {
  const [sendToProductionOrder, setSendToProductionOrder] = useState<Order | null>(null);
  const [sendToProductionItem, setSendToProductionItem] = useState<OrderItem | null>(null);
  const [pickProductionOrder, setPickProductionOrder] = useState<Order | null>(null);
  const [materialTaskOrder, setMaterialTaskOrder] = useState<Order | null>(null);
  const [pickRawMaterialOrder, setPickRawMaterialOrder] = useState<Order | null>(null);
  const [selectedRawMaterialId, setSelectedRawMaterialId] = useState<string | null>(null);
  const [orderResponsibleUsers, setOrderResponsibleUsers] = useState<Record<string, string>>({});
  const [orderStageInfo, setOrderStageInfo] = useState<Record<string, { stage: string; assignedTo?: string; status: string }>>({});
  const [orderProductProgress, setOrderProductProgress] = useState<Record<string, Record<string, { required: number; produced: number }>>>({});
  const [batchesByOrder, setBatchesByOrder] = useState<Record<string, any[]>>({});
  const [productionInfoOrder, setProductionInfoOrder] = useState<Order | null>(null);
  const [rawMaterialStatusByOrder, setRawMaterialStatusByOrder] = useState<Record<string, any[]>>({});

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
      new Set(
        match[1]
          .split(',')
          .map((v) => v.trim())
          .filter(Boolean)
      )
    );
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const activeOrderIds = orders
          .filter((o) => o.status === 'pending' || o.status === 'accepted')
          .map((o) => o.id);
        const [taskRequests, batchesResult] = await Promise.all([
          activeOrderIds.length > 0
            ? Promise.all(activeOrderIds.map((orderId) => ProductionService.getTasks({ order_id: orderId, limit: 100 })))
            : Promise.resolve([]),
          ProductionService.getBatches({ limit: 500 }),
        ]);
        if (cancelled) return;
        const ownerMap: Record<string, string> = {};
        const stageMap: Record<string, { stage: string; assignedTo?: string; status: string }> = {};
        const orderNumberToId: Record<string, string> = {};
        orders.forEach((o) => {
          if (o.orderNumber) orderNumberToId[o.orderNumber] = o.id;
        });
        activeOrderIds.forEach((orderId, index) => {
          const taskResponse = taskRequests[index] as Awaited<ReturnType<typeof ProductionService.getTasks>> | undefined;
          const tasks = taskResponse?.data || [];
          const activeTask = tasks.find((t) => t.status === 'assigned' || t.status === 'in_progress');
          if (activeTask?.assigned_to_name) {
            ownerMap[orderId] = activeTask.assigned_to_name;
          }
          const latestTask = tasks[0];
          if (latestTask) {
            stageMap[orderId] = {
              stage: latestTask.stage_product_name || 'Production Stage',
              assignedTo: latestTask.assigned_to_name,
              status: latestTask.status,
            };
          }
        });

        // Include attached orders from batch notes so linked extra orders are also locked/visible.
        const allBatches = batchesResult.data || [];
        const allOrderBatchMap: Record<string, any[]> = {};
        const progressMap: Record<string, Record<string, { required: number; produced: number }>> = {};

        orders.forEach((order) => {
          const productNeeds: Record<string, { required: number; produced: number }> = {};
          (order.items || [])
            .filter((item) => item.productType === 'product' && item.productId)
            .forEach((item) => {
              productNeeds[item.productId!] = {
                required: Number(item.quantity || 0),
                produced: 0,
              };
            });
          progressMap[order.id] = productNeeds;
          allOrderBatchMap[order.id] = [];
        });

        allBatches.forEach((batch) => {
          const notes = batch.notes || '';
          const attachedOrderNumbers = getAttachedOrderNumbers(notes);
          const attachedOrderIds = getAttachedOrderIds(notes);
          const linkedOrderIds = Array.from(
            new Set([
              ...(batch.order_id ? [batch.order_id] : []),
              ...attachedOrderIds,
              ...attachedOrderNumbers.map((orderNo) => orderNumberToId[orderNo]).filter(Boolean),
            ])
          );

          linkedOrderIds.forEach((orderId) => {
            if (!allOrderBatchMap[orderId]) allOrderBatchMap[orderId] = [];
            allOrderBatchMap[orderId].push(batch);
          });

          attachedOrderNumbers.forEach((orderNumber) => {
            const orderId = orderNumberToId[orderNumber];
            if (!orderId) return;
            if (!ownerMap[orderId]) {
              ownerMap[orderId] = batch.current_stage_assigned_to_name || batch.assigned_to_name || batch.operator || '';
            }
            if (!stageMap[orderId]) {
              stageMap[orderId] = {
                stage: batch.product_name || 'Production Stage',
                assignedTo: batch.current_stage_assigned_to_name || batch.assigned_to_name || batch.operator,
                status: batch.status,
              };
            }
          });
        });

        // Aggregate completed quantity per order + final product.
        orders.forEach((order) => {
          const linkedBatches = allOrderBatchMap[order.id] || [];
          linkedBatches
            .filter((b) => b.status === 'completed')
            .forEach((b) => {
              const productId = b.product_id;
              if (!productId || !progressMap[order.id]?.[productId]) return;
              const completedQty = Number(b.actual_quantity || b.planned_quantity || 0);
              progressMap[order.id][productId].produced += completedQty;
            });
        });

        // If order is fully completed for first product, show stage as Completed.
        orders.forEach((order) => {
          const firstProductItem = order.items?.find((item) => item.productType === 'product' && item.productId);
          if (!firstProductItem?.productId) return;
          const productProgress = progressMap[order.id]?.[firstProductItem.productId];
          if (!productProgress) return;
          if (productProgress.produced >= productProgress.required && productProgress.required > 0) {
            stageMap[order.id] = {
              stage: 'Production Completed',
              assignedTo: stageMap[order.id]?.assignedTo,
              status: 'completed',
            };
          }
        });

        setOrderResponsibleUsers(ownerMap);
        setOrderStageInfo(stageMap);
        setOrderProductProgress(progressMap);
        setBatchesByOrder(allOrderBatchMap);
      } catch (error) {
        if (!cancelled) {
          console.error('Error loading order responsible users:', error);
          setOrderResponsibleUsers({});
          setOrderStageInfo({});
          setOrderProductProgress({});
          setBatchesByOrder({});
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [orders]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const activeOrderIds = orders
          .filter((o) => o.status === 'pending' || o.status === 'accepted')
          .map((o) => o.id);
        if (activeOrderIds.length === 0) {
          if (!cancelled) setRawMaterialStatusByOrder({});
          return;
        }
        const responses = await Promise.all(activeOrderIds.map((id) => OrderService.getOrderRawMaterialStatus(id)));
        if (cancelled) return;
        const nextMap: Record<string, any[]> = {};
        activeOrderIds.forEach((id, idx) => {
          nextMap[id] = responses[idx]?.data || [];
        });
        setRawMaterialStatusByOrder(nextMap);
      } catch {
        if (!cancelled) setRawMaterialStatusByOrder({});
      }
    })();
    return () => { cancelled = true; };
  }, [orders]);

  const handleSendToProduction = (e: React.MouseEvent, order: Order, productItem?: OrderItem) => {
    e.stopPropagation();
    const selectedItem = productItem || order.items?.find(item => item.productType === 'product' && item.productId);
    if (!selectedItem) return;
    setSendToProductionOrder(order);
    setSendToProductionItem(selectedItem);
  };

  return (
    <>

    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full table-fixed">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider w-[12%] min-w-[100px]">
                Order
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider w-[18%] min-w-[120px]">
                Customer & Total
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider w-[20%] min-w-[140px]">
                Items
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider w-[12%] min-w-[90px]">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider w-[22%] min-w-[220px]">
                Date
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider w-[200px] min-w-[200px]">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {orders.map((order) => {
              const status = statusConfig[order.status] || statusConfig.pending;
              const StatusIcon = status.icon;
              const firstProductItem = order.items?.find(item => item.productType === 'product' && item.productId);
              const firstProductProgress = firstProductItem?.productId
                ? orderProductProgress[order.id]?.[firstProductItem.productId]
                : undefined;
              const requiredQty = Number(firstProductProgress?.required || firstProductItem?.quantity || 0);
              const producedQty = Number(firstProductProgress?.produced || 0);
              const canProduceMore = requiredQty > 0 ? producedQty < requiredQty : true;
              const canShowProduceButton =
                (order.status === 'pending' || order.status === 'accepted') &&
                !!firstProductItem?.productId &&
                canProduceMore;
              const producibleItems = (order.items || []).filter((item) => {
                if (!(item.productType === 'product' && item.productId)) return false;
                const itemProgress = orderProductProgress[order.id]?.[item.productId || ''];
                const itemRequired = Number(itemProgress?.required || item.quantity || 0);
                const itemProduced = Number(itemProgress?.produced || 0);
                return itemRequired > 0 ? itemProduced < itemRequired : true;
              });
              const rawStatuses = rawMaterialStatusByOrder[order.id] || [];
              const rawStatusByKey = new Map<string, any>();
              rawStatuses.forEach((s) => {
                rawStatusByKey.set(String(s.material_id || ''), s);
                rawStatusByKey.set(String(s.material_name || ''), s);
              });
              const rawItems = (order.items || []).filter((item) => item.productType === 'raw_material');
              const pendingRawItems = rawItems.filter((item) => {
                const statusInfo =
                  rawStatusByKey.get(String(item.rawMaterialId || '')) ||
                  rawStatusByKey.get(String(item.productName || ''));
                const ps = String(statusInfo?.procurement_status || 'not_started');
                return ps === 'not_started';
              });
              const hasRawNotStarted = rawItems.some((item) => {
                const statusInfo =
                  rawStatusByKey.get(String(item.rawMaterialId || '')) ||
                  rawStatusByKey.get(String(item.productName || ''));
                const ps = String(statusInfo?.procurement_status || 'not_started');
                return ps === 'not_started';
              });

              return (
                <tr key={order.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => onViewDetails(order)}>
                  <td className="px-4 py-2 whitespace-nowrap">
                    <div className="font-medium text-gray-900 text-sm">{order.orderNumber || order.id}</div>
                    <div className="text-xs text-gray-500">{order.items?.length || 0} item{(order.items?.length || 0) !== 1 ? 's' : ''}</div>
                  </td>
                  <td className="px-4 py-2 max-w-[140px]">
                    <div className="text-sm text-gray-900 truncate">
                      <TruncatedText text={order.customerName} maxLength={18} as="span" showTooltip={false} />
                    </div>
                    <div className="text-xs font-medium text-gray-700">{formatCurrency(order.totalAmount, { full: true })}</div>
                    {order.outstandingAmount > 0 && (
                      <div className="text-xs text-red-600">Due: {formatCurrency(order.outstandingAmount, { full: true })}</div>
                    )}
                  </td>
                  <td className="px-4 py-2 max-w-[160px]">
                    {order.items && order.items.length > 0 ? (
                      <div className="space-y-0.5">
                        {order.items.slice(0, 2).map((item, idx) => (
                          <div key={idx} className="text-xs">
                            <div className="font-medium text-gray-900 truncate">
                              <TruncatedText text={item.productName} maxLength={22} as="span" showTooltip={false} />
                            </div>
                            <div className="text-gray-500">Qty: {Number(item.quantity).toFixed(2)} {item.count_unit || item.unit || 'units'}</div>
                          </div>
                        ))}
                        {order.items.length > 2 && <div className="text-xs text-gray-400">+{order.items.length - 2} more</div>}
                      </div>
                    ) : <span className="text-xs text-gray-400">No items</span>}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 w-fit ${status.color}`}>
                      <StatusIcon className="w-3 h-3" />
                      {status.label}
                    </span>
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-xs" onClick={(e) => e.stopPropagation()}>
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1 text-gray-600">
                        <Calendar className="w-3 h-3 text-gray-400 shrink-0" />
                        <span className="text-gray-400">Order:</span> {formatIndianDate(order.orderDate)}
                      </div>
                      {order.expectedDelivery && (() => {
                        const expectedDate = new Date(order.expectedDelivery.split('T')[0]);
                        const today = new Date(); today.setHours(0,0,0,0); expectedDate.setHours(0,0,0,0);
                        const isOverdue = order.status !== 'delivered' && expectedDate < today;
                        return (
                          <div className={`flex items-center gap-1 ${isOverdue ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
                            <Calendar className={`w-3 h-3 shrink-0 ${isOverdue ? 'text-red-500' : 'text-gray-400'}`} />
                            <span className="text-gray-400">Exp:</span> {formatIndianDate(order.expectedDelivery)}
                          </div>
                        );
                      })()}
                      {orderStageInfo[order.id] && (
                        <div className="text-indigo-600 truncate max-w-[160px]">
                          {orderStageInfo[order.id].stage}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-2 w-[200px] min-w-[200px]">
                    <div className="flex items-center justify-end gap-1 flex-nowrap">
                      {/* Slot 1: Accept (pending) or invisible spacer */}
                      <Button size="sm" onClick={(e) => { e.stopPropagation(); onStatusUpdate(order.id, 'accepted'); }} className={`h-7 text-xs bg-blue-600 hover:bg-blue-700 text-white px-2 ${order.status !== 'pending' ? 'invisible pointer-events-none' : ''}`}>
                        <CheckCircle className="w-3 h-3 mr-1" />Accept
                      </Button>
                      {/* Slot 2: Produce / Ship / Deliver / invisible spacer */}
                      {canShowProduceButton ? (
                        <Button size="sm" onClick={(e) => { if (producibleItems.length > 1) { e.stopPropagation(); setPickProductionOrder(order); return; } handleSendToProduction(e, order, producibleItems[0]); }} disabled={!!orderResponsibleUsers[order.id]} className="h-7 text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-2">
                          <Factory className="w-3 h-3 mr-1" />{producibleItems.length > 1 ? `Produce (${producibleItems.length})` : 'Produce'}
                        </Button>
                      ) : order.status === 'accepted' ? (() => {
                        const hasProductItems = order.items?.some(item => item.productType === 'product');
                        const allProductsHaveIndividuals = order.items?.filter(item => item.productType === 'product').every(item => item.selectedProducts && item.selectedProducts.length > 0);
                        return (!hasProductItems || allProductsHaveIndividuals) ? (
                          <Button size="sm" onClick={(e) => { e.stopPropagation(); onStatusUpdate(order.id, 'dispatched'); }} className="h-7 text-xs bg-orange-600 hover:bg-orange-700 text-white px-2">
                            <Package className="w-3 h-3 mr-1" />Ship
                          </Button>
                        ) : (
                          <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); onViewDetails(order); }} className="h-7 text-xs px-2 border-gray-300">
                            <Edit className="w-3 h-3 mr-1" />Select Rolls
                          </Button>
                        );
                      })() : order.status === 'dispatched' ? (
                        <Button size="sm" onClick={(e) => { e.stopPropagation(); onStatusUpdate(order.id, 'delivered'); }} className="h-7 text-xs bg-green-600 hover:bg-green-700 text-white px-2">
                          <CheckCircle className="w-3 h-3 mr-1" />Deliver
                        </Button>
                      ) : (
                        <div className="h-7 w-16 invisible" />
                      )}
                      {/* Slot 3: Info icon or invisible spacer */}
                      <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); setProductionInfoOrder(order); }} className={`h-7 w-7 p-0 ${!firstProductItem?.productId ? 'invisible pointer-events-none' : ''}`} title="Production Info">
                        <Info className="w-3.5 h-3.5" />
                      </Button>
                      {/* Slot 4: View */}
                      <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); onViewDetails(order); }} className="h-7 w-7 p-0" title="View details">
                        <Eye className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>

    {sendToProductionOrder && sendToProductionItem && (
      <SendToProductionModal
        open={!!(sendToProductionOrder && sendToProductionItem)}
        onClose={() => { setSendToProductionOrder(null); setSendToProductionItem(null); }}
        order={sendToProductionOrder}
        productItem={sendToProductionItem}
      />
    )}
    <AssignMaterialTaskModal
      open={!!materialTaskOrder}
      order={materialTaskOrder}
      onClose={() => setMaterialTaskOrder(null)}
      onConfirm={async (payload) => {
        if (!materialTaskOrder) return;
        await onCreateMaterialTask(materialTaskOrder, {
          ...payload,
          material_id: selectedRawMaterialId || undefined,
        });
        setMaterialTaskOrder(null);
        setSelectedRawMaterialId(null);
      }}
    />
    <Dialog open={!!pickRawMaterialOrder} onOpenChange={(open) => { if (!open) setPickRawMaterialOrder(null); }}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Select Raw Material to Order</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          {(pickRawMaterialOrder?.items || [])
            .filter((item) => item.productType === 'raw_material')
            .filter((item) => {
              const statuses = rawMaterialStatusByOrder[pickRawMaterialOrder?.id || ''] || [];
              const byKey = new Map<string, any>();
              statuses.forEach((s) => {
                byKey.set(String(s.material_id || ''), s);
                byKey.set(String(s.material_name || ''), s);
              });
              const statusInfo = byKey.get(String(item.rawMaterialId || '')) || byKey.get(String(item.productName || ''));
              return String(statusInfo?.procurement_status || 'not_started') === 'not_started';
            })
            .map((item) => (
              <button
                key={item.id}
                type="button"
                className="w-full text-left border rounded p-3 hover:bg-gray-50"
                onClick={() => {
                  setSelectedRawMaterialId(item.rawMaterialId || null);
                  setMaterialTaskOrder(pickRawMaterialOrder);
                  setPickRawMaterialOrder(null);
                }}
              >
                <div className="text-sm font-medium text-gray-900">{item.productName}</div>
                <div className="text-xs text-gray-600 mt-1">
                  Qty: {Number(item.quantity || 0).toFixed(2)} {item.unit || 'units'}
                </div>
              </button>
            ))}
        </div>
      </DialogContent>
    </Dialog>
    <Dialog open={!!pickProductionOrder} onOpenChange={(open) => { if (!open) setPickProductionOrder(null); }}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Select Product to Produce</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          {(pickProductionOrder?.items || [])
            .filter((item) => item.productType === 'product' && item.productId)
            .filter((item) => {
              const itemProgress = orderProductProgress[pickProductionOrder?.id || '']?.[item.productId || ''];
              const itemRequired = Number(itemProgress?.required || item.quantity || 0);
              const itemProduced = Number(itemProgress?.produced || 0);
              return itemRequired > 0 ? itemProduced < itemRequired : true;
            })
            .map((item) => {
              const itemProgress = orderProductProgress[pickProductionOrder?.id || '']?.[item.productId || ''];
              const itemRequired = Number(itemProgress?.required || item.quantity || 0);
              const itemProduced = Number(itemProgress?.produced || 0);
              return (
                <button
                  key={item.id}
                  type="button"
                  className="w-full text-left border rounded p-3 hover:bg-gray-50"
                  onClick={(e) => {
                    if (!pickProductionOrder) return;
                    handleSendToProduction(e as any, pickProductionOrder, item);
                    setPickProductionOrder(null);
                  }}
                >
                  <div className="text-sm font-medium text-gray-900">{item.productName}</div>
                  <div className="text-xs text-gray-600 mt-1">
                    Required: {itemRequired} {item.count_unit || item.unit || 'units'} · Produced: {itemProduced} {item.count_unit || item.unit || 'units'}
                  </div>
                </button>
              );
            })}
        </div>
      </DialogContent>
    </Dialog>

    <Dialog open={!!productionInfoOrder} onOpenChange={(open) => { if (!open) setProductionInfoOrder(null); }}>
      <DialogContent className="max-w-3xl" onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>
            Production Info - {productionInfoOrder?.orderNumber || productionInfoOrder?.id}
          </DialogTitle>
        </DialogHeader>
        {productionInfoOrder && (
          <div className="space-y-3">
            {(productionInfoOrder.items || [])
              .filter((item) => item.productType === 'product' && item.productId)
              .map((item) => {
                const progress = orderProductProgress[productionInfoOrder.id]?.[item.productId || ''];
                const required = Number(progress?.required || item.quantity || 0);
                const produced = Number(progress?.produced || 0);
                const relatedBatches = (batchesByOrder[productionInfoOrder.id] || []).filter(
                  (batch) => String(batch.product_id || '') === String(item.productId || '')
                );
                const done = required > 0 && produced >= required;
                const inProgress = !done && (produced > 0 || relatedBatches.length > 0);
                const stageLabel = done ? 'Completed' : inProgress ? 'In Progress' : 'Not Started';
                const stageClass = done
                  ? 'bg-green-100 text-green-700 border-green-300'
                  : inProgress
                    ? 'bg-yellow-100 text-yellow-700 border-yellow-300'
                    : 'bg-gray-100 text-gray-700 border-gray-300';
                return (
                  <div key={item.id} className="rounded border p-3 bg-gray-50">
                    <div className="text-sm font-medium text-gray-900">{item.productName}</div>
                    <div className="text-xs text-gray-700 mt-1">
                      Required: {required} {item.count_unit || item.unit || 'units'} · Produced: {produced} {item.count_unit || item.unit || 'units'}
                    </div>
                    <div className="mt-2">
                      <Badge className={stageClass}>
                        {stageLabel}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            <div className="rounded border p-3">
              <div className="text-sm font-medium text-gray-900 mb-2">Batches</div>
              {(batchesByOrder[productionInfoOrder.id] || []).length === 0 ? (
                <div className="text-xs text-gray-500">No production batches found for this order.</div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {(batchesByOrder[productionInfoOrder.id] || []).map((batch) => (
                    <div key={batch.id} className="text-xs border rounded p-2 bg-white">
                      <div className="font-medium text-gray-900">{batch.batch_number} · {batch.product_name || batch.product_id}</div>
                      <div className="text-gray-700 mt-0.5">
                        Qty: {Number(batch.actual_quantity || batch.planned_quantity || 0)} · Status: {String(batch.status || '').replace('_', ' ')}
                      </div>
                      <div className="text-gray-600 mt-0.5">
                        Stage: {batch.current_stage || '-'} · Assigned: {batch.current_stage_assigned_to_name || batch.assigned_to_name || batch.operator || '-'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
    </>
  );
}


