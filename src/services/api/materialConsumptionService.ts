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

export interface MaterialConsumption {
  id: string;
  production_batch_id: string;
  production_flow_id?: string;
  material_id: string;
  material_name: string;
  material_type: 'product' | 'raw_material';
  quantity_used: number;
  unit: string;
  cost_per_unit: number;
  total_cost: number;
  consumed_at: string;
  operator?: string;
  machine_id?: string;
  machine_name?: string;
  step_id?: string;
  step_name?: string;
  individual_product_ids?: string[];
  waste_quantity: number;
  waste_type: 'scrap' | 'defective' | 'excess' | 'normal';
  notes?: string;
  status: 'active' | 'cancelled' | 'adjusted';
  created_at: string;
  updated_at: string;
}

export interface MaterialConsumptionSummary {
  material_type: 'product' | 'raw_material';
  material_id: string;
  material_name: string;
  unit: string;
  total_quantity: number;
  total_cost: number;
  total_waste: number;
  consumption_count: number;
  last_consumed: string;
}

export interface MaterialConsumptionAnalytics {
  material_type: 'product' | 'raw_material';
  material_name: string;
  total_quantity: number;
  total_cost: number;
  total_waste: number;
  consumption_count: number;
  avg_efficiency: number;
  waste_percentage: number;
}

export interface CreateMaterialConsumptionRequest {
  production_batch_id: string;
  production_product_id?: string;
  production_flow_id?: string;
  material_id: string;
  material_name: string;
  material_type: 'product' | 'raw_material';
  quantity_used: number;
  unit: string;
  cost_per_unit?: number;
  operator?: string;
  machine_id?: string;
  machine_name?: string;
  step_id?: string;
  step_name?: string;
  individual_product_ids?: string[];
  waste_quantity?: number;
  waste_type?: 'scrap' | 'defective' | 'excess' | 'normal';
  notes?: string;
  deduct_now?: boolean;
}

export interface MaterialConsumptionFilters {
  production_batch_id?: string;
  production_flow_id?: string;
  material_type?: 'product' | 'raw_material';
  material_id?: string;
  step_id?: string;
  start_date?: string;
  end_date?: string;
  page?: number;
  limit?: number;
}

class MaterialConsumptionService {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<{ data: T; error: string | null }> {
    try {
      const response = await fetch(`${API_URL}/material-consumption${endpoint}`, {
        headers: {
          ...getHeaders(),
          ...options.headers,
        },
        ...options,
      });

      const result = await response.json();

      if (!response.ok) {
        return { data: null as T, error: result.error || 'Request failed' };
      }

      // For list endpoints (getMaterialConsumption), preserve the full response structure with pagination
      // Check if this is a GET request to the list endpoint (empty or with query params)
      const isListEndpoint = (!options.method || options.method === 'GET') && (endpoint === '' || endpoint.startsWith('?'));
      if (isListEndpoint) {
        // Backend returns { success: true, data: [...], pagination: {...} }
        // We want to return { data: [...], pagination: {...} }
        if (result.success && result.data !== undefined && result.pagination !== undefined) {
          return { data: { data: result.data, pagination: result.pagination } as T, error: null };
        }
      }
      
      return { data: result.data || result, error: null };
    } catch (error) {
      console.error('MaterialConsumptionService request error:', error);
      return { 
        data: null as T, 
        error: error instanceof Error ? error.message : 'Network error' 
      };
    }
  }

  // Get all material consumption records with optional filters
  async getMaterialConsumption(filters: MaterialConsumptionFilters = {}) {
    const queryParams = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, value.toString());
      }
    });

    const queryString = queryParams.toString();
    const endpoint = queryString ? `?${queryString}` : '';

    return this.request<{
      data: MaterialConsumption[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
      };
    }>(endpoint);
  }

  // Get material consumption by ID
  async getMaterialConsumptionById(id: string) {
    return this.request<MaterialConsumption>(`/${id}`);
  }

  // Create new material consumption record
  async createMaterialConsumption(data: CreateMaterialConsumptionRequest) {
    return this.request<MaterialConsumption>('', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Update material consumption record
  async updateMaterialConsumption(id: string, data: Partial<MaterialConsumption>) {
    return this.request<MaterialConsumption>(`/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Delete material consumption record (soft delete)
  async deleteMaterialConsumption(id: string) {
    return this.request<{ message: string }>(`/${id}`, {
      method: 'DELETE',
    });
  }

  // Get consumption summary for a production batch
  async getBatchConsumptionSummary(batchId: string) {
    return this.request<MaterialConsumptionSummary[]>(`/batch/${batchId}/summary`);
  }

  // Get consumption by material type for a batch
  async getConsumptionByMaterialType(batchId: string, materialType: 'product' | 'raw_material') {
    return this.request<MaterialConsumption[]>(`/batch/${batchId}/type/${materialType}`);
  }

  // Get consumption for a specific step
  async getStepConsumption(stepId: string) {
    return this.request<MaterialConsumption[]>(`/step/${stepId}`);
  }

  // Get consumption analytics
  async getConsumptionAnalytics(filters: {
    production_batch_id?: string;
    start_date?: string;
    end_date?: string;
    material_type?: 'product' | 'raw_material';
  } = {}) {
    const queryParams = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, value.toString());
      }
    });

    const queryString = queryParams.toString();
    const endpoint = queryString ? `/analytics/summary?${queryString}` : '/analytics/summary';

    return this.request<MaterialConsumptionAnalytics[]>(endpoint);
  }

  // Helper method to calculate efficiency
  calculateEfficiency(quantityUsed: number, wasteQuantity: number): number {
    if (quantityUsed === 0) return 0;
    const wastePercentage = (wasteQuantity / quantityUsed) * 100;
    return Math.max(0, 100 - wastePercentage);
  }

  // Helper method to format consumption data for display
  formatConsumptionForDisplay(consumption: MaterialConsumption) {
    return {
      ...consumption,
      efficiency: this.calculateEfficiency(consumption.quantity_used, consumption.waste_quantity),
      waste_percentage: consumption.quantity_used > 0 
        ? ((consumption.waste_quantity / consumption.quantity_used) * 100).toFixed(2)
        : '0.00',
      formatted_cost: `₹${consumption.total_cost.toFixed(2)}`,
      formatted_quantity: `${consumption.quantity_used} ${consumption.unit}`,
      formatted_waste: `${consumption.waste_quantity} ${consumption.unit}`,
      formatted_date: new Date(consumption.consumed_at).toLocaleString()
    };
  }

  // Helper method to get consumption statistics
  getConsumptionStats(consumptionList: MaterialConsumption[]) {
    const totalQuantity = consumptionList.reduce((sum, item) => sum + item.quantity_used, 0);
    const totalCost = consumptionList.reduce((sum, item) => sum + item.total_cost, 0);
    const totalWaste = consumptionList.reduce((sum, item) => sum + item.waste_quantity, 0);
    const avgEfficiency = consumptionList.length > 0 
      ? consumptionList.reduce((sum, item) => sum + this.calculateEfficiency(item.quantity_used, item.waste_quantity), 0) / consumptionList.length
      : 0;

    return {
      totalQuantity,
      totalCost,
      totalWaste,
      avgEfficiency: Number(avgEfficiency.toFixed(2)),
      wastePercentage: totalQuantity > 0 ? Number(((totalWaste / totalQuantity) * 100).toFixed(2)) : 0,
      itemCount: consumptionList.length
    };
  }
}

export default new MaterialConsumptionService();
