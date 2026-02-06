import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { ProductionService, type CreateProductionBatchData } from '@/services/productionService';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import type { Product } from '@/types/product';
import ProductionCreateHeader from '@/components/production/create/ProductionCreateHeader';
import ProductSearchSection from '@/components/production/create/ProductSearchSection';
import SelectedProductCard from '@/components/production/create/SelectedProductCard';
import BatchDetailsForm from '@/components/production/create/BatchDetailsForm';
import AllPendingOrdersSection from '@/components/production/create/AllPendingOrdersSection';
import { ProductService } from '@/services/productService';

export default function ProductionCreate() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedOrderDeliveryDate, setSelectedOrderDeliveryDate] = useState<string | null>(null);
  const [formData, setFormData] = useState<CreateProductionBatchData>({
    product_id: '',
    planned_quantity: 0,
    priority: 'medium',
    operator: user?.full_name || user?.email || '',
    supervisor: user?.full_name || user?.email || '',
    notes: '',
    completion_date: '',
  });

  // Auto-fill operator and supervisor with logged-in user
  useEffect(() => {
    if (user) {
      const userName = user.full_name || user.email || '';
      setFormData((prev) => ({
        ...prev,
        operator: userName,
        supervisor: userName,
      }));
    }
  }, [user]);

  // Check if product was passed from product page
  useEffect(() => {
    const productFromState = location.state?.product as Product | undefined;
    if (productFromState) {
      setSelectedProduct(productFromState);
      setFormData((prev) => ({
        ...prev,
        product_id: productFromState.id,
        operator: user?.full_name || user?.email || prev.operator,
        supervisor: user?.full_name || user?.email || prev.supervisor,
      }));
    }
  }, [location.state, user]);

  // Pre-fill from order page "Go to Production" (order details: product, qty, completion date)
  useEffect(() => {
    const state = location.state as any;
    if (!state?.fromOrder || !state?.productId) return;

    const productId = state.productId as string;
    const plannedQuantity = Number(state.planned_quantity) || 0;
    const expectedDelivery = state.expected_delivery || state.expectedDelivery;
    const orderNumber = state.order_number || state.orderNumber || '';
    const customerName = state.customer_name || state.customerName || '';

    let cancelled = false;
    (async () => {
      try {
        const product = await ProductService.getProductById(productId);
        if (cancelled || !product) return;

        setSelectedProduct(product);

        let completionDate = '';
        if (expectedDelivery) {
          const d = new Date(expectedDelivery);
          d.setDate(d.getDate() - 2);
          completionDate = d.toISOString().split('T')[0];
        }

        setSelectedOrderDeliveryDate(expectedDelivery || null);
        setFormData((prev) => ({
          ...prev,
          product_id: productId,
          planned_quantity: plannedQuantity,
          completion_date: completionDate,
          notes: orderNumber && customerName ? `Order ${orderNumber} for ${customerName}` : prev.notes,
          operator: user?.full_name || user?.email || prev.operator,
          supervisor: user?.full_name || user?.email || prev.supervisor,
        }));
      } catch (e) {
        console.error('Error pre-filling from order:', e);
      }
    })();
    return () => { cancelled = true; };
  }, [location.state?.fromOrder, location.state?.productId, user]);

  // Handle back navigation based on where user came from
  const handleBack = () => {
    const state = location.state as any;
    const from = state?.from as string | undefined;
    const productId = state?.productId as string | undefined;
    const batchId = state?.batchId as string | undefined;
    const orderId = state?.orderId as string | undefined;

    if (state?.fromOrder && orderId) {
      navigate(`/orders/${orderId}`);
    } else if (from === 'product-detail' && productId) {
      navigate(`/products/${productId}`);
    } else if (from === 'product-list') {
      navigate('/products');
    } else if (from === 'production-detail' && batchId) {
      navigate(`/production/${batchId}`);
    } else {
      navigate('/production');
    }
  };

  const handleProductSelect = (product: Product) => {
    setSelectedProduct(product);
    // Clear any order-based delivery constraint when user picks a product manually
    setSelectedOrderDeliveryDate(null);
    setFormData((prev) => ({ ...prev, product_id: product.id }));
  };

  const handleProductClear = () => {
    setSelectedProduct(null);
    // Also clear any order-based delivery constraint
    setSelectedOrderDeliveryDate(null);
    setFormData((prev) => ({ ...prev, product_id: '' }));
  };

  const handleFormChange = (data: CreateProductionBatchData) => {
    setFormData(data);
  };

  const handleSelectOrder = async (order: any, productId: string) => {
    try {
      // Fetch product details
      const product = await ProductService.getProductById(productId);

      if (product) {
        setSelectedProduct(product);

        const deliveryDate = new Date(order.expected_delivery);
        const completionDate = new Date(deliveryDate);
        completionDate.setDate(completionDate.getDate() - 2);
        const formattedDate = completionDate.toISOString().split('T')[0];

        setSelectedOrderDeliveryDate(order.expected_delivery);

        setFormData({
          product_id: productId,
          planned_quantity: order.quantity_needed,
          completion_date: formattedDate,
          priority: order.priority || 'medium',
          notes: `Order ${order.order_number} for ${order.customer_name}`,
          operator: user?.full_name || user?.email || '',
          supervisor: user?.full_name || user?.email || '',
        });

        toast({
          title: 'Order Selected',
          description: `Product: ${product.name}, Qty: ${order.quantity_needed}`,
          duration: 4000,
        });

        // Scroll to form
        setTimeout(() => {
          window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
        }, 100);
      }
    } catch (error) {
      console.error('Error loading product:', error);
      toast({
        title: 'Error',
        description: 'Failed to load product details',
        variant: 'destructive',
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.product_id || formData.planned_quantity <= 0) {
      toast({
        title: 'Validation Error',
        description: 'Please select a product and enter a valid quantity',
        variant: 'destructive',
      });
      return;
    }
    if (!formData.completion_date || formData.completion_date.trim() === '') {
      toast({
        title: 'Validation Error',
        description: 'Please select an expected completion date',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSubmitting(true);
      const { data, error } = await ProductionService.createBatch(formData);
      if (error) {
        toast({ title: 'Error', description: error, variant: 'destructive' });
        return;
      }
      if (data) {
        toast({ title: 'Success', description: 'Production batch created successfully' });
        navigate(`/production/planning?batchId=${data.id}`);
      }
    } catch (error) {
      console.error('Error creating batch:', error);
      toast({ title: 'Error', description: 'Failed to create batch', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50">
        <ProductionCreateHeader onBack={handleBack} />

        <div className="px-2 sm:px-3 lg:px-4 py-6 space-y-6">
          {/* ALL PENDING ORDERS SECTION - AT TOP */}
          <AllPendingOrdersSection onSelectOrder={handleSelectOrder} />

          {/* SEPARATOR */}
          <div className="py-4">
            <hr className="border-t-2 border-gray-300" />
            <p className="text-center text-gray-600 font-semibold mt-4 text-lg">
              OR Create Batch for Any Other Product Below
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column - Product Selection */}
              <div className="space-y-4">
                <ProductSearchSection
                  onSelect={handleProductSelect}
                  selectedProductId={selectedProduct?.id || null}
                />

                {selectedProduct && (
                  <SelectedProductCard product={selectedProduct} onClear={handleProductClear} />
                )}
              </div>

              {/* Right Column - Batch Details */}
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Batch Details</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <BatchDetailsForm
                      formData={formData}
                      onChange={handleFormChange}
                      selectedProduct={selectedProduct}
                      orderDeliveryDate={selectedOrderDeliveryDate}
                    />
                  </CardContent>
                </Card>

                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleBack}
                    className="flex-1"
                    disabled={submitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 bg-primary-600 hover:bg-primary-700 text-white"
                    disabled={submitting || !formData.product_id || formData.planned_quantity <= 0 || !formData.completion_date}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      'Create Batch'
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
}
