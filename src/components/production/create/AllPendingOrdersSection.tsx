import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Loader2,
  ShoppingCart,
  Calendar,
  User,
  Package,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Clock,
  ClipboardList,
} from 'lucide-react';
import { ProductService } from '@/services/productService';
import { OrderService } from '@/services/orderService';
import { ProductionService } from '@/services/productionService';
import { formatIndianDate } from '@/utils/formatHelpers';

interface PendingOrder {
  order_id: string;
  order_item_id: string;
  order_number: string;
  customer_name: string;
  order_date: string;
  expected_delivery: string;
  status: string;
  priority: string;
  quantity_needed: number;
  product_id?: string;
  product_name?: string;
  current_stock?: number;
  shortage?: number;
}

interface TaskInfo {
  assigned_to_id: string;
  assigned_to_name: string;
  task_status: string;
}

interface Props {
  onSelectOrder: (order: PendingOrder, productId: string) => void;
}

const PRIORITY_CONFIG = {
  urgent: { label: 'Urgent', className: 'bg-red-100 text-red-700 border-red-200' },
  high: { label: 'High', className: 'bg-orange-100 text-orange-700 border-orange-200' },
  medium: { label: 'Medium', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  low: { label: 'Low', className: 'bg-gray-100 text-gray-600 border-gray-200' },
} as const;

const STATUS_CONFIG = {
  pending: { label: 'Pending', className: 'bg-yellow-100 text-yellow-700' },
  accepted: { label: 'Accepted', className: 'bg-blue-100 text-blue-700' },
  in_production: { label: 'In Production', className: 'bg-purple-100 text-purple-700' },
  ready: { label: 'Ready', className: 'bg-green-100 text-green-700' },
} as const;

function getDaysUntil(dateStr: string): number {
  const delivery = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((delivery.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function DeliveryBadge({ dateStr }: { dateStr: string }) {
  const days = getDaysUntil(dateStr);
  if (days < 0) return (
    <span className="flex items-center gap-1 text-xs font-semibold text-red-600">
      <AlertTriangle className="h-3 w-3" />{Math.abs(days)}d overdue
    </span>
  );
  if (days === 0) return (
    <span className="flex items-center gap-1 text-xs font-semibold text-red-600">
      <Clock className="h-3 w-3" />Due today
    </span>
  );
  if (days <= 3) return (
    <span className="flex items-center gap-1 text-xs font-semibold text-red-500">
      <Clock className="h-3 w-3" />{days}d left
    </span>
  );
  if (days <= 7) return (
    <span className="flex items-center gap-1 text-xs font-semibold text-orange-500">
      <Clock className="h-3 w-3" />{days}d left
    </span>
  );
  return (
    <span className="flex items-center gap-1 text-xs text-gray-500">
      <Calendar className="h-3 w-3" />{days}d left
    </span>
  );
}

export default function AllPendingOrdersSection({ onSelectOrder }: Props) {
  const [orders, setOrders] = useState<PendingOrder[]>([]);
  const [loading, setLoading] = useState(true);
  // task assignment per order_item_id
  const [taskMap, setTaskMap] = useState<Record<string, TaskInfo>>({});
  // order_item_ids that already have an active (non-cancelled) batch
  const [batchedItemIds, setBatchedItemIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const { data, error } = await OrderService.getOrders({
          status: ['pending', 'accepted', 'in_production', 'ready'],
          sortBy: 'expected_delivery',
          sortOrder: 'asc',
        });

        if (cancelled || error || !data) return;

        const productRows: PendingOrder[] = [];
        for (const order of data) {
          const productItems = order.items.filter((item) => item.productType === 'product');
          for (const item of productItems) {
            productRows.push({
              order_id: order.id,
              order_item_id: item.id,
              order_number: order.orderNumber,
              customer_name: order.customerName,
              order_date: order.orderDate,
              expected_delivery: order.expectedDelivery || '',
              status: order.status,
              priority: (order as any).priority || 'medium',
              quantity_needed: item.quantity,
              product_id: item.productId,
              product_name: item.productName,
            });
          }
        }

        if (cancelled) return;

        // Fetch stock
        const uniqueProductIds = [...new Set(productRows.map((r) => r.product_id).filter(Boolean))] as string[];
        const stockMap: Record<string, number> = {};
        await Promise.all(
          uniqueProductIds.map(async (productId) => {
            try {
              const product = await ProductService.getProductById(productId);
              stockMap[productId] = product?.current_stock ?? 0;
            } catch { stockMap[productId] = 0; }
          })
        );

        if (cancelled) return;

        const enriched: PendingOrder[] = productRows.map((row) => {
          const stock = row.product_id ? (stockMap[row.product_id] ?? 0) : 0;
          return { ...row, current_stock: stock, shortage: Math.max(0, row.quantity_needed - stock) };
        });

        setOrders(enriched);

        // Fetch all tasks + batches in one shot
        const [allTasksResult, allBatchesResult] = await Promise.all([
          ProductionService.getTasks({ limit: 1000 }),
          ProductionService.getBatches({ limit: 1000 }),
        ]);

        if (cancelled) return;

        const allTasks = allTasksResult?.data || [];
        const allBatches = allBatchesResult?.data || [];

        // Build task map: order_item_id → TaskInfo
        const tasks: Record<string, TaskInfo> = {};
        for (const task of allTasks) {
          if (!['assigned', 'in_progress', 'planning'].includes(task.status)) continue;
          const matchedRow = enriched.find((row) =>
            (task.order_item_id && row.order_item_id === task.order_item_id) ||
            (row.order_id === task.order_id && row.product_id === task.stage_product_id)
          );
          if (matchedRow && !tasks[matchedRow.order_item_id]) {
            tasks[matchedRow.order_item_id] = {
              assigned_to_id: task.assigned_to_id,
              assigned_to_name: task.assigned_to_name,
              task_status: task.status,
            };
          }
        }

        // Build batched set: order_item_ids with an active (non-cancelled) batch
        // Also parse notes to find order references stored only in notes
        const getOrderIdsFromNotes = (notes: string) => {
          const m = (notes || '').match(/Attached Order IDs:\s*(.+?)(?:\s*·|$)/i);
          return m ? m[1].split(',').map((s) => s.trim()).filter(Boolean) : [];
        };
        const getOrderNumsFromNotes = (notes: string) => {
          const m = (notes || '').match(/Attached Orders:\s*(.+?)(?:\s*·|$)/i);
          return m ? m[1].split(',').map((s) => s.trim()).filter(Boolean) : [];
        };

        const batched = new Set<string>();
        for (const batch of allBatches) {
          if (batch.status === 'cancelled') continue;
          const attachedIds = getOrderIdsFromNotes(batch.notes || '');
          const attachedNums = getOrderNumsFromNotes(batch.notes || '');
          for (const row of enriched) {
            const sameOrder =
              batch.order_id === row.order_id ||
              batch.order_number === row.order_number ||
              attachedIds.includes(row.order_id) ||
              (row.order_number && attachedNums.includes(row.order_number));
            const sameProduct = batch.product_id === row.product_id;
            const sameItem = batch.order_item_id && batch.order_item_id === row.order_item_id;
            if (sameItem || (sameOrder && sameProduct)) {
              batched.add(row.order_item_id);
            }
          }
        }

        if (!cancelled) {
          setTaskMap(tasks);
          setBatchedItemIds(batched);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  // Hide orders that already have an active batch
  const visibleOrders = orders.filter((o) => !batchedItemIds.has(o.order_item_id));

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-3 py-10 text-gray-500">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">Loading pending orders…</span>
      </div>
    );
  }

  if (visibleOrders.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-10 text-center">
        <CheckCircle2 className="h-10 w-10 text-green-400" />
        <p className="font-semibold text-gray-700">All caught up!</p>
        <p className="text-sm text-gray-500">No pending orders need production right now.</p>
      </div>
    );
  }

  const urgentCount = visibleOrders.filter((o) => getDaysUntil(o.expected_delivery) <= 3).length;
  const shortageCount = visibleOrders.filter((o) => (o.shortage ?? 0) > 0).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <ShoppingCart className="h-5 w-5 text-gray-600" />
          <h3 className="text-base font-semibold text-gray-800">Pending Orders</h3>
          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">
            {visibleOrders.length}
          </span>
        </div>
        {(urgentCount > 0 || shortageCount > 0) && (
          <div className="flex flex-wrap items-center gap-2">
            {urgentCount > 0 && (
              <span className="flex items-center gap-1 text-xs font-semibold text-red-600 bg-red-50 px-2 py-1 rounded-full border border-red-200">
                <Clock className="h-3 w-3" />{urgentCount} Urgent
              </span>
            )}
            {shortageCount > 0 && (
              <span className="flex items-center gap-1 text-xs font-semibold text-orange-600 bg-orange-50 px-2 py-1 rounded-full border border-orange-200">
                <AlertTriangle className="h-3 w-3" />{shortageCount} Need Production
              </span>
            )}
          </div>
        )}
      </div>

      <div className="space-y-3">
        {/* Group items by order */}
        {Object.values(
          visibleOrders.reduce<Record<string, { meta: PendingOrder; items: PendingOrder[] }>>((acc, order) => {
            if (!acc[order.order_id]) {
              acc[order.order_id] = { meta: order, items: [] };
            }
            acc[order.order_id].items.push(order);
            return acc;
          }, {})
        ).map(({ meta, items }) => {
          const days = getDaysUntil(meta.expected_delivery);
          const isOverdue = days < 0;
          const isVeryUrgent = days >= 0 && days <= 3;
          const priorityConf = PRIORITY_CONFIG[meta.priority as keyof typeof PRIORITY_CONFIG] ?? PRIORITY_CONFIG.medium;
          const statusConf = STATUS_CONFIG[meta.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.pending;

          const accentClass = isOverdue ? 'bg-red-500' : isVeryUrgent ? 'bg-orange-400' : 'bg-blue-400';
          const borderClass = isOverdue
            ? 'border-red-300'
            : isVeryUrgent
            ? 'border-orange-300'
            : 'border-gray-200';

          return (
            <div key={meta.order_id} className={`bg-white rounded-xl border overflow-hidden ${borderClass}`}>
              <div className={`h-1 w-full ${accentClass}`} />

              {/* Order header — shown once */}
              <div className="px-4 pt-3 pb-2 flex items-start justify-between gap-2 border-b border-gray-100">
                <div>
                  <p className="text-xs font-bold text-gray-400 tracking-wide uppercase">{meta.order_number}</p>
                  <p className="text-sm font-semibold text-gray-800 mt-0.5 flex items-center gap-1">
                    <User className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                    {meta.customer_name}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge className={`text-[10px] px-1.5 py-0.5 border ${priorityConf.className}`}>
                    {priorityConf.label}
                  </Badge>
                  <Badge className={`text-[10px] px-1.5 py-0.5 ${statusConf.className}`}>
                    {statusConf.label}
                  </Badge>
                </div>
              </div>

              {/* One row per product item */}
              {items.map((order) => {
                const hasShortage = (order.shortage ?? 0) > 0;
                const task = taskMap[order.order_item_id];
                const hasAssignedTask = Boolean(task);

                return (
                  <div key={order.order_item_id} className="px-4 py-3 border-b border-gray-50 last:border-b-0 space-y-2">
                    {/* Product name — full width */}
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-blue-500 flex-shrink-0" />
                      <p className="text-sm font-semibold text-gray-800">{order.product_name}</p>
                    </div>
                    {/* Qty / Stock / Make chips */}
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-gray-50 rounded-lg py-1.5">
                        <p className="text-[10px] text-gray-400 uppercase tracking-wide">Qty</p>
                        <p className="text-sm font-bold text-gray-800">{order.quantity_needed}</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg py-1.5">
                        <p className="text-[10px] text-gray-400 uppercase tracking-wide">Stock</p>
                        <p className={`text-sm font-bold ${(order.current_stock ?? 0) > 0 ? 'text-green-600' : 'text-gray-400'}`}>{order.current_stock ?? 0}</p>
                      </div>
                      <div className={`rounded-lg py-1.5 ${hasShortage ? 'bg-red-50' : 'bg-green-50'}`}>
                        <p className="text-[10px] text-gray-400 uppercase tracking-wide">{hasShortage ? 'Make' : 'OK'}</p>
                        <p className={`text-sm font-bold ${hasShortage ? 'text-red-600' : 'text-green-600'}`}>{hasShortage ? order.shortage : '✓'}</p>
                      </div>
                    </div>

                    {/* Assigned task banner */}
                    {hasAssignedTask && (
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-800">
                        <ClipboardList className="h-3.5 w-3.5 flex-shrink-0" />
                        <span>Assigned to <span className="font-semibold">{task.assigned_to_name}</span></span>
                      </div>
                    )}

                    {/* Action */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                          <span className="text-xs text-gray-600">{formatIndianDate(order.expected_delivery)}</span>
                        </div>
                        <DeliveryBadge dateStr={order.expected_delivery} />
                      </div>
                      {hasAssignedTask ? (
                        <Button size="sm" disabled className="h-7 px-3 text-xs gap-1 opacity-50 cursor-not-allowed flex-shrink-0">
                          <ClipboardList className="h-3 w-3" />
                          Assigned
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          className="h-7 px-3 text-xs bg-blue-600 hover:bg-blue-700 text-white gap-1 flex-shrink-0"
                          onClick={() => onSelectOrder(order, order.product_id ?? '')}
                        >
                          Create Batch
                          <ArrowRight className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
