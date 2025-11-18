import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search, Trash2, AlertTriangle, Factory, Package, X, CheckCircle, Eye, Save, Bell, Calculator, Info, QrCode, Edit, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { generateUniqueId, createNotification } from "@/lib/storageUtils";
import { CustomerService } from "@/services/customerService";
import { NotificationService } from "@/services/notificationService";
import { MongoDBOrderService } from "@/services/api/orderService";
import ProductService from "@/services/api/productService";
import RawMaterialService from "@/services/api/rawMaterialService";
import IndividualProductService from "@/services/api/individualProductService";
import MongoDBNotificationService from "@/services/api/notificationService";
import { DynamicPricingForm } from "@/components/order/DynamicPricingForm";
import { EnhancedPricingForm } from "@/components/order/EnhancedPricingForm";
import { usePricingCalculator } from "@/hooks/usePricingCalculator";
import { ExtendedOrderItem, OrderFormData } from "@/types/orderTypes";
import { PricingUnit, ProductDimensions, getSuggestedPricingUnit, getAvailablePricingUnits } from "@/utils/unitConverter";
import { GSTApiService } from "@/services/gstApiService";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Legacy interface for backward compatibility - will be replaced with ExtendedOrderItem
interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  productType: 'product' | 'raw_material'; // Whether this is a finished product or raw material
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  availableStock: number;
  needsProduction: boolean; // Whether this item requires production
  selectedIndividualProducts: IndividualProduct[]; // Track which specific pieces are selected
}

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  customer_type: "individual" | "business";
  status: "active" | "inactive" | "suspended" | "new";
  total_orders: number;
  total_value: string;
  last_order_date?: string;
  registration_date: string;
  gst_number?: string;
  company_name?: string;
  credit_limit: string;
  outstanding_amount: string;
  // Address fields (stored as JSON strings)
  permanent_address?: string;
  delivery_address?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}


// Individual product details (this would come from API in real app)
interface IndividualProduct {
  id: string;
  qrCode: string;
  productId: string;
  productName: string;
  manufacturingDate: string;
  dimensions: string;
  weight: string;
  qualityGrade: string;
  inspector: string;
  status: "available" | "sold" | "damaged";
  location: string;
  age: number; // days since manufacturing
}


export default function NewOrder() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const pricingCalculator = usePricingCalculator();
  
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [orderItems, setOrderItems] = useState<ExtendedOrderItem[]>([]);
  const [realProducts, setRealProducts] = useState<any[]>([]);
  const [individualProducts, setIndividualProducts] = useState<any[]>([]);
  const [rawMaterials, setRawMaterials] = useState<any[]>([]);
  const [newCustomer, setNewCustomer] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    customerType: "individual" as "individual" | "business",
    gstNumber: "",
    companyName: "",
    // New address fields
    permanentAddress: {
      address: "",
      city: "",
      state: "",
      pincode: ""
    },
    deliveryAddress: {
      address: "",
      city: "",
      state: "",
      pincode: ""
    },
    sameAsPermanent: true // Checkbox for same address
  });
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);
  const [orderDetails, setOrderDetails] = useState({
    expectedDelivery: "",
    notes: "",
    paidAmount: 0
  });
  
  // Address management state
  const [orderDeliveryAddress, setOrderDeliveryAddress] = useState<{
    address: string;
    city: string;
    state: string;
    pincode: string;
  } | null>(null);
  const [showAddressEditor, setShowAddressEditor] = useState(false);

  // GST Management State
  const [gstSettings, setGstSettings] = useState({
    rate: 18, // Default 18% GST
    isIncluded: true // Whether GST is included in pricing
  });

  const [showProductionAlert, setShowProductionAlert] = useState(false);
  const [productionAlertItem, setProductionAlertItem] = useState<OrderItem | null>(null);
  const [showIndividualProductSelection, setShowIndividualProductSelection] = useState(false);
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [currentOrderItem, setCurrentOrderItem] = useState<ExtendedOrderItem | null>(null);
  const [showQRCode, setShowQRCode] = useState(false);
  const [selectedQRProduct, setSelectedQRProduct] = useState<any>(null);
  
  // Product search filter states
  const [productSearchTerm, setProductSearchTerm] = useState("");
  const [productCategoryFilter, setProductCategoryFilter] = useState("all");
  const [productSubcategoryFilter, setProductSubcategoryFilter] = useState("all");
  const [productColorFilter, setProductColorFilter] = useState("all");
  const [productSizeFilter, setProductSizeFilter] = useState("all");

  // GST API Integration State
  const [isFetchingGST, setIsFetchingGST] = useState(false);
  const [gstFetchError, setGstFetchError] = useState<string | null>(null);
  const [gstAutoFilled, setGstAutoFilled] = useState(false);


  // GST API Integration Functions
  const handleGSTNumberChange = async (gstNumber: string) => {
    setNewCustomer({...newCustomer, gstNumber});
    setGstFetchError(null);
    setGstAutoFilled(false);

    // Only fetch if GST number is complete (15 characters)
    if (gstNumber.length === 15) {
      setIsFetchingGST(true);
      try {
        const { data, error } = await GSTApiService.getCustomerDetailsFromGST(gstNumber);
        
        if (error) {
          setGstFetchError(error);
        } else if (data) {
          // Auto-fill customer details
          // Use company name as customer name (GST doesn't have individual customer names)
          setNewCustomer({
            ...newCustomer,
            gstNumber: data.gstNumber,
            name: data.companyName, // Use company name as customer name
            companyName: data.companyName,
            address: data.address,
            city: data.city,
            state: data.state,
            pincode: data.pincode
            // Note: Email and phone are not in GST data, user must enter manually
          });
          setGstAutoFilled(true);
        }
      } catch (error) {
        console.error('Error fetching GST details:', error);
        setGstFetchError('Failed to fetch GST details');
      } finally {
        setIsFetchingGST(false);
      }
    }
  };

  const clearGSTAutoFill = () => {
    setGstAutoFilled(false);
    setGstFetchError(null);
  };

  // Load customers and products from storage on component mount
  useEffect(() => {
    const loadCustomers = async () => {
      try {
        // Load customers from MongoDB
        const { data: customersData, error } = await CustomerService.getCustomers();
        
        if (error) {
          console.error('Error loading customers:', error);
          toast({
            title: "Error",
            description: "Failed to load customers from database",
            variant: "destructive",
          });
          return;
        }

        if (customersData) {
          // MongoDB customers are already in the correct format
          setCustomers(customersData);
          console.log('✅ Loaded', customersData.length, 'customers from MongoDB for NewOrder');
        }
      } catch (error) {
        console.error('Error loading customers:', error);
        toast({
          title: "Error",
          description: "Failed to load customers. Please try again.",
          variant: "destructive",
        });
      }
    };

    loadCustomers();
    
    // Load products and raw materials from MongoDB
    const loadProductsAndMaterials = async () => {
      try {
        // Load products from MongoDB
        const { data: products, error: productsError } = await ProductService.getProducts();
        
        if (productsError) {
          console.error('Error loading products:', productsError);
        } else {
          console.log('✅ Loaded', products?.length || 0, 'products from MongoDB');
        }

        // Load raw materials from MongoDB
        const { data: rawMaterials, error: materialsError } = await RawMaterialService.getRawMaterials();
        
        if (materialsError) {
          console.error('Error loading raw materials:', materialsError);
        } else {
          console.log('✅ Loaded', rawMaterials?.length || 0, 'raw materials from MongoDB');
        }

        // Individual products will be loaded per product when needed
        console.log('✅ Individual products will be loaded per product when needed');

        return { products: products || [], rawMaterials: rawMaterials || [], individualProducts: [] };
      } catch (error) {
        console.error('Error loading data from MongoDB:', error);
        return { products: [], rawMaterials: [], individualProducts: [] };
      }
    };

    // Load all data from MongoDB
    const loadAllData = async () => {
      try {
        // Load products from MongoDB
        const { data: productsData, error: productsError } = await ProductService.getProducts();

        if (productsError) {
          console.error('Error loading products:', productsError);
          throw productsError;
        }

        // Individual products will be loaded per product when needed
        console.log('✅ Individual products will be loaded per product when needed');

        // Load raw materials from MongoDB
        const { data: rawMaterialsData, error: rawMaterialsError } = await RawMaterialService.getRawMaterials();

        if (rawMaterialsError) {
          console.error('Error loading raw materials:', rawMaterialsError);
          throw rawMaterialsError;
        }

        // Transform products to match the expected format
        const transformedProducts = (productsData || []).map((product: any) => {
          // Calculate stock based on individual tracking setting
          let calculatedStock = 0;
          if (product.individual_stock_tracking === false) {
            // For bulk products, use base_quantity
            calculatedStock = product.base_quantity || 0;
          } else {
            // For individual tracking products, we'll load individual products separately
            // For now, use base_quantity as fallback - will be updated when individual products are loaded
            calculatedStock = product.base_quantity || 0;
          }

          console.log(`📊 Stock calculation for ${product.name}:`, {
            individual_tracking: product.individual_stock_tracking,
            base_quantity: product.base_quantity,
            calculated_stock: calculatedStock
          });

          return {
            id: product.id,
            name: product.name,
            price: 0, // No fixed pricing - will be set per order
            stock: calculatedStock,
            category: product.category,
            subcategory: product.subcategory || "",
            color: product.color,
            size: product.pattern, // Map pattern to size for compatibility
            pattern: product.pattern,
            dimensions: `${product.width} x ${product.length}`,
            weight: product.weight,
            imageUrl: product.image_url || "",
            status: "in-stock", // Default status
            location: "Warehouse", // Default location
            unit: product.unit || "units",
            individualStockTracking: product.individual_stock_tracking,
            width: product.width,
            length: product.length
          };
        });

        // Transform raw materials to match the expected format
        const transformedRawMaterials = (rawMaterialsData || []).map((material: any) => {
          const stock = material.current_stock || 0;
          
          console.log(`🧱 Raw material ${material.name}:`, {
            current_stock: material.current_stock,
            calculated_stock: stock,
            unit: material.unit
          });

          return {
            id: material.id,
            name: material.name,
            price: material.cost_per_unit || 0,
            stock: stock,
            category: material.category,
            brand: material.brand,
            unit: material.unit,
            supplier: material.supplier_name || "Unknown",
            status: material.status || "in-stock",
            location: material.location || 'Warehouse'
          };
        });

        // Individual products will be loaded per product when needed
        // Load individual products for stock calculation
        console.log('📦 Loading individual products for stock calculation...');
        const { data: individualProductsData, error: individualProductsError } = await IndividualProductService.getAllAvailableIndividualProducts();
        
        if (individualProductsError) {
          console.error('Error loading individual products:', individualProductsError);
          // Continue without individual products - stock will show base_quantity
        } else {
          console.log('✅ Loaded individual products:', individualProductsData?.length || 0);
        }

        // Set all data
        setRealProducts(transformedProducts);
        setRawMaterials(transformedRawMaterials);
        setIndividualProducts(individualProductsData || []);
        
        // Update product stock after individual products are loaded
        const updatedProducts = transformedProducts.map(product => {
          const productIndividualProducts = (individualProductsData || []).filter(ip => ip.product_id === product.id);
          
          if (productIndividualProducts.length > 0) {
            // If individual products exist, count only available ones
            const availableCount = productIndividualProducts.filter(ip => ip.status === 'available').length;
            return { ...product, stock: availableCount };
          } else {
            // If no individual products exist, use base_quantity
            return { ...product, stock: product.stock };
          }
        });
        
        setRealProducts(updatedProducts);
        
        console.log('✅ Loaded products from MongoDB:', transformedProducts.length);
        console.log('🔍 Individual products will be loaded per product when needed');
        console.log('🧱 Loaded raw materials from MongoDB:', transformedRawMaterials.length);
        
        // Debug: Log stock values for first few products
        transformedProducts.slice(0, 3).forEach(product => {
          console.log(`📊 Product "${product.name}" stock: ${product.stock}, individual tracking: ${product.individualStockTracking}`);
        });
      } catch (error) {
        console.error('Error loading data from MongoDB:', error);
        // Fallback to empty arrays if MongoDB fails
        setRealProducts([]);
        setRawMaterials([]);
        setIndividualProducts([]);
        
        console.log('⚠️ Fallback: Using empty data arrays');
      }
    };

    loadAllData();
  }, [toast]);

  // Auto-calculate recipe requirements when order items change
  useEffect(() => {
    const productItems = orderItems.filter(item => item.product_type === 'product');
    
    if (productItems.length > 0) {
      // Recipe calculation removed - use dedicated Recipe Calculator page instead
      console.log('Recipe calculation available on dedicated Recipe Calculator page');
    } else {
      // Clear any existing recipe calculation when no products
      console.log('No products in order - recipe calculation not needed');
    }
  }, [orderItems]);

  const addOrderItem = () => {
    const newItem: ExtendedOrderItem = {
      id: generateUniqueId('ORDITEM'),
      product_id: "",
      product_name: "",
      product_type: 'product', // Default to product
      quantity: 1,
      unit_price: 0,
      total_price: 0,
      pricing_unit: 'sqm', // Default pricing unit for carpet
      product_dimensions: {
        productType: 'carpet'
      },
      isEditing: true,
      isValid: false
    };
    setOrderItems([...orderItems, newItem]);
  };

  const updateOrderItem = (id: string, field: keyof ExtendedOrderItem, value: any) => {
    setOrderItems(items => items.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        
        if (field === 'product_id') {
          // Find product based on product_type
          const product = updated.product_type === 'raw_material' 
            ? rawMaterials.find(p => p.id === value)
            : realProducts.find(p => p.id === value);
            
          if (product) {
            updated.product_name = product.name;
            updated.unit_price = product.price;
            
            // Set suggested pricing unit based on product type and dimensions
            const productDimensions: ProductDimensions = {
              productType: updated.product_type === 'raw_material' ? 'raw_material' : 'carpet',
              width: product.dimensions?.width,
              length: product.dimensions?.length,
              weight: product.weight,
              gsm: product.gsm,
              denier: product.denier,
              thread_count: product.thread_count
            };
            
            updated.product_dimensions = productDimensions;
            updated.pricing_unit = getSuggestedPricingUnit(productDimensions);
            
            // Calculate initial pricing
            const calculation = pricingCalculator.calculateItemPrice(updated);
            updated.total_price = calculation.totalPrice;
            updated.unit_value = calculation.unitValue;
            updated.isValid = calculation.isValid;
            updated.errorMessage = calculation.errorMessage;
          }
        }
        
        if (field === 'quantity' || field === 'unit_price' || field === 'pricing_unit' || field === 'product_dimensions') {
          // Recalculate pricing when any pricing-related field changes
          const calculation = pricingCalculator.calculateItemPrice(updated);
          updated.total_price = calculation.totalPrice;
          updated.unit_value = calculation.unitValue;
          updated.isValid = calculation.isValid;
          updated.errorMessage = calculation.errorMessage;
        }
        
        return updated;
      }
      return item;
    }));
  };

  const removeOrderItem = (id: string) => {
    setOrderItems(items => items.filter(item => item.id !== id));
  };

  const calculateTotal = () => {
    return pricingCalculator.calculateOrderTotal(orderItems);
  };



  // Individual product selection functions
  const handleIndividualProductSelection = (orderItemId: string, individualProduct: IndividualProduct, isSelected: boolean) => {
    setOrderItems(items => {
      const updatedItems = items.map(item => {
      if (item.id === orderItemId) {
          let updatedSelectedProducts = [...(item.selectedIndividualProducts || [])];
        
        if (isSelected) {
          if (!updatedSelectedProducts.find(p => p.id === individualProduct.id)) {
            updatedSelectedProducts.push(individualProduct);
          }
        } else {
          updatedSelectedProducts = updatedSelectedProducts.filter(p => p.id !== individualProduct.id);
        }
        
        const updatedItem = {
          ...item,
          selectedIndividualProducts: updatedSelectedProducts
        };
        
          // Update currentOrderItem if it's the same item
        if (currentOrderItem && currentOrderItem.id === orderItemId) {
          setCurrentOrderItem(updatedItem);
        }
        
        return updatedItem;
      }
      return item;
      });

      return updatedItems;
    });
  };

  const autoSelectOldestPieces = (orderItemId: string, quantity: number) => {
    const orderItem = orderItems.find(item => item.id === orderItemId);
    if (!orderItem || !orderItem.product_id) return;

    const availableProducts = getAvailableIndividualProducts(orderItem.product_id);
        const selectedProducts = availableProducts.slice(0, Math.min(quantity, availableProducts.length));
        
    setOrderItems(items => {
      return items.map(item => {
        if (item.id === orderItemId) {
        const updatedItem = {
          ...item,
          selectedIndividualProducts: selectedProducts
        };
        
          // Update currentOrderItem if it's the same item
        if (currentOrderItem && currentOrderItem.id === orderItemId) {
          setCurrentOrderItem(updatedItem);
        }
        
        return updatedItem;
      }
      return item;
      });
    });
  };

  const hasIndividualStock = (productId: string, productType: 'product' | 'raw_material' = 'product') => {
    // Raw materials never have individual stock tracking
    if (productType === 'raw_material') {
      return false;
    }
    
    const product = realProducts.find(p => p.id === productId);
    const hasIndividual = product && product.individualStockTracking !== false;
    
    console.log(`🔍 hasIndividualStock check for ${productId}:`, {
      productType,
      product: product?.name,
      individualStockTracking: product?.individualStockTracking,
      hasIndividual
    });
    
    return hasIndividual;
  };

  const getDisplayUnit = (productId: string, productType: 'product' | 'raw_material') => {
    if (productType === 'raw_material') {
      const material = rawMaterials.find(m => m.id === productId);
      return material?.unit || 'units';
    } else {
      const product = realProducts.find(p => p.id === productId);
      return product?.unit || 'pieces';
    }
  };

  const getAvailableIndividualProducts = (productId: string) => {
    return individualProducts
      .filter(p => p.product_id === productId && p.status === "available")
      .map(p => ({
        ...p,
        // Calculate age in days from manufacturing date
        age: Math.floor((new Date().getTime() - new Date(p.manufacturingDate).getTime()) / (1000 * 60 * 60 * 24)),
        // Map fields to match expected interface
        dimensions: p.finalDimensions || p.dimensions || "N/A",
        weight: p.finalWeight || p.weight || "N/A",
        productName: realProducts.find(rp => rp.id === productId)?.name || "Unknown Product",
        location: p.location || "Warehouse"
      }))
      .sort((a, b) => a.age - b.age); // Sort by age (oldest first)
  };

  // Function to get available stock for a product (following Supabase logic)
  const getAvailableStock = (product: any) => {
    // Check if there are individual products for this product
    const productIndividualProducts = individualProducts.filter(p => p.product_id === product.id);
    
    if (productIndividualProducts.length > 0) {
      // If individual products exist, count only available ones (regardless of tracking setting)
      const availableCount = productIndividualProducts.filter(p => p.status === 'available').length;
      return availableCount;
    } else {
      // If no individual products exist, use base_quantity
      return product.stock || 0;
    }
  };

  const handleProductionAlert = (item: OrderItem) => {
    setProductionAlertItem(item);
    setShowProductionAlert(true);
  };

  const handleSubmit = async () => {
    if (!selectedCustomer && !showNewCustomerForm) {
      toast({
        title: "Error",
        description: "Please select a customer or add a new one",
        variant: "destructive"
      });
      return;
    }

    if (orderItems.length === 0) {
      toast({
        title: "Error",
        description: "Please add at least one item to the order",
        variant: "destructive"
      });
      return;
    }

    // Calculate order totals for validation
    const subtotal = calculateTotal();
    const gstRate = gstSettings.rate;
    const gstAmount = gstSettings.isIncluded ? (subtotal * gstRate) / 100 : 0;
    const totalAmount = subtotal + gstAmount;

    // Payment is now optional - no validation required
    // Orders can be completed with any payment amount (including ₹0)

    try {
      // Calculate order totals with GST
      const subtotal = calculateTotal();
      const gstRate = gstSettings.rate;
      const gstAmount = gstSettings.isIncluded ? (subtotal * gstRate) / 100 : 0;
      const totalAmount = subtotal + gstAmount;
      const paidAmount = orderDetails.paidAmount || 0;
      const outstandingAmount = totalAmount - paidAmount;

      // Create the order with new dynamic pricing format
      const newOrder = {
        id: generateUniqueId('ORD'),
        orderNumber: `ORD-${Date.now()}`,
        customerId: selectedCustomer?.id || '',
        customerName: selectedCustomer?.name || '',
        customerEmail: selectedCustomer?.email || '',
        customerPhone: selectedCustomer?.phone || '',
        orderDate: new Date().toISOString().split('T')[0],
        expectedDelivery: orderDetails.expectedDelivery || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        items: orderItems.map(item => ({
          product_id: item.product_id,
          product_name: item.product_name,
          product_type: item.product_type,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price,
          pricing_unit: item.pricing_unit,
          unit_value: item.unit_value,
          product_dimensions: item.product_dimensions,
          quality_grade: 'A', // Default quality grade
          specifications: '' // Default specifications
        })),
        subtotal,
        gstRate,
        gstAmount,
        discountAmount: 0,
        totalAmount,
        paidAmount,
        outstandingAmount,
        gstIncluded: true,
        paymentMethod: paidAmount > 0 ? "cash" : "credit",
        paymentTerms: paidAmount > 0 ? "Paid in full" : "30 days",
        dueDate: paidAmount > 0 ? undefined : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: "accepted" as const,
        workflowStep: "accept" as const,
        acceptedAt: new Date().toISOString(),
        notes: orderDetails.notes || ""
      };

      // Save order to Supabase
      const orderData = {
        customer_id: selectedCustomer?.id,
        customer_name: newOrder.customerName,
        customer_email: newOrder.customerEmail,
        customer_phone: newOrder.customerPhone,
        expected_delivery: newOrder.expectedDelivery,
        items: orderItems.map(item => ({
          product_id: item.product_id,
          product_name: item.product_name,
          product_type: item.product_type,
          quantity: item.quantity,
          unit_price: item.unit_price,
          quality_grade: item.quality_grade || 'A',
          specifications: item.specifications || '',
          selected_individual_products: (item as any).selectedIndividualProducts?.map((p: any) => p.id) || []
        })),
        gst_rate: newOrder.gstRate,
        discount_amount: newOrder.discountAmount,
        paid_amount: orderDetails.paidAmount,
        priority: 'medium' as const,
        special_instructions: newOrder.notes,
        // Store the delivery address with the order
        delivery_address: orderDeliveryAddress || undefined
      };

      const { data: createdOrder, error: orderError } = await MongoDBOrderService.createOrder(orderData);
      
      if (orderError) {
        console.error('Error creating order:', orderError);
        toast({
          title: "❌ Order Creation Failed",
          description: "Failed to create order in database. Please try again.",
          variant: "destructive"
        });
        return;
      }

      // Order saved to Supabase via OrderService

      // Note: Stock will be deducted only when order is dispatched, not when accepted
      // This allows orders to be accepted even with low stock, and production can be planned

      // Update customer order history
      if (selectedCustomer) {
        const updatedCustomers = customers.map(customer => {
          if (customer.id === selectedCustomer.id) {
            return {
              ...customer,
              total_orders: customer.total_orders + 1,
              total_value: (parseFloat(customer.total_value) + totalAmount).toFixed(2),
              lastOrderDate: newOrder.orderDate
            };
          }
          return customer;
        });
        // Customer data will be updated by CustomerService
    }

    // Check if any items need production based on stock availability (for notifications only)
    const itemsNeedingProduction = orderItems.filter(item => {
      if (item.product_type !== 'product') return false;
      
      // Find the product to check stock
      const product = realProducts.find(p => p.id === item.product_id);
      if (!product) return false;
      
      // Check if order quantity exceeds available stock
      const availableStock = getAvailableStock(product);
      const shortfall = Math.max(0, item.quantity - availableStock);
      
      return shortfall > 0; // Needs production if there's a shortfall
    });

    // Check if any raw materials need restocking based on stock availability
    const rawMaterialsNeedingRestock = orderItems.filter(item => {
      if (item.product_type !== 'raw_material') return false;
      
      // Find the raw material to check stock
      const material = rawMaterials.find(m => m.id === item.product_id);
      if (!material) return false;
      
      // Check if order quantity exceeds available stock
      const availableStock = material.stock || 0;
      const shortfall = Math.max(0, item.quantity - availableStock);
      
      return shortfall > 0; // Needs restocking if there's a shortfall
    });
    
    // Always create the order (no blocking based on stock)
    // Send notifications to products section for items needing production
    if (itemsNeedingProduction.length > 0) {
      // Send notifications to products section for each item needing production
      for (const item of itemsNeedingProduction) {
        const product = realProducts.find(p => p.id === item.product_id);
        const availableStock = product?.stock || 0;
        const shortfall = Math.max(0, item.quantity - availableStock);
        
        // Check if notification already exists to prevent duplicates
        const { exists: hasExistingNotification } = await MongoDBNotificationService.notificationExists(
          'production_request',
          item.product_id,
          'unread'
        );
        
        if (!hasExistingNotification) {
          await MongoDBNotificationService.createNotification({
            type: 'production_request',
            title: `Product Stock Alert - ${item.product_name}`,
            message: `Order ${newOrder.orderNumber} requires ${item.quantity} units of ${item.product_name}. Current stock: ${availableStock} units. Need to produce ${shortfall} more units.`,
            priority: 'high',
            status: 'unread',
            module: 'products',
            related_id: item.product_id,
            related_data: {
              productId: item.product_id,
              productName: item.product_name,
              requiredQuantity: item.quantity,
              availableStock: availableStock,
              shortfall: shortfall,
              orderId: newOrder.id,
              orderNumber: newOrder.orderNumber
            },
            created_by: 'system'
          });
        }
      }
    }

    // Recipe calculation removed - use dedicated Recipe Calculator page instead
    console.log('Recipe calculation available on dedicated Recipe Calculator page');

    // Send notifications to materials section for raw materials needing restocking
    if (rawMaterialsNeedingRestock.length > 0) {
      // Send notifications to materials section for each raw material needing restocking
      for (const item of rawMaterialsNeedingRestock) {
        const material = rawMaterials.find(m => m.id === item.product_id);
        const availableStock = material?.stock || 0;
        const shortfall = Math.max(0, item.quantity - availableStock);
        
        // Check if notification already exists to prevent duplicates
        const { exists: hasExistingNotification } = await MongoDBNotificationService.notificationExists(
          'restock_request',
          item.product_id,
          'unread'
        );
        
        if (!hasExistingNotification) {
          await MongoDBNotificationService.createNotification({
            type: 'restock_request',
            title: `Raw Material Stock Alert - ${item.product_name}`,
            message: `Order ${newOrder.orderNumber} requires ${item.quantity} units of ${item.product_name}. Current stock: ${availableStock} units. Need to restock ${shortfall} more units.`,
            priority: 'high',
            status: 'unread',
            module: 'materials',
            related_id: item.product_id,
            related_data: {
              materialId: item.product_id,
              materialName: item.product_name,
              requiredQuantity: item.quantity,
              availableStock: availableStock,
              shortfall: shortfall,
              orderId: newOrder.id,
              orderNumber: newOrder.orderNumber
            },
            created_by: 'system'
          });
        }
      }
    }
    
    // Show appropriate success message based on what needs attention
    if (itemsNeedingProduction.length > 0 && rawMaterialsNeedingRestock.length > 0) {
      toast({
          title: "✅ Order Created Successfully",
          description: `Order ${newOrder.orderNumber} created! Total: ₹${totalAmount.toLocaleString()} (GST included). Outstanding: ₹${outstandingAmount.toLocaleString()}. ${itemsNeedingProduction.length} products need production & ${rawMaterialsNeedingRestock.length} materials need restocking - Notifications sent.`,
      });
    } else if (itemsNeedingProduction.length > 0) {
      toast({
          title: "✅ Order Created Successfully",
          description: `Order ${newOrder.orderNumber} created! Total: ₹${totalAmount.toLocaleString()} (GST included). Outstanding: ₹${outstandingAmount.toLocaleString()}. ${itemsNeedingProduction.length} items need production - Products section notified.`,
      });
    } else if (rawMaterialsNeedingRestock.length > 0) {
      toast({
          title: "✅ Order Created Successfully",
          description: `Order ${newOrder.orderNumber} created! Total: ₹${totalAmount.toLocaleString()} (GST included). Outstanding: ₹${outstandingAmount.toLocaleString()}. ${rawMaterialsNeedingRestock.length} materials need restocking - Materials section notified.`,
      });
    } else {
      // All items have sufficient stock
    toast({
          title: "✅ Order Created Successfully",
          description: `Order ${newOrder.orderNumber} created! Total: ₹${totalAmount.toLocaleString()} (GST included). Outstanding: ₹${outstandingAmount.toLocaleString()}`,
        });
      }

      // Navigate back to orders list
      setTimeout(() => {
        navigate('/orders');
      }, 2000);

    } catch (error) {
      console.error('Error creating order:', error);
      toast({
        title: "❌ Order Creation Failed",
        description: "Failed to create order. Please try again.",
        variant: "destructive"
    });
    }
  };

  return (
    <div className="flex-1 space-y-6 p-6">
      <Header 
        title="Create New Order" 
        subtitle="Add customer details and order items"
      />

      {/* Customer Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Customer Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Button 
              variant={!showNewCustomerForm ? "default" : "outline"}
              onClick={() => setShowNewCustomerForm(false)}
            >
              Select Existing Customer
            </Button>
            <Button 
              variant={showNewCustomerForm ? "default" : "outline"}
              onClick={() => setShowNewCustomerForm(true)}
            >
              Add New Customer
            </Button>
          </div>

          {!showNewCustomerForm ? (
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input placeholder="Search customers..." className="pl-10" />
              </div>
              <div className="grid gap-2">
                {customers.map((customer) => (
                  <div 
                    key={customer.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedCustomer?.id === customer.id 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border hover:bg-muted'
                    }`}
                    onClick={() => setSelectedCustomer(customer)}
                  >
                    <div className="font-medium">{customer.name}</div>
                    {customer.company_name && (
                      <div className="text-sm text-muted-foreground">{customer.company_name}</div>
                    )}
                    <div className="text-sm text-muted-foreground">{customer.email} • {customer.phone}</div>
                    <div className="text-sm text-muted-foreground">{customer.address}, {customer.city}, {customer.state} - {customer.pincode}</div>
                    {customer.gst_number && (
                      <div className="text-xs text-muted-foreground">GST: {customer.gst_number}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Customer Type Selection */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Customer Type *</Label>
                <Select 
                  value={newCustomer.customerType} 
                  onValueChange={(value: "individual" | "business") => 
                    setNewCustomer({...newCustomer, customerType: value})
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="individual">Individual</SelectItem>
                    <SelectItem value="business">Business</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Basic Information */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name *</Label>
                      <Input
                        id="name"
                        value={newCustomer.name}
                        onChange={(e) => setNewCustomer({...newCustomer, name: e.target.value})}
                        placeholder="Enter customer full name"
                      />
                    </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={newCustomer.email}
                      onChange={(e) => setNewCustomer({...newCustomer, email: e.target.value})}
                      placeholder="Enter email address (e.g., customer@gmail.com)"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number *</Label>
                    <Input
                      id="phone"
                      value={newCustomer.phone}
                      onChange={(e) => setNewCustomer({...newCustomer, phone: e.target.value})}
                      placeholder="+91 9876543210"
                    />
                  </div>
                  
                    <div className="space-y-2">
                      <Label htmlFor="gstNumber">GST Number</Label>
                      <Input
                        id="gstNumber"
                        value={newCustomer.gstNumber}
                        onChange={(e) => handleGSTNumberChange(e.target.value)}
                        placeholder="Enter GST number"
                        maxLength={15}
                      />
                    </div>
                </div>

                {newCustomer.customerType === "business" && (
                  <div className="space-y-2">
                    <Label htmlFor="companyName">Company Name</Label>
                    <Input
                      id="companyName"
                      value={newCustomer.companyName}
                      onChange={(e) => setNewCustomer({...newCustomer, companyName: e.target.value})}
                      placeholder="Enter company name"
                    />
                  </div>
                )}
              </div>

              {/* Address Information */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Textarea
                    id="address"
                    value={newCustomer.address}
                    onChange={(e) => setNewCustomer({...newCustomer, address: e.target.value})}
                    placeholder="Enter full address"
                    rows={2}
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      value={newCustomer.city}
                      onChange={(e) => setNewCustomer({...newCustomer, city: e.target.value})}
                      placeholder="Enter city"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="state">State</Label>
                    <Input
                      id="state"
                      value={newCustomer.state}
                      onChange={(e) => setNewCustomer({...newCustomer, state: e.target.value})}
                      placeholder="Enter state"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="pincode">Pincode</Label>
                    <Input
                      id="pincode"
                      value={newCustomer.pincode}
                      onChange={(e) => setNewCustomer({...newCustomer, pincode: e.target.value})}
                      placeholder="Enter pincode"
                    />
                  </div>
                </div>
              </div>

              {/* Add Customer Button */}
              <div className="flex gap-2 pt-4 border-t">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setNewCustomer({
                      name: "",
                      email: "",
                      phone: "",
                      address: "",
                      city: "",
                      state: "",
                      pincode: "",
                      customerType: "individual",
                      gstNumber: "",
                      companyName: "",
                      permanentAddress: {
                        address: "",
                        city: "",
                        state: "",
                        pincode: ""
                      },
                      deliveryAddress: {
                        address: "",
                        city: "",
                        state: "",
                        pincode: ""
                      },
                      sameAsPermanent: true
                    });
                    setShowNewCustomerForm(false);
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={async () => {
                    // Basic validation
                    if (!newCustomer.name.trim() || !newCustomer.email.trim() || !newCustomer.phone.trim()) {
                      toast({
                        title: "Error",
                        description: "Please fill in required fields: Name, Email, and Phone",
                        variant: "destructive"
                      });
                      return;
                    }

                    try {
                      // Create new customer using CustomerService
                      const customerData = {
                        name: newCustomer.name.trim(),
                        email: newCustomer.email.trim(),
                        phone: newCustomer.phone.trim(),
                        address: newCustomer.address.trim() || undefined,
                        city: newCustomer.city.trim() || undefined,
                        state: newCustomer.state.trim() || undefined,
                        pincode: newCustomer.pincode.trim() || undefined,
                        customer_type: newCustomer.customerType,
                        gst_number: newCustomer.gstNumber.trim() || undefined,
                        company_name: newCustomer.companyName.trim() || undefined
                      };

                      const { data: newCustomerData, error } = await CustomerService.createCustomer(customerData);
                      
                      if (error) {
                        toast({
                          title: "Error",
                          description: error,
                          variant: "destructive"
                        });
                        return;
                      }

                      if (newCustomerData) {
                        // MongoDB customers are already in the correct format
                        const localCustomer: Customer = newCustomerData;

                        // Add to customers array
                        const updatedCustomers = [...customers, localCustomer];
                    setCustomers(updatedCustomers);
                    
                    // Select the newly created customer
                        setSelectedCustomer(localCustomer);
                    
                    // Reset form and hide form
                    setNewCustomer({
                      name: "",
                      email: "",
                      phone: "",
                      address: "",
                      city: "",
                      state: "",
                      pincode: "",
                      customerType: "individual",
                      gstNumber: "",
                      companyName: "",
                      permanentAddress: {
                        address: "",
                        city: "",
                        state: "",
                        pincode: ""
                      },
                      deliveryAddress: {
                        address: "",
                        city: "",
                        state: "",
                        pincode: ""
                      },
                      sameAsPermanent: true
                    });
                    setShowNewCustomerForm(false);
                    
                    toast({
                      title: "Success",
                          description: `Customer "${localCustomer.name}" added successfully and selected for this order!`,
                        });
                      }
                    } catch (error) {
                      console.error('Error creating customer:', error);
                      toast({
                        title: "Error",
                        description: "Failed to create customer. Please try again.",
                        variant: "destructive"
                      });
                    }
                  }}
                  disabled={!newCustomer.name.trim() || !newCustomer.email.trim() || !newCustomer.phone.trim()}
                >
                  <Save className="w-4 h-4 mr-2" />
                  Add Customer
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Order Items */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Order Items</CardTitle>
          <Button onClick={addOrderItem}>
            <Plus className="w-4 h-4 mr-2" />
            Add Item
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {orderItems.map((item) => (
              <div key={item.id} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Calculator className="w-5 h-5 text-blue-600" />
                    <h3 className="font-medium text-lg">Order Item #{orderItems.indexOf(item) + 1}</h3>
                    {item.product_name && (
                      <Badge variant="secondary" className="ml-2">
                        {item.product_name}
                      </Badge>
                    )}
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm" 
                    onClick={() => removeOrderItem(item.id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Remove
                      </Button>
                    </div>
                
                <EnhancedPricingForm
                  item={item}
                  onUpdate={(updatedItem) => {
                    setOrderItems(items => items.map(i => i.id === item.id ? updatedItem : i));
                  }}
                  products={realProducts}
                  rawMaterials={rawMaterials}
                  individualProducts={individualProducts}
                  onProductSearch={(item) => {
                    setCurrentOrderItem(item as any);
                                   setShowProductSearch(true);
                                 }}
                  onIndividualProductSelection={(item) => {
                    setCurrentOrderItem(item as any);
                    setShowIndividualProductSelection(true);
                  }}
                  />
                </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recipe calculation removed - use dedicated Recipe Calculator page instead */}

      {/* Order Details */}
      <Card>
        <CardHeader>
          <CardTitle>Order Details</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="expectedDelivery">Expected Delivery Date</Label>
            <Input 
              id="expectedDelivery"
              type="date"
              value={orderDetails.expectedDelivery}
              onChange={(e) => setOrderDetails(prev => ({ ...prev, expectedDelivery: e.target.value }))}
              min={new Date().toISOString().split('T')[0]}
            />
          </div>
          <div>
            <Label htmlFor="paidAmount">Advance Payment (Optional)</Label>
            <Input 
              id="paidAmount"
              type="text"
              value={orderDetails.paidAmount}
              onChange={(e) => {
                // Allow only numbers, decimals, and leading zeros
                const value = e.target.value;
                if (value === '' || /^\d*\.?\d*$/.test(value)) {
                  setOrderDetails(prev => ({ ...prev, paidAmount: parseFloat(value) || 0 }));
                }
              }}
              placeholder="Enter advance payment amount (₹0 if no advance)"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Payment is optional. Outstanding amount will be tracked for future collection.
            </p>
          </div>
          <div className="col-span-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea 
              id="notes"
              value={orderDetails.notes}
              onChange={(e) => setOrderDetails(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Additional notes or special instructions..."
            />
          </div>
        </CardContent>
      </Card>



      {/* GST Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5" />
            GST Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* GST Rate Input */}
            <div className="space-y-2">
              <Label htmlFor="gst-rate">GST Rate (%)</Label>
              <Input
                id="gst-rate"
                type="text"
                min="0"
                max="100"
                step="0.01"
                value={gstSettings.rate}
                onChange={(e) => {
                  // Allow only numbers, decimals, and leading zeros
                  const value = e.target.value;
                  if (value === '' || /^\d*\.?\d*$/.test(value)) {
                    const rate = parseFloat(value) || 0;
                    setGstSettings(prev => ({ 
                      ...prev, 
                      rate: rate
                    }));
                  }
                }}
                placeholder="Enter GST percentage (e.g., 18)"
              />
            </div>

            {/* GST Include/Exclude Toggle */}
            <div className="space-y-2">
              <Label>GST Status</Label>
              <div className="flex items-center space-x-2">
                <Button
                  variant={gstSettings.isIncluded ? "default" : "outline"}
                  size="sm"
                  onClick={() => setGstSettings(prev => ({ ...prev, isIncluded: true }))}
                >
                  Include GST
                </Button>
                <Button
                  variant={!gstSettings.isIncluded ? "default" : "outline"}
                  size="sm"
                  onClick={() => setGstSettings(prev => ({ ...prev, isIncluded: false }))}
                >
                  Exclude GST
                </Button>
              </div>
            </div>
          </div>
          
          {/* GST Preview */}
          <div className="mt-4 p-3 bg-muted rounded-lg">
            <div className="text-sm text-muted-foreground">
              <strong>Current GST:</strong> {gstSettings.isIncluded ? `${gstSettings.rate}%` : 'Excluded (0%)'}
              {gstSettings.isIncluded && (
                <span className="ml-2">
                  (₹{((calculateTotal() * gstSettings.rate) / 100).toLocaleString()})
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delivery Address Management */}
      {selectedCustomer && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Delivery Address
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {orderDeliveryAddress ? (
              <div className="space-y-3">
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-green-800">Delivery Address Set</h4>
                      <p className="text-sm text-green-600">
                        {orderDeliveryAddress.address}, {orderDeliveryAddress.city}, {orderDeliveryAddress.state} - {orderDeliveryAddress.pincode}
                      </p>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setShowAddressEditor(true)}
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-medium text-blue-800 mb-2">Set Delivery Address</h4>
                  <p className="text-sm text-blue-600 mb-3">
                    Choose delivery address for this order. You can use the customer's default delivery address or set a custom one.
                  </p>
                  <div className="flex gap-2">
                    <Button 
                      size="sm"
                      onClick={() => {
                        if (selectedCustomer.delivery_address) {
                          setOrderDeliveryAddress(JSON.parse(selectedCustomer.delivery_address));
                        } else if (selectedCustomer.permanent_address) {
                          setOrderDeliveryAddress(JSON.parse(selectedCustomer.permanent_address));
                        } else {
                          // Use legacy address
                          setOrderDeliveryAddress({
                            address: selectedCustomer.address,
                            city: selectedCustomer.city,
                            state: selectedCustomer.state,
                            pincode: selectedCustomer.pincode
                          });
                        }
                      }}
                    >
                      Use Customer's Address
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setShowAddressEditor(true)}
                    >
                      Set Custom Address
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Order Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Order Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>₹{calculateTotal().toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>GST ({gstSettings.rate}%):</span>
              <span>₹{gstSettings.isIncluded ? ((calculateTotal() * gstSettings.rate) / 100).toLocaleString() : '0'}</span>
            </div>
            <div className="flex justify-between font-medium text-lg border-t pt-2">
              <span>Total Amount:</span>
              <span className="text-primary">₹{(calculateTotal() + (gstSettings.isIncluded ? (calculateTotal() * gstSettings.rate) / 100 : 0)).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Paid Amount:</span>
              <span className="text-green-600">₹{orderDetails.paidAmount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between font-medium text-lg border-t pt-2">
              <span>Outstanding Amount:</span>
              <span className="text-orange-600">₹{((calculateTotal() + (calculateTotal() * 18) / 100) - orderDetails.paidAmount).toLocaleString()}</span>
            </div>
          </div>
          
          {/* Order Status Info */}
          {orderItems.some(item => item.product_type === 'product') && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2 text-blue-800">
                <Info className="w-4 h-4" />
                <span className="font-medium">Order Processing</span>
              </div>
              <div className="text-sm text-blue-700 mt-1">
                This order will be accepted immediately. Individual product selection and stock allocation will happen in the next workflow stage.
              </div>
              <div className="mt-2 text-xs text-blue-600">
                <strong>Note:</strong> Orders are accepted regardless of current stock levels. Production notifications are sent automatically if needed.
              </div>
            </div>
          )}
          
          <div className="flex gap-4 mt-6">
            <Button variant="outline" className="flex-1">Save as Draft</Button>
             <Button 
               onClick={handleSubmit} 
               className="flex-1"
               disabled={orderItems.length === 0}
             >
               Accept Order
             </Button>
           </div>

        </CardContent>
      </Card>

      {/* Production Alert Dialog */}
      <Dialog open={showProductionAlert} onOpenChange={setShowProductionAlert}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-600">
              <AlertTriangle className="w-5 h-5" />
              Stock Low Alert
            </DialogTitle>
            <DialogDescription>
              This product has insufficient stock for the order.
            </DialogDescription>
          </DialogHeader>

          {productionAlertItem && (
            <div className="space-y-4">
              <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="text-center">
                  <h3 className="font-semibold text-orange-800 mb-2">{productionAlertItem.productName}</h3>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Available:</span>
                      <span className="font-medium text-green-600">{productionAlertItem.availableStock}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Required:</span>
                      <span className="font-medium text-red-600">{productionAlertItem.quantity}</span>
                    </div>
                    <div className="flex justify-between border-t pt-1">
                      <span className="text-gray-600">Need to produce:</span>
                      <span className="font-bold text-orange-600">
                        {productionAlertItem.quantity - productionAlertItem.availableStock} more pieces
                      </span>
                    </div>
                      </div>
                    </div>
                  </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowProductionAlert(false)}
                  className="flex-1"
                >
                  Close
                </Button>
                <Button
                  onClick={async () => {
                    // Check if notification already exists to prevent duplicates
                    const { exists: hasExistingNotification } = await NotificationService.notificationExists(
                      'production_request',
                      productionAlertItem.productId,
                      'unread'
                    );
                    
                    if (!hasExistingNotification) {
                      // Create notification when user clicks "Notify Production"
                      createNotification({
                        type: 'production_request',
                        title: `Production Request - ${productionAlertItem.productName}`,
                        message: `Order requires ${productionAlertItem.quantity} units of ${productionAlertItem.productName}. Current stock: ${productionAlertItem.availableStock} units.`,
                        priority: 'high',
                        status: 'unread',
                        module: 'production',
                        relatedId: productionAlertItem.productId,
                        relatedData: {
                          productId: productionAlertItem.productId,
                          productName: productionAlertItem.productName,
                          requiredQuantity: productionAlertItem.quantity,
                          availableStock: productionAlertItem.availableStock,
                          shortfall: productionAlertItem.quantity - productionAlertItem.availableStock
                        },
                        createdBy: 'user'
                      });
                      
                      toast({
                        title: "✅ Production Notification Sent",
                        description: "Production team has been notified about this request.",
                      });
                    } else {
                      toast({
                        title: "ℹ️ Notification Already Exists",
                        description: "A production request for this product already exists.",
                      });
                    }
                    
                    setShowProductionAlert(false);
                  }}
                  className="flex-1 bg-orange-600 hover:bg-orange-700"
                >
                  <Bell className="w-4 h-4 mr-2" />
                  Notify Production
                </Button>
                      </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Individual Product Selection Dialog - Excel-like UI */}
      <Dialog open={showIndividualProductSelection} onOpenChange={setShowIndividualProductSelection}>
        <DialogContent className="max-w-7xl max-h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Available Individual Pieces - {currentOrderItem?.product_name}
            </DialogTitle>
            <DialogDescription>
              View available individual pieces for this product. Individual piece selection will be done in the next step after order acceptance.
            </DialogDescription>
          </DialogHeader>
          
          {currentOrderItem && (
            <div className="flex-1 flex flex-col space-y-4 overflow-hidden">
              {/* Summary */}
              <div className="flex-shrink-0 flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="text-sm">
                  <span className="font-medium">Order Quantity: {currentOrderItem.quantity} pieces</span>
                  <span className="text-blue-600 ml-2 font-medium">• View Only - Selection will be done after order acceptance</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-sm text-muted-foreground">
                    Available: {getAvailableIndividualProducts(currentOrderItem.product_id || '').length} pieces
                  </div>
                </div>
              </div>

              {/* Excel-like Table */}
              <div className="flex-1 overflow-auto">
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
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
                      {getAvailableIndividualProducts(currentOrderItem.product_id || '').length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">
                            <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No individual products available</p>
                            <p className="text-xs mt-1">Individual pieces will appear here when available in inventory</p>
                          </td>
                        </tr>
                      ) : (
                        getAvailableIndividualProducts(currentOrderItem.product_id || '').map((product) => {

                  
                  return (
                            <tr
                      key={product.id} 
                              className="hover:bg-gray-50 transition-colors"
                            >
                              <td className="px-3 py-2 border-r font-mono text-xs">{product.id}</td>
                              <td className="px-3 py-2 border-r">
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
                              </td>
                              <td className="px-3 py-2 border-r">{(product.manufacturingDate) && product.manufacturingDate !== 'null' ? new Date(product.manufacturingDate).toLocaleDateString() : (product.productionDate) && product.productionDate !== 'null' ? new Date(product.productionDate).toLocaleDateString() : (product.completionDate) && product.completionDate !== 'null' ? new Date(product.completionDate).toLocaleDateString() : 'N/A'}</td>
                              <td className="px-3 py-2 border-r">{product.weight}</td>
                              <td className="px-3 py-2 border-r">
                            <Badge className={
                              product.qualityGrade === "A+" ? "bg-green-100 text-green-800" :
                              product.qualityGrade === "A" ? "bg-blue-100 text-blue-800" :
                              product.qualityGrade === "B" ? "bg-yellow-100 text-yellow-800" :
                                  "bg-white text-gray-800 border border-gray-300"
                            }>
                              {product.qualityGrade}
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
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Product Search Modal */}
      <Dialog open={showProductSearch} onOpenChange={(open) => {
        setShowProductSearch(open);
        if (!open) {
          // Reset filters when dialog closes
          setProductSearchTerm("");
          setProductCategoryFilter("all");
          setProductSubcategoryFilter("all");
          setProductColorFilter("all");
          setProductSizeFilter("all");
        }
      }}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Search className="w-5 h-5" />
              Search and Select {currentOrderItem?.product_type === 'raw_material' ? 'Raw Material' : 'Product'}
            </DialogTitle>
            <DialogDescription>
              Find the perfect {currentOrderItem?.product_type === 'raw_material' ? 'raw material' : 'product'} for your order. Use search, filters, and browse by category.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Search and Filters */}
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <Input
                  placeholder={`Search ${currentOrderItem?.product_type === 'raw_material' ? 'raw materials by name, category, brand, or unit' : 'products by name, category, subcategory, color, or size'}...`}
                  className="h-10"
                  value={productSearchTerm}
                  onChange={(e) => setProductSearchTerm(e.target.value)}
                />
              </div>
              {currentOrderItem?.product_type !== 'raw_material' && (
                <>
                  <Select value={productCategoryFilter} onValueChange={setProductCategoryFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {[...new Set(realProducts.map(p => p.category).filter(Boolean))].sort().map(category => (
                        <SelectItem key={category} value={category}>{category}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={productSubcategoryFilter} onValueChange={setProductSubcategoryFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Subcategory" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Subcategories</SelectItem>
                      {[...new Set(realProducts.map(p => p.subcategory).filter(Boolean))].sort().map(subcategory => (
                        <SelectItem key={subcategory} value={subcategory}>{subcategory}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={productColorFilter} onValueChange={setProductColorFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Color" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Colors</SelectItem>
                      {[...new Set(realProducts.map(p => p.color).filter(Boolean))].sort().map(color => (
                        <SelectItem key={color} value={color}>{color}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={productSizeFilter} onValueChange={setProductSizeFilter}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Size" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Sizes</SelectItem>
                      {[...new Set(realProducts.map(p => p.size).filter(Boolean))].sort().map(size => (
                        <SelectItem key={size} value={size}>{size}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </>
              )}
            </div>

            {/* Product Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
              {(currentOrderItem?.product_type === 'raw_material' ? rawMaterials : realProducts)
                .filter((product) => {
                  if (currentOrderItem?.product_type === 'raw_material') {
                    // For raw materials, only filter by search term
                    if (productSearchTerm) {
                      const search = productSearchTerm.toLowerCase();
                      return (
                        product.name?.toLowerCase().includes(search) ||
                        product.category?.toLowerCase().includes(search) ||
                        product.brand?.toLowerCase().includes(search) ||
                        product.unit?.toLowerCase().includes(search)
                      );
                    }
                    return true;
                  } else {
                    // For products, filter by all criteria
                    const matchesSearch = !productSearchTerm || 
                      product.name?.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
                      product.category?.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
                      (product.subcategory && product.subcategory.toLowerCase().includes(productSearchTerm.toLowerCase())) ||
                      product.color?.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
                      product.size?.toLowerCase().includes(productSearchTerm.toLowerCase());
                    
                    const matchesCategory = productCategoryFilter === "all" || product.category === productCategoryFilter;
                    const matchesSubcategory = productSubcategoryFilter === "all" || (product.subcategory && product.subcategory === productSubcategoryFilter);
                    const matchesColor = productColorFilter === "all" || product.color === productColorFilter;
                    const matchesSize = productSizeFilter === "all" || product.size === productSizeFilter;
                    
                    return matchesSearch && matchesCategory && matchesSubcategory && matchesColor && matchesSize;
                  }
                })
                .map((product) => (
                <div
                  key={product.id}
                  className={`border rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${
                    currentOrderItem?.product_id === product.id 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => {
                    // Update the order item with new product selection
                    setOrderItems(items => items.map(item => {
                      if (item.id === currentOrderItem!.id) {
                        const updated = { ...item, product_id: product.id, product_name: product.name, unit_price: product.price };
                        
                        // Set suggested pricing unit based on product type and dimensions
                        const productDimensions: ProductDimensions = {
                          productType: updated.product_type === 'raw_material' ? 'raw_material' : 'carpet',
                          width: product.dimensions?.width,
                          length: product.dimensions?.length,
                          weight: product.weight,
                          gsm: product.gsm,
                          denier: product.denier,
                          thread_count: product.thread_count
                        };
                        
                        updated.product_dimensions = productDimensions;
                        updated.pricing_unit = getSuggestedPricingUnit(productDimensions);
                        
                        // Calculate initial pricing
                        const calculation = pricingCalculator.calculateItemPrice(updated);
                        updated.total_price = calculation.totalPrice;
                        updated.unit_value = calculation.unitValue;
                        updated.isValid = calculation.isValid;
                        updated.errorMessage = calculation.errorMessage;
                        
                        return updated;
                      }
                      return item;
                    }));
                    setShowProductSearch(false);
                    // Reset filters when product is selected
                    setProductSearchTerm("");
                    setProductCategoryFilter("all");
                    setProductSubcategoryFilter("all");
                    setProductColorFilter("all");
                    setProductSizeFilter("all");
                  }}
                >
                  {/* Product Image */}
                  <div className="w-full h-32 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg mb-3 flex items-center justify-center overflow-hidden">
                    {product.imageUrl ? (
                      <img 
                        src={product.imageUrl} 
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                    <Package className="w-12 h-12 text-gray-400" />
                    )}
                  </div>
                  
                  {/* Product Info */}
                  <div className="space-y-2">
                    <h3 className="font-semibold text-sm line-clamp-2">{product.name}</h3>
                    <div className="text-xs text-muted-foreground">
                      {currentOrderItem?.product_type === 'raw_material' 
                        ? `${product.category} • ${product.brand} • ${product.unit}`
                        : `${product.category}${product.subcategory ? ` • ${product.subcategory}` : ''} • ${product.color} • ${product.size}`}
                    </div>
                    {currentOrderItem?.product_type === 'raw_material' ? (
                      product.supplier && (
                        <div className="text-xs text-muted-foreground">
                          Supplier: {product.supplier}
                        </div>
                      )
                    ) : (
                      product.pattern && (
                      <div className="text-xs text-muted-foreground">
                        Pattern: {product.pattern}
                      </div>
                      )
                    )}
                    {product.location && (
                      <div className="text-xs text-muted-foreground">
                        📍 {product.location}
                      </div>
                    )}
                    
                    {/* Stock Status */}
                    <div className="flex items-center justify-between">
                      <Badge 
                        variant={getAvailableStock(product) > 20 ? "default" : getAvailableStock(product) > 5 ? "secondary" : "destructive"}
                        className="text-xs"
                      >
                        Stock: {getAvailableStock(product)}
                      </Badge>
                                        <div className="text-sm font-semibold text-white">
                    ₹{product.price.toLocaleString()}
                  </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="flex gap-2 mt-3">
                      <Button 
                        size="sm" 
                        className="flex-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          updateOrderItem(currentOrderItem!.id, 'product_id', product.id);
                          updateOrderItem(currentOrderItem!.id, 'unit_price', product.price);
                          setShowProductSearch(false);
                        }}
                      >
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Select
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          // Navigate to product detail page
                        }}
                      >
                        <Eye className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {realProducts.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No products available</p>
                <p className="text-sm mt-2">Products will be loaded from inventory when available</p>
              </div>
            )}

            {/* Quick Stats */}
            {realProducts.length > 0 && (
            <div className="flex items-center justify-between text-sm text-muted-foreground border-t pt-4">
              <span>Showing {realProducts.length} products</span>
              <span>Click on a product to select it for your order</span>
            </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowProductSearch(false)}>
              Cancel
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
                <p><strong>Manufacturing Date:</strong> {(selectedQRProduct.manufacturingDate) && selectedQRProduct.manufacturingDate !== 'null' ? new Date(selectedQRProduct.manufacturingDate).toLocaleDateString() : (selectedQRProduct.productionDate) && selectedQRProduct.productionDate !== 'null' ? new Date(selectedQRProduct.productionDate).toLocaleDateString() : (selectedQRProduct.completionDate) && selectedQRProduct.completionDate !== 'null' ? new Date(selectedQRProduct.completionDate).toLocaleDateString() : 'N/A'}</p>
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

      {/* Address Editor Dialog */}
      <Dialog open={showAddressEditor} onOpenChange={setShowAddressEditor}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Delivery Address</DialogTitle>
            <DialogDescription>
              Set the delivery address for this order. Changes will be saved to the customer's profile.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="delivery-address">Address</Label>
              <Textarea
                id="delivery-address"
                value={orderDeliveryAddress?.address || ''}
                onChange={(e) => setOrderDeliveryAddress(prev => prev ? {...prev, address: e.target.value} : {
                  address: e.target.value,
                  city: '',
                  state: '',
                  pincode: ''
                })}
                placeholder="Enter delivery address"
                rows={2}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="delivery-city">City</Label>
                <Input
                  id="delivery-city"
                  value={orderDeliveryAddress?.city || ''}
                  onChange={(e) => setOrderDeliveryAddress(prev => prev ? {...prev, city: e.target.value} : {
                    address: '',
                    city: e.target.value,
                    state: '',
                    pincode: ''
                  })}
                  placeholder="Enter city"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="delivery-state">State</Label>
                <Input
                  id="delivery-state"
                  value={orderDeliveryAddress?.state || ''}
                  onChange={(e) => setOrderDeliveryAddress(prev => prev ? {...prev, state: e.target.value} : {
                    address: '',
                    city: '',
                    state: e.target.value,
                    pincode: ''
                  })}
                  placeholder="Enter state"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="delivery-pincode">Pincode</Label>
                <Input
                  id="delivery-pincode"
                  value={orderDeliveryAddress?.pincode || ''}
                  onChange={(e) => setOrderDeliveryAddress(prev => prev ? {...prev, pincode: e.target.value} : {
                    address: '',
                    city: '',
                    state: '',
                    pincode: e.target.value
                  })}
                  placeholder="Enter pincode"
                />
              </div>
            </div>
          </div>
          
          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => setShowAddressEditor(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={async () => {
                if (orderDeliveryAddress && selectedCustomer) {
                  // Update customer's delivery address in database
                  try {
                    const { error } = await CustomerService.updateCustomer(selectedCustomer.id, {
                      delivery_address: orderDeliveryAddress
                    } as any);
                    
                    if (error) {
                      toast({
                        title: "Error",
                        description: "Failed to update customer address",
                        variant: "destructive"
                      });
                    } else {
                      toast({
                        title: "Success",
                        description: "Delivery address updated successfully",
                      });
                      
                      // Update local customer data
                      const updatedCustomers = customers.map(customer => 
                        customer.id === selectedCustomer.id 
                          ? { ...customer, delivery_address: JSON.stringify(orderDeliveryAddress) }
                          : customer
                      );
                      setCustomers(updatedCustomers);
                      setSelectedCustomer({ ...selectedCustomer, delivery_address: JSON.stringify(orderDeliveryAddress) });
                    }
                  } catch (error) {
                    console.error('Error updating customer address:', error);
                    toast({
                      title: "Error",
                      description: "Failed to update customer address",
                      variant: "destructive"
                    });
                  }
                }
                setShowAddressEditor(false);
              }}
              disabled={!orderDeliveryAddress?.address || !orderDeliveryAddress?.city || !orderDeliveryAddress?.state || !orderDeliveryAddress?.pincode}
            >
              <Save className="w-4 h-4 mr-2" />
              Save Address
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}