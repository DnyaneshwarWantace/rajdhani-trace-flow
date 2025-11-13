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

export interface IndividualProduct {
  id: string;
  product_id: string;
  qr_code: string;
  serial_number: string;
  product_name: string;
  color?: string;
  pattern?: string;
  length: string;
  width: string;
  weight?: string;
  final_length?: string;
  final_width?: string;
  final_weight?: string;
  quality_grade: string;
  status: 'available' | 'sold' | 'damaged' | 'returned' | 'in-production';
  location?: string;
  production_date?: string;
  completion_date?: string;
  inspector?: string;
  notes?: string;
  sold_date?: string;
  customer_id?: string;
  order_id?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateIndividualProductData {
  product_id: string;
  product_name: string;
  color?: string;
  pattern?: string;
  length: string;
  width: string;
  weight?: string;
  final_weight?: string;
  final_width?: string;
  final_length?: string;
  quality_grade?: string;
  status?: 'available' | 'sold' | 'damaged' | 'returned' | 'in-production';
  location?: string;
  production_date?: string;
  completion_date?: string;
  inspector?: string;
  notes?: string;
}

export interface UpdateIndividualProductData extends Partial<CreateIndividualProductData> {
  status?: 'available' | 'sold' | 'damaged' | 'returned' | 'in-production';
  sold_date?: string;
  customer_id?: string;
  order_id?: string;
}

export class IndividualProductService {
  // Create individual products in bulk
  static async createIndividualProducts(
    productId: string, 
    quantity: number, 
    options: {
      batch_number?: string;
      quality_grade?: string;
      inspector?: string;
      notes?: string;
    } = {}
  ): Promise<{ data: any | null; error: string | null }> {
    try {
      const response = await fetch(`${API_BASE_URL}/individual-products/bulk`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          product_id: productId,
          quantity,
          batch_number: options.batch_number,
          quality_grade: options.quality_grade,
          inspector: options.inspector,
          notes: options.notes
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        return { data: null, error: result.error || 'Failed to create individual products' };
      }

      return { data: result.data, error: null };
    } catch (error) {
      console.error('Error creating individual products:', error);
      return { data: null, error: 'Failed to create individual products' };
    }
  }

  // Get individual products by product ID
  static async getIndividualProductsByProductId(
    productId: string,
    filters?: {
      status?: string;
      quality_grade?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<{ data: IndividualProduct[] | null; error: string | null; count?: number }> {
    try {
      const params = new URLSearchParams();
      params.append('product_id', productId);
      
      if (filters?.status) params.append('status', filters.status);
      if (filters?.quality_grade) params.append('quality_grade', filters.quality_grade);
      if (filters?.limit) params.append('limit', filters.limit.toString());
      if (filters?.offset) params.append('offset', filters.offset.toString());

      const response = await fetch(`${API_BASE_URL}/individual-products/product/${productId}?${params}`, {
        headers: getHeaders()
      });
      const result = await response.json();

      if (!response.ok) {
        return { data: null, error: result.error || 'Failed to fetch individual products' };
      }

      return { data: result.data, error: null, count: result.count };
    } catch (error) {
      console.error('Error fetching individual products:', error);
      return { data: null, error: 'Failed to fetch individual products' };
    }
  }

  // Get individual product by ID
  static async getIndividualProductById(id: string): Promise<{ data: IndividualProduct | null; error: string | null }> {
    try {
      const response = await fetch(`${API_BASE_URL}/individual-products/${id}`, {
        headers: getHeaders()
      });
      const result = await response.json();

      if (!response.ok) {
        return { data: null, error: result.error || 'Individual product not found' };
      }

      return { data: result.data, error: null };
    } catch (error) {
      console.error('Error fetching individual product:', error);
      return { data: null, error: 'Failed to fetch individual product' };
    }
  }

  // Update individual product
  static async updateIndividualProduct(
    id: string, 
    updateData: UpdateIndividualProductData
  ): Promise<{ data: IndividualProduct | null; error: string | null }> {
    try {
      const response = await fetch(`${API_BASE_URL}/individual-products/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(updateData),
      });

      const result = await response.json();

      if (!response.ok) {
        return { data: null, error: result.error || 'Failed to update individual product' };
      }

      return { data: result.data, error: null };
    } catch (error) {
      console.error('Error updating individual product:', error);
      return { data: null, error: 'Failed to update individual product' };
    }
  }

  // Delete individual product
  static async deleteIndividualProduct(id: string): Promise<{ success: boolean; error: string | null }> {
    try {
      const response = await fetch(`${API_BASE_URL}/individual-products/${id}`, {
        method: 'DELETE',
        headers: getHeaders()
      });

      const result = await response.json();

      if (!response.ok) {
        return { success: false, error: result.error || 'Failed to delete individual product' };
      }

      return { success: true, error: null };
    } catch (error) {
      console.error('Error deleting individual product:', error);
      return { success: false, error: 'Failed to delete individual product' };
    }
  }

  // Get available individual products for a specific product
  static async getAvailableIndividualProducts(
    productId: string, 
    qualityGrade?: string
  ): Promise<{ data: IndividualProduct[] | null; error: string | null }> {
    try {
      const params = new URLSearchParams();
      params.append('product_id', productId);
      params.append('status', 'available');
      
      if (qualityGrade && qualityGrade !== 'all') {
        params.append('quality_grade', qualityGrade);
      }

      const response = await fetch(`${API_BASE_URL}/individual-products?${params}`, {
        headers: getHeaders()
      });
      const result = await response.json();

      if (!response.ok) {
        return { data: null, error: result.error || 'Failed to fetch available individual products' };
      }

      return { data: result.data, error: null };
    } catch (error) {
      console.error('Error fetching available individual products:', error);
      return { data: null, error: 'Failed to fetch available individual products' };
    }
  }

  // Get all available individual products (for order selection)
  static async getAllAvailableIndividualProducts(): Promise<{ data: IndividualProduct[] | null; error: string | null }> {
    try {
      const params = new URLSearchParams();
      params.append('status', 'available');

      const response = await fetch(`${API_BASE_URL}/individual-products?${params}`, {
        headers: getHeaders()
      });
      const result = await response.json();

      if (!response.ok) {
        return { data: null, error: result.error || 'Failed to fetch available individual products' };
      }

      return { data: result.data, error: null };
    } catch (error) {
      console.error('Error fetching all available individual products:', error);
      return { data: null, error: 'Failed to fetch available individual products' };
    }
  }

  // Get individual product statistics
  static async getIndividualProductStats(productId?: string): Promise<{ data: any | null; error: string | null }> {
    try {
      const params = new URLSearchParams();
      if (productId) params.append('product_id', productId);

      const response = await fetch(`${API_BASE_URL}/individual-products/stats?${params}`, {
        headers: getHeaders()
      });
      const result = await response.json();

      if (!response.ok) {
        return { data: null, error: result.error || 'Failed to fetch individual product stats' };
      }

      return { data: result.data, error: null };
    } catch (error) {
      console.error('Error fetching individual product stats:', error);
      return { data: null, error: 'Failed to fetch individual product stats' };
    }
  }

  // Get individual products for a specific production batch
  static async getIndividualProductsByBatch(
    batchNumber: string,
    filters?: { status?: string; quality_grade?: string; limit?: number; offset?: number }
  ): Promise<{ data: IndividualProduct[] | null; error: string | null; count?: number }> {
    try {
      const params = new URLSearchParams();
      params.append('batch_number', batchNumber);
      if (filters?.status) params.append('status', filters.status);
      if (filters?.quality_grade) params.append('quality_grade', filters.quality_grade);
      if (filters?.limit) params.append('limit', filters.limit.toString());
      if (filters?.offset) params.append('offset', filters.offset.toString());

      const response = await fetch(`${API_BASE_URL}/individual-products?${params}`, {
        headers: getHeaders()
      });
      const result = await response.json();

      if (!response.ok) {
        return { data: null, error: result.error || 'Failed to fetch individual products by batch' };
      }

      return { data: result.data, error: null, count: result.count };
    } catch (error) {
      console.error('Error fetching individual products by batch:', error);
      return { data: null, error: 'Failed to fetch individual products by batch' };
    }
  }
}

export default IndividualProductService;
