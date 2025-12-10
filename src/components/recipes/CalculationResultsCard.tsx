import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Factory, TrendingUp, ChevronDown, ChevronUp, Package, CheckCircle } from 'lucide-react';
import type { Product } from '@/types/product';
import type { RawMaterial } from '@/types/material';
import ProductionStepsSection from './ProductionStepsSection';
import MaterialBreakdownSection from './MaterialBreakdownSection';
import ProductionFeasibilitySection from './ProductionFeasibilitySection';

interface RecipeCalculationItem {
  productId: string;
  productName: string;
  quantity: number;
  unit: string;
}

interface FinalMaterialBreakdown {
  material_id: string;
  material_name: string;
  total_quantity: number;
  unit: string;
  available_stock: number;
  shortage: number;
  is_available: boolean;
  sources: {
    product_name: string;
    quantity_needed: number;
    contribution: number;
  }[];
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

interface CalculationResultsCardProps {
  productionSteps: ProductionStep[];
  finalBreakdown: FinalMaterialBreakdown[];
  calculationItems: RecipeCalculationItem[];
  products: Product[];
  rawMaterials: RawMaterial[];
  expandedSteps: Set<number>;
  onToggleStep: (stepNumber: number) => void;
}

export default function CalculationResultsCard({
  productionSteps,
  finalBreakdown,
  calculationItems,
  products,
  rawMaterials,
  expandedSteps,
  onToggleStep,
}: CalculationResultsCardProps) {
  const totalShortage = finalBreakdown.reduce((sum, material) => sum + material.shortage, 0);
  const availableMaterials = finalBreakdown.filter((m) => m.is_available).length;
  const totalMaterials = finalBreakdown.length;

  if (productionSteps.length === 0 && calculationItems.length > 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center text-muted-foreground">
            <Factory className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">Ready to Calculate</p>
            <p className="text-sm mt-2">Click "Calculate Recipe" to see production steps</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (productionSteps.length === 0) {
    return null;
  }

  return (
    <>
      <ProductionStepsSection
        productionSteps={productionSteps}
        products={products}
        expandedSteps={expandedSteps}
        onToggleStep={onToggleStep}
      />

      {finalBreakdown.length > 0 && (
        <MaterialBreakdownSection
          finalBreakdown={finalBreakdown}
          totalMaterials={totalMaterials}
          availableMaterials={availableMaterials}
        />
      )}

      <ProductionFeasibilitySection
        calculationItems={calculationItems}
        productionSteps={productionSteps}
        products={products}
        rawMaterials={rawMaterials}
      />
    </>
  );
}



