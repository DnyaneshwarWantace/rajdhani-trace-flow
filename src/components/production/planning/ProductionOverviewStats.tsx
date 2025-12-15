import { Card } from '@/components/ui/card';
import { Package, Boxes, Ruler, Weight, Factory } from 'lucide-react';

interface ProductionOverviewStatsProps {
  targetQuantity: number;
  unit: string;
  materialsUsed: number;
  expectedLength?: number;
  expectedWidth?: number;
  expectedWeight?: number;
}

export default function ProductionOverviewStats({
  targetQuantity,
  unit,
  materialsUsed,
  expectedLength,
  expectedWidth,
  expectedWeight,
}: ProductionOverviewStatsProps) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-4">
        <Factory className="w-6 h-6 text-primary-600" />
        <h2 className="text-xl font-bold text-gray-900">Production Overview</h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Target Quantity */}
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Package className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-600">{targetQuantity}</p>
              <p className="text-sm text-gray-600">{unit}</p>
            </div>
          </div>
          <p className="text-sm font-medium text-gray-700 mt-2">Target Quantity</p>
        </Card>

        {/* Materials Used */}
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 rounded-lg">
              <Boxes className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">{materialsUsed}</p>
              <p className="text-sm text-gray-600">Materials Used</p>
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-2">{materialsUsed} selected</p>
        </Card>

        {/* Expected Length */}
        {expectedLength && (
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Ruler className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-600">{expectedLength}</p>
                <p className="text-sm text-gray-600">Expected Length</p>
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-2">{expectedWidth || 0} width</p>
          </Card>
        )}

        {/* Expected Weight */}
        {expectedWeight && (
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-orange-100 rounded-lg">
                <Weight className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-orange-600">{expectedWeight}</p>
                <p className="text-sm text-gray-600">Expected Weight</p>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
