export interface RawMaterial {
  _id: string;
  id: string;
  name: string;
  type?: string;
  category: string;
  current_stock: number;
  unit: 'kg' | 'liters' | 'rolls' | 'meters' | 'sqm' | 'pieces' | 'boxes';
  min_threshold: number;
  max_capacity: number;
  reorder_point: number;
  daily_usage: number;
  status: 'in-stock' | 'low-stock' | 'out-of-stock' | 'overstock' | 'in-transit';
  supplier_id?: string;
  supplier_name: string;
  cost_per_unit: number;
  total_value: number;
  batch_number?: string;
  quality_grade?: string;
  color?: string;
  image_url?: string;
  supplier_performance: number;
  last_restocked?: string;
  created_by?: string;
  createdAt: string;
  updatedAt: string;
  created_at?: string;
}

export interface RawMaterialFormData {
  name: string;
  type?: string;
  category: string;
  current_stock: number;
  unit: string;
  min_threshold: number;
  max_capacity: number;
  reorder_point: number;
  daily_usage?: number;
  supplier_name: string;
  cost_per_unit: number;
  batch_number?: string;
  quality_grade?: string;
  color?: string;
  image_url?: string;
}

export interface MaterialStats {
  totalMaterials: number;
  inStock: number;
  lowStock: number;
  outOfStock: number;
  overstock: number;
  totalValue: number;
  averageValue: number;
}

export interface MaterialFilters {
  search?: string;
  category?: string | string[];
  status?: string | string[];
  type?: string | string[];
  color?: string | string[];
  supplier?: string | string[];
  page?: number;
  limit?: number;
}
