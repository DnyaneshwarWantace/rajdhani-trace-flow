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
import { ProductService } from '@/services/productService';
import { OrderService, type Order } from '@/services/orderService';
import { RecipeService } from '@/services/recipeService';

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
  const [allPendingOrders, setAllPendingOrders] = useState<Order[]>([]);
  const [loadingAllPendingOrders, setLoadingAllPendingOrders] = useState(false);
  const [filteredOrderOptions, setFilteredOrderOptions] = useState<Order[]>([]);
  const [filteringOrderOptions, setFilteringOrderOptions] = useState(false);
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [quantityAutoReason, setQuantityAutoReason] = useState<string>('');
  const [minimumRequiredQuantity, setMinimumRequiredQuantity] = useState<number>(0);
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

  // Pre-fill from order/task context (product, qty, completion date/order linkage)
  useEffect(() => {
    const state = location.state as any;
    if ((!state?.fromOrder && !state?.fromTask) || !state?.productId) return;

    const productId = state.productId as string;
    const plannedQuantity = Number(state.planned_quantity) || 0;
    const expectedDelivery = state.expected_delivery || state.expectedDelivery;
    const orderNumber = state.order_number || state.orderNumber || '';
    const customerName = state.customer_name || state.customerName || '';
    const orderItemId = state.orderItemId || state.order_item_id || '';

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
        setSelectedOrderIds(state.orderId ? [state.orderId] : []);
        if (orderItemId) {
          setFormData((prev) => ({ ...prev, order_item_id: orderItemId } as any));
        }
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
  }, [location.state?.fromOrder, location.state?.fromTask, location.state?.productId, user]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingAllPendingOrders(true);
      try {
        const { data } = await OrderService.getOrders({
          status: ['pending', 'accepted'],
          limit: 500,
          sortBy: 'expected_delivery',
          sortOrder: 'asc',
        });
        if (cancelled) return;
        setAllPendingOrders(data || []);
      } catch (error) {
        if (!cancelled) {
          console.error('Error loading all pending orders:', error);
          setAllPendingOrders([]);
        }
      } finally {
        if (!cancelled) setLoadingAllPendingOrders(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedProduct?.id) {
      setQuantityAutoReason('');
      setFilteredOrderOptions([]);
    }
  }, [selectedProduct?.id]);

  useEffect(() => {
    if (!selectedProduct?.id) {
      setFilteredOrderOptions([]);
      return;
    }

    let cancelled = false;
    (async () => {
      setFilteringOrderOptions(true);
      try {
        const targetProductId = selectedProduct.id;
        const recipeCache: Record<string, Awaited<ReturnType<typeof RecipeService.getRecipeByProductId>>> = {};

        const requiresTargetProduct = async (productId: string, visited = new Set<string>()): Promise<boolean> => {
          if (!productId) return false;
          if (productId === targetProductId) return true;
          if (visited.has(productId)) return false;
          visited.add(productId);

          if (!recipeCache[productId]) {
            recipeCache[productId] = await RecipeService.getRecipeByProductId(productId);
          }
          const recipe = recipeCache[productId];
          const productMaterials = (recipe?.materials || []).filter((m) => m.material_type === 'product');
          for (const material of productMaterials) {
            if (material.material_id === targetProductId) return true;
            if (await requiresTargetProduct(material.material_id, visited)) return true;
          }
          return false;
        };

        const relevantOrders: Order[] = [];
        for (const order of allPendingOrders) {
          let includeOrder = false;
          for (const item of order.items || []) {
            if (!item.productId) continue;
            if (await requiresTargetProduct(item.productId)) {
              includeOrder = true;
              break;
            }
          }
          if (includeOrder) relevantOrders.push(order);
        }

        if (!cancelled) {
          setFilteredOrderOptions(relevantOrders);
          setSelectedOrderIds((prev) => prev.filter((id) => relevantOrders.some((o) => o.id === id) || (lockedOrderId && id === lockedOrderId)));
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Error filtering relevant orders:', error);
          setFilteredOrderOptions([]);
        }
      } finally {
        if (!cancelled) setFilteringOrderOptions(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedProduct?.id, allPendingOrders]);

  // Auto-calculate planned quantity from selected attached orders.
  useEffect(() => {
    if (!selectedProduct?.id || selectedOrderIds.length === 0) {
      setQuantityAutoReason('');
      setMinimumRequiredQuantity(0);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const selectedOrders = allPendingOrders.filter((o) => selectedOrderIds.includes(o.id));
        if (selectedOrders.length === 0) {
          setQuantityAutoReason('');
          return;
        }

        const recipeMultiplierCache: Record<string, number> = {};
        const getMultiplier = async (finalProductId?: string) => {
          if (!finalProductId) return 0;
          if (finalProductId === selectedProduct.id) return 1;
          if (recipeMultiplierCache[finalProductId] !== undefined) return recipeMultiplierCache[finalProductId];
          try {
            const recipe = await RecipeService.getRecipeByProductId(finalProductId);
            const directMaterial = recipe?.materials?.find(
              (m) => m.material_type === 'product' && m.material_id === selectedProduct.id
            );
            const multiplier = Number(directMaterial?.quantity_per_sqm || 0);
            recipeMultiplierCache[finalProductId] = multiplier;
            return multiplier;
          } catch {
            recipeMultiplierCache[finalProductId] = 0;
            return 0;
          }
        };

        let totalRequired = 0;
        for (const order of selectedOrders) {
          for (const item of order.items || []) {
            const mult = await getMultiplier(item.productId);
            if (mult > 0 && Number(item.quantity) > 0) {
              totalRequired += mult * Number(item.quantity);
            }
          }
        }

        if (cancelled) return;

        if (totalRequired > 0) {
          const roundedRequired = Math.ceil(totalRequired * 1000) / 1000;
          setMinimumRequiredQuantity(roundedRequired);
          if (formData.planned_quantity >= roundedRequired) {
            setQuantityAutoReason(
              `Required from attached orders: ${roundedRequired}. Current planned quantity (${formData.planned_quantity}) is valid.`
            );
          } else {
            setQuantityAutoReason(
              `Required from attached orders: ${roundedRequired}. Increase planned quantity to at least ${roundedRequired}.`
            );
          }
        } else {
          setMinimumRequiredQuantity(0);
          setQuantityAutoReason(
            `No direct recipe linkage found for selected orders to ${selectedProduct.name}. Set quantity manually.`
          );
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Error auto-calculating planned quantity:', error);
          setQuantityAutoReason('');
          setMinimumRequiredQuantity(0);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedOrderIds, selectedProduct?.id, allPendingOrders, selectedProduct?.name, formData.planned_quantity]);

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
    setSelectedOrderIds([]);
    setFormData((prev) => ({ ...prev, product_id: '' }));
  };

  const state = location.state as any;
  const lockedOrderId: string | null =
    (state?.fromTask || state?.fromOrder) && state?.orderId ? String(state.orderId) : null;

  const toggleOrderSelection = (orderId: string) => {
    if (lockedOrderId && orderId === lockedOrderId) return;
    setSelectedOrderIds((prev) =>
      prev.includes(orderId) ? prev.filter((id) => id !== orderId) : [...prev, orderId]
    );
  };

  const orderOptions = filteredOrderOptions.map((order) => ({
    id: order.id,
    orderNumber: order.orderNumber || order.id,
    customerName: order.customerName || 'Customer',
    expectedDelivery: order.expectedDelivery,
    status: order.status,
    productNames: (order.items || []).map((item) => item.productName).filter(Boolean),
  }));

  const handleFormChange = (data: CreateProductionBatchData) => {
    setFormData(data);
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
    if (selectedOrderIds.length > 0 && minimumRequiredQuantity > 0 && Number(formData.planned_quantity) < minimumRequiredQuantity) {
      toast({
        title: 'Quantity too low',
        description: `You attached orders that require at least ${minimumRequiredQuantity}. Please increase planned quantity.`,
        variant: 'destructive',
      });
      return;
    }

    try {
      setSubmitting(true);
      const state = location.state as any;
      const selectedOrders = allPendingOrders.filter((order) => selectedOrderIds.includes(order.id));
      const lockedOrderIdFromState: string | undefined =
        (state?.fromTask || state?.fromOrder) && state?.orderId ? String(state.orderId) : undefined;
      const fallbackLockedOrder =
        selectedOrders.length === 0 && lockedOrderIdFromState
          ? {
              id: lockedOrderIdFromState,
              orderNumber: String(state?.order_number || state?.orderNumber || lockedOrderIdFromState),
              customerName: String(state?.customer_name || state?.customerName || ''),
            }
          : null;

      const primaryOrderId = selectedOrders[0]?.id || fallbackLockedOrder?.id;

      const attachedOrderNumbers = [
        ...selectedOrders.map((order) => order.orderNumber || order.id),
        ...(fallbackLockedOrder ? [fallbackLockedOrder.orderNumber] : []),
      ]
        .filter(Boolean)
        .join(', ');

      const attachedOrderIds = [
        ...selectedOrders.map((order) => order.id),
        ...(fallbackLockedOrder ? [fallbackLockedOrder.id] : []),
      ]
        .filter(Boolean)
        .join(', ');

      const attachedOrderCustomers = [
        ...selectedOrders.map((order) => `${order.orderNumber || order.id}:${order.customerName || 'Customer'}`),
        ...(fallbackLockedOrder ? [`${fallbackLockedOrder.orderNumber}:${fallbackLockedOrder.customerName || 'Customer'}`] : []),
      ]
        .join(', ');

      const orderItemIdFromState = (state?.orderItemId || state?.order_item_id || (formData as any).order_item_id) || undefined;
      const payload: CreateProductionBatchData = {
        ...formData,
        order_id: primaryOrderId,
        ...(orderItemIdFromState ? { order_item_id: orderItemIdFromState } : {}),
        notes: attachedOrderNumbers
          ? `${formData.notes ? `${formData.notes} · ` : ''}Attached Orders: ${attachedOrderNumbers}${attachedOrderIds ? ` · Attached Order IDs: ${attachedOrderIds}` : ''}${attachedOrderCustomers ? ` · Attached Customers: ${attachedOrderCustomers}` : ''}`
          : formData.notes,
      } as any;

      const { data, error } = await ProductionService.createBatch(payload);
      if (error) {
        toast({ title: 'Error', description: error, variant: 'destructive' });
        return;
      }
      if (data) {
        const assignedToId = state?.assigned_to_id || user?.id;
        const assignedToName = state?.assigned_to_name || user?.full_name || user?.email || 'User';
        if (assignedToId && assignedToName) {
          await ProductionService.assignBatch(data.id, assignedToId, assignedToName);
          await ProductionService.assignStage(data.id, 'planning', assignedToId, assignedToName);
        }
        if (state?.fromTask && state?.taskId) {
          await ProductionService.updateTaskStatus(state.taskId, 'planning');
        }
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
                      orderOptions={orderOptions}
                      selectedOrderIds={selectedOrderIds}
                      onToggleOrder={toggleOrderSelection}
                      lockedOrderId={lockedOrderId}
                      ordersLoading={loadingAllPendingOrders || filteringOrderOptions}
                    />
                    {quantityAutoReason && (
                      <p className={`mt-2 text-xs ${minimumRequiredQuantity > 0 && Number(formData.planned_quantity) < minimumRequiredQuantity ? 'text-red-700' : 'text-blue-700'}`}>
                        {quantityAutoReason}
                      </p>
                    )}
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
