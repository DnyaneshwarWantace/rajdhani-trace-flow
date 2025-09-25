# Environment Setup Guide for Raw Materials 400 Error Fix

## Issue
You're getting a 400 error when accessing the raw_materials endpoint: `rysixsktewsnlmezmprg.supabase.co/rest/v1/raw_materials`

## Root Causes
1. **Missing Environment Configuration**: No `.env` file with Supabase credentials
2. **Database Schema Issues**: Raw materials table might not exist or have incorrect schema
3. **Row Level Security (RLS)**: Missing or incorrect RLS policies

## Solution Steps

### Step 1: Create Environment File
Create a `.env` file in the `rajdhani-trace-flow` directory with the following content:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://rysixsktewsnlmezmprg.supabase.co
VITE_SUPABASE_ANON_KEY=your_actual_anon_key_here
VITE_SUPABASE_SERVICE_ROLE_KEY=your_actual_service_role_key_here

# Development Configuration
NODE_ENV=development
VITE_APP_NAME=Rajdhani ERP
VITE_APP_VERSION=1.0.0
```

### Step 2: Get Your Supabase Keys
1. Go to your Supabase project dashboard: https://supabase.com/dashboard/project/rysixsktewsnlmezmprg
2. Navigate to **Settings** > **API**
3. Copy the **anon public** key and **service_role** key
4. Replace the placeholder values in your `.env` file

### Step 3: Execute Database Fix
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the contents of `fix-raw-materials-400-complete.sql`
4. Click **Run** to execute the script

### Step 4: Test the Fix
1. Restart your development server: `npm run dev`
2. Navigate to the Materials page in your application
3. The raw materials should now load without the 400 error

## What the Fix Does
- Creates the `raw_materials` table with correct schema
- Creates the `suppliers` table for foreign key references
- Sets up proper Row Level Security policies
- Inserts sample data for testing
- Creates necessary indexes for performance
- Grants proper permissions

## Verification
After applying the fix, you should be able to:
- Access the raw materials endpoint without 400 errors
- See sample raw materials data in your application
- Create, update, and delete raw materials
- View supplier information

## Troubleshooting
If you still get errors:
1. Check that your `.env` file has the correct Supabase URL and keys
2. Verify the SQL script executed successfully in Supabase
3. Check the browser console for any additional error messages
4. Ensure your Supabase project is active and not paused
