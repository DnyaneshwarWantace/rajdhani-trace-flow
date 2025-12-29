import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Plus, ShoppingCart, Table, Grid3x3, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { OrderService, type Order } from '@/services/orderService';
import OrderTable from '@/components/orders/OrderTable';
import OrderCard from '@/components/orders/OrderCard';
import OrderFilters from '@/components/orders/OrderFilters';
import OrderStatsBoxes from '@/components/orders/OrderStatsBoxes';
import Pagination from '@/components/ui/pagination';

type ViewMode = 'table' | 'grid';

export default function OrderList() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    customer_id: 'all',
    page: 1,
    limit: 50,
  });
  const [totalOrders, setTotalOrders] = useState(0);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    inProduction: 0,
    ready: 0,
    delivered: 0,
  });
  const [statsLoading, setStatsLoading] = useState(false);

  useEffect(() => {
    loadOrders();
    loadStats();
  }, [filters]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const { data, error, count } = await OrderService.getOrders({
        search: filters.search || undefined,
        status: filters.status !== 'all' ? filters.status : undefined,
        customer_id: filters.customer_id !== 'all' ? filters.customer_id : undefined,
        limit: filters.limit,
        offset: (filters.page - 1) * filters.limit,
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
      const { data } = await OrderService.getOrders({ limit: 10000 });
      const ordersData = data || [];
      
      setStats({
        total: ordersData.length,
        pending: ordersData.filter((o: Order) => o.status === 'pending').length,
        inProduction: ordersData.filter((o: Order) => o.status === 'in_production').length,
        ready: ordersData.filter((o: Order) => o.status === 'ready').length,
        delivered: ordersData.filter((o: Order) => o.status === 'delivered').length,
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

  return (
    <Layout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Orders</h1>
            <p className="text-gray-600 mt-1">Manage customer orders and track fulfillment</p>
          </div>
          <Button onClick={() => navigate('/orders/new')}>
            <Plus className="w-4 h-4 mr-2" />
            New Order
          </Button>
        </div>

        {/* Stats Boxes */}
        <OrderStatsBoxes stats={stats} loading={statsLoading} />

        {/* Filters and View Toggle */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <OrderFilters
              filters={filters}
              onSearchChange={(value) => handleFilterChange('search', value)}
              onStatusChange={(value) => handleFilterChange('status', value)}
              onCustomerChange={(value) => handleFilterChange('customer_id', value)}
            />

            {/* View Mode Toggle - Desktop Only */}
            <div className="hidden lg:flex items-center gap-2">
              <span className="text-sm text-gray-600 whitespace-nowrap">View:</span>
              <button
                onClick={() => setViewMode('table')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  viewMode === 'table'
                    ? 'bg-primary-100 text-primary-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
                title="Table View"
              >
                <Table className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-primary-100 text-primary-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
                title="Grid View"
              >
                <Grid3x3 className="w-4 h-4" />
              </button>
            </div>
          </div>
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
              {filters.search || filters.status !== 'all' || filters.customer_id !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Get started by creating your first order'}
            </p>
            {(!filters.search && filters.status === 'all' && filters.customer_id === 'all') && (
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


