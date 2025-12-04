import { Card, CardContent } from '@/components/ui/card';
import { Box, AlertTriangle, XCircle } from 'lucide-react';

interface MaterialStatsBoxesProps {
  totalMaterials: number;
  lowStockAlerts: number;
  outOfStock: number;
  loading: boolean;
}

export default function MaterialStatsBoxes({
  totalMaterials,
  lowStockAlerts,
  outOfStock,
  loading,
}: MaterialStatsBoxesProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
      {/* Total Materials */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-gray-600">Total Materials</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">
                {loading ? (
                  <span className="inline-block w-12 h-8 bg-gray-200 animate-pulse rounded"></span>
                ) : (
                  totalMaterials.toLocaleString()
                )}
              </p>
            </div>
            <Box className="w-8 h-8 text-blue-600 opacity-50" />
          </div>
        </CardContent>
      </Card>

      {/* Low Stock Alerts */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-gray-600">Low Stock Alerts</p>
              <p className="text-xl sm:text-2xl font-bold text-orange-600">
                {loading ? (
                  <span className="inline-block w-12 h-8 bg-gray-200 animate-pulse rounded"></span>
                ) : (
                  lowStockAlerts.toLocaleString()
                )}
              </p>
            </div>
            <AlertTriangle className="w-8 h-8 text-orange-600 opacity-50" />
          </div>
        </CardContent>
      </Card>

      {/* Out of Stock */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-gray-600">Out of Stock</p>
              <p className="text-xl sm:text-2xl font-bold text-red-600">
                {loading ? (
                  <span className="inline-block w-12 h-8 bg-gray-200 animate-pulse rounded"></span>
                ) : (
                  outOfStock.toLocaleString()
                )}
              </p>
            </div>
            <XCircle className="w-8 h-8 text-red-600 opacity-50" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

