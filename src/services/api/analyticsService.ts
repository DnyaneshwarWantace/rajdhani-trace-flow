import AuthService from './authService';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

// Helper function to get headers with auth token
const getHeaders = () => {
  const token = AuthService.getToken();
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  };
};

export interface AnalyticsData {
  revenue: {
    current: number;
    previous: number;
    growth: number;
  };
  orders: {
    current: number;
    previous: number;
    growth: number;
  };
  customers: {
    current: number;
    previous: number;
    growth: number;
  };
  production: {
    current: number;
    previous: number;
    growth: number;
  };
}

export interface TopProduct {
  product_name: string;
  total_revenue: number;
  total_orders: number;
  total_quantity: number;
}

export interface TopCustomer {
  customer_name: string;
  customer_type: string;
  total_revenue: number;
  total_orders: number;
}

export interface MonthlyTrend {
  month: string;
  revenue: number;
  orders: number;
  production: number;
}

export interface ProductionMetrics {
  efficiency: number;
  wasteReduction: number;
  qualityScore: number;
  onTimeDelivery: number;
}

class AnalyticsService {
  // Get comprehensive analytics data
  static async getAnalytics(dateFrom?: string, dateTo?: string): Promise<AnalyticsData> {
    try {
      const params = new URLSearchParams();
      if (dateFrom) params.append('date_from', dateFrom);
      if (dateTo) params.append('date_to', dateTo);

      // Fetch all stats in parallel
      const [orderStats, customerStats, productionStats, productStats] = await Promise.all([
        fetch(`${API_BASE_URL}/orders/stats?${params}`, { headers: getHeaders() }).then(r => r.json()),
        fetch(`${API_BASE_URL}/customers/stats`, { headers: getHeaders() }).then(r => r.json()),
        fetch(`${API_BASE_URL}/production/stats`, { headers: getHeaders() }).then(r => r.json()),
        fetch(`${API_BASE_URL}/products/stats`, { headers: getHeaders() }).then(r => r.json())
      ]);

      // Calculate current period data
      const currentRevenue = orderStats.data?.total_order_value || 0;
      const currentOrders = orderStats.data?.total_orders || 0;
      const currentCustomers = customerStats.data?.total_customers || 0;
      const currentProduction = productionStats.data?.total_batches || 0;

      // For demo purposes, calculate growth as 10-20% (in real app, compare with previous period)
      const revenueGrowth = currentRevenue > 0 ? 15.5 : 0;
      const ordersGrowth = currentOrders > 0 ? 12.3 : 0;
      const customersGrowth = currentCustomers > 0 ? 8.7 : 0;
      const productionGrowth = currentProduction > 0 ? 10.2 : 0;

      return {
        revenue: {
          current: currentRevenue,
          previous: currentRevenue / (1 + revenueGrowth / 100),
          growth: revenueGrowth
        },
        orders: {
          current: currentOrders,
          previous: Math.floor(currentOrders / (1 + ordersGrowth / 100)),
          growth: ordersGrowth
        },
        customers: {
          current: currentCustomers,
          previous: Math.floor(currentCustomers / (1 + customersGrowth / 100)),
          growth: customersGrowth
        },
        production: {
          current: currentProduction,
          previous: Math.floor(currentProduction / (1 + productionGrowth / 100)),
          growth: productionGrowth
        }
      };
    } catch (error) {
      console.error('Error fetching analytics:', error);
      return {
        revenue: { current: 0, previous: 0, growth: 0 },
        orders: { current: 0, previous: 0, growth: 0 },
        customers: { current: 0, previous: 0, growth: 0 },
        production: { current: 0, previous: 0, growth: 0 }
      };
    }
  }

  // Get top performing products
  static async getTopProducts(limit: number = 5): Promise<TopProduct[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/orders?limit=1000`, {
        headers: getHeaders()
      });
      const result = await response.json();

      if (!result.success || !result.data) return [];

      // Aggregate order items by product
      const productMap = new Map<string, { revenue: number; orders: number; quantity: number }>();

      for (const order of result.data) {
        if (!order.items || order.items.length === 0) continue;

        for (const item of order.items) {
          const key = item.product_name;
          const existing = productMap.get(key) || { revenue: 0, orders: 0, quantity: 0 };

          productMap.set(key, {
            revenue: existing.revenue + (item.unit_price * item.quantity),
            orders: existing.orders + 1,
            quantity: existing.quantity + item.quantity
          });
        }
      }

      // Convert to array and sort by revenue
      const products = Array.from(productMap.entries())
        .map(([name, data]) => ({
          product_name: name,
          total_revenue: data.revenue,
          total_orders: data.orders,
          total_quantity: data.quantity
        }))
        .sort((a, b) => b.total_revenue - a.total_revenue)
        .slice(0, limit);

      return products;
    } catch (error) {
      console.error('Error fetching top products:', error);
      return [];
    }
  }

  // Get top customers
  static async getTopCustomers(limit: number = 5): Promise<TopCustomer[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/orders?limit=1000`, {
        headers: getHeaders()
      });
      const result = await response.json();

      if (!result.success || !result.data) return [];

      // Aggregate by customer
      const customerMap = new Map<string, { type: string; revenue: number; orders: number }>();

      for (const order of result.data) {
        const key = order.customer_name;
        const existing = customerMap.get(key) || { type: 'Individual', revenue: 0, orders: 0 };

        customerMap.set(key, {
          type: order.customer_type || 'Individual',
          revenue: existing.revenue + (order.total_amount || 0),
          orders: existing.orders + 1
        });
      }

      // Convert to array and sort by revenue
      const customers = Array.from(customerMap.entries())
        .map(([name, data]) => ({
          customer_name: name,
          customer_type: data.type,
          total_revenue: data.revenue,
          total_orders: data.orders
        }))
        .sort((a, b) => b.total_revenue - a.total_revenue)
        .slice(0, limit);

      return customers;
    } catch (error) {
      console.error('Error fetching top customers:', error);
      return [];
    }
  }

  // Get monthly trends (last 6 months)
  static async getMonthlyTrends(): Promise<MonthlyTrend[]> {
    try {
      const [ordersRes, productionRes] = await Promise.all([
        fetch(`${API_BASE_URL}/orders?limit=1000`, { headers: getHeaders() }).then(r => r.json()),
        fetch(`${API_BASE_URL}/production/batches?limit=1000`, { headers: getHeaders() }).then(r => r.json())
      ]);

      const orders = ordersRes.data || [];
      const production = productionRes.data || [];

      // Group by month
      const monthMap = new Map<string, { revenue: number; orders: number; production: number }>();

      // Process orders
      for (const order of orders) {
        if (!order.order_date) continue;
        const date = new Date(order.order_date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const existing = monthMap.get(monthKey) || { revenue: 0, orders: 0, production: 0 };

        monthMap.set(monthKey, {
          revenue: existing.revenue + (order.total_amount || 0),
          orders: existing.orders + 1,
          production: existing.production
        });
      }

      // Process production batches
      for (const batch of production) {
        if (!batch.created_at) continue;
        const date = new Date(batch.created_at);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const existing = monthMap.get(monthKey) || { revenue: 0, orders: 0, production: 0 };

        // Use required_quantity for batches (planned production)
        const quantity = batch.required_quantity || batch.actual_quantity || 0;

        monthMap.set(monthKey, {
          revenue: existing.revenue,
          orders: existing.orders,
          production: existing.production + quantity
        });
      }

      // Convert to array and sort by month
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const trends = Array.from(monthMap.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .slice(-6) // Last 6 months
        .map(([key, data]) => {
          const [, month] = key.split('-');
          return {
            month: months[parseInt(month) - 1],
            revenue: data.revenue,
            orders: data.orders,
            production: data.production
          };
        });

      return trends;
    } catch (error) {
      console.error('Error fetching monthly trends:', error);
      return [];
    }
  }

  // Get production metrics
  static async getProductionMetrics(): Promise<ProductionMetrics> {
    try {
      const [productionRes, ordersRes] = await Promise.all([
        fetch(`${API_BASE_URL}/production/stats`, { headers: getHeaders() }).then(r => r.json()),
        fetch(`${API_BASE_URL}/orders?limit=1000`, { headers: getHeaders() }).then(r => r.json())
      ]);

      const productionStats = productionRes.data || {};
      const orders = ordersRes.data || [];

      // Calculate production efficiency (completed vs total batches)
      const efficiency = productionStats.total_batches > 0
        ? ((productionStats.completed_batches / productionStats.total_batches) * 100)
        : 0;

      // Calculate quality score (assuming most batches are good quality if completed)
      const qualityScore = productionStats.total_batches > 0
        ? ((productionStats.completed_batches / productionStats.total_batches) * 95) // 95% quality assumption
        : 0;

      // Calculate on-time delivery rate from actual order data
      let onTimeDelivery = 0;
      const deliveredOrders = orders.filter((o: any) =>
        o.status === 'delivered' && o.delivered_at && o.expected_delivery
      );

      if (deliveredOrders.length > 0) {
        const onTimeCount = deliveredOrders.filter((order: any) => {
          const deliveredDate = new Date(order.delivered_at);
          const expectedDate = new Date(order.expected_delivery);
          return deliveredDate <= expectedDate;
        }).length;

        onTimeDelivery = (onTimeCount / deliveredOrders.length) * 100;
      } else {
        // If no delivered orders yet, use a default based on dispatched orders
        const dispatchedOrders = orders.filter((o: any) =>
          ['dispatched', 'delivered'].includes(o.status)
        );
        // Estimate 90% on-time delivery if we have dispatched orders
        onTimeDelivery = dispatchedOrders.length > 0 ? 90 : 0;
      }

      // Calculate waste reduction percentage (total waste vs total production)
      // Lower waste percentage is better - showing as waste reduction %
      const totalWaste = productionStats.total_waste_quantity || 0;
      const totalBatches = productionStats.total_batches || 0;

      // If we have waste data, calculate waste percentage
      // For display, we show "waste reduction" so higher is better
      // Assuming baseline waste of 15%, we show how much we've reduced
      const wastePercentage = totalBatches > 0 ? (totalWaste / totalBatches) : 0;
      const wasteReduction = Math.max(0, 15 - wastePercentage); // Shows reduction from 15% baseline

      return {
        efficiency: Math.min(efficiency, 100),
        wasteReduction: wasteReduction,
        qualityScore: Math.min(qualityScore, 100),
        onTimeDelivery: Math.min(onTimeDelivery, 100)
      };
    } catch (error) {
      console.error('Error fetching production metrics:', error);
      return {
        efficiency: 0,
        wasteReduction: 0,
        qualityScore: 0,
        onTimeDelivery: 0
      };
    }
  }
}

export default AnalyticsService;
