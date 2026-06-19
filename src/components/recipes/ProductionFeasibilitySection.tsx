import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Package, AlertTriangle, Factory, ShoppingCart, Warehouse } from 'lucide-react';
import type { Product } from '@/types/product';
import type { RawMaterial } from '@/types/material';

interface RecipeCalculationItem {
  productId: string;
  productName: string;
  quantity: number;
  unit: string;
}

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

interface ProductionFeasibilitySectionProps {
  calculationItems: RecipeCalculationItem[];
  productionSteps: ProductionStep[];
  products: Product[];
  rawMaterials: RawMaterial[];
}

export default function ProductionFeasibilitySection({
  calculationItems,
  productionSteps,
  products,
  rawMaterials,
}: ProductionFeasibilitySectionProps) {
  return (
    <Card className="border-0 shadow-none bg-transparent md:border md:shadow md:bg-card">
      <CardHeader className="px-0 pb-3 md:px-6 md:pt-6">
        <CardTitle className="flex items-center gap-2 text-lg md:text-xl font-black text-slate-900">
          <CheckCircle className="w-5 h-5 text-blue-600" />
          Production Feasibility Based on Available Stock
        </CardTitle>
        <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
          Analysis of what can be produced with current stock and what materials are needed for remaining quantity
        </p>
      </CardHeader>
      <CardContent className="px-0 md:px-6 md:pb-6">
        <div className="space-y-6">
          {calculationItems.map((item, idx) => {
            const product = products.find((p) => p.id === item.productId);
            const availableStock = product?.individual_stock_tracking
              ? product?.current_stock || product?.individual_products_count || 0
              : product?.base_quantity || product?.current_stock || 0;
            const requestedQty = item.quantity;
            const canProduceFromStock = Math.min(availableStock, requestedQty);
            const needToProduce = Math.max(0, requestedQty - availableStock);
            const step = productionSteps.find((s) => s.product_name === item.productName);

            // Calculate stock coverage percentage
            const stockFulfillmentPercentage = requestedQty > 0 ? Math.min(100, (availableStock / requestedQty) * 100) : 100;

            return (
              <div
                key={idx}
                className="border border-slate-200 rounded-3xl p-4 sm:p-6 bg-slate-50/30 shadow-sm space-y-5"
              >
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-800 mb-1">{item.productName}</h3>
                  
                  {/* Stock Coverage progress bar */}
                  <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    <span>Fulfillment Cover from Stock</span>
                    <span className={stockFulfillmentPercentage === 100 ? 'text-emerald-700 font-black' : 'text-blue-700 font-black'}>
                      {stockFulfillmentPercentage.toFixed(0)}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mb-4">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        stockFulfillmentPercentage === 100 ? 'bg-emerald-500' : 'bg-blue-500'
                      }`}
                      style={{ width: `${stockFulfillmentPercentage}%` }}
                    />
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    <div className="bg-blue-50/50 p-3 rounded-2xl border border-blue-100 flex items-start gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-600 shrink-0 mt-0.5">
                        <ShoppingCart className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-[9px] text-blue-500 font-bold uppercase tracking-wider">Requested</div>
                        <div className="text-sm sm:text-base font-extrabold text-blue-900 mt-0.5">
                          {requestedQty} {item.unit}
                        </div>
                      </div>
                    </div>

                    <div className="bg-emerald-50/50 p-3 rounded-2xl border border-emerald-100 flex items-start gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 shrink-0 mt-0.5">
                        <Warehouse className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-[9px] text-emerald-500 font-bold uppercase tracking-wider">In Stock</div>
                        <div className="text-sm sm:text-base font-extrabold text-emerald-900 mt-0.5">
                          {availableStock} {item.unit}
                        </div>
                      </div>
                    </div>

                    <div className="bg-purple-50/50 p-3 rounded-2xl border border-purple-100 flex items-start gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-600 shrink-0 mt-0.5">
                        <CheckCircle className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-[9px] text-purple-500 font-bold uppercase tracking-wider">Use Stock</div>
                        <div className="text-sm sm:text-base font-extrabold text-purple-900 mt-0.5">
                          {canProduceFromStock} {item.unit}
                        </div>
                      </div>
                    </div>

                    <div className="bg-amber-50/50 p-3 rounded-2xl border border-amber-100 flex items-start gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-600 shrink-0 mt-0.5">
                        <Factory className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-[9px] text-amber-500 font-bold uppercase tracking-wider">To Produce</div>
                        <div className="text-sm sm:text-base font-extrabold text-amber-900 mt-0.5">
                          {needToProduce} {item.unit}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {needToProduce > 0 && step && (
                  <div className="space-y-3 pt-3 border-t border-slate-200/60">
                    <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <Package className="w-4 h-4 text-amber-600" />
                      <span>Materials Needed for Remaining {needToProduce} {item.unit}</span>
                    </h4>

                    {/* Desktop View - Table */}
                    <div className="hidden md:block overflow-x-auto border border-slate-200 rounded-2xl bg-white">
                      <table className="min-w-full divide-y divide-slate-200 text-xs">
                        <thead className="bg-slate-50">
                          <tr>
                            <th scope="col" className="px-4 py-3 text-left font-bold text-slate-500 uppercase tracking-wider">Material Name</th>
                            <th scope="col" className="px-4 py-3 text-left font-bold text-slate-500 uppercase tracking-wider">Required Qty</th>
                            <th scope="col" className="px-4 py-3 text-left font-bold text-slate-500 uppercase tracking-wider">Unit</th>
                            <th scope="col" className="px-4 py-3 text-left font-bold text-slate-500 uppercase tracking-wider">Available</th>
                            <th scope="col" className="px-4 py-3 text-left font-bold text-slate-500 uppercase tracking-wider">Shortage</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-100 font-medium">
                          {step.materials_needed.map((material, matIdx) => {
                            const materialPerUnit = material.quantity / item.quantity;
                            const neededForRemaining = materialPerUnit * needToProduce;
                            const rawMat = rawMaterials.find((rm) => rm.name === material.material_name);
                            const available = rawMat?.current_stock || 0;
                            const shortage = Math.max(0, neededForRemaining - available);

                            return (
                              <tr
                                key={matIdx}
                                className={shortage > 0 ? 'bg-rose-50/10 hover:bg-rose-50/30' : 'bg-emerald-50/10 hover:bg-emerald-50/30'}
                              >
                                <td className="px-4 py-3 font-bold text-slate-800">{material.material_name}</td>
                                <td className="px-4 py-3 text-slate-700">{neededForRemaining.toFixed(2)}</td>
                                <td className="px-4 py-3 text-slate-500">{material.unit}</td>
                                <td className="px-4 py-3 text-slate-700">{available.toFixed(2)}</td>
                                <td className={`px-4 py-3 font-bold ${shortage > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                  {shortage.toFixed(2)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile View - Cards List */}
                    <div className="block md:hidden space-y-3">
                      {step.materials_needed.map((material, matIdx) => {
                        const materialPerUnit = material.quantity / item.quantity;
                        const neededForRemaining = materialPerUnit * needToProduce;
                        const rawMat = rawMaterials.find((rm) => rm.name === material.material_name);
                        const available = rawMat?.current_stock || 0;
                        const shortage = Math.max(0, neededForRemaining - available);
                        const materialPercentage = neededForRemaining > 0 ? Math.min(100, (available / neededForRemaining) * 100) : 100;

                        return (
                          <div 
                            key={matIdx}
                            className={`p-4 bg-white border rounded-2xl shadow-sm space-y-3 ${
                              shortage > 0 ? 'border-rose-100' : 'border-slate-100'
                            }`}
                          >
                            <div className="flex justify-between items-start gap-2">
                              <span className="font-extrabold text-xs text-slate-800 break-words max-w-[70%]">
                                {material.material_name}
                              </span>
                              <Badge 
                                className={`text-[9px] font-bold rounded-lg border-0 px-2 py-0 ${
                                  shortage > 0 ? 'bg-rose-50 text-rose-700 hover:bg-rose-50' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-50'
                                }`}
                              >
                                {shortage > 0 ? 'Shortage' : 'Available'}
                              </Badge>
                            </div>
                            
                            <div className="grid grid-cols-3 gap-2 text-[11px]">
                              <div className="bg-slate-50 p-2 rounded-xl text-center">
                                <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-wider">Needed</span>
                                <span className="font-extrabold text-slate-900 mt-0.5 block">{neededForRemaining.toFixed(2)}</span>
                              </div>
                              <div className="bg-slate-50 p-2 rounded-xl text-center">
                                <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-wider">Available</span>
                                <span className="font-extrabold text-slate-900 mt-0.5 block">{available.toFixed(2)}</span>
                              </div>
                              <div className={`p-2 rounded-xl text-center font-extrabold ${shortage > 0 ? 'bg-rose-50/50 text-rose-900' : 'bg-emerald-50/50 text-emerald-900'}`}>
                                <span className="text-[9px] block uppercase tracking-wider opacity-70">Shortage</span>
                                <span className="mt-0.5 block">{shortage.toFixed(2)}</span>
                              </div>
                            </div>

                            {/* Mini progress bar */}
                            <div className="space-y-1">
                              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full rounded-full transition-all ${
                                    shortage > 0 ? 'bg-rose-500' : 'bg-emerald-500'
                                  }`}
                                  style={{ width: `${materialPercentage}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {canProduceFromStock > 0 && (
                  <div className="mt-3 p-3 bg-emerald-50 border border-emerald-100 rounded-2xl">
                    <div className="flex items-center gap-2 text-emerald-800">
                      <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 shrink-0" />
                      <span className="text-xs sm:text-sm font-bold">
                        ✓ Fulfill {canProduceFromStock} {item.unit} directly from warehouse stock without new production!
                      </span>
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




