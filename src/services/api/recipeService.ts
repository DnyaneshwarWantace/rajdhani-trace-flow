import AuthService from './authService';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://rajdhani.wantace.com/api';

// Helper function to get headers with auth token
const getHeaders = () => {
  const token = AuthService.getToken();
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  };
};

export interface CreateRecipeData {
  product_id: string;
  materials: {
    material_id: string;
    material_name: string;
    material_type: 'raw_material' | 'product';
    quantity_per_sqm: number;
    unit: string;
  }[];
  description?: string;
  version?: string;
  created_by?: string;
}

export interface RecipeMaterial {
  id: string;
  recipe_id: string;
  material_id: string;
  material_name: string;
  material_type: 'raw_material' | 'product';
  quantity_per_sqm: number;
  unit: string;
  specifications?: string;
  quality_requirements?: string;
  is_optional: boolean;
  waste_factor: number;
  created_at: string;
}

export interface ProductRecipe {
  id: string;
  product_id: string;
  product_name: string;
  base_unit: string;
  created_by: string;
  description?: string;
  version: string;
  is_active: boolean;
  materials_count: number;
  created_at: string;
  updated_at: string;
}

export interface RecipeWithMaterials extends ProductRecipe {
  materials: RecipeMaterial[];
}

export class MongoDBRecipeService {
  // Create a new product recipe
  static async createRecipe(recipeData: CreateRecipeData): Promise<{ data: RecipeWithMaterials | null; error: string | null }> {
    try {
      const response = await fetch(`${API_BASE_URL}/recipes`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(recipeData),
      });

      const result = await response.json();

      if (!response.ok) {
        return { data: null, error: result.error || 'Failed to create recipe' };
      }

      return { data: result.data, error: null };
    } catch (error) {
      console.error('Error creating recipe:', error);
      return { data: null, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Get recipe by product ID
  static async getRecipeByProductId(productId: string): Promise<{ data: RecipeWithMaterials | null; error: string | null }> {
    try {
      // Suppress 404 errors in console by using a custom fetch that doesn't log 404s
      const response = await fetch(`${API_BASE_URL}/recipes/product/${productId}`, {
        headers: getHeaders()
      });

      // 404 is expected for products without recipes - return silently without logging
      if (response.status === 404) {
        // Don't call response.json() for 404s to avoid parsing errors
        return { data: null, error: null }; // No recipe found, not an error
      }

      const result = await response.json();

      if (!response.ok) {
        return { data: null, error: result.error || 'Failed to get recipe' };
      }

      // The API returns { success: true, data: { ...recipe, materials: [...] } }
      // The recipe object already includes all fields including id
      const recipeData = result.data;
      
      // Ensure the recipe has proper structure
      const recipeWithMaterials = {
        ...recipeData,
        materials: recipeData.materials || []
      };
      
      return { data: recipeWithMaterials, error: null };
    } catch (error) {
      // Silently handle all errors - 404s are expected for products without recipes
      // Don't log anything to console
      return { data: null, error: null };
    }
  }

  // Update an existing recipe
  static async updateRecipe(recipeId: string, recipeData: Partial<CreateRecipeData>): Promise<{ data: RecipeWithMaterials | null; error: string | null }> {
    try {
      const response = await fetch(`${API_BASE_URL}/recipes/${recipeId}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(recipeData),
      });

      const result = await response.json();

      if (!response.ok) {
        return { data: null, error: result.error || 'Failed to update recipe' };
      }

      return { data: result.data, error: null };
    } catch (error) {
      console.error('Error updating recipe:', error);
      return { data: null, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Delete a recipe
  static async deleteRecipe(recipeId: string): Promise<{ error: string | null }> {
    try {
      const response = await fetch(`${API_BASE_URL}/recipes/${recipeId}`, {
        method: 'DELETE',
        headers: getHeaders()
      });

      if (!response.ok) {
        const result = await response.json();
        return { error: result.error || 'Failed to delete recipe' };
      }

      return { error: null };
    } catch (error) {
      console.error('Error deleting recipe:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Get all recipes
  static async getAllRecipes(): Promise<{ data: RecipeWithMaterials[]; error: string | null }> {
    try {
      const response = await fetch(`${API_BASE_URL}/recipes`, {
        headers: getHeaders()
      });

      const result = await response.json();

      if (!response.ok) {
        return { data: [], error: result.error || 'Failed to get recipes' };
      }

      return { data: result.data || [], error: null };
    } catch (error) {
      console.error('Error getting recipes:', error);
      return { data: [], error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Calculate production materials for a given SQM
  static async calculateProductionMaterials(productId: string, sqm: number): Promise<{ data: any; error: string | null }> {
    try {
      const response = await fetch(`${API_BASE_URL}/recipes/calculate`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ product_id: productId, sqm }),
      });

      const result = await response.json();

      if (!response.ok) {
        return { data: null, error: result.error || 'Failed to calculate materials' };
      }

      return { data: result.data, error: null };
    } catch (error) {
      console.error('Error calculating production materials:', error);
      return { data: null, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
}

export default MongoDBRecipeService;
