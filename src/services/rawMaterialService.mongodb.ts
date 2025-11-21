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
  image_url?: string;
  supplier_performance?: number;
}

export interface UpdateRawMaterialData extends Partial<CreateRawMaterialData> {
  status?: 'in-stock' | 'low-stock' | 'out-of-stock' | 'overstock' | 'in-transit';
  last_restocked?: string;
  supplier_performance?: number;
}

export class RawMaterialService {
  // Create a new raw material
  static async createRawMaterial(materialData: CreateRawMaterialData): Promise<{ data: RawMaterial | null; error: string | null }> {
    try {
      const response = await fetch(`${API_BASE_URL}/raw-materials`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(materialData),
      });

      const result = await response.json();

      if (!response.ok) {
        return { data: null, error: result.error || 'Failed to create raw material' };
      }

      return { data: result.data, error: null };
    } catch (error) {
      console.error('Error in createRawMaterial:', error);
      return { data: null, error: 'Failed to create raw material' };
    }
  }

  // Get all raw materials with optional filtering
  static async getRawMaterials(filters?: {
    search?: string;
    category?: string;
    status?: string;
    supplier_id?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ data: RawMaterial[] | null; error: string | null; count?: number }> {
    try {
      const params = new URLSearchParams();

      if (filters?.search) params.append('search', filters.search);
      if (filters?.category) params.append('category', filters.category);
      if (filters?.status) params.append('status', filters.status);
      if (filters?.supplier_id) params.append('supplier_id', filters.supplier_id);
      if (filters?.limit) params.append('limit', filters.limit.toString());
      if (filters?.offset) params.append('offset', filters.offset.toString());

      const response = await fetch(`${API_BASE_URL}/raw-materials?${params}`);
      const result = await response.json();

      if (!response.ok) {
        return { data: null, error: result.error || 'Failed to fetch raw materials' };
      }

      return { data: result.data, error: null, count: result.count };
    } catch (error) {
      console.error('Error in getRawMaterials:', error);
      return { data: null, error: 'Failed to fetch raw materials' };
    }
  }

  // Get raw material by ID
  static async getRawMaterialById(materialId: string): Promise<{ data: RawMaterial | null; error: string | null }> {
    try {
      const response = await fetch(`${API_BASE_URL}/raw-materials/${materialId}`);
      const result = await response.json();

      if (!response.ok) {
        return { data: null, error: result.error || 'Failed to fetch raw material' };
      }

      return { data: result.data, error: null };
    } catch (error) {
      console.error('Error in getRawMaterialById:', error);
      return { data: null, error: 'Failed to fetch raw material' };
    }
  }

  // Update a raw material
  static async updateRawMaterial(materialId: string, updateData: UpdateRawMaterialData): Promise<{ data: RawMaterial | null; error: string | null }> {
    try {
      const response = await fetch(`${API_BASE_URL}/raw-materials/${materialId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      const result = await response.json();

      if (!response.ok) {
        return { data: null, error: result.error || 'Failed to update raw material' };
      }

      return { data: result.data, error: null };
    } catch (error) {
      console.error('Error in updateRawMaterial:', error);
      return { data: null, error: 'Failed to update raw material' };
    }
  }

  // Get inventory statistics
  static async getInventoryStats(): Promise<{
    totalMaterials: number;
    inStock: number;
    lowStock: number;
    outOfStock: number;
    overstock: number;
    totalValue: number;
    averageValue: number;
  }> {
    try {
      const response = await fetch(`${API_BASE_URL}/raw-materials/stats`, {
        headers: getHeaders()
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch inventory stats');
      }

      return result.data;
    } catch (error) {
      console.error('Error getting inventory stats:', error);
      return {
        totalMaterials: 0,
        inStock: 0,
        lowStock: 0,
        outOfStock: 0,
        overstock: 0,
        totalValue: 0,
        averageValue: 0
      };
    }
  }

  // Get materials requiring reorder
  static async getMaterialsRequiringReorder(): Promise<{ data: RawMaterial[] | null; error: string | null }> {
    try {
      const response = await fetch(`${API_BASE_URL}/raw-materials/reorder`);
      const result = await response.json();

      if (!response.ok) {
        return { data: null, error: result.error || 'Failed to fetch materials requiring reorder' };
      }

      return { data: result.data, error: null };
    } catch (error) {
      console.error('Error in getMaterialsRequiringReorder:', error);
      return { data: null, error: 'Failed to fetch materials requiring reorder' };
    }
  }

  // Note: Material consumption and supplier methods would need similar updates
  // For now, keeping original Supabase implementations as placeholders
  static async recordMaterialConsumption(consumptionData: any): Promise<{ success: boolean; error: string | null }> {
    // TODO: Implement MongoDB version
    return { success: false, error: 'Not yet implemented for MongoDB' };
  }

  static async getMaterialConsumptionHistory(materialId?: string, batchId?: string): Promise<{ data: any[] | null; error: string | null }> {
    // TODO: Implement MongoDB version
    return { data: null, error: 'Not yet implemented for MongoDB' };
  }

  static async createSupplier(supplierData: any): Promise<{ data: Supplier | null; error: string | null }> {
    // TODO: Implement MongoDB version
    return { data: null, error: 'Not yet implemented for MongoDB' };
  }

  static async getSuppliers(): Promise<{ data: Supplier[] | null; error: string | null }> {
    // TODO: Implement MongoDB version
    return { data: null, error: 'Not yet implemented for MongoDB' };
  }
}

export default RawMaterialService;
