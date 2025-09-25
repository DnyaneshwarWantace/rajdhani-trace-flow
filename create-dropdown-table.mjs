import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

async function createDropdownTable() {
  try {
    console.log('🚀 Creating dropdown_options table...');
    
    // Read the SQL file
    const sqlFilePath = path.join(__dirname, 'create-dropdown-table.sql');
    
    if (!fs.existsSync(sqlFilePath)) {
      console.error('❌ SQL file not found:', sqlFilePath);
      process.exit(1);
    }
    
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    console.log('📄 SQL file loaded successfully');
    
    // Split the SQL content into individual statements
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`📊 Found ${statements.length} SQL statements to execute`);
    
    let successCount = 0;
    let errorCount = 0;
    
    // Execute each statement using the REST API
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      try {
        console.log(`\n🔄 Executing statement ${i + 1}/${statements.length}...`);
        
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
          console.log(`✅ Statement ${i + 1} executed successfully`);
          successCount++;
        } else {
          const errorData = await response.text();
          console.error(`❌ Error in statement ${i + 1}:`, errorData);
          errorCount++;
        }
      } catch (err) {
        console.error(`❌ Exception in statement ${i + 1}:`, err.message);
        errorCount++;
      }
    }
    
    console.log('\n📈 Execution Summary:');
    console.log(`   ✅ Successful: ${successCount}`);
    console.log(`   ❌ Failed: ${errorCount}`);
    console.log(`   📊 Total: ${statements.length}`);
    
    if (errorCount === 0) {
      console.log('\n🎉 Dropdown options table created successfully!');
      
      // Verify the table was created
      console.log('\n🔍 Verifying table creation...');
      const { data: tables, error: tableError } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .eq('table_name', 'dropdown_options');
      
      if (tableError) {
        console.error('❌ Error verifying table:', tableError);
      } else if (tables && tables.length > 0) {
        console.log('✅ Table "dropdown_options" exists in the database');
      } else {
        console.log('⚠️  Table "dropdown_options" not found in the database');
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
createDropdownTable();
