// Production Service for MongoDB Backend
// Handles production, batches, machines, and waste management

import AuthService from './authService';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://rajdhani.wantace.com/api';

// Helper function to get headers with auth token
const getHeaders = () => {
  const token = AuthService.getToken();
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  };
};

// Production Interfaces
export interface Production {
  id: string;
  production_number: string;
  product_id: string;
  product_name: string;
  batch_id: string;
  batch_number: string;
  quantity: number;
  unit: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'on_hold';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  start_date?: string;
  expected_completion_date?: string;
  actual_completion_date?: string;
  assigned_machine?: string;
  assigned_operator?: string;
  supervisor?: string;
  notes?: string;
  quality_grade: 'A+' | 'A' | 'B' | 'C' | 'D';
  waste_generated: number;
  waste_percentage: number;
  efficiency_percentage: number;
  materials_used: MaterialUsage[];
  production_steps: ProductionStep[];
  quality_checks: QualityCheck[];
  created_at: string;
  updated_at: string;
}

export interface ProductionBatch {
  id: string;
  batch_number: string;
  product_id: string;
  product_name?: string;
  planned_quantity: number;
  actual_quantity?: number;
  order_id?: string;
  unit?: string;
  status: 'planned' | 'in_progress' | 'completed' | 'paused' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  start_date?: string;
  completion_date?: string; // Actual completion date
  operator?: string;
  supervisor?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
  // Legacy fields (deprecated, use start_date and completion_date instead)
  planned_start_date?: string;
  planned_end_date?: string;
  actual_start_date?: string;
  actual_end_date?: string;
  batch_size?: number;
  assigned_machine?: string;
  assigned_operator?: string;
  recipe_id?: string;
  recipe_name?: string;
  materials_required?: MaterialRequirement[];
  production_steps?: BatchProductionStep[];
  quality_specifications?: QualitySpecification[];
  waste_tracking?: WasteTracking;
  cost_breakdown?: CostBreakdown;
}

export interface ProductionMachine {
  id: string;
  machine_name: string;
  machine_type: string;
  model_number?: string;
  serial_number?: string;
  manufacturer?: string;
  status: 'active' | 'inactive' | 'maintenance' | 'broken' | 'retired';
  location?: string;
  department?: string;
  capacity_per_hour?: number;
  capacity_unit?: string;
  current_operator?: string;
  last_maintenance_date?: string;
  next_maintenance_date?: string;
  maintenance_interval_days: number;
  operating_hours: number;
  total_operating_hours: number;
  efficiency_percentage: number;
  energy_consumption: number;
  energy_unit: string;
  maintenance_cost: number;
  hourly_rate: number;
  specifications: MachineSpecifications;
  capabilities: MachineCapability[];
  maintenance_history: MaintenanceRecord[];
  production_history: ProductionHistory[];
  alerts: MachineAlert[];
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface ProductionWaste {
  id: string;
  waste_number: string;
  production_id: string;
  batch_id?: string;
  product_id: string;
  product_name: string;
  waste_type: 'cutting_waste' | 'defective_products' | 'excess_material' | 'contamination' | 'expired_material' | 'other';
  waste_category: 'recyclable' | 'reusable' | 'disposable' | 'hazardous' | 'organic';
  quantity: number;
  unit: string;
  weight?: number;
  weight_unit: string;
  waste_percentage: number;
  generation_date: string;
  generation_stage: 'raw_material' | 'cutting' | 'weaving' | 'finishing' | 'packaging' | 'quality_check';
  reason: string;
  description?: string;
  status: 'generated' | 'collected' | 'processed' | 'disposed' | 'recycled' | 'reused';
  disposal_method: 'recycle' | 'reuse' | 'dispose' | 'sell' | 'donate' | 'return_to_supplier';
  disposal_date?: string;
  disposal_cost: number;
  recovery_value: number;
  environmental_impact: EnvironmentalImpact;
  quality_grade: 'A+' | 'A' | 'B' | 'C' | 'D';
  reusability_potential: 'high' | 'medium' | 'low' | 'none';
  storage_location?: string;
  storage_conditions?: string;
  handling_instructions?: string;
  safety_requirements?: string;
  responsible_person?: string;
  supervisor?: string;
  photos: string[];
  documents: string[];
  tags: string[];
  notes?: string;
  created_at: string;
  updated_at: string;
}

// Supporting Interfaces
export interface MaterialUsage {
  material_id: string;
  material_name: string;
  quantity_used: number;
  unit: string;
  cost_per_unit: number;
  total_cost: number;
}

export interface ProductionStep {
  step_number: number;
  step_name: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  start_time?: string;
  end_time?: string;
  duration_minutes: number;
  operator?: string;
  notes?: string;
  quality_check: QualityCheckResult;
}

export interface QualityCheck {
  check_type: string;
  check_name: string;
  status: 'pending' | 'passed' | 'failed';
  checked_by?: string;
  checked_at?: string;
  result_value?: string;
  acceptable_range?: string;
  notes?: string;
}

export interface QualityCheckResult {
  passed: boolean;
  checked_by?: string;
  checked_at?: string;
  notes?: string;
}

export interface MaterialRequirement {
  material_id: string;
  material_name: string;
  required_quantity: number;
  unit: string;
  available_quantity: number;
  allocated_quantity: number;
  cost_per_unit: number;
  total_cost: number;
}

export interface BatchProductionStep {
  step_number: number;
  step_name: string;
  description?: string;
  estimated_duration: number;
  actual_duration: number;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  start_time?: string;
  end_time?: string;
  operator?: string;
  notes?: string;
}

export interface QualitySpecification {
  parameter: string;
  target_value: string;
  acceptable_range: string;
  unit?: string;
  checked: boolean;
  actual_value?: string;
  checked_by?: string;
  checked_at?: string;
}

export interface WasteTracking {
  expected_waste_percentage: number;
  actual_waste_percentage: number;
  waste_quantity: number;
  waste_type?: string;
  waste_disposal_method?: string;
  waste_cost: number;
}

export interface CostBreakdown {
  material_cost: number;
  labor_cost: number;
  machine_cost: number;
  overhead_cost: number;
  waste_cost: number;
  total_cost: number;
  cost_per_unit: number;
}

export interface MachineSpecifications {
  power_rating?: string;
  voltage?: string;
  dimensions?: string;
  weight?: string;
  operating_temperature?: string;
  humidity_range?: string;
}

export interface MachineCapability {
  process_type: string;
  product_types: string[];
  max_throughput?: number;
  throughput_unit?: string;
  quality_grade?: string;
}

export interface MaintenanceRecord {
  maintenance_type: string;
  description?: string;
  performed_by?: string;
  performed_at?: string;
  cost: number;
  parts_replaced: string[];
  notes?: string;
}

export interface ProductionHistory {
  production_id: string;
  batch_id?: string;
  product_name: string;
  start_time?: string;
  end_time?: string;
  quantity_produced?: number;
  efficiency?: number;
  quality_grade?: string;
  operator?: string;
}

export interface MachineAlert {
  alert_type: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'active' | 'acknowledged' | 'resolved';
  created_at: string;
  acknowledged_by?: string;
  acknowledged_at?: string;
  resolved_by?: string;
  resolved_at?: string;
}

export interface EnvironmentalImpact {
  co2_emissions: number;
  water_usage: number;
  energy_usage: number;
}

// Production Service Class
export class ProductionService {
  // Production Management
  static async createProduction(productionData: Partial<Production>): Promise<{ data: Production | null; error: string | null }> {
    try {
      const response = await fetch(`${API_BASE_URL}/production/productions`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(productionData),
      });

      const result = await response.json();

      if (!response.ok) {
        return { data: null, error: result.error || 'Failed to create production' };
      }

      return { data: result.data, error: null };
    } catch (error) {
      console.error('Error in createProduction:', error);
      return { data: null, error: 'Failed to create production' };
    }
  }

  static async getProductions(filters?: {
    status?: string;
    product_id?: string;
    assigned_machine?: string;
    assigned_operator?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ data: Production[] | null; error: string | null }> {
    try {
      const params = new URLSearchParams();

      if (filters?.status) params.append('status', filters.status);
      if (filters?.product_id) params.append('product_id', filters.product_id);
      if (filters?.assigned_machine) params.append('assigned_machine', filters.assigned_machine);
      if (filters?.assigned_operator) params.append('assigned_operator', filters.assigned_operator);
      if (filters?.limit) params.append('limit', filters.limit.toString());
      if (filters?.offset) params.append('offset', filters.offset.toString());

      const response = await fetch(`${API_BASE_URL}/production/productions?${params}`, {
        headers: getHeaders()
      });
      const result = await response.json();

      if (!response.ok) {
        return { data: null, error: result.error || 'Failed to fetch productions' };
      }

      return { data: result.data, error: null };
    } catch (error) {
      console.error('Error in getProductions:', error);
      return { data: null, error: 'Failed to fetch productions' };
    }
  }

  static async getProductionById(productionId: string): Promise<{ data: Production | null; error: string | null }> {
    try {
      const response = await fetch(`${API_BASE_URL}/production/productions/${productionId}`, {
        headers: getHeaders()
      });
      const result = await response.json();

      if (!response.ok) {
        return { data: null, error: result.error || 'Production not found' };
      }

      return { data: result.data, error: null };
    } catch (error) {
      console.error('Error in getProductionById:', error);
      return { data: null, error: 'Failed to fetch production' };
    }
  }

  static async updateProduction(productionId: string, updateData: Partial<Production>): Promise<{ data: Production | null; error: string | null }> {
    try {
      const response = await fetch(`${API_BASE_URL}/production/productions/${productionId}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(updateData),
      });

      const result = await response.json();

      if (!response.ok) {
        return { data: null, error: result.error || 'Failed to update production' };
      }

      return { data: result.data, error: null };
    } catch (error) {
      console.error('Error in updateProduction:', error);
      return { data: null, error: 'Failed to update production' };
    }
  }

  static async deleteProduction(productionId: string): Promise<{ data: boolean | null; error: string | null }> {
    try {
      const response = await fetch(`${API_BASE_URL}/production/productions/${productionId}`, {
        method: 'DELETE',
        headers: getHeaders()
      });

      const result = await response.json();

      if (!response.ok) {
        return { data: null, error: result.error || 'Failed to delete production' };
      }

      return { data: result.success, error: null };
    } catch (error) {
      console.error('Error in deleteProduction:', error);
      return { data: null, error: 'Failed to delete production' };
    }
  }

  // Production Batch Management
  static async createProductionBatch(batchData: Partial<ProductionBatch>): Promise<{ data: ProductionBatch | null; error: string | null }> {
    try {
      const response = await fetch(`${API_BASE_URL}/production/batches`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(batchData),
      });

      const result = await response.json();

      if (!response.ok) {
        return { data: null, error: result.error || 'Failed to create production batch' };
      }

      return { data: result.data, error: null };
    } catch (error) {
      console.error('Error in createProductionBatch:', error);
      return { data: null, error: 'Failed to create production batch' };
    }
  }

  static async getProductionBatches(filters?: {
    status?: string;
    product_id?: string;
    assigned_machine?: string;
    assigned_operator?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ data: ProductionBatch[] | null; error: string | null }> {
    try {
      const params = new URLSearchParams();

      if (filters?.status) params.append('status', filters.status);
      if (filters?.product_id) params.append('product_id', filters.product_id);
      if (filters?.assigned_machine) params.append('assigned_machine', filters.assigned_machine);
      if (filters?.assigned_operator) params.append('assigned_operator', filters.assigned_operator);
      if (filters?.limit) params.append('limit', filters.limit.toString());
      if (filters?.offset) params.append('offset', filters.offset.toString());

      const response = await fetch(`${API_BASE_URL}/production/batches?${params}`, {
        headers: getHeaders()
      });
      const result = await response.json();

      if (!response.ok) {
        return { data: null, error: result.error || 'Failed to fetch production batches' };
      }

      return { data: result.data, error: null };
    } catch (error) {
      console.error('Error in getProductionBatches:', error);
      return { data: null, error: 'Failed to fetch production batches' };
    }
  }

  static async getProductionBatchById(batchId: string): Promise<{ data: ProductionBatch | null; error: string | null }> {
    try {
      const response = await fetch(`${API_BASE_URL}/production/batches/${batchId}`, {
        headers: getHeaders()
      });
      const result = await response.json();

      if (!response.ok) {
        return { data: null, error: result.error || 'Production batch not found' };
      }

      return { data: result.data, error: null };
    } catch (error) {
      console.error('Error in getProductionBatchById:', error);
      return { data: null, error: 'Failed to fetch production batch' };
    }
  }

  static async updateProductionBatch(batchId: string, updateData: Partial<ProductionBatch>): Promise<{ data: ProductionBatch | null; error: string | null }> {
    try {
      const response = await fetch(`${API_BASE_URL}/production/batches/${batchId}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(updateData),
      });

      const result = await response.json();

      if (!response.ok) {
        return { data: null, error: result.error || 'Failed to update production batch' };
      }

      return { data: result.data, error: null };
    } catch (error) {
      console.error('Error in updateProductionBatch:', error);
      return { data: null, error: 'Failed to update production batch' };
    }
  }

  // Production Machine Management
  static async createProductionMachine(machineData: Partial<ProductionMachine>): Promise<{ data: ProductionMachine | null; error: string | null }> {
    try {
      const response = await fetch(`${API_BASE_URL}/production/machines`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(machineData),
      });

      const result = await response.json();

      if (!response.ok) {
        return { data: null, error: result.error || 'Failed to create production machine' };
      }

      return { data: result.data, error: null };
    } catch (error) {
      console.error('Error in createProductionMachine:', error);
      return { data: null, error: 'Failed to create production machine' };
    }
  }

  static async getProductionMachines(filters?: {
    status?: string;
    machine_type?: string;
    location?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ data: ProductionMachine[] | null; error: string | null }> {
    try {
      const params = new URLSearchParams();

      if (filters?.status) params.append('status', filters.status);
      if (filters?.machine_type) params.append('machine_type', filters.machine_type);
      if (filters?.location) params.append('location', filters.location);
      if (filters?.limit) params.append('limit', filters.limit.toString());
      if (filters?.offset) params.append('offset', filters.offset.toString());

      const response = await fetch(`${API_BASE_URL}/production/machines?${params}`, {
        headers: getHeaders()
      });
      const result = await response.json();

      if (!response.ok) {
        return { data: null, error: result.error || 'Failed to fetch production machines' };
      }

      return { data: result.data, error: null };
    } catch (error) {
      console.error('Error in getProductionMachines:', error);
      return { data: null, error: 'Failed to fetch production machines' };
    }
  }

  static async getProductionMachineById(machineId: string): Promise<{ data: ProductionMachine | null; error: string | null }> {
    try {
      const response = await fetch(`${API_BASE_URL}/production/machines/${machineId}`, {
        headers: getHeaders()
      });
      const result = await response.json();

      if (!response.ok) {
        return { data: null, error: result.error || 'Production machine not found' };
      }

      return { data: result.data, error: null };
    } catch (error) {
      console.error('Error in getProductionMachineById:', error);
      return { data: null, error: 'Failed to fetch production machine' };
    }
  }

  static async updateProductionMachine(machineId: string, updateData: Partial<ProductionMachine>): Promise<{ data: ProductionMachine | null; error: string | null }> {
    try {
      const response = await fetch(`${API_BASE_URL}/production/machines/${machineId}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(updateData),
      });

      const result = await response.json();

      if (!response.ok) {
        return { data: null, error: result.error || 'Failed to update production machine' };
      }

      return { data: result.data, error: null };
    } catch (error) {
      console.error('Error in updateProductionMachine:', error);
      return { data: null, error: 'Failed to update production machine' };
    }
  }

  // Production Waste Management
  static async createProductionWaste(wasteData: Partial<ProductionWaste>): Promise<{ data: ProductionWaste | null; error: string | null }> {
    try {
      const response = await fetch(`${API_BASE_URL}/production/waste`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(wasteData),
      });

      const result = await response.json();

      if (!response.ok) {
        return { data: null, error: result.error || 'Failed to create production waste' };
      }

      return { data: result.data, error: null };
    } catch (error) {
      console.error('Error in createProductionWaste:', error);
      return { data: null, error: 'Failed to create production waste' };
    }
  }

  static async getProductionWaste(filters?: {
    production_id?: string;
    batch_id?: string;
    waste_type?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ data: ProductionWaste[] | null; error: string | null }> {
    try {
      const params = new URLSearchParams();

      if (filters?.production_id) params.append('production_id', filters.production_id);
      if (filters?.batch_id) params.append('batch_id', filters.batch_id);
      if (filters?.waste_type) params.append('waste_type', filters.waste_type);
      if (filters?.status) params.append('status', filters.status);
      if (filters?.limit) params.append('limit', filters.limit.toString());
      if (filters?.offset) params.append('offset', filters.offset.toString());

      const response = await fetch(`${API_BASE_URL}/production/waste?${params}`, {
        headers: getHeaders()
      });
      const result = await response.json();

      if (!response.ok) {
        return { data: null, error: result.error || 'Failed to fetch production waste' };
      }

      return { data: result.data, error: null };
    } catch (error) {
      console.error('Error in getProductionWaste:', error);
      return { data: null, error: 'Failed to fetch production waste' };
    }
  }

  static async getProductionWasteById(wasteId: string): Promise<{ data: ProductionWaste | null; error: string | null }> {
    try {
      const response = await fetch(`${API_BASE_URL}/production/waste/${wasteId}`, {
        headers: getHeaders()
      });
      const result = await response.json();

      if (!response.ok) {
        return { data: null, error: result.error || 'Production waste not found' };
      }

      return { data: result.data, error: null };
    } catch (error) {
      console.error('Error in getProductionWasteById:', error);
      return { data: null, error: 'Failed to fetch production waste' };
    }
  }

  static async updateProductionWaste(wasteId: string, updateData: Partial<ProductionWaste>): Promise<{ data: ProductionWaste | null; error: string | null }> {
    try {
      const response = await fetch(`${API_BASE_URL}/production/waste/${wasteId}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(updateData),
      });

      const result = await response.json();

      if (!response.ok) {
        return { data: null, error: result.error || 'Failed to update production waste' };
      }

      return { data: result.data, error: null };
    } catch (error) {
      console.error('Error in updateProductionWaste:', error);
      return { data: null, error: 'Failed to update production waste' };
    }
  }

  // Production Flow Management
  static async createProductionFlow(flowData: {
    id?: string;
    production_product_id: string;
    flow_name: string;
    status?: 'active' | 'completed' | 'cancelled';
    current_step?: number;
  }): Promise<{ data: any | null; error: string | null }> {
    try {
      const response = await fetch(`${API_BASE_URL}/production/flows`, {
        method: 'POST',
        headers: getHeaders(),
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

  static async getProductionFlowById(flowId: string): Promise<{ data: any | null; error: string | null }> {
    try {
      const response = await fetch(`${API_BASE_URL}/production/flows/${flowId}`, {
        headers: getHeaders()
      });
      const result = await response.json();

      if (!response.ok) {
        return { data: null, error: result.error || 'Production flow not found' };
      }

      return { data: result.data, error: null };
    } catch (error) {
      console.error('Error in getProductionFlowById:', error);
      return { data: null, error: 'Failed to fetch production flow' };
    }
  }

  static async getProductionFlowByBatchId(batchId: string): Promise<{ data: any | null; error: string | null }> {
    try {
      const response = await fetch(`${API_BASE_URL}/production/flows/batch/${batchId}`, {
        headers: getHeaders()
      });
      const result = await response.json();

      if (!response.ok) {
        // 404/406 are expected if no flow exists or not acceptable; don't treat as an error
        if (response.status === 404 || response.status === 406) {
          return { data: null, error: null };
        }
        return { data: null, error: result.error || 'Production flow not found' };
      }

      return { data: result.data, error: null };
    } catch (error) {
      console.error('Error in getProductionFlowByBatchId:', error);
      return { data: null, error: 'Failed to fetch production flow' };
    }
  }

  static async createProductionFlowStep(stepData: {
    id?: string;
    flow_id: string;
    step_name: string;
    step_type?: string;
    status?: 'pending' | 'in_progress' | 'completed' | 'skipped';
    order_index?: number;
    machine_id?: string;
    inspector_name?: string;
    notes?: string;
  }): Promise<{ data: any | null; error: string | null }> {
    try {
      const response = await fetch(`${API_BASE_URL}/production/flow-steps`, {
        method: 'POST',
        headers: getHeaders(),
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

  static async getProductionFlowSteps(flowId: string): Promise<{ data: any[] | null; error: string | null }> {
    try {
      const response = await fetch(`${API_BASE_URL}/production/flow-steps?flow_id=${flowId}`, {
        headers: getHeaders()
      });
      const result = await response.json();

      if (!response.ok) {
        return { data: null, error: result.error || 'Failed to fetch production flow steps' };
      }

      return { data: result.data, error: null };
    } catch (error) {
      console.error('Error in getProductionFlowSteps:', error);
      return { data: null, error: 'Failed to fetch production flow steps' };
    }
  }

  static async updateProductionFlowStep(stepId: string, update: Partial<{
    status: 'pending' | 'in_progress' | 'completed' | 'skipped';
    start_time: string;
    end_time: string;
    notes: string;
  }>): Promise<{ data: any | null; error: string | null }> {
    try {
      const response = await fetch(`${API_BASE_URL}/production/flow-steps/${stepId}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(update),
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

  // Production Statistics
  static async getProductionStats(): Promise<{ data: any | null; error: string | null }> {
    try {
      const response = await fetch(`${API_BASE_URL}/production/stats`, {
        headers: getHeaders()
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
}

export default ProductionService;
