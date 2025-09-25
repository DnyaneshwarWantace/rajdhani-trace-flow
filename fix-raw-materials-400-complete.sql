-- Complete fix for raw_materials 400 error
-- This script addresses all potential issues causing the 400 error

-- 1. First, ensure the raw_materials table exists with correct schema
CREATE TABLE IF NOT EXISTS raw_materials (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    brand VARCHAR(255),
    category VARCHAR(100) NOT NULL,
    current_stock DECIMAL(10,2) DEFAULT 0 NOT NULL,
    unit VARCHAR(20) NOT NULL,
    min_threshold DECIMAL(10,2) DEFAULT 10 NOT NULL,
    max_capacity DECIMAL(10,2) DEFAULT 1000 NOT NULL,
    reorder_point DECIMAL(10,2) DEFAULT 50 NOT NULL,
    last_restocked TIMESTAMP,
    daily_usage DECIMAL(10,2) DEFAULT 0 NOT NULL,
    status VARCHAR(20) DEFAULT 'in-stock' NOT NULL CHECK (status IN ('in-stock', 'low-stock', 'out-of-stock', 'overstock', 'in-transit')),
    supplier_id VARCHAR(50),
    supplier_name VARCHAR(255),
    cost_per_unit DECIMAL(10,2) NOT NULL,
    total_value DECIMAL(12,2) DEFAULT 0 NOT NULL,
    batch_number VARCHAR(100),
    quality_grade VARCHAR(10),
    image_url TEXT,
    supplier_performance DECIMAL(3,2) DEFAULT 0 NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Create suppliers table if it doesn't exist (for foreign key reference)
CREATE TABLE IF NOT EXISTS suppliers (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    pincode VARCHAR(20),
    gst_number VARCHAR(50),
    performance_rating DECIMAL(3,2) DEFAULT 0,
    total_orders INTEGER DEFAULT 0,
    total_value DECIMAL(12,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Add foreign key constraint if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'raw_materials_supplier_id_fkey'
    ) THEN
        ALTER TABLE raw_materials 
        ADD CONSTRAINT raw_materials_supplier_id_fkey 
        FOREIGN KEY (supplier_id) REFERENCES suppliers(id);
    END IF;
END $$;

-- 4. Enable Row Level Security (RLS) and create policies
ALTER TABLE raw_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Enable all operations for all users" ON raw_materials;
DROP POLICY IF EXISTS "Enable all operations for all users" ON suppliers;

-- Create permissive policies for development (allows all operations)
CREATE POLICY "Enable all operations for all users" ON raw_materials FOR ALL USING (true);
CREATE POLICY "Enable all operations for all users" ON suppliers FOR ALL USING (true);

-- 5. Insert some sample data to test the endpoint
INSERT INTO suppliers (id, name, contact_person, email, phone, status) VALUES 
('SUP_001', 'Sample Supplier 1', 'John Doe', 'john@supplier1.com', '+91-9876543210', 'active'),
('SUP_002', 'Sample Supplier 2', 'Jane Smith', 'jane@supplier2.com', '+91-9876543211', 'active')
ON CONFLICT (id) DO NOTHING;

INSERT INTO raw_materials (id, name, brand, category, current_stock, unit, min_threshold, max_capacity, reorder_point, daily_usage, status, supplier_id, supplier_name, cost_per_unit, total_value, batch_number, quality_grade, supplier_performance) VALUES 
('RM_001', 'Cotton Fabric', 'Premium Cotton', 'Fabric', 100.00, 'meters', 20.00, 500.00, 50.00, 5.00, 'in-stock', 'SUP_001', 'Sample Supplier 1', 150.00, 15000.00, 'BATCH_001', 'A', 4.5),
('RM_002', 'Silk Thread', 'Luxury Silk', 'Thread', 50.00, 'spools', 10.00, 200.00, 25.00, 2.00, 'in-stock', 'SUP_002', 'Sample Supplier 2', 200.00, 10000.00, 'BATCH_002', 'A+', 4.8)
ON CONFLICT (id) DO NOTHING;

-- 6. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_raw_materials_category ON raw_materials(category);
CREATE INDEX IF NOT EXISTS idx_raw_materials_status ON raw_materials(status);
CREATE INDEX IF NOT EXISTS idx_raw_materials_supplier_id ON raw_materials(supplier_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers(name);

-- 7. Grant necessary permissions
GRANT ALL ON raw_materials TO anon, authenticated;
GRANT ALL ON suppliers TO anon, authenticated;

COMMIT;
