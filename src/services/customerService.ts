import { supabase, supabaseAdmin, handleSupabaseError, Customer } from '@/lib/supabase';
import { generateUniqueId, IDGenerator } from '@/lib/idGenerator';
import { logAudit } from './auditService';

export interface CreateCustomerData {
  name: string;
  email: string;
  phone: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  customer_type: 'individual' | 'business';
  gst_number?: string;
  company_name?: string;
  credit_limit?: number;
}

export interface UpdateCustomerData extends Partial<CreateCustomerData> {
  status?: 'active' | 'inactive' | 'suspended' | 'new';
  total_orders?: number;
  total_value?: number;
  outstanding_amount?: number;
}

export class CustomerService {
  // Create a new customer
  static async createCustomer(customerData: CreateCustomerData): Promise<{ data: Customer | null; error: string | null }> {
    try {
      // Validate required fields
      if (!customerData.name?.trim()) {
        return { data: null, error: 'Customer name is required' };
      }
      if (!customerData.email?.trim()) {
        return { data: null, error: 'Customer email is required' };
      }
      if (!customerData.phone?.trim()) {
        return { data: null, error: 'Customer phone is required' };
      }

      // Check if email already exists
      const client = supabaseAdmin || supabase;
      const { data: existingCustomer } = await client
        .from('customers')
        .select('email')
        .eq('email', customerData.email.toLowerCase().trim())
        .single();

      if (existingCustomer) {
        return { data: null, error: 'A customer with this email already exists' };
      }

      // Generate globally unique customer ID
      const customerId = await IDGenerator.generateUniqueCustomerId();

      // Prepare customer data for insertion
      const newCustomer = {
        id: customerId,
        name: customerData.name.trim(),
        email: customerData.email.toLowerCase().trim(),
        phone: customerData.phone.trim(),
        address: customerData.address?.trim() || '',
        city: customerData.city?.trim() || '',
        state: customerData.state?.trim() || '',
        pincode: customerData.pincode?.trim() || '',
        customer_type: customerData.customer_type,
        status: 'active' as const,
        total_orders: 0,
        total_value: 0,
        outstanding_amount: 0,
        registration_date: new Date().toISOString().split('T')[0],
        gst_number: customerData.gst_number?.trim() || null,
        company_name: customerData.company_name?.trim() || null,
        credit_limit: customerData.credit_limit || 0
      };

      const { data, error } = await client
        .from('customers')
        .insert(newCustomer)
        .select()
        .single();

      if (error) {
        console.error('Error creating customer:', error);
        return { data: null, error: handleSupabaseError(error) };
      }

      // Log audit
      await logAudit('customer_created', 'customers', data.id, data.name, {
        customer_data: data
      });

      console.log('✅ Customer created successfully:', data.name);
      return { data, error: null };

    } catch (error) {
      console.error('Error in createCustomer:', error);
      return { data: null, error: 'Failed to create customer' };
    }
  }

  // Get all customers with optional filtering
  static async getCustomers(filters?: {
    search?: string;
    status?: string;
    customer_type?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ data: Customer[] | null; error: string | null; count?: number }> {
    try {
      // Use admin client to bypass RLS
      const client = supabaseAdmin || supabase;
      if (!client) {
        return { data: null, error: 'Supabase not configured' };
      }

      let query = client
        .from('customers')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters?.search) {
        const searchTerm = `%${filters.search.toLowerCase()}%`;
        query = query.or(`name.ilike.${searchTerm},email.ilike.${searchTerm},phone.ilike.${searchTerm}`);
      }

      if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }

      if (filters?.customer_type && filters.customer_type !== 'all') {
        query = query.eq('customer_type', filters.customer_type);
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
        console.error('Error fetching customers:', error);
        return { data: null, error: handleSupabaseError(error) };
      }

      return { data: data || [], error: null, count: count || 0 };

    } catch (error) {
      console.error('Error in getCustomers:', error);
      return { data: null, error: 'Failed to fetch customers' };
    }
  }

  // Get a single customer by ID
  static async getCustomerById(customerId: string): Promise<{ data: Customer | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', customerId)
        .single();

      if (error) {
        console.error('Error fetching customer:', error);
        return { data: null, error: handleSupabaseError(error) };
      }

      return { data, error: null };

    } catch (error) {
      console.error('Error in getCustomerById:', error);
      return { data: null, error: 'Failed to fetch customer' };
    }
  }

  // Update a customer
  static async updateCustomer(customerId: string, updateData: UpdateCustomerData): Promise<{ data: Customer | null; error: string | null }> {
    try {
      // Get current customer data for audit
      const { data: currentCustomer } = await this.getCustomerById(customerId);
      if (!currentCustomer) {
        return { data: null, error: 'Customer not found' };
      }

      // Check email uniqueness if email is being updated
      if (updateData.email && updateData.email !== currentCustomer.email) {
        const { data: existingCustomer } = await supabase
          .from('customers')
          .select('email')
          .eq('email', updateData.email.toLowerCase().trim())
          .neq('id', customerId)
          .single();

        if (existingCustomer) {
          return { data: null, error: 'A customer with this email already exists' };
        }
      }

      // Prepare update data
      const cleanUpdateData = {
        ...(updateData.name && { name: updateData.name.trim() }),
        ...(updateData.email && { email: updateData.email.toLowerCase().trim() }),
        ...(updateData.phone && { phone: updateData.phone.trim() }),
        ...(updateData.address !== undefined && { address: updateData.address.trim() }),
        ...(updateData.city !== undefined && { city: updateData.city.trim() }),
        ...(updateData.state !== undefined && { state: updateData.state.trim() }),
        ...(updateData.pincode !== undefined && { pincode: updateData.pincode.trim() }),
        ...(updateData.customer_type && { customer_type: updateData.customer_type }),
        ...(updateData.status && { status: updateData.status }),
        ...(updateData.gst_number !== undefined && { gst_number: updateData.gst_number?.trim() || null }),
        ...(updateData.company_name !== undefined && { company_name: updateData.company_name?.trim() || null }),
        ...(updateData.credit_limit !== undefined && { credit_limit: updateData.credit_limit }),
        ...(updateData.total_orders !== undefined && { total_orders: updateData.total_orders }),
        ...(updateData.total_value !== undefined && { total_value: updateData.total_value }),
        ...(updateData.outstanding_amount !== undefined && { outstanding_amount: updateData.outstanding_amount })
      };

      const { data, error } = await supabase
        .from('customers')
        .update(cleanUpdateData)
        .eq('id', customerId)
        .select()
        .single();

      if (error) {
        console.error('Error updating customer:', error);
        return { data: null, error: handleSupabaseError(error) };
      }

      // Log audit
      await logAudit('customer_updated', 'customers', data.id, data.name, {
        updated_fields: Object.keys(cleanUpdateData),
        previous_state: currentCustomer,
        new_state: data
      });

      console.log('✅ Customer updated successfully:', data.name);
      return { data, error: null };

    } catch (error) {
      console.error('Error in updateCustomer:', error);
      return { data: null, error: 'Failed to update customer' };
    }
  }

  // Delete a customer (soft delete by setting status to inactive)
  static async deleteCustomer(customerId: string): Promise<{ success: boolean; error: string | null }> {
    try {
      // Get current customer data for audit
      const { data: currentCustomer } = await this.getCustomerById(customerId);
      if (!currentCustomer) {
        return { success: false, error: 'Customer not found' };
      }

      // Check if customer has active orders
      const { data: activeOrders } = await supabase
        .from('orders')
        .select('id')
        .eq('customer_id', customerId)
        .in('status', ['pending', 'accepted', 'in_production', 'ready', 'dispatched']);

      if (activeOrders && activeOrders.length > 0) {
        return { success: false, error: 'Cannot delete customer with active orders. Cancel or complete all orders first.' };
      }

      // Soft delete by setting status to inactive
      const { error } = await supabase
        .from('customers')
        .update({ status: 'inactive' })
        .eq('id', customerId);

      if (error) {
        console.error('Error deleting customer:', error);
        return { success: false, error: handleSupabaseError(error) };
      }

      // Log audit
      await logAudit('customer_deleted', 'customers', customerId, currentCustomer.name, {
        customer_data: currentCustomer
      });

      console.log('✅ Customer deleted (deactivated) successfully:', currentCustomer.name);
      return { success: true, error: null };

    } catch (error) {
      console.error('Error in deleteCustomer:', error);
      return { success: false, error: 'Failed to delete customer' };
    }
  }

  // Get customer statistics
  static async getCustomerStats(): Promise<{
    total: number;
    active: number;
    business: number;
    individual: number;
    totalRevenue: number;
    averageOrderValue: number;
  }> {
    try {
      const { data: customers, error } = await supabase
        .from('customers')
        .select('status, customer_type, total_value, total_orders');

      console.log('🔍 CustomerService.getCustomerStats - Raw data:', customers);
      console.log('🔍 CustomerService.getCustomerStats - Error:', error);

      if (!customers) return {
        total: 0,
        active: 0,
        business: 0,
        individual: 0,
        totalRevenue: 0,
        averageOrderValue: 0
      };

      const stats = customers.reduce((acc, customer) => {
        acc.total++;
        if (customer.status === 'active') acc.active++;
        if (customer.customer_type === 'business') acc.business++;
        if (customer.customer_type === 'individual') acc.individual++;
        acc.totalRevenue += customer.total_value || 0;
        return acc;
      }, {
        total: 0,
        active: 0,
        business: 0,
        individual: 0,
        totalRevenue: 0,
        averageOrderValue: 0
      });

      // Calculate average order value
      const totalOrders = customers.reduce((sum, c) => sum + (c.total_orders || 0), 0);
      stats.averageOrderValue = totalOrders > 0 ? stats.totalRevenue / totalOrders : 0;

      return stats;

    } catch (error) {
      console.error('Error getting customer stats:', error);
      return {
        total: 0,
        active: 0,
        business: 0,
        individual: 0,
        totalRevenue: 0,
        averageOrderValue: 0
      };
    }
  }

  // Update customer order statistics (called when orders are created/updated)
  static async updateCustomerOrderStats(customerId: string): Promise<void> {
    try {
      // Get all orders for this customer
      const { data: orders } = await supabase
        .from('orders')
        .select('total_amount, order_date, status')
        .eq('customer_id', customerId);

      if (!orders) return;

      // Calculate statistics
      const totalOrders = orders.length;
      const totalValue = orders.reduce((sum, order) => sum + (order.total_amount || 0), 0);
      const lastOrderDate = orders.length > 0
        ? orders.sort((a, b) => new Date(b.order_date).getTime() - new Date(a.order_date).getTime())[0].order_date
        : null;

      // Calculate outstanding amount from pending/accepted orders
      const outstandingAmount = orders
        .filter(order => ['pending', 'accepted', 'in_production', 'ready', 'dispatched'].includes(order.status))
        .reduce((sum, order) => sum + (order.total_amount || 0), 0);

      // Update customer record
      await supabase
        .from('customers')
        .update({
          total_orders: totalOrders,
          total_value: totalValue,
          last_order_date: lastOrderDate,
          outstanding_amount: outstandingAmount
        })
        .eq('id', customerId);

      console.log(`✅ Updated order stats for customer ${customerId}`);

    } catch (error) {
      console.error('Error updating customer order stats:', error);
    }
  }

  // Get customer order history
  static async getCustomerOrderHistory(customerId: string, limit: number = 10): Promise<{ data: any[] | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            *,
            order_item_products (
              individual_products (*)
            )
          )
        `)
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching customer order history:', error);
        return { data: null, error: handleSupabaseError(error) };
      }

      return { data: data || [], error: null };

    } catch (error) {
      console.error('Error in getCustomerOrderHistory:', error);
      return { data: null, error: 'Failed to fetch customer order history' };
    }
  }
}

export default CustomerService;