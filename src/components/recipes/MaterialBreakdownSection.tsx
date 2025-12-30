import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp } from 'lucide-react';

interface FinalMaterialBreakdown {
  material_id: string;
  material_name: string;
  total_quantity: number;
  unit: string;
  available_stock: number;
  shortage: number;
  is_available: boolean;
  sources: {
    product_name: string;
    quantity_needed: number;
    contribution: number;
  }[];
}

interface MaterialBreakdownSectionProps {
  finalBreakdown: FinalMaterialBreakdown[];
  totalMaterials: number;
  availableMaterials: number;
}

export default function MaterialBreakdownSection({
  finalBreakdown,
  totalMaterials,
  availableMaterials,
}: MaterialBreakdownSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
          <TrendingUp className="w-5 h-5" />
          Final Raw Material Breakdown
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Summary - Mobile responsive grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 mb-4 md:mb-6">
          <div className="text-center p-3 md:p-4 bg-blue-50 rounded-lg">
            <div className="text-xl md:text-2xl font-bold text-blue-600">{totalMaterials}</div>
            <div className="text-xs md:text-sm text-blue-700">Total Materials</div>
          </div>
          <div className="text-center p-3 md:p-4 bg-green-50 rounded-lg">
            <div className="text-xl md:text-2xl font-bold text-green-600">{availableMaterials}</div>
            <div className="text-xs md:text-sm text-green-700">Available</div>
          </div>
          <div className="text-center p-3 md:p-4 bg-red-50 rounded-lg">
            <div className="text-xl md:text-2xl font-bold text-red-600">
              {totalMaterials - availableMaterials}
            </div>
            <div className="text-xs md:text-sm text-red-700">Need Procurement</div>
          </div>
        </div>

        {/* Material Details - Mobile-first card layout */}
        <div className="space-y-3 md:space-y-4">
          {finalBreakdown.map((material) => (
            <div
              key={material.material_id}
              className={`border rounded-lg p-3 md:p-4 ${
                material.is_available ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-3">
                <div>
                  <h4 className="font-medium text-sm md:text-base">{material.material_name}</h4>
                  <p className="text-xs text-muted-foreground font-mono">ID: {material.material_id}</p>
                </div>
                <Badge
                  variant={material.is_available ? 'default' : 'destructive'}
                  className={material.is_available ? 'bg-green-100 text-green-800' : ''}
                >
                  {material.is_available ? 'Available' : 'Shortage'}
                </Badge>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 text-sm">
                <div>
                  <div className="text-xs text-muted-foreground">Required Qty</div>
                  <div className="font-medium">{Number(material.total_quantity).toFixed(4)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Unit</div>
                  <div className="font-medium">{material.unit}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Available Stock</div>
                  <div className="font-medium">{material.available_stock.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Shortage</div>
                  <div
                    className={`font-medium ${material.shortage > 0 ? 'text-red-600' : 'text-green-600'}`}
                  >
                    {material.shortage.toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Sources - Used in Products */}
              {material.sources.length > 0 && (
                <div className="mt-3 pt-3 border-t">
                  <div className="text-xs text-muted-foreground mb-2">Used in Products:</div>
                  <div className="flex flex-wrap gap-2">
                    {material.sources.map((source, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {source.product_name}: {source.contribution.toFixed(2)} {material.unit}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}



