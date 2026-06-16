import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { 
  Calendar, RefreshCw, Bell, ShoppingCart, Cpu, Package, Users, Truck, AlertTriangle, 
  ChevronRight, PlusCircle, Clipboard, CheckCircle, Info, TrendingUp, TrendingDown, ArrowUpRight, Clock
} from 'lucide-react';
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
    overstockMaterials: number;
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
    productionTotal: number;
  };
  recentOrders: Order[];
  productionBatches: any[];
  lowStockProducts: Product[];
  manageStockOrders: any[];
  topCustomers: any[];
  topSuppliers: any[];
  materials: any[];
}

const MONTH_OPTIONS = getMonthFilterOptions();

// Helper to get status colors and labels
function statusMeta(status: string): [string, string, string] {
  switch (String(status).toLowerCase()) {
    case 'pending':
    case 'planned':
      return ['#EA580C', '#FFF4ED', 'Pending'];
    case 'accepted':
    case 'in_progress':
    case 'in-progress':
    case 'in_production':
      return ['#2563EB', '#EFF6FF', 'Active'];
    case 'dispatched':
    case 'shipped':
      return ['#7C3AED', '#F5F3FF', 'Dispatched'];
    case 'delivered':
    case 'completed':
    case 'in-stock':
      return ['#16A34A', '#ECFDF3', 'Completed'];
    case 'cancelled':
    case 'out-of-stock':
      return ['#DC2626', '#FEF2F2', 'Alert'];
    case 'low-stock':
      return ['#EA580C', '#FFF4ED', 'Low Stock'];
    case 'overstock':
      return ['#2563EB', '#EFF6FF', 'Overstock'];
    default:
      return ['#4B5563', '#F3F4F6', status || ''];
  }
}

// Stacked Bar component
function StackedBar({ segments, total, height = 8 }: { segments: { value: number; color: string }[]; total: number; height?: number }) {
  if (!total) return <div className="bg-gray-200 rounded-full" style={{ height }} />;
  return (
    <div className="flex rounded-full overflow-hidden bg-gray-200 w-full" style={{ height }}>
      {segments.filter(s => s.value > 0).map((s, i) => (
        <div key={i} style={{ width: `${Math.min(100, (s.value / total) * 100)}%`, backgroundColor: s.color }} />
      ))}
    </div>
  );
}

// SVG Sparkline component
function Sparkline({ values, color, width = 80, height = 32 }: { values: number[]; color: string; width?: number; height?: number }) {
  if (!values.length) return null;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const points = values.map((v, i) => {
    const x = (i / Math.max(values.length - 1, 1)) * width;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
      {values.length > 0 && (
        <circle
          cx={(values.length - 1) / Math.max(values.length - 1, 1) * width}
          cy={height - ((values[values.length - 1] - min) / range) * (height - 4) - 2}
          r="3.5"
          fill={color}
          stroke="#FFFFFF"
          strokeWidth="1.5"
        />
      )}
    </svg>
  );
}

// SVG RingProgress component
function RingProgress({ value, max, size = 56, color, strokeWidth = 5 }: {
  value: number; max: number; size?: number; color: string; strokeWidth?: number;
}) {
  const pct = max > 0 ? Math.min(value / max, 1) : 0;
  const r = size / 2 - strokeWidth;
  const c = 2 * Math.PI * r;
  const strokeDashoffset = c * (1 - pct);
  return (
    <div className="relative flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="rgba(226, 232, 240, 0.3)"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={c}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-500 ease-out"
        />
      </svg>
      <div className="absolute text-[11px] font-extrabold" style={{ color }}>
        {Math.round(pct * 100)}%
      </div>
    </div>
  );
}

// SVG HeroRingProgress component
function HeroRingProgress({ value, max, size = 60, strokeWidth = 5 }: {
  value: number; max: number; size?: number; strokeWidth?: number;
}) {
  const pct = max > 0 ? Math.min(value / max, 1) : 0;
  const r = size / 2 - strokeWidth;
  const c = 2 * Math.PI * r;
  const strokeDashoffset = c * (1 - pct);
  return (
    <div className="relative flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="rgba(255, 255, 255, 0.25)"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="#FFFFFF"
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={c}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-500 ease-out"
        />
      </svg>
      <div className="absolute text-xs font-extrabold text-white">
        {Math.round(pct * 100)}%
      </div>
    </div>
  );
}

// StatTile helper component
function StatTile({ label, value, sub, color, bg, icon: Icon }: {
  label: string; value: string; sub?: string; color: string; bg: string; icon: any;
}) {
  return (
    <div className="bg-white border border-gray-150 rounded-2xl p-3.5 shadow-[0_2px_12px_rgba(0,0,0,0.01)] flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center border border-gray-100 shrink-0" style={{ backgroundColor: bg, color }}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide leading-none mb-1">{label}</p>
        <p className="text-xl font-extrabold text-gray-900 tracking-tight leading-none">{value}</p>
        {sub && <p className="text-[10.5px] font-bold mt-0.5" style={{ color }}>{sub}</p>}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
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
      overstockMaterials: 0,
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
      productionTotal: 0,
    },
    recentOrders: [],
    productionBatches: [],
    lowStockProducts: [],
    manageStockOrders: [],
    topCustomers: [],
    topSuppliers: [],
    materials: [],
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
        materialsResponse,
        productionStatsResponse,
      ] = await Promise.all([
        ProductService.getProducts({ limit: 50 }),
        OrderService.getOrders({ limit: 50 }),
        ProductService.getProductStats(),
        ProductionService.getBatches({ limit: 50 }),
        SupplierService.getSuppliers(),
        MaterialService.getMaterialStats().catch(() => ({ totalMaterials: 0, inStock: 0, lowStock: 0, outOfStock: 0, overstock: 0, totalValue: 0, averageValue: 0 })),
        ManageStockService.getOrderStats().catch(() => ({ totalOrders: 0, totalValue: 0, pendingOrders: 0, approvedOrders: 0, shippedOrders: 0, deliveredOrders: 0 })),
        OrderService.getOrderStats().catch(() => ({ data: null, error: null })),
        ManageStockService.getRecentRestockOrders(5).catch(() => ({ data: [] })),
        MaterialService.getMaterials({ limit: 100 }).catch(() => ({ materials: [], total: 0 })),
        ProductionService.getProductionStats().catch(() => ({ data: null, error: null })),
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

      // Process orders data and apply month filter — exclude cancelled from all counts
      let orders = ordersResponse.data || [];
      if (monthKey) {
        orders = orders.filter((o: any) => isDateInMonth(o.orderDate, monthKey));
      }
      const activeOrders = orders.filter((o: any) => o.status !== 'cancelled');
      const pendingOrders = orders.filter((o: any) => o.status === 'pending');
      const totalRevenue = activeOrders.reduce((sum: number, order: any) => sum + (order.totalAmount || 0), 0);
      const outstandingAmount = activeOrders.reduce((sum: number, order: any) => sum + (order.outstandingAmount || 0), 0);

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
      // Use server-side stats for accurate totals (not limited by the limit:50 fetch)
      const prodStats = productionStatsResponse?.data ?? null;
      const productionPlanned = monthKey ? productionBatches.filter((b: any) => b.status === 'planned').length : (prodStats?.planned_batches ?? productionBatches.filter((b: any) => b.status === 'planned').length);
      const productionInProgress = monthKey ? productionBatches.filter((b: any) => b.status === 'in_progress' || b.status === 'in_production').length : (prodStats?.in_progress_batches ?? productionBatches.filter((b: any) => b.status === 'in_progress' || b.status === 'in_production').length);
      const productionCompleted = monthKey ? productionBatches.filter((b: any) => b.status === 'completed').length : (prodStats?.completed_batches ?? productionBatches.filter((b: any) => b.status === 'completed').length);
      const productionTotal = monthKey ? productionBatches.length : (prodStats?.total_batches ?? productionBatches.length);
      const productionCancelled = Math.max(0, productionTotal - productionPlanned - productionInProgress - productionCompleted);
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
      const overstockMaterials = materialStatsResponse?.overstock ?? 0;

      const manageStockPending = manageStockStatsResponse?.pendingOrders ?? 0;
      const manageStockApproved = manageStockStatsResponse?.approvedOrders ?? 0;
      const manageStockShipped = manageStockStatsResponse?.shippedOrders ?? 0;
      const manageStockDelivered = (manageStockStatsResponse as any)?.receivedOrders ?? 0;
      const manageStockTotalValue = manageStockStatsResponse?.totalValue ?? 0;

      const orderStatsData = orderStatsResponse?.data;
      const ordersPending = orderStatsData?.pending ?? activeOrders.filter((o: any) => o.status === 'pending').length;
      const ordersAccepted = orderStatsData?.accepted ?? activeOrders.filter((o: any) => o.status === 'accepted').length;
      const ordersDispatched = orderStatsData?.dispatched ?? activeOrders.filter((o: any) => o.status === 'dispatched').length;
      const ordersDelivered = orderStatsData?.delivered ?? activeOrders.filter((o: any) => o.status === 'delivered').length;

      const materials = materialsResponse?.materials || [];

      const nextData: DashboardData = {
        stats: {
          totalProducts: productStatsResponse.total_products || products.length,
          totalOrders: orderStatsData?.total ?? activeOrders.length,
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
          overstockMaterials,
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
          productionTotal,
        },
        recentOrders: orders
          .slice(0, 10)
          .sort((a: any, b: any) => new Date(b.orderDate || 0).getTime() - new Date(a.orderDate || 0).getTime()),
        productionBatches: enrichedBatches.slice(0, 10),
        lowStockProducts: lowStockProducts.slice(0, 10),
        manageStockOrders: manageStockOrdersResponse?.data ?? [],
        topCustomers: customers,
        topSuppliers: Array.from(supplierStatsMap.values()),
        materials,
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

  const firstName = (user?.full_name || user?.email || 'there').split(' ')[0];
  const orders = dashboardData.recentOrders || [];
  const batches = dashboardData.productionBatches || [];
  const materials = dashboardData.materials || [];

  const activeBatches = batches.filter((b: any) =>
    b.status === 'in_progress' || b.status === 'in-progress' ||
    b.status === 'in_production' || b.status === 'planned'
  );
  const completedBatches = batches.filter((b: any) => b.status === 'completed');
  const alertMaterials = materials.filter((m: any) => m.status === 'low-stock' || m.status === 'out-of-stock' || m.status === 'low_stock' || m.status === 'out_of_stock');

  const pendingOrdersCount = dashboardData.stats.pendingOrders;
  const inStockProducts = (dashboardData.stats.totalProducts - dashboardData.stats.lowStockProducts) || 0;
  const activeCount = activeBatches.length;

  const monthsData = useMemo(() => {
    const now = new Date();
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      return {
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        label: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getMonth()],
        planned: 0,
        active: 0,
        completed: 0,
      };
    });

    batches.forEach(b => {
      const raw = b.start_date || b.created_at;
      if (!raw) return;
      const d = new Date(raw);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const m = months.find(m => m.key === key);
      if (!m) return;
      if (b.status === 'completed') m.completed++;
      else if (b.status === 'in_progress' || b.status === 'in-progress' || b.status === 'in_production' || b.status === 'planned') m.active++;
      else m.planned++;
    });
    return months;
  }, [batches]);

  const maxVal = Math.max(...monthsData.map(m => m.planned + m.active + m.completed), 1);
  const totalBatches = dashboardData.stats.productionTotal || batches.length;
  const completedCount = dashboardData.stats.productionCompleted;
  const activeCountVal = dashboardData.stats.productionInProgress;
  const sparkValues = monthsData.map(m => m.planned + m.active + m.completed);

  const orderBreakdownSegments = [
    { value: dashboardData.stats.ordersPending,   color: '#EA580C',  label: 'Pending' },
    { value: dashboardData.stats.ordersAccepted,  color: '#2563EB',    label: 'Accepted' },
    { value: dashboardData.stats.ordersDispatched,color: '#7C3AED',  label: 'Dispatched' },
    { value: dashboardData.stats.ordersDelivered, color: '#16A34A',   label: 'Delivered' },
  ];
  const orderBreakdownTotal = orderBreakdownSegments.reduce((sum, s) => sum + s.value, 0) || 1;

  const prodOverviewBars = [
    { label: 'Planned', value: dashboardData.stats.productionPlanned,   color: '#EA580C' },
    { label: 'Active',  value: dashboardData.stats.productionInProgress,     color: '#2563EB' },
    { label: 'Done',    value: dashboardData.stats.productionCompleted,  color: '#16A34A' },
    { label: 'Cancelled', value: dashboardData.stats.productionCancelled,  color: '#DC2626' },
  ];
  const prodOverviewMaxVal = Math.max(...prodOverviewBars.map(b => b.value), 1);

  const materialsHealthSegments = [
    { value: dashboardData.stats.inStockMaterials,  color: '#16A34A',  label: 'In Stock' },
    { value: dashboardData.stats.lowStockMaterials,       color: '#EA580C', label: 'Low Stock' },
    { value: dashboardData.stats.outOfStockMaterials,    color: '#DC2626',    label: 'Out of Stock' },
    { value: dashboardData.stats.overstockMaterials, color: '#2563EB',   label: 'Overstock' },
  ];
  const materialsHealthTotal = dashboardData.stats.totalMaterials || 1;

  return (
    <Layout>
      {/* Desktop View */}
      <div className="hidden lg:block space-y-6">
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

        {/* 2×2 dashboard grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RecentOrders orders={dashboardData.recentOrders} loading={loading} />
          <ProductionOverview batches={dashboardData.productionBatches} loading={loading} />
          <InventoryAlerts products={dashboardData.lowStockProducts} loading={loading} />
          <ManageStockOverview orders={dashboardData.manageStockOrders} loading={loading} />
        </div>
      </div>

      {/* Mobile View */}
      <div className="lg:hidden flex flex-col space-y-5 pb-12 bg-gray-50/50 -mx-4 px-4 pt-1">
        {/* Header Section */}
        <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-150 -mx-4 mb-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0066FF] flex items-center justify-center text-white font-extrabold text-lg select-none" style={{ fontFamily: 'Georgia, serif' }}>
              R
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 leading-tight">Hi, {firstName} 👋</h2>
              <p className="text-[11.5px] text-gray-500 font-medium">Rajdhani Production Dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
          </div>
        </div>

        {/* Month Filter */}
        <div className="flex items-center justify-between bg-white border border-gray-150 rounded-2xl p-3.5 shadow-[0_2px_8px_rgba(0,0,0,0.01)]">
          <div className="flex items-center gap-2 text-gray-500 font-semibold text-xs uppercase tracking-wider">
            <Calendar className="w-3.5 h-3.5 text-gray-400" />
            <span>Filter Period</span>
          </div>
          <Select
            value={selectedMonth || '__all__'}
            onValueChange={(value) => setSelectedMonth(value === '__all__' ? '' : value)}
          >
            <SelectTrigger className="w-[140px] h-8 text-xs bg-gray-50 border-gray-200 rounded-xl font-bold">
              <SelectValue placeholder="All time" />
            </SelectTrigger>
            <SelectContent>
              {MONTH_OPTIONS.map((opt) => (
                <SelectItem key={opt.value || 'all'} value={opt.value || '__all__'} className="text-xs">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Status Hero Banner */}
        <div className="relative overflow-hidden bg-gradient-to-br from-[#0066FF] to-[#004AD6] rounded-3xl p-5 shadow-[0_8px_30px_rgb(0,102,255,0.15)]">
          <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/10 blur-[2px] pointer-events-none" />
          <div className="absolute -left-6 -bottom-6 w-24 h-24 rounded-full bg-white/5 blur-[1px] pointer-events-none" />
          <div className="absolute right-14 -top-3 w-16 h-16 rounded-full bg-white/5 blur-[1px] pointer-events-none" />
          
          <div className="flex items-center justify-between mb-4 relative z-10">
            <div>
              <span className="text-[11px] text-white/70 font-semibold tracking-wider uppercase mb-1 block">Business At a Glance</span>
              <h3 className="text-2xl font-black text-white leading-tight">
                {activeCountVal} Active<br />Batch{activeCountVal !== 1 ? 'es' : ''}
              </h3>
            </div>
            <HeroRingProgress value={completedCount} max={totalBatches} />
          </div>
          
          <div className="h-px bg-white/15 my-4 relative z-10" />
          
          <div className="grid grid-cols-4 relative z-10 text-center">
            {[
              { label: 'Orders', value: String(dashboardData.stats.totalOrders), icon: ShoppingCart },
              { label: 'Pending', value: String(pendingOrdersCount), icon: Clock },
              { label: 'Delivered', value: String(dashboardData.stats.ordersDelivered), icon: CheckCircle },
              { label: 'Low Stock', value: String(alertMaterials.length), icon: AlertTriangle },
            ].map((item, i) => (
              <div key={i} className={`flex flex-col items-center justify-center ${i > 0 ? 'border-l border-white/15' : ''}`}>
                <item.icon className="w-3.5 h-3.5 text-white/70 mb-1" />
                <span className="text-base font-extrabold text-white leading-none">{item.value}</span>
                <span className="text-[9.5px] text-white/70 font-bold mt-1.5 uppercase tracking-wide leading-none">{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 gap-3 mt-1.5">
          <StatTile
            label="Total Orders"
            value={String(dashboardData.stats.totalOrders)}
            sub={`${pendingOrdersCount} pending`}
            color="#9333EA" bg="#F6F0FF" icon={ShoppingCart}
          />
          <StatTile
            label="Production"
            value={String(totalBatches)}
            sub={`${activeCountVal} active`}
            color="#EA580C" bg="#FFF4ED" icon={Cpu}
          />
          <StatTile
            label="Materials"
            value={String(materials.length)}
            sub={alertMaterials.length > 0 ? `${alertMaterials.length} restock` : 'All healthy'}
            color={alertMaterials.length > 0 ? '#DC2626' : '#EA580C'}
            bg={alertMaterials.length > 0 ? '#FEF2F2' : '#FFF4ED'}
            icon={Package}
          />
          <StatTile
            label="Products"
            value={String(dashboardData.stats.totalProducts)}
            sub={`${inStockProducts} in stock`}
            color="#16A34A" bg="#ECFDF3" icon={Package}
          />
          <StatTile
            label="Suppliers"
            value={String(dashboardData.stats.totalSuppliers)}
            color="#D97706" bg="#FFFBEB" icon={Truck}
          />
          <StatTile
            label="Customers"
            value={String(dashboardData.stats.totalCustomers)}
            color="#16A34A" bg="#ECFDF3" icon={Users}
          />
        </div>

        {/* Quick Actions */}
        <div className="mt-4">
          <h4 className="text-[10px] font-extrabold text-gray-400 mb-2.5 uppercase tracking-widest">Quick Actions</h4>
          <div className="grid grid-cols-4 gap-2">
            <button
              onClick={() => navigate('/orders/new')}
              className="flex flex-col items-center gap-1.5 p-3 bg-white border border-gray-150 rounded-2xl active:bg-gray-50 transition-colors shadow-[0_2px_8px_rgba(0,0,0,0.01)]"
            >
              <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center text-[#0066FF] shrink-0">
                <PlusCircle className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-extrabold text-gray-800 text-center leading-tight">New Order</span>
            </button>
            <button
              onClick={() => navigate('/production')}
              className="flex flex-col items-center gap-1.5 p-3 bg-white border border-gray-150 rounded-2xl active:bg-gray-50 transition-colors shadow-[0_2px_8px_rgba(0,0,0,0.01)]"
            >
              <div className="w-11 h-11 rounded-xl bg-orange-50 flex items-center justify-center text-[#EA580C] shrink-0">
                <Cpu className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-extrabold text-gray-800 text-center leading-tight">Production</span>
            </button>
            <button
              onClick={() => navigate('/customers')}
              className="flex flex-col items-center gap-1.5 p-3 bg-white border border-gray-150 rounded-2xl active:bg-gray-50 transition-colors shadow-[0_2px_8px_rgba(0,0,0,0.01)]"
            >
              <div className="w-11 h-11 rounded-xl bg-green-50 flex items-center justify-center text-[#16A34A] shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-extrabold text-gray-800 text-center leading-tight">Customers</span>
            </button>
            <button
              onClick={() => navigate('/materials')}
              className="flex flex-col items-center gap-1.5 p-3 bg-white border border-gray-150 rounded-2xl active:bg-gray-50 transition-colors shadow-[0_2px_8px_rgba(0,0,0,0.01)]"
            >
              <div className="w-11 h-11 rounded-xl bg-amber-50 flex items-center justify-center text-[#D97706] shrink-0">
                <Package className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-extrabold text-gray-800 text-center leading-tight">Materials</span>
            </button>
          </div>
        </div>

        {/* 6-Month Production Activity Widget */}
        <div className="bg-white border border-gray-150 rounded-3xl p-4 shadow-[0_2px_12px_rgba(0,0,0,0.01)]">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-[10px] text-gray-400 font-extrabold uppercase tracking-widest mb-1">6-Month Production</p>
              <h4 className="text-xl font-extrabold text-gray-900 tracking-tight leading-none">{totalBatches} Batches</h4>
            </div>
          </div>
          
          <div className="flex items-end gap-2.5 h-24 pt-4">
            {monthsData.map((m, i) => {
              const total = m.planned + m.active + m.completed;
              const pct = total / maxVal;
              const barH = Math.max(pct * 66, total > 0 ? 6 : 2);
              const isLast = i === monthsData.length - 1;
              return (
                <div key={m.key} className="flex-1 flex flex-col items-center gap-1.5">
                  {total > 0 && (
                    <span className={`text-[8.5px] font-black leading-none ${isLast ? 'text-[#EA580C]' : 'text-gray-500'}`}>
                      {total}
                    </span>
                  )}
                  <div className="w-full rounded-md overflow-hidden bg-gray-100 flex flex-col-reverse" style={{ height: barH }}>
                    {[
                      { value: m.completed, color: '#16A34A' },
                      { value: m.active, color: '#EA580C' },
                      { value: m.planned, color: '#2563EB88' },
                    ].map((seg, si) => {
                      const segPct = total > 0 ? (seg.value / total) * 100 : 0;
                      return segPct > 0 ? (
                        <div key={si} style={{ height: `${segPct}%`, backgroundColor: seg.color }} className={isLast ? '' : 'opacity-75'} />
                      ) : null;
                    })}
                  </div>
                  <span className={`text-[9.5px] leading-none ${isLast ? 'text-[#EA580C] font-black' : 'text-gray-400 font-bold'}`}>
                    {m.label}
                  </span>
                </div>
              );
            })}
          </div>
          
          {/* Legend */}
          <div className="flex gap-4 mt-4 pt-3.5 border-t border-gray-100">
            {[
              { label: 'Completed', color: '#16A34A', count: completedCount },
              { label: 'Active', color: '#EA580C', count: activeCountVal },
              { label: 'Total', color: '#0066FF', count: totalBatches },
            ].map((leg, i) => (
              <div key={i} className="flex-1 flex flex-col items-center text-center">
                <span className="text-base font-extrabold leading-none" style={{ color: leg.color }}>{leg.count}</span>
                <span className="text-[10px] text-gray-400 font-semibold mt-1 uppercase tracking-wide">{leg.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Order Status Breakdown Card */}
        <div className="bg-white border border-gray-150 rounded-3xl p-4 shadow-[0_2px_12px_rgba(0,0,0,0.01)]">
          <div className="flex items-center gap-2.5 mb-3.5">
            <div className="w-7 h-7 rounded-lg bg-[#9333EA]/10 flex items-center justify-center text-[#9333EA]">
              <ShoppingCart className="w-3.5 h-3.5" />
            </div>
            <h4 className="text-sm font-extrabold text-gray-900 flex-1">Order Status Breakdown</h4>
          </div>
          
          <StackedBar segments={orderBreakdownSegments} total={orderBreakdownTotal} height={12} />
          
          <div className="flex flex-wrap gap-2 mt-4">
            {orderBreakdownSegments.map((s, i) => (
              <div key={i} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.01)]" style={{ backgroundColor: s.color + '0E' }}>
                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                <span className="text-[10.5px] text-gray-500 font-bold">{s.label}</span>
                <span className="text-[10.5px] font-black" style={{ color: s.color }}>{s.value}</span>
              </div>
            ))}
          </div>
          
          <div className="grid grid-cols-4 mt-4 pt-3.5 border-t border-gray-100 text-center">
            {[
              { label: 'Pending', count: dashboardData.stats.ordersPending, color: '#EA580C' },
              { label: 'Accepted', count: dashboardData.stats.ordersAccepted, color: '#2563EB' },
              { label: 'Dispatched', count: dashboardData.stats.ordersDispatched, color: '#7C3AED' },
              { label: 'Delivered', count: dashboardData.stats.ordersDelivered, color: '#16A34A' },
            ].map((item, i) => (
              <div key={i} className="flex flex-col items-center">
                <span className="text-base font-extrabold leading-none" style={{ color: item.color }}>{item.count}</span>
                <span className="text-[9.5px] text-gray-400 font-semibold mt-1 uppercase tracking-wide leading-none">{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Production Overview */}
        <div className="bg-white border border-gray-150 rounded-3xl p-4 shadow-[0_2px_12px_rgba(0,0,0,0.01)]">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-[10px] text-gray-400 font-extrabold uppercase tracking-widest mb-1">Production Overview</p>
              <h4 className="text-xl font-extrabold text-gray-900 tracking-tight leading-none">{totalBatches} Batches</h4>
            </div>
          </div>

          <div className="flex items-end gap-2.5 h-24 pt-4">
            {prodOverviewBars.map((b, i) => {
              const pct = b.value / prodOverviewMaxVal;
              const barH = Math.max(pct * 66, b.value > 0 ? 6 : 2);
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                  {b.value > 0 && (
                    <span className="text-[8.5px] font-black leading-none" style={{ color: b.color }}>{b.value}</span>
                  )}
                  <div className="w-full rounded-md" style={{ height: barH, backgroundColor: b.color, opacity: 0.85 }} />
                  <span className="text-[9.5px] text-gray-400 font-bold leading-none text-center">{b.label}</span>
                </div>
              );
            })}
          </div>

          {/* Legend — matches 6-Month chart footer */}
          <div className="flex gap-4 mt-4 pt-3.5 border-t border-gray-100">
            {[
              { label: 'Planned',   color: '#EA580C', count: dashboardData.stats.productionPlanned },
              { label: 'Active',    color: '#2563EB', count: dashboardData.stats.productionInProgress },
              { label: 'Completed', color: '#16A34A', count: dashboardData.stats.productionCompleted },
            ].map((leg, i) => (
              <div key={i} className="flex-1 flex flex-col items-center text-center">
                <span className="text-base font-extrabold leading-none" style={{ color: leg.color }}>{leg.count}</span>
                <span className="text-[10px] text-gray-400 font-semibold mt-1 uppercase tracking-wide">{leg.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Inventory Health */}
        <div className="bg-white border border-gray-150 rounded-3xl p-4 shadow-[0_2px_12px_rgba(0,0,0,0.01)]">
          <div className="flex items-center gap-2.5 mb-3.5">
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-600">
              <Package className="w-3.5 h-3.5" />
            </div>
            <h4 className="text-sm font-extrabold text-gray-900 flex-1">Inventory Health</h4>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-center gap-1.5 shrink-0">
              <RingProgress value={dashboardData.stats.inStockMaterials} max={materialsHealthTotal} size={70} color="#16A34A" strokeWidth={7} />
              <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Healthy</span>
            </div>
            <div className="flex-1 flex flex-col gap-3">
              {materialsHealthSegments.map((s, i) => {
                const pct = materialsHealthTotal > 0 ? (s.value / materialsHealthTotal) * 100 : 0;
                return (
                  <div key={i} className="flex flex-col gap-1.5">
                    <div className="flex justify-between items-center text-[11px] leading-none">
                      <span className="text-gray-500 font-bold">{s.label}</span>
                      <span className="font-black" style={{ color: s.color }}>{s.value}</span>
                    </div>
                    <div className="h-1 rounded-full bg-gray-100 overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: s.color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Recent Orders List */}
        <div>
          <div className="flex items-center justify-between mb-3.5">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-[#9333EA]/10 flex items-center justify-center text-[#9333EA]">
                <ShoppingCart className="w-3.5 h-3.5" />
              </div>
              <h4 className="text-sm font-extrabold text-gray-900">Recent Orders</h4>
            </div>
            <button onClick={() => navigate('/orders')} className="flex items-center gap-1 text-[11.5px] font-bold text-[#0066FF] active:opacity-75">
              View all
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          
          <div className="bg-white border border-gray-150 rounded-3xl overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.01)]">
            {loading ? (
              <div className="p-8 flex items-center justify-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#9333EA]"></div>
              </div>
            ) : orders.length === 0 ? (
              <div className="p-8 flex flex-col items-center gap-2.5 text-center">
                <div className="w-12 h-12 rounded-full bg-[#9333EA]/10 flex items-center justify-center text-[#9333EA]">
                  <ShoppingCart className="w-5.5 h-5.5" />
                </div>
                <span className="text-xs font-bold text-gray-500">No orders yet</span>
              </div>
            ) : (
              orders.slice(0, 6).map((o: any, i: number, arr: any[]) => {
                const [color, bg, label] = statusMeta(o.status);
                return (
                  <div
                    key={o.id || i}
                    onClick={() => navigate(`/orders/${o.id}`)}
                    className={`flex items-center gap-3 py-3.5 px-4 active:bg-gray-50 transition-colors cursor-pointer ${
                      i < arr.length - 1 ? 'border-b border-gray-100' : ''
                    }`}
                  >
                    <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-[#0066FF] shrink-0">
                      <ShoppingCart className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h5 className="text-[12.5px] font-extrabold text-gray-900 truncate leading-none mb-1">{o.orderNumber || o.order_number || '—'}</h5>
                      <p className="text-[11px] text-gray-400 font-bold truncate leading-none">{o.customerName || o.customer_name || '—'}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0 text-right">
                      <span className="text-[10.5px] text-gray-500 font-bold leading-none">
                        {o.totalQuantity ?? o.total_quantity ? `${o.totalQuantity ?? o.total_quantity} units` : o.itemCount ?? o.item_count ? `${o.itemCount ?? o.item_count} items` : '—'}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider" style={{ color, backgroundColor: bg }}>
                        {label}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Active Production List */}
        {activeBatches.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-[#EA580C]/10 flex items-center justify-center text-[#EA580C]">
                  <Cpu className="w-3.5 h-3.5" />
                </div>
                <h4 className="text-sm font-extrabold text-gray-900">Active Production</h4>
              </div>
              <button onClick={() => navigate('/production')} className="flex items-center gap-1 text-[11.5px] font-bold text-[#0066FF] active:opacity-75">
                View all
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            
            <div className="bg-white border border-gray-150 rounded-3xl overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.01)]">
              {loading ? (
                <div className="p-8 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#EA580C]"></div>
                </div>
              ) : (
                activeBatches.slice(0, 5).map((b: any, i: number, arr: any[]) => {
                  const [color, bg, label] = statusMeta(b.status);
                  const pct = b.planned_quantity > 0 ? Math.min((b.actual_quantity || 0) / b.planned_quantity, 1) : 0;
                  
                  const stageLabel = b.wastage_stage?.status === 'in_progress' ? 'Wastage'
                    : b.individual_stage?.status === 'in_progress' ? 'Individual'
                    : b.machine_stage?.status === 'in_progress' || b.machine_stage?.status === 'completed' ? 'Machine'
                    : b.planning_stage?.status === 'completed' ? 'Machine'
                    : 'Planning';
                    
                  return (
                    <div
                      key={b.id || i}
                      onClick={() => navigate(`/production/${b.id}`)}
                      className={`py-3.5 px-4 active:bg-gray-50 transition-colors cursor-pointer ${
                        i < arr.length - 1 ? 'border-b border-gray-100' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3.5 mb-2.5">
                        <div className="w-9 h-9 rounded-xl bg-orange-50 flex items-center justify-center text-[#EA580C] shrink-0">
                          <Cpu className="w-4.5 h-4.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h5 className="text-[12.5px] font-extrabold text-gray-900 truncate leading-none mb-1">{b.batch_number || '—'}</h5>
                          <p className="text-[11px] text-gray-400 font-bold truncate leading-none">{b.product_name || '—'}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0 text-right">
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider leading-none" style={{ color, backgroundColor: bg }}>
                            {label}
                          </span>
                          <span className="text-[9.5px] text-gray-400 font-bold">{stageLabel} stage</span>
                        </div>
                      </div>
                      
                      <div className="flex flex-col gap-1">
                        <div className="flex justify-between items-center text-[10.5px] leading-none text-gray-500 font-bold">
                          <span>Progress</span>
                          <span>{b.actual_quantity || 0} / {b.planned_quantity || 0} units</span>
                        </div>
                        <div className="h-1 rounded-full bg-gray-100 overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct * 100}%`, backgroundColor: color }} />
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Inventory Alerts */}
        <div>
          <div className="flex items-center justify-between mb-3.5">
            <div className="flex items-center gap-2.5">
              <div className={`w-7 h-7 rounded-lg ${alertMaterials.length > 0 ? 'bg-red-500/10 text-red-600' : 'bg-green-500/10 text-green-600'} flex items-center justify-center`}>
                <AlertTriangle className="w-3.5 h-3.5" />
              </div>
              <h4 className="text-sm font-extrabold text-gray-900">Inventory Alerts</h4>
            </div>
            <button onClick={() => navigate('/materials')} className="flex items-center gap-1 text-[11.5px] font-bold text-[#0066FF] active:opacity-75">
              View all
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          
          <div className={`bg-white border rounded-3xl overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.01)] ${
            alertMaterials.length > 0 ? 'border-red-200' : 'border-gray-150'
          }`}>
            {loading ? (
              <div className="p-8 flex items-center justify-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#EA580C]"></div>
              </div>
            ) : alertMaterials.length === 0 ? (
              <div className="p-6 flex flex-col items-center gap-2 text-center">
                <div className="w-11 h-11 rounded-full bg-green-50 flex items-center justify-center text-[#16A34A] mb-1">
                  <CheckCircle className="w-5.5 h-5.5" />
                </div>
                <span className="text-xs font-bold text-gray-900 leading-tight">All materials healthy</span>
                <span className="text-[11px] text-gray-400 font-semibold leading-tight">No restocking needed right now</span>
              </div>
            ) : (
              alertMaterials.slice(0, 6).map((m: any, i: number, arr: any[]) => {
                const [color, bg, label] = statusMeta(m.status);
                const pct = m.max_capacity > 0 ? Math.min(m.current_stock / m.max_capacity, 1) : 0;
                return (
                  <div
                    key={m.id || i}
                    onClick={() => navigate(`/materials/${m.id}`)}
                    className={`py-3.5 px-4 active:bg-gray-50 transition-colors cursor-pointer ${
                      i < arr.length - 1 ? 'border-b border-gray-100' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2.5 mb-2">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                      <span className="text-[12.5px] font-extrabold text-gray-900 flex-1 truncate leading-none">{m.name}</span>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider shrink-0 leading-none" style={{ color, backgroundColor: bg }}>
                        {label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <div className="flex-1 h-1 rounded-full bg-gray-100 overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct * 100}%`, backgroundColor: color }} />
                      </div>
                      <span className="text-[10.5px] text-gray-500 font-black shrink-0 leading-none">
                        {m.current_stock} / {m.min_threshold} {m.unit}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Purchase Orders List */}
        {dashboardData.manageStockOrders.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-[#0066FF]/10 flex items-center justify-center text-[#0066FF]">
                  <Clipboard className="w-3.5 h-3.5" />
                </div>
                <h4 className="text-sm font-extrabold text-gray-900">Purchase Orders</h4>
              </div>
              <button onClick={() => navigate('/manage-stock')} className="flex items-center gap-1 text-[11.5px] font-bold text-[#0066FF] active:opacity-75">
                View all
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            
            <div className="bg-white border border-gray-150 rounded-3xl overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.01)]">
              {loading ? (
                <div className="p-8 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#0066FF]"></div>
                </div>
              ) : (
                dashboardData.manageStockOrders.slice(0, 4).map((p: any, i: number, arr: any[]) => {
                  const [color, bg, label] = statusMeta(p.status);
                  return (
                    <div
                      key={p.id || i}
                      onClick={() => navigate('/manage-stock')}
                      className={`flex items-center gap-3 py-3.5 px-4 active:bg-gray-50 transition-colors cursor-pointer ${
                        i < arr.length - 1 ? 'border-b border-gray-100' : ''
                      }`}
                    >
                      <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-[#0066FF] shrink-0">
                        <Package className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h5 className="text-[12.5px] font-extrabold text-gray-900 truncate leading-none mb-1">
                          {p.materialName || p.material_name || p.order_number || 'Stock Order'}
                        </h5>
                        <p className="text-[11px] text-gray-400 font-bold truncate leading-none">
                          {p.supplier || p.supplier_name || '—'} · {p.quantity} {p.unit || ''}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider leading-none" style={{ color, backgroundColor: bg }}>
                          {label}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
