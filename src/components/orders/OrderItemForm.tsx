import { Package, Trash2, Search, Box, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
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
  // Get the selected product/material details
  const selectedProduct = item.product_id
    ? item.product_type === 'raw_material'
      ? rawMaterials.find(p => p.id === item.product_id)
      : products.find(p => p.id === item.product_id)
    : null;

  // Merge with item data to get unit information that might be stored there
  const productWithUnits = selectedProduct ? {
    ...selectedProduct,
    // Use unit info from item if product doesn't have it
    width_unit: selectedProduct.width_unit || (item as any).width_unit || '',
    length_unit: selectedProduct.length_unit || (item as any).length_unit || '',
    weight_unit: selectedProduct.weight_unit || (item as any).weight_unit || '',
  } : null;

  // State for individual product count
  const [individualProductCount, setIndividualProductCount] = useState<number | null>(null);
  const [gstInputValue, setGstInputValue] = useState<string>('');
  
  // State for tracking touched fields for validation
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());

  // Reset touched fields when item changes
  useEffect(() => {
    setTouchedFields(new Set());
  }, [item.id]);

  useEffect(() => {
    if (item.gst_rate === undefined || item.gst_rate === null) {
      setGstInputValue('');
      return;
    }
    setGstInputValue(String(item.gst_rate));
  }, [item.gst_rate, item.id]);

  // Load individual products count if product has individual tracking
  useEffect(() => {
    const loadIndividualProductCount = async () => {
      if (
        item.product_type === 'product' &&
        item.product_id &&
        productWithUnits &&
        productWithUnits.individual_stock_tracking !== false
      ) {
        try {
          const { total } = await IndividualProductService.getIndividualProductsByProductId(
            item.product_id,
            { status: 'available' }
          );
          setIndividualProductCount(total || 0);
        } catch (error) {
          console.error('Error loading individual products:', error);
          setIndividualProductCount(null);
        }
      } else {
        setIndividualProductCount(null);
      }
    };

    loadIndividualProductCount();
  }, [item.product_id, item.product_type, productWithUnits?.individual_stock_tracking]);

  // Calculate available stock with SQM for products
  const getAvailableStock = () => {
    if (!selectedProduct) return 'N/A';
    
    if (item.product_type === 'product') {
      // Use individual product count if available, otherwise use current_stock
      const stock = individualProductCount !== null ? individualProductCount : (selectedProduct.current_stock || 0);
      const countUnit = selectedProduct.count_unit || 'rolls';
      const productText = `${stock} ${countUnit}`;
      
      // Calculate total SQM if length and width are available
      if (selectedProduct.length && selectedProduct.width && selectedProduct.length_unit && selectedProduct.width_unit) {
        const totalSqm = calculateSQM(selectedProduct.length, selectedProduct.width, selectedProduct.length_unit, selectedProduct.width_unit) * stock;
        return `${productText} (${totalSqm.toFixed(2)} sqm)`;
      }
      
      return productText;
    } else {
      const stock = selectedProduct.current_stock || 0;
      const unit = selectedProduct.unit || 'units';
      return `${stock} ${unit}`;
    }
  };

  const countUnitLabel =
    item.product_type === 'raw_material'
      ? (productWithUnits?.unit || 'units')
      : (productWithUnits?.count_unit || 'rolls');
  const pricingUnitLabel = item.pricing_unit === 'unit' ? countUnitLabel : item.pricing_unit;
  const convertedPricingQuantity = calculatePricingUnitQuantity(
    Number(item.quantity || 0),
    item.pricing_unit || 'unit',
    item.product_dimensions || {},
    (item as any).length_unit,
    (item as any).width_unit
  );

  return (
    <div className="p-4 border rounded-lg space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <Package className="w-5 h-5 text-blue-600 flex-shrink-0" />
          <h3 className="font-medium text-lg flex-shrink-0">Order Item #{index + 1}</h3>
          {item.product_name && <Badge variant="secondary" className="truncate max-w-md" title={item.product_name}>{item.product_name}</Badge>}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {isCollapsible && onCollapse && (
            <Button
              variant="outline"
              size="sm"
              onClick={onCollapse}
              className="text-gray-600"
              title="Collapse"
            >
              <ChevronUp className="w-4 h-4 mr-2" />
              Close
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onRemove(item.id)}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Remove
          </Button>
        </div>
      </div>

      {/* Selected Product Details */}
      {item.product_id && productWithUnits && (
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center gap-2 text-blue-800 font-medium mb-3">
            <Box className="w-4 h-4" />
            Selected Product Details
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
            <div className="col-span-2 md:col-span-3">
              <div className="flex items-start gap-2">
                <span className="font-medium text-gray-700 flex-shrink-0">Name:</span>
                <span className="text-gray-900 truncate" title={item.product_name}>{item.product_name}</span>
              </div>
            </div>
            <div>
              <span className="font-medium text-gray-700">Your Price:</span>
              <span className="ml-2 text-gray-900">
                {item.unit_price > 0
                  ? `₹${item.unit_price.toFixed(2)} / ${pricingUnitLabel}`
                  : 'Not set'}
              </span>
            </div>
            {productWithUnits.width && (
              <div>
                <span className="font-medium text-gray-700">Width:</span>
                <span className="ml-2 text-gray-900">
                  {productWithUnits.width} {productWithUnits.width_unit ? productWithUnits.width_unit : ''}
                </span>
              </div>
            )}
            {productWithUnits.weight && (
              <div>
                <span className="font-medium text-gray-700">GSM:</span>
                <span className="ml-2 text-gray-900">
                  {productWithUnits.weight} {productWithUnits.weight_unit ? productWithUnits.weight_unit : ''}
                </span>
              </div>
            )}
            {productWithUnits.pattern && (
              <div>
                <span className="font-medium text-gray-700">Pattern:</span>
                <span className="ml-2 text-gray-900">{productWithUnits.pattern}</span>
              </div>
            )}
            <div>
              <span className="font-medium text-gray-700">Unit:</span>
              <span className="ml-2 text-gray-900">
                {item.product_type === 'raw_material' 
                  ? (productWithUnits.unit || 'units')
                  : (productWithUnits.count_unit || 'rolls')
                }
              </span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Available:</span>
              <span className="ml-2 text-gray-900">{getAvailableStock()}</span>
            </div>
            {productWithUnits.length && (
              <div>
                <span className="font-medium text-gray-700">Length:</span>
                <span className="ml-2 text-gray-900">
                  {productWithUnits.length} {productWithUnits.length_unit ? productWithUnits.length_unit : ''}
                </span>
              </div>
            )}
            {productWithUnits.color && (
              <div>
                <span className="font-medium text-gray-700">Color:</span>
                <span className="ml-2 text-gray-900">{productWithUnits.color}</span>
              </div>
            )}
          </div>
          
          {/* Pricing Warning */}
          {item.unit_price <= 0 && (
            <div className="mt-3 p-2 bg-yellow-100 border border-yellow-300 rounded text-xs text-yellow-800">
              ⚠️ <strong>Pricing Required:</strong> Please enter your selling price per {(() => {
                if (item.product_type === 'raw_material') {
                  return productWithUnits?.unit || 'unit';
                } else {
                  return productWithUnits?.count_unit || 'roll';
                }
              })()} in the pricing section below.
            </div>
          )}
        </div>
      )}

      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Product Type</Label>
            <Select
              value={item.product_type}
              onValueChange={(value: 'product' | 'raw_material') => onUpdate(item.id, 'product_type', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="product">Product</SelectItem>
                <SelectItem value="raw_material">Raw Material</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label>Product/Material</Label>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => onSelectProduct(item)}
              title={item.product_name || 'Select Product/Material'}
            >
              <Search className="w-4 h-4 mr-2 flex-shrink-0" />
              <span className="truncate">{item.product_name || 'Select Product/Material'}</span>
            </Button>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
            <div className="space-y-2">
              <Label>Quantity</Label>
              <Input
                type="number"
                value={item.quantity || 0}
                onChange={e => {
                  const validation = validateNumberInput(e.target.value, ValidationPresets.PRODUCT_QUANTITY);
                  onUpdate(item.id, 'quantity', validation.value === '' ? 0 : parseInt(validation.value) || 0);
                }}
                onBlur={() => {
                  setTouchedFields(prev => new Set(prev).add('quantity'));
                }}
                onFocus={() => {
                  setTouchedFields(prev => new Set(prev).add('quantity'));
                }}
                min="1"
                max="99999"
                step="1"
                placeholder="Enter quantity"
                className={touchedFields.has('quantity') && (!item.quantity || item.quantity === 0) ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}
              />
              {touchedFields.has('quantity') && (!item.quantity || item.quantity === 0) && (
                <p className="text-xs text-red-500 mt-1">Quantity is required</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Quantity Unit</Label>
              <Input
                value={countUnitLabel}
                readOnly
                className="bg-white"
                placeholder="Unit"
              />
              <p className="text-xs text-gray-500 mt-1">
                Auto from selected {item.product_type === 'raw_material' ? 'material' : 'product'}
              </p>
            </div>

            <div className="space-y-2">
              <Label>Pricing Unit</Label>
              <Select
                value={item.pricing_unit}
                onValueChange={(value: PricingUnit) => onUpdate(item.id, 'pricing_unit', value)}
              >
                <SelectTrigger className="bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {item.product_type === 'raw_material' ? (
                    selectedProduct && (
                      <SelectItem value="unit">
                        Per {selectedProduct.unit || 'units'}
                      </SelectItem>
                    )
                  ) : (
                    <>
                      {selectedProduct && (
                        <SelectItem value="unit">Per {selectedProduct.count_unit || 'rolls'}</SelectItem>
                      )}
                      <SelectItem value="sqm">SQM</SelectItem>
                      <SelectItem value="sqft">SQFT</SelectItem>
                      <SelectItem value="gsm">GSM</SelectItem>
                      <SelectItem value="kg">KG</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Unit Price</Label>
              <Input
                type="number"
                value={item.unit_price || ''}
                onChange={e => {
                  const validation = validateNumberInput(e.target.value, ValidationPresets.PRICE);
                  onUpdate(item.id, 'unit_price', validation.value === '' ? 0 : parseFloat(validation.value) || 0);
                }}
                onBlur={() => {
                  setTouchedFields(prev => new Set(prev).add('unit_price'));
                }}
                onFocus={() => {
                  setTouchedFields(prev => new Set(prev).add('unit_price'));
                }}
                min="0"
                max="9999999.99"
                step="0.01"
                className={`bg-white ${touchedFields.has('unit_price') && (!item.unit_price || item.unit_price === 0) ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
              />
              {touchedFields.has('unit_price') && (!item.unit_price || item.unit_price === 0) && (
                <p className="text-xs text-red-500 mt-1">Unit price is required</p>
              )}
            </div>
          </div>
          {!!item.quantity && (
            <div className="mt-3 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
              <span className="font-medium">Converted quantity:</span>{' '}
              {item.quantity} {countUnitLabel} = {convertedPricingQuantity.toFixed(2)} {pricingUnitLabel}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>GST Rate (%)</Label>
            <Input
              type="number"
              value={gstInputValue}
              onChange={e => {
                const rawValue = e.target.value;
                const validation = validateNumberInput(rawValue, ValidationPresets.PERCENTAGE);
                const inputValue = validation.value;
                setGstInputValue(inputValue);

                if (inputValue === '' || inputValue === '.') {
                  onUpdate(item.id, 'gst_rate', undefined);
                  return;
                }

                const numValue = parseFloat(inputValue);
                if (!isNaN(numValue)) {
                  onUpdate(item.id, 'gst_rate', numValue);
                  onUpdate(item.id, 'gst_included', numValue > 0);
                }
              }}
              onBlur={e => {
                const current = e.target.value.trim();
                if (current === '') {
                  setGstInputValue('0');
                  onUpdate(item.id, 'gst_rate', 0);
                  onUpdate(item.id, 'gst_included', false);
                  return;
                }

                const parsed = parseFloat(current);
                if (isNaN(parsed) || parsed < 0) {
                  setGstInputValue('0');
                  onUpdate(item.id, 'gst_rate', 0);
                  onUpdate(item.id, 'gst_included', false);
                  return;
                }

                // Clamp to max 18 only, allow any value >= 0 (min 5 enforced only when > 0)
                const clamped = Math.min(18, parsed);
                onUpdate(item.id, 'gst_rate', clamped);
                onUpdate(item.id, 'gst_included', clamped > 0);
                setGstInputValue(String(clamped));
              }}
              min="0"
              max="18"
              step="0.01"
              placeholder={item.gst_included ? '5-18' : '0'}
            />
            {item.gst_rate !== undefined && item.gst_rate !== null && item.gst_rate > 0 && item.gst_rate < 5 && item.gst_included && (
              <p className="text-xs text-red-500 mt-1">GST rate must be between 5% and 18%</p>
            )}
            {item.gst_rate !== undefined && item.gst_rate !== null && item.gst_rate > 18 && item.gst_included && (
              <p className="text-xs text-red-500 mt-1">GST rate cannot exceed 18%</p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              GST can be 5% to 18%. Uncheck GST Included to keep GST at 0.
            </p>
          </div>

          <div className="space-y-2">
            <Label>GST Option</Label>
            <div className="h-10 px-3 rounded-md border bg-white flex items-center">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id={`gst-included-${item.id}`}
                  checked={item.gst_included === true}
                  onCheckedChange={(checked) => {
                    onUpdate(item.id, 'gst_included', checked);
                    if (!checked) {
                      onUpdate(item.id, 'gst_rate', 0);
                    } else if (checked && (item.gst_rate === undefined || item.gst_rate === null || item.gst_rate === 0)) {
                      onUpdate(item.id, 'gst_rate', 18);
                    } else if (checked) {
                      const currentRate = item.gst_rate ?? 0;
                      if (currentRate > 0 && currentRate < 5) {
                        onUpdate(item.id, 'gst_rate', 18);
                      } else if (currentRate > 18) {
                        onUpdate(item.id, 'gst_rate', 18);
                      }
                    }
                  }}
                />
                <Label htmlFor={`gst-included-${item.id}`} className="text-sm font-normal cursor-pointer">
                  GST Included
                </Label>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Price Summary</Label>
            <div className="h-10 px-3 rounded-md border bg-white flex items-center text-sm text-gray-700">
              {item.unit_price > 0 ? `₹${item.unit_price.toFixed(2)} / ${pricingUnitLabel}` : 'Set unit price to calculate'}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Subtotal (Before GST)</Label>
            <Input
              type="number"
              value={(item.subtotal || 0).toFixed(2)}
              readOnly
              className="bg-gray-50"
            />
          </div>

          <div className="space-y-2">
            <Label>GST Amount</Label>
            <Input
              type="number"
              value={(item.gst_amount || 0).toFixed(2)}
              readOnly
              className="bg-gray-50"
            />
          </div>

          <div className="space-y-2">
            <Label>Total Price (Inc. GST)</Label>
            <Input
              type="number"
              value={(item.total_price || 0).toFixed(2)}
              readOnly
              className="bg-blue-50 border-blue-200 font-semibold text-blue-900"
            />
          </div>
        </div>
      </div>

      {item.errorMessage && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
          {item.errorMessage}
        </div>
      )}

      {/* This item summary only – at bottom of card */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-1 py-2 px-3 rounded-md bg-gray-100 border border-gray-200 text-sm">
        <span><span className="text-gray-600">Subtotal:</span> <span className="font-medium">{formatCurrency(item.subtotal ?? 0, { full: true })}</span></span>
        <span><span className="text-gray-600">GST:</span> <span className="font-medium">{formatCurrency(item.gst_amount ?? 0, { full: true })}</span></span>
        <span><span className="text-gray-600">This item total:</span> <span className="font-semibold text-primary">{formatCurrency(item.total_price ?? 0, { full: true })}</span></span>
      </div>
    </div>
  );
}


