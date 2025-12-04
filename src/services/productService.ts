import type { Product, ProductFormData, ProductStats, ProductFilters } from '@/types/product';

const API_URL = import.meta.env.VITE_API_URL;

export class ProductService {
  private static getHeaders(): HeadersInit {
    const token = localStorage.getItem('auth_token');
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  static async getProducts(filters?: ProductFilters): Promise<{ products: Product[]; total: number }> {
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

    const response = await fetch(`${API_URL}/products?${queryParams}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch products');
    }

    const data = await response.json();
    return {
      products: data.data || [],
      total: data.count || 0,
    };
  }

  static async getProductById(id: string): Promise<Product> {
    try {
      const url = `${API_URL}/products/${id}`;
      const response = await fetch(url, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        let errorMessage = `Failed to fetch product: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch (e) {
          errorMessage = `${response.status} ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      
      // Backend returns { success: true, data: product }
      if (data.success !== undefined) {
        if (data.success && data.data) {
          return data.data;
        } else {
          throw new Error(data.error || 'Product not found');
        }
      }
      
      // Fallback for different response structures
      const product = data.data || data.product || data;
      
      if (!product) {
        throw new Error('Product data not found in response');
      }
      
      return product;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to fetch product');
    }
  }

  static async createProduct(productData: ProductFormData): Promise<Product> {
    const response = await fetch(`${API_URL}/products`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(productData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create product');
    }

    const data = await response.json();
    return data.data;
  }

  static async updateProduct(id: string, productData: Partial<ProductFormData>): Promise<Product> {
    const response = await fetch(`${API_URL}/products/${id}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(productData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update product');
    }

    const data = await response.json();
    return data.data;
  }

  static async deleteProduct(id: string): Promise<void> {
    const response = await fetch(`${API_URL}/products/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to delete product');
    }
  }

  static async getProductStats(): Promise<ProductStats> {
    const response = await fetch(`${API_URL}/products/stats`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch product stats');
    }

    const data = await response.json();
    return data.data;
  }

  static async getDropdownData(): Promise<any> {
    const response = await fetch(`${API_URL}/products/dropdown-data`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch dropdown data');
    }

    const data = await response.json();
    return data.data;
  }

  static async toggleIndividualTracking(id: string): Promise<Product> {
    const response = await fetch(`${API_URL}/products/${id}/toggle-individual-tracking`, {
      method: 'PATCH',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to toggle individual tracking');
    }

    const data = await response.json();
    return data.data;
  }

  static async syncStock(id: string): Promise<Product> {
    const response = await fetch(`${API_URL}/products/${id}/sync-stock`, {
      method: 'PATCH',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to sync stock');
    }

    const data = await response.json();
    return data.data;
  }
}
