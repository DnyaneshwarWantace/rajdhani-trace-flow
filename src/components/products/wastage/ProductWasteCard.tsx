import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Package, RefreshCw, Calendar, ChevronDown, ChevronUp, Hash, Factory, TrendingDown } from 'lucide-react';
import { useState } from 'react';
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
  onReturn: (waste: WasteItem) => void;
  isReturning: boolean;
}

export default function ProductWasteCard({ waste, onReturn, isReturning }: ProductWasteCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
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

  // Calculate usage stats from material consumption
  const productConsumption = waste.materialConsumption?.filter(
    (cons: any) => cons.material_type === 'product' && cons.material_id === waste.product_id
  ) || [];
  
  const totalUsed = productConsumption.reduce((sum: number, cons: any) => sum + (cons.quantity_used || 0), 0);
  const totalWasted = waste.quantity || 0;
  
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
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

        {/* Details Grid */}
        <div className="space-y-2 mb-3">
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

          {/* Individual Products Count */}
          {waste.individualProducts && waste.individualProducts.length > 0 && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="w-full flex items-center justify-between text-xs text-gray-600 hover:text-gray-900 py-1"
            >
              <span className="flex items-center gap-1">
                <Package className="w-3 h-3" />
                {waste.individualProducts.length} Individual Product{waste.individualProducts.length !== 1 ? 's' : ''}
              </span>
              {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          )}
        </div>

        {/* Expanded Individual Products */}
        {isExpanded && waste.individualProducts && waste.individualProducts.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-200 space-y-2 max-h-64 overflow-y-auto">
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
        )}

        {/* Action Button */}
        {waste.status === 'available_for_reuse' && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onReturn(waste)}
            disabled={isReturning}
            className="w-full text-green-600 hover:text-green-700 border-green-200 hover:border-green-300 hover:bg-green-50 text-xs"
          >
            {isReturning ? (
              <>
                <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                Returning...
              </>
            ) : (
              <>
                <Package className="w-3 h-3 mr-1" />
                Return to Inventory
              </>
            )}
          </Button>
        )}
        {waste.status === 'added_to_inventory' && (
          <div className="text-center text-sm text-green-600 font-medium py-2">
            ✓ Added to Inventory
          </div>
        )}
      </CardContent>
    </Card>
  );
}

