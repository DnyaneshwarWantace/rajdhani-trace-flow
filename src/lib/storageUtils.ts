// Temporary utility functions to replace localStorage dependencies
// This allows the app to work while we migrate to Supabase

export const STORAGE_KEYS = {
  ORDERS: 'rajdhani_orders',
  PRODUCTS: 'rajdhani_products',
  INDIVIDUAL_PRODUCTS: 'rajdhani_individual_products',
  RAW_MATERIALS: 'rajdhani_raw_materials',
  CUSTOMERS: 'rajdhani_customers',
  NOTIFICATIONS: 'rajdhani_notifications'
};

export const generateUniqueId = (prefix: string): string => {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substr(2, 5);
  return `${prefix}_${timestamp}_${randomStr}`;
};

export const getFromStorage = (key: string): any[] => {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error(`Error reading from localStorage key ${key}:`, error);
    return [];
  }
};

export const saveToStorage = (key: string, data: any): void => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error(`Error saving to localStorage key ${key}:`, error);
  }
};

export const replaceStorage = (key: string, data: any): void => {
  saveToStorage(key, data);
};

export const fixNestedArray = (data: any): any[] => {
  if (!Array.isArray(data)) return [];
  return data.filter(item => item && typeof item === 'object' && !Array.isArray(item));
};

// Notification functions using Supabase
import { NotificationService } from '@/services/notificationService';

export const getNotifications = async (): Promise<any[]> => {
  try {
    const { data, error } = await NotificationService.getNotifications();
    if (error) {
      console.error('Error fetching notifications:', error);
      return [];
    }
    return data || [];
  } catch (error) {
    console.error('Error in getNotifications:', error);
    return [];
  }
};

export const markNotificationAsRead = async (notificationId: string): Promise<void> => {
  try {
    const { error } = await NotificationService.markAsRead(notificationId);
    if (error) {
      console.error('Error marking notification as read:', error);
    }
  } catch (error) {
    console.error('Error in markNotificationAsRead:', error);
  }
};

export const resolveNotification = async (notificationId: string): Promise<void> => {
  await markNotificationAsRead(notificationId);
};

export const createNotification = async (notification: any) => {
  try {
    // Check if notification already exists to prevent duplicates
    if (notification.relatedId) {
      const { exists } = await NotificationService.notificationExists(
        notification.type, 
        notification.relatedId, 
        notification.status || 'unread'
      );
      
      if (exists) {
        console.log('Notification already exists, skipping creation');
        return null;
      }
    }

    const { data, error } = await NotificationService.createNotification({
      type: notification.type || 'info',
      title: notification.title,
      message: notification.message,
      priority: notification.priority || 'medium',
      status: notification.status || 'unread',
      module: notification.module || 'orders',
      related_id: notification.relatedId,
      related_data: notification.relatedData,
      created_by: notification.createdBy || 'system'
    });

    if (error) {
      console.error('Error creating notification:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in createNotification:', error);
    return null;
  }
};

// Clean up notifications related to cancelled or deleted orders
export const cleanupOrderNotifications = async (orderId: string): Promise<void> => {
  try {
    const { error } = await NotificationService.cleanupOrderNotifications(orderId);
    if (error) {
      console.error('Error cleaning up order notifications:', error);
    }
  } catch (error) {
    console.error('Error in cleanupOrderNotifications:', error);
  }
};

// Product recipe functions - now using Supabase
import { ProductRecipeService } from '@/services/productRecipeService';

export const getProductRecipe = async (productId: string): Promise<any> => {
  try {
    const { data, error } = await ProductRecipeService.getRecipeByProductId(productId);
    if (error) {
      // Handle 406 error (table doesn't exist) gracefully
      if (error.includes('406') || error.includes('Not Acceptable')) {
        console.log('Product recipes table not available, returning null');
        return null;
      }
      console.error('Error fetching product recipe:', error);
      return null;
    }
    return data;
  } catch (error) {
    console.error('Error in getProductRecipe:', error);
    return null;
  }
};

export const saveProductRecipe = async (recipe: any): Promise<void> => {
  try {
    console.log('🔍 saveProductRecipe called with recipe:', recipe);
    console.log('🔍 Recipe materials:', recipe.materials);
    
    // Validate materials before processing
    const validMaterials = recipe.materials.filter((material: any, index: number) => {
      console.log(`🔍 Validating material ${index}:`, material);
      const materialId = material.id || material.materialId || material.material_id;
      const materialName = material.name || material.materialName || material.material_name;
      
      if (!materialId) {
        console.error(`❌ Material ${index} missing ID:`, material);
        return false;
      }
      if (!materialName) {
        console.error(`❌ Material ${index} missing name:`, material);
        return false;
      }
      console.log(`✅ Material ${index} is valid:`, { id: materialId, name: materialName });
      return true;
    });
    
    if (validMaterials.length !== recipe.materials.length) {
      console.error('❌ Some materials are invalid, skipping recipe creation');
      console.error('❌ Invalid materials:', recipe.materials.filter((m: any, i: number) => 
        !validMaterials.includes(recipe.materials[i])
      ));
      return; // Skip recipe creation if materials are invalid
    }
    
    // Convert the old recipe format to new format
    const recipeData = {
      product_id: recipe.productId,
      product_name: recipe.productName,
      base_unit: recipe.baseUnit || recipe.base_unit || 'unit', // Base unit for the recipe
      materials: validMaterials.map((material: any) => ({
        material_id: material.id || material.materialId || material.material_id,
        material_name: material.name || material.materialName || material.material_name,
        material_type: material.material_type || 'raw_material', // Ensure material_type is set
        quantity: material.selectedQuantity || material.quantity || 1,
        unit: material.unit,
        cost_per_unit: material.costPerUnit || material.cost || material.cost_per_unit || 0
      })),
      created_by: recipe.createdBy || 'admin'
    };
    
    console.log('🔍 Final recipe data:', recipeData);

    // Check if recipe already exists
    const existingRecipe = await getProductRecipe(recipe.productId);
    
    if (existingRecipe) {
      // Update existing recipe
      const { error } = await ProductRecipeService.updateRecipe(existingRecipe.id, recipeData);
      if (error) {
        // Handle 406 error (table doesn't exist) gracefully
        if (error.includes('406') || error.includes('Not Acceptable')) {
          console.log('Product recipes table not available, skipping recipe save');
          return;
        }
        console.error('Error updating product recipe:', error);
        throw new Error(error);
      }
    } else {
      // Create new recipe
      const { error } = await ProductRecipeService.createRecipe(recipeData);
      if (error) {
        // Handle 406 error (table doesn't exist) gracefully
        if (error.includes('406') || error.includes('Not Acceptable')) {
          console.log('Product recipes table not available, skipping recipe save');
          return;
        }
        console.error('Error creating product recipe:', error);
        throw new Error(error);
      }
    }
  } catch (error) {
    console.error('Error in saveProductRecipe:', error);
    // Don't throw error if it's a table not found issue
    if (error.message && (error.message.includes('406') || error.message.includes('Not Acceptable'))) {
      console.log('Product recipes table not available, skipping recipe save');
      return;
    }
    throw error;
  }
};

export const createRecipeFromMaterials = async (productId: string, productName: string, baseUnit: string, materials: any[], createdBy: string = 'admin'): Promise<any> => {
  console.log('🔍 Creating recipe from materials:', { productId, productName, materials });
  console.log('🔍 Materials array length:', materials.length);
  console.log('🔍 Each material details:', materials.map((m, i) => ({ index: i, material: m })));
  
  // Validate materials before creating recipe
  const validMaterials = materials.filter((material, index) => {
    console.log(`🔍 Validating material ${index}:`, material);
    
    if (!material.id) {
      console.error('❌ Material missing ID:', material);
      return false;
    }
    if (!material.name) {
      console.error('❌ Material missing name:', material);
      return false;
    }
    console.log('✅ Material is valid:', { id: material.id, name: material.name });
    return true;
  });

  console.log('🔍 Valid materials count:', validMaterials.length, 'out of', materials.length);

  if (validMaterials.length !== materials.length) {
    console.error('❌ Some materials are invalid, skipping recipe creation');
    console.error('❌ Invalid materials:', materials.filter(m => !m.id || !m.name));
    throw new Error('Invalid materials: missing ID or name');
  }

  const recipeData = {
    id: await generateUniqueId('RECIPE'),
    productId,
    productName,
    baseUnit, // Base unit for the recipe
    materials: validMaterials.map(material => ({
      material_id: material.id,
      material_name: material.name,
      material_type: material.material_type || 'raw_material', // Default to raw_material for backward compatibility
      quantity: material.selectedQuantity || material.quantity || 1, // Quantity for 1 base unit
      unit: material.unit || 'piece',
      cost_per_unit: material.cost_per_unit || 0
    })),
    totalCost: 0, // No total cost since quantities are dynamic
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy
  };

  console.log('🔍 Final recipe data:', recipeData);
  return recipeData;
};

export const getProductionProductData = (productId: string): any => {
  const products = getFromStorage('rajdhani_products');
  return products.find((product: any) => product.id === productId);
};
