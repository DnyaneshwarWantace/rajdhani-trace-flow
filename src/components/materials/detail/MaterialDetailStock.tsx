import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { formatIndianNumberWithDecimals } from '@/utils/formatHelpers';
import type { RawMaterial } from '@/types/material';

interface MaterialDetailStockProps {
  material: RawMaterial;
}

export default function MaterialDetailStock({ material }: MaterialDetailStockProps) {
  const stockPercentage = material.max_capacity > 0 
    ? (material.current_stock / material.max_capacity) * 100 
    : 0;

  // const reorderPercentage = material.max_capacity > 0
  //   ? (material.reorder_point / material.max_capacity) * 100
  //   : 0;

  const getStockStatus = () => {
    if (material.current_stock === 0) {
      return {
        icon: AlertTriangle,
        message: 'Out of stock - Immediate action required',
        color: 'text-red-600',
        bgColor: 'bg-red-50 border-red-200',
      };
    }
    if (material.current_stock < material.min_threshold) {
      return {
        icon: AlertTriangle,
        message: 'Low stock - Reorder soon',
        color: 'text-orange-600',
        bgColor: 'bg-orange-50 border-orange-200',
      };
    }
    if (material.current_stock >= material.reorder_point && material.current_stock < material.max_capacity) {
      return {
        icon: CheckCircle,
        message: 'Stock level is healthy',
        color: 'text-green-600',
        bgColor: 'bg-green-50 border-green-200',
      };
    }
    if (material.current_stock >= material.max_capacity) {
      return {
        icon: Info,
        message: 'Overstock - Above maximum capacity',
        color: 'text-blue-600',
        bgColor: 'bg-blue-50 border-blue-200',
      };
    }
    return {
      icon: Info,
      message: 'Stock level is normal',
      color: 'text-gray-600',
      bgColor: 'bg-gray-50 border-gray-200',
    };
  };

  const status = getStockStatus();
  const StatusIcon = status.icon;

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-lg sm:text-xl">Stock Levels</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Stock Status Alert */}
        <div className={`p-4 rounded-lg border ${status.bgColor}`}>
          <div className="flex items-start gap-3">
            <StatusIcon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${status.color}`} />
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium ${status.color}`}>
                {status.message}
              </p>
            </div>
          </div>
        </div>

        {/* Stock Progress Bar */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Current Stock</span>
            <span className="font-semibold text-gray-900">
              {formatIndianNumberWithDecimals(material.current_stock, 2)} {material.unit}
            </span>
          </div>
          <Progress value={stockPercentage} className="h-3" />
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>0 {material.unit}</span>
            <span>{formatIndianNumberWithDecimals(material.max_capacity, 2)} {material.unit}</span>
          </div>
        </div>

        {/* Stock Levels Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-gray-200">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-600 mb-1">Minimum Threshold</p>
            <p className="text-lg font-bold text-gray-900">
              {formatIndianNumberWithDecimals(material.min_threshold, 2)}
            </p>
            <p className="text-xs text-gray-500">{material.unit}</p>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-600 mb-1">Reorder Point</p>
            <p className="text-lg font-bold text-gray-900">
              {formatIndianNumberWithDecimals(material.reorder_point, 2)}
            </p>
            <p className="text-xs text-gray-500">{material.unit}</p>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-600 mb-1">Maximum Capacity</p>
            <p className="text-lg font-bold text-gray-900">
              {formatIndianNumberWithDecimals(material.max_capacity, 2)}
            </p>
            <p className="text-xs text-gray-500">{material.unit}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

