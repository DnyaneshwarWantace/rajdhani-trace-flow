-- Fix existing raw materials with 0 stock
-- This script will update the status of materials that have 0 stock but are marked as in-transit

-- First, let's see what we have
SELECT id, name, current_stock, status, supplier_name, created_at 
FROM raw_materials 
WHERE current_stock = 0 
ORDER BY created_at DESC;

-- Update materials that are in-transit with 0 stock to out-of-stock
UPDATE raw_materials 
SET status = 'out-of-stock',
    updated_at = CURRENT_TIMESTAMP
WHERE current_stock = 0 
  AND status = 'in-transit';

-- Check if there are any purchase orders for these materials
SELECT po.id, po.order_number, po.supplier_name, po.status, po.material_details, po.notes
FROM purchase_orders po
WHERE po.supplier_name = 'AAA Supplier'
  AND (po.material_details->>'materialName' LIKE '%Backing Cloth%' 
       OR po.notes LIKE '%Backing Cloth%')
ORDER BY po.created_at DESC;

-- If we find purchase orders, we need to process them
-- Let's create a function to process pending purchase orders
DO $$
DECLARE
    order_record RECORD;
    material_record RECORD;
    order_material_details JSONB;
    quantity_value NUMERIC;
BEGIN
    -- Loop through pending purchase orders
    FOR order_record IN 
        SELECT * FROM purchase_orders 
        WHERE status = 'pending' 
          AND supplier_name = 'AAA Supplier'
          AND (purchase_orders.material_details->>'materialName' LIKE '%Backing Cloth%' 
               OR notes LIKE '%Backing Cloth%')
    LOOP
        -- Get material details
        IF order_record.material_details IS NOT NULL THEN
            order_material_details := order_record.material_details;
        ELSE
            -- Try to parse from notes
            BEGIN
                order_material_details := order_record.notes::jsonb;
            EXCEPTION WHEN OTHERS THEN
                CONTINUE; -- Skip this order if we can't parse it
            END;
        END IF;
        
        -- Extract quantity
        quantity_value := COALESCE(
            (order_material_details->>'quantity')::numeric,
            (order_material_details->>'quantity')::numeric,
            0
        );
        
        -- Only process if we have a valid quantity
        IF quantity_value > 0 THEN
            -- Find matching material
            SELECT * INTO material_record
            FROM raw_materials 
            WHERE name = COALESCE(
                order_material_details->>'materialName',
                order_material_details->>'material_name',
                'Unknown'
            )
            AND supplier_name = order_record.supplier_name
            AND current_stock = 0
            LIMIT 1;
            
            -- Update the material if found
            IF material_record.id IS NOT NULL THEN
                UPDATE raw_materials 
                SET current_stock = quantity_value,
                    status = CASE 
                        WHEN quantity_value <= min_threshold THEN 'low-stock'
                        ELSE 'in-stock'
                    END,
                    last_restocked = CURRENT_TIMESTAMP,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = material_record.id;
                
                -- Mark purchase order as delivered
                UPDATE purchase_orders 
                SET status = 'delivered',
                    actual_delivery = CURRENT_TIMESTAMP,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = order_record.id;
                
                RAISE NOTICE 'Updated material % with quantity %', material_record.name, quantity_value;
            END IF;
        END IF;
    END LOOP;
END $$;

-- Show the updated materials
SELECT id, name, current_stock, status, supplier_name, updated_at 
FROM raw_materials 
WHERE name LIKE '%Backing Cloth%'
ORDER BY updated_at DESC;

COMMIT;
