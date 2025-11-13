import { MongoDBRecipeService, RecipeWithMaterials } from './api/recipeService';
import RawMaterialService from './api/rawMaterialService';
import ProductService from './api/productService';
import { NotificationService } from './notificationService';

export interface RecipeCalculationResult {
  productId: string;
  productName: string;
  orderQuantity: number;
  baseUnit: string;
  recipe: RecipeWithMaterials | null;
  calculatedMaterials: {
    material_id: string;
    material_name: string;
    required_quantity: number;
    unit: string;
    cost_per_unit: number;
    total_cost: number;
    available_stock: number;
    shortage: number;
    is_available: boolean;
    material_type: 'raw_material' | 'product';
    has_nested_recipe?: boolean;
    nested_recipe_materials?: any[];
    needs_production?: boolean; // If this product needs to be produced first
    production_priority?: number; // Order in which products should be produced
  }[];
  totalRecipeCost: number;
  hasShortages: boolean;
  canProduce: boolean;
  productionChain?: {
    products_to_produce: string[];
    production_order: string[];
    total_production_time: number;
  };
}

export interface MaterialShortage {
  material_id: string;
  material_name: string;
  required_quantity: number;
  available_stock: number;
  shortage: number;
  unit: string;
  material_type: 'raw_material' | 'product';
  cost_per_unit: number;
  estimated_cost: number;
}

export class RecipeCalculationService {
  /**
   * Calculate recipe requirements for a product order
   */
  static async calculateRecipeForOrder(
    productId: string,
    orderQuantity: number
  ): Promise<RecipeCalculationResult> {
    try {
      console.log(`🧮 Calculating recipe for product ${productId}, quantity: ${orderQuantity}`);

      // Get product details
      const { data: product, error: productError } = await ProductService.getProductById(productId);
      if (productError || !product) {
        throw new Error(`Product not found: ${productError || 'Unknown error'}`);
      }

      // Get recipe for this product
      const { data: recipe, error: recipeError } = await MongoDBRecipeService.getRecipeByProductId(productId);
      if (recipeError || !recipe) {
        console.log(`⚠️ No recipe found for product ${product.name}`);
        return {
          productId,
          productName: product.name,
          orderQuantity,
          baseUnit: 'unit',
          recipe: null,
          calculatedMaterials: [],
          totalRecipeCost: 0,
          hasShortages: false,
          canProduce: false
        };
      }

      console.log(`📋 Found recipe for ${product.name}:`, recipe);

      // Calculate required materials based on order quantity
      const calculatedMaterials = await this.calculateRequiredMaterials(recipe.materials, orderQuantity);

      // Calculate totals
      const totalRecipeCost = calculatedMaterials.reduce((sum, material) => sum + material.total_cost, 0);
      const hasShortages = calculatedMaterials.some(material => material.shortage > 0);
      const canProduce = calculatedMaterials.every(material => material.is_available);
      
      // Create production chain for products that need to be produced first
      const productionChain = this.createProductionChain(calculatedMaterials);

      const result: RecipeCalculationResult = {
        productId,
        productName: product.name,
        orderQuantity,
        baseUnit: (recipe as any).base_unit || 'unit',
        recipe,
        calculatedMaterials,
        totalRecipeCost,
        hasShortages,
        canProduce,
        productionChain
      };

      console.log(`✅ Recipe calculation complete:`, result);
      return result;

    } catch (error) {
      console.error('Error calculating recipe for order:', error);
      throw error;
    }
  }

  /**
   * Calculate required materials for a given recipe and quantity
   * This handles both raw materials and products (including products with their own recipes)
   */
  private static async calculateRequiredMaterials(
    recipeMaterials: any[],
    orderQuantity: number
  ) {
    const calculatedMaterials = [];

    for (const recipeMaterial of recipeMaterials) {
      // Calculate required quantity (recipe is for 1 base unit, so multiply by order quantity)
      const requiredQuantity = recipeMaterial.quantity * orderQuantity;
      const totalCost = requiredQuantity * (recipeMaterial.cost_per_unit || 0);

      // Check availability - determine if it's a raw material or product
      let availableStock = 0;
      let materialType: 'raw_material' | 'product' = 'raw_material';
      let hasNestedRecipe = false;
      let nestedRecipeMaterials: any[] = [];

      try {
        // First try as raw material
        const { data: rawMaterial } = await RawMaterialService.getRawMaterialById(recipeMaterial.material_id);
        if (rawMaterial) {
          availableStock = rawMaterial.current_stock || 0;
          materialType = 'raw_material';
        } else {
          // Try as product
          const { data: product } = await ProductService.getProductById(recipeMaterial.material_id);
          if (product) {
            availableStock = product.base_quantity || 0;
            materialType = 'product';
            
            // Check if this product has its own recipe (nested recipe)
            const { data: nestedRecipe } = await MongoDBRecipeService.getRecipeByProductId(recipeMaterial.material_id);
            if (nestedRecipe) {
              hasNestedRecipe = true;
              console.log(`🔍 Found nested recipe for product ${recipeMaterial.material_name}`);
              
              // Calculate nested recipe materials
              const nestedMaterials = await this.calculateRequiredMaterials(nestedRecipe.materials, requiredQuantity);
              nestedRecipeMaterials = nestedMaterials;
            }
          }
        }
      } catch (error) {
        console.warn(`Could not find material ${recipeMaterial.material_id}:`, error);
      }

      const shortage = Math.max(0, requiredQuantity - availableStock);
      const isAvailable = shortage === 0;
      const needsProduction = materialType === 'product' && shortage > 0;

      calculatedMaterials.push({
        material_id: recipeMaterial.material_id,
        material_name: recipeMaterial.material_name,
        required_quantity: requiredQuantity,
        unit: recipeMaterial.unit,
        cost_per_unit: recipeMaterial.cost_per_unit || 0,
        total_cost: totalCost,
        available_stock: availableStock,
        shortage,
        is_available: isAvailable,
        material_type: materialType,
        has_nested_recipe: hasNestedRecipe,
        nested_recipe_materials: nestedRecipeMaterials,
        needs_production: needsProduction,
        production_priority: needsProduction ? 1 : 0 // Products needing production get priority 1
      });
    }

    return calculatedMaterials;
  }

  /**
   * Create production chain for products that need to be produced first
   */
  private static createProductionChain(calculatedMaterials: any[]): {
    products_to_produce: string[];
    production_order: string[];
    total_production_time: number;
  } {
    const productsToProduce = calculatedMaterials
      .filter(material => material.needs_production)
      .map(material => material.material_name);

    // Simple production order (can be enhanced with dependency analysis)
    const productionOrder = [...new Set(productsToProduce)];
    
    // Estimate production time (1 day per product - can be enhanced)
    const totalProductionTime = productionOrder.length;

    return {
      products_to_produce: productsToProduce,
      production_order: productionOrder,
      total_production_time: totalProductionTime
    };
  }

  /**
   * Get material shortages for production (including nested recipe materials)
   */
  static async getMaterialShortages(calculatedMaterials: RecipeCalculationResult['calculatedMaterials']): Promise<MaterialShortage[]> {
    const shortages: MaterialShortage[] = [];

    for (const material of calculatedMaterials) {
      // Add shortage for the main material
      if (material.shortage > 0) {
        shortages.push({
          material_id: material.material_id,
          material_name: material.material_name,
          required_quantity: material.required_quantity,
          available_stock: material.available_stock,
          shortage: material.shortage,
          unit: material.unit,
          material_type: material.material_type,
          cost_per_unit: material.cost_per_unit,
          estimated_cost: material.shortage * material.cost_per_unit
        });
      }

      // Add shortages for nested recipe materials (if this product has a recipe)
      if (material.has_nested_recipe && material.nested_recipe_materials) {
        for (const nestedMaterial of material.nested_recipe_materials) {
          if (nestedMaterial.shortage > 0) {
            shortages.push({
              material_id: nestedMaterial.material_id,
              material_name: `${nestedMaterial.material_name} (for ${material.material_name})`,
              required_quantity: nestedMaterial.required_quantity,
              available_stock: nestedMaterial.available_stock,
              shortage: nestedMaterial.shortage,
              unit: nestedMaterial.unit,
              material_type: nestedMaterial.material_type,
              cost_per_unit: nestedMaterial.cost_per_unit,
              estimated_cost: nestedMaterial.shortage * nestedMaterial.cost_per_unit
            });
          }
        }
      }
    }

    return shortages;
  }

  /**
   * Send material shortage notifications
   */
  static async sendMaterialShortageNotifications(
    orderId: string,
    orderNumber: string,
    productName: string,
    shortages: MaterialShortage[]
  ): Promise<void> {
    try {
      console.log(`📢 Sending material shortage notifications for order ${orderNumber}`);

      for (const shortage of shortages) {
        // Check if notification already exists to prevent duplicates
        const { exists: hasExistingNotification } = await NotificationService.notificationExists(
          'material_shortage',
          shortage.material_id,
          'unread'
        );

        if (!hasExistingNotification) {
          await NotificationService.createNotification({
            type: 'warning',
            title: `Material Shortage Alert - ${shortage.material_name}`,
            message: `Order ${orderNumber} for ${productName} requires ${shortage.required_quantity} ${shortage.unit} of ${shortage.material_name}. Available: ${shortage.available_stock} ${shortage.unit}. Shortage: ${shortage.shortage} ${shortage.unit}.`,
            priority: 'high',
            status: 'unread',
            module: 'materials',
            related_id: shortage.material_id,
            related_data: {
              orderId,
              orderNumber,
              productName,
              materialId: shortage.material_id,
              materialName: shortage.material_name,
              requiredQuantity: shortage.required_quantity,
              availableStock: shortage.available_stock,
              shortage: shortage.shortage,
              unit: shortage.unit,
              materialType: shortage.material_type,
              estimatedCost: shortage.estimated_cost
            },
            created_by: 'system'
          });

          console.log(`📢 Material shortage notification sent for ${shortage.material_name}`);
        }
      }
    } catch (error) {
      console.error('Error sending material shortage notifications:', error);
    }
  }

  /**
   * Calculate recipe for multiple products in an order
   */
  static async calculateRecipesForOrderItems(orderItems: Array<{
    productId: string;
    productName: string;
    quantity: number;
    productType: string;
  }>): Promise<{
    productRecipes: RecipeCalculationResult[];
    totalShortages: MaterialShortage[];
    canProduceAll: boolean;
  }> {
    const productRecipes: RecipeCalculationResult[] = [];
    const allShortages: MaterialShortage[] = [];

    // Calculate recipes for each product
    for (const item of orderItems) {
      if (item.productType === 'product') {
        try {
          const recipeResult = await this.calculateRecipeForOrder(item.productId, item.quantity);
          productRecipes.push(recipeResult);

          // Collect shortages
          const shortages = await this.getMaterialShortages(recipeResult.calculatedMaterials);
          allShortages.push(...shortages);
        } catch (error) {
          console.error(`Error calculating recipe for ${item.productName}:`, error);
        }
      }
    }

    // Aggregate shortages by material
    const shortageMap = new Map<string, MaterialShortage>();
    for (const shortage of allShortages) {
      const existing = shortageMap.get(shortage.material_id);
      if (existing) {
        existing.shortage += shortage.shortage;
        existing.required_quantity += shortage.required_quantity;
        existing.estimated_cost += shortage.estimated_cost;
      } else {
        shortageMap.set(shortage.material_id, { ...shortage });
      }
    }

    const totalShortages = Array.from(shortageMap.values());
    const canProduceAll = productRecipes.every(recipe => recipe.canProduce);

    return {
      productRecipes,
      totalShortages,
      canProduceAll
    };
  }
}
