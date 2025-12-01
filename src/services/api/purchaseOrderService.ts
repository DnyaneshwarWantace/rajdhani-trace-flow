import { PurchaseOrder } from '@/lib/supabase';
import { getAuthHeaders, handleAuthError } from '@/utils/apiClient';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://rajdhani.wantace.com/api';

export interface CreatePurchaseOrderData {
  id: string;
  order_number: string;
  supplier_id?: string;
  supplier_name: string;
  order_date: string;
  expected_delivery?: string;
  actual_delivery?: string;
  total_amount: number;
  paid_amount?: number;
  status: 'pending' | 'approved' | 'shipped' | 'delivered' | 'cancelled';
  notes?: string;
  material_details?: any;
  created_by?: string;
}

export class PurchaseOrderService {
  // Create a new purchase order
  static async createPurchaseOrder(orderData: CreatePurchaseOrderData): Promise<{ data: PurchaseOrder | null; error: string | null }> {
    try {
      const response = await fetch(`${API_BASE_URL}/purchase-orders`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(orderData),
      });

      const result = await response.json();

      if (!response.ok) {
        return { data: null, error: result.error || 'Failed to create purchase order' };
      }

      return { data: result.data, error: null };
    } catch (error) {
      console.error('Error in createPurchaseOrder:', error);
      return { data: null, error: 'Failed to create purchase order' };
    }
  }

  // Get all purchase orders with filtering
  static async getPurchaseOrders(filters?: {
    search?: string;
    status?: string;
    supplier_id?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ data: PurchaseOrder[] | null; error: string | null; count?: number }> {
    try {
      const params = new URLSearchParams();

      if (filters?.search) params.append('search', filters.search);
      if (filters?.status) params.append('status', filters.status);
      if (filters?.supplier_id) params.append('supplier_id', filters.supplier_id);
      if (filters?.limit) params.append('limit', filters.limit.toString());
      if (filters?.offset) params.append('offset', filters.offset.toString());

      const response = await fetch(`${API_BASE_URL}/purchase-orders?${params}`, {
        headers: getAuthHeaders()
      });
      await handleAuthError(response);
      const result = await response.json();

      if (!response.ok) {
        return { data: null, error: result.error || 'Failed to fetch purchase orders' };
      }

      return { data: result.data, error: null, count: result.count };
    } catch (error) {
      console.error('Error in getPurchaseOrders:', error);
      return { data: null, error: 'Failed to fetch purchase orders' };
    }
  }

  // Get purchase order by ID
  static async getPurchaseOrderById(orderId: string): Promise<{ data: PurchaseOrder | null; error: string | null }> {
    try {
      const response = await fetch(`${API_BASE_URL}/purchase-orders/${orderId}`, {
        headers: getAuthHeaders()
      });
      
      await handleAuthError(response);
      
      // Handle 404 gracefully - order doesn't exist
      if (response.status === 404) {
        return { data: null, error: null }; // Return null without error for 404
      }
      
      const result = await response.json();

      if (!response.ok) {
        return { data: null, error: result.error || 'Failed to fetch purchase order' };
      }

      return { data: result.data, error: null };
    } catch (error) {
      console.error('Error in getPurchaseOrderById:', error);
      return { data: null, error: 'Failed to fetch purchase order' };
    }
  }

  // Update purchase order
  static async updatePurchaseOrder(orderId: string, updateData: Partial<CreatePurchaseOrderData>): Promise<{ data: PurchaseOrder | null; error: string | null }> {
    try {
      const response = await fetch(`${API_BASE_URL}/purchase-orders/${orderId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(updateData),
      });

      const result = await response.json();

      if (!response.ok) {
        return { data: null, error: result.error || 'Failed to update purchase order' };
      }

      return { data: result.data, error: null };
    } catch (error) {
      console.error('Error in updatePurchaseOrder:', error);
      return { data: null, error: 'Failed to update purchase order' };
    }
  }

  // Delete purchase order
  static async deletePurchaseOrder(orderId: string): Promise<{ success: boolean; error: string | null }> {
    try {
      const response = await fetch(`${API_BASE_URL}/purchase-orders/${orderId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      await handleAuthError(response);
      const result = await response.json();

      if (!response.ok) {
        return { success: false, error: result.error || 'Failed to delete purchase order' };
      }

      return { success: true, error: null };
    } catch (error) {
      console.error('Error in deletePurchaseOrder:', error);
      return { success: false, error: 'Failed to delete purchase order' };
    }
  }
}

export default PurchaseOrderService;
