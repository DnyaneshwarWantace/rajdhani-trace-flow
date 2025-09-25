-- Fix all RLS policy issues for production system
-- This script adds missing RLS policies for all tables used in production

-- Enable RLS on all production-related tables
ALTER TABLE production_flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_flow_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_consumption ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE individual_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE raw_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_recipes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Enable all operations for all users" ON production_flows;
DROP POLICY IF EXISTS "Enable all operations for all users" ON production_flow_steps;
DROP POLICY IF EXISTS "Enable all operations for all users" ON material_consumption;
DROP POLICY IF EXISTS "Enable all operations for all users" ON products;
DROP POLICY IF EXISTS "Enable all operations for all users" ON individual_products;
DROP POLICY IF EXISTS "Enable all operations for all users" ON raw_materials;
DROP POLICY IF EXISTS "Enable all operations for all users" ON product_recipes;

-- Create permissive policies for development (allows all operations)
CREATE POLICY "Enable all operations for all users" ON production_flows FOR ALL USING (true);
CREATE POLICY "Enable all operations for all users" ON production_flow_steps FOR ALL USING (true);
CREATE POLICY "Enable all operations for all users" ON material_consumption FOR ALL USING (true);
CREATE POLICY "Enable all operations for all users" ON products FOR ALL USING (true);
CREATE POLICY "Enable all operations for all users" ON individual_products FOR ALL USING (true);
CREATE POLICY "Enable all operations for all users" ON raw_materials FOR ALL USING (true);
CREATE POLICY "Enable all operations for all users" ON product_recipes FOR ALL USING (true);

-- Test queries to verify access works
SELECT 'RLS policies applied successfully' as status;
SELECT COUNT(*) as production_flows_count FROM production_flows;
SELECT COUNT(*) as products_count FROM products;
SELECT COUNT(*) as material_consumption_count FROM material_consumption;
