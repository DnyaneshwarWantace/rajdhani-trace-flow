import type { IndividualProduct, IndividualProductFormData } from '@/types/product';
import { getServiceError } from '@/utils/apiHelpers';

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
      status?: string | string[];
      search?: string;
      start_date?: string;
      end_date?: string;
      location?: string | string[];
      limit?: number;
      offset?: number;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    }
  ): Promise<{ products: IndividualProduct[]; total: number }> {
    const queryParams = new URLSearchParams();
    
    // Handle location filter - array or comma-separated
    if (filters?.location && (Array.isArray(filters.location) ? filters.location.length > 0 : filters.location)) {
      const locArray = Array.isArray(filters.location) ? filters.location : [filters.location];
      const cleaned = locArray.filter((s: string) => s && s !== 'all');
      if (cleaned.length > 0) {
        queryParams.append('location', cleaned.join(','));
      }
    }
    
    // Handle status as array (multi-select) - send as comma-separated string
    if (filters?.status && filters.status !== 'all') {
      const statusArray = Array.isArray(filters.status) ? filters.status : [filters.status];
      const cleanedStatuses = statusArray.filter(s => s && s !== 'all');
      if (cleanedStatuses.length > 0) {
        queryParams.append('status', cleanedStatuses.join(','));
      }
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

    if (filters?.sortBy) {
      queryParams.append('sortBy', filters.sortBy);
    }

    if (filters?.sortOrder) {
      queryParams.append('sortOrder', filters.sortOrder);
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
      throw new Error(getServiceError(response, error));
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
      throw new Error(getServiceError(response, error));
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
        inspector: options?.inspector || null,
        notes: options?.notes || '',
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(getServiceError(response, error));
    }

    const data = await response.json();
    return data.data;
  }
}
