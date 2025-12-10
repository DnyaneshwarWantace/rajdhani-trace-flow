import { getApiUrl } from '@/utils/apiConfig';

const API_BASE_URL = getApiUrl();

export interface UploadImageResult {
  url: string;
  key: string;
  error?: string;
}

/**
 * Upload an image file to Cloudflare R2 via backend
 * @param file - The image file to upload
 * @param folder - Optional folder path (e.g., 'products', 'materials')
 * @returns The public URL of the uploaded image
 */
export async function uploadImageToR2(
  file: File,
  folder: string = 'products'
): Promise<UploadImageResult> {
  try {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      return { url: '', key: '', error: 'File must be an image' };
    }

    // Validate file size (max 50MB - backend limit)
    if (file.size > 50 * 1024 * 1024) {
      return { url: '', key: '', error: 'Image size must be less than 50MB' };
    }

    // Get auth token
    const token = localStorage.getItem('auth_token');
    if (!token) {
      return { url: '', key: '', error: 'Authentication required' };
    }

    // Create FormData
    const formData = new FormData();
    formData.append('image', file);

    // Upload via backend endpoint
    const response = await fetch(`${API_BASE_URL}/images/upload?folder=${folder}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      // Handle 401 Unauthorized
      if (response.status === 401) {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user');
        window.location.href = '/v2/login';
        return { url: '', key: '', error: 'Authentication expired' };
      }

      const errorData = await response.json().catch(() => ({ error: 'Upload failed' }));
      return {
        url: '',
        key: '',
        error: errorData.error || `Upload failed: ${response.statusText}`,
      };
    }

    const data = await response.json();

    if (!data.success) {
      return {
        url: '',
        key: '',
        error: data.error || 'Upload failed',
      };
    }

    return {
      url: data.url,
      key: data.key,
    };
  } catch (error: any) {
    console.error('Error uploading image to R2:', error);
    return {
      url: '',
      key: '',
      error: error.message || 'Failed to upload image',
    };
  }
}

/**
 * Delete an image from Cloudflare R2 via backend
 * @param imageUrl - The public URL of the image to delete
 * @returns Success status
 */
export async function deleteImageFromR2(imageUrl: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Get auth token
    const token = localStorage.getItem('auth_token');
    if (!token) {
      return { success: false, error: 'Authentication required' };
    }

    // Delete via backend endpoint
    const response = await fetch(`${API_BASE_URL}/images/delete`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ imageUrl }),
    });

    if (!response.ok) {
      // Handle 401 Unauthorized
      if (response.status === 401) {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user');
        window.location.href = '/v2/login';
        return { success: false, error: 'Authentication expired' };
      }

      const errorData = await response.json().catch(() => ({ error: 'Delete failed' }));
      return {
        success: false,
        error: errorData.error || `Delete failed: ${response.statusText}`,
      };
    }

    const data = await response.json();

    return {
      success: data.success || false,
      error: data.error,
    };
  } catch (error: any) {
    console.error('Error deleting image from R2:', error);
    return {
      success: false,
      error: error.message || 'Failed to delete image',
    };
  }
}

