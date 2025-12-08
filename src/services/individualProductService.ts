import type { IndividualProduct, IndividualProductFormData } from '@/types/product';

import { getApiUrl } from '@/utils/apiConfig';

const API_URL = getApiUrl();

export class IndividualProductService {
  private static getHeaders(): HeadersInit {
    const token = localStorage.getItem('auth_token');
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  static async getIndividualProducts(filters?: {
    product_id?: string;
    status?: string;
    search?: string;
  }): Promise<{ products: IndividualProduct[]; total: number }> {
    const queryParams = new URLSearchParams();
    if (filters?.product_id) queryParams.append('product_id', filters.product_id);
    if (filters?.status) queryParams.append('status', filters.status);
    if (filters?.search) queryParams.append('search', filters.search);

    const response = await fetch(`${API_URL}/individual-products?${queryParams}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch individual products');
    }

    const data = await response.json();
    return {
      products: data.data || [],
      total: data.count || 0,
    };
  }

  static async getIndividualProductById(id: string): Promise<IndividualProduct> {
    const response = await fetch(`${API_URL}/individual-products/${id}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch individual product');
    }

    const data = await response.json();
    return data.data;
  }

  static async getIndividualProductsByProductId(
    productId: string,
    filters?: {
      status?: string;
      quality_grade?: string;
      search?: string;
      start_date?: string;
      end_date?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<{ products: IndividualProduct[]; total: number }> {
    const queryParams = new URLSearchParams();
    
    if (filters?.status && filters.status !== 'all') {
      queryParams.append('status', filters.status);
    }
    
    if (filters?.quality_grade && filters.quality_grade !== 'all') {
      queryParams.append('quality_grade', filters.quality_grade);
    }
    
    if (filters?.search) {
      queryParams.append('search', filters.search);
    }
    
    if (filters?.start_date) {
      queryParams.append('start_date', filters.start_date);
    }
    
    if (filters?.end_date) {
      queryParams.append('end_date', filters.end_date);
    }
    
    if (filters?.limit) {
      queryParams.append('limit', filters.limit.toString());
    }
    
    if (filters?.offset !== undefined) {
      queryParams.append('offset', filters.offset.toString());
    }

    const response = await fetch(
      `${API_URL}/individual-products/product/${productId}?${queryParams}`,
      {
        headers: this.getHeaders(),
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch individual products');
    }

    const data = await response.json();
    return {
      products: data.data || [],
      total: data.count || 0,
    };
  }

  static async createIndividualProduct(
    productData: IndividualProductFormData
  ): Promise<IndividualProduct> {
    const response = await fetch(`${API_URL}/individual-products`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(productData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create individual product');
    }

    const data = await response.json();
    return data.data;
  }

  static async updateIndividualProduct(
    id: string,
    productData: Partial<IndividualProductFormData>
  ): Promise<IndividualProduct> {
    const response = await fetch(`${API_URL}/individual-products/${id}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(productData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update individual product');
    }

    const data = await response.json();
    return data.data;
  }

  static async deleteIndividualProduct(id: string): Promise<void> {
    const response = await fetch(`${API_URL}/individual-products/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to delete individual product');
    }
  }

  static async createIndividualProducts(
    productId: string,
    quantity: number,
    options?: {
      batch_number?: string;
      quality_grade?: string;
      inspector?: string;
      notes?: string;
    }
  ): Promise<{ created_count: number; product_id: string; product_name: string; batch_number: string }> {
    const response = await fetch(`${API_URL}/individual-products/bulk`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        product_id: productId,
        quantity,
        batch_number: options?.batch_number || `BATCH-${Date.now()}`,
        quality_grade: options?.quality_grade || 'A',
        inspector: options?.inspector || null,
        notes: options?.notes || `Auto-created ${quantity} individual products for product entry`,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create individual products');
    }

    const data = await response.json();
    return data.data;
  }
}
