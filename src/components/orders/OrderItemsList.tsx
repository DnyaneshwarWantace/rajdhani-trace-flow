import { useState, useEffect, useRef } from 'react';
import { Plus, ChevronDown, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ExtendedOrderItem } from '@/hooks/usePricingCalculator';
import { formatCurrency } from '@/utils/formatHelpers';
import OrderItemForm from './OrderItemForm';
import ColorSwatch from '@/components/ui/ColorSwatch';
import { useDropdownVisualMaps } from '@/hooks/useDropdownVisualMaps';

// Carpet/roll icon for empty state
const CarpetRollIcon = () => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-300">
    <rect x="3" y="6" width="14" height="12" rx="2" />
    <path d="M7 6v12M11 6v12" opacity=".5" />
    <ellipse cx="17" cy="12" rx="4" ry="6" />
  </svg>
);

const ITEM_GRID = '28px minmax(0,1fr) 72px 72px 56px 72px 96px 80px 88px 56px';

function CollapsedItemSummary({
  item,
  index,
  selectedProduct,
  onExpand,
  onRemove,
  showLength,
  showWidth,
  showGSM,
  showColor,
  showRate,
}: {
  item: ExtendedOrderItem;
  index: number;
  selectedProduct: any;
  onExpand: () => void;
  onRemove: () => void;
  showLength: boolean;
  showWidth: boolean;
  showGSM: boolean;
  showColor: boolean;
  showRate: boolean;
}) {
  const { colorCodeMap, patternImageMap } = useDropdownVisualMaps();
  const p = selectedProduct;
  const unitLabel = item.product_type === 'raw_material' ? (p?.unit || 'units') : (p?.count_unit || 'rolls');
  const pricingUnitLabel = item.pricing_unit === 'unit' ? unitLabel : (item.pricing_unit || unitLabel);

  const specMap: Record<string, string> = {};
  if (p?.length) specMap['Length'] = `${p.length}${p.length_unit ? ' ' + p.length_unit : ''}`;
  if (p?.width)  specMap['Width']  = `${p.width}${p.width_unit ? ' ' + p.width_unit : ''}`;
  if (p?.weight) specMap['GSM']    = `${p.weight}`;
  if (p?.color)  specMap['Color']  = p.color;
  if (item.unit_price > 0) specMap['Rate'] = `${formatCurrency(item.unit_price, { full: true })}/${pricingUnitLabel}`;

  return (
    <div
      className="grid items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50 border-b border-slate-100 last:border-0 transition-colors"
      style={{ gridTemplateColumns: ITEM_GRID }}
      onClick={onExpand}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onExpand(); } }}
    >
      <span className="w-7 h-7 rounded-md bg-slate-100 text-slate-600 text-sm font-bold flex items-center justify-center">
        {index + 1}
      </span>
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-900 truncate">
          {item.product_name || <span className="text-slate-400 font-normal">Select product</span>}
        </p>
        {p && (p.color || (item.product_type === 'product' && p.pattern)) && (
          <div className="flex items-center gap-1 mt-0.5 min-h-[16px]">
            {p.color && colorCodeMap[p.color] && (
              <ColorSwatch colorCode={colorCodeMap[p.color]} className="w-3 h-3 rounded-sm shrink-0" />
            )}
            {item.product_type === 'product' && p.pattern && patternImageMap[p.pattern] && (
              <img
                src={patternImageMap[p.pattern]}
                alt={p.pattern || 'Pattern'}
                className="w-4 h-4 rounded object-cover border border-slate-200 shrink-0"
              />
            )}
            {item.product_type === 'product' && p.pattern && !patternImageMap[p.pattern] && (
              <span className="text-[10px] text-slate-500 truncate max-w-[100px]" title={p.pattern}>
                {p.pattern}
              </span>
            )}
          </div>
        )}
      </div>
      <span className="text-sm text-slate-700 tabular-nums text-right">{showLength ? (specMap['Length'] || '—') : ''}</span>
      <span className="text-sm text-slate-700 tabular-nums text-right">{showWidth  ? (specMap['Width']  || '—') : ''}</span>
      <span className="text-sm text-slate-700 tabular-nums text-right">{showGSM    ? (specMap['GSM']    || '—') : ''}</span>
      <span className="text-sm text-slate-700 truncate text-right flex items-center justify-end gap-1 min-w-0">
        {showColor && p?.color ? (
          <>
            {colorCodeMap[p.color] && (
              <ColorSwatch colorCode={colorCodeMap[p.color]} className="w-3 h-3 rounded-sm shrink-0" />
            )}
            <span className="truncate">{p.color}</span>
          </>
        ) : (
          showColor ? '—' : ''
        )}
      </span>
      <span className="text-sm text-slate-800 tabular-nums text-right">{showRate ? (specMap['Rate'] || '—') : ''}</span>
      <span className="text-sm text-slate-800 text-right tabular-nums">{item.quantity || 0} {unitLabel}</span>
      <span className="text-sm font-semibold text-right tabular-nums text-primary-600">
        {formatCurrency(item.total_price ?? 0, { full: true })}
      </span>
      <div className="flex items-center justify-end gap-0.5" onClick={e => e.stopPropagation()}>
        <Button variant="ghost" size="sm" onClick={onExpand} className="w-7 h-7 p-0 text-slate-400 hover:text-slate-600">
          <ChevronDown className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={onRemove} className="w-7 h-7 p-0 text-red-400 hover:text-red-600 hover:bg-red-50">
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}

interface OrderItemsListProps {
  items: ExtendedOrderItem[];
  onAddItem: () => void;
  onUpdateItem: (id: string, field: keyof ExtendedOrderItem, value: any) => void;
  onRemoveItem: (id: string) => void;
  onSelectProduct: (item: ExtendedOrderItem) => void;
  products?: any[];
  rawMaterials?: any[];
}

export default function OrderItemsList({
  items,
  onAddItem,
  onUpdateItem,
  onRemoveItem,
  onSelectProduct,
  products = [],
  rawMaterials = [],
}: OrderItemsListProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());
  const prevLengthRef = useRef(items.length);

  useEffect(() => {
    if (items.length === 0) { setExpandedIds(new Set()); prevLengthRef.current = 0; return; }
    if (items.length > prevLengthRef.current) {
      const lastId = items[items.length - 1].id;
      setExpandedIds(new Set([lastId]));
    }
    prevLengthRef.current = items.length;
  }, [items.length]);

  const toggleExpanded = (id: string) => {
    setExpandedIds(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  };

  const isExpanded = (id: string) => expandedIds.has(id);

  const getSelectedProduct = (item: ExtendedOrderItem) => {
    if (!item.product_id) return null;
    return item.product_type === 'raw_material'
      ? rawMaterials.find((p: any) => p.id === item.product_id)
      : products.find((p: any) => p.id === item.product_id);
  };

  const collapsedItems = items.filter(i => !isExpanded(i.id) && i.product_id);
  const hasCollapsed = collapsedItems.length > 0;
  const hasProducts  = collapsedItems.some(i => i.product_type !== 'raw_material');
  const hasMaterials = collapsedItems.some(i => i.product_type === 'raw_material');
  const nameLabel = hasProducts && hasMaterials ? 'Product / Material' : hasMaterials ? 'Material' : 'Product';

  const collapsedProducts = collapsedItems.map(i =>
    i.product_type === 'raw_material' ? rawMaterials.find(p => p.id === i.product_id) : products.find(p => p.id === i.product_id)
  );
  const showLength = collapsedProducts.some(p => p?.length);
  const showWidth  = collapsedProducts.some(p => p?.width);
  const showGSM    = collapsedProducts.some(p => p?.weight);
  const showColor  = collapsedProducts.some(p => p?.color);
  const showRate   = collapsedItems.some(i => (i.unit_price || 0) > 0);

  const subtotal = items.reduce((s, i) => s + (i.subtotal || 0), 0);
  const gstSum   = items.reduce((s, i) => s + (i.gst_amount || 0), 0);
  const total    = items.reduce((s, i) => s + (i.total_price || 0), 0);

  return (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 flex-shrink-0">
        <div>
          <h2 className="text-[15px] font-semibold text-slate-900 tracking-tight">Order items</h2>
          <p className="text-[11.5px] text-slate-500 mt-0.5">Add products or raw materials. Click a row to edit.</p>
        </div>
        <div className="flex items-center gap-2">
          {items.length > 0 && (
            <div className="flex items-center gap-2 px-3 h-8 bg-slate-50 border border-slate-200 rounded-md text-[12px]">
              <span className="text-slate-500">{items.length} item{items.length !== 1 ? 's' : ''}</span>
              <span className="text-slate-300">·</span>
              <span className="font-bold tabular-nums text-primary-600">{formatCurrency(total, { full: true })}</span>
            </div>
          )}
          <Button
            onClick={onAddItem}
            className="h-8 px-3 text-[12.5px] font-semibold bg-primary-600 hover:bg-primary-700 text-white"
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Add item
          </Button>
        </div>
      </div>

      {/* Column header — only when at least one item is collapsed */}
      {hasCollapsed && (
        <div
          className="grid items-center gap-3 px-4 h-8 bg-slate-50 border-b border-slate-200 flex-shrink-0"
          style={{ gridTemplateColumns: ITEM_GRID }}
        >
          <span />
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{nameLabel}</span>
          {showLength && <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide text-right">Length</span>}
          {!showLength && <span />}
          {showWidth  && <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide text-right">Width</span>}
          {!showWidth  && <span />}
          {showGSM    && <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide text-right">GSM</span>}
          {!showGSM    && <span />}
          {showColor  && <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide text-right">Color</span>}
          {!showColor  && <span />}
          {showRate   && <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide text-right">Rate</span>}
          {!showRate   && <span />}
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide text-right">Qty</span>
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide text-right">Total</span>
          <span />
        </div>
      )}

      {/* Item rows */}
      <div className="flex-1 overflow-y-auto">
        {items.map((item, index) => {
          const expanded = isExpanded(item.id);
          return (
            <div
              key={item.id}
              className={`border-b border-slate-100 last:border-0 ${expanded ? 'border-l-[3px] border-l-primary-600 bg-slate-50/60' : ''}`}
            >
              {expanded ? (
                <OrderItemForm
                  item={item}
                  index={index}
                  onUpdate={onUpdateItem}
                  onRemove={onRemoveItem}
                  onSelectProduct={onSelectProduct}
                  products={products}
                  rawMaterials={rawMaterials}
                  onCollapse={() => toggleExpanded(item.id)}
                  isCollapsible
                />
              ) : (
                <CollapsedItemSummary
                  item={item}
                  index={index}
                  selectedProduct={getSelectedProduct(item)}
                  onExpand={() => toggleExpanded(item.id)}
                  onRemove={() => onRemoveItem(item.id)}
                  showLength={showLength}
                  showWidth={showWidth}
                  showGSM={showGSM}
                  showColor={showColor}
                  showRate={showRate}
                />
              )}
            </div>
          );
        })}

        {items.length === 0 && (
          <div className="flex flex-col items-center justify-center py-14 text-center">
            <div className="w-14 h-14 rounded-lg bg-slate-100 flex items-center justify-center mb-3">
              <CarpetRollIcon />
            </div>
            <p className="text-[13px] font-medium text-slate-600">No items yet</p>
            <p className="text-[11.5px] text-slate-400 mt-1">Click "Add item" above to get started</p>
          </div>
        )}
      </div>

      {/* Footer totals bar */}
      {items.length > 0 && (
        <div className="border-t border-slate-200 bg-slate-50/60 px-4 h-10 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-5 text-sm">
            <span className="text-slate-500">Subtotal <span className="font-semibold text-slate-800 tabular-nums">{formatCurrency(subtotal, { full: true })}</span></span>
            <span className="text-slate-500">GST <span className="font-semibold text-slate-800 tabular-nums">{formatCurrency(gstSum, { full: true })}</span></span>
          </div>
          <span className="text-base font-bold tabular-nums text-primary-600">Total {formatCurrency(total, { full: true })}</span>
        </div>
      )}
    </div>
  );
}
