import { supabase, supabaseAdmin, handleSupabaseError } from '@/lib/supabase';
import { IDGenerator } from '@/lib/idGenerator';

export interface WasteItem {
  id: string;
  material_id?: string;
  material_name: string;
  quantity: number;
  unit: string;
  waste_type: 'scrap' | 'defective' | 'excess';
  can_be_reused: boolean;
  production_batch_id?: string;
  production_product_id?: string;
  notes?: string;
  status: 'available_for_reuse' | 'added_to_inventory' | 'disposed';
  created_at: string;
  updated_at: string;
}

export interface CreateWasteItemData {
  material_id?: string;
  material_name: string;
  quantity: number;
  unit: string;
  waste_type: 'scrap' | 'defective' | 'excess';
  can_be_reused?: boolean;
  production_batch_id?: string;
  production_product_id?: string;
  notes?: string;
}

export class WasteManagementService {
  // Create a new waste item
  static async createWasteItem(data: CreateWasteItemData): Promise<{ data: WasteItem | null; error: string | null }> {
    try {
      const wasteItem = {
        id: await IDGenerator.generateUniqueWasteId(),
        material_id: data.material_id || null,
        material_name: data.material_name,
        quantity: data.quantity,
        unit: data.unit,
        waste_type: data.waste_type,
        can_be_reused: data.can_be_reused || false,
        production_batch_id: data.production_batch_id || null,
        production_product_id: data.production_product_id || null,
        notes: data.notes || null,
        status: 'available_for_reuse' as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Use admin client to bypass RLS
      const client = supabaseAdmin || supabase;
      const { data: result, error } = await client
        .from('waste_management')
        .insert([wasteItem])
        .select('*')
        .single();

      if (error) {
        console.error('Error creating waste item:', error);
        return { data: null, error: handleSupabaseError(error) };
      }

      console.log('✅ Waste item created successfully:', result?.material_name);
      return { data: result, error: null };
    } catch (error) {
      console.error('Error in createWasteItem:', error);
      return { data: null, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Get all waste items
  static async getWasteItems(): Promise<{ data: WasteItem[] | null; error: string | null }> {
    try {
      const client = supabaseAdmin || supabase;
      const { data, error } = await client
        .from('waste_management')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching waste items:', error);
        return { data: null, error: handleSupabaseError(error) };
      }

      return { data: data || [], error: null };
    } catch (error) {
      console.error('Error in getWasteItems:', error);
      return { data: null, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Update waste item status
  static async updateWasteItemStatus(
    wasteId: string, 
    status: 'available_for_reuse' | 'added_to_inventory' | 'disposed',
    processedBy?: string
  ): Promise<{ data: WasteItem | null; error: string | null }> {
    try {
      const updateData: any = {
        status,
        updated_at: new Date().toISOString()
      };

      const client = supabaseAdmin || supabase;
      const { data, error } = await client
        .from('waste_management')
        .update(updateData)
        .eq('id', wasteId)
        .select('*')
        .single();

      if (error) {
        console.error('Error updating waste item status:', error);
        return { data: null, error: handleSupabaseError(error) };
      }

      console.log('✅ Waste item status updated:', status);
      return { data, error: null };
    } catch (error) {
      console.error('Error in updateWasteItemStatus:', error);
      return { data: null, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Return waste to inventory (if reusable)
  static async returnWasteToInventory(wasteId: string): Promise<{ success: boolean; error: string | null }> {
    try {
      // Get waste item details
      const client = supabaseAdmin || supabase;
      const { data: wasteItem, error: fetchError } = await client
        .from('waste_management')
        .select('*')
        .eq('id', wasteId)
        .single();

      if (fetchError || !wasteItem) {
        return { success: false, error: 'Waste item not found' };
      }

      if (!wasteItem.can_be_reused) {
        return { success: false, error: 'This waste item cannot be reused' };
      }

      // Find the corresponding raw material
      if (wasteItem.material_id) {
        console.log('🔍 Finding raw material with ID:', wasteItem.material_id);
        const { data: material, error: materialError } = await client
          .from('raw_materials')
          .select('*')
          .eq('id', wasteItem.material_id)
          .single();

        if (material && !materialError) {
          console.log('📦 Found material:', material.name, 'Current stock:', material.current_stock);
          // Add waste quantity back to material stock
          const newStock = material.current_stock + wasteItem.quantity;
          const newStatus = newStock <= 0 ? 'out-of-stock' :
                           newStock <= 10 ? 'low-stock' : 'in-stock';

          console.log('➕ Adding waste quantity:', wasteItem.quantity, 'to material stock');
          console.log('📊 New stock will be:', newStock, 'Status:', newStatus);

          const { error: updateError } = await client
            .from('raw_materials')
            .update({
              current_stock: newStock,
              status: newStatus,
              updated_at: new Date().toISOString()
            })
            .eq('id', wasteItem.material_id);

          if (updateError) {
            console.error('❌ Error updating material stock:', updateError);
            return { success: false, error: 'Failed to update material stock' };
          } else {
            console.log('✅ Material stock updated successfully');
          }
        } else {
          console.error('❌ Material not found or error:', materialError);
          return { success: false, error: 'Raw material not found' };
        }
      } else {
        console.error('❌ No material_id found in waste item');
        return { success: false, error: 'No material ID found in waste item' };
      }

      // Update waste item status
      const { error: statusError } = await client
        .from('waste_management')
        .update({
          status: 'added_to_inventory',
          updated_at: new Date().toISOString()
        })
        .eq('id', wasteId);

      if (statusError) {
        console.error('Error updating waste status:', statusError);
        return { success: false, error: 'Failed to update waste status' };
      }

      console.log('✅ Waste returned to inventory successfully');
      return { success: true, error: null };
    } catch (error) {
      console.error('Error in returnWasteToInventory:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Get waste statistics
  static async getWasteStats(): Promise<{ data: any; error: string | null }> {
    try {
      const client = supabaseAdmin || supabase;
      const { data, error } = await client
        .from('waste_management')
        .select('waste_type, status, quantity');

      if (error) {
        console.error('Error fetching waste stats:', error);
        return { data: null, error: handleSupabaseError(error) };
      }

      const stats = {
        totalWaste: data?.reduce((sum, item) => sum + item.quantity, 0) || 0,
        byType: {
          scrap: data?.filter(item => item.waste_type === 'scrap').reduce((sum, item) => sum + item.quantity, 0) || 0,
          defective: data?.filter(item => item.waste_type === 'defective').reduce((sum, item) => sum + item.quantity, 0) || 0,
          excess: data?.filter(item => item.waste_type === 'excess').reduce((sum, item) => sum + item.quantity, 0) || 0
        },
        byStatus: {
          available_for_reuse: data?.filter(item => item.status === 'available_for_reuse').length || 0,
          added_to_inventory: data?.filter(item => item.status === 'added_to_inventory').length || 0,
          disposed: data?.filter(item => item.status === 'disposed').length || 0
        }
      };

      return { data: stats, error: null };
    } catch (error) {
      console.error('Error in getWasteStats:', error);
      return { data: null, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
}

export default WasteManagementService;
