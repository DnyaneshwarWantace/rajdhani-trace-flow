import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatCurrency, formatIndianDate } from '@/utils/formatHelpers';
import { type Order, type OrderItem } from '@/services/orderService';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { canCreate } from '@/utils/permissions';
import SendToProductionModal from '@/components/production/SendToProductionModal';

const STATUS_BAR: Record<string, string> = {
  delivered:  'bg-green-500',
  dispatched: 'bg-orange-400',
  accepted:   'bg-blue-500',
  pending:    'bg-yellow-400',
  cancelled:  'bg-red-400',
};

const STATUS_BADGE: Record<string, { label: string; bg: string; text: string; border: string }> = {
  pending:    { label: 'Pending',    bg: 'bg-yellow-50',  text: 'text-yellow-700',  border: 'border-yellow-200' },
  accepted:   { label: 'Accepted',  bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-200' },
  dispatched: { label: 'Shipped',   bg: 'bg-orange-50',  text: 'text-orange-700',  border: 'border-orange-200' },
  delivered:  { label: 'Delivered', bg: 'bg-green-50',   text: 'text-green-700',   border: 'border-green-200' },
  cancelled:  { label: 'Cancelled', bg: 'bg-red-50',     text: 'text-red-700',     border: 'border-red-200' },
};

interface MobileOrderCardProps {
  order: Order;
  onStatusUpdate: (orderId: string, newStatus: string) => void;
  onCreateMaterialTask: (order: Order, payload: { assigned_to_id?: string; material_id?: string }) => Promise<void>;
  onCancel?: (order: Order) => void;
}

export default function MobileOrderCard({ order, onStatusUpdate, onCancel }: MobileOrderCardProps) {
  const navigate = useNavigate();
  const st = order.status;
  const bar = STATUS_BAR[st] || 'bg-yellow-400';
  const badge = STATUS_BADGE[st] || STATUS_BADGE.pending;

  const [dialog, setDialog] = useState<null | 'accept' | 'cancel' | 'dispatch' | 'deliver'>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [produceItem, setProduceItem] = useState<OrderItem | null>(null);

  const canManageProduction = canCreate('production');

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isOverdue = !!(order.expectedDelivery && st !== 'delivered' && st !== 'cancelled' &&
    new Date(order.expectedDelivery.split('T')[0]) < today);

  const outstanding = (order.outstandingAmount ?? 0) > 0 && st !== 'cancelled';

  // Product items only (not raw materials)
  const productItems = (order.items || []).filter(i => i.productType === 'product' && i.productId);
  const hasProducts = productItems.length > 0;

  const quickStatus = async (status: string) => {
    setDialog(null);
    setActionLoading(true);
    try {
      await onStatusUpdate(order.id, status);
    } finally {
      setActionLoading(false);
    }
  };

  const handleProduce = () => {
    if (productItems.length > 0) setProduceItem(productItems[0]);
  };

  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Colored top status bar */}
        <div className={`h-1 ${bar}`} />

        {/* Tappable info area → navigates to detail */}
        <button
          className="w-full text-left p-3.5 pb-0 block"
          onClick={() => navigate(`/orders/${order.id}`)}
        >
          {/* Order # + status badge */}
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span className="text-sm font-bold text-gray-900">{order.orderNumber || order.id}</span>
            </div>
            <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${badge.bg} ${badge.text} ${badge.border}`}>
              {badge.label}
            </span>
          </div>

          {/* Customer */}
          <div className="flex items-center gap-2 mb-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
              <span className="text-blue-700 text-sm font-extrabold">
                {order.customerName?.[0]?.toUpperCase() || '?'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{order.customerName}</p>
              {order.customerPhone && (
                <p className="text-xs text-gray-400">{order.customerPhone}</p>
              )}
            </div>
          </div>

          {/* Progress bar — accepted / dispatched / delivered */}
          {(st === 'accepted' || st === 'dispatched' || st === 'delivered') && (
            <div className="mb-3">
              <p className="text-[10px] text-gray-400 mb-1.5">Order Progress</p>
              <div className="flex gap-1">
                {[
                  { label: 'Accept',    done: true,                                      barCls: 'bg-blue-500',   textCls: 'text-blue-500' },
                  { label: 'Ship',      done: st === 'dispatched' || st === 'delivered', barCls: 'bg-orange-400', textCls: 'text-orange-500' },
                  { label: 'Delivered', done: st === 'delivered',                        barCls: 'bg-green-500',  textCls: 'text-green-600' },
                ].map(step => (
                  <div key={step.label} className="flex-1 flex flex-col items-center">
                    <div className={`h-1 w-full rounded-sm mb-1 ${step.done ? step.barCls : 'bg-gray-200'}`} />
                    <span className={`text-[9px] ${step.done ? `font-bold ${step.textCls}` : 'font-normal text-gray-300'}`}>{step.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Dates */}
          <div className="flex gap-4 mb-2.5">
            <div>
              <p className="text-[10px] text-gray-400">Order Date</p>
              <p className="text-xs font-semibold text-gray-900">{formatIndianDate(order.orderDate)}</p>
            </div>
            {order.expectedDelivery && (
              <div>
                <p className="text-[10px] text-gray-400">Expected Delivery</p>
                <p className={`text-xs font-semibold ${isOverdue ? 'text-red-600' : 'text-gray-900'}`}>
                  {formatIndianDate(order.expectedDelivery)}{isOverdue ? ' ⚠' : ''}
                </p>
              </div>
            )}
          </div>

          {/* Items count + Total */}
          <div className="flex gap-4 mb-2.5">
            <div>
              <p className="text-[10px] text-gray-400">Items</p>
              <p className="text-xs font-semibold text-gray-900">
                {order.items?.length ?? 0} product{(order.items?.length ?? 0) !== 1 ? 's' : ''}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-gray-400">Total (incl. GST)</p>
              <p className="text-sm font-extrabold text-gray-900">{formatCurrency(order.totalAmount, { full: true })}</p>
            </div>
          </div>

          {/* Order items list */}
          {order.items && order.items.length > 0 && (
            <div className="bg-gray-50 rounded-xl p-2.5 mb-2.5 space-y-1.5">
              <p className="text-[11px] font-bold text-gray-500 mb-1">
                {st === 'delivered' ? 'Items Delivered:' : 'Order Items:'}
              </p>
              {order.items.map((item, idx) => (
                <div key={item.id || idx} className="bg-white rounded-lg border border-gray-100 p-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-900 truncate">{item.productName}</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        {item.productType === 'raw_material' ? 'Raw Material' : 'Finished Product'} · Qty: {Number(item.quantity) % 1 === 0 ? Number(item.quantity).toFixed(0) : Number(item.quantity).toFixed(2)} {item.count_unit || item.unit || 'Rolls'}
                      </p>
                      {item.productType === 'product' && (item.length || item.width) && (
                        <p className="text-[11px] text-gray-400">
                          Size: {[
                            item.length && `${item.length}${item.length_unit || 'ft'}`,
                            item.width && `${item.width}${item.width_unit || 'm'}`
                          ].filter(Boolean).join(' × ')}
                          {item.weight && ` · GSM: ${item.weight}${item.weight_unit || ''}`}
                        </p>
                      )}
                      {(item.color || item.pattern) && (
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {item.color && (
                            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-gray-50 border border-gray-100 text-[10px] text-gray-500">
                              <span className="w-2 h-2 rounded-full border border-gray-200 flex-shrink-0" style={{ backgroundColor: item.color?.startsWith('#') ? item.color : '#999' }} />
                              {item.color}
                            </span>
                          )}
                          {item.pattern && (
                            <span className="px-1.5 py-0.5 rounded-md bg-gray-50 border border-gray-100 text-[10px] text-gray-500">{item.pattern}</span>
                          )}
                        </div>
                      )}
                    </div>
                    <p className="text-xs font-bold text-gray-900 flex-shrink-0">{formatCurrency(item.totalPrice ?? 0, { full: true })}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Paid / Outstanding */}
          <div className="flex gap-4 mb-3">
            <div>
              <p className="text-[10px] text-gray-400">Paid</p>
              <p className="text-sm font-bold text-green-600">{formatCurrency(order.paidAmount ?? 0, { full: true })}</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-400">Outstanding</p>
              <p className={`text-sm font-bold ${outstanding ? 'text-red-600' : 'text-green-600'}`}>{formatCurrency(order.outstandingAmount ?? 0, { full: true })}</p>
            </div>
          </div>
        </button>{/* end nav-button */}

        <div className="px-3.5 pb-3.5">
          {/* ── STATUS ACTION BOX ── */}

          {/* PENDING */}
          {st === 'pending' && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-2.5 mb-2.5 space-y-2">
              <div className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-amber-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-xs font-semibold text-amber-800">Order Pending – Awaiting Acceptance</span>
              </div>
              <div className="flex gap-2">
                <button disabled={actionLoading} onClick={() => setDialog('accept')}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold disabled:opacity-60">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  Accept Order
                </button>
                <button disabled={actionLoading} onClick={() => setDialog('cancel')}
                  className="w-11 flex items-center justify-center rounded-xl border border-red-200 bg-red-50">
                  <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              {hasProducts && canManageProduction && (
                <button onClick={() => handleProduce()}
                  className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                  Send to Production{productItems.length > 1 ? ` (${productItems.length})` : ''}
                </button>
              )}
            </div>
          )}

          {/* ACCEPTED */}
          {st === 'accepted' && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-2.5 mb-2.5 space-y-2">
              <div className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <span className="text-xs font-semibold text-blue-800">Order Accepted</span>
              </div>
              <div className="flex gap-2">
                <button disabled={actionLoading} onClick={() => setDialog('dispatch')}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-orange-500 text-white text-sm font-bold disabled:opacity-60">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
                  Ship Order
                </button>
                <button disabled={actionLoading} onClick={() => setDialog('cancel')}
                  className="w-11 flex items-center justify-center rounded-xl border border-red-200 bg-red-50">
                  <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              {hasProducts && canManageProduction && (
                <button onClick={() => handleProduce()}
                  className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                  Send to Production{productItems.length > 1 ? ` (${productItems.length})` : ''}
                </button>
              )}
            </div>
          )}

          {/* DISPATCHED */}
          {st === 'dispatched' && (
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-2.5 mb-2.5">
              <div className="flex items-center gap-1.5 mb-2">
                <svg className="w-3.5 h-3.5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
                <span className="text-xs font-semibold text-orange-700">Order Shipped – Ready to Deliver</span>
              </div>
              <button disabled={actionLoading} onClick={() => setDialog('deliver')}
                className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-green-500 text-white text-sm font-bold disabled:opacity-60">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                Mark as Delivered
              </button>
            </div>
          )}

          {/* DELIVERED */}
          {st === 'delivered' && (
            <div className="bg-green-50 border border-green-400 rounded-xl p-2.5 mb-2.5">
              <div className="flex items-center gap-1.5 mb-1">
                <svg className="w-3.5 h-3.5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <span className="text-xs font-semibold text-green-700">Order Delivered Successfully</span>
              </div>
              {order.deliveredAt && <p className="text-xs text-green-600">Delivered on {formatIndianDate(order.deliveredAt)}</p>}
            </div>
          )}

          <button onClick={() => navigate(`/orders/${order.id}`)}
            className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-500 mb-0.5">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            View Details
          </button>
        </div>{/* end actions div */}
      </div>{/* end card */}

      {/* Confirm dialogs */}
      <ConfirmDialog
        isOpen={dialog === 'accept'}
        title="Accept Order?"
        description={`Accept ${order.orderNumber} from ${order.customerName}? Stock will be reserved immediately.`}
        confirmText="Accept Order"
        cancelText="Cancel"
        isLoading={actionLoading}
        onConfirm={() => quickStatus('accepted')}
        onClose={() => setDialog(null)}
      />
      <ConfirmDialog
        isOpen={dialog === 'cancel'}
        title="Cancel Order?"
        description="This will release all reserved stock and cannot be undone."
        confirmText="Cancel Order"
        cancelText="Keep Order"
        variant="danger"
        isLoading={actionLoading}
        onConfirm={() => { onCancel?.(order); setDialog(null); }}
        onClose={() => setDialog(null)}
      />
      <ConfirmDialog
        isOpen={dialog === 'dispatch'}
        title="Ship Order?"
        description={`Mark ${order.orderNumber} as dispatched to ${order.customerName}?`}
        confirmText="Ship Order"
        cancelText="Cancel"
        isLoading={actionLoading}
        onConfirm={() => quickStatus('dispatched')}
        onClose={() => setDialog(null)}
      />
      <ConfirmDialog
        isOpen={dialog === 'deliver'}
        title="Mark as Delivered?"
        description={`Confirm that ${order.orderNumber} has been delivered to ${order.customerName}.`}
        confirmText="Mark Delivered"
        cancelText="Cancel"
        isLoading={actionLoading}
        onConfirm={() => quickStatus('delivered')}
        onClose={() => setDialog(null)}
      />

      {/* Send to Production modal — full web modal (same as desktop) */}
      {produceItem && (
        <SendToProductionModal
          open={!!produceItem}
          onClose={() => setProduceItem(null)}
          order={order}
          productItem={produceItem}
        />
      )}
    </>
  );
}
