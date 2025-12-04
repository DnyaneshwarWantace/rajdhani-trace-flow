export type DropdownCategory =
  | 'weight' | 'weight_units'
  | 'length' | 'length_units' | 'length_unit'
  | 'width' | 'width_units' | 'width_unit'
  | 'category' | 'subcategory' | 'color' | 'pattern' | 'unit'
  | 'material_category' | 'material_unit' | 'material_type' | 'material_color'
  | 'priority' | 'quality_rating' | 'waste_type';

export interface DropdownOption {
  _id: string;
  id: string;
  category: DropdownCategory;
  value: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DropdownFormData {
  category: DropdownCategory;
  value: string;
  display_order?: number;
  is_active?: boolean;
}

export interface GroupedDropdowns {
  [key: string]: DropdownOption[];
}
