// SUPABASE REMOVED - Now using MongoDB via backend API
// This file is kept for type definitions only

export const isSupabaseConfigured = false;
export const isServiceRoleConfigured = false;
export const supabase = null;
export const supabaseAdmin = null;

// Database types for TypeScript
export interface Database {
  public: {
    Tables: {
      customers: {
        Row: Customer;
        Insert: Omit<Customer, 'created_at' | 'updated_at'>;
        Update: Partial<Customer>;
      };
      products: {
        Row: Product;
        Insert: Omit<Product, 'created_at' | 'updated_at'>;
        Update: Partial<Product>;
      };
      individual_products: {
        Row: IndividualProduct;
        Insert: Omit<IndividualProduct, 'created_at' | 'updated_at'>;
        Update: Partial<IndividualProduct>;
      };
      raw_materials: {
        Row: RawMaterial;
        Insert: Omit<RawMaterial, 'created_at' | 'updated_at'>;
        Update: Partial<RawMaterial>;
      };
      orders: {
        Row: Order;
        Insert: Omit<Order, 'created_at' | 'updated_at'>;
        Update: Partial<Order>;
      };
      order_items: {
        Row: OrderItem;
        Insert: Omit<OrderItem, 'created_at' | 'updated_at'>;
        Update: Partial<OrderItem>;
      };
      production_batches: {
        Row: ProductionBatch;
        Insert: Omit<ProductionBatch, 'created_at' | 'updated_at'>;
        Update: Partial<ProductionBatch>;
      };
      production_steps: {
        Row: ProductionStep;
        Insert: Omit<ProductionStep, 'created_at' | 'updated_at'>;
        Update: Partial<ProductionStep>;
      };
      material_consumption: {
        Row: MaterialConsumption;
        Insert: Omit<MaterialConsumption, 'created_at'>;
        Update: Partial<MaterialConsumption>;
      };
      product_recipes: {
        Row: ProductRecipe;
        Insert: Omit<ProductRecipe, 'created_at' | 'updated_at'>;
        Update: Partial<ProductRecipe>;
      };
      recipe_materials: {
        Row: RecipeMaterial;
        Insert: Omit<RecipeMaterial, 'created_at'>;
        Update: Partial<RecipeMaterial>;
      };
      suppliers: {
        Row: Supplier;
        Insert: Omit<Supplier, 'created_at' | 'updated_at'>;
        Update: Partial<Supplier>;
      };
      purchase_orders: {
        Row: PurchaseOrder;
        Insert: Omit<PurchaseOrder, 'created_at' | 'updated_at'>;
        Update: Partial<PurchaseOrder>;
      };
      audit_logs: {
        Row: AuditLog;
        Insert: Omit<AuditLog, 'created_at'>;
        Update: never;
      };
      notifications: {
        Row: Notification;
        Insert: Omit<Notification, 'created_at'>;
        Update: Partial<Notification>;
      };
      production_flows: {
        Row: ProductionFlow;
        Insert: Omit<ProductionFlow, 'created_at' | 'updated_at'>;
        Update: Partial<ProductionFlow>;
      };
      production_flow_steps: {
        Row: ProductionFlowStep;
        Insert: Omit<ProductionFlowStep, 'created_at' | 'updated_at'>;
        Update: Partial<ProductionFlowStep>;
      };
    };
  };
}

// Type definitions matching the database schema
export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  customer_type: 'individual' | 'business';
  status: 'active' | 'inactive' | 'suspended' | 'new';
  total_orders: number;
  total_value: number;
  last_order_date?: string;
  registration_date: string;
  gst_number?: string;
  company_name?: string;
  credit_limit: number;
  outstanding_amount: number;
  permanent_address?: {
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
  };
  delivery_address?: {
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
  };
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  color?: string;
  size?: string;
  pattern?: string;
  base_quantity: number;
  selling_price: number;
  cost_price?: number;
  status: 'in-stock' | 'low-stock' | 'out-of-stock';
  individual_stock_tracking: boolean;
  min_stock_level: number;
  max_stock_level: number;
  created_at: string;
  updated_at: string;
}

export interface IndividualProduct {
  id: string;
  qr_code: string;
  product_id: string;
  batch_number?: string;
  production_date: string;
  final_weight?: string;
  quality_grade: 'A+' | 'A' | 'B' | 'C';
  inspector?: string;
  status: 'available' | 'sold' | 'damaged' | 'reserved';
  sold_date?: string;
  customer_id?: string;
  order_id?: string;
  production_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface RawMaterial {
  id: string;
  name: string;
  type: string;
  category: string;
  current_stock: number;
  unit: string;
  min_threshold: number;
  max_capacity: number;
  reorder_point: number;
  last_restocked?: string;
  daily_usage: number;
  status: 'in-stock' | 'low-stock' | 'out-of-stock' | 'overstock' | 'in-transit';
  supplier_id?: string;
  supplier_name?: string;
  cost_per_unit: number;
  total_value: number;
  batch_number?: string;
  quality_grade?: string;
  image_url?: string;
  supplier_performance: number;
  created_at: string;
  updated_at: string;
}

export interface Supplier {
  id: string;
  name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  gst_number?: string;
  performance_rating: number;
  total_orders: number;
  total_value: number;
  status: 'active' | 'inactive' | 'suspended';
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: string;
  order_number: string;
  customer_id?: string;
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  order_date: string;
  expected_delivery?: string;
  subtotal: number;
  gst_rate: number;
  gst_amount: number;
  discount_amount: number;
  total_amount: number;
  paid_amount: number;
  outstanding_amount: number;
  status: 'pending' | 'accepted' | 'in_production' | 'ready' | 'dispatched' | 'delivered' | 'cancelled';
  workflow_step?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  special_instructions?: string;
  created_by: string;
  accepted_at?: string;
  dispatched_at?: string;
  delivered_at?: string;
  created_at: string;
  updated_at: string;
  // Delivery address stored with each order
  delivery_address?: {
    address: string;
    city: string;
    state: string;
    pincode: string;
  };
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id?: string;
  product_name: string;
  product_type: 'product' | 'raw_material';
  quantity: number;
  unit_price: number;
  total_price: number;
  quality_grade?: string;
  specifications?: string;
  // New dynamic pricing fields
  pricing_unit: 'piece' | 'roll' | 'sqft' | 'sqm' | 'yard' | 'kg' | 'meter';
  unit_area?: number; // Area of one unit in the pricing unit
  product_width?: number; // Product width in meters
  product_length?: number; // Product length in meters
  product_weight?: number; // Product weight in kg
  created_at: string;
  updated_at: string;
}

export interface ProductionBatch {
  id: string;
  batch_number: string;
  product_id?: string;
  order_id?: string;
  planned_quantity: number;
  actual_quantity: number;
  start_date: string;
  completion_date?: string;
  status: 'planned' | 'in_progress' | 'completed' | 'paused' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  operator?: string;
  supervisor?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface ProductionStep {
  id: string;
  production_batch_id: string;
  step_number: number;
  step_name: string;
  description?: string;
  estimated_duration?: number;
  actual_duration?: number;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped';
  operator?: string;
  start_time?: string;
  end_time?: string;
  quality_check_result?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface MaterialConsumption {
  id?: string;
  production_batch_id?: string;
  production_product_id?: string; // New field for production batch tracking
  production_step_id?: string;
  material_id: string;
  material_name: string;
  material_type?: 'product' | 'raw_material'; // New field for material type
  individual_product_id?: string;
  individual_product_ids?: string[]; // New field for array of individual product IDs
  consumed_quantity?: number;
  quantity_used?: number; // New field for quantity used
  waste_quantity?: number;
  unit: string;
  cost_per_unit?: number;
  consumption_date?: string;
  consumed_at?: string; // New field for consumption timestamp
  operator?: string;
  notes?: string;
  created_at?: string;
}

export interface ProductRecipe {
  id: string;
  product_id: string;
  product_name: string;
  base_unit: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface RecipeMaterial {
  id: string;
  recipe_id: string;
  material_id: string;
  material_name: string;
  material_type: 'raw_material' | 'product';
  quantity: number;
  unit: string;
  created_at: string;
}

export interface PurchaseOrder {
  id: string;
  order_number: string;
  supplier_id?: string;
  supplier_name: string;
  order_date: string;
  expected_delivery?: string;
  total_amount: number;
  paid_amount: number;
  status: 'pending' | 'approved' | 'shipped' | 'delivered' | 'cancelled';
  notes?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  action: string;
  module: 'orders' | 'products' | 'materials' | 'production' | 'customers' | 'suppliers';
  entity_id?: string;
  entity_name?: string;
  user_id: string;
  details?: any;
  previous_state?: any;
  new_state?: any;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

export interface Notification {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success' | 'production_request' | 'restock_request';
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'unread' | 'read' | 'dismissed';
  module: 'orders' | 'products' | 'materials' | 'production';
  related_id?: string;
  related_data?: any;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ProductionFlow {
  id: string;
  production_product_id: string;
  flow_name: string;
  status: 'active' | 'completed' | 'cancelled';
  current_step?: number;
  total_steps?: number;
  created_at: string;
  updated_at: string;
}

export interface ProductionFlowStep {
  id: string;
  flow_id: string;
  step_name: string;
  step_type: string;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  order_index: number;
  machine_id?: string;
  inspector_name?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

                                        // Utility function to handle errors (kept for backward compatibility with old services)
export const handleSupabaseError = (error: any) => {
  console.error('Error:', error);
  if (error?.message) {
    return error.message;
  }
  if (error?.error_description) {
    return error.error_description;
  }
  return 'An unexpected error occurred';
};

// Utility function to generate unique IDs
export const generateUniqueId = (prefix: string = ''): string => {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substr(2, 9);
  return prefix ? `${prefix}_${timestamp}_${randomStr}` : `${timestamp}_${randomStr}`;
};

// Keep for backward compatibility - always returns false now
export const testSupabaseConnection = async () => {
  console.warn('⚠️ Supabase removed - now using MongoDB via backend API');
  return false;
};

export default null;