import { createClient } from '@supabase/supabase-js';

// Load environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Please set VITE_SUPABASE_URL and VITE_SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runDecimalFix() {
  try {
    console.log('🔧 Testing decimal quantities for recipe system...');
    
    // 1. Test decimal insertion in recipe_materials
    console.log('\n🧪 Testing decimal quantity support...');
    
    const testQuantities = [0.03, 0.5, 1.25, 123.45];
    
    for (const testQuantity of testQuantities) {
      console.log(`\n📊 Testing quantity: ${testQuantity}`);
      
      // Check if we can insert a test record (we'll delete it immediately)
      const testId = 'TEST_DECIMAL_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      
      const { data: testData, error: testError } = await supabase
        .from('recipe_materials')
        .insert({
          id: testId,
          recipe_id: 'TEST_RECIPE_' + Date.now(),
          material_id: 'TEST_MATERIAL_' + Date.now(),
          material_name: 'Test Material',
          quantity: testQuantity,
          unit: 'kg'
        })
        .select();
      
      if (testError) {
        console.error(`❌ Error testing decimal ${testQuantity}:`, testError.message);
        
        // Check if it's a constraint error or data type error
        if (testError.message.includes('numeric') || testError.message.includes('decimal')) {
          console.log('💡 This suggests the quantity column may not support decimals properly');
        }
      } else {
        console.log(`✅ Decimal quantity ${testQuantity} insertion successful!`);
        
        // Clean up test record
        await supabase
          .from('recipe_materials')
          .delete()
          .eq('id', testId);
        
        console.log('🧹 Test record cleaned up');
      }
    }
    
    // 2. Test with existing recipe data
    console.log('\n🔍 Checking existing recipe data...');
    const { data: existingRecipes, error: recipeError } = await supabase
      .from('recipe_materials')
      .select('quantity, unit, material_name')
      .limit(5);
    
    if (recipeError) {
      console.error('❌ Error fetching existing recipes:', recipeError.message);
    } else {
      console.log('📋 Existing recipe quantities:');
      existingRecipes.forEach(recipe => {
        console.log(`  - ${recipe.material_name}: ${recipe.quantity} ${recipe.unit}`);
      });
    }
    
    console.log('\n🎉 Decimal quantity test completed!');
    console.log('📝 Based on the results, you can use decimal quantities like:');
    console.log('   - 0.03 kg');
    console.log('   - 0.5 units');
    console.log('   - 1.25 sqm');
    console.log('   - 123.45 (up to 10 digits, 2 decimal places)');
    
    console.log('\n💡 If you see errors, run the SQL script manually:');
    console.log('   File: fix-decimal-quantities.sql');
    console.log('   In Supabase Dashboard > SQL Editor');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

runDecimalFix();
