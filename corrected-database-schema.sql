-- CORRECTED Database Schema for Rajdhani Trace Flow
-- This schema matches exactly with the code interfaces and usage

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables if they exist (in correct order due to foreign keys)
DROP TABLE IF EXISTS dropdown_options CASCADE;
DROP TABLE IF EXISTS individual_products CASCADE;
DROP TABLE IF EXISTS product_recipes CASCADE;
DROP TABLE IF EXISTS recipe_materials CASCADE;
DROP TABLE IF EXISTS production_flow_steps CASCADE;
DROP TABLE IF EXISTS production_flows CASCADE;
DROP TABLE IF EXISTS material_consumption CASCADE;
DROP TABLE IF EXISTS production_batches CASCADE;
DROP TABLE IF EXISTS production_steps CASCADE;
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS purchase_orders CASCADE;
DROP TABLE IF EXISTS raw_materials CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS suppliers CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS machines CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;

-- Create customers table
CREATE TABLE customers (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(20),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    pincode VARCHAR(10),
    customer_type VARCHAR(20) DEFAULT 'individual' CHECK (customer_type IN ('individual', 'business')),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended', 'new')),
    total_orders INTEGER DEFAULT 0,
    total_value DECIMAL(12,2) DEFAULT 0,
    last_order_date TIMESTAMP,
    registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    gst_number VARCHAR(20),
    company_name VARCHAR(255),
    credit_limit DECIMAL(12,2) DEFAULT 0,
    outstanding_amount DECIMAL(12,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create dropdown_options table
CREATE TABLE dropdown_options (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category VARCHAR(50) NOT NULL,
    value VARCHAR(255) NOT NULL,
    display_order INTEGER NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create suppliers table
CREATE TABLE suppliers (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(20),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    pincode VARCHAR(10),
    gst_number VARCHAR(20),
    performance_rating DECIMAL(3,2) DEFAULT 0 CHECK (performance_rating >= 0 AND performance_rating <= 5),
    total_orders INTEGER DEFAULT 0,
    total_value DECIMAL(12,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create raw_materials table
CREATE TABLE raw_materials (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    brand VARCHAR(255),
    category VARCHAR(100) NOT NULL,
    current_stock DECIMAL(10,2) DEFAULT 0,
    unit VARCHAR(20) NOT NULL,
    min_threshold DECIMAL(10,2) DEFAULT 10,
    max_capacity DECIMAL(10,2) DEFAULT 1000,
    reorder_point DECIMAL(10,2) DEFAULT 50,
    last_restocked TIMESTAMP,
    daily_usage DECIMAL(10,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'in-stock' CHECK (status IN ('in-stock', 'low-stock', 'out-of-stock', 'overstock', 'in-transit')),
    supplier_id VARCHAR(50) REFERENCES suppliers(id),
    supplier_name VARCHAR(255),
    cost_per_unit DECIMAL(10,2) NOT NULL,
    total_value DECIMAL(12,2) DEFAULT 0,
    batch_number VARCHAR(100),
    quality_grade VARCHAR(10),
    image_url TEXT,
    supplier_performance DECIMAL(3,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create products table (CORRECTED - matches code usage)
CREATE TABLE products (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    color VARCHAR(100),
    pattern VARCHAR(100),
    base_quantity DECIMAL(10,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'in-stock' CHECK (status IN ('in-stock', 'low-stock', 'out-of-stock')),
    individual_stock_tracking BOOLEAN DEFAULT true,
    min_stock_level DECIMAL(10,2) DEFAULT 10,
    max_stock_level DECIMAL(10,2) DEFAULT 1000,
    weight VARCHAR(50),
    thickness VARCHAR(50),
    width VARCHAR(50),
    height VARCHAR(50),
    image_url TEXT,
    qr_code VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create machines table
CREATE TABLE machines (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create product_recipes table
CREATE TABLE product_recipes (
    id VARCHAR(50) PRIMARY KEY,
    product_id VARCHAR(50) NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    product_name VARCHAR(255) NOT NULL,
    total_cost DECIMAL(10,2) DEFAULT 0,
    production_time INTEGER DEFAULT 0, -- in minutes
    difficulty_level VARCHAR(20) DEFAULT 'Medium' CHECK (difficulty_level IN ('Easy', 'Medium', 'Hard')),
    created_by VARCHAR(255) DEFAULT 'system',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create recipe_materials table
CREATE TABLE recipe_materials (
    id VARCHAR(50) PRIMARY KEY,
    recipe_id VARCHAR(50) NOT NULL REFERENCES product_recipes(id) ON DELETE CASCADE,
    material_id VARCHAR(50) NOT NULL REFERENCES raw_materials(id),
    material_name VARCHAR(255) NOT NULL,
    quantity DECIMAL(10,2) NOT NULL,
    unit VARCHAR(20) NOT NULL,
    cost_per_unit DECIMAL(10,2) NOT NULL,
    total_cost DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create individual_products table (CORRECTED - matches code usage)
CREATE TABLE individual_products (
    id VARCHAR(50) PRIMARY KEY,
    qr_code VARCHAR(255) UNIQUE NOT NULL,
    product_id VARCHAR(50) NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    batch_number VARCHAR(100),
    production_date TIMESTAMP NOT NULL,
    final_weight VARCHAR(50),
    final_thickness VARCHAR(50),
    final_width VARCHAR(50),
    final_height VARCHAR(50),
    quality_grade VARCHAR(10) DEFAULT 'A' CHECK (quality_grade IN ('A+', 'A', 'B', 'C')),
    inspector VARCHAR(255),
    status VARCHAR(20) DEFAULT 'available' CHECK (status IN ('available', 'sold', 'damaged', 'reserved')),
    sold_date TIMESTAMP,
    customer_id VARCHAR(50) REFERENCES customers(id),
    order_id UUID,
    production_notes TEXT,
    location VARCHAR(255) DEFAULT 'Warehouse A - General Storage',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create orders table
CREATE TABLE orders (
    id VARCHAR(50) PRIMARY KEY,
    order_number VARCHAR(100) UNIQUE NOT NULL,
    customer_id VARCHAR(50) REFERENCES customers(id),
    customer_name VARCHAR(255) NOT NULL,
    customer_email VARCHAR(255),
    customer_phone VARCHAR(20),
    order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expected_delivery TIMESTAMP,
    subtotal DECIMAL(12,2) DEFAULT 0,
    gst_rate DECIMAL(5,2) DEFAULT 18.00,
    gst_amount DECIMAL(12,2) DEFAULT 0,
    discount_amount DECIMAL(12,2) DEFAULT 0,
    total_amount DECIMAL(12,2) DEFAULT 0,
    paid_amount DECIMAL(12,2) DEFAULT 0,
    outstanding_amount DECIMAL(12,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'in_production', 'ready', 'dispatched', 'delivered', 'cancelled')),
    workflow_step VARCHAR(50) DEFAULT 'pending',
    priority VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    special_instructions TEXT,
    created_by VARCHAR(255) NOT NULL,
    accepted_at TIMESTAMP,
    dispatched_at TIMESTAMP,
    delivered_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create order_items table
CREATE TABLE order_items (
    id VARCHAR(50) PRIMARY KEY,
    order_id VARCHAR(50) NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id VARCHAR(50) REFERENCES products(id),
    product_name VARCHAR(255) NOT NULL,
    product_type VARCHAR(20) DEFAULT 'product' CHECK (product_type IN ('product', 'raw_material')),
    quantity DECIMAL(10,2) NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(12,2) NOT NULL,
    quality_grade VARCHAR(10),
    specifications TEXT,
    -- Dynamic pricing fields
    pricing_unit VARCHAR(20) DEFAULT 'piece' CHECK (pricing_unit IN ('piece', 'roll', 'sqft', 'sqm', 'yard', 'kg', 'meter')),
    unit_area DECIMAL(10,2),
    product_width DECIMAL(10,2),
    product_height DECIMAL(10,2),
    product_weight DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create production_batches table
CREATE TABLE production_batches (
    id VARCHAR(50) PRIMARY KEY,
    batch_number VARCHAR(100) UNIQUE NOT NULL,
    product_id VARCHAR(50) REFERENCES products(id),
    order_id VARCHAR(50) REFERENCES orders(id),
    planned_quantity INTEGER NOT NULL,
    actual_quantity INTEGER DEFAULT 0,
    start_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completion_date TIMESTAMP,
    status VARCHAR(20) DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'completed', 'paused', 'cancelled')),
    priority VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    operator VARCHAR(255),
    supervisor VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create production_steps table
CREATE TABLE production_steps (
    id VARCHAR(50) PRIMARY KEY,
    production_batch_id VARCHAR(50) NOT NULL REFERENCES production_batches(id) ON DELETE CASCADE,
    step_number INTEGER NOT NULL,
    step_name VARCHAR(255) NOT NULL,
    description TEXT,
    estimated_duration INTEGER, -- in minutes
    actual_duration INTEGER, -- in minutes
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed', 'skipped')),
    operator VARCHAR(255),
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    quality_check_result TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create material_consumption table (CORRECTED - matches code usage)
CREATE TABLE material_consumption (
    id VARCHAR(50) PRIMARY KEY,
    production_product_id VARCHAR(50) NOT NULL, -- References production_flows or production_batches
    material_id VARCHAR(50) NOT NULL REFERENCES raw_materials(id),
    material_name VARCHAR(255) NOT NULL,
    quantity_used DECIMAL(10,2) NOT NULL, -- CORRECTED field name
    unit VARCHAR(20) NOT NULL,
    cost_per_unit DECIMAL(10,2) NOT NULL,
    total_cost DECIMAL(10,2) NOT NULL,
    consumed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- CORRECTED field name
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create production_flows table (for new production system)
CREATE TABLE production_flows (
    id VARCHAR(50) PRIMARY KEY,
    production_product_id VARCHAR(50) NOT NULL, -- References the production product
    flow_name VARCHAR(255) NOT NULL,
    product_id VARCHAR(50) REFERENCES products(id),
    product_name VARCHAR(255),
    status VARCHAR(20) DEFAULT 'planning' CHECK (status IN ('planning', 'active', 'completed', 'cancelled')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create production_flow_steps table (for new production system)
CREATE TABLE production_flow_steps (
    id VARCHAR(50) PRIMARY KEY,
    flow_id UUID NOT NULL REFERENCES production_flows(id) ON DELETE CASCADE,
    step_name VARCHAR(255) NOT NULL,
    step_type VARCHAR(50) NOT NULL CHECK (step_type IN ('material_selection', 'machine_operation', 'wastage_tracking', 'testing_individual')),
    order_index INTEGER NOT NULL,
    machine_id UUID REFERENCES machines(id),
    inspector_name VARCHAR(255),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'skipped')),
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create purchase_orders table
CREATE TABLE purchase_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number VARCHAR(100) UNIQUE NOT NULL,
    supplier_id VARCHAR(50) REFERENCES suppliers(id),
    supplier_name VARCHAR(255) NOT NULL,
    order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expected_delivery TIMESTAMP,
    total_amount DECIMAL(12,2) DEFAULT 0,
    paid_amount DECIMAL(12,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'shipped', 'delivered', 'cancelled')),
    notes TEXT,
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create audit_logs table
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    action VARCHAR(100) NOT NULL,
    module VARCHAR(50) NOT NULL CHECK (module IN ('orders', 'products', 'materials', 'production', 'customers', 'suppliers')),
    entity_id UUID,
    entity_name VARCHAR(255),
    user_id VARCHAR(255) NOT NULL,
    details JSONB,
    previous_state JSONB,
    new_state JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create notifications table
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type VARCHAR(50) NOT NULL CHECK (type IN ('info', 'warning', 'error', 'success', 'production_request', 'restock_request')),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    priority VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    status VARCHAR(20) DEFAULT 'unread' CHECK (status IN ('unread', 'read', 'dismissed')),
    module VARCHAR(50) NOT NULL CHECK (module IN ('orders', 'products', 'materials', 'production')),
    related_id UUID,
    related_data JSONB,
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_individual_products_product_id ON individual_products(product_id);
CREATE INDEX idx_individual_products_status ON individual_products(status);
CREATE INDEX idx_individual_products_quality_grade ON individual_products(quality_grade);
CREATE INDEX idx_orders_customer_id ON orders(customer_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_product_id ON order_items(product_id);
CREATE INDEX idx_material_consumption_production_product_id ON material_consumption(production_product_id);
CREATE INDEX idx_material_consumption_material_id ON material_consumption(material_id);
CREATE INDEX idx_production_flows_production_product_id ON production_flows(production_product_id);
CREATE INDEX idx_production_flow_steps_flow_id ON production_flow_steps(flow_id);
CREATE INDEX idx_notifications_module ON notifications(module);
CREATE INDEX idx_notifications_status ON notifications(status);
CREATE INDEX idx_notifications_created_by ON notifications(created_by);

-- Insert sample data
INSERT INTO customers (name, email, phone, address, city, state, pincode, customer_type, status, total_orders, total_value, gst_number, company_name, credit_limit, outstanding_amount) VALUES
('Rajesh Kumar', 'rajesh@example.com', '9876543210', '123 Main Street', 'Mumbai', 'Maharashtra', '400001', 'individual', 'active', 5, 50000, NULL, NULL, 0, 0),
('ABC Textiles Ltd', 'orders@abctextiles.com', '9876543211', '456 Business Park', 'Delhi', 'Delhi', '110001', 'business', 'active', 10, 150000, '07AABCU9603R1ZX', 'ABC Textiles Ltd', 100000, 25000);

INSERT INTO suppliers (name, contact_person, email, phone, address, city, state, pincode, gst_number, performance_rating, total_orders, total_value, status) VALUES
('Premium Yarn Suppliers', 'Amit Shah', 'amit@premiumyarn.com', '9876543220', '789 Industrial Area', 'Ahmedabad', 'Gujarat', '380001', '24AABCP1234A1Z5', 4.5, 25, 500000, 'active'),
('Quality Materials Co', 'Priya Singh', 'priya@qualitymaterials.com', '9876543221', '321 Trade Center', 'Chennai', 'Tamil Nadu', '600001', '33AABCQ5678B2Y6', 4.2, 15, 300000, 'active');

INSERT INTO raw_materials (name, brand, category, current_stock, unit, min_threshold, max_capacity, reorder_point, status, supplier_id, supplier_name, cost_per_unit, total_value, quality_grade) VALUES
('Wool Yarn', 'Premium Wool', 'Yarn', 500, 'kg', 50, 1000, 100, 'in-stock', (SELECT id FROM suppliers WHERE name = 'Premium Yarn Suppliers'), 'Premium Yarn Suppliers', 250, 125000, 'A'),
('Cotton Yarn', 'Pure Cotton', 'Yarn', 300, 'kg', 30, 800, 60, 'in-stock', (SELECT id FROM suppliers WHERE name = 'Premium Yarn Suppliers'), 'Premium Yarn Suppliers', 200, 60000, 'A'),
('Backing Cloth', 'Strong Back', 'Fabric', 200, 'sqm', 20, 500, 40, 'in-stock', (SELECT id FROM suppliers WHERE name = 'Quality Materials Co'), 'Quality Materials Co', 85, 17000, 'A'),
('Marble Powder', 'Fine Marble', 'Chemical', 100, 'kg', 10, 200, 20, 'in-stock', (SELECT id FROM suppliers WHERE name = 'Quality Materials Co'), 'Quality Materials Co', 35, 3500, 'A');

INSERT INTO machines (name, description, status) VALUES
('LOOM MACHINE', 'Traditional loom for carpet weaving', 'active'),
('CUTTING MACHINE', 'Multi-purpose cutting machine for various carpet operations', 'active'),
('NEEDLE PUNCHING', 'Needle punching machine for carpet finishing and texture work', 'active'),
('Binding Machine', 'Machine for edge binding and finishing', 'active');

INSERT INTO products (name, category, color, pattern, base_quantity, status, individual_stock_tracking, min_stock_level, max_stock_level, weight, thickness, width, height) VALUES
('Traditional Persian Carpet', 'Carpet', 'Red', 'Persian', 0, 'in-stock', true, 5, 50, '45 kg', '12 mm', '10 ft', '8 ft'),
('Modern Geometric Carpet', 'Carpet', 'Blue', 'Geometric', 0, 'in-stock', true, 5, 50, '40 kg', '10 mm', '9 ft', '7 ft'),
('Digital Print Carpet', 'Carpet', 'Green', 'Digital', 0, 'in-stock', true, 5, 50, '35 kg', '8 mm', '8 ft', '6 ft');

-- Create product recipes
INSERT INTO product_recipes (product_id, product_name, total_cost, production_time, difficulty_level) VALUES
((SELECT id FROM products WHERE name = 'Traditional Persian Carpet'), 'Traditional Persian Carpet', 8000, 480, 'Hard'),
((SELECT id FROM products WHERE name = 'Modern Geometric Carpet'), 'Modern Geometric Carpet', 6000, 360, 'Medium'),
((SELECT id FROM products WHERE name = 'Digital Print Carpet'), 'Digital Print Carpet', 4000, 240, 'Easy');

-- Create recipe materials
INSERT INTO recipe_materials (recipe_id, material_id, material_name, quantity, unit, cost_per_unit, total_cost) VALUES
-- Traditional Persian Carpet recipe
((SELECT id FROM product_recipes WHERE product_name = 'Traditional Persian Carpet'), (SELECT id FROM raw_materials WHERE name = 'Wool Yarn'), 'Wool Yarn', 20, 'kg', 250, 5000),
((SELECT id FROM product_recipes WHERE product_name = 'Traditional Persian Carpet'), (SELECT id FROM raw_materials WHERE name = 'Backing Cloth'), 'Backing Cloth', 5, 'sqm', 85, 425),
((SELECT id FROM product_recipes WHERE product_name = 'Traditional Persian Carpet'), (SELECT id FROM raw_materials WHERE name = 'Marble Powder'), 'Marble Powder', 10, 'kg', 35, 350),
-- Modern Geometric Carpet recipe
((SELECT id FROM product_recipes WHERE product_name = 'Modern Geometric Carpet'), (SELECT id FROM raw_materials WHERE name = 'Cotton Yarn'), 'Cotton Yarn', 15, 'kg', 200, 3000),
((SELECT id FROM product_recipes WHERE product_name = 'Modern Geometric Carpet'), (SELECT id FROM raw_materials WHERE name = 'Backing Cloth'), 'Backing Cloth', 4, 'sqm', 85, 340),
((SELECT id FROM product_recipes WHERE product_name = 'Modern Geometric Carpet'), (SELECT id FROM raw_materials WHERE name = 'Marble Powder'), 'Marble Powder', 8, 'kg', 35, 280),
-- Digital Print Carpet recipe
((SELECT id FROM product_recipes WHERE product_name = 'Digital Print Carpet'), (SELECT id FROM raw_materials WHERE name = 'Cotton Yarn'), 'Cotton Yarn', 10, 'kg', 200, 2000),
((SELECT id FROM product_recipes WHERE product_name = 'Digital Print Carpet'), (SELECT id FROM raw_materials WHERE name = 'Backing Cloth'), 'Backing Cloth', 3, 'sqm', 85, 255),
((SELECT id FROM product_recipes WHERE product_name = 'Digital Print Carpet'), (SELECT id FROM raw_materials WHERE name = 'Marble Powder'), 'Marble Powder', 5, 'kg', 35, 175);

-- Note: Products don't have fixed prices - pricing is handled per order

COMMIT;
