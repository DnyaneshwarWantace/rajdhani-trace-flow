import { getApiUrl } from '@/utils/apiConfig';

const API_URL = getApiUrl();

export interface ProductionBatch {
  id: string;
  batch_number: string;
  product_id: string;
  product_name?: string;
  order_id?: string;
  planned_quantity: number;
  actual_quantity?: number;
  start_date?: string;
  completion_date?: string;
  status: 'planned' | 'in_progress' | 'in_production' | 'completed' | 'cancelled' | 'on_hold';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  operator?: string;
  supervisor?: string;
  notes?: string;
  cancellation_details?: {
    cancelled_by?: string;
    cancelled_at?: string;
    cancellation_reason?: string;
  };
  created_at: string;
  updated_at: string;
  // Product details (populated when needed)
  category?: string;
  subcategory?: string;
  length?: string;
  width?: string;
  length_unit?: string;
  width_unit?: string;
  weight?: string;
  weight_unit?: string;
  color?: string;
  pattern?: string;
  // Stage tracking
  planning_stage?: {
    status?: 'draft' | 'in_progress' | 'completed';
    started_at?: string;
    started_by?: string;
    completed_at?: string;
    completed_by?: string;
    materials_draft?: any[];
    materials_consumed?: any[];
  };
  machine_stage?: {
    status?: 'not_started' | 'in_progress' | 'completed';
    started_at?: string;
    started_by?: string;
    completed_at?: string;
    completed_by?: string;
  };
  wastage_stage?: {
    status?: 'not_started' | 'in_progress' | 'completed';
    started_at?: string;
    started_by?: string;
    completed_at?: string;
    completed_by?: string;
    has_wastage?: boolean;
  };
  final_stage?: {
    status?: 'not_started' | 'in_progress' | 'completed';
    started_at?: string;
    started_by?: string;
    completed_at?: string;
    completed_by?: string;
  };
}

export interface CreateProductionBatchData {
  product_id: string;
  planned_quantity: number;
  order_id?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  start_date?: string;
  completion_date?: string;
  operator?: string;
  supervisor?: string;
  notes?: string;
  machine_id?: string;
}

export interface UpdateProductionBatchData extends Partial<CreateProductionBatchData> {
  status?: 'planned' | 'in_progress' | 'in_production' | 'completed';
  actual_quantity?: number;
  planning_stage?: {
    status?: 'draft' | 'in_progress' | 'completed';
    started_at?: string;
    started_by?: string;
    completed_at?: string;
    completed_by?: string;
    materials_draft?: any[];
    materials_consumed?: any[];
  };
  machine_stage?: {
    status?: 'not_started' | 'in_progress' | 'completed';
    started_at?: string;
    started_by?: string;
    completed_at?: string;
    completed_by?: string;
  };
  wastage_stage?: {
    status?: 'not_started' | 'in_progress' | 'completed';
    started_at?: string;
    started_by?: string;
    completed_at?: string;
    completed_by?: string;
    has_wastage?: boolean;
  };
  final_stage?: {
    status?: 'not_started' | 'in_progress' | 'completed';
    started_at?: string;
    started_by?: string;
    completed_at?: string;
    completed_by?: string;
  };
}

export class ProductionService {
  private static getHeaders(): HeadersInit {
    const token = localStorage.getItem('auth_token');
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  static async createBatch(batchData: CreateProductionBatchData): Promise<{ data: ProductionBatch | null; error: string | null }> {
    try {
      const response = await fetch(`${API_URL}/production/batches`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(batchData),
      });

      const result = await response.json();

      if (!response.ok) {
        return { data: null, error: result.error || 'Failed to create production batch' };
      }

      return { data: result.data, error: null };
    } catch (error) {
      console.error('Error in createBatch:', error);
      return { data: null, error: 'Failed to create production batch' };
    }
  }

  static async getBatches(filters?: {
    search?: string;
    status?: string;
    priority?: string;
  }): Promise<{ data: ProductionBatch[] | null; error: string | null }> {
    try {
      const params = new URLSearchParams();

      if (filters?.search) params.append('search', filters.search);
      if (filters?.status) params.append('status', filters.status);
      if (filters?.priority) params.append('priority', filters.priority);

      const response = await fetch(`${API_URL}/production/batches?${params}`, {
        headers: this.getHeaders(),
      });
      const result = await response.json();

      if (!response.ok) {
        return { data: null, error: result.error || 'Failed to fetch production batches' };
      }

      return { data: result.data || [], error: null };
    } catch (error) {
      console.error('Error in getBatches:', error);
      return { data: null, error: 'Failed to fetch production batches' };
    }
  }

  static async getBatchById(batchId: string): Promise<{ data: ProductionBatch | null; error: string | null }> {
    try {
      const response = await fetch(`${API_URL}/production/batches/${batchId}`, {
        headers: this.getHeaders(),
      });
      const result = await response.json();

      if (!response.ok) {
        return { data: null, error: result.error || 'Batch not found' };
      }

      return { data: result.data, error: null };
    } catch (error) {
      console.error('Error in getBatchById:', error);
      return { data: null, error: 'Failed to fetch batch' };
    }
  }

  static async updateBatch(batchId: string, updateData: UpdateProductionBatchData): Promise<{ data: ProductionBatch | null; error: string | null }> {
    try {
      const response = await fetch(`${API_URL}/production/batches/${batchId}`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify(updateData),
      });

      const result = await response.json();

      if (!response.ok) {
        return { data: null, error: result.error || 'Failed to update batch' };
      }

      return { data: result.data, error: null };
    } catch (error) {
      console.error('Error in updateBatch:', error);
      return { data: null, error: 'Failed to update batch' };
    }
  }

  static async deleteBatch(batchId: string, reason?: string): Promise<{ data: boolean | null; error: string | null }> {
    try {
      const response = await fetch(`${API_URL}/production/batches/${batchId}/cancel`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ reason }),
      });

      const result = await response.json();

      if (!response.ok) {
        return { data: null, error: result.error || 'Failed to cancel batch' };
      }

      return { data: result.success, error: null };
    } catch (error) {
      console.error('Error in deleteBatch:', error);
      return { data: null, error: 'Failed to cancel batch' };
    }
  }

  static async getProductionStats(): Promise<{ data: any | null; error: string | null }> {
    try {
      const response = await fetch(`${API_URL}/production/stats`, {
        headers: this.getHeaders(),
      });
      const result = await response.json();

      if (!response.ok) {
        return { data: null, error: result.error || 'Failed to fetch production stats' };
      }

      return { data: result.data, error: null };
    } catch (error) {
      console.error('Error in getProductionStats:', error);
      return { data: null, error: 'Failed to fetch production stats' };
    }
  }

  static async getProductionFlowByBatchId(batchId: string): Promise<{ data: any | null; error: string | null }> {
    try {
      const response = await fetch(`${API_URL}/production/flows/batch/${batchId}`, {
        headers: this.getHeaders(),
      });
      const result = await response.json();

      if (!response.ok) {
        return { data: null, error: result.error || 'Failed to fetch production flow' };
      }

      return { data: result.data, error: null };
    } catch (error) {
      console.error('Error in getProductionFlowByBatchId:', error);
      return { data: null, error: 'Failed to fetch production flow' };
    }
  }

  static async getMaterialConsumption(batchId: string): Promise<{ data: any[] | null; error: string | null }> {
    try {
      // Use batch summary endpoint which fetches real-time individual product statuses
      const response = await fetch(`${API_URL}/material-consumption/batch/${batchId}/summary`, {
        headers: this.getHeaders(),
      });
      const result = await response.json();

      if (!response.ok) {
        return { data: null, error: result.error || 'Failed to fetch material consumption' };
      }

      return { data: result.data || [], error: null };
    } catch (error) {
      console.error('Error in getMaterialConsumption:', error);
      return { data: null, error: 'Failed to fetch material consumption' };
    }
  }

  static async getRawMaterialConsumptionHistory(materialId: string, filters?: {
    status?: 'reserved' | 'in_production' | 'used' | 'sold';
    start_date?: string;
    end_date?: string;
    limit?: number;
  }): Promise<{ data: any[] | null; summary: any; error: string | null }> {
    try {
      const queryParams = new URLSearchParams();
      if (filters?.status) queryParams.append('status', filters.status);
      if (filters?.start_date) queryParams.append('start_date', filters.start_date);
      if (filters?.end_date) queryParams.append('end_date', filters.end_date);
      if (filters?.limit) queryParams.append('limit', filters.limit.toString());

      const response = await fetch(`${API_URL}/material-consumption/raw-material/${materialId}/history?${queryParams}`, {
        headers: this.getHeaders(),
      });
      const result = await response.json();

      if (!response.ok) {
        return { data: null, summary: null, error: result.error || 'Failed to fetch consumption history' };
      }

      return { data: result.data || [], summary: result.summary || {}, error: null };
    } catch (error) {
      console.error('Error in getRawMaterialConsumptionHistory:', error);
      return { data: null, summary: null, error: 'Failed to fetch consumption history' };
    }
  }

  // Planning Draft State methods
  static async saveDraftPlanningState(
    productId: string,
    draftState: {
      formData: any;
      recipeData?: any;
      materials?: any[];
      consumedMaterials?: any[];
      productionBatchId?: string;
    }
  ): Promise<{ data: any | null; error: string | null }> {
    try {
      const response = await fetch(`${API_URL}/production/planning-draft`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          product_id: productId,
          production_batch_id: draftState.productionBatchId,
          form_data: draftState.formData,
          recipe_data: draftState.recipeData,
          materials: draftState.materials,
          consumed_materials: draftState.consumedMaterials,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        return { data: null, error: result.error || 'Failed to save draft state' };
      }

      return { data: result.data, error: null };
    } catch (error) {
      console.error('Error in saveDraftPlanningState:', error);
      return { data: null, error: 'Failed to save draft state' };
    }
  }

  static async getDraftPlanningState(productId: string): Promise<{ data: any | null; error: string | null }> {
    try {
      const response = await fetch(`${API_URL}/production/planning-draft/${productId}`, {
        headers: this.getHeaders(),
      });

      const result = await response.json();

      if (response.status === 404) {
        return { data: null, error: null }; // No draft state found, not an error
      }

      if (!response.ok) {
        return { data: null, error: result.error || 'Failed to fetch draft state' };
      }

      return { data: result.data, error: null };
    } catch (error) {
      console.error('Error in getDraftPlanningState:', error);
      return { data: null, error: 'Failed to fetch draft state' };
    }
  }

  static async deleteDraftPlanningState(productId: string): Promise<{ data: boolean | null; error: string | null }> {
    try {
      const response = await fetch(`${API_URL}/production/planning-draft/${productId}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
      });

      const result = await response.json();

      if (!response.ok) {
        return { data: null, error: result.error || 'Failed to delete draft state' };
      }

      return { data: result.success, error: null };
    } catch (error) {
      console.error('Error in deleteDraftPlanningState:', error);
      return { data: null, error: 'Failed to delete draft state' };
    }
  }

  // Production Machine methods
  static async getMachines(filters?: {
    status?: string;
    machine_type?: string;
    location?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ machines: any[]; total: number }> {
    try {
      const queryParams = new URLSearchParams();
      if (filters?.status) queryParams.append('status', filters.status);
      if (filters?.machine_type) queryParams.append('machine_type', filters.machine_type);
      if (filters?.location) queryParams.append('location', filters.location);
      if (filters?.limit) queryParams.append('limit', filters.limit.toString());
      if (filters?.offset) queryParams.append('offset', filters.offset.toString());

      const response = await fetch(`${API_URL}/production/machines?${queryParams}`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch machines');
      }

      const data = await response.json();
      return {
        machines: data.data || [],
        total: data.count || 0,
      };
    } catch (error) {
      console.error('Error fetching machines:', error);
      throw error;
    }
  }

  static async getMachineById(id: string): Promise<any> {
    try {
      const response = await fetch(`${API_URL}/production/machines/${id}`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch machine');
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Error fetching machine:', error);
      throw error;
    }
  }

  static async createMachine(machineData: {
    machine_name: string;
    machine_type: string;
    model_number?: string;
    status?: string;
    location?: string;
    department?: string;
    capacity_per_hour?: number;
  }): Promise<{ data: any | null; error: string | null }> {
    try {
      const response = await fetch(`${API_URL}/production/machines`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          status: 'active',
          ...machineData,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        return { data: null, error: result.error || 'Failed to create machine' };
      }

      return { data: result.data, error: null };
    } catch (error) {
      console.error('Error creating machine:', error);
      return { data: null, error: 'Failed to create machine' };
    }
  }

  // Production Flow Step methods
  static async getProductionFlowSteps(flowId: string): Promise<{ data: any[] | null; error: string | null }> {
    try {
      const response = await fetch(`${API_URL}/production/flows/${flowId}/steps`, {
        headers: this.getHeaders(),
      });
      const result = await response.json();

      if (!response.ok) {
        return { data: null, error: result.error || 'Failed to fetch production flow steps' };
      }

      return { data: result.data || [], error: null };
    } catch (error) {
      console.error('Error in getProductionFlowSteps:', error);
      return { data: null, error: 'Failed to fetch production flow steps' };
    }
  }

  static async updateProductionFlowStep(stepId: string, updates: any): Promise<{ data: any | null; error: string | null }> {
    try {
      const response = await fetch(`${API_URL}/production/flow-steps/${stepId}`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify(updates),
      });
      const result = await response.json();

      if (!response.ok) {
        return { data: null, error: result.error || 'Failed to update production flow step' };
      }

      return { data: result.data, error: null };
    } catch (error) {
      console.error('Error in updateProductionFlowStep:', error);
      return { data: null, error: 'Failed to update production flow step' };
    }
  }

  // Material Consumption methods
  static async createMaterialConsumption(consumptionData: {
    production_batch_id: string;
    material_id: string;
    material_name: string;
    material_type: 'product' | 'raw_material';
    quantity_used: number;
    actual_consumed_quantity?: number;
    unit: string;
    quantity_per_sqm?: number;
    individual_product_ids?: string[];
    deduct_now?: boolean;
    notes?: string;
  }): Promise<{ data: any | null; error: string | null }> {
    try {
      const response = await fetch(`${API_URL}/material-consumption`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(consumptionData),
      });

      const result = await response.json();

      if (!response.ok) {
        return { data: null, error: result.error || 'Failed to create material consumption' };
      }

      return { data: result.data, error: null };
    } catch (error) {
      console.error('Error in createMaterialConsumption:', error);
      return { data: null, error: 'Failed to create material consumption' };
    }
  }

  // Production Flow methods
  static async createProductionFlow(flowData: {
    production_batch_id: string;
    flow_name: string;
    description?: string;
  }): Promise<{ data: any | null; error: string | null }> {
    try {
      const response = await fetch(`${API_URL}/production/flows`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(flowData),
      });

      const result = await response.json();

      if (!response.ok) {
        return { data: null, error: result.error || 'Failed to create production flow' };
      }

      return { data: result.data, error: null };
    } catch (error) {
      console.error('Error in createProductionFlow:', error);
      return { data: null, error: 'Failed to create production flow' };
    }
  }

  static async createProductionFlowStep(stepData: {
    production_flow_id: string;
    step_number: number;
    step_name: string;
    step_type: string;
    machine_id?: string;
    machine_name?: string;
    description?: string;
    inspector?: string;
    shift?: 'day' | 'night';
    start_time?: string;
    status?: 'pending' | 'in_progress' | 'completed' | 'skipped';
  }): Promise<{ data: any | null; error: string | null }> {
    try {
      const response = await fetch(`${API_URL}/production/flow-steps`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(stepData),
      });

      const result = await response.json();

      if (!response.ok) {
        return { data: null, error: result.error || 'Failed to create production flow step' };
      }

      return { data: result.data, error: null };
    } catch (error) {
      console.error('Error in createProductionFlowStep:', error);
      return { data: null, error: 'Failed to create production flow step' };
    }
  }
}

