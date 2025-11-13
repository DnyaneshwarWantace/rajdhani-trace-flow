// Script to add individual_product_ids column to material_consumption table
import { createClient } from '@supabase/supabase-js';

// You'll need to replace these with your actual Supabase credentials
const supabaseUrl = 'YOUR_SUPABASE_URL';
const supabaseKey = 'YOUR_SUPABASE_ANON_KEY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function addIndividualProductIdsColumn() {
  try {
    console.log('🔧 Adding individual_product_ids column to material_consumption table...');
    
    // Execute the SQL to add the column
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
      console.error('❌ Error adding column:', error);
      return;
    }
    
    console.log('✅ Successfully added individual_product_ids column to material_consumption table');
    
    // Verify the column was added
    const { data: columns, error: verifyError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_name', 'material_consumption')
      .eq('column_name', 'individual_product_ids');
    
    if (verifyError) {
      console.error('❌ Error verifying column:', verifyError);
      return;
    }
    
    console.log('🔍 Column verification:', columns);
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the function
addIndividualProductIdsColumn();
