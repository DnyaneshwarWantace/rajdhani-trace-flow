import React from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import {
  ShoppingCart,
  Package,
  Factory,
  Users,
  DollarSign,
  TrendingUp,
  Activity,
  AlertTriangle
} from "lucide-react";

interface ModernStatsGridProps {
  data?: any;
  loading?: boolean;
}

export function ModernStatsGrid({ data, loading }: ModernStatsGridProps) {
  // Calculate real metrics from data
  const totalOrders = data?.stats?.orders?.total || 0;
  const completedOrders = (data?.stats?.orders?.delivered || 0) + (data?.stats?.orders?.dispatched || 0);
  const pendingOrders = data?.stats?.orders?.pending || 0;
  const inProductionOrders = data?.stats?.orders?.inProduction || 0;
  
  // Real revenue from completed orders with full payment
  const totalRevenue = data?.stats?.orders?.totalRevenue || 0;
  const paidAmount = data?.stats?.orders?.paidAmount || 0;
  const outstandingAmount = data?.stats?.orders?.outstandingAmount || 0;
  
  // Products and materials
  const totalProducts = data?.stats?.products?.totalProducts || 0;
  const lowStockProducts = data?.stats?.products?.lowStock || 0;
  
  // Raw materials count
  const rawMaterials = data?.stats?.materials?.totalMaterials || 0;
  const materialsLowStock = data?.stats?.materials?.lowStock || 0;
  
  // Production efficiency based on completed vs total orders
  const productionEfficiency = totalOrders > 0 ? Math.round((completedOrders / totalOrders) * 100) : 0;
  
  // Customer metrics
  const totalCustomers = data?.stats?.customers?.total || 0;
  const activeCustomers = data?.stats?.customers?.active || 0;

  const stats = [
    {
      id: "orders",
      title: "Total Orders",
      value: totalOrders,
      subtitle: `${pendingOrders} pending, ${inProductionOrders} in production`,
      icon: ShoppingCart,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      trend: totalOrders > 0 ? Math.round((completedOrders / totalOrders) * 100) : 0,
      trendUp: true
    },
    {
      id: "products",
      title: "Total Products",
      value: totalProducts,
      subtitle: `${lowStockProducts} low stock`,
      icon: Package,
      color: "text-green-600",
      bgColor: "bg-green-50",
      trend: lowStockProducts,
      trendUp: lowStockProducts === 0
    },
    {
      id: "materials",
      title: "Raw Materials",
      value: rawMaterials,
      subtitle: `${materialsLowStock} need reordering`,
      icon: Factory,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
      trend: materialsLowStock,
      trendUp: materialsLowStock === 0
    },
    {
      id: "revenue",
      title: "Total Revenue",
      value: totalRevenue >= 100000 ? `₹${(totalRevenue / 100000).toFixed(1)}L` : `₹${totalRevenue.toLocaleString()}`,
      subtitle: `₹${paidAmount.toLocaleString()} paid, ₹${outstandingAmount.toLocaleString()} outstanding`,
      icon: DollarSign,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      trend: totalOrders > 0 ? Math.round((completedOrders / totalOrders) * 100) : 0,
      trendUp: true
    },
    {
      id: "customers",
      title: "Total Customers",
      value: totalCustomers,
      subtitle: `${activeCustomers} active customers`,
      icon: Users,
      color: "text-indigo-600",
      bgColor: "bg-indigo-50",
      trend: totalCustomers > 0 ? Math.round((activeCustomers / totalCustomers) * 100) : 0,
      trendUp: true
    },
    {
      id: "production",
      title: "Order Completion",
      value: `${productionEfficiency}%`,
      subtitle: `${completedOrders} completed orders`,
      icon: Activity,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
      trend: productionEfficiency,
      trendUp: productionEfficiency >= 80
    }
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <motion.div
      className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {stats.map((stat, index) => (
        <motion.div
          key={stat.id}
          variants={cardVariants}
          whileHover={{
            scale: 1.02,
            transition: { duration: 0.2 }
          }}
          className="group"
        >
          <Card className="bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-300">
            <CardContent className="p-6">
              {/* Icon */}
              <div className={`w-12 h-12 rounded-lg ${stat.bgColor} p-3 mb-4`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>

              {/* Content */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-700">
                    {stat.title}
                  </h3>
                  <div className={`flex items-center gap-1 text-xs ${stat.trendUp ? 'text-green-600' : 'text-red-600'}`}>
                    <TrendingUp className={`w-3 h-3 ${!stat.trendUp ? 'rotate-180' : ''}`} />
                    {stat.trend}%
                  </div>
                </div>

                <div className="mb-3">
                  <div className="text-2xl font-bold text-black">
                    {loading ? (
                      <div className="h-8 w-16 bg-gray-200 rounded animate-pulse" />
                    ) : (
                      stat.value
                    )}
                  </div>
                </div>

                <div className="text-xs text-gray-500">
                  {stat.subtitle}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </motion.div>
  );
}

