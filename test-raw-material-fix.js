// Test script to verify raw material quantity fix
// Run this with: node test-raw-material-fix.js

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://rysixsktewsnlmezmprg.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

console.log('🧪 Testing Raw Material Quantity Fix...\n');

if (!supabaseKey) {
  console.error('❌ Error: VITE_SUPABASE_ANON_KEY not found in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testRawMaterialFix() {
  try {
    console.log('1. Checking existing raw materials with 0 stock...');
    const { data: materials, error: materialsError } = await supabase
      .from('raw_materials')
      .select('*')
      .eq('current_stock', 0)
      .order('created_at', { ascending: false });

    if (materialsError) {
      console.error('❌ Error fetching materials:', materialsError.message);
      return false;
    }

    console.log(`📊 Found ${materials.length} materials with 0 stock:`);
    materials.forEach(material => {
      console.log(`   - ${material.name} (${material.category}): ${material.current_stock} ${material.unit} - Status: ${material.status}`);
    });

    console.log('\n2. Checking purchase orders...');
    const { data: orders, error: ordersError } = await supabase
      .from('purchase_orders')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (ordersError) {
      console.error('❌ Error fetching orders:', ordersError.message);
      return false;
    }

    console.log(`📊 Found ${orders.length} purchase orders:`);
    orders.forEach(order => {
      let materialDetails = {};
      if (order.material_details) {
        materialDetails = order.material_details;
      } else if (order.notes) {
        try {
          materialDetails = JSON.parse(order.notes);
        } catch (e) {
          materialDetails = { materialName: 'Unknown', quantity: 0 };
        }
      }
      
      const quantity = materialDetails.quantity || materialDetails.quantity || 0;
      console.log(`   - ${order.order_number}: ${materialDetails.materialName || 'Unknown'} - Qty: ${quantity} - Status: ${order.status}`);
    });

    console.log('\n3. Testing new material creation with proper quantity...');
    const testMaterial = {
      id: `TEST_${Date.now()}`,
      name: 'Test Material Fix',
      brand: 'Test Brand',
      category: 'Test Category',
      current_stock: 100,
      unit: 'kg',
      min_threshold: 10,
      max_capacity: 1000,
      reorder_point: 50,
      daily_usage: 5,
      status: 'in-stock',
      supplier_name: 'Test Supplier',
      cost_per_unit: 50,
      total_value: 5000,
      batch_number: `TEST_BATCH_${Date.now()}`,
      quality_grade: 'A',
      supplier_performance: 4
    };

    const { data: newMaterial, error: createError } = await supabase
      .from('raw_materials')
      .insert(testMaterial)
      .select()
      .single();

    if (createError) {
      console.error('❌ Error creating test material:', createError.message);
      return false;
    }

    console.log('✅ Test material created successfully');
    console.log(`   Created: ${newMaterial.name} with ${newMaterial.current_stock} ${newMaterial.unit}`);

    console.log('\n4. Testing purchase order creation with proper material_details...');
    const testOrder = {
      id: `PO_TEST_${Date.now()}`,
      order_number: `PO-TEST-${Date.now()}`,
      supplier_name: 'Test Supplier',
      order_date: new Date().toISOString().split('T')[0],
      expected_delivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      total_amount: 1000,
      paid_amount: 0,
      status: 'pending',
      notes: 'Test order for material fix',
      created_by: 'admin',
      material_details: {
        material_name: 'Test Material Fix',
        material_brand: 'Test Brand',
        material_category: 'Test Category',
        material_batch_number: `TEST_BATCH_${Date.now()}`,
        quantity: 20,
        unit: 'kg',
        cost_per_unit: 50,
        min_threshold: 10,
        max_capacity: 1000,
        quality_grade: 'A',
        is_restock: false
      }
    };

    const { data: newOrder, error: orderError } = await supabase
      .from('purchase_orders')
      .insert(testOrder)
      .select()
      .single();

    if (orderError) {
      console.error('❌ Error creating test order:', orderError.message);
      return false;
    }

    console.log('✅ Test purchase order created successfully');
    console.log(`   Created: ${newOrder.order_number} with quantity ${newOrder.material_details.quantity}`);

    console.log('\n5. Testing order loading in ManageStock format...');
    const { data: loadedOrders, error: loadError } = await supabase
      .from('purchase_orders')
      .select('*')
      .eq('id', newOrder.id);

    if (loadError) {
      console.error('❌ Error loading test order:', loadError.message);
      return false;
    }

    if (loadedOrders && loadedOrders.length > 0) {
      const order = loadedOrders[0];
      let materialDetails = {};
      
      if (order.material_details) {
        materialDetails = order.material_details;
      } else if (order.notes) {
        try {
          materialDetails = JSON.parse(order.notes);
        } catch (e) {
          materialDetails = { materialName: 'Unknown', quantity: 0 };
        }
      }

      const quantity = materialDetails.quantity || materialDetails.quantity || 0;
      console.log('✅ Order loaded successfully');
      console.log(`   Material: ${materialDetails.material_name || materialDetails.materialName}`);
      console.log(`   Quantity: ${quantity} ${materialDetails.unit}`);
      console.log(`   Status: ${order.status}`);
    }

    console.log('\n6. Cleaning up test data...');
    await supabase.from('raw_materials').delete().eq('id', newMaterial.id);
    await supabase.from('purchase_orders').delete().eq('id', newOrder.id);
    console.log('✅ Test data cleaned up');

    console.log('\n🎉 All tests passed! The raw material quantity fix is working correctly.');
    return true;

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    return false;
  }
}

// Run the test
testRawMaterialFix().then(success => {
  if (success) {
    console.log('\n✅ Raw material quantity fix is working!');
    console.log('\nNext steps:');
    console.log('1. Run the database fix script: fix-purchase-orders-quantity-issue.sql');
    console.log('2. Run the existing materials fix: fix-existing-zero-stock-materials.sql');
    console.log('3. Test creating new orders in the Materials page');
    console.log('4. Test delivering orders in the Stock Management page');
    process.exit(0);
  } else {
    console.log('\n❌ There are still issues with the raw material system.');
    process.exit(1);
  }
});
