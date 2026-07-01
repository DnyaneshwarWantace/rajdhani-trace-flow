import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Trash2, Package } from 'lucide-react';
import type { ExtendedOrderItem } from '@/hooks/usePricingCalculator';
import type { PricingUnit } from '@/utils/unitConverter';
import { calculatePricingUnitQuantity } from '@/utils/unitConverter';
import { validateNumberInput, ValidationPresets } from '@/utils/numberValidation';
import { formatCurrency } from '@/utils/formatHelpers';
import { IndividualProductService } from '@/services/individualProductService';

interface MobileOrderItemFormProps {
  item: ExtendedOrderItem;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
  onUpdate: (id: string, field: keyof ExtendedOrderItem, value: any) => void;
  onRemove: (id: string) => void;
  onSelectProduct: (item: ExtendedOrderItem) => void;
  products?: any[];
  rawMaterials?: any[];
}

export default function MobileOrderItemForm({
  item, index, isExpanded, onToggle,
  onUpdate, onRemove, onSelectProduct,
  products = [], rawMaterials = [],
}: MobileOrderItemFormProps) {
  const foundProduct = item.product_id
    ? item.product_type === 'raw_material'
      ? rawMaterials.find(p => p.id === item.product_id)
      : products.find(p => p.id === item.product_id)
    : null;

  const selectedProduct = foundProduct ?? (item.product_id ? {
    length: item.product_dimensions?.length,
    width: item.product_dimensions?.width,
    weight: item.product_dimensions?.weight,
    color: (item as any).color,
    pattern: (item as any).pattern,
    count_unit: (item as any).count_unit || item.unit,
    unit: item.unit,
    individual_stock_tracking: (item as any).individual_stock_tracking !== false,
    available_stock: (item as any).available_stock ?? 0,
    current_stock: (item as any).available_stock ?? 0,
    length_unit: (item.product_dimensions as any)?.length_unit || (item as any).length_unit,
    width_unit: (item.product_dimensions as any)?.width_unit || (item as any).width_unit,
    weight_unit: (item as any).weight_unit,
  } : null);

  const [gstInputValue, setGstInputValue] = useState(String(item.gst_rate ?? 5));
  const [showPricingUnitPicker, setShowPricingUnitPicker] = useState(false);
  const [individualProductCount, setIndividualProductCount] = useState<number | null>(null);

  useEffect(() => {
    setGstInputValue(String(item.gst_rate ?? 5));
  }, [item.gst_rate, item.id]);

  useEffect(() => {
    if (item.product_type === 'product' && item.product_id && selectedProduct?.individual_stock_tracking !== false) {
      IndividualProductService.getIndividualProductsByProductId(item.product_id, { status: 'available' })
        .then(({ total }) => setIndividualProductCount(total || 0))
        .catch(() => setIndividualProductCount(null));
    } else {
      setIndividualProductCount(null);
    }
  }, [item.product_id, item.product_type]);

  const isProd = item.product_type !== 'raw_material';
  const countUnitLabel = isProd ? (selectedProduct?.count_unit || 'rolls') : (selectedProduct?.unit || 'units');
  const pricingUnitLabel = item.pricing_unit === 'unit' ? countUnitLabel : (item.pricing_unit || countUnitLabel);

  const convertedQty = calculatePricingUnitQuantity(
    Number(item.quantity || 0),
    item.pricing_unit || 'unit',
    item.product_dimensions || {},
    (item.product_dimensions as any)?.length_unit || (item as any).length_unit,
    (item.product_dimensions as any)?.width_unit || (item as any).width_unit,
  );

  const length = parseFloat(selectedProduct?.length || '0');
  const width = parseFloat(selectedProduct?.width || '0');
  const sqm = length > 0 && width > 0 ? (length * width).toFixed(2) : null;

  const stock = isProd
    ? (individualProductCount !== null ? individualProductCount : (selectedProduct?.available_stock ?? selectedProduct?.current_stock ?? 0))
    : (selectedProduct?.current_stock ?? 0);

  const PRICING_UNITS: { value: PricingUnit; label: string; disabled?: boolean }[] = isProd ? [
    { value: 'unit', label: countUnitLabel },
    { value: 'sqm', label: 'SQM', disabled: !sqm },
    { value: 'sqft', label: 'SQFT', disabled: !sqm },
    { value: 'running_meter', label: 'Running Meter' },
    { value: 'gsm', label: 'GSM', disabled: !selectedProduct?.weight },
    { value: 'kg', label: 'KG', disabled: !selectedProduct?.weight || !sqm },
  ] : [
    { value: 'unit', label: countUnitLabel },
  ];

  const isInvalid = !item.isValid && !!item.product_id;

  return (
    <div className={`bg-white rounded-2xl border mb-3 overflow-hidden ${isInvalid ? 'border-red-400' : 'border-gray-200'} shadow-sm`}>
      {/* Collapsed header — always visible */}
      <button
        className="w-full flex items-center gap-3 p-3.5 text-left"
        onClick={onToggle}
      >
        {/* Icon */}
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${isProd ? 'bg-blue-50' : 'bg-purple-50'}`}>
          <Package className={`w-4 h-4 ${isProd ? 'text-blue-500' : 'text-purple-500'}`} />
        </div>

        {/* Name + detail */}
        <div className="flex-1 min-w-0">
          <p className={`text-[13.5px] font-bold truncate ${item.product_name ? 'text-gray-900' : 'text-gray-400'}`}>
            {item.product_name || 'Select product…'}
          </p>
          {item.product_name && (
            <p className="text-[11px] text-gray-500 mt-0.5">
              {item.quantity || 0} {countUnitLabel} · {pricingUnitLabel} · {formatCurrency(item.total_price ?? 0, { full: true })}
            </p>
          )}
          {isInvalid && item.errorMessage && (
            <p className="text-[11px] text-red-500 mt-0.5">{item.errorMessage}</p>
          )}
        </div>

        {/* Actions */}
        <button
          onClick={e => { e.stopPropagation(); onRemove(item.id); }}
          className="w-7 h-7 flex items-center justify-center flex-shrink-0"
        >
          <Trash2 className="w-4 h-4 text-red-400" />
        </button>
        {isExpanded
          ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
          : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
        }
      </button>

      {/* Expanded form */}
      {isExpanded && (
        <div className="border-t border-gray-100 px-3.5 pt-3.5 pb-4 space-y-3">

          {/* Product type toggle */}
          <div className="flex gap-2">
            {(['product', 'raw_material'] as const).map(t => (
              <button
                key={t}
                onClick={() => onUpdate(item.id, 'product_type', t)}
                className={`flex-1 py-2 rounded-xl border-[1.5px] text-sm font-semibold transition-colors ${
                  item.product_type === t
                    ? t === 'product' ? 'border-blue-600 bg-blue-50 text-blue-600' : 'border-purple-600 bg-purple-50 text-purple-600'
                    : 'border-gray-200 bg-white text-gray-500'
                }`}
              >
                {t === 'product' ? 'Product' : 'Raw Material'}
              </button>
            ))}
          </div>

          {/* Product selector */}
          <button
            onClick={() => onSelectProduct(item)}
            className={`w-full flex items-center gap-2 px-3 py-3 rounded-xl border-[1.5px] text-left transition-colors ${
              item.product_id ? 'border-blue-500 bg-white' : 'border-gray-200 bg-gray-50'
            }`}
          >
            <span className={`flex-1 text-[13.5px] truncate ${item.product_name ? 'font-bold text-gray-900' : 'font-normal text-gray-400'}`}>
              {item.product_name || (isProd ? 'Select product…' : 'Select material…')}
            </span>
            <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
            </svg>
          </button>

          {/* Spec chips */}
          {selectedProduct && (
            <div className="flex flex-wrap gap-1.5">
              {selectedProduct.length && selectedProduct.width && (
                <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                  {selectedProduct.length}{selectedProduct.length_unit || 'm'} × {selectedProduct.width}{selectedProduct.width_unit || 'm'}
                </span>
              )}
              {sqm && (
                <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-bold">
                  {sqm} SQM
                </span>
              )}
              {selectedProduct.weight && (
                <span className="text-[10px] bg-green-50 text-green-700 px-2 py-0.5 rounded-full font-medium">
                  {selectedProduct.weight} {selectedProduct.weight_unit || 'GSM'}
                </span>
              )}
              {selectedProduct.color && (
                <span className="text-[10px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                  {selectedProduct.color}
                </span>
              )}
              {isProd && selectedProduct.pattern && (
                <span className="text-[10px] bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full font-medium">
                  {selectedProduct.pattern}
                </span>
              )}
              <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-medium">
                {stock} {countUnitLabel} avail.
              </span>
            </div>
          )}

          {/* Qty + Unit */}
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Quantity</label>
              <input
                type="number"
                value={item.quantity || ''}
                onChange={e => {
                  const v = validateNumberInput(e.target.value, ValidationPresets.PRODUCT_QUANTITY);
                  onUpdate(item.id, 'quantity', v.value === '' ? 0 : parseInt(v.value) || 0);
                }}
                placeholder="1"
                className="w-full h-11 px-3 rounded-xl border border-gray-200 bg-gray-50 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex-1">
              <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Unit</label>
              <button
                onClick={() => setShowPricingUnitPicker(true)}
                className="w-full h-11 px-3 rounded-xl border border-gray-200 bg-gray-50 flex items-center justify-between text-sm"
              >
                <span className="text-gray-900 font-medium">{PRICING_UNITS.find(u => u.value === item.pricing_unit)?.label || countUnitLabel}</span>
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
                </svg>
              </button>
            </div>
          </div>
          {item.pricing_unit !== 'unit' && item.quantity && convertedQty > 0 && (
            <p className="text-[11px] text-blue-600 -mt-1 ml-1">= {convertedQty.toFixed(2)} {pricingUnitLabel} total</p>
          )}

          {/* Unit Price */}
          <div>
            <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1 block">
              Rate / {pricingUnitLabel} (₹)
            </label>
            <div className="flex items-center h-11 px-3 rounded-xl border border-gray-200 bg-gray-50 gap-1">
              <span className="text-gray-400 text-sm">₹</span>
              <input
                type="number"
                value={item.unit_price || ''}
                onChange={e => {
                  const v = validateNumberInput(e.target.value, ValidationPresets.PRICE);
                  onUpdate(item.id, 'unit_price', v.value === '' ? 0 : parseFloat(v.value) || 0);
                }}
                placeholder="0.00"
                className="flex-1 bg-transparent text-sm text-gray-900 outline-none"
              />
            </div>
          </div>

          {/* GST */}
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1 block">GST %</label>
              <input
                type="number"
                value={gstInputValue}
                onChange={e => {
                  const v = validateNumberInput(e.target.value, ValidationPresets.PERCENTAGE);
                  setGstInputValue(v.value);
                  const n = parseFloat(v.value);
                  if (!isNaN(n)) { onUpdate(item.id, 'gst_rate', n); onUpdate(item.id, 'gst_included', n > 0); }
                }}
                onBlur={() => {
                  const p = parseFloat(gstInputValue);
                  const c = isNaN(p) ? 0 : Math.min(18, Math.max(0, p));
                  setGstInputValue(String(c));
                  onUpdate(item.id, 'gst_rate', c);
                  onUpdate(item.id, 'gst_included', c > 0);
                }}
                min="0" max="18" placeholder="0"
                className="w-full h-11 px-3 rounded-xl border border-gray-200 bg-gray-50 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex-1">
              <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1 block">GST Applied</label>
              <button
                onClick={() => {
                  const next = !item.gst_included;
                  onUpdate(item.id, 'gst_included', next);
                  if (!next) onUpdate(item.id, 'gst_rate', 0);
                  else if (!item.gst_rate || item.gst_rate === 0) onUpdate(item.id, 'gst_rate', 5);
                }}
                className="w-full h-11 px-3 rounded-xl border border-gray-200 bg-gray-50 flex items-center gap-2"
              >
                <div className={`w-5 h-5 rounded-[5px] border-[1.5px] flex items-center justify-center flex-shrink-0 ${item.gst_included ? 'border-blue-600 bg-blue-600' : 'border-gray-300 bg-white'}`}>
                  {item.gst_included && (
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/>
                    </svg>
                  )}
                </div>
                <span className={`text-sm font-semibold ${item.gst_included ? 'text-blue-600' : 'text-gray-500'}`}>
                  {item.gst_included ? 'Yes' : 'No'}
                </span>
              </button>
            </div>
          </div>

          {/* Price breakdown */}
          <div className="bg-gray-50 rounded-xl p-3 space-y-1.5">
            <div className="flex justify-between">
              <span className="text-xs text-gray-500">Subtotal</span>
              <span className="text-xs font-semibold text-gray-900">{formatCurrency(item.subtotal ?? 0, { full: true })}</span>
            </div>
            {item.gst_included && (item.gst_amount ?? 0) > 0 && (
              <div className="flex justify-between">
                <span className="text-xs text-gray-500">GST ({item.gst_rate}%)</span>
                <span className="text-xs font-semibold text-gray-900">{formatCurrency(item.gst_amount ?? 0, { full: true })}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-gray-200 pt-1.5 mt-1.5">
              <span className="text-[13px] font-bold text-gray-900">Total</span>
              <span className="text-sm font-extrabold text-blue-600">{formatCurrency(item.total_price ?? 0, { full: true })}</span>
            </div>
          </div>
        </div>
      )}

      {/* Pricing Unit picker sheet */}
      {showPricingUnitPicker && (
        <>
          <div className="fixed inset-0 bg-black/40 z-[70]" onClick={() => setShowPricingUnitPicker(false)} />
          <div className="fixed bottom-0 left-0 right-0 z-[80] bg-white rounded-t-2xl shadow-2xl">
            <div className="flex justify-center pt-2.5 pb-1">
              <div className="w-9 h-1 rounded-full bg-gray-300" />
            </div>
            <div className="px-4 py-3 border-b border-gray-100">
              <span className="text-[15px] font-bold text-gray-900">Select Unit</span>
            </div>
            <div className="pb-8">
              {PRICING_UNITS.map((opt, i) => {
                const active = item.pricing_unit === opt.value;
                return (
                  <button
                    key={opt.value}
                    disabled={opt.disabled}
                    onClick={() => { onUpdate(item.id, 'pricing_unit', opt.value); setShowPricingUnitPicker(false); }}
                    className={`w-full flex items-center justify-between px-4 py-4 text-left ${i > 0 ? 'border-t border-gray-100' : ''} ${opt.disabled ? 'opacity-40' : ''} ${active ? 'bg-blue-50' : ''}`}
                  >
                    <span className={`text-sm font-semibold ${active ? 'text-blue-600' : 'text-gray-900'}`}>{opt.label}</span>
                    {active && (
                      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/>
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
