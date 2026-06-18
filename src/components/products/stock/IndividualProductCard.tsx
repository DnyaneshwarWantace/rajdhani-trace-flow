import { QrCode, Ruler, Weight, MapPin, User, Eye, Edit2 } from 'lucide-react';
import type { IndividualProduct } from '@/types/product';

function weightKgFromItem(item: IndividualProduct): number | null {
  const gsm = parseFloat((item.final_weight || '').toString().replace(/[^\d.]/g, ''));
  const lenStr = (item.final_length || '').toString();
  const widStr = (item.final_width || '').toString();
  let l = parseFloat(lenStr.replace(/[^\d.]/g, ''));
  let w = parseFloat(widStr.replace(/[^\d.]/g, ''));
  if (lenStr.toLowerCase().includes('feet')) l *= 0.3048;
  if (widStr.toLowerCase().includes('feet')) w *= 0.3048;
  if (!isNaN(gsm) && !isNaN(l) && !isNaN(w) && gsm > 0 && l > 0 && w > 0) return (gsm * l * w) / 1000;
  return null;
}

const STATUS_CFG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  available:     { label: 'Available',     color: '#16A34A', bg: '#DCFCE7', dot: '#22C55E' },
  in_production: { label: 'In Production', color: '#C2410C', bg: '#FFF4ED', dot: '#F97316' },
  reserved:      { label: 'Reserved',      color: '#6D28D9', bg: '#F5F3FF', dot: '#8B5CF6' },
  sold:          { label: 'Sold',          color: '#1D4ED8', bg: '#EFF4FF', dot: '#3B82F6' },
  damaged:       { label: 'Damaged',       color: '#B91C1C', bg: '#FEF2F2', dot: '#EF4444' },
  used:          { label: 'Used',          color: '#7C3AED', bg: '#FAF5FF', dot: '#A78BFA' },
};
const sc = (s: string) => STATUS_CFG[s] || { label: s, color: '#6B7280', bg: '#F3F4F6', dot: '#9CA3AF' };

interface IndividualProductCardProps {
  individualProduct: IndividualProduct;
  onClick: () => void;
  onEdit?: () => void;
  lengthUnit?: string;
  widthUnit?: string;
  weightUnit?: string;
  selected?: boolean;
  onToggleSelect?: () => void;
}

export default function IndividualProductCard({
  individualProduct: ip,
  onClick,
  onEdit,
  lengthUnit = '',
  widthUnit = '',
  selected,
  onToggleSelect,
}: IndividualProductCardProps) {
  const cfg = sc(ip.status);
  const wKg = weightKgFromItem(ip);

  const lenLabel = ip.final_length
    ? (ip.final_length.includes(' ') ? ip.final_length : `${ip.final_length} ${lengthUnit || 'ft'}`.trim())
    : null;
  const widLabel = ip.final_width
    ? (ip.final_width.includes(' ') ? ip.final_width : `${ip.final_width} ${widthUnit || 'ft'}`.trim())
    : null;

  return (
    <div
      className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all active:scale-[0.99] ${
        selected ? 'border-blue-500 ring-2 ring-blue-100' : 'border-gray-100'
      }`}
    >
      {/* Header */}
      <div className="flex items-center gap-2.5 px-3.5 pt-3 pb-2.5">
        {/* Checkbox */}
        {onToggleSelect && (
          <div
            onClick={(e) => { e.stopPropagation(); onToggleSelect(); }}
            className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 cursor-pointer transition-colors ${
              selected ? 'border-blue-500 bg-blue-500' : 'border-gray-300 bg-white'
            }`}
          >
            {selected && (
              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
        )}

        {/* Roll number + QR */}
        <div className="flex-1 min-w-0 cursor-pointer" onClick={onClick}>
          <p className="text-sm font-bold text-gray-900 leading-tight truncate">
            {ip.roll_number ? `#${ip.roll_number}` : ip.qr_code || ip.id}
          </p>
          {ip.qr_code && (
            <div className="flex items-center gap-1 mt-0.5">
              <QrCode className="w-2.5 h-2.5 text-gray-400 shrink-0" />
              <p className="text-[10px] font-mono text-gray-400 truncate">{ip.qr_code}</p>
            </div>
          )}
        </div>

        {/* Status badge */}
        <span className="flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full shrink-0"
          style={{ backgroundColor: cfg.bg, color: cfg.color }}>
          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: cfg.dot }} />
          {cfg.label}
        </span>
      </div>

      {/* Info rows */}
      <div className="px-3.5 pb-2.5 space-y-1.5 cursor-pointer" onClick={onClick}>
        {(lenLabel || widLabel) && (
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[10.5px] text-gray-400">
              <Ruler className="w-3 h-3" /> Dimensions
            </span>
            <span className="text-[11px] font-semibold text-gray-900">
              {[lenLabel, widLabel].filter(Boolean).join(' × ')}
            </span>
          </div>
        )}
        {ip.final_weight && (
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[10.5px] text-gray-400">
              <Weight className="w-3 h-3" /> GSM / Weight
            </span>
            <span className="text-[11px] font-semibold text-gray-900">
              {ip.final_weight}{wKg != null ? ` · ${wKg.toFixed(1)} kg` : ''}
            </span>
          </div>
        )}
        {ip.location && (
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[10.5px] text-gray-400">
              <MapPin className="w-3 h-3" /> Location
            </span>
            <span className="text-[11px] font-semibold text-gray-900 truncate ml-4 max-w-[60%] text-right">{ip.location}</span>
          </div>
        )}
        {ip.inspector && (
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[10.5px] text-gray-400">
              <User className="w-3 h-3" /> Inspector
            </span>
            <span className="text-[11px] font-semibold text-gray-900 truncate ml-4 max-w-[60%] text-right">{ip.inspector}</span>
          </div>
        )}
        {ip.batch_number && (
          <div className="flex items-center justify-between">
            <span className="text-[10.5px] text-gray-400">Batch</span>
            <span className="text-[11px] font-mono font-semibold text-gray-500">{ip.batch_number}</span>
          </div>
        )}
      </div>

      {/* Footer actions */}
      <div className="border-t border-gray-50 flex items-center">
        <button
          onClick={onClick}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-semibold text-blue-600 active:bg-blue-50 transition-colors"
        >
          <Eye className="w-3.5 h-3.5" />
          View Details
        </button>
        {onEdit && (
          <>
            <div className="w-px h-6 bg-gray-100" />
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(); }}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-semibold text-gray-500 active:bg-gray-50 transition-colors"
            >
              <Edit2 className="w-3.5 h-3.5" />
              Edit
            </button>
          </>
        )}
      </div>
    </div>
  );
}
