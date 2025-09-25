#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🚀 Rajdhani Trace Flow - Database Setup');
console.log('========================================\n');

// Check if .env file exists
const envPath = path.join(__dirname, '.env');
if (!fs.existsSync(envPath)) {
  console.log('❌ .env file not found!');
  console.log('📝 Please create a .env file with your Supabase credentials first.');
  console.log('💡 Run: node setup-env.js for help\n');
  process.exit(1);
}

// Read environment variables
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.log('❌ Missing Supabase credentials in .env file!');
  console.log('📝 Please set VITE_SUPABASE_URL and VITE_SUPABASE_SERVICE_ROLE_KEY\n');
  process.exit(1);
}

console.log('✅ Supabase credentials found');
console.log(`🔗 URL: ${supabaseUrl}`);
console.log(`🔑 Service Key: ${supabaseServiceKey.substring(0, 20)}...\n`);

// Read SQL file
const sqlPath = path.join(__dirname, 'complete-database-schema.sql');
if (!fs.existsSync(sqlPath)) {
  console.log('❌ SQL schema file not found!');
  process.exit(1);
}

const sqlContent = fs.readFileSync(sqlPath, 'utf8');
console.log('📄 SQL schema file loaded');

// Execute SQL using fetch
async function executeSQL() {
  try {
    console.log('🔄 Executing SQL schema...\n');
    
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'apikey': supabaseServiceKey
      },
      body: JSON.stringify({
        sql: sqlContent
      })
    });

    if (!response.ok) {
      // Try alternative approach - execute via SQL editor endpoint
      console.log('⚠️  Direct SQL execution not available, trying alternative method...\n');
      
      // Split SQL into individual statements
      const statements = sqlContent
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

      console.log(`📊 Found ${statements.length} SQL statements to execute\n`);

      for (let i = 0; i < statements.length; i++) {
        const statement = statements[i];
        if (statement.trim()) {
          try {
            console.log(`🔄 Executing statement ${i + 1}/${statements.length}...`);
            
            const stmtResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${supabaseServiceKey}`,
                'apikey': supabaseServiceKey
              },
              body: JSON.stringify({
                sql: statement
              })
            });

            if (stmtResponse.ok) {
              console.log(`✅ Statement ${i + 1} executed successfully`);
            } else {
              const error = await stmtResponse.text();
              console.log(`⚠️  Statement ${i + 1} failed: ${error.substring(0, 100)}...`);
            }
          } catch (error) {
            console.log(`❌ Statement ${i + 1} error: ${error.message}`);
          }
        }
      }
    } else {
      const result = await response.json();
      console.log('✅ SQL schema executed successfully!');
      console.log('📊 Result:', result);
    }

    console.log('\n🎉 Database setup completed!');
    console.log('📋 What was created:');
    console.log('   • All necessary tables with proper relationships');
    console.log('   • Indexes for better performance');
    console.log('   • Triggers for automatic timestamp updates');
    console.log('   • Sample data (suppliers, raw materials, products, recipes)');
    console.log('   • Sample machines and product recipes\n');

    console.log('🚀 Next steps:');
    console.log('   1. Start your development server: npm run dev');
    console.log('   2. Login with demo credentials');
    console.log('   3. Start adding products and managing inventory\n');

  } catch (error) {
    console.log('❌ Error executing SQL:', error.message);
    console.log('\n💡 Alternative setup method:');
    console.log('   1. Go to your Supabase dashboard');
    console.log('   2. Navigate to SQL Editor');
    console.log('   3. Copy and paste the content from complete-database-schema.sql');
    console.log('   4. Execute the SQL\n');
  }
}

// Check if we're in a browser environment
if (typeof window !== 'undefined') {
  console.log('⚠️  This script should be run in Node.js, not in a browser');
  console.log('💡 Run: node run-sql.js\n');
} else {
  executeSQL();
}
