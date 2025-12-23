import { useState, useEffect } from 'react';
import { ProductService } from '@/services/productService';
import { AnalyticsService } from '@/services/analyticsService';
import type { Product, ProductStats } from '@/types/product';
import type { MonthlyDemand, ProducedProduct, MonthlySales, MonthlyProduction } from '@/services/analyticsService';
import StatCard from './analytics/StatCard';
import StatusDistributionChart from './analytics/StatusDistributionChart';
import CategoryDistributionChart from './analytics/CategoryDistributionChart';
import MostProducedChart from './analytics/MostProducedChart';
import MonthlySalesChart from './analytics/MonthlySalesChart';
import MonthlyProductionChart from './analytics/MonthlyProductionChart';
import TopDemandChart from './analytics/TopDemandChart';
import TopProductsTable from './analytics/TopProductsTable';
import { Package, TrendingUp, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';

interface AnalyticsTabProps {
  products: Product[];
}

export default function AnalyticsTab({ products: _products }: AnalyticsTabProps) {
  const [stats, setStats] = useState<ProductStats | null>(null);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [monthlyDemand, setMonthlyDemand] = useState<MonthlyDemand[]>([]);
  const [mostProduced, setMostProduced] = useState<ProducedProduct[]>([]);
  const [monthlySales, setMonthlySales] = useState<MonthlySales[]>([]);
  const [monthlyProduction, setMonthlyProduction] = useState<MonthlyProduction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAnalyticsData();
  }, []);

  const loadAnalyticsData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all analytics data in parallel
      const [
        statsData,
        productsData,
        demandData,
        producedData,
        salesData,
        productionData
      ] = await Promise.all([
        ProductService.getProductStats(),
        ProductService.getProducts({ limit: 10000 }),
        AnalyticsService.getProductDemandByMonth(6),
        AnalyticsService.getMostProducedProducts(10),
        AnalyticsService.getMonthlySalesAnalytics(12),
        AnalyticsService.getMonthlyProductionAnalytics(12)
      ]);

      setStats(statsData);
      setAllProducts(productsData.products || []);
      setMonthlyDemand(demandData);
      setMostProduced(producedData);
      setMonthlySales(salesData);
      setMonthlyProduction(productionData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
      console.error('Error loading analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  // Prepare chart data
  const statusDistributionData = stats
    ? [
        {
          name: 'In Stock',
          value: stats.total_products - (stats.low_stock_products || 0) - (stats.out_of_stock_products || 0),
          color: '#10b981',
        },
        {
          name: 'Low Stock',
          value: stats.low_stock_products || 0,
          color: '#f59e0b',
        },
        {
          name: 'Out of Stock',
          value: stats.out_of_stock_products || 0,
          color: '#ef4444',
        },
      ].filter((item) => item.value > 0)
    : [];

  // Category distribution - use all products
  const categoryMap = new Map<string, number>();
  allProducts.forEach((product) => {
    const count = categoryMap.get(product.category) || 0;
    categoryMap.set(product.category, count + 1);
  });
  const categoryData = Array.from(categoryMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <p className="text-red-800">{error}</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">No analytics data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Key Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Products"
          value={stats.total_products || 0}
          icon={<Package className="w-5 h-5" />}
        />
        <StatCard
          title="In Stock"
          value={
            (stats.total_products || 0) -
            (stats.low_stock_products || 0) -
            (stats.out_of_stock_products || 0)
          }
          icon={<CheckCircle className="w-5 h-5" />}
        />
        <StatCard
          title="Low Stock Alerts"
          value={stats.low_stock_products || 0}
          icon={<AlertTriangle className="w-5 h-5" />}
        />
        <StatCard
          title="Out of Stock"
          value={stats.out_of_stock_products || 0}
          icon={<AlertTriangle className="w-5 h-5" />}
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Status Distribution */}
        {statusDistributionData.length > 0 && (
          <StatusDistributionChart data={statusDistributionData} title="Stock Status Distribution" />
        )}

        {/* Category Distribution */}
        {categoryData.length > 0 && <CategoryDistributionChart data={categoryData} />}
      </div>

      {/* Individual Product Status Analytics */}
      {stats.available_individual_products !== undefined && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Individual Product Status</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <StatCard
              title="Available"
              value={stats.available_individual_products || 0}
              icon={<CheckCircle className="w-5 h-5" />}
            />
            <StatCard
              title="In Production"
              value={stats.in_production_individual_products || 0}
              icon={<Package className="w-5 h-5" />}
            />
            <StatCard
              title="Consumed"
              value={stats.consumed_individual_products || 0}
              icon={<Package className="w-5 h-5" />}
            />
            <StatCard
              title="Used"
              value={stats.used_individual_products || 0}
              icon={<Package className="w-5 h-5" />}
            />
            <StatCard
              title="Sold"
              value={stats.sold_individual_products || 0}
              icon={<TrendingUp className="w-5 h-5" />}
            />
            <StatCard
              title="Damaged"
              value={stats.damaged_individual_products || 0}
              icon={<AlertTriangle className="w-5 h-5" />}
            />
          </div>
        </div>
      )}

      {/* Additional Stats */}
      {stats.total_individual_products !== undefined && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard
            title="Total Individual Products"
            value={stats.total_individual_products || 0}
            icon={<Package className="w-5 h-5" />}
          />
          {stats.individual_tracking_products !== undefined && (
            <StatCard
              title="Products with Individual Tracking"
              value={stats.individual_tracking_products || 0}
              icon={<CheckCircle className="w-5 h-5" />}
            />
          )}
        </div>
      )}

      {/* Top Products Table */}
      {(mostProduced.length > 0 || monthlyDemand.length > 0) && (
        <TopProductsTable demandData={monthlyDemand} producedData={mostProduced} />
      )}

      {/* Demand & Production Analytics */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Demand & Production Analytics</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Monthly Sales Trend */}
          {monthlySales.length > 0 && <MonthlySalesChart data={monthlySales} />}

          {/* Monthly Production Trend */}
          {monthlyProduction.length > 0 && <MonthlyProductionChart data={monthlyProduction} />}

          {/* Top Products by Demand */}
          {monthlyDemand.length > 0 && <TopDemandChart data={monthlyDemand} />}

          {/* Most Produced Products */}
          {mostProduced.length > 0 && <MostProducedChart data={mostProduced} />}
        </div>
      </div>
    </div>
  );
}

