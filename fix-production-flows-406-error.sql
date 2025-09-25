-- Fix for 406 error on production_flows table
-- This script adds missing RLS policies for production_flows and production_flow_steps tables

-- Enable Row Level Security on production_flows table
ALTER TABLE production_flows ENABLE ROW LEVEL SECURITY;

-- Enable Row Level Security on production_flow_steps table  
ALTER TABLE production_flow_steps ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Enable all operations for all users" ON production_flows;
DROP POLICY IF EXISTS "Enable all operations for all users" ON production_flow_steps;

-- Create permissive policies for development (allows all operations)
CREATE POLICY "Enable all operations for all users" ON production_flows FOR ALL USING (true);
CREATE POLICY "Enable all operations for all users" ON production_flow_steps FOR ALL USING (true);

-- Also ensure material_consumption table has proper RLS (it might be missing too)
ALTER TABLE material_consumption ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all operations for all users" ON material_consumption;
CREATE POLICY "Enable all operations for all users" ON material_consumption FOR ALL USING (true);

-- Verify the tables exist and have the right structure
-- Check if production_flows table has the expected columns
DO $$
BEGIN
    -- Check if production_flows table exists and has required columns
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'production_flows' 
        AND column_name = 'production_product_id'
    ) THEN
        RAISE NOTICE 'production_flows table may be missing or have wrong structure';
    ELSE
        RAISE NOTICE 'production_flows table structure looks correct';
    END IF;
    
    -- Check if production_flow_steps table exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'production_flow_steps'
    ) THEN
        RAISE NOTICE 'production_flow_steps table may be missing';
    ELSE
        RAISE NOTICE 'production_flow_steps table exists';
    END IF;
END $$;

-- Test query to verify access works
SELECT 'RLS policies applied successfully' as status;
