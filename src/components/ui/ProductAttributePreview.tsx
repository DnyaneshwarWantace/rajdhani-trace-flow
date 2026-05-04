import { useState } from 'react';
import { cn } from '@/lib/utils';
import ColorSwatch from '@/components/ui/ColorSwatch';
import ImageViewDialog from '@/components/ui/ImageViewDialog';
import { useDropdownVisualMaps } from '@/hooks/useDropdownVisualMaps';

function isMeaningfulString(s?: string | null): boolean {
  if (s == null) return false;
  const t = String(s).trim();
  if (!t) return false;
  const low = t.toLowerCase();
  return low !== 'n/a' && low !== 'na';
}

export type ProductAttributePreviewSize = 'compact' | 'default' | 'large';

export type ProductAttributePreviewProps = {
  color?: string | null;
  pattern?: string | null;
  showPattern?: boolean;
  length?: string | null;
  width?: string | null;
  lengthUnit?: string | null;
  widthUnit?: string | null;
  className?: string;
  /** Small chips for dense tables. */
  compact?: boolean;
  /** Visual scale: `default` matches product list (w-8 swatch & pattern). `large` for detail headers. */
  size?: ProductAttributePreviewSize;
  /** When true (default), clicking the pattern thumbnail opens a full-size dialog. */
  patternLightbox?: boolean;
  /** `below`: swatch on top, color name underneath (e.g. order table Color column). */
  colorLabelPosition?: 'inline' | 'below';
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
  size: sizeProp,
  patternLightbox = true,
  colorLabelPosition = 'inline',
}: ProductAttributePreviewProps) {
  const { colorCodeMap, patternImageMap } = useDropdownVisualMaps();
  const [lightbox, setLightbox] = useState<{ url: string; alt: string } | null>(null);

  const resolvedSize: ProductAttributePreviewSize = compact ? 'compact' : (sizeProp ?? 'default');

  const hasSize = isMeaningfulString(length) && isMeaningfulString(width);
  const hasColor = isMeaningfulString(color);
  const hasPattern = showPattern && isMeaningfulString(pattern);

  if (!hasSize && !hasColor && !hasPattern) return null;

  const colorKey = hasColor ? String(color).trim() : '';
  const patternKey = hasPattern ? String(pattern).trim() : '';
  const patternUrl = hasPattern && patternImageMap[patternKey] ? patternImageMap[patternKey] : '';

  const styles = {
    compact: {
      wrap: 'gap-1',
      swatch: 'w-3 h-3 rounded-sm shrink-0',
      img: 'w-3.5 h-3.5 rounded object-cover border border-gray-200 shrink-0',
      text: 'text-[10px] text-gray-600 truncate max-w-[100px]',
    },
    default: {
      wrap: 'gap-2',
      swatch: 'w-8 h-8 rounded-md shrink-0',
      img: 'w-8 h-8 rounded-md object-cover border border-gray-300 shrink-0',
      text: 'text-sm text-gray-700 truncate max-w-[200px]',
    },
    large: {
      wrap: 'gap-2.5',
      swatch: 'w-10 h-10 rounded-lg shrink-0',
      img: 'w-12 h-12 rounded-lg object-cover border border-gray-300 shrink-0',
      text: 'text-sm text-gray-800 truncate max-w-[240px]',
    },
  }[resolvedSize];

  const showColorLabel = resolvedSize === 'compact' ? !colorCodeMap[colorKey] : true;
  const showPatternLabel = resolvedSize === 'compact' ? !patternUrl : true;

  const openPattern = (e: React.MouseEvent) => {
    if (!patternLightbox || !patternUrl) return;
    e.preventDefault();
    e.stopPropagation();
    setLightbox({ url: patternUrl, alt: patternKey });
  };

  return (
    <>
      <div className={cn('flex flex-wrap items-center', styles.wrap, className)}>
        {hasSize && (
          <span
            className={cn(styles.text, 'tabular-nums')}
            title={`${length}${lengthUnit || ''} × ${width}${widthUnit || ''}`}
          >
            {length}
            {lengthUnit || ''}×{width}
            {widthUnit || ''}
          </span>
        )}
        {hasColor && (
          <span
            className={cn(
              colorLabelPosition === 'below'
                ? 'inline-flex flex-col items-end gap-1.5 min-w-0 max-w-[7.5rem]'
                : 'inline-flex items-center gap-1.5 min-w-0 max-w-full',
            )}
            title={colorKey}
          >
            {colorCodeMap[colorKey] ? (
              <ColorSwatch colorCode={colorCodeMap[colorKey]} className={styles.swatch} />
            ) : colorLabelPosition === 'below' ? (
              <span
                className={cn(styles.swatch, 'border-2 border-dashed border-slate-300 bg-slate-50/80')}
                aria-hidden
              />
            ) : null}
            {colorLabelPosition === 'below' ? (
              <span
                className={cn(
                  'text-right leading-tight text-slate-700 font-medium break-words',
                  resolvedSize === 'large' && 'text-[11px]',
                  resolvedSize === 'default' && 'text-xs',
                  resolvedSize === 'compact' && 'text-[10px]',
                )}
              >
                {colorKey}
              </span>
            ) : (
              showColorLabel && <span className={styles.text}>{colorKey}</span>
            )}
          </span>
        )}
        {hasPattern && (
          <span className="inline-flex items-center gap-1.5 min-w-0 max-w-full" title={patternKey}>
            {patternUrl &&
              (patternLightbox ? (
                <button
                  type="button"
                  className="p-0 border-0 bg-transparent leading-none cursor-zoom-in hover:opacity-90 transition-opacity"
                  onClick={openPattern}
                  title={`View ${patternKey}`}
                >
                  <img src={patternUrl} alt="" className={styles.img} />
                </button>
              ) : (
                <img src={patternUrl} alt="" className={styles.img} title={patternKey} />
              ))}
            {showPatternLabel && <span className={styles.text}>{patternKey}</span>}
          </span>
        )}
      </div>

      {lightbox && (
        <ImageViewDialog
          isOpen={!!lightbox}
          onClose={() => setLightbox(null)}
          imageUrl={lightbox.url}
          alt={lightbox.alt}
          caption={lightbox.alt}
        />
      )}
    </>
  );
}
