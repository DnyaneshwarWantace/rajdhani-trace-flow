/**
 * ManageStock Service - MongoDB API
 * Handles all purchase order operations for the ManageStock page
 */

import { getAuthHeaders, handleAuthError } from '@/utils/apiClient';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://rajdhani.wantace.com/api';

export interface StockOrder {
  id: string;
  order_number: string;
  materialName: string;
  materialBrand?: string;
  materialCategory?: string;
  materialBatchNumber?: string;
  supplier: string;
  supplier_id?: string;
  quantity: number;
  unit: string;
  costPerUnit: number;
  totalCost: number;
  orderDate: string;
  expectedDelivery: string;
  status: 'ordered' | 'pending' | 'approved' | 'shipped' | 'in-transit' | 'delivered' | 'cancelled';
  notes?: string;
  actualDelivery?: string;
  minThreshold?: number;
  maxCapacity?: number;
  qualityGrade?: string;
  isRestock?: boolean;
}

export interface CreateStockOrderData {
  id: string;
  order_number: string;
  supplier_name: string;
  supplier_id?: string;
  order_date: string;
  expected_delivery: string;
  total_amount: number;
  status: 'pending' | 'approved' | 'shipped' | 'delivered' | 'cancelled';
  material_details: {
    materialName: string;
    materialBrand?: string;
    materialCategory?: string;
    materialBatchNumber?: string;
    quantity: number;
    unit: string;
    costPerUnit: number;
    minThreshold?: number;
    maxCapacity?: number;
    qualityGrade?: string;
    isRestock?: boolean;
    userNotes?: string;
  };
}

export interface OrderStats {
  totalOrders: number;
  totalValue: number;
  pendingOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  ordersByStatus: {
    pending: number;
    approved: number;
    shipped: number;
    delivered: number;
    cancelled: number;
  };
}

export class ManageStockService {
  /**
   * Create a new purchase order
   */
  static async createOrder(orderData: CreateStockOrderData): Promise<{ data: any | null; error: string | null }> {
    try {
      const response = await fetch(`${API_BASE_URL}/purchase-orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      });

      const result = await response.json();

      if (!response.ok) {
        return { data: null, error: result.error || 'Failed to create order' };
      }

      return { data: result.data, error: null };
    } catch (error) {
      console.error('Error creating order:', error);
      return { data: null, error: 'Failed to create order' };
    }
  }

  /**
   * Get all purchase orders with filtering
   */
  static async getOrders(filters?: {
    search?: string;
    status?: string;
    supplier_id?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ data: any[] | null; error: string | null; count?: number }> {
    try {
      const params = new URLSearchParams();

      if (filters?.search) params.append('search', filters.search);
      if (filters?.status && filters.status !== 'all') params.append('status', filters.status);
      if (filters?.supplier_id) params.append('supplier_id', filters.supplier_id);
      if (filters?.limit) params.append('limit', filters.limit.toString());
      if (filters?.offset) params.append('offset', filters.offset.toString());

      const response = await fetch(`${API_BASE_URL}/purchase-orders?${params}`);
      const result = await response.json();

      if (!response.ok) {
        return { data: null, error: result.error || 'Failed to fetch orders' };
      }

      // Transform MongoDB data to match frontend interface
      const transformedOrders = (result.data || []).map((order: any) => {
        const materialDetails = order.material_details || {};

        return {
          id: order.id,
          order_number: order.order_number,
          materialName: materialDetails.materialName || 'Material Order',
          materialBrand: materialDetails.materialBrand || 'Unknown',
          materialCategory: materialDetails.materialCategory || 'Other',
          materialBatchNumber: materialDetails.materialBatchNumber || `BATCH-${order.id}`,
          supplier: order.supplier_name,
          supplier_id: order.supplier_id,
          quantity: materialDetails.quantity || 0,
          unit: materialDetails.unit || 'units',
          costPerUnit: materialDetails.costPerUnit || 0,
          totalCost: order.total_amount,
          orderDate: order.order_date,
          expectedDelivery: order.expected_delivery,
          status: order.status === 'pending' ? 'ordered' : order.status,
          notes: materialDetails.userNotes || '',
          actualDelivery: order.actual_delivery,
          minThreshold: materialDetails.minThreshold || 100,
          maxCapacity: materialDetails.maxCapacity || 1000,
          qualityGrade: materialDetails.qualityGrade || 'A',
          isRestock: materialDetails.isRestock || false
        } as StockOrder;
      });

      return { data: transformedOrders, error: null, count: result.count };
    } catch (error) {
      console.error('Error fetching orders:', error);
      return { data: null, error: 'Failed to fetch orders' };
    }
  }

  /**
   * Get order by ID
   */
  static async getOrderById(orderId: string): Promise<{ data: StockOrder | null; error: string | null }> {
    try {
      const response = await fetch(`${API_BASE_URL}/purchase-orders/${orderId}`);
      const result = await response.json();

      if (!response.ok) {
        return { data: null, error: result.error || 'Failed to fetch order' };
      }

      // Transform to frontend format
      const order = result.data;
      const materialDetails = order.material_details || {};

      const transformedOrder: StockOrder = {
        id: order.id,
        order_number: order.order_number,
        materialName: materialDetails.materialName || 'Material Order',
        materialBrand: materialDetails.materialBrand,
        materialCategory: materialDetails.materialCategory,
        materialBatchNumber: materialDetails.materialBatchNumber,
        supplier: order.supplier_name,
        supplier_id: order.supplier_id,
        quantity: materialDetails.quantity || 0,
        unit: materialDetails.unit || 'units',
        costPerUnit: materialDetails.costPerUnit || 0,
        totalCost: order.total_amount,
        orderDate: order.order_date,
        expectedDelivery: order.expected_delivery,
        status: order.status === 'pending' ? 'ordered' : order.status,
        notes: materialDetails.userNotes,
        actualDelivery: order.actual_delivery,
        minThreshold: materialDetails.minThreshold,
        maxCapacity: materialDetails.maxCapacity,
        qualityGrade: materialDetails.qualityGrade,
        isRestock: materialDetails.isRestock
      };

      return { data: transformedOrder, error: null };
    } catch (error) {
      console.error('Error fetching order:', error);
      return { data: null, error: 'Failed to fetch order' };
    }
  }

  /**
   * Update order status
   * This triggers automatic workflow actions (material status updates, stock updates, etc.)
   */
  static async updateOrderStatus(orderId: string, newStatus: StockOrder['status']): Promise<{ data: any | null; error: string | null }> {
    try {
      // Map frontend status to backend status
      const backendStatus = newStatus === 'ordered' ? 'pending' : newStatus;

      const response = await fetch(`${API_BASE_URL}/purchase-orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ newStatus: backendStatus }),
      });

      const result = await response.json();

      if (!response.ok) {
        return { data: null, error: result.error || 'Failed to update order status' };
      }

      return { data: result.data, error: null };
    } catch (error) {
      console.error('Error updating order status:', error);
      return { data: null, error: 'Failed to update order status' };
    }
  }

  /**
   * Get order statistics for dashboard cards
   */
  static async getOrderStats(): Promise<{ data: OrderStats | null; error: string | null }> {
    try {
      const response = await fetch(`${API_BASE_URL}/purchase-orders/stats`, {
        headers: getAuthHeaders()
      });
      await handleAuthError(response);
      const result = await response.json();

      if (!response.ok) {
        return { data: null, error: result.error || 'Failed to fetch order stats' };
      }

      return { data: result.data, error: null };
    } catch (error) {
      console.error('Error fetching order stats:', error);
      return { data: null, error: 'Failed to fetch order stats' };
    }
  }

  /**
   * Delete purchase order
   */
  static async deleteOrder(orderId: string): Promise<{ success: boolean; error: string | null }> {
    try {
      const response = await fetch(`${API_BASE_URL}/purchase-orders/${orderId}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (!response.ok) {
        return { success: false, error: result.error || 'Failed to delete order' };
      }

      return { success: true, error: null };
    } catch (error) {
      console.error('Error deleting order:', error);
      return { success: false, error: 'Failed to delete order' };
    }
  }

  /**
   * Helper: Check for duplicate orders before creating
   */
  static async checkForDuplicates(materialName: string, supplier: string, timeWindowMinutes: number = 5): Promise<boolean> {
    try {
      const fiveMinutesAgo = new Date(Date.now() - timeWindowMinutes * 60 * 1000).toISOString();

      const { data: orders } = await this.getOrders({
        search: materialName,
        status: 'pending',
        limit: 100
      });

      if (!orders) return false;

      // Check if any recent order matches
      const duplicates = orders.filter(order => {
        const orderDate = new Date(order.orderDate);
        return (
          order.materialName === materialName &&
          order.supplier === supplier &&
          order.status === 'ordered' &&
          orderDate >= new Date(fiveMinutesAgo)
        );
      });

      return duplicates.length > 0;
    } catch (error) {
      console.error('Error checking for duplicates:', error);
      return false;
    }
  }
}

export default ManageStockService;
