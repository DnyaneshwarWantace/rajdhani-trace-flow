import AuthService from './authService';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://rajdhani.wantace.com/api';

// Helper function to get headers with auth token
const getHeaders = () => {
  const token = AuthService.getToken();
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  };
};

export interface Product {
  id: string;
  qr_code: string;
  name: string;
  category: string;
  subcategory?: string;
  color?: string;
  pattern?: string;
  unit: string;
  base_quantity: number;
  current_stock: number;
  status: 'in-stock' | 'low-stock' | 'out-of-stock' | 'active' | 'inactive' | 'discontinued';
  individual_stock_tracking: boolean;
  min_stock_level: number;
  max_stock_level: number;
  weight?: string;
  weight_unit?: string;
  width: string;
  length: string;
  length_unit: string;
  width_unit: string;
  notes?: string;
  image_url?: string;
  manufacturing_date?: string;
  has_recipe: boolean;
  individual_products_count?: number;
  created_at: string;
  updated_at: string;
}

export interface CreateProductData {
  name: string;
  category: string;
  subcategory?: string;
  color?: string;
  pattern?: string;
  unit: string;
  individual_stock_tracking?: boolean;
  min_stock_level?: number;
  max_stock_level?: number;
  base_quantity?: number;
  weight?: string;
  weight_unit?: string;
  width: string;
  length: string;
  length_unit: string;
  width_unit: string;
  notes?: string;
  image_url?: string;
  manufacturing_date?: string;
  qr_code?: string;
}

export interface UpdateProductData extends Partial<CreateProductData> {
  status?: 'in-stock' | 'low-stock' | 'out-of-stock' | 'active' | 'inactive' | 'discontinued';
}

export interface ProductStats {
  totalProducts: number;
  inStock: number;
  lowStock: number;
  outOfStock: number;
  totalProduced: number;
  totalSold: number;
  availableUnits: number;
}

export class ProductService {
  // Create a new product
  static async createProduct(productData: CreateProductData): Promise<{ data: Product | null; error: string | null }> {
    try {
      const response = await fetch(`${API_BASE_URL}/products`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(productData),
      });

      const result = await response.json();

      if (!response.ok) {
        return { data: null, error: result.error || 'Failed to create product' };
      }

      return { data: result.data, error: null };
    } catch (error) {
      console.error('Error creating product:', error);
      return { data: null, error: 'Failed to create product' };
    }
  }

  // Get all products with optional filtering
  static async getProducts(filters?: {
    search?: string;
    category?: string;
    status?: string;
    individual_stock_tracking?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<{ data: Product[] | null; error: string | null; count?: number }> {
    try {
      const params = new URLSearchParams();
      
      if (filters?.search) params.append('search', filters.search);
      if (filters?.category) params.append('category', filters.category);
      if (filters?.status) params.append('status', filters.status);
      if (filters?.individual_stock_tracking !== undefined) {
        params.append('individual_stock_tracking', filters.individual_stock_tracking.toString());
      }
      if (filters?.limit) params.append('limit', filters.limit.toString());
      if (filters?.offset) params.append('offset', filters.offset.toString());
      
      // Add cache-busting timestamp to prevent browser caching
      params.append('_t', Date.now().toString());

      const response = await fetch(`${API_BASE_URL}/products?${params}`, {
        headers: {
          ...getHeaders(),
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      const result = await response.json();

      if (!response.ok) {
        return { data: null, error: result.error || 'Failed to fetch products' };
      }

      return { data: result.data, error: null, count: result.count };
    } catch (error) {
      console.error('Error fetching products:', error);
      return { data: null, error: 'Failed to fetch products' };
    }
  }

  // Get product by ID
  static async getProductById(id: string): Promise<{ data: Product | null; error: string | null }> {
    try {
      const response = await fetch(`${API_BASE_URL}/products/${id}`, {
        headers: getHeaders()
      });
      const result = await response.json();

      if (!response.ok) {
        return { data: null, error: result.error || 'Product not found' };
      }

      return { data: result.data, error: null };
    } catch (error) {
      console.error('Error fetching product:', error);
      return { data: null, error: 'Failed to fetch product' };
    }
  }

  // Update product
  static async updateProduct(id: string, updateData: UpdateProductData): Promise<{ data: Product | null; error: string | null }> {
    try {
      const response = await fetch(`${API_BASE_URL}/products/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(updateData),
      });

      const result = await response.json();

      if (!response.ok) {
        return { data: null, error: result.error || 'Failed to update product' };
      }

      return { data: result.data, error: null };
    } catch (error) {
      console.error('Error updating product:', error);
      return { data: null, error: 'Failed to update product' };
    }
  }

  // Delete product
  static async deleteProduct(id: string): Promise<{ success: boolean; error: string | null }> {
    try {
      const response = await fetch(`${API_BASE_URL}/products/${id}`, {
        method: 'DELETE',
        headers: getHeaders()
      });

      const result = await response.json();

      if (!response.ok) {
        return { success: false, error: result.error || 'Failed to delete product' };
      }

      return { success: true, error: null };
    } catch (error) {
      console.error('Error deleting product:', error);
      return { success: false, error: 'Failed to delete product' };
    }
  }

  // Get product statistics
  static async getProductStats(): Promise<{ data: ProductStats | null; error: string | null }> {
    try {
      const response = await fetch(`${API_BASE_URL}/products/stats`, {
        headers: getHeaders()
      });
      const result = await response.json();

      if (!response.ok) {
        return { data: null, error: result.error || 'Failed to fetch product stats' };
      }

      return { data: result.data, error: null };
    } catch (error) {
      console.error('Error fetching product stats:', error);
      return { data: null, error: 'Failed to fetch product stats' };
    }
  }

  // Get dropdown data for products
  static async getProductDropdownData(): Promise<{ data: any | null; error: string | null }> {
    try {
      const response = await fetch(`${API_BASE_URL}/products/dropdown-data`, {
        headers: getHeaders()
      });
      const result = await response.json();

      if (!response.ok) {
        return { data: null, error: result.error || 'Failed to fetch dropdown data' };
      }

      return { data: result.data, error: null };
    } catch (error) {
      console.error('Error fetching dropdown data:', error);
      return { data: null, error: 'Failed to fetch dropdown data' };
    }
  }

  // Toggle individual stock tracking
  static async toggleIndividualStockTracking(id: string): Promise<{ data: Product | null; error: string | null }> {
    try {
      const response = await fetch(`${API_BASE_URL}/products/${id}/toggle-individual-tracking`, {
        method: 'PATCH',
        headers: getHeaders()
      });

      const result = await response.json();

      if (!response.ok) {
        return { data: null, error: result.error || 'Failed to toggle individual stock tracking' };
      }

      return { data: result.data, error: null };
    } catch (error) {
      console.error('Error toggling individual stock tracking:', error);
      return { data: null, error: 'Failed to toggle individual stock tracking' };
    }
  }
}

export default ProductService;
