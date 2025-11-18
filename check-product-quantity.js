// Script to check product quantity in database
// Run with: node check-product-quantity.js

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  console.error('Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkProductQuantity(productId = 'PRO-251113-001') {
  try {
    console.log(`\n🔍 Checking product quantity for: ${productId}\n`);
    
    // 1. Get product details
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .single();
    
    if (productError) {
      console.error('❌ Error fetching product:', productError);
      return;
    }
    
    if (!product) {
      console.error(`❌ Product ${productId} not found`);
      return;
    }
    
    console.log('📦 Product Details:');
    console.log(`   ID: ${product.id}`);
    console.log(`   Name: ${product.name}`);
    console.log(`   Individual Stock Tracking: ${product.individual_stock_tracking}`);
    console.log(`   Base Quantity: ${product.base_quantity || 0}`);
    console.log(`   Current Stock: ${product.current_stock || 0}`);
    
    // 2. Get individual products count
    const { data: individualProducts, error: individualError } = await supabase
      .from('individual_products')
      .select('id, status, product_id')
      .eq('product_id', productId);
    
    if (individualError) {
      console.error('❌ Error fetching individual products:', individualError);
    } else {
      const availableCount = individualProducts?.filter(ip => ip.status === 'available').length || 0;
      const soldCount = individualProducts?.filter(ip => ip.status === 'sold').length || 0;
      const reservedCount = individualProducts?.filter(ip => ip.status === 'reserved').length || 0;
      const damagedCount = individualProducts?.filter(ip => ip.status === 'damaged').length || 0;
      const totalCount = individualProducts?.length || 0;
      
      console.log('\n📊 Individual Products:');
      console.log(`   Total Individual Products: ${totalCount}`);
      console.log(`   Available: ${availableCount}`);
      console.log(`   Sold: ${soldCount}`);
      console.log(`   Reserved: ${reservedCount}`);
      console.log(`   Damaged: ${damagedCount}`);
      
      if (product.individual_stock_tracking) {
        console.log(`\n✅ Expected Available Count: ${availableCount} (from individual products)`);
        console.log(`   Current Stock in DB: ${product.current_stock || 0}`);
        if (product.current_stock !== availableCount) {
          console.log(`   ⚠️ MISMATCH: Database shows ${product.current_stock} but actual available count is ${availableCount}`);
        } else {
          console.log(`   ✅ Match: Database count matches actual available count`);
        }
      }
    }
    
    // 3. Check material consumption for this product
    const { data: materialConsumption, error: consumptionError } = await supabase
      .from('material_consumption')
      .select('*')
      .eq('material_id', productId)
      .order('consumed_at', { ascending: false })
      .limit(5);
    
    if (consumptionError) {
      console.error('❌ Error fetching material consumption:', consumptionError);
    } else if (materialConsumption && materialConsumption.length > 0) {
      console.log('\n📋 Recent Material Consumption:');
      materialConsumption.forEach((mc, index) => {
        console.log(`   ${index + 1}. Batch: ${mc.production_batch_id}`);
        console.log(`      Quantity Used: ${mc.quantity_used || 0} ${mc.unit || ''}`);
        console.log(`      Individual Product IDs: ${mc.individual_product_ids?.length || 0} products`);
        console.log(`      Consumed At: ${new Date(mc.consumed_at).toLocaleString()}`);
      });
    }
    
    console.log('\n✅ Check complete!\n');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run the check
checkProductQuantity('PRO-251113-001').then(() => {
  process.exit(0);
}).catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

