import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { MongoDBOrderService } from "@/services/api/orderService";
import { CustomerService } from "@/services/customerService";
import ProductService from "@/services/api/productService";
import IndividualProductService from "@/services/api/individualProductService";
import RawMaterialService from "@/services/api/rawMaterialService";
import AuthService from "@/services/api/authService";
import { supabase } from "@/lib/supabase";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, Package, User, Calendar, MapPin, Phone, Mail, 
  AlertTriangle, Factory, CheckCircle, Clock, DollarSign,
  FileText, Download, Printer, Share2, Edit, Trash2, Plus, X, QrCode
} from "lucide-react";

interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  productType: 'product' | 'raw_material';
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  availableStock: number;
  unit: string; // Add unit field for displaying proper quantity units

  selectedIndividualProducts: any[];
}

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  // New address fields
  permanentAddress?: {
    address: string;
    city: string;
    state: string;
    pincode: string;
  };
  deliveryAddress?: {
    address: string;
    city: string;
    state: string;
    pincode: string;
  };
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
  status: "pending" | "accepted" | "dispatched" | "delivered" | "cancelled";
  workflowStep: "accept" | "dispatch" | "delivered";
  acceptedAt?: string;
  dispatchedAt?: string;
  deliveredAt?: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
  // Delivery address stored with each order
  delivery_address?: {
    address: string;
    city: string;
    state: string;
    pincode: string;
  };
}

export default function OrderDetails() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [isEditingPayment, setIsEditingPayment] = useState(false);
  const [availableIndividualProducts, setAvailableIndividualProducts] = useState<any[]>([]);
  const [showIndividualProductSelection, setShowIndividualProductSelection] = useState(false);
  const [currentSelectingItem, setCurrentSelectingItem] = useState<OrderItem | null>(null);
  const [showQRCode, setShowQRCode] = useState(false);
  const [selectedQRProduct, setSelectedQRProduct] = useState<any>(null);

  // Get available individual products for a specific product
  const getAvailableIndividualProductsForProduct = (productId: string) => {
    const filtered = availableIndividualProducts.filter(ip => {
      return ip.product_id === productId;
    });
    return filtered;
  };

  // Handle individual product selection
  const handleIndividualProductSelection = (orderItemId: string, individualProduct: any, isSelected: boolean) => {
    if (!order) return;

    const updatedOrder = {
      ...order,
      items: order.items.map(item => {
        if (item.id === orderItemId) {
          let updatedSelectedProducts = [...(item.selectedIndividualProducts || [])];
          
          if (isSelected) {
            if (!updatedSelectedProducts.find(p => p.id === individualProduct.id)) {
              updatedSelectedProducts.push({
                id: individualProduct.id,
                qrCode: individualProduct.qr_code,
                productId: individualProduct.product_id,
                productName: individualProduct.product_name,
                manufacturingDate: individualProduct.completion_date || individualProduct.production_date || individualProduct.added_date,
                dimensions: `${individualProduct.final_length || individualProduct.length} x ${individualProduct.final_width || individualProduct.width}`,
                weight: individualProduct.final_weight || individualProduct.weight,
                qualityGrade: individualProduct.quality_grade,
                inspector: individualProduct.inspector || 'N/A',
                status: individualProduct.status,
                location: individualProduct.location
              });
            }
    } else {
            updatedSelectedProducts = updatedSelectedProducts.filter(p => p.id !== individualProduct.id);
          }
          
          return {
            ...item,
            selectedIndividualProducts: updatedSelectedProducts
          };
        }
        return item;
      })
    };

    setOrder(updatedOrder);
    setEditingOrder(updatedOrder);
    
    // Update currentSelectingItem if it's the same item being updated
    if (currentSelectingItem && currentSelectingItem.id === orderItemId) {
      const updatedItem = updatedOrder.items.find(item => item.id === orderItemId);
      if (updatedItem) {
        setCurrentSelectingItem(updatedItem);
      }
    }
  };

  // Auto-select oldest pieces
  const autoSelectOldestPieces = (orderItemId: string, quantity: number) => {
    if (!order || !currentSelectingItem) return;

    const availableProducts = getAvailableIndividualProductsForProduct(currentSelectingItem.productId);
    const selectedProducts = availableProducts.slice(0, Math.min(quantity, availableProducts.length));
    
    const updatedOrder = {
      ...order,
      items: order.items.map(item => {
        if (item.id === orderItemId) {
          return {
            ...item,
            selectedIndividualProducts: selectedProducts.map(ip => ({
              id: ip.id,
              qrCode: ip.qr_code,
              productId: ip.product_id,
              productName: ip.product_name,
              manufacturingDate: ip.completion_date || ip.production_date || ip.added_date,
              dimensions: `${ip.final_length || ip.length} x ${ip.final_width || ip.width}`,
              weight: ip.final_weight || ip.weight,
              qualityGrade: ip.quality_grade,
              inspector: ip.inspector || 'N/A',
              status: ip.status,
              location: ip.location
            }))
          };
        }
        return item;
      })
    };

    setOrder(updatedOrder);
    setEditingOrder(updatedOrder);
    
    // Update currentSelectingItem if it's the same item being updated
    if (currentSelectingItem && currentSelectingItem.id === orderItemId) {
      const updatedItem = updatedOrder.items.find(item => item.id === orderItemId);
      if (updatedItem) {
        setCurrentSelectingItem(updatedItem);
      }
    }
  };

  // Save individual product selections to database
  const saveIndividualProductSelections = async () => {
    if (!order || !currentSelectingItem) return;

    try {
      const selectedProducts = currentSelectingItem.selectedIndividualProducts || [];
      
      // Transform the selected products to match the backend expected format
      const selectedIndividualProducts = selectedProducts.map(product => ({
        individual_product_id: product.id,
        qr_code: product.qrCode,
        serial_number: product.serialNumber || product.id
      }));

      // Use the correct API endpoint for updating individual product selections
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
      const token = AuthService.getToken(); // Use AuthService instead of direct localStorage
      if (!token) {
        toast({
          title: "Error",
          description: "Authentication required. Please log in again.",
          variant: "destructive"
        });
        return;
      }
      const response = await fetch(`${API_BASE_URL}/orders/items/${currentSelectingItem.id}/individual-products`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          selected_individual_products: selectedIndividualProducts
        })
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        console.error('Error updating individual product selections:', result.error);
        toast({
          title: "Error",
          description: "Failed to save individual product selections.",
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Success",
        description: `Selected ${selectedProducts.length} individual products for ${currentSelectingItem.productName}.`,
      });

      setShowIndividualProductSelection(false);
      setCurrentSelectingItem(null);

      // Reload order data to get updated individual product selections
      const { data: updatedOrderData, error: reloadError } = await MongoDBOrderService.getOrderById(order.id);
      if (!reloadError && updatedOrderData) {
        const orderInfo = (updatedOrderData as any).order || updatedOrderData;
        const orderItems = (updatedOrderData as any).items || [];
        
        const transformedOrder: Order = {
          id: orderInfo.id,
          orderNumber: orderInfo.order_number,
          customerId: orderInfo.customer_id,
          customerName: orderInfo.customer_name,
          customerEmail: orderInfo.customer_email,
          customerPhone: orderInfo.customer_phone,
          orderDate: orderInfo.order_date,
          expectedDelivery: orderInfo.expected_delivery,
          items: orderItems.map((item: any) => ({
            id: item.id,
            productId: item.product_id,
            productName: item.product_name,
            productType: item.product_type || 'product',
            quantity: item.quantity,
            unitPrice: parseFloat(item.unit_price),
            totalPrice: parseFloat(item.total_price),
            availableStock: 0,
            unit: item.product_type === 'raw_material' ? 'kg' : 'pieces', // Use correct unit based on product type
            selectedIndividualProducts: (item.selected_individual_products || []).map((ip: any) => ({
              id: ip.individual_product_id,
              qrCode: ip.qr_code,
              productId: ip.product_id || item.product_id,
              productName: ip.product_name || item.product_name,
              manufacturingDate: ip.completion_date || ip.production_date || ip.added_date,
              dimensions: `${ip.final_length || ip.length || 'N/A'} x ${ip.final_width || ip.width || 'N/A'}`,
              weight: ip.final_weight || ip.weight || 'N/A',
              qualityGrade: ip.quality_grade || 'N/A',
              inspector: ip.inspector || 'N/A',
              status: ip.status || 'available',
              location: ip.location || 'N/A'
            }))
          })),
          subtotal: parseFloat(orderInfo.subtotal),
          gstRate: parseFloat(orderInfo.gst_rate),
          gstAmount: parseFloat(orderInfo.gst_amount),
          discountAmount: parseFloat(orderInfo.discount_amount),
          totalAmount: parseFloat(orderInfo.total_amount),
          paidAmount: parseFloat(orderInfo.paid_amount),
          outstandingAmount: parseFloat(orderInfo.outstanding_amount),
          paymentMethod: (orderInfo.payment_method || "credit") as "cash" | "card" | "bank-transfer" | "credit",
          paymentTerms: orderInfo.payment_terms || "30 days",
          dueDate: orderInfo.expected_delivery,
          status: orderInfo.status as "pending" | "accepted" | "dispatched" | "delivered" | "cancelled",
          workflowStep: (orderInfo.workflow_step || "accept") as "accept" | "dispatch" | "delivered",
          acceptedAt: orderInfo.accepted_at,
          dispatchedAt: orderInfo.dispatched_at,
          deliveredAt: orderInfo.delivered_at,
          notes: orderInfo.special_instructions || "",
          createdAt: orderInfo.created_at,
          updatedAt: orderInfo.updated_at,
          delivery_address: orderInfo.delivery_address ? JSON.parse(orderInfo.delivery_address) : undefined
        };
        
        // Enhance selected individual products with full details
        const enhancedOrder = {
          ...transformedOrder,
          items: transformedOrder.items.map(item => ({
            ...item,
            selectedIndividualProducts: item.selectedIndividualProducts.map(selectedIP => {
              // Find the full individual product details from the available products
              const fullIPDetails = availableIndividualProducts?.find(ip => ip.id === selectedIP.id);
              if (fullIPDetails) {
                return {
                  ...selectedIP,
                  qrCode: fullIPDetails.qr_code,
                  weight: fullIPDetails.final_weight || fullIPDetails.weight,
                  manufacturingDate: fullIPDetails.completion_date || fullIPDetails.production_date || fullIPDetails.created_at,
                  qualityGrade: fullIPDetails.quality_grade,
                  inspector: fullIPDetails.inspector,
                  dimensions: `${fullIPDetails.final_length || fullIPDetails.length} x ${fullIPDetails.final_width || fullIPDetails.width}`,
                  location: fullIPDetails.location
                };
              }
              return selectedIP;
            })
          }))
        };
        
        setOrder(enhancedOrder);
        setEditingOrder(enhancedOrder);
      }
    } catch (error) {
      console.error('Error saving individual product selections:', error);
      toast({
        title: "Error",
        description: "Failed to save individual product selections.",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    const loadOrderData = async () => {
      try {
        // Load order from Supabase
        const { data: orderData, error: orderError } = await MongoDBOrderService.getOrderById(orderId);
        
        if (orderError || !orderData) {
      toast({
        title: "Order Not Found",
        description: "The requested order could not be found.",
        variant: "destructive"
      });
      navigate('/orders');
          return;
        }

        // Transform MongoDB order to match local interface
        const orderInfo = (orderData as any).order || orderData; // Handle both response formats
        const orderItems = (orderData as any).items || []; // Get items from response
        
        const transformedOrder: Order = {
          id: orderInfo.id,
          orderNumber: orderInfo.order_number,
          customerId: orderInfo.customer_id,
          customerName: orderInfo.customer_name,
          customerEmail: orderInfo.customer_email,
          customerPhone: orderInfo.customer_phone,
          orderDate: orderInfo.order_date,
          expectedDelivery: orderInfo.expected_delivery,
          items: (orderItems || []).map((item: any) => ({
            id: item.id,
            productId: item.product_id,
            productName: item.product_name,
            productType: item.product_type || 'product',
            quantity: item.quantity,
            unitPrice: parseFloat(item.unit_price),
            totalPrice: parseFloat(item.total_price),
            availableStock: 0, // Will be populated from products
            unit: item.product_type === 'raw_material' ? 'kg' : 'pieces', // Use correct unit based on product type // Add missing unit property
            selectedIndividualProducts: (item.selected_individual_products || []).map((ip: any) => ({
              id: ip.individual_product_id,
              qrCode: ip.qr_code,
              productId: ip.product_id || item.product_id,
              productName: ip.product_name || item.product_name,
              manufacturingDate: ip.completion_date || ip.production_date || ip.added_date,
              dimensions: `${ip.final_length || ip.length || 'N/A'} x ${ip.final_width || ip.width || 'N/A'}`,
              weight: ip.final_weight || ip.weight || 'N/A',
              qualityGrade: ip.quality_grade || 'N/A',
              inspector: ip.inspector || 'N/A',
              status: ip.status || 'available',
              location: ip.location || 'N/A'
            }))
          })),
          subtotal: parseFloat(orderInfo.subtotal),
          gstRate: parseFloat(orderInfo.gst_rate),
          gstAmount: parseFloat(orderInfo.gst_amount),
          discountAmount: parseFloat(orderInfo.discount_amount),
          totalAmount: parseFloat(orderInfo.total_amount),
          paidAmount: parseFloat(orderInfo.paid_amount),
          outstandingAmount: parseFloat(orderInfo.outstanding_amount),
          paymentMethod: (orderInfo.payment_method || "credit") as "cash" | "card" | "bank-transfer" | "credit",
          paymentTerms: orderInfo.payment_terms || "30 days",
          dueDate: orderInfo.expected_delivery,
          status: orderInfo.status as "pending" | "accepted" | "dispatched" | "delivered" | "cancelled",
          workflowStep: (orderInfo.workflow_step || "accept") as "accept" | "dispatch" | "delivered",
          acceptedAt: orderInfo.accepted_at,
          dispatchedAt: orderInfo.dispatched_at,
          deliveredAt: orderInfo.delivered_at,
          notes: orderInfo.special_instructions || "",
          createdAt: orderInfo.created_at,
          updatedAt: orderInfo.updated_at,
          delivery_address: orderInfo.delivery_address ? JSON.parse(orderInfo.delivery_address) : undefined
        };

        setOrder(transformedOrder);
        setEditingOrder(transformedOrder);

        // Load products for stock information
        const { data: productsData } = await ProductService.getProducts();
        setProducts(productsData || []);

        // Individual products are already included in order items via selected_individual_products field

        // Update order items with unit information
        const updatedOrder = {
          ...transformedOrder,
          items: transformedOrder.items.map(item => {
            // Individual products are already included in the order items via selected_individual_products field

            // Find product unit information
            const productData = (productsData || []).find(p => p.id === item.productId);
            const productUnit = productData?.unit || (item.productType === 'raw_material' ? 'kg' : 'pieces');

            return {
              ...item,
              unit: productUnit, // Add unit information from product data
              selectedIndividualProducts: item.selectedIndividualProducts || [] // Individual products are already in the order item
            };
          })
        };
        
        setOrder(updatedOrder);
        setEditingOrder(updatedOrder);

        // Load all available individual products for selection
        const { data: allIndividualProducts, error: individualProductsError } = await IndividualProductService.getAllAvailableIndividualProducts();
        setAvailableIndividualProducts(allIndividualProducts || []);

        // Now update the order with available stock calculation
        const finalUpdatedOrder = {
          ...updatedOrder,
          items: updatedOrder.items.map(item => {
            const productData = (productsData || []).find(p => p.id === item.productId);
            
            // Calculate available stock (following Supabase logic)
            let availableStock = 0;
            if (productData) {
              // Check if there are individual products for this product
              const productIndividualProducts = (allIndividualProducts || []).filter(ip => ip.product_id === item.productId);
              
              if (productIndividualProducts.length > 0) {
                // If individual products exist, count only available ones (regardless of tracking setting)
                availableStock = productIndividualProducts.filter(ip => ip.status === 'available').length;
              } else {
                // If no individual products exist, use base_quantity
                availableStock = productData.base_quantity || 0;
              }
            }

            return {
              ...item,
              availableStock: availableStock
            };
          })
        };
        
        setOrder(finalUpdatedOrder);
        setEditingOrder(finalUpdatedOrder);

        // Enhance selected individual products with full details
        const enhancedOrder = {
          ...transformedOrder,
          items: transformedOrder.items.map(item => ({
            ...item,
            selectedIndividualProducts: item.selectedIndividualProducts.map(selectedIP => {
              // Find the full individual product details from the loaded data
              const fullIPDetails = allIndividualProducts?.find(ip => ip.id === selectedIP.id);
              if (fullIPDetails) {
                return {
                  ...selectedIP,
                  qrCode: fullIPDetails.qr_code,
                  weight: fullIPDetails.final_weight || fullIPDetails.weight,
                  manufacturingDate: fullIPDetails.completion_date || fullIPDetails.production_date || fullIPDetails.created_at,
                  qualityGrade: fullIPDetails.quality_grade,
                  inspector: fullIPDetails.inspector,
                  dimensions: `${fullIPDetails.final_length || fullIPDetails.length} x ${fullIPDetails.final_width || fullIPDetails.width}`,
                  location: fullIPDetails.location
                };
              }
              return selectedIP;
            })
          }))
        };
        
        setOrder(enhancedOrder);
        setEditingOrder(enhancedOrder);

    setLoading(false);
      } catch (error) {
        console.error('Error loading order:', error);
        toast({
          title: "Error",
          description: "Failed to load order data.",
          variant: "destructive"
        });
        navigate('/orders');
      }
    };

    loadOrderData();
  }, [orderId, navigate, toast]);

  // Handle order modification
  const handleSaveChanges = async () => {
    if (!editingOrder) return;

    try {
      // For delivered orders, use manually edited values; for others, recalculate
      let subtotal, gstAmount, totalAmount, outstandingAmount, paidAmount;
      
      if (order.status === 'delivered') {
        // Use manually edited values for delivered orders
        totalAmount = editingOrder.totalAmount;
        outstandingAmount = editingOrder.outstandingAmount;
        paidAmount = editingOrder.paidAmount;
        
        // Calculate subtotal and GST from total amount
        subtotal = editingOrder.items.reduce((sum, item) => sum + item.totalPrice, 0);
        gstAmount = totalAmount - subtotal;
      } else {
        // Recalculate totals for non-delivered orders
        subtotal = editingOrder.items.reduce((sum, item) => sum + item.totalPrice, 0);
        gstAmount = (subtotal * editingOrder.gstRate) / 100;
        totalAmount = subtotal + gstAmount;
        outstandingAmount = totalAmount - editingOrder.paidAmount;
      }

      // Update order in Supabase
      const { error } = await MongoDBOrderService.updateOrder(orderId!, {
        paid_amount: editingOrder.paidAmount,
        total_amount: totalAmount,
        outstanding_amount: outstandingAmount,
        subtotal: subtotal,
        gst_amount: gstAmount,
        items: editingOrder.items.map(item => ({
          id: item.id,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          total_price: item.totalPrice,
          selected_individual_products: item.selectedIndividualProducts?.map(p => p.id) || []
        }))
      });

      if (error) {
        toast({
          title: "Error",
          description: "Failed to update order. Please try again.",
          variant: "destructive"
        });
        return;
      }

    const updatedOrder = {
      ...editingOrder,
      subtotal,
      gstAmount,
      totalAmount,
      outstandingAmount
    };

    setOrder(updatedOrder);
    setIsEditing(false);

    toast({
      title: "Order Updated",
      description: "Order has been successfully updated.",
    });
    } catch (error) {
      console.error('Error updating order:', error);
      toast({
        title: "Error",
        description: "Failed to update order. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Add new item to order
  const handleAddItem = () => {
    if (!editingOrder) return;

    const newItem = {
      id: `item-${Date.now()}`,
      productId: '',
      productName: '',
      productType: 'product' as const,
      quantity: 1,
      unitPrice: 0,
      totalPrice: 0,
      availableStock: 0,
      unit: 'pieces', // Default unit, will be updated when product is selected
            selectedIndividualProducts: []
    };

    setEditingOrder({
      ...editingOrder,
      items: [...editingOrder.items, newItem]
    });
  };

  // Remove item from order
  const handleRemoveItem = (itemId: string) => {
    if (!editingOrder) return;

    setEditingOrder({
      ...editingOrder,
      items: editingOrder.items.filter(item => item.id !== itemId)
    });
  };

  // Update item in order
  const handleUpdateItem = (itemId: string, field: string, value: any) => {
    if (!editingOrder) return;

    const updatedItems = editingOrder.items.map(item => {
      if (item.id === itemId) {
        const updatedItem = { ...item, [field]: value };
        
        // Recalculate total price if quantity or unit price changed
        if (field === 'quantity' || field === 'unitPrice') {
          updatedItem.totalPrice = updatedItem.quantity * updatedItem.unitPrice;
        }
        
        // Update product name if product changed
        if (field === 'productId') {
          const product = products.find(p => p.id === value);
          if (product) {
            updatedItem.productName = product.name;
            updatedItem.unitPrice = product.sellingPrice || product.price || 0;
            
            // Calculate available stock (following Supabase logic)
            if (product.individual_stock_tracking !== false) {
              // Check if there are individual products for this product
              const productIndividualProducts = availableIndividualProducts.filter(ip => ip.product_id === value);
              
              if (productIndividualProducts.length > 0) {
                // If individual products exist, count only available ones
                updatedItem.availableStock = productIndividualProducts.filter(ip => ip.status === 'available').length;
              } else {
                // If no individual products exist, use base_quantity
                updatedItem.availableStock = product.base_quantity || 0;
              }
            } else {
              // For bulk products, check if there are individual products
              const productIndividualProducts = availableIndividualProducts.filter(ip => ip.product_id === value);
              
              if (productIndividualProducts.length > 0) {
                // If individual products exist, count only available ones
                updatedItem.availableStock = productIndividualProducts.filter(ip => ip.status === 'available').length;
              } else {
                // If no individual products exist, use base_quantity
                updatedItem.availableStock = product.base_quantity || 0;
              }
            }
            
            updatedItem.unit = product.unit || (item.productType === 'raw_material' ? 'kg' : 'pieces');
            updatedItem.totalPrice = updatedItem.quantity * updatedItem.unitPrice;
          }
        }
        
        return updatedItem;
      }
      return item;
    });

    setEditingOrder({
      ...editingOrder,
      items: updatedItems
    });
  };

  // Handle payment update
  const handleUpdatePayment = (newPaidAmount: number) => {
    if (!editingOrder) return;

    const updatedOrder = {
      ...editingOrder,
      paidAmount: newPaidAmount,
      outstandingAmount: editingOrder.totalAmount - newPaidAmount
    };

    setEditingOrder(updatedOrder);
  };

  // Handle item changes (for delivered orders)
  const handleItemChange = (itemId: string, field: string, value: any) => {
    if (!editingOrder) return;

    const updatedItems = editingOrder.items.map(item => {
      if (item.id === itemId) {
        const updatedItem = { ...item, [field]: value };
        
        // Recalculate total price if unit price or quantity changed
        if (field === 'unitPrice' || field === 'quantity') {
          updatedItem.totalPrice = updatedItem.unitPrice * updatedItem.quantity;
        }
        
        return updatedItem;
      }
      return item;
    });

    // Recalculate order totals
    const subtotal = updatedItems.reduce((sum, item) => sum + item.totalPrice, 0);
    const gstAmount = (subtotal * editingOrder.gstRate) / 100;
    const totalAmount = subtotal + gstAmount;
    const outstandingAmount = totalAmount - editingOrder.paidAmount;

    setEditingOrder({
      ...editingOrder,
      items: updatedItems,
      subtotal,
      gstAmount,
      totalAmount,
      outstandingAmount
    });
  };

  // Save payment changes
  const handleSavePayment = async () => {
    if (!editingOrder) return;

    try {
      // Update payment in Supabase
      const { error } = await MongoDBOrderService.updateOrder(orderId!, {
        paid_amount: editingOrder.paidAmount
      });

      if (error) {
        toast({
          title: "Error",
          description: "Failed to update payment. Please try again.",
          variant: "destructive"
        });
        return;
      }

    setOrder(editingOrder);
    setIsEditingPayment(false);

    toast({
      title: "Payment Updated",
      description: "Payment information has been updated successfully.",
    });
    } catch (error) {
      console.error('Error updating payment:', error);
      toast({
        title: "Error",
        description: "Failed to update payment. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Handle order approval - mark as accepted
  const handleApproveOrder = async () => {
    if (!order) return;

    try {
      // Approve order directly
      await approveOrderDirectly();
    } catch (error) {
      console.error('Error approving order:', error);
      toast({
        title: "❌ Approval Failed",
        description: "Failed to approve order. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Direct order approval (called after recipe review)
  const approveOrderDirectly = async () => {
    if (!order) return;

    try {
      // Approve order using OrderService
      const { error } = await MongoDBOrderService.updateOrder(order.id, {
        status: 'accepted'
      });
      
      if (error) {
        toast({
          title: "❌ Approval Failed",
          description: error,
          variant: "destructive"
        });
        return;
      }

      // Update local state
      const updatedOrder = {
        ...order,
        status: 'accepted' as const,
        workflowStep: 'accept' as const,
        acceptedAt: new Date().toISOString()
      };

      setOrder(updatedOrder);
      setEditingOrder(updatedOrder);

      toast({
        title: "✅ Order Approved",
        description: "Order has been approved and is ready for processing.",
      });

    } catch (error) {
      console.error('Error approving order:', error);
      toast({
        title: "❌ Approval Failed",
        description: "Failed to approve order. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Handle order dispatch - mark as dispatched
  const handleDispatchOrder = async () => {
    if (!order) return;

    try {
      // Check if any raw materials in the order are low stock before dispatch
      const rawMaterialItems = order.items.filter(item => item.productType === 'raw_material');
      
      if (rawMaterialItems.length > 0) {
        // Check stock for each raw material item
        for (const item of rawMaterialItems) {
          const { data: rawMaterials, error: rawMaterialsError } = await RawMaterialService.getRawMaterials();
          
          if (rawMaterialsError) {
            console.error('Error fetching raw materials:', rawMaterialsError);
            continue;
          }

          const material = rawMaterials?.find(rm => rm.name === item.productName);
          if (material) {
            const currentStock = material.current_stock || 0;
            const minThreshold = material.min_threshold || 10;
            
            // Check if material is low stock or out of stock
            if (currentStock <= 0) {
              toast({
                title: "❌ Cannot Dispatch Order",
                description: `Raw material "${material.name}" is out of stock. Please restock before dispatching.`,
                variant: "destructive"
              });
              return;
            } else if (currentStock <= minThreshold) {
              toast({
                title: "⚠️ Low Stock Warning",
                description: `Raw material "${material.name}" is running low (${currentStock} units). Consider restocking before dispatch.`,
                variant: "destructive"
              });
              return;
            }
          }
        }
      }

      // Dispatch order using OrderService
      const { error } = await MongoDBOrderService.updateOrder(order.id, {
        status: 'dispatched'
      });

      if (error) {
        toast({
          title: "❌ Dispatch Failed",
          description: error,
          variant: "destructive"
        });
        return;
      }

      // Update local state
      const updatedOrder = {
        ...order,
        status: 'dispatched' as const,
        workflowStep: 'dispatch' as const,
        dispatchedAt: new Date().toISOString()
      };

      setOrder(updatedOrder);
      setEditingOrder(updatedOrder);

      toast({
        title: "📦 Order Dispatched",
        description: "Order has been dispatched and is ready for delivery.",
      });
    } catch (error) {
      console.error('Error dispatching order:', error);
      toast({
        title: "❌ Dispatch Failed",
        description: "Failed to dispatch order. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Handle order delivery - mark as delivered
  const handleDeliverOrder = async () => {
    if (!order) return;

    try {
      // Deliver order using OrderService
      const { success, error } = await MongoDBOrderService.deliverOrder(order.id);

      if (error) {
      toast({
          title: "❌ Delivery Failed",
          description: error,
        variant: "destructive"
      });
      return;
    }

      // Update local state
      const updatedOrder = {
        ...order,
            status: 'delivered' as const, 
            workflowStep: 'delivered' as const,
            deliveredAt: new Date().toISOString()
      };

      setOrder(updatedOrder);

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

  if (loading) {
    return (
      <div className="flex-1 space-y-6 p-6">
        <Header title="Order Details" subtitle="Loading..." />
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading order details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex-1 space-y-6 p-6">
        <Header title="Order Details" subtitle="Order not found" />
        <Card className="p-12 text-center">
          <Package className="w-20 h-20 mx-auto mb-6 text-muted-foreground" />
          <h3 className="text-xl font-semibold mb-3">Order Not Found</h3>
          <p className="text-muted-foreground mb-6">
            The order you're looking for doesn't exist or has been removed.
          </p>
          <Button onClick={() => navigate('/orders')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Orders
          </Button>
        </Card>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "accepted": return "bg-blue-100 text-blue-800 border-blue-200";
      case "dispatched": return "bg-orange-100 text-orange-800 border-orange-200";
      case "delivered": return "bg-green-100 text-green-800 border-green-200";
      case "cancelled": return "bg-red-100 text-red-800 border-red-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending": return <Clock className="w-4 h-4" />;
      case "accepted": return <CheckCircle className="w-4 h-4" />;
      case "dispatched": return <Package className="w-4 h-4" />;
      case "delivered": return <CheckCircle className="w-4 h-4" />;
      case "cancelled": return <AlertTriangle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const currentOrder = isEditing ? editingOrder : order;
  const canModify = order.status === 'accepted' || (order.status === 'delivered' && (order.outstandingAmount || 0) > 0);
  const canModifyItems = order.status === 'accepted'; // Only accepted orders can modify items
  const canModifyPricing = order.status === 'accepted' || (order.status === 'delivered' && (order.outstandingAmount || 0) > 0); // Both can modify pricing, but delivered only if outstanding

  // Check if order is ready for dispatch (all items have selected individual products OR are raw materials)
  const isReadyForDispatch = () => {
    if (order.status !== 'accepted') return false;
    return order.items.every(item => {
      // Raw materials don't need individual product selection
      if (item.productType === 'raw_material') {
        return true;
      }
      // Products need individual product selection
      const selectedCount = item.selectedIndividualProducts?.length || 0;
      return selectedCount >= item.quantity;
    });
  };

  return (
    <div className="flex-1 space-y-6 p-6">
      <Header 
        title={`Order ${order.orderNumber}`} 
        subtitle="View complete order details and manage status"
      />

      {/* Order Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate('/orders')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Orders
          </Button>
          <Badge className={`${getStatusColor(order.status)} flex items-center gap-2 px-3 py-2`}>
            {getStatusIcon(order.status)}
            {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
          </Badge>
        </div>
        
        <div className="flex gap-2">
          {order.status === 'pending' && (
            <Button
              onClick={handleApproveOrder}
              className="bg-green-600 hover:bg-green-700 text-white"
              size="lg"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Approve Order
            </Button>
          )}
          {order.status === 'accepted' && isReadyForDispatch() && !isEditing && (
            <Button
              onClick={handleDispatchOrder}
              className="bg-orange-600 hover:bg-orange-700 text-white"
              size="lg"
            >
              <Package className="w-4 h-4 mr-2" />
              Dispatch Order
            </Button>
          )}
          {canModify && (
            <Button
              onClick={() => setIsEditing(!isEditing)}
              variant={isEditing ? "outline" : "default"}
              className={isEditing ? "" : order.status === 'delivered' ? "bg-green-600 hover:bg-green-700 text-white" : "bg-blue-600 hover:bg-blue-700 text-white"}
              size="lg"
            >
              <Edit className="w-4 h-4 mr-2" />
              {isEditing ? 'Cancel Edit' : order.status === 'delivered' ? 'Edit Pricing' : 'Edit Order'}
            </Button>
          )}
          
          {/* Message for fully paid delivered orders */}
          {order.status === 'delivered' && (order.outstandingAmount || 0) === 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex items-center gap-2 text-green-700">
                <CheckCircle className="w-4 h-4" />
                <span className="font-medium">Order Fully Paid</span>
              </div>
              <p className="text-sm text-green-600 mt-1">
                This order is fully paid and cannot be modified. All payments have been settled.
              </p>
            </div>
          )}
          {isEditing && (
            <Button onClick={handleSaveChanges} className="bg-green-600 hover:bg-green-700" size="lg">
              <CheckCircle className="w-4 h-4 mr-2" />
              Save Changes
            </Button>
          )}
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Order Status and Progress */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold">{order.orderNumber}</h2>
              <p className="text-muted-foreground">{order.customerName}</p>
            </div>
            <div className="text-right">
              <Badge className={`${getStatusColor(order.status)} flex items-center gap-2 px-3 py-2`}>
                {getStatusIcon(order.status)}
                {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
              </Badge>
              <p className="text-sm text-muted-foreground mt-1">
                {order.workflowStep}
              </p>
        </div>
      </div>

          {/* Progress Bar */}
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
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Order Information */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Items - Different views based on status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                {order.status === 'accepted' && 'Order Items'}
                {order.status === 'dispatched' && 'Order Items (Dispatched)'}
                {order.status === 'delivered' && 'Order Items (Delivered)'}
                {order.status === 'pending' && 'Order Items (Pending)'}
                ({currentOrder?.items.length || 0})
                {order.status === 'accepted' && !isEditing && (
                  <Badge className="ml-auto bg-blue-100 text-blue-800 border-blue-200">
                    <Edit className="w-3 h-3 mr-1" />
                    Click "Edit Order" to modify
                  </Badge>
                )}
                {isEditing && order.status === 'accepted' && (
                  <Button size="sm" onClick={handleAddItem} className="ml-auto bg-green-600 hover:bg-green-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Item
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Delivered Order Summary */}
              {order.status === 'delivered' && (
                <div className="mb-4 p-3 bg-green-100 border border-green-300 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span className="font-medium text-green-800">Order Successfully Delivered</span>
                    </div>
                    <div className="text-sm text-green-700">
                      Delivered on {order.deliveredAt ? new Date(order.deliveredAt).toLocaleDateString() : 'N/A'}
                    </div>
                  </div>
                </div>
              )}
              
              <div className={`${order.status === 'delivered' ? 'space-y-2' : 'space-y-4'}`}>
                {currentOrder?.items?.map((item, index) => (
                  <div key={item.id} className={`border rounded-lg ${
                    order.status === 'delivered' ? 'p-3' : 'p-4'
                  } ${
                    order.status === 'accepted' ? 'border-blue-200 bg-blue-50' :
                    order.status === 'dispatched' ? 'border-orange-200 bg-orange-50' :
                    order.status === 'delivered' ? 'border-green-200 bg-green-50' :
                    'border-gray-200'
                  }`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        {/* PENDING/ACCEPTED STATUS - Fully Editable */}
                        {(order.status === 'pending' || order.status === 'accepted') && isEditing ? (
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div>
                              <Label>Product</Label>
                              <Select 
                                value={item.productId} 
                                onValueChange={(value) => handleUpdateItem(item.id, 'productId', value)}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select product" />
                                </SelectTrigger>
                                <SelectContent>
                                  {products.map(product => (
                                    <SelectItem key={product.id} value={product.id}>
                                      {product.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label>Quantity</Label>
                              <Input
                                type="text"
                                value={item.quantity}
                                onChange={(e) => {
                                  // Allow only numbers and leading zeros
                                  const value = e.target.value;
                                  if (value === '' || /^\d+$/.test(value)) {
                                    handleUpdateItem(item.id, 'quantity', parseInt(value) || 0);
                                  }
                                }}
                                placeholder="1"
                              />
                            </div>
                            <div>
                              <Label>Unit Price</Label>
                              <Input
                                type="text"
                                value={item.unitPrice}
                                onChange={(e) => {
                                  // Allow only numbers, decimals, and leading zeros
                                  const value = e.target.value;
                                  if (value === '' || /^\d*\.?\d*$/.test(value)) {
                                    handleUpdateItem(item.id, 'unitPrice', parseFloat(value) || 0);
                                  }
                                }}
                                placeholder="0"
                              />
                            </div>
                            <div>
                              <Label>Total Price</Label>
                              <Input
                                value={item.totalPrice}
                                readOnly
                                className="bg-gray-50"
                              />
                            </div>
                          </div>
                        ) : (
                          <div>
                        <h3 className="font-semibold text-lg">{item.productName}</h3>
                            
                            {/* PENDING STATUS - Basic Info */}
                            {order.status === 'pending' && (
                              <div className="space-y-3">
                                <div className="text-sm text-muted-foreground">
                                  Quantity: {item.quantity} {item.unit} • Unit Price: ₹{item.unitPrice.toLocaleString()}
                                </div>
                                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                  <div className="flex items-center gap-2 text-yellow-800">
                                    <Clock className="w-4 h-4" />
                                    <span className="font-medium">Order Pending Approval</span>
                                  </div>
                                  <p className="text-yellow-700 text-sm mt-1">
                                    This order is waiting for approval before processing can begin.
                                  </p>
                                </div>
                              </div>
                            )}
                            
                            {/* ACCEPTED STATUS - Basic Info */}
                            {order.status === 'accepted' && (
                              <div className="space-y-3">
                                <div className="text-sm text-muted-foreground">
                                  Quantity: {item.quantity} {item.unit} • Unit Price: ₹{item.unitPrice.toLocaleString()}
                                </div>

                                {/* Individual Products Display - Only for products, not raw materials */}
                                {item.productType !== 'raw_material' && (() => {
                                  const selectedCount = item.selectedIndividualProducts?.length || 0;
                                  const requiredCount = item.quantity;
                                  
                                  if (selectedCount > 0) {
                                    return (
                                      <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                                        <div className="flex items-center justify-between mb-3">
                                          <div className="text-sm font-medium text-green-800">
                                            Selected Individual Products ({selectedCount}/{requiredCount})
                                          </div>
                                          <Badge className="bg-green-100 text-green-800">
                                            {selectedCount >= requiredCount ? 'Complete' : 'Partial'}
                                          </Badge>
                                        </div>
                                        
                                        {/* Individual Products Grid */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                          {item.selectedIndividualProducts.map((product, idx) => (
                                            <div key={product.id} className="bg-white border border-green-200 rounded-lg p-3">
                                              <div className="space-y-2">
                                                <div className="flex items-center justify-between">
                                                  <div className="flex items-center gap-2">
                                                    {product.qrCode ? (
                                                      <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => {
                                                          setSelectedQRProduct(product);
                                                          setShowQRCode(true);
                                                        }}
                                                        className="text-xs h-6 px-2"
                                                        title={`QR Code: ${product.qrCode}`}
                                                      >
                                                        <QrCode className="w-3 h-3 mr-1" />
                                                        QR
                                                      </Button>
                                                    ) : (
                                                      <div className="text-xs font-mono text-gray-400">
                                                        No QR Code
                                                      </div>
                                                    )}
                                                  </div>
                                                  <Badge className={
                                                    product.qualityGrade === "A+" ? "bg-purple-100 text-purple-800" :
                                                    product.qualityGrade === "A" ? "bg-green-100 text-green-800" :
                                                    product.qualityGrade === "B" ? "bg-yellow-100 text-yellow-800" :
                                                    "bg-gray-100 text-gray-800"
                                                  }>
                                                    {product.qualityGrade}
                                                  </Badge>
                                                </div>
                                                <div className="text-xs text-gray-600">
                                                  <div>Weight: {product.weight}</div>
                                                  <div>Completed: {(product.manufacturingDate) && product.manufacturingDate !== 'null' ? new Date(product.manufacturingDate).toLocaleDateString() : (product.productionDate) && product.productionDate !== 'null' ? new Date(product.productionDate).toLocaleDateString() : (product.completionDate) && product.completionDate !== 'null' ? new Date(product.completionDate).toLocaleDateString() : 'N/A'}</div>
                                                  <div>Inspector: {product.inspector || 'N/A'}</div>
                                                </div>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                        
                                        {selectedCount < requiredCount && (
                                          <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded">
                                            <div className="text-xs text-yellow-700">
                                              ⚠️ Need to select {requiredCount - selectedCount} more individual products
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  } else {
                                    const availableProducts = getAvailableIndividualProductsForProduct(item.productId);
                                    
                                    return (
                                      <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                                        <div className="text-sm text-gray-600 mb-2">
                                          No individual products selected yet
                                        </div>
                                        <div className="text-xs text-gray-500 mb-3">
                                          {(() => {
                                            if ((order.status as string) === 'pending') {
                                              return 'Individual product selection will be available after order approval';
                                            }
                                            if (availableProducts.length > 0) {
                                              return `${availableProducts.length} individual products available for selection`;
                                            }
                                            return 'No individual products available for this product';
                                          })()}
                                        </div>
                                        
                                        {availableProducts.length > 0 && order.status === 'accepted' && (
                                          <div className="mb-3">
                                            <div className="text-xs text-gray-600 mb-2">Available Products:</div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-32 overflow-y-auto">
                                              {availableProducts.slice(0, 6).map((product) => (
                                                <div key={product.id} className="bg-white border border-gray-200 rounded p-2">
                                                  <div className="text-xs">
                                                    <div className="flex items-center gap-2 mb-1">
                                                      {product.qr_code ? (
                                                        <Button
                                                          variant="outline"
                                                          size="sm"
                                                          onClick={() => {
                                                            setSelectedQRProduct(product);
                                                            setShowQRCode(true);
                                                          }}
                                                          className="text-xs h-5 px-2"
                                                          title={`QR Code: ${product.qr_code}`}
                                                        >
                                                          <QrCode className="w-3 h-3 mr-1" />
                                                          QR
                                                        </Button>
                                                      ) : (
                                                        <div className="text-xs font-mono text-gray-400">
                                                          No QR Code
                                                        </div>
                                                      )}
                                                    </div>
                                                    <div className="text-gray-500">Grade: {product.quality_grade}</div>
                                                  </div>
                                                </div>
                                              ))}
                                              {availableProducts.length > 6 && (
                                                <div className="bg-white border border-gray-200 rounded p-2 flex items-center justify-center">
                                                  <div className="text-xs text-gray-500">
                                                    +{availableProducts.length - 6} more
                                                  </div>
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        )}
                                        
                                        {order.status === 'accepted' && availableProducts.length > 0 && (item.productType as string) !== 'raw_material' && (
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => {
                                              setCurrentSelectingItem(item);
                                              setShowIndividualProductSelection(true);
                                            }}
                                            className="text-blue-700 border-blue-300 hover:bg-blue-100"
                                          >
                                            <Package className="w-4 h-4 mr-2" />
                                            Select Individual Products
                                          </Button>
                                        )}
                                        
                                        {order.status === 'accepted' && availableProducts.length === 0 && (item.productType as string) !== 'raw_material' && (
                                          <div className="text-xs text-gray-500 text-center p-2 bg-gray-50 rounded">
                                            No individual products available for selection
                                          </div>
                                        )}
                                      </div>
                                    );
                                  }
                                })()}
                              </div>
                            )}
                            
                            {/* DISPATCHED STATUS - More Details */}
                            {order.status === 'dispatched' && (
                              <div className="space-y-3 mt-2">
                                <div className="text-sm text-muted-foreground">
                                  Quantity: {item.quantity} {item.unit} • Unit Price: ₹{item.unitPrice.toLocaleString()}
                                </div>
                                <div className="text-sm text-orange-600 font-medium">
                                  ✓ Stock Deducted • Ready for Delivery
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  Dispatched on: {order.dispatchedAt ? new Date(order.dispatchedAt).toLocaleString() : 'N/A'}
                        </div>
                                
                                {/* Individual Products for Dispatched Orders */}
                                {item.selectedIndividualProducts && item.selectedIndividualProducts.length > 0 && (
                                  <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                                    <div className="text-sm font-medium text-orange-800 mb-2">
                                      Dispatched Individual Products ({item.selectedIndividualProducts.length})
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                      {item.selectedIndividualProducts.map((product) => (
                                        <div key={product.id} className="bg-white border border-orange-200 rounded p-2">
                                          <div className="text-xs">
                                            <div className="flex items-center gap-2 mb-1">
                                              {product.qrCode ? (
                                                <Button
                                                  variant="outline"
                                                  size="sm"
                                                  onClick={() => {
                                                    setSelectedQRProduct(product);
                                                    setShowQRCode(true);
                                                  }}
                                                  className="text-xs h-5 px-2"
                                                  title={`QR Code: ${product.qrCode}`}
                                                >
                                                  <QrCode className="w-3 h-3 mr-1" />
                                                  QR
                                                </Button>
                                              ) : (
                                                <div className="text-xs font-mono text-gray-400">
                                                  No QR Code
                                                </div>
                                              )}
                                            </div>
                                            <div className="text-gray-500">Grade: {product.qualityGrade}</div>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                      </div>
                            )}
                            
                            {/* DELIVERED STATUS - Pricing Editable */}
                            {order.status === 'delivered' && isEditing && (
                              <div className="space-y-3 mt-2">
                                <div className="text-sm text-muted-foreground">
                                  {item.quantity} {item.unit} • Unit Price: ₹{item.unitPrice.toLocaleString()}
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div>
                                    <Label htmlFor={`unitPrice-${item.id}`}>Unit Price (₹)</Label>
                                    <Input
                                      id={`unitPrice-${item.id}`}
                                      type="text"
                                      value={item.unitPrice}
                                      onChange={(e) => {
                                        // Allow only numbers, decimals, and leading zeros
                                        const value = e.target.value;
                                        if (value === '' || /^\d*\.?\d*$/.test(value)) {
                                          handleItemChange(item.id, 'unitPrice', parseFloat(value) || 0);
                                        }
                                      }}
                                      className="w-full"
                                      placeholder="0"
                                    />
                                  </div>
                                  <div>
                                    <Label htmlFor={`quantity-${item.id}`}>Quantity</Label>
                                    <Input
                                      id={`quantity-${item.id}`}
                                      type="text"
                                      value={item.quantity}
                                      onChange={(e) => {
                                        // Allow only numbers and leading zeros
                                        const value = e.target.value;
                                        if (value === '' || /^\d+$/.test(value)) {
                                          handleItemChange(item.id, 'quantity', parseInt(value) || 1);
                                        }
                                      }}
                                      className="w-full"
                                      placeholder="1"
                                      disabled // Don't allow quantity changes for delivered orders
                                    />
                                  </div>
                                </div>
                                <div className="text-sm text-green-600 font-medium">
                                  Total: ₹{item.totalPrice.toLocaleString()}
                                </div>
                                <div className="flex items-center justify-between text-xs text-muted-foreground">
                                  <div className="flex gap-4">
                                    <span>Accepted: {order.acceptedAt ? new Date(order.acceptedAt).toLocaleDateString() : 'N/A'}</span>
                                    <span>Dispatched: {order.dispatchedAt ? new Date(order.dispatchedAt).toLocaleDateString() : 'N/A'}</span>
                                  </div>
                                  <span className="text-green-600">Delivered: {order.deliveredAt ? new Date(order.deliveredAt).toLocaleDateString() : 'N/A'}</span>
                                </div>
                              </div>
                            )}

                            {/* DELIVERED STATUS - Read Only */}
                            {order.status === 'delivered' && !isEditing && (
                              <div className="space-y-2 mt-1">
                                <div className="flex items-center justify-between">
                                  <div className="text-sm text-muted-foreground">
                                    {item.quantity} {item.unit} • ₹{item.unitPrice.toLocaleString()}/unit
                                  </div>
                                  <div className="flex items-center gap-1 text-green-600 text-sm font-medium">
                                    <CheckCircle className="w-4 h-4" />
                                    Delivered
                                  </div>
                                </div>
                                <div className="flex items-center justify-between text-xs text-muted-foreground">
                                  <div className="flex gap-4">
                                    <span>Accepted: {order.acceptedAt ? new Date(order.acceptedAt).toLocaleDateString() : 'N/A'}</span>
                                    <span>Dispatched: {order.dispatchedAt ? new Date(order.dispatchedAt).toLocaleDateString() : 'N/A'}</span>
                                  </div>
                                  <span className="text-green-600">Delivered: {order.deliveredAt ? new Date(order.deliveredAt).toLocaleDateString() : 'N/A'}</span>
                                </div>
                                
                                {/* Individual Products for Delivered Orders - Compact */}
                                {item.selectedIndividualProducts && item.selectedIndividualProducts.length > 0 && (
                                  <div className="p-2 bg-green-50 border border-green-200 rounded">
                                    <div className="text-xs font-medium text-green-800 mb-1">
                                      Delivered Products ({item.selectedIndividualProducts.length})
                                    </div>
                                    <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-1">
                                      {item.selectedIndividualProducts.slice(0, 6).map((product) => (
                                        <div key={product.id} className="bg-white border border-green-200 rounded p-1">
                                          <div className="text-xs">
                                            <div className="flex items-center justify-between mb-1">
                                              {product.qrCode ? (
                                                <Button
                                                  variant="outline"
                                                  size="sm"
                                                  onClick={() => {
                                                    setSelectedQRProduct(product);
                                                    setShowQRCode(true);
                                                  }}
                                                  className="text-xs h-4 px-1"
                                                  title={`QR Code: ${product.qrCode}`}
                                                >
                                                  <QrCode className="w-3 h-3" />
                                                </Button>
                                              ) : (
                                                <div className="text-xs font-mono text-gray-400">No QR</div>
                                              )}
                                              <span className="text-green-600 font-medium">Grade {product.qualityGrade}</span>
                                            </div>
                                          </div>
                                        </div>
                                      ))}
                                      {item.selectedIndividualProducts.length > 6 && (
                                        <div className="bg-white border border-green-200 rounded p-1 flex items-center justify-center">
                                          <div className="text-xs text-green-600 font-medium">
                                            +{item.selectedIndividualProducts.length - 6} more
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                    </div>
                            )}
                        </div>
                      )}
                    </div>

                      {/* Action Buttons */}
                      {(order.status === 'pending' || order.status === 'accepted') && isEditing && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRemoveItem(item.id)}
                          className="ml-4 text-red-600 hover:text-red-700"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                      
                      {/* Price Display */}
                      <div className="text-right">
                        <div className="text-xl font-bold">₹{item.totalPrice.toLocaleString()}</div>
                        {order.status === 'dispatched' && (
                          <div className="text-sm text-orange-600">Dispatched</div>
                        )}
                        {order.status === 'delivered' && (
                          <div className="text-sm text-green-600">Delivered</div>
                        )}
                        </div>
                      </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>


          {/* Delivery Information - Only for Dispatched/Delivered Orders */}
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
                    <div className="space-y-2">
                      <div className="text-orange-700">
                        <span className="font-medium">Dispatched on:</span> {order.dispatchedAt ? new Date(order.dispatchedAt).toLocaleString() : 'N/A'}
                      </div>
                      <div className="text-orange-700">
                        <span className="font-medium">Status:</span> Ready for Delivery
                      </div>
                  <div className="text-orange-700">
                        <span className="font-medium">Stock:</span> Deducted from inventory
                      </div>
                  </div>
                  )}
                  
                  {order.status === 'delivered' && (
                  <div className="space-y-2">
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
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Order Timeline - Only for Delivered Orders */}
          {order.status === 'delivered' && (
            <Card className="border-green-200 bg-green-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-800">
                  <Clock className="w-5 h-5" />
                  Order Timeline
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <div>
                      <div className="font-medium text-green-800">Order Accepted</div>
                      <div className="text-sm text-green-600">
                        {order.acceptedAt ? new Date(order.acceptedAt).toLocaleString() : 'N/A'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                    <div>
                      <div className="font-medium text-orange-800">Order Dispatched</div>
                      <div className="text-sm text-orange-600">
                        {order.dispatchedAt ? new Date(order.dispatchedAt).toLocaleString() : 'N/A'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <div>
                      <div className="font-medium text-green-800">Order Delivered</div>
                      <div className="text-sm text-green-600">
                        {order.deliveredAt ? new Date(order.deliveredAt).toLocaleString() : 'N/A'}
                      </div>
                      </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          {order.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Order Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{order.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar Information */}
        <div className="space-y-6">
          {/* Customer Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Customer Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <div className="font-medium">{order.customerName}</div>
                <div className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                  <Mail className="w-3 h-3" />
                  {order.customerEmail}
                </div>
                <div className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                  <Phone className="w-3 h-3" />
                  {order.customerPhone}
                </div>
                <div className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                  <Calendar className="w-3 h-3" />
                  Order Date: {order.orderDate ? new Date(order.orderDate).toLocaleDateString() : 'N/A'}
                </div>
                <div className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                  <Calendar className="w-3 h-3" />
                  Expected Delivery: {order.expectedDelivery ? new Date(order.expectedDelivery).toLocaleDateString() : 'N/A'}
                </div>
                
                {/* Delivery Address Information */}
                <div className="mt-4 pt-3 border-t">
                  <h4 className="text-sm font-medium text-gray-900 mb-2 flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Delivery Address
                  </h4>
                  {order.delivery_address ? (
                    <div className="text-sm text-gray-700">
                      <div className="font-medium">{order.delivery_address.address}</div>
                      <div className="text-muted-foreground">
                        {order.delivery_address.city}, {order.delivery_address.state} - {order.delivery_address.pincode}
                      </div>
                      <div className="text-xs text-green-600 mt-1">✓ Address stored with this order</div>
                    </div>
                  ) : (
                    <div className="text-sm text-gray-700">
                      <div className="font-medium text-orange-600">No delivery address stored</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        This order was created before delivery address tracking was implemented
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>


          {/* Order Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Order Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal:</span>
                <span className="font-semibold">₹{currentOrder?.subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">GST ({currentOrder?.gstRate}%):</span>
                <span className="font-semibold">₹{currentOrder?.gstAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Amount:</span>
                <span className="font-semibold">₹{currentOrder?.totalAmount.toLocaleString()}</span>
              </div>
              
              {/* Payment Section */}
              <div className="border-t pt-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-muted-foreground">Paid Amount:</span>
                  {(order.status === 'dispatched' || order.status === 'accepted' || (order.status === 'delivered' && (order.outstandingAmount || 0) > 0)) && !isEditingPayment && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingOrder(order);
                        setIsEditingPayment(true);
                      }}
                    >
                      <Edit className="w-3 h-3 mr-1" />
                      Edit
                    </Button>
                  )}
                </div>
                
                {isEditingPayment ? (
                  <div className="space-y-2">
                    <Input
                      type="text"
                      value={editingOrder?.paidAmount || 0}
                      onChange={(e) => {
                        // Allow only numbers, decimals, and leading zeros
                        const value = e.target.value;
                        if (value === '' || /^\d*\.?\d*$/.test(value)) {
                          const numValue = parseFloat(value) || 0;
                          handleUpdatePayment(numValue);
                        }
                      }}
                      className="text-green-600 font-semibold"
                      placeholder="Enter paid amount"
                      min="0"
                      step="0.01"
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleSavePayment} className="bg-green-600 hover:bg-green-700">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Save
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => {
                        setEditingOrder(order);
                        setIsEditingPayment(false);
                      }}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-between">
                    <span className="text-green-600 font-semibold">₹{currentOrder?.paidAmount.toLocaleString()}</span>
                    {order.status === 'dispatched' && currentOrder && currentOrder.outstandingAmount > 0 && (
                      <Badge className="bg-orange-100 text-orange-800">
                        Payment Pending
                      </Badge>
                    )}
                  </div>
                )}
              </div>
              
              {/* Outstanding Amount Section */}
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Outstanding:</span>
                {order.status === 'delivered' && isEditing ? (
                  <div className="flex items-center gap-2">
                    <Input
                      type="text"
                      value={editingOrder?.outstandingAmount || 0}
                      onChange={(e) => {
                        // Allow only numbers, decimals, and leading zeros
                        const value = e.target.value;
                        if (value === '' || /^\d*\.?\d*$/.test(value)) {
                          const numValue = parseFloat(value) || 0;
                          setEditingOrder({
                            ...editingOrder!,
                            outstandingAmount: numValue,
                            paidAmount: (editingOrder?.totalAmount || 0) - numValue
                          });
                        }
                      }}
                      className="w-32 text-right font-semibold"
                      min="0"
                      step="0.01"
                    />
                    <span className="text-xs text-muted-foreground">₹</span>
                  </div>
                ) : (
                  <span className={`font-semibold ${(currentOrder?.outstandingAmount || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    ₹{currentOrder?.outstandingAmount.toLocaleString()}
                  </span>
                )}
              </div>

              {/* Total Amount Section - Editable for delivered orders */}
              {order.status === 'delivered' && isEditing && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Total Amount:</span>
                  <div className="flex items-center gap-2">
                    <Input
                      type="text"
                      value={editingOrder?.totalAmount || 0}
                      onChange={(e) => {
                        // Allow only numbers, decimals, and leading zeros
                        const value = e.target.value;
                        if (value === '' || /^\d*\.?\d*$/.test(value)) {
                          const numValue = parseFloat(value) || 0;
                          const currentPaid = editingOrder?.paidAmount || 0;
                          setEditingOrder({
                            ...editingOrder!,
                            totalAmount: numValue,
                            outstandingAmount: numValue - currentPaid
                          });
                        }
                      }}
                      className="w-32 text-right font-semibold"
                      min="0"
                      step="0.01"
                    />
                    <span className="text-xs text-muted-foreground">₹</span>
                  </div>
                </div>
              )}
              
              {/* Payment Status Warning */}
              {order.status === 'dispatched' && currentOrder && currentOrder.outstandingAmount > 0 && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-orange-800">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="font-medium text-sm">Payment Required Before Delivery</span>
                  </div>
                  <p className="text-orange-700 text-xs mt-1">
                    Full payment must be collected before marking order as delivered.
                  </p>
              </div>
              )}
              
              <div className="border-t pt-3 mt-3">
                <div className="flex justify-between font-bold text-lg">
                  <span>Balance Due:</span>
                  <span className={`${(currentOrder?.outstandingAmount || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    ₹{currentOrder?.outstandingAmount.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Mark as Delivered Button for Dispatched Orders */}
              {order.status === 'dispatched' && (
                <div className="border-t pt-3 mt-3">
                  {order.outstandingAmount > 0 ? (
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-orange-800 mb-2">
                        <AlertTriangle className="w-4 h-4" />
                        <span className="font-medium text-sm">Payment Required Before Delivery</span>
                      </div>
                      <p className="text-orange-700 text-xs">
                        Please update the payment amount above to complete delivery.
                      </p>
                    </div>
                  ) : (
                    <Button 
                      className="w-full bg-green-600 hover:bg-green-700"
                      onClick={() => {
                        handleDeliverOrder();
                      }}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Mark as Delivered
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Order Created:</span>
                  <span>{order.createdAt ? new Date(order.createdAt).toLocaleDateString() : 'N/A'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Expected Delivery:</span>
                  <span>{order.expectedDelivery ? new Date(order.expectedDelivery).toLocaleDateString() : 'N/A'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Last Updated:</span>
                  <span>{order.updatedAt ? new Date(order.updatedAt).toLocaleDateString() : 'N/A'}</span>
                </div>
              </div>
            </CardContent>
          </Card>

        </div>
      </div>

      {/* Individual Product Selection Dialog */}
      <Dialog open={showIndividualProductSelection} onOpenChange={setShowIndividualProductSelection}>
        <DialogContent className="max-w-7xl max-h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Select Individual Products - {currentSelectingItem?.productName}
            </DialogTitle>
            <DialogDescription>
              Choose which specific pieces to include in this order. Oldest stock is shown first.
            </DialogDescription>
          </DialogHeader>
          
          {currentSelectingItem && (
            <div className="flex-1 flex flex-col space-y-4 overflow-hidden">
              {/* Summary */}
              <div className="flex-shrink-0 flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div className="text-sm">
                  {(() => {
                    const selectedCount = currentSelectingItem.selectedIndividualProducts?.length || 0;
                    const required = currentSelectingItem.quantity;
                    const needed = Math.max(0, required - selectedCount);

                    return (
                      <>
                        <span className="font-medium">Selected: {selectedCount}</span>
                        <span className="text-muted-foreground ml-2">out of {required} required</span>
                        {needed > 0 && (
                          <span className="text-orange-600 ml-2 font-medium">
                            (Need {needed} more)
                          </span>
                        )}
                      </>
                    );
                  })()}
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-sm text-muted-foreground">
                    Available: {getAvailableIndividualProductsForProduct(currentSelectingItem.productId).length} pieces
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (currentSelectingItem) {
                        const updatedOrder = {
                          ...order!,
                          items: order!.items.map(item => {
                            if (item.id === currentSelectingItem.id) {
                              return { ...item, selectedIndividualProducts: [] };
                            }
                            return item;
                          })
                        };
                        setOrder(updatedOrder);
                        setEditingOrder(updatedOrder);

                        // Update currentSelectingItem to reflect cleared selection
                        setCurrentSelectingItem({
                          ...currentSelectingItem,
                          selectedIndividualProducts: []
                        });
                      }
                    }}
                    className="text-xs"
                    disabled={!currentSelectingItem || (currentSelectingItem.selectedIndividualProducts?.length || 0) === 0}
                  >
                    Clear All ({(currentSelectingItem.selectedIndividualProducts?.length || 0)})
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (currentSelectingItem && currentSelectingItem.quantity > 0) {
                        autoSelectOldestPieces(currentSelectingItem.id, currentSelectingItem.quantity);
                      }
                    }}
                    className="text-xs"
                    disabled={!currentSelectingItem || currentSelectingItem.quantity <= 0 || getAvailableIndividualProductsForProduct(currentSelectingItem.productId).length === 0}
                  >
                    Auto-Select Oldest ({Math.min(currentSelectingItem?.quantity || 0, getAvailableIndividualProductsForProduct(currentSelectingItem?.productId || '').length)})
                  </Button>
                </div>
              </div>

              {/* Excel-like Table */}
              <div className="flex-1 overflow-auto">
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-gray-700 border-r">Select</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-700 border-r">ID</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-700 border-r">QR Code</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-700 border-r">Manufactured</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-700 border-r">Weight</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-700 border-r">Quality</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-700 border-r">Location</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-700">Inspector</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getAvailableIndividualProductsForProduct(currentSelectingItem.productId).length === 0 ? (
                        <tr>
                          <td colSpan={8} className="px-3 py-8 text-center text-muted-foreground">
                            <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p>No individual products available</p>
                            <p className="text-xs mt-1">Individual pieces will appear here when available in inventory</p>
                          </td>
                        </tr>
                      ) : (
                        getAvailableIndividualProductsForProduct(currentSelectingItem.productId).map((product) => {
                          const selectedProducts = currentSelectingItem.selectedIndividualProducts || [];
                          const isSelected = selectedProducts.some(p => p.id === product.id);
                          const isDisabled = !isSelected && selectedProducts.length >= currentSelectingItem.quantity;

                          return (
                            <tr
                              key={product.id} 
                              className={`hover:bg-gray-50 transition-colors ${
                                isSelected ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                              } ${isDisabled ? 'opacity-50' : ''}`}
                            >
                              <td className="px-3 py-2 border-r">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    if (!isDisabled) {
                                      handleIndividualProductSelection(currentSelectingItem.id, product, !isSelected);
                                    }
                                  }}
                                  disabled={isDisabled}
                                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                                />
                              </td>
                              <td className="px-3 py-2 border-r font-mono text-xs">{product.id}</td>
                              <td className="px-3 py-2 border-r">
                                {product.qr_code ? (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedQRProduct(product);
                                      setShowQRCode(true);
                                    }}
                                    className="text-xs h-6 px-2"
                                    title={`QR Code: ${product.qr_code}`}
                                  >
                                    <QrCode className="w-3 h-3 mr-1" />
                                    QR
                                  </Button>
                                ) : (
                                  <div className="text-xs font-mono text-gray-400">
                                    No QR Code
                                  </div>
                                )}
                              </td>
                              <td className="px-3 py-2 border-r">{product.completion_date && product.completion_date !== 'null' ? new Date(product.completion_date).toLocaleDateString() : product.production_date && product.production_date !== 'null' ? new Date(product.production_date).toLocaleDateString() : 'N/A'}</td>
                              <td className="px-3 py-2 border-r">{product.final_weight || product.weight}</td>
                              <td className="px-3 py-2 border-r">
                                <Badge className={
                                  product.quality_grade === "A+" ? "bg-purple-100 text-purple-800" :
                                  product.quality_grade === "A" ? "bg-green-100 text-green-800" :
                                  product.quality_grade === "B" ? "bg-yellow-100 text-yellow-800" :
                                  "bg-gray-100 text-gray-800"
                                }>
                                  {product.quality_grade}
                                </Badge>
                              </td>
                              <td className="px-3 py-2 border-r">{product.location}</td>
                              <td className="px-3 py-2">{product.inspector || 'N/A'}</td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowIndividualProductSelection(false)}>
              Cancel
            </Button>
            <Button 
              onClick={saveIndividualProductSelections}
              disabled={(() => {
                if (!currentSelectingItem) return true;
                const selectedCount = currentSelectingItem.selectedIndividualProducts?.length || 0;
                return selectedCount !== currentSelectingItem.quantity;
              })()}
            >
              Save Selection ({(currentSelectingItem?.selectedIndividualProducts?.length || 0)} pieces)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* QR Code Display Dialog */}
      <Dialog open={showQRCode} onOpenChange={setShowQRCode}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Individual Product QR Code
            </DialogTitle>
            <DialogDescription>
              Scan this QR code to view individual product details and specifications
            </DialogDescription>
          </DialogHeader>
          
          {selectedQRProduct && (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                <p><strong>Product:</strong> {selectedQRProduct.productName || selectedQRProduct.product_name}</p>
                <p><strong>QR Code:</strong> {selectedQRProduct.qrCode || selectedQRProduct.qr_code}</p>
                <p><strong>Quality Grade:</strong> {selectedQRProduct.qualityGrade || selectedQRProduct.quality_grade}</p>
                <p><strong>Completion Date:</strong> {(selectedQRProduct.completion_date) && selectedQRProduct.completion_date !== 'null' ? new Date(selectedQRProduct.completion_date).toLocaleDateString() : (selectedQRProduct.production_date) && selectedQRProduct.production_date !== 'null' ? new Date(selectedQRProduct.production_date).toLocaleDateString() : 'N/A'}</p>
              </div>
              
              <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-8 text-center">
                <div className="flex items-center justify-center gap-2 mb-6">
                  <QrCode className="w-6 h-6 text-primary" />
                  <h4 className="font-semibold text-slate-900">Product QR Code</h4>
                </div>
                
                <div className="flex justify-center mb-6">
                  <div className="bg-white p-6 rounded-xl shadow-lg border-2 border-slate-200">
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`${window.location.origin}/qr-result?data=${encodeURIComponent(JSON.stringify({
                        type: 'individual',
                        productId: selectedQRProduct.productId || selectedQRProduct.product_id,
                        individualProductId: selectedQRProduct.id
                      }))}`)}`}
                      alt={`QR Code for ${selectedQRProduct.productName || selectedQRProduct.product_name}`}
                      className="w-48 h-48"
                    />
                  </div>
                </div>
                
                <div className="font-mono text-sm bg-white p-4 rounded-lg border max-w-md mx-auto shadow-sm">
                  {JSON.stringify({
                    type: 'individual',
                    productId: selectedQRProduct.productId || selectedQRProduct.product_id,
                    individualProductId: selectedQRProduct.id
                  }, null, 2)}
                </div>
                
                <p className="text-slate-600 mt-4">
                  Scan this QR code to access detailed product information
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}
