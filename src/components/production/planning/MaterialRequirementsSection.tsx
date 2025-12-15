import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface MaterialRequirement {
  material_id: string;
  material_name: string;
  required_quantity: number;
  available_quantity: number;
  unit: string;
  status: 'available' | 'low' | 'unavailable';
}

interface MaterialRequirementsSectionProps {
  materials: MaterialRequirement[];
  loading?: boolean;
}

export default function MaterialRequirementsSection({ 
  materials, 
  loading = false 
}: MaterialRequirementsSectionProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Package className="w-5 h-5" />
            Material Requirements
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <Package className="w-8 h-8 mx-auto mb-2 opacity-50 animate-pulse" />
            <p className="text-sm">Loading material requirements...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (materials.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Package className="w-5 h-5" />
            Material Requirements
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No material requirements found</p>
            <p className="text-xs text-gray-400 mt-1">Materials will be calculated based on recipe</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const availableCount = materials.filter(m => m.status === 'available').length;
  const lowCount = materials.filter(m => m.status === 'low').length;
  const unavailableCount = materials.filter(m => m.status === 'unavailable').length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Package className="w-5 h-5" />
          Material Requirements
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-xl font-bold text-green-600">{availableCount}</div>
            <div className="text-xs text-green-700">Available</div>
          </div>
          <div className="text-center p-3 bg-yellow-50 rounded-lg">
            <div className="text-xl font-bold text-yellow-600">{lowCount}</div>
            <div className="text-xs text-yellow-700">Low Stock</div>
          </div>
          <div className="text-center p-3 bg-red-50 rounded-lg">
            <div className="text-xl font-bold text-red-600">{unavailableCount}</div>
            <div className="text-xs text-red-700">Unavailable</div>
          </div>
        </div>

        {/* Material List */}
        <div className="space-y-2">
          {materials.map((material) => (
            <div
              key={material.material_id}
              className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-medium text-gray-900 truncate">
                    {material.material_name}
                  </p>
                  {material.status === 'available' && (
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Available
                    </Badge>
                  )}
                  {material.status === 'low' && (
                    <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      Low Stock
                    </Badge>
                  )}
                  {material.status === 'unavailable' && (
                    <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                      <XCircle className="w-3 h-3 mr-1" />
                      Unavailable
                    </Badge>
                  )}
                </div>
                <div className="text-sm text-gray-600">
                  Required: <span className="font-medium">{material.required_quantity}</span> {material.unit}
                  {material.available_quantity !== undefined && (
                    <>
                      {' • '}
                      Available: <span className="font-medium">{material.available_quantity}</span> {material.unit}
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

