import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Package } from 'lucide-react';
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
          <CheckCircle className="w-5 h-5" />
          Production Feasibility Based on Available Stock
        </CardTitle>
        <p className="text-xs md:text-sm text-muted-foreground mt-1">
          Analysis of what can be produced with current stock and what materials are needed for remaining quantity
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4 md:space-y-6">
          {calculationItems.map((item, idx) => {
            const product = products.find((p) => p.id === item.productId);
            const availableStock = product?.individual_stock_tracking
              ? product?.current_stock || product?.individual_products_count || 0
              : product?.base_quantity || product?.current_stock || 0;
            const requestedQty = item.quantity;
            const canProduceFromStock = Math.min(availableStock, requestedQty);
            const needToProduce = Math.max(0, requestedQty - availableStock);
            const step = productionSteps.find((s) => s.product_name === item.productName);

            return (
              <div
                key={idx}
                className="border border-gray-200 rounded-lg p-3 md:p-4 bg-gradient-to-r from-blue-50 to-purple-50"
              >
                <div className="mb-3 md:mb-4">
                  <h3 className="text-base md:text-lg font-semibold text-gray-800 mb-2">{item.productName}</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
                    <div className="bg-white p-2 md:p-3 rounded-lg border border-gray-200">
                      <div className="text-xs md:text-sm text-gray-600">Requested</div>
                      <div className="text-lg md:text-xl font-bold text-blue-600">
                        {requestedQty} {item.unit}
                      </div>
                    </div>
                    <div className="bg-white p-2 md:p-3 rounded-lg border border-gray-200">
                      <div className="text-xs md:text-sm text-gray-600">Available in Stock</div>
                      <div className="text-lg md:text-xl font-bold text-green-600">
                        {availableStock} {item.unit}
                      </div>
                    </div>
                    <div className="bg-white p-2 md:p-3 rounded-lg border border-gray-200">
                      <div className="text-xs md:text-sm text-gray-600">Can Use from Stock</div>
                      <div className="text-lg md:text-xl font-bold text-purple-600">
                        {canProduceFromStock} {item.unit}
                      </div>
                    </div>
                    <div className="bg-white p-2 md:p-3 rounded-lg border border-gray-200">
                      <div className="text-xs md:text-sm text-gray-600">Need to Produce</div>
                      <div className="text-lg md:text-xl font-bold text-orange-600">
                        {needToProduce} {item.unit}
                      </div>
                    </div>
                  </div>
                </div>

                {needToProduce > 0 && step && (
                  <div className="mt-3 md:mt-4">
                    <h4 className="font-medium text-sm md:text-base text-gray-800 mb-2 md:mb-3 flex items-center gap-2">
                      <Package className="w-4 h-4 text-orange-600" />
                      Raw Materials Needed for Remaining {needToProduce} {item.unit}
                    </h4>
                    <div className="overflow-x-auto">
                      <div className="min-w-full">
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-2 md:gap-3 text-xs md:text-sm bg-orange-50 p-2 md:p-3 rounded font-semibold border-b">
                          <div>Material Name</div>
                          <div>Required Qty</div>
                          <div>Unit</div>
                          <div>Available</div>
                          <div>Shortage</div>
                        </div>
                        {step.materials_needed.map((material, matIdx) => {
                          const materialPerUnit = material.quantity / item.quantity;
                          const neededForRemaining = materialPerUnit * needToProduce;
                          const rawMat = rawMaterials.find((rm) => rm.name === material.material_name);
                          const available = rawMat?.current_stock || 0;
                          const shortage = Math.max(0, neededForRemaining - available);

                          return (
                            <div
                              key={matIdx}
                              className={`grid grid-cols-1 md:grid-cols-5 gap-2 md:gap-3 p-2 md:p-3 border-b text-xs md:text-sm ${
                                shortage > 0 ? 'bg-red-50' : 'bg-green-50'
                              }`}
                            >
                              <div className="font-medium">{material.material_name}</div>
                              <div>{neededForRemaining.toFixed(2)}</div>
                              <div>{material.unit}</div>
                              <div>{available.toFixed(2)}</div>
                              <div className={`font-medium ${shortage > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                {shortage.toFixed(2)}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {canProduceFromStock > 0 && (
                  <div className="mt-3 md:mt-4 p-2 md:p-3 bg-green-100 border border-green-300 rounded-lg">
                    <div className="flex items-center gap-2 text-green-800">
                      <CheckCircle className="w-4 h-4 md:w-5 md:h-5" />
                      <span className="text-xs md:text-sm font-medium">
                        ✓ You can fulfill {canProduceFromStock} {item.unit} from existing stock without production!
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



