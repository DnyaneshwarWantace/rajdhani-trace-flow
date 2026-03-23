import { useState, useEffect } from 'react';
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
import { canView } from '@/utils/permissions';
import PermissionDenied from '@/components/ui/PermissionDenied';

type ViewMode = 'table' | 'grid';

export default function OrderList() {
  const navigate = useNavigate();
  const { toast } = useToast();
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

  // Load stats only on mount
  useEffect(() => {
    loadStats();
  }, []);

  // Load orders when filters change
  useEffect(() => {
    loadOrders();
  }, [filters]);

  const loadOrders = async () => {
    try {
      setLoading(true);
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
      setLoading(false);
    }
  };

  const loadStats = async () => {
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
  };

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

      loadOrders();
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
            <Button onClick={() => navigate('/orders/new')} className="bg-primary-600 hover:bg-primary-700 text-white">
              <Plus className="w-4 h-4 mr-2" />
              New Order
            </Button>
          </div>
        </div>

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
                />
              ) : (
                <div className="columns-1 lg:columns-2 xl:columns-3 gap-4 space-y-4">
                  {orders.map((order) => (
                    <div key={order.id} className="break-inside-avoid mb-4">
                      <OrderCard
                        order={order}
                        onStatusUpdate={handleStatusUpdate}
                        onViewDetails={handleViewDetails}
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


