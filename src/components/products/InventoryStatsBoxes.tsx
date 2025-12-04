import { Card, CardContent } from '@/components/ui/card';
import { Package, AlertTriangle, CheckCircle } from 'lucide-react';

interface InventoryStatsBoxesProps {
  totalProducts: number;
  lowStockAlerts: number;
  availablePieces: number;
  loading: boolean;
}

export default function InventoryStatsBoxes({
  totalProducts,
  lowStockAlerts,
  availablePieces,
  loading,
}: InventoryStatsBoxesProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
      {/* Total Products */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-gray-600">Total Products</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">
                {loading ? (
                  <span className="inline-block w-12 h-8 bg-gray-200 animate-pulse rounded"></span>
                ) : (
                  totalProducts.toLocaleString()
                )}
              </p>
            </div>
            <Package className="w-8 h-8 text-blue-600 opacity-50" />
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

      {/* Available Pieces */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-gray-600">Available Pieces</p>
              <p className="text-xl sm:text-2xl font-bold text-green-600">
                {loading ? (
                  <span className="inline-block w-12 h-8 bg-gray-200 animate-pulse rounded"></span>
                ) : (
                  availablePieces.toLocaleString()
                )}
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-600 opacity-50" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

