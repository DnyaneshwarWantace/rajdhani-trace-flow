import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Plus, ShoppingCart, List, Grid3x3, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { OrderService, type Order } from '@/services/orderService';
import OrderTable from '@/components/orders/OrderTable';
import OrderCard from '@/components/orders/OrderCard';
import OrderFilters from '@/components/orders/OrderFilters';
import OrderStatsBoxes from '@/components/orders/OrderStatsBoxes';
import Pagination from '@/components/ui/pagination';
import { canView, canCreate } from '@/utils/permissions';
import PermissionDenied from '@/components/ui/PermissionDenied';
import { useLiveSyncRefresh } from '@/hooks/useLiveSyncRefresh';

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
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Orders</h1>
            <p className="text-gray-600 mt-1">Manage customer orders and track fulfillment</p>
          </div>
          <div className="flex items-center gap-3">
            {/* View Mode Toggle - same icons as Customers/Suppliers/Materials (List = table, Grid3x3 = grid) */}
            <div className="flex items-center gap-1 border border-gray-300 rounded-lg p-1">
              <Button
                variant={viewMode === 'table' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('table')}
                className={`hidden lg:inline-flex ${viewMode === 'table' ? 'bg-primary-600 text-white' : ''}`}
                title="Table View"
              >
                <List className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className={viewMode === 'grid' ? 'bg-primary-600 text-white' : ''}
                title="Grid View"
              >
                <Grid3x3 className="w-4 h-4" />
              </Button>
            </div>

            {/* New Order Button */}
            {canCreate('orders') && (
              <Button onClick={() => navigate('/orders/new')} className="bg-primary-600 hover:bg-primary-700 text-white">
                <Plus className="w-4 h-4 mr-2" />
                New Order
              </Button>
            )}
          </div>
        </div>

        {/* Draft resume banner */}
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
              <button
                onClick={discard}
                className="text-xs text-amber-600 hover:text-amber-800 font-medium px-3 py-1.5 rounded-md hover:bg-amber-100 transition-colors"
              >
                Discard
              </button>
              <Button
                onClick={() => navigate('/orders/new')}
                className="h-8 px-4 text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white"
              >
                Resume draft →
              </Button>
            </div>
          </div>
        )}

        {/* Stats Boxes */}
        <OrderStatsBoxes stats={stats} loading={statsLoading} />

        {/* Filters */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <OrderFilters
            filters={filters}
            onSearchChange={(value) => handleFilterChange('search', value)}
            onStatusChange={(values) => handleFilterChange('status', values)}
            onCustomerChange={(values) => handleFilterChange('customer_id', values)}
            onSortChange={(sortBy, sortOrder) => {
              setFilters(prev => ({ ...prev, sortBy, sortOrder, page: 1 }));
            }}
          />
        </div>

        {/* Orders List */}
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
              <Button onClick={() => navigate('/orders/new')}>
                <Plus className="w-4 h-4 mr-2" />
                Create Order
              </Button>
            )}
          </div>
        ) : (
          <>
            {/* Desktop View - Table or Grid */}
            <div className="hidden lg:block">
              {viewMode === 'table' ? (
                <OrderTable
                  orders={orders}
                  onStatusUpdate={handleStatusUpdate}
                  onViewDetails={handleViewDetails}
                  onCreateMaterialTask={handleCreateMaterialTask}
                />
              ) : (
                <div className="columns-1 lg:columns-2 xl:columns-3 gap-4 space-y-4">
                  {orders.map((order) => (
                    <div key={order.id} className="break-inside-avoid mb-4">
                      <OrderCard
                        order={order}
                        onStatusUpdate={handleStatusUpdate}
                        onViewDetails={handleViewDetails}
                        onCreateMaterialTask={handleCreateMaterialTask}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Mobile View - Always Grid */}
            <div className="lg:hidden">
              <div className="grid grid-cols-1 gap-4">
                {orders.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    onStatusUpdate={handleStatusUpdate}
                    onViewDetails={handleViewDetails}
                    onCreateMaterialTask={handleCreateMaterialTask}
                  />
                ))}
              </div>
            </div>

            {/* Pagination */}
            {totalOrders > filters.limit && (
              <Pagination
                currentPage={filters.page}
                totalPages={Math.ceil(totalOrders / filters.limit)}
                onPageChange={handlePageChange}
              />
            )}
          </>
        )}
      </div>
    </Layout>
  );
}


