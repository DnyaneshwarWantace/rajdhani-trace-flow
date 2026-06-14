import { getApiUrl } from '@/utils/apiConfig';

export interface Transport {
  id: string;
  vehicle_no: string;
  vehicle_type: 'own' | 'outside' | 'hired';
  capacity_kg: number;
  driver_name?: string;
  driver_contact?: string;
  notes?: string;
  is_active: boolean;
}

async function authHeaders(): Promise<Record<string, string>> {
  const token = localStorage.getItem('auth_token');
  return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

export const TransportService = {
  async getAll(activeOnly = false): Promise<Transport[]> {
    const API_URL = getApiUrl();
    const url = `${API_URL}/transports${activeOnly ? '?active_only=true' : ''}`;
    const res = await fetch(url, { headers: await authHeaders() });
    const data = await res.json();
    return data.success ? data.data : [];
  },

  async create(payload: Omit<Transport, 'id' | 'is_active'>): Promise<Transport> {
    const API_URL = getApiUrl();
    const res = await fetch(`${API_URL}/transports`, {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to create transport');
    return data.data;
  },

  async update(id: string, payload: Partial<Transport>): Promise<Transport> {
    const API_URL = getApiUrl();
    const res = await fetch(`${API_URL}/transports/${id}`, {
      method: 'PATCH',
      headers: await authHeaders(),
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to update transport');
    return data.data;
  },

  async delete(id: string): Promise<void> {
    const API_URL = getApiUrl();
    const res = await fetch(`${API_URL}/transports/${id}`, {
      method: 'DELETE',
      headers: await authHeaders(),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to delete transport');
  },
};
