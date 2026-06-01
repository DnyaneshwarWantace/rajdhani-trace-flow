import { useState } from 'react';
import { ChevronDown, ChevronRight, Truck } from 'lucide-react';
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
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  if (materials.length === 0) return null;

  const productLength = parseFloat(product?.length || '0');
  const productWidth = parseFloat(product?.width || '0');
  const sqmPerUnit = calculateSQM(productLength, productWidth, product?.length_unit || 'm', product?.width_unit || 'm');
  const totalSQM = targetQuantity * sqmPerUnit;

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-100">
        <Truck className="w-4 h-4 text-gray-500 flex-shrink-0" />
        <span className="text-sm font-semibold text-gray-800">Material Consumption</span>
        <span className="ml-auto text-xs text-gray-400">{materials.length} material{materials.length !== 1 ? 's' : ''}</span>
      </div>

      <div className="divide-y divide-gray-100">
        {materials.map((material, index) => {
          const key = `${material.material_id}-${index}`;
          const isExpanded = expanded[key];
          const consumedQty =
            material.material_type === 'product' && material.whole_product_count !== undefined
              ? material.whole_product_count
              : material.actual_consumed_quantity ?? material.required_quantity;
          const hasProducts = material.material_type === 'product' && (material.individual_products?.length ?? 0) > 0;
          const consumedStr =
            material.material_type === 'product' && Number.isInteger(consumedQty)
              ? `${consumedQty} ${material.unit}`
              : `${consumedQty.toFixed(2)} ${material.unit}`;
          const reqStr = `${material.required_quantity.toFixed(2)} ${material.unit}`;

          return (
            <div key={key}>
              <div className="flex items-center gap-3 px-4 py-2.5 text-sm">
                {hasProducts ? (
                  <button
                    onClick={() => setExpanded(prev => ({ ...prev, [key]: !prev[key] }))}
                    className="flex-shrink-0 text-gray-400 hover:text-gray-600"
                  >
                    {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </button>
                ) : (
                  <span className="w-4 flex-shrink-0" />
                )}

                <span className="flex-1 font-medium text-gray-800 truncate min-w-0" title={material.material_name}>
                  {material.material_name}
                </span>

                <span className="text-xs text-gray-400 flex-shrink-0">
                  {material.material_type === 'product' ? 'Product' : 'Raw'}
                </span>

                <span className="flex-shrink-0 text-xs text-gray-500">
                  Req: <span className="font-medium text-gray-700">{reqStr}</span>
                </span>
                <span className="flex-shrink-0 text-xs">
                  Used: <span className="font-semibold text-green-700">{consumedStr}</span>
                </span>
                {totalSQM > 0 && (
                  <span className="flex-shrink-0 text-xs text-gray-400 hidden md:inline">
                    {(material.required_quantity / totalSQM).toFixed(3)} {material.unit}/m²
                  </span>
                )}
              </div>

              {hasProducts && isExpanded && (
                <div className="px-4 pb-3">
                  <div className="overflow-x-auto rounded border border-gray-200">
                    <table className="w-full text-xs border-collapse">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="border-b border-gray-200 px-2 py-1.5 text-left text-gray-600 font-medium">#</th>
                          <th className="border-b border-gray-200 px-2 py-1.5 text-left text-gray-600 font-medium">ID</th>
                          <th className="border-b border-gray-200 px-2 py-1.5 text-left text-gray-600 font-medium">QR</th>
                          <th className="border-b border-gray-200 px-2 py-1.5 text-left text-gray-600 font-medium">L × W</th>
                          <th className="border-b border-gray-200 px-2 py-1.5 text-left text-gray-600 font-medium">GSM</th>
                          <th className="border-b border-gray-200 px-2 py-1.5 text-left text-gray-600 font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {material.individual_products!.map((p, i) => (
                          <tr key={p.id} className="hover:bg-gray-50">
                            <td className="border-b border-gray-100 px-2 py-1 text-gray-500">{i + 1}</td>
                            <td className="border-b border-gray-100 px-2 py-1 font-mono text-gray-700">{p.id}</td>
                            <td className="border-b border-gray-100 px-2 py-1 text-gray-600">{p.qr_code}</td>
                            <td className="border-b border-gray-100 px-2 py-1 text-gray-700">
                              {p.length && p.width ? `${p.length} × ${p.width}` : '—'}
                            </td>
                            <td className="border-b border-gray-100 px-2 py-1 text-gray-700">{p.weight || '—'}</td>
                            <td className="border-b border-gray-100 px-2 py-1">
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                p.status === 'used' ? 'bg-green-100 text-green-700' :
                                p.status === 'in_production' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-gray-100 text-gray-600'
                              }`}>
                                {p.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
