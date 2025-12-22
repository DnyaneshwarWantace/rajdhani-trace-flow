import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { CustomerService, type Customer } from '@/services/customerService';
import { OrderService } from '@/services/orderService';
import { ProductService } from '@/services/productService';
import { MaterialService } from '@/services/materialService';
import { usePricingCalculator, type ExtendedOrderItem } from '@/hooks/usePricingCalculator';
import { getSuggestedPricingUnit, type ProductDimensions } from '@/utils/unitConverter';
import { formatCurrency } from '@/utils/formatHelpers';
import CustomerSelection from '@/components/orders/CustomerSelection';
import CustomerForm from '@/components/orders/CustomerForm';
import OrderItemsList from '@/components/orders/OrderItemsList';
import ProductMaterialSelectionDialog from '@/components/orders/ProductMaterialSelectionDialog';
import OrderDetailsForm from '@/components/orders/OrderDetailsForm';
import GSTSettings from '@/components/orders/GSTSettings';
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
  const [productTotalCount, setProductTotalCount] = useState(0);
  const [materialPage, setMaterialPage] = useState(1);
  const [materialItemsPerPage] = useState(50);
  const [materialTotalCount, setMaterialTotalCount] = useState(0);

  // Order details
  const [orderDetails, setOrderDetails] = useState({
    expectedDelivery: '',
    notes: '',
    paidAmount: 0,
  });

  // GST settings
  const [gstSettings, setGstSettings] = useState({
    rate: 18,
    isIncluded: true,
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

  // Reload materials when page/filters change
  useEffect(() => {
    loadRawMaterialsWithFilters();
  }, [materialPage, productSearchTerm]);

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

      const { products: data, total } = await ProductService.getProducts(filters);
      
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
      setProductTotalCount(total || 0);
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
      if (productSearchTerm) filters.search = productSearchTerm;

      const result = await MaterialService.getMaterials(filters);
      // Map materials to expected format
      const mappedMaterials = (result.materials || []).map((material: any) => ({
        id: material.id || material._id,
        name: material.name,
        price: material.cost_per_unit || 0,
        current_stock: material.current_stock || 0,
        stock: material.current_stock || 0,
        category: material.category,
        brand: material.supplier_name || 'Unknown',
        unit: material.unit,
        supplier: material.supplier_name || 'Unknown',
        status: material.status || 'in-stock',
        location: 'Warehouse',
      }));
      setRawMaterials(mappedMaterials);
      setMaterialTotalCount(result.total || 0);
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
              // Default to 'unit' (count_unit) for products, 'sqm' for raw materials
              updated.pricing_unit = updated.product_type === 'product' ? 'unit' : getSuggestedPricingUnit(productDimensions);

              const calculation = pricingCalculator.calculateItemPrice(updated);
              updated.total_price = calculation.totalPrice;
              updated.unit_value = calculation.unitValue;
              updated.isValid = calculation.isValid;
              updated.errorMessage = calculation.errorMessage;
            }
          }

          if (field === 'quantity' || field === 'unit_price' || field === 'pricing_unit' || field === 'product_dimensions') {
            const calculation = pricingCalculator.calculateItemPrice(updated);
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

  const handleSubmit = async () => {
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

    try {
      const subtotal = calculateTotal();
      const gstRate = gstSettings.rate;
      const gstAmount = gstSettings.isIncluded ? (subtotal * gstRate) / 100 : 0;
      const totalAmount = subtotal + gstAmount;
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
          gst_rate: item.gst_rate || 18, // Per-item GST rate
          gst_included: item.gst_included !== false, // Per-item GST included flag
          total_price: typeof item.total_price === 'string' ? parseFloat(item.total_price) : item.total_price,
          pricing_unit: item.pricing_unit,
          unit_value: item.unit_value,
          product_dimensions: item.product_dimensions,
          quality_grade: item.quality_grade || 'A',
          specifications: item.specifications || '',
          selected_individual_products: item.selectedIndividualProducts?.map((p: any) => p.id) || [],
        })),
        gst_rate: gstRate,
        discount_amount: 0,
        paid_amount: paidAmount,
        priority: 'medium' as const,
        special_instructions: orderDetails.notes || undefined,
        delivery_address: orderDeliveryAddress || undefined,
      };

      const { error: orderError } = await OrderService.createOrder(orderData);

      if (orderError) {
        toast({
          title: 'Error',
          description: orderError,
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Success',
        description: `Order created successfully! Total: ${formatCurrency(totalAmount)}`,
      });

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
        {!showNewCustomerForm ? (
          <CustomerSelection
            customers={customers}
            selectedCustomer={selectedCustomer}
            onSelectCustomer={setSelectedCustomer}
            onShowNewCustomerForm={() => setShowNewCustomerForm(true)}
          />
        ) : (
          <CustomerForm
            onCustomerCreated={handleCustomerCreated}
            onCancel={() => setShowNewCustomerForm(false)}
          />
        )}

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
          onExpectedDeliveryChange={value => setOrderDetails(prev => ({ ...prev, expectedDelivery: value }))}
          onPaidAmountChange={value => setOrderDetails(prev => ({ ...prev, paidAmount: value }))}
          onNotesChange={value => setOrderDetails(prev => ({ ...prev, notes: value }))}
        />

        {/* GST Settings */}
        <GSTSettings
          rate={gstSettings.rate}
          isIncluded={gstSettings.isIncluded}
          onRateChange={rate => setGstSettings(prev => ({ ...prev, rate }))}
          onIncludeChange={included => setGstSettings(prev => ({ ...prev, isIncluded: included }))}
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
          subtotal={calculateTotal()}
          gstRate={gstSettings.rate}
          gstIncluded={gstSettings.isIncluded}
          paidAmount={orderDetails.paidAmount}
          onCancel={() => navigate('/orders')}
          onSubmit={handleSubmit}
          canSubmit={orderItems.length > 0}
        />

        {/* Product/Material Selection Dialog */}
        <ProductMaterialSelectionDialog
          isOpen={showProductSearch}
          onClose={() => {
            setShowProductSearch(false);
            setProductSearchTerm('');
            setProductCategoryFilter('all');
            setProductColorFilter('all');
            setProductPage(1);
            setMaterialPage(1);
          }}
          currentItem={currentOrderItem}
          products={realProducts}
          materials={rawMaterials}
          productSearchTerm={productSearchTerm}
          productCategoryFilter={productCategoryFilter}
          productColorFilter={productColorFilter}
          onSearchChange={setProductSearchTerm}
          onCategoryFilterChange={setProductCategoryFilter}
          onColorFilterChange={setProductColorFilter}
          onSelectProduct={handleProductSelected}
          productPage={productPage}
          materialPage={materialPage}
          productTotalCount={productTotalCount}
          materialTotalCount={materialTotalCount}
          productItemsPerPage={productItemsPerPage}
          materialItemsPerPage={materialItemsPerPage}
          onProductPageChange={setProductPage}
          onMaterialPageChange={setMaterialPage}
        />
      </div>
    </Layout>
  );
}
