import { useMemo, useState, useEffect } from 'react';
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination-primitives';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useLiveSyncRefresh } from '@/hooks/useLiveSyncRefresh';

export default function ManageStock() {
  const { toast } = useToast();
  const [orders, setOrders] = useState<StockOrder[]>([]);
  const [, setTotalOrders] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [stats, setStats] = useState<OrderStats>({
    totalOrders: 0,
    totalValue: 0,
    pendingOrders: 0,
    approvedOrders: 0,
    shippedOrders: 0,
    receivedOrders: 0,
  });
  const [filters, setFilters] = useState<OrderFiltersType>({
    search: '',
    status: 'all',
    page: 1,
    limit: 50,
  });
  const [selectedOrder, setSelectedOrder] = useState<StockOrder | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);

  const [receiveDialogOpen, setReceiveDialogOpen] = useState(false);
  const [receiving, setReceiving] = useState(false);
  const [receiveOrder, setReceiveOrder] = useState<any | null>(null);
  const [receiveNotes, setReceiveNotes] = useState('');

  const receiveRows = useMemo(() => {
    const items = (receiveOrder?.items || []) as Array<any>;
    return items.map((it) => ({
      material_id: it.material_id,
      material_name: it.material_name,
      unit: it.unit,
      ordered_quantity: Number(it.quantity || 0),
    }));
  }, [receiveOrder]);

  const [receivedQtyByMaterialId, setReceivedQtyByMaterialId] = useState<Record<string, string>>({});

  // Load stats only on mount – cards show overall counts; filtering/sorting does not reload them
  useEffect(() => {
    loadStats();
  }, []);

  // Load orders when filters change (search, status, pagination)
  useEffect(() => {
    loadOrders();
  }, [filters]);


  const loadOrders = async () => {
    try {
      setLoading(true);
      // Fetch all orders without server-side status filter — status is mapped
      // from 'delivered' → 'received' in the service transform, so we filter client-side
      const { data, count } = await ManageStockService.getOrders({
        search: filters.search,
        limit: 1000,
        offset: 0,
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

  useLiveSyncRefresh({
    modules: ['manage_stock', 'materials', 'suppliers', 'orders'],
    onRefresh: () => {
      loadOrders();
      loadStats();
    },
    pollingMs: 6000,
  });

  const handleSearchChange = (value: string) => {
    setFilters({ ...filters, search: value, page: 1 });
  };

  const handleStatusChange = (values: string[]) => {
    setFilters({ ...filters, status: values.length > 0 ? values : 'all', page: 1 });
  };

  const handleStatusUpdate = async (orderId: string, newStatus: StockOrder['status']) => {
    if (newStatus === 'received') {
      const raw = await ManageStockService.getRawPurchaseOrder(orderId);
      if (!raw) {
        toast({
          title: 'Error',
          description: 'Failed to load order items for receiving',
          variant: 'destructive',
        });
        return;
      }
      setReceiveOrder(raw);
      setReceiveNotes('');
      const next: Record<string, string> = {};
      (raw.items || []).forEach((it: any) => {
        next[it.material_id] = String(it.quantity ?? 0);
      });
      setReceivedQtyByMaterialId(next);
      setReceiveDialogOpen(true);
      return;
    }
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

  const allFiltered = orders.filter((order) => {
    const matchesSearch =
      !filters.search ||
      order.materialName.toLowerCase().includes(filters.search.toLowerCase()) ||
      order.supplier.toLowerCase().includes(filters.search.toLowerCase());
    const matchesStatus =
      filters.status === 'all' ||
      (Array.isArray(filters.status)
        ? filters.status.length === 0 || filters.status.includes(order.status)
        : order.status === filters.status);
    return matchesSearch && matchesStatus;
  });

  const filteredTotal = allFiltered.length;
  const filteredOrders = allFiltered.slice(
    (filters.page - 1) * filters.limit,
    filters.page * filters.limit
  );

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
        {!loading && filteredTotal > 0 && (() => {
          const totalPages = Math.ceil(filteredTotal / filters.limit);
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
                  Showing {(filters.page - 1) * filters.limit + 1} to {Math.min(filters.page * filters.limit, filteredTotal)} of {filteredTotal} orders
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

        {/* Receive confirmation dialog */}
        {receiveDialogOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => {
              if (!receiving) setReceiveDialogOpen(false);
            }}
          >
            <div
              className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Confirm materials received</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Confirm the actual received quantity. Stock will be updated only after you confirm.
                </p>
              </div>

              <div className="p-6 space-y-4">
                <div className="space-y-3">
                  {receiveRows.map((row) => (
                    <div key={row.material_id} className="grid grid-cols-1 sm:grid-cols-5 gap-2 items-center border border-gray-200 rounded-lg p-3">
                      <div className="sm:col-span-2">
                        <div className="text-sm font-medium text-gray-900">{row.material_name}</div>
                        <div className="text-xs text-gray-500">Material ID: {row.material_id}</div>
                      </div>
                      <div className="text-sm text-gray-700 sm:text-center">
                        Ordered: <span className="font-semibold">{row.ordered_quantity}</span> {row.unit}
                      </div>
                      <div className="sm:col-span-2">
                        <label className="text-xs text-gray-600">Received</label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={receivedQtyByMaterialId[row.material_id] ?? ''}
                          onChange={(e) => {
                            const v = e.target.value;
                            setReceivedQtyByMaterialId((prev) => ({ ...prev, [row.material_id]: v }));
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div>
                  <label className="text-xs text-gray-600">Notes (optional)</label>
                  <Textarea value={receiveNotes} onChange={(e) => setReceiveNotes(e.target.value)} />
                </div>
              </div>

              <div className="p-6 border-t border-gray-200 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={receiving}
                  onClick={() => setReceiveDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  className="bg-primary-600 hover:bg-primary-700 text-white"
                  disabled={receiving}
                  onClick={async () => {
                    if (!receiveOrder?.id) return;
                    setReceiving(true);
                    try {
                      const items = receiveRows.map((row) => ({
                        material_id: row.material_id,
                        received_quantity: Number(receivedQtyByMaterialId[row.material_id] ?? 0),
                      }));

                      const invalid = items.some((it) => !Number.isFinite(it.received_quantity) || it.received_quantity < 0);
                      if (invalid) {
                        toast({
                          title: 'Validation Error',
                          description: 'Received quantity must be a number and cannot be negative.',
                          variant: 'destructive',
                        });
                        return;
                      }

                      const { success, error } = await ManageStockService.receiveOrder(receiveOrder.id, {
                        items,
                        notes: receiveNotes,
                      });
                      if (!success) {
                        toast({
                          title: 'Error',
                          description: error || 'Failed to receive order',
                          variant: 'destructive',
                        });
                        return;
                      }

                      toast({ title: 'Success', description: 'Order received and stock updated.' });
                      setReceiveDialogOpen(false);
                      setReceiveOrder(null);
                      await loadOrders();
                      await loadStats();
                    } finally {
                      setReceiving(false);
                    }
                  }}
                >
                  Confirm received
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

