/**
 * Get the API URL based on the current environment
 * Handles both localhost and network IP access so testers on same WiFi can use your machine's IP
 */
export const getApiUrl = (): string => {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;

    // If opened via network IP, always use that host for API (so testers hit your backend)
    if (
      hostname.match(/^192\.168\./) ||
      hostname.match(/^10\./) ||
      hostname.match(/^172\.(1[6-9]|2[0-9]|3[0-1])\./)
    ) {
      return `http://${hostname}:8000/api`;
    }

    // Localhost: use env or default local backend
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
    }

    // Production / other: relative or env
    return import.meta.env.VITE_API_URL || '/api';
  }

  return import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
};

/**
 * Get the Socket.IO URL based on the current environment
 */
export const getSocketUrl = (): string => {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;

    // If opened via network IP, use that host so testers hit your backend
    if (
      hostname.match(/^192\.168\./) ||
      hostname.match(/^10\./) ||
      hostname.match(/^172\.(1[6-9]|2[0-9]|3[0-1])\./)
    ) {
      return `http://${hostname}:8000`;
    }

    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return import.meta.env.VITE_SOCKET_URL || 'http://localhost:8000';
    }

    return import.meta.env.VITE_SOCKET_URL || window.location.origin;
  }

  return import.meta.env.VITE_SOCKET_URL || 'http://localhost:8000';
};

