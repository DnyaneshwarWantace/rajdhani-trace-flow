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
  width?: string;
  length?: string;
  final_weight?: string;
  final_width?: string;
  final_length?: string;
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
  width?: string;
  length?: string;
  final_weight?: string;
  final_width?: string;
  final_length?: string;
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
  async createIndividualProduct(data: CreateIndividualProductData, maxRetries: number = 3) {
    let attempts = 0;
    
    while (attempts < maxRetries) {
      try {
        attempts++;
        
        // Generate globally unique ID if not provided or if this is a retry
        if (!data.id || attempts > 1) {
          try {
            data.id = await IDGenerator.generateIndividualProductId();
          } catch (error) {
            console.warn('Failed to generate unique ID via database check, using simple method:', error);
            data.id = IDGenerator.generateIndividualProductIdSimple();
          }
        }
        
        // Generate QR code if not provided
        if (!data.qr_code) {
          data.qr_code = await this.generateQRCode(data.product_id, data.batch_number);
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
        
        console.log(`🔍 Creating individual product (attempt ${attempts}/${maxRetries}) with client:`, client ? 'configured' : 'null');
        console.log('🔍 Data being inserted:', data);
        
        const { data: result, error } = await client
          .from('individual_products')
          .insert([data])
          .select('*')
          .single();

        if (error) {
          // Check if it's a duplicate key error
          if (error.code === '23505' && error.message.includes('duplicate key value violates unique constraint')) {
            console.warn(`⚠️ Duplicate key error on attempt ${attempts}, retrying with new ID...`);
            
            if (attempts < maxRetries) {
              // Add a small delay before retry
              await new Promise(resolve => setTimeout(resolve, 100 * attempts));
              continue; // Retry with new ID
            } else {
              console.error('❌ Max retries reached for duplicate key error');
              return { data: null, error: `Failed to create individual product after ${maxRetries} attempts due to duplicate key conflicts` };
            }
          }
          
          // Check for other constraint violations that might be retryable
          if (error.code === '23503' && error.message.includes('foreign key constraint')) {
            console.warn(`⚠️ Foreign key constraint error on attempt ${attempts}, retrying...`);
            
            if (attempts < maxRetries) {
              // Add a longer delay for foreign key constraint errors
              await new Promise(resolve => setTimeout(resolve, 200 * attempts));
              continue; // Retry
            } else {
              console.error('❌ Max retries reached for foreign key constraint error');
              return { data: null, error: `Failed to create individual product after ${maxRetries} attempts due to foreign key constraint violations` };
            }
          }
          
          console.error('❌ Database error creating individual product:', error);
          handleSupabaseError(error);
          return { data: null, error: error.message };
        }

        console.log('✅ Individual product created successfully in database:', result);
        console.log('✅ Database returned:', result?.product_name || result?.qr_code);
        return { data: result, error: null };
        
      } catch (error) {
        console.error(`Error creating individual product (attempt ${attempts}):`, error);
        
        if (attempts >= maxRetries) {
          return { data: null, error: error instanceof Error ? error.message : 'Unknown error' };
        }
        
        // Add delay before retry
        await new Promise(resolve => setTimeout(resolve, 100 * attempts));
      }
    }
    
    return { data: null, error: `Failed to create individual product after ${maxRetries} attempts` };
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
  private async generateQRCode(productId: string, batchNumber?: string): Promise<string> {
    return await IDGenerator.generateQRCode();
  }
}

export const individualProductService = new IndividualProductService();
