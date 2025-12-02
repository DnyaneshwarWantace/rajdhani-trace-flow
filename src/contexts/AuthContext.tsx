import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AuthService, { User as AuthUser, Permission } from '@/services/api/authService';

export type UserRole = 'admin' | 'manager' | 'operator' | 'viewer' | 'production_manager' | 'inventory_manager' | 'sales_manager';

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

interface AuthContextType {
  user: User | null;
  permissions: Permission | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
  hasPageAccess: (page: string) => boolean;
  setUser: (user: User) => void;
  setPermissions: (permissions: Permission) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  // Initialize auth state from localStorage synchronously
  const [user, setUser] = useState<User | null>(() => {
    const token = AuthService.getToken();
    const savedUser = AuthService.getUser();
    if (token && savedUser) {
      console.log('✅ Session restored from localStorage:', savedUser.email);
      return savedUser;
    }
    return null;
  });

  const [permissions, setPermissions] = useState<Permission | null>(() => {
    const token = AuthService.getToken();
    const savedPermissions = AuthService.getPermissions();
    if (token && savedPermissions) {
      return savedPermissions;
    }
    return null;
  });

  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    const token = AuthService.getToken();
    const savedUser = AuthService.getUser();
    const savedPermissions = AuthService.getPermissions();
    return !!(token && savedUser && savedPermissions);
  });

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const { data, error } = await AuthService.login(email, password);
      
      if (error || !data) {
        return false;
      }
      
      setUser(data.user);
      setPermissions(data.permissions);
      setIsAuthenticated(true);
      return true;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const logout = async () => {
    await AuthService.logout();
    setUser(null);
    setPermissions(null);
    setIsAuthenticated(false);
  };

  const hasPermission = (action: string): boolean => {
    return AuthService.hasActionPermission(action);
  };

  const hasPageAccess = (page: string): boolean => {
    // Simplified: All authenticated users have access to everything except settings and activity-logs
    // Settings and activity-logs are handled by ProtectedRoute with requiredRole="admin"
    if (page === 'settings' || page === 'activity-logs') {
      return user?.role === 'admin';
    }
    // All other pages are accessible to all authenticated users
    return true;
  };

  const value: AuthContextType = {
    user,
    permissions,
    isAuthenticated,
    login,
    logout,
    hasPermission,
    hasPageAccess,
    setUser,
    setPermissions
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
