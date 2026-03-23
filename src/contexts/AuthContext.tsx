import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { AuthService } from '@/services/authService';
import type { User } from '@/types/auth';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  // Increments every time permissions are refreshed — PageAccessRoute watches this
  permissionsVersion: number;
  refreshPermissions: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [permissionsVersion, setPermissionsVersion] = useState(0);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const currentUser = await AuthService.getCurrentUser();
    setUser(currentUser);
    setLoading(false);
  };

  const login = async (email: string, password: string) => {
    const response = await AuthService.login({ email, password });
    setUser(response.data.user);
    setPermissionsVersion(v => v + 1);
  };

  const logout = () => {
    AuthService.logout();
    setUser(null);
  };

  // Fetches latest permissions from server and updates localStorage + triggers re-render
  const refreshPermissions = async () => {
    const currentUser = await AuthService.getCurrentUser();
    if (currentUser) setUser(currentUser);
    setPermissionsVersion(v => v + 1);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        isAuthenticated: !!user,
        permissionsVersion,
        refreshPermissions,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
