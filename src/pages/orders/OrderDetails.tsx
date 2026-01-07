import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  ArrowLeft, Package, User, Calendar, FileText, MapPin,
  Loader2, CheckCircle, Clock, AlertTriangle, Download, Phone, Mail, Printer
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { OrderService, type Order } from '@/services/orderService';
import { formatIndianDate } from '@/utils/formatHelpers';
import { getApiUrl } from '@/utils/apiConfig';
import { OrderStatusCard } from '@/components/orders/OrderStatusCard';
import { EditableOrderItemCard } from '@/components/orders/EditableOrderItemCard';
import { OrderTimelineCard } from '@/components/orders/OrderTimelineCard';
import { EditablePaymentCard } from '@/components/orders/EditablePaymentCard';
import { IndividualProductSelectionDialog } from '@/components/orders/IndividualProductSelectionDialog';
import { ActivityLogTimeline } from '@/components/orders/ActivityLogTimeline';
import { InvoiceBill } from '@/components/orders/InvoiceBill';

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
  category?: string;
  subcategory?: string;
  color?: string;
  pattern?: string;
  length?: string;
  width?: string;
  length_unit?: string;
  width_unit?: string;
  weight?: string;
  weight_unit?: string;
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
  const [showIndividualProductDialog, setShowIndividualProductDialog] = useState(false);
  const [selectedOrderItem, setSelectedOrderItem] = useState<any | null>(null);
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false);
  const invoiceRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: invoiceRef,
    documentTitle: `Invoice-${order?.orderNumber || 'ORDER'}`,
  });

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

  const handleUpdatePayment = async (newPaidAmount: number) => {
    if (!id) return;

    try {
      const API_URL = getApiUrl();
      const token = localStorage.getItem('auth_token');

      const response = await fetch(`${API_URL}/orders/${id}/payment`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        body: JSON.stringify({
          paid_amount: newPaidAmount,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        toast({
          title: 'Error',
          description: result.error || 'Failed to update payment',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Success',
        description: `Payment updated to ₹${newPaidAmount.toLocaleString()}`,
      });

      await loadOrderDetails();
    } catch (error) {
      console.error('Error updating payment:', error);
      toast({
        title: 'Error',
        description: 'Failed to update payment',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateQuantity = async (itemId: string, newQuantity: number) => {
    try {
      const API_URL = getApiUrl();
      const token = localStorage.getItem('auth_token');

      const response = await fetch(`${API_URL}/orders/items/${itemId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        body: JSON.stringify({
          quantity: newQuantity,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        toast({
          title: 'Error',
          description: result.error || 'Failed to update quantity',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Success',
        description: `Quantity updated to ${newQuantity}. Total amount recalculated.`,
      });

      await loadOrderDetails();
    } catch (error) {
      console.error('Error updating quantity:', error);
      toast({
        title: 'Error',
        description: 'Failed to update quantity',
        variant: 'destructive',
      });
    }
  };

  const handleSelectIndividualProducts = (item: any) => {
    setSelectedOrderItem(item);
    setShowIndividualProductDialog(true);
  };

  const handleSaveIndividualProducts = async (selectedProducts: any[]) => {
    if (!selectedOrderItem) return;

    try {
      const API_URL = getApiUrl();
      const token = localStorage.getItem('auth_token');

      const response = await fetch(`${API_URL}/orders/items/save-individual-products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        body: JSON.stringify({
          orderItemId: selectedOrderItem.id,
          individualProductIds: selectedProducts.map(p => p.id),
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        toast({
          title: 'Error',
          description: result.error || 'Failed to save product selection',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Success',
        description: `${selectedProducts.length} products selected and reserved`,
      });

      await loadOrderDetails();
    } catch (error) {
      console.error('Error saving individual products:', error);
      toast({
        title: 'Error',
        description: 'Failed to save product selection',
        variant: 'destructive',
      });
    }
  };

  const handleAcceptOrder = async () => {
    if (!id) return;

    try {
      const token = localStorage.getItem('auth_token');
      console.log('Token:', token ? 'exists' : 'missing');

      const API_URL = getApiUrl();
      const result = await fetch(`${API_URL}/orders/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        body: JSON.stringify({ status: 'accepted' }),
      });

      console.log('Response status:', result.status);
      const data = await result.json();
      console.log('Response data:', data);

      if (!result.ok || !data.success) {
        toast({
          title: 'Error',
          description: data.error || 'Failed to accept order',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Order Accepted',
        description: 'Order has been accepted successfully',
      });
      await loadOrderDetails();
    } catch (error) {
      console.error('Error accepting order:', error);
      toast({
        title: 'Error',
        description: 'Failed to accept order',
        variant: 'destructive',
      });
    }
  };

  const handleDispatchOrder = async () => {
    if (!id) return;

    try {
      const API_URL = getApiUrl();
      const token = localStorage.getItem('auth_token');

      const result = await fetch(`${API_URL}/orders/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        body: JSON.stringify({ status: 'dispatched' }),
      });

      const data = await result.json();

      if (!result.ok || !data.success) {
        toast({
          title: 'Error',
          description: data.error || 'Failed to dispatch order',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Success',
        description: 'Order dispatched! Individual products marked as sold.',
      });

      await loadOrderDetails();
    } catch (error) {
      console.error('Error dispatching order:', error);
      toast({
        title: 'Error',
        description: 'Failed to dispatch order',
        variant: 'destructive',
      });
    }
  };

  const handleDeliverOrder = async () => {
    if (!id) return;

    try {
      const API_URL = getApiUrl();
      const token = localStorage.getItem('auth_token');

      const result = await fetch(`${API_URL}/orders/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        body: JSON.stringify({ status: 'delivered' }),
      });

      const data = await result.json();

      if (!result.ok || !data.success) {
        throw new Error(data.error || 'Failed to mark order as delivered');
      }

      toast({
        title: 'Success',
        description: 'Order marked as delivered successfully!',
      });

      await loadOrderDetails();
    } catch (error) {
      console.error('Error delivering order:', error);
      toast({
        title: 'Error',
        description: 'Failed to mark order as delivered',
        variant: 'destructive',
      });
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
      <div className="w-full max-w-full space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between w-full">
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
          <div className="flex gap-2">
            {order.status === 'pending' && (
              <Button onClick={handleAcceptOrder} className="bg-blue-600 hover:bg-blue-700">
                <CheckCircle className="w-4 h-4 mr-2" />
                Accept
              </Button>
            )}
            {order.status === 'accepted' && (() => {
              // Check if all product items have individual products selected
              const allProductsSelected = orderItems.every(item => {
                if (item.product_type !== 'product') return true; // Skip raw materials
                const selectedCount = (item as any).selected_individual_products?.length || 0;
                return selectedCount >= item.quantity;
              });

              return (
                <>
                  {allProductsSelected && (
                    <Button onClick={handleDispatchOrder} className="bg-orange-600 hover:bg-orange-700 text-white">
                      <Package className="w-4 h-4 mr-2" />
                      Dispatch Order
                    </Button>
                  )}
                  {allProductsSelected && (
                    <Button variant="outline" onClick={() => setShowInvoiceDialog(true)} className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-300">
                      <Download className="w-4 h-4 mr-2" />
                      Generate Bill
                    </Button>
                  )}
                </>
              );
            })()}
            {order.status === 'dispatched' && (
              <>
                <Button onClick={handleDeliverOrder} className="bg-green-600 hover:bg-green-700 text-white">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Mark as Delivered
                </Button>
                <Button variant="outline" onClick={() => setShowInvoiceDialog(true)} className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-300">
                  <Download className="w-4 h-4 mr-2" />
                  Generate Bill
                </Button>
              </>
            )}
            {order.status === 'delivered' && (
              <Button variant="outline" onClick={() => setShowInvoiceDialog(true)} className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-300">
                <Download className="w-4 h-4 mr-2" />
                Generate Bill
              </Button>
            )}
          </div>
        </div>

        {/* Order Status Card */}
        <OrderStatusCard
          orderNumber={order.orderNumber}
          customerName={order.customerName}
          status={order.status}
          workflowStep={order.workflowStep}
        />

        <div className="grid gap-6 lg:grid-cols-3 w-full max-w-full">
          {/* Main Content - Left Side (2/3 width) */}
          <div className="lg:col-span-2 space-y-6 w-full">
            {/* Order Items */}
            <Card className="w-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Order Items ({orderItems.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="w-full">
                <div className="space-y-4">
                  {orderItems.map((item, index) => (
                    <EditableOrderItemCard
                      key={item.id}
                      item={item}
                      index={index}
                      orderStatus={order.status}
                      onUpdateQuantity={handleUpdateQuantity}
                      onSelectIndividualProducts={handleSelectIndividualProducts}
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

            {/* Order Timeline - Show at all stages */}
            <OrderTimelineCard
              orderDate={order.orderDate}
              createdAt={order.createdAt}
              acceptedAt={order.acceptedAt}
              dispatchedAt={order.dispatchedAt}
              deliveredAt={order.deliveredAt}
              activityLogs={(order as any).activity_logs || []}
              currentStatus={order.status}
            />

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
          <div className="space-y-6 w-full">
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
            <EditablePaymentCard
              subtotal={order.subtotal || '0'}
              gstAmount={order.gstAmount || '0'}
              discountAmount={order.discountAmount}
              totalAmount={parseFloat(order.totalAmount.toString())}
              paidAmount={parseFloat(order.paidAmount.toString())}
              outstandingAmount={parseFloat(order.outstandingAmount.toString())}
              paymentHistory={(order as any).payment_history}
              onUpdatePayment={handleUpdatePayment}
            />

            {/* Activity Log Timeline */}
            {(order as any).activity_logs && (order as any).activity_logs.length > 0 && (
              <ActivityLogTimeline logs={(order as any).activity_logs} />
            )}

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

        {/* Individual Product Selection Dialog */}
        <IndividualProductSelectionDialog
          isOpen={showIndividualProductDialog}
          onClose={() => {
            setShowIndividualProductDialog(false);
            setSelectedOrderItem(null);
          }}
          orderItem={selectedOrderItem}
          onSave={handleSaveIndividualProducts}
        />

        {/* Invoice Bill Dialog */}
        <Dialog open={showInvoiceDialog} onOpenChange={setShowInvoiceDialog}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold">Invoice / Bill</DialogTitle>
              <DialogDescription>
                Preview and print the invoice for Order #{order?.orderNumber}
              </DialogDescription>
            </DialogHeader>

            <div className="mt-4">
              {order && (
                <InvoiceBill
                  ref={invoiceRef}
                  order={order}
                  items={orderItems}
                />
              )}
            </div>

            <div className="flex gap-3 justify-end mt-6 pt-4 border-t">
              <Button variant="outline" onClick={() => setShowInvoiceDialog(false)}>
                Close
              </Button>
              <Button onClick={handlePrint} className="bg-blue-600 hover:bg-blue-700">
                <Printer className="w-4 h-4 mr-2" />
                Print Invoice
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
