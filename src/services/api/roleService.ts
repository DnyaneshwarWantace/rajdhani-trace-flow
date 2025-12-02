import { getAuthHeaders, handleAuthError } from '@/utils/apiClient';

const API_URL = import.meta.env.VITE_API_URL || 'https://rajdhani.wantace.com/api';

export interface Role {
  id: string;
  name: string;
  label: string;
  description: string;
  is_active: boolean;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

export interface RoleOption {
  value: string;
  label: string;
  description: string;
}

export interface CreateRoleData {
  name: string;
  label: string;
  description?: string;
}

export interface UpdateRoleData {
  label?: string;
  description?: string;
  is_active?: boolean;
}

class RoleService {

  // Get all roles
  static async getAllRoles(): Promise<{ data: Role[] | null; error: string | null }> {
    try {
      const response = await fetch(`${API_URL}/roles`, {
        headers: getAuthHeaders()
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch roles');
      }

      return { data: result.data, error: null };
    } catch (error: any) {
      console.error('Get roles error:', error);
      return { data: null, error: error.message || 'Failed to fetch roles' };
    }
  }

  // Get active roles only (for dropdowns)
  static async getActiveRoles(): Promise<{ data: RoleOption[] | null; error: string | null }> {
    try {
      const response = await fetch(`${API_URL}/roles/active`, {
        headers: getAuthHeaders()
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch active roles');
      }

      return { data: result.data, error: null };
    } catch (error: any) {
      console.error('Get active roles error:', error);
      return { data: null, error: error.message || 'Failed to fetch active roles' };
    }
  }

  // Get role by ID
  static async getRoleById(id: string): Promise<{ data: Role | null; error: string | null }> {
    try {
      const response = await fetch(`${API_URL}/roles/${id}`, {
        headers: getAuthHeaders()
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch role');
      }

      return { data: result.data, error: null };
    } catch (error: any) {
      console.error('Get role by ID error:', error);
      return { data: null, error: error.message || 'Failed to fetch role' };
    }
  }

  // Create new role
  static async createRole(roleData: CreateRoleData): Promise<{ data: Role | null; error: string | null }> {
    try {
      const response = await fetch(`${API_URL}/roles`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(roleData)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create role');
      }

      return { data: result.data, error: null };
    } catch (error: any) {
      console.error('Create role error:', error);
      return { data: null, error: error.message || 'Failed to create role' };
    }
  }

  // Update role
  static async updateRole(id: string, updates: UpdateRoleData): Promise<{ data: Role | null; error: string | null }> {
    try {
      const response = await fetch(`${API_URL}/roles/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(updates)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update role');
      }

      return { data: result.data, error: null };
    } catch (error: any) {
      console.error('Update role error:', error);
      return { data: null, error: error.message || 'Failed to update role' };
    }
  }

  // Delete role
  static async deleteRole(id: string): Promise<{ error: string | null }> {
    try {
      const response = await fetch(`${API_URL}/roles/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete role');
      }

      return { error: null };
    } catch (error: any) {
      console.error('Delete role error:', error);
      return { error: error.message || 'Failed to delete role' };
    }
  }
}

export default RoleService;

