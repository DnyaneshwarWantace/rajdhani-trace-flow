import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Loader2, CheckCircle, XCircle, Plus, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ProductionService, type ProductionBatch } from '@/services/productionService';
import { ProductService } from '@/services/productService';
import { WasteService } from '@/services/wasteService';
import { OrderService, type Order } from '@/services/orderService';
import { RecipeService } from '@/services/recipeService';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { getApiUrl } from '@/utils/apiConfig';
import WastageStageHeader from '@/components/production/wastage/WastageStageHeader';
import ConsumedMaterialsDisplay from '@/components/production/machine/ConsumedMaterialsDisplay';
import WastageManagement from '@/components/production/wastage/WastageManagement';
import ProductionStageProgress from '@/components/production/planning/ProductionStageProgress';
import ExpectedProductDetails from '@/components/production/planning/ExpectedProductDetails';
import ProductionOverviewStats from '@/components/production/planning/ProductionOverviewStats';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Product } from '@/types/product';

export default function ProductionWastage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [batch, setBatch] = useState<ProductionBatch | null>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [consumedMaterials, setConsumedMaterials] = useState<any[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [noWastageMaterials, setNoWastageMaterials] = useState<Set<string>>(new Set());
  const [wasteItems, setWasteItems] = useState<any[]>([]);
  const [canNavigate, setCanNavigate] = useState(false);
  const [nextStageTasks, setNextStageTasks] = useState<Array<{
    orderId: string;
    orderNumber: string;
    customerName: string;
    productId: string;
    productName: string;
    requiredQuantity: number;
  }>>([]);
  // Excess quantity tracking: materialId → extra qty used beyond planned
  const [excessQty, setExcessQty] = useState<Record<string, string>>({});
  const [savingExcess, setSavingExcess] = useState<string | null>(null);
  const excessSaveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    if (id) {
      console.log('Loading wastage stage data for batch:', id);
      loadData();
    }
  }, [id, refreshKey]);

  useEffect(() => {
    if (!batch?.product_id) {
      setNextStageTasks([]);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const attachedFromNotes = new Set<string>();
        const attachedIdsFromNotes = new Set<string>();
        const notesText = batch.notes || '';
        const match = notesText.match(/Attached Orders:\s*(.+)$/i);
        if (match?.[1]) {
          const raw = match[1].split('·')[0].trim();
          const idMatches = raw.match(/[A-Z]{2,}-\d{6}-\d{3,}/g) || [];
          const parsed = (idMatches.length > 0 ? idMatches : raw.split(','))
            .map((s) => s.trim())
            .filter(Boolean);
          parsed.forEach((orderNo) => attachedFromNotes.add(orderNo));
        }
        const idMatch = notesText.match(/Attached Order IDs:\s*(.+?)(?:\s*·|$)/i);
        if (idMatch?.[1]) {
          idMatch[1]
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
            .forEach((orderId) => attachedIdsFromNotes.add(orderId));
        }

        const targetOrders = new Map<string, Order>();
        const { data: orders } = await OrderService.getOrders({ limit: 500 });
        (orders || []).forEach((order) => {
          if (
            order.id === batch.order_id ||
            attachedIdsFromNotes.has(order.id) ||
            (!!batch.order_number && order.orderNumber === batch.order_number) ||
            attachedFromNotes.has(order.orderNumber || '')
          ) {
            targetOrders.set(order.id, order);
          }
        });

        if (targetOrders.size === 0) {
          if (!cancelled) setNextStageTasks([]);
          return;
        }

        const taskMap = new Map<string, {
          orderId: string;
          orderNumber: string;
          customerName: string;
          productId: string;
          productName: string;
          requiredQuantity: number;
        }>();

        const recipeCache: Record<string, any> = {};
        const productNameCache: Record<string, string> = {};
        const getProductName = async (productId: string, fallback?: string) => {
          if (productNameCache[productId]) return productNameCache[productId];
          if (fallback) {
            productNameCache[productId] = fallback;
            return fallback;
          }
          try {
            const p = await ProductService.getProductById(productId);
            const name = p?.name || productId;
            productNameCache[productId] = name;
            return name;
          } catch {
            productNameCache[productId] = productId;
            return productId;
          }
        };

        const ensureRecipe = async (productId: string) => {
          if (!recipeCache[productId]) {
            recipeCache[productId] = await RecipeService.getRecipeByProductId(productId);
          }
          return recipeCache[productId];
        };

        const collectImmediateNextStages = async (
          finalProductId: string,
          finalProductName: string,
          demandQty: number,
          currentProductId: string
        ): Promise<Array<{ productId: string; productName: string; requiredQuantity: number }>> => {
          const results: Array<{ productId: string; productName: string; requiredQuantity: number }> = [];
          const visited = new Set<string>();

          const dfs = async (productId: string, productName: string, qtyForProduct: number) => {
            if (!productId || visited.has(`${productId}:${qtyForProduct}`)) return;
            visited.add(`${productId}:${qtyForProduct}`);

            const recipe = await ensureRecipe(productId);
            const materials = (recipe?.materials || []).filter((m: any) => m.material_type === 'product');
            if (materials.length === 0) return;

            for (const material of materials) {
              const childId = material.material_id;
              const coeff = Number(material.quantity_per_sqm || 0);
              if (!childId || coeff <= 0) continue;

              // If current batch product is a direct input of this product,
              // this product is the immediate next stage.
              if (childId === currentProductId) {
                const stageName = await getProductName(productId, productName);
                results.push({
                  productId,
                  productName: stageName,
                  requiredQuantity: qtyForProduct,
                });
                continue;
              }

              const nextQty = qtyForProduct * coeff;
              const childName = await getProductName(childId);
              await dfs(childId, childName, nextQty);
            }
          };

          await dfs(finalProductId, finalProductName, demandQty);
          return results;
        };

        for (const order of targetOrders.values()) {
          for (const item of order.items || []) {
            if (!item.productId || !item.productName || !item.quantity) continue;
            const stages = await collectImmediateNextStages(
              item.productId,
              item.productName,
              Number(item.quantity || 0),
              batch.product_id
            );
            for (const stage of stages) {
              if (stage.requiredQuantity <= 0) continue;
              const key = `${order.id}::${stage.productId}`;
              const existing = taskMap.get(key);
              if (existing) {
                existing.requiredQuantity += stage.requiredQuantity;
              } else {
                taskMap.set(key, {
                  orderId: order.id,
                  orderNumber: order.orderNumber || order.id,
                  customerName: order.customerName || '-',
                  productId: stage.productId,
                  productName: stage.productName,
                  requiredQuantity: stage.requiredQuantity,
                });
              }
            }
          }
        }

        if (!cancelled) {
          const tasks = Array.from(taskMap.values()).map((t) => ({
            ...t,
            requiredQuantity: Math.ceil(t.requiredQuantity * 1000) / 1000,
          }));
          setNextStageTasks(tasks);
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Error building next stage tasks:', error);
          setNextStageTasks([]);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [batch?.product_id, batch?.order_id, batch?.notes]);

  const loadData = async () => {
    try {
      setLoading(true);
      console.log('🔄 Loading wastage stage data...');
      
      // Load batch
      const { data: batchData } = await ProductionService.getBatchById(id!);
      if (batchData) {
        console.log('✅ Batch loaded:', batchData.batch_number);

        // CRITICAL FIX: Fix stage statuses if inconsistent
        const planningStageStatus = batchData.planning_stage?.status;
        const machineStageStatus = batchData.machine_stage?.status;
        const wastageStageStatus = batchData.wastage_stage?.status;

        let needsUpdate = false;
        const updateData: any = {};

        // Fix planning_stage if we're past it
        if (planningStageStatus !== 'completed' && (machineStageStatus || wastageStageStatus === 'in_progress' || wastageStageStatus === 'completed')) {
          console.log('⚠️ Planning stage is not marked as completed, but we are past it. Fixing planning_stage status...');
          updateData.planning_stage = {
            status: 'completed',
            completed_at: new Date().toISOString(),
            completed_by: 'System',
          };
          needsUpdate = true;
        }

        // Fix machine_stage if we're on wastage but machine is not completed
        if (machineStageStatus !== 'completed' && (wastageStageStatus === 'in_progress' || wastageStageStatus === 'completed')) {
          console.log('⚠️ Machine stage is not marked as completed, but wastage stage is active. Fixing machine_stage status...');
          updateData.machine_stage = {
            status: 'completed',
            completed_at: new Date().toISOString(),
            completed_by: 'System',
          };
          needsUpdate = true;
        }

        if (needsUpdate) {
          try {
            await ProductionService.updateBatch(id!, updateData);
            console.log('✅ Stage statuses fixed');
            // Reload the batch to get updated data
            const { data: updatedBatchData } = await ProductionService.getBatchById(id!);
            if (updatedBatchData) {
              Object.assign(batchData, updatedBatchData);
            }
          } catch (error) {
            console.error('❌ Error fixing stage statuses:', error);
          }
        }

        // Fetch product details
        let enrichedBatch = { ...batchData };
        if (batchData.product_id) {
          try {
            const productData = await ProductService.getProductById(batchData.product_id);
            enrichedBatch.product_name = productData.name;
            setProduct(productData);
          } catch (error) {
            console.error('Error fetching product:', error);
          }
        }
        
        setBatch(enrichedBatch);
        
        // Load material consumption
        const { data: consumptionData } = await ProductionService.getMaterialConsumption(id!);
        console.log('📦 Material consumption data:', consumptionData?.length || 0, 'items');
        if (consumptionData && consumptionData.length > 0) {
          // Convert to consumed materials format
          const consumed = consumptionData.map((m: any) => ({
            material_id: m.material_id,
            material_name: m.material_name,
            material_type: m.material_type,
            quantity_per_sqm: m.quantity_per_sqm || 0,
            required_quantity: m.quantity_used || m.required_quantity || 0,
            actual_consumed_quantity: m.actual_consumed_quantity || m.quantity_used || 0,
            whole_product_count: m.whole_product_count || m.quantity_used || 0,
            unit: m.unit,
            individual_product_ids: m.individual_product_ids || [],
            individual_products: m.individual_products || [], // Full individual product details
          }));
          console.log('✅ Consumed materials set:', consumed.length);
          setConsumedMaterials(consumed);
        } else {
          // Try to load from PlanningDraftState (this batch's draft) if no consumption records yet
          try {
            const { data: draftState } = await ProductionService.getDraftPlanningState(batchData.product_id, id);
            if (draftState?.consumed_materials && draftState.consumed_materials.length > 0) {
              setConsumedMaterials(draftState.consumed_materials);
            }
          } catch (error) {
            console.error('Error loading draft state:', error);
          }
        }

        // Load waste items to check which materials have wastage
        try {
          const allWaste = await WasteService.getAllWaste();
          const batchWaste = allWaste.filter(
            (item) => item.production_batch_id === id || item.batch_id === id
          );
          setWasteItems(batchWaste);
          console.log('✅ Waste items loaded:', batchWaste.length);
        } catch (error) {
          console.error('Error loading waste items:', error);
          setWasteItems([]);
        }
      }
    } catch (error) {
      console.error('Error loading wastage stage data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load production data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshKey(prev => prev + 1);
  };

  // Save excess quantity for a material — deducts from stock immediately
  const handleExcessQtyChange = (materialId: string, value: string) => {
    setExcessQty(prev => ({ ...prev, [materialId]: value }));
    if (excessSaveTimers.current[materialId]) clearTimeout(excessSaveTimers.current[materialId]);
    excessSaveTimers.current[materialId] = setTimeout(() => saveExcessQty(materialId, value), 800);
  };

  const saveExcessQty = async (materialId: string, value: string) => {
    const extra = parseFloat(value);
    if (isNaN(extra) || extra <= 0) return;
    const material = consumedMaterials.find(m => m.material_id === materialId);
    if (!material || !id) return;
    setSavingExcess(materialId);
    try {
      const token = localStorage.getItem('auth_token');
      const API_URL_BASE = getApiUrl();
      const res = await fetch(`${API_URL_BASE}/material-consumption`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          production_batch_id: id,
          material_id: materialId,
          material_name: material.material_name,
          material_type: material.material_type,
          quantity_used: extra,
          actual_consumed_quantity: extra,
          unit: material.unit,
          deduct_now: true,
          notes: `Excess usage: ${extra} ${material.unit} more than planned`,
        }),
      });
      if (res.ok) {
        toast({ title: 'Excess saved', description: `${extra} ${material.unit} extra recorded and deducted from stock for ${material.material_name}` });
        setExcessQty(prev => ({ ...prev, [materialId]: '' }));
        handleRefresh();
      } else {
        const err = await res.json();
        toast({ title: 'Error', description: err.error || 'Failed to save excess', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to save excess quantity', variant: 'destructive' });
    } finally {
      setSavingExcess(null);
    }
  };

  // Lightweight update: only refetch waste items (no full page reload). Use after save wastage.
  const handleWasteUpdated = async () => {
    try {
      const allWaste = await WasteService.getAllWaste();
      const batchWaste = allWaste.filter(
        (item) => item.production_batch_id === id || item.batch_id === id
      );
      setWasteItems(batchWaste);
    } catch (error) {
      console.error('Error reloading waste items:', error);
    }
  };

  // Calculate wastage potential for a product material
  const getProductWastagePotential = (material: any) => {
    const isProduct = material.material_type === 'product' || 
                     (material.material_id && material.material_id.startsWith('PRO-'));
    
    if (!isProduct) return null;
    
    let wholeCount = material.whole_product_count;
    let consumed = material.actual_consumed_quantity || material.required_quantity || 0;
    
    if (!wholeCount && consumed > 0) {
      wholeCount = Math.ceil(consumed);
    }
    
    if (!wholeCount && material.quantity_used) {
      wholeCount = material.quantity_used;
    }
    
    if (!wholeCount || !consumed) return null;
    
    const wastage = wholeCount - consumed;
    if (wastage <= 0) return null;
    
    return {
      quantity: wastage,
      wholeCount: Math.ceil(wastage),
      hasWastage: true,
    };
  };

  // Check if wastage exists for a material
  const hasWastageForMaterial = (materialId: string) => {
    // Check both material_id and product_id (for product materials, material_id might be the product_id)
    const hasWastage = wasteItems.some((waste) => 
      waste.material_id === materialId || 
      waste.product_id === materialId ||
      (waste.material_type === 'product' && waste.material_id === materialId)
    );
    console.log(`🔍 Checking wastage for material ${materialId}:`, {
      hasWastage,
      wasteItemsCount: wasteItems.length,
      matchingWaste: wasteItems.filter(w => w.material_id === materialId || w.product_id === materialId)
    });
    return hasWastage;
  };

  // Check if material has "No Wastage" selected
  const hasNoWastageSelected = (materialId: string) => {
    return noWastageMaterials.has(materialId);
  };

  // Get product materials with wastage potential
  const getProductMaterialsWithWastagePotential = () => {
    return consumedMaterials.filter((m) => {
      const isProduct = m.material_type === 'product' || 
                       (m.material_id && m.material_id.startsWith('PRO-'));
      if (!isProduct) return false;
      const wastagePotential = getProductWastagePotential(m);
      return wastagePotential !== null;
    });
  };

  // Check if all product materials with wastage potential are handled
  const canNavigateToIndividualProducts = () => {
    const productMaterialsWithWastage = getProductMaterialsWithWastagePotential();
    
    console.log('🔍 Checking if can navigate to individual products:', {
      productMaterialsWithWastageCount: productMaterialsWithWastage.length,
      wasteItemsCount: wasteItems.length,
      wasteItems: wasteItems.map(w => ({ 
        id: w.id,
        material_id: w.material_id, 
        product_id: w.product_id, 
        material_name: w.material_name,
        material_type: w.material_type
      }))
    });
    
    // If no product materials with wastage potential, allow navigation
    if (productMaterialsWithWastage.length === 0) {
      console.log('✅ No product materials with wastage potential - allowing navigation');
      return true;
    }

    // Check if all product materials with wastage potential have either:
    // 1. Wastage recorded, OR
    // 2. "No Wastage" selected
    const allHandled = productMaterialsWithWastage.every((material) => {
      const hasWastage = hasWastageForMaterial(material.material_id);
      const noWastage = hasNoWastageSelected(material.material_id);
      const isHandled = hasWastage || noWastage;
      console.log(`  Material ${material.material_name} (${material.material_id}): hasWastage=${hasWastage}, noWastage=${noWastage}, isHandled=${isHandled}`);
      return isHandled;
    });

    console.log(`✅ Can navigate: ${allHandled}`);
    return allHandled;
  };

  // Update canNavigate state whenever wasteItems or noWastageMaterials change
  useEffect(() => {
    const canNav = canNavigateToIndividualProducts();
    setCanNavigate(canNav);
  }, [wasteItems, noWastageMaterials, consumedMaterials]);

  const handleMarkNoWastage = (materialId: string) => {
    setNoWastageMaterials(prev => new Set(prev).add(materialId));
    toast({
      title: 'No Wastage Selected',
      description: 'This material has been marked as having no wastage',
    });
  };

  const handleCompleteProduction = async () => {
    if (!batch || !batch.product_id) {
      toast({
        title: 'Error',
        description: 'Batch or product information is missing',
        variant: 'destructive',
      });
      return;
    }

    try {
      setUpdatingStatus(true);

      // Update material consumption records to 'used' (best effort — do not block on failure)
      try {
        const API_URL = getApiUrl();
        const token = localStorage.getItem('auth_token');
        const recordsRes = await fetch(`${API_URL}/material-consumption?production_batch_id=${id}`, {
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        });
        if (recordsRes.ok) {
          const recordsData = await recordsRes.json();
          const records: any[] = recordsData.data || [];
          await Promise.allSettled(
            records
              .filter((r: any) => r.status === 'active' && r.consumption_status !== 'used')
              .map((r: any) =>
                fetch(`${API_URL}/material-consumption/${r.id}`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                  body: JSON.stringify({ consumption_status: 'used' }),
                })
              )
          );
        }
      } catch (err) {
        console.warn('Could not update consumption records (non-blocking):', err);
      }

      // Mark batch as completed
      const completionDate = new Date().toISOString();
      const completedBy = user?.full_name || user?.email || 'User';
      const { data: updatedBatch, error: updateError } = await ProductionService.updateBatch(id!, {
        status: 'completed',
        wastage_stage: { status: 'completed', completed_at: completionDate, completed_by: completedBy },
        final_stage: { status: 'completed', completed_at: completionDate, completed_by: completedBy },
      });

      if (updateError || !updatedBatch) {
        toast({
          title: 'Error',
          description: 'Failed to complete production batch. Please try again.',
          variant: 'destructive',
        });
        setUpdatingStatus(false);
        return;
      }

      setBatch((prev) => ({
        ...prev,
        ...updatedBatch,
        product_name: updatedBatch.product_name || prev?.product_name || product?.name || updatedBatch.product_id || 'N/A',
      }) as ProductionBatch);

      toast({ title: 'Production Completed', description: 'Batch marked as completed successfully.' });
      setUpdatingStatus(false);
    } catch (error) {
      console.error('Error completing production:', error);
      toast({ title: 'Error', description: 'Failed to complete production. Please try again.', variant: 'destructive' });
    } finally {
      setUpdatingStatus(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      </Layout>
    );
  }

  if (!batch) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-gray-600">Batch not found</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6 min-h-0 pb-8">
        <WastageStageHeader
          batch={batch}
          onBack={() => {
            if (id) navigate(`/production/${id}/individual-products`);
            else navigate('/production');
          }}
          onCompleteProduction={handleCompleteProduction}
          onRefresh={handleRefresh}
          onAssignAfterComplete={async (userId, userName, selectedTasks) => {
            if (!selectedTasks || selectedTasks.length === 0) {
              throw new Error('No next-stage order tasks found to assign');
            }
            const createResults = await Promise.all(
              selectedTasks.map((task) =>
                ProductionService.createTask({
                  order_id: task.orderId,
                  order_number: task.orderNumber,
                  customer_name: task.customerName,
                  stage_product_id: task.productId,
                  stage_product_name: task.productName,
                  final_product_id: task.productId,
                  final_product_name: task.productName,
                  planned_quantity: task.requiredQuantity,
                  assigned_to_id: userId,
                  assigned_to_name: userName,
                  notes: `Next-stage task from completed batch ${batch.batch_number}`,
                })
              )
            );
            const failed = createResults.find((r) => r.error);
            if (failed?.error) throw new Error(failed.error);
            const effectiveUsers = Array.from(
              new Set(
                createResults
                  .map((r) => r.data?.assigned_to_name)
                  .filter((name): name is string => !!name && name.trim().length > 0)
              )
            );
            toast({
              title: 'Forwarded',
              description:
                effectiveUsers.length > 0
                  ? `${selectedTasks.length} next-stage item(s) forwarded to ${effectiveUsers.join(', ')}`
                  : `${selectedTasks.length} next-stage item(s) forwarded to ${userName}`,
            });
          }}
          onDoneAfterComplete={() => navigate('/production')}
          nextStageTasks={nextStageTasks.map((t) => ({
            orderId: t.orderId,
            orderNumber: t.orderNumber,
            customerName: t.customerName,
            productId: t.productId,
            productName: t.productName,
            requiredQuantity: t.requiredQuantity,
          }))}
          completeDisabled={!canNavigate}
          isCompleting={updatingStatus}
        />

        {/* Machine stage remark - why completion was late / any note from machine stage */}
        {batch?.machine_stage?.remark && (
          <Card className="bg-amber-50 border-amber-200">
            <CardContent className="p-4">
              <p className="text-sm font-medium text-amber-800 mb-1">Machine stage note</p>
              <p className="text-sm text-amber-900">{batch.machine_stage.remark}</p>
            </CardContent>
          </Card>
        )}

        {/* Production Progress Tracker */}
        <ProductionStageProgress currentStage="wastage" />

        {/* Product Details */}
        {product && (
          <>
            <ProductionOverviewStats
              targetQuantity={batch?.planned_quantity || 0}
              unit={product.count_unit || 'rolls'}
              materialsUsed={consumedMaterials.length}
              expectedLength={product.length ? parseFloat(product.length) : undefined}
              expectedWidth={product.width ? parseFloat(product.width) : undefined}
              expectedWeight={product.weight ? parseFloat(product.weight) : undefined}
            />
            <ExpectedProductDetails product={product} />
          </>
        )}

        {/* Consumed Materials */}
        <ConsumedMaterialsDisplay
          materials={consumedMaterials}
          product={product}
          targetQuantity={batch?.planned_quantity || 0}
        />

        {/* Excess Material Usage — if more was used than planned */}
        {consumedMaterials.length > 0 && (
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-1">
                <Plus className="w-4 h-4 text-orange-500" />
                <h3 className="text-base font-semibold text-gray-900">Excess Material Used</h3>
              </div>
              <p className="text-sm text-gray-500 mb-4">
                If you used more material than planned (e.g. planned 300 kg but used 320 kg), enter the extra amount here. It will be deducted from stock immediately.
              </p>
              <div className="space-y-3">
                {consumedMaterials.map((m) => (
                  <div key={m.material_id} className="flex items-center gap-4 p-3 border rounded-lg bg-orange-50 border-orange-100">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{m.material_name}</p>
                      <p className="text-xs text-gray-500">
                        Planned: {m.required_quantity || m.quantity_used || 0} {m.unit}
                        {m.actual_consumed_quantity && m.actual_consumed_quantity !== m.required_quantity
                          ? ` · Previously extra: ${Math.max(0, m.actual_consumed_quantity - (m.required_quantity || 0))} ${m.unit}`
                          : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Minus className="w-4 h-4 text-gray-400" />
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder={`Extra ${m.unit}`}
                        value={excessQty[m.material_id] || ''}
                        onChange={e => handleExcessQtyChange(m.material_id, e.target.value)}
                        className="w-32 h-8 text-sm"
                      />
                      <span className="text-xs text-gray-500 w-8">{m.unit}</span>
                      {savingExcess === m.material_id && (
                        <Loader2 className="w-4 h-4 animate-spin text-orange-500" />
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs border-orange-300 text-orange-700 hover:bg-orange-50"
                        disabled={!excessQty[m.material_id] || parseFloat(excessQty[m.material_id]) <= 0 || savingExcess === m.material_id}
                        onClick={() => saveExcessQty(m.material_id, excessQty[m.material_id] || '0')}
                      >
                        Save Extra
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Wastage Management */}
        <WastageManagement
          batchId={id!}
          consumedMaterials={consumedMaterials}
          onRefresh={handleRefresh}
          onWasteUpdated={handleWasteUpdated}
          productId={batch?.product_id}
          productName={batch?.product_name || product?.name}
        />

        {/* Product Materials Wastage Status */}
        {(() => {
          const productMaterialsWithWastage = getProductMaterialsWithWastagePotential();
          if (productMaterialsWithWastage.length === 0) {
            return null;
          }

          return (
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4">Product Materials Wastage Status</h3>
                <div className="space-y-3">
                  {productMaterialsWithWastage.map((material) => {
                    const hasWastage = hasWastageForMaterial(material.material_id);
                    const noWastage = hasNoWastageSelected(material.material_id);
                    const wastagePotential = getProductWastagePotential(material);
                    const isHandled = hasWastage || noWastage;

                    return (
                      <div
                        key={material.material_id}
                        className={`p-4 border rounded-lg ${
                          isHandled ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {isHandled ? (
                              <CheckCircle className="w-5 h-5 text-green-600" />
                            ) : (
                              <XCircle className="w-5 h-5 text-yellow-600" />
                            )}
                            <div>
                              <h4 className="font-semibold text-gray-900">{material.material_name}</h4>
                              {wastagePotential && (
                                <p className="text-sm text-gray-600">
                                  Potential wastage: {wastagePotential.wholeCount} {material.unit}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {hasWastage && (
                              <Badge className="bg-green-100 text-green-700">Wastage Recorded</Badge>
                            )}
                            {noWastage && (
                              <Badge className="bg-blue-100 text-blue-700">No Wastage</Badge>
                            )}
                            {!isHandled && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleMarkNoWastage(material.material_id)}
                                className="text-blue-600 border-blue-300 hover:bg-blue-50"
                              >
                                Mark No Wastage
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {!canNavigateToIndividualProducts() && (
                  <div className="mt-4 p-3 bg-yellow-100 border border-yellow-300 rounded-lg">
                    <p className="text-sm text-yellow-800">
                      ⚠️ Please select wastage or mark "No Wastage" for all product materials before completing production.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })()}

      </div>

    </Layout>
  );
}
