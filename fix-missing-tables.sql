-- Fix missing tables and add image field to raw materials

-- Create app_settings table (missing table causing 404 error)
CREATE TABLE IF NOT EXISTS app_settings (
    id VARCHAR(50) PRIMARY KEY,
    key VARCHAR(100) UNIQUE NOT NULL,
    value JSONB NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default materials settings
INSERT INTO app_settings (id, key, value, description) VALUES 
('SETTINGS_001', 'materials_settings', '{"default_unit": "kg", "auto_reorder": true, "low_stock_threshold": 10}', 'Default settings for materials management')
ON CONFLICT (key) DO NOTHING;

-- Add image_url field to raw_materials table if it doesn't exist
ALTER TABLE raw_materials 
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Update the corrected schema to include image_url in raw_materials
-- (This is already in the corrected schema, but adding here for reference)
-- The raw_materials table should have:
-- image_url TEXT (for storing image URLs)

COMMIT;
