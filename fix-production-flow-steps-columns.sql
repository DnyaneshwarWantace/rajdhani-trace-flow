-- Add missing columns to production_flow_steps table
ALTER TABLE production_flow_steps ADD COLUMN IF NOT EXISTS quality_notes TEXT;
ALTER TABLE production_flow_steps ADD COLUMN IF NOT EXISTS end_time TIMESTAMP;

-- Verify the columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'production_flow_steps' 
AND column_name IN ('quality_notes', 'end_time');
