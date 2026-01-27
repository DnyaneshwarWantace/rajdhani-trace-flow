import { getApiUrl } from '@/utils/apiConfig';

const API_URL = getApiUrl();

export interface Order {
  id: string;
  orderNumber: string;
  customerId?: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  orderDate: string;
  expectedDelivery?: string;
  subtotal?: string;
  gstRate?: string;
  gstAmount?: string;
  discountAmount?: string;
  totalAmount: number;
  paidAmount: number;
  outstandingAmount: number;
  status: string;
  workflowStep?: string;
  acceptedAt?: string;
  dispatchedAt?: string;
  deliveredAt?: string;
  delivery_address?: any;
  special_instructions?: string;
  remarks?: string;
  remarks_added_by?: string;
  remarks_added_at?: string;
  items: OrderItem[];
  createdAt?: string;
  updatedAt?: string;
  created_by?: string;
  activity_logs?: Array<{
    action: string;
    description: string;
    performed_by: string;
    performed_by_email?: string;
    timestamp: string;
    details?: any;
  }>;
}

export interface OrderItem {
  id: string;
  orderId?: string;
  productId?: string;
  productName: string;
  productType: string;
  quantity: number;
  count_unit?: string; // Count unit for products (rolls, pieces, etc.)
  unit?: string; // Unit for raw materials (kg, meters, etc.)
  unitPrice: number;
  totalPrice: number;
  specifications?: string;
  selectedProducts?: any[];
  // Product details for display
  length?: string;
  width?: string;
  length_unit?: string;
  width_unit?: string;
  weight?: string;
  weight_unit?: string;
  color?: string;
  pattern?: string;
}

export class OrderService {
  private static getHeaders(): HeadersInit {
    const token = localStorage.getItem('auth_token');
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  static async getOrders(filters?: {
    search?: string;
    status?: string | string[];
    customer_id?: string | string[];
    limit?: number;
    offset?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<{ data: Order[] | null; error: string | null; count?: number }> {
    try {
      const params = new URLSearchParams();
      if (filters?.search) params.append('search', filters.search);
      // Handle status as array (multi-select)
      if (filters?.status) {
        const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
        const cleanedStatuses = statuses.filter(s => s && s !== 'all');
        cleanedStatuses.forEach(status => params.append('status', status));
      }
      // Handle customer_id as array (multi-select)
      if (filters?.customer_id) {
        const customers = Array.isArray(filters.customer_id) ? filters.customer_id : [filters.customer_id];
        const cleanedCustomers = customers.filter(c => c && c !== 'all');
        cleanedCustomers.forEach(customerId => params.append('customer_id', customerId));
      }
      if (filters?.limit) params.append('limit', filters.limit.toString());
      if (filters?.offset) params.append('offset', filters.offset.toString());
      if (filters?.sortBy) params.append('sortBy', filters.sortBy);
      if (filters?.sortOrder) params.append('sortOrder', filters.sortOrder);

      const response = await fetch(`${API_URL}/orders?${params}`, {
        headers: this.getHeaders(),
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        return { data: null, error: result.error || 'Failed to fetch orders' };
      }

      // Map backend orders to frontend format
      const mappedOrders = (result.data || []).map((order: any) => ({
        id: order.id,
        orderNumber: order.order_number || order.id,
        customerId: order.customer_id || null,
        customerName: order.customer_name || '',
        customerEmail: order.customer_email,
        customerPhone: order.customer_phone,
        totalAmount: parseFloat(order.total_amount || '0'),
        paidAmount: parseFloat(order.paid_amount || '0'),
        outstandingAmount: parseFloat(order.outstanding_amount || '0'),
        orderDate: order.order_date || order.created_at || new Date().toISOString(),
        expectedDelivery: order.expected_delivery,
        status: order.status || 'pending',
        workflowStep: order.workflow_step,
        acceptedAt: order.accepted_at,
        dispatchedAt: order.dispatched_at,
        deliveredAt: order.delivered_at,
        delivery_address: order.delivery_address,
        special_instructions: order.special_instructions,
        items: (order.order_items || []).map((item: any) => ({
          id: item.id,
          productId: item.product_id,
          productName: item.product_name || '',
          productType: item.product_type || 'product',
          quantity: item.quantity || 0,
          count_unit: item.count_unit, // For products (rolls, pieces, etc.)
          unit: item.unit, // For raw materials (kg, meters, etc.)
          unitPrice: parseFloat(item.unit_price || 0),
          totalPrice: parseFloat(item.total_price || item.unit_price * item.quantity || 0),
          specifications: item.specifications,
          selectedProducts: item.selected_individual_products || [],
          // Product details for display (SQM, GSM calculation)
          length: item.length,
          width: item.width,
          length_unit: item.length_unit,
          width_unit: item.width_unit,
          weight: item.weight,
          weight_unit: item.weight_unit
        }))
      }));

      return { data: mappedOrders, error: null, count: result.count };
    } catch (error) {
      console.error('Error in getOrders:', error);
      return { data: null, error: 'Failed to fetch orders' };
    }
  }

  static async getOrderById(orderId: string): Promise<{ data: { order: Order; items: any[] } | null; error: string | null }> {
    try {
      const response = await fetch(`${API_URL}/orders/${orderId}`, {
        headers: this.getHeaders(),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        return { data: null, error: result.error || 'Failed to fetch order details' };
      }

      const order = result.data.order;
      const items = result.data.items || [];

      // Map order to frontend format
      const mappedOrder: Order = {
        id: order.id,
        orderNumber: order.order_number || order.id,
        customerId: order.customer_id || null,
        customerName: order.customer_name || '',
        customerEmail: order.customer_email,
        customerPhone: order.customer_phone,
        orderDate: order.order_date || order.created_at || new Date().toISOString(),
        expectedDelivery: order.expected_delivery,
        subtotal: order.subtotal,
        gstRate: order.gst_rate,
        gstAmount: order.gst_amount,
        discountAmount: order.discount_amount,
        totalAmount: parseFloat(order.total_amount || '0'),
        paidAmount: parseFloat(order.paid_amount || '0'),
        outstandingAmount: parseFloat(order.outstanding_amount || '0'),
        status: order.status || 'pending',
        workflowStep: order.workflow_step,
        acceptedAt: order.accepted_at,
        dispatchedAt: order.dispatched_at,
        deliveredAt: order.delivered_at,
        delivery_address: order.delivery_address,
        special_instructions: order.special_instructions,
        remarks: order.remarks,
        remarks_added_by: order.remarks_added_by,
        remarks_added_at: order.remarks_added_at,
        items: [],
        createdAt: order.created_at,
        updatedAt: order.updated_at,
        created_by: order.created_by,
        activity_logs: order.activity_logs || [],
      };

      // Map order items with all fields needed for details page
      const mappedItems = items.map((item: any) => ({
        id: item.id,
        product_id: item.product_id || null,
        raw_material_id: item.raw_material_id || null,
        product_name: item.product_name || '',
        product_type: item.product_type || 'product',
        quantity: item.quantity || 0,
        unit: item.unit || 'piece',
        unit_price: item.unit_price || '0.00',
        gst_rate: item.gst_rate || '18.00',
        gst_amount: item.gst_amount || '0.00',
        gst_included: item.gst_included !== false,
        subtotal: item.subtotal || '0.00',
        total_price: item.total_price || '0.00',
        specifications: item.specifications,
        selected_individual_products: item.selected_individual_products || [],
        product_details: item.product_details || null,
        // Product details from backend (spread directly from productDetails)
        category: item.category,
        subcategory: item.subcategory,
        color: item.color,
        pattern: item.pattern,
        length: item.length,
        width: item.width,
        length_unit: item.length_unit,
        width_unit: item.width_unit,
        weight: item.weight,
        weight_unit: item.weight_unit,
      }));

      return { data: { order: mappedOrder, items: mappedItems }, error: null };
    } catch (error) {
      console.error('Error in getOrderById:', error);
      return { data: null, error: 'Failed to fetch order details' };
    }
  }

  static async createOrder(orderData: {
    customer_id?: string;
    customer_name: string;
    customer_email?: string;
    customer_phone?: string;
    expected_delivery?: string;
    items: Array<{
      product_id?: string;
      product_name: string;
      product_type: 'product' | 'raw_material';
      quantity: number;
      unit_price: number;
      total_price: number;
      pricing_unit?: string;
      unit_value?: number;
      product_dimensions?: any;
      specifications?: string;
      selected_individual_products?: string[];
    }>;
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
  }): Promise<{ data: Order | null; error: string | null }> {
    try {
      const response = await fetch(`${API_URL}/orders`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(orderData),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        // Import formatErrorMessage dynamically to avoid circular dependencies
        const { formatErrorMessage } = await import('@/utils/formatHelpers');
        const friendlyError = formatErrorMessage(result.error || 'Failed to create order');
        return { data: null, error: friendlyError };
      }

      // Map backend order to frontend format
      const order = result.data;
      const mappedOrder: Order = {
        id: order.id,
        orderNumber: order.order_number || order.id,
        customerId: order.customer_id || null,
        customerName: order.customer_name || '',
        customerEmail: order.customer_email,
        customerPhone: order.customer_phone,
        orderDate: order.order_date || order.created_at || new Date().toISOString(),
        expectedDelivery: order.expected_delivery,
        subtotal: order.subtotal,
        gstRate: order.gst_rate,
        gstAmount: order.gst_amount,
        discountAmount: order.discount_amount,
        totalAmount: parseFloat(order.total_amount || '0'),
        paidAmount: parseFloat(order.paid_amount || '0'),
        outstandingAmount: parseFloat(order.outstanding_amount || '0'),
        status: order.status || 'pending',
        workflowStep: order.workflow_step,
        acceptedAt: order.accepted_at,
        dispatchedAt: order.dispatched_at,
        deliveredAt: order.delivered_at,
        items: (order.order_items || []).map((item: any) => ({
          id: item.id,
          productId: item.product_id,
          productName: item.product_name || '',
          productType: item.product_type || 'product',
          quantity: item.quantity || 0,
          unitPrice: parseFloat(item.unit_price || 0),
          totalPrice: parseFloat(item.total_price || item.unit_price * item.quantity || 0),
          specifications: item.specifications,
          selectedProducts: item.selected_individual_products || []
        })),
        createdAt: order.created_at,
        updatedAt: order.updated_at,
      };

      return { data: mappedOrder, error: null };
    } catch (error) {
      console.error('Error in createOrder:', error);
      return { data: null, error: 'Failed to create order' };
    }
  }

  static async updateOrderStatus(orderId: string, status: string): Promise<{ data: Order | null; error: string | null }> {
    try {
      const response = await fetch(`${API_URL}/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: this.getHeaders(),
        body: JSON.stringify({ status }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        return { data: null, error: result.error || 'Failed to update order status' };
      }

      // Map backend order to frontend format
      const order = result.data;
      const mappedOrder: Order = {
        id: order.id,
        orderNumber: order.order_number || order.id,
        customerId: order.customer_id || null,
        customerName: order.customer_name || '',
        customerEmail: order.customer_email,
        customerPhone: order.customer_phone,
        orderDate: order.order_date || order.created_at || new Date().toISOString(),
        expectedDelivery: order.expected_delivery,
        subtotal: order.subtotal,
        gstRate: order.gst_rate,
        gstAmount: order.gst_amount,
        discountAmount: order.discount_amount,
        totalAmount: parseFloat(order.total_amount || '0'),
        paidAmount: parseFloat(order.paid_amount || '0'),
        outstandingAmount: parseFloat(order.outstanding_amount || '0'),
        status: order.status || 'pending',
        workflowStep: order.workflow_step,
        acceptedAt: order.accepted_at,
        dispatchedAt: order.dispatched_at,
        deliveredAt: order.delivered_at,
        delivery_address: order.delivery_address,
        special_instructions: order.special_instructions,
        items: (order.order_items || []).map((item: any) => ({
          id: item.id,
          productId: item.product_id,
          productName: item.product_name || '',
          productType: item.product_type || 'product',
          quantity: item.quantity || 0,
          count_unit: item.count_unit,
          unit: item.unit,
          unitPrice: parseFloat(item.unit_price || 0),
          totalPrice: parseFloat(item.total_price || item.unit_price * item.quantity || 0),
          specifications: item.specifications,
          selectedProducts: item.selected_individual_products || [],
          length: item.length,
          width: item.width,
          length_unit: item.length_unit,
          width_unit: item.width_unit,
          weight: item.weight,
          weight_unit: item.weight_unit,
          color: item.color,
          pattern: item.pattern
        })),
        createdAt: order.created_at,
        updatedAt: order.updated_at,
      };

      return { data: mappedOrder, error: null };
    } catch (error) {
      console.error('Error in updateOrderStatus:', error);
      return { data: null, error: 'Failed to update order status' };
    }
  }

  static async updateOrderPayment(orderId: string, paidAmount: number): Promise<{ data: Order | null; error: string | null }> {
    try {
      const response = await fetch(`${API_URL}/orders/${orderId}/payment`, {
        method: 'PATCH',
        headers: this.getHeaders(),
        body: JSON.stringify({ paid_amount: paidAmount }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        return { data: null, error: result.error || 'Failed to update payment' };
      }

      // Map backend order to frontend format
      const order = result.data;
      const mappedOrder: Order = {
        id: order.id,
        orderNumber: order.order_number || order.id,
        customerId: order.customer_id || null,
        customerName: order.customer_name || '',
        customerEmail: order.customer_email,
        customerPhone: order.customer_phone,
        orderDate: order.order_date || order.created_at || new Date().toISOString(),
        expectedDelivery: order.expected_delivery,
        subtotal: order.subtotal,
        gstRate: order.gst_rate,
        gstAmount: order.gst_amount,
        discountAmount: order.discount_amount,
        totalAmount: parseFloat(order.total_amount || '0'),
        paidAmount: parseFloat(order.paid_amount || '0'),
        outstandingAmount: parseFloat(order.outstanding_amount || '0'),
        status: order.status || 'pending',
        workflowStep: order.workflow_step,
        acceptedAt: order.accepted_at,
        dispatchedAt: order.dispatched_at,
        deliveredAt: order.delivered_at,
        delivery_address: order.delivery_address,
        special_instructions: order.special_instructions,
        items: [],
        createdAt: order.created_at,
        updatedAt: order.updated_at,
      };

      return { data: mappedOrder, error: null };
    } catch (error) {
      console.error('Error in updateOrderPayment:', error);
      return { data: null, error: 'Failed to update payment' };
    }
  }

  static async getPendingOrdersForProduct(productId: string): Promise<{
    data: Array<{
      order_id: string;
      order_number: string;
      customer_id?: string;
      customer_name: string;
      customer_email?: string;
      customer_phone?: string;
      order_date: string;
      expected_delivery: string;
      status: string;
      priority: string;
      quantity_needed: number;
      product_value: number;
      order_items: Array<{
        id: string;
        product_name: string;
        quantity: number;
        unit: string;
        unit_price: string;
        total_price: string;
        specifications?: string;
      }>;
    }> | null;
    error: string | null;
    count?: number;
  }> {
    try {
      const response = await fetch(`${API_URL}/orders/product/${productId}/pending`, {
        headers: this.getHeaders(),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        return { data: null, error: result.error || 'Failed to fetch pending orders' };
      }

      return { data: result.data || [], error: null, count: result.count };
    } catch (error) {
      console.error('Error in getPendingOrdersForProduct:', error);
      return { data: null, error: 'Failed to fetch pending orders' };
    }
  }
}

