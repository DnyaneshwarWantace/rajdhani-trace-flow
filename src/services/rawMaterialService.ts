import { RawMaterial, Supplier } from '@/lib/supabase';
import AuthService from './api/authService';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

// Helper function to get headers with auth token
const getHeaders = () => {
  const token = AuthService.getToken();
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  };
};

export interface CreateRawMaterialData {
  id?: string;
  name: string;
  type?: string;
  category: string;
  current_stock: number;
  unit: string;
  min_threshold: number;
  max_capacity: number;
  reorder_point: number;
  daily_usage?: number;
  supplier_id?: string;
  supplier_name: string;
  cost_per_unit: number;
  batch_number?: string;
  quality_grade?: string;
  color?: string;
  image_url?: string;
  supplier_performance?: number;
}

export interface UpdateRawMaterialData extends Partial<CreateRawMaterialData> {
  status?: 'in-stock' | 'low-stock' | 'out-of-stock' | 'overstock' | 'in-transit';
  last_restocked?: string;
  supplier_performance?: number;
}

export interface RawMaterialResponse {
  success: boolean;
  data?: RawMaterial | RawMaterial[];
  error?: string;
  message?: string;
}

export interface SupplierResponse {
  success: boolean;
  data?: Supplier[];
  error?: string;
}

class RawMaterialService {
  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }
    return response.json();
  }

  // Get all raw materials with optional filtering and pagination
  async getRawMaterials(filters?: {
    search?: string;
    category?: string;
    status?: string;
    supplier_id?: string;
    limit?: number;
    offset?: number;
  }): Promise<RawMaterialResponse & { count?: number }> {
    try {
      const params = new URLSearchParams();
      
      // Add filters
      if (filters?.search) params.append('search', filters.search);
      if (filters?.category) params.append('category', filters.category);
      if (filters?.status) params.append('status', filters.status);
      if (filters?.supplier_id) params.append('supplier_id', filters.supplier_id);
      
      // Add pagination
      if (filters?.limit) params.append('limit', filters.limit.toString());
      if (filters?.offset !== undefined) params.append('offset', filters.offset.toString());
      
      // Cache busting
      params.append('_t', Date.now().toString());
      
      const response = await fetch(`${API_BASE_URL}/raw-materials?${params}`, {
        headers: {
          ...getHeaders(),
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      const result = await this.handleResponse<RawMaterialResponse & { count?: number }>(response);
      return result;
    } catch (error) {
      console.error('Error fetching raw materials:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch raw materials'
      };
    }
  }

  // Get raw material by ID
  async getRawMaterialById(id: string): Promise<RawMaterialResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/raw-materials/${id}`, {
        headers: getHeaders()
      });
      const result = await this.handleResponse<RawMaterialResponse>(response);
      return result;
    } catch (error) {
      console.error('Error fetching raw material:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch raw material'
      };
    }
  }

  // Create new raw material
  async createRawMaterial(materialData: CreateRawMaterialData): Promise<RawMaterialResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/raw-materials`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(materialData),
      });
      const result = await this.handleResponse<RawMaterialResponse>(response);
      return result;
    } catch (error) {
      console.error('Error creating raw material:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create raw material'
      };
    }
  }

  // Update raw material
  async updateRawMaterial(id: string, materialData: UpdateRawMaterialData): Promise<RawMaterialResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/raw-materials/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(materialData),
      });
      const result = await this.handleResponse<RawMaterialResponse>(response);
      return result;
    } catch (error) {
      console.error('Error updating raw material:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update raw material'
      };
    }
  }

  // Delete raw material
  async deleteRawMaterial(id: string): Promise<RawMaterialResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/raw-materials/${id}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      const result = await this.handleResponse<RawMaterialResponse>(response);
      return result;
    } catch (error) {
      console.error('Error deleting raw material:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete raw material'
      };
    }
  }

  // Get suppliers for dropdown
  async getSuppliers(): Promise<SupplierResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/suppliers`, {
        headers: getHeaders()
      });
      const result = await this.handleResponse<SupplierResponse>(response);
      return result;
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch suppliers'
      };
    }
  }

  // Get dropdown options for categories, units, types, and colors
  async getDropdownOptions(category: 'material_category' | 'material_unit' | 'material_type' | 'material_color'): Promise<{ success: boolean; data?: any[]; error?: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/dropdowns?category=${category}`, {
        headers: getHeaders()
      });
      const result = await this.handleResponse<{ success: boolean; data?: any[]; error?: string }>(response);
      return result;
    } catch (error) {
      console.error('Error fetching dropdown options:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch dropdown options'
      };
    }
  }

  // Update stock for raw material
  async updateStock(id: string, stockData: { current_stock: number; reason?: string }): Promise<RawMaterialResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/raw-materials/${id}/stock`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(stockData),
      });
      const result = await this.handleResponse<RawMaterialResponse>(response);
      return result;
    } catch (error) {
      console.error('Error updating stock:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update stock'
      };
    }
  }

  // Get low stock materials
  async getLowStockMaterials(): Promise<RawMaterialResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/raw-materials/low-stock`, {
        headers: getHeaders()
      });
      const result = await this.handleResponse<RawMaterialResponse>(response);
      return result;
    } catch (error) {
      console.error('Error fetching low stock materials:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch low stock materials'
      };
    }
  }

  // Search raw materials
  async searchRawMaterials(query: string): Promise<RawMaterialResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/raw-materials/search?q=${encodeURIComponent(query)}`, {
        headers: getHeaders()
      });
      const result = await this.handleResponse<RawMaterialResponse>(response);
      return result;
    } catch (error) {
      console.error('Error searching raw materials:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to search raw materials'
      };
    }
  }
}

// Export singleton instance
export const rawMaterialService = new RawMaterialService();
export { RawMaterialService };
export default rawMaterialService;