import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Truck, CheckCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { Product } from '@/types/product';
import { calculateSQM } from '@/utils/sqmCalculator';

interface ConsumedMaterial {
  material_id: string;
  material_name: string;
  material_type: 'raw_material' | 'product';
  quantity_per_sqm: number;
  required_quantity: number;
  actual_consumed_quantity?: number;
  whole_product_count?: number;
  unit: string;
  individual_product_ids?: string[];
  individual_products?: Array<{
    id: string;
    qr_code: string;
    serial_number: string;
    product_name: string;
    status: string;
    length?: string;
    width?: string;
    weight?: string;
    color?: string;
    pattern?: string;
  }>;
}

interface ConsumedMaterialsDisplayProps {
  materials: ConsumedMaterial[];
  product: Product | null;
  targetQuantity: number;
}

export default function ConsumedMaterialsDisplay({
  materials,
  product,
  targetQuantity,
}: ConsumedMaterialsDisplayProps) {
  const getStatusBadge = () => {
    // For consumed materials, they're already used, so show as completed
    return (
      <Badge className="bg-green-100 text-green-700 border-green-300">
        <CheckCircle className="w-3 h-3 mr-1" />
        Consumed
      </Badge>
    );
  };

  const calculateTotalSQM = () => {
    if (!product) return 0;
    const productLength = parseFloat(product.length || '0');
    const productWidth = parseFloat(product.width || '0');
    const lengthUnit = product.length_unit || 'm';
    const widthUnit = product.width_unit || 'm';
    const sqmPerUnit = calculateSQM(productLength, productWidth, lengthUnit, widthUnit);
    return targetQuantity * sqmPerUnit;
  };

  const totalSQM = calculateTotalSQM();
  const sqmPerProduct = totalSQM / targetQuantity;

  if (materials.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Truck className="w-5 h-5" />
            <CardTitle>Material Consumption</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <Truck className="w-12 h-12 mx-auto text-gray-400 mb-3" />
            <p className="text-gray-600 mb-1">No materials consumed yet</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Truck className="w-5 h-5" />
          <CardTitle>Material Consumption</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-medium text-gray-900">Consumed Materials</h3>
            <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-300">
              Material Selection Completed
            </Badge>
          </div>
        </div>

        <div className="space-y-4">
          {materials.map((material, index) => {
            // Calculate quantity per product correctly
            const quantityPerProduct = sqmPerProduct > 0 
              ? material.quantity_per_sqm * sqmPerProduct 
              : material.required_quantity / targetQuantity;
            
            // Get consumed quantity - for products use whole_product_count, for raw materials use actual_consumed_quantity or required_quantity
            const consumedQuantity = material.material_type === 'product' && material.whole_product_count !== undefined
              ? material.whole_product_count
              : material.actual_consumed_quantity !== undefined
              ? material.actual_consumed_quantity
              : material.required_quantity;
            
            const uniqueKey = `${material.material_id}-${index}`;

            return (
              <div
                key={uniqueKey}
                className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-semibold text-gray-900 text-base truncate" title={material.material_name}>
                        {(() => {
                          const words = material.material_name.split(' ');
                          if (words.length > 4) {
                            return words.slice(0, 4).join(' ') + '...';
                          }
                          return material.material_name;
                        })()}
                      </h4>
                      <Badge variant="outline" className="text-xs flex-shrink-0">
                        {material.material_type === 'product' ? 'Product' : 'Raw Material'}
                      </Badge>
                      {getStatusBadge()}
                    </div>
                    <p className="text-xs text-gray-500 truncate">
                      Type: {material.material_type} • ID: {material.material_id}
                    </p>
                  </div>
                </div>

                {/* Consumed Individual Products - Show with Status */}
                {material.material_type === 'product' && material.individual_products && material.individual_products.length > 0 && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-3">
                    <h5 className="text-xs font-semibold text-green-900 mb-2">
                      Consumed Individual Products ({material.individual_products.length} {material.unit})
                    </h5>
                    <div className="overflow-x-auto max-h-96 overflow-y-auto">
                      <table className="w-full text-xs border-collapse">
                        <thead className="bg-green-100 sticky top-0">
                          <tr>
                            <th className="border border-green-300 px-2 py-2 text-left font-semibold text-green-900">#</th>
                            <th className="border border-green-300 px-2 py-2 text-left font-semibold text-green-900">Product ID</th>
                            <th className="border border-green-300 px-2 py-2 text-left font-semibold text-green-900">QR Code</th>
                            <th className="border border-green-300 px-2 py-2 text-left font-semibold text-green-900">Serial Number</th>
                            <th className="border border-green-300 px-2 py-2 text-left font-semibold text-green-900">Size (L × W)</th>
                            <th className="border border-green-300 px-2 py-2 text-left font-semibold text-green-900">Weight</th>
                            <th className="border border-green-300 px-2 py-2 text-left font-semibold text-green-900">Color</th>
                            <th className="border border-green-300 px-2 py-2 text-left font-semibold text-green-900">Pattern</th>
                            <th className="border border-green-300 px-2 py-2 text-left font-semibold text-green-900">Status</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white">
                          {material.individual_products.map((product, idx) => {
                            const statusColor = product.status === 'used' 
                              ? 'bg-green-100 text-green-800 border-green-300' 
                              : product.status === 'in_production'
                              ? 'bg-yellow-100 text-yellow-800 border-yellow-300'
                              : 'bg-gray-100 text-gray-800 border-gray-300';
                            return (
                              <tr key={product.id} className="hover:bg-gray-50">
                                <td className="border border-gray-200 px-2 py-2 text-gray-600">{idx + 1}</td>
                                <td className="border border-gray-200 px-2 py-2 font-medium text-gray-900">{product.id}</td>
                                <td className="border border-gray-200 px-2 py-2 text-gray-900">{product.qr_code}</td>
                                <td className="border border-gray-200 px-2 py-2 text-gray-900 text-[10px] break-all max-w-[200px]">{product.serial_number}</td>
                                <td className="border border-gray-200 px-2 py-2 text-gray-900">
                                  {product.length && product.width ? `${product.length} × ${product.width}` : '—'}
                                </td>
                                <td className="border border-gray-200 px-2 py-2 text-gray-900">{product.weight || '—'}</td>
                                <td className="border border-gray-200 px-2 py-2 text-gray-900">{product.color || '—'}</td>
                                <td className="border border-gray-200 px-2 py-2 text-gray-900">{product.pattern || '—'}</td>
                                <td className="border border-gray-200 px-2 py-2">
                                  <Badge className={`${statusColor} text-xs`}>
                                    {product.status || 'unknown'}
                                  </Badge>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Quantity Breakdown - Read Only */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <h5 className="text-xs font-semibold text-blue-900 mb-2">Quantity Breakdown</h5>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    <div className="bg-white rounded p-2">
                      <p className="text-gray-500 mb-1">
                        {material.material_type === 'product' ? 'Per 1 SQM of Parent' : 'Per 1 SQM'}
                      </p>
                      <p className="font-semibold text-gray-900">
                        {material.quantity_per_sqm > 0
                          ? material.quantity_per_sqm.toFixed(4)
                          : (material.required_quantity / totalSQM).toFixed(4)} {material.unit}
                      </p>
                    </div>
                    <div className="bg-white rounded p-2">
                      <p className="text-gray-500 mb-1">Per 1 Product</p>
                      <p className="font-semibold text-gray-900">
                        {quantityPerProduct > 0 ? quantityPerProduct.toFixed(4) : (material.required_quantity / targetQuantity).toFixed(4)} {material.unit}
                      </p>
                      {sqmPerProduct > 0 && (
                        <p className="text-gray-400 text-xs">({sqmPerProduct.toFixed(2)} sqm/product)</p>
                      )}
                    </div>
                    <div className="bg-white rounded p-2 border-2 border-blue-300">
                      <p className="text-gray-500 mb-1 font-medium">For {targetQuantity} Products</p>
                      <p className="font-bold text-blue-700 text-base">
                        {material.required_quantity.toFixed(4)} {material.unit}
                      </p>
                      {totalSQM > 0 && (
                        <p className="text-gray-400 text-xs">({totalSQM.toFixed(2)} sqm total)</p>
                      )}
                    </div>
                    <div className="bg-white rounded p-2 border-2 border-green-300">
                      <p className="text-gray-500 mb-1 font-medium">Consumed</p>
                      <p className="font-bold text-green-700 text-base">
                        {material.material_type === 'product' && Number.isInteger(consumedQuantity)
                          ? `${consumedQuantity} ${material.unit}`
                          : `${consumedQuantity.toFixed(4)} ${material.unit}`}
                      </p>
                      {material.material_type === 'product' && material.actual_consumed_quantity && material.actual_consumed_quantity !== consumedQuantity && (
                        <p className="text-gray-500 text-xs mt-1">
                          (Actual: {material.actual_consumed_quantity.toFixed(4)} {material.unit})
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

