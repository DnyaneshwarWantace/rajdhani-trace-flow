import { Card, CardContent } from '@/components/ui/card';
import { Package, AlertTriangle, TrendingUp, DollarSign } from 'lucide-react';
import { formatIndianNumberWithDecimals, formatCurrency } from '@/utils/formatHelpers';
import type { RawMaterial } from '@/types/material';

interface MaterialDetailStatsProps {
  material: RawMaterial;
}

export default function MaterialDetailStats({ material }: MaterialDetailStatsProps) {
  const stockPercentage = material.max_capacity > 0 
    ? (material.current_stock / material.max_capacity) * 100 
    : 0;

  const getStockColor = () => {
    if (material.status === 'out-of-stock') return 'bg-red-500';
    if (material.status === 'low-stock') return 'bg-orange-500';
    if (material.status === 'overstock') return 'bg-blue-500';
    return 'bg-green-500';
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <Card>
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm text-gray-600 mb-1">Current Stock</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">
                {formatIndianNumberWithDecimals(material.current_stock, 2)}
              </p>
              <p className="text-xs text-gray-500 mt-1">{material.unit}</p>
            </div>
            <div className="flex-shrink-0 ml-4">
              <Package className="w-8 h-8 sm:w-10 sm:h-10 text-blue-600 opacity-50" />
            </div>
          </div>
          <div className="mt-3">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${getStockColor()}`}
                style={{ width: `${Math.min(stockPercentage, 100)}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {stockPercentage.toFixed(1)}% of max capacity
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm text-gray-600 mb-1">Threshold</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">
                {formatIndianNumberWithDecimals(material.min_threshold, 2)}
              </p>
              <p className="text-xs text-gray-500 mt-1">Min / {formatIndianNumberWithDecimals(material.max_capacity, 2)} Max</p>
            </div>
            <div className="flex-shrink-0 ml-4">
              <AlertTriangle className="w-8 h-8 sm:w-10 sm:h-10 text-orange-600 opacity-50" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm text-gray-600 mb-1">Total Value</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">
                {formatCurrency(material.total_value)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {formatCurrency(material.cost_per_unit)} per {material.unit}
              </p>
            </div>
            <div className="flex-shrink-0 ml-4">
              <DollarSign className="w-8 h-8 sm:w-10 sm:h-10 text-green-600 opacity-50" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm text-gray-600 mb-1">Daily Usage</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">
                {formatIndianNumberWithDecimals(material.daily_usage || 0, 2)}
              </p>
              <p className="text-xs text-gray-500 mt-1">{material.unit} per day</p>
            </div>
            <div className="flex-shrink-0 ml-4">
              <TrendingUp className="w-8 h-8 sm:w-10 sm:h-10 text-purple-600 opacity-50" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

