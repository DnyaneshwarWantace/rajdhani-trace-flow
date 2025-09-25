import { supabase, supabaseAdmin, handleSupabaseError } from '@/lib/supabase';

export interface Machine {
  id: string;
  name: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CreateMachineData {
  id?: string;
  name: string;
  description?: string;
}

export interface UpdateMachineData extends Partial<CreateMachineData> {
}

export interface MachineOperation {
  id: string;
  machine_id: string;
  production_product_id: string;
  inspector_name: string;
  operation_type: string;
  start_time: string;
  end_time?: string;
  status: 'active' | 'completed' | 'cancelled';
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CreateMachineOperationData {
  id?: string;
  machine_id: string;
  production_product_id: string;
  inspector_name: string;
  operation_type?: string;
  notes?: string;
}

export class MachineService {
  // Get all machines
  static async getMachines(): Promise<Machine[]> {
    try {
      console.log('🔍 Fetching machines from Supabase...');
      // Use admin client to bypass RLS
      const client = supabaseAdmin || supabase;
      const { data, error } = await client
        .from('machines')
        .select('*')
        .order('name');

      console.log('📊 Supabase response:', { data, error });

      if (error) {
        console.error('❌ Supabase error:', error);
        throw handleSupabaseError(error);
      }

      console.log('✅ Raw data from Supabase:', data);
      return data || [];
    } catch (error) {
      console.error('❌ Error fetching machines:', error);
      throw error;
    }
  }

  // Get machine by ID
  static async getMachineById(id: string): Promise<Machine | null> {
    try {
      const { data, error } = await supabase
        .from('machines')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Machine not found
        }
        throw handleSupabaseError(error);
      }

      return data;
    } catch (error) {
      console.error('Error fetching machine:', error);
      throw error;
    }
  }

  // Create new machine
  static async createMachine(machineData: CreateMachineData): Promise<Machine> {
    try {
      const machine: CreateMachineData = {
        id: machineData.id || `MACHINE_${String(Date.now()).slice(-6)}`,
        name: machineData.name,
        description: machineData.description || '',
      };

      const { data, error } = await supabase
        .from('machines')
        .insert([machine])
        .select()
        .single();

      if (error) {
        throw handleSupabaseError(error);
      }

      return data;
    } catch (error) {
      console.error('Error creating machine:', error);
      throw error;
    }
  }

  // Update machine
  static async updateMachine(id: string, updateData: UpdateMachineData): Promise<Machine> {
    try {
      const { data, error } = await supabase
        .from('machines')
        .update({
          ...updateData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw handleSupabaseError(error);
      }

      return data;
    } catch (error) {
      console.error('Error updating machine:', error);
      throw error;
    }
  }

  // Delete machine
  static async deleteMachine(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('machines')
        .delete()
        .eq('id', id);

      if (error) {
        throw handleSupabaseError(error);
      }
    } catch (error) {
      console.error('Error deleting machine:', error);
      throw error;
    }
  }


  // Create machine operation
  static async createMachineOperation(operationData: CreateMachineOperationData): Promise<MachineOperation> {
    try {
      const operation: CreateMachineOperationData = {
        id: operationData.id || `MACH_OP_${String(Date.now()).slice(-6)}`,
        machine_id: operationData.machine_id,
        production_product_id: operationData.production_product_id,
        inspector_name: operationData.inspector_name,
        operation_type: operationData.operation_type || 'processing',
        notes: operationData.notes,
      };

      const { data, error } = await supabase
        .from('machine_operations')
        .insert([operation])
        .select()
        .single();

      if (error) {
        throw handleSupabaseError(error);
      }

      return data;
    } catch (error) {
      console.error('Error creating machine operation:', error);
      throw error;
    }
  }

  // Get machine operations for a production product
  static async getMachineOperationsByProductionProduct(productionProductId: string): Promise<MachineOperation[]> {
    try {
      const { data, error } = await supabase
        .from('machine_operations')
        .select(`
          *,
          machines (
            id,
            name,
            type,
            location
          )
        `)
        .eq('production_product_id', productionProductId)
        .order('start_time', { ascending: false });

      if (error) {
        throw handleSupabaseError(error);
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching machine operations:', error);
      throw error;
    }
  }

  // Update machine operation
  static async updateMachineOperation(id: string, updateData: Partial<MachineOperation>): Promise<MachineOperation> {
    try {
      const { data, error } = await supabase
        .from('machine_operations')
        .update({
          ...updateData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw handleSupabaseError(error);
      }

      return data;
    } catch (error) {
      console.error('Error updating machine operation:', error);
      throw error;
    }
  }

  // Complete machine operation
  static async completeMachineOperation(id: string, notes?: string): Promise<MachineOperation> {
    try {
      const { data, error } = await supabase
        .from('machine_operations')
        .update({
          status: 'completed',
          end_time: new Date().toISOString(),
          notes: notes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw handleSupabaseError(error);
      }

      return data;
    } catch (error) {
      console.error('Error completing machine operation:', error);
      throw error;
    }
  }
}
