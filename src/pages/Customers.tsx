import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { CustomerService, CreateCustomerData } from "@/services/customerService";
import { SupplierService, CreateSupplierData } from "@/services/supplierService";
import { MongoDBOrderService } from "@/services/api/orderService";
import { useToast } from "@/hooks/use-toast";
import { Header } from "@/components/layout/Header";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Search, Filter, Eye, Edit, MoreHorizontal, Phone, Mail, MapPin, ShoppingBag, Save, X, Calendar, DollarSign, Package, User, Building, RefreshCw, CheckCircle, AlertTriangle, Truck } from "lucide-react";
import { GSTApiService } from "@/services/gstApiService";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string; // Keep for backward compatibility
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

interface Supplier {
  id: string;
  name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  gst_number?: string;
  performance_rating: number;
  total_orders: number;
  total_value: number;
  status: "active" | "inactive" | "suspended";
  created_at: string;
  updated_at: string;
}


const statusStyles = {
  active: "bg-success text-success-foreground",
  inactive: "bg-muted text-muted-foreground"
};

export default function Customers() {
  const { toast } = useToast();
  const { user, hasPageAccess, hasPermission } = useAuth();
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showAddCustomerDialog, setShowAddCustomerDialog] = useState(false);
  const [showAddSupplierDialog, setShowAddSupplierDialog] = useState(false);
  
  // Check permissions
  // Page access = full access (create, edit, view) - delete is separate
  const hasCustomerAccess = hasPageAccess('customers');
  const hasSupplierAccess = hasPageAccess('suppliers');
  // Also check if user has orders access (grants customer access)
  const hasOrdersAccess = hasPageAccess('orders');
  
  // If user has orders access, they can also manage customers
  const canAccessCustomers = hasCustomerAccess || hasOrdersAccess;
  const canAccessSuppliers = hasSupplierAccess;
  
  // Create/edit permissions: if you have page access, you can create/edit
  const canCreateCustomer = canAccessCustomers;
  const canEditCustomer = canAccessCustomers;
  const canDeleteCustomer = hasPermission('customer_delete'); // Delete requires explicit permission
  const canCreateSupplier = canAccessSuppliers;
  const canEditSupplier = canAccessSuppliers;
  const canDeleteSupplier = hasPermission('supplier_delete'); // Delete requires explicit permission
  
  // Determine default tab based on permissions
  const getDefaultTab = () => {
    // If user has ONLY supplier permission → go to suppliers
    if (canAccessSuppliers && !canAccessCustomers) return 'suppliers';
    // If user has ONLY customer permission → go to customers
    if (canAccessCustomers && !canAccessSuppliers) return 'customers';
    // If user has BOTH → default to customers
    if (canAccessCustomers && canAccessSuppliers) return 'customers';
    // Default fallback
    return 'customers';
  };
  
  // Initialize tab based on permissions
  const getInitialTab = () => {
    // If user has ONLY supplier permission → suppliers tab
    if (canAccessSuppliers && !canAccessCustomers) return 'suppliers';
    // If user has ONLY customer permission → customers tab
    if (canAccessCustomers && !canAccessSuppliers) return 'customers';
    // If user has BOTH → default to customers
    if (canAccessCustomers && canAccessSuppliers) return 'customers';
    // Fallback (shouldn't reach here)
    return 'customers';
  };
  
  const [activeTab, setActiveTab] = useState<string>(getInitialTab());
  
  // Update tab when permissions are loaded
  useEffect(() => {
    const defaultTab = getDefaultTab();
    // Only update if current tab is invalid for user's permissions
    if ((activeTab === 'customers' && !canAccessCustomers) || 
        (activeTab === 'suppliers' && !canAccessSuppliers)) {
      setActiveTab(defaultTab);
    }
  }, [canAccessCustomers, canAccessSuppliers]);
  
  // Redirect if no access at all
  useEffect(() => {
    if (!canAccessCustomers && !canAccessSuppliers) {
      navigate('/access-denied', { state: { pageName: 'Customers & Suppliers' } });
    }
  }, [canAccessCustomers, canAccessSuppliers, navigate]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [showCustomerDetails, setShowCustomerDetails] = useState(false);
  const [showSupplierDetails, setShowSupplierDetails] = useState(false);
  const [showEditCustomerDialog, setShowEditCustomerDialog] = useState(false);
  const [showEditSupplierDialog, setShowEditSupplierDialog] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [newCustomerForm, setNewCustomerForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    customer_type: "individual" as "individual" | "business",
    gst_number: "",
    company_name: "",
    credit_limit: "0.00",
    notes: "",
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

  const [newSupplierForm, setNewSupplierForm] = useState({
    name: "",
    contact_person: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    gst_number: ""
  });

  // GST API Integration State
  const [isFetchingGST, setIsFetchingGST] = useState(false);
  const [gstFetchError, setGstFetchError] = useState<string | null>(null);
  const [gstAutoFilled, setGstAutoFilled] = useState(false);

  // GST API Integration Functions
  const handleGSTNumberChange = async (gstNumber: string) => {
    setNewCustomerForm({...newCustomerForm, gst_number: gstNumber});
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
          const permanentAddress = {
            address: data.address,
            city: data.city,
            state: data.state,
            pincode: data.pincode
          };
          
          setNewCustomerForm({
            ...newCustomerForm,
            gst_number: data.gstNumber,
            name: data.companyName, // Use company name as customer name
            company_name: data.companyName,
            address: data.address, // Keep for backward compatibility
            city: data.city,
            state: data.state,
            pincode: data.pincode,
            permanentAddress: permanentAddress,
            deliveryAddress: newCustomerForm.sameAsPermanent ? permanentAddress : newCustomerForm.deliveryAddress
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

  const loadCustomers = async () => {
    try {
      // Load customers from MongoDB backend
      const { data: customersData, error } = await CustomerService.getCustomers({
        search: searchTerm,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        customer_type: typeFilter !== 'all' ? typeFilter : undefined
      });
      
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
        setCustomers(customersData);
        console.log('✅ Loaded', customersData.length, 'customers from MongoDB');
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

  const loadSuppliers = async () => {
    try {
      // Load suppliers from MongoDB backend
      const { data: suppliersData, error } = await SupplierService.getSuppliers({
        search: searchTerm,
        status: statusFilter !== 'all' ? statusFilter : undefined
      });

      if (error) {
        console.error('Error loading suppliers:', error);
        toast({
          title: "Error",
          description: "Failed to load suppliers from database",
          variant: "destructive",
        });
        return;
      }

      setSuppliers(suppliersData || []);
      console.log('✅ Loaded', suppliersData?.length || 0, 'suppliers from MongoDB');
    } catch (error) {
      console.error('Error loading suppliers:', error);
      toast({
        title: "Error",
        description: "Failed to load suppliers. Please try again.",
        variant: "destructive",
      });
    }
  };

  const loadOrders = async () => {
    try {
      const { data: ordersData, error: ordersError } = await MongoDBOrderService.getOrders();
      
      if (ordersError) {
        console.error('Error loading orders:', ordersError);
        toast({
          title: "Error",
          description: "Failed to load orders from database.",
          variant: "destructive",
        });
        setOrders([]);
        return;
      }

      // Map MongoDB orders to the expected format for customer stats
      const mappedOrders = (ordersData || []).map((order: any) => ({
        id: order.id,
        orderNumber: order.order_number || order.id,
        customerId: order.customer_id || null,
        customerName: order.customer_name || '',
        totalAmount: parseFloat(order.total_amount || 0),
        paidAmount: parseFloat(order.paid_amount || 0),
        outstandingAmount: parseFloat(order.outstanding_amount || 0),
        orderDate: order.order_date || order.created_at || new Date().toISOString(),
        status: order.status || 'pending',
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

      setOrders(mappedOrders);
      console.log('✅ Loaded', mappedOrders.length, 'orders');
    } catch (error) {
      console.error('Error in loadOrders:', error);
      toast({
        title: "Error",
        description: "Failed to load orders from database.",
        variant: "destructive",
      });
      setOrders([]);
    }
  };

  // Load customers, suppliers and orders from Supabase on component mount
  useEffect(() => {
    loadCustomers();
    loadSuppliers();
    loadOrders();
  }, [toast]);


  // Get customer orders
  const getCustomerOrders = (customerId: string) => {
    // Find the customer to get their name for fallback matching
    const customer = customers.find(c => c.id === customerId);
    const customerName = customer?.name || '';
    
    return orders.filter(order => {
      // Match by customer ID if available
      if (order.customerId && order.customerId === customerId) {
        return true;
      }
      // Fallback: match by customer name if customer_id is null or doesn't match
      if (!order.customerId && customerName && order.customerName && 
          order.customerName.toLowerCase().trim() === customerName.toLowerCase().trim()) {
        return true;
      }
      return false;
    });
  };

  // Get customer order statistics
  const getCustomerOrderStats = (customerId: string) => {
    const customerOrders = getCustomerOrders(customerId);
    const totalValue = customerOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
    const totalOrders = customerOrders.length;
    const lastOrderDate = customerOrders.length > 0 
      ? customerOrders.sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime())[0].orderDate
      : 'No orders';
    
    return {
      totalOrders,
      totalValue,
      lastOrderDate,
      orders: customerOrders
    };
  };


  // Handle customer details view
  const handleViewCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowCustomerDetails(true);
  };

  // Handle customer edit
  const handleEditCustomer = (customer: Customer) => {
    setEditingCustomer({ ...customer });
    setShowEditCustomerDialog(true);
  };

  // Save customer edits
  const handleSaveCustomer = async () => {
    if (!editingCustomer) return;
    
    try {
      // Prepare update data for Supabase
      const updateData = {
        name: editingCustomer.name.trim(),
        email: editingCustomer.email.trim(),
        phone: editingCustomer.phone.trim(),
        address: editingCustomer.address.trim() || undefined,
        city: editingCustomer.city.trim() || undefined,
        state: editingCustomer.state.trim() || undefined,
        pincode: editingCustomer.pincode.trim() || undefined,
        customer_type: editingCustomer.customer_type,
        status: editingCustomer.status === 'active' ? 'active' as const : 'inactive' as const,
        gst_number: editingCustomer.gst_number?.trim() || undefined,
        company_name: editingCustomer.company_name?.trim() || undefined,
        permanent_address: editingCustomer.permanent_address ? JSON.stringify(JSON.parse(editingCustomer.permanent_address)) : undefined,
        delivery_address: editingCustomer.delivery_address ? JSON.stringify(JSON.parse(editingCustomer.delivery_address)) : undefined
      };

      // Update customer in Supabase
      const { data: updatedCustomer, error } = await CustomerService.updateCustomer(editingCustomer.id, updateData);
      
      if (error) {
        console.error('Error updating customer:', error);
        toast({
          title: "Error",
          description: error,
          variant: "destructive",
        });
        return;
      }

      if (updatedCustomer) {
        // Use the updated customer directly from MongoDB
        const localUpdatedCustomer: Customer = updatedCustomer;

        // Update local state
    const updatedCustomers = customers.map(customer => 
          customer.id === editingCustomer.id ? localUpdatedCustomer : customer
    );
    
    setCustomers(updatedCustomers);
    setShowEditCustomerDialog(false);
    setEditingCustomer(null);
        
        toast({
          title: "Success",
          description: "Customer updated successfully!",
        });
        
        console.log('✅ Customer updated successfully:', updatedCustomer);
      }
    } catch (error) {
      console.error('Error updating customer:', error);
      toast({
        title: "Error",
        description: "Failed to update customer. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Get customer payment summary
  const getCustomerPaymentSummary = (customerId: string) => {
    const customerOrders = getCustomerOrders(customerId);
    const totalPaid = customerOrders.reduce((sum, order) => sum + (order.paidAmount || 0), 0);
    const totalOutstanding = customerOrders.reduce((sum, order) => sum + (order.outstandingAmount || 0), 0);
    const totalValue = customerOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
    
    return {
      totalPaid,
      totalOutstanding,
      totalValue,
      paymentPercentage: totalValue > 0 ? Math.round((totalPaid / totalValue) * 100) : 0
    };
  };

  // Get customer order status statistics
  const getCustomerOrderStatusStats = (customerId: string) => {
    const customerOrders = getCustomerOrders(customerId);
    const statusCounts = {
      pending: 0,
      accepted: 0,
      dispatched: 0,
      delivered: 0,
      cancelled: 0
    };
    
    customerOrders.forEach(order => {
      if (statusCounts.hasOwnProperty(order.status)) {
        statusCounts[order.status as keyof typeof statusCounts]++;
      }
    });
    
    const totalOrders = customerOrders.length;
    const completedOrders = statusCounts.delivered;
    const inProgressOrders = statusCounts.accepted + statusCounts.dispatched;
    const completionRate = totalOrders > 0 ? Math.round((completedOrders / totalOrders) * 100) : 0;
    
    return {
      ...statusCounts,
      totalOrders,
      completedOrders,
      inProgressOrders,
      completionRate
    };
  };

  const filteredCustomers = customers.filter(customer => {
    if (!customer) return false;
    
    const matchesSearch = (customer.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (customer.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (customer.phone || '').includes(searchTerm);
    const matchesType = typeFilter === "all" || customer.customer_type === typeFilter;
    const matchesStatus = statusFilter === "all" || customer.status === statusFilter;
    
    return matchesSearch && matchesType && matchesStatus;
  });

  const handleAddCustomer = async () => {
    // Basic validation
    if (!newCustomerForm.name.trim() || !newCustomerForm.email.trim() || !newCustomerForm.phone.trim()) {
      toast({
        title: "Error",
        description: "Please fill in required fields: Name, Email, and Phone",
        variant: "destructive",
      });
      return;
    }

    try {
      // Create new customer using CustomerService
      const customerData: CreateCustomerData = {
        name: newCustomerForm.name.trim(),
        email: newCustomerForm.email.trim(),
        phone: newCustomerForm.phone.trim(),
        address: newCustomerForm.address.trim() || undefined,
        city: newCustomerForm.city.trim() || undefined,
        state: newCustomerForm.state.trim() || undefined,
        pincode: newCustomerForm.pincode.trim() || undefined,
        customer_type: newCustomerForm.customer_type,
        gst_number: newCustomerForm.gst_number.trim() || undefined,
        company_name: newCustomerForm.company_name.trim() || undefined,
        credit_limit: newCustomerForm.credit_limit || "0.00",
        notes: newCustomerForm.notes?.trim() || undefined,
        // Address fields as JSON strings
        permanent_address: newCustomerForm.permanentAddress ? JSON.stringify(newCustomerForm.permanentAddress) : undefined,
        delivery_address: newCustomerForm.sameAsPermanent 
          ? (newCustomerForm.permanentAddress ? JSON.stringify(newCustomerForm.permanentAddress) : undefined)
          : (newCustomerForm.deliveryAddress ? JSON.stringify(newCustomerForm.deliveryAddress) : undefined)
      };

      const { data: newCustomer, error } = await CustomerService.createCustomer(customerData);
      
      if (error) {
        console.error('Error creating customer:', error);
        toast({
          title: "Error",
          description: error,
          variant: "destructive",
        });
        return;
      }

      if (newCustomer) {
        // Add to customers array
        setCustomers(prev => [newCustomer, ...prev]);
        
        // Reset form and close dialog
        resetForm();
        setShowAddCustomerDialog(false);
        
        toast({
          title: "Success",
          description: "Customer created successfully!",
        });
        
        console.log('Customer added successfully:', newCustomer);
      }
    } catch (error) {
      console.error('Error creating customer:', error);
      toast({
        title: "Error",
        description: "Failed to create customer. Please try again.",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setNewCustomerForm({
      name: "",
      email: "",
      phone: "",
      address: "",
      city: "",
      state: "",
      pincode: "",
      customer_type: "individual",
      gst_number: "",
      company_name: "",
      credit_limit: "0.00",
      notes: "",
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
  };

  const resetSupplierForm = () => {
    setNewSupplierForm({
      name: "",
      contact_person: "",
      email: "",
      phone: "",
      address: "",
      city: "",
      state: "",
      pincode: "",
      gst_number: ""
    });
  };

  // Supplier management functions
  const handleAddSupplier = async () => {
    // Basic validation
    if (!newSupplierForm.name.trim()) {
      toast({
        title: "Error",
        description: "Supplier name is required",
        variant: "destructive",
      });
      return;
    }

    try {
      // Create new supplier using SupplierService
      const supplierData: CreateSupplierData = {
        name: newSupplierForm.name.trim(),
        contact_person: newSupplierForm.contact_person.trim() || undefined,
        email: newSupplierForm.email.trim() || undefined,
        phone: newSupplierForm.phone.trim() || undefined,
        address: newSupplierForm.address.trim() || undefined,
        city: newSupplierForm.city.trim() || undefined,
        state: newSupplierForm.state.trim() || undefined,
        pincode: newSupplierForm.pincode.trim() || undefined,
        gst_number: newSupplierForm.gst_number.trim() || undefined
      };

      const { data: newSupplier, error } = await SupplierService.createSupplier(supplierData);

      if (error) {
        console.error('Error creating supplier:', error);
        toast({
          title: "Error",
          description: error,
          variant: "destructive",
        });
        return;
      }

      if (newSupplier) {
        setSuppliers(prev => [newSupplier, ...prev]);
        resetSupplierForm();
        setShowAddSupplierDialog(false);
        
        toast({
          title: "Success",
          description: "Supplier created successfully!",
        });
        
        console.log('Supplier added successfully:', newSupplier);
      }
    } catch (error) {
      console.error('Error creating supplier:', error);
      toast({
        title: "Error",
        description: "Failed to create supplier. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleEditSupplier = (supplier: Supplier) => {
    setEditingSupplier({ ...supplier });
    setShowEditSupplierDialog(true);
  };

  const handleSaveSupplier = async () => {
    if (!editingSupplier) return;
    
    try {
      const { data, error } = await SupplierService.updateSupplier(editingSupplier.id, {
        name: editingSupplier.name.trim(),
        contact_person: editingSupplier.contact_person?.trim() || undefined,
        email: editingSupplier.email?.trim() || undefined,
        phone: editingSupplier.phone?.trim() || undefined,
        address: editingSupplier.address?.trim() || undefined,
        city: editingSupplier.city?.trim() || undefined,
        state: editingSupplier.state?.trim() || undefined,
        pincode: editingSupplier.pincode?.trim() || undefined,
        gst_number: editingSupplier.gst_number?.trim() || undefined,
        status: editingSupplier.status
      });

      if (error) {
        console.error('Error updating supplier:', error);
        toast({
          title: "Error",
          description: "Failed to update supplier",
          variant: "destructive",
        });
        return;
      }

      if (data) {
        const updatedSuppliers = suppliers.map(supplier => 
          supplier.id === editingSupplier.id ? data : supplier
        );
        setSuppliers(updatedSuppliers);
        setShowEditSupplierDialog(false);
        setEditingSupplier(null);
        
        toast({
          title: "Success",
          description: "Supplier updated successfully!",
        });
        
        console.log('Supplier updated successfully:', data);
      }
    } catch (error) {
      console.error('Error updating supplier:', error);
      toast({
        title: "Error",
        description: "Failed to update supplier. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleViewSupplier = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setShowSupplierDetails(true);
  };

  const totalCustomers = customers.length;
  const activeCustomers = customers.filter(c => c.status === "active").length;
  const businessCustomers = customers.filter(c => c.customer_type === "business").length;
  const totalRevenue = customers.reduce((sum, c) => sum + parseFloat(c.total_value), 0);

  const totalSuppliers = suppliers.length;
  const activeSuppliers = suppliers.filter(s => s.status === "active").length;

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <Header 
        title="Customer & Supplier Management" 
        subtitle="Manage customer and supplier information and relationships"
      />
        <Button 
          onClick={() => {
            loadCustomers();
            loadSuppliers();
            loadOrders();
          }}
          variant="outline" 
          size="sm"
          className="gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh Data
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => {
        // Prevent switching to tab if user doesn't have permission
        if (value === 'customers' && !hasCustomerAccess) {
          toast({
            title: "Access Denied",
            description: "You don't have permission to access the Customers section. You can only access Suppliers.",
            variant: "destructive"
          });
          return;
        }
        if (value === 'suppliers' && !hasSupplierAccess) {
          toast({
            title: "Access Denied",
            description: "You don't have permission to access the Suppliers section. You can only access Customers.",
            variant: "destructive"
          });
          return;
        }
        setActiveTab(value);
      }} className="w-full">
        <TabsList className={`grid w-full ${(hasCustomerAccess ? 1 : 0) + (hasSupplierAccess ? 1 : 0) === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
          {hasCustomerAccess && (
            <TabsTrigger 
              value="customers" 
              className="flex items-center gap-2"
              disabled={!hasCustomerAccess}
            >
              <User className="h-4 w-4" />
              Customers ({totalCustomers})
            </TabsTrigger>
          )}
          {hasSupplierAccess && (
            <TabsTrigger 
              value="suppliers" 
              className="flex items-center gap-2"
              disabled={!hasSupplierAccess}
            >
              <Truck className="h-4 w-4" />
              Suppliers ({totalSuppliers})
            </TabsTrigger>
          )}
        </TabsList>

        {hasCustomerAccess && (
        <TabsContent value="customers" className="space-y-6">

      {/* Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <ShoppingBag className="w-8 h-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{totalCustomers}</p>
                <p className="text-sm text-muted-foreground">Total Customers</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <ShoppingBag className="w-8 h-8 text-success" />
              <div>
                <p className="text-2xl font-bold">{activeCustomers}</p>
                <p className="text-sm text-muted-foreground">Active</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <ShoppingBag className="w-8 h-8 text-production" />
              <div>
                <p className="text-2xl font-bold">{businessCustomers}</p>
                <p className="text-sm text-muted-foreground">Business</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <ShoppingBag className="w-8 h-8 text-warning" />
              <div>
                <p className="text-2xl font-bold">₹{(totalRevenue / 100000).toFixed(1)}L</p>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions Bar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="flex gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input 
              placeholder="Search customers..." 
              className="pl-10 w-64"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Customer type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="individual">Individual</SelectItem>
              <SelectItem value="business">Business</SelectItem>
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline">
            <Filter className="w-4 h-4 mr-2" />
            More Filters
          </Button>
        </div>
        
        {canCreateCustomer && (
          <Button onClick={() => setShowAddCustomerDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Customer
          </Button>
        )}
      </div>

      {/* Customers Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredCustomers.map((customer) => (
          <Card key={customer.id} className="overflow-hidden">
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{customer.name}</CardTitle>
                  {customer.company_name && (
                    <p className="text-sm text-muted-foreground mt-1">{customer.company_name}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Badge className={statusStyles[customer.status]}>
                    {customer.status}
                  </Badge>
                  <Badge variant="outline">
                    {customer.customer_type}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <span className="truncate">{customer.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <span>{customer.phone}</span>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <span className="text-xs">
                    {customer.address}, {customer.city}, {customer.state} - {customer.pincode}
                  </span>
                </div>
              </div>

              {customer.gst_number && (
                <div className="text-sm">
                  <span className="text-muted-foreground">GST: </span>
                  <span className="font-mono text-xs">{customer.gst_number}</span>
                </div>
              )}

              {(() => {
                const orderStats = getCustomerOrderStats(customer.id);
                return (
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Total Orders:</span>
                      <p className="font-medium">{orderStats.totalOrders}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Total Value:</span>
                      <p className="font-medium">₹{orderStats.totalValue.toLocaleString()}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Last Order:</span>
                      <p className="font-medium text-xs">
                        {orderStats.lastOrderDate === 'No orders' 
                          ? 'No orders' 
                          : new Date(orderStats.lastOrderDate).toLocaleDateString()
                        }
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Customer Since:</span>
                      <p className="font-medium text-xs">{customer.registration_date}</p>
                    </div>
                  </div>
                );
              })()}

              {/* Recent Orders */}
              {(() => {
                const orderStats = getCustomerOrderStats(customer.id);
                const recentOrders = orderStats.orders.slice(0, 3); // Show last 3 orders
                
                if (recentOrders.length === 0) {
                  return (
                    <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-muted-foreground text-center">No orders yet</p>
                    </div>
                  );
                }

                return (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">Recent Orders</h4>
                    <div className="space-y-2">
                      {recentOrders.map((order) => (
                        <div key={order.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                          <div>
                            <p className="text-sm font-medium">{order.orderNumber}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(order.orderDate).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium">₹{order.totalAmount.toLocaleString()}</p>
                            <Badge className={`text-xs ${
                              order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                              order.status === 'dispatched' ? 'bg-orange-100 text-orange-800' :
                              order.status === 'accepted' ? 'bg-blue-100 text-blue-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {order.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              <div className="flex gap-2 pt-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1"
                  onClick={() => handleViewCustomer(customer)}
                >
                  <Eye className="w-4 h-4 mr-2" />
                  View Details
                </Button>
                {canEditCustomer && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => handleEditCustomer(customer)}
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>View Orders</DropdownMenuItem>
                    <DropdownMenuItem>Send Email</DropdownMenuItem>
                    <DropdownMenuItem>Export Data</DropdownMenuItem>
                    {customer.status === "active" ? (
                      <DropdownMenuItem className="text-destructive">
                        Deactivate
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem className="text-success">
                        Activate
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredCustomers.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <ShoppingBag className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">No customers found</h3>
            <p className="text-muted-foreground">Try adjusting your search or filter criteria</p>
          </CardContent>
        </Card>
      )}

      {/* Add Customer Dialog */}
      <Dialog open={showAddCustomerDialog} onOpenChange={setShowAddCustomerDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Customer</DialogTitle>
            <DialogDescription>
              Enter the customer details to add them to your customer database.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Customer Type Selection */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Customer Type *</Label>
              <Select 
                value={newCustomerForm.customer_type} 
                onValueChange={(value: "individual" | "business") => 
                  setNewCustomerForm({...newCustomerForm, customer_type: value})
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
                    value={newCustomerForm.name}
                    onChange={(e) => setNewCustomerForm({...newCustomerForm, name: e.target.value})}
                    placeholder="Enter customer full name"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newCustomerForm.email}
                    onChange={(e) => setNewCustomerForm({...newCustomerForm, email: e.target.value})}
                    placeholder="Enter email address (e.g., customer@gmail.com)"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input
                    id="phone"
                    value={newCustomerForm.phone}
                    onChange={(e) => setNewCustomerForm({...newCustomerForm, phone: e.target.value})}
                    placeholder="+91 9876543210"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="gstNumber">GST Number</Label>
                  <Input
                    id="gstNumber"
                    value={newCustomerForm.gst_number}
                    onChange={(e) => handleGSTNumberChange(e.target.value)}
                    placeholder="Enter GST number"
                    maxLength={15}
                  />
                </div>
              </div>

              {newCustomerForm.customer_type === "business" && (
                <div className="space-y-2">
                  <Label htmlFor="companyName">Company Name</Label>
                  <Input
                    id="companyName"
                    value={newCustomerForm.company_name}
                    onChange={(e) => setNewCustomerForm({...newCustomerForm, company_name: e.target.value})}
                    placeholder="Enter company name"
                  />
                </div>
              )}
            </div>

            {/* Permanent Address Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Permanent Address
              </h3>
              
              <div className="space-y-2">
                <Label htmlFor="permanentAddress">Address</Label>
                <Textarea
                  id="permanentAddress"
                  value={newCustomerForm.permanentAddress.address}
                  onChange={(e) => setNewCustomerForm({
                    ...newCustomerForm, 
                    permanentAddress: {...newCustomerForm.permanentAddress, address: e.target.value}
                  })}
                  placeholder="Enter permanent address"
                  rows={2}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="permanentCity">City</Label>
                  <Input
                    id="permanentCity"
                    value={newCustomerForm.permanentAddress.city}
                    onChange={(e) => setNewCustomerForm({
                      ...newCustomerForm, 
                      permanentAddress: {...newCustomerForm.permanentAddress, city: e.target.value}
                    })}
                    placeholder="Enter city"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="permanentState">State</Label>
                  <Input
                    id="permanentState"
                    value={newCustomerForm.permanentAddress.state}
                    onChange={(e) => setNewCustomerForm({
                      ...newCustomerForm, 
                      permanentAddress: {...newCustomerForm.permanentAddress, state: e.target.value}
                    })}
                    placeholder="Enter state"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="permanentPincode">Pincode</Label>
                  <Input
                    id="permanentPincode"
                    value={newCustomerForm.permanentAddress.pincode}
                    onChange={(e) => setNewCustomerForm({
                      ...newCustomerForm, 
                      permanentAddress: {...newCustomerForm.permanentAddress, pincode: e.target.value}
                    })}
                    placeholder="Enter pincode"
                  />
                </div>
              </div>
            </div>

            {/* Delivery Address Information */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  Delivery Address
                </h3>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="sameAsPermanent"
                    checked={newCustomerForm.sameAsPermanent}
                    onChange={(e) => {
                      const sameAsPermanent = e.target.checked;
                      setNewCustomerForm({
                        ...newCustomerForm,
                        sameAsPermanent,
                        deliveryAddress: sameAsPermanent ? newCustomerForm.permanentAddress : newCustomerForm.deliveryAddress
                      });
                    }}
                    className="rounded border-gray-300"
                  />
                  <Label htmlFor="sameAsPermanent" className="text-sm">
                    Same as permanent address
                  </Label>
                </div>
              </div>
              
              {!newCustomerForm.sameAsPermanent && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="deliveryAddress">Address</Label>
                    <Textarea
                      id="deliveryAddress"
                      value={newCustomerForm.deliveryAddress.address}
                      onChange={(e) => setNewCustomerForm({
                        ...newCustomerForm, 
                        deliveryAddress: {...newCustomerForm.deliveryAddress, address: e.target.value}
                      })}
                      placeholder="Enter delivery address"
                      rows={2}
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="deliveryCity">City</Label>
                      <Input
                        id="deliveryCity"
                        value={newCustomerForm.deliveryAddress.city}
                        onChange={(e) => setNewCustomerForm({
                          ...newCustomerForm, 
                          deliveryAddress: {...newCustomerForm.deliveryAddress, city: e.target.value}
                        })}
                        placeholder="Enter city"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="deliveryState">State</Label>
                      <Input
                        id="deliveryState"
                        value={newCustomerForm.deliveryAddress.state}
                        onChange={(e) => setNewCustomerForm({
                          ...newCustomerForm, 
                          deliveryAddress: {...newCustomerForm.deliveryAddress, state: e.target.value}
                        })}
                        placeholder="Enter state"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="deliveryPincode">Pincode</Label>
                      <Input
                        id="deliveryPincode"
                        value={newCustomerForm.deliveryAddress.pincode}
                        onChange={(e) => setNewCustomerForm({
                          ...newCustomerForm, 
                          deliveryAddress: {...newCustomerForm.deliveryAddress, pincode: e.target.value}
                        })}
                        placeholder="Enter pincode"
                      />
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Legacy Address Fields (Hidden but kept for backward compatibility) */}
            <div className="hidden">
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  value={newCustomerForm.address}
                  onChange={(e) => setNewCustomerForm({...newCustomerForm, address: e.target.value})}
                  placeholder="Enter full address"
                  rows={2}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={newCustomerForm.city}
                    onChange={(e) => setNewCustomerForm({...newCustomerForm, city: e.target.value})}
                    placeholder="Enter city"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    value={newCustomerForm.state}
                    onChange={(e) => setNewCustomerForm({...newCustomerForm, state: e.target.value})}
                    placeholder="Enter state"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="pincode">Pincode</Label>
                  <Input
                    id="pincode"
                    value={newCustomerForm.pincode}
                    onChange={(e) => setNewCustomerForm({...newCustomerForm, pincode: e.target.value})}
                    placeholder="Enter pincode"
                  />
                </div>
              </div>
            </div>

          </div>
          
          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                resetForm();
                setShowAddCustomerDialog(false);
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleAddCustomer}
              disabled={!newCustomerForm.name.trim() || !newCustomerForm.email.trim() || !newCustomerForm.phone.trim()}
            >
              <Save className="w-4 h-4 mr-2" />
              Add Customer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Customer Details Dialog */}
      <Dialog open={showCustomerDetails} onOpenChange={setShowCustomerDetails}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Customer Details - {selectedCustomer?.name}
            </DialogTitle>
            <DialogDescription>
              Complete customer information and order history
            </DialogDescription>
          </DialogHeader>
          
          {selectedCustomer && (
            <div className="space-y-6 py-4">
              {/* Customer Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <User className="w-5 h-5" />
                      Personal Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <span>{selectedCustomer.email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <span>{selectedCustomer.phone}</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                      <span className="text-sm">
                        {selectedCustomer.address}, {selectedCustomer.city}, {selectedCustomer.state} - {selectedCustomer.pincode}
                      </span>
                    </div>
                    {selectedCustomer.gst_number && (
                      <div className="flex items-center gap-2">
                        <Building className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">GST: {selectedCustomer.gst_number}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">Customer since: {selectedCustomer.registration_date}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <DollarSign className="w-5 h-5" />
                      Financial Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {(() => {
                      const orderStats = getCustomerOrderStats(selectedCustomer.id);
                      const paymentSummary = getCustomerPaymentSummary(selectedCustomer.id);
                      return (
                        <>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Total Orders:</span>
                            <span className="font-medium">{orderStats.totalOrders}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Total Value:</span>
                            <span className="font-medium">₹{paymentSummary.totalValue.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Total Paid:</span>
                            <span className="font-medium text-green-600">₹{paymentSummary.totalPaid.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Outstanding:</span>
                            <span className="font-medium text-red-600">₹{paymentSummary.totalOutstanding.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Payment %:</span>
                            <span className="font-medium">{paymentSummary.paymentPercentage}%</span>
                          </div>
                        </>
                      );
                    })()}
                  </CardContent>
                </Card>
              </div>

              {/* Order Status Statistics */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Package className="w-5 h-5" />
                    Order Status Overview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const statusStats = getCustomerOrderStatusStats(selectedCustomer.id);
                    return (
                      <div className="space-y-4">
                        {/* Summary Stats */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="text-center p-3 bg-blue-50 rounded-lg">
                            <p className="text-2xl font-bold text-blue-600">{statusStats.totalOrders}</p>
                            <p className="text-sm text-muted-foreground">Total Orders</p>
                          </div>
                          <div className="text-center p-3 bg-green-50 rounded-lg">
                            <p className="text-2xl font-bold text-green-600">{statusStats.completedOrders}</p>
                            <p className="text-sm text-muted-foreground">Completed</p>
                          </div>
                          <div className="text-center p-3 bg-orange-50 rounded-lg">
                            <p className="text-2xl font-bold text-orange-600">{statusStats.inProgressOrders}</p>
                            <p className="text-sm text-muted-foreground">In Progress</p>
                          </div>
                          <div className="text-center p-3 bg-purple-50 rounded-lg">
                            <p className="text-2xl font-bold text-purple-600">{statusStats.completionRate}%</p>
                            <p className="text-sm text-muted-foreground">Success Rate</p>
                          </div>
                        </div>

                        {/* Detailed Status Breakdown */}
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                          <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                              <span className="text-sm">Pending</span>
                            </div>
                            <span className="font-medium">{statusStats.pending}</span>
                          </div>
                          <div className="flex items-center justify-between p-2 bg-blue-50 rounded-lg">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                              <span className="text-sm">Accepted</span>
                            </div>
                            <span className="font-medium">{statusStats.accepted}</span>
                          </div>
                          <div className="flex items-center justify-between p-2 bg-orange-50 rounded-lg">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                              <span className="text-sm">Dispatched</span>
                            </div>
                            <span className="font-medium">{statusStats.dispatched}</span>
                          </div>
                          <div className="flex items-center justify-between p-2 bg-green-50 rounded-lg">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                              <span className="text-sm">Delivered</span>
                            </div>
                            <span className="font-medium">{statusStats.delivered}</span>
                          </div>
                          <div className="flex items-center justify-between p-2 bg-red-50 rounded-lg">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                              <span className="text-sm">Cancelled</span>
                            </div>
                            <span className="font-medium">{statusStats.cancelled}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>

              {/* Order History */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Package className="w-5 h-5" />
                    Order History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const orderStats = getCustomerOrderStats(selectedCustomer.id);
                    const customerOrders = orderStats.orders.sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime());
                    
                    if (customerOrders.length === 0) {
                      return (
                        <div className="text-center py-8 text-muted-foreground">
                          <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                          <p>No orders found for this customer</p>
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-4">
                        {customerOrders.map((order) => (
                          <div key={order.id} className="border rounded-lg p-4">
                            <div className="flex items-center justify-between mb-3">
                              <div>
                                <h4 className="font-medium">{order.orderNumber}</h4>
                                <p className="text-sm text-muted-foreground">
                                  {new Date(order.orderDate).toLocaleDateString()}
                                </p>
                                {order.workflowStep && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Workflow: {order.workflowStep}
                                  </p>
                                )}
                              </div>
                              <div className="text-right">
                                <p className="font-medium">₹{order.totalAmount.toLocaleString()}</p>
                                <Badge className={`text-xs ${
                                  order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                                  order.status === 'dispatched' ? 'bg-orange-100 text-orange-800' :
                                  order.status === 'accepted' ? 'bg-blue-100 text-blue-800' :
                                  order.status === 'pending' ? 'bg-gray-100 text-gray-800' :
                                  'bg-red-100 text-red-800'
                                }`}>
                                  {order.status}
                                </Badge>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                              <div>
                                <span className="text-muted-foreground">Items:</span>
                                <p className="font-medium">{order.items.length} {order.items.some(item => item.productType === 'raw_material') ? 'items' : 'products'}</p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Paid:</span>
                                <p className="font-medium text-green-600">₹{(order.paidAmount || 0).toLocaleString()}</p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Outstanding:</span>
                                <p className="font-medium text-red-600">₹{(order.outstandingAmount || 0).toLocaleString()}</p>
                              </div>
                            </div>

                            {/* Order Items Details */}
                            <div className="mt-3 pt-3 border-t">
                              <h5 className="text-sm font-medium mb-2">Order Items:</h5>
                              <div className="space-y-2">
                                {order.items.map((item, index) => (
                                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                                    <div className="flex-1">
                                      <div className="font-medium">{item.productName}</div>
                                      <div className="text-xs text-gray-600">
                                        {item.productType === 'raw_material' ? 'Raw Material' : 'Finished Product'} • 
                                        Qty: {item.quantity} • 
                                        ₹{item.unitPrice}/unit
                                      </div>
                                      {item.selectedProducts && item.selectedProducts.length > 0 && (
                                        <div className="text-xs text-blue-600 mt-1">
                                          Individual IDs: {item.selectedProducts.map(p => p.qrCode || p.id).join(', ')}
                                        </div>
                                      )}
                                    </div>
                                    <div className="text-sm font-medium">
                                      ₹{(item.totalPrice || 0).toLocaleString()}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Order Timeline */}
                            {(order.acceptedAt || order.dispatchedAt || order.deliveredAt) && (
                              <div className="mt-3 pt-3 border-t">
                                <h5 className="text-sm font-medium mb-2">Order Timeline:</h5>
                                <div className="space-y-1 text-xs">
                                  {order.acceptedAt && (
                                    <div className="flex justify-between">
                                      <span className="text-blue-600">✓ Accepted</span>
                                      <span className="text-muted-foreground">
                                        {new Date(order.acceptedAt).toLocaleDateString()}
                                      </span>
                                    </div>
                                  )}
                                  {order.dispatchedAt && (
                                    <div className="flex justify-between">
                                      <span className="text-orange-600">✓ Dispatched</span>
                                      <span className="text-muted-foreground">
                                        {new Date(order.dispatchedAt).toLocaleDateString()}
                                      </span>
                                    </div>
                                  )}
                                  {order.deliveredAt && (
                                    <div className="flex justify-between">
                                      <span className="text-green-600">✓ Delivered</span>
                                      <span className="text-muted-foreground">
                                        {new Date(order.deliveredAt).toLocaleDateString()}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Order Items */}
                            <div className="mt-3 pt-3 border-t">
                              <h5 className="text-sm font-medium mb-2">Order Items:</h5>
                              <div className="space-y-1">
                                {order.items.map((item, index) => (
                                  <div key={index} className="flex justify-between text-sm">
                                    <span>{item.productName} x {item.quantity}</span>
                                    <span>₹{(item.totalPrice || 0).toLocaleString()}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>
            </div>
          )}
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowCustomerDetails(false)}
            >
              Close
            </Button>
            <Button 
              onClick={() => {
                setShowCustomerDetails(false);
                handleEditCustomer(selectedCustomer!);
              }}
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit Customer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Customer Dialog */}
      <Dialog open={showEditCustomerDialog} onOpenChange={setShowEditCustomerDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Customer - {editingCustomer?.name}</DialogTitle>
            <DialogDescription>
              Update customer information and details
            </DialogDescription>
          </DialogHeader>
          
          {editingCustomer && (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Name *</Label>
                  <Input
                    id="edit-name"
                    value={editingCustomer.name}
                    onChange={(e) => setEditingCustomer({...editingCustomer, name: e.target.value})}
                    placeholder="Enter customer name"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="edit-email">Email *</Label>
                  <Input
                    id="edit-email"
                    type="email"
                    value={editingCustomer.email}
                    onChange={(e) => setEditingCustomer({...editingCustomer, email: e.target.value})}
                    placeholder="Enter email address"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="edit-phone">Phone *</Label>
                  <Input
                    id="edit-phone"
                    value={editingCustomer.phone}
                    onChange={(e) => setEditingCustomer({...editingCustomer, phone: e.target.value})}
                    placeholder="Enter phone number"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="edit-customer-type">Customer Type *</Label>
                  <Select 
                    value={editingCustomer.customer_type} 
                    onValueChange={(value: "individual" | "business") => 
                      setEditingCustomer({...editingCustomer, customer_type: value})
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
                
                <div className="space-y-2">
                  <Label htmlFor="edit-status">Status</Label>
                  <Select 
                    value={editingCustomer.status} 
                    onValueChange={(value: "active" | "inactive") => 
                      setEditingCustomer({...editingCustomer, status: value})
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="edit-registration-date">Registration Date</Label>
                  <Input
                    id="edit-registration-date"
                    type="date"
                    value={editingCustomer.registration_date}
                    onChange={(e) => setEditingCustomer({...editingCustomer, registration_date: e.target.value})}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-address">Address</Label>
                <Textarea
                  id="edit-address"
                  value={editingCustomer.address}
                  onChange={(e) => setEditingCustomer({...editingCustomer, address: e.target.value})}
                  placeholder="Enter full address"
                  rows={2}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-city">City</Label>
                  <Input
                    id="edit-city"
                    value={editingCustomer.city}
                    onChange={(e) => setEditingCustomer({...editingCustomer, city: e.target.value})}
                    placeholder="Enter city"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="edit-state">State</Label>
                  <Input
                    id="edit-state"
                    value={editingCustomer.state}
                    onChange={(e) => setEditingCustomer({...editingCustomer, state: e.target.value})}
                    placeholder="Enter state"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="edit-pincode">Pincode</Label>
                  <Input
                    id="edit-pincode"
                    value={editingCustomer.pincode}
                    onChange={(e) => setEditingCustomer({...editingCustomer, pincode: e.target.value})}
                    placeholder="Enter pincode"
                  />
                </div>
              </div>

              {/* Permanent Address */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-blue-600" />
                  <h3 className="text-lg font-semibold">Permanent Address</h3>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="edit-permanent-address">Permanent Address</Label>
                  <Textarea
                    id="edit-permanent-address"
                    value={editingCustomer.permanent_address ? JSON.parse(editingCustomer.permanent_address).address || "" : ""}
                    onChange={(e) => setEditingCustomer({
                      ...editingCustomer, 
                      permanent_address: JSON.stringify({
                        address: e.target.value,
                        city: editingCustomer.permanent_address ? JSON.parse(editingCustomer.permanent_address).city || "" : "",
                        state: editingCustomer.permanent_address ? JSON.parse(editingCustomer.permanent_address).state || "" : "",
                        pincode: editingCustomer.permanent_address ? JSON.parse(editingCustomer.permanent_address).pincode || "" : ""
                      })
                    })}
                    placeholder="Enter permanent address"
                    rows={2}
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-permanent-city">City</Label>
                    <Input
                      id="edit-permanent-city"
                      value={editingCustomer.permanent_address ? JSON.parse(editingCustomer.permanent_address).city || "" : ""}
                      onChange={(e) => setEditingCustomer({
                        ...editingCustomer, 
                        permanent_address: JSON.stringify({
                          address: editingCustomer.permanent_address ? JSON.parse(editingCustomer.permanent_address).address || "" : "",
                          city: e.target.value,
                          state: editingCustomer.permanent_address ? JSON.parse(editingCustomer.permanent_address).state || "" : "",
                          pincode: editingCustomer.permanent_address ? JSON.parse(editingCustomer.permanent_address).pincode || "" : ""
                        })
                      })}
                      placeholder="Enter city"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="edit-permanent-state">State</Label>
                    <Input
                      id="edit-permanent-state"
                      value={editingCustomer.permanent_address ? JSON.parse(editingCustomer.permanent_address).state || "" : ""}
                      onChange={(e) => setEditingCustomer({
                        ...editingCustomer, 
                        permanent_address: JSON.stringify({
                          address: editingCustomer.permanent_address ? JSON.parse(editingCustomer.permanent_address).address || "" : "",
                          city: editingCustomer.permanent_address ? JSON.parse(editingCustomer.permanent_address).city || "" : "",
                          state: e.target.value,
                          pincode: editingCustomer.permanent_address ? JSON.parse(editingCustomer.permanent_address).pincode || "" : ""
                        })
                      })}
                      placeholder="Enter state"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="edit-permanent-pincode">Pincode</Label>
                    <Input
                      id="edit-permanent-pincode"
                      value={editingCustomer.permanent_address ? JSON.parse(editingCustomer.permanent_address).pincode || "" : ""}
                      onChange={(e) => setEditingCustomer({
                        ...editingCustomer, 
                        permanent_address: JSON.stringify({
                          address: editingCustomer.permanent_address ? JSON.parse(editingCustomer.permanent_address).address || "" : "",
                          city: editingCustomer.permanent_address ? JSON.parse(editingCustomer.permanent_address).city || "" : "",
                          state: editingCustomer.permanent_address ? JSON.parse(editingCustomer.permanent_address).state || "" : "",
                          pincode: e.target.value
                        })
                      })}
                      placeholder="Enter pincode"
                    />
                  </div>
                </div>
              </div>

              {/* Delivery Address */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Truck className="w-5 h-5 text-green-600" />
                  <h3 className="text-lg font-semibold">Delivery Address</h3>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="edit-delivery-address">Delivery Address</Label>
                  <Textarea
                    id="edit-delivery-address"
                    value={editingCustomer.delivery_address ? JSON.parse(editingCustomer.delivery_address).address || "" : ""}
                    onChange={(e) => setEditingCustomer({
                      ...editingCustomer, 
                      delivery_address: JSON.stringify({
                        address: e.target.value,
                        city: editingCustomer.delivery_address ? JSON.parse(editingCustomer.delivery_address).city || "" : "",
                        state: editingCustomer.delivery_address ? JSON.parse(editingCustomer.delivery_address).state || "" : "",
                        pincode: editingCustomer.delivery_address ? JSON.parse(editingCustomer.delivery_address).pincode || "" : ""
                      })
                    })}
                    placeholder="Enter delivery address"
                    rows={2}
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-delivery-city">City</Label>
                    <Input
                      id="edit-delivery-city"
                      value={editingCustomer.delivery_address ? JSON.parse(editingCustomer.delivery_address).city || "" : ""}
                      onChange={(e) => setEditingCustomer({
                        ...editingCustomer, 
                        delivery_address: JSON.stringify({
                          address: editingCustomer.delivery_address ? JSON.parse(editingCustomer.delivery_address).address || "" : "",
                          city: e.target.value,
                          state: editingCustomer.delivery_address ? JSON.parse(editingCustomer.delivery_address).state || "" : "",
                          pincode: editingCustomer.delivery_address ? JSON.parse(editingCustomer.delivery_address).pincode || "" : ""
                        })
                      })}
                      placeholder="Enter city"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="edit-delivery-state">State</Label>
                    <Input
                      id="edit-delivery-state"
                      value={editingCustomer.delivery_address ? JSON.parse(editingCustomer.delivery_address).state || "" : ""}
                      onChange={(e) => setEditingCustomer({
                        ...editingCustomer, 
                        delivery_address: JSON.stringify({
                          address: editingCustomer.delivery_address ? JSON.parse(editingCustomer.delivery_address).address || "" : "",
                          city: editingCustomer.delivery_address ? JSON.parse(editingCustomer.delivery_address).city || "" : "",
                          state: e.target.value,
                          pincode: editingCustomer.delivery_address ? JSON.parse(editingCustomer.delivery_address).pincode || "" : ""
                        })
                      })}
                      placeholder="Enter state"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="edit-delivery-pincode">Pincode</Label>
                    <Input
                      id="edit-delivery-pincode"
                      value={editingCustomer.delivery_address ? JSON.parse(editingCustomer.delivery_address).pincode || "" : ""}
                      onChange={(e) => setEditingCustomer({
                        ...editingCustomer, 
                        delivery_address: JSON.stringify({
                          address: editingCustomer.delivery_address ? JSON.parse(editingCustomer.delivery_address).address || "" : "",
                          city: editingCustomer.delivery_address ? JSON.parse(editingCustomer.delivery_address).city || "" : "",
                          state: editingCustomer.delivery_address ? JSON.parse(editingCustomer.delivery_address).state || "" : "",
                          pincode: e.target.value
                        })
                      })}
                      placeholder="Enter pincode"
                    />
                  </div>
                </div>
              </div>

              {/* Business Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-company">Company Name</Label>
                  <Input
                    id="edit-company"
                    value={editingCustomer.company_name || ""}
                    onChange={(e) => setEditingCustomer({...editingCustomer, company_name: e.target.value})}
                    placeholder="Enter company name (optional)"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="edit-gst">GST Number</Label>
                  <Input
                    id="edit-gst"
                    value={editingCustomer.gst_number || ""}
                    onChange={(e) => setEditingCustomer({...editingCustomer, gst_number: e.target.value})}
                    placeholder="Enter GST number (optional)"
                  />
                </div>
              </div>

              {/* Order Statistics (Read-only for reference) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-total-orders">Total Orders</Label>
                  <Input
                    id="edit-total-orders"
                    value={editingCustomer.total_orders}
                    readOnly
                    className="bg-gray-50"
                    placeholder="Auto-calculated"
                  />
                  <p className="text-xs text-muted-foreground">This is automatically calculated from order history</p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="edit-total-value">Total Value</Label>
                  <Input
                    id="edit-total-value"
                    value={editingCustomer.total_value}
                    readOnly
                    className="bg-gray-50"
                    placeholder="Auto-calculated"
                  />
                  <p className="text-xs text-muted-foreground">This is automatically calculated from order history</p>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowEditCustomerDialog(false);
                setEditingCustomer(null);
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSaveCustomer}
              disabled={!editingCustomer?.name.trim() || !editingCustomer?.email.trim() || !editingCustomer?.phone.trim()}
            >
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
        </TabsContent>
        )}

        {hasSupplierAccess && (
        <TabsContent value="suppliers" className="space-y-6">
          {/* Supplier Statistics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <Truck className="w-8 h-8 text-primary" />
                  <div>
                    <p className="text-2xl font-bold">{totalSuppliers}</p>
                    <p className="text-sm text-muted-foreground">Total Suppliers</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <Truck className="w-8 h-8 text-success" />
                  <div>
                    <p className="text-2xl font-bold">{activeSuppliers}</p>
                    <p className="text-sm text-muted-foreground">Active</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Supplier Actions Bar */}
          <div className="flex flex-col sm:flex-row gap-4 justify-between">
            <div className="flex gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input 
                  placeholder="Search suppliers..." 
                  className="pl-10 w-64"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {canCreateSupplier && (
              <Button onClick={() => setShowAddSupplierDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Supplier
              </Button>
            )}
          </div>

          {/* Suppliers Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {suppliers
              .filter(supplier => {
                const matchesSearch = (supplier.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                                   (supplier.contact_person || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                                   (supplier.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                                   (supplier.phone || '').includes(searchTerm);
                const matchesStatus = statusFilter === "all" || supplier.status === statusFilter;
                return matchesSearch && matchesStatus;
              })
              .map((supplier) => (
              <Card key={supplier.id} className="overflow-hidden">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{supplier.name}</CardTitle>
                      {supplier.contact_person && (
                        <p className="text-sm text-muted-foreground mt-1">Contact: {supplier.contact_person}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Badge className={statusStyles[supplier.status]}>
                        {supplier.status}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <div className="space-y-2 text-sm">
                    {supplier.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                        <span className="truncate">{supplier.email}</span>
                      </div>
                    )}
                    {supplier.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        <span>{supplier.phone}</span>
                      </div>
                    )}
                    {supplier.address && (
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                        <span className="text-xs">
                          {supplier.address}, {supplier.city}, {supplier.state} - {supplier.pincode}
                        </span>
                      </div>
                    )}
                  </div>

                  {supplier.gst_number && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">GST: </span>
                      <span className="font-mono text-xs">{supplier.gst_number}</span>
                    </div>
                  )}

                  <div className="text-sm text-muted-foreground">
                    Added: {new Date(supplier.created_at).toLocaleDateString()}
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => handleViewSupplier(supplier)}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      View Details
                    </Button>
                    {canEditSupplier && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1"
                        onClick={() => handleEditSupplier(supplier)}
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {suppliers.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center">
                <Truck className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">No suppliers found</h3>
                <p className="text-muted-foreground">Add your first supplier to get started</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        )}
      </Tabs>

      {/* Add Supplier Dialog */}
      <Dialog open={showAddSupplierDialog} onOpenChange={setShowAddSupplierDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Supplier</DialogTitle>
            <DialogDescription>
              Enter the supplier details to add them to your supplier database.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Basic Information */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="supplier-name">Supplier Name *</Label>
                  <Input
                    id="supplier-name"
                    value={newSupplierForm.name}
                    onChange={(e) => setNewSupplierForm({...newSupplierForm, name: e.target.value})}
                    placeholder="Enter supplier company name"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="contact-person">Contact Person</Label>
                  <Input
                    id="contact-person"
                    value={newSupplierForm.contact_person}
                    onChange={(e) => setNewSupplierForm({...newSupplierForm, contact_person: e.target.value})}
                    placeholder="Enter contact person name"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="supplier-email">Email Address</Label>
                  <Input
                    id="supplier-email"
                    type="email"
                    value={newSupplierForm.email}
                    onChange={(e) => setNewSupplierForm({...newSupplierForm, email: e.target.value})}
                    placeholder="Enter email address"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="supplier-phone">Phone Number</Label>
                  <Input
                    id="supplier-phone"
                    value={newSupplierForm.phone}
                    onChange={(e) => setNewSupplierForm({...newSupplierForm, phone: e.target.value})}
                    placeholder="+91 9876543210"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="supplier-gst">GST Number</Label>
                <Input
                  id="supplier-gst"
                  value={newSupplierForm.gst_number}
                  onChange={(e) => setNewSupplierForm({...newSupplierForm, gst_number: e.target.value})}
                  placeholder="Enter GST number"
                  maxLength={15}
                />
              </div>
            </div>

            {/* Address Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Address Information
              </h3>
              
              <div className="space-y-2">
                <Label htmlFor="supplier-address">Address</Label>
                <Textarea
                  id="supplier-address"
                  value={newSupplierForm.address}
                  onChange={(e) => setNewSupplierForm({...newSupplierForm, address: e.target.value})}
                  placeholder="Enter full address"
                  rows={2}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="supplier-city">City</Label>
                  <Input
                    id="supplier-city"
                    value={newSupplierForm.city}
                    onChange={(e) => setNewSupplierForm({...newSupplierForm, city: e.target.value})}
                    placeholder="Enter city"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="supplier-state">State</Label>
                  <Input
                    id="supplier-state"
                    value={newSupplierForm.state}
                    onChange={(e) => setNewSupplierForm({...newSupplierForm, state: e.target.value})}
                    placeholder="Enter state"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="supplier-pincode">Pincode</Label>
                  <Input
                    id="supplier-pincode"
                    value={newSupplierForm.pincode}
                    onChange={(e) => setNewSupplierForm({...newSupplierForm, pincode: e.target.value})}
                    placeholder="Enter pincode"
                  />
                </div>
              </div>
            </div>
          </div>
          
          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                resetSupplierForm();
                setShowAddSupplierDialog(false);
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleAddSupplier}
              disabled={!newSupplierForm.name.trim()}
            >
              <Save className="w-4 h-4 mr-2" />
              Add Supplier
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Supplier Details Dialog */}
      <Dialog open={showSupplierDetails} onOpenChange={setShowSupplierDetails}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Truck className="w-5 h-5" />
              Supplier Details - {selectedSupplier?.name}
            </DialogTitle>
            <DialogDescription>
              Complete supplier information
            </DialogDescription>
          </DialogHeader>
          
          {selectedSupplier && (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Truck className="w-5 h-5" />
                      Company Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Building className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">{selectedSupplier.name}</span>
                    </div>
                    {selectedSupplier.contact_person && (
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <span>{selectedSupplier.contact_person}</span>
                      </div>
                    )}
                    {selectedSupplier.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                        <span>{selectedSupplier.email}</span>
                      </div>
                    )}
                    {selectedSupplier.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        <span>{selectedSupplier.phone}</span>
                      </div>
                    )}
                    {selectedSupplier.gst_number && (
                      <div className="flex items-center gap-2">
                        <Building className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">GST: {selectedSupplier.gst_number}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">Added: {new Date(selectedSupplier.created_at).toLocaleDateString()}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <MapPin className="w-5 h-5" />
                      Address Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {selectedSupplier.address ? (
                      <>
                        <div className="flex items-start gap-2">
                          <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                          <span className="text-sm">
                            {selectedSupplier.address}
                          </span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {selectedSupplier.city}, {selectedSupplier.state} - {selectedSupplier.pincode}
                        </div>
                      </>
                    ) : (
                      <div className="text-sm text-muted-foreground">
                        No address information available
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowSupplierDetails(false)}
            >
              Close
            </Button>
            <Button 
              onClick={() => {
                setShowSupplierDetails(false);
                handleEditSupplier(selectedSupplier!);
              }}
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit Supplier
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Supplier Dialog */}
      <Dialog open={showEditSupplierDialog} onOpenChange={setShowEditSupplierDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Supplier - {editingSupplier?.name}</DialogTitle>
            <DialogDescription>
              Update supplier information and details
            </DialogDescription>
          </DialogHeader>
          
          {editingSupplier && (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-supplier-name">Supplier Name *</Label>
                  <Input
                    id="edit-supplier-name"
                    value={editingSupplier.name}
                    onChange={(e) => setEditingSupplier({...editingSupplier, name: e.target.value})}
                    placeholder="Enter supplier name"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="edit-contact-person">Contact Person</Label>
                  <Input
                    id="edit-contact-person"
                    value={editingSupplier.contact_person || ""}
                    onChange={(e) => setEditingSupplier({...editingSupplier, contact_person: e.target.value})}
                    placeholder="Enter contact person name"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="edit-supplier-email">Email</Label>
                  <Input
                    id="edit-supplier-email"
                    type="email"
                    value={editingSupplier.email || ""}
                    onChange={(e) => setEditingSupplier({...editingSupplier, email: e.target.value})}
                    placeholder="Enter email address"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="edit-supplier-phone">Phone</Label>
                  <Input
                    id="edit-supplier-phone"
                    value={editingSupplier.phone || ""}
                    onChange={(e) => setEditingSupplier({...editingSupplier, phone: e.target.value})}
                    placeholder="Enter phone number"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="edit-supplier-status">Status</Label>
                  <Select 
                    value={editingSupplier.status} 
                    onValueChange={(value: "active" | "inactive") => 
                      setEditingSupplier({...editingSupplier, status: value})
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="edit-supplier-gst">GST Number</Label>
                  <Input
                    id="edit-supplier-gst"
                    value={editingSupplier.gst_number || ""}
                    onChange={(e) => setEditingSupplier({...editingSupplier, gst_number: e.target.value})}
                    placeholder="Enter GST number"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-supplier-address">Address</Label>
                <Textarea
                  id="edit-supplier-address"
                  value={editingSupplier.address || ""}
                  onChange={(e) => setEditingSupplier({...editingSupplier, address: e.target.value})}
                  placeholder="Enter full address"
                  rows={2}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-supplier-city">City</Label>
                  <Input
                    id="edit-supplier-city"
                    value={editingSupplier.city || ""}
                    onChange={(e) => setEditingSupplier({...editingSupplier, city: e.target.value})}
                    placeholder="Enter city"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="edit-supplier-state">State</Label>
                  <Input
                    id="edit-supplier-state"
                    value={editingSupplier.state || ""}
                    onChange={(e) => setEditingSupplier({...editingSupplier, state: e.target.value})}
                    placeholder="Enter state"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="edit-supplier-pincode">Pincode</Label>
                  <Input
                    id="edit-supplier-pincode"
                    value={editingSupplier.pincode || ""}
                    onChange={(e) => setEditingSupplier({...editingSupplier, pincode: e.target.value})}
                    placeholder="Enter pincode"
                  />
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowEditSupplierDialog(false);
                setEditingSupplier(null);
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSaveSupplier}
              disabled={!editingSupplier?.name.trim()}
            >
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}