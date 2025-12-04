import type { RawMaterial, RawMaterialFormData, MaterialStats, MaterialFilters } from '@/types/material';

const API_URL = import.meta.env.VITE_API_URL;

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
    if (filters?.category) queryParams.append('category', filters.category);
    if (filters?.status) queryParams.append('status', filters.status);
    
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
    const response = await fetch(`${API_URL}/raw-materials/${id}`, {
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
    const response = await fetch(`${API_URL}/raw-materials/${id}`, {
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
    const response = await fetch(`${API_URL}/raw-materials/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to delete material');
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
