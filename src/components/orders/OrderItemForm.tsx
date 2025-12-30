import { Package, Trash2, Search, Box } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import type { ExtendedOrderItem } from '@/hooks/usePricingCalculator';
import type { PricingUnit } from '@/utils/unitConverter';
import { calculateSQM } from '@/utils/sqmCalculator';
import { useState, useEffect } from 'react';
import { IndividualProductService } from '@/services/individualProductService';

interface OrderItemFormProps {
  item: ExtendedOrderItem;
  index: number;
  onUpdate: (id: string, field: keyof ExtendedOrderItem, value: any) => void;
  onRemove: (id: string) => void;
  onSelectProduct: (item: ExtendedOrderItem) => void;
  products?: any[];
  rawMaterials?: any[];
}

export default function OrderItemForm({
  item,
  index,
  onUpdate,
  onRemove,
  onSelectProduct,
  products = [],
  rawMaterials = [],
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

  return (
    <div className="p-4 border rounded-lg space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <Package className="w-5 h-5 text-blue-600 flex-shrink-0" />
          <h3 className="font-medium text-lg flex-shrink-0">Order Item #{index + 1}</h3>
          {item.product_name && <Badge variant="secondary" className="truncate max-w-md" title={item.product_name}>{item.product_name}</Badge>}
        </div>
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
              <span className="ml-2 text-gray-900">{item.unit_price > 0 ? `₹${item.unit_price.toFixed(2)}` : 'Not set'}</span>
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
                <span className="font-medium text-gray-700">Weight:</span>
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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

        <div className="space-y-2 md:col-span-2 lg:col-span-2">
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

        <div className="space-y-2">
          <Label>Quantity</Label>
          <Input
            type="number"
            value={item.quantity || ''}
            onChange={e => {
              const value = e.target.value;
              onUpdate(item.id, 'quantity', value === '' ? '' : parseInt(value) || '');
            }}
            min="1"
            placeholder="Enter quantity"
          />
        </div>

        <div className="space-y-2">
          <Label>Pricing Unit</Label>
          <Select
            value={item.pricing_unit}
            onValueChange={(value: PricingUnit) => onUpdate(item.id, 'pricing_unit', value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {item.product_type === 'raw_material' ? (
                // For raw materials, show per unit
                selectedProduct && selectedProduct.unit && (
                  <SelectItem value="unit">
                    Per {selectedProduct.unit}
                  </SelectItem>
                )
              ) : (
                // For products, show count_unit + all calculation units
                <>
                  {selectedProduct && selectedProduct.count_unit && (
                    <SelectItem value="unit">Per {selectedProduct.count_unit}</SelectItem>
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
            onChange={e => onUpdate(item.id, 'unit_price', parseFloat(e.target.value) || 0)}
            min="0"
            step="0.01"
            placeholder=""
          />
        </div>

        <div className="space-y-2">
          <Label>GST Rate (%)</Label>
          <Input
            type="number"
            value={item.gst_rate || 18}
            onChange={e => onUpdate(item.id, 'gst_rate', parseFloat(e.target.value) || 0)}
            min="0"
            max="100"
            step="0.01"
          />
        </div>

        <div className="space-y-2 flex items-end">
          <div className="flex items-center space-x-2">
            <Checkbox
              id={`gst-included-${item.id}`}
              checked={item.gst_included !== false}
              onCheckedChange={(checked) => onUpdate(item.id, 'gst_included', checked)}
            />
            <Label htmlFor={`gst-included-${item.id}`} className="text-sm font-normal cursor-pointer">
              GST Included
            </Label>
          </div>
        </div>

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
            className="bg-gray-50 font-semibold"
          />
        </div>
      </div>

      {item.errorMessage && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
          {item.errorMessage}
        </div>
      )}
    </div>
  );
}


