import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Factory, ChevronDown, ChevronUp, Package, Layers } from 'lucide-react';
import type { Product } from '@/types/product';

interface ProductionStep {
  step: number;
  product_id?: string;
  product_name: string;
  quantity: number;
  unit: string;
  current_stock?: number;
  mainProductId?: string;
  mainProductName?: string;
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
  // Group steps by main product
  const groupedSteps = productionSteps.reduce((acc, step) => {
    const key = step.mainProductId || step.product_id || 'unknown';
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(step);
    return acc;
  }, {} as Record<string, ProductionStep[]>);

  return (
    <Card className="border-0 shadow-none bg-transparent md:border md:shadow md:bg-card">
      <CardHeader className="px-0 pb-3 md:px-6 md:pt-6">
        <CardTitle className="flex items-center gap-2 text-lg md:text-xl font-black text-slate-900">
          <Factory className="w-5 h-5 text-blue-600" />
          Production Steps
        </CardTitle>
      </CardHeader>
      <CardContent className="px-0 md:px-6 md:pb-6">
        {/* Production Steps Summary - Unified Mobile Strip, Desktop Grid */}
        <div className="md:hidden mb-5 flex border border-slate-200 rounded-xl overflow-hidden bg-white text-center divide-x divide-slate-100">
          <div className="flex-1 py-3 flex flex-col items-center">
            <span className="text-base font-extrabold text-blue-600 leading-tight">
              {Object.keys(groupedSteps).length}
            </span>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">
              Products
            </span>
          </div>
          <div className="flex-1 py-3 flex flex-col items-center">
            <span className="text-base font-extrabold text-emerald-600 leading-tight">
              {productionSteps.reduce((sum, step) => sum + step.materials_needed.length, 0)}
            </span>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">
              Materials
            </span>
          </div>
          <div className="flex-1 py-3 flex flex-col items-center">
            <span className="text-base font-extrabold text-purple-600 leading-tight">
              {productionSteps.reduce((sum, step) => sum + step.products_needed.length, 0)}
            </span>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">
              Sub-Products
            </span>
          </div>
        </div>

        {/* Desktop View Summary Cards */}
        <div className="hidden md:grid md:grid-cols-3 md:gap-4 mb-6">
          <div className="flex items-center gap-3 p-4 bg-gradient-to-br from-blue-50/60 to-blue-100/30 rounded-2xl border border-blue-100 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600 shrink-0">
              <Factory className="w-5 h-5" />
            </div>
            <div>
              <div className="text-lg sm:text-xl font-extrabold text-blue-900 leading-tight">
                {Object.keys(groupedSteps).length}
              </div>
              <div className="text-[11px] font-bold text-blue-700 uppercase tracking-wider mt-0.5">
                Target Products
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3 p-4 bg-gradient-to-br from-emerald-50/60 to-emerald-100/30 rounded-2xl border border-emerald-100 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 shrink-0">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <div className="text-lg sm:text-xl font-extrabold text-emerald-900 leading-tight">
                {productionSteps.reduce((sum, step) => sum + step.materials_needed.length, 0)}
              </div>
              <div className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider mt-0.5">
                Raw Materials
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 bg-gradient-to-br from-purple-50/60 to-purple-100/30 rounded-2xl border border-purple-100 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-600 shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="text-lg sm:text-xl font-extrabold text-purple-900 leading-tight">
                {productionSteps.reduce((sum, step) => sum + step.products_needed.length, 0)}
              </div>
              <div className="text-[11px] font-bold text-purple-700 uppercase tracking-wider mt-0.5">
                Sub-Products
              </div>
            </div>
          </div>
        </div>

        {/* Production Steps - Grouped by main product */}
        <div className="space-y-8">
          {Object.entries(groupedSteps).map(([mainProductId, steps], groupIndex) => {
            const mainProductName = steps[0]?.mainProductName || steps[0]?.product_name || 'Unknown Product';

            return (
              <div key={`product-group-${mainProductId}-${groupIndex}`} className="border border-slate-200/60 rounded-3xl p-4 sm:p-6 bg-slate-50/40 shadow-sm space-y-6">
                {/* Main Product Header */}
                <div className="pb-3 border-b border-slate-200/60 flex items-center justify-between gap-3">
                  <div>
                    <h5 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Recipe Group
                    </h5>
                    <h4 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2 mt-0.5">
                      <Factory className="w-5 h-5 text-blue-600 shrink-0" />
                      <span>{mainProductName}</span>
                    </h4>
                  </div>
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-100 font-bold px-3 py-1 rounded-xl text-xs shrink-0">
                    {steps.length} {steps.length === 1 ? 'Step' : 'Steps'}
                  </Badge>
                </div>

                {/* Steps Timeline for this product */}
                <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-3 sm:before:left-4 before:top-2 before:bottom-2 before:w-[2px] before:bg-blue-100 before:dashed before:border-l">
                  {steps.map((step, stepIndex) => {
                    const product = products.find((p) => p.id === step.product_id);
                    const length = parseFloat(product?.length || '0');
                    const width = parseFloat(product?.width || '0');
                    const totalArea = step.quantity * length * width;
                    const isExpanded = expandedSteps.has(step.step);

                    return (
                      <div 
                        key={`step-${step.step}-${step.product_id || stepIndex}`} 
                        className="relative"
                      >
                        {/* Timeline Bullet Node */}
                        <div className="absolute -left-[33px] sm:-left-[41px] top-4 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-blue-50 border-2 border-blue-500 text-blue-700 text-xs sm:text-sm font-black flex items-center justify-center shadow-sm z-10">
                          {step.step}
                        </div>

                        {/* Step Card */}
                        <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow">
                          {/* Accordion Trigger */}
                          <div 
                            className="bg-slate-50/50 p-4 border-b border-slate-100 cursor-pointer flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors"
                            onClick={() => onToggleStep(step.step)}
                          >
                            <div className="min-w-0 flex-1">
                              <h5 className="font-extrabold text-sm sm:text-base text-slate-800 truncate" title={step.product_name}>
                                {step.product_name}
                              </h5>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                                Produce
                              </p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-xs sm:text-sm font-extrabold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg">
                                {step.quantity} {step.unit}
                              </span>
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4 text-slate-400" />
                              ) : (
                                <ChevronDown className="w-4 h-4 text-slate-400" />
                              )}
                            </div>
                          </div>

                          {/* Step Details Summary - Always visible */}
                          <div className="p-4 bg-white">
                            <div className="border border-slate-200/80 rounded-2xl p-4 bg-slate-50/30 space-y-3.5 text-xs">
                              <div className="flex items-center justify-between gap-4">
                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Required Qty</span>
                                <span className="font-extrabold text-slate-950 text-right whitespace-nowrap">{step.quantity} {step.unit}</span>
                              </div>
                              <div className="flex items-center justify-between gap-4 border-t border-slate-200/60 pt-3">
                                <span className="text-[10px] text-blue-500 font-bold uppercase tracking-wider">Total Area</span>
                                <span className="font-extrabold text-blue-700 text-right whitespace-nowrap">{totalArea.toFixed(2)} sqm</span>
                              </div>
                              <div className="flex items-center justify-between gap-4 border-t border-slate-200/60 pt-3">
                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Available Stock</span>
                                <span className="font-extrabold text-slate-950 text-right whitespace-nowrap">
                                  {(() => {
                                    const actualStock = product?.individual_stock_tracking
                                      ? product?.current_stock || product?.individual_products_count || 0
                                      : product?.base_quantity || product?.current_stock || 0;
                                    return actualStock > 0 ? `${actualStock} ${step.unit}` : '0';
                                  })()}
                                </span>
                              </div>
                            </div>

                            {/* Collapsed Info Bar - show quick counters */}
                            {!isExpanded && (
                              <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap gap-2">
                                {step.materials_needed.length > 0 && (
                                  <span className="inline-flex items-center text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                                    {step.materials_needed.length} Raw Material{step.materials_needed.length !== 1 ? 's' : ''}
                                  </span>
                                )}
                                {step.products_needed.length > 0 && (
                                  <span className="inline-flex items-center text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-100">
                                    {step.products_needed.length} Sub-Product{step.products_needed.length !== 1 ? 's' : ''}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Expanded Details */}
                          {isExpanded && (
                            <div className="border-t border-slate-100 bg-slate-50/30 p-4 space-y-4">
                              {/* Raw Materials Section */}
                              {step.materials_needed.length > 0 && (
                                <div className="space-y-2.5">
                                  <h6 className="font-bold text-xs uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                                    <Package className="w-3.5 h-3.5 text-emerald-500" />
                                    <span>Raw Materials Required</span>
                                  </h6>
                                  <div className="space-y-2">
                                    {step.materials_needed.map((material, idx) => {
                                      const materialStock = material.current_stock ?? 0;
                                      const shortage = Math.max(0, material.quantity - materialStock);
                                      return (
                                        <div 
                                          key={`${step.step}-material-${material.material_id || idx}`}
                                          className={`p-3 bg-white border rounded-xl flex items-center justify-between gap-3 shadow-sm ${
                                            shortage > 0 ? 'border-amber-200' : 'border-slate-100'
                                          }`}
                                        >
                                          <div className="min-w-0 flex-1">
                                            <div className="font-bold text-xs sm:text-sm text-slate-800 truncate">
                                              {material.material_name}
                                            </div>
                                            <div className="text-[9px] text-slate-400 mt-0.5 font-mono">
                                              ID: {String(material.material_id || '').substring(0, 8)}
                                            </div>
                                          </div>
                                          <div className="text-right shrink-0">
                                            <div className="font-extrabold text-xs sm:text-sm text-slate-900">
                                              {material.quantity.toFixed(2)} {material.unit}
                                            </div>
                                            <div className="flex items-center gap-1.5 justify-end mt-0.5">
                                              <span className={`text-[10px] font-bold ${shortage > 0 ? 'text-amber-600' : 'text-slate-500'}`}>
                                                Stock: {materialStock.toFixed(1)} {material.unit}
                                              </span>
                                              {shortage > 0 && (
                                                <Badge className="bg-amber-100 text-amber-800 text-[9px] hover:bg-amber-100 font-bold px-1.5 py-0 border-0">
                                                  -{shortage.toFixed(1)}
                                                </Badge>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}

                              {/* Products Section */}
                              {step.products_needed.length > 0 && (
                                <div className="space-y-2.5">
                                  <h6 className="font-bold text-xs uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                                    <Factory className="w-3.5 h-3.5 text-purple-500" />
                                    <span>Sub-Products Required</span>
                                  </h6>
                                  <div className="space-y-2">
                                    {step.products_needed.map((prod, idx) => {
                                      const nestedProduct = products.find((p) => p.id === prod.product_id);
                                      const actualStock = nestedProduct?.individual_stock_tracking
                                        ? nestedProduct?.current_stock || nestedProduct?.individual_products_count || 0
                                        : nestedProduct?.base_quantity || nestedProduct?.current_stock || 0;
                                      const shortage = Math.max(0, prod.quantity - actualStock);

                                      return (
                                        <div 
                                          key={`${step.step}-product-${prod.product_id || idx}`}
                                          className={`p-3 bg-white border rounded-xl flex items-center justify-between gap-3 shadow-sm ${
                                            shortage > 0 ? 'border-amber-200' : 'border-slate-100'
                                          }`}
                                        >
                                          <div className="min-w-0 flex-1">
                                            <div className="font-bold text-xs sm:text-sm text-slate-800 truncate">
                                              {prod.product_name}
                                            </div>
                                            <div className="text-[9px] text-slate-400 mt-0.5 font-mono">
                                              ID: {String(prod.product_id || '').substring(0, 8)}
                                            </div>
                                          </div>
                                          <div className="text-right shrink-0">
                                            <div className="font-extrabold text-xs sm:text-sm text-slate-900">
                                              {prod.quantity.toFixed(2)} {prod.unit}
                                            </div>
                                            <div className="flex items-center gap-1.5 justify-end mt-0.5">
                                              <span className={`text-[10px] font-bold ${shortage > 0 ? 'text-amber-600' : 'text-slate-500'}`}>
                                                Stock: {actualStock.toFixed(1)} {prod.unit}
                                              </span>
                                              {shortage > 0 && (
                                                <Badge className="bg-amber-100 text-amber-800 text-[9px] hover:bg-amber-100 font-bold px-1.5 py-0 border-0">
                                                  -{shortage.toFixed(1)}
                                                </Badge>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
