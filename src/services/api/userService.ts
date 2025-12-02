import { getAuthHeaders, handleAuthError } from '@/utils/apiClient';
import AuthService, { User } from './authService';

const API_URL = import.meta.env.VITE_API_URL || 'https://rajdhani.wantace.com/api';

export interface CreateUserData {
  email: string;
  password: string;
  full_name: string;
  role: string;
  phone?: string;
  department?: string;
}

export interface UpdateUserData {
  full_name?: string;
  role?: string;
  phone?: string;
  department?: string;
  status?: 'active' | 'inactive' | 'suspended';
}

class UserService {

  // Get all users (Admin only)
  static async getUsers(): Promise<{ data: User[] | null; error: string | null }> {
    try {
      const response = await fetch(`${API_URL}/auth/admin/users`, {
        headers: getAuthHeaders()
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch users');
      }

      return { data: result.data, error: null };
    } catch (error: any) {
      console.error('Get users error:', error);
      return { data: null, error: error.message || 'Failed to fetch users' };
    }
  }

  // Get user by ID
  static async getUserById(id: string): Promise<{ data: { user: User; permissions: any } | null; error: string | null }> {
    try {
      const response = await fetch(`${API_URL}/auth/admin/users/${id}`, {
        headers: getAuthHeaders()
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch user');
      }

      return { data: result.data, error: null };
    } catch (error: any) {
      console.error('Get user error:', error);
      return { data: null, error: error.message || 'Failed to fetch user' };
    }
  }

  // Create user (Admin only - sends welcome email with temp password)
  static async createUser(userData: CreateUserData): Promise<{ data: User | null; error: string | null }> {
    try {
      // Remove password from userData - backend will generate temp password
      const { password, ...userDataWithoutPassword } = userData;

      const response = await fetch(`${API_URL}/auth/admin/users`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(userDataWithoutPassword)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create user');
      }

      return { data: result.data.user, error: null };
    } catch (error: any) {
      console.error('Create user error:', error);
      return { data: null, error: error.message || 'Failed to create user' };
    }
  }

  // Update user
  static async updateUser(id: string, updates: UpdateUserData): Promise<{ data: User | null; error: string | null }> {
    try {
      const response = await fetch(`${API_URL}/auth/admin/users/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(updates)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update user');
      }

      return { data: result.data, error: null };
    } catch (error: any) {
      console.error('Update user error:', error);
      return { data: null, error: error.message || 'Failed to update user' };
    }
  }

  // Delete user (Admin only)
  static async deleteUser(id: string): Promise<{ error: string | null }> {
    try {
      const response = await fetch(`${API_URL}/auth/admin/users/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete user');
      }

      return { error: null };
    } catch (error: any) {
      console.error('Delete user error:', error);
      return { error: error.message || 'Failed to delete user' };
    }
  }

  // Reset user password
  static async resetPassword(id: string, newPassword: string): Promise<{ error: string | null }> {
    try {
      const response = await fetch(`${API_URL}/auth/admin/users/${id}/reset-password`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ newPassword })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to reset password');
      }

      return { error: null };
    } catch (error: any) {
      console.error('Reset password error:', error);
      return { error: error.message || 'Failed to reset password' };
    }
  }

  // Update user status (Admin only)
  static async updateUserStatus(id: string, status: 'active' | 'inactive' | 'suspended'): Promise<{ data: User | null; error: string | null }> {
    try {
      const response = await fetch(`${API_URL}/auth/admin/users/${id}/status`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ status })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update user status');
      }

      return { data: result.data, error: null };
    } catch (error: any) {
      console.error('Update user status error:', error);
      return { data: null, error: error.message || 'Failed to update user status' };
    }
  }
}

export default UserService;

