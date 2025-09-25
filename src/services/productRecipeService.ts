import { supabase, supabaseAdmin, ProductRecipe, RecipeMaterial } from '@/lib/supabase';
import { generateUniqueId } from '@/lib/idGenerator';

export interface CreateRecipeData {
  product_id: string;
  product_name: string;
  materials: {
    material_id: string;
    material_name: string;
    quantity: number;
    unit: string;
    cost_per_unit: number;
  }[];
  created_by?: string;
}

export interface RecipeWithMaterials extends ProductRecipe {
  recipe_materials: RecipeMaterial[];
}

export class ProductRecipeService {
  // Cache to remember if product_recipes table is accessible
  private static tableAccessible: boolean | null = null;
  // Create a new product recipe with materials
  static async createRecipe(recipeData: CreateRecipeData): Promise<{ data: RecipeWithMaterials | null; error: string | null }> {
    try {
      const recipeId = generateUniqueId('RECIPE');
      const totalCost = recipeData.materials.reduce((sum, material) => 
        sum + (material.cost_per_unit * material.quantity), 0
      );

      // Create the recipe
      const client = supabaseAdmin || supabase;
      const { data: recipe, error: recipeError } = await client
        .from('product_recipes')
        .insert({
          id: recipeId,
          product_id: recipeData.product_id,
          product_name: recipeData.product_name, // Use product_name to match database schema
          total_cost: 0, // No total cost since quantities are dynamic
          created_by: recipeData.created_by || 'admin'
        })
        .select()
        .single();

      if (recipeError) {
        console.error('Error creating recipe:', recipeError);
        return { data: null, error: recipeError.message };
      }

      // Create recipe materials with required fields
      console.log('🔍 Creating recipe materials for recipe_id:', recipeId);
      console.log('🔍 Recipe materials data:', recipeData.materials);
      
      const recipeMaterials = recipeData.materials.map((material, index) => {
        console.log(`🔍 Processing material ${index}:`, material);
        
        // Validate required fields
        if (!material.material_id) {
          console.error(`❌ Material ${index} missing material_id:`, material);
          throw new Error(`Material ${index} is missing required material_id field`);
        }
        if (!material.material_name) {
          console.error(`❌ Material ${index} missing material_name:`, material);
          throw new Error(`Material ${index} is missing required material_name field`);
        }
        
        const recipeMaterial = {
          id: generateUniqueId('RECMAT'),
          recipe_id: recipeId,
          material_id: material.material_id,
          material_name: material.material_name,
          quantity: 1, // Default quantity for recipe reference
          unit: material.unit,
          cost_per_unit: material.cost_per_unit,
          total_cost: material.cost_per_unit * 1 // Default total cost
        };
        
        console.log(`🔍 Created recipe material ${index}:`, recipeMaterial);
        return recipeMaterial;
      });
      
      console.log('🔍 All recipe materials to insert:', recipeMaterials);

      console.log('🔍 Inserting recipe materials into database...');
      const { data: insertedMaterials, error: materialsError } = await client
        .from('recipe_materials')
        .insert(recipeMaterials)
        .select();

      if (materialsError) {
        console.error('❌ Error creating recipe materials:', materialsError);
        console.error('❌ Failed recipe materials data:', recipeMaterials);
        // Clean up the recipe if materials failed
        await client.from('product_recipes').delete().eq('id', recipeId);
        return { data: null, error: materialsError.message };
      }

      console.log('✅ Recipe materials inserted successfully:', insertedMaterials);

      // Fetch the complete recipe with materials
      const { data: completeRecipe, error: fetchError } = await client
        .from('product_recipes')
        .select('*')
        .eq('id', recipeId)
        .single();

      if (fetchError) {
        console.error('Error fetching complete recipe:', fetchError);
        return { data: null, error: fetchError.message };
      }

      // Get recipe materials separately
      const { data: materials, error: fetchMaterialsError } = await client
        .from('recipe_materials')
        .select('*')
        .eq('recipe_id', recipeId);

      if (fetchMaterialsError) {
        console.error('Error fetching recipe materials:', fetchMaterialsError);
        return { data: { ...completeRecipe, recipe_materials: [] }, error: null };
      }

      return { data: { ...completeRecipe, recipe_materials: materials || [] }, error: null };
    } catch (error) {
      console.error('Error in createRecipe:', error);
      return { data: null, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Update an existing recipe
  static async updateRecipe(recipeId: string, recipeData: Partial<CreateRecipeData>): Promise<{ data: RecipeWithMaterials | null; error: string | null }> {
    try {
      // If materials are being updated, recalculate total cost
      let totalCost = 0;
      if (recipeData.materials) {
        totalCost = recipeData.materials.reduce((sum, material) => 
          sum + (material.cost_per_unit * material.quantity), 0
        );
      }

      // Update the recipe
      const client = supabaseAdmin || supabase;
      const updateData: any = {};
      if (recipeData.product_name) updateData.product_name = recipeData.product_name;
      // No total cost since quantities are dynamic

      if (Object.keys(updateData).length > 0) {
        const { error: recipeError } = await client
          .from('product_recipes')
          .update(updateData)
          .eq('id', recipeId);

        if (recipeError) {
          console.error('Error updating recipe:', recipeError);
          return { data: null, error: recipeError.message };
        }
      }

      // Update recipe materials if provided
      if (recipeData.materials) {
        // Delete existing materials
        const { error: deleteError } = await client
          .from('recipe_materials')
          .delete()
          .eq('recipe_id', recipeId);

        if (deleteError) {
          console.error('Error deleting old recipe materials:', deleteError);
          return { data: null, error: deleteError.message };
        }

        // Insert new materials
        const recipeMaterials = recipeData.materials.map(material => ({
          id: generateUniqueId('RECMAT'),
          recipe_id: recipeId,
          material_id: material.material_id,
          material_name: material.material_name,
          // No quantity field since quantities are dynamic
          unit: material.unit,
          cost_per_unit: material.cost_per_unit,
          // No total_cost since quantities are dynamic
        }));

        const { error: materialsError } = await client
          .from('recipe_materials')
          .insert(recipeMaterials);

        if (materialsError) {
          console.error('Error creating new recipe materials:', materialsError);
          return { data: null, error: materialsError.message };
        }
      }

      // Fetch the updated recipe with materials
      const { data: recipe, error: recipeError } = await client
        .from('product_recipes')
        .select('*')
        .eq('id', recipeId)
        .single();

      if (recipeError) {
        console.error('Error fetching updated recipe:', recipeError);
        return { data: null, error: recipeError.message };
      }

      // Get recipe materials separately
      const { data: materials, error: materialsError } = await client
        .from('recipe_materials')
        .select('*')
        .eq('recipe_id', recipeId);

      if (materialsError) {
        console.error('Error fetching recipe materials:', materialsError);
        return { data: { ...recipe, recipe_materials: [] }, error: null };
      }

      return { data: { ...recipe, recipe_materials: materials || [] }, error: null };
    } catch (error) {
      console.error('Error in updateRecipe:', error);
      return { data: null, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Get recipe by product ID
  static async getRecipeByProductId(productId: string): Promise<{ data: RecipeWithMaterials | null; error: string | null }> {
    try {
      console.log('🔍 Looking for recipe with productId:', productId);
      
      // Check if we know the table is not accessible
      if (this.tableAccessible === false) {
        console.log('🔍 product_recipes table known to be inaccessible, skipping recipe lookup for:', productId);
        return { data: null, error: null };
      }
      
      // If we haven't tested yet, test if product_recipes table is accessible
      if (this.tableAccessible === null) {
        const client = supabaseAdmin || supabase;
        if (!client) {
          console.log('🔍 No Supabase client available, skipping recipe lookup');
          this.tableAccessible = false;
          return { data: null, error: null };
        }
        
        const { error: testError } = await client
          .from('product_recipes')
          .select('id')
          .limit(1);
        
        if (testError && (testError.message?.includes('406') || testError.message?.includes('Not Acceptable') || testError.code === 'PGRST116')) {
          console.log('🔍 product_recipes table not accessible (406/PGRST116 error), caching result');
          this.tableAccessible = false;
          return { data: null, error: null };
        } else if (testError) {
          console.log('🔍 product_recipes table test error:', testError);
          this.tableAccessible = false;
          return { data: null, error: null };
        } else {
          this.tableAccessible = true;
          console.log('🔍 product_recipes table is accessible');
        }
      }
      
      // Method 1: Try to find recipe with exact product ID (with 406 error handling)
      const client = supabaseAdmin || supabase;
      let { data: recipe, error: recipeError } = await client
        .from('product_recipes')
        .select('*')
        .eq('product_id', productId)
        .single();

      // Handle 406 errors and other RLS errors immediately
      if (recipeError && (recipeError.message?.includes('406') || recipeError.message?.includes('Not Acceptable') || recipeError.code === 'PGRST116' || recipeError.code === 'PGRST301')) {
        console.log('🔍 RLS/406 error on product_recipes table, skipping recipe lookup for:', productId);
        this.tableAccessible = false; // Cache the result
        return { data: null, error: null }; // Return null data but no error
      }

      // Method 2: If not found and productId looks like a production ID, try different patterns
      if (recipeError && recipeError.code === 'PGRST116' && productId.startsWith('PRO-')) {
        // Try with the production ID as-is (with 406 error handling)
        const { data: recipe2, error: recipeError2 } = await client
          .from('product_recipes')
          .select('*')
          .eq('product_id', productId)
          .single();
        
        if (recipeError2 && (recipeError2.message?.includes('406') || recipeError2.message?.includes('Not Acceptable'))) {
          // Silently handle 406 errors - table not accessible
          return { data: null, error: null };
        }
        
        if (!recipeError2 && recipe2) {
          recipe = recipe2;
          recipeError = null;
        }
      }

      // Method 3: If still not found, try to find by product name (with 406 error handling)
      if (recipeError && recipeError.code === 'PGRST116') {
        
        // Get the product name from products table
        const { data: product, error: productError } = await client
          .from('products')
          .select('name')
          .eq('id', productId)
          .single();
        
        if (!productError && product) {
          // Try to find recipe by product name (with 406 error handling)
          const { data: recipe3, error: recipeError3 } = await client
            .from('product_recipes')
            .select('*')
            .eq('product_name', product.name)
            .single();
          
        if (recipeError3 && (recipeError3.message?.includes('406') || recipeError3.message?.includes('Not Acceptable'))) {
          // Silently handle 406 errors - table not accessible
          return { data: null, error: null };
        }
          
          if (!recipeError3 && recipe3) {
            recipe = recipe3;
            recipeError = null;
            console.log('✅ Found recipe by product name:', product.name);
          }
        }
      }

      if (recipeError && recipeError.code !== 'PGRST116') {
        console.error('Error fetching recipe:', recipeError);
        return { data: null, error: recipeError.message };
      }

      if (!recipe) {
        // No recipe found - this is normal for new products
        return { data: null, error: null };
      }

      console.log('✅ Found recipe:', recipe.id);

      // Then get the recipe materials separately (with 406 error handling)
      const { data: materials, error: materialsError } = await client
        .from('recipe_materials')
        .select('*')
        .eq('recipe_id', recipe.id);

      if (materialsError && (materialsError.message?.includes('406') || materialsError.message?.includes('Not Acceptable'))) {
        console.log('🔍 406 error on recipe_materials table, returning recipe without materials');
        return { data: { ...recipe, recipe_materials: [] }, error: null };
      }

      if (materialsError) {
        console.error('Error fetching recipe materials:', materialsError);
        // Return recipe without materials rather than failing completely
        return { data: { ...recipe, recipe_materials: [] }, error: null };
      }

      console.log('✅ Found recipe materials:', materials?.length || 0);
      return { data: { ...recipe, recipe_materials: materials || [] }, error: null };
    } catch (error) {
      console.error('Error in getRecipeByProductId:', error);
      return { data: null, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Get recipe by recipe ID
  static async getRecipeById(recipeId: string): Promise<{ data: RecipeWithMaterials | null; error: string | null }> {
    try {
      // First, get the recipe
      const client = supabaseAdmin || supabase;
      const { data: recipe, error: recipeError } = await client
        .from('product_recipes')
        .select('*')
        .eq('id', recipeId)
        .single();

      if (recipeError) {
        console.error('Error fetching recipe:', recipeError);
        return { data: null, error: recipeError.message };
      }

      if (!recipe) {
        return { data: null, error: null };
      }

      // Then get the recipe materials separately
      const { data: materials, error: materialsError } = await client
        .from('recipe_materials')
        .select('*')
        .eq('recipe_id', recipe.id);

      if (materialsError) {
        console.error('Error fetching recipe materials:', materialsError);
        // Return recipe without materials rather than failing completely
        return { data: { ...recipe, recipe_materials: [] }, error: null };
      }

      return { data: { ...recipe, recipe_materials: materials || [] }, error: null };
    } catch (error) {
      console.error('Error in getRecipeById:', error);
      return { data: null, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Delete a recipe
  static async deleteRecipe(recipeId: string): Promise<{ error: string | null }> {
    try {
      // Delete recipe materials first (due to foreign key constraint)
      const client = supabaseAdmin || supabase;
      const { error: materialsError } = await client
        .from('recipe_materials')
        .delete()
        .eq('recipe_id', recipeId);

      if (materialsError) {
        console.error('Error deleting recipe materials:', materialsError);
        return { error: materialsError.message };
      }

      // Delete the recipe
      const { error: recipeError } = await client
        .from('product_recipes')
        .delete()
        .eq('id', recipeId);

      if (recipeError) {
        console.error('Error deleting recipe:', recipeError);
        return { error: recipeError.message };
      }

      return { error: null };
    } catch (error) {
      console.error('Error in deleteRecipe:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Get all recipes
  static async getAllRecipes(): Promise<{ data: RecipeWithMaterials[]; error: string | null }> {
    try {
      // First, get all recipes
      const client = supabaseAdmin || supabase;
      const { data: recipes, error: recipesError } = await client
        .from('product_recipes')
        .select('*')
        .order('created_at', { ascending: false });

      if (recipesError) {
        console.error('Error fetching recipes:', recipesError);
        return { data: [], error: recipesError.message };
      }

      if (!recipes || recipes.length === 0) {
        return { data: [], error: null };
      }

      // Then get materials for each recipe
      const recipesWithMaterials: RecipeWithMaterials[] = [];
      for (const recipe of recipes) {
        const { data: materials, error: materialsError } = await client
          .from('recipe_materials')
          .select('*')
          .eq('recipe_id', recipe.id);

        if (materialsError) {
          console.error(`Error fetching materials for recipe ${recipe.id}:`, materialsError);
          // Add recipe without materials rather than failing completely
          recipesWithMaterials.push({ ...recipe, recipe_materials: [] });
        } else {
          recipesWithMaterials.push({ ...recipe, recipe_materials: materials || [] });
        }
      }

      return { data: recipesWithMaterials, error: null };
    } catch (error) {
      console.error('Error in getAllRecipes:', error);
      return { data: [], error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Create or update recipe from production material usage
  static async createOrUpdateRecipeFromProduction(
    productId: string,
    productName: string,
    materialsUsed: {
      material_id: string;
      material_name: string;
      quantity: number;
      unit: string;
      cost_per_unit: number;
    }[],
    createdBy: string = 'production'
  ): Promise<{ data: RecipeWithMaterials | null; error: string | null }> {
    try {
      // Check if recipe already exists for this product
      const { data: existingRecipe, error: fetchError } = await this.getRecipeByProductId(productId);

      if (fetchError && fetchError !== 'No recipe found') {
        return { data: null, error: fetchError };
      }

      if (existingRecipe) {
        // Update existing recipe with new material usage
        console.log(`🔄 Updating existing recipe for ${productName} with production data`);
        return await this.updateRecipe(existingRecipe.id, {
          materials: materialsUsed.map(m => ({
            material_id: m.material_id,
            material_name: m.material_name,
            quantity: m.quantity,
            unit: m.unit,
            cost_per_unit: m.cost_per_unit
          }))
        });
      } else {
        // Create new recipe from production data
        console.log(`✨ Creating new recipe for ${productName} from production data`);
        return await this.createRecipe({
          product_id: productId,
          product_name: productName,
          materials: materialsUsed.map(m => ({
            material_id: m.material_id,
            material_name: m.material_name,
            quantity: m.quantity,
            unit: m.unit,
            cost_per_unit: m.cost_per_unit
          })),
          created_by: createdBy
        });
      }
    } catch (error) {
      console.error('Error in createOrUpdateRecipeFromProduction:', error);
      return { data: null, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Smart recipe creation - checks if recipe exists and asks user for action
  static async smartCreateRecipe(
    productId: string,
    productName: string,
    materialsUsed: {
      material_id: string;
      material_name: string;
      quantity: number;
      unit: string;
      cost_per_unit: number;
    }[],
    options: {
      forceCreate?: boolean; // Force create new recipe even if one exists
      updateExisting?: boolean; // Update existing recipe if found
      askUser?: boolean; // Ask user what to do if recipe exists
      createdBy?: string;
    } = {}
  ): Promise<{ data: RecipeWithMaterials | null; error: string | null; action?: 'created' | 'updated' | 'skipped' }> {
    try {
      const { forceCreate = false, updateExisting = true, askUser = false, createdBy = 'user' } = options;

      // Check if recipe exists
      const { data: existingRecipe } = await this.getRecipeByProductId(productId);

      if (existingRecipe) {
        if (forceCreate) {
          // Create a new recipe anyway (could be a variant)
          const result = await this.createRecipe({
            product_id: productId,
            product_name: `${productName} (Variant)`,
            materials: materialsUsed.map(m => ({
              material_id: m.material_id,
              material_name: m.material_name,
              quantity: m.quantity,
              unit: m.unit,
              cost_per_unit: m.cost_per_unit
            })),
            created_by: createdBy
          });
          return { ...result, action: 'created' };
        } else if (updateExisting) {
          // Update existing recipe
          const result = await this.updateRecipe(existingRecipe.id, {
            materials: materialsUsed.map(m => ({
              material_id: m.material_id,
              material_name: m.material_name,
              quantity: m.quantity,
              unit: m.unit,
              cost_per_unit: m.cost_per_unit
            }))
          });
          return { ...result, action: 'updated' };
        } else {
          // Skip - recipe exists and user doesn't want to update
          return { data: existingRecipe, error: null, action: 'skipped' };
        }
      } else {
        // No existing recipe, create new one
        const result = await this.createRecipe({
          product_id: productId,
          product_name: productName,
          materials: materialsUsed.map(m => ({
            material_id: m.material_id,
            material_name: m.material_name,
            quantity: m.quantity,
            unit: m.unit,
            cost_per_unit: m.cost_per_unit
          })),
          created_by: createdBy
        });
        return { ...result, action: 'created' };
      }
    } catch (error) {
      console.error('Error in smartCreateRecipe:', error);
      return { data: null, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
}
