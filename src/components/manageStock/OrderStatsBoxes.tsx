import { Package, DollarSign, Clock, CheckCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency } from '@/utils/formatHelpers';
import type { OrderStats } from '@/types/manageStock';

interface OrderStatsBoxesProps {
  stats: OrderStats;
  loading: boolean;
}

export default function OrderStatsBoxes({ stats, loading }: OrderStatsBoxesProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* Total Orders */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-gray-600">Total Orders</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">
                {loading ? (
                  <span className="inline-block w-12 h-8 bg-gray-200 animate-pulse rounded"></span>
                ) : (
                  stats.totalOrders.toLocaleString()
                )}
              </p>
            </div>
            <Package className="w-8 h-8 text-primary-600 opacity-50" />
          </div>
        </CardContent>
      </Card>

      {/* Total Value */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-gray-600">Total Value</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">
                {loading ? (
                  <span className="inline-block w-12 h-8 bg-gray-200 animate-pulse rounded"></span>
                ) : (
                  formatCurrency(stats.totalValue)
                )}
              </p>
            </div>
            <DollarSign className="w-8 h-8 text-green-600 opacity-50" />
          </div>
        </CardContent>
      </Card>

      {/* Pending Orders */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-gray-600">Pending</p>
              <p className="text-xl sm:text-2xl font-bold text-orange-600">
                {loading ? (
                  <span className="inline-block w-12 h-8 bg-gray-200 animate-pulse rounded"></span>
                ) : (
                  stats.pendingOrders.toLocaleString()
                )}
              </p>
            </div>
            <Clock className="w-8 h-8 text-orange-600 opacity-50" />
          </div>
        </CardContent>
      </Card>

      {/* Delivered Orders */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-gray-600">Delivered</p>
              <p className="text-xl sm:text-2xl font-bold text-green-600">
                {loading ? (
                  <span className="inline-block w-12 h-8 bg-gray-200 animate-pulse rounded"></span>
                ) : (
                  stats.deliveredOrders.toLocaleString()
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

