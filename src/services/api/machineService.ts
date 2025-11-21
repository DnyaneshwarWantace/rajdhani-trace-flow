import AuthService from './authService';

const API_URL = import.meta.env.VITE_API_URL || 'https://rajdhani.wantace.com/api';

// Helper function to get headers with auth token
const getHeaders = () => {
  const token = AuthService.getToken();
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  };
};

export interface Machine {
  id: string;
  name: string;
  description: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CreateMachineData {
  machine_name: string;
  machine_type: string;
  notes?: string;
  description?: string;
  status?: string;
  [key: string]: any; // Allow additional fields
}

export class MachineService {
  // Get all machines
  static async getMachines(): Promise<{ data: Machine[] | null; error: string | null }> {
    try {
      const response = await fetch(`${API_URL}/production/machines`, {
        headers: getHeaders()
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch machines');
      }

      return { data: result.data, error: null };
    } catch (error) {
      console.error('Error fetching machines:', error);
      return { data: null, error: error.message || 'Failed to fetch machines' };
    }
  }

  // Create a new machine
  static async createMachine(machineData: CreateMachineData): Promise<{ data: Machine | null; error: string | null }> {
    try {
      const response = await fetch(`${API_URL}/production/machines`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(machineData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create machine');
      }

      return { data: result.data, error: null };
    } catch (error) {
      console.error('Error creating machine:', error);
      return { data: null, error: error.message || 'Failed to create machine' };
    }
  }

  // Update a machine
  static async updateMachine(id: string, machineData: Partial<CreateMachineData>): Promise<{ data: Machine | null; error: string | null }> {
    try {
      const response = await fetch(`${API_URL}/production/machines/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(machineData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update machine');
      }

      return { data: result.data, error: null };
    } catch (error) {
      console.error('Error updating machine:', error);
      return { data: null, error: error.message || 'Failed to update machine' };
    }
  }

  // Delete a machine
  static async deleteMachine(id: string): Promise<{ error: string | null }> {
    try {
      const response = await fetch(`${API_URL}/production/machines/${id}`, {
        method: 'DELETE',
        headers: getHeaders()
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete machine');
      }

      return { error: null };
    } catch (error) {
      console.error('Error deleting machine:', error);
      return { error: error.message || 'Failed to delete machine' };
    }
  }
}
