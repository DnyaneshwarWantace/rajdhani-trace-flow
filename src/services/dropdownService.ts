import type { DropdownOption, DropdownFormData, GroupedDropdowns } from '@/types/dropdown';
import { getApiUrl } from '@/utils/apiConfig';

const API_URL = getApiUrl();

export class DropdownService {
  private static getHeaders(): HeadersInit {
    const token = localStorage.getItem('auth_token');
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  static async getAllDropdowns(): Promise<GroupedDropdowns> {
    const response = await fetch(`${API_URL}/dropdowns`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch dropdowns');
    }

    const data = await response.json();
    return data.data || {};
  }

  static async getDropdownsByCategory(category: string): Promise<DropdownOption[]> {
    const response = await fetch(`${API_URL}/dropdowns/category/${category}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch dropdowns for category: ${category}`);
    }

    const data = await response.json();
    return data.data || [];
  }

  static async createDropdown(dropdownData: DropdownFormData): Promise<DropdownOption> {
    const response = await fetch(`${API_URL}/dropdowns`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(dropdownData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create dropdown');
    }

    const data = await response.json();
    return data.data;
  }

  static async updateDropdown(id: string, dropdownData: Partial<DropdownFormData>): Promise<DropdownOption> {
    const response = await fetch(`${API_URL}/dropdowns/${id}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(dropdownData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update dropdown');
    }

    const data = await response.json();
    return data.data;
  }

  static async deleteDropdown(id: string): Promise<void> {
    const response = await fetch(`${API_URL}/dropdowns/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to delete dropdown');
    }
  }

  static async toggleActive(id: string): Promise<DropdownOption> {
    const response = await fetch(`${API_URL}/dropdowns/${id}/toggle-active`, {
      method: 'PATCH',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to toggle dropdown status');
    }

    const data = await response.json();
    return data.data;
  }

  static async updateDisplayOrder(updates: { id: string; display_order: number }[]): Promise<void> {
    const response = await fetch(`${API_URL}/dropdowns/update-order`, {
      method: 'PATCH',
      headers: this.getHeaders(),
      body: JSON.stringify({ updates }),
    });

    if (!response.ok) {
      throw new Error('Failed to update display order');
    }
  }

  /**
   * Get all product-related dropdown data in one call
   */
  static async getProductDropdownData(): Promise<{
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
  }> {
    try {
      const response = await fetch(`${API_URL}/dropdowns/products`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch product dropdown data');
      }

      const data = await response.json();
      return data.data || {
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
        width_units: [],
      };
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
        width_units: [],
      };
    }
  }

  /**
   * Get options for a specific category (like old code)
   */
  static async getOptionsByCategory(category: string): Promise<DropdownOption[]> {
    try {
      const response = await fetch(`${API_URL}/dropdowns/category/${category}?is_active=true`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch ${category} options`);
      }

      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.error(`Error fetching ${category} options:`, error);
      return [];
    }
  }

  /**
   * Add a new dropdown option
   */
  static async addOption(category: string, value: string, displayOrder?: number): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${API_URL}/dropdowns`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          category,
          value,
          display_order: displayOrder,
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
}
