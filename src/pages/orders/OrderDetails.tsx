import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft, Package, User, Calendar, FileText, MapPin,
  Loader2, CheckCircle, Clock, AlertTriangle, Download, Phone, Mail
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { OrderService, type Order } from '@/services/orderService';
import { formatIndianDate } from '@/utils/formatHelpers';
import { OrderStatusCard } from '@/components/orders/OrderStatusCard';
import { OrderItemCard } from '@/components/orders/OrderItemCard';
import { OrderTimelineCard } from '@/components/orders/OrderTimelineCard';
import { PaymentSummaryCard } from '@/components/orders/PaymentSummaryCard';

interface OrderItem {
  id: string;
  product_name: string;
  product_type: 'product' | 'raw_material';
  quantity: number;
  unit: string;
  unit_price: string;
  gst_rate: string;
  gst_amount: string;
  gst_included: boolean;
  subtotal: string;
  total_price: string;
  quality_grade?: string;
  specifications?: string;
}

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    accepted: 'bg-blue-100 text-blue-800 border-blue-200',
    dispatched: 'bg-orange-100 text-orange-800 border-orange-200',
    delivered: 'bg-teal-100 text-teal-800 border-teal-200',
    cancelled: 'bg-red-100 text-red-800 border-red-200',
  };
  return colors[status] || 'bg-gray-100 text-gray-800 border-gray-200';
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'pending': return <Clock className="w-4 h-4" />;
    case 'accepted': return <CheckCircle className="w-4 h-4" />;
    case 'dispatched': return <Package className="w-4 h-4" />;
    case 'delivered': return <CheckCircle className="w-4 h-4" />;
    case 'cancelled': return <AlertTriangle className="w-4 h-4" />;
    default: return <Clock className="w-4 h-4" />;
  }
};

export default function OrderDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [order, setOrder] = useState<Order | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadOrderDetails();
    }
  }, [id]);

  const loadOrderDetails = async () => {
    try {
      setLoading(true);
      const { data, error } = await OrderService.getOrderById(id!);

      if (error || !data) {
        toast({
          title: 'Error',
          description: error || 'Failed to load order details',
          variant: 'destructive',
        });
        navigate('/orders');
        return;
      }

      setOrder(data.order);
      setOrderItems(data.items || []);
    } catch (error) {
      console.error('Error loading order details:', error);
      toast({
        title: 'Error',
        description: 'Failed to load order details',
        variant: 'destructive',
      });
      navigate('/orders');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </Layout>
    );
  }

  if (!order) {
    return null;
  }

  const deliveryAddress = order.delivery_address
    ? typeof order.delivery_address === 'string'
      ? JSON.parse(order.delivery_address)
      : order.delivery_address
    : null;

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => navigate('/orders')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Orders
            </Button>
            <Badge className={`${getStatusColor(order.status)} flex items-center gap-2 px-3 py-2 border`}>
              {getStatusIcon(order.status)}
              {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
            </Badge>
          </div>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>

        {/* Order Status Card */}
        <OrderStatusCard
          orderNumber={order.orderNumber}
          customerName={order.customerName}
          status={order.status}
          workflowStep={order.workflowStep}
        />

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Content - Left Side (2/3 width) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Order Items */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Order Items ({orderItems.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {orderItems.map((item, index) => (
                    <OrderItemCard
                      key={item.id}
                      item={item}
                      index={index}
                      orderStatus={order.status}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Dispatch/Delivery Information */}
            {(order.status === 'dispatched' || order.status === 'delivered') && (
              <Card className={order.status === 'dispatched' ? 'border-orange-200 bg-orange-50' : 'border-green-200 bg-green-50'}>
                <CardHeader>
                  <CardTitle className={`flex items-center gap-2 ${
                    order.status === 'dispatched' ? 'text-orange-800' : 'text-green-800'
                  }`}>
                    <Package className="w-5 h-5" />
                    {order.status === 'dispatched' ? 'Dispatch Information' : 'Delivery Information'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {order.status === 'dispatched' && (
                      <>
                        <div className="text-orange-700">
                          <span className="font-medium">Dispatched on:</span> {order.dispatchedAt ? new Date(order.dispatchedAt).toLocaleString() : 'N/A'}
                        </div>
                        <div className="text-orange-700">
                          <span className="font-medium">Status:</span> Ready for Delivery
                        </div>
                        <div className="text-orange-700">
                          <span className="font-medium">Stock:</span> Deducted from inventory
                        </div>
                      </>
                    )}

                    {order.status === 'delivered' && (
                      <>
                        <div className="text-green-700">
                          <span className="font-medium">Delivered on:</span> {order.deliveredAt ? new Date(order.deliveredAt).toLocaleString() : 'N/A'}
                        </div>
                        <div className="text-green-700">
                          <span className="font-medium">Status:</span> Successfully Delivered
                        </div>
                        <div className="text-green-700">
                          <span className="font-medium">Stock:</span> Deducted and confirmed
                        </div>
                        <div className="text-green-700">
                          <span className="font-medium">Order Complete:</span> All items delivered to customer
                        </div>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Order Timeline */}
            {order.status === 'delivered' && (
              <OrderTimelineCard
                acceptedAt={order.acceptedAt}
                dispatchedAt={order.dispatchedAt}
                deliveredAt={order.deliveredAt}
              />
            )}

            {/* Special Instructions */}
            {order.special_instructions && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Order Notes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground whitespace-pre-wrap">{order.special_instructions}</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar - Right Side (1/3 width) */}
          <div className="space-y-6">
            {/* Customer Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <User className="w-5 h-5" />
                  Customer Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="font-semibold text-lg">{order.customerName}</div>
                </div>
                {order.customerEmail && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="w-4 h-4" />
                    <span>{order.customerEmail}</span>
                  </div>
                )}
                {order.customerPhone && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="w-4 h-4" />
                    <span>{order.customerPhone}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Payment Summary */}
            <PaymentSummaryCard
              subtotal={order.subtotal || '0'}
              gstAmount={order.gstAmount || '0'}
              discountAmount={order.discountAmount}
              totalAmount={parseFloat(order.totalAmount.toString())}
              paidAmount={parseFloat(order.paidAmount.toString())}
              outstandingAmount={parseFloat(order.outstandingAmount.toString())}
            />

            {/* Important Dates */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Calendar className="w-5 h-5" />
                  Important Dates
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600">Order Date</p>
                  <p className="font-semibold">{formatIndianDate(order.orderDate)}</p>
                </div>
                {order.expectedDelivery && (
                  <div>
                    <p className="text-sm text-gray-600">Expected Delivery</p>
                    <p className="font-semibold">{formatIndianDate(order.expectedDelivery)}</p>
                  </div>
                )}
                {order.acceptedAt && (
                  <div>
                    <p className="text-sm text-gray-600">Accepted On</p>
                    <p className="font-semibold text-blue-600">{formatIndianDate(order.acceptedAt)}</p>
                  </div>
                )}
                {order.dispatchedAt && (
                  <div>
                    <p className="text-sm text-gray-600">Dispatched On</p>
                    <p className="font-semibold text-orange-600">{formatIndianDate(order.dispatchedAt)}</p>
                  </div>
                )}
                {order.deliveredAt && (
                  <div>
                    <p className="text-sm text-gray-600">Delivered On</p>
                    <p className="font-semibold text-green-600">{formatIndianDate(order.deliveredAt)}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Delivery Address */}
            {deliveryAddress && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <MapPin className="w-5 h-5" />
                    Delivery Address
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed">
                    {deliveryAddress.address}
                    {deliveryAddress.city && <><br />{deliveryAddress.city}</>}
                    {deliveryAddress.state && `, ${deliveryAddress.state}`}
                    {deliveryAddress.pincode && ` - ${deliveryAddress.pincode}`}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
