import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Header } from "@/components/layout/Header";
import { ModernStatsGrid } from "@/components/dashboard/ModernStatsGrid";
import { InteractiveCharts } from "@/components/dashboard/InteractiveCharts";
import { RealtimeMetrics } from "@/components/dashboard/RealtimeMetrics";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { PerformanceMetrics } from "@/components/dashboard/PerformanceMetrics";
import { BusinessInsights } from "@/components/dashboard/BusinessInsights";
import { RefreshCw, Zap, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  OrderService,
  ProductService,
  RawMaterialService,
  CustomerService,
  ProductionService
} from "@/services";
import { useToast } from "@/hooks/use-toast";

export default function Dashboard() {
  const { toast } = useToast();
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch all data in parallel for maximum performance
      const [
        orderStats,
        productStats,
        materialStats,
        customerStats,
        productionStats,
        recentOrders,
        recentProducts
      ] = await Promise.all([
        OrderService.getOrderStats(),
        ProductService.getProductStats(),
        RawMaterialService.getInventoryStats(),
        CustomerService.getCustomerStats(),
        ProductionService.getProductionStats(),
        OrderService.getOrders({ limit: 10 }),
        ProductService.getProducts({ limit: 8 })
      ]);

      // Debug: Log the stats data
      console.log('📊 Dashboard Stats Debug:');
      console.log('Orders:', orderStats);
      console.log('Products:', productStats);
      console.log('Materials:', materialStats);
      console.log('Customers:', customerStats);
      console.log('Production:', productionStats);

      setDashboardData({
        stats: {
          orders: orderStats,
          products: productStats,
          materials: materialStats,
          customers: customerStats,
          production: productionStats
        },
        recentOrders: recentOrders.data || [],
        recentProducts: recentProducts.data || []
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
          <div className="flex items-center justify-between">
            <Header
              title="Business Dashboard"
              subtitle="Real-time insights for carpets and raw materials business"
            />
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 text-xs text-gray-600">
                <Zap className="h-3 w-3 text-green-500" />
                Live Data
              </div>
              <Button
                onClick={fetchDashboardData}
                variant="outline"
                size="sm"
                className="gap-2 border-gray-300 text-gray-700 hover:bg-gray-50"
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">
                  {loading ? 'Refreshing...' : 'Refresh'}
                </span>
              </Button>
            </div>
          </div>
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