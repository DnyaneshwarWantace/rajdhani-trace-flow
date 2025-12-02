import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string; // Only used for admin-only pages (settings, activity-logs)
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRole
}) => {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    console.log('❌ Not authenticated, redirecting to login');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check if admin role is required (for settings and activity-logs)
  if (requiredRole === 'admin' && user?.role !== 'admin') {
    console.log(`❌ Access denied: admin role required, user has ${user?.role}`);
    return <Navigate to="/" replace />;
  }

  // All authenticated users have access to everything else
  return <>{children}</>;
};

export default ProtectedRoute;
