export interface RecipeMaterial {
  id: string;
  recipe_id: string;
  material_id: string;
  material_name: string;
  material_type: 'raw_material' | 'product';
  quantity_per_sqm: number;
  unit: string;
  specifications?: string;
  quality_requirements?: string;
  is_optional: boolean;
  waste_factor: number;
  cost_per_unit: number;
  total_cost_per_sqm: number;
  created_at: string;
}

export interface Recipe {
  id: string;
  product_id: string;
  product_name: string;
  base_unit: string;
  created_by: string;
  description?: string;
  version: string;
  is_active: boolean;
  total_cost_per_sqm: number;
  created_at: string;
  updated_at: string;
  materials?: RecipeMaterial[];
  materials_count?: number;
}

export interface RecipeFilters {
  search?: string;
  product_id?: string;
  is_active?: boolean;
  limit?: number;
  offset?: number;
}

  id: string;
  recipe_id: string;
  material_id: string;
  material_name: string;
  material_type: 'raw_material' | 'product';
  quantity_per_sqm: number;
  unit: string;
  specifications?: string;
  quality_requirements?: string;
  is_optional: boolean;
  waste_factor: number;
  cost_per_unit: number;
  total_cost_per_sqm: number;
  created_at: string;
}

export interface Recipe {
  id: string;
  product_id: string;
  product_name: string;
  base_unit: string;
  created_by: string;
  description?: string;
  version: string;
  is_active: boolean;
  total_cost_per_sqm: number;
  created_at: string;
  updated_at: string;
  materials?: RecipeMaterial[];
  materials_count?: number;
}

export interface RecipeFilters {
  search?: string;
  product_id?: string;
  is_active?: boolean;
  limit?: number;
  offset?: number;
}

