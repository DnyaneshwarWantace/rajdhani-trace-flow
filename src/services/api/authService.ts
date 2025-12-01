import { handleAuthError } from '@/utils/apiClient';

const API_URL = 'https://rajdhani.wantace.com/api/auth';

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
  status: string;
  phone?: string;
  department?: string;
  avatar?: string;
  last_login?: string;
  created_at: string;
}

export interface Permission {
  id: string;
  role: string;
  page_permissions: {
    dashboard: boolean;
    products: boolean;
    production: boolean;
    materials: boolean;
    orders: boolean;
    customers: boolean;
    suppliers: boolean;
    machines: boolean;
    reports: boolean;
    settings: boolean;
    users: boolean;
  };
  action_permissions: {
    [key: string]: boolean;
  };
}

export interface LoginResponse {
  user: User;
  permissions: Permission;
  token: string;
}

class AuthService {
  // Get token from localStorage
  static getToken(): string | null {
    return localStorage.getItem('auth_token');
  }

  // Set token in localStorage
  static setToken(token: string): void {
    localStorage.setItem('auth_token', token);
  }

  // Remove token from localStorage
  static removeToken(): void {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
    localStorage.removeItem('permissions');
  }

  // Get user from localStorage
  static getUser(): User | null {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  }

  // Set user in localStorage
  static setUser(user: User): void {
    localStorage.setItem('user', JSON.stringify(user));
  }

  // Get permissions from localStorage
  static getPermissions(): Permission | null {
    const permStr = localStorage.getItem('permissions');
    return permStr ? JSON.parse(permStr) : null;
  }

  // Set permissions in localStorage
  static setPermissions(permissions: Permission): void {
    localStorage.setItem('permissions', JSON.stringify(permissions));
  }

  // Login
  static async login(email: string, password: string): Promise<{ data: LoginResponse | null; error: string | null }> {
    try {
      const response = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Login failed');
      }

      // Store token, user, and permissions
      this.setToken(result.data.token);
      this.setUser(result.data.user);
      this.setPermissions(result.data.permissions);

      return { data: result.data, error: null };
    } catch (error: any) {
      console.error('Login error:', error);
      return { data: null, error: error.message || 'Login failed' };
    }
  }

  // Logout
  static async logout(): Promise<{ error: string | null }> {
    try {
      const token = this.getToken();
      
      if (token) {
        await fetch(`${API_URL}/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
      }

      this.removeToken();
      return { error: null };
    } catch (error: any) {
      console.error('Logout error:', error);
      this.removeToken(); // Still remove token even if API call fails
      return { error: error.message || 'Logout failed' };
    }
  }

  // Get current user (from API) - NEVER LOGS OUT AUTOMATICALLY
  static async getCurrentUser(): Promise<{ data: { user: User; permissions: Permission } | null; error: string | null }> {
    // ALWAYS return cached data if available
    // We trust the login - once logged in, stay logged in until manual logout
    const cachedUser = this.getUser();
    const cachedPermissions = this.getPermissions();
    
    if (cachedUser && cachedPermissions) {
      console.log('✅ Using cached session:', cachedUser.email);
      return { data: { user: cachedUser, permissions: cachedPermissions }, error: null };
    }
    
    // If no cached data, try to fetch from server
    try {
      const token = this.getToken();
      
      if (!token) {
        return { data: null, error: 'No authentication token found' };
      }

      const response = await fetch(`${API_URL}/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      // Handle authentication errors (will logout and redirect if 401/403)
      await handleAuthError(response);

      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.warn('⚠️ Backend returned non-JSON response - no cached data available');
        return { data: null, error: 'Backend is not responding correctly' };
      }

      const result = await response.json();

      if (!response.ok) {
        console.warn('⚠️ API returned error:', result.error);
        return { data: null, error: result.error || 'Failed to fetch user' };
      }

      // Update stored user and permissions
      this.setUser(result.data.user);
      this.setPermissions(result.data.permissions);

      return { data: result.data, error: null };
    } catch (error: any) {
      console.error('Get current user error:', error);
      return { data: null, error: error.message || 'Failed to fetch user' };
    }
  }

  // Change password
  static async changePassword(currentPassword: string, newPassword: string): Promise<{ error: string | null }> {
    try {
      const token = this.getToken();
      
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`${API_URL}/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      // Handle authentication errors (will logout and redirect if 401/403)
      await handleAuthError(response);

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to change password');
      }

      return { error: null };
    } catch (error: any) {
      console.error('Change password error:', error);
      return { error: error.message || 'Failed to change password' };
    }
  }

  // Update profile
  static async updateProfile(updates: { full_name?: string; phone?: string; department?: string; avatar?: string }): Promise<{ data: { user: User; permissions: Permission } | null; error: string | null }> {
    try {
      const token = this.getToken();
      
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`${API_URL}/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(updates),
      });

      // Handle authentication errors (will logout and redirect if 401/403)
      await handleAuthError(response);

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update profile');
      }

      // Update stored user and permissions
      this.setUser(result.data.user);
      this.setPermissions(result.data.permissions);

      return { data: result.data, error: null };
    } catch (error: any) {
      console.error('Update profile error:', error);
      return { data: null, error: error.message || 'Failed to update profile' };
    }
  }

  // Check if user is authenticated
  static isAuthenticated(): boolean {
    const token = this.getToken();
    const user = this.getUser();
    return !!(token && user);
  }

  // Check if user has permission for a page
  static hasPageAccess(page: string): boolean {
    const permissions = this.getPermissions();
    if (!permissions) return false;
    
    // Admin always has access
    const user = this.getUser();
    if (user?.role === 'admin') return true;
    
    // Check direct page access
    if (permissions.page_permissions[page as keyof typeof permissions.page_permissions]) {
      return true;
    }
    
    // SPECIAL CASE: If user has orders page access, allow access to related pages
    if (permissions.page_permissions.orders) {
      // Allow products, customers, materials, suppliers pages (needed for order management)
      if (page === 'products' || page === 'customers' || page === 'materials' || page === 'suppliers') {
        return true;
      }
    }
    
    // SPECIAL CASE: If user has production page access, allow access to related pages
    if (permissions.page_permissions.production) {
      // Allow products and materials pages (needed for production management)
      if (page === 'products' || page === 'materials') {
        return true;
      }
    }
    
    return false;
  }

  // Check if user has permission for an action
  static hasActionPermission(action: string): boolean {
    const permissions = this.getPermissions();
    if (!permissions) return false;
    
    // Admin always has permission
    const user = this.getUser();
    if (user?.role === 'admin') return true;
    
    // DELETE actions are special - only allow if explicitly granted
    if (action.includes('_delete') || action.includes('delete')) {
      return permissions.action_permissions[action] || false;
    }
    
    // Map action to page
    const actionToPageMap: { [key: string]: string } = {
      // Production actions
      'production_view': 'production',
      'production_create': 'production',
      'production_edit': 'production',
      'production_start': 'production',
      'production_complete': 'production',
      'machine_view': 'production',
      'machine_create': 'production',
      'machine_edit': 'production',
      
      // Product actions
      'product_view': 'products',
      'product_create': 'products',
      'product_edit': 'products',
      'individual_product_view': 'products',
      'individual_product_create': 'products',
      'individual_product_edit': 'products',
      
      // Order actions
      'order_view': 'orders',
      'order_create': 'orders',
      'order_edit': 'orders',
      'order_approve': 'orders',
      'order_deliver': 'orders',
      
      // Material actions
      'material_view': 'materials',
      'material_create': 'materials',
      'material_edit': 'materials',
      'material_restock': 'materials',
      
      // Customer/Supplier actions
      'customer_view': 'customers',
      'customer_create': 'customers',
      'customer_edit': 'customers',
      'supplier_view': 'suppliers',
      'supplier_create': 'suppliers',
      'supplier_edit': 'suppliers',
    };
    
    const page = actionToPageMap[action];
    
    // If action maps to a page, check page access
    if (page) {
      if (permissions.page_permissions[page as keyof typeof permissions.page_permissions]) {
        return true;
      }
    }
    
    // SPECIAL CASE: If user has orders page access, allow access to related modules
    if (permissions.page_permissions.orders) {
      // Allow customer operations (to create/edit customers for orders)
      if (action.startsWith('customer_') && !action.includes('delete')) {
        return true;
      }
      // Allow product/material/individual_product operations (to select items for orders)
      if (action.startsWith('product_') || action.startsWith('material_') || action.startsWith('individual_product_')) {
        if (!action.includes('delete')) {
          // Allow all product/material operations except delete (to select items for orders)
          return true;
        }
      }
    }
    
    // SPECIAL CASE: If user has production page access, allow access to related modules
    if (permissions.page_permissions.production) {
      // Allow product/material/individual_product operations (to add products/materials to production)
      if (action.startsWith('product_') || action.startsWith('material_') || action.startsWith('individual_product_')) {
        if (!action.includes('delete')) {
          // Allow all product/material operations except delete
          return true;
        }
      }
    }
    
    // Fallback: Check explicit action permission (for backward compatibility)
    return permissions.action_permissions[action] || false;
  }
}

export default AuthService;

