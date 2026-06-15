import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Plus, ShoppingCart, List, Grid3x3, Loader2, SlidersHorizontal, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { OrderService, type Order } from '@/services/orderService';
import OrderTable from '@/components/orders/OrderTable';
import OrderCard from '@/components/orders/OrderCard';
import OrderFilters from '@/components/orders/OrderFilters';
import OrderStatsBoxes from '@/components/orders/OrderStatsBoxes';
import MobileOrderCard from '@/components/orders/MobileOrderCard';
import MobileOrderFilters from '@/components/orders/MobileOrderFilters';
import Pagination from '@/components/ui/pagination';
import { canView, canCreate } from '@/utils/permissions';
import PermissionDenied from '@/components/ui/PermissionDenied';
import { useLiveSyncRefresh } from '@/hooks/useLiveSyncRefresh';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

type ViewMode = 'table' | 'grid';

const DRAFT_KEY = 'newOrderDraft';

function useDraft() {
  const [draft, setDraft] = useState<{ customerName?: string; itemCount?: number; step?: number } | null>(null);
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const d = JSON.parse(raw);
      if (d.selectedCustomer || d.orderItems?.length) {
        setDraft({
          customerName: d.selectedCustomer?.name,
          itemCount: d.orderItems?.length || 0,
          step: d.step || 0,
        });
      }
    } catch { }
  }, []);
  const discard = () => { sessionStorage.removeItem(DRAFT_KEY); setDraft(null); };
  return { draft, discard };
}

export default function OrderList() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { draft, discard } = useDraft();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [cancelTarget, setCancelTarget] = useState<Order | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState<false | 'sort' | 'filter'>(false);
  const [filters, setFilters] = useState({
    search: '',
    status: [] as string[],
    customer_id: [] as string[],
    page: 1,
    limit: 50,
    sortBy: 'order_date',
    sortOrder: 'desc' as 'asc' | 'desc',
  });
  const [totalOrders, setTotalOrders] = useState(0);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    accepted: 0,
    dispatched: 0,
    delivered: 0,
    cancelled: 0,
  });
  const [statsLoading, setStatsLoading] = useState(false);

  const loadOrders = useCallback(async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);
      const searchQuery = filters.search?.trim();
      const { data, error, count } = await OrderService.getOrders({
        search: searchQuery && searchQuery.length >= 3 ? searchQuery : undefined,
        status: filters.status.length > 0 ? filters.status : undefined,
        customer_id: filters.customer_id.length > 0 ? filters.customer_id : undefined,
        limit: filters.limit,
        offset: (filters.page - 1) * filters.limit,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
      });

      if (error) {
        toast({
          title: 'Error',
          description: error,
          variant: 'destructive',
        });
        setOrders([]);
        return;
      }

      setOrders(data || []);
      setTotalOrders(count || 0);
    } catch (error) {
      console.error('Error loading orders:', error);
      toast({
        title: 'Error',
        description: 'Failed to load orders',
        variant: 'destructive',
      });
      setOrders([]);
    } finally {
      if (showLoader) setLoading(false);
    }
  }, [filters, toast]);

  const loadStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      const { data, error } = await OrderService.getOrderStats();
      if (error || !data) return;
      setStats({
        total: data.total,
        pending: data.pending,
        accepted: data.accepted,
        dispatched: data.dispatched,
        delivered: data.delivered,
        cancelled: data.cancelled ?? 0,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // Load stats only on mount
  useEffect(() => {
    loadStats();
  }, []);

  // Load orders when filters change
  useEffect(() => {
    loadOrders();
  }, [filters]);

  useEffect(() => {
    const handleOrderUpdated = () => {
      loadOrders(false);
      loadStats();
    };
    window.addEventListener('order-updated', handleOrderUpdated);
    return () => {
      window.removeEventListener('order-updated', handleOrderUpdated);
    };
  }, [loadOrders, loadStats]);

  useLiveSyncRefresh({
    modules: ['orders', 'materials', 'production', 'manage_stock'],
    onRefresh: () => {
      loadOrders(false);
      loadStats();
    },
    pollingMs: 6000,
  });

  const handleStatusUpdate = async (orderId: string, newStatus: string) => {
    try {
      const { error } = await OrderService.updateOrderStatus(orderId, newStatus);

      if (error) {
        toast({
          title: 'Error',
          description: error,
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Status Updated',
        description: `Order status updated to ${newStatus}`,
      });

      // Optimistic row update to avoid full list reload flicker.
      setOrders((prev) =>
        prev.map((order) =>
          order.id === orderId
            ? {
                ...order,
                status: newStatus,
                ...(newStatus === 'accepted' ? { acceptedAt: new Date().toISOString() } : {}),
                ...(newStatus === 'dispatched' ? { dispatchedAt: new Date().toISOString() } : {}),
                ...(newStatus === 'delivered' ? { deliveredAt: new Date().toISOString() } : {}),
              }
            : order
        )
      );

      // Refresh data silently in background so table stays stable.
      loadOrders(false);
      loadStats();
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update order status',
        variant: 'destructive',
      });
    }
  };

  const handleCancelConfirm = async () => {
    if (!cancelTarget) return;
    setCancelling(true);
    const { error } = await OrderService.updateOrderStatus(cancelTarget.id, 'cancelled');
    setCancelling(false);
    if (error) {
      toast({ title: 'Error', description: error, variant: 'destructive' });
    } else {
      toast({ title: 'Order Cancelled', description: `Order ${cancelTarget.orderNumber} has been cancelled and reserved stock released.` });
      setOrders(prev => prev.map(o => o.id === cancelTarget.id ? { ...o, status: 'cancelled' } : o));
      loadOrders(false);
      loadStats();
    }
    setCancelTarget(null);
  };

  const handleViewDetails = (order: Order) => {
    navigate(`/orders/${order.id}`);
  };

  const handleCreateMaterialTask = async (order: Order, payload: { assigned_to_id?: string; material_id?: string }) => {
    const result = await OrderService.createMaterialProcurementTask(order.id, payload);
    if (!result.success) {
      toast({
        title: 'Error',
        description: result.error || 'Failed to assign material task',
        variant: 'destructive',
      });
      return;
    }
    toast({
      title: 'Task Assigned',
      description: payload.assigned_to_id
        ? 'Material task assigned successfully.'
        : 'Material task sent to all eligible users.',
    });
  };

  const handleFilterChange = (key: string, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: 1, // Reset to first page on filter change
    }));
  };

  const handlePageChange = (page: number) => {
    setFilters(prev => ({ ...prev, page }));
  };

  if (!canView('orders')) {
    return <Layout><PermissionDenied /></Layout>;
  }

  return (
    <Layout>
      {/* ─── DESKTOP layout ─────────────────────────────────────────────── */}
      <div className="hidden lg:block space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Orders</h1>
            <p className="text-gray-600 mt-1">Manage customer orders and track fulfillment</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 border border-gray-300 rounded-lg p-0">
              <Button
                variant={viewMode === 'table' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('table')}
                className={`h-10 w-10 p-0 ${viewMode === 'table' ? 'bg-primary-600 text-white' : ''}`}
                title="Table View"
              >
                <List className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className={`h-10 w-10 p-0 ${viewMode === 'grid' ? 'bg-primary-600 text-white' : ''}`}
                title="Grid View"
              >
                <Grid3x3 className="w-4 h-4" />
              </Button>
            </div>
            {canCreate('orders') && (
              <Button onClick={() => navigate('/orders/new')} className="bg-primary-600 hover:bg-primary-700 text-white">
                <Plus className="w-4 h-4 mr-2" />
                New Order
              </Button>
            )}
          </div>
        </div>

        {draft && (
          <div className="flex items-center justify-between gap-4 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#92400e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-amber-900">You have an unfinished order</p>
                <p className="text-xs text-amber-700 mt-0.5">
                  {draft.customerName ? <><span className="font-medium">{draft.customerName}</span> · </> : ''}
                  {draft.itemCount ? `${draft.itemCount} item${draft.itemCount !== 1 ? 's' : ''} added` : 'No items yet'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button onClick={discard} className="text-xs text-amber-600 hover:text-amber-800 font-medium px-3 py-1.5 rounded-md hover:bg-amber-100 transition-colors">Discard</button>
              <Button onClick={() => navigate('/orders/new')} className="h-8 px-4 text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white">Resume draft →</Button>
            </div>
          </div>
        )}

        <OrderStatsBoxes stats={stats} loading={statsLoading} />

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <OrderFilters
            filters={filters}
            onSearchChange={(value) => handleFilterChange('search', value)}
            onStatusChange={(values) => handleFilterChange('status', values)}
            onCustomerChange={(values) => handleFilterChange('customer_id', values)}
            onSortChange={(sortBy, sortOrder) => setFilters(prev => ({ ...prev, sortBy, sortOrder, page: 1 }))}
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
          </div>
        ) : orders.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <ShoppingCart className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Orders Found</h3>
            <p className="text-gray-600 mb-6">
              {filters.search || filters.status.length > 0 || filters.customer_id.length > 0
                ? 'Try adjusting your search or filters'
                : 'Get started by creating your first order'}
            </p>
            {(!filters.search && filters.status.length === 0 && filters.customer_id.length === 0) && (
              <Button onClick={() => navigate('/orders/new')}><Plus className="w-4 h-4 mr-2" />Create Order</Button>
            )}
          </div>
        ) : (
          <>
            {viewMode === 'table' ? (
              <OrderTable orders={orders} onStatusUpdate={handleStatusUpdate} onViewDetails={handleViewDetails} onCreateMaterialTask={handleCreateMaterialTask} onCancel={setCancelTarget} />
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 items-start">
                {orders.map((order) => (
                  <OrderCard key={order.id} order={order} onStatusUpdate={handleStatusUpdate} onViewDetails={handleViewDetails} onCreateMaterialTask={handleCreateMaterialTask} onCancel={setCancelTarget} />
                ))}
              </div>
            )}
            {totalOrders > filters.limit && (
              <Pagination currentPage={filters.page} totalPages={Math.ceil(totalOrders / filters.limit)} onPageChange={handlePageChange} />
            )}
          </>
        )}
      </div>

      {/* ─── MOBILE layout ──────────────────────────────────────────────── */}
      <div className="lg:hidden -m-2 sm:-m-3 flex flex-col min-h-screen bg-gray-50">

        {/* White header block — matches app */}
        <div className="bg-white border-b border-gray-200 px-4 pt-3 pb-3">
          {/* Title row */}
          <div className="flex items-center justify-between mb-0.5">
            <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
            {canCreate('orders') && (
              <button
                onClick={() => navigate('/orders/new')}
                className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center"
              >
                <Plus className="w-5 h-5 text-white" />
              </button>
            )}
          </div>
          <p className="text-xs text-gray-400 mb-2">{totalOrders} orders</p>

          {/* Stats strip — single bordered row like the app */}
          <div className="flex border border-gray-200 rounded-xl overflow-hidden">
            {[
              { label: 'Total',     value: stats.total,     color: 'text-gray-900' },
              { label: 'Pending',   value: stats.pending,   color: 'text-yellow-500' },
              { label: 'Accepted',  value: stats.accepted,  color: 'text-blue-600' },
              { label: 'Shipped',   value: stats.dispatched,color: 'text-purple-600' },
              { label: 'Delivered', value: stats.delivered, color: 'text-green-600' },
            ].map((s, i) => (
              <button
                key={s.label}
                onClick={() => handleFilterChange('status', s.label === 'Total' ? [] : [s.label === 'Shipped' ? 'dispatched' : s.label.toLowerCase()])}
                className={`flex-1 flex flex-col items-center py-1.5 ${i > 0 ? 'border-l border-gray-200' : ''}`}
              >
                <span className={`text-sm font-extrabold tracking-tight ${s.color}`}>{statsLoading ? '…' : s.value}</span>
                <span className="text-[9px] text-gray-400 font-medium mt-0.5">{s.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Search bar */}
        <div className="px-4 pt-2 pb-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={filters.search}
              onChange={e => handleFilterChange('search', e.target.value)}
              placeholder="Search order # or customer…"
              className="w-full pl-9 pr-4 h-[46px] rounded-[10px] border border-gray-200 bg-white text-[15px] outline-none focus:border-blue-400 shadow-sm"
            />
          </div>
        </div>

        {/* Active filter chips */}
        {filters.status.length > 0 && (
          <div className="flex gap-2 flex-wrap px-4 pb-1">
            {filters.status.map(s => (
              <button
                key={s}
                onClick={() => handleFilterChange('status', filters.status.filter(v => v !== s))}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold"
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
                <span className="ml-0.5">×</span>
              </button>
            ))}
            <button
              onClick={() => handleFilterChange('status', [])}
              className="px-2.5 py-1 rounded-full border border-gray-200 bg-white text-gray-500 text-xs font-semibold"
            >Clear</button>
          </div>
        )}

        {/* Draft banner */}
        {draft && (
          <div className="mx-4 mt-1 flex items-center justify-between gap-3 px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-xl">
            <p className="text-xs text-amber-800 font-medium">
              Draft: {draft.customerName || 'Unnamed'} · {draft.itemCount || 0} items
            </p>
            <div className="flex gap-2 flex-shrink-0">
              <button onClick={discard} className="text-xs text-amber-600 font-medium">Discard</button>
              <button onClick={() => navigate('/orders/new')} className="text-xs text-white font-semibold bg-amber-600 px-2.5 py-1 rounded-lg">Resume</button>
            </div>
          </div>
        )}

        {/* Orders list */}
        <div className="flex-1 px-4 pt-1 pb-32">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="text-5xl mb-3">🛒</div>
              <p className="text-base font-bold text-gray-900 mb-1">No orders found</p>
              <p className="text-sm text-gray-400">Try different filters or create a new order</p>
            </div>
          ) : (
            <div className="space-y-3 pt-2">
              {orders.map(order => (
                <MobileOrderCard
                  key={order.id}
                  order={order}
                  onStatusUpdate={handleStatusUpdate}
                  onCreateMaterialTask={handleCreateMaterialTask}
                  onCancel={setCancelTarget}
                />
              ))}
              {totalOrders > filters.limit && (
                <Pagination currentPage={filters.page} totalPages={Math.ceil(totalOrders / filters.limit)} onPageChange={handlePageChange} />
              )}
            </div>
          )}
        </div>

        {/* FAB — New Order */}
        {canCreate('orders') && (
          <button
            onClick={() => navigate('/orders/new')}
            className="fixed right-4 bottom-20 w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg z-30"
            style={{ boxShadow: '0 4px 16px rgba(37,99,235,0.4)' }}
          >
            <Plus className="w-6 h-6 text-white" />
          </button>
        )}

        {/* Bottom SORT / FILTER bar — fixed, like the app */}
        <div className="fixed bottom-16 left-0 right-0 flex bg-white border-t border-gray-200 z-20 lg:hidden">
          <button
            onClick={() => setMobileFiltersOpen('sort')}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 border-r border-gray-200"
          >
            <SlidersHorizontal className="w-4 h-4 text-gray-700" />
            <span className="text-sm font-semibold text-gray-900 tracking-wide">SORT</span>
          </button>
          <button
            onClick={() => setMobileFiltersOpen('filter')}
            className="flex-1 flex items-center justify-center gap-2 py-3.5"
          >
            <svg className="w-4 h-4" fill="none" stroke={filters.status.length > 0 ? '#2563EB' : 'currentColor'} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
            </svg>
            <span className={`text-sm font-semibold tracking-wide ${filters.status.length > 0 ? 'text-blue-600' : 'text-gray-900'}`}>
              FILTER{filters.status.length > 0 ? ` (${filters.status.length})` : ''}
            </span>
          </button>
        </div>
      </div>

      <MobileOrderFilters
        isOpen={!!mobileFiltersOpen}
        mode={mobileFiltersOpen === 'sort' ? 'sort' : 'filter'}
        onClose={() => setMobileFiltersOpen(false)}
        filters={filters}
        onStatusChange={vals => handleFilterChange('status', vals)}
        onCustomerChange={vals => handleFilterChange('customer_id', vals)}
        onSortChange={(sortBy, sortOrder) => setFilters(prev => ({ ...prev, sortBy, sortOrder, page: 1 }))}
        onReset={() => setFilters(prev => ({ ...prev, status: [], customer_id: [], page: 1 }))}
      />

      <ConfirmDialog
        isOpen={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        onConfirm={handleCancelConfirm}
        title="Cancel Order"
        description={cancelTarget
          ? `Cancel order ${cancelTarget.orderNumber}?\n\nAny reserved individual products will be released back to available stock. The order history and all item details will be preserved.\n\nThis cannot be undone.`
          : ''}
        confirmText="Yes, Cancel Order"
        cancelText="Keep Order"
        variant="danger"
        isLoading={cancelling}
      />
    </Layout>
  );
}


