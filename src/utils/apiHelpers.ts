export const PERMISSION_DENIED_MESSAGE = "You don't have permission to do this. Please contact your administrator.";

/**
 * Returns a user-friendly error message for API responses.
 * Use when throwing after !response.ok so 403 shows a clear permission message.
 */
export function getApiError(response: Response, data?: { error?: string } | null): string {
  if (response.status === 403) {
    return PERMISSION_DENIED_MESSAGE;
  }
  if (response.status === 401) {
    return 'Your session has expired. Please sign in again.';
  }
  return data?.error || 'Something went wrong. Please try again.';
}

/**
 * Use in services that return { data, error } pattern.
 * Returns a friendly error string — 403 → permission denied, others → backend message.
 */
export function getServiceError(response: Response, result?: { error?: string } | null): string {
  if (response.status === 403) {
    return PERMISSION_DENIED_MESSAGE;
  }
  if (response.status === 401) {
    return 'Your session has expired. Please sign in again.';
  }
  return result?.error || 'Something went wrong. Please try again.';
}
