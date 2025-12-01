/**
 * Dropdown Service - MongoDB API
 * Handles all dropdown master data for products, materials, and production
 */

import { getAuthHeaders, handleAuthError } from '@/utils/apiClient';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://rajdhani.wantace.com/api';

export interface DropdownOption {
  id: string;
  category: string;
  value: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductDropdownData {
  units: DropdownOption[];
  colors: DropdownOption[];
  patterns: DropdownOption[];
  weights: DropdownOption[];
  categories: DropdownOption[];
  subcategories: DropdownOption[];
  lengths: DropdownOption[];
  widths: DropdownOption[];
  weight_units: DropdownOption[];
  length_units: DropdownOption[];
  width_units: DropdownOption[];
}

export interface MaterialDropdownData {
  material_categories: DropdownOption[];
  material_units: DropdownOption[];
}

export interface ProductionDropdownData {
  priorities: DropdownOption[];
  quality_ratings: DropdownOption[];
  waste_types: DropdownOption[];
}

export class DropdownService {
  /**
   * Get all dropdown options (with optional filtering)
   */
  static async getAllDropdownOptions(filters?: {
    category?: string;
    is_active?: boolean;
  }): Promise<{ data: DropdownOption[] | null; error: string | null }> {
    try {
      const params = new URLSearchParams();

      if (filters?.category) params.append('category', filters.category);
      if (filters?.is_active !== undefined) params.append('is_active', filters.is_active.toString());

      const response = await fetch(`${API_BASE_URL}/dropdowns?${params}`, {
        headers: getAuthHeaders()
      });
      await handleAuthError(response);
      const result = await response.json();

      if (!response.ok) {
        return { data: null, error: result.error || 'Failed to fetch dropdown options' };
      }

      return { data: result.data, error: null };
    } catch (error) {
      console.error('Error fetching dropdown options:', error);
      return { data: null, error: 'Failed to fetch dropdown options' };
    }
  }

  /**
   * Get options for a specific category
   */
  static async getOptionsByCategory(category: string): Promise<DropdownOption[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/dropdowns/category/${category}?is_active=true`, {
        headers: getAuthHeaders()
      });
      await handleAuthError(response);
      const result = await response.json();

      if (!response.ok) {
        console.error(`Error fetching ${category} options:`, result.error);
        return [];
      }

      return result.data || [];
    } catch (error) {
      console.error(`Error fetching ${category} options:`, error);
      return [];
    }
  }

  /**
   * Get multiple categories at once
   */
  static async getMultipleCategories(categories: string[]): Promise<Record<string, DropdownOption[]>> {
    try {
      const categoriesParam = categories.join(',');
      const response = await fetch(`${API_BASE_URL}/dropdowns/multiple?categories=${categoriesParam}`, {
        headers: getAuthHeaders()
      });
      await handleAuthError(response);
      const result = await response.json();

      if (!response.ok) {
        console.error('Error fetching multiple categories:', result.error);
        return {};
      }

      return result.data || {};
    } catch (error) {
      console.error('Error fetching multiple categories:', error);
      return {};
    }
  }

  /**
   * Get all product-related dropdown data in one call
   */
  static async getProductDropdownData(): Promise<ProductDropdownData> {
    try {
      const response = await fetch(`${API_BASE_URL}/dropdowns/products`, {
        headers: getAuthHeaders()
      });
      await handleAuthError(response);
      const result = await response.json();

      if (!response.ok) {
        console.error('Error fetching product dropdown data:', result.error);
        return {
          units: [],
          colors: [],
          patterns: [],
          weights: [],
          categories: [],
          subcategories: [],
          lengths: [],
          widths: [],
          weight_units: [],
          length_units: [],
          width_units: []
        };
      }

      return result.data;
    } catch (error) {
      console.error('Error fetching product dropdown data:', error);
      return {
        units: [],
        colors: [],
        patterns: [],
        weights: [],
        categories: [],
        subcategories: [],
        lengths: [],
        widths: [],
        weight_units: [],
        length_units: [],
        width_units: []
      };
    }
  }

  /**
   * Get all material-related dropdown data in one call
   */
  static async getMaterialDropdownData(): Promise<MaterialDropdownData> {
    try {
      const response = await fetch(`${API_BASE_URL}/dropdowns/materials`, {
        headers: getAuthHeaders()
      });
      await handleAuthError(response);
      const result = await response.json();

      if (!response.ok) {
        console.error('Error fetching material dropdown data:', result.error);
        return {
          material_categories: [],
          material_units: []
        };
      }

      return result.data;
    } catch (error) {
      console.error('Error fetching material dropdown data:', error);
      return {
        material_categories: [],
        material_units: []
      };
    }
  }

  /**
   * Get all production-related dropdown data in one call
   */
  static async getProductionDropdownData(): Promise<ProductionDropdownData> {
    try {
      const response = await fetch(`${API_BASE_URL}/dropdowns/production`, {
        headers: getAuthHeaders()
      });
      await handleAuthError(response);
      const result = await response.json();

      if (!response.ok) {
        console.error('Error fetching production dropdown data:', result.error);
        return {
          priorities: [],
          quality_ratings: [],
          waste_types: []
        };
      }

      return result.data;
    } catch (error) {
      console.error('Error fetching production dropdown data:', error);
      return {
        priorities: [],
        quality_ratings: [],
        waste_types: []
      };
    }
  }

  /**
   * Create new dropdown option
   */
  static async addOption(
    category: string,
    value: string,
    displayOrder?: number
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/dropdowns`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          category,
          value,
          display_order: displayOrder
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        return { success: false, error: result.error || 'Failed to add option' };
      }

      return { success: true };
    } catch (error) {
      console.error('Error adding dropdown option:', error);
      return { success: false, error: 'Failed to add option' };
    }
  }

  /**
   * Update dropdown option
   */
  static async updateOption(
    id: string,
    updates: Partial<DropdownOption>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/dropdowns/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(updates),
      });

      const result = await response.json();

      if (!response.ok) {
        return { success: false, error: result.error || 'Failed to update option' };
      }

      return { success: true };
    } catch (error) {
      console.error('Error updating dropdown option:', error);
      return { success: false, error: 'Failed to update option' };
    }
  }

  /**
   * Toggle active status of dropdown option
   */
  static async toggleActiveStatus(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/dropdowns/${id}/toggle`, {
        method: 'PATCH',
        headers: getAuthHeaders()
      });

      await handleAuthError(response);
      const result = await response.json();

      if (!response.ok) {
        return { success: false, error: result.error || 'Failed to toggle status' };
      }

      return { success: true };
    } catch (error) {
      console.error('Error toggling active status:', error);
      return { success: false, error: 'Failed to toggle status' };
    }
  }

  /**
   * Delete dropdown option (hard delete)
   */
  static async deleteOption(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/dropdowns/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      await handleAuthError(response);
      const result = await response.json();

      if (!response.ok) {
        return { success: false, error: result.error || 'Failed to delete option' };
      }

      return { success: true };
    } catch (error) {
      console.error('Error deleting dropdown option:', error);
      return { success: false, error: 'Failed to delete option' };
    }
  }

  /**
   * Deactivate option (soft delete)
   */
  static async deactivateOption(id: string): Promise<{ success: boolean; error?: string }> {
    return this.updateOption(id, { is_active: false });
  }

  /**
   * Get all unique categories
   */
  static async getAllCategories(): Promise<string[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/dropdowns/categories`, {
        headers: getAuthHeaders()
      });
      await handleAuthError(response);
      const result = await response.json();

      if (!response.ok) {
        console.error('Error fetching categories:', result.error);
        return [];
      }

      return result.data || [];
    } catch (error) {
      console.error('Error fetching categories:', error);
      return [];
    }
  }
}

export default DropdownService;
