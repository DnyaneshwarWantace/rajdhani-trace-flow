import type { User } from '@/types/auth';

const API_URL = import.meta.env.VITE_API_URL || '/api';

export interface CreateUserData {
  email: string;
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

export class UserService {
  private static getHeaders(): HeadersInit {
    const token = localStorage.getItem('auth_token');
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  static async getUsers(): Promise<User[]> {
    const response = await fetch(`${API_URL}/auth/admin/users`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch users');
    }

    const data = await response.json();
    return data.data || [];
  }

  static async getUserById(id: string): Promise<User> {
    const response = await fetch(`${API_URL}/auth/admin/users/${id}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch user');
    }

    const data = await response.json();
    return data.data.user;
  }

  static async createUser(userData: CreateUserData): Promise<User> {
    const response = await fetch(`${API_URL}/auth/admin/users`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(userData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create user');
    }

    const data = await response.json();
    return data.data.user;
  }

  static async updateUser(id: string, userData: UpdateUserData): Promise<User> {
    const response = await fetch(`${API_URL}/auth/admin/users/${id}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(userData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update user');
    }

    const data = await response.json();
    return data.data;
  }

  static async deleteUser(id: string): Promise<void> {
    const response = await fetch(`${API_URL}/auth/admin/users/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to delete user');
    }
  }

  static async resetPassword(id: string, newPassword: string): Promise<void> {
    const response = await fetch(`${API_URL}/auth/admin/users/${id}/reset-password`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ newPassword }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to reset password');
    }
  }

  static async updateUserStatus(id: string, status: 'active' | 'inactive' | 'suspended'): Promise<User> {
    const response = await fetch(`${API_URL}/auth/admin/users/${id}/status`, {
      method: 'PATCH',
      headers: this.getHeaders(),
      body: JSON.stringify({ status }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update user status');
    }

    const data = await response.json();
    return data.data;
  }
}

