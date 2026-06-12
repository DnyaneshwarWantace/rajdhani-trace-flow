import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import {
  Loader2,
  CheckCircle,
  XCircle,
  Plus,
  Minus,
  ArrowLeft,
  Trash2,
  RefreshCw,
  AlertTriangle,
  Info,
  ChevronUp,
  ChevronDown,
  Package,
  Layers,
  Save,
  UserPlus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ProductionService, type ProductionBatch } from '@/services/productionService';
import { NotificationService } from '@/services/notificationService';
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
import AssignUserModal from '@/components/production/AssignUserModal';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

export default function ProductionWastage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
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

  // Mobile UI States
  const [expandedMaterialId, setExpandedMaterialId] = useState<string | null>(null);
  const [wasteTypes, setWasteTypes] = useState<string[]>([]);
  const [showMobileWasteTypesDialog, setShowMobileWasteTypesDialog] = useState(false);
  const [mobileWasteTypesDialogMaterialId, setMobileWasteTypesDialogMaterialId] = useState<string | null>(null);
  const [mobileFormData, setMobileFormData] = useState<Record<string, {
    quantity: string;
    waste_type: string;
    waste_category: string;
    notes: string;
    noWastage?: boolean;
  }>>({});
  const [mobileShowForwardDialog, setMobileShowForwardDialog] = useState(false);
  const [mobileShowAssignModal, setMobileShowAssignModal] = useState(false);
  const [mobileSelectedTaskKeys, setMobileSelectedTaskKeys] = useState<Set<string>>(new Set());
  const [savingMobileWasteId, setSavingMobileWasteId] = useState<string | null>(null);

  // Mobile Raw Material Dialog States
  const [showMobileAddWasteDialog, setShowMobileAddWasteDialog] = useState(false);
  const [showMobileAddExcessDialog, setShowMobileAddExcessDialog] = useState(false);
  const [showMobileMaterialPicker, setShowMobileMaterialPicker] = useState(false);
  const [materialPickerTarget, setMaterialPickerTarget] = useState<'waste' | 'excess'>('waste');
  
  const [mobileAddWasteForm, setMobileAddWasteForm] = useState({
    material_id: '',
    material_name: '',
    material_type: 'raw_material',
    quantity: '',
    unit: '',
    waste_type: '',
    waste_category: 'disposable',
    notes: '',
  });

  const [mobileAddExcessForm, setMobileAddExcessForm] = useState({
    material_id: '',
    material_name: '',
    material_type: 'raw_material',
    quantity: '',
    unit: '',
  });

  const loadWasteTypes = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const API_URL_BASE = getApiUrl();
      const res = await fetch(`${API_URL_BASE}/dropdowns/category/waste_type`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const result = await res.json();
        if (result.success && Array.isArray(result.data)) {
          const types = result.data
            .filter((opt: any) => opt.is_active !== false)
            .map((opt: any) => opt.value)
            .filter((val: string) => val && typeof val === 'string');
          setWasteTypes(types);
        }
      }
    } catch (error) {
      console.error('Error loading waste types:', error);
    }
  };

  useEffect(() => {
    if (id) {
      console.log('Loading wastage stage data for batch:', id);
      loadData();
      loadWasteTypes();
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
          // Sub-production batch: no real order, but there may be a parent batch task to notify.
          if ((batch.order_id || '').startsWith('SUB-')) {
            // Find the task that links this sub-batch to a parent batch
            const { data: allTasks } = await ProductionService.getTasks({ limit: 200 });
            const linkedTask = (allTasks || []).find(
              (t) =>
                t.stage_product_id === batch.product_id &&
                (t.order_id === batch.order_id || t.order_number === batch.order_number) &&
                t.parent_batch_id
            );
            if (linkedTask && !cancelled) {
              setNextStageTasks([{
                orderId: linkedTask.order_id || batch.order_id || '',
                orderNumber: linkedTask.order_number || batch.batch_number || '',
                customerName: linkedTask.final_product_name || 'Parent Batch',
                productId: linkedTask.final_product_id || '',
                productName: linkedTask.final_product_name || 'Main Product',
                requiredQuantity: linkedTask.planned_quantity || 1,
              }]);
            } else if (!cancelled) {
              setNextStageTasks([]);
            }
          } else if (!cancelled) {
            setNextStageTasks([]);
          }
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

        // Stage redirect guard: if wastage/final already completed, go back to production list
        if (batchData.wastage_stage?.status === 'completed' || batchData.final_stage?.status === 'completed') {
          const completedBy = batchData.wastage_stage?.completed_by || batchData.final_stage?.completed_by || 'another user';
          toast({
            title: 'Stage Already Completed',
            description: `This batch was already completed by ${completedBy}.`,
          });
          navigate('/production', { replace: true, state: { section: location.state?.section || 'assigned' } });
          return;
        }

        // CRITICAL FIX: Fix stage statuses if inconsistent
        const planningStageStatus = batchData.planning_stage?.status as string | undefined;
        const machineStageStatus = batchData.machine_stage?.status as string | undefined;
        const wastageStageStatus = batchData.wastage_stage?.status as string | undefined;

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

  const handleAssignAfterComplete = async (
    userId: string,
    userName: string,
    selectedTasks: Array<{
      orderId: string;
      orderNumber: string;
      customerName: string;
      productId: string;
      productName: string;
      requiredQuantity: number;
    }>
  ) => {
    if (!selectedTasks || selectedTasks.length === 0) {
      throw new Error('No next-stage order tasks found to assign');
    }

    // Sub-production batch: mark the linked task as completed to notify parent batch owner
    if ((batch!.order_id || '').startsWith('SUB-')) {
      const { data: allTasks } = await ProductionService.getTasks({ limit: 200 });
      const linkedTask = (allTasks || []).find(
        (t) =>
          t.stage_product_id === batch!.product_id &&
          (t.order_id === batch!.order_id || t.order_number === batch!.order_number) &&
          t.parent_batch_id
      );
      if (linkedTask) {
        await ProductionService.updateTaskStatus(linkedTask.id, 'completed');
        await NotificationService.createNotification({
          type: 'success',
          title: 'Sub-Product Ready',
          message: `${batch!.product_name || 'Sub-product'} has been completed. You can now continue planning for the parent batch.`,
          priority: 'high',
          status: 'unread',
          module: 'production',
          related_id: linkedTask.parent_batch_id || linkedTask.id,
          related_data: {
            task_id: linkedTask.id,
            parent_batch_id: linkedTask.parent_batch_id,
            batch_number: batch!.batch_number,
            product_name: batch!.product_name,
          },
        });
      }
      navigate('/notifications');
      return;
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
          notes: `Next-stage task from completed batch ${batch!.batch_number}`,
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
  };

  const handleCompleteProductionMobile = async () => {
    try {
      await handleCompleteProduction();
      const keys = new Set(nextStageTasks.map((t) => `${t.orderId}::${t.productId}`));
      setMobileSelectedTaskKeys(keys);
      setMobileShowForwardDialog(true);
    } catch (error) {
      console.error('Error completing production mobile:', error);
    }
  };

  const handleAssignForwardMobile = async (userId: string, userName: string) => {
    const selected = nextStageTasks.filter((task) => mobileSelectedTaskKeys.has(`${task.orderId}::${task.productId}`));
    try {
      await handleAssignAfterComplete(userId, userName, selected);
      setMobileShowAssignModal(false);
      setMobileShowForwardDialog(false);
      navigate('/production', { state: { section: location.state?.section || 'assigned' } });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to forward tasks',
        variant: 'destructive',
      });
    }
  };

  const handleSaveMaterialWasteMobile = async (material: any) => {
    const materialId = material.material_id;
    const data = mobileFormData[materialId] || { quantity: '', waste_type: '', waste_category: 'disposable', notes: '', noWastage: false };
    
    if (data.noWastage) {
      handleMarkNoWastage(materialId);
      setExpandedMaterialId(null);
      return;
    }

    const qty = parseFloat(data.quantity);
    if (!data.quantity || isNaN(qty) || qty <= 0) {
      toast({ title: 'Validation Error', description: 'Please enter a valid waste quantity', variant: 'destructive' });
      return;
    }

    if (!data.waste_type) {
      toast({ title: 'Validation Error', description: 'Please select a waste type', variant: 'destructive' });
      return;
    }

    setSavingMobileWasteId(materialId);
    try {
      const token = localStorage.getItem('auth_token');
      const API_URL_BASE = getApiUrl();
      const wasteData = {
        production_batch_id: id,
        batch_id: id,
        product_id: batch?.product_id || '',
        product_name: batch?.product_name || 'Unknown Product',
        material_id: material.material_id,
        material_name: material.material_name,
        material_type: material.material_type,
        waste_type: data.waste_type,
        quantity: qty,
        unit: material.unit,
        waste_category: data.waste_category,
        can_be_reused: data.waste_category === 'reusable',
        notes: data.notes,
        status: 'generated',
        reason: data.notes || 'Waste generated during production',
        generation_date: new Date().toISOString(),
      };

      const res = await fetch(`${API_URL_BASE}/production/waste`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(wasteData),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to record waste');
      }

      toast({ title: 'Success', description: 'Waste item created successfully' });
      
      // Clear form
      setMobileFormData(prev => ({
        ...prev,
        [materialId]: { quantity: '', waste_type: '', waste_category: 'disposable', notes: '', noWastage: false }
      }));
      setExpandedMaterialId(null);

      // Remove from noWastageMaterials since actual waste is now recorded
      setNoWastageMaterials(prev => {
        const next = new Set(prev);
        next.delete(materialId);
        return next;
      });
      
      // Refresh
      handleRefresh();
      handleWasteUpdated();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create waste item',
        variant: 'destructive',
      });
    } finally {
      setSavingMobileWasteId(null);
    }
  };

  const handleSaveMobileAddWaste = async () => {
    if (!mobileAddWasteForm.material_id) {
      toast({ title: 'Validation Error', description: 'Please select a material', variant: 'destructive' });
      return;
    }
    const qty = parseFloat(mobileAddWasteForm.quantity);
    if (!mobileAddWasteForm.quantity || isNaN(qty) || qty <= 0) {
      toast({ title: 'Validation Error', description: 'Please enter a valid quantity', variant: 'destructive' });
      return;
    }
    if (!mobileAddWasteForm.waste_type) {
      toast({ title: 'Validation Error', description: 'Please select a waste type', variant: 'destructive' });
      return;
    }

    setUpdatingStatus(true);
    try {
      const token = localStorage.getItem('auth_token');
      const API_URL_BASE = getApiUrl();
      const res = await fetch(`${API_URL_BASE}/production/waste`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          production_batch_id: id,
          batch_id: id,
          product_id: batch?.product_id || '',
          product_name: batch?.product_name || 'Unknown Product',
          material_id: mobileAddWasteForm.material_id,
          material_name: mobileAddWasteForm.material_name,
          material_type: mobileAddWasteForm.material_type,
          waste_type: mobileAddWasteForm.waste_type,
          quantity: qty,
          unit: mobileAddWasteForm.unit,
          waste_category: mobileAddWasteForm.waste_category,
          can_be_reused: mobileAddWasteForm.waste_category === 'reusable',
          notes: mobileAddWasteForm.notes,
          status: 'generated',
          reason: mobileAddWasteForm.notes || 'Waste generated during production',
          generation_date: new Date().toISOString(),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to record waste');
      }

      toast({
        title: 'Success',
        description: `Successfully logged ${qty} ${mobileAddWasteForm.unit} waste for ${mobileAddWasteForm.material_name}`,
      });

      setShowMobileAddWasteDialog(false);
      setMobileAddWasteForm({
        material_id: '',
        material_name: '',
        material_type: 'raw_material',
        quantity: '',
        unit: '',
        waste_type: '',
        waste_category: 'disposable',
        notes: '',
      });
      handleRefresh();
      handleWasteUpdated();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save waste',
        variant: 'destructive',
      });
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleSaveMobileAddExcess = async () => {
    if (!mobileAddExcessForm.material_id) {
      toast({ title: 'Validation Error', description: 'Please select a material', variant: 'destructive' });
      return;
    }
    const qty = parseFloat(mobileAddExcessForm.quantity);
    if (!mobileAddExcessForm.quantity || isNaN(qty) || qty <= 0) {
      toast({ title: 'Validation Error', description: 'Please enter a valid quantity', variant: 'destructive' });
      return;
    }

    setUpdatingStatus(true);
    try {
      const token = localStorage.getItem('auth_token');
      const API_URL_BASE = getApiUrl();
      const res = await fetch(`${API_URL_BASE}/material-consumption`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          production_batch_id: id,
          material_id: mobileAddExcessForm.material_id,
          material_name: mobileAddExcessForm.material_name,
          material_type: mobileAddExcessForm.material_type,
          quantity_used: qty,
          actual_consumed_quantity: qty,
          unit: mobileAddExcessForm.unit,
          deduct_now: true,
          notes: `Excess usage: ${qty} ${mobileAddExcessForm.unit} more than planned`,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save excess');
      }

      toast({
        title: 'Success',
        description: `Successfully recorded ${qty} ${mobileAddExcessForm.unit} extra used for ${mobileAddExcessForm.material_name}`,
      });

      setShowMobileAddExcessDialog(false);
      setMobileAddExcessForm({
        material_id: '',
        material_name: '',
        material_type: 'raw_material',
        quantity: '',
        unit: '',
      });
      handleRefresh();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save excess',
        variant: 'destructive',
      });
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

  const productMaterials: any[] = consumedMaterials.filter(
    (m) => m.material_type === 'product' || (m.material_id && m.material_id.startsWith('PRO-'))
  );
  const rawMaterials: any[] = consumedMaterials.filter(
    (m) => !(m.material_type === 'product' || (m.material_id && m.material_id.startsWith('PRO-')))
  );
  const plannedQty = batch?.planned_quantity || 0;
  const totalWasteQty = wasteItems.reduce((sum, w) => sum + Number(w.quantity || 0), 0);
  const reusableQty = wasteItems.reduce((sum, w) => sum + (w.waste_category === 'reusable' ? Number(w.quantity || 0) : 0), 0);

  return (
    <Layout>
      {/* Desktop View */}
      <div className="hidden lg:block space-y-6 min-h-0 pb-8">
        <WastageStageHeader
          batch={batch}
          onBack={() => {
            navigate('/production', { state: { section: location.state?.section || 'assigned' } });
          }}
          onCompleteProduction={handleCompleteProduction}
          onAssignAfterComplete={handleAssignAfterComplete}
          onDoneAfterComplete={() => navigate('/production', { state: { section: location.state?.section || 'assigned' } })}
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
                      <p className="text-xs text-gray-550">
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
                      <span className="text-xs text-gray-550 w-8">{m.unit}</span>
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

      {/* Mobile View */}
      <div className="lg:hidden space-y-4 pb-28 bg-gray-50 min-h-screen -mx-4 -my-6 p-4">
        {/* Mobile Header */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-10 px-4 py-3 flex items-center justify-between shadow-sm -mx-4 -mt-4 mb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/production', { state: { section: location.state?.section || 'assigned' } })}
              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-600"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-sm font-bold text-gray-900 leading-tight">
                {batch?.batch_number || 'Wastage Stage'}
              </h1>
              <p className="text-[10px] text-gray-500 font-semibold truncate max-w-[150px]">
                {product?.name || batch?.product_name || '—'}
              </p>
            </div>
          </div>
          <span className="text-[10px] font-extrabold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full uppercase shrink-0">
            Wastage
          </span>
        </div>

        {/* Stepper Progress */}
        <div className="bg-white rounded-xl border border-gray-150 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-xs text-gray-550 font-medium">Stage Progress</span>
            <span className="text-xs text-amber-700 font-bold bg-amber-50 px-2.5 py-0.5 rounded-full">
              4. Wastage Stage
            </span>
          </div>
          <div className="grid grid-cols-4 gap-1.5 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="bg-amber-500 rounded-full" />
            <div className="bg-amber-500 rounded-full" />
            <div className="bg-amber-500 rounded-full" />
            <div className="bg-amber-500 rounded-full animate-pulse" />
          </div>
          <div className="flex justify-between text-[9px] text-gray-400 mt-2 font-semibold">
            <span className="text-amber-600 font-medium">Planning</span>
            <span className="text-amber-600 font-medium">Machine</span>
            <span className="text-amber-600 font-medium">Details</span>
            <span className="text-amber-700 font-bold">Wastage</span>
          </div>
        </div>

        {/* Product Info Strip */}
        {(product || batch) && (
          <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl p-3.5 text-xs text-blue-750 font-bold shadow-sm cursor-pointer">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shrink-0">
              <Package className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-blue-900 truncate text-xs font-extrabold leading-tight">
                {product?.name || batch?.product_name || '—'}
              </h4>
              <p className="text-[10px] text-blue-600 font-semibold mt-1 flex flex-wrap gap-x-1.5 items-center">
                {product?.weight && <span>GSM: {product.weight}</span>}
                {product?.width && <span>· W: {product.width} {product.width_unit || 'ft'}</span>}
                {product?.length && <span>· L: {product.length} {product.length_unit || 'ft'}</span>}
                {product?.color && <span>· Color: {product.color}</span>}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-xs font-extrabold text-blue-900 leading-tight">{plannedQty}</p>
              <p className="text-[9px] text-blue-500 font-bold uppercase mt-0.5">Planned</p>
            </div>
          </div>
        )}

        {/* Stats Row */}
        {wasteItems.length > 0 && (
          <div className="grid grid-cols-3 gap-2 bg-white rounded-xl border border-gray-150 p-3 shadow-sm">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1">
                <Trash2 className="w-3.5 h-3.5 text-orange-500" />
                <p className="text-sm font-extrabold text-gray-800 leading-tight">
                  {totalWasteQty.toFixed(2)}
                </p>
              </div>
              <p className="text-[9px] text-gray-400 font-bold uppercase mt-0.5">Total Waste</p>
            </div>
            <div className="text-center border-l border-gray-100">
              <div className="flex items-center justify-center gap-1">
                <RefreshCw className="w-3.5 h-3.5 text-green-600" />
                <p className="text-sm font-extrabold text-green-600 leading-tight">
                  {reusableQty.toFixed(2)}
                </p>
              </div>
              <p className="text-[9px] text-gray-400 font-bold uppercase mt-0.5">Reusable</p>
            </div>
            <div className="text-center border-l border-gray-100">
              <div className="flex items-center justify-center gap-1">
                <XCircle className="w-3.5 h-3.5 text-red-600" />
                <p className="text-sm font-extrabold text-red-600 leading-tight">
                  {(totalWasteQty - reusableQty).toFixed(2)}
                </p>
              </div>
              <p className="text-[9px] text-gray-400 font-bold uppercase mt-0.5">Disposable</p>
            </div>
          </div>
        )}

        {/* Product Materials (Leftover suggests) */}
        {productMaterials.length > 0 && (
          <div className="space-y-2.5">
            <div className="flex items-center gap-2 px-0.5">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Product Materials</span>
              <span className="text-[9px] font-extrabold bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full uppercase">
                AUTO-SUGGEST
              </span>
            </div>

            {productMaterials.map((material: any, idx: number) => {
              const materialId = material.material_id;
              const expanded = expandedMaterialId === materialId;
              const existingWaste = wasteItems.filter(w => w.material_id === materialId);
              const hasWaste = existingWaste.length > 0;
              const consumed = Number(material.actual_consumed_quantity ?? material.quantity_used ?? 0);
              const required = Number(material.required_quantity ?? consumed);
              const excess = consumed - required;
              const leftover = Math.max(0, Math.ceil(consumed) - consumed);

              const formData = mobileFormData[materialId] || { quantity: leftover > 0 ? leftover.toFixed(2) : '', waste_type: '', waste_category: 'disposable', notes: '', noWastage: false };

              return (
                <div key={materialId || idx} className={`bg-white border rounded-xl p-3.5 space-y-3.5 shadow-sm border-gray-150`}>
                  {/* Card Header clickable */}
                  <div
                    onClick={() => setExpandedMaterialId(expanded ? null : materialId)}
                    className="flex items-center justify-between gap-2 cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600 shrink-0">
                        <Package className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-bold text-gray-800 truncate max-w-[170px]">{material.material_name}</h4>
                        <p className="text-[10px] text-gray-400 font-semibold mt-0.5 flex flex-wrap gap-x-2">
                          <span>Consumed: <span className="text-gray-700 font-bold">{consumed.toFixed(2)} {material.unit}</span></span>
                          {required > 0 && required !== consumed && (
                            <span>Planned: <span className="text-gray-500 font-semibold">{required.toFixed(2)}</span></span>
                          )}
                          {excess > 0.001 && <span className="text-red-600 font-bold">+{excess.toFixed(2)} excess</span>}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {hasWaste && (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-green-50 text-green-700 border border-green-200">
                          Recorded
                        </span>
                      )}
                      {hasNoWastageSelected(materialId) && (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200">
                          No Waste
                        </span>
                      )}
                      {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                    </div>
                  </div>

                  {/* Leftover Tip */}
                  {leftover > 0 && (
                    <div className="bg-purple-50/50 border border-purple-150 rounded-lg px-2.5 py-1.5 text-[10px] text-purple-700 font-bold flex items-center gap-1">
                      <Info className="w-3.5 h-3.5 text-purple-600" />
                      <span>Fractional leftover suggestion: {leftover.toFixed(2)} {material.unit}</span>
                    </div>
                  )}

                  {/* Existing Waste Logs */}
                  {hasWaste && (
                    <div className="border-t border-gray-100 pt-2 space-y-1.5">
                      {existingWaste.map((w, i) => (
                        <div key={w.id || i} className="flex items-center justify-between bg-gray-50 border border-gray-150 rounded-lg px-2.5 py-2 text-xs">
                          <div>
                            <p className="font-bold text-gray-800">{Number(w.quantity).toFixed(2)} {w.unit}</p>
                            <p className="text-[10px] text-gray-500 font-semibold capitalize mt-0.5">{w.waste_type.replace(/_/g, ' ')}</p>
                          </div>
                          <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${w.waste_category === 'reusable' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                            {w.waste_category === 'reusable' ? 'Reusable' : 'Disposable'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Collapsible Form */}
                  {expanded && (
                    <div className="border-t border-gray-100 pt-3 space-y-3">
                      {/* No wastage toggle */}
                      <button
                        onClick={() => {
                          const updated = !formData.noWastage;
                          setMobileFormData(prev => ({
                            ...prev,
                            [materialId]: { ...formData, noWastage: updated }
                          }));
                          if (!updated) {
                            setNoWastageMaterials(prev => {
                              const next = new Set(prev);
                              next.delete(materialId);
                              return next;
                            });
                          }
                        }}
                        className={`w-full flex items-center gap-2.5 rounded-xl p-3 border text-xs font-bold transition-all ${
                          formData.noWastage
                            ? 'bg-green-50 border-green-300 text-green-800'
                            : 'bg-gray-50 border-gray-200 text-gray-700'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${formData.noWastage ? 'bg-green-600 border-green-600 text-white' : 'bg-white border-gray-300'}`}>
                          {formData.noWastage && <CheckCircle className="w-3 h-3 text-white" />}
                        </div>
                        <span>No wastage for this material</span>
                      </button>

                      {!formData.noWastage && (
                        <>
                          {/* Qty Input with auto-fill suggestion */}
                          <div className="space-y-1.5">
                            <span className="block text-[10px] font-extrabold text-gray-500 uppercase px-0.5">Waste Qty ({material.unit})</span>
                            <div className="flex gap-2">
                              <Input
                                type="number"
                                step="0.01"
                                placeholder={`0.00 ${material.unit}`}
                                value={formData.quantity}
                                onChange={(e) => setMobileFormData(prev => ({
                                  ...prev,
                                  [materialId]: { ...formData, quantity: e.target.value }
                                }))}
                                className="h-10 text-sm flex-1 font-bold"
                              />
                              {leftover > 0 && (
                                <button
                                  onClick={() => setMobileFormData(prev => ({
                                    ...prev,
                                    [materialId]: { ...formData, quantity: leftover.toFixed(2) }
                                  }))}
                                  className="px-3 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 font-bold text-xs rounded-xl transition-colors"
                                >
                                  Auto-fill Leftover
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Waste Type Picker */}
                          <div className="space-y-1.5">
                            <span className="block text-[10px] font-extrabold text-gray-500 uppercase px-0.5">Waste Type *</span>
                            <div className="flex flex-wrap gap-2 py-1">
                              {wasteTypes.length === 0 ? (
                                <p className="text-[10px] text-gray-400 italic">No waste types configured</p>
                              ) : (
                                wasteTypes.map((type) => {
                                  const isSelected = formData.waste_type === type;
                                  return (
                                    <button
                                      key={type}
                                      onClick={() => setMobileFormData(prev => ({
                                        ...prev,
                                        [materialId]: { ...formData, waste_type: type }
                                      }))}
                                      type="button"
                                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                                        isSelected
                                          ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                                          : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                                      }`}
                                    >
                                      {type.replace(/_/g, ' ')}
                                    </button>
                                  );
                                })
                              )}
                            </div>
                          </div>

                          {/* Waste Category Switch */}
                          <div className="space-y-1.5">
                            <span className="block text-[10px] font-extrabold text-gray-500 uppercase px-0.5">Category</span>
                            <div className="grid grid-cols-2 gap-2">
                              {[
                                { value: 'reusable', label: 'Reusable', activeClass: 'bg-green-50 border-green-300 text-green-700', inactiveClass: 'bg-white border-gray-200 text-gray-500' },
                                { value: 'disposable', label: 'Disposable', activeClass: 'bg-red-50 border-red-200 text-red-700', inactiveClass: 'bg-white border-gray-200 text-gray-500' }
                              ].map(cat => {
                                const active = formData.waste_category === cat.value;
                                return (
                                  <button
                                    key={cat.value}
                                    onClick={() => setMobileFormData(prev => ({
                                      ...prev,
                                      [materialId]: { ...formData, waste_category: cat.value }
                                    }))}
                                    className={`py-2 border text-xs font-extrabold rounded-xl transition-all ${active ? cat.activeClass : cat.inactiveClass}`}
                                  >
                                    {cat.label}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Notes */}
                          <div className="space-y-1.5">
                            <span className="block text-[10px] font-extrabold text-gray-500 uppercase px-0.5">Notes (optional)</span>
                            <Input
                              placeholder="Reason or log notes..."
                              value={formData.notes}
                              onChange={(e) => setMobileFormData(prev => ({
                                ...prev,
                                [materialId]: { ...formData, notes: e.target.value }
                              }))}
                              className="h-10 text-xs"
                            />
                          </div>
                        </>
                      )}

                      {/* Save Button */}
                      <Button
                        onClick={() => handleSaveMaterialWasteMobile(material)}
                        disabled={savingMobileWasteId === materialId}
                        className={`w-full py-4 text-xs font-bold text-white rounded-xl shadow flex items-center justify-center gap-1.5 ${
                          formData.noWastage ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'
                        }`}
                      >
                        {savingMobileWasteId === materialId ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                            <span>Saving...</span>
                          </>
                        ) : (
                          <>
                            <Save className="w-3.5 h-3.5" />
                            <span>{formData.noWastage ? 'Confirm No Wastage' : 'Save Wastage Record'}</span>
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Raw Materials Section */}
        {rawMaterials.length > 0 && (() => {
          const groupedRawMaterials: any[] = rawMaterials.reduce((acc: any[], current: any) => {
            const existing = acc.find(item => item.material_id === current.material_id);
            const consumedQty = Number(current.actual_consumed_quantity ?? current.quantity_used ?? 0);
            const requiredQty = Number(current.required_quantity ?? consumedQty);

            if (existing) {
              existing.actual_consumed_quantity += consumedQty;
              existing.required_quantity += requiredQty;
            } else {
              acc.push({
                ...current,
                actual_consumed_quantity: consumedQty,
                required_quantity: requiredQty,
              });
            }
            return acc;
          }, []);

          return (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between px-0.5">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Raw Materials Consumed</span>
                <span className="text-[9px] font-extrabold bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full uppercase">
                  GIVEN IN BATCH
                </span>
              </div>

              <div className="space-y-3">
                {groupedRawMaterials.map((material: any, idx: number) => {
                  const materialId = material.material_id;
                  const existingWaste = wasteItems.filter(w => w.material_id === materialId);
                  const hasWaste = existingWaste.length > 0;
                  const consumed = Number(material.actual_consumed_quantity);
                  const required = Number(material.required_quantity);
                  const excess = consumed - required;

                  return (
                    <div key={materialId || idx} className="bg-white border border-gray-150 rounded-xl p-3.5 space-y-3 shadow-sm">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center text-orange-600 shrink-0">
                            <Layers className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-sm font-bold text-gray-800 truncate max-w-[170px]">{material.material_name}</h4>
                            <p className="text-[10px] text-gray-400 font-semibold mt-0.5 flex flex-wrap gap-x-2">
                              <span>Consumed: <span className="text-gray-700 font-bold">{consumed.toFixed(2)} {material.unit}</span></span>
                              {required > 0 && required !== consumed && (
                                <span>Planned: <span className="text-gray-500 font-semibold">{required.toFixed(2)}</span></span>
                              )}
                              {excess > 0.001 && (
                                <span className="text-red-600 font-bold">+{excess.toFixed(2)} excess</span>
                              )}
                            </p>
                          </div>
                        </div>
                        {hasWaste && (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-green-50 text-green-700 border border-green-200 shrink-0">
                            Recorded
                          </span>
                        )}
                      </div>

                      {hasWaste && (
                        <div className="border-t border-gray-100 pt-2 space-y-1.5">
                          <p className="text-[9px] font-extrabold text-gray-450 uppercase">Logged Waste:</p>
                          {existingWaste.map((w, i) => (
                            <div key={w.id || i} className="flex items-center justify-between bg-gray-50 border border-gray-150 rounded-lg px-2.5 py-1.5 text-[11px]">
                              <div>
                                <p className="font-bold text-gray-800">{Number(w.quantity).toFixed(2)} {w.unit}</p>
                                <p className="text-[9px] text-gray-500 font-semibold capitalize">{w.waste_type.replace(/_/g, ' ')}</p>
                              </div>
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${w.waste_category === 'reusable' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                                {w.waste_category === 'reusable' ? 'Reusable' : 'Disposable'}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <Button
                          onClick={() => {
                            setMobileAddWasteForm({
                              material_id: material.material_id,
                              material_name: material.material_name,
                              material_type: 'raw_material',
                              quantity: '',
                              unit: material.unit || '',
                              waste_type: '',
                              waste_category: 'disposable',
                              notes: '',
                            });
                            setShowMobileAddWasteDialog(true);
                          }}
                          variant="outline"
                          className="h-9 border-orange-200 bg-orange-50/30 text-orange-700 hover:bg-orange-50 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-orange-600" />
                          Log Waste
                        </Button>

                        <Button
                          onClick={() => {
                            setMobileAddExcessForm({
                              material_id: material.material_id,
                              material_name: material.material_name,
                              material_type: 'raw_material',
                              quantity: '',
                              unit: material.unit || '',
                            });
                            setShowMobileAddExcessDialog(true);
                          }}
                          variant="outline"
                          className="h-9 border-amber-200 bg-amber-50/30 text-amber-700 hover:bg-amber-100 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5"
                        >
                          <Plus className="w-3.5 h-3.5 text-amber-600" />
                          Record Extra
                        </Button>
                      </div>
                    </div>
                  );
                })}

                <Button
                  onClick={() => {
                    setMobileAddWasteForm({
                      material_id: '',
                      material_name: '',
                      material_type: 'raw_material',
                      quantity: '',
                      unit: '',
                      waste_type: '',
                      waste_category: 'disposable',
                      notes: '',
                    });
                    setShowMobileAddWasteDialog(true);
                  }}
                  variant="outline"
                  className="w-full py-5 border-dashed border-gray-300 hover:border-blue-500 hover:bg-blue-50/30 text-gray-500 hover:text-blue-600 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  Log Waste for Other Material
                </Button>
              </div>
            </div>
          );
        })()}

        {/* All Wastage Records Summary */}
        {wasteItems.length > 0 && (
          <div className="space-y-2.5">
            <span className="block text-xs font-bold text-gray-500 uppercase tracking-wider px-0.5">
              All Wastage Records ({wasteItems.length})
            </span>
            <div className="bg-white border border-gray-150 rounded-xl overflow-hidden divide-y divide-gray-100 shadow-sm">
              {wasteItems.map((w, i) => (
                <div key={w.id || i} className="p-3.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-gray-50 border border-gray-150 flex items-center justify-center text-gray-400 shrink-0">
                      <Trash2 className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <h5 className="text-xs font-bold text-gray-800 truncate max-w-[170px]">{w.material_name}</h5>
                      <p className="text-[10px] text-gray-500 font-semibold mt-0.5">
                        {Number(w.quantity).toFixed(2)} {w.unit} · <span className="capitalize">{w.waste_type.replace(/_/g, ' ')}</span>
                      </p>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase shrink-0 ${w.waste_category === 'reusable' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                    {w.waste_category === 'reusable' ? 'Reusable' : 'Disposable'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sticky Bottom Complete Button Footer */}
        <div className="fixed bottom-16 left-0 right-0 bg-white border-t border-gray-200 p-3 z-20 shadow-lg flex flex-col gap-2">
          {!canNavigate && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-50 border border-yellow-200 rounded-xl text-yellow-800 text-[10px] font-bold">
              <AlertTriangle className="w-3.5 h-3.5 text-yellow-600 shrink-0" />
              <span>Please select wastage or mark "No Wastage" for all product materials.</span>
            </div>
          )}
          <Button
            onClick={handleCompleteProductionMobile}
            disabled={!canNavigate || updatingStatus}
            className="w-full bg-green-600 hover:bg-green-700 text-white disabled:opacity-40 font-bold py-5 rounded-xl text-sm flex items-center justify-center gap-2 shadow-md"
          >
            {updatingStatus ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Completing...</span>
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 text-white" />
                <span>Complete Production</span>
              </>
            )}
          </Button>
        </div>
      </div>



      {/* Mobile Forward Dialog */}
      <Dialog open={mobileShowForwardDialog} onOpenChange={setMobileShowForwardDialog}>
        <DialogContent className="fixed bottom-0 top-auto left-0 right-0 translate-x-0 translate-y-0 max-w-full lg:left-[50%] lg:top-[50%] lg:translate-x-[-50%] lg:translate-y-[-50%] lg:max-w-sm rounded-t-3xl lg:rounded-2xl border-t border-x-0 border-b-0 lg:border border-gray-200 bg-white shadow-2xl duration-300 animate-in slide-in-from-bottom">
          <div className="flex justify-center -mt-2 mb-2 shrink-0 lg:hidden">
            <div className="w-10 h-1 rounded-full bg-gray-200" />
          </div>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              Production Completed!
            </DialogTitle>
          </DialogHeader>
          {(batch.order_id || '').startsWith('SUB-') ? (
            <>
              <p className="text-sm text-gray-600">
                This is a sub-production batch. Notify the parent batch owner that <strong>{batch.product_name || 'Sub-product'}</strong> is ready so they can continue their production.
              </p>
              <div className="rounded-md border border-green-100 bg-green-50 px-2.5 py-2 text-xs text-green-800">
                <span className="font-semibold">{batch.product_name || 'Sub-product'}</span> completed. Click "Notify Parent" to let the main batch owner know they can continue.
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-gray-600">
                Do you want to assign next-stage work for attached orders to another user?
              </p>
              <div className="rounded-md border border-green-100 bg-green-50 px-2.5 py-2 text-xs text-green-800">
                Current stage <span className="font-semibold">{batch.product_name || 'This product'}</span> is completed. Select remaining next-stage items to assign.
              </div>
              {nextStageTasks.length > 0 && (
                <div className="max-h-44 overflow-y-auto border rounded-xl p-2 bg-gray-50 text-xs text-gray-700 space-y-1">
                  {nextStageTasks.map((task, index) => {
                    const key = `${task.orderId}::${task.productId}`;
                    const checked = mobileSelectedTaskKeys.has(key);
                    return (
                      <label
                        key={`${task.orderId}-${task.productId}-${index}`}
                        className={`flex items-start gap-2 rounded-lg border px-2 py-1.5 cursor-pointer ${
                          checked ? 'bg-blue-50 border-blue-200 text-blue-900 font-bold' : 'bg-white border-gray-200'
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="mt-0.5 text-blue-600 rounded"
                          checked={checked}
                          onChange={(e) => {
                            setMobileSelectedTaskKeys((prev) => {
                              const next = new Set(prev);
                              if (e.target.checked) next.add(key);
                              else next.delete(key);
                              return next;
                            });
                          }}
                        />
                        <span>
                          <span className="font-bold">{task.orderNumber}</span> · {task.customerName} · {task.productName} · Qty: {task.requiredQuantity}
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
            </>
          )}
          <DialogFooter className="flex flex-row gap-2 mt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                setMobileShowForwardDialog(false);
                navigate('/production', { state: { section: location.state?.section || 'assigned' } });
              }}
            >
              No, Skip
            </Button>
            <Button
              onClick={async () => {
                setMobileShowForwardDialog(false);
                if ((batch.order_id || '').startsWith('SUB-')) {
                  await handleAssignForwardMobile('system', 'system');
                } else {
                  setMobileShowAssignModal(true);
                }
              }}
              disabled={(batch.order_id || '').startsWith('SUB-') ? false : (nextStageTasks.length === 0 || mobileSelectedTaskKeys.size === 0)}
              className="flex-[2] bg-blue-600 hover:bg-blue-700 text-white gap-2"
            >
              <UserPlus className="w-4 h-4" />
              {(batch.order_id || '').startsWith('SUB-') ? 'Notify Parent' : 'Yes, Forward'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mobile Assign User Modal */}
      <AssignUserModal
        open={mobileShowAssignModal}
        onClose={() => setMobileShowAssignModal(false)}
        onAssign={handleAssignForwardMobile}
        title="Assign Next-Stage Tasks"
        description="Select user who will handle the next stage tasks for attached orders."
        confirmLabel="Assign Tasks"
        extraContent={
          nextStageTasks.length > 0 ? (
            <div className="rounded-xl border border-blue-150 bg-blue-50 p-3 text-xs text-blue-900 max-h-40 overflow-y-auto space-y-1">
              {nextStageTasks
                .filter((task) => mobileSelectedTaskKeys.has(`${task.orderId}::${task.productId}`))
                .map((task, index) => (
                  <div key={`${task.orderId}-${task.productId}-${index}`} className="font-bold">
                    {task.orderNumber} · {task.productName} · Qty {task.requiredQuantity}
                  </div>
                ))}
            </div>
          ) : undefined
        }
      />

      {/* Mobile Raw Material Selector Sheet */}
      <Dialog open={showMobileMaterialPicker} onOpenChange={setShowMobileMaterialPicker}>
        <DialogContent className="fixed bottom-0 top-auto left-0 right-0 translate-x-0 translate-y-0 max-w-full lg:left-[50%] lg:top-[50%] lg:translate-x-[-50%] lg:translate-y-[-50%] lg:max-w-sm rounded-t-3xl lg:rounded-2xl border-t border-x-0 border-b-0 lg:border border-gray-200 bg-white shadow-2xl duration-300 animate-in slide-in-from-bottom">
          <div className="flex justify-center -mt-2 mb-2 shrink-0 lg:hidden">
            <div className="w-10 h-1 rounded-full bg-gray-200" />
          </div>
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-gray-900">Select Raw Material</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2 max-h-60 overflow-y-auto">
            {rawMaterials.length === 0 ? (
              <p className="text-gray-400 text-center text-sm py-6 font-semibold">No raw materials consumed</p>
            ) : (
              rawMaterials.map((mat) => {
                const isSelected = materialPickerTarget === 'waste'
                  ? mobileAddWasteForm.material_id === mat.material_id
                  : mobileAddExcessForm.material_id === mat.material_id;
                return (
                  <button
                    key={mat.material_id}
                    onClick={() => {
                      if (materialPickerTarget === 'waste') {
                        setMobileAddWasteForm(prev => ({
                          ...prev,
                          material_id: mat.material_id,
                          material_name: mat.material_name,
                          unit: mat.unit,
                        }));
                      } else {
                        setMobileAddExcessForm(prev => ({
                          ...prev,
                          material_id: mat.material_id,
                          material_name: mat.material_name,
                          unit: mat.unit,
                        }));
                      }
                      setShowMobileMaterialPicker(false);
                    }}
                    type="button"
                    className={`w-full text-left px-4 py-3 text-xs font-bold rounded-xl border transition-all flex items-center justify-between ${
                      isSelected
                        ? 'bg-orange-50 text-orange-700 border-orange-300 shadow-sm'
                        : 'bg-white hover:bg-gray-50 border-gray-150 text-gray-800'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Layers className="w-3.5 h-3.5 text-gray-450" />
                      <span>{mat.material_name}</span>
                    </div>
                    {isSelected && (
                      <CheckCircle className="w-4 h-4 text-orange-600 shrink-0" />
                    )}
                  </button>
                );
              })
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" className="w-full h-10 text-xs font-bold rounded-xl" onClick={() => setShowMobileMaterialPicker(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mobile Log Raw Material Waste Dialog */}
      <Dialog open={showMobileAddWasteDialog} onOpenChange={setShowMobileAddWasteDialog}>
        <DialogContent className="fixed bottom-0 top-auto left-0 right-0 translate-x-0 translate-y-0 max-w-full lg:left-[50%] lg:top-[50%] lg:translate-x-[-50%] lg:translate-y-[-50%] lg:max-w-sm rounded-t-3xl lg:rounded-2xl border-t border-x-0 border-b-0 lg:border border-gray-200 bg-white shadow-2xl duration-300 animate-in slide-in-from-bottom">
          <div className="flex justify-center -mt-2 mb-2 shrink-0 lg:hidden">
            <div className="w-10 h-1 rounded-full bg-gray-200" />
          </div>
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-gray-900">Log Raw Material Waste</DialogTitle>
          </DialogHeader>
          <div className="space-y-3.5 py-2">
            {/* Select Material */}
            <div className="space-y-1.5">
              <span className="block text-[10px] font-extrabold text-gray-500 uppercase px-0.5">Material *</span>
              {mobileAddWasteForm.material_id ? (
                <div className="flex items-center gap-2 px-3 py-2 bg-orange-50 border border-orange-200 rounded-xl text-orange-950 font-bold text-xs">
                  <Layers className="w-4 h-4 text-orange-600" />
                  <span>{mobileAddWasteForm.material_name}</span>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setMaterialPickerTarget('waste');
                    setShowMobileMaterialPicker(true);
                  }}
                  type="button"
                  className="w-full h-10 px-3 rounded-xl border border-gray-200 bg-gray-50 flex items-center justify-between text-xs font-semibold hover:bg-gray-100 transition-colors"
                >
                  <span className="text-gray-400 font-medium">Select material...</span>
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                </button>
              )}
            </div>

            {/* Waste Quantity */}
            <div className="space-y-1.5">
              <span className="block text-[10px] font-extrabold text-gray-500 uppercase px-0.5">
                Waste Qty {mobileAddWasteForm.unit ? `(${mobileAddWasteForm.unit})` : ''} *
              </span>
              <div className="relative flex items-center">
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={mobileAddWasteForm.quantity}
                  onChange={(e) => setMobileAddWasteForm(prev => ({ ...prev, quantity: e.target.value }))}
                  className="h-11 text-sm font-bold pr-12 rounded-xl focus-visible:ring-orange-500 border-gray-200"
                />
                {mobileAddWasteForm.unit && (
                  <span className="absolute right-3 text-xs font-bold text-gray-400 bg-gray-105 px-2 py-0.5 rounded-md">
                    {mobileAddWasteForm.unit}
                  </span>
                )}
              </div>
            </div>

            {/* Waste Type */}
            <div className="space-y-1.5">
              <span className="block text-[10px] font-extrabold text-gray-500 uppercase px-0.5">Waste Type *</span>
              <div className="flex flex-wrap gap-2 py-1">
                {wasteTypes.length === 0 ? (
                  <p className="text-[10px] text-gray-400 italic">No waste types configured</p>
                ) : (
                  wasteTypes.map((type) => {
                    const isSelected = mobileAddWasteForm.waste_type === type;
                    return (
                      <button
                        key={type}
                        onClick={() => setMobileAddWasteForm(prev => ({ ...prev, waste_type: type }))}
                        type="button"
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                          isSelected
                            ? 'bg-orange-600 border-orange-600 text-white shadow-sm'
                            : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        {type.replace(/_/g, ' ')}
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Waste Category Switch */}
            <div className="space-y-1.5">
              <span className="block text-[10px] font-extrabold text-gray-500 uppercase px-0.5 font-sans">Category</span>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'reusable', label: 'Reusable', activeClass: 'bg-green-600 border-green-600 text-white shadow-sm', inactiveClass: 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100' },
                  { value: 'disposable', label: 'Disposable', activeClass: 'bg-red-600 border-red-600 text-white shadow-sm', inactiveClass: 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100' }
                ].map(cat => {
                  const active = mobileAddWasteForm.waste_category === cat.value;
                  return (
                    <button
                      key={cat.value}
                      onClick={() => setMobileAddWasteForm(prev => ({ ...prev, waste_category: cat.value }))}
                      type="button"
                      className={`py-2 border text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1 ${active ? cat.activeClass : cat.inactiveClass}`}
                    >
                      {cat.value === 'reusable' ? (
                        <RefreshCw className="w-3.5 h-3.5" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                      {cat.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <span className="block text-[10px] font-extrabold text-gray-500 uppercase px-0.5">Notes (optional)</span>
              <Input
                placeholder="Reason or log notes..."
                value={mobileAddWasteForm.notes}
                onChange={(e) => setMobileAddWasteForm(prev => ({ ...prev, notes: e.target.value }))}
                className="h-10 text-xs rounded-xl focus-visible:ring-orange-500 border-gray-200"
              />
            </div>
          </div>
          <DialogFooter className="flex flex-row gap-2.5 mt-4 pt-2 border-t border-gray-100">
            <Button variant="outline" className="flex-1 h-10 text-xs font-bold rounded-xl" onClick={() => {
              setShowMobileAddWasteDialog(false);
              setMobileAddWasteForm({
                material_id: '',
                material_name: '',
                material_type: 'raw_material',
                quantity: '',
                unit: '',
                waste_type: '',
                waste_category: 'disposable',
                notes: '',
              });
            }}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveMobileAddWaste}
              disabled={updatingStatus}
              className="flex-1 h-10 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5"
            >
              {updatingStatus ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Waste</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mobile Record Extra Material Used Dialog */}
      <Dialog open={showMobileAddExcessDialog} onOpenChange={setShowMobileAddExcessDialog}>
        <DialogContent className="fixed bottom-0 top-auto left-0 right-0 translate-x-0 translate-y-0 max-w-full lg:left-[50%] lg:top-[50%] lg:translate-x-[-50%] lg:translate-y-[-50%] lg:max-w-sm rounded-t-3xl lg:rounded-2xl border-t border-x-0 border-b-0 lg:border border-gray-200 bg-white shadow-2xl duration-300 animate-in slide-in-from-bottom">
          <div className="flex justify-center -mt-2 mb-2 shrink-0 lg:hidden">
            <div className="w-10 h-1 rounded-full bg-gray-200" />
          </div>
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-gray-900">Record Extra Material Used</DialogTitle>
          </DialogHeader>
          <div className="space-y-3.5 py-2">
            {/* Select Material */}
            <div className="space-y-1.5">
              <span className="block text-[10px] font-extrabold text-gray-500 uppercase px-0.5">Material *</span>
              {mobileAddExcessForm.material_id ? (
                <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl text-amber-950 font-bold text-xs">
                  <Layers className="w-4 h-4 text-amber-600" />
                  <span>{mobileAddExcessForm.material_name}</span>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setMaterialPickerTarget('excess');
                    setShowMobileMaterialPicker(true);
                  }}
                  type="button"
                  className="w-full h-10 px-3 rounded-xl border border-gray-200 bg-gray-50 flex items-center justify-between text-xs font-semibold hover:bg-gray-100 transition-colors"
                >
                  <span className="text-gray-400 font-medium">Select material...</span>
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                </button>
              )}
            </div>

            {/* Extra Quantity */}
            <div className="space-y-1.5">
              <span className="block text-[10px] font-extrabold text-gray-500 uppercase px-0.5">
                Extra Qty {mobileAddExcessForm.unit ? `(${mobileAddExcessForm.unit})` : ''} *
              </span>
              <div className="relative flex items-center">
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={mobileAddExcessForm.quantity}
                  onChange={(e) => setMobileAddExcessForm(prev => ({ ...prev, quantity: e.target.value }))}
                  className="h-11 text-sm font-bold pr-12 rounded-xl focus-visible:ring-amber-500 border-gray-200"
                />
                {mobileAddExcessForm.unit && (
                  <span className="absolute right-3 text-xs font-bold text-gray-400 bg-gray-105 px-2 py-0.5 rounded-md">
                    {mobileAddExcessForm.unit}
                  </span>
                )}
              </div>
            </div>
          </div>
          <DialogFooter className="flex flex-row gap-2.5 mt-4 pt-2 border-t border-gray-100">
            <Button variant="outline" className="flex-1 h-10 text-xs font-bold rounded-xl" onClick={() => {
              setShowMobileAddExcessDialog(false);
              setMobileAddExcessForm({
                material_id: '',
                material_name: '',
                material_type: 'raw_material',
                quantity: '',
                unit: '',
              });
            }}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveMobileAddExcess}
              disabled={updatingStatus}
              className="flex-1 h-10 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5"
            >
              {updatingStatus ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Recording...</span>
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  <span>Record Extra</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
