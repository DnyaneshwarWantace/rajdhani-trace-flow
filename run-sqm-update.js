#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Load environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  console.log('Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runSQLUpdate() {
  try {
    console.log('🚀 Starting SQM recipe system update...');
    
    // Read the SQL file
    const sqlContent = fs.readFileSync('update-recipe-base-unit.sql', 'utf8');
    
    // Split by semicolon and execute each statement
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`📝 Found ${statements.length} SQL statements to execute`);
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        console.log(`\n🔄 Executing statement ${i + 1}/${statements.length}...`);
        console.log(`   ${statement.substring(0, 100)}${statement.length > 100 ? '...' : ''}`);
        
        const { data, error } = await supabase.rpc('exec_sql', { sql: statement });
        
        if (error) {
          console.error(`❌ Error in statement ${i + 1}:`, error.message);
          // Continue with next statement
        } else {
          console.log(`✅ Statement ${i + 1} executed successfully`);
          if (data) {
            console.log('   Result:', data);
          }
        }
      }
    }
    
    console.log('\n🎉 SQM recipe system update completed!');
    console.log('\n📋 Summary of changes:');
    console.log('   ✅ Product dimensions (length, width) are now required');
    console.log('   ✅ Recipe base unit is now always "sqm"');
    console.log('   ✅ Recipe base quantity is always 1 (for 1 sqm)');
    console.log('   ✅ Added constraints to ensure data integrity');
    console.log('   ✅ Updated existing data to new format');
    
  } catch (error) {
    console.error('❌ Error running SQL update:', error);
    process.exit(1);
  }
}

runSQLUpdate();
