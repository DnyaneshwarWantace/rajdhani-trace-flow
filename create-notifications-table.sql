-- Create notifications table for production request notifications
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(50) NOT NULL CHECK (type IN ('info', 'warning', 'error', 'success', 'production_request', 'restock_request', 'low_stock', 'order_alert')),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    status VARCHAR(20) DEFAULT 'unread' CHECK (status IN ('unread', 'read', 'dismissed')),
    module VARCHAR(50) NOT NULL CHECK (module IN ('orders', 'products', 'materials', 'production')),
    related_id UUID,
    related_data JSONB,
    created_by VARCHAR(255) DEFAULT 'system',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notifications_module ON notifications(module);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);

-- Enable Row Level Security (RLS)
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (allow all operations for now - you can restrict later)
CREATE POLICY "Allow all operations on notifications" ON notifications
    FOR ALL USING (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_notifications_updated_at ON notifications;
CREATE TRIGGER update_notifications_updated_at 
    BEFORE UPDATE ON notifications 
    FOR EACH ROW 
    EXECUTE FUNCTION update_notifications_updated_at();
