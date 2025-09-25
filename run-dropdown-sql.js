const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Load environment variables
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
    const fs = require('fs');
    const path = require('path');
    const sqlFilePath = path.join(__dirname, 'dropdown-options.sql');
    
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
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      if (statement.toLowerCase().includes('insert into')) {
        try {
          console.log(`\n🔄 Executing statement ${i + 1}/${statements.length}...`);
          
          // For INSERT statements, we need to use the REST API
          const { data, error } = await supabase.rpc('exec_sql', { sql_query: statement });
          
          if (error) {
            console.error(`❌ Error in statement ${i + 1}:`, error.message);
            errorCount++;
          } else {
            console.log(`✅ Statement ${i + 1} executed successfully`);
            successCount++;
          }
        } catch (err) {
          console.error(`❌ Exception in statement ${i + 1}:`, err.message);
          errorCount++;
        }
      } else if (statement.toLowerCase().includes('select')) {
        try {
          console.log(`\n🔍 Executing query ${i + 1}/${statements.length}...`);
          
          const { data, error } = await supabase.rpc('exec_sql', { sql_query: statement });
          
          if (error) {
            console.error(`❌ Error in query ${i + 1}:`, error.message);
            errorCount++;
          } else {
            console.log(`✅ Query ${i + 1} executed successfully`);
            console.log('📊 Results:', data);
            successCount++;
          }
        } catch (err) {
          console.error(`❌ Exception in query ${i + 1}:`, err.message);
          errorCount++;
        }
      }
    }
    
    console.log('\n📈 Execution Summary:');
    console.log(`   ✅ Successful: ${successCount}`);
    console.log(`   ❌ Failed: ${errorCount}`);
    console.log(`   📊 Total: ${statements.length}`);
    
    if (errorCount === 0) {
      console.log('\n🎉 All dropdown options have been successfully inserted!');
    } else {
      console.log('\n⚠️  Some statements failed. Please check the errors above.');
    }
    
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  }
}

// Alternative method using direct SQL execution
async function runDropdownSQLAlternative() {
  try {
    console.log('🚀 Starting dropdown options SQL execution (Alternative method)...');
    
    // Read the SQL file
    const fs = require('fs');
    const path = require('path');
    const sqlFilePath = path.join(__dirname, 'dropdown-options.sql');
    
    if (!fs.existsSync(sqlFilePath)) {
      console.error('❌ SQL file not found:', sqlFilePath);
      process.exit(1);
    }
    
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    console.log('📄 SQL file loaded successfully');
    
    // Extract INSERT statements
    const insertStatements = sqlContent
      .split('\n')
      .filter(line => line.trim().startsWith('INSERT INTO'))
      .map(line => line.trim().replace(/,$/, '')); // Remove trailing comma
    
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
    } else {
      console.log('\n⚠️  Some statements failed. Please check the errors above.');
    }
    
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  }
}

// Check if we should use the alternative method
const useAlternative = process.argv.includes('--alternative');

if (useAlternative) {
  runDropdownSQLAlternative();
} else {
  runDropdownSQL();
}
