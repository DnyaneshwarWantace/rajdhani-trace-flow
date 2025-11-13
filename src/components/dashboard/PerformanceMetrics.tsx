import React from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  DollarSign,
  Package
} from "lucide-react";

interface PerformanceMetricsProps {
  data?: any;
  loading?: boolean;
}

export function PerformanceMetrics({ data, loading }: PerformanceMetricsProps) {
  console.log('🔍 PerformanceMetrics - Raw data:', data);
  console.log('🔍 PerformanceMetrics - Data orders:', data?.orders);
  console.log('🔍 PerformanceMetrics - Data products:', data?.products);
  console.log('🔍 PerformanceMetrics - Data materials:', data?.materials);
  
  const orders = data?.orders || {};
  const products = data?.products || {};
  const materials = data?.materials || {};
  
  console.log('🔍 PerformanceMetrics - Orders object:', orders);
  console.log('🔍 PerformanceMetrics - Products object:', products);
  console.log('🔍 PerformanceMetrics - Materials object:', materials);

  // Calculate performance metrics with error handling
  const totalOrders = orders?.totalOrders || 0;
  const completedOrders = orders?.completedOrders || 0;
  const completionRate = totalOrders > 0 ? Math.round((completedOrders / totalOrders) * 100) : 0;
  
  const totalRevenue = orders?.totalRevenue || 0;
  const paidAmount = orders?.paidAmount || 0;
  const paymentRate = totalRevenue > 0 ? Math.round((paidAmount / totalRevenue) * 100) : 0;
  
  const totalProducts = products?.total_products || 0;
  const lowStockProducts = products?.low_stock_products || 0;
  const outOfStockProducts = products?.out_of_stock_products || 0;
  const inventoryHealth = totalProducts > 0 ? Math.round(((totalProducts - lowStockProducts - outOfStockProducts) / totalProducts) * 100) : 100;
  
  const rawMaterials = materials?.totalMaterials || 0;
  const materialsLowStock = materials?.lowStockMaterials || 0;
  const materialHealth = rawMaterials > 0 ? Math.round(((rawMaterials - materialsLowStock) / rawMaterials) * 100) : 100;

  console.log('🔍 PerformanceMetrics - Calculated values:');
  console.log('Total Orders:', totalOrders);
  console.log('Completed Orders:', completedOrders);
  console.log('Completion Rate:', completionRate);
  console.log('Total Revenue:', totalRevenue);
  console.log('Paid Amount:', paidAmount);
  console.log('Payment Rate:', paymentRate);
  console.log('Total Products:', totalProducts);
  console.log('Inventory Health:', inventoryHealth);
  console.log('Raw Materials:', rawMaterials);
  console.log('Material Health:', materialHealth);

  const metrics = [
    {
      title: "Order Completion Rate",
      value: `${completionRate}%`,
      description: `${completedOrders} of ${totalOrders} orders completed`,
      icon: CheckCircle,
      color: completionRate >= 80 ? "text-green-600" : completionRate >= 60 ? "text-yellow-600" : "text-red-600",
      bgColor: completionRate >= 80 ? "bg-green-50" : completionRate >= 60 ? "bg-yellow-50" : "bg-red-50",
      trend: completionRate,
      trendUp: completionRate >= 80
    },
    {
      title: "Payment Collection Rate",
      value: `${paymentRate}%`,
      description: `₹${paidAmount.toLocaleString()} of ₹${totalRevenue.toLocaleString()} collected`,
      icon: DollarSign,
      color: paymentRate >= 80 ? "text-green-600" : paymentRate >= 60 ? "text-yellow-600" : "text-red-600",
      bgColor: paymentRate >= 80 ? "bg-green-50" : paymentRate >= 60 ? "bg-yellow-50" : "bg-red-50",
      trend: paymentRate,
      trendUp: paymentRate >= 80
    },
    {
      title: "Product Inventory Health",
      value: `${inventoryHealth}%`,
      description: `${totalProducts - lowStockProducts - outOfStockProducts} of ${totalProducts} products in good stock`,
      icon: Package,
      color: inventoryHealth >= 80 ? "text-green-600" : inventoryHealth >= 60 ? "text-yellow-600" : "text-red-600",
      bgColor: inventoryHealth >= 80 ? "bg-green-50" : inventoryHealth >= 60 ? "bg-yellow-50" : "bg-red-50",
      trend: inventoryHealth,
      trendUp: inventoryHealth >= 80
    },
    {
      title: "Raw Material Health",
      value: `${materialHealth}%`,
      description: `${rawMaterials - materialsLowStock} of ${rawMaterials} materials in good stock`,
      icon: Target,
      color: materialHealth >= 80 ? "text-green-600" : materialHealth >= 60 ? "text-yellow-600" : "text-red-600",
      bgColor: materialHealth >= 80 ? "bg-green-50" : materialHealth >= 60 ? "bg-yellow-50" : "bg-red-50",
      trend: materialHealth,
      trendUp: materialHealth >= 80
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

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  const ProgressBar = ({ value, color, bgColor }: { value: number, color: string, bgColor: string }) => (
    <div className="w-full bg-gray-200 rounded-full h-2">
      <div
        className={`h-2 rounded-full transition-all duration-1000 ease-out ${bgColor.replace('bg-', 'bg-').replace('-50', '-500')}`}
        style={{ width: `${Math.min(value, 100)}%` }}
      />
    </div>
  );

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <Card className="bg-white border border-gray-200 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold text-black flex items-center gap-2">
            <Target className="w-5 h-5 text-indigo-600" />
            Performance Metrics
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="h-4 bg-gray-200 rounded w-1/3 animate-pulse" />
                    <div className="h-6 bg-gray-200 rounded w-16 animate-pulse" />
                  </div>
                  <div className="h-3 bg-gray-200 rounded w-2/3 animate-pulse" />
                  <div className="h-2 bg-gray-200 rounded animate-pulse" />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-6">
              {metrics.map((metric, index) => (
                <motion.div
                  key={index}
                  variants={itemVariants}
                  className="space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg ${metric.bgColor} p-2`}>
                        <metric.icon className={`w-4 h-4 ${metric.color}`} />
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-black">{metric.title}</h4>
                        <p className="text-xs text-gray-500">{metric.description}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-2xl font-bold ${metric.color}`}>
                        {metric.value}
                      </div>
                      <div className="flex items-center gap-1 text-xs">
                        {metric.trendUp ? (
                          <TrendingUp className="w-3 h-3 text-green-600" />
                        ) : (
                          <TrendingDown className="w-3 h-3 text-red-600" />
                        )}
                        <span className={metric.trendUp ? "text-green-600" : "text-red-600"}>
                          {metric.trend}%
                        </span>
                      </div>
                    </div>
                  </div>
                  <ProgressBar value={metric.trend} color={metric.color} bgColor={metric.bgColor} />
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

