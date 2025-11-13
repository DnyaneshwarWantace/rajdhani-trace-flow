// Simple script to add individual_product_ids column
// Run this with: node run-sql-add-column.js

import { createClient } from '@supabase/supabase-js';

// Replace with your actual Supabase credentials
const supabaseUrl = process.env.SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function addColumn() {
  try {
    console.log('🔧 Adding individual_product_ids column to material_consumption table...');
    
    // Method 1: Try using rpc if you have exec_sql function
    try {
      const { data, error } = await supabase.rpc('exec_sql', {
        sql: `
          ALTER TABLE material_consumption 
          ADD COLUMN individual_product_ids TEXT[];
          
          COMMENT ON COLUMN material_consumption.individual_product_ids IS 'Array of individual product IDs that were consumed in this production batch';
          
          CREATE INDEX IF NOT EXISTS idx_material_consumption_individual_product_ids 
          ON material_consumption USING GIN (individual_product_ids);
        `
      });
      
      if (error) {
        console.log('⚠️ RPC method failed, trying direct SQL...');
        throw error;
      }
      
      console.log('✅ Successfully added column using RPC method');
      return;
      
    } catch (rpcError) {
      console.log('📝 RPC method not available, please run the SQL manually in your Supabase dashboard:');
      console.log('');
      console.log('-- Copy and paste this SQL into your Supabase SQL Editor:');
      console.log('');
      console.log('ALTER TABLE material_consumption');
      console.log('ADD COLUMN individual_product_ids TEXT[];');
      console.log('');
      console.log('COMMENT ON COLUMN material_consumption.individual_product_ids IS \'Array of individual product IDs that were consumed in this production batch\';');
      console.log('');
      console.log('CREATE INDEX IF NOT EXISTS idx_material_consumption_individual_product_ids');
      console.log('ON material_consumption USING GIN (individual_product_ids);');
      console.log('');
      console.log('-- Verify the column was added:');
      console.log('SELECT column_name, data_type, is_nullable');
      console.log('FROM information_schema.columns');
      console.log('WHERE table_name = \'material_consumption\'');
      console.log('AND column_name = \'individual_product_ids\';');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

addColumn();
