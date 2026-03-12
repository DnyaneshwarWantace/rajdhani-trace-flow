import { useState, useEffect } from 'react';
import Layout from '@/components/layout/Layout';
import { useAuth } from '@/contexts/AuthContext';
import DashboardStatsCards from '@/components/dashboard/DashboardStatsCards';
import RecentOrders from '@/components/dashboard/RecentOrders';
import ProductionOverview from '@/components/dashboard/ProductionOverview';
import InventoryAlerts from '@/components/dashboard/InventoryAlerts';
import ManageStockOverview from '@/components/dashboard/ManageStockOverview';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from 'lucide-react';
import { ProductService } from '@/services/productService';
import { OrderService, type Order } from '@/services/orderService';
import { ProductionService } from '@/services/productionService';
import { SupplierService } from '@/services/supplierService';
import { MaterialService } from '@/services/materialService';
import { ManageStockService } from '@/services/manageStockService';
import type { Product } from '@/types/product';

/** Returns true if date (ISO string or Date) falls in the given month (YYYY-MM). */
function isDateInMonth(dateInput: string | Date | undefined, monthKey: string): boolean {
  if (!monthKey) return true;
  if (!dateInput) return false;
  const d = new Date(dateInput);
  if (Number.isNaN(d.getTime())) return false;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}` === monthKey;
}

/** Build month options: All time + last 12 months (newest first). */
function getMonthFilterOptions(): { value: string; label: string }[] {
  const options: { value: string; label: string }[] = [{ value: '', label: 'All time' }];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    options.push({ value: `${y}-${m}`, label: `${monthNames[d.getMonth()]} ${y}` });
  }
  return options;
}

interface DashboardData {
  stats: {
    totalProducts: number;
    totalOrders: number;
    pendingOrders: number;
    totalRevenue: number;
    outstandingAmount: number;
    activeProduction: number;
    totalCustomers: number;
    totalSuppliers: number;
    lowStockProducts: number;
    totalRecipes: number;
    totalWastage: number;
    totalMaterials: number;
    inStockMaterials: number;
    lowStockMaterials: number;
    outOfStockMaterials: number;
    manageStockPending: number;
    manageStockApproved: number;
    manageStockShipped: number;
    manageStockDelivered: number;
    manageStockTotalValue: number;
    ordersPending: number;
    ordersAccepted: number;
    ordersDispatched: number;
    ordersDelivered: number;
    productionPlanned: number;
    productionInProgress: number;
    productionCompleted: number;
    productionCancelled: number;
  };
  recentOrders: Order[];
  productionBatches: any[];
  lowStockProducts: Product[];
  manageStockOrders: any[];
  topCustomers: any[];
  topSuppliers: any[];
}

const MONTH_OPTIONS = getMonthFilterOptions();

export default function Dashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    stats: {
      totalProducts: 0,
      totalOrders: 0,
      pendingOrders: 0,
      totalRevenue: 0,
      outstandingAmount: 0,
      activeProduction: 0,
      totalCustomers: 0,
      totalSuppliers: 0,
      lowStockProducts: 0,
      totalRecipes: 0,
      totalWastage: 0,
      totalMaterials: 0,
      inStockMaterials: 0,
      lowStockMaterials: 0,
      outOfStockMaterials: 0,
      manageStockPending: 0,
      manageStockApproved: 0,
      manageStockShipped: 0,
      manageStockDelivered: 0,
      manageStockTotalValue: 0,
      ordersPending: 0,
      ordersAccepted: 0,
      ordersDispatched: 0,
      ordersDelivered: 0,
      productionPlanned: 0,
      productionInProgress: 0,
      productionCompleted: 0,
      productionCancelled: 0,
    },
    recentOrders: [],
    productionBatches: [],
    lowStockProducts: [],
    manageStockOrders: [],
    topCustomers: [],
    topSuppliers: [],
  });

  useEffect(() => {
    // Only use cache when showing "All time" (no month filter)
    let hydratedFromCache = false;
    if (!selectedMonth) {
      try {
        const cachedRaw = localStorage.getItem('dashboardCacheV1');
        if (cachedRaw) {
          const cached = JSON.parse(cachedRaw) as { data: DashboardData; timestamp: number };
          const maxAgeMs = 5 * 60 * 1000; // 5 minutes
          if (cached?.data && typeof cached.timestamp === 'number' && Date.now() - cached.timestamp < maxAgeMs) {
            setDashboardData(cached.data);
            setLoading(false);
            hydratedFromCache = true;
          }
        }
      } catch (e) {
        console.warn('Failed to read dashboard cache', e);
      }
    }

    loadDashboardData(hydratedFromCache, selectedMonth);
  }, [selectedMonth]);

  const loadDashboardData = async (skipLoading = false, monthKey = '') => {
    try {
      if (!skipLoading) {
        setLoading(true);
      }

      // Fetch only what dashboard needs (small limits = faster when empty or small data)
      const [
        productsResponse,
        ordersResponse,
        productStatsResponse,
        productionResponse,
        suppliersResponse,
        materialStatsResponse,
        manageStockStatsResponse,
        orderStatsResponse,
        manageStockOrdersResponse,
      ] = await Promise.all([
        ProductService.getProducts({ limit: 50 }),
        OrderService.getOrders({ limit: 50 }),
        ProductService.getProductStats(),
        ProductionService.getBatches({ limit: 50 }),
        SupplierService.getSuppliers(),
        MaterialService.getMaterialStats().catch(() => ({ totalMaterials: 0, inStock: 0, lowStock: 0, outOfStock: 0, overstock: 0, totalValue: 0, averageValue: 0 })),
        ManageStockService.getOrderStats().catch(() => ({ totalOrders: 0, totalValue: 0, pendingOrders: 0, approvedOrders: 0, shippedOrders: 0, deliveredOrders: 0 })),
        OrderService.getOrderStats().catch(() => ({ data: null, error: null })),
        ManageStockService.getOrders({ limit: 5 }).catch(() => ({ data: [] })),
      ]);

      // Process products data
      const products = productsResponse.products || [];
      const lowStockProducts = products.filter((p: any) => {
        const stock = p.current_stock || 0;
        const minStock = p.min_stock_level || 0;
        return stock <= minStock;
      });

      // Count products with recipes
      const productsWithRecipes = products.filter((p: any) => p.has_recipe).length;

      // Process orders data and apply month filter
      let orders = ordersResponse.data || [];
      if (monthKey) {
        orders = orders.filter((o: any) => isDateInMonth(o.orderDate, monthKey));
      }
      const pendingOrders = orders.filter((o: any) => o.status === 'pending');
      const totalRevenue = orders.reduce((sum: number, order: any) => sum + (order.totalAmount || 0), 0);
      const outstandingAmount = orders.reduce((sum: number, order: any) => sum + (order.outstandingAmount || 0), 0);

      // Calculate customer data
      const customerMap = new Map();
      orders.forEach((order: any) => {
        if (order.customerId) {
          const existing = customerMap.get(order.customerId) || {
            id: order.customerId,
            name: order.customerName || 'Unknown',
            email: order.customerEmail,
            phone: order.customerPhone,
            totalOrders: 0,
            totalRevenue: 0,
          };
          existing.totalOrders += 1;
          existing.totalRevenue += order.totalAmount || 0;
          customerMap.set(order.customerId, existing);
        }
      });
      const customers = Array.from(customerMap.values());

      // Get production batches, apply month filter, then count by status
      let productionBatches = productionResponse.data || [];
      if (monthKey) {
        productionBatches = productionBatches.filter((b: any) => {
          const batchDate = b.created_at ?? b.createdAt ?? b.planned_start_date ?? b.actual_start_date;
          return isDateInMonth(batchDate, monthKey);
        });
      }
      const productionPlanned = productionBatches.filter((b: any) => b.status === 'planned').length;
      const productionInProgress = productionBatches.filter((b: any) => b.status === 'in_progress' || b.status === 'in_production').length;
      const productionCompleted = productionBatches.filter((b: any) => b.status === 'completed').length;
      const productionCancelled = productionBatches.filter((b: any) => b.status === 'cancelled').length;
      const activeBatches = productionBatches.filter(
        (batch: any) => batch.status === 'in_progress' || batch.status === 'planned'
      );

      // Enrich batches with a safe fallback product_name without extra API calls
      const enrichedBatches = activeBatches.map((batch: any) => ({
        ...batch,
        product_name: batch.product_name || 'Product',
      }));

      // Get suppliers
      const suppliers = suppliersResponse.data || [];

      // Calculate supplier stats from manage stock orders
      const supplierStatsMap = new Map();
      suppliers.forEach((supplier: any) => {
        supplierStatsMap.set(supplier.id, {
          id: supplier.id,
          name: supplier.name,
          email: supplier.email,
          phone: supplier.phone,
          totalOrders: supplier.total_orders || 0,
          totalSpent: supplier.total_value || 0,
        });
      });

      // Get unique customers count
      const uniqueCustomers = new Set(orders.map((o: any) => o.customerId)).size;

      // Get wastage count from productStatsResponse
      const totalWastage = (productStatsResponse as any).total_wastage || 0;

      // Material stats from MaterialService
      const totalMaterials = materialStatsResponse?.totalMaterials ?? 0;
      const inStockMaterials = materialStatsResponse?.inStock ?? 0;
      const lowStockMaterials = materialStatsResponse?.lowStock ?? 0;
      const outOfStockMaterials = materialStatsResponse?.outOfStock ?? 0;

      const manageStockPending = manageStockStatsResponse?.pendingOrders ?? 0;
      const manageStockApproved = manageStockStatsResponse?.approvedOrders ?? 0;
      const manageStockShipped = manageStockStatsResponse?.shippedOrders ?? 0;
      const manageStockDelivered = (manageStockStatsResponse as any)?.receivedOrders ?? 0;
      const manageStockTotalValue = manageStockStatsResponse?.totalValue ?? 0;

      const orderStatsData = orderStatsResponse?.data;
      const ordersPending = orderStatsData?.pending ?? orders.filter((o: any) => o.status === 'pending').length;
      const ordersAccepted = orderStatsData?.accepted ?? orders.filter((o: any) => o.status === 'accepted').length;
      const ordersDispatched = orderStatsData?.dispatched ?? orders.filter((o: any) => o.status === 'dispatched').length;
      const ordersDelivered = orderStatsData?.delivered ?? orders.filter((o: any) => o.status === 'delivered').length;

      const nextData: DashboardData = {
        stats: {
          totalProducts: productStatsResponse.total_products || products.length,
          totalOrders: orders.length,
          pendingOrders: pendingOrders.length,
          totalRevenue,
          outstandingAmount,
          activeProduction: activeBatches.length,
          totalCustomers: uniqueCustomers,
          totalSuppliers: suppliers.length,
          lowStockProducts: lowStockProducts.length,
          totalRecipes: productsWithRecipes,
          totalWastage,
          totalMaterials,
          inStockMaterials,
          lowStockMaterials,
          outOfStockMaterials,
          manageStockPending,
          manageStockApproved,
          manageStockShipped,
          manageStockDelivered,
          manageStockTotalValue,
          ordersPending,
          ordersAccepted,
          ordersDispatched,
          ordersDelivered,
          productionPlanned,
          productionInProgress,
          productionCompleted,
          productionCancelled,
        },
        recentOrders: orders
          .slice(0, 10)
          .sort((a: any, b: any) => new Date(b.orderDate || 0).getTime() - new Date(a.orderDate || 0).getTime()),
        productionBatches: enrichedBatches.slice(0, 10),
        lowStockProducts: lowStockProducts.slice(0, 10),
        manageStockOrders: manageStockOrdersResponse?.data ?? [],
        topCustomers: customers,
        topSuppliers: Array.from(supplierStatsMap.values()),
      };

      setDashboardData(nextData);

      // Cache dashboard data only for "All time" so next visit loads fast
      if (!monthKey) {
        try {
          localStorage.setItem(
            'dashboardCacheV1',
            JSON.stringify({
              data: nextData,
              timestamp: Date.now(),
            })
          );
        } catch (e) {
          console.warn('Failed to write dashboard cache', e);
        }
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Welcome Section + Month filter */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              Welcome back, {user?.full_name || user?.email || 'User'}!
            </h1>
            <p className="text-gray-600 mt-1">
              Here's what's happening with your business today.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-500 shrink-0" />
            <Select
              value={selectedMonth || '__all__'}
              onValueChange={(value) => setSelectedMonth(value === '__all__' ? '' : value)}
            >
              <SelectTrigger className="w-[180px] bg-white">
                <SelectValue placeholder="All time" />
              </SelectTrigger>
              <SelectContent>
                {MONTH_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value || 'all'} value={opt.value || '__all__'}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Stats Cards */}
        <DashboardStatsCards stats={dashboardData.stats} loading={loading} />

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Orders */}
          <RecentOrders orders={dashboardData.recentOrders} loading={loading} />

          {/* Production Overview */}
          <ProductionOverview batches={dashboardData.productionBatches} loading={loading} />
        </div>

        {/* Inventory & Manage Stock - half half */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
          <div className="min-h-0 flex flex-col">
            <InventoryAlerts products={dashboardData.lowStockProducts} loading={loading} />
          </div>
          <div className="min-h-0 flex flex-col">
            <ManageStockOverview orders={dashboardData.manageStockOrders} loading={loading} />
          </div>
        </div>
      </div>
    </Layout>
  );
}
