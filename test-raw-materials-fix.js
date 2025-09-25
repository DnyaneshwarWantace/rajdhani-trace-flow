// Test script to verify raw materials endpoint fix
// Run this with: node test-raw-materials-fix.js

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Test configuration
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://rysixsktewsnlmezmprg.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

console.log('🧪 Testing Raw Materials Endpoint Fix...\n');

if (!supabaseKey) {
  console.error('❌ Error: VITE_SUPABASE_ANON_KEY not found in environment variables');
  console.log('Please create a .env file with your Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testRawMaterialsEndpoint() {
  try {
    console.log('1. Testing connection to Supabase...');
    const { data: connectionTest, error: connectionError } = await supabase
      .from('raw_materials')
      .select('id')
      .limit(1);
    
    if (connectionError) {
      console.error('❌ Connection failed:', connectionError.message);
      return false;
    }
    console.log('✅ Connection successful');

    console.log('\n2. Testing raw materials table access...');
    const { data: materials, error: materialsError } = await supabase
      .from('raw_materials')
      .select('*')
      .limit(5);
    
    if (materialsError) {
      console.error('❌ Raw materials query failed:', materialsError.message);
      return false;
    }
    
    console.log('✅ Raw materials query successful');
    console.log(`📊 Found ${materials.length} raw materials:`);
    materials.forEach(material => {
      console.log(`   - ${material.name} (${material.category}): ${material.current_stock} ${material.unit}`);
    });

    console.log('\n3. Testing suppliers table access...');
    const { data: suppliers, error: suppliersError } = await supabase
      .from('suppliers')
      .select('*')
      .limit(5);
    
    if (suppliersError) {
      console.error('❌ Suppliers query failed:', suppliersError.message);
      return false;
    }
    
    console.log('✅ Suppliers query successful');
    console.log(`📊 Found ${suppliers.length} suppliers:`);
    suppliers.forEach(supplier => {
      console.log(`   - ${supplier.name} (${supplier.status})`);
    });

    console.log('\n4. Testing raw material creation...');
    const testMaterial = {
      id: `TEST_${Date.now()}`,
      name: 'Test Material',
      category: 'Test Category',
      current_stock: 10,
      unit: 'kg',
      min_threshold: 5,
      max_capacity: 100,
      reorder_point: 10,
      daily_usage: 1,
      status: 'in-stock',
      supplier_name: 'Test Supplier',
      cost_per_unit: 50,
      total_value: 500,
      batch_number: 'TEST_BATCH',
      supplier_performance: 4.0
    };

    const { data: newMaterial, error: createError } = await supabase
      .from('raw_materials')
      .insert(testMaterial)
      .select()
      .single();
    
    if (createError) {
      console.error('❌ Raw material creation failed:', createError.message);
      return false;
    }
    
    console.log('✅ Raw material creation successful');
    console.log(`   Created: ${newMaterial.name} with ID: ${newMaterial.id}`);

    console.log('\n5. Testing raw material update...');
    const { data: updatedMaterial, error: updateError } = await supabase
      .from('raw_materials')
      .update({ current_stock: 15, total_value: 750 })
      .eq('id', newMaterial.id)
      .select()
      .single();
    
    if (updateError) {
      console.error('❌ Raw material update failed:', updateError.message);
      return false;
    }
    
    console.log('✅ Raw material update successful');
    console.log(`   Updated stock to: ${updatedMaterial.current_stock} ${updatedMaterial.unit}`);

    console.log('\n6. Testing raw material deletion...');
    const { error: deleteError } = await supabase
      .from('raw_materials')
      .delete()
      .eq('id', newMaterial.id);
    
    if (deleteError) {
      console.error('❌ Raw material deletion failed:', deleteError.message);
      return false;
    }
    
    console.log('✅ Raw material deletion successful');

    console.log('\n🎉 All tests passed! Raw materials endpoint is working correctly.');
    return true;

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    return false;
  }
}

// Run the test
testRawMaterialsEndpoint().then(success => {
  if (success) {
    console.log('\n✅ Raw materials 400 error has been fixed!');
    process.exit(0);
  } else {
    console.log('\n❌ Raw materials endpoint still has issues. Please check the setup.');
    process.exit(1);
  }
});
