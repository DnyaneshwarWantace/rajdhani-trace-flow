import { supabase, supabaseAdmin, handleSupabaseError, RawMaterial, Supplier } from '@/lib/supabase';
import { IDGenerator } from '@/lib/idGenerator';
import { logAudit } from './auditService';
import { NotificationService } from './notificationService';

export interface CreateRawMaterialData {
  id?: string;
  name: string;
  brand?: string;
  category: string;
  current_stock: number;
  unit: string;
  min_threshold: number;
  max_capacity: number;
  reorder_point: number;
  daily_usage?: number;
  supplier_id?: string;
  supplier_name: string;
  cost_per_unit: number;
  batch_number?: string;
  quality_grade?: string;
  image_url?: string;
  supplier_performance?: number;
}

export interface UpdateRawMaterialData extends Partial<CreateRawMaterialData> {
  status?: 'in-stock' | 'low-stock' | 'out-of-stock' | 'overstock' | 'in-transit';
  last_restocked?: string;
  supplier_performance?: number;
}

export interface MaterialConsumptionData {
  production_batch_id: string;
  production_step_id?: string;
  material_id: string;
  individual_product_id?: string;
  consumed_quantity: number;
  waste_quantity?: number;
  operator?: string;
  notes?: string;
}

export interface CreateSupplierData {
  name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  gst_number?: string;
}

export class RawMaterialService {
  // Create a new raw material
  static async createRawMaterial(materialData: CreateRawMaterialData): Promise<{ data: RawMaterial | null; error: string | null }> {
    try {
      // Validate required fields
      if (!materialData.name?.trim()) {
        return { data: null, error: 'Material name is required' };
      }
      if (!materialData.category?.trim()) {
        return { data: null, error: 'Material category is required' };
      }
      if (!materialData.unit?.trim()) {
        return { data: null, error: 'Material unit is required' };
      }
      if (!materialData.supplier_name?.trim()) {
        return { data: null, error: 'Supplier name is required' };
      }

      // Calculate status based on stock levels
      const status = this.calculateMaterialStatus(
        materialData.current_stock,
        materialData.min_threshold,
        materialData.max_capacity
      );

      // Calculate total value
      const totalValue = materialData.current_stock * materialData.cost_per_unit;

      // Generate globally unique ID if not provided
      const materialId = materialData.id || await IDGenerator.generateUniqueRawMaterialId();

      // Prepare material data
      const newMaterial = {
        id: materialId,
        name: materialData.name.trim(),
        brand: materialData.brand?.trim() || null,
        category: materialData.category.trim(),
        current_stock: materialData.current_stock,
        unit: materialData.unit.trim(),
        min_threshold: materialData.min_threshold,
        max_capacity: materialData.max_capacity,
        reorder_point: materialData.reorder_point,
        daily_usage: materialData.daily_usage || 0,
        status,
        supplier_id: materialData.supplier_id || null,
        supplier_name: materialData.supplier_name.trim(),
        cost_per_unit: materialData.cost_per_unit,
        total_value: totalValue,
        batch_number: materialData.batch_number?.trim() || IDGenerator.generateRawMaterialId(),
        quality_grade: materialData.quality_grade?.trim() || null,
        image_url: materialData.image_url?.trim() || null,
        supplier_performance: materialData.supplier_performance || 5, // Default to 5 if not provided
        last_restocked: materialData.current_stock > 0 ? new Date().toISOString() : null
      };

      // Use admin client to bypass RLS
      const client = supabaseAdmin || supabase;
      const { data, error } = await client
        .from('raw_materials')
        .insert(newMaterial)
        .select()
        .single();

      if (error) {
        console.error('Error creating raw material:', error);
        return { data: null, error: handleSupabaseError(error) };
      }

      // Create low stock notification if needed
      if (status === 'low-stock') {
        await NotificationService.createNotification({
          type: 'warning',
          title: 'Low Stock Alert',
          message: `Raw material "${data.name}" is running low. Current stock: ${data.current_stock} ${data.unit}`,
          priority: 'high',
          status: 'unread',
          module: 'materials',
          related_id: data.id,
          related_data: { material_name: data.name, current_stock: data.current_stock, unit: data.unit },
          created_by: 'system'
        });
      }

      // Log audit
      await logAudit('raw_material_created', 'materials', data.id, data.name, {
        material_data: data
      });

      console.log('✅ Raw material created successfully:', data.name);
      return { data, error: null };

    } catch (error) {
      console.error('Error in createRawMaterial:', error);
      return { data: null, error: 'Failed to create raw material' };
    }
  }

  // Calculate material status based on stock levels
  private static calculateMaterialStatus(
    currentStock: number,
    minThreshold: number,
    maxCapacity: number
  ): 'in-stock' | 'low-stock' | 'out-of-stock' | 'overstock' {
    if (currentStock <= 0) return 'out-of-stock';
    if (currentStock <= minThreshold) return 'low-stock';
    if (currentStock > maxCapacity) return 'overstock';
    return 'in-stock';
  }

  // Get all raw materials with optional filtering
  static async getRawMaterials(filters?: {
    search?: string;
    category?: string;
    status?: string;
    supplier_id?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ data: RawMaterial[] | null; error: string | null; count?: number }> {
    try {
      // Use admin client to bypass RLS
      const client = supabaseAdmin || supabase;
      if (!client) {
        return { data: null, error: 'Supabase not configured' };
      }

      let query = client
        .from('raw_materials')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters?.search) {
        const searchTerm = `%${filters.search.toLowerCase()}%`;
        query = query.or(`name.ilike.${searchTerm},brand.ilike.${searchTerm},category.ilike.${searchTerm}`);
      }

      if (filters?.category && filters.category !== 'all') {
        query = query.eq('category', filters.category);
      }

      if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }

      if (filters?.supplier_id) {
        query = query.eq('supplier_id', filters.supplier_id);
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
        console.error('Error fetching raw materials:', error);
        return { data: null, error: handleSupabaseError(error) };
      }

      return { data: data || [], error: null, count: count || 0 };

    } catch (error) {
      console.error('Error in getRawMaterials:', error);
      return { data: null, error: 'Failed to fetch raw materials' };
    }
  }

  // Get raw material by ID
  static async getRawMaterialById(materialId: string): Promise<{ data: RawMaterial | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('raw_materials')
        .select('*')
        .eq('id', materialId)
        .single();

      if (error) {
        console.error('Error fetching raw material:', error);
        return { data: null, error: handleSupabaseError(error) };
      }

      return { data, error: null };

    } catch (error) {
      console.error('Error in getRawMaterialById:', error);
      return { data: null, error: 'Failed to fetch raw material' };
    }
  }

  // Update a raw material
  static async updateRawMaterial(materialId: string, updateData: UpdateRawMaterialData): Promise<{ data: RawMaterial | null; error: string | null }> {
    try {
      // Get current material data for audit and calculations
      const { data: currentMaterial } = await this.getRawMaterialById(materialId);
      if (!currentMaterial) {
        return { data: null, error: 'Raw material not found' };
      }

      // Calculate new status if stock levels changed
      const newCurrentStock = updateData.current_stock ?? currentMaterial.current_stock;
      const newMinThreshold = updateData.min_threshold ?? currentMaterial.min_threshold;
      const newMaxCapacity = updateData.max_capacity ?? currentMaterial.max_capacity;
      const newCostPerUnit = updateData.cost_per_unit ?? currentMaterial.cost_per_unit;

      const calculatedStatus = this.calculateMaterialStatus(newCurrentStock, newMinThreshold, newMaxCapacity);
      const newTotalValue = newCurrentStock * newCostPerUnit;

      // Prepare update data
      const cleanUpdateData = {
        ...(updateData.name && { name: updateData.name.trim() }),
        ...(updateData.brand !== undefined && { brand: updateData.brand?.trim() || null }),
        ...(updateData.category && { category: updateData.category.trim() }),
        ...(updateData.current_stock !== undefined && { current_stock: updateData.current_stock }),
        ...(updateData.unit && { unit: updateData.unit.trim() }),
        ...(updateData.min_threshold !== undefined && { min_threshold: updateData.min_threshold }),
        ...(updateData.max_capacity !== undefined && { max_capacity: updateData.max_capacity }),
        ...(updateData.reorder_point !== undefined && { reorder_point: updateData.reorder_point }),
        ...(updateData.daily_usage !== undefined && { daily_usage: updateData.daily_usage }),
        status: updateData.status || calculatedStatus,
        ...(updateData.supplier_id !== undefined && { supplier_id: updateData.supplier_id }),
        ...(updateData.supplier_name && { supplier_name: updateData.supplier_name.trim() }),
        ...(updateData.cost_per_unit !== undefined && { cost_per_unit: updateData.cost_per_unit }),
        total_value: newTotalValue,
        ...(updateData.batch_number !== undefined && { batch_number: updateData.batch_number?.trim() || null }),
        ...(updateData.quality_grade !== undefined && { quality_grade: updateData.quality_grade?.trim() || null }),
        ...(updateData.image_url !== undefined && { image_url: updateData.image_url?.trim() || null }),
        ...(updateData.supplier_performance !== undefined && { supplier_performance: updateData.supplier_performance }),
        ...(updateData.last_restocked !== undefined && { last_restocked: updateData.last_restocked })
      };

      // Update last_restocked if stock increased
      if (updateData.current_stock && updateData.current_stock > currentMaterial.current_stock) {
        cleanUpdateData.last_restocked = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('raw_materials')
        .update(cleanUpdateData)
        .eq('id', materialId)
        .select()
        .single();

      if (error) {
        console.error('Error updating raw material:', error);
        return { data: null, error: handleSupabaseError(error) };
      }

      // Create notifications for status changes
      if (data.status !== currentMaterial.status) {
        if (data.status === 'low-stock') {
          await NotificationService.createNotification({
            type: 'warning',
            title: 'Low Stock Alert',
            message: `Raw material "${data.name}" is now running low. Current stock: ${data.current_stock} ${data.unit}`,
            priority: 'high',
            status: 'unread',
            module: 'materials',
            related_id: data.id,
            related_data: { material_name: data.name, current_stock: data.current_stock, unit: data.unit },
            created_by: 'system'
          });
        } else if (data.status === 'out-of-stock') {
          await NotificationService.createNotification({
            type: 'error',
            title: 'Out of Stock Alert',
            message: `Raw material "${data.name}" is now out of stock!`,
            priority: 'urgent',
            status: 'unread',
            module: 'materials',
            related_id: data.id,
            related_data: { material_name: data.name, current_stock: 0, unit: data.unit },
            created_by: 'system'
          });
        }
      }

      // Log audit
      await logAudit('raw_material_updated', 'materials', data.id, data.name, {
        updated_fields: Object.keys(cleanUpdateData),
        previous_state: currentMaterial,
        new_state: data
      });

      console.log('✅ Raw material updated successfully:', data.name);
      return { data, error: null };

    } catch (error) {
      console.error('Error in updateRawMaterial:', error);
      return { data: null, error: 'Failed to update raw material' };
    }
  }

  // Record material consumption
  static async recordMaterialConsumption(consumptionData: MaterialConsumptionData): Promise<{ success: boolean; error: string | null }> {
    try {
      // Validate required fields
      if (!consumptionData.production_batch_id) {
        return { success: false, error: 'Production batch ID is required' };
      }
      if (!consumptionData.material_id) {
        return { success: false, error: 'Material ID is required' };
      }
      if (consumptionData.consumed_quantity <= 0) {
        return { success: false, error: 'Consumed quantity must be greater than 0' };
      }

      // Get current material stock
      const { data: material } = await this.getRawMaterialById(consumptionData.material_id);
      if (!material) {
        return { success: false, error: 'Material not found' };
      }

      if (material.current_stock < consumptionData.consumed_quantity) {
        return { success: false, error: `Insufficient stock. Available: ${material.current_stock} ${material.unit}` };
      }

      // Record consumption
      const consumptionRecord = {
        id: `MAT_CONSUME_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, // Generate unique ID
        production_product_id: consumptionData.production_batch_id, // Use production_product_id as per schema
        material_id: consumptionData.material_id,
        material_name: material.name, // Add material name as required by schema
        quantity_used: consumptionData.consumed_quantity, // Use quantity_used as per schema
        unit: material.unit, // Add unit as required by schema
        cost_per_unit: material.cost_per_unit, // Add cost_per_unit as required by schema
        total_cost: consumptionData.consumed_quantity * material.cost_per_unit, // Calculate total cost
        consumed_at: new Date().toISOString() // Use consumed_at as per schema
      };

      const { error: consumptionError } = await supabase
        .from('material_consumption')
        .insert(consumptionRecord);

      if (consumptionError) {
        console.error('Error recording material consumption:', consumptionError);
        return { success: false, error: handleSupabaseError(consumptionError) };
      }

      // Update material stock
      const newStock = material.current_stock - consumptionData.consumed_quantity;
      await this.updateRawMaterial(consumptionData.material_id, {
        current_stock: newStock
      });

      // Log audit
      await logAudit('material_consumed', 'materials', consumptionData.material_id, material.name, {
        consumption_data: consumptionRecord,
        previous_stock: material.current_stock,
        new_stock: newStock
      });

      console.log('✅ Material consumption recorded successfully');
      return { success: true, error: null };

    } catch (error) {
      console.error('Error in recordMaterialConsumption:', error);
      return { success: false, error: 'Failed to record material consumption' };
    }
  }

  // Get material consumption history
  static async getMaterialConsumptionHistory(materialId?: string, batchId?: string): Promise<{ data: any[] | null; error: string | null }> {
    try {
      let query = supabase
        .from('material_consumption')
        .select(`
          *,
          raw_materials (name, unit),
          production_batches (batch_number),
          production_steps (step_name)
        `)
        .order('consumption_date', { ascending: false });

      if (materialId) {
        query = query.eq('material_id', materialId);
      }

      if (batchId) {
        query = query.eq('production_batch_id', batchId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching material consumption history:', error);
        return { data: null, error: handleSupabaseError(error) };
      }

      return { data: data || [], error: null };

    } catch (error) {
      console.error('Error in getMaterialConsumptionHistory:', error);
      return { data: null, error: 'Failed to fetch material consumption history' };
    }
  }

  // Get materials requiring reorder
  static async getMaterialsRequiringReorder(): Promise<{ data: RawMaterial[] | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('raw_materials')
        .select('*')
        .filter('current_stock', 'lte', 'reorder_point')
        .order('current_stock', { ascending: true });

      if (error) {
        console.error('Error fetching materials requiring reorder:', error);
        return { data: null, error: handleSupabaseError(error) };
      }

      return { data: data || [], error: null };

    } catch (error) {
      console.error('Error in getMaterialsRequiringReorder:', error);
      return { data: null, error: 'Failed to fetch materials requiring reorder' };
    }
  }

  // Get inventory statistics
  static async getInventoryStats(): Promise<{
    totalMaterials: number;
    inStock: number;
    lowStock: number;
    outOfStock: number;
    overstock: number;
    totalValue: number;
    averageValue: number;
  }> {
    try {
      const { data: materials, error } = await supabase
        .from('raw_materials')
        .select('status, total_value');

      console.log('🔍 RawMaterialService.getInventoryStats - Raw data:', materials);
      console.log('🔍 RawMaterialService.getInventoryStats - Error:', error);

      if (!materials) return {
        totalMaterials: 0,
        inStock: 0,
        lowStock: 0,
        outOfStock: 0,
        overstock: 0,
        totalValue: 0,
        averageValue: 0
      };

      const stats = materials.reduce((acc, material) => {
        acc.totalMaterials++;
        acc[material.status === 'in-stock' ? 'inStock' :
            material.status === 'low-stock' ? 'lowStock' :
            material.status === 'out-of-stock' ? 'outOfStock' :
            material.status === 'overstock' ? 'overstock' : 'inStock']++;
        acc.totalValue += material.total_value || 0;
        return acc;
      }, {
        totalMaterials: 0,
        inStock: 0,
        lowStock: 0,
        outOfStock: 0,
        overstock: 0,
        totalValue: 0,
        averageValue: 0
      });

      stats.averageValue = stats.totalMaterials > 0 ? stats.totalValue / stats.totalMaterials : 0;

      return stats;

    } catch (error) {
      console.error('Error getting inventory stats:', error);
      return {
        totalMaterials: 0,
        inStock: 0,
        lowStock: 0,
        outOfStock: 0,
        overstock: 0,
        totalValue: 0,
        averageValue: 0
      };
    }
  }

  // Supplier management
  static async createSupplier(supplierData: CreateSupplierData): Promise<{ data: Supplier | null; error: string | null }> {
    try {
      if (!supplierData.name?.trim()) {
        return { data: null, error: 'Supplier name is required' };
      }

      // Check if supplier with same name exists
      const { data: existingSupplier } = await supabase
        .from('suppliers')
        .select('name')
        .eq('name', supplierData.name.trim())
        .single();

      if (existingSupplier) {
        return { data: null, error: 'A supplier with this name already exists' };
      }

      const newSupplier = {
        name: supplierData.name.trim(),
        contact_person: supplierData.contact_person?.trim() || null,
        email: supplierData.email?.toLowerCase().trim() || null,
        phone: supplierData.phone?.trim() || null,
        address: supplierData.address?.trim() || null,
        city: supplierData.city?.trim() || null,
        state: supplierData.state?.trim() || null,
        pincode: supplierData.pincode?.trim() || null,
        gst_number: supplierData.gst_number?.trim() || null,
        performance_rating: 0,
        total_orders: 0,
        total_value: 0,
        status: 'active' as const
      };

      const { data, error } = await supabase
        .from('suppliers')
        .insert(newSupplier)
        .select()
        .single();

      if (error) {
        console.error('Error creating supplier:', error);
        return { data: null, error: handleSupabaseError(error) };
      }

      // Log audit
      await logAudit('supplier_created', 'suppliers', data.id, data.name, {
        supplier_data: data
      });

      console.log('✅ Supplier created successfully:', data.name);
      return { data, error: null };

    } catch (error) {
      console.error('Error in createSupplier:', error);
      return { data: null, error: 'Failed to create supplier' };
    }
  }

  // Get all suppliers
  static async getSuppliers(): Promise<{ data: Supplier[] | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching suppliers:', error);
        return { data: null, error: handleSupabaseError(error) };
      }

      return { data: data || [], error: null };

    } catch (error) {
      console.error('Error in getSuppliers:', error);
      return { data: null, error: 'Failed to fetch suppliers' };
    }
  }
}

export default RawMaterialService;