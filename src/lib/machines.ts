import { generateUniqueId } from './storageUtils';
import { supabase } from './supabase';

export interface Machine {
  id: string;
  name: string;
  type: 'cutting' | 'needle-punching' | 'testing' | 'other';
  status: 'available' | 'busy' | 'maintenance';
  capacity: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProductionStep {
  id: string;
  stepNumber: number;
  name: string;
  description: string;
  machineId: string | null;
  machineName: string;
  status: 'pending' | 'in_progress' | 'completed' | 'quality_check';
  startTime?: string;
  endTime?: string;
  inspectorId?: string;
  inspectorName?: string;
  qualityNotes?: string;
  isQualityStep?: boolean;
  isFixedStep?: boolean;
  stepType?: 'material_selection' | 'machine_operation' | 'wastage_tracking' | 'testing_individual';
  createdAt: string;
}

export interface ProductionFlow {
  id: string;
  productionProductId: string;
  steps: ProductionStep[];
  currentStepIndex: number;
  status: 'not_started' | 'in_progress' | 'completed';
  createdAt: string;
  updatedAt: string;
}

// Default machines
const defaultMachines: Machine[] = [
  {
    id: 'machine-1',
    name: 'BR3C-Cutter',
    type: 'cutting',
    status: 'available',
    capacity: 'Cutting 3.5 mm sheets',
    description: 'High precision cutting machine for carpet manufacturing',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'machine-2',
    name: 'CUTTING MACHINE',
    type: 'cutting',
    status: 'available',
    capacity: 'General cutting operations',
    description: 'Multi-purpose cutting machine',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'machine-3',
    name: 'NEEDLE PUNCHING',
    type: 'needle-punching',
    status: 'available',
    capacity: 'Needle punching operations',
    description: 'Specialized needle punching machine for carpet fiber processing',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'machine-4',
    name: 'Testing Station',
    type: 'testing',
    status: 'available',
    capacity: 'Quality testing and inspection',
    description: 'Final quality testing and product inspection station',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
];

// Machine management functions
export const getMachines = async (): Promise<Machine[]> => {
  try {
    const { data, error } = await supabase
      .from('machines')
      .select('*')
      .order('createdAt', { ascending: true });

    if (error) throw error;

    // If no machines exist, initialize with defaults
    if (!data || data.length === 0) {
      const { data: insertedData, error: insertError } = await supabase
        .from('machines')
        .insert(defaultMachines)
        .select();

      if (insertError) throw insertError;
      return insertedData || defaultMachines;
    }

    return data;
  } catch (error) {
    console.error('Error getting machines:', error);
    return defaultMachines;
  }
};

export const saveMachine = async (machine: Omit<Machine, 'id' | 'createdAt' | 'updatedAt'>): Promise<Machine> => {
  const newMachine: Machine = {
    ...machine,
    id: generateUniqueId('MACH'),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  try {
    const { data, error } = await supabase
      .from('machines')
      .insert(newMachine)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error saving machine:', error);
    throw error;
  }
};

export const updateMachine = async (id: string, updates: Partial<Machine>): Promise<Machine | null> => {
  try {
    const { data, error } = await supabase
      .from('machines')
      .update({
        ...updates,
        updatedAt: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating machine:', error);
    return null;
  }
};

export const deleteMachine = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('machines')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting machine:', error);
    return false;
  }
};

export const getAvailableMachines = async (): Promise<Machine[]> => {
  try {
    const { data, error } = await supabase
      .from('machines')
      .select('*')
      .eq('status', 'available')
      .order('name');

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting available machines:', error);
    return [];
  }
};

export const getMachinesByType = async (type: Machine['type']): Promise<Machine[]> => {
  try {
    const { data, error } = await supabase
      .from('machines')
      .select('*')
      .eq('type', type)
      .order('name');

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting machines by type:', error);
    return [];
  }
};

// Production Flow management functions
export const getProductionFlows = async (): Promise<ProductionFlow[]> => {
  try {
    const { data, error } = await supabase
      .from('production_flows')
      .select('*')
      .order('createdAt', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting production flows:', error);
    return [];
  }
};

export const saveProductionFlow = async (flow: ProductionFlow): Promise<void> => {
  try {
    const { error } = await supabase
      .from('production_flows')
      .upsert({
        ...flow,
        updatedAt: new Date().toISOString()
      }, { onConflict: 'id' });

    if (error) throw error;
  } catch (error) {
    console.error('Error saving production flow:', error);
    throw error;
  }
};

export const getProductionFlow = async (productionProductId: string): Promise<ProductionFlow | null> => {
  try {
    const { data, error } = await supabase
      .from('production_flows')
      .select('*')
      .eq('productionProductId', productionProductId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return data || null;
  } catch (error) {
    console.error('Error getting production flow:', error);
    return null;
  }
};

export const createDefaultProductionFlow = async (productionProductId: string): Promise<ProductionFlow> => {
  const machines = await getMachines();
  const testingMachine = machines.find(m => m.type === 'testing');

  const defaultSteps: ProductionStep[] = [
    {
      id: generateUniqueId('STEP'),
      stepNumber: 1,
      name: 'Raw Material Selection',
      description: 'Select and prepare raw materials for production',
      machineId: null,
      machineName: 'Manual Process',
      status: 'pending',
      isQualityStep: false,
      isFixedStep: true,
      stepType: 'material_selection',
      createdAt: new Date().toISOString(),
    },
    {
      id: generateUniqueId('STEP'),
      stepNumber: 2,
      name: 'Initial Processing',
      description: 'First stage of carpet processing - select machine',
      machineId: null,
      machineName: 'Select Machine',
      status: 'pending',
      isQualityStep: false,
      isFixedStep: false,
      stepType: 'machine_operation',
      createdAt: new Date().toISOString(),
    },
    {
      id: generateUniqueId('STEP'),
      stepNumber: 3,
      name: 'Raw Material Wastage',
      description: 'Track and record raw material wastage during production',
      machineId: null,
      machineName: 'Manual Process',
      status: 'pending',
      isQualityStep: false,
      isFixedStep: true,
      stepType: 'wastage_tracking',
      createdAt: new Date().toISOString(),
    },
    {
      id: generateUniqueId('STEP'),
      stepNumber: 4,
      name: 'Testing & Individual Product Details',
      description: 'Final quality testing and individual product details entry',
      machineId: testingMachine?.id || null,
      machineName: testingMachine?.name || 'Testing Station',
      status: 'pending',
      isQualityStep: true,
      isFixedStep: true,
      stepType: 'testing_individual',
      createdAt: new Date().toISOString(),
    },
  ];

  const flow: ProductionFlow = {
    id: generateUniqueId('FLOW'),
    productionProductId,
    steps: defaultSteps,
    currentStepIndex: 0,
    status: 'not_started',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return flow;
};

export const updateProductionStep = async (
  flowId: string,
  stepId: string,
  updates: Partial<ProductionStep>
): Promise<ProductionFlow | null> => {
  try {
    // Map interface fields to database column names
    const dbUpdates: any = {
      updated_at: new Date().toISOString()
    };
    
    // Map interface fields to database columns
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.startTime !== undefined) dbUpdates.start_time = updates.startTime;
    if (updates.endTime !== undefined) dbUpdates.end_time = updates.endTime;
    if (updates.inspectorName !== undefined) dbUpdates.inspector_name = updates.inspectorName;
    if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
    // Only include quality_notes if the column exists (will be added via SQL script)
    if (updates.qualityNotes !== undefined) {
      dbUpdates.quality_notes = updates.qualityNotes;
    }

    // Update the step directly in the production_flow_steps table
    const { data: updatedStep, error: updateError } = await supabase
      .from('production_flow_steps')
      .update(dbUpdates)
      .eq('id', stepId)
      .eq('flow_id', flowId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating production step:', updateError);
      return null;
    }

    // Fetch the updated flow with steps
    const { data: flow, error: fetchError } = await supabase
      .from('production_flows')
      .select(`
        *,
        production_flow_steps (*)
      `)
      .eq('id', flowId)
      .single();

    if (fetchError) {
      console.error('Error fetching updated flow:', fetchError);
      return null;
    }

    return flow;
  } catch (error) {
    console.error('Error updating production step:', error);
    return null;
  }
};

export const addProductionStep = async (
  flowId: string,
  stepData: Omit<ProductionStep, 'id' | 'stepNumber' | 'createdAt'>
): Promise<ProductionFlow | null> => {
  try {
    const { data: flow, error: fetchError } = await supabase
      .from('production_flows')
      .select('*')
      .eq('id', flowId)
      .single();

    if (fetchError) throw fetchError;
    if (!flow) return null;

    const newStep: ProductionStep = {
      ...stepData,
      id: generateUniqueId('STEP'),
      stepNumber: flow.steps.length,
      createdAt: new Date().toISOString(),
      isFixedStep: false,
      stepType: 'machine_operation',
    };

    // Find the position to insert - after machine operations but before wastage step
    const steps = flow.steps;
    let insertIndex = steps.length;

    // Find the wastage step (second last fixed step)
    const wastageStepIndex = steps.findIndex((s: ProductionStep) => s.stepType === 'wastage_tracking');
    if (wastageStepIndex !== -1) {
      insertIndex = wastageStepIndex;
    }

    // Insert the new step
    steps.splice(insertIndex, 0, newStep);

    // Renumber all steps
    steps.forEach((step: ProductionStep, index: number) => {
      step.stepNumber = index + 1;
    });

    const { data: updatedFlow, error: updateError } = await supabase
      .from('production_flows')
      .update({
        steps: steps,
        updatedAt: new Date().toISOString()
      })
      .eq('id', flowId)
      .select()
      .single();

    if (updateError) throw updateError;
    return updatedFlow;
  } catch (error) {
    console.error('Error adding production step:', error);
    return null;
  }
};

export const moveToNextStep = async (flowId: string): Promise<ProductionFlow | null> => {
  try {
    const { data: flow, error: fetchError } = await supabase
      .from('production_flows')
      .select('*')
      .eq('id', flowId)
      .single();

    if (fetchError) throw fetchError;
    if (!flow) return null;

    if (flow.currentStepIndex < flow.steps.length - 1) {
      flow.currentStepIndex++;
      flow.steps[flow.currentStepIndex].status = 'in_progress';
      flow.steps[flow.currentStepIndex].startTime = new Date().toISOString();
    }

    if (flow.currentStepIndex === flow.steps.length - 1) {
      flow.status = 'completed';
    } else {
      flow.status = 'in_progress';
    }

    const { data: updatedFlow, error: updateError } = await supabase
      .from('production_flows')
      .update({
        currentStepIndex: flow.currentStepIndex,
        steps: flow.steps,
        status: flow.status,
        updatedAt: new Date().toISOString()
      })
      .eq('id', flowId)
      .select()
      .single();

    if (updateError) throw updateError;
    return updatedFlow;
  } catch (error) {
    console.error('Error moving to next step:', error);
    return null;
  }
};

export const getProgressPercentage = (flow: ProductionFlow): number => {
  if (!flow.steps.length) return 0;
  const completedSteps = flow.steps.filter(s => s.status === 'completed').length;
  return Math.round((completedSteps / flow.steps.length) * 100);
};