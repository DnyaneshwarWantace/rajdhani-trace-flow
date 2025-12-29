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
  items: OrderItem[];
  createdAt?: string;
  updatedAt?: string;
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
  qualityGrade?: string;
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
    status?: string;
    customer_id?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ data: Order[] | null; error: string | null; count?: number }> {
    try {
      const params = new URLSearchParams();
      if (filters?.search) params.append('search', filters.search);
      if (filters?.status) params.append('status', filters.status);
      if (filters?.customer_id) params.append('customer_id', filters.customer_id);
      if (filters?.limit) params.append('limit', filters.limit.toString());
      if (filters?.offset) params.append('offset', filters.offset.toString());

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
          qualityGrade: item.quality_grade,
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
        items: [],
        createdAt: order.created_at,
        updatedAt: order.updated_at,
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
        quality_grade: item.quality_grade,
        specifications: item.specifications,
        selected_individual_products: item.selected_individual_products || [],
        product_details: item.product_details || null,
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
      quality_grade?: string;
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
        return { data: null, error: result.error || 'Failed to create order' };
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
          qualityGrade: item.quality_grade,
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
          qualityGrade: item.quality_grade,
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
}

