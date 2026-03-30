import type { User } from '@/types/auth';
import { getApiUrl } from '@/utils/apiConfig';
import { getApiError } from '@/utils/apiHelpers';

const API_URL = getApiUrl();

export interface CreateUserData {
  email: string;
  full_name: string;
  role: string;
  password?: string;
  phone?: string;
  department?: string;
}

export interface UpdateUserData {
  email?: string;
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
    const data = await response.json();
    if (!response.ok) {
      throw new Error(getApiError(response, data));
    }
    return data.data || [];
  }

  static async getUserById(id: string): Promise<User> {
    const response = await fetch(`${API_URL}/auth/admin/users/${id}`, {
      headers: this.getHeaders(),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(getApiError(response, data));
    }
    return data.data.user;
  }

  static async createUser(userData: CreateUserData): Promise<{ user: User; temporary_password?: string; message?: string }> {
    const response = await fetch(`${API_URL}/auth/admin/users`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(userData),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(getApiError(response, data));
    }
    return {
      user: data.data.user,
      temporary_password: data.data.temporary_password,
      message: data.message,
    };
  }

  static async updateUser(id: string, userData: UpdateUserData): Promise<User> {
    const response = await fetch(`${API_URL}/auth/admin/users/${id}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(userData),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(getApiError(response, data));
    }
    return data.data;
  }

  static async deleteUser(id: string): Promise<void> {
    const response = await fetch(`${API_URL}/auth/admin/users/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(getApiError(response, data));
    }
  }

  static async resetPassword(id: string, newPassword: string): Promise<void> {
    const response = await fetch(`${API_URL}/auth/admin/users/${id}/reset-password`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ newPassword }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(getApiError(response, data));
    }
  }

  static async updateUserStatus(id: string, status: 'active' | 'inactive' | 'suspended'): Promise<User> {
    const response = await fetch(`${API_URL}/auth/admin/users/${id}/status`, {
      method: 'PATCH',
      headers: this.getHeaders(),
      body: JSON.stringify({ status }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(getApiError(response, data));
    }
    return data.data;
  }
}

