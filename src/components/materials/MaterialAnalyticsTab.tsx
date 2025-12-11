import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/utils/formatHelpers';
import { TrendingUp, TrendingDown, Package, DollarSign, AlertTriangle, BarChart3 } from 'lucide-react';
import { MaterialService } from '@/services/materialService';
import { useState, useEffect } from 'react';
import type { MaterialStats } from '@/types/material';

interface MaterialAnalyticsTabProps {
  initialStats?: MaterialStats | null;
}

export default function MaterialAnalyticsTab({ initialStats }: MaterialAnalyticsTabProps = {}) {
  const [stats, setStats] = useState<MaterialStats | null>(initialStats || null);
  const [loading, setLoading] = useState(!initialStats);

  // Use initial stats if provided, otherwise load
  useEffect(() => {
    if (initialStats) {
      setStats(initialStats);
      setLoading(false);
    } else if (!stats) {
      loadAnalytics();
    }
  }, [initialStats]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const analyticsData = await MaterialService.getMaterialStats();
      setStats(analyticsData);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!stats) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No analytics data available</p>
        </CardContent>
      </Card>
    );
  }

  const inStockPercentage = stats.totalMaterials > 0 
    ? ((stats.inStock / stats.totalMaterials) * 100).toFixed(1)
    : '0';
  
  const lowStockPercentage = stats.totalMaterials > 0
    ? ((stats.lowStock / stats.totalMaterials) * 100).toFixed(1)
    : '0';

  const outOfStockPercentage = stats.totalMaterials > 0
    ? ((stats.outOfStock / stats.totalMaterials) * 100).toFixed(1)
    : '0';

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-600">Total Value</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">
                  {formatCurrency(stats.totalValue)}
                </p>
                <p className="text-xs text-gray-500 mt-1">Total inventory value</p>
              </div>
              <DollarSign className="w-8 h-8 text-green-600 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-600">Average Value</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">
                  {formatCurrency(stats.averageValue)}
                </p>
                <p className="text-xs text-gray-500 mt-1">Per material</p>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-600 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-600">Overstock Items</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.overstock}</p>
                <p className="text-xs text-gray-500 mt-1">Materials exceeding capacity</p>
              </div>
              <Package className="w-8 h-8 text-purple-600 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stock Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Stock Distribution</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* In Stock */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-sm font-medium text-gray-700">In Stock</span>
              </div>
              <div className="text-right">
                <span className="text-sm font-semibold text-gray-900">{stats.inStock}</span>
                <span className="text-xs text-gray-500 ml-2">({inStockPercentage}%)</span>
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-green-500 h-2 rounded-full transition-all"
                style={{ width: `${inStockPercentage}%` }}
              ></div>
            </div>
          </div>

          {/* Low Stock */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                <span className="text-sm font-medium text-gray-700">Low Stock</span>
              </div>
              <div className="text-right">
                <span className="text-sm font-semibold text-gray-900">{stats.lowStock}</span>
                <span className="text-xs text-gray-500 ml-2">({lowStockPercentage}%)</span>
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-orange-500 h-2 rounded-full transition-all"
                style={{ width: `${lowStockPercentage}%` }}
              ></div>
            </div>
          </div>

          {/* Out of Stock */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span className="text-sm font-medium text-gray-700">Out of Stock</span>
              </div>
              <div className="text-right">
                <span className="text-sm font-semibold text-gray-900">{stats.outOfStock}</span>
                <span className="text-xs text-gray-500 ml-2">({outOfStockPercentage}%)</span>
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-red-500 h-2 rounded-full transition-all"
                style={{ width: `${outOfStockPercentage}%` }}
              ></div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Stock Status Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Package className="w-5 h-5 text-green-600" />
                <span className="text-sm font-medium text-gray-700">In Stock</span>
              </div>
              <span className="text-lg font-bold text-green-600">{stats.inStock}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-orange-600" />
                <span className="text-sm font-medium text-gray-700">Low Stock</span>
              </div>
              <span className="text-lg font-bold text-orange-600">{stats.lowStock}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
              <div className="flex items-center gap-3">
                <TrendingDown className="w-5 h-5 text-red-600" />
                <span className="text-sm font-medium text-gray-700">Out of Stock</span>
              </div>
              <span className="text-lg font-bold text-red-600">{stats.outOfStock}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Inventory Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm font-medium text-gray-700">Total Materials</span>
              <span className="text-lg font-bold text-gray-900">{stats.totalMaterials}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm font-medium text-gray-700">Total Value</span>
              <span className="text-lg font-bold text-gray-900">
                ₹{stats.totalValue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm font-medium text-gray-700">Average Value</span>
              <span className="text-lg font-bold text-gray-900">
                ₹{stats.averageValue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm font-medium text-gray-700">Overstock Items</span>
              <span className="text-lg font-bold text-gray-900">{stats.overstock}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

