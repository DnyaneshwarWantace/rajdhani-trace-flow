/**
 * Get the API URL based on the current environment
 * Handles both localhost and network IP access
 */
export const getApiUrl = (): string => {
  // If explicitly set via env variable, use that
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }

  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    
    // If accessing via localhost or 127.0.0.1, use localhost:8000
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:8000/api';
    }
    
    // If accessing via network IP (192.168.x.x, 10.x.x.x, etc.), use the same IP with port 8000
    // Match common private IP ranges
    if (
      hostname.match(/^192\.168\./) ||
      hostname.match(/^10\./) ||
      hostname.match(/^172\.(1[6-9]|2[0-9]|3[0-1])\./)
    ) {
      return `http://${hostname}:8000/api`;
    }
    
    // For production/other cases, use relative path (will be proxied by Nginx)
    return '/api';
  }

  // Fallback for SSR or other cases
  return 'http://localhost:8000/api';
};

/**
 * Get the Socket.IO URL based on the current environment
 */
export const getSocketUrl = (): string => {
  // If explicitly set via env variable, use that
  if (import.meta.env.VITE_SOCKET_URL) {
    return import.meta.env.VITE_SOCKET_URL;
  }

  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    
    // If accessing via localhost or 127.0.0.1, use localhost:8000
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:8000';
    }
    
    // If accessing via network IP, use the same IP with port 8000
    if (
      hostname.match(/^192\.168\./) ||
      hostname.match(/^10\./) ||
      hostname.match(/^172\.(1[6-9]|2[0-9]|3[0-1])\./)
    ) {
      return `http://${hostname}:8000`;
    }
    
    // For production, use same origin (Nginx will proxy /socket.io/ to backend)
    return window.location.origin;
  }

  // Fallback
  return 'http://localhost:8000';
};

