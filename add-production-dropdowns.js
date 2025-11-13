import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

// Load environment variables
config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in environment variables');
  console.error('Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function addProductionDropdowns() {
  console.log('🚀 Starting to add production dropdown options...\n');

  try {
    // Priority Options
    console.log('📝 Adding Priority Options...');
    const priorityOptions = [
      { category: 'priority', value: 'low', display_order: 1 },
      { category: 'priority', value: 'normal', display_order: 2 },
      { category: 'priority', value: 'high', display_order: 3 },
      { category: 'priority', value: 'urgent', display_order: 4 }
    ];

    for (const option of priorityOptions) {
      const { error } = await supabase
        .from('dropdown_options')
        .upsert({
          ...option,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'category,value'
        });

      if (error) {
        console.error(`  ❌ Error adding ${option.value}:`, error.message);
      } else {
        console.log(`  ✅ Added: ${option.value}`);
      }
    }

    // Quality Grade Options
    console.log('\n📝 Adding Quality Grade Options...');
    const qualityOptions = [
      { category: 'quality_grade', value: 'A', display_order: 1 },
      { category: 'quality_grade', value: 'B', display_order: 2 },
      { category: 'quality_grade', value: 'C', display_order: 3 },
      { category: 'quality_grade', value: 'D', display_order: 4 },
      { category: 'quality_grade', value: 'Rejected', display_order: 5 }
    ];

    for (const option of qualityOptions) {
      const { error } = await supabase
        .from('dropdown_options')
        .upsert({
          ...option,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'category,value'
        });

      if (error) {
        console.error(`  ❌ Error adding ${option.value}:`, error.message);
      } else {
        console.log(`  ✅ Added: ${option.value}`);
      }
    }

    // Waste Type Options
    console.log('\n📝 Adding Waste Type Options...');
    const wasteOptions = [
      { category: 'waste_type', value: 'material_excess', display_order: 1 },
      { category: 'waste_type', value: 'cutting_waste', display_order: 2 },
      { category: 'waste_type', value: 'damaged_material', display_order: 3 },
      { category: 'waste_type', value: 'quality_rejection', display_order: 4 },
      { category: 'waste_type', value: 'production_scrap', display_order: 5 },
      { category: 'waste_type', value: 'trimming_waste', display_order: 6 },
      { category: 'waste_type', value: 'defective_product', display_order: 7 },
      { category: 'waste_type', value: 'spillage', display_order: 8 },
      { category: 'waste_type', value: 'other', display_order: 9 }
    ];

    for (const option of wasteOptions) {
      const { error } = await supabase
        .from('dropdown_options')
        .upsert({
          ...option,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'category,value'
        });

      if (error) {
        console.error(`  ❌ Error adding ${option.value}:`, error.message);
      } else {
        console.log(`  ✅ Added: ${option.value}`);
      }
    }

    // Verify insertions
    console.log('\n📊 Verifying insertions...');
    
    const { data: priorityCount } = await supabase
      .from('dropdown_options')
      .select('*', { count: 'exact', head: true })
      .eq('category', 'priority')
      .eq('is_active', true);
    
    const { data: qualityCount } = await supabase
      .from('dropdown_options')
      .select('*', { count: 'exact', head: true })
      .eq('category', 'quality_grade')
      .eq('is_active', true);
    
    const { data: wasteCount } = await supabase
      .from('dropdown_options')
      .select('*', { count: 'exact', head: true })
      .eq('category', 'waste_type')
      .eq('is_active', true);

    console.log(`  ✅ Priority Options: ${priorityOptions.length} added`);
    console.log(`  ✅ Quality Grade Options: ${qualityOptions.length} added`);
    console.log(`  ✅ Waste Type Options: ${wasteOptions.length} added`);

    console.log('\n✅ All production dropdown options have been added successfully!');
    console.log('\n📋 Summary:');
    console.log('   • 4 Priority options (Low, Normal, High, Urgent)');
    console.log('   • 5 Quality Grade options (A, B, C, D, Rejected)');
    console.log('   • 9 Waste Type options (Material Excess, Cutting Waste, etc.)');

  } catch (error) {
    console.error('\n❌ Error adding dropdown options:', error);
    process.exit(1);
  }
}

// Run the function
addProductionDropdowns();

