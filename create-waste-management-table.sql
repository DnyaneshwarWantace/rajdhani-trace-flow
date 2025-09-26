-- Create waste_management table
CREATE TABLE IF NOT EXISTS waste_management (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    material_id VARCHAR(50) REFERENCES raw_materials(id) ON DELETE CASCADE,
    material_name VARCHAR(255) NOT NULL,
    quantity DECIMAL(10,2) NOT NULL,
    unit VARCHAR(50) NOT NULL,
    waste_type VARCHAR(50) NOT NULL CHECK (waste_type IN ('scrap', 'defective', 'excess')),
    can_be_reused BOOLEAN DEFAULT false,
    production_batch_id VARCHAR(100),
    production_product_id VARCHAR(100),
    notes TEXT,
    status VARCHAR(50) DEFAULT 'available_for_reuse' CHECK (status IN ('available_for_reuse', 'added_to_inventory', 'disposed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_waste_management_material_id ON waste_management(material_id);
CREATE INDEX IF NOT EXISTS idx_waste_management_production_batch_id ON waste_management(production_batch_id);
CREATE INDEX IF NOT EXISTS idx_waste_management_status ON waste_management(status);
CREATE INDEX IF NOT EXISTS idx_waste_management_waste_type ON waste_management(waste_type);

-- Enable Row Level Security
ALTER TABLE waste_management ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Enable all operations for all users" ON waste_management
    FOR ALL USING (true) WITH CHECK (true);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_waste_management_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_waste_management_updated_at
    BEFORE UPDATE ON waste_management
    FOR EACH ROW
    EXECUTE FUNCTION update_waste_management_updated_at();

-- Insert some sample data (optional)
INSERT INTO waste_management (material_id, material_name, quantity, unit, waste_type, can_be_reused, notes, status)
VALUES 
    ('00000000-0000-0000-0000-000000000001', 'Sample Material', 5.0, 'kg', 'scrap', true, 'Sample waste item for testing', 'available_for_reuse')
ON CONFLICT DO NOTHING;