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
  color?: string;
  image_url?: string;
  supplier_performance: number;
  last_restocked?: string;
  created_by?: string;
  createdAt: string;
  updatedAt: string;
  created_at?: string;
  /** 'per_batch' = normal; 'periodic' = e.g. Ink, record usage every N days */
  usage_type?: 'per_batch' | 'periodic';
  /** Reminder interval in days for periodic materials (e.g. 10) */
  reminder_interval_days?: number | null;
  /** Last time periodic usage was recorded */
  last_periodic_recorded_at?: string | null;
  // Stock breakdown (optional - populated from consumption data)
  available_stock?: number; // Available = current_stock - in_production - reserved
  in_production?: number; // Quantity in production
  reserved?: number; // Quantity reserved for orders
  sold?: number; // Quantity sold/dispatched
  used?: number; // Quantity used (already deducted)
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
  color?: string;
  image_url?: string;
  usage_type?: 'per_batch' | 'periodic';
  reminder_interval_days?: number | null;
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
  usage_type?: 'per_batch' | 'periodic';
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PeriodicDueMaterial extends RawMaterial {
  days_since_last_recorded?: number | null;
  reminder_interval_days?: number;
}

/**
 * Converts a RawMaterial to PeriodicDueMaterial for use in RecordPeriodicUsageDialog.
 * Copies base fields and optional periodic fields (preserving them when present from API).
 * Avoids unsafe `as PeriodicDueMaterial` casts at call sites.
 */
export function toPeriodicDueMaterial(m: RawMaterial): PeriodicDueMaterial {
  const partial = m as RawMaterial & { days_since_last_recorded?: number | null };
  return {
    ...m,
    days_since_last_recorded: partial.days_since_last_recorded ?? undefined,
    reminder_interval_days: m.reminder_interval_days ?? undefined,
  };
}
