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
} from 'lucide-react';
import { ProductService } from '@/services/productService';
import { OrderService } from '@/services/orderService';
import { formatIndianDate } from '@/utils/formatHelpers';

interface PendingOrder {
  order_id: string;
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
  if (days < 0) {
    return (
      <span className="flex items-center gap-1 text-xs font-semibold text-red-600">
        <AlertTriangle className="h-3 w-3" />
        {Math.abs(days)}d overdue
      </span>
    );
  }
  if (days === 0) {
    return (
      <span className="flex items-center gap-1 text-xs font-semibold text-red-600">
        <Clock className="h-3 w-3" />
        Due today
      </span>
    );
  }
  if (days <= 3) {
    return (
      <span className="flex items-center gap-1 text-xs font-semibold text-red-500">
        <Clock className="h-3 w-3" />
        {days}d left
      </span>
    );
  }
  if (days <= 7) {
    return (
      <span className="flex items-center gap-1 text-xs font-semibold text-orange-500">
        <Clock className="h-3 w-3" />
        {days}d left
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-xs text-gray-500">
      <Calendar className="h-3 w-3" />
      {days}d left
    </span>
  );
}

export default function AllPendingOrdersSection({ onSelectOrder }: Props) {
  const [orders, setOrders] = useState<PendingOrder[]>([]);
  const [loading, setLoading] = useState(true);

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

        // Flatten to one row per product item
        const productRows: Array<Omit<PendingOrder, 'current_stock' | 'shortage'> & { product_id?: string }> = [];
        for (const order of data) {
          const productItems = order.items.filter((item) => item.productType === 'product');
          for (const item of productItems) {
            productRows.push({
              order_id: order.id,
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

        // Fetch stock for all products in parallel
        const uniqueProductIds = [...new Set(productRows.map((r) => r.product_id).filter(Boolean))] as string[];
        const stockMap: Record<string, number> = {};
        await Promise.all(
          uniqueProductIds.map(async (productId) => {
            try {
              const product = await ProductService.getProductById(productId);
              stockMap[productId] = product?.current_stock ?? 0;
            } catch {
              stockMap[productId] = 0;
            }
          })
        );

        if (cancelled) return;

        const enriched: PendingOrder[] = productRows.map((row) => {
          const stock = row.product_id ? (stockMap[row.product_id] ?? 0) : 0;
          return {
            ...row,
            current_stock: stock,
            shortage: Math.max(0, row.quantity_needed - stock),
          };
        });

        setOrders(enriched);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-3 py-10 text-gray-500">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">Loading pending orders…</span>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-10 text-center">
        <CheckCircle2 className="h-10 w-10 text-green-400" />
        <p className="font-semibold text-gray-700">All caught up!</p>
        <p className="text-sm text-gray-500">No pending orders need production right now.</p>
      </div>
    );
  }

  const urgentCount = orders.filter((o) => getDaysUntil(o.expected_delivery) <= 3).length;
  const shortageCount = orders.filter((o) => (o.shortage ?? 0) > 0).length;

  return (
    <div className="space-y-4">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShoppingCart className="h-5 w-5 text-gray-600" />
          <h3 className="text-base font-semibold text-gray-800">Pending Orders</h3>
          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">
            {orders.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {urgentCount > 0 && (
            <span className="flex items-center gap-1 text-xs font-semibold text-red-600 bg-red-50 px-2 py-1 rounded-full border border-red-200">
              <Clock className="h-3 w-3" />
              {urgentCount} urgent
            </span>
          )}
          {shortageCount > 0 && (
            <span className="flex items-center gap-1 text-xs font-semibold text-orange-600 bg-orange-50 px-2 py-1 rounded-full border border-orange-200">
              <AlertTriangle className="h-3 w-3" />
              {shortageCount} need production
            </span>
          )}
        </div>
      </div>

      {/* Order cards */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {orders.map((order, index) => {
          const days = getDaysUntil(order.expected_delivery);
          const isOverdue = days < 0;
          const isVeryUrgent = days >= 0 && days <= 3;
          const hasShortage = (order.shortage ?? 0) > 0;
          const priorityConf = PRIORITY_CONFIG[order.priority as keyof typeof PRIORITY_CONFIG] ?? PRIORITY_CONFIG.medium;
          const statusConf = STATUS_CONFIG[order.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.pending;

          return (
            <div
              key={`${order.order_id}-${index}`}
              className={`group relative bg-white rounded-xl border transition-all duration-150 hover:shadow-md cursor-pointer overflow-hidden ${
                isOverdue
                  ? 'border-red-300 hover:border-red-400'
                  : isVeryUrgent
                  ? 'border-orange-300 hover:border-orange-400'
                  : 'border-gray-200 hover:border-blue-300'
              }`}
              onClick={() => onSelectOrder(order, order.product_id ?? '')}
            >
              {/* Top accent bar */}
              <div
                className={`h-1 w-full ${
                  isOverdue ? 'bg-red-500' : isVeryUrgent ? 'bg-orange-400' : 'bg-blue-400'
                }`}
              />

              <div className="p-4 space-y-3">
                {/* Header row */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-bold text-gray-400 tracking-wide uppercase">
                      {order.order_number}
                    </p>
                    <p className="text-sm font-semibold text-gray-800 mt-0.5 flex items-center gap-1">
                      <User className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                      {order.customer_name}
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

                {/* Product */}
                <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                  <Package className="h-4 w-4 text-blue-500 flex-shrink-0" />
                  <p className="text-sm font-medium text-gray-800 truncate">{order.product_name}</p>
                </div>

                {/* Qty / Stock / Shortage */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-gray-50 rounded-lg p-2">
                    <p className="text-[10px] text-gray-500 uppercase tracking-wide">Ordered</p>
                    <p className="text-sm font-bold text-gray-800">{order.quantity_needed}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2">
                    <p className="text-[10px] text-gray-500 uppercase tracking-wide">In Stock</p>
                    <p className={`text-sm font-bold ${(order.current_stock ?? 0) > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                      {order.current_stock ?? 0}
                    </p>
                  </div>
                  <div className={`rounded-lg p-2 ${hasShortage ? 'bg-red-50' : 'bg-green-50'}`}>
                    <p className="text-[10px] text-gray-500 uppercase tracking-wide">
                      {hasShortage ? 'Make' : 'Status'}
                    </p>
                    {hasShortage ? (
                      <p className="text-sm font-bold text-red-600">{order.shortage}</p>
                    ) : (
                      <p className="text-sm font-bold text-green-600">✓</p>
                    )}
                  </div>
                </div>

                {/* Delivery + CTA */}
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-gray-400" />
                    <span className="text-xs text-gray-600">{formatIndianDate(order.expected_delivery)}</span>
                    <DeliveryBadge dateStr={order.expected_delivery} />
                  </div>
                  <Button
                    size="sm"
                    className="h-7 px-3 text-xs bg-blue-600 hover:bg-blue-700 text-white gap-1 group-hover:translate-x-0.5 transition-transform"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectOrder(order, order.product_id ?? '');
                    }}
                  >
                    Create Batch
                    <ArrowRight className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
