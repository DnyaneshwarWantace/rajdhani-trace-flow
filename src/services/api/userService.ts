const API_URL = 'http://localhost:8000/api';
import AuthService, { User } from './authService';

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
  // Get auth headers
  private static getHeaders() {
    const token = AuthService.getToken();
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  }

  // Get all users
  static async getUsers(): Promise<{ data: User[] | null; error: string | null }> {
    try {
      const response = await fetch(`${API_URL}/users`, {
        headers: this.getHeaders()
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
      const response = await fetch(`${API_URL}/users/${id}`, {
        headers: this.getHeaders()
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

  // Create user
  static async createUser(userData: CreateUserData): Promise<{ data: User | null; error: string | null }> {
    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(userData)
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
      const response = await fetch(`${API_URL}/users/${id}`, {
        method: 'PUT',
        headers: this.getHeaders(),
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

  // Delete user
  static async deleteUser(id: string): Promise<{ error: string | null }> {
    try {
      const response = await fetch(`${API_URL}/users/${id}`, {
        method: 'DELETE',
        headers: this.getHeaders()
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
      const response = await fetch(`${API_URL}/users/${id}/reset-password`, {
        method: 'POST',
        headers: this.getHeaders(),
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

  // Update user status
  static async updateUserStatus(id: string, status: 'active' | 'inactive' | 'suspended'): Promise<{ data: User | null; error: string | null }> {
    try {
      const response = await fetch(`${API_URL}/users/${id}/status`, {
        method: 'PATCH',
        headers: this.getHeaders(),
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

