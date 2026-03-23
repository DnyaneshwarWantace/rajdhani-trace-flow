import type { LoginCredentials, AuthResponse, User } from '@/types/auth';
import { getApiUrl } from '@/utils/apiConfig';
import { getApiError } from '@/utils/apiHelpers';

const API_URL = getApiUrl();

export class AuthService {
  static async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(getApiError(response, data));
    }

    // Store auth data
    localStorage.setItem('auth_token', data.data.token);
    localStorage.setItem('user', JSON.stringify(data.data.user));
    localStorage.setItem('permissions', JSON.stringify(data.data.permissions));

    return data;
  }

  static async getCurrentUser(): Promise<User | null> {
    const token = localStorage.getItem('auth_token');
    if (!token) return null;

    try {
      const response = await fetch(`${API_URL}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      // Only logout on 401 (token invalid/expired) — not on network errors or 5xx
      if (response.status === 401) {
        this.logout();
        return null;
      }

      if (!response.ok) {
        // Server error or network issue — keep existing session, don't logout
        const userStr = localStorage.getItem('user');
        return userStr ? JSON.parse(userStr) : null;
      }

      const data = await response.json();
      if (data.data?.permissions) {
        localStorage.setItem('permissions', JSON.stringify(data.data.permissions));
      }
      if (data.data?.user) {
        localStorage.setItem('user', JSON.stringify(data.data.user));
      }
      return data.data.user;
    } catch {
      // Network failure — keep existing session from localStorage, don't logout
      const userStr = localStorage.getItem('user');
      return userStr ? JSON.parse(userStr) : null;
    }
  }

  static logout(): void {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
    localStorage.removeItem('permissions');
  }

  static getToken(): string | null {
    return localStorage.getItem('auth_token');
  }

  static isAuthenticated(): boolean {
    return !!this.getToken();
  }
}
