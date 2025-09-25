#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 Rajdhani Trace Flow - Environment Setup');
console.log('==========================================\n');

// Check if .env file exists
const envPath = path.join(__dirname, '.env');
const envExamplePath = path.join(__dirname, 'env.example');

if (fs.existsSync(envPath)) {
  console.log('✅ .env file already exists');
  console.log('📝 Please update the following variables in your .env file:\n');
} else {
  console.log('📝 Creating .env file from template...');
  
  if (fs.existsSync(envExamplePath)) {
    const envContent = fs.readFileSync(envExamplePath, 'utf8');
    fs.writeFileSync(envPath, envContent);
    console.log('✅ .env file created successfully\n');
  } else {
    // Create basic .env file
    const basicEnvContent = `# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Example:
# VITE_SUPABASE_URL=https://your-project-id.supabase.co
# VITE_SUPABASE_ANON_KEY=your-anon-key-here
# VITE_SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
`;
    fs.writeFileSync(envPath, basicEnvContent);
    console.log('✅ Basic .env file created\n');
  }
}

console.log('🔑 Required Environment Variables:');
console.log('===================================');
console.log('1. VITE_SUPABASE_URL - Your Supabase project URL');
console.log('   Example: https://your-project-id.supabase.co\n');

console.log('2. VITE_SUPABASE_ANON_KEY - Your Supabase anonymous key');
console.log('   Found in: Supabase Dashboard > Settings > API > anon public\n');

console.log('3. VITE_SUPABASE_SERVICE_ROLE_KEY - Your Supabase service role key');
console.log('   Found in: Supabase Dashboard > Settings > API > service_role secret');
console.log('   ⚠️  This key bypasses RLS policies - keep it secure!\n');

console.log('📋 Steps to get your keys:');
console.log('==========================');
console.log('1. Go to your Supabase project dashboard');
console.log('2. Navigate to Settings > API');
console.log('3. Copy the Project URL and paste it as VITE_SUPABASE_URL');
console.log('4. Copy the anon public key and paste it as VITE_SUPABASE_ANON_KEY');
console.log('5. Copy the service_role secret key and paste it as VITE_SUPABASE_SERVICE_ROLE_KEY');
console.log('6. Save the .env file and restart your development server\n');

console.log('🚀 After setting up the environment variables:');
console.log('==============================================');
console.log('1. Run: npm run dev (or your preferred dev command)');
console.log('2. The app will use the service role key to bypass RLS policies');
console.log('3. You can now add products and manage inventory without RLS restrictions\n');

console.log('⚠️  Security Note:');
console.log('==================');
console.log('The service role key has full database access and bypasses all RLS policies.');
console.log('Only use it in development or in a secure server environment.');
console.log('Never commit the .env file to version control!\n');

console.log('✅ Setup complete! Please update your .env file with the actual values.');
