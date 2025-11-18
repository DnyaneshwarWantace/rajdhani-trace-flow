import AuthService from './authService';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://rajdhani.wantace.com/api';

// Helper function to get headers with auth token
const getHeaders = () => {
  const token = AuthService.getToken();
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  };
};

export interface CreateOrderData {
  customer_id?: string;
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  expected_delivery?: string;
  items: CreateOrderItemData[];
  gst_rate?: number;
  discount_amount?: number;
  paid_amount?: number;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  special_instructions?: string;
  delivery_address?: {
    address: string;
    city: string;
    state: string;
    pincode: string;
  };
}

export interface CreateOrderItemData {
  product_id?: string;
  product_name: string;
  product_type: 'product' | 'raw_material';
  quantity: number;
  unit_price: number;
  quality_grade?: string;
  specifications?: string;
  selected_individual_products?: string[];
}

export interface UpdateOrderData {
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  expected_delivery?: string;
  status?: 'pending' | 'accepted' | 'in_production' | 'ready' | 'dispatched' | 'delivered' | 'cancelled';
  workflow_step?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  special_instructions?: string;
  paid_amount?: number;
  total_amount?: number;
  outstanding_amount?: number;
  subtotal?: number;
  gst_amount?: number;
  items?: Array<{
    id: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    selected_individual_products?: string[];
  }>;
}

export interface Order {
  id: string;
  order_number: string;
  customer_id?: string;
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  order_date: string;
  expected_delivery?: string;
  subtotal: string;
  gst_rate: string;
  gst_amount: string;
  gst_included: boolean;
  discount_amount: string;
  total_amount: string;
  paid_amount: string;
  outstanding_amount: string;
  payment_method: string;
  payment_terms: string;
  due_date?: string;
  status: string;
  workflow_step: string;
  priority: string;
  accepted_at?: string;
  dispatched_at?: string;
  delivered_at?: string;
  delivery_address?: string;
  special_instructions?: string;
  notes?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  order_items?: OrderItem[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id?: string;
  individual_product_id?: string;
  product_name: string;
  product_type: string;
  quantity: number;
  unit_price: string;
  total_price: string;
  quality_grade?: string;
  specifications?: string;
  selected_individual_products?: Array<{
    individual_product_id: string;
    qr_code: string;
    serial_number: string;
    status: string;
    allocated_at: string;
  }>;
  available_stock: number;
  individual_stock_tracking: boolean;
  raw_material_id?: string;
  supplier_id?: string;
  production_status: string;
  production_notes?: string;
  created_at: string;
  updated_at: string;
}

export class MongoDBOrderService {
  // Create a new order
  static async createOrder(orderData: CreateOrderData): Promise<{ data: Order | null; error: string | null }> {
    try {
      // Validate required fields
      if (!orderData.customer_name?.trim()) {
        return { data: null, error: 'Customer name is required' };
      }
      if (!orderData.items || orderData.items.length === 0) {
        return { data: null, error: 'Order must have at least one item' };
      }

      // Validate all order items
      for (const item of orderData.items) {
        if (!item.product_name?.trim()) {
          return { data: null, error: 'All items must have a product name' };
        }
        if (item.quantity <= 0) {
          return { data: null, error: 'All items must have quantity greater than 0' };
        }
        if (item.unit_price < 0) {
          return { data: null, error: 'Unit price cannot be negative' };
        }
      }

      // Prepare order data for MongoDB
      const orderPayload = {
        customer_id: orderData.customer_id || null,
        customer_name: orderData.customer_name.trim(),
        customer_email: orderData.customer_email?.trim() || null,
        customer_phone: orderData.customer_phone?.trim() || null,
        order_date: new Date().toISOString(),
        expected_delivery: orderData.expected_delivery || null,
        gst_rate: (orderData.gst_rate || 18).toString(),
        gst_included: true,
        discount_amount: (orderData.discount_amount || 0).toString(),
        paid_amount: (orderData.paid_amount || 0).toString(),
        status: 'accepted',
        workflow_step: 'accept',
        priority: orderData.priority || 'medium',
        special_instructions: orderData.special_instructions?.trim() || null,
        created_by: 'admin',
        delivery_address: orderData.delivery_address ? JSON.stringify(orderData.delivery_address) : null,
        items: orderData.items.map(item => ({
          product_id: item.product_id || null, // Use the actual product_id for both products and raw materials
          product_name: item.product_name.trim(),
          product_type: item.product_type,
          quantity: item.quantity,
          unit_price: item.unit_price.toString(),
          quality_grade: item.quality_grade?.trim() || 'A',
          specifications: item.specifications?.trim() || null,
          selected_individual_products: item.selected_individual_products || []
        }))
      };

      const response = await fetch(`${API_BASE_URL}/orders`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(orderPayload),
      });

      const result = await response.json();

      if (!response.ok) {
        return { data: null, error: result.error || 'Failed to create order' };
      }

      return { data: result.data, error: null };
    } catch (error) {
      console.error('Error creating order:', error);
      return { data: null, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Get all orders with optional filtering
  static async getOrders(filters?: {
    search?: string;
    status?: string;
    customer_id?: string;
    date_from?: string;
    date_to?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ data: Order[] | null; error: string | null; count?: number }> {
    try {
      const params = new URLSearchParams();
      
      if (filters?.search) params.append('search', filters.search);
      if (filters?.status) params.append('status', filters.status);
      if (filters?.customer_id) params.append('customer_id', filters.customer_id);
      if (filters?.date_from) params.append('date_from', filters.date_from);
      if (filters?.date_to) params.append('date_to', filters.date_to);
      if (filters?.limit) params.append('limit', filters.limit.toString());
      if (filters?.offset) params.append('offset', filters.offset.toString());

      const response = await fetch(`${API_BASE_URL}/orders?${params}`, {
        headers: getHeaders()
      });
      const result = await response.json();

      if (!response.ok) {
        return { data: null, error: result.error || 'Failed to fetch orders' };
      }

      return { data: result.data, error: null, count: result.count };
    } catch (error) {
      console.error('Error fetching orders:', error);
      return { data: null, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Get a single order by ID with full details
  static async getOrderById(orderId: string): Promise<{ data: Order | null; error: string | null }> {
    try {
      const response = await fetch(`${API_BASE_URL}/orders/${orderId}`, {
        headers: getHeaders()
      });
      const result = await response.json();

      if (!response.ok) {
        return { data: null, error: result.error || 'Failed to fetch order' };
      }

      return { data: result.data, error: null };
    } catch (error) {
      console.error('Error fetching order:', error);
      return { data: null, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Update an order
  static async updateOrder(orderId: string, updateData: UpdateOrderData): Promise<{ data: Order | null; error: string | null }> {
    try {
      const response = await fetch(`${API_BASE_URL}/orders/${orderId}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(updateData),
      });

      const result = await response.json();

      if (!response.ok) {
        return { data: null, error: result.error || 'Failed to update order' };
      }

      return { data: result.data, error: null };
    } catch (error) {
      console.error('Error updating order:', error);
      return { data: null, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Update order status
  static async updateOrderStatus(orderId: string, status: string): Promise<{ data: Order | null; error: string | null }> {
    try {
      const response = await fetch(`${API_BASE_URL}/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({ status }),
      });

      const result = await response.json();

      if (!response.ok) {
        return { data: null, error: result.error || 'Failed to update order status' };
      }

      return { data: result.data, error: null };
    } catch (error) {
      console.error('Error updating order status:', error);
      return { data: null, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Deliver an order
  static async deliverOrder(orderId: string): Promise<{ success: boolean; error: string | null }> {
    try {
      const response = await fetch(`${API_BASE_URL}/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({ status: 'delivered' }),
      });

      const result = await response.json();

      if (!response.ok) {
        return { success: false, error: result.error || 'Failed to deliver order' };
      }

      return { success: true, error: null };
    } catch (error) {
      console.error('Error delivering order:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Cancel an order
  static async cancelOrder(orderId: string, reason?: string): Promise<{ success: boolean; error: string | null }> {
    try {
      const response = await fetch(`${API_BASE_URL}/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({ status: 'cancelled' }),
      });

      const result = await response.json();

      if (!response.ok) {
        return { success: false, error: result.error || 'Failed to cancel order' };
      }

      return { success: true, error: null };
    } catch (error) {
      console.error('Error cancelling order:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Get order statistics
  static async getOrderStats(dateFrom?: string, dateTo?: string): Promise<{
    total: number;
    pending: number;
    accepted: number;
    inProduction: number;
    ready: number;
    dispatched: number;
    delivered: number;
    cancelled: number;
    totalRevenue: number;
    paidAmount: number;
    outstandingAmount: number;
    averageOrderValue: number;
  }> {
    try {
      const params = new URLSearchParams();
      if (dateFrom) params.append('date_from', dateFrom);
      if (dateTo) params.append('date_to', dateTo);

      const response = await fetch(`${API_BASE_URL}/orders/stats?${params}`, {
        headers: getHeaders()
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch order stats');
      }

      // Map MongoDB stats to frontend format
      const stats = result.data;
      return {
        total: stats.total_orders || 0,
        pending: stats.pending_orders || 0,
        accepted: stats.accepted_orders || 0,
        inProduction: stats.in_production_orders || 0,
        ready: stats.ready_orders || 0,
        dispatched: stats.dispatched_orders || 0,
        delivered: stats.delivered_orders || 0,
        cancelled: stats.cancelled_orders || 0,
        totalRevenue: stats.total_order_value || 0,
        paidAmount: stats.total_paid_amount || 0,
        outstandingAmount: stats.total_outstanding || 0,
        averageOrderValue: stats.average_order_value || 0
      };
    } catch (error) {
      console.error('Error getting order stats:', error);
      return {
        total: 0,
        pending: 0,
        accepted: 0,
        inProduction: 0,
        ready: 0,
        dispatched: 0,
        delivered: 0,
        cancelled: 0,
        totalRevenue: 0,
        paidAmount: 0,
        outstandingAmount: 0,
        averageOrderValue: 0
      };
    }
  }

  // Add item to order
  static async addOrderItem(orderId: string, itemData: CreateOrderItemData): Promise<{ data: OrderItem | null; error: string | null }> {
    try {
      const response = await fetch(`${API_BASE_URL}/orders/${orderId}/items`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(itemData),
      });

      const result = await response.json();

      if (!response.ok) {
        return { data: null, error: result.error || 'Failed to add order item' };
      }

      return { data: result.data, error: null };
    } catch (error) {
      console.error('Error adding order item:', error);
      return { data: null, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Update order item
  static async updateOrderItem(itemId: string, updateData: Partial<OrderItem>): Promise<{ data: OrderItem | null; error: string | null }> {
    try {
      const response = await fetch(`${API_BASE_URL}/orders/items/${itemId}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(updateData),
      });

      const result = await response.json();

      if (!response.ok) {
        return { data: null, error: result.error || 'Failed to update order item' };
      }

      return { data: result.data, error: null };
    } catch (error) {
      console.error('Error updating order item:', error);
      return { data: null, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Update individual product selections for an order item
  static async updateOrderItemIndividualProducts(itemId: string, selectedIndividualProducts: any[]): Promise<{ data: OrderItem | null; error: string | null }> {
    try {
      const response = await fetch(`${API_BASE_URL}/orders/items/${itemId}/individual-products`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({ selected_individual_products: selectedIndividualProducts }),
      });

      const result = await response.json();

      if (!response.ok) {
        return { data: null, error: result.error || 'Failed to update individual products' };
      }

      return { data: result.data, error: null };
    } catch (error) {
      console.error('Error updating individual products:', error);
      return { data: null, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Remove item from order
  static async removeOrderItem(itemId: string): Promise<{ success: boolean; error: string | null }> {
    try {
      const response = await fetch(`${API_BASE_URL}/orders/items/${itemId}`, {
        method: 'DELETE',
        headers: getHeaders()
      });

      const result = await response.json();

      if (!response.ok) {
        return { success: false, error: result.error || 'Failed to remove order item' };
      }

      return { success: true, error: null };
    } catch (error) {
      console.error('Error removing order item:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Update order payment
  static async updateOrderPayment(orderId: string, paymentData: {
    paid_amount: number;
    payment_method?: string;
    payment_terms?: string;
  }): Promise<{ data: Order | null; error: string | null }> {
    try {
      const response = await fetch(`${API_BASE_URL}/orders/${orderId}/payment`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify(paymentData),
      });

      const result = await response.json();

      if (!response.ok) {
        return { data: null, error: result.error || 'Failed to update payment' };
      }

      return { data: result.data, error: null };
    } catch (error) {
      console.error('Error updating payment:', error);
      return { data: null, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Update order GST settings
  static async updateOrderGST(orderId: string, gstData: {
    gst_rate: number;
    gst_included?: boolean;
  }): Promise<{ data: Order | null; error: string | null }> {
    try {
      const response = await fetch(`${API_BASE_URL}/orders/${orderId}/gst`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify(gstData),
      });

      const result = await response.json();

      if (!response.ok) {
        return { data: null, error: result.error || 'Failed to update GST settings' };
      }

      return { data: result.data, error: null };
    } catch (error) {
      console.error('Error updating GST settings:', error);
      return { data: null, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Delete order
  static async deleteOrder(orderId: string): Promise<{ success: boolean; error: string | null }> {
    try {
      const response = await fetch(`${API_BASE_URL}/orders/${orderId}`, {
        method: 'DELETE',
        headers: getHeaders()
      });

      const result = await response.json();

      if (!response.ok) {
        return { success: false, error: result.error || 'Failed to delete order' };
      }

      return { success: true, error: null };
    } catch (error) {
      console.error('Error deleting order:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
}

export default MongoDBOrderService;
