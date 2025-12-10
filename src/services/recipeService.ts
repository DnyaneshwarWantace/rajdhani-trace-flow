import type { Recipe, RecipeFilters } from '@/types/recipe';

import { getApiUrl } from '@/utils/apiConfig';

const API_URL = getApiUrl();

export class RecipeService {
  private static getHeaders(): HeadersInit {
    const token = localStorage.getItem('auth_token');
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  static async getRecipes(filters?: RecipeFilters): Promise<{ recipes: Recipe[]; total: number }> {
    try {
      const queryParams = new URLSearchParams();
      if (filters?.search) queryParams.append('search', filters.search);
      if (filters?.product_id) queryParams.append('product_id', filters.product_id);
      if (filters?.is_active !== undefined) queryParams.append('is_active', filters.is_active.toString());
      
      const limit = filters?.limit || 50;
      const offset = filters?.offset || 0;
      queryParams.append('limit', limit.toString());
      queryParams.append('offset', offset.toString());

      const response = await fetch(`${API_URL}/recipes?${queryParams}`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch recipes');
      }

      const data = await response.json();
      return {
        recipes: data.data || [],
        total: data.count || 0,
      };
    } catch (error) {
      console.error('Error fetching recipes:', error);
      throw error;
    }
  }

  static async getRecipeById(id: string): Promise<Recipe> {
    const response = await fetch(`${API_URL}/recipes/${id}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch recipe');
    }

    const data = await response.json();
    return data.data;
  }

  static async getRecipeByProductId(productId: string): Promise<Recipe | null> {
    try {
      const response = await fetch(`${API_URL}/recipes/product/${productId}`, {
        headers: this.getHeaders(),
      });

      if (response.status === 404) {
        return null;
      }

      if (!response.ok) {
        throw new Error('Failed to fetch recipe');
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Error fetching recipe by product ID:', error);
      return null;
    }
  }

  static async updateRecipe(recipeId: string, recipeData: { materials: any[] }): Promise<Recipe> {
    const response = await fetch(`${API_URL}/recipes/${recipeId}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(recipeData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update recipe');
    }

    const data = await response.json();
    return data.data;
  }

  static async deleteRecipe(recipeId: string): Promise<void> {
    const response = await fetch(`${API_URL}/recipes/${recipeId}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to delete recipe');
    }
  }
}

