// Recipe calculation utilities for base unit scaling

export interface RecipeMaterial {
  material_id: string;
  material_name: string;
  quantity: number; // Quantity for base unit (1 unit of product)
  unit: string;
  cost_per_unit: number;
  total_cost: number;
}

export interface ProductRecipe {
  id: string;
  product_id: string;
  product_name: string;
  base_unit: string; // e.g., "roll", "piece", "kg"
  materials: RecipeMaterial[];
  total_cost: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

/**
 * Calculate required materials for a given production quantity
 * @param recipe - The product recipe (defined for base unit)
 * @param productionQuantity - How many units to produce
 * @returns Calculated materials with scaled quantities
 */
export function calculateMaterialsForProduction(
  recipe: ProductRecipe,
  productionQuantity: number
): RecipeMaterial[] {
  if (!recipe || !recipe.materials || recipe.materials.length === 0) {
    return [];
  }

  return recipe.materials.map(material => ({
    ...material,
    quantity: material.quantity * productionQuantity,
    total_cost: material.quantity * productionQuantity * material.cost_per_unit
  }));
}

/**
 * Calculate total cost for production quantity
 * @param recipe - The product recipe
 * @param productionQuantity - How many units to produce
 * @returns Total cost for the production quantity
 */
export function calculateTotalProductionCost(
  recipe: ProductRecipe,
  productionQuantity: number
): number {
  const scaledMaterials = calculateMaterialsForProduction(recipe, productionQuantity);
  return scaledMaterials.reduce((total, material) => total + material.total_cost, 0);
}

/**
 * Check if materials are available for production
 * @param recipe - The product recipe
 * @param productionQuantity - How many units to produce
 * @param availableMaterials - Current stock of materials
 * @returns Object with availability status and shortages
 */
export function checkMaterialAvailability(
  recipe: ProductRecipe,
  productionQuantity: number,
  availableMaterials: Array<{ id: string; current_stock: number; unit: string }>
): {
  isAvailable: boolean;
  shortages: Array<{
    material_id: string;
    material_name: string;
    required: number;
    available: number;
    shortage: number;
    unit: string;
  }>;
} {
  const scaledMaterials = calculateMaterialsForProduction(recipe, productionQuantity);
  const shortages: Array<{
    material_id: string;
    material_name: string;
    required: number;
    available: number;
    shortage: number;
    unit: string;
  }> = [];

  for (const material of scaledMaterials) {
    const available = availableMaterials.find(am => am.id === material.material_id);
    const availableQuantity = available ? available.current_stock : 0;
    
    if (availableQuantity < material.quantity) {
      shortages.push({
        material_id: material.material_id,
        material_name: material.material_name,
        required: material.quantity,
        available: availableQuantity,
        shortage: material.quantity - availableQuantity,
        unit: material.unit
      });
    }
  }

  return {
    isAvailable: shortages.length === 0,
    shortages
  };
}

/**
 * Generate production material requirements summary
 * @param recipe - The product recipe
 * @param productionQuantity - How many units to produce
 * @param availableMaterials - Current stock of materials
 * @returns Formatted summary for display
 */
export function generateProductionSummary(
  recipe: ProductRecipe,
  productionQuantity: number,
  availableMaterials: Array<{ id: string; current_stock: number; unit: string }>
): {
  productName: string;
  baseUnit: string;
  productionQuantity: number;
  materials: Array<{
    name: string;
    required: number;
    available: number;
    unit: string;
    status: 'sufficient' | 'insufficient';
  }>;
  totalCost: number;
  isReady: boolean;
} {
  const scaledMaterials = calculateMaterialsForProduction(recipe, productionQuantity);
  const availability = checkMaterialAvailability(recipe, productionQuantity, availableMaterials);
  const totalCost = calculateTotalProductionCost(recipe, productionQuantity);

  const materials = scaledMaterials.map(material => {
    const available = availableMaterials.find(am => am.id === material.material_id);
    const availableQuantity = available ? available.current_stock : 0;
    
    return {
      name: material.material_name,
      required: material.quantity,
      available: availableQuantity,
      unit: material.unit,
      status: availableQuantity >= material.quantity ? 'sufficient' : 'insufficient' as 'sufficient' | 'insufficient'
    };
  });

  return {
    productName: recipe.product_name,
    baseUnit: recipe.base_unit,
    productionQuantity,
    materials,
    totalCost,
    isReady: availability.isAvailable
  };
}
