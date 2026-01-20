import { useState, useEffect } from 'react';
import Layout from '@/components/layout/Layout';
import { useAuth } from '@/contexts/AuthContext';
import DashboardStatsCards from '@/components/dashboard/DashboardStatsCards';
import RecentOrders from '@/components/dashboard/RecentOrders';
import ProductionOverview from '@/components/dashboard/ProductionOverview';
import InventoryAlerts from '@/components/dashboard/InventoryAlerts';
import TopCustomers from '@/components/dashboard/TopCustomers';
import TopSuppliers from '@/components/dashboard/TopSuppliers';
import { ProductService } from '@/services/productService';
import { OrderService, type Order } from '@/services/orderService';
import { ProductionService } from '@/services/productionService';
import { SupplierService } from '@/services/supplierService';
import type { Product } from '@/types/product';

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
  };
  recentOrders: Order[];
  productionBatches: any[];
  lowStockProducts: Product[];
  topCustomers: any[];
  topSuppliers: any[];
}

export default function Dashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
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
    },
    recentOrders: [],
    productionBatches: [],
    lowStockProducts: [],
    topCustomers: [],
    topSuppliers: [],
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch data in parallel
      const [
        productsResponse,
        ordersResponse,
        productStatsResponse,
        productionResponse,
        suppliersResponse,
      ] = await Promise.all([
        ProductService.getProducts({ limit: 1000 }),
        OrderService.getOrders({ limit: 1000 }),
        ProductService.getProductStats(),
        ProductionService.getBatches(),
        SupplierService.getSuppliers(),
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

      // Process orders data
      const orders = ordersResponse.data || [];
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

      // Get production batches
      const productionBatches = productionResponse.data || [];
      const activeBatches = productionBatches.filter((batch: any) =>
        batch.status === 'in_progress' || batch.status === 'planned'
      );

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

      // Get materials count (you can fetch from materials service if available)
      const totalMaterials = (productStatsResponse as any).total_materials || 0;

      setDashboardData({
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
        },
        recentOrders: orders.slice(0, 10).sort((a: any, b: any) => {
          return new Date(b.orderDate || 0).getTime() - new Date(a.orderDate || 0).getTime();
        }),
        productionBatches: activeBatches.slice(0, 10),
        lowStockProducts: lowStockProducts.slice(0, 10),
        topCustomers: customers,
        topSuppliers: Array.from(supplierStatsMap.values()),
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Welcome Section */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Welcome back, {user?.full_name || user?.email || 'User'}!
          </h1>
          <p className="text-gray-600 mt-1">
            Here's what's happening with your business today.
          </p>
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

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Inventory Alerts */}
          <InventoryAlerts products={dashboardData.lowStockProducts} loading={loading} />

          {/* Top Customers */}
          <TopCustomers customers={dashboardData.topCustomers} loading={loading} />
        </div>

        {/* Top Suppliers - Full Width */}
        <TopSuppliers suppliers={dashboardData.topSuppliers} loading={loading} />
      </div>
    </Layout>
  );
}
