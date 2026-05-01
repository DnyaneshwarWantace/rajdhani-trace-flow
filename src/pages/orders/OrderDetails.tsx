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
  Loader2, CheckCircle, Clock, AlertTriangle, Download, Phone, Mail, Printer, Plus, Truck
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { OrderService, type Order } from '@/services/orderService';
import { ProductService } from '@/services/productService';
import { MaterialService } from '@/services/materialService';
import { formatIndianDate } from '@/utils/formatHelpers';
import { getApiUrl } from '@/utils/apiConfig';
import { OrderStatusCard } from '@/components/orders/OrderStatusCard';
import { EditableOrderItemCard } from '@/components/orders/EditableOrderItemCard';
import { OrderTimelineCard } from '@/components/orders/OrderTimelineCard';
import { EditablePaymentCard } from '@/components/orders/EditablePaymentCard';
import { IndividualProductSelectionDialog } from '@/components/orders/IndividualProductSelectionDialog';
import { ActivityLogTimeline } from '@/components/orders/ActivityLogTimeline';
import { InvoiceBill } from '@/components/orders/InvoiceBill';
import OrderProductionInfo from '@/components/orders/OrderProductionInfo';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useLiveSyncRefresh } from '@/hooks/useLiveSyncRefresh';
import ProductMaterialSelectionDialog from '@/components/orders/ProductMaterialSelectionDialog';

interface OrderItem {
  id: string;
  product_name: string;
  product_type: 'product' | 'raw_material';
  quantity: number;
  unit: string;
  pricing_unit?: string;
  unit_price: string;
  gst_rate: string;
  gst_amount: string;
  gst_included: boolean;
  subtotal: string;
  total_price: string;
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
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmDialogConfig, setConfirmDialogConfig] = useState<{
    title: string;
    description: string;
    onConfirm: () => void;
    variant: 'danger' | 'warning' | 'info';
  } | null>(null);
  // Transport dialog
  const [showTransportDialog, setShowTransportDialog] = useState(false);
  const [transportType, setTransportType] = useState<'own' | 'outside'>('own');
  const [transportVehicleNo, setTransportVehicleNo] = useState('');
  const [transportRemark, setTransportRemark] = useState('');
  const [dispatchingOrder, setDispatchingOrder] = useState(false);
  // Add item inline
  const [showAddItemPanel, setShowAddItemPanel] = useState(false);
  const [emptyOrderPendingItems, setEmptyOrderPendingItems] = useState(false);
  const invoiceRef = useRef<HTMLDivElement>(null);
  const latestOrderRef = useRef<{ id: string; orderNumber: string; status: string } | null>(null);

  const handlePrint = useReactToPrint({
    contentRef: invoiceRef,
    documentTitle: `Invoice-${order?.orderNumber || 'ORDER'}`,
  });

  useEffect(() => {
    if (id) {
      loadOrderDetails();
    }
  }, [id]);

  useEffect(() => {
    return () => {
      // If user leaves this page with an empty pending/accepted order,
      // auto-cancel it as requested.
      if (!emptyOrderPendingItems) return;
      const latest = latestOrderRef.current;
      if (!latest) return;
      if (!(latest.status === 'pending' || latest.status === 'accepted')) return;

      const API_URL = getApiUrl();
      const token = localStorage.getItem('auth_token');
      const payload = JSON.stringify({ status: 'cancelled' });
      fetch(`${API_URL}/orders/${latest.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: payload,
        keepalive: true,
      }).catch(() => {
        // ignore cleanup errors
      });
    };
  }, [emptyOrderPendingItems]);

  useEffect(() => {
    const handleOrderUpdated = (event: Event) => {
      const customEvent = event as CustomEvent<{ orderId?: string }>;
      if (!id) return;
      if (customEvent.detail?.orderId && customEvent.detail.orderId !== id) return;
      loadOrderDetails();
    };

    window.addEventListener('order-updated', handleOrderUpdated as EventListener);
    return () => {
      window.removeEventListener('order-updated', handleOrderUpdated as EventListener);
    };
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
      latestOrderRef.current = {
        id: data.order.id,
        orderNumber: data.order.orderNumber,
        status: String(data.order.status || '').toLowerCase(),
      };
      const canAutoCancel = ['pending', 'accepted'].includes(String(data.order.status || '').toLowerCase());
      setEmptyOrderPendingItems(canAutoCancel && (data.items || []).length === 0);
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

  useLiveSyncRefresh({
    modules: ['orders', 'production', 'materials', 'manage_stock'],
    onRefresh: () => {
      if (!id) return;
      loadOrderDetails();
    },
    pollingMs: 8000,
  });

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
        const errorMessage = result.error || 'Failed to update payment';
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive',
        });
        throw new Error(errorMessage);
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

  const handleDeleteItem = async (itemId: string, productName: string) => {
    if (!order) return;

    const isLastItem = orderItems.length === 1;

    if (isLastItem) {
      // Allow removing last item without immediate cancellation.
      // If user leaves with empty order, it will auto-cancel.
      setConfirmDialogConfig({
        title: 'Remove Last Item',
        description: `This is the last item in the order.\n\nYou can remove it and still add new items on this page.\n\nIf you leave the page without adding any item, the order will be cancelled automatically.`,
        variant: 'warning',
        onConfirm: () => performDeleteItem(itemId, productName, true),
      });
    } else {
      // Multiple items: confirm remove item only
      setConfirmDialogConfig({
        title: 'Remove Item from Order',
        description: `Are you sure you want to remove "${productName}" from this order?\n\nAny reserved individual products or raw materials will be unreserved and become available again.`,
        variant: 'danger',
        onConfirm: () => performDeleteItem(itemId, productName),
      });
    }
    setShowConfirmDialog(true);
  };

  const performDeleteItem = async (itemId: string, productName: string, allowEmptyOrder = false) => {
    setShowConfirmDialog(false);

    try {
      const API_URL = getApiUrl();
      const token = localStorage.getItem('auth_token');

      const response = await fetch(`${API_URL}/orders/items/${itemId}${allowEmptyOrder ? '?allow_empty_order=true' : ''}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
      });

      const result = await response.json();

      // Check if this is the last item (requires confirmation)
      if (!response.ok && result.error === 'LAST_ITEM') {
        if (!order) return;

        // Show confirmation dialog to remove last item while keeping page active.
        setConfirmDialogConfig({
          title: 'Remove Last Item',
          description: `This is the last item in order ${order.orderNumber}.\n\nYou can remove it and add new items on this page.\n\nIf you leave without adding anything, the order will be cancelled automatically.`,
          variant: 'warning',
          onConfirm: () => performDeleteItem(itemId, productName, true),
        });
        setShowConfirmDialog(true);
        return;
      }

      if (!response.ok || !result.success) {
        toast({
          title: 'Error',
          description: result.error || 'Failed to remove item',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Item Removed',
        description: `${productName} has been removed from the order. Reserved products/materials have been unreserved.`,
      });

      await loadOrderDetails();
      if (result?.data?.order_is_empty) {
        setEmptyOrderPendingItems(true);
        setShowAddItemPanel(true);
        toast({
          title: 'Order is Empty',
          description: 'Add at least one item before leaving this page, otherwise order will be cancelled.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error deleting item:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove item',
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

  const handleDispatchOrder = () => {
    setTransportType('own');
    setTransportVehicleNo('');
    setTransportRemark('');
    setShowTransportDialog(true);
  };

  const handleConfirmDispatch = async () => {
    if (!id) return;
    setDispatchingOrder(true);
    try {
      const API_URL = getApiUrl();
      const token = localStorage.getItem('auth_token');

      const result = await fetch(`${API_URL}/orders/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        body: JSON.stringify({
          status: 'dispatched',
          transport_type: transportType,
          transport_vehicle_no: transportVehicleNo.trim() || undefined,
          transport_remark: transportRemark.trim() || undefined,
        }),
      });

      const data = await result.json();

      if (!result.ok || !data.success) {
        toast({ title: 'Error', description: data.error || 'Failed to ship order', variant: 'destructive' });
        return;
      }

      toast({ title: 'Order Shipped', description: 'Individual products marked as sold.' });
      setShowTransportDialog(false);
      await loadOrderDetails();
    } catch (error) {
      console.error('Error dispatching order:', error);
      toast({ title: 'Error', description: 'Failed to ship order', variant: 'destructive' });
    } finally {
      setDispatchingOrder(false);
    }
  };

  const handleAddItemToOrder = async (itemData: any) => {
    if (!id) return;
    try {
      const API_URL = getApiUrl();
      const token = localStorage.getItem('auth_token');
      const result = await fetch(`${API_URL}/orders/${id}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) },
        body: JSON.stringify(itemData),
      });
      const data = await result.json();
      if (!result.ok || !data.success) {
        toast({ title: 'Error', description: data.error || 'Failed to add item', variant: 'destructive' });
        return;
      }
      toast({ title: 'Item Added', description: 'New item added to order.' });
      setEmptyOrderPendingItems(false);
      setShowAddItemPanel(false);
      await loadOrderDetails();
    } catch {
      toast({ title: 'Error', description: 'Failed to add item', variant: 'destructive' });
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

  const isCancelled = String(order?.status ?? '').toLowerCase() === 'cancelled';

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
              <>
                <Button variant="outline" onClick={() => setShowInvoiceDialog(true)} className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-300">
                  <Download className="w-4 h-4 mr-2" />
                  Generate Bill
                </Button>
                <Button onClick={handleAcceptOrder} className="bg-blue-600 hover:bg-blue-700">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Accept
                </Button>
              </>
            )}
            {order.status === 'accepted' && (() => {
              const productItems = orderItems.filter((item: any) => item.product_type === 'product');
              const incompleteItems = productItems.filter((item: any) => {
                const requiredQty = Number(item.quantity || 0);
                const selectedCount = Array.isArray((item as any).selected_individual_products)
                  ? (item as any).selected_individual_products.length
                  : Array.isArray((item as any).selectedProducts)
                    ? (item as any).selectedProducts.length
                    : 0;
                return requiredQty > 0 && selectedCount < requiredQty;
              });
              const allProductsSelected = incompleteItems.length === 0;

              return (
                <>
                  {!allProductsSelected && incompleteItems.length > 0 && (
                    <div className="px-3 py-2 rounded-md border border-amber-200 bg-amber-50 text-amber-800 text-xs">
                      Complete roll selection before shipping. Remaining: {incompleteItems.map((item: any) => {
                        const requiredQty = Number(item.quantity || 0);
                        const selectedCount = Array.isArray((item as any).selected_individual_products)
                          ? (item as any).selected_individual_products.length
                          : Array.isArray((item as any).selectedProducts)
                            ? (item as any).selectedProducts.length
                            : 0;
                        const remaining = Math.max(requiredQty - selectedCount, 0);
                        return `${item.product_name} (${remaining})`;
                      }).join(', ')}
                    </div>
                  )}
                  {allProductsSelected && (
                    <Button onClick={handleDispatchOrder} className="bg-orange-600 hover:bg-orange-700 text-white">
                      <Package className="w-4 h-4 mr-2" />
                      Ship
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
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="flex items-center gap-2">
                    <Package className="w-5 h-5" />
                    Order Items ({orderItems.length})
                  </CardTitle>
                  {(order.status === 'pending' || order.status === 'accepted') && !isCancelled && (
                    <Button size="sm" variant="outline" onClick={() => setShowAddItemPanel(v => !v)} className="gap-1">
                      <Plus className="w-4 h-4" />
                      Add Item
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="w-full">
                <div className="space-y-4">
                  {orderItems.map((item, index) => (
                    <EditableOrderItemCard
                      key={item.id}
                      item={item}
                      index={index}
                      orderStatus={String(order.status || '').toLowerCase()}
                      onUpdateQuantity={isCancelled ? undefined : handleUpdateQuantity}
                      onSelectIndividualProducts={isCancelled ? undefined : handleSelectIndividualProducts}
                      onDeleteItem={isCancelled ? undefined : handleDeleteItem}
                    />
                  ))}
                  {showAddItemPanel && (order.status === 'pending' || order.status === 'accepted') && (
                    <AddItemInlineForm
                      onSave={handleAddItemToOrder}
                      onCancel={() => setShowAddItemPanel(false)}
                    />
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Shipping/Delivery Information */}
            {(order.status === 'dispatched' || order.status === 'delivered') && (
              <Card className={order.status === 'dispatched' ? 'border-orange-200 bg-orange-50' : 'border-green-200 bg-green-50'}>
                <CardHeader>
                  <CardTitle className={`flex items-center gap-2 ${order.status === 'dispatched' ? 'text-orange-800' : 'text-green-800'
                    }`}>
                    <Package className="w-5 h-5" />
                    {order.status === 'dispatched' ? 'Shipping Information' : 'Delivery Information'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {order.status === 'dispatched' && (
                      <>
                        <div className="text-orange-700">
                          <span className="font-medium">Shipped on:</span> {order.dispatchedAt ? new Date(order.dispatchedAt).toLocaleString() : 'N/A'}
                        </div>
                        {(order as any).transport_type && (
                          <div className="text-orange-700">
                            <span className="font-medium">Transport:</span>{' '}
                            {(order as any).transport_type === 'own' ? 'Own Transport' : 'Outside Transport'}
                          </div>
                        )}
                        {(order as any).transport_vehicle_no && (
                          <div className="text-orange-700">
                            <span className="font-medium">Vehicle No:</span> {(order as any).transport_vehicle_no}
                          </div>
                        )}
                        {(order as any).transport_remark && (
                          <div className="text-orange-700">
                            <span className="font-medium">Remark:</span> {(order as any).transport_remark}
                          </div>
                        )}
                        <div className="text-orange-700">
                          <span className="font-medium">Status:</span> Ready for Delivery
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

            {/* Production Information - moved to main flow below timeline */}
            <OrderProductionInfo order={order} />

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

            {/* Payment Summary - no edit when order is cancelled */}
            <EditablePaymentCard
              readOnly={isCancelled}
              subtotal={(() => {
                // Calculate subtotal from items if not set
                if (order.subtotal && parseFloat(order.subtotal.toString()) > 0) {
                  return order.subtotal;
                }
                // Calculate from items
                const itemsSubtotal = orderItems.reduce((sum, item) => {
                  return sum + parseFloat(item.subtotal || '0');
                }, 0);
                return itemsSubtotal.toString();
              })()}
              gstAmount={(() => {
                // Calculate GST from items if order.gstAmount is not set
                if (order.gstAmount && parseFloat(order.gstAmount.toString()) > 0) {
                  return order.gstAmount;
                }
                // Calculate from items
                const itemsGst = orderItems.reduce((sum, item) => {
                  return sum + parseFloat(item.gst_amount || '0');
                }, 0);
                return itemsGst.toString();
              })()}
              discountAmount={order.discountAmount}
              totalAmount={(() => {
                // Calculate total from items (sum of all item total_price)
                const itemsTotal = orderItems.reduce((sum, item) => {
                  return sum + parseFloat(item.total_price || '0');
                }, 0);

                // If items total is greater than order.totalAmount, use items total (correct value)
                if (itemsTotal > parseFloat(order.totalAmount.toString())) {
                  return itemsTotal;
                }

                return parseFloat(order.totalAmount.toString());
              })()}
              paidAmount={parseFloat(order.paidAmount.toString())}
              outstandingAmount={(() => {
                // Recalculate outstanding based on correct total
                const itemsTotal = orderItems.reduce((sum, item) => {
                  return sum + parseFloat(item.total_price || '0');
                }, 0);

                const correctTotal = itemsTotal > parseFloat(order.totalAmount.toString())
                  ? itemsTotal
                  : parseFloat(order.totalAmount.toString());

                const discount = order.discountAmount ? parseFloat(order.discountAmount.toString()) : 0;
                const finalTotal = correctTotal - discount;
                const outstanding = finalTotal - parseFloat(order.paidAmount.toString());

                return outstanding;
              })()}
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
                {order.expectedDelivery && (() => {
                  const expectedDate = new Date(order.expectedDelivery.split('T')[0]);
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  expectedDate.setHours(0, 0, 0, 0);
                  const notDelivered = order.status !== 'delivered';
                  const isOverdue = notDelivered && expectedDate < today;
                  return (
                    <div>
                      <p className="text-sm text-gray-600">Expected Delivery</p>
                      <p className={`font-semibold ${isOverdue ? 'text-red-600' : ''}`}>{formatIndianDate(order.expectedDelivery)}</p>
                    </div>
                  );
                })()}
                {order.acceptedAt && (
                  <div>
                    <p className="text-sm text-gray-600">Accepted On</p>
                    <p className="font-semibold text-blue-600">{formatIndianDate(order.acceptedAt)}</p>
                  </div>
                )}
                {order.dispatchedAt && (
                  <div>
                    <p className="text-sm text-gray-600">Shipped On</p>
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

        {/* Custom Confirm Dialog */}
        {confirmDialogConfig && (
          <ConfirmDialog
            isOpen={showConfirmDialog}
            onClose={() => setShowConfirmDialog(false)}
            onConfirm={confirmDialogConfig.onConfirm}
            title={confirmDialogConfig.title}
            description={confirmDialogConfig.description}
            variant={confirmDialogConfig.variant}
            confirmText={
              confirmDialogConfig.title === 'Remove Last Item'
                ? 'Remove & Keep Open'
                : confirmDialogConfig.title === 'Cancel Order'
                  ? 'Cancel Order'
                  : 'Yes, Remove'
            }
            cancelText="Cancel"
          />
        )}

        {/* Transport Dialog */}
        <Dialog open={showTransportDialog} onOpenChange={setShowTransportDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-orange-600" />
                Transport Details
              </DialogTitle>
              <DialogDescription>Add transport info before shipping this order.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1">
                <Label>Transport Type</Label>
                <Select value={transportType} onValueChange={(v) => setTransportType(v as 'own' | 'outside')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="own">Own Transport</SelectItem>
                    <SelectItem value="outside">Outside Transport</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Vehicle No <span className="text-gray-400 text-xs">(optional)</span></Label>
                <Input
                  placeholder="e.g. MH12AB1234"
                  value={transportVehicleNo}
                  onChange={e => setTransportVehicleNo(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>Remark <span className="text-gray-400 text-xs">(optional)</span></Label>
                <Input
                  placeholder="Any notes about the shipment"
                  value={transportRemark}
                  onChange={e => setTransportRemark(e.target.value)}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowTransportDialog(false)} disabled={dispatchingOrder}>Cancel</Button>
              <Button className="bg-orange-600 hover:bg-orange-700 text-white" onClick={handleConfirmDispatch} disabled={dispatchingOrder}>
                {dispatchingOrder ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Shipping…</> : <><Package className="w-4 h-4 mr-2" />Ship Order</>}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}

// Simple inline add-item form
function AddItemInlineForm({ onSave, onCancel }: { onSave: (data: any) => Promise<void>; onCancel: () => void }) {
  const [productType, setProductType] = useState<'product' | 'raw_material'>('product');
  const [productId, setProductId] = useState('');
  const [rawMaterialId, setRawMaterialId] = useState('');
  const [productName, setProductName] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [unit, setUnit] = useState('rolls');
  const [pricingUnit, setPricingUnit] = useState<'unit' | 'sqm' | 'sqft' | 'running_meter' | 'gsm' | 'kg'>('unit');
  const [unitPrice, setUnitPrice] = useState('');
  const [gstRate, setGstRate] = useState('18');
  const [gstIncluded, setGstIncluded] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSelector, setShowSelector] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [productPage, setProductPage] = useState(1);
  const [materialPage, setMaterialPage] = useState(1);
  const { toast } = useToast();
  const currentItem: any = {
    id: 'inline-add-item',
    product_type: productType,
    product_id: productType === 'product' ? productId : rawMaterialId,
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        const { products: productData } = await ProductService.getProducts({
          page: 1,
          limit: 1000,
          sortBy: 'name',
          sortOrder: 'asc',
        });
        setProducts(
          (productData || []).map((p: any) => ({
            id: p.id || p._id,
            name: p.name,
            price: p.price || 0,
            current_stock: p.current_stock || 0,
            stock: p.current_stock || 0,
            category: p.category,
            subcategory: p.subcategory || '',
            color: p.color,
            pattern: p.pattern,
            width: p.width,
            length: p.length,
            weight: p.weight,
            width_unit: p.width_unit,
            length_unit: p.length_unit,
            weight_unit: p.weight_unit,
            unit: p.unit || 'SQM',
            count_unit: p.count_unit || 'rolls',
          }))
        );
      } catch (err) {
        console.error('Failed to load products:', err);
      }

      try {
        const result = await MaterialService.getMaterials({
          page: 1,
          limit: 1000,
          sortBy: 'name',
          sortOrder: 'asc',
        });
        setMaterials(
          (result.materials || []).map((m: any) => ({
            id: m.id || m._id,
            name: m.name,
            price: m.cost_per_unit || 0,
            current_stock: m.current_stock || 0,
            stock: m.current_stock || 0,
            available_stock: m.available_stock,
            category: m.category,
            type: m.type,
            color: m.color,
            unit: m.unit || 'units',
            supplier: m.supplier_name || '',
          }))
        );
      } catch (err) {
        console.error('Failed to load materials:', err);
      }
    };
    loadData();
  }, []);

  const selectedEntry =
    productType === 'product'
      ? products.find((p) => p.id === productId)
      : materials.find((m) => m.id === rawMaterialId);

  useEffect(() => {
    if (!selectedEntry) return;
    setProductName(selectedEntry.name || '');
    setUnit(productType === 'product' ? selectedEntry.count_unit || 'rolls' : selectedEntry.unit || 'units');
    setUnitPrice(String(selectedEntry.price || ''));
  }, [selectedEntry, productType]);

  const handleSave = async () => {
    if (!productName.trim() || !unitPrice || !selectedEntry) {
      toast({
        title: 'Required',
        description: 'Select item, quantity and pricing details.',
        variant: 'destructive',
      });
      return;
    }
    setSaving(true);
    try {
      const qty = parseFloat(quantity) || 1;
      const price = parseFloat(unitPrice) || 0;
      const gst = gstIncluded ? Math.max(0, parseFloat(gstRate) || 0) : 0;
      const subtotal = qty * price;
      const gstAmount = (subtotal * gst) / 100;
      const total = subtotal + gstAmount;
      await onSave({
        product_id: productType === 'product' ? productId : undefined,
        raw_material_id: productType === 'raw_material' ? rawMaterialId : undefined,
        product_name: productName.trim(),
        product_type: productType,
        quantity: qty,
        unit,
        pricing_unit: pricingUnit,
        unit_price: price,
        subtotal,
        total_price: total,
        gst_rate: gst,
        gst_amount: gstAmount,
        gst_included: gstIncluded,
        category: selectedEntry?.category || '',
        subcategory: selectedEntry?.subcategory || '',
        color: selectedEntry?.color || '',
        pattern: selectedEntry?.pattern || '',
        length: selectedEntry?.length || '',
        width: selectedEntry?.width || '',
        length_unit: selectedEntry?.length_unit || '',
        width_unit: selectedEntry?.width_unit || '',
        weight: selectedEntry?.weight || '',
        weight_unit: selectedEntry?.weight_unit || '',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="border border-dashed border-blue-300 rounded-lg p-4 bg-blue-50 space-y-3 mt-2">
      <p className="text-sm font-medium text-blue-800">Add New Item</p>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-1 space-y-1">
          <Label className="text-xs">Item Type</Label>
          <Select
            value={productType}
            onValueChange={(v: 'product' | 'raw_material') => {
              setProductType(v);
              setProductId('');
              setRawMaterialId('');
              setProductName('');
            }}
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="product">Product</SelectItem>
              <SelectItem value="raw_material">Raw Material</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="col-span-1 space-y-1">
          <Label className="text-xs">Select Item</Label>
          <Button variant="outline" className="w-full h-8 justify-start text-sm" onClick={() => setShowSelector(true)}>
            <Plus className="w-3 h-3 mr-1" />
            {productName || `Select ${productType === 'product' ? 'Product' : 'Raw Material'}`}
          </Button>
        </div>
        <div className="col-span-2 space-y-1">
          <Label className="text-xs">Item Name</Label>
          <Input placeholder="Selected item name" value={productName} readOnly className="h-8 text-sm bg-gray-50" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Quantity</Label>
          <Input type="number" min="1" value={quantity} onChange={e => setQuantity(e.target.value)} className="h-8 text-sm" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Unit</Label>
          <Input value={unit} onChange={e => setUnit(e.target.value)} className="h-8 text-sm" placeholder="rolls, sqm…" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Pricing Unit</Label>
          <Select value={pricingUnit} onValueChange={(v: 'unit' | 'sqm' | 'sqft' | 'running_meter' | 'gsm' | 'kg') => setPricingUnit(v)}>
            <SelectTrigger className="h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unit">Per Unit</SelectItem>
              <SelectItem value="sqm">Per SQM</SelectItem>
              <SelectItem value="sqft">Per SQFT</SelectItem>
              <SelectItem value="running_meter">Per Running Meter</SelectItem>
              <SelectItem value="gsm">Per GSM</SelectItem>
              <SelectItem value="kg">Per KG</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">GST %</Label>
          <Input type="number" min="0" max="28" value={gstRate} onChange={e => setGstRate(e.target.value)} className="h-8 text-sm" />
        </div>
        <div className="col-span-2 flex items-center gap-2">
          <input
            id="inline-gst-included"
            type="checkbox"
            checked={gstIncluded}
            onChange={e => setGstIncluded(e.target.checked)}
          />
          <Label htmlFor="inline-gst-included" className="text-xs">GST Included</Label>
        </div>
        <div className="col-span-2 space-y-1">
          <Label className="text-xs">Unit Price (₹)</Label>
          <Input type="number" min="0" value={unitPrice} onChange={e => setUnitPrice(e.target.value)} className="h-8 text-sm" placeholder="0" />
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <Button size="sm" variant="outline" onClick={onCancel} disabled={saving}>Cancel</Button>
        <Button size="sm" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Plus className="w-3 h-3 mr-1" />}
          Add
        </Button>
      </div>

      <ProductMaterialSelectionDialog
        isOpen={showSelector}
        onClose={() => setShowSelector(false)}
        currentItem={currentItem}
        products={products}
        materials={materials}
        productSearchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onSelectProduct={(selectedId) => {
          if (productType === 'product') {
            setProductId(selectedId);
            setRawMaterialId('');
          } else {
            setRawMaterialId(selectedId);
            setProductId('');
          }
          setShowSelector(false);
        }}
        productPage={productPage}
        materialPage={materialPage}
        productItemsPerPage={500}
        materialItemsPerPage={500}
        onProductPageChange={setProductPage}
        onMaterialPageChange={setMaterialPage}
      />
    </div>
  );
}
