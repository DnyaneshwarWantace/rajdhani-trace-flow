import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[]; // Deprecated - use requiredPermission instead
  requiredRole?: string; // Deprecated - use requiredPermission instead
  requiredPermission?: string; // Page permission key (e.g., 'products', 'orders', 'dashboard')
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
  requiredRole,
  requiredPermission
}) => {
  const { isAuthenticated, user, hasPageAccess } = useAuth();
  const location = useLocation();

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    console.log('❌ Not authenticated, redirecting to login');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Admin always has access
  if (user?.role === 'admin') {
    return <>{children}</>;
  }

  // NEW: Check page permission first (preferred method)
  if (requiredPermission) {
    if (!hasPageAccess(requiredPermission)) {
      console.log(`❌ Access denied: required permission ${requiredPermission}, user has ${user?.role}`);
      return <Navigate to="/access-denied" state={{ pageName: requiredPermission }} replace />;
    }
    return <>{children}</>;
  }

  // LEGACY: Check role-based access (for backward compatibility)
  if (requiredRole && user?.role !== requiredRole) {
    console.log(`❌ Access denied: required role ${requiredRole}, user has ${user?.role}`);
    return <Navigate to="/" replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role as string)) {
    console.log(`❌ Access denied: allowed roles ${allowedRoles}, user has ${user?.role}`);
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
