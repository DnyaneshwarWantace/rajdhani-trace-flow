import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calculator, Plus, Minus, RefreshCw, Search, Package } from 'lucide-react';
import type { Product } from '@/types/product';
import ProductSelectorDialog from './ProductSelectorDialog';
import { validateNumberInput, ValidationPresets, preventInvalidNumberKeys } from '@/utils/numberValidation';
import { ProductService } from '@/services/productService';

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
  onUpdateItem: (index: number, updates: Partial<RecipeCalculationItem>) => void;
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
  const [colorCodeMap, setColorCodeMap] = useState<Record<string, string>>({});

  useEffect(() => {
    ProductService.getDropdownData()
      .then((data) => {
        const nextColorCodeMap: Record<string, string> = {};
        (data?.colors || []).forEach((item: any) => {
          if (item?.value && item?.color_code) nextColorCodeMap[item.value] = item.color_code;
        });
        setColorCodeMap(nextColorCodeMap);
      })
      .catch(() => null);
  }, []);

  const handleProductSelect = (index: number, product: Product) => {
    try {
      console.log('handleProductSelect called with:', { index, productId: product.id, productName: product.name, product });
      
      onUpdateItem(index, {
        productId: product.id,
        productName: product.name,
        unit: product.count_unit || product.unit
      });
      
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
    <Card className="border-0 shadow-none bg-transparent md:border md:shadow md:bg-card">
      <CardHeader className="px-0 pb-3 md:px-6 md:pt-6">
        <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
          <Calculator className="w-5 h-5" />
          Product Selection
        </CardTitle>
        <div className="text-xs md:text-sm text-blue-700 bg-blue-50/60 p-3.5 rounded-xl border border-blue-100/70 mt-3 flex gap-2.5 items-start">
          <span className="text-base shrink-0 leading-none">💡</span>
          <div>
            <strong className="font-bold">SQM-Based Calculation:</strong> All recipes use 1 sqm as base unit. The system automatically
            calculates total area based on product dimensions (length × width) and applies the recipe accordingly.
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-0 space-y-4 md:px-6 md:pb-6">
        {calculationItems.map((item, index) => {
          const product = products.find((p) => p.id === item.productId);
          const length = parseFloat(product?.length || '0');
          const width = parseFloat(product?.width || '0');
          const areaPerUnit = length * width;
          const totalArea = item.quantity * areaPerUnit;
          const selectedProduct = getSelectedProduct(item.productId);

          return (
            <div
              key={index}
              className="flex flex-col md:flex-row items-start md:items-center gap-3 md:gap-4 p-4 border border-gray-200 rounded-2xl bg-white md:bg-card shadow-sm md:shadow-none w-full"
            >
              {/* Mobile-only header with item index and Remove button */}
              <div className="flex justify-between items-center w-full md:hidden mb-2 pb-2 border-b border-gray-100">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Item #{index + 1}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemoveItem(index)}
                  className="text-red-600 hover:bg-red-50 hover:text-red-700 h-8 px-2 -mr-2 text-xs font-bold"
                >
                  <Minus className="w-3.5 h-3.5 mr-1" />
                  Remove
                </Button>
              </div>

              {/* Product Selection - Full width on mobile */}
              <div className="flex-1 w-full md:w-auto">
                <Label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">
                  Product
                </Label>
                {selectedProduct ? (
                  <div className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200/85 rounded-xl w-full relative">
                    {selectedProduct.image_url ? (
                      <img
                        src={selectedProduct.image_url}
                        alt={selectedProduct.name}
                        className="w-12 h-12 rounded-lg object-cover border border-gray-200 shrink-0 bg-white"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-blue-100 border border-blue-200 flex items-center justify-center shrink-0">
                        <Package className="w-6 h-6 text-blue-600" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-sm text-gray-900 truncate" title={selectedProduct.name}>
                        {selectedProduct.name}
                      </h4>
                      <p className="text-xs text-gray-500 truncate mt-0.5 font-medium">
                        {selectedProduct.length && selectedProduct.width ? `${selectedProduct.length}${selectedProduct.length_unit || 'm'} × ${selectedProduct.width}${selectedProduct.width_unit || 'm'}` : ''}
                        {selectedProduct.weight ? ` · ${selectedProduct.weight}${selectedProduct.weight_unit || 'GSM'}` : ''}
                      </p>
                      {selectedProduct.color && selectedProduct.color !== 'N/A' && (
                        <div className="flex items-center gap-1.5 mt-1">
                          <span
                            className="w-2.5 h-2.5 rounded-full border border-gray-300"
                            style={{ backgroundColor: colorCodeMap[selectedProduct.color.toLowerCase()] || colorCodeMap[selectedProduct.color] || '#D1D5DB' }}
                          />
                          <span className="text-[11px] font-semibold text-gray-600">{selectedProduct.color}</span>
                        </div>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setOpenDialogIndex(index)}
                      className="text-xs font-bold shrink-0 h-8 px-3 bg-white hover:bg-gray-100 shadow-sm border-gray-300"
                    >
                      Change
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setOpenDialogIndex(index)}
                    className="w-full justify-start text-left font-semibold h-11 border-dashed border-2 hover:border-blue-400 hover:bg-blue-50/20 text-gray-500 rounded-xl"
                  >
                    <Search className="w-4 h-4 mr-2 text-gray-400" />
                    <span>Search & Select Product...</span>
                  </Button>
                )}
                {openDialogIndex === index && (
                  <ProductSelectorDialog
                    isOpen={true}
                    onClose={() => setOpenDialogIndex(null)}
                    onSelect={(product) => handleProductSelect(index, product)}
                    selectedProductId={item.productId}
                  />
                )}
              </div>

              {/* Quantity and Unit - side by side on mobile */}
              <div className="grid grid-cols-2 gap-3 w-full md:contents">
                {/* Quantity */}
                <div className="w-full md:w-48">
                  <Label htmlFor={`quantity-${index}`} className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">
                    Quantity
                  </Label>
                  <Input
                    id={`quantity-${index}`}
                    type="text"
                    value={item.quantity === 0 ? '' : item.quantity.toString()}
                    placeholder={item.unit || 'Roll'}
                    onChange={(e) => {
                      const validation = validateNumberInput(e.target.value, ValidationPresets.PRODUCT_QUANTITY);
                      const numValue = validation.value === '' ? 0 : parseInt(validation.value, 10) || 0;
                      onUpdateItem(index, { quantity: numValue });
                    }}
                    onKeyDown={(e) => preventInvalidNumberKeys(e)}
                    onFocus={(e) => {
                      // Select all text when focused to make it easy to replace
                      e.target.select();
                    }}
                    min="0"
                    max="99999"
                    className="mt-1 h-10 text-base rounded-xl border-gray-300"
                  />
                </div>

                {/* Unit */}
                <div className="w-full md:w-36">
                  <Label htmlFor={`unit-${index}`} className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">
                    Unit
                  </Label>
                  <Input
                    id={`unit-${index}`}
                    value={item.unit || ''}
                    placeholder="rolls"
                    readOnly
                    className="mt-1 bg-muted h-10 text-base rounded-xl"
                  />
                </div>
              </div>

              {/* SQM Calculation Display */}
              {item.productId && (
                <div className="w-full md:w-44">
                  <Label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">Total Area</Label>
                  <div className="bg-gradient-to-br from-blue-50/80 to-indigo-50/80 p-3 rounded-xl border border-blue-100/60 mt-1 flex items-center gap-3 w-full">
                    <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-600 shrink-0">
                      <Calculator className="w-4.5 h-4.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-extrabold text-blue-900 text-[15px] leading-tight truncate">{totalArea.toFixed(2)} sqm</div>
                      <div className="text-[10px] text-blue-600 font-mono mt-0.5 truncate">
                        {length}m × {width}m × {item.quantity}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Desktop-only Remove button */}
              <div className="hidden md:flex flex-col shrink-0">
                <Label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block opacity-0 pointer-events-none">
                  Action
                </Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onRemoveItem(index)}
                  className="text-red-600 hover:bg-red-50 hover:text-red-700 h-10 px-4 mt-1 border-gray-300 rounded-xl"
                >
                  <Minus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          );
        })}

        <Button onClick={onAddItem} variant="outline" className="w-full h-11 md:h-10 text-base md:text-sm font-bold rounded-xl border-gray-300">
          <Plus className="w-4 h-4 mr-2" />
          Add Product
        </Button>

        <Button 
          onClick={onCalculate} 
          disabled={
            isCalculating || 
            calculationItems.length === 0 || 
            calculationItems.some(item => !item.productId || item.quantity <= 0)
          } 
          className="w-full text-white h-11 md:h-10 text-base md:text-sm font-bold rounded-xl bg-blue-600 hover:bg-blue-700 shadow-md"
        >
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



