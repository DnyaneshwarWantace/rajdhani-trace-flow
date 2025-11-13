import { Supplier } from '@/lib/supabase';
import AuthService from './authService';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

// Helper function to get headers with auth token
const getHeaders = () => {
  const token = AuthService.getToken();
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  };
};

export interface CreateSupplierData {
  id: string;
  name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  gst_number?: string;
}

export class SupplierService {
  // Create a new supplier
  static async createSupplier(supplierData: CreateSupplierData): Promise<{ data: Supplier | null; error: string | null }> {
    try {
      const response = await fetch(`${API_BASE_URL}/suppliers`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(supplierData),
      });

      const result = await response.json();

      if (!response.ok) {
        return { data: null, error: result.error || 'Failed to create supplier' };
      }

      return { data: result.data, error: null };
    } catch (error) {
      console.error('Error in createSupplier:', error);
      return { data: null, error: 'Failed to create supplier' };
    }
  }

  // Get all suppliers
  static async getSuppliers(filters?: {
    search?: string;
    status?: string;
  }): Promise<{ data: Supplier[] | null; error: string | null }> {
    try {
      const params = new URLSearchParams();

      if (filters?.search) params.append('search', filters.search);
      if (filters?.status) params.append('status', filters.status);

      const response = await fetch(`${API_BASE_URL}/suppliers?${params}`, {
        headers: getHeaders()
      });
      const result = await response.json();

      if (!response.ok) {
        return { data: null, error: result.error || 'Failed to fetch suppliers' };
      }

      return { data: result.data, error: null };
    } catch (error) {
      console.error('Error in getSuppliers:', error);
      return { data: null, error: 'Failed to fetch suppliers' };
    }
  }

  // Get supplier by ID
  static async getSupplierById(supplierId: string): Promise<{ data: Supplier | null; error: string | null }> {
    try {
      const response = await fetch(`${API_BASE_URL}/suppliers/${supplierId}`, {
        headers: getHeaders()
      });
      const result = await response.json();

      if (!response.ok) {
        return { data: null, error: result.error || 'Failed to fetch supplier' };
      }

      return { data: result.data, error: null };
    } catch (error) {
      console.error('Error in getSupplierById:', error);
      return { data: null, error: 'Failed to fetch supplier' };
    }
  }

  // Update supplier
  static async updateSupplier(supplierId: string, updateData: Partial<CreateSupplierData>): Promise<{ data: Supplier | null; error: string | null }> {
    try {
      const response = await fetch(`${API_BASE_URL}/suppliers/${supplierId}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(updateData),
      });

      const result = await response.json();

      if (!response.ok) {
        return { data: null, error: result.error || 'Failed to update supplier' };
      }

      return { data: result.data, error: null };
    } catch (error) {
      console.error('Error in updateSupplier:', error);
      return { data: null, error: 'Failed to update supplier' };
    }
  }

  // Delete supplier
  static async deleteSupplier(supplierId: string): Promise<{ success: boolean; error: string | null }> {
    try {
      const response = await fetch(`${API_BASE_URL}/suppliers/${supplierId}`, {
        method: 'DELETE',
        headers: getHeaders()
      });

      const result = await response.json();

      if (!response.ok) {
        return { success: false, error: result.error || 'Failed to delete supplier' };
      }

      return { success: true, error: null };
    } catch (error) {
      console.error('Error in deleteSupplier:', error);
      return { success: false, error: 'Failed to delete supplier' };
    }
  }

  // Get supplier statistics
  static async getSupplierStats(supplierId: string): Promise<{ data: any | null; error: string | null }> {
    try {
      const response = await fetch(`${API_BASE_URL}/suppliers/${supplierId}/stats`, {
        headers: getHeaders()
      });
      const result = await response.json();

      if (!response.ok) {
        return { data: null, error: result.error || 'Failed to fetch supplier stats' };
      }

      return { data: result.data, error: null };
    } catch (error) {
      console.error('Error in getSupplierStats:', error);
      return { data: null, error: 'Failed to fetch supplier stats' };
    }
  }
}

export default SupplierService;
