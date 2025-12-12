import { Card, CardContent } from '@/components/ui/card';
import { User, Building, DollarSign, Users } from 'lucide-react';
import { formatCurrency } from '@/utils/formatHelpers';

interface CustomerStatsBoxesProps {
  total: number;
  business: number;
  individual: number;
  totalRevenue: number;
}

export default function CustomerStatsBoxes({ total, business, individual, totalRevenue }: CustomerStatsBoxesProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-gray-600">Total</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">{total}</p>
            </div>
            <Users className="w-8 h-8 text-blue-600 opacity-50" />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-gray-600">Business</p>
              <p className="text-xl sm:text-2xl font-bold text-purple-600">{business}</p>
            </div>
            <Building className="w-8 h-8 text-purple-600 opacity-50" />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-gray-600">Individual</p>
              <p className="text-xl sm:text-2xl font-bold text-green-600">{individual}</p>
            </div>
            <User className="w-8 h-8 text-green-600 opacity-50" />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-gray-600">Revenue</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">{formatCurrency(totalRevenue)}</p>
            </div>
            <DollarSign className="w-8 h-8 text-orange-600 opacity-50" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

