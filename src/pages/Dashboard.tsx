import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Header } from "@/components/layout/Header";
import { ModernStatsGrid } from "@/components/dashboard/ModernStatsGrid";
import { InteractiveCharts } from "@/components/dashboard/InteractiveCharts";
import { RealtimeMetrics } from "@/components/dashboard/RealtimeMetrics";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { PerformanceMetrics } from "@/components/dashboard/PerformanceMetrics";
import { BusinessInsights } from "@/components/dashboard/BusinessInsights";
import { TrendingUp } from "lucide-react";
import ProductService from "@/services/api/productService";
import RawMaterialService from "@/services/api/rawMaterialService";
import { IndividualProductService } from "@/services/api/individualProductService";
import MongoDBOrderService from "@/services/api/orderService";
import { CustomerService } from "@/services/customerService";
import { useToast } from "@/hooks/use-toast";

export default function Dashboard() {
  const { toast } = useToast();
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch all data in parallel for maximum performance using MongoDB services
      let [
        productStats,
        materialStats,
        recentProducts,
        individualProducts,
        orderStats,
        customerStats
      ] = await Promise.all([
        ProductService.getProductStats().catch(err => {
          console.warn('Failed to load product stats:', err);
          return { data: null, error: err.message };
        }),
        RawMaterialService.getRawMaterials(),
        ProductService.getProducts({ limit: 8 }),
        IndividualProductService.getIndividualProductStats().catch(err => {
          console.warn('Failed to load individual product stats:', err);
          return { data: null, error: err.message };
        }),
        MongoDBOrderService.getOrderStats(),
        CustomerService.getAllCustomerStats().catch(err => {
          console.warn('Failed to load customer stats:', err);
          return { data: null, error: err.message };
        })
      ]);

      // Debug: Log the stats data
      console.log('📊 Dashboard Stats Debug (MongoDB):');
      console.log('Products:', productStats);
      console.log('Materials:', materialStats);
      console.log('Recent Products:', recentProducts);
      console.log('Individual Products:', individualProducts);
      console.log('Order Stats:', orderStats);
      console.log('Customer Stats:', customerStats);
      
      // Check if orderStats is valid and has the expected structure
      if (!orderStats || typeof orderStats !== 'object') {
        console.error('❌ Order Stats is invalid:', orderStats);
        // Set default values to prevent crashes
        orderStats = {
          total: 0,
          pending: 0,
          accepted: 0,
          inProduction: 0,
          ready: 0,
          dispatched: 0,
          delivered: 0,
          cancelled: 0,
          totalRevenue: 0,
          paidAmount: 0,
          outstandingAmount: 0,
          averageOrderValue: 0
        };
      }
      
      console.log('✅ Order Stats Total:', orderStats.total);
      console.log('✅ Order Stats Revenue:', orderStats.totalRevenue);
      console.log('✅ Order Stats Dispatched:', orderStats.dispatched);
      console.log('✅ Order Stats Delivered:', orderStats.delivered);

      // Calculate material stats with error handling
      const materialStatsData = {
        totalMaterials: materialStats?.data?.length || 0,
        lowStockMaterials: materialStats?.data?.filter((m: any) => m.current_stock < m.min_threshold).length || 0,
        totalValue: materialStats?.data?.reduce((sum: number, m: any) => sum + (m.total_value || 0), 0) || 0,
        averageCost: materialStats?.data?.length > 0 ? 
          materialStats.data.reduce((sum: number, m: any) => sum + (m.cost_per_unit || 0), 0) / materialStats.data.length : 0
      };

      // Individual product stats are already calculated by the backend
      const individualProductStats = {
        totalIndividualProducts: individualProducts?.data?.total_individual_products || 0,
        availableProducts: individualProducts?.data?.available || 0,
        soldProducts: individualProducts?.data?.sold || 0,
        damagedProducts: individualProducts?.data?.damaged || 0
      };

      const dashboardStats = {
        products: productStats?.data || {},
        materials: materialStatsData,
        individualProducts: individualProductStats,
        orders: {
          totalOrders: orderStats.total,
          pendingOrders: orderStats.pending,
          completedOrders: orderStats.dispatched + orderStats.delivered,
          totalRevenue: orderStats.totalRevenue,
          paidAmount: orderStats.paidAmount,
          outstandingAmount: orderStats.outstandingAmount,
          averageOrderValue: orderStats.averageOrderValue
        },
        customers: { 
          totalCustomers: customerStats?.data?.total_customers || 0, 
          activeCustomers: customerStats?.data?.active_customers || 0 
        },
        production: { totalProduction: 0, activeProduction: 0 } // Placeholder
      };

      // Debug: Log the dashboard stats structure
      console.log('🔍 Dashboard - Stats structure:', dashboardStats);
      console.log('🔍 Dashboard - Orders data:', dashboardStats.orders);
      console.log('🔍 Dashboard - Orders totalOrders:', dashboardStats.orders.totalOrders);
      console.log('🔍 Dashboard - Orders completedOrders:', dashboardStats.orders.completedOrders);
      console.log('🔍 Dashboard - Orders totalRevenue:', dashboardStats.orders.totalRevenue);
      console.log('🔍 Dashboard - Products data:', dashboardStats.products);
      console.log('🔍 Dashboard - Materials data:', dashboardStats.materials);
      console.log('🔍 Dashboard - Customers data:', dashboardStats.customers);

      setDashboardData({
        stats: dashboardStats,
        recentOrders: [], // Placeholder - no orders service yet
        recentProducts: recentProducts?.data || []
      });

      setLastRefresh(new Date());

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();

    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        duration: 0.6
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5 }
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <motion.div
        className="flex-1 space-y-6 p-4 sm:p-6 lg:p-8"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Header */}
        <motion.div variants={itemVariants}>
          <Header
            title="Business Dashboard"
            subtitle="Real-time insights for carpets and raw materials business"
          />
        </motion.div>

        {loading && !dashboardData ? (
          <motion.div
            className="grid gap-6 md:grid-cols-2 lg:grid-cols-4"
            variants={containerVariants}
          >
            {[1, 2, 3, 4, 5, 6].map(i => (
              <motion.div
                key={i}
                className="h-32 bg-white rounded-xl shadow-sm border border-gray-200 animate-pulse"
                variants={itemVariants}
              />
            ))}
          </motion.div>
        ) : (
          <>
            {/* Modern Stats Grid */}
            <motion.div variants={itemVariants}>
              <ModernStatsGrid
                data={dashboardData?.stats}
                loading={loading}
              />
            </motion.div>

            {/* Charts and Metrics Row */}
            <motion.div
              className="grid gap-6 lg:grid-cols-12"
              variants={itemVariants}
            >
              <div className="lg:col-span-8">
                <InteractiveCharts
                  data={dashboardData}
                  loading={loading}
                />
              </div>
              <div className="lg:col-span-4">
                <RealtimeMetrics
                  data={dashboardData?.stats}
                  loading={loading}
                />
              </div>
            </motion.div>

            {/* Activity Feed and Performance */}
            <motion.div
              className="grid gap-6 lg:grid-cols-12"
              variants={itemVariants}
            >
              <div className="lg:col-span-7">
                <ActivityFeed
                  orders={dashboardData?.recentOrders || []}
                  products={dashboardData?.recentProducts || []}
                  loading={loading}
                />
              </div>
              <div className="lg:col-span-5">
                <PerformanceMetrics
                  data={dashboardData?.stats}
                  loading={loading}
                />
              </div>
            </motion.div>

            {/* Business Insights */}
            <motion.div variants={itemVariants}>
              <BusinessInsights
                data={dashboardData}
                loading={loading}
              />
            </motion.div>

            {/* Footer Info */}
            <motion.div
              className="flex items-center justify-between text-xs text-gray-500 pt-4"
              variants={itemVariants}
            >
              <div className="flex items-center gap-2">
                <TrendingUp className="h-3 w-3" />
                Last updated: {lastRefresh.toLocaleTimeString()}
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                System Online
              </div>
            </motion.div>
          </>
        )}
      </motion.div>
    </div>
  );
}