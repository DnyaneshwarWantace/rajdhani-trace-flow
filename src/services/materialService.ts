import type { RawMaterial, RawMaterialFormData, MaterialStats, MaterialFilters, PeriodicDueMaterial } from '@/types/material';

import { getApiUrl } from '@/utils/apiConfig';

export interface StockMovement {
  id: string;
  material_id: string;
  material_name: string;
  movement_type: string;
  quantity: number;
  unit: string;
  reason: string;
  reference_type?: string;
  reference_id?: string;
  operator?: string;
  notes?: string;
  createdAt?: string;
  created_at?: string;
}

const API_URL = getApiUrl();

export class MaterialService {
  private static getHeaders(): HeadersInit {
    const token = localStorage.getItem('auth_token');
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  static async getMaterials(filters?: MaterialFilters): Promise<{ materials: RawMaterial[]; total: number }> {
    const queryParams = new URLSearchParams();
    if (filters?.search) queryParams.append('search', filters.search);

    // Handle array filters - append each value separately
    if (filters?.category) {
      const categories = Array.isArray(filters.category) ? filters.category : [filters.category];
      categories.forEach(cat => cat && queryParams.append('category', cat));
    }

    if (filters?.status) {
      const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
      statuses.forEach(status => status && queryParams.append('status', status));
    }

    // Handle other array filters
    if (filters?.type) {
      const types = Array.isArray(filters.type) ? filters.type : [filters.type];
      types.forEach(type => type && queryParams.append('type', type));
    }

    if (filters?.color) {
      const colors = Array.isArray(filters.color) ? filters.color : [filters.color];
      colors.forEach(color => color && queryParams.append('color', color));
    }

    if (filters?.supplier) {
      const suppliers = Array.isArray(filters.supplier) ? filters.supplier : [filters.supplier];
      suppliers.forEach(supplier => supplier && queryParams.append('supplier', supplier));
    }

    if (filters?.usage_type) {
      queryParams.append('usage_type', filters.usage_type);
    }

    // Backend uses offset and limit, not page
    const limit = filters?.limit || 20;
    const page = filters?.page || 1;
    const offset = (page - 1) * limit;

    queryParams.append('limit', limit.toString());
    queryParams.append('offset', offset.toString());
    queryParams.append('include_consumption', 'true'); // Include stock breakdown

    // Add sorting parameters
    if (filters?.sortBy) {
      queryParams.append('sortBy', filters.sortBy);
    }
    if (filters?.sortOrder) {
      queryParams.append('sortOrder', filters.sortOrder);
    }

    const response = await fetch(`${API_URL}/raw-materials?${queryParams}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch materials');
    }

    const data = await response.json();
    return {
      materials: data.data || [],
      total: data.count || data.total || 0,
    };
  }

  static async getMaterialById(id: string): Promise<RawMaterial> {
    const encodedId = encodeURIComponent(id);
    const response = await fetch(`${API_URL}/raw-materials/${encodedId}?include_consumption=true`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch material');
    }

    const data = await response.json();
    return data.data;
  }

  static async createMaterial(materialData: RawMaterialFormData): Promise<RawMaterial> {
    const response = await fetch(`${API_URL}/raw-materials`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(materialData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create material');
    }

    const data = await response.json();
    return data.data;
  }

  static async updateMaterial(id: string, materialData: Partial<RawMaterialFormData>): Promise<RawMaterial> {
    const encodedId = encodeURIComponent(id);
    const response = await fetch(`${API_URL}/raw-materials/${encodedId}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(materialData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update material');
    }

    const data = await response.json();
    return data.data;
  }

  static async deleteMaterial(id: string): Promise<void> {
    const encodedId = encodeURIComponent(id);
    const response = await fetch(`${API_URL}/raw-materials/${encodedId}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to delete material' }));
      throw new Error(error.error || 'Failed to delete material');
    }
  }

  static async getMaterialStats(category?: string): Promise<MaterialStats> {
    const params = new URLSearchParams();
    if (category) params.set('category', category);
    const url = `${API_URL}/raw-materials/stats${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await fetch(url, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch material stats');
    }

    const data = await response.json();
    return data.data;
  }

  static async adjustStock(id: string, quantity: number, type: 'add' | 'subtract'): Promise<RawMaterial> {
    const response = await fetch(`${API_URL}/raw-materials/${id}/adjust-stock`, {
      method: 'PATCH',
      headers: this.getHeaders(),
      body: JSON.stringify({ quantity, type }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to adjust stock');
    }

    const data = await response.json();
    return data.data;
  }

  static async getPeriodicDueMaterials(): Promise<{
    materials: PeriodicDueMaterial[];
    isFixedReminderDay?: boolean;
  }> {
    const response = await fetch(`${API_URL}/raw-materials/periodic-due`, {
      headers: this.getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch periodic-due materials');
    const json = await response.json();
    const materials = json.data || [];
    const isFixedReminderDay = !!json.is_fixed_reminder_day;
    return { materials, isFixedReminderDay };
  }

  static async getStockHistory(materialId: string, params?: { limit?: number; offset?: number }): Promise<{ data: StockMovement[]; count: number }> {
    const query = new URLSearchParams();
    if (params?.limit != null) query.append('limit', String(params.limit));
    if (params?.offset != null) query.append('offset', String(params.offset));
    const response = await fetch(`${API_URL}/raw-materials/${encodeURIComponent(materialId)}/history?${query}`, {
      headers: this.getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch stock history');
    const json = await response.json();
    return { data: json.data || [], count: json.count ?? 0 };
  }

  static async recordPeriodicConsumption(payload: {
    material_id: string;
    quantity_used: number;
    period_end_date?: string;
    notes?: string;
  }): Promise<{ record: any; material: RawMaterial }> {
    const response = await fetch(`${API_URL}/raw-materials/periodic-consumption`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Failed to record periodic usage');
    }
    const data = await response.json();
    return data.data;
  }
}
