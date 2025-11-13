// Dynamic Pricing Form Component for Order Items

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calculator, Info, AlertTriangle } from 'lucide-react';
import { ExtendedOrderItem, PricingCalculation } from '@/types/orderTypes';
import { PricingUnit, ProductDimensions, PRICING_UNITS } from '@/utils/unitConverter';
import { usePricingCalculator } from '@/hooks/usePricingCalculator';

interface DynamicPricingFormProps {
  item: ExtendedOrderItem;
  onUpdate: (updatedItem: ExtendedOrderItem) => void;
  onRemove?: () => void;
  isEditing?: boolean;
  products?: any[];
  rawMaterials?: any[];
  onProductSearch?: (item: ExtendedOrderItem) => void;
}

export function DynamicPricingForm({ 
  item, 
  onUpdate, 
  onRemove, 
  isEditing = false,
  products = [],
  rawMaterials = [],
  onProductSearch
}: DynamicPricingFormProps) {
  const { 
    calculateItemPrice, 
    validateItem, 
    getAvailablePricingUnits, 
    formatPrice, 
    formatUnit 
  } = usePricingCalculator();
  
  const [localItem, setLocalItem] = useState<ExtendedOrderItem>(item);
  const [calculation, setCalculation] = useState<PricingCalculation | null>(null);
  const [showCalculation, setShowCalculation] = useState(false);
  
  // Available pricing units based on product dimensions
  const availableUnits = getAvailablePricingUnits(item.product_dimensions);
  
  useEffect(() => {
    const calc = calculateItemPrice(localItem);
    setCalculation(calc);
    
    // Update the item with calculated values
    const updatedItem = {
      ...localItem,
      unit_value: calc.unitValue,
      total_price: calc.totalPrice,
      product_width: localItem.product_dimensions.width,
      product_length: localItem.product_dimensions.length,
      product_weight: localItem.product_dimensions.weight,
      isValid: calc.isValid,
      errorMessage: calc.errorMessage
    };
    
    onUpdate(updatedItem);
  }, [localItem, calculateItemPrice, onUpdate]);
  
  const handleUnitPriceChange = (value: string) => {
    const unitPrice = parseFloat(value) || 0;
    setLocalItem(prev => ({ ...prev, unit_price: unitPrice }));
  };
  
  const handleQuantityChange = (value: string) => {
    const quantity = parseInt(value) || 0;
    setLocalItem(prev => ({ ...prev, quantity }));
  };
  
  const handlePricingUnitChange = (unit: PricingUnit) => {
    setLocalItem(prev => ({ ...prev, pricing_unit: unit }));
  };
  
  const handleDimensionsChange = (field: keyof ProductDimensions, value: string) => {
    const numValue = parseFloat(value) || 0;
    setLocalItem(prev => ({
      ...prev,
      product_dimensions: {
        ...prev.product_dimensions,
        [field]: numValue
      }
    }));
  };
  
  const isItemValid = calculation?.isValid ?? false;
  
  return (
    <Card className={`w-full ${!isItemValid ? 'border-red-200 bg-red-50' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-medium">
            {localItem.product_name}
          </CardTitle>
          <div className="flex items-center gap-2">
            {isItemValid && (
              <Badge variant="secondary" className="text-green-700 bg-green-100">
                {formatPrice(calculation?.totalPrice || 0)}
              </Badge>
            )}
            {onRemove && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRemove}
                className="text-red-600 hover:text-red-700"
              >
                Remove
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Product Selection */}
        <div className="space-y-4">
          {/* Product Type Selection */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">Item Type</Label>
            <div className="flex gap-4">
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  name={`productType-${item.id}`}
                  value="product"
                  checked={localItem.product_type === 'product'}
                  onChange={() => {
                    setLocalItem(prev => ({ 
                      ...prev, 
                      product_type: 'product',
                      product_id: '',
                      product_name: ''
                    }));
                  }}
                  className="text-blue-600"
                />
                <span className="text-sm">Finished Product</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  name={`productType-${item.id}`}
                  value="raw_material"
                  checked={localItem.product_type === 'raw_material'}
                  onChange={() => {
                    setLocalItem(prev => ({ 
                      ...prev, 
                      product_type: 'raw_material',
                      product_id: '',
                      product_name: ''
                    }));
                  }}
                  className="text-blue-600"
                />
                <span className="text-sm">Raw Material</span>
              </label>
            </div>
          </div>

          {/* Product Selection */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">Product</Label>
            {localItem.product_id ? (
              <div className="h-12 px-4 border rounded-lg flex items-center justify-between bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center">
                    <Calculator className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <div className="font-medium">{localItem.product_name}</div>
                    <div className="text-sm text-muted-foreground">
                      {localItem.product_type === 'raw_material' 
                        ? `${rawMaterials.find(p => p.id === localItem.product_id)?.category} • ${rawMaterials.find(p => p.id === localItem.product_id)?.brand} • ${rawMaterials.find(p => p.id === localItem.product_id)?.unit}`
                        : `${products.find(p => p.id === localItem.product_id)?.category} • ${products.find(p => p.id === localItem.product_id)?.color} • ${products.find(p => p.id === localItem.product_id)?.size}`}
                    </div>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => {
                    setLocalItem(prev => ({ 
                      ...prev, 
                      product_id: '',
                      product_name: ''
                    }));
                  }}
                  className="text-red-600 hover:text-red-700"
                >
                  ×
                </Button>
              </div>
            ) : (
              <Button 
                variant="outline" 
                className="w-full h-12 justify-start text-muted-foreground"
                onClick={() => onProductSearch?.(localItem)}
              >
                <Calculator className="w-4 h-4 mr-2" />
                Search and select {localItem.product_type === 'raw_material' ? 'raw material' : 'product'}...
              </Button>
            )}
          </div>
        </div>

        {/* Error Alert */}
        {!isItemValid && calculation?.errorMessage && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{calculation.errorMessage}</AlertDescription>
          </Alert>
        )}
        
        {/* Product Dimensions */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor={`width-${item.id}`}>Width (meters)</Label>
              <Input
                id={`width-${item.id}`}
                type="number"
                step="0.01"
                value={localItem.product_dimensions.width || ''}
                onChange={(e) => handleDimensionsChange('width', e.target.value)}
                placeholder="0.00"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor={`length-${item.id}`}>Length (meters)</Label>
              <Input
                id={`length-${item.id}`}
                type="number"
                step="0.01"
                value={localItem.product_dimensions.length || ''}
                onChange={(e) => handleDimensionsChange('length', e.target.value)}
                placeholder="0.00"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor={`length-${item.id}`}>Length (meters)</Label>
              <Input
                id={`length-${item.id}`}
                type="number"
                step="0.01"
                value={localItem.product_dimensions.length || ''}
                onChange={(e) => handleDimensionsChange('length', e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor={`weight-${item.id}`}>Weight (kg)</Label>
              <Input
                id={`weight-${item.id}`}
                type="number"
                step="0.01"
                value={localItem.product_dimensions.weight || ''}
                onChange={(e) => handleDimensionsChange('weight', e.target.value)}
                placeholder="0.00"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor={`volume-${item.id}`}>Volume (liters)</Label>
              <Input
                id={`volume-${item.id}`}
                type="number"
                step="0.01"
                value={localItem.product_dimensions.volume || ''}
                onChange={(e) => handleDimensionsChange('volume', e.target.value)}
                placeholder="0.00"
              />
            </div>
            
          </div>
          
          {/* Textile Properties */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor={`gsm-${item.id}`}>GSM (g/m²)</Label>
              <Input
                id={`gsm-${item.id}`}
                type="number"
                step="0.01"
                value={localItem.product_dimensions.gsm || ''}
                onChange={(e) => handleDimensionsChange('gsm', e.target.value)}
                placeholder="0.00"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor={`denier-${item.id}`}>Denier</Label>
              <Input
                id={`denier-${item.id}`}
                type="number"
                step="0.01"
                value={localItem.product_dimensions.denier || ''}
                onChange={(e) => handleDimensionsChange('denier', e.target.value)}
                placeholder="0.00"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor={`tex-${item.id}`}>Tex</Label>
              <Input
                id={`tex-${item.id}`}
                type="number"
                step="0.01"
                value={localItem.product_dimensions.tex || ''}
                onChange={(e) => handleDimensionsChange('tex', e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor={`thread-count-${item.id}`}>Thread Count</Label>
              <Input
                id={`thread-count-${item.id}`}
                type="number"
                step="0.01"
                value={localItem.product_dimensions.thread_count || ''}
                onChange={(e) => handleDimensionsChange('thread_count', e.target.value)}
                placeholder="0.00"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor={`fiber-density-${item.id}`}>Fiber Density (g/cm³)</Label>
              <Input
                id={`fiber-density-${item.id}`}
                type="number"
                step="0.01"
                value={localItem.product_dimensions.fiber_density || ''}
                onChange={(e) => handleDimensionsChange('fiber_density', e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>
        </div>
        
        {/* Pricing Configuration */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor={`pricing-unit-${item.id}`}>Pricing Unit</Label>
            <Select
              value={localItem.pricing_unit}
              onValueChange={handlePricingUnitChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select pricing unit" />
              </SelectTrigger>
              <SelectContent>
                {availableUnits.map((unit) => {
                  const unitInfo = PRICING_UNITS.find(u => u.unit === unit);
                  return (
                    <SelectItem key={unit} value={unit}>
                      <div className="flex flex-col">
                        <span className="font-medium">{unitInfo?.label}</span>
                        <span className="text-xs text-gray-500">{unitInfo?.description}</span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor={`unit-price-${item.id}`}>
              Price per {formatUnit(localItem.pricing_unit)}
            </Label>
            <Input
              id={`unit-price-${item.id}`}
              type="number"
              step="0.01"
              value={localItem.unit_price || ''}
              onChange={(e) => handleUnitPriceChange(e.target.value)}
              placeholder="0.00"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor={`quantity-${item.id}`}>Quantity</Label>
            <Input
              id={`quantity-${item.id}`}
              type="number"
              min="1"
              value={localItem.quantity || ''}
              onChange={(e) => handleQuantityChange(e.target.value)}
              placeholder="1"
            />
          </div>
        </div>
        
        {/* Calculation Details */}
        {calculation && (
          <div className="space-y-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCalculation(!showCalculation)}
              className="w-full"
            >
              <Calculator className="w-4 h-4 mr-2" />
              {showCalculation ? 'Hide' : 'Show'} Calculation Details
            </Button>
            
            {showCalculation && (
              <div className="bg-gray-50 p-4 rounded-lg space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Unit Value:</span>
                  <span className="font-medium">
                    {calculation.unitValue.toFixed(2)} {formatUnit(localItem.pricing_unit)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Total Value:</span>
                  <span className="font-medium">
                    {calculation.totalValue.toFixed(2)} {formatUnit(localItem.pricing_unit)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Unit Price:</span>
                  <span className="font-medium">{formatPrice(calculation.unitPrice)}</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="font-medium">Total Price:</span>
                  <span className="font-bold text-lg">{formatPrice(calculation.totalPrice)}</span>
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Info about available pricing units */}
        <div className="flex items-start gap-2 text-xs text-gray-600">
          <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
          <div>
            <p>Available pricing units based on product dimensions:</p>
            <div className="flex flex-wrap gap-1 mt-1">
              {availableUnits.map(unit => {
                const unitInfo = PRICING_UNITS.find(u => u.unit === unit);
                return (
                  <Badge key={unit} variant="outline" className="text-xs">
                    {unitInfo?.label}
                  </Badge>
                );
              })}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
