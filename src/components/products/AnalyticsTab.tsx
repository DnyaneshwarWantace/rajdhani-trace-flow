import { useState, useEffect } from 'react';
import { ProductService } from '@/services/productService';
import type { Product, ProductStats } from '@/types/product';
import StatCard from './analytics/StatCard';
import StatusDistributionChart from './analytics/StatusDistributionChart';
import CategoryDistributionChart from './analytics/CategoryDistributionChart';
import StockLevelChart from './analytics/StockLevelChart';
import { Package, TrendingUp, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';

interface AnalyticsTabProps {
  products: Product[];
}

export default function AnalyticsTab({ products }: AnalyticsTabProps) {
  const [stats, setStats] = useState<ProductStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await ProductService.getProductStats();
      setStats(data);
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

  // Category distribution
  const categoryMap = new Map<string, number>();
  products.forEach((product) => {
    const count = categoryMap.get(product.category) || 0;
    categoryMap.set(product.category, count + 1);
  });
  const categoryData = Array.from(categoryMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Top products by stock (for stock level chart)
  const topProductsByStock = products
    .sort((a, b) => b.current_stock - a.current_stock)
    .slice(0, 8)
    .map((product) => ({
      name: product.name.length > 15 ? product.name.substring(0, 15) + '...' : product.name,
      current: product.current_stock,
      min: product.min_stock_level,
      max: product.max_stock_level,
    }));

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

      {/* Stock Levels Chart */}
      {topProductsByStock.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:gap-6">
          <StockLevelChart data={topProductsByStock} />
        </div>
      )}

      {/* Additional Stats */}
      {stats.available_individual_products !== undefined && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard
            title="Individual Products Available"
            value={stats.available_individual_products || 0}
            icon={<TrendingUp className="w-5 h-5" />}
          />
          {stats.total_individual_products !== undefined && (
            <StatCard
              title="Total Individual Products"
              value={stats.total_individual_products || 0}
              icon={<Package className="w-5 h-5" />}
            />
          )}
          {stats.individual_tracking_products !== undefined && (
            <StatCard
              title="Products with Individual Tracking"
              value={stats.individual_tracking_products || 0}
              icon={<CheckCircle className="w-5 h-5" />}
            />
          )}
        </div>
      )}
    </div>
  );
}

