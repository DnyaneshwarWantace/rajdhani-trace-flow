import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Package, Factory } from 'lucide-react';
import { TruncatedText } from '@/components/ui/TruncatedText';

interface MaterialConsumptionSectionProps {
  batchId: string;
  materialConsumption: any[];
  onUpdate: () => void;
}

export default function MaterialConsumptionSection({
  materialConsumption,
}: MaterialConsumptionSectionProps) {
  // Group by material type
  const products = materialConsumption.filter((m) => m.material_type === 'product');
  const rawMaterials = materialConsumption.filter((m) => m.material_type === 'raw_material');

  const getTotalQuantity = (items: any[]) => {
    return items.reduce((sum, item) => sum + (item.quantity_used || 0), 0);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Factory className="w-5 h-5" />
          Material Consumption
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Products */}
        {products.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Package className="w-4 h-4" />
                Products ({products.length})
              </h4>
              <Badge variant="outline" className="text-xs">
                {getTotalQuantity(products).toFixed(2)} total
              </Badge>
            </div>
            <div className="space-y-2">
              {products.map((item) => (
                <div
                  key={item.id}
                  className="p-3 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <div className="flex items-start justify-between mb-1">
                    <div className="flex-1 min-w-0">
                      <TruncatedText
                        text={item.material_name || 'Unknown Product'}
                        maxLength={30}
                        className="font-medium text-sm text-gray-900"
                      />
                      <p className="text-xs text-gray-500 font-mono mt-1">
                        {item.material_id}
                      </p>
                    </div>
                    <div className="text-right ml-2">
                      <div className="font-semibold text-sm text-gray-900">
                        {item.quantity_used || 0}
                      </div>
                      <div className="text-xs text-gray-500">{item.unit || 'units'}</div>
                    </div>
                  </div>
                  {item.actual_consumed_quantity && item.actual_consumed_quantity !== item.quantity_used && (
                    <div className="text-xs text-gray-600 mt-1">
                      Actual: {item.actual_consumed_quantity.toFixed(2)} {item.unit}
                    </div>
                  )}
                  {item.individual_product_ids && item.individual_product_ids.length > 0 && (
                    <div className="text-xs text-gray-600 mt-1">
                      {item.individual_product_ids.length} individual product(s) selected
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Raw Materials */}
        {rawMaterials.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Factory className="w-4 h-4" />
                Raw Materials ({rawMaterials.length})
              </h4>
              <Badge variant="outline" className="text-xs">
                {getTotalQuantity(rawMaterials).toFixed(2)} total
              </Badge>
            </div>
            <div className="space-y-2">
              {rawMaterials.map((item) => (
                <div
                  key={item.id}
                  className="p-3 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <div className="flex items-start justify-between mb-1">
                    <div className="flex-1 min-w-0">
                      <TruncatedText
                        text={item.material_name || 'Unknown Material'}
                        maxLength={30}
                        className="font-medium text-sm text-gray-900"
                      />
                      <p className="text-xs text-gray-500 font-mono mt-1">
                        {item.material_id}
                      </p>
                    </div>
                    <div className="text-right ml-2">
                      <div className="font-semibold text-sm text-gray-900">
                        {item.quantity_used || 0}
                      </div>
                      <div className="text-xs text-gray-500">{item.unit || 'units'}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {materialConsumption.length === 0 && (
          <p className="text-sm text-gray-600 text-center py-4">
            No material consumption records found
          </p>
        )}
      </CardContent>
    </Card>
  );
}

