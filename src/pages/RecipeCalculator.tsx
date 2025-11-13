import { useState, useEffect } from "react";
import ProductService, { Product } from "@/services/api/productService";
import { MongoDBRecipeService } from "@/services/api/recipeService";
import RawMaterialService from "@/services/api/rawMaterialService";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Calculator, 
  Package, 
  Factory, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  ArrowRight,
  Plus,
  Minus,
  RefreshCw,
  Download,
  Eye,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Edit,
  Trash2,
  Save,
  X
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface RawMaterial {
  id: string;
  name: string;
  unit: string;
  current_stock: number;
}

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
    nested_materials?: {
      material_name: string;
      quantity: number;
      unit: string;
    }[];
  }[];
}

export default function RecipeCalculator() {
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
  const [calculationItems, setCalculationItems] = useState<RecipeCalculationItem[]>([]);
  const [finalBreakdown, setFinalBreakdown] = useState<FinalMaterialBreakdown[]>([]);
  const [productionSteps, setProductionSteps] = useState<ProductionStep[]>([]);
  const [isCalculating, setIsCalculating] = useState(false);
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set());
  
  // Recipes tab state
  const [recipes, setRecipes] = useState<any[]>([]);
  const [editingRecipe, setEditingRecipe] = useState<any>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<any>(null);
  const [isMaterialDialogOpen, setIsMaterialDialogOpen] = useState(false);

  // Load products and raw materials
  useEffect(() => {
    loadProducts();
    loadRawMaterials();
    loadRecipes();
  }, []);

  const loadProducts = async () => {
    try {
      const { data, error } = await ProductService.getProducts();
      if (error) {
        console.error('Error loading products:', error);
        toast({
          title: "Error",
          description: "Failed to load products",
          variant: "destructive",
        });
        return;
      }
      setProducts(data || []);
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  const loadRawMaterials = async () => {
    try {
      const { data, error } = await RawMaterialService.getRawMaterials();
      if (error) {
        console.error('Error loading raw materials:', error);
        toast({
          title: "Error",
          description: "Failed to load raw materials",
          variant: "destructive",
        });
        return;
      }
      setRawMaterials(data || []);
    } catch (error) {
      console.error('Error loading raw materials:', error);
    }
  };

  const loadRecipes = async () => {
    try {
      const { data, error } = await MongoDBRecipeService.getAllRecipes();
      if (error) {
        console.error('Error loading recipes:', error);
        toast({
          title: "Error",
          description: "Failed to load recipes",
          variant: "destructive",
        });
        return;
      }
      setRecipes(data || []);
    } catch (error) {
      console.error('Error loading recipes:', error);
    }
  };

  const addCalculationItem = () => {
    setCalculationItems([...calculationItems, {
      productId: "",
      productName: "",
      quantity: 1,
      unit: "piece"
    }]);
  };

  const updateCalculationItem = (index: number, field: keyof RecipeCalculationItem, value: any) => {
    const updated = [...calculationItems];
    if (field === 'productId') {
      const product = products.find(p => p.id === value);
      updated[index] = {
        ...updated[index],
        productId: value,
        productName: product?.name || "",
        unit: product?.unit || "piece"
      };
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }
    setCalculationItems(updated);
  };

  const removeCalculationItem = (index: number) => {
    setCalculationItems(calculationItems.filter((_, i) => i !== index));
  };

  const calculateRecipes = async () => {
    if (calculationItems.length === 0) {
      toast({
        title: "No Items",
        description: "Please add at least one product to calculate",
        variant: "destructive",
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
      const finalBreakdownArray = Array.from(materialBreakdown.values())
        .sort((a, b) => a.material_name.localeCompare(b.material_name));

      setFinalBreakdown(finalBreakdownArray);
      setProductionSteps(steps);

      toast({
        title: "SQM-Based Calculation Complete",
        description: `Calculated ${finalBreakdownArray.length} raw materials needed using SQM-based recipes`,
      });

    } catch (error) {
      console.error('Error calculating recipes:', error);
      toast({
        title: "Calculation Error",
        description: "Failed to calculate recipes. Please try again.",
        variant: "destructive",
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
      const { data: recipe, error } = await MongoDBRecipeService.getRecipeByProductId(productId);
      
      if (error || !recipe || !recipe.materials) {
        console.log(`No recipe found for product: ${productName}`);
        return;
      }

      // Get product stock info
      const product = products.find(p => p.id === productId);
      
      // For products with individual stock tracking, use current_stock or individual_products_count
      // For bulk products, use base_quantity
      const productStock = product?.individual_stock_tracking 
        ? (product?.current_stock || product?.individual_products_count || 0)
        : (product?.base_quantity || product?.current_stock || 0);

      const step: ProductionStep = {
        step: stepNumber,
        product_id: productId,
        product_name: productName,
        quantity,
        unit,
        current_stock: productStock,
        materials_needed: [],
        products_needed: []
      };

      // Process each material in the recipe using SQM-based calculation
      // First, get product dimensions to calculate total area
      const currentProduct = products.find(p => p.id === productId);
      const productLength = parseFloat(currentProduct?.length || "0");
      const productWidth = parseFloat(currentProduct?.width || "0");
      const areaPerUnit = productLength * productWidth; // sqm per unit
      const totalArea = quantity * areaPerUnit; // total sqm needed
      
      console.log(`📐 Product ${productName}: ${productLength}m × ${productWidth}m = ${areaPerUnit} sqm per unit`);
      console.log(`📊 Total area needed: ${quantity} units × ${areaPerUnit} sqm = ${totalArea} sqm`);

      for (const recipeMaterial of recipe.materials) {
        // Recipe material quantity is per 1 sqm, so multiply by total area
        const requiredQuantity = recipeMaterial.quantity_per_sqm * totalArea;

        // Check if it's a raw material or product
        const rawMaterial = rawMaterials.find(rm => rm.id === recipeMaterial.material_id);
        
        if (rawMaterial) {
          // It's a raw material
          step.materials_needed.push({
            material_id: recipeMaterial.material_id,
            material_name: recipeMaterial.material_name,
            quantity: requiredQuantity,
            unit: recipeMaterial.unit,
            current_stock: rawMaterial.current_stock
          });

          // Add to final breakdown
          if (materialBreakdown.has(recipeMaterial.material_id)) {
            const existing = materialBreakdown.get(recipeMaterial.material_id)!;
            existing.total_quantity += requiredQuantity;
            existing.sources.push({
              product_name: productName,
              quantity_needed: requiredQuantity,
              contribution: requiredQuantity
            });
          } else {
            materialBreakdown.set(recipeMaterial.material_id, {
              material_id: recipeMaterial.material_id,
              material_name: recipeMaterial.material_name,
              total_quantity: requiredQuantity,
              unit: recipeMaterial.unit,
              available_stock: rawMaterial.current_stock,
              shortage: Math.max(0, requiredQuantity - rawMaterial.current_stock),
              is_available: rawMaterial.current_stock >= requiredQuantity,
              sources: [{
                product_name: productName,
                quantity_needed: requiredQuantity,
                contribution: requiredQuantity
              }]
            });
          }
        } else {
          // It's a product - process recursively
          const nestedProduct = products.find(p => p.id === recipeMaterial.material_id);

          
          // For products used as recipe ingredients, calculate quantity based on SQM ratio
          // If recipe says "1 sqm of Product B needs 1 sqm of Product A", and both have same dimensions,
          // we need 1 quantity of Product A, not the total SQM amount
          const nestedProductLength = parseFloat(nestedProduct?.length || "0");
          const nestedProductWidth = parseFloat(nestedProduct?.width || "0");
          const nestedProductAreaPerUnit = nestedProductLength * nestedProductWidth; // sqm per unit of nested product
          
          // Calculate how many units of the nested product we need
          // If recipe says "1 sqm of current product needs X sqm of nested product"
          // Then: requiredQuantity (in sqm) / nestedProductAreaPerUnit = number of units needed
          const nestedProductQuantity = nestedProductAreaPerUnit > 0 
            ? requiredQuantity / nestedProductAreaPerUnit 
            : requiredQuantity; // Fallback if no dimensions
          
          console.log(`🔄 Product ingredient: ${recipeMaterial.material_name}`);
          console.log(`   Recipe: ${recipeMaterial.quantity_per_sqm} sqm per 1 sqm of ${productName}`);
          console.log(`   Total area needed: ${requiredQuantity} sqm`);
          console.log(`   ${recipeMaterial.material_name} area per unit: ${nestedProductAreaPerUnit} sqm`);
          console.log(`   → Need ${nestedProductQuantity} units of ${recipeMaterial.material_name}`);
          
          // Calculate stock for nested product (same logic as main product)
          const nestedProductStock = nestedProduct?.individual_stock_tracking 
            ? (nestedProduct?.current_stock || nestedProduct?.individual_products_count || 0)
            : (nestedProduct?.base_quantity || nestedProduct?.current_stock || 0);
          
          step.products_needed.push({
            product_id: recipeMaterial.material_id,
            product_name: recipeMaterial.material_name,
            quantity: nestedProductQuantity,
            unit: nestedProduct?.unit || recipeMaterial.unit,
            current_stock: nestedProductStock
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

  // Recipe management functions
  const handleEditRecipe = (recipe: any) => {
    setEditingRecipe(recipe);
    setIsEditDialogOpen(true);
  };

  const handleEditMaterial = (material: any) => {
    setEditingMaterial(material);
    setIsMaterialDialogOpen(true);
  };

  const handleAddMaterial = (recipe: any) => {
    setEditingMaterial({ 
      recipe_id: recipe.id, 
      material_id: '', 
      material_name: '', 
      material_type: 'raw_material', 
      quantity_per_sqm: 1, 
      unit: 'kg'
    });
    setIsMaterialDialogOpen(true);
  };

  const handleRemoveMaterial = async (recipeId: string, materialId: string) => {
    try {
      const recipe = recipes.find(r => r.id === recipeId);
      if (!recipe || recipe.materials.length <= 1) {
        toast({
          title: "Cannot Remove",
          description: "Recipe must have at least one material",
          variant: "destructive",
        });
        return;
      }

      // Update recipe by removing the material
      const updatedMaterials = recipe.materials.filter((m: any) => m.id !== materialId);
      const { error } = await MongoDBRecipeService.updateRecipe(recipeId, {
        materials: updatedMaterials.map((m: any) => ({
          material_id: m.material_id,
          material_name: m.material_name,
          material_type: m.material_type,
          quantity_per_sqm: m.quantity_per_sqm,
          unit: m.unit
        }))
      });

      if (error) {
        toast({
          title: "Error",
          description: "Failed to remove material from recipe",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: "Material removed from recipe",
      });
      loadRecipes();
    } catch (error) {
      console.error('Error removing material:', error);
      toast({
        title: "Error",
        description: "Failed to remove material from recipe",
        variant: "destructive",
      });
    }
  };

  const handleSaveMaterial = async () => {
    try {
      if (!editingMaterial) return;

      const recipe = recipes.find(r => r.id === editingMaterial.recipe_id);
      if (!recipe) return;

      let updatedMaterials = [...recipe.materials];

      if (editingMaterial.id) {
        // Update existing material
        const index = updatedMaterials.findIndex((m: any) => m.id === editingMaterial.id);
        if (index !== -1) {
          updatedMaterials[index] = { ...updatedMaterials[index], ...editingMaterial };
        }
      } else {
        // Add new material
        updatedMaterials.push({
          id: `temp_${Date.now()}`,
          ...editingMaterial,
          quantity_per_sqm: editingMaterial.quantity || editingMaterial.quantity_per_sqm || 1
        });
      }

      const { error } = await MongoDBRecipeService.updateRecipe(editingMaterial.recipe_id, {
        materials: updatedMaterials.map((m: any) => ({
          material_id: m.material_id,
          material_name: m.material_name,
          material_type: m.material_type,
          quantity_per_sqm: m.quantity_per_sqm,
          unit: m.unit
        }))
      });

      if (error) {
        toast({
          title: "Error",
          description: "Failed to save material",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: editingMaterial.id ? "Material updated" : "Material added",
      });
      
      setIsMaterialDialogOpen(false);
      setEditingMaterial(null);
      loadRecipes();
    } catch (error) {
      console.error('Error saving material:', error);
      toast({
        title: "Error",
        description: "Failed to save material",
        variant: "destructive",
      });
    }
  };

  const totalShortage = finalBreakdown.reduce((sum, material) => sum + material.shortage, 0);
  const availableMaterials = finalBreakdown.filter(m => m.is_available).length;
  const totalMaterials = finalBreakdown.length;

  return (
    <div className="flex-1 space-y-6 p-6">
      <Header 
        title="Recipe Calculator" 
        subtitle="Calculate raw materials using SQM-based recipes (1 sqm base) with automatic dimension calculations"
      />

      <Tabs defaultValue="calculator" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="calculator">Calculator</TabsTrigger>
          <TabsTrigger value="recipes">Recipes</TabsTrigger>
        </TabsList>

        <TabsContent value="calculator" className="space-y-6">

      {/* Input Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5" />
            Product Selection
          </CardTitle>
          <div className="text-sm text-blue-600 bg-blue-50 p-3 rounded border">
            💡 <strong>SQM-Based Calculation:</strong> All recipes use 1 sqm as base unit. System automatically calculates total area based on product dimensions (length × width) and applies recipe accordingly.
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {calculationItems.map((item, index) => (
            <div key={index} className="flex items-center gap-4 p-4 border rounded-lg">
              <div className="flex-1">
                <Label htmlFor={`product-${index}`}>Product</Label>
                <Select 
                  value={item.productId} 
                  onValueChange={(value) => updateCalculationItem(index, 'productId', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a product" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name} ({product.category})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="w-32">
                <Label htmlFor={`quantity-${index}`}>Quantity</Label>
                <Input
                  id={`quantity-${index}`}
                  type="number"
                  min="1"
                  value={item.quantity}
                  onChange={(e) => updateCalculationItem(index, 'quantity', parseInt(e.target.value) || 1)}
                />
              </div>
              
              <div className="w-24">
                <Label htmlFor={`unit-${index}`}>Unit</Label>
                <Input
                  id={`unit-${index}`}
                  value={item.unit}
                  readOnly
                  className="bg-gray-50"
                />
              </div>
              
              {/* SQM Calculation Display */}
              {item.productId && (() => {
                const product = products.find(p => p.id === item.productId);
                const length = parseFloat(product?.length || "0");
                const width = parseFloat(product?.width || "0");
                const areaPerUnit = length * width;
                const totalArea = item.quantity * areaPerUnit;
                
                return (
                  <div className="w-32">
                    <Label>Total Area</Label>
                    <div className="text-sm bg-blue-50 p-2 rounded border">
                      <div className="font-medium text-blue-800">
                        {totalArea.toFixed(2)} sqm
                      </div>
                      <div className="text-xs text-blue-600">
                        {length}m × {width}m × {item.quantity}
                      </div>
                    </div>
                  </div>
                );
              })()}
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => removeCalculationItem(index)}
                className="text-red-600 hover:bg-red-50"
              >
                <Minus className="w-4 h-4" />
              </Button>
            </div>
          ))}
          
          <Button onClick={addCalculationItem} variant="outline" className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            Add Product
          </Button>
          
          <Button 
            onClick={calculateRecipes} 
            disabled={isCalculating || calculationItems.length === 0}
            className="w-full"
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

      {/* Production Steps */}
      {productionSteps.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Factory className="w-5 h-5" />
              Production Steps
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Production Steps Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{productionSteps.length}</div>
                <div className="text-sm text-blue-700">Total Steps</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {productionSteps.reduce((sum, step) => sum + step.materials_needed.length, 0)}
                </div>
                <div className="text-sm text-green-700">Raw Materials</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  {productionSteps.reduce((sum, step) => sum + step.products_needed.length, 0)}
                </div>
                <div className="text-sm text-purple-700">Products</div>
              </div>
            </div>

            {/* Production Steps - Excel-like Table */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-200 text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-200 p-3 text-left font-semibold">Step</th>
                    <th className="border border-gray-200 p-3 text-left font-semibold">Product Name</th>
                    <th className="border border-gray-200 p-3 text-left font-semibold">Product ID</th>
                    <th className="border border-gray-200 p-3 text-left font-semibold">Required Qty</th>
                    <th className="border border-gray-200 p-3 text-left font-semibold">Unit</th>
                    <th className="border border-gray-200 p-3 text-left font-semibold">Total Area (sqm)</th>
                    <th className="border border-gray-200 p-3 text-left font-semibold">Available Stock</th>
                    <th className="border border-gray-200 p-3 text-left font-semibold">Recipe Type</th>
                    <th className="border border-gray-200 p-3 text-left font-semibold">Raw Materials</th>
                    <th className="border border-gray-200 p-3 text-left font-semibold">Products</th>
                    <th className="border border-gray-200 p-3 text-left font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {productionSteps.map((step) => (
                    <tr key={step.step} className="hover:bg-gray-50">
                      <td className="border border-gray-200 p-3">
                        <Badge variant="outline" className="font-mono">Step {step.step}</Badge>
                      </td>
                      <td className="border border-gray-200 p-3 font-medium">{step.product_name}</td>
                      <td className="border border-gray-200 p-3 text-gray-600 font-mono text-xs">
                        {step.product_id || 'N/A'}
                      </td>
                      <td className="border border-gray-200 p-3 font-medium">{step.quantity}</td>
                      <td className="border border-gray-200 p-3">{step.unit}</td>
                      <td className="border border-gray-200 p-3">
                        {(() => {
                          const product = products.find(p => p.id === step.product_id);
                          const length = parseFloat(product?.length || "0");
                          const width = parseFloat(product?.width || "0");
                          const totalArea = step.quantity * length * width;
                          return (
                            <div className="text-sm">
                              <div className="font-medium text-blue-800">{totalArea.toFixed(2)}</div>
                              <div className="text-xs text-blue-600">{length}m × {width}m</div>
                            </div>
                          );
                        })()}
                      </td>
                      <td className="border border-gray-200 p-3">
                        {(() => {
                          const product = products.find(p => p.id === step.product_id);
                          // For products with individual stock tracking, use current_stock or individual_products_count
                          // For bulk products, use base_quantity
                          const actualStock = product?.individual_stock_tracking 
                            ? (product?.current_stock || product?.individual_products_count || 0)
                            : (product?.base_quantity || product?.current_stock || 0);
                          return actualStock > 0 ? `${actualStock} ${step.unit}` : '0';
                        })()}
                      </td>
                      <td className="border border-gray-200 p-3">
                        <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                          Product Recipe
                        </Badge>
                      </td>
                      <td className="border border-gray-200 p-3">
                        {step.materials_needed.length > 0 ? (
                          <div className="space-y-1">
                            {step.materials_needed.map((material, idx) => (
                              <div key={idx} className="text-xs">
                                <Badge variant="outline" className="text-xs bg-green-50 text-green-800">
                                  {material.material_name}: {material.quantity} {material.unit}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs">None</span>
                        )}
                      </td>
                      <td className="border border-gray-200 p-3">
                        {step.products_needed.length > 0 ? (
                          <div className="space-y-1">
                            {step.products_needed.map((product, idx) => (
                              <div key={idx} className="text-xs">
                                <Badge variant="outline" className="text-xs bg-purple-50 text-purple-800">
                                  {product.product_name}: {product.quantity} {product.unit}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs">None</span>
                        )}
                      </td>
                      <td className="border border-gray-200 p-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleStepExpansion(step.step)}
                          className="flex items-center gap-1"
                        >
                          {expandedSteps.has(step.step) ? (
                            <>
                              <ChevronUp className="w-3 h-3" />
                              Hide
                            </>
                          ) : (
                            <>
                              <ChevronDown className="w-3 h-3" />
                              Details
                            </>
                          )}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Expanded Details */}
            {productionSteps.some(step => expandedSteps.has(step.step)) && (
              <div className="mt-6 space-y-4">
                {productionSteps
                  .filter(step => expandedSteps.has(step.step))
                  .map((step) => (
                    <div key={`expanded-${step.step}`} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                      <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                        <Factory className="w-4 h-4 text-blue-600" />
                        Step {step.step}: {step.product_name} - Detailed Recipe
                      </h4>
                      
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Raw Materials Section */}
                        {step.materials_needed.length > 0 && (
                          <div>
                            <h5 className="font-medium text-gray-700 mb-3 flex items-center gap-2">
                              <Package className="w-4 h-4 text-green-600" />
                              Raw Materials Required
                            </h5>
                            <div className="space-y-2">
                              {step.materials_needed.map((material, idx) => (
                                <div key={idx} className="border border-gray-200 rounded-lg p-3 bg-white">
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium">{material.material_name}</span>
                                      <Badge variant="outline" className="font-mono text-xs">ID: {material.material_id || 'N/A'}</Badge>
                                    </div>
                                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                                      Raw Material Recipe
                                    </Badge>
                                  </div>
                                  <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                      <span className="text-gray-600">Required:</span>
                                      <div className="font-medium">{material.quantity} {material.unit}</div>
                                    </div>
                                    <div>
                                      <span className="text-gray-600">Current Stock:</span>
                                      <div className="font-medium">
                                        {(() => {
                                          const rawMat = rawMaterials.find(rm => rm.id === material.material_id);
                                          return rawMat?.current_stock !== undefined ? `${rawMat.current_stock} ${material.unit}` : 'N/A';
                                        })()}
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
                            <h5 className="font-medium text-gray-700 mb-3 flex items-center gap-2">
                              <Factory className="w-4 h-4 text-blue-600" />
                              Products Required
                            </h5>
                            <div className="space-y-2">
                              {step.products_needed.map((product, idx) => (
                                <div key={idx} className="border border-gray-200 rounded-lg p-3 bg-white">
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium">{product.product_name}</span>
                                      <Badge variant="outline" className="font-mono text-xs">ID: {product.product_id || 'N/A'}</Badge>
                                    </div>
                                    <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                                      Product Recipe
                                    </Badge>
                                  </div>
                                  <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                                    <div>
                                      <span className="text-gray-600">Required:</span>
                                      <div className="font-medium">{product.quantity} {product.unit}</div>
                                    </div>
                                    <div>
                                      <span className="text-gray-600">Current Stock:</span>
                                      <div className="font-medium">
                                        {(() => {
                                          const nestedProduct = products.find(p => p.id === product.product_id);
                                          // For products with individual stock tracking, use current_stock or individual_products_count
                                          // For bulk products, use base_quantity
                                          const actualStock = nestedProduct?.individual_stock_tracking 
                                            ? (nestedProduct?.current_stock || nestedProduct?.individual_products_count || 0)
                                            : (nestedProduct?.base_quantity || nestedProduct?.current_stock || 0);
                                          return actualStock > 0 ? `${actualStock} ${product.unit}` : '0';
                                        })()}
                                      </div>
                                    </div>
                                  </div>
                                  
                                  {/* Nested Product Recipe */}
                                  {product.nested_materials && product.nested_materials.length > 0 && (
                                    <div className="border-t pt-3">
                                      <div className="text-xs text-gray-600 mb-2">This product is made from:</div>
                                      <div className="space-y-1">
                                        {product.nested_materials.map((nestedMaterial, nestedIdx) => (
                                          <div key={nestedIdx} className="flex items-center gap-2 text-xs bg-gray-50 p-2 rounded">
                                            <Package className="w-3 h-3 text-gray-500" />
                                            <span>{nestedMaterial.material_name}: {nestedMaterial.quantity} {nestedMaterial.unit}</span>
                                            <Badge variant="outline" className="text-xs">Raw Material</Badge>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        calculationItems.length > 0 && (
          <Card>
            <CardContent className="py-12">
              <div className="text-center text-muted-foreground">
                <Factory className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">Ready to Calculate</p>
                <p className="text-sm mt-2">Click "Calculate Recipe" to see production steps</p>
              </div>
            </CardContent>
          </Card>
        )
      )}

      {/* Final Material Breakdown */}
      {finalBreakdown.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Final Raw Material Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{totalMaterials}</div>
                <div className="text-sm text-blue-700">Total Materials</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{availableMaterials}</div>
                <div className="text-sm text-green-700">Available</div>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">{totalMaterials - availableMaterials}</div>
                <div className="text-sm text-red-700">Need Procurement</div>
              </div>
            </div>

            {/* Material Details - Excel-like Table */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-200 text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-200 p-3 text-left font-semibold">Material Name</th>
                    <th className="border border-gray-200 p-3 text-left font-semibold">Material ID</th>
                    <th className="border border-gray-200 p-3 text-left font-semibold">Recipe Type</th>
                    <th className="border border-gray-200 p-3 text-left font-semibold">Required Qty</th>
                    <th className="border border-gray-200 p-3 text-left font-semibold">Unit</th>
                    <th className="border border-gray-200 p-3 text-left font-semibold">Available Stock</th>
                    <th className="border border-gray-200 p-3 text-left font-semibold">Shortage</th>
                    <th className="border border-gray-200 p-3 text-left font-semibold">Status</th>
                    <th className="border border-gray-200 p-3 text-left font-semibold">Used in Products</th>
                  </tr>
                </thead>
                <tbody>
                  {finalBreakdown.map((material) => (
                    <tr key={material.material_id} className={`hover:bg-gray-50 ${
                      material.is_available ? 'bg-green-50' : 'bg-red-50'
                    }`}>
                      <td className="border border-gray-200 p-3 font-medium">{material.material_name}</td>
                      <td className="border border-gray-200 p-3 text-gray-600 font-mono text-xs">{material.material_id}</td>
                      <td className="border border-gray-200 p-3">
                        <Badge variant="outline" className="text-xs">
                          Raw Material Recipe
                        </Badge>
                      </td>
                      <td className="border border-gray-200 p-3 font-medium">{material.total_quantity.toLocaleString()}</td>
                      <td className="border border-gray-200 p-3">{material.unit}</td>
                      <td className="border border-gray-200 p-3">{material.available_stock.toLocaleString()}</td>
                      <td className="border border-gray-200 p-3">
                        <span className={`font-medium ${material.shortage > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {material.shortage.toLocaleString()}
                        </span>
                      </td>
                      <td className="border border-gray-200 p-3">
                        {material.is_available ? (
                          <Badge variant="default" className="bg-green-100 text-green-800">Available</Badge>
                        ) : (
                          <Badge variant="destructive">Shortage</Badge>
                        )}
                      </td>
                      <td className="border border-gray-200 p-3">
                        <div className="space-y-1">
                          {material.sources.map((source, idx) => (
                            <div key={idx} className="text-xs">
                              <Badge variant="secondary" className="text-xs">
                                {source.product_name}: {source.contribution} {material.unit}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Available Stock Analysis */}
      {productionSteps.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              Production Feasibility Based on Available Stock
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Analysis of what can be produced with current stock and what materials are needed for remaining quantity
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {calculationItems.map((item, idx) => {
                const product = products.find(p => p.id === item.productId);
                // For products with individual stock tracking, use current_stock or individual_products_count
                // For bulk products, use base_quantity
                const availableStock = product?.individual_stock_tracking 
                  ? (product?.current_stock || product?.individual_products_count || 0)
                  : (product?.base_quantity || product?.current_stock || 0);
                const requestedQty = item.quantity;
                const canProduceFromStock = Math.min(availableStock, requestedQty);
                const needToProduce = Math.max(0, requestedQty - availableStock);
                
                return (
                  <div key={idx} className="border border-gray-200 rounded-lg p-4 bg-gradient-to-r from-blue-50 to-purple-50">
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold text-gray-800 mb-2">{item.productName}</h3>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-white p-3 rounded-lg border border-gray-200">
                          <div className="text-sm text-gray-600">Requested</div>
                          <div className="text-xl font-bold text-blue-600">{requestedQty} {item.unit}</div>
                        </div>
                        <div className="bg-white p-3 rounded-lg border border-gray-200">
                          <div className="text-sm text-gray-600">Available in Stock</div>
                          <div className="text-xl font-bold text-green-600">{availableStock} {item.unit}</div>
                        </div>
                        <div className="bg-white p-3 rounded-lg border border-gray-200">
                          <div className="text-sm text-gray-600">Can Use from Stock</div>
                          <div className="text-xl font-bold text-purple-600">{canProduceFromStock} {item.unit}</div>
                        </div>
                        <div className="bg-white p-3 rounded-lg border border-gray-200">
                          <div className="text-sm text-gray-600">Need to Produce</div>
                          <div className="text-xl font-bold text-orange-600">{needToProduce} {item.unit}</div>
                        </div>
                      </div>
                    </div>

                    {needToProduce > 0 && (
                      <div className="mt-4">
                        <h4 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
                          <Package className="w-4 h-4 text-orange-600" />
                          Raw Materials Needed for Remaining {needToProduce} {item.unit}
                        </h4>
                        <div className="overflow-x-auto">
                          <table className="w-full border-collapse border border-gray-200 text-sm bg-white">
                            <thead>
                              <tr className="bg-orange-50">
                                <th className="border border-gray-200 p-2 text-left font-semibold">Material Name</th>
                                <th className="border border-gray-200 p-2 text-left font-semibold">Required Qty</th>
                                <th className="border border-gray-200 p-2 text-left font-semibold">Unit</th>
                                <th className="border border-gray-200 p-2 text-left font-semibold">Available</th>
                                <th className="border border-gray-200 p-2 text-left font-semibold">Shortage</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(() => {
                                // Calculate materials needed for the remaining quantity
                                const step = productionSteps.find(s => s.product_name === item.productName);
                                if (!step) return null;
                                
                                const materialsForRemaining: any[] = [];
                                
                                // Calculate raw materials needed
                                step.materials_needed.forEach(material => {
                                  const materialPerUnit = material.quantity / item.quantity;
                                  const neededForRemaining = materialPerUnit * needToProduce;
                                  const rawMat = rawMaterials.find(rm => rm.name === material.material_name);
                                  const available = rawMat?.current_stock || 0;
                                  const shortage = Math.max(0, neededForRemaining - available);
                                  
                                  materialsForRemaining.push({
                                    name: material.material_name,
                                    required: neededForRemaining,
                                    unit: material.unit,
                                    available: available,
                                    shortage: shortage
                                  });
                                });
                                
                                return materialsForRemaining.map((mat, matIdx) => (
                                  <tr key={matIdx} className={mat.shortage > 0 ? 'bg-red-50' : 'bg-green-50'}>
                                    <td className="border border-gray-200 p-2 font-medium">{mat.name}</td>
                                    <td className="border border-gray-200 p-2">{mat.required.toFixed(2)}</td>
                                    <td className="border border-gray-200 p-2">{mat.unit}</td>
                                    <td className="border border-gray-200 p-2">{mat.available.toFixed(2)}</td>
                                    <td className="border border-gray-200 p-2">
                                      <span className={`font-medium ${mat.shortage > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                        {mat.shortage.toFixed(2)}
                                      </span>
                                    </td>
                                  </tr>
                                ));
                              })()}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {canProduceFromStock > 0 && (
                      <div className="mt-4 p-3 bg-green-100 border border-green-300 rounded-lg">
                        <div className="flex items-center gap-2 text-green-800">
                          <CheckCircle className="w-5 h-5" />
                          <span className="font-medium">
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
      )}
        </TabsContent>

        <TabsContent value="recipes" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Product Recipes
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                View and edit product recipes. All recipes are based on 1 square meter (sqm) and automatically calculate materials based on product dimensions.
              </p>
            </CardHeader>
            <CardContent>
              {recipes.length === 0 ? (
                <div className="text-center py-8">
                  <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No recipes found</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Recipes are created when you add products. All recipes use 1 sqm as base unit and work for all products.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {recipes.map((recipe) => (
                    <Card key={recipe.id} className="border-l-4 border-l-primary">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-lg">{recipe.product_name}</CardTitle>
                            <p className="text-sm text-muted-foreground">
                              Recipe ID: {recipe.id} | Base: 1 sqm (1 square meter)
                            </p>
                            <div className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded mt-1 inline-block">
                              💡 This recipe works for all products - system calculates total materials based on product dimensions
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAddMaterial(recipe)}
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Add Material
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {recipe.materials && recipe.materials.length > 0 ? (
                          <div className="overflow-x-auto">
                            <table className="w-full">
                              <thead>
                                <tr className="border-b">
                                  <th className="text-left p-3 font-medium text-muted-foreground">Material Type</th>
                                  <th className="text-left p-3 font-medium text-muted-foreground">Material Name</th>
                                  <th className="text-left p-3 font-medium text-muted-foreground">Material ID</th>
                                  <th className="text-left p-3 font-medium text-muted-foreground">Quantity (for 1 sqm)</th>
                                  <th className="text-left p-3 font-medium text-muted-foreground">Unit</th>
                                  <th className="text-left p-3 font-medium text-muted-foreground">Actions</th>
                                </tr>
                              </thead>
                              <tbody>
                                {recipe.materials.map((material: any) => (
                                  <tr key={material.id} className="border-b hover:bg-muted/50">
                                    <td className="p-3">
                                      <Badge variant={material.material_type === 'product' ? 'default' : 'secondary'}>
                                        {material.material_type === 'product' ? 'Product' : 'Raw Material'}
                                      </Badge>
                                    </td>
                                    <td className="p-3 font-medium">{material.material_name}</td>
                                    <td className="p-3 text-sm text-muted-foreground font-mono">{material.material_id}</td>
                                    <td className="p-3">{material.quantity_per_sqm}</td>
                                    <td className="p-3">{material.unit}</td>
                                    <td className="p-3">
                                      <div className="flex items-center gap-2">
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => handleEditMaterial(material)}
                                        >
                                          <Edit className="w-4 h-4" />
                                        </Button>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => handleRemoveMaterial(recipe.id, material.id)}
                                          disabled={recipe.materials.length <= 1}
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </Button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <div className="text-center py-8 text-muted-foreground">
                            <Package className="w-8 h-8 mx-auto mb-2" />
                            <p>No materials in this recipe</p>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleAddMaterial(recipe)}
                              className="mt-2"
                            >
                              <Plus className="w-4 h-4 mr-2" />
                              Add First Material
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Material Dialog */}
      <Dialog open={isMaterialDialogOpen} onOpenChange={setIsMaterialDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingMaterial?.id ? 'Edit Material (for 1 sqm)' : 'Add Material (for 1 sqm)'}
            </DialogTitle>
          </DialogHeader>
          {editingMaterial && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="material-type">Material Type</Label>
                <Select
                  value={editingMaterial.material_type}
                  onValueChange={(value) => setEditingMaterial({...editingMaterial, material_type: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="raw_material">Raw Material</SelectItem>
                    <SelectItem value="product">Product</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="material-select">Material</Label>
                <Select
                  value={editingMaterial.material_id}
                  onValueChange={(value) => {
                    const selected = editingMaterial.material_type === 'raw_material' 
                      ? rawMaterials.find(m => m.id === value)
                      : products.find(p => p.id === value);
                    if (selected) {
                      setEditingMaterial({
                        ...editingMaterial,
                        material_id: value,
                        material_name: selected.name,
                        unit: selected.unit || 'kg'
                      });
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select material" />
                  </SelectTrigger>
                  <SelectContent>
                    {editingMaterial.material_type === 'raw_material' 
                      ? rawMaterials.map((material) => (
                          <SelectItem key={material.id} value={material.id}>
                            {material.name} ({material.unit})
                          </SelectItem>
                        ))
                      : products.map((product) => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.name} ({product.unit})
                          </SelectItem>
                        ))
                    }
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="quantity">Quantity (for 1 sqm)</Label>
                <Input
                  id="quantity"
                  type="number"
                  value={editingMaterial.quantity_per_sqm || editingMaterial.quantity || 0}
                  onChange={(e) => setEditingMaterial({...editingMaterial, quantity_per_sqm: parseFloat(e.target.value) || 0})}
                  min="0"
                  step="0.1"
                  placeholder="e.g., 2.5"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Amount needed for 1 square meter (sqm) - this recipe works for all products
                </p>
              </div>


              <div>
                <Label htmlFor="unit">Unit</Label>
                <Input
                  id="unit"
                  value={editingMaterial.unit}
                  onChange={(e) => setEditingMaterial({...editingMaterial, unit: e.target.value})}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsMaterialDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveMaterial}>
                  <Save className="w-4 h-4 mr-2" />
                  Save
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
