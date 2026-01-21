import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, ShoppingCart, Calendar, User, Box, AlertCircle } from 'lucide-react';
import { ProductService } from '@/services/productService';
import { formatIndianDate } from '@/utils/formatHelpers';
import { getApiUrl } from '@/utils/apiConfig';

interface PendingOrder {
  order_id: string;
  order_number: string;
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  order_date: string;
  expected_delivery: string;
  status: string;
  priority: string;
  quantity_needed: number;
  product_value: number;
  product_id?: string;
  product_name?: string;
  current_stock?: number;
  shortage?: number;
  order_items: Array<{
    id: string;
    product_name: string;
    quantity: number;
    unit: string;
    unit_price: string;
    total_price: string;
    specifications?: string;
  }>;
}

interface Props {
  onSelectOrder: (order: PendingOrder, productId: string) => void;
}

export default function AllPendingOrdersSection({ onSelectOrder }: Props) {
  const [allOrders, setAllOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAllOrders();
  }, []);

  const loadAllOrders = async () => {
    setLoading(true);
    try {
      console.log('🔍 Loading ALL orders...');

      // Get orders with status: pending, accepted, in_production, ready (NOT dispatched, delivered, cancelled)
      const response = await fetch(`${getApiUrl()}/orders`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });
      const result = await response.json();

      console.log('📦 Orders API response:', result);

      if (result.success && result.data) {
        // Filter orders by status (exclude dispatched, delivered, cancelled)
        const validOrders = result.data.filter((order: any) =>
          ['pending', 'accepted', 'in_production', 'ready'].includes(order.status)
        );

        console.log('✅ Valid orders after filter:', validOrders.length);

        // Get order items for each order (items are already included in order data)
        const ordersWithProducts: any[] = [];

        for (const order of validOrders) {
          // Use order_items that are already included in the order response
          const orderItems = order.order_items || [];

          // Filter only product items (not raw materials)
          const productItems = orderItems.filter((item: any) => item.product_type === 'product');

          // Fetch product details to get current stock for each item
          for (const item of productItems) {
            let currentStock = 0;
            let shortage = 0;

            if (item.product_id) {
              try {
                const product = await ProductService.getProductById(item.product_id);
                currentStock = product.current_stock || 0;
                shortage = Math.max(0, item.quantity - currentStock);
              } catch (error) {
                console.error(`Error fetching product ${item.product_id}:`, error);
                // Continue with 0 stock if product fetch fails
              }
            }

            ordersWithProducts.push({
              order_id: order.id,
              order_number: order.order_number || order.id,
              customer_name: order.customer_name,
              customer_email: order.customer_email,
              customer_phone: order.customer_phone,
              order_date: order.order_date,
              expected_delivery: order.expected_delivery,
              status: order.status,
              priority: order.priority || 'medium',
              product_id: item.product_id,
              product_name: item.product_name,
              quantity_needed: item.quantity,
              product_value: parseFloat(item.total_price || '0'),
              current_stock: currentStock,
              shortage: shortage,
            });
          }
        }

        console.log('📋 Total orders with products:', ordersWithProducts.length);

        // Sort orders: 
        // 1. First: Orders with shortage (need to make) - sorted by delivery date (earliest first)
        // 2. Last: Orders with sufficient stock - sorted by delivery date (earliest first)
        ordersWithProducts.sort((a, b) => {
          const aHasShortage = (a.shortage ?? 0) > 0;
          const bHasShortage = (b.shortage ?? 0) > 0;
          
          // If one has shortage and the other doesn't, prioritize the one with shortage
          if (aHasShortage && !bHasShortage) return -1;
          if (!aHasShortage && bHasShortage) return 1;
          
          // If both have shortage or both don't, sort by delivery date (earliest first)
          const aDate = new Date(a.expected_delivery).getTime();
          const bDate = new Date(b.expected_delivery).getTime();
          return aDate - bDate;
        });

        setAllOrders(ordersWithProducts);
      }
    } catch (error) {
      console.error('❌ Error loading orders:', error);
    }
    setLoading(false);
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      urgent: 'bg-red-500 text-white',
      high: 'bg-orange-500 text-white',
      medium: 'bg-blue-500 text-white',
      low: 'bg-gray-500 text-white',
    };
    return colors[priority as keyof typeof colors] || colors.low;
  };

  const getStatusColor = (status: string) => {
    const colors = {
      pending: 'bg-yellow-500 text-white',
      accepted: 'bg-blue-500 text-white',
      in_production: 'bg-purple-500 text-white',
    };
    return colors[status as keyof typeof colors] || 'bg-gray-500 text-white';
  };

  const isUrgent = (deliveryDate: string) => {
    const delivery = new Date(deliveryDate);
    const today = new Date();
    const days = Math.ceil((delivery.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return days <= 7;
  };

  if (loading) {
    return (
      <Card className="p-8 border-2 border-blue-300">
        <div className="flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600 mr-3" />
          <span className="text-lg text-gray-700">Loading all pending orders...</span>
        </div>
      </Card>
    );
  }

  if (allOrders.length === 0) {
    return (
      <Card className="p-8 bg-green-50 border-2 border-green-300">
        <div className="flex items-center gap-4">
          <ShoppingCart className="h-8 w-8 text-green-600" />
          <div>
            <h3 className="text-xl font-bold text-green-900">All Orders Completed!</h3>
            <p className="text-green-700">No pending orders at the moment. Create a batch for any product below.</p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 border-4 border-orange-500 bg-orange-50">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-orange-900 flex items-center gap-2">
              <ShoppingCart className="h-7 w-7" />
              ALL PENDING ORDERS - CREATE PRODUCTION BATCH
            </h2>
            <p className="text-orange-700 font-semibold mt-1">Click on any order below to create a production batch for that product</p>
          </div>
          <Badge variant="secondary" className="text-xl px-5 py-2 bg-orange-600 text-white">
            {allOrders.length} Orders
          </Badge>
        </div>

        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {allOrders.map((order, index) => (
            <Card
              key={`${order.order_id}-${index}`}
              className="p-4 hover:shadow-xl transition-all cursor-pointer border-2 hover:border-orange-600 bg-white"
              onClick={() => onSelectOrder(order, order.product_id)}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-gray-900 text-lg">{order.order_number}</h4>
                    <div className="flex gap-1 mt-1 flex-wrap">
                      <Badge className={getStatusColor(order.status)} variant="secondary">
                        {order.status.replace('_', ' ')}
                      </Badge>
                      <Badge className={getPriorityColor(order.priority)} variant="secondary">
                        {order.priority}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-start gap-2 text-sm">
                    <Box className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                    <span className="font-bold text-blue-900 break-words">{order.product_name}</span>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <User className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">{order.customer_name}</span>
                  </div>

                  <div className="space-y-2 pt-2 pb-2 bg-gray-50 rounded p-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Order Qty:</span>
                      <span className="font-bold text-gray-900">{order.quantity_needed}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Current Stock:</span>
                      <span className={`font-bold ${order.current_stock && order.current_stock > 0 ? 'text-green-600' : 'text-gray-900'}`}>
                        {order.current_stock ?? 'N/A'}
                      </span>
                    </div>
                    {order.shortage !== undefined && order.shortage > 0 && (
                      <div className="flex items-center justify-between text-sm pt-1 border-t border-red-200">
                        <span className="text-red-600 font-semibold flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          Need to Make:
                        </span>
                        <span className="font-bold text-red-600">{order.shortage}</span>
                      </div>
                    )}
                    {order.shortage !== undefined && order.shortage === 0 && order.current_stock !== undefined && (
                      <div className="flex items-center justify-between text-sm pt-1 border-t border-green-200">
                        <span className="text-green-600 font-semibold">Stock Available:</span>
                        <span className="font-bold text-green-600">✓</span>
                      </div>
                    )}
                  </div>

                  <div className={`flex items-center gap-2 text-sm font-semibold ${isUrgent(order.expected_delivery) ? 'text-red-600' : 'text-gray-600'}`}>
                    <Calendar className="h-4 w-4 flex-shrink-0" />
                    <span>Deliver: {formatIndianDate(order.expected_delivery)}</span>
                    {isUrgent(order.expected_delivery) && <span className="text-red-600">⚠️ URGENT</span>}
                  </div>

                  <div className="pt-2 border-t">
                    <div className="text-sm text-center font-bold text-orange-700 bg-orange-100 py-2 rounded">
                      Click to Create Batch
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </Card>
  );
}
