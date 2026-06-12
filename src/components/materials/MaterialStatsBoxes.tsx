import { Card, CardContent } from '@/components/ui/card';
import { Box, CheckCircle, AlertTriangle, XCircle, PackagePlus } from 'lucide-react';

interface MaterialStatsBoxesProps {
  totalMaterials: number;
  inStock: number;
  lowStockAlerts: number;
  outOfStock: number;
  overstock: number;
  loading: boolean;
  totalLabel?: string;
}

export default function MaterialStatsBoxes({
  totalMaterials,
  inStock,
  lowStockAlerts,
  outOfStock,
  overstock,
  loading,
  totalLabel = 'Total Materials',
}: MaterialStatsBoxesProps) {
  return (
    <>
      {/* Mobile: single white card with 5 columns — matches Order page stats strip */}
      <div className="lg:hidden mb-4 flex border border-gray-200 rounded-xl overflow-hidden bg-white text-center">
        {[
          { label: 'Total', value: totalMaterials, color: 'text-gray-900' },
          { label: 'In Stock', value: inStock, color: 'text-green-600' },
          { label: 'Low', value: lowStockAlerts, color: 'text-orange-500' },
          { label: 'Out', value: outOfStock, color: 'text-red-600' },
          { label: 'Overstock', value: overstock, color: 'text-purple-600' },
        ].map((s, i) => (
          <div
            key={s.label}
            className={`flex-1 flex flex-col items-center py-2 ${i > 0 ? 'border-l border-gray-200' : ''}`}
          >
            <span className={`text-sm font-extrabold tracking-tight ${s.color}`}>
              {loading ? (
                <span className="inline-block w-5 h-4 bg-gray-200 animate-pulse rounded" />
              ) : (
                s.value
              )}
            </span>
            <span className="text-[9px] text-gray-400 font-medium mt-0.5 uppercase tracking-wide">
              {s.label}
            </span>
          </div>
        ))}
      </div>

      {/* Desktop: 5-column grid */}
      <div className="hidden lg:grid grid-cols-5 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-600">{totalLabel}</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">
                  {loading ? <span className="inline-block w-12 h-8 bg-gray-200 animate-pulse rounded" /> : totalMaterials.toLocaleString()}
                </p>
              </div>
              <Box className="w-8 h-8 text-blue-600 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-600">In Stock</p>
                <p className="text-xl sm:text-2xl font-bold text-green-600">
                  {loading ? <span className="inline-block w-12 h-8 bg-gray-200 animate-pulse rounded" /> : inStock.toLocaleString()}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-600">Low Stock Alerts</p>
                <p className="text-xl sm:text-2xl font-bold text-orange-600">
                  {loading ? <span className="inline-block w-12 h-8 bg-gray-200 animate-pulse rounded" /> : lowStockAlerts.toLocaleString()}
                </p>
              </div>
              <AlertTriangle className="w-8 h-8 text-orange-600 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-600">Out of Stock</p>
                <p className="text-xl sm:text-2xl font-bold text-red-600">
                  {loading ? <span className="inline-block w-12 h-8 bg-gray-200 animate-pulse rounded" /> : outOfStock.toLocaleString()}
                </p>
              </div>
              <XCircle className="w-8 h-8 text-red-600 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-600">Overstock</p>
                <p className="text-xl sm:text-2xl font-bold text-blue-600">
                  {loading ? <span className="inline-block w-12 h-8 bg-gray-200 animate-pulse rounded" /> : overstock.toLocaleString()}
                </p>
              </div>
              <PackagePlus className="w-8 h-8 text-blue-600 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
