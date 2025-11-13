import { supabase } from '@/lib/supabase';

export interface DropdownOption {
  id: string;
  category: string;
  value: string;
  display_order: number;
  is_active: boolean;
}

export class DropdownService {
  // Get all options for a specific category
  static async getOptionsByCategory(category: string): Promise<DropdownOption[]> {
    try {
      const { data, error } = await supabase
        .from('dropdown_options')
        .select('*')
        .eq('category', category)
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error(`Error fetching ${category} options:`, error);
      return [];
    }
  }

  // Get all categories
  static async getAllCategories(): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('dropdown_options')
        .select('category')
        .eq('is_active', true)
        .order('category');

      if (error) throw error;
      
      // Get unique categories
      const categories = [...new Set((data?.map((item: any) => item.category) || []) as string[])];
      return categories;
    } catch (error) {
      console.error('Error fetching categories:', error);
      return [];
    }
  }

  // Add new option to a category
  static async addOption(category: string, value: string, displayOrder?: number): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('dropdown_options')
        .insert({
          category,
          value: value.trim(),
          display_order: displayOrder || 999,
          is_active: true
        });

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error adding dropdown option:', error);
      return { success: false, error: error.message };
    }
  }

  // Update an option
  static async updateOption(id: string, updates: Partial<DropdownOption>): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('dropdown_options')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error updating dropdown option:', error);
      return { success: false, error: error.message };
    }
  }

  // Deactivate an option (soft delete)
  static async deactivateOption(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('dropdown_options')
        .update({
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error deactivating dropdown option:', error);
      return { success: false, error: error.message };
    }
  }

  // Delete an option by category and value
  static async deleteOption(category: string, value: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('dropdown_options')
        .delete()
        .eq('category', category)
        .eq('value', value);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error deleting dropdown option:', error);
      return { success: false, error: error.message };
    }
  }

  // Get all options for multiple categories at once
  static async getMultipleCategories(categories: string[]): Promise<Record<string, DropdownOption[]>> {
    try {
      const { data, error } = await supabase
        .from('dropdown_options')
        .select('*')
        .in('category', categories)
        .eq('is_active', true)
        .order('category')
        .order('display_order', { ascending: true });

      if (error) throw error;

      // Group by category
      const result: Record<string, DropdownOption[]> = {};
      categories.forEach(category => {
        result[category] = data?.filter(item => item.category === category) || [];
      });

      return result;
    } catch (error) {
      console.error('Error fetching multiple categories:', error);
      return {};
    }
  }

  // Get all dropdown data for products page (excluding locations)
  static async getProductDropdownData(): Promise<{
    units: DropdownOption[];
    colors: DropdownOption[];
    patterns: DropdownOption[];
    weights: DropdownOption[];
    categories: DropdownOption[];
    lengths: DropdownOption[];
    widths: DropdownOption[];
  }> {
    try {
      const categories = ['unit', 'color', 'pattern', 'weight', 'category', 'length', 'width'];
      const data = await this.getMultipleCategories(categories);

      return {
        units: data.unit || [],
        colors: data.color || [],
        patterns: data.pattern || [],
        weights: data.weight || [],
        categories: data.category || [],
        lengths: data.length || [],
        widths: data.width || []
      };
    } catch (error) {
      console.error('Error fetching product dropdown data:', error);
      return {
        units: [],
        colors: [],
        patterns: [],
        weights: [],
        categories: [],
        lengths: [],
        widths: []
      };
    }
  }
}
