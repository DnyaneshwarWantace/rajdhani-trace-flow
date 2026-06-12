/**
 * Get the API URL based on the current environment
 * Handles both localhost and network IP access so testers on same WiFi can use your machine's IP
 */
export const getApiUrl = (): string => {
  const urls = (import.meta.env.VITE_API_URL || 'http://localhost:8000/api')
    .split(',').map((u: string) => u.trim());

  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    // Pick the URL whose host matches the current hostname
    const match = urls.find((u: string) => {
      try { return new URL(u).hostname === hostname; } catch { return false; }
    });
    if (match) return match;
  }

  return urls[0];
};

/**
 * Get the Socket.IO URL based on the current environment
 */
export const getSocketUrl = (): string => {
  const apiUrls = (import.meta.env.VITE_API_URL || 'http://localhost:8000/api')
    .split(',').map((u: string) => u.trim());

  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const match = apiUrls.find((u: string) => {
      try { return new URL(u).hostname === hostname; } catch { return false; }
    });
    if (match) {
      try { const p = new URL(match); return `${p.protocol}//${p.hostname}:${p.port || 8000}`; } catch {}
    }
  }

  const socketUrls = (import.meta.env.VITE_SOCKET_URL || '').split(',').map((u: string) => u.trim()).filter(Boolean);
  return socketUrls[0] || 'http://localhost:8000';
};

