import type { RawMaterial, RawMaterialFormData, MaterialStats, MaterialFilters } from '@/types/material';

import { getApiUrl } from '@/utils/apiConfig';

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

    if (filters?.status) queryParams.append('status', filters.status);

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

    // Backend uses offset and limit, not page
    const limit = filters?.limit || 20;
    const page = filters?.page || 1;
    const offset = (page - 1) * limit;

    queryParams.append('limit', limit.toString());
    queryParams.append('offset', offset.toString());

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
    const response = await fetch(`${API_URL}/raw-materials/${encodedId}`, {
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

  static async getMaterialStats(): Promise<MaterialStats> {
    const response = await fetch(`${API_URL}/raw-materials/stats`, {
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
}
