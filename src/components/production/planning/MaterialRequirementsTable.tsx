import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Truck, Plus, Trash2, AlertCircle, CheckCircle, Package } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface MaterialRequirement {
  material_id: string;
  material_name: string;
  material_type: 'raw_material' | 'product';
  quantity_per_sqm: number;
  required_quantity: number;
  available_quantity: number;
  unit: string;
  status: 'available' | 'low' | 'unavailable';
  shortage?: number;
}

interface MaterialRequirementsTableProps {
  materials: MaterialRequirement[];
  targetQuantity: number;
  totalSQM: number;
  onAddMaterial?: () => void;
  onRemoveMaterial?: (materialId: string) => void;
  onUpdateQuantity?: (materialId: string, quantityPerSqm: number) => void;
  onSelectIndividualProducts?: (materialId: string) => void;
  recipeBased?: boolean;
}

export default function MaterialRequirementsTable({
  materials,
  targetQuantity,
  totalSQM,
  onAddMaterial,
  onRemoveMaterial,
  onUpdateQuantity,
  onSelectIndividualProducts,
  recipeBased = false,
}: MaterialRequirementsTableProps) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'available':
        return (
          <Badge className="bg-green-100 text-green-700 border-green-300">
            <CheckCircle className="w-3 h-3 mr-1" />
            Available
          </Badge>
        );
      case 'low':
        return (
          <Badge className="bg-yellow-100 text-yellow-700 border-yellow-300">
            <AlertCircle className="w-3 h-3 mr-1" />
            Low Stock
          </Badge>
        );
      case 'unavailable':
        return (
          <Badge className="bg-red-100 text-red-700 border-red-300">
            <AlertCircle className="w-3 h-3 mr-1" />
            Shortage
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Truck className="w-5 h-5" />
            <CardTitle>Material Consumption</CardTitle>
            {recipeBased && (
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                Auto-calculated from recipe
              </Badge>
            )}
          </div>
          {onAddMaterial && (
            <Button onClick={onAddMaterial} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Select Materials & Products
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {recipeBased && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-green-700">
              Materials calculated for {targetQuantity} units ({totalSQM.toFixed(2)} sqm total) based on recipe with base quantity 1 for 1 sqm
            </p>
          </div>
        )}

        {materials.length === 0 ? (
          <div className="text-center py-12">
            <Truck className="w-12 h-12 mx-auto text-gray-400 mb-3" />
            <p className="text-gray-600 mb-1">No materials consumed yet</p>
            <p className="text-sm text-gray-500">Click "Select Materials" to start tracking</p>
          </div>
        ) : (
          <>
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-medium text-gray-900">Material Requirements</h3>
                {recipeBased && (
                  <Badge variant="outline" className="text-xs">
                    Recipe-based
                  </Badge>
                )}
              </div>
            </div>

            <div className="space-y-4">
              {materials.map((material, index) => {
                const sqmPerProduct = totalSQM / targetQuantity;

                // For products: quantity_per_sqm is actually pieces per SQM, not a rate
                // For raw materials: quantity_per_sqm is kg/m/etc per SQM
                const quantityPerProduct = material.quantity_per_sqm * sqmPerProduct;

                // Use a unique key combining material_id and index to handle duplicates
                const uniqueKey = `${material.material_id}-${index}`;

                return (
                  <div
                    key={uniqueKey}
                    className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold text-gray-900 text-base">{material.material_name}</h4>
                          <Badge variant="outline" className="text-xs">
                            {material.material_type === 'product' ? 'Product' : 'Raw Material'}
                          </Badge>
                          {getStatusBadge(material.status)}
                        </div>
                        <p className="text-xs text-gray-500">
                          {recipeBased ? 'From Recipe' : 'Manual Entry'} • Type: {material.material_type} • ID: {material.material_id}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {material.material_type === 'product' && onSelectIndividualProducts && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onSelectIndividualProducts(material.material_id)}
                            className="text-blue-600 border-blue-300 hover:bg-blue-50"
                          >
                            <Package className="w-4 h-4 mr-2" />
                            Select Individual Products
                          </Button>
                        )}
                        {onRemoveMaterial && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onRemoveMaterial(material.material_id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Detailed breakdown */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                      <h5 className="text-xs font-semibold text-blue-900 mb-2">Quantity Breakdown</h5>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                        <div className="bg-white rounded p-2">
                          <p className="text-gray-500 mb-1">
                            {material.material_type === 'product' ? 'Per 1 SQM of Parent' : 'Per 1 SQM'}
                          </p>
                          <p className="font-semibold text-gray-900">
                            {material.quantity_per_sqm} {material.unit}
                          </p>
                          {material.material_type === 'product' && (
                            <p className="text-blue-600 text-xs font-medium mt-1">
                              ({material.quantity_per_sqm} {material.unit} needed)
                            </p>
                          )}
                        </div>
                        <div className="bg-white rounded p-2">
                          <p className="text-gray-500 mb-1">Per 1 Product</p>
                          <p className="font-semibold text-gray-900">
                            {quantityPerProduct.toFixed(2)} {material.unit}
                          </p>
                          <p className="text-gray-400 text-xs">({sqmPerProduct.toFixed(2)} sqm/product)</p>
                        </div>
                        <div className="bg-white rounded p-2">
                          <p className="text-gray-500 mb-1">For {targetQuantity} Products</p>
                          <p className="font-semibold text-blue-700">
                            {material.required_quantity.toFixed(2)} {material.unit}
                          </p>
                          <p className="text-gray-400 text-xs">({totalSQM.toFixed(2)} sqm total)</p>
                        </div>
                        <div className="bg-white rounded p-2">
                          <p className="text-gray-500 mb-1">Available Stock</p>
                          <p className={`font-semibold ${
                            material.status === 'available' ? 'text-green-700' :
                            material.status === 'low' ? 'text-yellow-700' : 'text-red-700'
                          }`}>
                            {material.available_quantity} {material.unit}
                          </p>
                          {material.shortage && material.shortage > 0 && (
                            <p className="text-red-600 text-xs font-medium">
                              Short: {material.shortage.toFixed(2)} {material.unit}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Editable quantity per SQM */}
                    <div className="grid grid-cols-1 gap-3">
                      <div>
                        <label className="text-xs font-medium text-gray-700 block mb-2">
                          Adjust Quantity Per SQM (Base Quantity)
                        </label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            step="0.01"
                            value={material.quantity_per_sqm}
                            onChange={(e) =>
                              onUpdateQuantity &&
                              onUpdateQuantity(material.material_id, parseFloat(e.target.value) || 0)
                            }
                            className="text-sm max-w-[200px]"
                          />
                          <span className="text-sm text-gray-600">{material.unit} per SQM</span>
                          <span className="text-xs text-gray-400 ml-2">
                            (Changing this will auto-recalculate all quantities above)
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
