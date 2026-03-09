import { PERMISSION_DENIED_MESSAGE } from '@/utils/permissions';

/**
 * Returns a user-friendly error message for API responses.
 * Use when throwing after !response.ok so 403 shows a clear permission message.
 */
export function getApiError(response: Response, data: { error?: string } | null): string {
  if (response.status === 403) {
    return PERMISSION_DENIED_MESSAGE;
  }
  if (response.status === 401) {
    return 'Please sign in again.';
  }
  return data?.error || 'Something went wrong. Please try again.';
}

