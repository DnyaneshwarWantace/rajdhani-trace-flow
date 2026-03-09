import { getApiUrl } from '@/utils/apiConfig';
import { getApiError } from '@/utils/apiHelpers';

const API_URL = getApiUrl();

export interface PermissionPageMeta {
  key: string;
  label: string;
  description?: string;
}

export interface PermissionActionMeta {
  key: string;
  label: string;
}

export interface PermissionActionsMeta {
  [module: string]: PermissionActionMeta[];
}

export interface RolePermissions {
  id: string;
  role: string;
  page_permissions: Record<string, boolean>;
  action_permissions: Record<string, boolean>;
}

export class PermissionService {
  private static getHeaders(): HeadersInit {
    const token = localStorage.getItem('auth_token');
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  static async getPages(): Promise<PermissionPageMeta[]> {
    const response = await fetch(`${API_URL}/permissions/meta/pages`, {
      headers: this.getHeaders(),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(getApiError(response, data));
    }
    return data.data || [];
  }

  static async getActions(): Promise<PermissionActionsMeta> {
    const response = await fetch(`${API_URL}/permissions/meta/actions`, {
      headers: this.getHeaders(),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(getApiError(response, data));
    }
    return data.data || {};
  }

  static async getRolePermissions(role: string): Promise<RolePermissions | null> {
    const response = await fetch(`${API_URL}/permissions/role/${encodeURIComponent(role)}`, {
      headers: this.getHeaders(),
    });
    const data = await response.json();
    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(getApiError(response, data));
    }
    return data.data;
  }

  static async getUserPermissions(userId: string): Promise<RolePermissions | null> {
    const response = await fetch(`${API_URL}/permissions/user/${encodeURIComponent(userId)}`, {
      headers: this.getHeaders(),
    });
    const data = await response.json();
    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(getApiError(response, data));
    }
    return data.data;
  }

  static async updateUserPermissions(userId: string, payload: {
    page_permissions: Record<string, boolean>;
    action_permissions: Record<string, boolean>;
  }): Promise<RolePermissions> {
    const response = await fetch(`${API_URL}/permissions/user/${encodeURIComponent(userId)}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(getApiError(response, data));
    }
    return data.data;
  }

  static async resetUserPermissions(userId: string): Promise<void> {
    const response = await fetch(`${API_URL}/permissions/user/${encodeURIComponent(userId)}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(getApiError(response, data));
    }
  }

  static async updateRolePermissions(role: string, payload: {
    page_permissions: Record<string, boolean>;
    action_permissions: Record<string, boolean>;
  }): Promise<RolePermissions> {
    const response = await fetch(`${API_URL}/permissions/role/${encodeURIComponent(role)}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(getApiError(response, data));
    }
    return data.data;
  }

  static async resetRolePermissions(role: string): Promise<void> {
    const response = await fetch(`${API_URL}/permissions/role/${encodeURIComponent(role)}/reset`, {
      method: 'POST',
      headers: this.getHeaders(),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(getApiError(response, data));
    }
  }
}

