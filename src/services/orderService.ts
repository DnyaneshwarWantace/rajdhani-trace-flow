const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

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
  unitPrice: number;
  totalPrice: number;
  qualityGrade?: string;
  specifications?: string;
  selectedProducts?: any[];
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
        totalAmount: parseFloat(order.total_amount || '0'),
        paidAmount: parseFloat(order.paid_amount || '0'),
        outstandingAmount: parseFloat(order.outstanding_amount || '0'),
        orderDate: order.order_date || order.created_at || new Date().toISOString(),
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
        }))
      }));

      return { data: mappedOrders, error: null, count: result.count };
    } catch (error) {
      console.error('Error in getOrders:', error);
      return { data: null, error: 'Failed to fetch orders' };
    }
  }
}

