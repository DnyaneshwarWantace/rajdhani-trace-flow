import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package } from 'lucide-react';
import { formatIndianNumberWithDecimals } from '@/utils/formatHelpers';
import { TruncatedText } from '@/components/ui/TruncatedText';
import { formatIndianDateTime } from '@/utils/formatHelpers';

interface MaterialConsumption {
  id: string;
  material_id: string;
  material_name: string;
  quantity_used: number;
  unit: string;
  consumed_at: string;
}

interface ProductionDetailMaterialsProps {
  materials: MaterialConsumption[];
}

export default function ProductionDetailMaterials({ materials }: ProductionDetailMaterialsProps) {
  if (!materials || materials.length === 0) {
    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">Material Consumption</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 text-center py-4">No material consumption recorded</p>
        </CardContent>
      </Card>
    );
  }

  const totalQuantity = materials.reduce((sum, m) => sum + m.quantity_used, 0);

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-lg sm:text-xl">Material Consumption</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4 p-3 bg-primary-50 rounded-lg border border-primary-200">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-primary-900">Total Materials Used</span>
            <span className="text-lg font-bold text-primary-700">
              {formatIndianNumberWithDecimals(totalQuantity, 2)}
            </span>
          </div>
        </div>
        <div className="space-y-3">
          {materials.map((material) => (
            <div
              key={material.id}
              className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200"
            >
              <div className="flex-shrink-0 mt-0.5">
                <Package className="w-5 h-5 text-primary-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-semibold text-gray-900">
                    <TruncatedText text={material.material_name} maxLength={40} />
                  </h4>
                  <span className="text-sm font-bold text-primary-600">
                    {formatIndianNumberWithDecimals(material.quantity_used, 2)} {material.unit}
                  </span>
                </div>
                <div className="text-xs text-gray-500">
                  Consumed: {formatIndianDateTime(material.consumed_at)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}


