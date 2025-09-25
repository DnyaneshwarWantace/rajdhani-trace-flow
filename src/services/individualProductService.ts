import { supabase, supabaseAdmin } from '@/lib/supabase';
import { handleSupabaseError } from '@/lib/supabase';
import { IDGenerator } from '@/lib/idGenerator';

export interface IndividualProduct {
  id?: string;
  qr_code: string;
  product_id: string;
  color?: string;
  pattern?: string;
  weight?: string;
  thickness?: string;
  width?: string;
  height?: string;
  final_weight?: string;
  final_thickness?: string;
  final_width?: string;
  final_height?: string;
  quality_grade?: string;
  status?: 'available' | 'sold' | 'damaged' | 'in-production' | 'completed';
  location?: string;
  notes?: string;
  added_date?: string;
  production_date?: string;
  completion_date?: string;
  inspector?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CreateIndividualProductData {
  id?: string;
  qr_code?: string;
  product_id: string;
  product_name?: string;
  batch_number?: string;
  color?: string;
  pattern?: string;
  weight?: string;
  thickness?: string;
  width?: string;
  height?: string;
  final_weight?: string;
  final_thickness?: string;
  final_width?: string;
  final_height?: string;
  quality_grade?: string;
  status?: 'available' | 'sold' | 'damaged' | 'in-production' | 'completed';
  location?: string;
  notes?: string;
  added_date?: string;
  production_date?: string;
  completion_date?: string;
  inspector?: string;
}

class IndividualProductService {
  async createIndividualProduct(data: CreateIndividualProductData) {
    try {
      // Generate meaningful ID if not provided
      if (!data.id) {
        data.id = IDGenerator.generateIndividualProductId();
      }
      
      // Generate QR code if not provided
      if (!data.qr_code) {
        data.qr_code = this.generateQRCode(data.product_id, data.batch_number);
      }

      // Ensure production_date is provided (required field)
      if (!data.production_date) {
        data.production_date = new Date().toISOString().split('T')[0]; // Today's date in YYYY-MM-DD format
      }

      // Ensure added_date is set to current date if not provided
      if (!data.added_date) {
        data.added_date = new Date().toISOString().split('T')[0]; // Today's date in YYYY-MM-DD format
      }

      // Use admin client to bypass RLS
      const client = supabaseAdmin || supabase;
      
      console.log('🔍 Creating individual product with client:', client ? 'configured' : 'null');
      console.log('🔍 Data being inserted:', data);
      
      const { data: result, error } = await client
        .from('individual_products')
        .insert([data])
        .select('*')
        .single();

      if (error) {
        console.error('❌ Database error creating individual product:', error);
        handleSupabaseError(error);
        return { data: null, error: error.message };
      }

      console.log('✅ Individual product created successfully in database:', result);
      console.log('✅ Database returned:', result?.product_name || result?.qr_code);
      return { data: result, error: null };
    } catch (error) {
      console.error('Error creating individual product:', error);
      return { data: null, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async getIndividualProducts(productId?: string) {
    try {
      // Use admin client to bypass RLS
      const client = supabaseAdmin || supabase;
      let query = client
        .from('individual_products')
        .select('*')
        .order('created_at', { ascending: false });

      if (productId) {
        query = query.eq('product_id', productId);
      }

      const { data, error } = await query;

      if (error) {
        handleSupabaseError(error);
        return { data: [], error: error.message };
      }

      return { data: data || [], error: null };
    } catch (error) {
      console.error('Error fetching individual products:', error);
      return { data: [], error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async getIndividualProductById(id: string) {
    try {
      const { data, error } = await supabase
        .from('individual_products')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        handleSupabaseError(error);
        return { data: null, error: error.message };
      }

      return { data, error: null };
    } catch (error) {
      console.error('Error fetching individual product:', error);
      return { data: null, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async updateIndividualProduct(id: string, updates: Partial<IndividualProduct>) {
    try {
      const { data, error } = await supabase
        .from('individual_products')
        .update(updates)
        .eq('id', id)
        .select('*')
        .single();

      if (error) {
        handleSupabaseError(error);
        return { data: null, error: error.message };
      }

      return { data, error: null };
    } catch (error) {
      console.error('Error updating individual product:', error);
      return { data: null, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async deleteIndividualProduct(id: string) {
    try {
      const { error } = await supabase
        .from('individual_products')
        .delete()
        .eq('id', id);

      if (error) {
        handleSupabaseError(error);
        return { error: error.message };
      }

      return { error: null };
    } catch (error) {
      console.error('Error deleting individual product:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async getIndividualProductsByStatus(status: string) {
    try {
      const { data, error } = await supabase
        .from('individual_products')
        .select('*')
        .eq('status', status)
        .order('created_at', { ascending: false });

      if (error) {
        handleSupabaseError(error);
        return { data: [], error: error.message };
      }

      return { data: data || [], error: null };
    } catch (error) {
      console.error('Error fetching individual products by status:', error);
      return { data: [], error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async getIndividualProductsByProductId(productId: string) {
    try {
      const { data, error } = await supabase
        .from('individual_products')
        .select('*')
        .eq('product_id', productId)
        .order('created_at', { ascending: false });

      if (error) {
        handleSupabaseError(error);
        return { data: [], error: error.message };
      }

      return { data: data || [], error: null };
    } catch (error) {
      console.error('Error fetching individual products by product ID:', error);
      return { data: [], error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Generate QR code for individual products
  private generateQRCode(productId: string, batchNumber?: string): string {
    return IDGenerator.generateQRCode();
  }
}

export const individualProductService = new IndividualProductService();
