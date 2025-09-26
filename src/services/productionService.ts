import { supabase, supabaseAdmin, handleSupabaseError, ProductionBatch, ProductionStep } from '@/lib/supabase';
import { generateUniqueId } from '@/lib/idGenerator';
import { logAudit } from './auditService';
import { NotificationService } from './notificationService';
import { ProductService } from './ProductService';
import { RawMaterialService } from './rawMaterialService';

export interface CreateProductionBatchData {
  product_id?: string;
  order_id?: string;
  planned_quantity: number;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  operator?: string;
  supervisor?: string;
  notes?: string;
  production_steps?: CreateProductionStepData[];
}

export interface CreateProductionStepData {
  step_number: number;
  step_name: string;
  description?: string;
  estimated_duration?: number; // in minutes
  operator?: string;
}

export interface UpdateProductionBatchData extends Partial<CreateProductionBatchData> {
  actual_quantity?: number;
  status?: 'planned' | 'in_progress' | 'completed' | 'paused' | 'cancelled';
  completion_date?: string;
}

export interface UpdateProductionStepData {
  status?: 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped';
  operator?: string;
  start_time?: string;
  end_time?: string;
  actual_duration?: number;
  quality_check_result?: string;
  notes?: string;
}

export class ProductionService {
  // Generate unique batch number
  private static generateBatchNumber(): string {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 999).toString().padStart(3, '0');
    return `BATCH${year}${month}${day}${random}`;
  }

  // Create a new production batch
  static async createProductionBatch(batchData: CreateProductionBatchData): Promise<{ data: ProductionBatch | null; error: string | null }> {
    try {
      // Validate required fields
      if (batchData.planned_quantity <= 0) {
        return { data: null, error: 'Planned quantity must be greater than 0' };
      }

      // Verify product exists if product_id is provided
      if (batchData.product_id) {
        const { data: product } = await supabase
          .from('products')
          .select('id, name')
          .eq('id', batchData.product_id)
          .single();

        if (!product) {
          return { data: null, error: 'Product not found' };
        }
      }

      // Verify order exists if order_id is provided
      if (batchData.order_id) {
        const { data: order } = await supabase
          .from('orders')
          .select('id, order_number')
          .eq('id', batchData.order_id)
          .single();

        if (!order) {
          return { data: null, error: 'Order not found' };
        }
      }

      // Generate globally unique batch ID
      const batchId = await IDGenerator.generateUniqueProductionBatchId();
      
      // Generate batch number (for display purposes)
      const batchNumber = this.generateBatchNumber();

      // Prepare batch data
      const newBatch = {
        batch_number: batchNumber,
        product_id: batchData.product_id || null,
        order_id: batchData.order_id || null,
        planned_quantity: batchData.planned_quantity,
        actual_quantity: 0,
        start_date: new Date().toISOString(),
        completion_date: null,
        status: 'planned' as const,
        priority: batchData.priority || 'medium',
        operator: batchData.operator?.trim() || null,
        supervisor: batchData.supervisor?.trim() || null,
        notes: batchData.notes?.trim() || null
      };

      const { data: batch, error: batchError } = await supabase
        .from('production_batches')
        .insert(newBatch)
        .select()
        .single();

      if (batchError) {
        console.error('Error creating production batch:', batchError);
        return { data: null, error: handleSupabaseError(batchError) };
      }

      // Create production steps if provided
      if (batchData.production_steps && batchData.production_steps.length > 0) {
        const steps = batchData.production_steps.map(step => ({
          production_batch_id: batch.id,
          step_number: step.step_number,
          step_name: step.step_name.trim(),
          description: step.description?.trim() || null,
          estimated_duration: step.estimated_duration || null,
          status: 'pending' as const,
          operator: step.operator?.trim() || null
        }));

        const { error: stepsError } = await supabase
          .from('production_steps')
          .insert(steps);

        if (stepsError) {
          console.error('Error creating production steps:', stepsError);
          // Cleanup: delete the batch if steps creation failed
          const client = supabaseAdmin || supabase;
          await client.from('production_batches').delete().eq('id', batch.id);
          return { data: null, error: handleSupabaseError(stepsError) };
        }
      }

      // Create notification for new batch
      await NotificationService.createNotification({
        type: 'info',
        title: 'New Production Batch Created',
        message: `Production batch ${batchNumber} has been created with ${batchData.planned_quantity} units planned`,
        priority: 'medium',
        status: 'unread',
        module: 'production',
        related_id: batch.id,
        related_data: {
          batch_number: batchNumber,
          planned_quantity: batchData.planned_quantity,
          priority: batch.priority
        },
        created_by: 'system'
      });

      // Log audit
      await logAudit('production_batch_created', 'production', batch.id, batchNumber, {
        batch_data: batch,
        steps_count: batchData.production_steps?.length || 0
      });

      console.log('✅ Production batch created successfully:', batchNumber);
      return { data: batch, error: null };

    } catch (error) {
      console.error('Error in createProductionBatch:', error);
      return { data: null, error: 'Failed to create production batch' };
    }
  }

  // Get all production batches with optional filtering
  static async getProductionBatches(filters?: {
    status?: string;
    product_id?: string;
    order_id?: string;
    priority?: string;
    date_from?: string;
    date_to?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ data: any[] | null; error: string | null; count?: number }> {
    try {
      let query = supabase
        .from('production_batches')
        .select(`
          *,
          products (name, category),
          orders (order_number, customer_name),
          production_steps (
            id,
            step_number,
            step_name,
            status,
            start_time,
            end_time
          )
        `, { count: 'exact' })
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }

      if (filters?.product_id) {
        query = query.eq('product_id', filters.product_id);
      }

      if (filters?.order_id) {
        query = query.eq('order_id', filters.order_id);
      }

      if (filters?.priority && filters.priority !== 'all') {
        query = query.eq('priority', filters.priority);
      }

      if (filters?.date_from) {
        query = query.gte('start_date', filters.date_from);
      }

      if (filters?.date_to) {
        query = query.lte('start_date', filters.date_to);
      }

      // Apply pagination
      if (filters?.limit) {
        query = query.limit(filters.limit);
      }
      if (filters?.offset) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1);
      }

      const { data, error, count } = await query;

      if (error) {
        console.error('Error fetching production batches:', error);
        return { data: null, error: handleSupabaseError(error) };
      }

      return { data: data || [], error: null, count: count || 0 };

    } catch (error) {
      console.error('Error in getProductionBatches:', error);
      return { data: null, error: 'Failed to fetch production batches' };
    }
  }

  // Get production batch by ID with full details
  static async getProductionBatchById(batchId: string): Promise<{ data: any | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('production_batches')
        .select(`
          *,
          products (*),
          orders (
            order_number,
            customer_name,
            expected_delivery
          ),
          production_steps (*),
          material_consumption (
            *,
            raw_materials (name, unit),
            individual_products (qr_code)
          )
        `)
        .eq('id', batchId)
        .single();

      if (error) {
        console.error('Error fetching production batch:', error);
        return { data: null, error: handleSupabaseError(error) };
      }

      return { data, error: null };

    } catch (error) {
      console.error('Error in getProductionBatchById:', error);
      return { data: null, error: 'Failed to fetch production batch' };
    }
  }

  // Update a production batch
  static async updateProductionBatch(batchId: string, updateData: UpdateProductionBatchData): Promise<{ data: ProductionBatch | null; error: string | null }> {
    try {
      // Get current batch data for audit
      const { data: currentBatch } = await this.getProductionBatchById(batchId);
      if (!currentBatch) {
        return { data: null, error: 'Production batch not found' };
      }

      // Prepare update data
      const cleanUpdateData = {
        ...(updateData.product_id !== undefined && { product_id: updateData.product_id }),
        ...(updateData.order_id !== undefined && { order_id: updateData.order_id }),
        ...(updateData.planned_quantity !== undefined && { planned_quantity: updateData.planned_quantity }),
        ...(updateData.actual_quantity !== undefined && { actual_quantity: updateData.actual_quantity }),
        ...(updateData.status && { status: updateData.status }),
        ...(updateData.priority && { priority: updateData.priority }),
        ...(updateData.operator !== undefined && { operator: updateData.operator?.trim() || null }),
        ...(updateData.supervisor !== undefined && { supervisor: updateData.supervisor?.trim() || null }),
        ...(updateData.notes !== undefined && { notes: updateData.notes?.trim() || null }),
        ...(updateData.completion_date !== undefined && { completion_date: updateData.completion_date })
      };

      // Set completion date if status is being changed to completed
      if (updateData.status === 'completed' && !currentBatch.completion_date) {
        cleanUpdateData.completion_date = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('production_batches')
        .update(cleanUpdateData)
        .eq('id', batchId)
        .select()
        .single();

      if (error) {
        console.error('Error updating production batch:', error);
        return { data: null, error: handleSupabaseError(error) };
      }

      // Create notifications for status changes
      if (updateData.status && updateData.status !== currentBatch.status) {
        let notificationMessage = `Production batch ${currentBatch.batch_number} status changed to ${updateData.status}`;
        let priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium';

        if (updateData.status === 'completed') {
          notificationMessage = `Production batch ${currentBatch.batch_number} has been completed successfully`;
          priority = 'high';
        } else if (updateData.status === 'paused' || updateData.status === 'cancelled') {
          priority = 'high';
        }

        await NotificationService.createNotification({
          type: 'info',
          title: 'Production Status Update',
          message: notificationMessage,
          priority,
          status: 'unread',
          module: 'production',
          related_id: batchId,
          related_data: {
            batch_number: currentBatch.batch_number,
            old_status: currentBatch.status,
            new_status: updateData.status,
            actual_quantity: data.actual_quantity
          },
          created_by: 'system'
        });
      }

      // Log audit
      await logAudit('production_batch_updated', 'production', data.id, data.batch_number, {
        updated_fields: Object.keys(cleanUpdateData),
        previous_state: currentBatch,
        new_state: data
      });

      console.log('✅ Production batch updated successfully:', data.batch_number);
      return { data, error: null };

    } catch (error) {
      console.error('Error in updateProductionBatch:', error);
      return { data: null, error: 'Failed to update production batch' };
    }
  }

  // Start production batch
  static async startProductionBatch(batchId: string, operator?: string): Promise<{ success: boolean; error: string | null }> {
    try {
      const { data: batch } = await this.getProductionBatchById(batchId);
      if (!batch) {
        return { success: false, error: 'Production batch not found' };
      }

      if (batch.status !== 'planned') {
        return { success: false, error: 'Only planned batches can be started' };
      }

      // Update batch status to in_progress
      const { error } = await supabase
        .from('production_batches')
        .update({
          status: 'in_progress',
          start_date: new Date().toISOString(),
          operator: operator || batch.operator
        })
        .eq('id', batchId);

      if (error) {
        console.error('Error starting production batch:', error);
        return { success: false, error: handleSupabaseError(error) };
      }

      // Start first production step if available
      const firstStep = batch.production_steps?.[0];
      if (firstStep && firstStep.status === 'pending') {
        await this.startProductionStep(firstStep.id, operator);
      }

      // Create notification
      await NotificationService.createNotification({
        type: 'info',
        title: 'Production Started',
        message: `Production batch ${batch.batch_number} has been started`,
        priority: 'medium',
        status: 'unread',
        module: 'production',
        related_id: batchId,
        related_data: {
          batch_number: batch.batch_number,
          operator: operator || batch.operator
        },
        created_by: 'system'
      });

      // Log audit
      await logAudit('production_batch_started', 'production', batchId, batch.batch_number, {
        operator: operator || batch.operator,
        start_time: new Date().toISOString()
      });

      console.log('✅ Production batch started successfully:', batch.batch_number);
      return { success: true, error: null };

    } catch (error) {
      console.error('Error in startProductionBatch:', error);
      return { success: false, error: 'Failed to start production batch' };
    }
  }

  // Complete production batch and create individual products
  static async completeProductionBatch(
    batchId: string,
    actualQuantity: number,
    individualProductsData: Array<{
      final_weight?: string;
      final_thickness?: string;
      quality_grade?: 'A+' | 'A' | 'B' | 'C';
      inspector?: string;
      production_notes?: string;
    }>
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      const { data: batch } = await this.getProductionBatchById(batchId);
      if (!batch) {
        return { success: false, error: 'Production batch not found' };
      }

      if (batch.status === 'completed') {
        return { success: false, error: 'Batch is already completed' };
      }

      if (!batch.product_id) {
        return { success: false, error: 'Cannot complete batch without associated product' };
      }

      if (actualQuantity !== individualProductsData.length) {
        return { success: false, error: 'Actual quantity must match individual products data count' };
      }

      // Update batch status
      const { error: batchError } = await supabase
        .from('production_batches')
        .update({
          status: 'completed',
          actual_quantity: actualQuantity,
          completion_date: new Date().toISOString()
        })
        .eq('id', batchId);

      if (batchError) {
        console.error('Error updating batch status:', batchError);
        return { success: false, error: handleSupabaseError(batchError) };
      }

      // Create individual products
      const manufacturingDate = new Date().toISOString().split('T')[0];
      const individualProducts = individualProductsData.map((productData, index) => ({
        product_id: batch.product_id,
        batch_number: batch.batch_number,
        production_date: manufacturingDate,
        final_weight: productData.final_weight?.trim() || null,
        final_thickness: productData.final_thickness?.trim() || null,
        quality_grade: productData.quality_grade || 'A',
        inspector: productData.inspector?.trim() || batch.supervisor || batch.operator,
        production_notes: productData.production_notes?.trim() || null
      }));

      // Create all individual products
      for (const productData of individualProducts) {
        await ProductService.createIndividualProduct(productData);
      }

      // Create completion notification
      await NotificationService.createNotification({
        type: 'info',
        title: 'Production Completed',
        message: `Production batch ${batch.batch_number} completed successfully. ${actualQuantity} units produced.`,
        priority: 'high',
        status: 'unread',
        module: 'production',
        related_id: batchId,
        related_data: {
          batch_number: batch.batch_number,
          planned_quantity: batch.planned_quantity,
          actual_quantity: actualQuantity,
          efficiency: Math.round((actualQuantity / batch.planned_quantity) * 100)
        },
        created_by: 'system'
      });

      // Log audit
      await logAudit('production_batch_completed', 'production', batchId, batch.batch_number, {
        planned_quantity: batch.planned_quantity,
        actual_quantity: actualQuantity,
        individual_products_created: actualQuantity,
        completion_date: new Date().toISOString()
      });

      console.log('✅ Production batch completed successfully:', batch.batch_number);
      return { success: true, error: null };

    } catch (error) {
      console.error('Error in completeProductionBatch:', error);
      return { success: false, error: 'Failed to complete production batch' };
    }
  }

  // Get production steps for a batch
  static async getProductionSteps(batchId: string): Promise<{ data: ProductionStep[] | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('production_steps')
        .select('*')
        .eq('production_batch_id', batchId)
        .order('step_number', { ascending: true });

      if (error) {
        console.error('Error fetching production steps:', error);
        return { data: null, error: handleSupabaseError(error) };
      }

      return { data: data || [], error: null };

    } catch (error) {
      console.error('Error in getProductionSteps:', error);
      return { data: null, error: 'Failed to fetch production steps' };
    }
  }

  // Update production step
  static async updateProductionStep(stepId: string, updateData: UpdateProductionStepData): Promise<{ data: ProductionStep | null; error: string | null }> {
    try {
      // Get current step data
      const { data: currentStep } = await supabase
        .from('production_steps')
        .select('*')
        .eq('id', stepId)
        .single();

      if (!currentStep) {
        return { data: null, error: 'Production step not found' };
      }

      // Prepare update data
      const cleanUpdateData = {
        ...(updateData.status && { status: updateData.status }),
        ...(updateData.operator !== undefined && { operator: updateData.operator?.trim() || null }),
        ...(updateData.start_time !== undefined && { start_time: updateData.start_time }),
        ...(updateData.end_time !== undefined && { end_time: updateData.end_time }),
        ...(updateData.actual_duration !== undefined && { actual_duration: updateData.actual_duration }),
        ...(updateData.quality_check_result !== undefined && { quality_check_result: updateData.quality_check_result?.trim() || null }),
        ...(updateData.notes !== undefined && { notes: updateData.notes?.trim() || null })
      };

      // Auto-set timestamps based on status
      if (updateData.status === 'in_progress' && !currentStep.start_time) {
        cleanUpdateData.start_time = new Date().toISOString();
      } else if (updateData.status === 'completed' && !currentStep.end_time) {
        cleanUpdateData.end_time = new Date().toISOString();

        // Calculate actual duration if start time exists
        if (currentStep.start_time) {
          const startTime = new Date(currentStep.start_time);
          const endTime = new Date(cleanUpdateData.end_time);
          cleanUpdateData.actual_duration = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60)); // in minutes
        }
      }

      const { data, error } = await supabase
        .from('production_steps')
        .update(cleanUpdateData)
        .eq('id', stepId)
        .select()
        .single();

      if (error) {
        console.error('Error updating production step:', error);
        return { data: null, error: handleSupabaseError(error) };
      }

      // Log audit
      await logAudit('production_step_updated', 'production', stepId, `${currentStep.step_name} (Step ${currentStep.step_number})`, {
        batch_id: currentStep.production_batch_id,
        updated_fields: Object.keys(cleanUpdateData),
        previous_state: currentStep,
        new_state: data
      });

      console.log('✅ Production step updated successfully:', data.step_name);
      return { data, error: null };

    } catch (error) {
      console.error('Error in updateProductionStep:', error);
      return { data: null, error: 'Failed to update production step' };
    }
  }

  // Start production step
  static async startProductionStep(stepId: string, operator?: string): Promise<{ success: boolean; error: string | null }> {
    try {
      const result = await this.updateProductionStep(stepId, {
        status: 'in_progress',
        operator: operator,
        start_time: new Date().toISOString()
      });

      if (result.error) {
        return { success: false, error: result.error };
      }

      console.log('✅ Production step started successfully');
      return { success: true, error: null };

    } catch (error) {
      console.error('Error in startProductionStep:', error);
      return { success: false, error: 'Failed to start production step' };
    }
  }

  // Complete production step
  static async completeProductionStep(stepId: string, qualityCheckResult?: string, notes?: string): Promise<{ success: boolean; error: string | null }> {
    try {
      const result = await this.updateProductionStep(stepId, {
        status: 'completed',
        end_time: new Date().toISOString(),
        quality_check_result: qualityCheckResult,
        notes: notes
      });

      if (result.error) {
        return { success: false, error: result.error };
      }

      console.log('✅ Production step completed successfully');
      return { success: true, error: null };

    } catch (error) {
      console.error('Error in completeProductionStep:', error);
      return { success: false, error: 'Failed to complete production step' };
    }
  }

  // Get production statistics
  static async getProductionStats(dateFrom?: string, dateTo?: string): Promise<{
    totalBatches: number;
    planned: number;
    inProgress: number;
    completed: number;
    paused: number;
    cancelled: number;
    totalPlanned: number;
    totalProduced: number;
    efficiency: number;
  }> {
    try {
      let query = supabase
        .from('production_batches')
        .select('status, planned_quantity, actual_quantity');

      if (dateFrom) {
        query = query.gte('start_date', dateFrom);
      }
      if (dateTo) {
        query = query.lte('start_date', dateTo);
      }

      const { data: batches } = await query;

      if (!batches) return {
        totalBatches: 0,
        planned: 0,
        inProgress: 0,
        completed: 0,
        paused: 0,
        cancelled: 0,
        totalPlanned: 0,
        totalProduced: 0,
        efficiency: 0
      };

      const stats = batches.reduce((acc, batch) => {
        acc.totalBatches++;
        acc[batch.status as keyof typeof acc]++;
        acc.totalPlanned += batch.planned_quantity || 0;
        acc.totalProduced += batch.actual_quantity || 0;
        return acc;
      }, {
        totalBatches: 0,
        planned: 0,
        inProgress: 0,
        completed: 0,
        paused: 0,
        cancelled: 0,
        totalPlanned: 0,
        totalProduced: 0,
        efficiency: 0
      });

      // Calculate efficiency percentage
      stats.efficiency = stats.totalPlanned > 0 ? Math.round((stats.totalProduced / stats.totalPlanned) * 100) : 0;

      return stats;

    } catch (error) {
      console.error('Error getting production stats:', error);
      return {
        totalBatches: 0,
        planned: 0,
        inProgress: 0,
        completed: 0,
        paused: 0,
        cancelled: 0,
        totalPlanned: 0,
        totalProduced: 0,
        efficiency: 0
      };
    }
  }
}

export default ProductionService;