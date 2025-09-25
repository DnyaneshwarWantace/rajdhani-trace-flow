import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   VITE_SUPABASE_URL:', supabaseUrl ? '✅' : '❌');
  console.error('   VITE_SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceRoleKey ? '✅' : '❌');
  process.exit(1);
}

// Create Supabase client with service role key for full access
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

// Dropdown options data
const dropdownOptions = [
  // Color Options
  { id: '09dbdaf7-e4ad-4d33-af55-84e0f234676a', category: 'color', value: 'White', display_order: 6, is_active: true },
  { id: '244f0744-d6b9-44f0-a6f5-63d6c7ba4d3d', category: 'color', value: 'Gray', display_order: 8, is_active: true },
  { id: '3ddab84d-9478-409d-bdb7-079074d1d826', category: 'color', value: 'Blue', display_order: 2, is_active: true },
  { id: '5fbac573-40d7-431c-b60d-458e0df81df2', category: 'color', value: 'Brown', display_order: 7, is_active: true },
  { id: '6a2b8a61-cac2-4f66-8d0f-ecb3058f103f', category: 'color', value: 'NA', display_order: 10, is_active: true },
  { id: 'b64f4d4d-dcb4-4cce-87a1-3da02605c565', category: 'color', value: 'Black', display_order: 5, is_active: true },
  { id: 'd1b29b10-e37c-4749-aa29-6779a9f747df', category: 'color', value: 'Green', display_order: 3, is_active: true },
  { id: 'e7ceed29-2fc1-43b7-a4ca-7877ce7e17e5', category: 'color', value: 'Multi-color', display_order: 9, is_active: true },
  { id: 'eb8c9dee-417e-472c-8ded-eb34058b8112', category: 'color', value: 'Yellow', display_order: 4, is_active: true },
  { id: 'f207fba3-9875-405e-a443-c90c06e73b1a', category: 'color', value: 'Red', display_order: 1, is_active: true },

  // Pattern Options
  { id: '3b82d127-8136-4e78-bfb6-72ae3a33af62', category: 'pattern', value: 'Abstract', display_order: 4, is_active: true },
  { id: '41131be9-67cd-4849-ae24-5ecd01c6e9be', category: 'pattern', value: 'Modern', display_order: 6, is_active: true },
  { id: '4983ffec-1090-4277-8893-34d2cefcd5c9', category: 'pattern', value: 'Traditional', display_order: 5, is_active: true },
  { id: '5340f3ed-1dfc-4226-9b5f-6feb623bbebc', category: 'pattern', value: 'Geometric', display_order: 2, is_active: true },
  { id: '94ab6531-2fe0-4488-bf3e-f0fbfc9b1cf7', category: 'pattern', value: 'RD-1009', display_order: 999, is_active: true },
  { id: '9cab8ba6-0460-4b61-bd92-937436fa05da', category: 'pattern', value: 'Persian Medallion', display_order: 1, is_active: true },
  { id: 'bf57928c-89be-4f9e-84e7-526a769216c1', category: 'pattern', value: 'Standard', display_order: 8, is_active: true },
  { id: 'db6b240c-adc8-4cd7-aace-c93aa36b2054', category: 'pattern', value: 'Floral', display_order: 3, is_active: true },
  { id: 'f634529a-0cb3-47c2-aa54-699ab82fdc2d', category: 'pattern', value: 'Digital Art', display_order: 7, is_active: true },

  // Category Options
  { id: 'b25fb799-6184-488d-b876-271ae93d3872', category: 'category', value: 'raw material', display_order: 5, is_active: true },
  { id: 'c746264c-b27d-4e98-85c6-129b4fd877ba', category: 'category', value: 'degital print', display_order: 2, is_active: true },
  { id: 'c75b7139-2c42-414b-94ec-6862daff5a68', category: 'category', value: 'felt', display_order: 4, is_active: true },
  { id: 'cb358c3d-6b0f-435c-a028-a762a8b65a4b', category: 'category', value: 'backing', display_order: 3, is_active: true },
  { id: 'fa15fb77-113a-433b-b007-f85216d87442', category: 'category', value: 'plain paper print', display_order: 1, is_active: true },

  // Unit Options
  { id: '33fb47ad-6aee-4f83-a918-c154d457aa81', category: 'unit', value: 'roll', display_order: 1, is_active: true },
  { id: '87a557c8-e97a-4053-b2cc-088c229236c5', category: 'unit', value: 'GSM', display_order: 2, is_active: true },
  { id: 'edfebc18-2675-4303-9b85-a2e315206e00', category: 'unit', value: 'liter', display_order: 4, is_active: true },
  { id: 'ff9695c2-9f57-4ba8-84c0-ff0f19e7480f', category: 'unit', value: 'kg', display_order: 3, is_active: true },

  // Width Options
  { id: '2633f78a-ee98-4e1e-8184-611e8d815208', category: 'width', value: '6 feet', display_order: 2, is_active: true },
  { id: '3f27eeb2-8cd3-4d2d-8bb0-c2579448a78e', category: 'width', value: '10 feet', display_order: 3, is_active: true },
  { id: '4be8f612-4e66-4f7c-9e24-d04d9b4344ab', category: 'width', value: '1.83 meter', display_order: 5, is_active: true },
  { id: '5d544899-dece-47be-a3b9-9bcba6e684b0', category: 'width', value: '3.05 meter', display_order: 6, is_active: true },
  { id: '95dc70e6-a625-4163-8300-df97f7829b5a', category: 'width', value: '5 feet', display_order: 1, is_active: true },
  { id: 'b5ef0520-6563-4ff3-8206-654a658216a7', category: 'width', value: '1.25 meter', display_order: 4, is_active: true },

  // Height Options
  { id: '35e88d3d-2419-43dd-9c49-fafe7cfc04b1', category: 'height', value: '45 meter', display_order: 2, is_active: true },
  { id: 'dc7dc1c4-3314-4556-b283-e990ad340339', category: 'height', value: '148 feet', display_order: 1, is_active: true },

  // Weight Options
  { id: '43bdc67c-aa9e-4083-98c9-08d27277e792', category: 'weight', value: '700 GSM', display_order: 3, is_active: true },
  { id: '8d300a48-fafe-4e03-90ed-bf0bbd854b6c', category: 'weight', value: '400 GSM', display_order: 1, is_active: true },
  { id: 'b9f8c968-8b5d-487d-948f-d4932942de9c', category: 'weight', value: '600 GSM', display_order: 2, is_active: true },
  { id: 'cb04b071-a300-4113-b20c-bd3125207ad2', category: 'weight', value: '800 GSM', display_order: 4, is_active: true },

  // Thickness Options
  { id: '7d930af7-cb4c-45be-9726-9eebb7624379', category: 'thickness', value: '12mm', display_order: 5, is_active: true },
  { id: '865b4c1d-46ef-45f5-9105-06220e8f22cb', category: 'thickness', value: '10mm', display_order: 3, is_active: true },
  { id: '8e00b15f-db5a-4a35-bec3-a8e011e93cee', category: 'thickness', value: '8mm', display_order: 2, is_active: true },
  { id: '8e108892-1303-444f-ad45-4ca208f222b1', category: 'thickness', value: '15mm', display_order: 6, is_active: true },
  { id: 'b1504bbe-4815-412c-b0b4-8dedbf5b176e', category: 'thickness', value: '3 mm', display_order: 999, is_active: true },
  { id: 'bb946125-33f2-4012-b7ec-8e11b0218c0d', category: 'thickness', value: '5mm', display_order: 1, is_active: true },
  { id: 'e08dd066-97f9-4d69-bf69-bba22c2f56dc', category: 'thickness', value: '11mm', display_order: 4, is_active: true }
];

async function insertDropdownOptions() {
  try {
    console.log('🚀 Starting dropdown options insertion...');
    console.log(`📊 Found ${dropdownOptions.length} dropdown options to insert`);
    
    // First, clear existing data (optional)
    console.log('🗑️  Clearing existing dropdown options...');
    const { error: deleteError } = await supabase
      .from('dropdown_options')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records
    
    if (deleteError) {
      console.warn('⚠️  Warning: Could not clear existing data:', deleteError.message);
    } else {
      console.log('✅ Existing data cleared');
    }
    
    // Insert all dropdown options
    console.log('📝 Inserting dropdown options...');
    const { data, error } = await supabase
      .from('dropdown_options')
      .insert(dropdownOptions)
      .select();
    
    if (error) {
      console.error('❌ Error inserting dropdown options:', error);
      process.exit(1);
    }
    
    console.log(`✅ Successfully inserted ${data.length} dropdown options!`);
    
    // Verify the data was inserted
    console.log('\n🔍 Verifying inserted data...');
    const { data: verificationData, error: verificationError } = await supabase
      .from('dropdown_options')
      .select('category, value, display_order')
      .eq('is_active', true)
      .order('category, display_order');
    
    if (verificationError) {
      console.error('❌ Error verifying data:', verificationError);
    } else {
      console.log('📊 Verification successful! Data summary:');
      
      // Group by category
      const groupedData = verificationData.reduce((acc, item) => {
        if (!acc[item.category]) {
          acc[item.category] = [];
        }
        acc[item.category].push(item.value);
        return acc;
      }, {});
      
      Object.entries(groupedData).forEach(([category, values]) => {
        console.log(`   ${category}: ${values.length} options (${values.slice(0, 3).join(', ')}${values.length > 3 ? '...' : ''})`);
      });
    }
    
    console.log('\n🎉 Dropdown options insertion completed successfully!');
    
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  }
}

// Run the script
insertDropdownOptions();
