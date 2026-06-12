import { formatIndianDate } from '@/utils/formatHelpers';
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
    <Card className="bg-white border border-gray-100 rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)] hover:shadow-[0_12px_30px_-6px_rgba(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-300 ease-out overflow-hidden relative group">
      {/* Decorative Top Accent Line */}
      <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${
        waste.status === 'available_for_reuse' 
          ? 'from-emerald-500 to-teal-400' 
          : waste.status === 'added_to_inventory'
          ? 'from-blue-500 to-indigo-400'
          : 'from-gray-300 to-gray-400'
      }`} />
      
      <CardContent className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-4 pt-1">
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-gray-900 text-[15px] leading-snug tracking-tight line-clamp-2 break-words mb-1.5 group-hover:text-primary-700 transition-colors">
              {waste.material_name}
            </h3>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400 bg-gray-50 px-2 py-0.5 rounded-md border border-gray-100">
                {waste.material_type === 'product' ? '📦 Product' : '🔧 Raw Material'}
              </span>
            </div>
          </div>
          
          <Badge 
            variant="outline" 
            className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border flex-shrink-0 ${getStatusColor(waste.status)}`}
          >
            {getStatusLabel(waste.status)}
          </Badge>
        </div>

        {/* Details List */}
        <div className="space-y-2.5 mb-5 bg-gray-50/55 rounded-xl p-3.5 border border-gray-100">
          {/* Quantity */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500 flex items-center gap-1.5">
              <Box className="w-3.5 h-3.5 text-gray-400" />
              Quantity
            </span>
            <span className="font-bold text-gray-900 text-sm">
              {Number(waste.quantity).toFixed(4)} <span className="text-xs font-medium text-gray-500">{waste.unit}</span>
            </span>
          </div>

          {/* Waste Type */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">Waste Type</span>
            <span className="font-semibold text-gray-800">
              {WasteService.mapWasteTypeToDisplay(waste.waste_type)}
            </span>
          </div>

          {/* Batch ID */}
          {waste.production_batch_id && (
            <div className="flex items-center justify-between text-xs border-t border-gray-100 pt-2.5">
              <span className="text-gray-500">Production Batch</span>
              <span className="font-mono text-gray-700 bg-gray-100 px-1.5 py-0.5 rounded text-[10.5px] max-w-[150px] truncate">
                {waste.production_batch_id}
              </span>
            </div>
          )}

          {/* Generation Date */}
          {waste.generation_date && (
            <div className="flex items-center justify-between text-xs border-t border-gray-100 pt-2.5">
              <span className="text-gray-500 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-gray-400" />
                Generated On
              </span>
              <span className="text-gray-700 font-medium">
                {formatIndianDate(waste.generation_date)}
              </span>
            </div>
          )}

          {/* Added Date */}
          {waste.added_at && (
            <div className="flex items-center justify-between text-xs border-t border-gray-100 pt-2.5">
              <span className="text-gray-500">Recovered At</span>
              <span className="text-green-600 font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                {formatIndianDate(waste.added_at)}
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
            className="w-full h-[40px] rounded-xl text-xs font-bold bg-white text-emerald-600 hover:text-white border-emerald-200 hover:border-emerald-600 hover:bg-emerald-600 active:bg-emerald-700 shadow-sm transition-all duration-200 flex items-center justify-center gap-2"
          >
            {isReturning ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Returning...
              </>
            ) : (
              <>
                <Package className="w-3.5 h-3.5" />
                Return to Inventory
              </>
            )}
          </Button>
        )}
        {waste.status === 'added_to_inventory' && (
          <div className="w-full py-2 bg-emerald-50 text-emerald-700 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 border border-emerald-100">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Recovered & Added
          </div>
        )}
      </CardContent>
    </Card>
  );
}
