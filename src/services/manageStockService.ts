/**
 * ManageStock Service - MongoDB API
 * Handles all purchase order operations for the ManageStock page
 */

import { getApiUrl } from '@/utils/apiConfig';

const API_URL = getApiUrl();

export interface StockOrder {
  id: string;
  order_number: string;
  materialName: string;
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
  id?: string; // Optional - backend generates if not provided
  order_number?: string; // Optional - backend generates if not provided
  supplier_name: string;
  supplier_id?: string;
  order_date: string;
  expected_delivery: string;
  total_amount: number;
  status: 'pending' | 'approved' | 'shipped' | 'delivered' | 'cancelled';
  material_details: {
    materialName: string;
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
  items?: Array<{
    material_id: string;
    material_name: string;
    quantity: number;
    unit: string;
    unit_price: number;
    total_price: number;
  }>;
}

export interface OrderStats {
  totalOrders: number;
  totalValue: number;
  pendingOrders: number;
  deliveredOrders: number;
}

export class ManageStockService {
  private static getHeaders(): HeadersInit {
    const token = localStorage.getItem('auth_token');
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
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
  }): Promise<{ data: StockOrder[]; count: number }> {
    try {
      const params = new URLSearchParams();

      if (filters?.search) params.append('search', filters.search);
      if (filters?.status && filters.status !== 'all') params.append('status', filters.status === 'ordered' ? 'pending' : filters.status);
      if (filters?.supplier_id) params.append('supplier_id', filters.supplier_id);
      if (filters?.limit) params.append('limit', filters.limit.toString());
      if (filters?.offset) params.append('offset', filters.offset.toString());

      const response = await fetch(`${API_URL}/purchase-orders?${params}`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch orders');
      }

      const result = await response.json();

      // Transform MongoDB data to match frontend interface
      const transformedOrders = (result.data || []).map((order: any) => {
        const materialDetails = order.material_details || {};
        
        // Calculate quantity and costPerUnit from items array if available
        let quantity = 0;
        let unit = 'units';
        let costPerUnit = 0;
        let materialName = 'Material Order';
        
        if (order.items && order.items.length > 0) {
          // New format: data in items array
          // Sum up quantities from all items
          quantity = order.items.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0);
          // Use the unit from the first item
          unit = order.items[0].unit || 'units';
          // Calculate weighted average cost per unit
          const totalCost = order.items.reduce((sum: number, item: any) => sum + (item.total_price || 0), 0);
          costPerUnit = quantity > 0 ? totalCost / quantity : 0;
          materialName = order.items[0].material_name || materialName;
        } else if (materialDetails && (materialDetails.quantity || materialDetails.materialName)) {
          // Old format: data in material_details
          quantity = materialDetails.quantity || 0;
          unit = materialDetails.unit || 'units';
          costPerUnit = materialDetails.costPerUnit || 0;
          materialName = materialDetails.materialName || materialName;
        } else if (typeof order.notes === 'string' && order.notes.startsWith('{')) {
          // Try parsing notes as JSON (some old orders stored data in notes)
          try {
            const notesData = JSON.parse(order.notes);
            if (notesData.materialName) {
              quantity = notesData.quantity || 0;
              unit = notesData.unit || 'units';
              costPerUnit = notesData.costPerUnit || 0;
              materialName = notesData.materialName || materialName;
            }
          } catch (e) {
            // Not JSON, ignore
          }
        }

        return {
          id: order.id,
          order_number: order.order_number,
          materialName: materialName,
          materialCategory: materialDetails.materialCategory || 'Other',
          materialBatchNumber: materialDetails.materialBatchNumber || `BATCH-${order.id}`,
          supplier: order.supplier_name,
          supplier_id: order.supplier_id,
          quantity: quantity,
          unit: unit,
          costPerUnit: costPerUnit,
          totalCost: order.total_amount || order.pricing?.total_amount || 0,
          orderDate: order.order_date,
          expectedDelivery: order.expected_delivery,
          status: order.status === 'pending' ? 'ordered' : (order.status === 'shipped' ? 'in-transit' : order.status),
          notes: materialDetails.userNotes || materialDetails.notes || order.notes || '',
          actualDelivery: order.actual_delivery,
          minThreshold: materialDetails.minThreshold || 100,
          maxCapacity: materialDetails.maxCapacity || 1000,
          qualityGrade: materialDetails.qualityGrade || 'A',
          isRestock: materialDetails.isRestock || false,
          created_by: order.created_by,
          createdAt: order.createdAt || order.created_at,
          created_at: order.created_at || order.createdAt,
          status_history: order.status_history || []
        } as StockOrder;
      });

      return { data: transformedOrders, count: result.count || transformedOrders.length };
    } catch (error) {
      console.error('Error fetching orders:', error);
      return { data: [], count: 0 };
    }
  }

  /**
   * Get order by ID
   */
  static async getOrderById(orderId: string): Promise<StockOrder | null> {
    try {
      const response = await fetch(`${API_URL}/purchase-orders/${orderId}`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch order');
      }

      const result = await response.json();
      const order = result.data;
      const materialDetails = order.material_details || {};
      
      // Calculate quantity and costPerUnit from items array if available
      let quantity = 0;
      let unit = 'units';
      let costPerUnit = 0;
      
      if (order.items && order.items.length > 0) {
        // Sum up quantities from all items
        quantity = order.items.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0);
        // Use the unit from the first item
        unit = order.items[0].unit || 'units';
        // Calculate weighted average cost per unit
        const totalCost = order.items.reduce((sum: number, item: any) => sum + (item.total_price || 0), 0);
        costPerUnit = quantity > 0 ? totalCost / quantity : 0;
      } else {
        // Fall back to material_details if items array is not available
        quantity = materialDetails.quantity || 0;
        unit = materialDetails.unit || 'units';
        costPerUnit = materialDetails.costPerUnit || 0;
      }

      return {
        id: order.id,
        order_number: order.order_number,
        materialName: materialDetails.materialName || (order.items && order.items.length > 0 ? order.items[0].material_name : 'Material Order'),
        materialCategory: materialDetails.materialCategory,
        materialBatchNumber: materialDetails.materialBatchNumber,
        supplier: order.supplier_name,
        supplier_id: order.supplier_id,
        quantity: quantity,
        unit: unit,
        costPerUnit: costPerUnit,
        totalCost: order.total_amount || order.pricing?.total_amount || 0,
        orderDate: order.order_date,
        expectedDelivery: order.expected_delivery,
        status: order.status === 'pending' ? 'ordered' : order.status,
        notes: materialDetails.userNotes || order.notes || '',
        actualDelivery: order.actual_delivery,
        minThreshold: materialDetails.minThreshold,
        maxCapacity: materialDetails.maxCapacity,
        qualityGrade: materialDetails.qualityGrade,
        isRestock: materialDetails.isRestock,
        created_by: order.created_by,
        createdAt: order.createdAt || order.created_at,
        created_at: order.created_at || order.createdAt,
        status_history: order.status_history || []
      } as StockOrder;
    } catch (error) {
      console.error('Error fetching order:', error);
      return null;
    }
  }

  /**
   * Update order status
   */
  static async updateOrderStatus(orderId: string, newStatus: StockOrder['status']): Promise<{ success: boolean; error?: string }> {
    try {
      // Map frontend status to backend status (same as old code)
      const backendStatus = newStatus === 'ordered' ? 'pending' : 
                           newStatus === 'in-transit' ? 'shipped' : newStatus;

      const response = await fetch(`${API_URL}/purchase-orders/${orderId}/status`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify({ newStatus: backendStatus }),
      });

      if (!response.ok) {
        const result = await response.json();
        return { success: false, error: result.error || 'Failed to update order status' };
      }

      return { success: true };
    } catch (error) {
      console.error('Error updating order status:', error);
      return { success: false, error: 'Failed to update order status' };
    }
  }

  /**
   * Create a new purchase order
   */
  static async createOrder(orderData: CreateStockOrderData): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const response = await fetch(`${API_URL}/purchase-orders`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(orderData),
      });

      if (!response.ok) {
        const result = await response.json();
        return { success: false, error: result.error || 'Failed to create order' };
      }

      const result = await response.json();
      return { success: true, data: result.data };
    } catch (error) {
      console.error('Error creating order:', error);
      return { success: false, error: 'Failed to create order' };
    }
  }

  /**
   * Get order statistics
   */
  static async getOrderStats(): Promise<OrderStats> {
    try {
      const { data: orders } = await this.getOrders({ limit: 1000 });

      const totalOrders = orders.length;
      const totalValue = orders.reduce((sum, order) => sum + order.totalCost, 0);
      const pendingOrders = orders.filter(order => 
        order.status === 'ordered' || 
        order.status === 'pending' || 
        order.status === 'approved' || 
        order.status === 'shipped' || 
        order.status === 'in-transit'
      ).length;
      const deliveredOrders = orders.filter(order => order.status === 'delivered').length;

      return {
        totalOrders,
        totalValue,
        pendingOrders,
        deliveredOrders,
      };
    } catch (error) {
      console.error('Error fetching order stats:', error);
      return {
        totalOrders: 0,
        totalValue: 0,
        pendingOrders: 0,
        deliveredOrders: 0,
      };
    }
  }
}

