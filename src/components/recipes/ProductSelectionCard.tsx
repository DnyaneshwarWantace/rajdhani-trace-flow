import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calculator, Plus, Minus, RefreshCw, Search } from 'lucide-react';
import type { Product } from '@/types/product';
import ProductSelectorDialog from './ProductSelectorDialog';

interface RecipeCalculationItem {
  productId: string;
  productName: string;
  quantity: number;
  unit: string;
}

interface ProductSelectionCardProps {
  calculationItems: RecipeCalculationItem[];
  products: Product[];
  onAddItem: () => void;
  onUpdateItem: (index: number, field: keyof RecipeCalculationItem, value: any) => void;
  onRemoveItem: (index: number) => void;
  onCalculate: () => void;
  isCalculating: boolean;
}

export default function ProductSelectionCard({
  calculationItems,
  products,
  onAddItem,
  onUpdateItem,
  onRemoveItem,
  onCalculate,
  isCalculating,
}: ProductSelectionCardProps) {
  const [openDialogIndex, setOpenDialogIndex] = useState<number | null>(null);

  const handleProductSelect = (index: number, product: Product) => {
    try {
      console.log('handleProductSelect called with:', { index, productId: product.id, productName: product.name, product });
      
      // Update all fields separately to ensure they all get set
      // The updateCalculationItem function will handle productId and set name/unit automatically
      onUpdateItem(index, 'productId', product.id);
      
      // Also explicitly set the name and unit to ensure they're set even if product lookup fails
      onUpdateItem(index, 'productName', product.name);
      onUpdateItem(index, 'unit', product.unit || 'piece');
      
      console.log('All state updates called, waiting before closing dialog');
      
      // Close dialog after ensuring state update completes
      // Use requestAnimationFrame to ensure React has processed the update
      requestAnimationFrame(() => {
        setTimeout(() => {
          console.log('Closing dialog in ProductSelectionCard');
          setOpenDialogIndex(null);
        }, 200);
      });
    } catch (error) {
      console.error('Error selecting product:', error);
    }
  };

  const getSelectedProduct = (productId: string) => {
    return products.find((p) => p.id === productId);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
          <Calculator className="w-5 h-5" />
          Product Selection
        </CardTitle>
        <div className="text-xs md:text-sm text-blue-600 bg-blue-50 p-2 md:p-3 rounded border mt-2">
          💡 <strong>SQM-Based Calculation:</strong> All recipes use 1 sqm as base unit. System automatically
          calculates total area based on product dimensions (length × width) and applies recipe accordingly.
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {calculationItems.map((item, index) => {
          const product = products.find((p) => p.id === item.productId);
          const length = parseFloat(product?.length || '0');
          const width = parseFloat(product?.width || '0');
          const areaPerUnit = length * width;
          const totalArea = item.quantity * areaPerUnit;

          return (
            <div
              key={index}
              className="flex flex-col md:flex-row items-start md:items-center gap-3 md:gap-4 p-3 md:p-4 border rounded-lg bg-card"
            >
              {/* Product Selection - Full width on mobile */}
              <div className="flex-1 w-full md:w-auto">
                <Label htmlFor={`product-${index}`} className="text-sm font-medium">
                  Product
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpenDialogIndex(index)}
                  className="w-full mt-1 justify-start text-left font-normal h-10"
                >
                  <Search className="w-4 h-4 mr-2 text-gray-400" />
                  {item.productId ? (
                    <span className="truncate">
                      {getSelectedProduct(item.productId)?.name || item.productName || 'Select a product'}
                    </span>
                  ) : (
                    <span className="text-gray-500">Select a product</span>
                  )}
                </Button>
                {openDialogIndex === index && (
                  <ProductSelectorDialog
                    isOpen={true}
                    onClose={() => setOpenDialogIndex(null)}
                    onSelect={(product) => handleProductSelect(index, product)}
                    selectedProductId={item.productId}
                  />
                )}
              </div>

              {/* Quantity - Smaller on mobile */}
              <div className="w-full md:w-24">
                <Label htmlFor={`quantity-${index}`} className="text-sm font-medium">
                  Quantity
                </Label>
                <Input
                  id={`quantity-${index}`}
                  type="number"
                  min="1"
                  value={item.quantity}
                  onChange={(e) => onUpdateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                  className="mt-1"
                />
              </div>

              {/* Unit - Smaller on mobile */}
              <div className="w-full md:w-24">
                <Label htmlFor={`unit-${index}`} className="text-sm font-medium">
                  Unit
                </Label>
                <Input
                  id={`unit-${index}`}
                  value={item.unit}
                  readOnly
                  className="mt-1 bg-muted"
                />
              </div>

              {/* SQM Calculation Display - Full width on mobile, smaller on desktop */}
              {item.productId && (
                <div className="w-full md:w-32">
                  <Label className="text-sm font-medium">Total Area</Label>
                  <div className="text-xs md:text-sm bg-blue-50 p-2 rounded border mt-1">
                    <div className="font-medium text-blue-800">{totalArea.toFixed(2)} sqm</div>
                    <div className="text-xs text-blue-600">
                      {length}m × {width}m × {item.quantity}
                    </div>
                  </div>
                </div>
              )}

              {/* Remove Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => onRemoveItem(index)}
                className="text-red-600 hover:bg-red-50 w-full md:w-auto mt-2 md:mt-0"
              >
                <Minus className="w-4 h-4" />
                <span className="ml-2 md:hidden">Remove</span>
              </Button>
            </div>
          );
        })}

        <Button onClick={onAddItem} variant="outline" className="w-full">
          <Plus className="w-4 h-4 mr-2" />
          Add Product
        </Button>

        <Button onClick={onCalculate} disabled={isCalculating || calculationItems.length === 0} className="w-full">
          {isCalculating ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Calculating...
            </>
          ) : (
            <>
              <Calculator className="w-4 h-4 mr-2" />
              Calculate Recipe
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}



