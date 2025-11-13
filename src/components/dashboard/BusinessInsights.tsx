import React from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Lightbulb, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle,
  DollarSign,
  Package,
  Users
} from "lucide-react";

interface BusinessInsightsProps {
  data?: any;
  loading?: boolean;
}

export function BusinessInsights({ data, loading }: BusinessInsightsProps) {
  const orders = data?.orders || {};
  const products = data?.products || {};
  const materials = data?.materials || {};
  const customers = data?.customers || {};

  // Generate insights based on data
  const insights = [];

  // Revenue insights
  const totalRevenue = orders.totalRevenue || 0;
  const paidAmount = orders.paidAmount || 0;
  const outstandingAmount = orders.outstandingAmount || 0;
  const paymentRate = totalRevenue > 0 ? Math.round((paidAmount / totalRevenue) * 100) : 0;

  if (outstandingAmount > 0) {
    insights.push({
      type: "warning",
      icon: AlertTriangle,
      title: "Outstanding Payments",
      message: `₹${outstandingAmount.toLocaleString()} in outstanding payments. Consider following up with customers.`,
      action: "Review payment status"
    });
  }

  if (paymentRate >= 90) {
    insights.push({
      type: "success",
      icon: CheckCircle,
      title: "Excellent Payment Collection",
      message: `${paymentRate}% payment collection rate. Great cash flow management!`,
      action: "Keep up the good work"
    });
  }

  // Inventory insights
  const totalProducts = products.total_products || 0;
  const lowStockProducts = products.low_stock_products || 0;
  const lowStockPercentage = totalProducts > 0 ? Math.round((lowStockProducts / totalProducts) * 100) : 0;

  if (lowStockPercentage > 30) {
    insights.push({
      type: "warning",
      icon: Package,
      title: "High Low Stock Alert",
      message: `${lowStockPercentage}% of products are low in stock. Consider restocking.`,
      action: "Review inventory"
    });
  }

  // Order insights
  const totalOrders = orders.totalOrders || 0;
  const completedOrders = orders.completedOrders || 0;
  const completionRate = totalOrders > 0 ? Math.round((completedOrders / totalOrders) * 100) : 0;

  if (completionRate >= 85) {
    insights.push({
      type: "success",
      icon: TrendingUp,
      title: "High Order Completion",
      message: `${completionRate}% order completion rate. Excellent operational efficiency!`,
      action: "Maintain performance"
    });
  }

  // Customer insights
  const totalCustomers = customers.totalCustomers || 0;
  const activeCustomers = customers.activeCustomers || 0;
  const customerRetention = totalCustomers > 0 ? Math.round((activeCustomers / totalCustomers) * 100) : 0;

  if (customerRetention >= 80) {
    insights.push({
      type: "success",
      icon: Users,
      title: "Strong Customer Base",
      message: `${customerRetention}% customer retention rate. Great customer relationships!`,
      action: "Continue engagement"
    });
  }

  // Default insights if no specific insights
  if (insights.length === 0) {
    insights.push({
      type: "info",
      icon: Lightbulb,
      title: "Business Overview",
      message: `You have ${totalOrders} orders, ${totalProducts} products, and ${totalCustomers} customers.`,
      action: "Monitor performance"
    });
  }

  const getInsightColor = (type: string) => {
    switch (type) {
      case "success":
        return {
          bg: "bg-green-50",
          border: "border-green-200",
          icon: "text-green-600",
          title: "text-green-800",
          text: "text-green-700"
        };
      case "warning":
        return {
          bg: "bg-yellow-50",
          border: "border-yellow-200",
          icon: "text-yellow-600",
          title: "text-yellow-800",
          text: "text-yellow-700"
        };
      case "error":
        return {
          bg: "bg-red-50",
          border: "border-red-200",
          icon: "text-red-600",
          title: "text-red-800",
          text: "text-red-700"
        };
      default:
        return {
          bg: "bg-blue-50",
          border: "border-blue-200",
          icon: "text-blue-600",
          title: "text-blue-800",
          text: "text-blue-700"
        };
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
            <Lightbulb className="w-5 h-5 text-yellow-600" />
            Business Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-gray-200 rounded-lg animate-pulse" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 rounded animate-pulse" />
                      <div className="h-3 bg-gray-200 rounded animate-pulse" />
                      <div className="h-3 bg-gray-200 rounded w-2/3 animate-pulse" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {insights.map((insight, index) => {
                const colors = getInsightColor(insight.type);
                return (
                  <motion.div
                    key={index}
                    variants={itemVariants}
                    className={`p-4 rounded-lg border ${colors.bg} ${colors.border}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-lg ${colors.bg} p-2 flex-shrink-0`}>
                        <insight.icon className={`w-4 h-4 ${colors.icon}`} />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <h4 className={`text-sm font-semibold ${colors.title} mb-1`}>
                          {insight.title}
                        </h4>
                        <p className={`text-sm ${colors.text} mb-2`}>
                          {insight.message}
                        </p>
                        <div className={`text-xs font-medium ${colors.icon}`}>
                          💡 {insight.action}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

