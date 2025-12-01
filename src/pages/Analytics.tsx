import { useState, useEffect } from 'react';
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  Users,
  ShoppingCart,
  Target,
  BarChart3,
  TrendingUpIcon
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';
import AnalyticsService, {
  AnalyticsData,
  TopProduct,
  TopCustomer,
  MonthlyTrend,
  ProductionMetrics
} from '@/services/api/analyticsService';
import { useToast } from '@/hooks/use-toast';

export default function Analytics() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);

  // Data states
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [topCustomers, setTopCustomers] = useState<TopCustomer[]>([]);
  const [monthlyTrends, setMonthlyTrends] = useState<MonthlyTrend[]>([]);
  const [productionMetrics, setProductionMetrics] = useState<ProductionMetrics | null>(null);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      // Fetch all analytics data in parallel
      const [analyticsData, products, customers, trends, metrics] = await Promise.all([
        AnalyticsService.getAnalytics().catch(err => {
          console.error('Error fetching analytics:', err);
          return {
            revenue: { current: 0, previous: 0, growth: 0 },
            orders: { current: 0, previous: 0, growth: 0 },
            customers: { current: 0, previous: 0, growth: 0 },
            production: { current: 0, previous: 0, growth: 0 }
          };
        }),
        AnalyticsService.getTopProducts(5).catch(err => {
          console.error('Error fetching top products:', err);
          return [];
        }),
        AnalyticsService.getTopCustomers(5).catch(err => {
          console.error('Error fetching top customers:', err);
          return [];
        }),
        AnalyticsService.getMonthlyTrends().catch(err => {
          console.error('Error fetching monthly trends:', err);
          return [];
        }),
        AnalyticsService.getProductionMetrics().catch(err => {
          console.error('Error fetching production metrics:', err);
          return {
            efficiency: 0,
            wasteReduction: 0,
            qualityScore: 0,
            onTimeDelivery: 0
          };
        })
      ]);

      setAnalytics(analyticsData);
      setTopProducts(products || []);
      setTopCustomers(customers || []);
      setMonthlyTrends(trends || []);
      setProductionMetrics(metrics);

    } catch (error) {
      console.error('Error fetching analytics data:', error);
      toast({
        title: "Error",
        description: "Failed to load analytics data. Some features may not be available.",
        variant: "destructive"
      });
      // Set default values to prevent crashes
      setAnalytics({
        revenue: { current: 0, previous: 0, growth: 0 },
        orders: { current: 0, previous: 0, growth: 0 },
        customers: { current: 0, previous: 0, growth: 0 },
        production: { current: 0, previous: 0, growth: 0 }
      });
      setTopProducts([]);
      setTopCustomers([]);
      setMonthlyTrends([]);
      setProductionMetrics({
        efficiency: 0,
        wasteReduction: 0,
        qualityScore: 0,
        onTimeDelivery: 0
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalyticsData();
  }, []);

  const formatGrowth = (growth: number) => {
    const isPositive = growth > 0;
    return (
      <div className={`flex items-center gap-1 ${isPositive ? 'text-success' : 'text-destructive'}`}>
        {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
        <span className="text-sm font-medium">{Math.abs(growth).toFixed(1)}%</span>
      </div>
    );
  };

  const formatCurrency = (amount: number) => {
    if (amount >= 100000) {
      return `₹${(amount / 100000).toFixed(1)}L`;
    } else if (amount >= 1000) {
      return `₹${(amount / 1000).toFixed(1)}K`;
    }
    return `₹${amount.toFixed(0)}`;
  };

  if (loading) {
    return (
      <div className="flex-1 space-y-6 p-6">
        <Header
          title="Business Analytics"
          subtitle="Comprehensive insights into your carpet manufacturing business"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-24 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      <Header
        title="Business Analytics"
        subtitle="Real-time insights powered by MongoDB"
      />

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold">{formatCurrency(analytics?.revenue?.current || 0)}</p>
                {formatGrowth(analytics?.revenue?.growth || 0)}
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Orders</p>
                <p className="text-2xl font-bold">{analytics?.orders?.current || 0}</p>
                {formatGrowth(analytics?.orders?.growth || 0)}
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <ShoppingCart className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Customers</p>
                <p className="text-2xl font-bold">{analytics?.customers?.current || 0}</p>
                {formatGrowth(analytics?.customers?.growth || 0)}
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Production Output</p>
                <p className="text-2xl font-bold">{analytics?.production?.current || 0}</p>
                {formatGrowth(analytics?.production?.growth || 0)}
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                <Package className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Trends Chart */}
      {monthlyTrends.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUpIcon className="w-5 h-5" />
              Revenue & Orders Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={monthlyTrends}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    name === 'revenue' ? formatCurrency(value) : value,
                    name === 'revenue' ? 'Revenue' : 'Orders'
                  ]}
                />
                <Legend />
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="revenue"
                  stroke="#3b82f6"
                  fillOpacity={1}
                  fill="url(#colorRevenue)"
                  name="Revenue"
                />
                <Area
                  yAxisId="right"
                  type="monotone"
                  dataKey="orders"
                  stroke="#10b981"
                  fillOpacity={1}
                  fill="url(#colorOrders)"
                  name="Orders"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Production Efficiency Metrics */}
      {productionMetrics && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Production Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-3xl font-bold text-green-600">
                  {productionMetrics?.efficiency != null ? productionMetrics.efficiency.toFixed(1) : '0.0'}%
                </div>
                <p className="text-sm text-muted-foreground mt-1">Overall Efficiency</p>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-3xl font-bold text-blue-600">
                  {productionMetrics?.qualityScore != null ? productionMetrics.qualityScore.toFixed(1) : '0.0'}%
                </div>
                <p className="text-sm text-muted-foreground mt-1">Quality Score</p>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <div className="text-3xl font-bold text-orange-600">
                  {productionMetrics?.onTimeDelivery != null ? productionMetrics.onTimeDelivery.toFixed(1) : '0.0'}%
                </div>
                <p className="text-sm text-muted-foreground mt-1">On-Time Delivery</p>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-3xl font-bold text-purple-600">
                  {productionMetrics?.wasteReduction != null ? productionMetrics.wasteReduction.toFixed(1) : '0.0'}%
                </div>
                <p className="text-sm text-muted-foreground mt-1">Waste Reduction</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <Card>
          <CardHeader>
            <CardTitle>Top Performing Products</CardTitle>
          </CardHeader>
          <CardContent>
            {topProducts.length > 0 ? (
              <div className="space-y-4">
                {topProducts.map((product, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex-1">
                      <h4 className="font-medium">{product.product_name}</h4>
                      <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                        <span>{formatCurrency(product.total_revenue)} revenue</span>
                        <span>•</span>
                        <span>{product.total_orders} orders</span>
                        <span>•</span>
                        <span>{product.total_quantity} units</span>
                      </div>
                    </div>
                    <Badge variant="outline" className="ml-4">
                      #{index + 1}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No product data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Customers */}
        <Card>
          <CardHeader>
            <CardTitle>Top Customers</CardTitle>
          </CardHeader>
          <CardContent>
            {topCustomers.length > 0 ? (
              <div className="space-y-4">
                {topCustomers.map((customer, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex-1">
                      <h4 className="font-medium">{customer.customer_name}</h4>
                      <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                        <span>{formatCurrency(customer.total_revenue)} revenue</span>
                        <span>•</span>
                        <span>{customer.total_orders} orders</span>
                      </div>
                    </div>
                    <div className="text-right ml-4">
                      <Badge
                        variant={customer.customer_type === "Business" ? "default" : "outline"}
                        className="mb-1"
                      >
                        {customer.customer_type}
                      </Badge>
                      <div className="text-xl font-bold text-primary">#{index + 1}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No customer data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Production Chart */}
      {monthlyTrends.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Production Output Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={monthlyTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="production" fill="#f59e0b" name="Production Units" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Key Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Key Insights & Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <h4 className="font-medium text-green-700 mb-2">Strong Performance</h4>
              <ul className="text-sm space-y-1 text-green-800">
                <li>• Revenue growth of {analytics?.revenue?.growth != null ? analytics.revenue.growth.toFixed(1) : '0.0'}% this period</li>
                <li>• Production efficiency at {productionMetrics?.efficiency != null ? productionMetrics.efficiency.toFixed(1) : '0.0'}%</li>
                <li>• Quality score maintaining at {productionMetrics?.qualityScore != null ? productionMetrics.qualityScore.toFixed(1) : '0.0'}%</li>
              </ul>
            </div>

            <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
              <h4 className="font-medium text-orange-700 mb-2">Areas for Improvement</h4>
              <ul className="text-sm space-y-1 text-orange-800">
                <li>• On-time delivery at {productionMetrics?.onTimeDelivery != null ? productionMetrics.onTimeDelivery.toFixed(1) : '0.0'}% (target: 95%)</li>
                <li>• Monitor declining products and adjust inventory</li>
                <li>• Consider expanding popular product lines</li>
              </ul>
            </div>

            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="font-medium text-blue-700 mb-2">Growth Opportunities</h4>
              <ul className="text-sm space-y-1 text-blue-800">
                <li>• {topProducts && topProducts.length > 0 ? topProducts[0]?.product_name : 'Top products'} showing strong demand</li>
                <li>• {analytics?.customers?.growth != null ? analytics.customers.growth.toFixed(1) : '0.0'}% increase in customer acquisition</li>
                <li>• Potential for premium product expansion</li>
              </ul>
            </div>

            <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
              <h4 className="font-medium text-purple-700 mb-2">Action Items</h4>
              <ul className="text-sm space-y-1 text-purple-800">
                <li>• Investigate delivery delays and optimize logistics</li>
                <li>• Review pricing strategy for underperforming products</li>
                <li>• Implement waste reduction initiatives</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
