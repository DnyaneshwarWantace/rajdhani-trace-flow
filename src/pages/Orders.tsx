import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { cleanupOrderNotifications } from "@/lib/storageUtils";
import { MongoDBOrderService } from "@/services/api/orderService";
import { CustomerService } from "@/services/customerService";
import ProductService, { Product } from "@/services/api/productService";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, Search, Filter, Eye, Edit, MoreHorizontal, Users, Package,
  ShoppingCart, Calendar, TrendingUp, AlertTriangle, CheckCircle,
  Clock, Factory, Truck, DollarSign, UserPlus, QrCode, Star, MapPin,
  ArrowLeft
} from "lucide-react";

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  company?: string;
  taxId?: string;
  creditLimit: number;
  outstandingAmount: number;
  status: "active" | "suspended" | "new";
  orderHistory: Order[];
}

interface IndividualProduct {
  id: string;
  qrCode: string;
  productId: string;
  manufacturingDate: string;
  finalDimensions: string;
  finalWeight: string;
  finalPileHeight: string;
  qualityGrade: "A+" | "A" | "B" | "C";
  inspector: string;
  status: "available" | "sold" | "damaged";
  batchNumber?: string;
  soldDate?: string;
  customerId?: string;
  orderId?: string;
}

interface OrderItem {
  productId: string;
  productName: string;
  productType: 'product' | 'raw_material';
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  selectedIndividualProducts: IndividualProduct[];
  qualityGrade: string;
  specifications?: string;
  unit?: string;
}

interface Order {
  id: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  orderDate: string;
  expectedDelivery: string;
  items: OrderItem[];
  subtotal: number;
  gstRate: number;
  gstAmount: number;
  discountAmount: number;
  totalAmount: number;
  paidAmount: number;
  outstandingAmount: number;
  paymentMethod: "cash" | "card" | "bank-transfer" | "credit";
  paymentTerms: string;
  dueDate?: string;
  status: "pending" | "accepted" | "in_production" | "ready" | "dispatched" | "delivered" | "cancelled";
  workflowStep: "accept" | "dispatch" | "delivered";
  acceptedAt?: string;
  dispatchedAt?: string;
  deliveredAt?: string;
  notes: string;
  // Delivery address stored with each order
  delivery_address?: {
    address: string;
    city: string;
    state: string;
    pincode: string;
  };
}



// All data is now loaded from Supabase

const statusStyles = {
  pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  accepted: "bg-blue-100 text-blue-800 border-blue-200",
  in_production: "bg-purple-100 text-purple-800 border-purple-200",
  ready: "bg-indigo-100 text-indigo-800 border-indigo-200",
  dispatched: "bg-orange-100 text-orange-800 border-orange-200",
  delivered: "bg-green-100 text-green-800 border-green-200",
  cancelled: "bg-red-100 text-red-800 border-red-200"
};

const qualityStyles = {
  "A+": "bg-purple-100 text-purple-800 border-purple-200",
  "A": "bg-green-100 text-green-800 border-green-200",
  "B": "bg-yellow-100 text-yellow-800 border-yellow-200",
  "C": "bg-red-100 text-red-800 border-red-200"
};

export default function Orders() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { hasPageAccess } = useAuth();
  
  // Check page permission
  const hasOrdersAccess = hasPageAccess('orders');
  
  // Redirect if no access
  useEffect(() => {
    if (!hasOrdersAccess) {
      navigate('/access-denied', { state: { pageName: 'Orders' } });
    }
  }, [hasOrdersAccess, navigate]);
  
  // Don't render if no permission
  if (!hasOrdersAccess) {
    return null;
  }
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [customerFilter, setCustomerFilter] = useState("all");

  const [currentStep, setCurrentStep] = useState(1);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [customerSearchTerm, setCustomerSearchTerm] = useState("");
  const [productSearchTerm, setProductSearchTerm] = useState("");

  // Load data from MongoDB
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load orders from MongoDB
        const { data: ordersData, error: ordersError } = await MongoDBOrderService.getOrders();
        if (ordersError) {
          console.error('Error loading orders:', ordersError);
          setOrders([]);
        } else {
          // Transform MongoDB orders to match local interface
          const transformedOrders: Order[] = (ordersData || []).map(order => ({
            id: order.id,
            orderNumber: order.order_number,
            customerId: order.customer_id,
            customerName: order.customer_name,
            customerEmail: order.customer_email,
            customerPhone: order.customer_phone,
            orderDate: order.order_date,
            expectedDelivery: order.expected_delivery,
            items: (order.order_items || []).map((item: any) => ({
              productId: item.product_id,
              productName: item.product_name,
              productType: item.product_type,
              quantity: item.quantity,
              unitPrice: parseFloat(item.unit_price),
              totalPrice: parseFloat(item.total_price),
              selectedIndividualProducts: item.selected_individual_products || [],
              qualityGrade: item.quality_grade || 'A',
              specifications: item.specifications || ''
            })),
            subtotal: parseFloat(order.subtotal),
            gstRate: parseFloat(order.gst_rate),
            gstAmount: parseFloat(order.gst_amount),
            discountAmount: parseFloat(order.discount_amount),
            totalAmount: parseFloat(order.total_amount),
            paidAmount: parseFloat(order.paid_amount),
            outstandingAmount: parseFloat(order.outstanding_amount),
            paymentMethod: (order.payment_method || "credit") as "cash" | "card" | "bank-transfer" | "credit",
            paymentTerms: order.payment_terms || "30 days",
            dueDate: order.due_date,
            status: order.status as "pending" | "accepted" | "dispatched" | "delivered" | "cancelled",
            workflowStep: (order.workflow_step || "accept") as "accept" | "dispatch" | "delivered",
            acceptedAt: order.accepted_at,
            dispatchedAt: order.dispatched_at,
            deliveredAt: order.delivered_at,
            notes: order.special_instructions || "",
            delivery_address: order.delivery_address ? JSON.parse(order.delivery_address) : undefined
          }));
          setOrders(transformedOrders);
        }

        // Load customers from MongoDB
        const { data: customersData, error: customersError } = await CustomerService.getCustomers();
        if (customersError) {
          console.error('Error loading customers:', customersError);
          setCustomers([]);
        } else {
          // Transform MongoDB customers to match local interface
          const transformedCustomers: Customer[] = (customersData || []).map(customer => ({
            id: customer.id,
            name: customer.name,
            email: customer.email,
            phone: customer.phone,
            address: customer.address || '',
            company: customer.company_name,
            taxId: customer.gst_number,
            creditLimit: 0, // Default value
            outstandingAmount: 0, // Default value
            status: customer.status === 'active' ? 'active' : 'suspended',
            orderHistory: [] // Default empty array
          }));
          setCustomers(transformedCustomers);
        }
        
        // Load products from MongoDB
        const { data: productsData, error: productsError } = await ProductService.getProducts();
        if (productsError) {
          console.error('Error loading products:', productsError);
          setProducts([]);
        } else {
          setProducts(productsData || []);
        }
        
      } catch (error) {
        console.error('Error loading data:', error);
        setOrders([]);
        setCustomers([]);
        setProducts([]);
      }
    };

    loadData();
  }, []);


  // Check if order can be dispatched (has enough selected individual products when stock is available)
  const canDispatchOrder = (order: Order) => {
    return order.items.every(item => {
      // Raw materials never need individual selection
      if (item.productType === 'raw_material') {
        return true;
      }
      
      // Check if this product has individual stock tracking
      const product = products.find(p => p.id === item.productId);
      const hasIndividualStock = product && product.individual_stock_tracking !== false;
      
      if (!hasIndividualStock) {
        // For bulk products, no individual selection needed
        return true;
      }
      
      // For individual stock products, ALWAYS require individual product selection
      // regardless of stock availability - this ensures proper tracking
      const selectedQuantity = item.selectedIndividualProducts ? item.selectedIndividualProducts.length : 0;
      const requiredQuantity = item.quantity;
      
      return selectedQuantity >= requiredQuantity;
    });
  };

  // Check if order has items that need individual product selection
  const needsIndividualProductSelection = (order: Order) => {
    return order.items.some(item => {
      // Raw materials never need individual selection
      if (item.productType === 'raw_material') {
        return false;
      }
      
      // Check if this product has individual stock tracking
      const product = products.find(p => p.id === item.productId);
      const hasIndividualStock = product && product.individual_stock_tracking !== false;
      
      if (!hasIndividualStock) {
        // For bulk products, no individual selection needed
        return false;
      }
      
      // For products with individual stock tracking, show selection option
      // The actual availability will be checked in the OrderDetails page
      return true;
    });
  };

  // Get order status message
  const getOrderStatusMessage = (order: Order) => {
    const hasRawMaterials = order.items.some(item => item.productType === 'raw_material');
    const hasBulkProducts = order.items.some(item => {
      const product = products.find(p => p.id === item.productId);
      return product && product.individual_stock_tracking === false;
    });
    const hasIndividualProducts = order.items.some(item => {
      const product = products.find(p => p.id === item.productId);
      return product && product.individual_stock_tracking !== false;
    });
    
    if (canDispatchOrder(order)) {
      if (hasRawMaterials && hasIndividualProducts) {
        return 'Ready to Dispatch (All Products Selected)';
      } else if (hasRawMaterials) {
      return 'Ready to Dispatch (Raw Materials)';
      } else if (hasBulkProducts) {
      return 'Ready to Dispatch (Bulk Products)';
      } else {
        return 'Ready to Dispatch (Individual Products Selected)';
      }
    } else {
      if (hasIndividualProducts) {
        return 'Awaiting Individual Product Selection';
    } else {
      return 'Awaiting Product Selection';
      }
    }
  };

  // Handle order dispatch - deduct stock and mark as dispatched
  const handleDispatchOrder = async (orderId: string) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    // Check if order can be dispatched
    if (!canDispatchOrder(order)) {
      toast({
        title: "❌ Cannot Dispatch Order",
        description: "Please select individual products for all items that require individual tracking. Go to order details to select specific products.",
        variant: "destructive"
      });
      return;
    }

    try {
      // Update order status to dispatched using MongoDBOrderService
      const { error } = await MongoDBOrderService.updateOrderStatus(orderId, 'dispatched');

      if (error) {
        toast({
          title: "❌ Dispatch Failed",
          description: `Failed to dispatch order: ${error}`,
          variant: "destructive"
        });
        return;
      }

      // Update local state
    const updatedOrders = orders.map(o => 
      o.id === orderId 
        ? { 
            ...o, 
            status: 'dispatched' as const, 
            workflowStep: 'dispatch' as const,
            dispatchedAt: new Date().toISOString()
          }
        : o
    );

    setOrders(updatedOrders);

    toast({
      title: "✅ Order Dispatched",
        description: "Order has been dispatched successfully. Individual products have been marked as sold.",
      });

    } catch (error) {
      console.error('Error dispatching order:', error);
      toast({
        title: "❌ Dispatch Failed",
        description: "An error occurred while dispatching the order. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Handle order delivery - mark as delivered
  const handleDeliverOrder = async (orderId: string) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    try {
      // Deliver order using MongoDBOrderService
      const { success, error } = await MongoDBOrderService.deliverOrder(orderId);
      
      if (error) {
      toast({
          title: "❌ Delivery Failed",
          description: error,
        variant: "destructive"
      });
      return;
    }

      // Update local state
    const updatedOrders = orders.map(o => 
      o.id === orderId 
        ? { 
            ...o, 
            status: 'delivered' as const, 
            workflowStep: 'delivered' as const,
            deliveredAt: new Date().toISOString()
          }
        : o
    );
    setOrders(updatedOrders);

    toast({
      title: "🎉 Order Delivered",
      description: "Order has been successfully delivered to the customer.",
      });
    } catch (error) {
      console.error('Error delivering order:', error);
      toast({
        title: "❌ Delivery Failed",
        description: "Failed to deliver order. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Handle order cancellation - mark as cancelled and cleanup notifications
  const handleCancelOrder = async (orderId: string) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    // Update order status
    const updatedOrders = orders.map(o => 
      o.id === orderId 
        ? { 
            ...o, 
            status: 'cancelled' as const,
            cancelledAt: new Date().toISOString()
          }
        : o
    );

    // Clean up notifications related to this order
    await cleanupOrderNotifications(orderId);

    // Data will be saved by OrderService
    setOrders(updatedOrders);

    toast({
      title: "❌ Order Cancelled",
      description: "Order has been cancelled and related notifications have been cleaned up.",
    });
  };

  // Filter orders
  const filteredOrders = orders.filter(order => {
    if (!order) return false;
    
    // Filter out orders with missing essential data
    if (!order.orderNumber || !order.customerName || !order.items || order.items.length === 0) {
      return false;
    }
    
    const matchesSearch = (order.orderNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (order.customerName || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    const matchesCustomer = customerFilter === "all" || order.customerId === customerFilter;
    return matchesSearch && matchesStatus && matchesCustomer;
  });

  // Enhanced Order Card Component
  const OrderCard = ({ order }: { order: Order }) => {
    if (!order) return null;
    
    const getStatusIcon = (status: string) => {
      switch (status) {
        case "pending": return <Clock className="w-4 h-4" />;
        case "accepted": return <CheckCircle className="w-4 h-4" />;
        case "in_production": return <Factory className="w-4 h-4" />;
        case "ready": return <Truck className="w-4 h-4" />;
        case "dispatched": return <Truck className="w-4 h-4" />;
        case "delivered": return <CheckCircle className="w-4 h-4" />;
        case "cancelled": return <AlertTriangle className="w-4 h-4" />;
        default: return <Clock className="w-4 h-4" />;
      }
    };

    return (
      <Card className="group relative overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer border-2 hover:border-blue-200">
        {/* Status Indicator Bar */}
        <div className={`absolute top-0 left-0 right-0 h-1 ${
          order.status === "delivered" ? "bg-green-500" :
          order.status === "dispatched" ? "bg-orange-500" :
          order.status === "ready" ? "bg-indigo-500" :
          order.status === "in_production" ? "bg-purple-500" :
          order.status === "accepted" ? "bg-blue-500" :
          order.status === "cancelled" ? "bg-red-500" :
          "bg-yellow-500"
        }`} />
        
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-start justify-between mb-3 sm:mb-4">
            <div className="min-w-0 flex-1 mr-3">
              <h3 className="font-bold text-base sm:text-lg group-hover:text-blue-600 transition-colors truncate">
                {order.orderNumber || 'N/A'}
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground truncate">{order.customerName || 'N/A'}</p>
            </div>
            <Badge className={`${statusStyles[order.status] || statusStyles.pending} shadow-sm text-xs flex-shrink-0`}>
              {getStatusIcon(order.status)}
              <span className="ml-1 hidden sm:inline">{order.status || 'pending'}</span>
            </Badge>
          </div>

          {/* Workflow Progress Bar */}
          <div className="mb-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
              <span>Order Progress</span>
              <span>{order.workflowStep || 'accept'}</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="flex-1 bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${
                    order.status === 'delivered' ? 'bg-green-500' :
                    order.status === 'dispatched' ? 'bg-orange-500' :
                    order.status === 'accepted' ? 'bg-blue-500' :
                    'bg-gray-300'
                  }`}
                  style={{
                    width: order.status === 'delivered' ? '100%' :
                           order.status === 'dispatched' ? '66%' :
                           order.status === 'accepted' ? '33%' : '0%'
                  }}
                />
              </div>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span className={order.status === 'accepted' ? 'text-blue-600 font-medium' : ''}>Accept</span>
              <span className={order.status === 'dispatched' ? 'text-orange-600 font-medium' : ''}>Dispatch</span>
              <span className={order.status === 'delivered' ? 'text-green-600 font-medium' : ''}>Delivered</span>
            </div>
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Order Date:</span>
                <div className="font-medium">
                  {order.orderDate ? new Date(order.orderDate).toLocaleDateString() : 'N/A'}
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">Expected Delivery:</span>
                <div className="font-medium">
                  {order.expectedDelivery ? new Date(order.expectedDelivery).toLocaleDateString() : 'N/A'}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Items:</span>
                <div className="font-medium">{order.items?.length || 0} {order.items?.some(item => item.productType === 'raw_material') ? 'items' : 'products'}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Total Amount:</span>
                <div className="font-medium">₹{(order.totalAmount || 0).toLocaleString()}</div>
              </div>
            </div>

            {/* Order Items Details */}
            {order.items && order.items.length > 0 && (
              <div className={`mt-4 ${order.status === 'delivered' ? 'p-2' : 'p-3'} bg-gray-50 rounded-lg`}>
                <h4 className={`font-medium text-gray-900 ${order.status === 'delivered' ? 'mb-2' : 'mb-3'}`}>
                  {order.status === 'delivered' ? 'Items Delivered:' : 'Order Items:'}
                </h4>
                <div className={`${order.status === 'delivered' ? 'space-y-1' : 'space-y-2'}`}>
                  {order.items.map((item, index) => (
                    <div key={index} className={`flex items-center justify-between ${order.status === 'delivered' ? 'p-1' : 'p-2'} bg-white rounded border`}>
                      <div className="flex-1">
                        <div className={`font-medium ${order.status === 'delivered' ? 'text-xs' : 'text-sm'}`}>{item.productName}</div>
                        <div className={`text-xs text-gray-600 ${order.status === 'delivered' ? 'mt-0' : ''}`}>
                          {item.productType === 'raw_material' ? 'Raw Material' : 'Finished Product'} • 
                          Qty: {item.quantity} {item.unit || 'pieces'} • 
                          ₹{item.unitPrice}/{item.unit || 'unit'}
                        </div>
                        {item.selectedIndividualProducts && item.selectedIndividualProducts.length > 0 && (
                          <div className={`text-xs text-blue-600 ${order.status === 'delivered' ? 'mt-0' : 'mt-1'}`}>
                            {order.status === 'delivered' ? 
                              `Delivered: ${item.selectedIndividualProducts.length} pieces` :
                              `Individual IDs: ${item.selectedIndividualProducts.map(p => p.qrCode || p.id).join(', ')}`
                            }
                          </div>
                        )}
                      </div>
                      <div className={`${order.status === 'delivered' ? 'text-xs' : 'text-sm'} font-medium`}>
                        ₹{(item.totalPrice || 0).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Delivery Address for Delivered Orders */}
            {order.status === 'delivered' && order.delivery_address && (
              <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <h4 className="text-sm font-medium text-green-800 mb-2 flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Delivered To:
                </h4>
                <div className="text-sm text-green-700">
                  <div className="font-medium">{order.delivery_address.address}</div>
                  <div className="text-green-600">
                    {order.delivery_address.city}, {order.delivery_address.state} - {order.delivery_address.pincode}
                  </div>
                  <div className="text-xs text-green-600 mt-1">✓ Address preserved from order creation</div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Paid:</span>
                <div className="font-medium text-green-600">₹{(order.paidAmount || 0).toLocaleString()}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Outstanding:</span>
                <div className="font-medium text-red-600">₹{(order.outstandingAmount || 0).toLocaleString()}</div>
              </div>
            </div>

            {order.status === "accepted" && (
              <div className="bg-blue-50 p-3 rounded-lg">
                <div className="flex items-center gap-2 text-blue-700 font-medium">
                  <CheckCircle className="w-4 h-4" />
                  <span>Order Accepted</span>
                </div>
                <p className="text-blue-600 text-sm mt-1">
                  Order is ready for dispatch when stock is available
                </p>
              </div>
            )}

            {/* Workflow Action Buttons */}
            {order.status === 'accepted' && (
              <div className="bg-blue-50 p-3 rounded-lg mb-3">
                <div className="flex items-center gap-2 text-blue-700 font-medium mb-2">
                  <CheckCircle className="w-4 h-4" />
                  <span>Order Accepted - {getOrderStatusMessage(order)}</span>
                </div>
                {canDispatchOrder(order) ? (
                <Button 
                  className="w-full bg-orange-600 hover:bg-orange-700"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDispatchOrder(order.id);
                  }}
                >
                  <Package className="w-4 h-4 mr-2" />
                  Dispatch Order
                </Button>
                ) : (
                  <div className="space-y-2">
                    <Button 
                      className="w-full bg-gray-400 cursor-not-allowed"
                      size="sm"
                      disabled
                    >
                      <Package className="w-4 h-4 mr-2" />
                      Dispatch Order (Individual Products Required)
                    </Button>
                    {needsIndividualProductSelection(order) ? (
                      <>
                    <Button 
                      className="w-full bg-blue-600 hover:bg-blue-700"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/orders/${order.id}`);
                      }}
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Select Individual Products
                    </Button>
                    <div className="text-xs text-gray-600 text-center">
                          Individual product selection is required for items with available individual products
                    </div>
                      </>
                    ) : (
                      <div className="text-xs text-gray-600 text-center">
                        No individual products available for selection
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {order.status === 'dispatched' && (
              <div className="bg-orange-50 p-3 rounded-lg mb-3">
                <div className="flex items-center gap-2 text-orange-700 font-medium mb-2">
                  <Package className="w-4 h-4" />
                  <span>Order Dispatched - Ready to Deliver</span>
                </div>
                
                {/* Payment Status */}
                <div className="mb-3 p-2 bg-white rounded border">
                  <div className="flex justify-between text-sm">
                    <span>Paid Amount:</span>
                    <span className="font-medium text-green-600">₹{(order.paidAmount || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Outstanding:</span>
                    <span className={`font-medium ${(order.outstandingAmount || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      ₹{(order.outstandingAmount || 0).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Outstanding Amount Info */}
                {order.outstandingAmount > 0 && (
                  <div className="text-xs text-orange-700 bg-orange-100 p-2 rounded mb-2">
                    <strong>Outstanding Amount:</strong> ₹{order.outstandingAmount.toLocaleString()}
                    </div>
                )}
                
                <Button 
                  className="w-full bg-green-600 hover:bg-green-700"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeliverOrder(order.id);
                  }}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Mark as Delivered
                </Button>
              </div>
            )}

            {order.status === 'delivered' && (
              <div className="bg-green-50 p-3 rounded-lg mb-3">
                <div className="flex items-center gap-2 text-green-700 font-medium mb-2">
                  <CheckCircle className="w-4 h-4" />
                  <span>Order Delivered Successfully</span>
                </div>
                
                {/* Compact Payment Summary */}
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex justify-between">
                    <span>Paid:</span>
                    <span className="font-medium text-green-600">₹{(order.paidAmount || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Outstanding:</span>
                    <span className={`font-medium ${(order.outstandingAmount || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      ₹{(order.outstandingAmount || 0).toLocaleString()}
                    </span>
                  </div>
                </div>
                
                <div className="text-xs text-green-600 mt-2">
                  Delivered on {order.deliveredAt ? new Date(order.deliveredAt).toLocaleDateString() : 'N/A'}
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button 
                className="flex-1" 
                variant="outline" 
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  if (order.id) {
                    navigate(`/orders/${order.id}`);
                  }
                }}
              >
                <Eye className="w-4 h-4 mr-2" />
                View Details
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  if (order.id) {
                    navigate(`/orders/${order.id}`);
                  }
                }}
              >
                <Edit className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="flex-1 space-y-4 sm:space-y-6 p-3 sm:p-4 lg:p-6">
      <Header
        title="Order Management"
        subtitle="Manage orders & track production"
      />

      {/* Enhanced Controls - Mobile Responsive */}
      <Card className="p-4 sm:p-6">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search orders..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <div className="flex gap-2 sm:gap-3">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-32 lg:w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="accepted">Accepted</SelectItem>
                  <SelectItem value="in_production">In Production</SelectItem>
                  <SelectItem value="ready">Ready</SelectItem>
                  <SelectItem value="dispatched">Dispatched</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>

              <Select value={customerFilter} onValueChange={setCustomerFilter}>
                <SelectTrigger className="w-full sm:w-36 lg:w-48">
                  <SelectValue placeholder="Customer" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Customers</SelectItem>
                  {customers.map(customer => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <Button
              onClick={() => navigate('/orders/new')}
              className="w-full sm:w-auto"
            >
              <Plus className="w-4 h-4 mr-2" />
              <span className="sm:hidden">Add New Order</span>
              <span className="hidden sm:inline">New Order</span>
            </Button>
          </div>
        </div>
      </Card>

      {/* Enhanced Order Grid - Mobile Responsive */}
      {filteredOrders.length > 0 ? (
        <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {filteredOrders.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </div>
      ) : (
        <Card className="p-12 text-center">
          <ShoppingCart className="w-20 h-20 mx-auto mb-6 text-muted-foreground" />
          <h3 className="text-xl font-semibold mb-3">No Orders Found</h3>
          <p className="text-muted-foreground mb-6">
            {searchTerm || statusFilter !== "all" || customerFilter !== "all" 
              ? "Try adjusting your search or filters"
              : "Get started by creating your first order"}
          </p>
          <Button onClick={() => navigate('/orders/new')}>
            <Plus className="w-4 h-4 mr-2" />
            Create Order
          </Button>
        </Card>
      )}


      
    </div>
  );
}