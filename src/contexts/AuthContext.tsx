import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type UserRole = 'admin' | 'production' | 'inventory' | 'raw_material' | 'orders';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  permissions: string[];
  isActive: boolean;
  createdAt: string;
  lastLogin: string;
}

export const ROLE_PERMISSIONS = {
  admin: ['*'],
  production: ['production.read', 'production.write'],
  inventory: ['inventory.read', 'inventory.write'],
  raw_material: ['raw_material.read', 'raw_material.write'],
  orders: ['orders.read', 'orders.write']
};

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
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
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check for existing session on app load
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        const userData = JSON.parse(savedUser);
        setUser(userData);
        setIsAuthenticated(true);
      } catch (error) {
        localStorage.removeItem('user');
      }
    }
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    // Mock authentication - in real app, this would call your API
    const demoUsers = [
      {
        email: 'admin@rajdhani.com',
        password: 'admin123',
        userData: {
          id: 'admin_001',
          email: 'admin@rajdhani.com',
          name: 'Admin User',
          role: 'admin' as UserRole,
          permissions: ROLE_PERMISSIONS.admin,
          isActive: true,
          createdAt: new Date().toISOString(),
          lastLogin: new Date().toISOString()
        }
      },
      {
        email: 'production@rajdhani.com',
        password: 'prod123',
        userData: {
          id: 'prod_001',
          email: 'production@rajdhani.com',
          name: 'Production Manager',
          role: 'production' as UserRole,
          permissions: ROLE_PERMISSIONS.production,
          isActive: true,
          createdAt: new Date().toISOString(),
          lastLogin: new Date().toISOString()
        }
      },
      {
        email: 'inventory@rajdhani.com',
        password: 'inv123',
        userData: {
          id: 'inv_001',
          email: 'inventory@rajdhani.com',
          name: 'Inventory Manager',
          role: 'inventory' as UserRole,
          permissions: ROLE_PERMISSIONS.inventory,
          isActive: true,
          createdAt: new Date().toISOString(),
          lastLogin: new Date().toISOString()
        }
      },
      {
        email: 'materials@rajdhani.com',
        password: 'mat123',
        userData: {
          id: 'mat_001',
          email: 'materials@rajdhani.com',
          name: 'Materials Manager',
          role: 'raw_material' as UserRole,
          permissions: ROLE_PERMISSIONS.raw_material,
          isActive: true,
          createdAt: new Date().toISOString(),
          lastLogin: new Date().toISOString()
        }
      },
      {
        email: 'orders@rajdhani.com',
        password: 'ord123',
        userData: {
          id: 'ord_001',
          email: 'orders@rajdhani.com',
          name: 'Orders Manager',
          role: 'orders' as UserRole,
          permissions: ROLE_PERMISSIONS.orders,
          isActive: true,
          createdAt: new Date().toISOString(),
          lastLogin: new Date().toISOString()
        }
      }
    ];

    const user = demoUsers.find(u => u.email === email && u.password === password);
    
    if (user) {
      setUser(user.userData);
      setIsAuthenticated(true);
      localStorage.setItem('user', JSON.stringify(user.userData));
      return true;
    }
    
    return false;
  };

  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('user');
  };

  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    if (user.permissions.includes('*')) return true;
    return user.permissions.includes(permission);
  };

  const value: AuthContextType = {
    user,
    isAuthenticated,
    login,
    logout,
    hasPermission
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
