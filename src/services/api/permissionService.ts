import { getAuthHeaders, handleAuthError } from '@/utils/apiClient';

const API_URL = import.meta.env.VITE_API_URL || 'https://rajdhani.wantace.com/api';

export interface RoleOption {
  value: string;
  label: string;
  description: string;
}

export interface PageOption {
  key: string;
  label: string;
  description: string;
}

export interface ActionOption {
  key: string;
  label: string;
}

export interface ActionGroup {
  [module: string]: ActionOption[];
}

export interface Permission {
  id: string;
  role: string;
  page_permissions: {
    [key: string]: boolean;
  };
  action_permissions: {
    [key: string]: boolean;
  };
  created_at: string;
  updated_at: string;
}

class PermissionService {

  // Get all permissions
  static async getAllPermissions(): Promise<{ data: Permission[] | null; error: string | null }> {
    try {
      const response = await fetch(`${API_URL}/permissions`, {
        headers: getAuthHeaders()
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch permissions');
      }

      return { data: result.data, error: null };
    } catch (error: any) {
      console.error('Get permissions error:', error);
      return { data: null, error: error.message || 'Failed to fetch permissions' };
    }
  }

  // Get permissions by role
  static async getPermissionsByRole(role: string): Promise<{ data: Permission | null; error: string | null }> {
    try {
      const response = await fetch(`${API_URL}/permissions/role/${role}`, {
        headers: getAuthHeaders()
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch permissions');
      }

      return { data: result.data, error: null };
    } catch (error: any) {
      console.error('Get permissions by role error:', error);
      return { data: null, error: error.message || 'Failed to fetch permissions' };
    }
  }

  // Update permissions for a role
  static async updatePermissions(role: string, updates: {
    page_permissions?: { [key: string]: boolean };
    action_permissions?: { [key: string]: boolean };
  }): Promise<{ data: Permission | null; error: string | null }> {
    try {
      const response = await fetch(`${API_URL}/permissions/role/${role}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(updates)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update permissions');
      }

      return { data: result.data, error: null };
    } catch (error: any) {
      console.error('Update permissions error:', error);
      return { data: null, error: error.message || 'Failed to update permissions' };
    }
  }

  // Reset permissions to default
  static async resetPermissions(role: string): Promise<{ error: string | null }> {
    try {
      const response = await fetch(`${API_URL}/permissions/role/${role}/reset`, {
        method: 'POST',
        headers: getAuthHeaders()
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to reset permissions');
      }

      return { error: null };
    } catch (error: any) {
      console.error('Reset permissions error:', error);
      return { error: error.message || 'Failed to reset permissions' };
    }
  }

  // Get available roles
  static async getAvailableRoles(): Promise<{ data: RoleOption[] | null; error: string | null }> {
    try {
      const response = await fetch(`${API_URL}/permissions/meta/roles`, {
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

  // Get available pages
  static async getAvailablePages(): Promise<{ data: PageOption[] | null; error: string | null }> {
    try {
      const response = await fetch(`${API_URL}/permissions/meta/pages`, {
        headers: getAuthHeaders()
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch pages');
      }

      return { data: result.data, error: null };
    } catch (error: any) {
      console.error('Get pages error:', error);
      return { data: null, error: error.message || 'Failed to fetch pages' };
    }
  }

  // Get available actions
  static async getAvailableActions(): Promise<{ data: ActionGroup | null; error: string | null }> {
    try {
      const response = await fetch(`${API_URL}/permissions/meta/actions`, {
        headers: getAuthHeaders()
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch actions');
      }

      return { data: result.data, error: null };
    } catch (error: any) {
      console.error('Get actions error:', error);
      return { data: null, error: error.message || 'Failed to fetch actions' };
    }
  }
}

export default PermissionService;

