-- Fix purchase orders quantity issue
-- This script adds the missing material_details column and fixes existing data

-- 1. Add material_details column to purchase_orders table
ALTER TABLE purchase_orders 
ADD COLUMN IF NOT EXISTS material_details JSONB;

-- 2. Add other missing columns that might be needed
ALTER TABLE purchase_orders 
ADD COLUMN IF NOT EXISTS actual_delivery TIMESTAMP;

-- 3. Update existing orders to have proper material_details
-- First, let's see what we have in the notes field and convert it to material_details
UPDATE purchase_orders 
SET material_details = CASE 
  WHEN notes IS NOT NULL AND notes != '' THEN
    CASE 
      WHEN notes::text ~ '^\{.*\}$' THEN notes::jsonb  -- If notes is already JSON
      ELSE jsonb_build_object(
        'materialName', 'Unknown Material',
        'quantity', 0,
        'unit', 'units',
        'costPerUnit', 0,
        'materialBrand', 'Unknown',
        'materialCategory', 'Other',
        'isRestock', false,
        'userNotes', notes
      )
    END
  ELSE jsonb_build_object(
    'materialName', 'Unknown Material',
    'quantity', 0,
    'unit', 'units',
    'costPerUnit', 0,
    'materialBrand', 'Unknown',
    'materialCategory', 'Other',
    'isRestock', false
  )
END
WHERE material_details IS NULL;

-- 4. Set default values for material_details if still null
UPDATE purchase_orders 
SET material_details = jsonb_build_object(
  'materialName', 'Unknown Material',
  'quantity', 0,
  'unit', 'units',
  'costPerUnit', 0,
  'materialBrand', 'Unknown',
  'materialCategory', 'Other',
  'isRestock', false
)
WHERE material_details IS NULL;

-- 5. Create index for better performance
CREATE INDEX IF NOT EXISTS idx_purchase_orders_material_details ON purchase_orders USING GIN (material_details);

-- 6. Insert some sample data with proper material_details for testing
INSERT INTO purchase_orders (
  id, order_number, supplier_name, order_date, expected_delivery, 
  total_amount, status, material_details, created_by
) VALUES 
(
  'PO_TEST_001',
  'PO-TEST-001',
  'Test Supplier 1',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP + INTERVAL '7 days',
  1500.00,
  'pending',
  jsonb_build_object(
    'materialName', 'Cotton Fabric',
    'materialBrand', 'Premium Cotton',
    'materialCategory', 'Fabric',
    'materialBatchNumber', 'BATCH-001',
    'quantity', 100,
    'unit', 'meters',
    'costPerUnit', 15.00,
    'minThreshold', 20,
    'maxCapacity', 500,
    'qualityGrade', 'A',
    'isRestock', false,
    'userNotes', 'Test order for cotton fabric'
  ),
  'admin'
),
(
  'PO_TEST_002',
  'PO-TEST-002',
  'Test Supplier 2',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP + INTERVAL '10 days',
  2000.00,
  'pending',
  jsonb_build_object(
    'materialName', 'Silk Thread',
    'materialBrand', 'Luxury Silk',
    'materialCategory', 'Thread',
    'materialBatchNumber', 'BATCH-002',
    'quantity', 50,
    'unit', 'spools',
    'costPerUnit', 40.00,
    'minThreshold', 10,
    'maxCapacity', 200,
    'qualityGrade', 'A+',
    'isRestock', true,
    'userNotes', 'Restock order for silk thread'
  ),
  'admin'
)
ON CONFLICT (order_number) DO NOTHING;

COMMIT;
