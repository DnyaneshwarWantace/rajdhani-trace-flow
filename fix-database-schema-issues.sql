-- Fix individual product ID length issue

-- 1. Fix individual_products table - ensure id column is VARCHAR(100) or larger
ALTER TABLE individual_products ALTER COLUMN id TYPE VARCHAR(100);

-- 2. Fix production_flow_steps table - add missing end_time column  
ALTER TABLE production_flow_steps ADD COLUMN IF NOT EXISTS end_time TIMESTAMP;

-- 4. Update the endTime reference to end_time in the update function
-- (This will be handled in the code, but ensure the column exists)

-- 5. Ensure all ID columns are properly sized
ALTER TABLE individual_products ALTER COLUMN qr_code TYPE VARCHAR(255);
ALTER TABLE individual_products ALTER COLUMN batch_number TYPE VARCHAR(100);

-- 6. Add any missing indexes
CREATE INDEX IF NOT EXISTS idx_individual_products_qr_code ON individual_products(qr_code);
CREATE INDEX IF NOT EXISTS idx_individual_products_batch_number ON individual_products(batch_number);
CREATE INDEX IF NOT EXISTS idx_production_flow_steps_end_time ON production_flow_steps(end_time);

-- 7. Update RLS policies if needed
ALTER TABLE individual_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_flow_steps ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Enable all operations for individual_products" ON individual_products;
DROP POLICY IF EXISTS "Enable all operations for production_flow_steps" ON production_flow_steps;

-- Create permissive policies for development
CREATE POLICY "Enable all operations for individual_products" ON individual_products FOR ALL USING (true);
CREATE POLICY "Enable all operations for production_flow_steps" ON production_flow_steps FOR ALL USING (true);
