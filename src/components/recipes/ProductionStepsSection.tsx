import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Factory, ChevronDown, ChevronUp, Package } from 'lucide-react';
import type { Product } from '@/types/product';

interface ProductionStep {
  step: number;
  product_id?: string;
  product_name: string;
  quantity: number;
  unit: string;
  current_stock?: number;
  materials_needed: {
    material_id?: string;
    material_name: string;
    quantity: number;
    unit: string;
    current_stock?: number;
  }[];
  products_needed: {
    product_id?: string;
    product_name: string;
    quantity: number;
    unit: string;
    current_stock?: number;
  }[];
}

interface ProductionStepsSectionProps {
  productionSteps: ProductionStep[];
  products: Product[];
  expandedSteps: Set<number>;
  onToggleStep: (stepNumber: number) => void;
}

export default function ProductionStepsSection({
  productionSteps,
  products,
  expandedSteps,
  onToggleStep,
}: ProductionStepsSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
          <Factory className="w-5 h-5" />
          Production Steps
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Production Steps Summary - Mobile responsive grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 mb-4 md:mb-6">
          <div className="text-center p-3 md:p-4 bg-blue-50 rounded-lg">
            <div className="text-xl md:text-2xl font-bold text-blue-600">{productionSteps.length}</div>
            <div className="text-xs md:text-sm text-blue-700">Total Steps</div>
          </div>
          <div className="text-center p-3 md:p-4 bg-green-50 rounded-lg">
            <div className="text-xl md:text-2xl font-bold text-green-600">
              {productionSteps.reduce((sum, step) => sum + step.materials_needed.length, 0)}
            </div>
            <div className="text-xs md:text-sm text-green-700">Raw Materials</div>
          </div>
          <div className="text-center p-3 md:p-4 bg-purple-50 rounded-lg">
            <div className="text-xl md:text-2xl font-bold text-purple-600">
              {productionSteps.reduce((sum, step) => sum + step.products_needed.length, 0)}
            </div>
            <div className="text-xs md:text-sm text-purple-700">Products</div>
          </div>
        </div>

        {/* Production Steps - Mobile-first card layout */}
        <div className="space-y-3 md:space-y-4">
          {productionSteps.map((step, stepIndex) => {
            const product = products.find((p) => p.id === step.product_id);
            const length = parseFloat(product?.length || '0');
            const width = parseFloat(product?.width || '0');
            const totalArea = step.quantity * length * width;
            const isExpanded = expandedSteps.has(step.step);

            return (
              <div key={`step-${step.step}-${step.product_id || stepIndex}`} className="border rounded-lg overflow-hidden">
                {/* Step Header - Mobile optimized */}
                <div className="bg-gray-50 p-3 md:p-4 border-b">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 md:gap-4">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono text-xs md:text-sm">
                        Step {step.step}
                      </Badge>
                      <span className="font-medium text-sm md:text-base">{step.product_name}</span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onToggleStep(step.step)}
                      className="w-full md:w-auto"
                    >
                      {isExpanded ? (
                        <>
                          <ChevronUp className="w-3 h-3 mr-1" />
                          Hide Details
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-3 h-3 mr-1" />
                          Show Details
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Step Summary - Always visible */}
                <div className="p-3 md:p-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 text-sm">
                    <div>
                      <div className="text-xs text-muted-foreground">Required Qty</div>
                      <div className="font-medium">{step.quantity} {step.unit}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Total Area</div>
                      <div className="font-medium text-blue-800">{totalArea.toFixed(2)} sqm</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Available Stock</div>
                      <div className="font-medium">
                        {(() => {
                          const actualStock = product?.individual_stock_tracking
                            ? product?.current_stock || product?.individual_products_count || 0
                            : product?.base_quantity || product?.current_stock || 0;
                          return actualStock > 0 ? `${actualStock} ${step.unit}` : '0';
                        })()}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Recipe Type</div>
                      <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-xs">
                        Product Recipe
                      </Badge>
                    </div>
                  </div>

                  {/* Quick Material/Product Count */}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {step.materials_needed.length > 0 && (
                      <Badge variant="outline" className="text-xs bg-green-50 text-green-800">
                        {step.materials_needed.length} Raw Material{step.materials_needed.length !== 1 ? 's' : ''}
                      </Badge>
                    )}
                    {step.products_needed.length > 0 && (
                      <Badge variant="outline" className="text-xs bg-purple-50 text-purple-800">
                        {step.products_needed.length} Product{step.products_needed.length !== 1 ? 's' : ''}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="border-t bg-gray-50 p-3 md:p-4">
                    <h4 className="font-semibold text-sm md:text-base text-gray-800 mb-3 flex items-center gap-2">
                      <Factory className="w-4 h-4 text-blue-600" />
                      Step {step.step}: {step.product_name} - Detailed Recipe
                    </h4>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
                      {/* Raw Materials Section */}
                      {step.materials_needed.length > 0 && (
                        <div>
                          <h5 className="font-medium text-sm md:text-base text-gray-700 mb-3 flex items-center gap-2">
                            <Package className="w-4 h-4 text-green-600" />
                            Raw Materials Required
                          </h5>
                          <div className="space-y-2">
                            {step.materials_needed.map((material, idx) => (
                              <div key={`${step.step}-material-${material.material_id || idx}`} className="border border-gray-200 rounded-lg p-3 bg-white">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2 gap-2">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-sm md:text-base">{material.material_name}</span>
                                    <Badge variant="outline" className="font-mono text-xs">
                                      ID: {material.material_id || 'N/A'}
                                    </Badge>
                                  </div>
                                  <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">
                                    Raw Material Recipe
                                  </Badge>
                                </div>
                                <div className="grid grid-cols-2 gap-3 md:gap-4 text-xs md:text-sm">
                                  <div>
                                    <span className="text-gray-600">Required:</span>
                                    <div className="font-medium">{material.quantity.toFixed(2)} {material.unit}</div>
                                  </div>
                                  <div>
                                    <span className="text-gray-600">Current Stock:</span>
                                    <div className="font-medium">
                                      {material.current_stock !== undefined
                                        ? `${material.current_stock} ${material.unit}`
                                        : 'N/A'}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Products Section */}
                      {step.products_needed.length > 0 && (
                        <div>
                          <h5 className="font-medium text-sm md:text-base text-gray-700 mb-3 flex items-center gap-2">
                            <Factory className="w-4 h-4 text-blue-600" />
                            Products Required
                          </h5>
                          <div className="space-y-2">
                            {step.products_needed.map((product, idx) => {
                              const nestedProduct = products.find((p) => p.id === product.product_id);
                              const actualStock = nestedProduct?.individual_stock_tracking
                                ? nestedProduct?.current_stock || nestedProduct?.individual_products_count || 0
                                : nestedProduct?.base_quantity || nestedProduct?.current_stock || 0;

                              return (
                                <div key={`${step.step}-product-${product.product_id || idx}`} className="border border-gray-200 rounded-lg p-3 bg-white">
                                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2 gap-2">
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium text-sm md:text-base">{product.product_name}</span>
                                      <Badge variant="outline" className="font-mono text-xs">
                                        ID: {product.product_id || 'N/A'}
                                      </Badge>
                                    </div>
                                    <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-xs">
                                      Product Recipe
                                    </Badge>
                                  </div>
                                  <div className="grid grid-cols-2 gap-3 md:gap-4 text-xs md:text-sm mb-3">
                                    <div>
                                      <span className="text-gray-600">Required:</span>
                                      <div className="font-medium">{product.quantity.toFixed(2)} {product.unit}</div>
                                    </div>
                                    <div>
                                      <span className="text-gray-600">Current Stock:</span>
                                      <div className="font-medium">
                                        {actualStock > 0 ? `${actualStock} ${product.unit}` : '0'}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}



