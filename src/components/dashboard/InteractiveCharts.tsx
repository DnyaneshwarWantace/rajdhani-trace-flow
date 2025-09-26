import React from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, DollarSign, Package, Users } from "lucide-react";

interface InteractiveChartsProps {
  data?: any;
  loading?: boolean;
}

export function InteractiveCharts({ data, loading }: InteractiveChartsProps) {
  const orders = data?.stats?.orders || {};
  const products = data?.stats?.products || {};
  const materials = data?.stats?.materials || {};
  const customers = data?.stats?.customers || {};

  // Order status distribution
  const orderStatusData = [
    { name: "Pending", value: orders.pending || 0, color: "bg-yellow-500" },
    { name: "Accepted", value: orders.accepted || 0, color: "bg-blue-500" },
    { name: "In Production", value: orders.inProduction || 0, color: "bg-purple-500" },
    { name: "Ready", value: orders.ready || 0, color: "bg-indigo-500" },
    { name: "Dispatched", value: orders.dispatched || 0, color: "bg-orange-500" },
    { name: "Delivered", value: orders.delivered || 0, color: "bg-green-500" },
    { name: "Cancelled", value: orders.cancelled || 0, color: "bg-red-500" }
  ];

  // Revenue breakdown
  const revenueData = [
    { name: "Paid Amount", value: orders.paidAmount || 0, color: "bg-green-500" },
    { name: "Outstanding", value: orders.outstandingAmount || 0, color: "bg-orange-500" },
    { name: "Total Revenue", value: orders.totalRevenue || 0, color: "bg-blue-500" }
  ];

  // Product vs Materials
  const inventoryData = [
    { name: "Total Products", value: products.totalProducts || 0, color: "bg-blue-500" },
    { name: "Available Units", value: products.availableUnits || 0, color: "bg-green-500" },
    { name: "Raw Materials", value: materials.totalMaterials || 0, color: "bg-orange-500" },
    { name: "Materials in Stock", value: materials.inStock || 0, color: "bg-purple-500" }
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
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: "easeOut"
      }
    }
  };

  const SimpleBarChart = ({ data, title, subtitle }: { data: any[], title: string, subtitle: string }) => {
    const maxValue = Math.max(...data.map(d => d.value));
    
    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-black">{title}</h3>
          <p className="text-sm text-gray-500">{subtitle}</p>
        </div>
        <div className="space-y-3">
          {data.map((item, index) => (
            <div key={index} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-gray-700">{item.name}</span>
                <span className="font-medium text-black">{item.value}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${item.color} transition-all duration-1000 ease-out`}
                  style={{ width: maxValue > 0 ? `${(item.value / maxValue) * 100}%` : '0%' }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const RevenueCard = () => {
    const totalRevenue = orders.totalRevenue || 0;
    const paidAmount = orders.paidAmount || 0;
    const outstandingAmount = orders.outstandingAmount || 0;
    const paymentPercentage = totalRevenue > 0 ? Math.round((paidAmount / totalRevenue) * 100) : 0;

    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-black">Revenue Overview</h3>
          <p className="text-sm text-gray-500">Payment status breakdown</p>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">₹{paidAmount.toLocaleString()}</div>
            <div className="text-sm text-gray-600">Paid Amount</div>
          </div>
          <div className="text-center p-4 bg-orange-50 rounded-lg">
            <div className="text-2xl font-bold text-orange-600">₹{outstandingAmount.toLocaleString()}</div>
            <div className="text-sm text-gray-600">Outstanding</div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-700">Payment Progress</span>
            <span className="font-medium text-black">{paymentPercentage}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="h-3 rounded-full bg-green-500 transition-all duration-1000 ease-out"
              style={{ width: `${paymentPercentage}%` }}
            />
          </div>
        </div>
      </div>
    );
  };

  return (
    <motion.div
      className="grid gap-6 lg:grid-cols-2"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Order Status Chart */}
      <motion.div variants={itemVariants}>
        <Card className="bg-white border border-gray-200 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold text-black flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-600" />
              Order Status Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded animate-pulse" />
                    <div className="h-2 bg-gray-200 rounded animate-pulse" />
                  </div>
                ))}
              </div>
            ) : (
              <SimpleBarChart
                data={orderStatusData}
                title=""
                subtitle="Current order status breakdown"
              />
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Revenue Chart */}
      <motion.div variants={itemVariants}>
        <Card className="bg-white border border-gray-200 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold text-black flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-600" />
              Revenue Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="h-16 bg-gray-200 rounded animate-pulse" />
                  <div className="h-16 bg-gray-200 rounded animate-pulse" />
                </div>
                <div className="h-6 bg-gray-200 rounded animate-pulse" />
              </div>
            ) : (
              <RevenueCard />
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Inventory Overview */}
      <motion.div variants={itemVariants}>
        <Card className="bg-white border border-gray-200 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold text-black flex items-center gap-2">
              <Package className="w-5 h-5 text-purple-600" />
              Inventory Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[1, 2].map(i => (
                  <div key={i} className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded animate-pulse" />
                    <div className="h-2 bg-gray-200 rounded animate-pulse" />
                  </div>
                ))}
              </div>
            ) : (
              <SimpleBarChart
                data={inventoryData}
                title=""
                subtitle="Carpets vs Raw Materials"
              />
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Key Metrics */}
      <motion.div variants={itemVariants}>
        <Card className="bg-white border border-gray-200 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold text-black flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-indigo-600" />
              Key Performance Metrics
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="grid grid-cols-2 gap-4">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="h-20 bg-gray-200 rounded animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{orders.total || 0}</div>
                  <div className="text-sm text-gray-600">Total Orders</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{products.carpetProducts || 0}</div>
                  <div className="text-sm text-gray-600">Carpet Products</div>
                </div>
                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">{materials.totalMaterials || 0}</div>
                  <div className="text-sm text-gray-600">Raw Materials</div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">{customers.total || 0}</div>
                  <div className="text-sm text-gray-600">Total Customers</div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}

