import { useState, useEffect, useRef } from 'react';
import { Plus, Package, ChevronDown, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ExtendedOrderItem } from '@/hooks/usePricingCalculator';
import { formatCurrency } from '@/utils/formatHelpers';
import OrderItemForm from './OrderItemForm';

function CollapsedItemSummary({
  item,
  index,
  selectedProduct,
  onExpand,
  onRemove,
}: {
  item: ExtendedOrderItem;
  index: number;
  selectedProduct: any;
  onExpand: () => void;
  onRemove: () => void;
}) {
  const p = selectedProduct;
  const specs: { label: string; value: string }[] = [];
  if (p?.length && (p.length_unit || p.length)) specs.push({ label: 'Length', value: `${p.length} ${p.length_unit || ''}`.trim() });
  if (p?.width && (p.width_unit || p.width)) specs.push({ label: 'Width', value: `${p.width} ${p.width_unit || ''}`.trim() });
  if (p?.height && (p.height_unit || p.height)) specs.push({ label: 'Height', value: `${p.height} ${p.height_unit || ''}`.trim() });
  if (p?.weight && (p.weight_unit || p.weight)) specs.push({ label: 'Weight', value: `${p.weight} ${p.weight_unit || ''}`.trim() });
  if (p?.gsm) specs.push({ label: 'GSM', value: String(p.gsm) });
  if (p?.pattern) specs.push({ label: 'Pattern', value: p.pattern });
  if (p?.color) specs.push({ label: 'Color', value: p.color });
  const unitLabel = item.product_type === 'raw_material' ? (p?.unit || 'units') : (p?.count_unit || 'rolls');

  return (
    <div
      className="p-3 cursor-pointer hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
      onClick={onExpand}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onExpand();
        }
      }}
      aria-expanded={false}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-gray-500 font-medium text-sm">Item #{index + 1}</span>
            <span className="text-xs px-1.5 py-0.5 rounded bg-gray-200 text-gray-700 capitalize">
              {item.product_type === 'raw_material' ? 'Material' : 'Product'}
            </span>
          </div>
          <p className="text-gray-900 font-medium truncate" title={item.product_name || ''}>
            {item.product_name || 'Select product / material'}
          </p>
          {specs.length > 0 && (
            <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-gray-600">
              {specs.map((s) => (
                <span key={s.label}>
                  <span className="text-gray-500">{s.label}:</span> <span className="text-gray-800">{s.value}</span>
                </span>
              ))}
            </div>
          )}
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="text-gray-600">
              Qty: <span className="font-semibold text-gray-900">{item.quantity || 0}</span> {unitLabel}
            </span>
            {item.unit_price > 0 && (
              <span className="text-gray-600">
                @ <span className="font-medium text-gray-900">{formatCurrency(item.unit_price ?? 0)}</span> / {item.pricing_unit && item.pricing_unit !== 'unit' ? item.pricing_unit : unitLabel}
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 text-xs text-gray-600 pt-0.5 border-t border-gray-100 mt-1.5">
            <span><span className="text-gray-500">Subtotal:</span> <span className="font-medium text-gray-800">{formatCurrency(item.subtotal ?? 0)}</span></span>
            {(item.gst_amount ?? 0) > 0 && (
              <span><span className="text-gray-500">GST:</span> <span className="font-medium text-gray-800">{formatCurrency(item.gst_amount ?? 0)}</span></span>
            )}
            <span><span className="text-gray-500">Total:</span> <span className="font-semibold text-primary-600">{formatCurrency(item.total_price ?? 0)}</span></span>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="sm" onClick={onExpand} className="text-gray-600" title="Expand">
            <ChevronDown className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onRemove}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
            title="Remove"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
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
  // Track which item ids are expanded (full form visible). Collapsed = only summary row.
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());

  const prevLengthRef = useRef(items.length);
  useEffect(() => {
    if (items.length === 0) {
      setExpandedIds(new Set());
      prevLengthRef.current = 0;
      return;
    }
    // When user adds a new item, expand only the new (last) item
    if (items.length > prevLengthRef.current) {
      const lastId = items[items.length - 1].id;
      setExpandedIds(new Set([lastId]));
    }
    prevLengthRef.current = items.length;
  }, [items.length]);

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const isExpanded = (id: string) => expandedIds.has(id);

  const getSelectedProduct = (item: ExtendedOrderItem) => {
    if (!item.product_id) return null;
    return item.product_type === 'raw_material'
      ? rawMaterials.find((p: any) => p.id === item.product_id)
      : products.find((p: any) => p.id === item.product_id);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Order Items</CardTitle>
        <Button
          onClick={onAddItem}
          className="bg-primary-600 hover:bg-primary-700 text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Item
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {items.map((item, index) => {
            const expanded = isExpanded(item.id);
            return (
              <div
                key={item.id}
                className="border rounded-lg overflow-hidden bg-white"
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
                  />
                )}
              </div>
            );
          })}

          {items.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No items added yet</p>
              <p className="text-sm mt-2">Click "Add Item" to start adding products or materials</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
