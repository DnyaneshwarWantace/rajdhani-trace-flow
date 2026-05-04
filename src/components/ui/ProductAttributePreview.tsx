import { cn } from '@/lib/utils';
import ColorSwatch from '@/components/ui/ColorSwatch';
import { useDropdownVisualMaps } from '@/hooks/useDropdownVisualMaps';

function isMeaningfulString(s?: string | null): boolean {
  if (s == null) return false;
  const t = String(s).trim();
  if (!t) return false;
  const low = t.toLowerCase();
  return low !== 'n/a' && low !== 'na';
}

export type ProductAttributePreviewProps = {
  color?: string | null;
  pattern?: string | null;
  showPattern?: boolean;
  length?: string | null;
  width?: string | null;
  lengthUnit?: string | null;
  widthUnit?: string | null;
  className?: string;
  compact?: boolean;
};

export default function ProductAttributePreview({
  color,
  pattern,
  showPattern = true,
  length,
  width,
  lengthUnit,
  widthUnit,
  className,
  compact = false,
}: ProductAttributePreviewProps) {
  const { colorCodeMap, patternImageMap } = useDropdownVisualMaps();

  const hasSize = isMeaningfulString(length) && isMeaningfulString(width);
  const hasColor = isMeaningfulString(color);
  const hasPattern = showPattern && isMeaningfulString(pattern);

  if (!hasSize && !hasColor && !hasPattern) return null;

  const colorKey = hasColor ? String(color).trim() : '';
  const patternKey = hasPattern ? String(pattern).trim() : '';
  const swatchCls = compact ? 'w-3 h-3 rounded-sm shrink-0' : 'w-3.5 h-3.5 rounded-sm shrink-0';
  const imgCls = compact
    ? 'w-3.5 h-3.5 rounded object-cover border border-gray-200 shrink-0'
    : 'w-4 h-4 rounded object-cover border border-gray-300 shrink-0';
  const textCls = compact ? 'text-[10px] text-gray-600 truncate max-w-[100px]' : 'text-xs text-gray-700 truncate max-w-[160px]';

  return (
    <div className={cn('flex flex-wrap items-center gap-1.5', className)}>
      {hasSize && (
        <span
          className={cn(textCls, 'tabular-nums')}
          title={`${length}${lengthUnit || ''} × ${width}${widthUnit || ''}`}
        >
          {length}
          {lengthUnit || ''}×{width}
          {widthUnit || ''}
        </span>
      )}
      {hasColor && (
        <span className="inline-flex items-center gap-1 min-w-0 max-w-full" title={colorKey}>
          {colorCodeMap[colorKey] && <ColorSwatch colorCode={colorCodeMap[colorKey]} className={swatchCls} />}
          {(!compact || !colorCodeMap[colorKey]) && <span className={textCls}>{colorKey}</span>}
        </span>
      )}
      {hasPattern && (
        <span className="inline-flex items-center gap-1 min-w-0 max-w-full" title={patternKey}>
          {patternImageMap[patternKey] && (
            <img src={patternImageMap[patternKey]} alt="" className={imgCls} title={patternKey} />
          )}
          {(!compact || !patternImageMap[patternKey]) && <span className={textCls}>{patternKey}</span>}
        </span>
      )}
    </div>
  );
}
