/**
 * Permission utility functions
 * Handles permission checks for users based on role and specific permissions
 */

export interface UserPermissions {
  products?: {
    create?: boolean;
    edit?: boolean;
    delete?: boolean;
    view?: boolean;
  };
  materials?: {
    create?: boolean;
    edit?: boolean;
    delete?: boolean;
    view?: boolean;
  };
  customers?: {
    create?: boolean;
    edit?: boolean;
    delete?: boolean;
    view?: boolean;
  };
  suppliers?: {
    create?: boolean;
    edit?: boolean;
    delete?: boolean;
    view?: boolean;
  };
  recipes?: {
    create?: boolean;
    edit?: boolean;
    delete?: boolean;
    view?: boolean;
  };
  [key: string]: any;
}

/**
 * Check if user has permission to delete items
 * Admin always has permission, or user must have specific delete permission
 */
export function canDelete(module: 'products' | 'materials' | 'customers' | 'suppliers' | 'recipes'): boolean {
  try {
    // Get user from localStorage
    const userStr = localStorage.getItem('user');
    if (!userStr) return false;

    const user = JSON.parse(userStr);

    // Admin always has delete permission
    if (user.role === 'admin') return true;

    // Check specific permissions
    const permissionsStr = localStorage.getItem('permissions');
    if (!permissionsStr) return false;

    const permissions: UserPermissions = JSON.parse(permissionsStr);

    // Check if user has delete permission for this module
    return permissions[module]?.delete === true;
  } catch (error) {
    console.error('Error checking delete permission:', error);
    return false;
  }
}

/**
 * Check if user has permission to create items
 */
export function canCreate(module: 'products' | 'materials' | 'customers' | 'suppliers' | 'recipes'): boolean {
  try {
    const userStr = localStorage.getItem('user');
    if (!userStr) return false;

    const user = JSON.parse(userStr);
    if (user.role === 'admin') return true;

    const permissionsStr = localStorage.getItem('permissions');
    if (!permissionsStr) return false;

    const permissions: UserPermissions = JSON.parse(permissionsStr);
    return permissions[module]?.create === true;
  } catch (error) {
    console.error('Error checking create permission:', error);
    return false;
  }
}

/**
 * Check if user has permission to edit items
 */
export function canEdit(module: 'products' | 'materials' | 'customers' | 'suppliers' | 'recipes'): boolean {
  try {
    const userStr = localStorage.getItem('user');
    if (!userStr) return false;

    const user = JSON.parse(userStr);
    if (user.role === 'admin') return true;

    const permissionsStr = localStorage.getItem('permissions');
    if (!permissionsStr) return false;

    const permissions: UserPermissions = JSON.parse(permissionsStr);
    return permissions[module]?.edit === true;
  } catch (error) {
    console.error('Error checking edit permission:', error);
    return false;
  }
}

/**
 * Check if user is admin
 */
export function isAdmin(): boolean {
  try {
    const userStr = localStorage.getItem('user');
    if (!userStr) return false;

    const user = JSON.parse(userStr);
    return user.role === 'admin';
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
}
