import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Loader2 } from 'lucide-react';
import { ProductionService, type CreateProductionBatchData, type ProductionBatch } from '@/services/productionService';
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
  const [productBatchSummary, setProductBatchSummary] = useState<{
    total: number;
    planned: number;
    active: number;
    completed: number;
    cancelled: number;
    latest: ProductionBatch[];
  } | null>(null);
  const [loadingProductBatches, setLoadingProductBatches] = useState(false);
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

  // When product changes, load a quick summary of its existing production batches
  useEffect(() => {
    const productId = formData.product_id;
    if (!productId) {
      setProductBatchSummary(null);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        setLoadingProductBatches(true);
        const { data, error } = await ProductionService.getBatches({
          product_id: productId,
          limit: 50,
        });

        if (cancelled) return;

        if (error) {
          console.error('Error loading product batch summary:', error);
          // Do not block creation, just log and show a soft toast
          toast({
            title: 'Info',
            description: 'Could not load existing production batches for this product.',
          });
          setProductBatchSummary(null);
          return;
        }

        const batches = (data || []) as ProductionBatch[];
        if (batches.length === 0) {
          setProductBatchSummary(null);
          return;
        }

        const planned = batches.filter((b) => b.status === 'planned').length;
        const active = batches.filter((b) => {
          const s = b.status?.toLowerCase();
          return s === 'in_production' || s === 'in_progress';
        }).length;
        const completed = batches.filter((b) => b.status === 'completed').length;
        const cancelledBatches = batches.filter((b) => b.status === 'cancelled').length;

        // Sort by start_date (or created_at fallback) newest first
        const sorted = [...batches].sort((a, b) => {
          const aTime =
            (a.start_date ? new Date(a.start_date).getTime() : 0) ||
            (a.created_at ? new Date(a.created_at).getTime() : 0);
          const bTime =
            (b.start_date ? new Date(b.start_date).getTime() : 0) ||
            (b.created_at ? new Date(b.created_at).getTime() : 0);
          return bTime - aTime;
        });

        setProductBatchSummary({
          total: batches.length,
          planned,
          active,
          completed,
          cancelled: cancelledBatches,
          latest: sorted.slice(0, 5),
        });
      } catch (error) {
        if (!cancelled) {
          console.error('Error loading product batch summary:', error);
          setProductBatchSummary(null);
        }
      } finally {
        if (!cancelled) {
          setLoadingProductBatches(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [formData.product_id, toast]);

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

                {selectedProduct && (
                  <Card className="border border-blue-200 bg-blue-50">
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-blue-500" />
                        <CardTitle className="text-sm font-semibold text-blue-900">
                          Current production for this product
                        </CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      {loadingProductBatches && (
                        <p className="text-xs text-blue-900/80">Checking ongoing and past batches…</p>
                      )}
                      {!loadingProductBatches && !productBatchSummary && (
                        <p className="text-xs text-blue-900/80">
                          No previous production batches found for this product.
                        </p>
                      )}
                      {!loadingProductBatches && productBatchSummary && (
                        <div className="space-y-2 text-xs text-blue-900/80">
                          <p>
                            Total: <strong>{productBatchSummary.total}</strong> · Planned:{' '}
                            <strong>{productBatchSummary.planned}</strong> · Ongoing:{' '}
                            <strong>{productBatchSummary.active}</strong> · Completed:{' '}
                            <strong>{productBatchSummary.completed}</strong> · Cancelled:{' '}
                            <strong>{productBatchSummary.cancelled}</strong>
                          </p>
                          {productBatchSummary.latest.length > 0 && (
                            <div className="space-y-1">
                              <p className="font-medium text-[11px] text-blue-900">
                                Latest batches:
                              </p>
                              <ul className="space-y-0.5">
                                {productBatchSummary.latest.map((b) => (
                                  <li
                                    key={b.id}
                                    className="text-[11px] text-blue-900/80 flex justify-between gap-2"
                                  >
                                    <span className="truncate">
                                      #{b.batch_number}{' '}
                                      <span className="uppercase tracking-wide text-[10px] font-semibold">
                                        {b.status}
                                      </span>
                                    </span>
                                    <span className="text-blue-900/70">
                                      Qty: {b.planned_quantity}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          <div className="pt-1">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                if (selectedProduct) {
                                  navigate(`/production/product/${selectedProduct.id}`);
                                }
                              }}
                            >
                              View full production history
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

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
