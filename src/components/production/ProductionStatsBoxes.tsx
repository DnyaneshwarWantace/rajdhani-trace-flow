import { Card, CardContent } from '@/components/ui/card';
import { Package, Calendar, PlayCircle, CheckCircle } from 'lucide-react';

interface ProductionStatsBoxesProps {
  all: number;
  planned: number;
  active: number;
  completed: number;
}

export default function ProductionStatsBoxes({ all, planned, active, completed }: ProductionStatsBoxesProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-gray-600">All</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">{all}</p>
            </div>
            <Package className="w-8 h-8 text-blue-600 opacity-50" />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-gray-600">Planned</p>
              <p className="text-xl sm:text-2xl font-bold text-yellow-600">{planned}</p>
            </div>
            <Calendar className="w-8 h-8 text-yellow-600 opacity-50" />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-gray-600">Active</p>
              <p className="text-xl sm:text-2xl font-bold text-primary-600">{active}</p>
            </div>
            <PlayCircle className="w-8 h-8 text-primary-600 opacity-50" />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-gray-600">Completed</p>
              <p className="text-xl sm:text-2xl font-bold text-green-600">{completed}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-600 opacity-50" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

