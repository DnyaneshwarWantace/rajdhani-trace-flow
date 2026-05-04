import { Trash2, Search, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import type { ExtendedOrderItem } from '@/hooks/usePricingCalculator';
import type { PricingUnit } from '@/utils/unitConverter';
import { calculatePricingUnitQuantity } from '@/utils/unitConverter';
import { calculateSQM } from '@/utils/sqmCalculator';
import { useState, useEffect } from 'react';
import { IndividualProductService } from '@/services/individualProductService';
import { validateNumberInput, ValidationPresets } from '@/utils/numberValidation';
import { formatCurrency } from '@/utils/formatHelpers';

interface OrderItemFormProps {
  item: ExtendedOrderItem;
  index: number;
  onUpdate: (id: string, field: keyof ExtendedOrderItem, value: any) => void;
  onRemove: (id: string) => void;
  onSelectProduct: (item: ExtendedOrderItem) => void;
  products?: any[];
  rawMaterials?: any[];
  onCollapse?: () => void;
  isCollapsible?: boolean;
}

export default function OrderItemForm({
  item,
  index,
  onUpdate,
  onRemove,
  onSelectProduct,
  products = [],
  rawMaterials = [],
  onCollapse,
  isCollapsible = false,
}: OrderItemFormProps) {
  const selectedProduct = item.product_id
    ? item.product_type === 'raw_material'
      ? rawMaterials.find(p => p.id === item.product_id)
      : products.find(p => p.id === item.product_id)
    : null;

  const productWithUnits = selectedProduct ? {
    ...selectedProduct,
    width_unit: selectedProduct.width_unit || (item as any).width_unit || '',
    length_unit: selectedProduct.length_unit || (item as any).length_unit || '',
    weight_unit: selectedProduct.weight_unit || (item as any).weight_unit || '',
  } : null;

  const [individualProductCount, setIndividualProductCount] = useState<number | null>(null);
  const [gstInputValue, setGstInputValue] = useState<string>('');
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());

  useEffect(() => { setTouchedFields(new Set()); }, [item.id]);

  useEffect(() => {
    if (item.gst_rate === undefined || item.gst_rate === null) { setGstInputValue(''); return; }
    setGstInputValue(String(item.gst_rate));
  }, [item.gst_rate, item.id]);

  useEffect(() => {
    const load = async () => {
      if (item.product_type === 'product' && item.product_id && productWithUnits?.individual_stock_tracking !== false) {
        try {
          const { total } = await IndividualProductService.getIndividualProductsByProductId(item.product_id, { status: 'available' });
          setIndividualProductCount(total || 0);
        } catch { setIndividualProductCount(null); }
      } else { setIndividualProductCount(null); }
    };
    load();
  }, [item.product_id, item.product_type, productWithUnits?.individual_stock_tracking]);

  const getAvailableStock = () => {
    if (!selectedProduct) return 'N/A';
    if (item.product_type === 'product') {
      const stock = individualProductCount !== null ? individualProductCount : (selectedProduct.available_stock ?? selectedProduct.current_stock ?? 0);
      const countUnit = selectedProduct.count_unit || 'rolls';
      const productText = `${stock} ${countUnit}`;
      if (selectedProduct.length && selectedProduct.width && selectedProduct.length_unit && selectedProduct.width_unit) {
        const totalSqm = calculateSQM(selectedProduct.length, selectedProduct.width, selectedProduct.length_unit, selectedProduct.width_unit) * stock;
        return `${productText} (${totalSqm.toFixed(1)} sqm)`;
      }
      return productText;
    }
    return `${selectedProduct.current_stock || 0} ${selectedProduct.unit || 'units'}`;
  };

  const countUnitLabel = item.product_type === 'raw_material' ? (productWithUnits?.unit || 'units') : (productWithUnits?.count_unit || 'rolls');
  const pricingUnitLabel = item.pricing_unit === 'unit' ? countUnitLabel : item.pricing_unit;
  const convertedQty = calculatePricingUnitQuantity(
    Number(item.quantity || 0),
    item.pricing_unit || 'unit',
    item.product_dimensions || {},
    (item.product_dimensions as any)?.length_unit || (item as any).length_unit,
    (item.product_dimensions as any)?.width_unit || (item as any).width_unit
  );

  return (
    <div className="p-3 space-y-3">
      {/* Header row */}
      <div className="flex items-center gap-2">
        <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-500 text-xs font-bold flex items-center justify-center flex-shrink-0">
          {index + 1}
        </span>
        <span className="flex-1 min-w-0 text-sm font-semibold text-slate-800 truncate">
          {item.product_name || 'Select product / material'}
        </span>
        <div className="flex items-center gap-1 flex-shrink-0">
          {isCollapsible && onCollapse && (
            <Button variant="ghost" size="sm" onClick={onCollapse} className="text-slate-400 hover:text-slate-600 h-7 w-7 p-0">
              <ChevronUp className="w-3.5 h-3.5" />
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={() => onRemove(item.id)} className="text-red-400 hover:text-red-600 hover:bg-red-50 h-7 w-7 p-0">
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Product spec chips (when selected) */}
      {productWithUnits && (
        <div className="flex flex-wrap gap-1.5 pb-1">
          {productWithUnits.length && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[11px] font-medium">
              L: {productWithUnits.length}{productWithUnits.length_unit ? ` ${productWithUnits.length_unit}` : ''}
            </span>
          )}
          {productWithUnits.width && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[11px] font-medium">
              W: {productWithUnits.width}{productWithUnits.width_unit ? ` ${productWithUnits.width_unit}` : ''}
            </span>
          )}
          {productWithUnits.weight && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[11px] font-medium">
              {productWithUnits.weight} GSM
            </span>
          )}
          {productWithUnits.color && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[11px] font-medium">
              {productWithUnits.color}
            </span>
          )}
          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-blue-50 text-blue-600 text-[11px] font-medium">
            {getAvailableStock()} avail.
          </span>
          {item.unit_price <= 0 && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-amber-50 text-amber-600 text-[11px] font-medium">
              Set price below
            </span>
          )}
        </div>
      )}

      {/* Type + Product selector — compact row */}
      <div className="grid grid-cols-[120px_1fr] gap-2">
        <div>
          <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1 block">Type</Label>
          <Select value={item.product_type} onValueChange={(v: 'product' | 'raw_material') => onUpdate(item.id, 'product_type', v)}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="product">Product</SelectItem>
              <SelectItem value="raw_material">Material</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1 block">
            {item.product_type === 'raw_material' ? 'Material' : 'Product'}
          </Label>
          <Button
            variant="outline"
            className="w-full h-8 justify-start text-xs font-normal text-left"
            onClick={() => onSelectProduct(item)}
          >
            <Search className="w-3 h-3 mr-1.5 flex-shrink-0 text-slate-400" />
            <span className="truncate text-slate-600">{item.product_name || 'Search & select…'}</span>
          </Button>
        </div>
      </div>

      {/* Pricing row — 4 compact fields */}
      <div className="grid grid-cols-4 gap-2">
        <div>
          <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1 block">Qty</Label>
          <Input
            type="number"
            value={item.quantity || ''}
            onChange={e => {
              const v = validateNumberInput(e.target.value, ValidationPresets.PRODUCT_QUANTITY);
              onUpdate(item.id, 'quantity', v.value === '' ? 0 : parseInt(v.value) || 0);
            }}
            onBlur={() => setTouchedFields(p => new Set(p).add('quantity'))}
            min="1" max="99999" step="1"
            placeholder="0"
            className={`h-8 text-xs ${touchedFields.has('quantity') && !item.quantity ? 'border-red-400' : ''}`}
          />
        </div>

        <div>
          <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1 block">Unit</Label>
          <Input value={countUnitLabel} readOnly className="h-8 text-xs bg-slate-50 text-slate-500" />
        </div>

        <div>
          <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1 block">Price/</Label>
          <Select value={item.pricing_unit} onValueChange={(v: PricingUnit) => onUpdate(item.id, 'pricing_unit', v)}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {item.product_type === 'raw_material' ? (
                selectedProduct && <SelectItem value="unit">Per {selectedProduct.unit || 'unit'}</SelectItem>
              ) : (
                <>
                  {selectedProduct && <SelectItem value="unit">Per {selectedProduct.count_unit || 'roll'}</SelectItem>}
                  <SelectItem value="sqm">SQM</SelectItem>
                  <SelectItem value="sqft">SQFT</SelectItem>
                  <SelectItem value="running_meter">Running Meter</SelectItem>
                  <SelectItem value="gsm">GSM</SelectItem>
                  <SelectItem value="kg">KG</SelectItem>
                </>
              )}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1 block">Rate (₹)</Label>
          <Input
            type="number"
            value={item.unit_price || ''}
            onChange={e => {
              const v = validateNumberInput(e.target.value, ValidationPresets.PRICE);
              onUpdate(item.id, 'unit_price', v.value === '' ? 0 : parseFloat(v.value) || 0);
            }}
            onBlur={() => setTouchedFields(p => new Set(p).add('unit_price'))}
            min="0" step="0.01"
            placeholder="0.00"
            className={`h-8 text-xs ${touchedFields.has('unit_price') && !item.unit_price ? 'border-red-400' : ''}`}
          />
        </div>
      </div>

      {/* GST row + conversion hint */}
      <div className="grid grid-cols-[1fr_auto_auto] gap-2 items-end">
        <div>
          <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1 block">GST %</Label>
          <Input
            type="number"
            value={gstInputValue}
            onChange={e => {
              const raw = e.target.value;
              const v = validateNumberInput(raw, ValidationPresets.PERCENTAGE);
              setGstInputValue(v.value);
              if (v.value === '' || v.value === '.') { onUpdate(item.id, 'gst_rate', undefined); return; }
              const n = parseFloat(v.value);
              if (!isNaN(n)) { onUpdate(item.id, 'gst_rate', n); onUpdate(item.id, 'gst_included', n > 0); }
            }}
            onBlur={e => {
              const cur = e.target.value.trim();
              if (cur === '') { setGstInputValue('0'); onUpdate(item.id, 'gst_rate', 0); onUpdate(item.id, 'gst_included', false); return; }
              const p = parseFloat(cur);
              if (isNaN(p) || p < 0) { setGstInputValue('0'); onUpdate(item.id, 'gst_rate', 0); onUpdate(item.id, 'gst_included', false); return; }
              const c = Math.min(18, p);
              onUpdate(item.id, 'gst_rate', c); onUpdate(item.id, 'gst_included', c > 0); setGstInputValue(String(c));
            }}
            min="0" max="18" step="0.01" placeholder="0"
            className="h-8 text-xs"
          />
        </div>

        <div className="h-8 flex items-center gap-1.5 px-2 rounded-md border bg-slate-50">
          <Checkbox
            id={`gst-${item.id}`}
            checked={item.gst_included === true}
            onCheckedChange={checked => {
              onUpdate(item.id, 'gst_included', checked);
              if (!checked) { onUpdate(item.id, 'gst_rate', 0); }
              else if (!item.gst_rate || item.gst_rate === 0) { onUpdate(item.id, 'gst_rate', 18); }
            }}
            className="h-3.5 w-3.5"
          />
          <Label htmlFor={`gst-${item.id}`} className="text-xs text-slate-600 cursor-pointer whitespace-nowrap">GST incl.</Label>
        </div>

        {/* Conversion hint */}
        {!!item.quantity && item.pricing_unit !== 'unit' && (
          <div className="h-8 flex items-center px-2 rounded-md bg-blue-50 text-blue-600 text-[11px] font-medium whitespace-nowrap">
            = {convertedQty.toFixed(2)} {pricingUnitLabel}
          </div>
        )}
      </div>

      {/* Error message */}
      {item.errorMessage && (
        <div className="px-3 py-2 rounded-md bg-red-50 border border-red-200 text-xs text-red-700">
          {item.errorMessage}
        </div>
      )}

      {/* Totals summary bar */}
      <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs">
        <span className="text-slate-500">Subtotal <span className="font-semibold text-slate-700">{formatCurrency(item.subtotal ?? 0, { full: true })}</span></span>
        <span className="text-slate-300">·</span>
        <span className="text-slate-500">GST <span className="font-semibold text-slate-700">{formatCurrency(item.gst_amount ?? 0, { full: true })}</span></span>
        <span className="text-slate-300">·</span>
        <span className="text-slate-500">Total <span className="font-bold text-primary-600 text-sm">{formatCurrency(item.total_price ?? 0, { full: true })}</span></span>
      </div>
    </div>
  );
}
