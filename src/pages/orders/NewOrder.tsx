import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, UserPlus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { CustomerService, type Customer } from '@/services/customerService';
import { OrderService } from '@/services/orderService';
import { ProductService } from '@/services/productService';
import { MaterialService } from '@/services/materialService';
import { usePricingCalculator, type ExtendedOrderItem } from '@/hooks/usePricingCalculator';
import { type ProductDimensions } from '@/utils/unitConverter';
import { formatCurrency } from '@/utils/formatHelpers';
import CustomerSelection from '@/components/orders/CustomerSelection';
import CustomerForm from '@/components/orders/CustomerForm';
import OrderItemsList from '@/components/orders/OrderItemsList';
import ProductMaterialSelectionDialog from '@/components/orders/ProductMaterialSelectionDialog';
import OrderDetailsForm from '@/components/orders/OrderDetailsForm';
import DeliveryAddress from '@/components/orders/DeliveryAddress';
import OrderSummary from '@/components/orders/OrderSummary';

// Generate unique ID
function generateUniqueId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export default function NewOrder() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const pricingCalculator = usePricingCalculator();

  // Customer state
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);

  // Submission state to prevent duplicate orders
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Order items state
  const [orderItems, setOrderItems] = useState<ExtendedOrderItem[]>([]);
  const [realProducts, setRealProducts] = useState<any[]>([]);
  const [rawMaterials, setRawMaterials] = useState<any[]>([]);

  // Product/Material selection dialog
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [currentOrderItem, setCurrentOrderItem] = useState<ExtendedOrderItem | null>(null);
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [productCategoryFilter, setProductCategoryFilter] = useState('all');
  const [productColorFilter, setProductColorFilter] = useState('all');

  // Pagination
  const [productPage, setProductPage] = useState(1);
  const [productItemsPerPage] = useState(50);
  const [materialPage, setMaterialPage] = useState(1);
  const [materialItemsPerPage] = useState(50);

  // Order details
  const [orderDetails, setOrderDetails] = useState({
    expectedDelivery: '',
    notes: '',
    remarks: '',
    paidAmount: 0,
  });

  // Delivery address
  const [orderDeliveryAddress, setOrderDeliveryAddress] = useState<{
    address: string;
    city: string;
    state: string;
    pincode: string;
  } | null>(null);
  const [showAddressEditor, setShowAddressEditor] = useState(false);

  // Load data on mount
  useEffect(() => {
    loadCustomers();
    loadProductsWithFilters();
    loadRawMaterialsWithFilters();
  }, []);

  // Reload products when page/filters change
  useEffect(() => {
    loadProductsWithFilters();
  }, [productPage, productSearchTerm, productCategoryFilter, productColorFilter]);

  // Reload materials when page changes (not search - search is handled in dialog)
  useEffect(() => {
    loadRawMaterialsWithFilters();
  }, [materialPage]);

  const loadCustomers = async () => {
    try {
      const { data, error } = await CustomerService.getCustomers();
      if (error) {
        console.error('Error loading customers:', error);
        return;
      }
      setCustomers(data || []);
    } catch (error) {
      console.error('Error loading customers:', error);
    }
  };

  const loadProductsWithFilters = async () => {
    try {
      const filters: any = {
        page: productPage,
        limit: productItemsPerPage,
      };
      if (productSearchTerm) filters.search = productSearchTerm;
      if (productCategoryFilter !== 'all') filters.category = [productCategoryFilter];
      if (productColorFilter !== 'all') filters.color = [productColorFilter];

      const { products: data } = await ProductService.getProducts(filters);
      
      // Debug: Log first product to see what backend returns
      if (data && data.length > 0) {
        console.log('🔍 Sample Product from Backend:', {
          id: data[0].id,
          name: data[0].name,
          width: data[0].width,
          width_unit: data[0].width_unit,
          length: data[0].length,
          length_unit: data[0].length_unit,
          weight: data[0].weight,
          weight_unit: data[0].weight_unit,
          fullProduct: data[0]
        });
      }
      
      // Map products to expected format - preserve ALL fields from backend
      const mappedProducts = (data || []).map((product: any) => ({
        id: product.id || product._id,
        name: product.name,
        price: product.price || 0,
        current_stock: product.current_stock || product.base_quantity || 0,
        stock: product.current_stock || product.base_quantity || 0,
        category: product.category,
        subcategory: product.subcategory || '',
        color: product.color,
        pattern: product.pattern,
        width: product.width,
        length: product.length,
        weight: product.weight,
        // Preserve unit fields exactly as they come from backend (don't use || '' fallback)
        width_unit: product.width_unit,
        length_unit: product.length_unit,
        weight_unit: product.weight_unit,
        gsm: parseFloat(String(product.weight || '0').replace(/[^\d.-]/g, '')) || 0,
        unit: product.unit || 'units',
        count_unit: product.count_unit || 'units',
        individual_stock_tracking: product.individual_stock_tracking !== false,
        individualStockTracking: product.individual_stock_tracking !== false,
        imageUrl: product.image_url || '',
      }));
      setRealProducts(mappedProducts);
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  const loadRawMaterialsWithFilters = async () => {
    try {
      const filters: any = {
        page: materialPage,
        limit: materialItemsPerPage,
      };
      // Don't send search to API - handle search in dialog for more flexibility
      // if (productSearchTerm) filters.search = productSearchTerm;

      const result = await MaterialService.getMaterials(filters);
      // Map materials to expected format
      const mappedMaterials = (result.materials || []).map((material: any) => ({
        id: material.id || material._id,
        name: material.name,
        price: material.cost_per_unit || 0,
        current_stock: material.current_stock || 0,
        stock: material.current_stock || 0,
        available_stock: material.available_stock,
        reserved: material.reserved,
        in_production: material.in_production,
        sold: material.sold,
        used: material.used,
        category: material.category,
        type: material.type,
        color: material.color,
        brand: material.supplier_name || 'Unknown',
        unit: material.unit,
        supplier: material.supplier_name || 'Unknown',
        supplier_name: material.supplier_name || 'Unknown',
        batch_number: material.batch_number,
        quality_grade: material.quality_grade,
        status: material.status || 'in-stock',
        location: 'Warehouse',
      }));
      setRawMaterials(mappedMaterials);
    } catch (error) {
      console.error('Error loading materials:', error);
    }
  };


  const addOrderItem = () => {
    const newItem: ExtendedOrderItem = {
      id: generateUniqueId('ORDITEM'),
      product_id: '',
      product_name: '',
      product_type: 'product',
      quantity: 1,
      unit: '', // Will be auto-filled when product is selected
      unit_price: 0,
      gst_rate: 18, // Default 18% GST
      gst_included: true, // GST included by default
      subtotal: 0,
      gst_amount: 0,
      total_price: 0,
      pricing_unit: 'sqm',
      product_dimensions: {
        productType: 'carpet',
      },
      isEditing: true,
      isValid: false,
    };
    setOrderItems([...orderItems, newItem]);
  };

  const updateOrderItem = (id: string, field: keyof ExtendedOrderItem, value: any) => {
    setOrderItems(items =>
      items.map(item => {
        if (item.id === id) {
          const updated = { ...item, [field]: value };

          // If product_type is changing, clear the selected product
          if (field === 'product_type' && item.product_type !== value) {
            updated.product_id = '';
            updated.product_name = '';
            updated.unit_price = 0;
            updated.unit = '';
            updated.pricing_unit = 'unit';
            updated.product_dimensions = {
              productType: value === 'raw_material' ? 'raw_material' : 'carpet',
            };
            updated.subtotal = 0;
            updated.gst_amount = 0;
            updated.total_price = 0;
            updated.unit_value = 0;
            updated.isValid = false;
            updated.errorMessage = undefined;
            // Clear unit info
            (updated as any).length_unit = undefined;
            (updated as any).width_unit = undefined;
            (updated as any).weight_unit = undefined;
          }

          if (field === 'product_id') {
            const product =
              updated.product_type === 'raw_material'
                ? rawMaterials.find(p => p.id === value)
                : realProducts.find(p => p.id === value);

            if (product) {
              updated.product_name = product.name;
              updated.unit_price = product.price || 0;

              // Auto-fill unit based on product type
              if (updated.product_type === 'raw_material') {
                // For raw materials, use the unit field
                updated.unit = product.unit || 'units';
              } else {
                // For products, use count_unit
                updated.unit = product.count_unit || 'rolls';
              }

              const productDimensions: ProductDimensions = {
                productType: updated.product_type === 'raw_material' ? 'raw_material' : 'carpet',
                width: product.width,
                length: product.length,
                weight: product.weight,
                gsm: product.gsm,
              };

              // Store unit information for calculations
              (updated as any).length_unit = product.length_unit;
              (updated as any).width_unit = product.width_unit;
              (updated as any).weight_unit = product.weight_unit;

              updated.product_dimensions = productDimensions;
              // Default to 'unit' for both products and raw materials
              // The actual unit (count_unit for products, unit for raw materials) is stored in the 'unit' field
              updated.pricing_unit = 'unit';

              const calculation = pricingCalculator.calculateItemPrice(updated);
              updated.subtotal = calculation.subtotal;
              updated.gst_amount = calculation.gstAmount;
              updated.total_price = calculation.totalPrice;
              updated.unit_value = calculation.unitValue;
              updated.isValid = calculation.isValid;
              updated.errorMessage = calculation.errorMessage;
            }
          }

          if (field === 'quantity' || field === 'unit_price' || field === 'pricing_unit' || field === 'product_dimensions' || field === 'gst_rate' || field === 'gst_included') {
            // Two-way binding: gst_rate = 0 means checkbox unchecked, checkbox unchecked means gst_rate = 0
            if (field === 'gst_included' && value === false) {
              updated.gst_rate = 0;
            } else if (field === 'gst_included' && value === true && (updated.gst_rate === 0 || !updated.gst_rate)) {
              updated.gst_rate = 18;
            } else if (field === 'gst_rate') {
              // If GST rate is set to 0, uncheck the checkbox
              if (value === 0) {
                updated.gst_included = false;
              } else if (value > 0 && updated.gst_included === false) {
                // If GST rate is > 0 and checkbox is unchecked, check it
                updated.gst_included = true;
              }
            }
            
            const calculation = pricingCalculator.calculateItemPrice(updated);
            updated.subtotal = calculation.subtotal;
            updated.gst_amount = calculation.gstAmount;
            updated.total_price = calculation.totalPrice;
            updated.unit_value = calculation.unitValue;
            updated.isValid = calculation.isValid;
            updated.errorMessage = calculation.errorMessage;
          }

          return updated;
        }
        return item;
      })
    );
  };

  const removeOrderItem = (id: string) => {
    setOrderItems(items => items.filter(item => item.id !== id));
  };

  const calculateTotal = () => {
    return pricingCalculator.calculateOrderTotal(orderItems);
  };

  const calculateOrderBreakdown = () => {
    const subtotal = orderItems.reduce((sum, item) => sum + (item.subtotal || 0), 0);
    const gstAmount = orderItems.reduce((sum, item) => sum + (item.gst_amount || 0), 0);
    const total = orderItems.reduce((sum, item) => sum + (item.total_price || 0), 0);
    return { subtotal, gstAmount, total };
  };

  const handleSubmit = async () => {
    // Prevent duplicate submissions
    if (isSubmitting) {
      return;
    }

    if (!selectedCustomer && !showNewCustomerForm) {
      toast({
        title: 'Error',
        description: 'Please select a customer or add a new one',
        variant: 'destructive',
      });
      return;
    }

    if (orderItems.length === 0) {
      toast({
        title: 'Error',
        description: 'Please add at least one item to the order',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Calculate total - each item already has GST included in total_price
      const totalAmount = calculateTotal();
      const paidAmount = orderDetails.paidAmount || 0;

      const orderData = {
        customer_id: selectedCustomer?.id,
        customer_name: selectedCustomer?.name || '',
        customer_email: selectedCustomer?.email || '',
        customer_phone: selectedCustomer?.phone || '',
        expected_delivery: orderDetails.expectedDelivery || undefined,
        items: orderItems.map(item => ({
          product_id: item.product_id,
          raw_material_id: item.raw_material_id,
          product_name: item.product_name,
          product_type: item.product_type,
          quantity: item.quantity,
          unit: item.unit, // Unit of measurement
          unit_price: item.unit_price,
          // If gst_included is false, send gst_rate as 0 to backend
          // Send gst_rate: if gst_included is false OR gst_rate is 0, send 0. Otherwise send the actual rate
          gst_rate: (item.gst_included === false || item.gst_rate === 0) ? 0 : (item.gst_rate || 18), // Per-item GST rate (0 if not included)
          gst_included: item.gst_included === true, // Per-item GST included flag - explicit boolean
          subtotal: typeof item.subtotal === 'string' ? parseFloat(item.subtotal) : (item.subtotal || 0),
          gst_amount: typeof item.gst_amount === 'string' ? parseFloat(item.gst_amount) : (item.gst_amount || 0),
          total_price: typeof item.total_price === 'string' ? parseFloat(item.total_price) : item.total_price,
          pricing_unit: item.pricing_unit,
          unit_value: item.unit_value,
          product_dimensions: item.product_dimensions,
          quality_grade: item.quality_grade || 'A',
          specifications: item.specifications || '',
          selected_individual_products: item.selectedIndividualProducts?.map((p: any) => p.id) || [],
        })),
        discount_amount: 0,
        paid_amount: paidAmount,
        priority: 'medium' as const,
        special_instructions: orderDetails.notes || undefined,
        remarks: orderDetails.remarks || undefined,
        delivery_address: orderDeliveryAddress || undefined,
      };

      const { error: orderError } = await OrderService.createOrder(orderData);

      if (orderError) {
        toast({
          title: 'Error',
          description: orderError,
          variant: 'destructive',
        });
        setIsSubmitting(false);
        return;
      }

      // Backend automatically creates stock notifications, no need to create from frontend

      toast({
        title: 'Success',
        description: `Order created successfully! Total: ${formatCurrency(totalAmount)}`,
      });

      // Keep button disabled during navigation
      setTimeout(() => {
        navigate('/orders');
      }, 2000);
    } catch (error) {
      console.error('Error creating order:', error);
      toast({
        title: 'Error',
        description: 'Failed to create order',
        variant: 'destructive',
      });
      setIsSubmitting(false);
    }
  };

  const handleCustomerCreated = (customer: Customer) => {
    setCustomers([...customers, customer]);
    setSelectedCustomer(customer);
    setShowNewCustomerForm(false);
  };

  const handleSelectProduct = (item: ExtendedOrderItem) => {
    setCurrentOrderItem(item);
    setShowProductSearch(true);
  };

  const handleProductSelected = (productId: string) => {
    if (currentOrderItem) {
      updateOrderItem(currentOrderItem.id, 'product_id', productId);
      setShowProductSearch(false);
      setProductSearchTerm('');
      setProductCategoryFilter('all');
      setProductColorFilter('all');
    }
  };

  const handleUseCustomerAddress = () => {
    if (selectedCustomer) {
      if (selectedCustomer.delivery_address) {
        setOrderDeliveryAddress(JSON.parse(selectedCustomer.delivery_address));
      } else {
        setOrderDeliveryAddress({
          address: selectedCustomer.address || '',
          city: selectedCustomer.city || '',
          state: selectedCustomer.state || '',
          pincode: selectedCustomer.pincode || '',
        });
      }
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate('/orders')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">New Order</h1>
              <p className="text-gray-600 mt-1">Create a new customer order</p>
            </div>
          </div>
        </div>

        {/* Customer Selection or Form */}
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Customer Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Toggle Buttons - Always Visible */}
            <div className="flex gap-4">
              <Button
                variant={!showNewCustomerForm ? "default" : "outline"}
                className={`flex-1 ${!showNewCustomerForm ? "text-white" : ""}`}
                onClick={() => setShowNewCustomerForm(false)}
              >
                Select Existing Customer
              </Button>
              <Button
                variant={showNewCustomerForm ? "default" : "outline"}
                className={`flex-1 ${showNewCustomerForm ? "text-white" : ""}`}
                onClick={() => setShowNewCustomerForm(true)}
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Add New Customer
              </Button>
            </div>

            {/* Customer Selection or Form Content */}
            {!showNewCustomerForm ? (
              <CustomerSelection
                customers={customers}
                selectedCustomer={selectedCustomer}
                onSelectCustomer={setSelectedCustomer}
                showToggleButtons={false}
              />
            ) : (
              <CustomerForm
                onCustomerCreated={handleCustomerCreated}
                onCancel={() => setShowNewCustomerForm(false)}
                showCard={false}
              />
            )}
          </CardContent>
        </Card>

        {/* Order Items */}
        <OrderItemsList
          items={orderItems}
          onAddItem={addOrderItem}
          onUpdateItem={updateOrderItem}
          onRemoveItem={removeOrderItem}
          onSelectProduct={handleSelectProduct}
          products={realProducts}
          rawMaterials={rawMaterials}
        />

        {/* Order Details */}
        <OrderDetailsForm
          expectedDelivery={orderDetails.expectedDelivery}
          paidAmount={orderDetails.paidAmount}
          notes={orderDetails.notes}
          remarks={orderDetails.remarks}
          onExpectedDeliveryChange={value => setOrderDetails(prev => ({ ...prev, expectedDelivery: value }))}
          onPaidAmountChange={value => setOrderDetails(prev => ({ ...prev, paidAmount: value }))}
          onNotesChange={value => setOrderDetails(prev => ({ ...prev, notes: value }))}
          onRemarksChange={value => setOrderDetails(prev => ({ ...prev, remarks: value }))}
        />

        {/* Delivery Address */}
        <DeliveryAddress
          customer={selectedCustomer}
          deliveryAddress={orderDeliveryAddress}
          onUseCustomerAddress={handleUseCustomerAddress}
          onEditAddress={() => setShowAddressEditor(true)}
          showDialog={showAddressEditor}
          onDialogChange={setShowAddressEditor}
          onAddressChange={setOrderDeliveryAddress}
        />

        {/* Order Summary */}
        <OrderSummary
          subtotal={calculateOrderBreakdown().subtotal}
          gstAmount={calculateOrderBreakdown().gstAmount}
          totalAmount={calculateOrderBreakdown().total}
          paidAmount={orderDetails.paidAmount}
          onCancel={() => navigate('/orders')}
          onSubmit={handleSubmit}
          canSubmit={orderItems.length > 0}
          isSubmitting={isSubmitting}
        />

        {/* Product/Material Selection Dialog */}
        <ProductMaterialSelectionDialog
          isOpen={showProductSearch}
          onClose={() => {
            setShowProductSearch(false);
            setProductSearchTerm('');
            setProductPage(1);
            setMaterialPage(1);
          }}
          currentItem={currentOrderItem}
          products={realProducts}
          materials={rawMaterials}
          productSearchTerm={productSearchTerm}
          onSearchChange={setProductSearchTerm}
          onSelectProduct={handleProductSelected}
          productPage={productPage}
          materialPage={materialPage}
          productItemsPerPage={productItemsPerPage}
          materialItemsPerPage={materialItemsPerPage}
          onProductPageChange={setProductPage}
          onMaterialPageChange={setMaterialPage}
        />
      </div>
    </Layout>
  );
}
