import { Card, CardContent } from '@/components/ui/card';
import { Building, ShoppingBag, DollarSign } from 'lucide-react';
import { formatCurrency } from '@/utils/formatHelpers';

interface SupplierStatsBoxesProps {
  total: number;
  totalOrders: number;
  totalValue: number;
}

export default function SupplierStatsBoxes({ total, totalOrders, totalValue }: SupplierStatsBoxesProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-gray-600">Total</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">{total}</p>
            </div>
            <Building className="w-8 h-8 text-blue-600 opacity-50" />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-gray-600">Orders</p>
              <p className="text-xl sm:text-2xl font-bold text-purple-600">{totalOrders}</p>
            </div>
            <ShoppingBag className="w-8 h-8 text-purple-600 opacity-50" />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-gray-600">Value</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">{formatCurrency(totalValue)}</p>
            </div>
            <DollarSign className="w-8 h-8 text-orange-600 opacity-50" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

