import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   VITE_SUPABASE_URL:', supabaseUrl ? '✅' : '❌');
  console.error('   VITE_SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceRoleKey ? '✅' : '❌');
  console.error('\nPlease check your .env file and ensure all required variables are set.');
  process.exit(1);
}

// Create Supabase client with service role key for full access
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function runDropdownSQL() {
  try {
    console.log('🚀 Starting dropdown options SQL execution...');
    
    // Read the SQL file
    const sqlFilePath = path.join(__dirname, 'dropdown-options.sql');
    
    if (!fs.existsSync(sqlFilePath)) {
      console.error('❌ SQL file not found:', sqlFilePath);
      process.exit(1);
    }
    
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    console.log('📄 SQL file loaded successfully');
    
    // Extract INSERT statements (skip comments and empty lines)
    const lines = sqlContent.split('\n');
    const insertStatements = [];
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine.startsWith('INSERT INTO') && !trimmedLine.startsWith('--')) {
        // Remove trailing comma if present
        const cleanStatement = trimmedLine.replace(/,$/, '');
        insertStatements.push(cleanStatement);
      }
    }
    
    console.log(`📊 Found ${insertStatements.length} INSERT statements`);
    
    let successCount = 0;
    let errorCount = 0;
    
    // Execute each INSERT statement
    for (let i = 0; i < insertStatements.length; i++) {
      const statement = insertStatements[i];
      
      try {
        console.log(`\n🔄 Executing INSERT ${i + 1}/${insertStatements.length}...`);
        
        // Use the REST API to execute the SQL
        const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceRoleKey}`,
            'apikey': supabaseServiceRoleKey
          },
          body: JSON.stringify({ sql_query: statement })
        });
        
        if (response.ok) {
          console.log(`✅ INSERT ${i + 1} executed successfully`);
          successCount++;
        } else {
          const errorData = await response.text();
          console.error(`❌ Error in INSERT ${i + 1}:`, errorData);
          errorCount++;
        }
      } catch (err) {
        console.error(`❌ Exception in INSERT ${i + 1}:`, err.message);
        errorCount++;
      }
    }
    
    console.log('\n📈 Execution Summary:');
    console.log(`   ✅ Successful: ${successCount}`);
    console.log(`   ❌ Failed: ${errorCount}`);
    console.log(`   📊 Total: ${insertStatements.length}`);
    
    if (errorCount === 0) {
      console.log('\n🎉 All dropdown options have been successfully inserted!');
      
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
    } else {
      console.log('\n⚠️  Some statements failed. Please check the errors above.');
    }
    
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  }
}

// Run the script
runDropdownSQL();
