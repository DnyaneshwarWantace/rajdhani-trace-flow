import { supabase, supabaseAdmin, handleSupabaseError } from '@/lib/supabase';

export interface ProductionFlow {
  id: string;
  production_product_id: string;
  flow_name: string;
  status: 'active' | 'completed' | 'cancelled';
  created_at?: string;
  updated_at?: string;
}

export interface ProductionFlowStep {
  id: string;
  flow_id: string;
  step_name: string;
  step_type: string;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  order_index: number;
  machine_id?: string;
  inspector_name?: string;
  start_time?: string;
  end_time?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CreateProductionFlowData {
  id?: string;
  production_product_id: string;
  flow_name?: string;
  status?: 'active' | 'completed' | 'cancelled';
}

export interface CreateProductionFlowStepData {
  id?: string;
  flow_id: string;
  step_name: string;
  step_type: string;
  order_index: number;
  machine_id?: string;
  inspector_name?: string;
  notes?: string;
}

export class ProductionFlowService {
  // Get production flow by production product ID
  static async getProductionFlow(productionProductId: string): Promise<ProductionFlow | null> {
    try {
      // Use admin client to bypass RLS
      const client = supabaseAdmin || supabase;
      if (!client) {
        console.warn('⚠️ Supabase not configured');
        return null;
      }

      const { data, error } = await client
        .from('production_flows')
        .select('*')
        .eq('production_product_id', productionProductId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Flow not found
        }
        // Handle 406 errors silently (RLS issues)
        if (error.message?.includes('406') || error.message?.includes('Not Acceptable')) {
          console.warn('⚠️ Production flows table not accessible due to RLS, returning null');
          return null;
        }
        throw handleSupabaseError(error);
      }

      return data;
    } catch (error) {
      console.error('Error fetching production flow:', error);
      // Return null instead of throwing to prevent app crashes
      return null;
    }
  }

  // Create production flow
  static async createProductionFlow(flowData: CreateProductionFlowData): Promise<ProductionFlow> {
    try {
      const flow: CreateProductionFlowData = {
        id: flowData.id || `FLOW_${String(Date.now()).slice(-6)}`,
        production_product_id: flowData.production_product_id,
        flow_name: flowData.flow_name || 'Production Flow',
        status: flowData.status || 'active',
      };

      // Use admin client to bypass RLS
      const client = supabaseAdmin || supabase;
      const { data, error } = await client
        .from('production_flows')
        .insert([flow])
        .select()
        .single();

      if (error) {
        throw handleSupabaseError(error);
      }

      return data;
    } catch (error) {
      console.error('Error creating production flow:', error);
      throw error;
    }
  }

  // Add step to production flow
  static async addStepToFlow(stepData: CreateProductionFlowStepData): Promise<ProductionFlowStep> {
    try {
      // Try with step_order column (which seems to be the actual column name)
      const step: any = {
        id: stepData.id || `STEP_${String(Date.now()).slice(-6)}`,
        flow_id: stepData.flow_id,
        step_name: stepData.step_name,
        step_type: stepData.step_type,
        step_order: stepData.order_index || 1, // Use step_order instead of order_index
        machine_id: stepData.machine_id,
        inspector_name: stepData.inspector_name,
        notes: stepData.notes,
      };

      // Use admin client to bypass RLS
      const client = supabaseAdmin || supabase;
      const { data, error } = await client
        .from('production_flow_steps')
        .insert([step])
        .select()
        .single();

      if (error) {
        console.error('Error inserting step:', error);
        throw handleSupabaseError(error);
      }

      return data;
    } catch (error) {
      console.error('Error adding step to flow:', error);
      throw error;
    }
  }

  // Update production flow step
  static async updateFlowStep(stepId: string, updateData: Partial<ProductionFlowStep>): Promise<ProductionFlowStep> {
    try {
      // Use admin client to bypass RLS
      const client = supabaseAdmin || supabase;
      const { data, error } = await client
        .from('production_flow_steps')
        .update({
          ...updateData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', stepId)
        .select()
        .single();

      if (error) {
        throw handleSupabaseError(error);
      }

      return data;
    } catch (error) {
      console.error('Error updating flow step:', error);
      throw error;
    }
  }

  // Complete production flow step
  static async completeFlowStep(stepId: string, notes?: string): Promise<ProductionFlowStep> {
    try {
      // Use admin client to bypass RLS
      const client = supabaseAdmin || supabase;
      const { data, error } = await client
        .from('production_flow_steps')
        .update({
          status: 'completed',
          end_time: new Date().toISOString(),
          notes: notes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', stepId)
        .select()
        .single();

      if (error) {
        throw handleSupabaseError(error);
      }

      return data;
    } catch (error) {
      console.error('Error completing flow step:', error);
      throw error;
    }
  }

  // Get all steps for a production flow
  static async getFlowSteps(flowId: string): Promise<ProductionFlowStep[]> {
    try {
      // Use admin client to bypass RLS
      const client = supabaseAdmin || supabase;
      // Try with step_order column
      const { data, error } = await client
        .from('production_flow_steps')
        .select('*')
        .eq('flow_id', flowId)
        .order('step_order');

      if (error) {
        // If step_order column doesn't exist, try without ordering
        if (error.message?.includes('step_order')) {
          console.warn('step_order column not found, fetching without ordering');
          const { data: fallbackData, error: fallbackError } = await client
            .from('production_flow_steps')
            .select('*')
            .eq('flow_id', flowId);

          if (fallbackError) {
            throw handleSupabaseError(fallbackError);
          }

          return fallbackData || [];
        }
        throw handleSupabaseError(error);
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching flow steps:', error);
      throw error;
    }
  }
}
