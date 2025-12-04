export interface Product {
  _id: string;
  id: string;
  qr_code: string;
  name: string;
  category: string;
  subcategory?: string;

  // Dimensions
  length: string;
  width: string;
  length_unit: string;
  width_unit: string;
  weight?: string;
  weight_unit?: string;

  // Specifications
  color?: string;
  pattern?: string;
  unit: string;

  // Stock
  current_stock: number;
  base_quantity: number;
  min_stock_level: number;
  max_stock_level: number;
  reorder_point: number;

  // Individual products
  individual_stock_tracking: boolean;
  individual_products_count: number;

  // Additional
  notes?: string;
  manufacturing_date?: string;
  has_recipe: boolean;
  image_url?: string;
  status: 'in-stock' | 'low-stock' | 'out-of-stock' | 'active' | 'inactive' | 'discontinued';

  // Virtual fields
  sqm?: number;
  dimensions_display?: string;

  // Timestamps
  created_at: string;
  updated_at: string;
}

export interface ProductFormData {
  name: string;
  category: string;
  subcategory?: string;
  length: string;
  width: string;
  length_unit: string;
  width_unit: string;
  weight?: string;
  weight_unit?: string;
  color?: string;
  pattern?: string;
  unit: string;
  base_quantity: number;
  min_stock_level: number;
  max_stock_level: number;
  reorder_point: number;
  individual_stock_tracking: boolean;
  notes?: string;
  manufacturing_date?: string;
  image_url?: string;
  status: string;
}

export interface ProductStats {
  total_products: number;
  active_products?: number;
  inactive_products?: number;
  discontinued_products?: number;
  low_stock_products: number;
  out_of_stock_products: number;
  total_stock_value?: number;
  available_individual_products?: number;
  total_individual_products?: number;
  sold_individual_products?: number;
  damaged_individual_products?: number;
  individual_tracking_products?: number;
}

export interface ProductFilters {
  search?: string;
  category?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export interface IndividualProduct {
  _id: string;
  id: string;
  product_id: string;
  product_name?: string;
  qr_code: string;
  serial_number?: string;

  // Status
  status: 'available' | 'sold' | 'damaged' | 'returned' | 'in_production' | 'quality_check' | 'reserved';

  // Dimensions
  final_length?: string;
  final_width?: string;
  final_weight?: string;

  // Quality
  quality_grade?: string;
  inspector?: string;

  // Location & Notes
  location?: string;
  notes?: string;

  // Dates
  production_date?: string;
  completion_date?: string;

  // Timestamps
  created_at: string;
  updated_at: string;
}

export interface IndividualProductFormData {
  product_id: string;
  qr_code?: string;
  serial_number?: string;
  status: string;
  final_length?: string;
  final_width?: string;
  final_weight?: string;
  quality_grade?: string;
  inspector?: string;
  location?: string;
  notes?: string;
  production_date?: string;
  completion_date?: string;
}

export interface StockStats {
  available: number;
  sold: number;
  damaged: number;
  total: number;
}
