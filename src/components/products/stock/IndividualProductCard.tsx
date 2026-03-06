import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { QrCode, Ruler, Weight, MapPin, User } from 'lucide-react';
import type { IndividualProduct } from '@/types/product';

function weightKgFromItem(item: IndividualProduct): number | null {
  const gsm = parseFloat((item.final_weight || '').toString().replace(/[^\d.]/g, ''));
  const lengthStr = (item.final_length || '').toString();
  const widthStr = (item.final_width || '').toString();
  let lengthM = parseFloat(lengthStr.replace(/[^\d.]/g, ''));
  let widthM = parseFloat(widthStr.replace(/[^\d.]/g, ''));
  if (lengthStr.toLowerCase().includes('feet')) lengthM *= 0.3048;
  if (widthStr.toLowerCase().includes('feet')) widthM *= 0.3048;
  if (!isNaN(gsm) && !isNaN(lengthM) && !isNaN(widthM) && gsm > 0 && lengthM > 0 && widthM > 0) {
    return (gsm * lengthM * widthM) / 1000;
  }
  return null;
}

interface IndividualProductCardProps {
  individualProduct: IndividualProduct;
  onClick: () => void;
  lengthUnit?: string;
  widthUnit?: string;
  weightUnit?: string;
  selected?: boolean;
  onToggleSelect?: () => void;
}

export default function IndividualProductCard({
  individualProduct,
  onClick,
  lengthUnit = '',
  widthUnit = '',
  weightUnit: _weightUnit = '',
  selected,
  onToggleSelect,
}: IndividualProductCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-blue-600 text-white border-blue-600';
      case 'sold':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'damaged':
        return 'bg-red-100 text-red-700 border-red-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <Card
      onClick={onClick}
      className={`hover:shadow-md transition-all cursor-pointer hover:border-primary-500 ${selected ? 'ring-2 ring-primary-500 border-primary-500' : ''}`}
    >
      <CardContent className="p-3">
        {/* Header: Checkbox (when selection enabled) + QR Code & Status */}
        <div className="flex items-start justify-between mb-2 gap-2">
          {onToggleSelect && (
            <div onClick={(e) => e.stopPropagation()} className="flex-shrink-0 pt-0.5">
              <Checkbox
                checked={selected}
                onCheckedChange={() => onToggleSelect?.()}
                aria-label={`Select ${individualProduct.qr_code || individualProduct.id}`}
              />
            </div>
          )}
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="w-8 h-8 bg-primary-50 rounded flex items-center justify-center flex-shrink-0">
              <QrCode className="w-4 h-4 text-primary-600" />
            </div>
            <div className="min-w-0">
              <p className="text-[9px] text-gray-500">QR Code</p>
              <p className="text-xs font-mono font-semibold text-gray-900 truncate">
                {individualProduct.qr_code || individualProduct.id.slice(0, 8)}
              </p>
            </div>
          </div>
          <Badge
            variant="outline"
            className={`${getStatusColor(individualProduct.status)} text-[9px] px-1.5 py-0 flex-shrink-0 ml-2`}
          >
            {individualProduct.status}
          </Badge>
        </div>

        {/* Details Grid */}
        <div className="space-y-1.5 text-[10px] mb-2">
          {/* Dimensions */}
          {(individualProduct.final_length || individualProduct.final_width) && (
            <div className="flex items-center justify-between">
              <span className="text-gray-500 flex items-center gap-1">
                <Ruler className="w-2.5 h-2.5" />
                Dimensions
              </span>
              <span className="font-medium text-gray-900">
                {individualProduct.final_length
                  ? individualProduct.final_length.includes(' ')
                    ? individualProduct.final_length
                    : `${individualProduct.final_length} ${lengthUnit || 'feet'}`
                  : 'N/A'} × {individualProduct.final_width
                  ? individualProduct.final_width.includes(' ')
                    ? individualProduct.final_width
                    : `${individualProduct.final_width} ${widthUnit || 'feet'}`
                  : 'N/A'}
              </span>
            </div>
          )}

          {/* Weight: show GSM and (weight kg) like production detail */}
          {individualProduct.final_weight && (
            <div className="flex items-center justify-between">
              <span className="text-gray-500 flex items-center gap-1">
                <Weight className="w-2.5 h-2.5" />
                Weight
              </span>
              <span className="font-medium text-gray-900 truncate ml-2">
                {individualProduct.final_weight}
                {(() => {
                  const wKg = weightKgFromItem(individualProduct);
                  return wKg !== null ? (
                    <span className="text-gray-500 ml-1">({wKg.toFixed(4)} kg)</span>
                  ) : null;
                })()}
              </span>
            </div>
          )}

          {/* Location */}
          {individualProduct.location && (
            <div className="flex items-center justify-between">
              <span className="text-gray-500 flex items-center gap-1">
                <MapPin className="w-2.5 h-2.5" />
                Location
              </span>
              <span className="font-medium text-gray-900 truncate ml-2">
                {individualProduct.location}
              </span>
            </div>
          )}

          {/* Inspector */}
          {individualProduct.inspector && (
            <div className="flex items-center justify-between">
              <span className="text-gray-500 flex items-center gap-1">
                <User className="w-2.5 h-2.5" />
                Inspector
              </span>
              <span className="font-medium text-gray-900 truncate ml-2">
                {individualProduct.inspector}
              </span>
            </div>
          )}
        </div>

        {/* View Details Button */}
        <div className="pt-2 border-t border-gray-100">
          <div className="text-center text-[10px] font-medium text-primary-600">
            Tap to view details →
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
