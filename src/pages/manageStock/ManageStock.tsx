import { useState, useEffect } from 'react';
import Layout from '@/components/layout/Layout';
import OrderStatsBoxes from '@/components/manageStock/OrderStatsBoxes';
import OrderFilters from '@/components/manageStock/OrderFilters';
import OrderCardNew from '@/components/manageStock/OrderCardNew';
import OrderTable from '@/components/manageStock/OrderTable';
import OrderDetailsDialog from '@/components/manageStock/OrderDetailsDialog';
import { ManageStockService } from '@/services/manageStockService';
import type { StockOrder, OrderStats, OrderFilters as OrderFiltersType } from '@/types/manageStock';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function ManageStock() {
  const { toast } = useToast();
  const [orders, setOrders] = useState<StockOrder[]>([]);
  const [totalOrders, setTotalOrders] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [stats, setStats] = useState<OrderStats>({
    totalOrders: 0,
    totalValue: 0,
    pendingOrders: 0,
    deliveredOrders: 0,
  });
  const [filters, setFilters] = useState<OrderFiltersType>({
    search: '',
    status: 'all',
    page: 1,
    limit: 50,
  });
  const [selectedOrder, setSelectedOrder] = useState<StockOrder | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);

  useEffect(() => {
    loadOrders();
    loadStats();
  }, [filters]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const { data, count } = await ManageStockService.getOrders({
        search: filters.search,
        status: filters.status,
        limit: filters.limit,
        offset: (filters.page - 1) * filters.limit,
      });
      setOrders(data);
      setTotalOrders(count || data.length);
    } catch (error) {
      console.error('Error loading orders:', error);
      toast({
        title: 'Error',
        description: 'Failed to load orders',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      setStatsLoading(true);
      const statsData = await ManageStockService.getOrderStats();
      setStats(statsData);
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  const handleSearchChange = (value: string) => {
    setFilters({ ...filters, search: value, page: 1 });
  };

  const handleStatusChange = (value: string) => {
    setFilters({ ...filters, status: value, page: 1 });
  };

  const handleStatusUpdate = async (orderId: string, newStatus: StockOrder['status']) => {
    try {
      const { success, error } = await ManageStockService.updateOrderStatus(orderId, newStatus);

      if (!success) {
        toast({
          title: 'Error',
          description: error || 'Failed to update order status',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Success',
        description: `Order status updated to ${newStatus}`,
      });

      // Reload orders and stats
      await loadOrders();
      await loadStats();
    } catch (error) {
      console.error('Error updating order status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update order status',
        variant: 'destructive',
      });
    }
  };

  const handleViewDetails = (order: StockOrder) => {
    setSelectedOrder(order);
    setIsDetailsDialogOpen(true);
  };

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.materialName.toLowerCase().includes(filters.search.toLowerCase()) ||
      order.supplier.toLowerCase().includes(filters.search.toLowerCase());
    const matchesStatus = filters.status === 'all' || order.status === filters.status;
    return matchesSearch && matchesStatus;
  });

  return (
    <Layout>
      <div>
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Manage Stock</h1>
          <p className="text-gray-600 mt-1">Track and manage material purchase orders</p>
        </div>

        {/* Stats Boxes */}
        <OrderStatsBoxes stats={stats} loading={statsLoading} />

        {/* Filters */}
        <OrderFilters
          filters={filters}
          onSearchChange={handleSearchChange}
          onStatusChange={handleStatusChange}
        />

        {/* Orders List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <p className="text-gray-600">No orders found</p>
          </div>
        ) : (
          <>
            {/* Mobile & Tablet: Grid Card View */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:hidden gap-4">
              {filteredOrders.map((order) => (
                <OrderCardNew
                  key={order.id}
                  order={order}
                  onStatusUpdate={handleStatusUpdate}
                  onViewDetails={handleViewDetails}
                />
              ))}
            </div>

            {/* Desktop: Table View */}
            <div className="hidden xl:block">
              <OrderTable
                orders={filteredOrders}
                onStatusUpdate={handleStatusUpdate}
                onViewDetails={handleViewDetails}
              />
            </div>
          </>
        )}

        {/* Pagination */}
        {!loading && totalOrders > 0 && (() => {
          const totalPages = Math.ceil(totalOrders / filters.limit);
          const pages: (number | 'ellipsis')[] = [];

          if (totalPages <= 7) {
            for (let i = 1; i <= totalPages; i++) {
              pages.push(i);
            }
          } else {
            pages.push(1);
            if (filters.page > 3) pages.push('ellipsis');

            const start = Math.max(2, filters.page - 1);
            const end = Math.min(totalPages - 1, filters.page + 1);

            for (let i = start; i <= end; i++) {
              if (i !== 1 && i !== totalPages) {
                pages.push(i);
              }
            }

            if (filters.page < totalPages - 2) pages.push('ellipsis');
            if (totalPages > 1) pages.push(totalPages);
          }

          return (
            <div className="mt-6">
              <Pagination className="w-full">
                <PaginationContent className="w-full justify-center flex-wrap gap-1">
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => {
                        if (filters.page > 1) setFilters({ ...filters, page: filters.page - 1 });
                      }}
                      className={`${filters.page === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'} h-8 w-8 sm:h-10 sm:w-auto text-xs sm:text-sm`}
                    />
                  </PaginationItem>

                  {pages.map((p, index) => (
                    <PaginationItem key={index} className={p === 'ellipsis' ? 'hidden sm:block' : ''}>
                      {p === 'ellipsis' ? (
                        <PaginationEllipsis />
                      ) : (
                        <PaginationLink
                          isActive={p === filters.page}
                          onClick={() => setFilters({ ...filters, page: p as number })}
                          className={`cursor-pointer h-8 w-8 sm:h-10 sm:w-10 text-xs sm:text-sm p-0 ${
                            Math.abs((p as number) - filters.page) > 1 && (p as number) !== 1 && (p as number) !== totalPages
                              ? 'hidden sm:flex'
                              : ''
                          }`}
                        >
                          {p}
                        </PaginationLink>
                      )}
                    </PaginationItem>
                  ))}

                  <PaginationItem>
                    <PaginationNext
                      onClick={() => {
                        if (filters.page < totalPages) setFilters({ ...filters, page: filters.page + 1 });
                      }}
                      className={`${filters.page >= totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'} h-8 w-8 sm:h-10 sm:w-auto text-xs sm:text-sm`}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>

              <div className="mt-3 sm:mt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-xs sm:text-sm text-gray-600 text-center sm:text-left">
                  Showing {(filters.page - 1) * filters.limit + 1} to {Math.min(filters.page * filters.limit, totalOrders)} of {totalOrders} orders
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs sm:text-sm text-gray-600 whitespace-nowrap">Per page:</label>
                  <Select
                    value={filters.limit.toString()}
                    onValueChange={(value) => setFilters({ ...filters, limit: parseInt(value), page: 1 })}
                  >
                    <SelectTrigger className="w-16 sm:w-20 h-8 sm:h-10 text-xs sm:text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Order Details Dialog */}
        <OrderDetailsDialog
          order={selectedOrder}
          isOpen={isDetailsDialogOpen}
          onClose={() => {
            setIsDetailsDialogOpen(false);
            setSelectedOrder(null);
          }}
          onStatusUpdate={handleStatusUpdate}
        />
      </div>
    </Layout>
  );
}

