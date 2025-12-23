import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import Layout from '@/components/layout/Layout';
import { ProductService } from '@/services/productService';
import { RecipeService } from '@/services/recipeService';
import { MaterialService } from '@/services/materialService';
import type { Product } from '@/types/product';
import type { RawMaterial } from '@/types/material';
import type { Recipe } from '@/types/recipe';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ProductSelectionCard from '@/components/recipes/ProductSelectionCard';
import CalculationResultsCard from '@/components/recipes/CalculationResultsCard';
import RecipeManagementCard from '@/components/recipes/RecipeManagementCard';

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

export default function RecipeCalculator() {
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [calculationItems, setCalculationItems] = useState<RecipeCalculationItem[]>([]);
  const [finalBreakdown, setFinalBreakdown] = useState<FinalMaterialBreakdown[]>([]);
  const [productionSteps, setProductionSteps] = useState<ProductionStep[]>([]);
  const [isCalculating, setIsCalculating] = useState(false);
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set());

  useEffect(() => {
    loadProducts();
    loadRawMaterials();
    loadRecipes();
  }, []);

  const loadProducts = async () => {
    try {
      const result = await ProductService.getProducts({ limit: 1000 });
      // Filter to only show products that have recipes
      const productsWithRecipes = (result.products || []).filter(p => p.has_recipe);
      setProducts(productsWithRecipes);
    } catch (error) {
      console.error('Error loading products:', error);
      toast({
        title: 'Error',
        description: 'Failed to load products',
        variant: 'destructive',
      });
    }
  };

  const loadRawMaterials = async () => {
    try {
      const result = await MaterialService.getMaterials({ limit: 1000 });
      setRawMaterials(result.materials || []);
    } catch (error) {
      console.error('Error loading raw materials:', error);
      toast({
        title: 'Error',
        description: 'Failed to load raw materials',
        variant: 'destructive',
      });
    }
  };

  const loadRecipes = async () => {
    try {
      const result = await RecipeService.getRecipes({ limit: 1000 });
      setRecipes(result.recipes || []);
    } catch (error) {
      console.error('Error loading recipes:', error);
      toast({
        title: 'Error',
        description: 'Failed to load recipes',
        variant: 'destructive',
      });
    }
  };

  const addCalculationItem = () => {
    setCalculationItems([
      ...calculationItems,
      {
        productId: '',
        productName: '',
        quantity: 1,
        unit: 'piece',
      },
    ]);
  };

  const updateCalculationItem = (index: number, field: keyof RecipeCalculationItem, value: any) => {
    console.log('updateCalculationItem called:', { index, field, value, currentItems: calculationItems });
    setCalculationItems((prev) => {
      const updated = [...prev];
      if (field === 'productId') {
        const product = products.find((p) => p.id === value);
        console.log('Found product in products array:', product);
        updated[index] = {
          ...updated[index],
          productId: value,
          productName: product?.name || updated[index].productName || '',
          unit: product?.unit || updated[index].unit || 'piece',
        };
      } else {
        updated[index] = { ...updated[index], [field]: value };
      }
      console.log('Updated item:', updated[index]);
      return updated;
    });
  };

  const removeCalculationItem = (index: number) => {
    setCalculationItems(calculationItems.filter((_, i) => i !== index));
  };

  const calculateRecipes = async () => {
    if (calculationItems.length === 0) {
      toast({
        title: 'No Items',
        description: 'Please add at least one product to calculate',
        variant: 'destructive',
      });
      return;
    }

    setIsCalculating(true);
    try {
      const materialBreakdown = new Map<string, FinalMaterialBreakdown>();
      const steps: ProductionStep[] = [];
      let stepCounter = 1;

      // Process each calculation item
      for (const item of calculationItems) {
        if (!item.productId) continue;

        await processProductRecursively(
          item.productId,
          item.productName,
          item.quantity,
          item.unit,
          materialBreakdown,
          steps,
          stepCounter,
          new Set() // Track processed products to avoid infinite loops
        );
        stepCounter++;
      }

      // Convert map to array and sort by material name
      const finalBreakdownArray = Array.from(materialBreakdown.values()).sort((a, b) =>
        a.material_name.localeCompare(b.material_name)
      );

      setFinalBreakdown(finalBreakdownArray);
      setProductionSteps(steps);

      toast({
        title: 'SQM-Based Calculation Complete',
        description: `Calculated ${finalBreakdownArray.length} raw materials needed using SQM-based recipes`,
      });
    } catch (error) {
      console.error('Error calculating recipes:', error);
      toast({
        title: 'Calculation Error',
        description: 'Failed to calculate recipes. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsCalculating(false);
    }
  };

  const processProductRecursively = async (
    productId: string,
    productName: string,
    quantity: number,
    unit: string,
    materialBreakdown: Map<string, FinalMaterialBreakdown>,
    steps: ProductionStep[],
    stepNumber: number,
    processedProducts: Set<string>
  ) => {
    // Avoid infinite loops
    if (processedProducts.has(productId)) {
      console.warn(`Circular dependency detected for product: ${productName}`);
      return;
    }
    processedProducts.add(productId);

    try {
      // Get product recipe
      const recipe = await RecipeService.getRecipeByProductId(productId);

      if (!recipe || !recipe.materials) {
        console.log(`No recipe found for product: ${productName}`);
        return;
      }

      // Get product stock info
      const product = products.find((p) => p.id === productId);

      // Use real-time available stock from individual_product_stats if available
      const productStock = product?.individual_stock_tracking && product?.individual_product_stats
        ? product.individual_product_stats.available
        : product?.current_stock || 0;

      const step: ProductionStep = {
        step: stepNumber,
        product_id: productId,
        product_name: productName,
        quantity,
        unit,
        current_stock: productStock,
        materials_needed: [],
        products_needed: [],
      };

      // Process each material in the recipe using SQM-based calculation
      // First, get product dimensions to calculate total area
      const currentProduct = products.find((p) => p.id === productId);
      const productLength = parseFloat(currentProduct?.length || '0');
      const productWidth = parseFloat(currentProduct?.width || '0');
      const areaPerUnit = productLength * productWidth; // sqm per unit
      const totalArea = quantity * areaPerUnit; // total sqm needed

      console.log(`📐 Product ${productName}: ${productLength}m × ${productWidth}m = ${areaPerUnit} sqm per unit`);
      console.log(`📊 Total area needed: ${quantity} units × ${areaPerUnit} sqm = ${totalArea} sqm`);

      for (const recipeMaterial of recipe.materials) {
        // Recipe material quantity is per 1 sqm, so multiply by total area
        const requiredQuantity = recipeMaterial.quantity_per_sqm * totalArea;

        // Check if it's a raw material or product
        const rawMaterial = rawMaterials.find((rm) => rm.id === recipeMaterial.material_id);

        if (rawMaterial) {
          // It's a raw material - use available_stock instead of current_stock
          const materialAvailableStock = rawMaterial.available_stock ?? rawMaterial.current_stock;

          step.materials_needed.push({
            material_id: recipeMaterial.material_id,
            material_name: recipeMaterial.material_name,
            quantity: requiredQuantity,
            unit: recipeMaterial.unit,
            current_stock: materialAvailableStock,
          });

          // Add to final breakdown
          if (materialBreakdown.has(recipeMaterial.material_id)) {
            const existing = materialBreakdown.get(recipeMaterial.material_id)!;
            existing.total_quantity += requiredQuantity;
            existing.sources.push({
              product_name: productName,
              quantity_needed: requiredQuantity,
              contribution: requiredQuantity,
            });
          } else {
            materialBreakdown.set(recipeMaterial.material_id, {
              material_id: recipeMaterial.material_id,
              material_name: recipeMaterial.material_name,
              total_quantity: requiredQuantity,
              unit: recipeMaterial.unit,
              available_stock: materialAvailableStock,
              shortage: Math.max(0, requiredQuantity - materialAvailableStock),
              is_available: materialAvailableStock >= requiredQuantity,
              sources: [
                {
                  product_name: productName,
                  quantity_needed: requiredQuantity,
                  contribution: requiredQuantity,
                },
              ],
            });
          }
        } else {
          // It's a product - process recursively
          const nestedProduct = products.find((p) => p.id === recipeMaterial.material_id);

          // For products used as recipe ingredients, calculate quantity based on SQM ratio
          const nestedProductLength = parseFloat(nestedProduct?.length || '0');
          const nestedProductWidth = parseFloat(nestedProduct?.width || '0');
          const nestedProductAreaPerUnit = nestedProductLength * nestedProductWidth; // sqm per unit of nested product

          // Calculate how many units of the nested product we need
          const nestedProductQuantity =
            nestedProductAreaPerUnit > 0 ? requiredQuantity / nestedProductAreaPerUnit : requiredQuantity; // Fallback if no dimensions

          console.log(`🔄 Product ingredient: ${recipeMaterial.material_name}`);
          console.log(`   Recipe: ${recipeMaterial.quantity_per_sqm} sqm per 1 sqm of ${productName}`);
          console.log(`   Total area needed: ${requiredQuantity} sqm`);
          console.log(`   ${recipeMaterial.material_name} area per unit: ${nestedProductAreaPerUnit} sqm`);
          console.log(`   → Need ${nestedProductQuantity} units of ${recipeMaterial.material_name}`);

          // Calculate stock for nested product - use real-time available stock
          const nestedProductStock = nestedProduct?.individual_stock_tracking && nestedProduct?.individual_product_stats
            ? nestedProduct.individual_product_stats.available
            : nestedProduct?.current_stock || 0;

          step.products_needed.push({
            product_id: recipeMaterial.material_id,
            product_name: recipeMaterial.material_name,
            quantity: nestedProductQuantity,
            unit: nestedProduct?.unit || recipeMaterial.unit,
            current_stock: nestedProductStock,
          });

          // Recursively process this product with the calculated quantity (in units, not sqm)
          await processProductRecursively(
            recipeMaterial.material_id,
            recipeMaterial.material_name,
            nestedProductQuantity,
            nestedProduct?.unit || recipeMaterial.unit,
            materialBreakdown,
            steps,
            steps.length + 1,
            new Set(processedProducts) // Create new set for this branch
          );
        }
      }

      steps.push(step);
    } catch (error) {
      console.error(`Error processing product ${productName}:`, error);
    }
  };

  const toggleStepExpansion = (stepNumber: number) => {
    const newExpanded = new Set(expandedSteps);
    if (newExpanded.has(stepNumber)) {
      newExpanded.delete(stepNumber);
    } else {
      newExpanded.add(stepNumber);
    }
    setExpandedSteps(newExpanded);
  };

  return (
    <Layout>
      <div className="space-y-4">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Recipe Calculator</h1>
          <p className="text-sm text-gray-600 mt-2">
            Calculate raw materials needed for production using SQM-based recipes
          </p>
        </div>

      <Tabs defaultValue="calculator" className="space-y-4 md:space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="calculator">Calculator</TabsTrigger>
          <TabsTrigger value="recipes">Recipes</TabsTrigger>
        </TabsList>

        <TabsContent value="calculator" className="space-y-4 md:space-y-6">
          <ProductSelectionCard
            calculationItems={calculationItems}
            products={products}
            onAddItem={addCalculationItem}
            onUpdateItem={updateCalculationItem}
            onRemoveItem={removeCalculationItem}
            onCalculate={calculateRecipes}
            isCalculating={isCalculating}
          />

          <CalculationResultsCard
            productionSteps={productionSteps}
            finalBreakdown={finalBreakdown}
            calculationItems={calculationItems}
            products={products}
            rawMaterials={rawMaterials}
            expandedSteps={expandedSteps}
            onToggleStep={toggleStepExpansion}
          />
        </TabsContent>

        <TabsContent value="recipes" className="space-y-4 md:space-y-6">
          <RecipeManagementCard
            recipes={recipes}
            products={products}
            rawMaterials={rawMaterials}
            onRefresh={loadRecipes}
          />
        </TabsContent>
      </Tabs>
      </div>
    </Layout>
  );
}

