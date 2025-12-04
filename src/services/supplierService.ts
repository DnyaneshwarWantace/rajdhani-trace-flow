const API_URL = import.meta.env.VITE_API_URL || '/api';

export interface Supplier {
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
  performance_rating?: number;
  total_orders?: number;
  total_value?: number;
  status?: 'active' | 'inactive' | 'suspended';
  created_at?: string;
  updated_at?: string;
}

export interface CreateSupplierData {
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

export interface UpdateSupplierData extends Partial<CreateSupplierData> {
  performance_rating?: number;
  status?: 'active' | 'inactive' | 'suspended';
}

export class SupplierService {
  private static getHeaders(): HeadersInit {
    const token = localStorage.getItem('auth_token');
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  static async getSuppliers(filters?: {
    search?: string;
    status?: string;
  }): Promise<{ data: Supplier[] | null; error: string | null }> {
    try {
      const params = new URLSearchParams();

      if (filters?.search) params.append('search', filters.search);
      if (filters?.status) params.append('status', filters.status);

      const response = await fetch(`${API_URL}/suppliers?${params}`, {
        headers: this.getHeaders(),
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

  static async getSupplierById(supplierId: string): Promise<{ data: Supplier | null; error: string | null }> {
    try {
      const response = await fetch(`${API_URL}/suppliers/${supplierId}`, {
        headers: this.getHeaders(),
      });
      const result = await response.json();

      if (!response.ok) {
        return { data: null, error: result.error || 'Supplier not found' };
      }

      return { data: result.data, error: null };
    } catch (error) {
      console.error('Error in getSupplierById:', error);
      return { data: null, error: 'Failed to fetch supplier' };
    }
  }

  static async createSupplier(supplierData: CreateSupplierData): Promise<{ data: Supplier | null; error: string | null }> {
    try {
      const response = await fetch(`${API_URL}/suppliers`, {
        method: 'POST',
        headers: this.getHeaders(),
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

  static async updateSupplier(supplierId: string, updateData: UpdateSupplierData): Promise<{ data: Supplier | null; error: string | null }> {
    try {
      const response = await fetch(`${API_URL}/suppliers/${supplierId}`, {
        method: 'PUT',
        headers: this.getHeaders(),
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

  static async deleteSupplier(supplierId: string): Promise<{ data: boolean | null; error: string | null }> {
    try {
      const response = await fetch(`${API_URL}/suppliers/${supplierId}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
      });

      const result = await response.json();

      if (!response.ok) {
        return { data: null, error: result.error || 'Failed to delete supplier' };
      }

      return { data: result.success, error: null };
    } catch (error) {
      console.error('Error in deleteSupplier:', error);
      return { data: null, error: 'Failed to delete supplier' };
    }
  }

  static async getSupplierStats(): Promise<{ data: any | null; error: string | null }> {
    try {
      const response = await fetch(`${API_URL}/suppliers/stats`, {
        headers: this.getHeaders(),
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

