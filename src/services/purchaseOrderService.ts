import { supabase, handleSupabaseError, PurchaseOrder } from '@/lib/supabase';
import { logAudit } from './auditService';
import { NotificationService } from './notificationService';
import { RawMaterialService as MongoDBRawMaterialService } from './api/rawMaterialService';

export interface CreatePurchaseOrderData {
  supplier_name: string;
  supplier_id?: string;
  material_name: string;
  material_brand?: string;
  material_category?: string;
  material_batch_number?: string;
  quantity: number;
  unit: string;
  cost_per_unit: number;
  total_cost: number;
  expected_delivery?: string;
  notes?: string;
  min_threshold?: number;
  max_capacity?: number;
  quality_grade?: string;
  is_restock?: boolean;
}

export interface UpdatePurchaseOrderData extends Partial<CreatePurchaseOrderData> {
  status?: 'pending' | 'approved' | 'shipped' | 'delivered' | 'cancelled';
  actual_delivery?: string;
}

export class PurchaseOrderService {
  // Create a new purchase order
  static async createPurchaseOrder(orderData: CreatePurchaseOrderData): Promise<{ data: PurchaseOrder | null; error: string | null }> {
    try {
      // Validate required fields
      if (!orderData.supplier_name?.trim()) {
        return { data: null, error: 'Supplier name is required' };
      }
      if (!orderData.material_name?.trim()) {
        return { data: null, error: 'Material name is required' };
      }
      if (!orderData.unit?.trim()) {
        return { data: null, error: 'Unit is required' };
      }
      if (orderData.quantity <= 0) {
        return { data: null, error: 'Quantity must be greater than 0' };
      }
      if (orderData.cost_per_unit <= 0) {
        return { data: null, error: 'Cost per unit must be greater than 0' };
      }

      // Generate order number
      const orderNumber = this.generateOrderNumber();

      // Prepare purchase order data
      const newPurchaseOrder = {
        order_number: orderNumber,
        supplier_id: orderData.supplier_id || null,
        supplier_name: orderData.supplier_name.trim(),
        order_date: new Date().toISOString().split('T')[0],
        expected_delivery: orderData.expected_delivery || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        total_amount: orderData.total_cost,
        paid_amount: 0,
        status: 'pending' as const,
        notes: orderData.notes?.trim() || null,
        created_by: 'admin',
        material_details: {
          material_name: orderData.material_name,
          material_brand: orderData.material_brand,
          material_category: orderData.material_category,
          material_batch_number: orderData.material_batch_number,
          quantity: orderData.quantity,
          unit: orderData.unit,
          cost_per_unit: orderData.cost_per_unit,
          min_threshold: orderData.min_threshold,
          max_capacity: orderData.max_capacity,
          quality_grade: orderData.quality_grade,
          is_restock: orderData.is_restock
        }
      };

      const { data, error } = await supabase
        .from('purchase_orders')
        .insert(newPurchaseOrder)
        .select()
        .single();

      if (error) {
        console.error('Error creating purchase order:', error);
        return { data: null, error: handleSupabaseError(error) };
      }

      // Log audit
      await logAudit('purchase_order_created', 'materials', data.id, data.order_number, {
        purchase_order_data: data
      });

      console.log('✅ Purchase order created successfully:', data.order_number);
      return { data, error: null };

    } catch (error) {
      console.error('Error in createPurchaseOrder:', error);
      return { data: null, error: 'Failed to create purchase order' };
    }
  }

  // Get all purchase orders with optional filtering
  static async getPurchaseOrders(filters?: {
    search?: string;
    supplier_id?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ data: any[] | null; error: string | null; count?: number }> {
    try {
      let query = supabase
        .from('purchase_orders')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters?.search) {
        const searchTerm = `%${filters.search.toLowerCase()}%`;
        query = query.or(`order_number.ilike.${searchTerm},supplier_name.ilike.${searchTerm}`);
      }

      if (filters?.supplier_id) {
        query = query.eq('supplier_id', filters.supplier_id);
      }

      if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
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
        console.error('Error fetching purchase orders:', error);
        return { data: null, error: handleSupabaseError(error) };
      }

      return { data: data || [], error: null, count: count || 0 };

    } catch (error) {
      console.error('Error in getPurchaseOrders:', error);
      return { data: null, error: 'Failed to fetch purchase orders' };
    }
  }

  // Get purchase order by ID
  static async getPurchaseOrderById(orderId: string): Promise<{ data: PurchaseOrder | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('purchase_orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (error) {
        console.error('Error fetching purchase order:', error);
        return { data: null, error: handleSupabaseError(error) };
      }

      return { data, error: null };

    } catch (error) {
      console.error('Error in getPurchaseOrderById:', error);
      return { data: null, error: 'Failed to fetch purchase order' };
    }
  }

  // Update purchase order status
  static async updatePurchaseOrderStatus(orderId: string, status: 'pending' | 'approved' | 'shipped' | 'delivered' | 'cancelled', actualDelivery?: string): Promise<{ data: PurchaseOrder | null; error: string | null }> {
    try {
      // Get current order data for audit
      const { data: currentOrder } = await this.getPurchaseOrderById(orderId);
      if (!currentOrder) {
        return { data: null, error: 'Purchase order not found' };
      }

      const updateData: any = { status };

      // Set actual delivery date if delivered
      if (status === 'delivered' && actualDelivery) {
        updateData.actual_delivery = actualDelivery;
      } else if (status === 'delivered') {
        updateData.actual_delivery = new Date().toISOString().split('T')[0];
      }

      const { data, error } = await supabase
        .from('purchase_orders')
        .update(updateData)
        .eq('id', orderId)
        .select()
        .single();

      if (error) {
        console.error('Error updating purchase order status:', error);
        return { data: null, error: handleSupabaseError(error) };
      }

      // Handle delivery - update raw material stock
      if (status === 'delivered' && data.material_details) {
        await this.handleDeliveredOrder(data);
      }

      // Update raw material status to in-transit if approved
      if (status === 'approved' && data.material_details?.is_restock) {
        await this.updateRawMaterialStatusToInTransit(data);
      }

      // Log audit
      await logAudit('purchase_order_status_updated', 'materials', data.id, data.order_number, {
        previous_status: currentOrder.status,
        new_status: status,
        updated_fields: Object.keys(updateData)
      });

      console.log(`✅ Purchase order status updated to ${status}:`, data.order_number);
      return { data, error: null };

    } catch (error) {
      console.error('Error in updatePurchaseOrderStatus:', error);
      return { data: null, error: 'Failed to update purchase order status' };
    }
  }

  // Handle delivered order - update raw material stock
  private static async handleDeliveredOrder(order: any): Promise<void> {
    try {
      const materialDetails = order.material_details;
      if (!materialDetails) return;

      // Find existing material by name, supplier, and unit
      const { data: materials } = await MongoDBRawMaterialService.getRawMaterials();

      const existingMaterial = materials?.find(material =>
        material.name === materialDetails.material_name &&
        material.supplier_name === order.supplier_name &&
        material.unit === materialDetails.unit
      );

      if (existingMaterial) {
        // Update existing material stock
        const newStock = existingMaterial.current_stock + materialDetails.quantity;
        await MongoDBRawMaterialService.updateRawMaterial(existingMaterial.id, {
          current_stock: newStock,
          cost_per_unit: materialDetails.cost_per_unit,
          last_restocked: new Date().toISOString(),
          status: 'in-stock'
        });
        console.log(`✅ Updated existing material stock for ${materialDetails.material_name}`);
      } else {
        // Create new material
        await MongoDBRawMaterialService.createRawMaterial({
          name: materialDetails.material_name,
          category: materialDetails.material_category || 'Other',
          current_stock: materialDetails.quantity,
          unit: materialDetails.unit,
          min_threshold: materialDetails.min_threshold || 100,
          max_capacity: materialDetails.max_capacity || 1000,
          reorder_point: materialDetails.min_threshold || 100,
          supplier_name: order.supplier_name,
          cost_per_unit: materialDetails.cost_per_unit,
          batch_number: materialDetails.material_batch_number,
          quality_grade: materialDetails.quality_grade
        });
        console.log(`✅ Created new material: ${materialDetails.material_name}`);
      }

    } catch (error) {
      console.error('Error handling delivered order:', error);
    }
  }

  // Update raw material status to in-transit when order is approved
  private static async updateRawMaterialStatusToInTransit(order: any): Promise<void> {
    try {
      const materialDetails = order.material_details;
      if (!materialDetails || !materialDetails.is_restock) return;

      // Find the material and update its status
      const { data: materials } = await MongoDBRawMaterialService.getRawMaterials();

      const material = materials?.find(m =>
        m.name === materialDetails.material_name &&
        m.supplier_name === order.supplier_name &&
        m.unit === materialDetails.unit
      );

      if (material) {
        await MongoDBRawMaterialService.updateRawMaterial(material.id, {
          status: 'in-transit'
        });
        console.log(`✅ Updated ${materialDetails.material_name} status to in-transit`);
      }

    } catch (error) {
      console.error('Error updating material status to in-transit:', error);
    }
  }

  // Generate order number
  private static generateOrderNumber(): string {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const timestamp = Date.now().toString().slice(-6);
    return `PO${year}${month}${day}${timestamp}`;
  }

  // Get purchase order statistics
  static async getPurchaseOrderStats(): Promise<{
    totalOrders: number;
    pendingOrders: number;
    deliveredOrders: number;
    totalValue: number;
    averageValue: number;
  }> {
    try {
      const { data: orders } = await supabase
        .from('purchase_orders')
        .select('status, total_amount');

      if (!orders) return {
        totalOrders: 0,
        pendingOrders: 0,
        deliveredOrders: 0,
        totalValue: 0,
        averageValue: 0
      };

      const stats = orders.reduce((acc, order) => {
        acc.totalOrders++;
        if (order.status === 'pending' || order.status === 'approved' || order.status === 'shipped') {
          acc.pendingOrders++;
        }
        if (order.status === 'delivered') {
          acc.deliveredOrders++;
        }
        acc.totalValue += order.total_amount || 0;
        return acc;
      }, {
        totalOrders: 0,
        pendingOrders: 0,
        deliveredOrders: 0,
        totalValue: 0,
        averageValue: 0
      });

      stats.averageValue = stats.totalOrders > 0 ? stats.totalValue / stats.totalOrders : 0;

      return stats;

    } catch (error) {
      console.error('Error getting purchase order stats:', error);
      return {
        totalOrders: 0,
        pendingOrders: 0,
        deliveredOrders: 0,
        totalValue: 0,
        averageValue: 0
      };
    }
  }
}

export default PurchaseOrderService;