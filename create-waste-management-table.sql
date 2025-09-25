-- Create waste_management table for tracking waste items
CREATE TABLE IF NOT EXISTS waste_management (
    id VARCHAR(50) PRIMARY KEY,
    material_id UUID REFERENCES raw_materials(id),
    material_name VARCHAR(255) NOT NULL,
    quantity DECIMAL(10,2) NOT NULL,
    unit VARCHAR(20) NOT NULL,
    waste_type VARCHAR(20) NOT NULL CHECK (waste_type IN ('scrap', 'defective', 'excess')),
    can_be_reused BOOLEAN DEFAULT false,
    production_batch_id VARCHAR(50),
    production_product_id VARCHAR(50),
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'returned_to_inventory', 'disposed')),
    processed_at TIMESTAMP,
    processed_by VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Enable Row Level Security
ALTER TABLE waste_management ENABLE ROW LEVEL SECURITY;

-- Create policy for public access (for development)
CREATE POLICY "Enable all operations for all users" ON waste_management FOR ALL USING (true);

-- Create indexes for better performance
CREATE INDEX idx_waste_management_material_id ON waste_management(material_id);
CREATE INDEX idx_waste_management_production_batch_id ON waste_management(production_batch_id);
CREATE INDEX idx_waste_management_status ON waste_management(status);
CREATE INDEX idx_waste_management_generated_at ON waste_management(generated_at);

-- Create trigger for updated_at
CREATE TRIGGER update_waste_management_updated_at 
    BEFORE UPDATE ON waste_management 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
