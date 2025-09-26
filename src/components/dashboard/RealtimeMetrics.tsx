import React from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Activity, 
  Clock, 
  AlertTriangle, 
  CheckCircle,
  TrendingUp,
  TrendingDown
} from "lucide-react";

interface RealtimeMetricsProps {
  data?: any;
  loading?: boolean;
}

export function RealtimeMetrics({ data, loading }: RealtimeMetricsProps) {
  const orders = data?.stats?.orders || {};
  const products = data?.stats?.products || {};
  const materials = data?.stats?.materials || {};

  // Calculate real-time metrics
  const pendingOrders = orders.pending || 0;
  const inProductionOrders = orders.inProduction || 0;
  const lowStockProducts = products.lowStock || 0;
  const lowStockMaterials = materials.lowStock || 0;
  const totalAlerts = lowStockProducts + lowStockMaterials;

  const metrics = [
    {
      title: "Pending Orders",
      value: pendingOrders,
      icon: Clock,
      color: "text-yellow-600",
      bgColor: "bg-yellow-50",
      status: pendingOrders > 5 ? "high" : pendingOrders > 2 ? "medium" : "low"
    },
    {
      title: "In Production",
      value: inProductionOrders,
      icon: Activity,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      status: inProductionOrders > 3 ? "high" : inProductionOrders > 1 ? "medium" : "low"
    },
    {
      title: "Low Stock Alerts",
      value: totalAlerts,
      icon: AlertTriangle,
      color: totalAlerts > 5 ? "text-red-600" : totalAlerts > 2 ? "text-orange-600" : "text-green-600",
      bgColor: totalAlerts > 5 ? "bg-red-50" : totalAlerts > 2 ? "bg-orange-50" : "bg-green-50",
      status: totalAlerts > 5 ? "high" : totalAlerts > 2 ? "medium" : "low"
    }
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "high":
        return <Badge variant="destructive" className="text-xs">High</Badge>;
      case "medium":
        return <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-800">Medium</Badge>;
      case "low":
        return <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">Low</Badge>;
      default:
        return null;
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: "easeOut"
      }
    }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <Card className="bg-white border border-gray-200 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold text-black flex items-center gap-2">
            <Activity className="w-5 h-5 text-green-600" />
            Real-time Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex items-center gap-3 p-3">
                  <div className="w-10 h-10 bg-gray-200 rounded-lg animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded animate-pulse" />
                    <div className="h-3 bg-gray-200 rounded w-1/3 animate-pulse" />
                  </div>
                  <div className="h-6 bg-gray-200 rounded w-16 animate-pulse" />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {metrics.map((metric, index) => (
                <motion.div
                  key={index}
                  variants={itemVariants}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className={`w-10 h-10 rounded-lg ${metric.bgColor} p-2 flex-shrink-0`}>
                    <metric.icon className={`w-6 h-6 ${metric.color}`} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-sm font-medium text-black">
                        {metric.title}
                      </h4>
                      {getStatusBadge(metric.status)}
                    </div>
                    <p className="text-xs text-gray-500">
                      {metric.title === "Low Stock Alerts" 
                        ? `${lowStockProducts} products, ${lowStockMaterials} materials`
                        : `Currently ${metric.value} ${metric.title.toLowerCase()}`
                      }
                    </p>
                  </div>
                  
                  <div className="text-right">
                    <div className={`text-2xl font-bold ${metric.color}`}>
                      {metric.value}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
          
          {/* System Status */}
          <div className="mt-6 pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-sm font-medium text-black">System Status</span>
              </div>
              <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
                Online
              </Badge>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              All systems operational • Last updated: {new Date().toLocaleTimeString()}
            </p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

