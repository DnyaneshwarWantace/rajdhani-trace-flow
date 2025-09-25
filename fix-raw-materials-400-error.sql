-- Fix 400 error on raw_materials table
-- This script ensures the raw_materials table has all required fields

-- First, let's check if we need to add missing columns
ALTER TABLE raw_materials 
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Ensure all required fields exist with correct types
ALTER TABLE raw_materials 
ALTER COLUMN id TYPE VARCHAR(50),
ALTER COLUMN supplier_id TYPE VARCHAR(50),
ALTER COLUMN current_stock TYPE DECIMAL(10,2),
ALTER COLUMN min_threshold TYPE DECIMAL(10,2),
ALTER COLUMN max_capacity TYPE DECIMAL(10,2),
ALTER COLUMN reorder_point TYPE DECIMAL(10,2),
ALTER COLUMN daily_usage TYPE DECIMAL(10,2),
ALTER COLUMN cost_per_unit TYPE DECIMAL(10,2),
ALTER COLUMN total_value TYPE DECIMAL(12,2),
ALTER COLUMN supplier_performance TYPE DECIMAL(3,2);

-- Update any NULL values to defaults
UPDATE raw_materials SET 
    current_stock = COALESCE(current_stock, 0),
    min_threshold = COALESCE(min_threshold, 10),
    max_capacity = COALESCE(max_capacity, 1000),
    reorder_point = COALESCE(reorder_point, 50),
    daily_usage = COALESCE(daily_usage, 0),
    cost_per_unit = COALESCE(cost_per_unit, 0),
    total_value = COALESCE(total_value, 0),
    supplier_performance = COALESCE(supplier_performance, 0),
    status = COALESCE(status, 'in-stock')
WHERE current_stock IS NULL 
   OR min_threshold IS NULL 
   OR max_capacity IS NULL 
   OR reorder_point IS NULL 
   OR daily_usage IS NULL 
   OR cost_per_unit IS NULL 
   OR total_value IS NULL 
   OR supplier_performance IS NULL 
   OR status IS NULL;

-- Make sure required fields are NOT NULL
ALTER TABLE raw_materials 
ALTER COLUMN current_stock SET NOT NULL,
ALTER COLUMN min_threshold SET NOT NULL,
ALTER COLUMN max_capacity SET NOT NULL,
ALTER COLUMN reorder_point SET NOT NULL,
ALTER COLUMN daily_usage SET NOT NULL,
ALTER COLUMN cost_per_unit SET NOT NULL,
ALTER COLUMN total_value SET NOT NULL,
ALTER COLUMN supplier_performance SET NOT NULL,
ALTER COLUMN status SET NOT NULL;

-- Set default values
ALTER TABLE raw_materials 
ALTER COLUMN current_stock SET DEFAULT 0,
ALTER COLUMN min_threshold SET DEFAULT 10,
ALTER COLUMN max_capacity SET DEFAULT 1000,
ALTER COLUMN reorder_point SET DEFAULT 50,
ALTER COLUMN daily_usage SET DEFAULT 0,
ALTER COLUMN cost_per_unit SET DEFAULT 0,
ALTER COLUMN total_value SET DEFAULT 0,
ALTER COLUMN supplier_performance SET DEFAULT 0,
ALTER COLUMN status SET DEFAULT 'in-stock';

COMMIT;
