import AuthService from '@/services/api/authService';

/**
 * Handle authentication errors (401/403) by logging out and redirecting
 */
export async function handleAuthError(response: Response): Promise<void> {
  if (response.status === 401 || response.status === 403) {
    try {
      // Try to get error message from response
      const errorData = await response.clone().json().catch(() => ({}));
      const errorMessage = errorData.error || '';
      
      // Log out user if token expired or invalid
      if (
        response.status === 401 || 
        errorMessage.includes('Token expired') ||
        errorMessage.includes('Invalid token') ||
        errorMessage.includes('No token provided') ||
        errorMessage.includes('Token expired')
      ) {
        console.warn('⚠️ Token expired or invalid, logging out...');
        
        // Clear auth data
        AuthService.removeToken();
        
        // Redirect to login page
        // Use window.location to ensure full page reload and clear any state
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
    } catch (error) {
      // If we can't parse the error, still log out on 401/403
      console.warn('⚠️ Authentication error, logging out...');
      AuthService.removeToken();
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
  }
}

/**
 * Get headers with authentication token
 */
export function getAuthHeaders(): HeadersInit {
  const token = AuthService.getToken();
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
  };
}

