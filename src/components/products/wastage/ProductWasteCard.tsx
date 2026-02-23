import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Package, Calendar, Hash, Factory, TrendingDown } from 'lucide-react';
import { TruncatedText } from '@/components/ui/TruncatedText';
import type { WasteItem } from '@/services/wasteService';
import { WasteService } from '@/services/wasteService';
import type { IndividualProduct } from '@/types/product';

interface ExtendedWasteItem extends WasteItem {
  individualProducts?: IndividualProduct[];
  materialConsumption?: any[];
  batchInfo?: any;
}

interface ProductWasteCardProps {
  waste: ExtendedWasteItem;
}

export default function ProductWasteCard({ waste }: ProductWasteCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available_for_reuse':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'added_to_inventory':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'available_for_reuse':
        return 'Reusable';
      case 'added_to_inventory':
        return 'Added';
      default:
        return 'Disposed';
    }
  };

  // Calculate usage stats from material consumption (summary API uses actual_consumed_quantity, whole_product_count, not quantity_used)
  const productConsumption = waste.materialConsumption?.filter(
    (cons: any) =>
      cons.material_type === 'product' &&
      (cons.material_id === waste.product_id || cons.material_id === waste.material_id)
  ) || [];
  const totalUsed = productConsumption.reduce(
    (sum: number, cons: any) =>
      sum + (cons.quantity_used ?? cons.actual_consumed_quantity ?? cons.whole_product_count ?? cons.required_quantity ?? 0),
    0
  );
  const totalWasted = waste.quantity || 0;
  
  return (
    <Card className="hover:shadow-md transition-shadow h-[420px] flex flex-col overflow-hidden">
      <CardContent className="p-4 flex flex-col flex-1 min-h-0 overflow-hidden">
        {/* Header - fixed height section */}
        <div className="flex-shrink-0 flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm text-gray-900 line-clamp-2 break-words mb-1">
              <TruncatedText text={waste.product_name || waste.material_name} maxLength={30} />
            </h3>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <div className="flex items-center gap-1">
                <Hash className="w-3 h-3" />
                <span className="font-mono">{waste.product_id}</span>
              </div>
            </div>
          </div>
          <Badge variant="outline" className={`${getStatusColor(waste.status)} text-xs flex-shrink-0 ml-2`}>
            {getStatusLabel(waste.status)}
          </Badge>
        </div>

        {/* Details Grid - fixed height section */}
        <div className="flex-shrink-0 space-y-2 mb-3">
          {/* Usage Stats */}
          <div className="bg-gray-50 rounded-md p-2 space-y-1.5 mb-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500 flex items-center gap-1">
                <Factory className="w-3 h-3" />
                Used in Production
              </span>
              <span className="font-semibold text-gray-900">
                {totalUsed.toFixed(2)} {waste.unit}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500 flex items-center gap-1">
                <TrendingDown className="w-3 h-3" />
                Wasted
              </span>
              <span className="font-semibold text-red-600">
                {totalWasted.toFixed(2)} {waste.unit}
              </span>
            </div>
          </div>

          {/* Waste Type */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">Waste Type</span>
            <span className="text-gray-900">
              {WasteService.mapWasteTypeToDisplay(waste.waste_type)}
            </span>
          </div>

          {/* Batch ID */}
          {waste.production_batch_id && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">Batch</span>
              <span className="text-gray-900 truncate ml-2 font-mono text-xs">
                {waste.production_batch_id}
              </span>
            </div>
          )}

          {/* Generation Date */}
          {waste.generation_date && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Generated
              </span>
              <span className="text-gray-900">
                {new Date(waste.generation_date).toLocaleDateString()}
              </span>
            </div>
          )}

          {/* Individual Products label when present */}
          {waste.individualProducts && waste.individualProducts.length > 0 && (
            <div className="flex items-center gap-1 text-xs text-gray-600 py-1">
              <Package className="w-3 h-3" />
              {waste.individualProducts.length} Individual Product{waste.individualProducts.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>

        {/* Individual Products - always shown when present, scrolls inside same box size */}
        {waste.individualProducts && waste.individualProducts.length > 0 ? (
          <div className="flex-1 min-h-0 mt-3 pt-3 border-t border-gray-200 space-y-2 overflow-y-auto">
            {waste.individualProducts.map((indProduct) => (
              <Card key={indProduct.id} className="bg-gray-50">
                <CardContent className="p-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-gray-900">Individual Product ID</span>
                      <span className="text-xs font-mono text-gray-700">{indProduct.id}</span>
                    </div>
                    {indProduct.created_at && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500">Created</span>
                        <span className="text-gray-700">
                          {new Date(indProduct.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                    {indProduct.production_date && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500">Production Date</span>
                        <span className="text-gray-700">{indProduct.production_date}</span>
                      </div>
                    )}
                    {indProduct.batch_number && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500">Batch Number</span>
                        <span className="text-gray-700 font-mono text-xs">{indProduct.batch_number}</span>
                      </div>
                    )}
                    {indProduct.status && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500">Status</span>
                        <Badge variant="outline" className="text-xs">
                          {indProduct.status}
                        </Badge>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : null}

        {/* Product wastage is never reused - no Return to Inventory */}
      </CardContent>
    </Card>
  );
}

