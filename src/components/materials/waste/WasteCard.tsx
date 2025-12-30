import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Package, RefreshCw, Calendar, Box } from 'lucide-react';
import type { WasteItem } from '@/services/wasteService';
import { WasteService } from '@/services/wasteService';

interface WasteCardProps {
  waste: WasteItem;
  onReturn: (waste: WasteItem) => void;
  isReturning: boolean;
}

export default function WasteCard({ waste, onReturn, isReturning }: WasteCardProps) {
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

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm text-gray-900 line-clamp-2 break-words mb-1">
              {waste.material_name}
            </h3>
            <p className="text-xs text-gray-500">
              {waste.material_type === 'product' ? '📦 Product' : '🔧 Raw Material'}
            </p>
          </div>
          <Badge variant="outline" className={`${getStatusColor(waste.status)} text-xs flex-shrink-0 ml-2`}>
            {getStatusLabel(waste.status)}
          </Badge>
        </div>

        {/* Details Grid */}
        <div className="space-y-2 mb-3">
          {/* Quantity */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500 flex items-center gap-1">
              <Box className="w-3 h-3" />
              Quantity
            </span>
            <span className="font-semibold text-gray-900">
              {Number(waste.quantity).toFixed(4)} {waste.unit}
            </span>
          </div>

          {/* Waste Type */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">Type</span>
            <span className="text-gray-900">
              {WasteService.mapWasteTypeToDisplay(waste.waste_type)}
            </span>
          </div>

          {/* Batch ID */}
          {waste.production_batch_id && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">Batch</span>
              <span className="text-gray-900 truncate ml-2">
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

          {/* Added Date */}
          {waste.added_at && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">Added</span>
              <span className="text-green-600 font-medium">
                {new Date(waste.added_at).toLocaleDateString()}
              </span>
            </div>
          )}
        </div>

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
