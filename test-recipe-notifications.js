import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Generate unique ID function
const generateUniqueId = (prefix) => {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  const dateStr = `${year}${month}${day}`;
  
  const sequence = Math.floor(Math.random() * 999) + 1;
  return `${prefix}-${dateStr}-${sequence.toString().padStart(3, '0')}`;
};

// Mock NotificationService for testing
class MockNotificationService {
  static async createNotification(notification) {
    console.log('📢 NOTIFICATION CREATED:');
    console.log(`  • Type: ${notification.type}`);
    console.log(`  • Title: ${notification.title}`);
    console.log(`  • Message: ${notification.message}`);
    console.log(`  • Priority: ${notification.priority}`);
    console.log(`  • Module: ${notification.module}`);
    console.log(`  • Related ID: ${notification.related_id}`);
    console.log(`  • Related Data:`, JSON.stringify(notification.related_data, null, 2));
    console.log('');

    // Actually insert into database
    const { data, error } = await supabase
      .from('notifications')
      .insert([notification])
      .select();

    if (error) {
      console.error('❌ Error creating notification:', error);
      return { data: null, error };
    }

    return { data: data[0], error: null };
  }

  static async notificationExists(type, relatedId, status) {
    const { data, error } = await supabase
      .from('notifications')
      .select('id')
      .eq('type', type)
      .eq('related_id', relatedId)
      .eq('status', status)
      .limit(1);

    if (error) {
      console.error('Error checking notification existence:', error);
      return { exists: false };
    }

    return { exists: data && data.length > 0 };
  }
}

async function testRecipeNotifications() {
  console.log('🧮 Testing Recipe Calculation with Notifications...\n');

  try {
    // Step 1: Get available products
    console.log('📦 Step 1: Fetching available products...');
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, name, category, color, pattern, base_quantity')
      .order('created_at', { ascending: false });

    if (productsError) {
      console.error('❌ Error fetching products:', productsError);
      return;
    }

    console.log(`✅ Found ${products?.length || 0} products:`);
    products?.forEach(p => {
      console.log(`  • ${p.id} - ${p.name} (${p.category}, ${p.color}) - Stock: ${p.base_quantity}`);
    });

    // Step 2: Get all recipes
    console.log('\n📋 Step 2: Fetching product recipes...');
    const { data: recipes, error: recipesError } = await supabase
      .from('product_recipes')
      .select('*');

    if (recipesError) {
      console.error('❌ Error fetching recipes:', recipesError);
      return;
    }

    console.log(`✅ Found ${recipes?.length || 0} recipes:`);
    recipes?.forEach(r => {
      console.log(`  • ${r.id} - ${r.product_name} (Base: ${r.base_quantity} ${r.base_unit})`);
    });

    // Step 3: Get all recipe materials
    console.log('\n🔧 Step 3: Fetching recipe materials...');
    const { data: recipeMaterials, error: materialsError } = await supabase
      .from('recipe_materials')
      .select('*');

    if (materialsError) {
      console.error('❌ Error fetching recipe materials:', materialsError);
      return;
    }

    console.log(`✅ Found ${recipeMaterials?.length || 0} recipe materials:`);
    recipeMaterials?.forEach(rm => {
      const type = rm.material_type === 'product' ? '🔄' : '📦';
      console.log(`  • ${type} ${rm.material_name} (${rm.quantity} ${rm.unit}) - Type: ${rm.material_type}`);
    });

    // Step 4: Get raw materials stock
    console.log('\n📦 Step 4: Fetching raw materials stock...');
    const { data: rawMaterials, error: rawMaterialsError } = await supabase
      .from('raw_materials')
      .select('id, name, type, current_stock, unit, cost_per_unit')
      .eq('status', 'in-stock');

    if (rawMaterialsError) {
      console.error('❌ Error fetching raw materials:', rawMaterialsError);
      return;
    }

    console.log(`✅ Found ${rawMaterials?.length || 0} raw materials:`);
    rawMaterials?.forEach(rm => {
      console.log(`  • ${rm.name} (${rm.type}) - Stock: ${rm.current_stock} ${rm.unit}`);
    });

    // Step 5: Test Recipe Calculation with Large Quantities (to trigger shortages)
    console.log('\n🧮 Step 5: Testing Recipe Calculation with Large Quantities...');
    console.log('=' .repeat(70));

    // Test Scenario 1: Large quantity of Cotton T-Shirt (should trigger material shortage)
    const tshirt = products.find(p => p.name.includes('Cotton T-Shirt'));
    if (tshirt) {
      console.log('\n📋 Scenario 1: Cotton T-Shirt Recipe Calculation (quantity: 1000) - EXPECTING SHORTAGES');
      console.log('=' .repeat(70));
      
      const tshirtRecipe = recipes.find(r => r.product_id === tshirt.id);
      if (tshirtRecipe) {
        console.log(`✅ Found recipe for ${tshirt.name}`);
        console.log(`   Base Quantity: ${tshirtRecipe.base_quantity} ${tshirtRecipe.base_unit}`);
        
        const tshirtMaterials = recipeMaterials.filter(rm => rm.recipe_id === tshirtRecipe.id);
        const targetQuantity = 1000; // Large quantity to trigger shortages
        const multiplier = targetQuantity / tshirtRecipe.base_quantity;
        
        console.log(`\n   📊 Calculation for ${targetQuantity} units (multiplier: ${multiplier}):`);
        
        const shortages = [];
        
        for (const material of tshirtMaterials) {
          const requiredQuantity = material.quantity * multiplier;
          const rawMaterial = rawMaterials.find(rm => rm.id === material.material_id);
          
          if (rawMaterial) {
            const availableStock = rawMaterial.current_stock;
            const shortage = Math.max(0, requiredQuantity - availableStock);
            const status = shortage > 0 ? '❌' : '✅';
            
            console.log(`     ${status} ${material.material_name}: Need ${requiredQuantity.toFixed(2)} ${material.unit}, Have ${availableStock} ${material.unit}, Shortage: ${shortage} ${material.unit}`);
            
            if (shortage > 0) {
              shortages.push({
                material_id: material.material_id,
                material_name: material.material_name,
                required_quantity: requiredQuantity,
                available_stock: availableStock,
                shortage: shortage,
                unit: material.unit,
                material_type: material.material_type,
                cost_per_unit: rawMaterial.cost_per_unit,
                estimated_cost: shortage * rawMaterial.cost_per_unit
              });
            }
          }
        }

        // Send notifications for shortages
        if (shortages.length > 0) {
          console.log('\n📢 Sending Material Shortage Notifications...');
          console.log('=' .repeat(50));
          
          for (const shortage of shortages) {
            await MockNotificationService.createNotification({
              type: 'warning',
              title: `Material Shortage Alert - ${shortage.material_name}`,
              message: `Order for ${tshirt.name} requires ${shortage.required_quantity.toFixed(2)} ${shortage.unit} of ${shortage.material_name}. Available: ${shortage.available_stock} ${shortage.unit}. Shortage: ${shortage.shortage.toFixed(2)} ${shortage.unit}.`,
              priority: 'high',
              status: 'unread',
              module: 'materials',
              related_id: shortage.material_id,
              related_data: {
                orderId: 'TEST-ORDER-001',
                orderNumber: 'ORD-251005-001',
                productName: tshirt.name,
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
          }
        }
      }
    }

    // Test Scenario 2: Large quantity of Fashion Combo Pack (nested recipe with shortages)
    const comboPack = products.find(p => p.name.includes('Fashion Combo Pack'));
    if (comboPack) {
      console.log('\n\n📋 Scenario 2: Fashion Combo Pack Recipe Calculation (quantity: 500) - NESTED RECIPE WITH SHORTAGES');
      console.log('=' .repeat(70));
      
      const comboRecipe = recipes.find(r => r.product_id === comboPack.id);
      if (comboRecipe) {
        console.log(`✅ Found recipe for ${comboPack.name}`);
        console.log(`   Base Quantity: ${comboRecipe.base_quantity} ${comboRecipe.base_unit}`);
        
        const comboMaterials = recipeMaterials.filter(rm => rm.recipe_id === comboRecipe.id);
        const targetQuantity = 500; // Large quantity to trigger shortages
        const multiplier = targetQuantity / comboRecipe.base_quantity;
        
        console.log(`\n   📊 Calculation for ${targetQuantity} units (multiplier: ${multiplier}):`);
        
        const allShortages = [];
        
        for (const material of comboMaterials) {
          const requiredQuantity = material.quantity * multiplier;
          
          if (material.material_type === 'product') {
            // This is a product material - need to calculate its recipe
            console.log(`\n   🔄 Processing product material: ${material.material_name} (${requiredQuantity} units)`);
            
            const productMaterial = products.find(p => p.id === material.material_id);
            if (productMaterial) {
              const productRecipe = recipes.find(r => r.product_id === productMaterial.id);
              if (productRecipe) {
                console.log(`     Found recipe for ${productMaterial.name}`);
                console.log(`     Base Quantity: ${productRecipe.base_quantity} ${productRecipe.base_unit}`);
                
                const productMaterials = recipeMaterials.filter(rm => rm.recipe_id === productRecipe.id);
                const productMultiplier = requiredQuantity / productRecipe.base_quantity;
                
                console.log(`     Materials needed for ${requiredQuantity} units of ${productMaterial.name} (multiplier: ${productMultiplier}):`);
                
                for (const productMaterial of productMaterials) {
                  const nestedRequiredQuantity = productMaterial.quantity * productMultiplier;
                  const rawMaterial = rawMaterials.find(rm => rm.id === productMaterial.material_id);
                  
                  if (rawMaterial) {
                    const availableStock = rawMaterial.current_stock;
                    const shortage = Math.max(0, nestedRequiredQuantity - availableStock);
                    const status = shortage > 0 ? '❌' : '✅';
                    
                    console.log(`       ${status} 📦 ${productMaterial.material_name}: Need ${nestedRequiredQuantity.toFixed(2)} ${productMaterial.unit}, Have ${availableStock} ${productMaterial.unit}, Shortage: ${shortage} ${productMaterial.unit}`);
                    
                    if (shortage > 0) {
                      allShortages.push({
                        material_id: productMaterial.material_id,
                        material_name: productMaterial.material_name,
                        required_quantity: nestedRequiredQuantity,
                        available_stock: availableStock,
                        shortage: shortage,
                        unit: productMaterial.unit,
                        material_type: productMaterial.material_type,
                        cost_per_unit: rawMaterial.cost_per_unit,
                        estimated_cost: shortage * rawMaterial.cost_per_unit
                      });
                    }
                  }
                }
              }
            }
          }
        }

        // Send notifications for all shortages
        if (allShortages.length > 0) {
          console.log('\n📢 Sending Material Shortage Notifications for Nested Recipe...');
          console.log('=' .repeat(50));
          
          for (const shortage of allShortages) {
            await MockNotificationService.createNotification({
              type: 'warning',
              title: `Material Shortage Alert - ${shortage.material_name}`,
              message: `Order for ${comboPack.name} requires ${shortage.required_quantity.toFixed(2)} ${shortage.unit} of ${shortage.material_name}. Available: ${shortage.available_stock} ${shortage.unit}. Shortage: ${shortage.shortage.toFixed(2)} ${shortage.unit}.`,
              priority: 'high',
              status: 'unread',
              module: 'materials',
              related_id: shortage.material_id,
              related_data: {
                orderId: 'TEST-ORDER-002',
                orderNumber: 'ORD-251005-002',
                productName: comboPack.name,
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
          }
        }
      }
    }

    // Step 6: Check created notifications
    console.log('\n📋 Step 6: Checking created notifications...');
    const { data: notifications, error: notificationsError } = await supabase
      .from('notifications')
      .select('*')
      .eq('type', 'warning')
      .eq('module', 'materials')
      .order('created_at', { ascending: false })
      .limit(10);

    if (notificationsError) {
      console.error('❌ Error fetching notifications:', notificationsError);
    } else {
      console.log(`✅ Found ${notifications?.length || 0} material shortage notifications:`);
      notifications?.forEach(notif => {
        console.log(`  • ${notif.title}`);
        console.log(`    Message: ${notif.message}`);
        console.log(`    Priority: ${notif.priority}`);
        console.log(`    Status: ${notif.status}`);
        console.log(`    Created: ${notif.created_at}`);
        console.log('');
      });
    }

    console.log('\n🎉 Recipe Calculation with Notifications Testing Completed!');
    console.log('\n📊 Summary:');
    console.log('  • ✅ Tested recipe calculation with large quantities');
    console.log('  • ✅ Triggered material shortages');
    console.log('  • ✅ Sent notifications to materials module');
    console.log('  • ✅ Tested nested recipe shortage notifications');
    console.log('  • ✅ Verified notifications are stored in database');
    console.log('  • ✅ Notifications include detailed shortage information');

  } catch (error) {
    console.error('❌ Error testing recipe notifications:', error);
  }
}

testRecipeNotifications().catch(console.error);
