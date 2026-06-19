import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, useSearchParams, useParams } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Loader2, Save, AlertCircle, ArrowLeft, Info, Plus, Play, Trash2, HelpCircle, CheckCircle, Factory, Truck, Package, Edit, Boxes, Ruler, Weight, X, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProductionService, type ProductionBatch, type CreateProductionBatchData } from '@/services/productionService';
import { RecipeService } from '@/services/recipeService';
import { MaterialService } from '@/services/materialService';
import { ProductService } from '@/services/productService';
import { AuthService } from '@/services/authService';
import { NotificationService } from '@/services/notificationService';
import { useToast } from '@/hooks/use-toast';
import type { Product } from '@/types/product';
import type { Recipe } from '@/types/recipe';
import { calculateSQM } from '@/utils/sqmCalculator';
import PlanningStageHeader from '@/components/production/planning/PlanningStageHeader';
import ProductionStageProgress from '@/components/production/planning/ProductionStageProgress';
import ProductionOverviewStats from '@/components/production/planning/ProductionOverviewStats';
import ExpectedProductDetails from '@/components/production/planning/ExpectedProductDetails';
import MaterialRequirementsTable from '@/components/production/planning/MaterialRequirementsTable';
import MaterialSelectionDialog from '@/components/production/planning/MaterialSelectionDialog';
import MachineSelectionDialog from '@/components/production/planning/MachineSelectionDialog';
import IndividualProductSelectionDialog from '@/components/production/planning/IndividualProductSelectionDialog';
import ProductionFormDialog from '@/components/production/ProductionFormDialog';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import AssignUserModal from '@/components/production/AssignUserModal';

export default function PlanningStage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { id: routeBatchId } = useParams();
  const { toast } = useToast();
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showMaterialDialog, setShowMaterialDialog] = useState(false);
  const [showMachineDialog, setShowMachineDialog] = useState(false);
  const [showIndividualProductDialog, setShowIndividualProductDialog] = useState(false);
  const [selectedMaterialForIndividual, setSelectedMaterialForIndividual] = useState<{id: string, name: string, required: number} | null>(null);
  const [selectedMachine, setSelectedMachine] = useState<any | null>(null);
  const [formData, setFormData] = useState({
    planned_quantity: 0,
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
    completion_date: '',
    notes: '',
  });
  const [materials, setMaterials] = useState<any[]>([]); // Recipe materials (top section)
  const [consumedMaterials, setConsumedMaterials] = useState<any[]>([]); // Confirmed materials (bottom section)
  const [selectedIndividualProducts, setSelectedIndividualProducts] = useState<Record<string, any[]>>({}); // Store selected individual products per material (top section)
  const [consumedIndividualProducts, setConsumedIndividualProducts] = useState<Record<string, any[]>>({}); // Store individual products for consumed materials (bottom section)
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [recipeModified, setRecipeModified] = useState(false);
  const [draftSaveTimeout, setDraftSaveTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [currentBatchId, setCurrentBatchId] = useState<string | null>(null); // Track current batch ID
  const [currentBatch, setCurrentBatch] = useState<ProductionBatch | null>(null); // Track current batch object
  const [orderQuantityMismatch, setOrderQuantityMismatch] = useState<{ currentOrderQty: number; batchQty: number; orderItemId: string } | null>(null);
  const [syncingQuantity, setSyncingQuantity] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showRemoveMaterialDialog, setShowRemoveMaterialDialog] = useState(false);
  const [materialToRemove, setMaterialToRemove] = useState<{id: string, name: string} | null>(null);
  const [showRemoveConsumptionDialog, setShowRemoveConsumptionDialog] = useState(false);
  const [consumptionToRemove, setConsumptionToRemove] = useState<{id: string, name: string} | null>(null);
  const skipRecalcAfterRemoveRef = useRef(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [mobileHelpOpen, setMobileHelpOpen] = useState(false);

  // Sync quantity inputs for mobile view
  const [mobileQuantityInputs, setMobileQuantityInputs] = useState<Record<string, string>>({});

  const [colorCodeMap, setColorCodeMap] = useState<Record<string, string>>({});
  const [patternImageMap, setPatternImageMap] = useState<Record<string, string>>({});

  useEffect(() => {
    ProductService.getDropdownData()
      .then(data => {
        const cm: Record<string, string> = {};
        (data.colors || []).forEach((c: any) => { if (c?.value && c?.color_code) cm[c.value.toLowerCase()] = c.color_code; });
        setColorCodeMap(cm);
        const pm: Record<string, string> = {};
        (data.patterns || []).forEach((p: any) => { if (p?.value && p?.image_url) pm[p.value.toLowerCase()] = p.image_url; });
        setPatternImageMap(pm);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    setMobileQuantityInputs(prev => {
      const updated = { ...prev };
      materials.forEach((material) => {
        if (!(material.material_id in updated)) {
          updated[material.material_id] = material.quantity_per_sqm === 0 ? '' : Number(material.quantity_per_sqm).toFixed(4);
        }
      });
      consumedMaterials.forEach((material) => {
        if (!(material.material_id in updated)) {
          updated[material.material_id] = material.quantity_per_sqm === 0 ? '' : Number(material.quantity_per_sqm).toFixed(4);
        }
      });
      return updated;
    });
  }, [materials, consumedMaterials]);
  const actorName = (() => {
    try {
      const raw = localStorage.getItem('user');
      if (!raw) return 'User';
      const parsed = JSON.parse(raw);
      return parsed?.full_name || parsed?.email || 'User';
    } catch {
      return 'User';
    }
  })();

  const [subProductionMaterial, setSubProductionMaterial] = useState<{ id: string; name: string } | null>(null);
  const [showSubProductionModal, setShowSubProductionModal] = useState(false);
  const [existingSubTasks, setExistingSubTasks] = useState<Record<string, { assigned_to_name: string; status: string }>>({});

  const getAttachedOrderIdsFromNotes = (notes?: string): string[] => {
    if (!notes) return [];
    const match = notes.match(/Attached Order IDs:\s*(.+?)(?:\s*·|$)/i);
    if (!match?.[1]) return [];
    return Array.from(
      new Set(
        match[1]
          .split(',')
          .map((v) => v.trim())
          .filter(Boolean)
      )
    );
  };

  const getAttachedOrderNumbersFromNotes = (notes?: string): string[] => {
    if (!notes) return [];
    const match = notes.match(/Attached Orders:\s*(.+)$/i);
    if (!match?.[1]) return [];
    const raw = match[1].split('·')[0].trim();
    const orderNos = raw.match(/[A-Z]{2,}-\d{6}-\d{3,}/g) || [];
    return Array.from(new Set(orderNos.map((v) => v.trim()).filter(Boolean)));
  };

  // Check if batchId was passed via query params, path parameters, or product was passed from product selection
  useEffect(() => {
    const queryBatchId = searchParams.get('batchId');
    const batchId = queryBatchId || routeBatchId;
    const productFromState = location.state?.product as Product | undefined;

    if (batchId) {
      loadBatchAndProduct(batchId);
    } else if (productFromState) {
      setSelectedProduct(productFromState);
      loadRecipeAndCalculate(productFromState);
    } else {
      navigate('/production/create');
    }
  }, [location.state, searchParams, routeBatchId, navigate]);

  // Recalculate materials when quantity changes (skip once after remove so we don't overwrite)
  useEffect(() => {
    if (skipRecalcAfterRemoveRef.current) {
      skipRecalcAfterRemoveRef.current = false;
      return;
    }
    if (selectedProduct && recipe && formData.planned_quantity > 0) {
      calculateMaterialRequirements(selectedProduct, recipe, formData.planned_quantity);
    }
  }, [formData.planned_quantity, selectedProduct, recipe]);

  // Debounced draft save whenever materials, consumed materials, or form data change
  useEffect(() => {
    if (!selectedProduct) return;

    if (draftSaveTimeout) {
      clearTimeout(draftSaveTimeout);
    }

    const timeout = setTimeout(() => {
      saveDraftStateToBackend();
    }, 1000);

    setDraftSaveTimeout(timeout);

    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [materials, consumedMaterials, formData, selectedProduct]);

  // Recalculate consumed materials totals when planned quantity changes (keep draft in sync)
  useEffect(() => {
    if (!selectedProduct || consumedMaterials.length === 0) return;

    const productLength = parseFloat(selectedProduct.length || '0');
    const productWidth = parseFloat(selectedProduct.width || '0');
    const lengthUnit = selectedProduct.length_unit || 'm';
    const widthUnit = selectedProduct.width_unit || 'm';
    const sqmPerUnit = calculateSQM(productLength, productWidth, lengthUnit, widthUnit);
    const totalSQM = formData.planned_quantity * sqmPerUnit;
    if (!isFinite(totalSQM) || totalSQM <= 0) return;

    let changed = false;
    const updated = consumedMaterials.map((material) => {
      const qtyPerSqm =
        typeof material.quantity_per_sqm === 'number'
          ? material.quantity_per_sqm
          : totalSQM > 0
            ? (material.required_quantity || 0) / totalSQM
            : 0;

      const newRequired = parseFloat((qtyPerSqm * totalSQM).toFixed(4));
      if (material.required_quantity !== newRequired) {
        changed = true;
        return { ...material, required_quantity: newRequired };
      }
      return material;
    });

    if (changed) {
      setConsumedMaterials(updated);
    }
  }, [formData.planned_quantity, selectedProduct, consumedMaterials]);

  // Auto-save recipe changes so newly added recipe materials are not lost on refresh.
  useEffect(() => {
    if (!selectedProduct) return;
    if (!recipeModified) return;
    if (materials.length === 0) return;

    const timeout = setTimeout(async () => {
      try {
        await updateRecipeInDatabase(materials, true);
        setRecipeModified(false);
      } catch (error) {
        console.error('Auto-save recipe failed:', error);
      }
    }, 1000);

    return () => clearTimeout(timeout);
  }, [recipeModified, materials, selectedProduct]);

  // Send low stock notification to backend for material section
  const sendLowStockNotification = async (material: any) => {
    try {
      // Use already-loaded currentBatch — no extra API call needed
      const batchNumber = currentBatch?.batch_number || currentBatch?.id || currentBatchId || 'New Batch';
      const batchId = currentBatch?.id || currentBatchId;

      const productName = selectedProduct?.name || 'Unknown Product';
      const productId = selectedProduct?.id || '';
      const plannedQty = formData.planned_quantity || 0;
      const productCategory = selectedProduct?.category || '';
      const productSubcategory = selectedProduct?.subcategory || '';
      const productImage = selectedProduct?.image_url || '';

      // Enhanced message with complete production details
      const message = `Production Batch: ${batchNumber}\n` +
        `Product: ${productName}${productId ? ` (${productId})` : ''}\n` +
        `Category: ${productCategory}${productSubcategory ? ` > ${productSubcategory}` : ''}\n` +
        `Planned Quantity: ${plannedQty} units\n\n` +
        `Material Required: ${material.material_name}\n` +
        `Required: ${material.required_quantity.toFixed(4)} ${material.unit}\n` +
        `Available: ${material.available_quantity} ${material.unit}\n` +
        `Shortage: ${material.shortage?.toFixed(2)} ${material.unit}`;

      // Determine module based on material type
      const module = material.material_type === 'product' ? 'products' : 'materials';

      const notification = await NotificationService.createNotification({
        type: 'low_stock',
        title: `Low Stock Alert - Production Planning: ${material.material_name}`,
        message: message,
        priority: 'high',
        status: 'unread',
        module: module,
        related_id: material.material_id,
        related_data: {
          material_id: material.material_id,
          material_name: material.material_name,
          material_type: material.material_type,
          required_quantity: material.required_quantity,
          available_quantity: material.available_quantity,
          shortage: material.shortage,
          unit: material.unit,
          // Production batch details
          batch_id: batchId,
          batch_number: batchNumber,
          product_id: productId,
          product_name: productName,
          product_category: productCategory,
          product_subcategory: productSubcategory,
          product_image: productImage,
          planned_quantity: plannedQty,
        },
      });

      if (notification) {
        console.log(`✅ Low stock notification created successfully:`, {
          id: notification.id,
          module: notification.module,
          status: notification.status,
          type: notification.type
        });
      } else {
        console.error(`❌ Notification creation returned null for ${material.material_name}`);
      }
    } catch (error) {
      console.error(`❌ Failed to send low stock notification for ${material.material_name}:`, error);
    }
  };

  const loadBatchAndProduct = async (batchId: string) => {
    setLoading(true);
    try {
      const { data: batch, error: batchError } = await ProductionService.getBatchById(batchId);
      if (batchError || !batch) {
        toast({ title: 'Error', description: 'Failed to load batch', variant: 'destructive' });
        navigate('/production');
        return;
      }

      // Stage redirect guard: if planning is already done, send user forward
      if (batch.planning_stage?.status === 'completed') {
        navigate(`/production/${batchId}/machine`, { replace: true });
        return;
      }

      const product = await ProductService.getProductById(batch.product_id);
      if (!product) {
        toast({ title: 'Error', description: 'Failed to load product', variant: 'destructive' });
        navigate('/production');
        return;
      }

      setSelectedProduct(product);
      setCurrentBatchId(batch.id); // Store the batch ID
      setCurrentBatch(batch); // Store the batch object

      // Load existing sub-product tasks for this batch so we can show assigned state on material cards
      ProductionService.getTasks({ limit: 100 }).then(({ data }) => {
        if (!data) return;
        const map: Record<string, { assigned_to_name: string; status: string }> = {};
        data
          .filter(t => t.parent_batch_id === batch.id && !['completed', 'cancelled'].includes(t.status))
          .forEach(t => { map[t.stage_product_id] = { assigned_to_name: t.assigned_to_name, status: t.status }; });
        setExistingSubTasks(map);
      }).catch(() => {});

      const completionDate =
        batch.completion_date ? batch.completion_date.split('T')[0] : '';

      setFormData({
        planned_quantity: batch.planned_quantity,
        priority: batch.priority as 'low' | 'medium' | 'high' | 'urgent',
        completion_date: completionDate,
        notes: batch.notes || '',
      });

      // Check if order quantity changed since this batch was created
      if (batch.order_id && batch.order_item_id) {
        try {
          const { OrderService } = await import('@/services/orderService');
          const { data: orderData } = await OrderService.getOrderById(batch.order_id);
          if (orderData) {
            const linkedItem = orderData.items?.find((it: any) => it.id === batch.order_item_id);
            if (linkedItem) {
              const currentOrderQty = Number(linkedItem.quantity || 0);
              const referenceQty = batch.status === 'planned'
                ? batch.planned_quantity
                : (batch.order_quantity_at_creation ?? batch.planned_quantity);
              if (currentOrderQty !== referenceQty) {
                setOrderQuantityMismatch({ currentOrderQty, batchQty: referenceQty, orderItemId: batch.order_item_id });
              }
            }
          }
        } catch { /* ignore */ }
      }

      // If batch is already in production, load consumed materials instead of recipe
      if (batch.status === 'in_production' || batch.status === 'in_progress') {
        // Load consumed materials from MaterialConsumption
        const { data: materialConsumption } = await ProductionService.getMaterialConsumption(batchId);
        if (materialConsumption && materialConsumption.length > 0) {
          // Convert material consumption to consumed materials format
          const consumed = materialConsumption.map((mc: any) => ({
            material_id: mc.material_id,
            material_name: mc.material_name,
            material_type: mc.material_type,
            quantity_per_sqm: mc.quantity_per_sqm || 0,
            required_quantity: mc.quantity_used || mc.required_quantity || 0,
            actual_consumed_quantity: mc.actual_consumed_quantity || mc.quantity_used || 0,
            whole_product_count: mc.whole_product_count || mc.quantity_used || 0,
            unit: mc.unit,
            individual_product_ids: mc.individual_product_ids || [],
            status: 'available' as const,
            available_quantity: 0,
            shortage: 0,
          }));
          setConsumedMaterials(consumed);
          
          // Load individual products for consumed materials
          const individualProductsMap: Record<string, any[]> = {};
          for (const material of consumed) {
            if (material.material_type === 'product' && material.individual_product_ids && material.individual_product_ids.length > 0) {
              try {
                const { IndividualProductService } = await import('@/services/individualProductService');
                const individualProducts = await Promise.all(
                  material.individual_product_ids.map((id: string) =>
                    IndividualProductService.getIndividualProductById(id)
                  )
                );
                individualProductsMap[material.material_id] = individualProducts
                  .filter((ip: any) => ip.data)
                  .map((ip: any) => ip.data);
              } catch (error) {
                console.error(`Error loading individual products for ${material.material_name}:`, error);
              }
            }
          }
          setConsumedIndividualProducts(individualProductsMap);
          
          // Clear materials (recipe) since we're showing consumed materials
          setMaterials([]);
        }
      } else {
        // Batch is still in planning, load recipe and this batch's draft (consumed materials per batch)
        loadRecipeAndCalculate(product, batch.planned_quantity, true, batch.id);
      }
    } catch (error) {
      console.error('Error loading batch:', error);
      toast({ title: 'Error', description: 'Failed to load batch', variant: 'destructive' });
      navigate('/production');
    } finally {
      setLoading(false);
    }
  };

  const loadRecipeAndCalculate = async (product: Product, quantity?: number, forExistingBatch = false, batchId?: string) => {
    setLoading(true);
    try {
      // When batchId provided: load that batch's draft. Otherwise load product-level draft (new batch: form/recipe only).
      const { data: draft } = await ProductionService.getDraftPlanningState(product.id, batchId);

      if (draft?.form_data) {
        setFormData({
          planned_quantity: quantity || draft.form_data.planned_quantity || 0, // Use batch quantity parameter, not draft
          priority: draft.form_data.priority || 'medium',
          completion_date: draft.form_data.completion_date || '',
          notes: draft.form_data.notes || '',
        });
      }
      // Recipe (top section) always comes from product recipe below — never from draft. Same product = same recipe for all batches.
      // Only consumed materials (bottom section) are per batch and restored from draft when editing that batch.
      // Only restore consumed materials from draft when editing an existing batch.
      // For a NEW batch (same product), start with empty consumption so we don't show previous batch's materials.
      if (forExistingBatch && draft?.consumed_materials) {
        setConsumedMaterials(draft.consumed_materials);

        // Load individual products for consumed materials
        const individualProductsMap: Record<string, any[]> = {};
        for (const material of draft.consumed_materials) {
          if (material.material_type === 'product' && material.individual_product_ids && material.individual_product_ids.length > 0) {
            try {
              const { IndividualProductService } = await import('@/services/individualProductService');
              const allProducts: any[] = [];
              // Fetch each individual product by ID
              for (const productId of material.individual_product_ids) {
                try {
                  const product = await IndividualProductService.getIndividualProductById(productId);
                  allProducts.push(product);
                } catch (err) {
                  console.error(`Error loading individual product ${productId}:`, err);
                }
              }
              individualProductsMap[material.material_id] = allProducts;
            } catch (error) {
              console.error(`Error loading individual products for material ${material.material_id}:`, error);
            }
          }
        }
        setConsumedIndividualProducts(individualProductsMap);
      } else {
        setConsumedMaterials([]);
        setConsumedIndividualProducts({});
      }

      const recipeData = await RecipeService.getRecipeByProductId(product.id);

      if (recipeData) {
        setRecipe(recipeData);
        if (quantity && quantity > 0) {
          calculateMaterialRequirements(product, recipeData, quantity);
        } else if (draft?.form_data?.planned_quantity) {
          calculateMaterialRequirements(product, recipeData, draft.form_data.planned_quantity);
        }
      } else {
        setRecipe(null);
        setMaterials([]);
        toast({
          title: 'No Recipe Found',
          description: 'This product does not have a recipe configured.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error loading recipe:', error);
      setRecipe(null);
      setMaterials([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSyncOrderQuantity = async () => {
    if (!orderQuantityMismatch || !currentBatchId) return;
    setSyncingQuantity(true);
    try {
      await ProductionService.updateBatch(currentBatchId, { planned_quantity: orderQuantityMismatch.currentOrderQty });
      setFormData(p => ({ ...p, planned_quantity: orderQuantityMismatch.currentOrderQty }));
      setCurrentBatch(b => b ? { ...b, planned_quantity: orderQuantityMismatch.currentOrderQty } : b);
      setOrderQuantityMismatch(null);
      toast({ title: 'Quantity updated', description: `Planned quantity synced to ${orderQuantityMismatch.currentOrderQty}.` });
    } catch {
      toast({ title: 'Error', description: 'Failed to sync quantity.', variant: 'destructive' });
    } finally {
      setSyncingQuantity(false);
    }
  };

  const calculateMaterialRequirements = async (
    product: Product,
    recipeData: Recipe,
    quantity: number
  ) => {
    if (!recipeData.materials || recipeData.materials.length === 0) {
      setMaterials([]);
      return;
    }

    try {
      const productLength = parseFloat(product.length || '0');
      const productWidth = parseFloat(product.width || '0');
      const lengthUnit = product.length_unit || 'm';
      const widthUnit = product.width_unit || 'm';

      const sqmPerUnit = calculateSQM(productLength, productWidth, lengthUnit, widthUnit);
      const totalSQM = quantity * sqmPerUnit;

      const materialRequirements = (await Promise.all(
        recipeData.materials.map(async (recipeMaterial) => {
          let requiredQuantity = recipeMaterial.quantity_per_sqm * totalSQM;
          let availableQuantity = 0;
          let materialName = recipeMaterial.material_name;
          let unit = recipeMaterial.unit;

          try {
            if (recipeMaterial.material_type === 'raw_material') {
              const material = await MaterialService.getMaterialById(recipeMaterial.material_id);
              const isInk = (material.category || '').toString().toLowerCase().trim() === 'ink' || material.usage_type === 'periodic';
              if (isInk) return null;
              availableQuantity = material.available_stock ?? (material.current_stock || 0);
              materialName = material.name;
              unit = material.unit || recipeMaterial.unit;
            } else if (recipeMaterial.material_type === 'product') {
              const materialProduct = await ProductService.getProductById(recipeMaterial.material_id);

              // For products: use count_unit (e.g., "rolls") for counting, not unit (e.g., "sqm")
              unit = materialProduct.count_unit || 'rolls';

              // For products: quantity_per_sqm represents pieces needed per SQM of parent
              // So required quantity is quantity_per_sqm * totalSQM of parent
              requiredQuantity = recipeMaterial.quantity_per_sqm * totalSQM;

              // Get available individual products count (only status='available')
              if (materialProduct.individual_stock_tracking) {
                const { IndividualProductService } = await import('@/services/individualProductService');
                const { total: availableCount } = await IndividualProductService.getIndividualProductsByProductId(
                  recipeMaterial.material_id,
                  { status: 'available' }
                );
                availableQuantity = availableCount || 0;
              } else {
                // Use available stock from individual_product_stats if available
                availableQuantity = materialProduct.individual_product_stats?.available ?? (materialProduct.current_stock || 0);
              }

              materialName = materialProduct.name;
            }
          } catch (error) {
            console.error(`Error fetching material ${recipeMaterial.material_id}:`, error);
            availableQuantity = 0;
          }

          const shortage = Math.max(0, requiredQuantity - availableQuantity);
          let status: 'available' | 'low' | 'unavailable' = 'available';
          if (shortage > 0) {
            status = availableQuantity === 0 ? 'unavailable' : 'low';
          }

          // For products: calculate actual_consumed_quantity and whole_product_count
          const materialData: any = {
            material_id: recipeMaterial.material_id,
            material_name: materialName,
            material_type: recipeMaterial.material_type,
            quantity_per_sqm: recipeMaterial.quantity_per_sqm,
            required_quantity: requiredQuantity,
            available_quantity: availableQuantity,
            unit: unit,
            status,
            shortage,
          };

          if (recipeMaterial.material_type === 'product') {
            // For products: actual_consumed_quantity = required_quantity (fractional)
            // whole_product_count = Math.ceil(required_quantity) (whole products needed)
            materialData.actual_consumed_quantity = requiredQuantity;
            materialData.whole_product_count = Math.ceil(requiredQuantity);
            materialData.individual_product_ids = []; // Will be populated when user selects individual products
          } else {
            // For raw materials: actual_consumed_quantity = required_quantity
            materialData.actual_consumed_quantity = requiredQuantity;
            materialData.whole_product_count = 0; // Not applicable
            materialData.individual_product_ids = [];
          }

          return materialData;
        })
      )).filter(Boolean);

      setMaterials(materialRequirements);
    } catch (error) {
      console.error('Error calculating material requirements:', error);
      setMaterials([]);
    }
  };

  // Persist draft state (materials + form data) to backend for refresh/other users
  const saveDraftStateToBackend = async () => {
    if (!selectedProduct) return;

    try {
      await ProductionService.saveDraftPlanningState(selectedProduct.id, {
        formData,
        materials,
        consumedMaterials,
        productionBatchId: currentBatchId ?? undefined,
      });
    } catch (error) {
      console.error('Error saving draft state to backend:', error);
    }
  };

  const updateRecipeInDatabase = async (updatedMaterials: any[], silent: boolean = false) => {
    if (!selectedProduct) return;

    try {
      // Prepare payload for backend
      const materialsPayload = updatedMaterials.map((m) => ({
        material_id: m.material_id,
        material_name: m.material_name,
        material_type: m.material_type,
        quantity_per_sqm: m.quantity_per_sqm,
        unit: m.unit,
        cost_per_unit: m.cost_per_unit ?? 0,
        specifications: m.specifications ?? '',
        quality_requirements: m.quality_requirements ?? '',
        is_optional: m.is_optional ?? false,
        waste_factor: m.waste_factor ?? 0,
      }));

      let updatedRecipe: Recipe;

      if (recipe) {
        // Recipe exists - update it
        updatedRecipe = await RecipeService.updateRecipe(recipe.id, { materials: materialsPayload });
        
        // Update local state with a fully-typed RecipeMaterial[]
        updatedRecipe = {
          ...recipe,
          materials: materialsPayload.map((m) => {
            const existing =
              recipe.materials?.find((rm) => rm.material_id === m.material_id);
            return {
              id: existing?.id || `${m.material_id}-temp`,
              recipe_id: recipe.id,
              material_id: m.material_id,
              material_name: m.material_name,
              material_type: m.material_type,
              quantity_per_sqm: m.quantity_per_sqm,
              unit: m.unit,
              cost_per_unit: m.cost_per_unit ?? 0,
              specifications: m.specifications ?? '',
              quality_requirements: m.quality_requirements ?? '',
              is_optional: m.is_optional ?? false,
              waste_factor: m.waste_factor ?? 0,
              total_cost_per_sqm: existing?.total_cost_per_sqm ?? 0,
              created_at: existing?.created_at || new Date().toISOString(),
            };
          }),
        };
      } else {
        // Recipe doesn't exist in state - check if it exists in database first
        const existingRecipe = await RecipeService.getRecipeByProductId(selectedProduct.id);

        if (existingRecipe) {
          // Recipe exists in database, update it
          updatedRecipe = await RecipeService.updateRecipe(existingRecipe.id, {
            materials: materialsPayload,
          });
          setRecipe(existingRecipe); // Update state with existing recipe
        } else {
          // Recipe truly doesn't exist - create it
          updatedRecipe = await RecipeService.createRecipe(selectedProduct.id, {
            materials: materialsPayload,
            description: `Recipe for ${selectedProduct.name}`,
            created_by: 'system',
          });

          // Reload the recipe to get full data with materials
          const loadedRecipe = await RecipeService.getRecipeByProductId(selectedProduct.id);
          if (loadedRecipe) {
            updatedRecipe = loadedRecipe;
          }
        }
      }

      setRecipe(updatedRecipe);

      if (!silent) {
        toast({
          title: recipe ? 'Recipe Updated' : 'Recipe Created',
          description: recipe
            ? 'Recipe has been automatically updated'
            : 'Recipe has been automatically created',
        });
      }
    } catch (error) {
      console.error('Error saving recipe:', error);
      if (!silent) {
        toast({
          title: 'Error',
          description: recipe
            ? 'Failed to update recipe automatically'
            : 'Failed to create recipe automatically',
          variant: 'destructive',
        });
      }
      throw error;
    }
  };

  const handleMaterialSelect = async (selectedMaterials: any[]) => {
    if (!selectedProduct) return;

    const productLength = parseFloat(selectedProduct.length || '0');
    const productWidth = parseFloat(selectedProduct.width || '0');
    const lengthUnit = selectedProduct.length_unit || 'm';
    const widthUnit = selectedProduct.width_unit || 'm';
    const sqmPerUnit = calculateSQM(productLength, productWidth, lengthUnit, widthUnit);
    const totalSQM = formData.planned_quantity * sqmPerUnit;

    const newMaterialsWithCalc = await Promise.all(
      selectedMaterials.map(async (m) => {
        let quantityPerSqm = m.quantity_per_sqm || 0;
        let unit = m.unit;
        let availableQuantity = 0;

        if (m.material_type === 'product') {
          try {
            const childProduct = await ProductService.getProductById(m.material_id);

            // For products: always use 'rolls' as unit (counting individual products)
            unit = 'rolls';

            // Calculate child product's SQM
            const childLength = parseFloat(childProduct.length || '0');
            const childWidth = parseFloat(childProduct.width || '0');
            const childLengthUnit = childProduct.length_unit || 'm';
            const childWidthUnit = childProduct.width_unit || 'm';
            const childSqm = calculateSQM(childLength, childWidth, childLengthUnit, childWidthUnit);

            // Calculate how many pieces are needed per 1 SQM of parent product if not provided
            if (!quantityPerSqm || quantityPerSqm === 0) {
              quantityPerSqm = childSqm > 0 ? 1 / childSqm : 1;
            }

            // Get available quantity for product (only available individual products)
            if (childProduct.individual_stock_tracking) {
              const { IndividualProductService } = await import('@/services/individualProductService');
              const { total: availableCount } = await IndividualProductService.getIndividualProductsByProductId(
                m.material_id,
                { status: 'available' }
              );
              availableQuantity = availableCount || 0;
            } else {
              // Use available stock from individual_product_stats if available
              availableQuantity = childProduct.individual_product_stats?.available ?? (childProduct.current_stock || 0);
            }
          } catch (error) {
            console.error('Error fetching product details for auto-calc:', error);
            if (!quantityPerSqm || quantityPerSqm === 0) {
              quantityPerSqm = 1; // Default
            }
            unit = 'rolls';
            availableQuantity = 0;
          }
        } else if (m.material_type === 'raw_material') {
          try {
            const material = await MaterialService.getMaterialById(m.material_id);
            availableQuantity = material.available_stock ?? (material.current_stock || 0);
            unit = material.unit || m.unit;
          } catch (error) {
            console.error('Error fetching material details:', error);
            availableQuantity = 0;
          }
        }

        // Calculate required quantity and status
        const requiredQuantity = quantityPerSqm * totalSQM;
        const shortage = Math.max(0, requiredQuantity - availableQuantity);
        let status: 'available' | 'low' | 'unavailable' = 'available';
        if (shortage > 0) {
          status = availableQuantity === 0 ? 'unavailable' : 'low';
        }

        const materialData: any = {
          ...m,
          quantity_per_sqm: quantityPerSqm,
          unit,
          required_quantity: requiredQuantity,
          available_quantity: availableQuantity,
          status,
          shortage,
        };

        // For products: calculate actual_consumed_quantity and whole_product_count
        if (m.material_type === 'product') {
          // For products: actual_consumed_quantity = required_quantity (fractional)
          // whole_product_count = Math.ceil(required_quantity) (whole products needed)
          materialData.actual_consumed_quantity = requiredQuantity;
          materialData.whole_product_count = Math.ceil(requiredQuantity);
          materialData.individual_product_ids = m.individual_product_ids || []; // Preserve if already selected
        } else {
          // For raw materials: actual_consumed_quantity = required_quantity
          materialData.actual_consumed_quantity = requiredQuantity;
          materialData.whole_product_count = 0; // Not applicable
          materialData.individual_product_ids = [];
        }

        return materialData;
      })
    );

    const updatedMaterials = [...materials];
    const existingIds = new Set(updatedMaterials.map((m) => m.material_id));
    const toAdd = newMaterialsWithCalc.filter((m) => !existingIds.has(m.material_id));
    const finalMaterials = [...updatedMaterials, ...toAdd];

    setMaterials(finalMaterials);
    setRecipeModified(true); // mark for save on Add to Production
  };

  const handleRemoveMaterial = (materialId: string) => {
    const material = materials.find((m) => m.material_id === materialId);
    
    if (!material) return;
    
    // Check if material exists in saved recipe (for dialog copy)
    
    // Store material info and show confirmation dialog
    setMaterialToRemove({ id: materialId, name: material.material_name });
    setShowRemoveMaterialDialog(true);
  };

  const confirmRemoveMaterial = async () => {
    if (!materialToRemove) return;
    
    const materialId = materialToRemove.id;
    
    // Remove from local materials state
    const updatedMaterials = materials.filter((m) => m.material_id !== materialId);
    setMaterials(updatedMaterials);
    
    // If recipe exists, update it to remove this material from the saved recipe
    if (recipe && selectedProduct) {
      try {
        const currentRecipeMaterials = recipe.materials || [];
        const updatedRecipeMaterials = currentRecipeMaterials.filter(
          (m: any) => m.material_id !== materialId
        );
        
        // Update recipe in database
        await RecipeService.updateRecipe(recipe.id, { 
          materials: updatedRecipeMaterials.map((m: any) => ({
            material_id: m.material_id,
            material_name: m.material_name,
            material_type: m.material_type,
            quantity_per_sqm: m.quantity_per_sqm,
            unit: m.unit,
          }))
        });
        
        // Skip next recalc effect so it doesn't overwrite materials (removing one would otherwise clear all)
        skipRecalcAfterRemoveRef.current = true;
        // Update local recipe state
        setRecipe({
          ...recipe,
          materials: updatedRecipeMaterials,
        });
        
        toast({
          title: 'Material Removed',
          description: `"${materialToRemove.name}" removed from recipe and section`,
        });
      } catch (error) {
        console.error('Error updating recipe after removal:', error);
        toast({
          title: 'Material Removed from Section',
          description: 'Material removed from section, but recipe update failed. Please try again.',
          variant: 'destructive',
        });
      }
    } else {
      // No recipe exists, just remove from section
      toast({
        title: 'Material Removed',
        description: `"${materialToRemove.name}" removed from section`,
      });
    }
    
    setRecipeModified(true); // mark for save on Add to Production
    setShowRemoveMaterialDialog(false);
    setMaterialToRemove(null);
  };

  const handleRemoveMaterialFromDraft = (materialId: string) => {
    // Remove only from consumed/draft materials for this batch (consumption),
    // do NOT touch the recipe materials list.
    const updatedConsumed = consumedMaterials.filter((m) => m.material_id !== materialId);
    setConsumedMaterials(updatedConsumed);

    // Clear any selected individual products for this material
    setSelectedIndividualProducts((prev) => {
      const next = { ...prev };
      delete next[materialId];
      return next;
    });
  };

  const handleUpdateQuantity = (materialId: string, quantityPerSqm: number) => {
    const updatedMaterials = materials.map((m) => {
      if (m.material_id === materialId) {
        const productLength = parseFloat(selectedProduct?.length || '0');
        const productWidth = parseFloat(selectedProduct?.width || '0');
        const lengthUnit = selectedProduct?.length_unit || 'm';
        const widthUnit = selectedProduct?.width_unit || 'm';
        const sqmPerUnit = calculateSQM(productLength, productWidth, lengthUnit, widthUnit);
        const totalSQM = formData.planned_quantity * sqmPerUnit;
        const requiredQuantity = quantityPerSqm * totalSQM;

        return {
          ...m,
          quantity_per_sqm: quantityPerSqm,
          required_quantity: requiredQuantity,
        };
      }
      return m;
    });

    setMaterials(updatedMaterials);
    setRecipeModified(true); // mark for save on Add to Production
  };

  const handleAddToProduction = async () => {
    if (!selectedProduct || formData.planned_quantity <= 0) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a valid quantity',
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

    if (materials.length === 0) {
      toast({
        title: 'Validation Error',
        description: 'Please add materials to production',
        variant: 'destructive',
      });
      return;
    }

    // Validate that all materials have quantity_per_sqm > 0
    const materialsWithZeroQuantity = materials.filter((m) => !m.quantity_per_sqm || m.quantity_per_sqm <= 0);
    if (materialsWithZeroQuantity.length > 0) {
      toast({
        title: 'Validation Error',
        description: `Please enter quantity per sqm (greater than 0) for: ${materialsWithZeroQuantity.map(m => m.material_name).join(', ')}`,
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    try {
      // 1. Persist recipe first (critical for first-time setup and sub-production chain).
      // Always save when:
      // - recipe was modified, OR
      // - no recipe exists yet but user has materials in planning section.
      const mustCreateInitialRecipe = !recipe && materials.length > 0;
      let recipeSaved = !!recipe;
      if (recipeModified || mustCreateInitialRecipe) {
        await updateRecipeInDatabase(materials);
        setRecipeModified(false);
        recipeSaved = true;
      }

      // 1.1 Hard verification: only needed if recipe was never saved before this call
      if (!recipeSaved) {
        const verifiedRecipe = await RecipeService.getRecipeByProductId(selectedProduct.id);
        if (!verifiedRecipe) {
          toast({
            title: 'Recipe Not Saved',
            description: 'Could not save recipe for this product. Please try again before adding to production.',
            variant: 'destructive',
          });
          setSubmitting(false);
          return;
        }
        setRecipe(verifiedRecipe);
      }

      // 2. Check for insufficient materials and fire notifications (non-blocking)
      const insufficientMaterials = materials.filter(
        (m) => m.status === 'low' || m.status === 'unavailable'
      );

      if (insufficientMaterials.length > 0) {
        // Send notification for EACH insufficient material to material section
        insufficientMaterials.forEach((material) => {
          // Send notification to backend for material section
          sendLowStockNotification(material);

          // Also show toast to user
          toast({
            title: 'Low Stock Warning',
            description: `${material.material_name}: Required ${material.required_quantity.toFixed(
              2
            )} ${material.unit}, Available ${material.available_quantity} ${
              material.unit
            }. Shortage: ${material.shortage?.toFixed(2)} ${material.unit}. Notification sent to material section.`,
            variant: 'destructive',
            duration: 10000, // Show for 10 seconds
          });
        });

        // Show warning but ALLOW adding to production
        toast({
          title: 'Low Stock Materials Added',
          description: `${insufficientMaterials.length} material(s) with insufficient stock added to production. Notifications sent to material section. Note: You cannot start production flow until stock is replenished.`,
          variant: 'destructive',
          duration: 10000, // Show for 10 seconds
        });
      }

      // 3. Move ALL materials to consumed section (including low stock materials)
      // Prevent duplicates by checking if material already exists
      const existingMaterialIds = new Set(consumedMaterials.map((m) => m.material_id));
      const newMaterialsToAdd = materials.filter((m) => !existingMaterialIds.has(m.material_id));
      
      // For products: calculate actual_consumed_quantity and whole_product_count
      const materialsWithProductDetails = newMaterialsToAdd.map((m) => {
        if (m.material_type === 'product') {
          // For products:
          // - actual_consumed_quantity = required_quantity (fractional, e.g., 0.8)
          // - whole_product_count = Math.ceil(required_quantity) (e.g., 1)
          const actualConsumed = m.required_quantity || 0;
          const wholeProductCount = Math.ceil(actualConsumed);

          // Get selected individual product IDs from state
          const selectedProducts = selectedIndividualProducts[m.material_id] || [];
          const productIds = selectedProducts.map(p => p.id);

          return {
            ...m,
            actual_consumed_quantity: actualConsumed,
            whole_product_count: wholeProductCount,
            individual_product_ids: productIds,
          };
        } else {
          // For raw materials: actual_consumed_quantity = required_quantity
          return {
            ...m,
            actual_consumed_quantity: m.required_quantity || 0,
            whole_product_count: 0, // Not applicable for raw materials
            individual_product_ids: [],
          };
        }
      });
      
      if (materialsWithProductDetails.length > 0) {
        // REMOVED: Individual product status updates now happen in backend when MaterialConsumption is created
        // This prevents duplicate status updates and ensures parent product counts stay in sync

        // Just store the individual products in state for display
        for (const material of materialsWithProductDetails) {
          if (material.material_type === 'product' && material.individual_product_ids && material.individual_product_ids.length > 0) {
            const products = selectedIndividualProducts[material.material_id] || [];
            setConsumedIndividualProducts(prev => ({
              ...prev,
              [material.material_id]: products
            }));
          }
        }

        setConsumedMaterials([...consumedMaterials, ...materialsWithProductDetails]);

        // 4. Clear ALL materials from requirements section that are now in production
        // This includes both newly added materials AND materials that were already in production
        // (to prevent confusion where same material appears in both sections)
        const allProductionMaterialIds = new Set([
          ...consumedMaterials.map((m) => m.material_id),
          ...newMaterialsToAdd.map((m) => m.material_id),
        ]);
        setMaterials(materials.filter((m) => !allProductionMaterialIds.has(m.material_id)));

        toast({
          title: 'Success',
          description: `${newMaterialsToAdd.length} new material(s) added to production${
            insufficientMaterials.length > 0
              ? '. Note: Some materials have insufficient stock.'
              : ''
          }`,
        });
      } else {
        // Even if no new materials, remove duplicates from requirements section
        const allProductionMaterialIds = new Set(consumedMaterials.map((m) => m.material_id));
        const remainingMaterials = materials.filter((m) => !allProductionMaterialIds.has(m.material_id));
        
        if (remainingMaterials.length < materials.length) {
          setMaterials(remainingMaterials);
          toast({
            title: 'Info',
            description: 'Removed duplicate materials from requirements section',
            variant: 'default',
          });
        } else {
          toast({
            title: 'Info',
            description: 'All materials are already added to production',
            variant: 'default',
          });
        }
      }
    } catch (error) {
      console.error('Error adding materials to production:', error);
      toast({
        title: 'Error',
        description: 'Failed to add materials to production',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary-600 mx-auto mb-4" />
            <p className="text-gray-600">Loading planning stage...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!selectedProduct) {
    return null;
  }

  const handleEdit = () => {
    setIsEditOpen(true);
  };

  const handleEditSuccess = async (data: CreateProductionBatchData) => {
    if (!currentBatchId) return;
    
    try {
      setIsEditing(true);
      const { data: updatedBatch, error: updateError } = await ProductionService.updateBatch(currentBatchId, data);
      
      if (updateError) {
        toast({ title: 'Error', description: updateError, variant: 'destructive' });
        return;
      }
      
      if (updatedBatch) {
        toast({ title: 'Success', description: 'Batch updated successfully' });
        setIsEditOpen(false);
        
        // Reload batch and recalculate materials
        if (selectedProduct && recipe) {
          await loadBatchAndProduct(currentBatchId);
          calculateMaterialRequirements(selectedProduct, recipe, updatedBatch.planned_quantity || formData.planned_quantity);
        }
      }
    } catch (error) {
      console.error('Error updating batch:', error);
      toast({ title: 'Error', description: 'Failed to update batch', variant: 'destructive' });
    } finally {
      setIsEditing(false);
    }
  };

  const productLength = parseFloat(selectedProduct.length || '0');
  const productWidth = parseFloat(selectedProduct.width || '0');
  const lengthUnit = selectedProduct.length_unit || 'm';
  const widthUnit = selectedProduct.width_unit || 'm';
  const sqmPerUnit = calculateSQM(productLength, productWidth, lengthUnit, widthUnit);
  const totalSQM = formData.planned_quantity * sqmPerUnit;

  const handleBack = () => {
    const from = location.state?.from;
    const batchId = currentBatch?.id;

    if (from === 'production-detail' && batchId) {
      navigate(`/production/${batchId}`);
    } else {
      navigate('/production');
    }
  };

  const handleOrderRawMaterial = async (materialId: string, materialName: string) => {
    const orderId = currentBatch?.order_id;
    if (orderId) {
      try {
        const { OrderService } = await import('@/services/orderService');
        const result = await OrderService.createMaterialProcurementTask(orderId, {
          material_id: materialId,
        });
        if (!result.success) {
          toast({
            title: 'Error',
            description: result.error || 'Failed to create procurement task',
            variant: 'destructive',
          });
          return;
        }
        toast({
          title: 'Raw Material Task Created',
          description: `Ordering task created for ${materialName} under Order #${currentBatch.order_number || orderId}.`,
        });
      } catch (error) {
        console.error('Error creating procurement task:', error);
        toast({
          title: 'Error',
          description: 'Failed to create procurement task',
          variant: 'destructive',
        });
      }
    } else {
      try {
        const material = materials.find(m => m.material_id === materialId) || 
                         consumedMaterials.find(m => m.material_id === materialId);
        if (material) {
          await sendLowStockNotification(material);
          toast({
            title: 'Low Stock Alert Sent',
            description: `A notification has been sent to supervisors to restock ${materialName}.`,
          });
        } else {
          toast({
            title: 'No linked order',
            description: `Could not request restocking for ${materialName} because this batch is not linked to any order.`,
            variant: 'destructive',
          });
        }
      } catch (error) {
        console.error('Error sending low stock notification:', error);
        toast({
          title: 'Error',
          description: 'Failed to send restock request',
          variant: 'destructive',
        });
      }
    }
  };



  const handleMobileQtyChange = (materialId: string, value: string, isConsumed = false) => {
    if (value === '' || /^\d*\.?\d{0,4}$/.test(value)) {
      setMobileQuantityInputs(prev => ({
        ...prev,
        [materialId]: value
      }));

      const updateFn = isConsumed ? handleUpdateConsumedQuantity : handleUpdateQuantity;
      if (value === '') {
        updateFn(materialId, 0);
      } else {
        const numValue = parseFloat(value);
        if (!isNaN(numValue) && numValue >= 0) {
          updateFn(materialId, numValue);
        }
      }
    }
  };

  const handleMobileQtyBlur = (materialId: string, value: string, isConsumed = false) => {
    const updateFn = isConsumed ? handleUpdateConsumedQuantity : handleUpdateQuantity;
    if (value === '' || value === '.') {
      setMobileQuantityInputs(prev => ({
        ...prev,
        [materialId]: ''
      }));
      updateFn(materialId, 0);
    } else {
      const numValue = parseFloat(value);
      if (!isNaN(numValue) && numValue >= 0) {
        const roundedValue = Math.round(numValue * 100000) / 100000;
        setMobileQuantityInputs(prev => ({
          ...prev,
          [materialId]: roundedValue.toString()
        }));
        updateFn(materialId, roundedValue);
      }
    }
  };

  const handleUpdateConsumedQuantity = (materialId: string, quantityPerSqm: number) => {
    const updated = consumedMaterials.map((m) => {
      if (m.material_id === materialId) {
        const productLength = parseFloat(selectedProduct?.length || '0');
        const productWidth = parseFloat(selectedProduct?.width || '0');
        const lengthUnit = selectedProduct?.length_unit || 'm';
        const widthUnit = selectedProduct?.width_unit || 'm';
        const sqmPerUnit = calculateSQM(productLength, productWidth, lengthUnit, widthUnit);
        const totalSQM = formData.planned_quantity * sqmPerUnit;
        const requiredQuantity = quantityPerSqm * totalSQM;

        return {
          ...m,
          quantity_per_sqm: quantityPerSqm,
          required_quantity: requiredQuantity,
          actual_consumed_quantity: requiredQuantity,
          whole_product_count: m.material_type === 'product' ? Math.ceil(requiredQuantity) : 0,
        };
      }
      return m;
    });
    setConsumedMaterials(updated);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'available':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200">
            <CheckCircle className="w-3.5 h-3.5 text-green-600 animate-pulse" />
            Available
          </span>
        );
      case 'low':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <AlertCircle className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
            Low Stock
          </span>
        );
      case 'unavailable':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
            <AlertCircle className="w-3.5 h-3.5 text-red-600 animate-pulse" />
            Shortage
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <Layout>
      <div className="hidden lg:block min-h-screen bg-gray-50">
        <PlanningStageHeader
          onBack={() => {
            // Check where we came from based on location state
            const from = location.state?.from;
            const batchId = currentBatch?.id;

            if (from === 'production-detail' && batchId) {
              // If we came from production detail page, go back to production detail
              navigate(`/production/${batchId}`);
            } else {
              // Default: go to production list
              navigate('/production');
            }
          }}
          onEdit={handleEdit}
          onAssign={() => setShowAssignModal(true)}
          batch={currentBatch}
        />

        <div className="px-2 sm:px-3 lg:px-4 py-6 space-y-6">
          {/* Stage Progress */}
          <ProductionStageProgress currentStage="planning" />

          {/* Order quantity mismatch banner */}
          {orderQuantityMismatch && (() => {
            const productionStarted = currentBatch?.status !== 'planned';
            return (
              <div className={`border rounded-lg p-4 flex items-start justify-between gap-4 ${productionStarted ? 'bg-orange-50 border-orange-300' : 'bg-amber-50 border-amber-300'}`}>
                <div className="flex items-start gap-3">
                  <AlertCircle className={`w-5 h-5 mt-0.5 shrink-0 ${productionStarted ? 'text-orange-600' : 'text-amber-600'}`} />
                  <div>
                    <p className={`font-semibold text-sm ${productionStarted ? 'text-orange-800' : 'text-amber-800'}`}>
                      {productionStarted ? 'Order quantity changed — production already started' : 'Order quantity was updated'}
                    </p>
                    <p className={`text-xs mt-0.5 ${productionStarted ? 'text-orange-700' : 'text-amber-700'}`}>
                      {productionStarted
                        ? <>The linked order quantity is now <strong>{orderQuantityMismatch.currentOrderQty}</strong> (was <strong>{orderQuantityMismatch.batchQty}</strong> when production started). Production cannot be auto-adjusted — update manually if needed.</>
                        : <>The linked order now shows <strong>{orderQuantityMismatch.currentOrderQty}</strong> rolls, but this batch is planned for <strong>{orderQuantityMismatch.batchQty}</strong> rolls. Do you want to update the planned quantity?</>
                      }
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button variant="outline" size="sm" onClick={() => setOrderQuantityMismatch(null)} className="text-xs">
                    Dismiss
                  </Button>
                  {!productionStarted && (
                    <Button size="sm" onClick={handleSyncOrderQuantity} disabled={syncingQuantity} className="text-xs bg-amber-600 hover:bg-amber-700 text-white">
                      {syncingQuantity && <Loader2 className="w-3 h-3 animate-spin mr-1" />}
                      Update to {orderQuantityMismatch.currentOrderQty}
                    </Button>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Production Overview Stats */}
          <ProductionOverviewStats
            targetQuantity={formData.planned_quantity}
            unit={selectedProduct.count_unit || 'rolls'}
            materialsUsed={materials.length}
            expectedLength={productLength}
            expectedWidth={productWidth}
            expectedWeight={parseFloat(selectedProduct.weight || '0')}
          />

          {/* Expected Product Details */}
          <ExpectedProductDetails product={selectedProduct} />

          {/* Material Requirements Table */}
          <MaterialRequirementsTable
            materials={materials}
            targetQuantity={formData.planned_quantity}
            totalSQM={totalSQM}
            recipeBased={Boolean(recipe?.materials?.length)}
            selectedIndividualProducts={selectedIndividualProducts}
            consumedMaterialIds={consumedMaterials.map(m => m.material_id)}
            existingSubTasks={existingSubTasks}
            onAddMaterial={() => setShowMaterialDialog(true)}
            onRemoveMaterial={handleRemoveMaterial}
            onRemoveMaterialFromDraft={(materialId) => {
              const mat = consumedMaterials.find(m => m.material_id === materialId);
              if (mat) { setConsumptionToRemove({ id: mat.material_id, name: mat.material_name }); setShowRemoveConsumptionDialog(true); }
            }}
            onUpdateQuantity={handleUpdateQuantity}
            onSelectIndividualProducts={(materialId: string) => {
              const material = materials.find(m => m.material_id === materialId);
              if (material) {
                setSelectedMaterialForIndividual({
                  id: materialId,
                  name: material.material_name,
                  required: material.required_quantity
                });
                setShowIndividualProductDialog(true);
              }
            }}
            onStartSubProduction={(materialId, materialName) => {
              setSubProductionMaterial({ id: materialId, name: materialName });
              setShowSubProductionModal(true);
            }}
            onOrderRawMaterial={(materialId, materialName) => {
              // Keep this action explicit: open manage stock where PO is tracked/created.
              navigate('/materials', {
                state: {
                  openRestockRedirect: true,
                  fromProductionLowStock: true,
                  materialId,
                  materialName,
                  batchId: currentBatchId,
                },
              });
              toast({
                title: 'Order Stock',
                description: `Opening Materials page for restock of ${materialName}.`,
              });
            }}
          />

          {/* Add to Production Button */}
          <div className="flex justify-end">
            <Button
              onClick={handleAddToProduction}
              disabled={
                submitting ||
                formData.planned_quantity <= 0 ||
                !formData.completion_date ||
                materials.length === 0
              }
              className="bg-primary-600 hover:bg-primary-700"
              size="lg"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Adding to Production...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Add Materials to Production
                </>
              )}
            </Button>
          </div>

          {/* Materials Consumed in Production Section */}
          {consumedMaterials.length > 0 && (
            <>
              <div className="border-t-4 border-gray-300 pt-6 mt-8">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Materials Consumed in Production</h2>
                <p className="text-sm text-gray-600 mb-4">{consumedMaterials.length} material(s) added</p>
              </div>

              <MaterialRequirementsTable
                materials={consumedMaterials}
                targetQuantity={formData.planned_quantity}
                totalSQM={totalSQM}
                recipeBased={false}
                selectedIndividualProducts={consumedIndividualProducts}
                onSelectIndividualProducts={(materialId: string) => {
                  const material = consumedMaterials.find(m => m.material_id === materialId);
                  if (material) {
                    setSelectedMaterialForIndividual({
                      id: materialId,
                      name: material.material_name,
                      required: material.required_quantity
                    });
                    setShowIndividualProductDialog(true);
                  }
                }}
                onRemoveMaterial={async (materialId) => {
                  const materialToRemove = consumedMaterials.find((m) => m.material_id === materialId);

                  // Update individual product statuses back to 'available' if removed
                  if (materialToRemove?.material_type === 'product' && materialToRemove.individual_product_ids && materialToRemove.individual_product_ids.length > 0) {
                    try {
                      const { IndividualProductService } = await import('@/services/individualProductService');
                      for (const productId of materialToRemove.individual_product_ids) {
                        try {
                          await IndividualProductService.updateIndividualProduct(productId, {
                            status: 'available'
                          });
                        } catch (err) {
                          console.error(`Error updating status for product ${productId}:`, err);
                        }
                      }
                      // Remove from consumedIndividualProducts state
                      setConsumedIndividualProducts(prev => {
                        const updated = { ...prev };
                        delete updated[materialId];
                        return updated;
                      });
                    } catch (error) {
                      console.error(`Error updating product statuses:`, error);
                    }
                  }

                  // Remove only from consumed materials (consumption), do NOT touch recipe
                  const updatedConsumed = consumedMaterials.filter((m) => m.material_id !== materialId);
                  setConsumedMaterials(updatedConsumed);
                      
                  toast({
                    title: 'Material Removed',
                    description: 'Material removed from consumption only (recipe unchanged)',
                  });
                }}
              />

              {/* Start Production Flow Button */}
              <div className="flex justify-end gap-4">
                {!recipe && (
                  <div className="flex items-center gap-2 text-amber-600">
                    <AlertCircle className="w-5 h-5" />
                    <span className="text-sm font-medium">
                      Please set the recipe first before starting production
                    </span>
                  </div>
                )}
                {/* Show warning if low stock materials exist */}
                {(() => {
                  const lowStockMaterials = consumedMaterials.filter(
                    (m) => m.status === 'low' || m.status === 'unavailable'
                  );
                  return lowStockMaterials.length > 0 ? (
                    <div className="flex items-center gap-2 text-red-600">
                      <AlertCircle className="w-5 h-5" />
                      <span className="text-sm font-medium">
                        Cannot start: {lowStockMaterials.length} material(s) have insufficient stock
                      </span>
                    </div>
                  ) : null;
                })()}
                {/* Show warning if individual products are not selected for product materials */}
                {(() => {
                  const productMaterials = consumedMaterials.filter((m) => m.material_type === 'product');
                  const materialsWithoutIndividualProducts = productMaterials.filter(
                    (m) => !m.individual_product_ids || m.individual_product_ids.length === 0
                  );
                  return materialsWithoutIndividualProducts.length > 0 ? (
                    <div className="flex items-center gap-2 text-red-600">
                      <AlertCircle className="w-5 h-5" />
                      <span className="text-sm font-medium">
                        Cannot start: Please select individual products for {materialsWithoutIndividualProducts.length} product material(s)
                      </span>
                    </div>
                  ) : null;
                })()}
                <Button
                  onClick={() => {
                    // Open machine selection dialog first
                    setShowMachineDialog(true);
                  }}
                  disabled={
                    submitting ||
                    consumedMaterials.length === 0 ||
                    !recipe ||
                    consumedMaterials.some((m) => m.status === 'low' || m.status === 'unavailable') ||
                    // Disable if product-type materials don't have individual products selected
                    consumedMaterials.some((m) => 
                      m.material_type === 'product' && 
                      (!m.individual_product_ids || m.individual_product_ids.length === 0)
                    )
                  }
                  className="bg-green-600 hover:bg-green-700 !text-white"
                  size="lg"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Starting Production Flow...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Start Production Flow
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>


      {/* Mobile View */}
      <div className="lg:hidden min-h-screen bg-gray-50 pb-16">
        {/* Mobile Header */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-10 px-4 py-3 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={handleBack}
              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-600"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-sm font-bold text-gray-900 leading-tight">
                {currentBatch?.batch_number || 'New Batch'}
              </h1>
              <p className="text-[10px] text-gray-505 font-semibold truncate max-w-[150px]">
                {selectedProduct.name}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {/* Edit Batch */}
            {currentBatch && currentBatch.status === 'planned' && (
              <button
                onClick={handleEdit}
                className="p-2 bg-gray-50 text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors"
                title="Edit Batch"
              >
                <Edit className="w-4 h-4" />
              </button>
            )}
            {/* Guide Help Button */}
            <button
              onClick={() => setMobileHelpOpen(true)}
              className="p-2 bg-primary-50 text-primary-600 rounded-xl hover:bg-primary-100 transition-colors border border-primary-100"
              title="Guide"
            >
              <Info className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {/* Order quantity mismatch banner */}
          {orderQuantityMismatch && (() => {
            const productionStarted = currentBatch?.status !== 'planned';
            return (
              <div className={`border rounded-xl p-3.5 flex flex-col gap-3 shadow-sm ${productionStarted ? 'bg-orange-50 border-orange-200' : 'bg-amber-50 border-amber-200'}`}>
                <div className="flex items-start gap-2.5">
                  <AlertCircle className={`w-5 h-5 shrink-0 mt-0.5 ${productionStarted ? 'text-orange-600' : 'text-amber-600'}`} />
                  <div>
                    <p className={`font-bold text-xs ${productionStarted ? 'text-orange-800' : 'text-amber-800'}`}>
                      {productionStarted ? 'Order quantity changed' : 'Order quantity updated'}
                    </p>
                    <p className={`text-[11px] leading-relaxed mt-0.5 ${productionStarted ? 'text-orange-700' : 'text-amber-700'}`}>
                      {productionStarted
                        ? <>Linked order quantity is <strong>{orderQuantityMismatch.currentOrderQty}</strong> (was <strong>{orderQuantityMismatch.batchQty}</strong>). Cannot auto-adjust.</>
                        : <>Linked order shows <strong>{orderQuantityMismatch.currentOrderQty}</strong> rolls (batch is <strong>{orderQuantityMismatch.batchQty}</strong>). Sync planned quantity?</>
                      }
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-1 self-end">
                  <button
                    onClick={() => setOrderQuantityMismatch(null)}
                    className="px-2.5 py-1 text-xs font-semibold bg-white border border-gray-200 rounded-lg text-gray-700"
                  >
                    Dismiss
                  </button>
                  {!productionStarted && (
                    <button
                      onClick={handleSyncOrderQuantity}
                      disabled={syncingQuantity}
                      className="px-2.5 py-1 text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white rounded-lg inline-flex items-center"
                    >
                      {syncingQuantity && <Loader2 className="w-3 h-3 animate-spin mr-1" />}
                      Sync
                    </button>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Stepper Progress */}
          <div className="bg-white rounded-xl border border-gray-150 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs text-gray-500 font-medium">Stage Progress</span>
              <span className="text-xs text-primary-600 font-bold bg-primary-55 px-2.5 py-0.5 rounded-full">
                1. Material Selection
              </span>
            </div>
            <div className="grid grid-cols-4 gap-1.5 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="bg-primary-500 rounded-full" />
              <div className="bg-gray-200 rounded-full" />
              <div className="bg-gray-200 rounded-full" />
              <div className="bg-gray-200 rounded-full" />
            </div>
            <div className="flex justify-between text-[9px] text-gray-400 mt-2 font-semibold">
              <span className="text-primary-600 font-bold">Planning</span>
              <span>Machine</span>
              <span>Details</span>
              <span>Wastage</span>
            </div>
          </div>

          {/* Combined product summary card */}
          <div className="bg-white rounded-xl border border-gray-150 shadow-sm overflow-hidden">
            {/* Top strip: qty + materials count */}
            <div className="flex border-b border-gray-100">
              <div className="flex-1 flex items-center gap-2 px-3 py-2.5 border-r border-gray-100">
                <Package className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-gray-900 leading-tight">{formData.planned_quantity} {selectedProduct.count_unit || 'rolls'}</p>
                  <p className="text-[9px] text-gray-400 font-semibold uppercase tracking-wide">Target Qty</p>
                </div>
              </div>
              <div className="flex-1 flex items-center gap-2 px-3 py-2.5 border-r border-gray-100">
                <Boxes className="w-3.5 h-3.5 text-green-500 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-gray-900 leading-tight">{materials.length + consumedMaterials.length} Items</p>
                  <p className="text-[9px] text-gray-400 font-semibold uppercase tracking-wide">Materials</p>
                </div>
              </div>
              {productLength > 0 && (
                <div className="flex-1 flex items-center gap-2 px-3 py-2.5 border-r border-gray-100">
                  <Ruler className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-gray-900 leading-tight">{productLength}×{productWidth}M</p>
                    <p className="text-[9px] text-gray-400 font-semibold uppercase tracking-wide">Dimensions</p>
                  </div>
                </div>
              )}
              {selectedProduct.weight && selectedProduct.weight !== 'N/A' && (
                <div className="flex-1 flex items-center gap-2 px-3 py-2.5">
                  <Weight className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-gray-900 leading-tight">{selectedProduct.weight}</p>
                    <p className="text-[9px] text-gray-400 font-semibold uppercase tracking-wide">GSM</p>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom row: product name + attributes inline */}
            <div className="px-3 py-2 flex flex-wrap gap-x-3 gap-y-1 items-center">
              <span className="text-xs font-bold text-gray-900">{selectedProduct.name}</span>
              {selectedProduct.category && (
                <span className="text-[10px] text-gray-400 font-medium">{selectedProduct.category}</span>
              )}
              {selectedProduct.color && selectedProduct.color !== 'N/A' && (
                <span className="flex items-center gap-1 text-[10px] text-gray-500">
                  {colorCodeMap[selectedProduct.color.toLowerCase()] && (
                    <span className="w-2.5 h-2.5 rounded-full border border-black/10 shrink-0" style={{ backgroundColor: colorCodeMap[selectedProduct.color.toLowerCase()] }} />
                  )}
                  {selectedProduct.color}
                </span>
              )}
              {selectedProduct.pattern && selectedProduct.pattern !== 'N/A' && (
                <span className="flex items-center gap-1 text-[10px] text-gray-500">
                  {patternImageMap[selectedProduct.pattern.toLowerCase()] && (
                    <img src={patternImageMap[selectedProduct.pattern.toLowerCase()]} alt="" className="w-3 h-3 rounded object-cover border border-black/10" />
                  )}
                  {selectedProduct.pattern}
                </span>
              )}
            </div>
          </div>

          {/* Material Requirements Section */}
          <div className="bg-white rounded-2xl border border-gray-205 p-4 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-gray-700" />
                <h3 className="font-bold text-gray-900 text-sm">Material Requirements</h3>
              </div>
              <button
                onClick={() => setShowMaterialDialog(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                Select
              </button>
            </div>

            {materials.length === 0 ? (
              <div className="text-center py-8">
                <Truck className="w-10 h-10 mx-auto text-gray-300 mb-2" />
                <p className="text-xs text-gray-500">No pending materials to plan.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {materials.map((material, idx) => {
                  const sqmPerProduct = totalSQM / formData.planned_quantity;
                  const quantityPerProduct = material.quantity_per_sqm * sqmPerProduct;
                  const shortage = material.shortage || 0;
                  const isAssigned = existingSubTasks[material.material_id];

                  const sqmPerRoll = formData.planned_quantity > 0 ? totalSQM / formData.planned_quantity : 0;
                  const forNRolls = material.quantity_per_sqm * totalSQM;
                  const isProduct = material.material_type === 'product';
                  const typeBg = isProduct ? '#EDE9FE' : '#EFF6FF';
                  const typeColor = isProduct ? '#7C3AED' : '#2563EB';
                  const isFromRecipe = recipe?.materials?.some((rm: any) => rm.material_id === material.material_id) ?? false;

                  return (
                    <div key={`${material.material_id}-${idx}`}
                      className="rounded-xl p-3 mb-2.5 bg-white"
                      style={{ border: `1px solid ${material.status !== 'available' ? (material.status === 'low' ? '#FDE047' : '#FECACA') : '#E5E7EB'}` }}>

                      {/* Header row: name + type badge + status + actions */}
                      <div className="flex items-start justify-between gap-2 mb-2.5">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start gap-1.5 flex-wrap mb-1">
                            <h4 className="font-extrabold text-gray-900 text-[14px] leading-tight">{material.material_name}</h4>
                            <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold mt-0.5" style={{ backgroundColor: typeBg, color: typeColor }}>
                              {isProduct ? 'Product' : 'Raw Material'}
                            </span>
                            {getStatusBadge(material.status)}
                          </div>
                          <span className="text-[10px] text-gray-400">{isFromRecipe ? 'From Recipe' : 'Manual'} · {material.material_id}</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {isProduct && (material.status === 'low' || material.status === 'unavailable') && (
                            <button onClick={() => { setSubProductionMaterial({ id: material.material_id, name: material.material_name }); setShowSubProductionModal(true); }}
                              className="p-1.5 rounded-lg border" style={{ borderColor: '#F59E0B', backgroundColor: '#FEF3C7' }}>
                              <Factory className="w-3.5 h-3.5" style={{ color: '#D97706' } as any} />
                            </button>
                          )}
                          {isProduct && (
                            <button onClick={() => { setSelectedMaterialForIndividual({ id: material.material_id, name: material.material_name, required: material.required_quantity }); setShowIndividualProductDialog(true); }}
                              className="p-1.5 rounded-lg border" style={{ borderColor: '#3B82F6', backgroundColor: '#EFF6FF' }}>
                              <Package className="w-3.5 h-3.5 text-blue-600" />
                            </button>
                          )}
                          {material.material_type === 'raw_material' && (material.status === 'low' || material.status === 'unavailable') && (
                            <button onClick={() => handleOrderRawMaterial(material.material_id, material.material_name)}
                              className="p-1.5 rounded-lg border" style={{ borderColor: '#3B82F6', backgroundColor: '#EFF6FF' }}>
                              <Truck className="w-3.5 h-3.5 text-blue-600" />
                            </button>
                          )}
                          <button onClick={() => handleRemoveMaterial(material.material_id)}
                            className="p-1.5 rounded-lg border border-red-200 bg-red-50">
                            <Trash2 className="w-3.5 h-3.5 text-red-500" />
                          </button>
                        </div>
                      </div>

                      {/* Product banner */}
                      {isProduct && (
                        <div className="rounded-lg p-2.5 mb-2.5 flex items-center flex-wrap gap-2" style={{ backgroundColor: '#FAF5FF' }}>
                          <span className="text-[12px] font-semibold" style={{ color: '#4C1D95' }}>To Make {formData.planned_quantity} Rolls</span>
                          <ChevronRight className="w-3.5 h-3.5" style={{ color: '#7C3AED' } as any} />
                          <span className="text-[12px] font-bold text-gray-900">Need <span style={{ color: '#7C3AED' }}>{forNRolls.toFixed(4).replace(/\.?0+$/, '')} {material.unit}</span> of {material.material_name}</span>
                        </div>
                      )}

                      {/* Blue quantity breakdown box */}
                      <div className="rounded-[10px] border border-blue-200 bg-blue-50 p-2.5 mb-2.5">
                        <p className="text-[11px] font-bold text-blue-800 mb-2">Quantity Breakdown</p>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="bg-white rounded-lg p-2">
                            <p className="text-[11px] text-gray-400 mb-0.5">{isProduct ? 'Per 1 SQM of Parent' : 'Per 1 SQM'}</p>
                            <p className="text-[13px] font-bold text-gray-900">{Number(material.quantity_per_sqm).toFixed(6).replace(/\.?0+$/, '')} {material.unit}</p>
                          </div>
                          <div className="bg-white rounded-lg p-2">
                            <p className="text-[11px] text-gray-400 mb-0.5">Per 1 Roll</p>
                            <p className="text-[13px] font-bold text-gray-900">{quantityPerProduct.toFixed(4).replace(/\.?0+$/, '')} {material.unit}</p>
                            <p className="text-[10px] text-gray-400">({sqmPerRoll.toFixed(2)} sqm/roll)</p>
                          </div>
                          <div className="bg-white rounded-lg p-2">
                            <p className="text-[11px] text-gray-400 mb-0.5">For {formData.planned_quantity} Rolls</p>
                            <p className="text-[13px] font-bold text-blue-700">{material.required_quantity.toFixed(4).replace(/\.?0+$/, '')} {material.unit}</p>
                            <p className="text-[10px] text-gray-400">({totalSQM.toFixed(2)} sqm total)</p>
                          </div>
                          <div className="bg-white rounded-lg p-2">
                            <p className="text-[11px] text-gray-400 mb-0.5">Available Stock</p>
                            <p className={`text-[13px] font-bold ${material.status === 'available' ? 'text-green-700' : material.status === 'low' ? 'text-amber-600' : 'text-red-600'}`}>
                              {material.available_quantity.toFixed(2)} {material.unit}
                            </p>
                            {shortage > 0 && <p className="text-[10px] font-bold text-red-600">Short: {shortage.toFixed(2)} {material.unit}</p>}
                          </div>
                        </div>
                      </div>

                      {/* Edit qty per SQM */}
                      <div>
                        <p className="text-[11px] font-semibold text-gray-600 mb-1.5">Adjust Quantity Per SQM (Base Quantity) *</p>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            inputMode="decimal"
                            value={mobileQuantityInputs[material.material_id] ?? (material.quantity_per_sqm === 0 ? '' : Number(material.quantity_per_sqm).toFixed(6).replace(/\.?0+$/, ''))}
                            onChange={(e) => handleMobileQtyChange(material.material_id, e.target.value)}
                            onBlur={(e) => handleMobileQtyBlur(material.material_id, e.target.value)}
                            placeholder="0.000000"
                            className="h-[38px] w-[120px] bg-white border border-gray-200 rounded-lg px-3 text-[13px] text-gray-900 outline-none"
                          />
                          <span className="text-[12px] text-gray-500">{material.unit} Per SQM</span>
                        </div>
                        <p className="text-[10px] text-gray-400 mt-1">(Changing this will auto-recalculate all quantities above)</p>
                      </div>

                      {/* Selected Individual Products */}
                      {material.material_type === 'product' && selectedIndividualProducts[material.material_id] && selectedIndividualProducts[material.material_id].length > 0 && (
                        <div className="bg-green-50/50 border border-green-155 rounded-lg p-2.5 space-y-1.5">
                          <span className="text-[11px] font-bold text-green-900 block">
                            Selected Rolls ({selectedIndividualProducts[material.material_id].length})
                          </span>
                          <div className="divide-y divide-green-100 max-h-40 overflow-y-auto">
                            {selectedIndividualProducts[material.material_id].map((product: any, pIdx: number) => (
                              <div key={product.id} className="py-1 text-[10px] text-green-800 flex justify-between">
                                <span>{pIdx + 1}. ID: <span className="font-semibold">{product.id}</span></span>
                                <span>{product.length}×{product.width} m · {product.weight} GSM</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Row Actions */}
                      <div className="flex items-center gap-2 pt-2.5 border-t border-gray-100">
                        {/* Sub-Produce */}
                        {material.material_type === 'product' && (material.status === 'low' || material.status === 'unavailable') && (
                          isAssigned ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-[10px] text-blue-700 font-bold">
                              <Factory className="w-3.5 h-3.5" />
                              Sub: {isAssigned.assigned_to_name}
                            </span>
                          ) : (
                            <button
                              onClick={() => {
                                setSubProductionMaterial({ id: material.material_id, name: material.material_name });
                                setShowSubProductionModal(true);
                              }}
                              className="inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg border border-amber-300 text-amber-800 text-[10px] font-bold bg-amber-50 hover:bg-amber-100 transition-colors"
                            >
                              <Factory className="w-3.5 h-3.5" />
                              Sub-Produce
                            </button>
                          )
                        )}

                        {/* Order Stock */}
                        {material.material_type === 'raw_material' && (material.status === 'low' || material.status === 'unavailable') && (
                          <button
                            onClick={() => handleOrderRawMaterial(material.material_id, material.material_name)}
                            className="inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg border border-blue-300 text-blue-800 text-[10px] font-bold bg-blue-50 hover:bg-blue-100 transition-colors"
                          >
                            <Truck className="w-3.5 h-3.5" />
                            Order Stock
                          </button>
                        )}

                        {/* Select Individual Products */}
                        {material.material_type === 'product' && (
                          <button
                            onClick={() => {
                              setSelectedMaterialForIndividual({
                                id: material.material_id,
                                name: material.material_name,
                                required: material.required_quantity
                              });
                              setShowIndividualProductDialog(true);
                            }}
                            className="inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg border border-primary-300 text-primary-800 text-[10px] font-bold bg-primary-50 hover:bg-primary-100 transition-colors"
                          >
                            <Package className="w-3.5 h-3.5" />
                            Select Rolls
                          </button>
                        )}

                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {materials.length > 0 && (
              <button
                onClick={handleAddToProduction}
                disabled={submitting}
                className="w-full mt-2 py-3.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-md transition-colors text-sm"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Adding to Production...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Add Materials to Production
                  </>
                )}
              </button>
            )}
          </div>

          {/* Consumed Materials Section */}
          {consumedMaterials.length > 0 && (
            <div className="bg-green-50/70 border border-green-200 rounded-2xl p-4 shadow-sm space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <h3 className="font-bold text-green-900 text-sm">Materials Added to Production</h3>
                <span className="ml-auto text-xs bg-green-150 text-green-800 px-2 py-0.5 rounded-full font-bold">
                  {consumedMaterials.length} Items
                </span>
              </div>

              <div className="space-y-3">
                {consumedMaterials.map((material, idx) => {
                  const qtyPerSqmNum = parseFloat(material.quantity_per_sqm || 0);
                  const sqmPerRoll = formData.planned_quantity > 0 ? totalSQM / formData.planned_quantity : 0;
                  const forNRolls = qtyPerSqmNum * totalSQM;
                  const isProduct = material.material_type === 'product';
                  const typeBg = isProduct ? '#EDE9FE' : '#EFF6FF';
                  const typeColor = isProduct ? '#7C3AED' : '#2563EB';
                  const typeLabel = isProduct ? 'Product' : 'Raw Material';

                  return (
                    <div key={`consumed-${material.material_id}-${idx}`}
                      className="bg-white rounded-xl p-3 mb-2.5"
                      style={{ border: '1px solid #E5E7EB' }}>

                      {/* Header */}
                      <div className="flex items-start gap-2 mb-1.5">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-gray-900 text-[14px] leading-tight mb-0.5">{material.material_name}</h4>
                          <span className="text-[10px] text-gray-400">Type: {material.material_type}</span>
                        </div>
                        <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold shrink-0" style={{ backgroundColor: typeBg, color: typeColor }}>
                          {typeLabel}
                        </span>
                      </div>

                      {/* Remove action */}
                      <div className="flex gap-2 mb-2.5">
                        <button
                          onClick={() => { setConsumptionToRemove({ id: material.material_id, name: material.material_name }); setShowRemoveConsumptionDialog(true); }}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-colors"
                          style={{ borderWidth: 1, borderColor: '#FDBA74', backgroundColor: '#FFF7ED', color: '#EA580C' }}
                        >
                          <Trash2 className="w-3 h-3" />
                          Remove Consumption
                        </button>
                      </div>

                      {/* Confirmed Usage box */}
                      <div className="rounded-[10px] p-2.5" style={{ backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB' }}>
                        <p className="text-[11px] font-bold text-gray-600 mb-2">Confirmed Usage</p>
                        <div className="flex gap-1.5">
                          <div className="flex-1 bg-white rounded-lg p-2">
                            <p className="text-[9px] text-gray-500 mb-1">Per 1 SQM</p>
                            <p className="text-[13px] font-bold text-gray-900">{Number(qtyPerSqmNum).toFixed(6)} {material.unit}</p>
                          </div>
                          <div className="flex-1 bg-white rounded-lg p-2">
                            <p className="text-[9px] text-gray-500 mb-1">For {formData.planned_quantity} Rolls</p>
                            <p className="text-[13px] font-bold text-blue-700">{forNRolls.toFixed(2)} {material.unit}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Start Flow Button */}
              <button
                onClick={() => setShowMachineDialog(true)}
                disabled={submitting || consumedMaterials.length === 0}
                className="w-full py-3.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:text-gray-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors text-sm mt-2.5"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Starting Flow...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current" />
                    Start Production Flow
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
      {/* Material Selection Dialog */}
      <MaterialSelectionDialog
        isOpen={showMaterialDialog}
        onClose={() => setShowMaterialDialog(false)}
        onSelect={handleMaterialSelect}
        existingMaterials={materials.map((m) => ({
          material_id: m.material_id,
          material_name: m.material_name,
          material_type: m.material_type,
          quantity_per_sqm: m.quantity_per_sqm,
          unit: m.unit,
        }))}
      />

      {/* Individual Product Selection Dialog */}
      {selectedMaterialForIndividual && (
        <IndividualProductSelectionDialog
          isOpen={showIndividualProductDialog}
          onClose={() => {
            setShowIndividualProductDialog(false);
            setSelectedMaterialForIndividual(null);
          }}
          materialId={selectedMaterialForIndividual.id}
          materialName={selectedMaterialForIndividual.name}
          requiredQuantity={selectedMaterialForIndividual.required}
          preSelectedProductIds={
            (selectedIndividualProducts[selectedMaterialForIndividual.id]?.map(p => p.id) || []).length > 0
              ? selectedIndividualProducts[selectedMaterialForIndividual.id]?.map(p => p.id) || []
              : consumedIndividualProducts[selectedMaterialForIndividual.id]?.map(p => p.id) || []
          }
          onSelect={(selectedProducts) => {
            // Check if this is from consumed materials section
            const isConsumed = consumedMaterials.some(m => m.material_id === selectedMaterialForIndividual.id);

            if (isConsumed) {
              // Update consumed individual products and consumed materials
              setConsumedIndividualProducts(prev => ({
                ...prev,
                [selectedMaterialForIndividual.id]: selectedProducts
              }));

              // Update individual_product_ids in consumed materials
              setConsumedMaterials(prev => prev.map(m =>
                m.material_id === selectedMaterialForIndividual.id
                  ? { ...m, individual_product_ids: selectedProducts.map(p => p.id) }
                  : m
              ));
            } else {
              // Update for planning section
              setSelectedIndividualProducts(prev => ({
                ...prev,
                [selectedMaterialForIndividual.id]: selectedProducts
              }));
            }

            toast({
              title: 'Products Selected',
              description: `${selectedProducts.length} individual products selected`,
            });
          }}
        />
      )}

      {/* Machine Selection Dialog */}
      <MachineSelectionDialog
        isOpen={showMachineDialog}
        onClose={() => {
          // Allow closing the dialog (cancel/X button)
          setShowMachineDialog(false);
        }}
        onSelect={async (machine, shift, scheduleDate) => {
          if (!machine) {
            toast({
              title: 'Machine Required',
              description: 'Please select a machine to continue',
              variant: 'destructive',
            });
            return;
          }

          // Add shift to machine object
          const machineWithShift = { ...machine, shift: shift || 'day' };
          setSelectedMachine(machineWithShift);
          setShowMachineDialog(false);

          // After machine selection, create the batch and set up production flow
          if (!selectedProduct) return;

          // Validate completion date is provided
          if (!formData.completion_date || formData.completion_date.trim() === '') {
            toast({
              title: 'Validation Error',
              description: 'Please select an expected completion date before starting production',
              variant: 'destructive',
            });
            setSubmitting(false);
            return;
          }

          // CRITICAL: Check for low stock materials in consumed materials BEFORE starting production
          const lowStockMaterials = consumedMaterials.filter(
            (m) => m.status === 'low' || m.status === 'unavailable'
          );

          if (lowStockMaterials.length > 0) {
            // Show error for each low stock material
            lowStockMaterials.forEach((material) => {
              toast({
                title: 'Insufficient Stock - Cannot Start Production',
                description: `${material.material_name}: Required ${material.required_quantity.toFixed(
                  2
                )} ${material.unit}, Available ${material.available_quantity} ${
                  material.unit
                }. Shortage: ${material.shortage?.toFixed(2)} ${material.unit}`,
                variant: 'destructive',
              });
            });

            // BLOCK production flow
            toast({
              title: 'Cannot Start Production',
              description: `Cannot start production flow due to insufficient stock for ${lowStockMaterials.length} material(s). Please ensure all materials have sufficient quantity before proceeding.`,
              variant: 'destructive',
            });

            return; // STOP - Don't start production if materials are insufficient
          }

          // CRITICAL: Check if individual products are selected for product-type materials
          const productMaterials = consumedMaterials.filter((m) => m.material_type === 'product');
          const materialsWithoutIndividualProducts = productMaterials.filter(
            (m) => !m.individual_product_ids || m.individual_product_ids.length === 0
          );

          if (materialsWithoutIndividualProducts.length > 0) {
            // Show error for each material missing individual products
            materialsWithoutIndividualProducts.forEach((material) => {
              toast({
                title: 'Individual Products Required',
                description: `Please select individual products for "${material.material_name}" before starting production.`,
                variant: 'destructive',
              });
            });

            // BLOCK production flow
            toast({
              title: 'Cannot Start Production',
              description: `Please select individual products for ${materialsWithoutIndividualProducts.length} product material(s) before starting production. Click on the material to select individual products.`,
              variant: 'destructive',
              duration: 8000,
            });

            setSubmitting(false);
            return; // STOP - Don't start production if individual products are not selected
          }

          setSubmitting(true);
          let batch: any = null;

          try {
            // Step 1: Check if batch already exists (from URL params or previous creation)
            // If batch exists, use it; otherwise create a new one
            if (currentBatchId) {
              // Batch already exists - load it and update with machine
              const { data: existingBatch, error: batchError } = await ProductionService.getBatchById(currentBatchId);
              
              if (batchError || !existingBatch) {
                toast({
                  title: 'Error',
                  description: batchError || 'Failed to load existing batch. Cannot start production.',
                  variant: 'destructive',
                });
                setSubmitting(false);
                return;
              }

              // Update batch with machine_id if not already set
              const existingMachineId = (existingBatch as any).machine_id;
              if (!existingMachineId || existingMachineId !== machine.id) {
                const { data: updatedBatch, error: updateError } = await ProductionService.updateBatch(currentBatchId, {
                  machine_id: machine.id,
                } as any);

                if (updateError || !updatedBatch) {
                  toast({
                    title: 'Error',
                    description: updateError || 'Failed to update batch with machine. Cannot start production.',
                    variant: 'destructive',
                  });
                  setSubmitting(false);
                  return;
                }

                batch = updatedBatch;
              } else {
                batch = existingBatch;
              }
            } else {
              // No existing batch - create a new one
              const batchData = {
                product_id: selectedProduct.id,
                planned_quantity: formData.planned_quantity,
                priority: formData.priority,
                completion_date: formData.completion_date || undefined,
                notes: formData.notes,
                machine_id: machine.id,
              };

              const { data: createdBatch, error: batchError } = await ProductionService.createBatch(batchData);

              if (batchError || !createdBatch) {
                toast({
                  title: 'Error',
                  description: batchError || 'Failed to create batch. Cannot start production.',
                  variant: 'destructive',
                });
                setSubmitting(false);
                return; // STOP - Don't continue if batch creation fails
              }

              batch = createdBatch;
              setCurrentBatchId(batch.id); // Store the new batch ID
            }

            // Step 2: ALWAYS ensure MaterialConsumption records exist and match consumedMaterials
            // This is CRITICAL - all data must be saved before proceeding
            console.log('📦 Starting material consumption save process...');
            console.log('📦 Consumed materials to save:', consumedMaterials.length);
            console.log('📦 Consumed materials data:', consumedMaterials.map(m => ({
              name: m.material_name,
              type: m.material_type,
              individual_product_ids: m.individual_product_ids?.length || 0,
              whole_product_count: m.whole_product_count,
              actual_consumed_quantity: m.actual_consumed_quantity,
            })));

            if (consumedMaterials.length === 0) {
              toast({
                title: 'Error',
                description: 'No materials added to production. Cannot start production without materials.',
                variant: 'destructive',
              });
              setSubmitting(false);
              return; // STOP - No materials means no production
            }

            // Check existing consumption records
            const { data: existingConsumption } = await ProductionService.getMaterialConsumption(batch.id);
            console.log('📦 Existing consumption records:', existingConsumption?.length || 0);
            const existingMaterialIds = new Set((existingConsumption || []).map((m: any) => m.material_id));
            
            // Validate that ALL consumed materials are saved
            const materialsToSave = consumedMaterials.filter(m => !existingMaterialIds.has(m.material_id));
            console.log('📦 Materials to save:', materialsToSave.length, materialsToSave.map(m => m.material_name));

            if (materialsToSave.length > 0) {
              // Create/update MaterialConsumption records for ALL consumed materials
              const materialErrors: string[] = [];
              const savedMaterials: string[] = [];

              for (const material of materialsToSave) {
                try {
                  console.log(`💾 Saving material: ${material.material_name}`, {
                    material_id: material.material_id,
                    material_type: material.material_type,
                    individual_product_ids: material.individual_product_ids?.length || 0,
                    whole_product_count: material.whole_product_count,
                    actual_consumed_quantity: material.actual_consumed_quantity,
                  });

                  // For products: quantity_used = whole_product_count, actual_consumed_quantity = actual fractional consumption
                  const quantityUsed = material.material_type === 'product' 
                    ? (material.whole_product_count || Math.ceil(material.actual_consumed_quantity || material.required_quantity || 0))
                    : (material.actual_consumed_quantity || material.required_quantity || 0);
                  
                  const actualConsumedQty = material.material_type === 'product'
                    ? (material.actual_consumed_quantity || material.required_quantity || 0)
                    : (material.actual_consumed_quantity || material.required_quantity || 0);

                  // For products, individual_product_ids are optional (can be empty for bulk products)
                  // Only validate if whole_product_count > 0 (meaning individual products are expected)
                  if (material.material_type === 'product' && material.whole_product_count > 0) {
                    if (!material.individual_product_ids || material.individual_product_ids.length === 0) {
                      console.warn(`⚠️ Product ${material.material_name} has whole_product_count=${material.whole_product_count} but no individual_product_ids`);
                      // Don't block - allow saving but log warning
                    }
                  }

                  const consumptionPayload = {
                    production_batch_id: batch.id,
                    material_id: material.material_id,
                    material_name: material.material_name,
                    material_type: material.material_type,
                    quantity_used: quantityUsed,
                    actual_consumed_quantity: actualConsumedQty,
                    unit: material.unit,
                    quantity_per_sqm: material.quantity_per_sqm,
                    individual_product_ids: material.individual_product_ids || [],
                    // For raw materials: set consumption_status to 'in_production' (will change to 'used' when wastage completes)
                    // For products: don't deduct (tracked via individual products)
                    consumption_status: material.material_type === 'raw_material' ? 'in_production' : undefined,
                    deduct_now: false, // Don't deduct immediately - will deduct when status changes to 'used'
                  };

                  console.log(`💾 Payload for ${material.material_name}:`, {
                    ...consumptionPayload,
                    individual_product_ids_count: consumptionPayload.individual_product_ids.length,
                  });

                  const { error: consumptionError, data: savedData } = await ProductionService.createMaterialConsumption(consumptionPayload);
                  
                  if (consumptionError) {
                    console.error(`❌ Error saving ${material.material_name}:`, consumptionError);
                    materialErrors.push(`${material.material_name}: ${consumptionError}`);
                  } else {
                    console.log(`✅ Saved ${material.material_name}:`, {
                      id: savedData?.id,
                      individual_product_ids_count: savedData?.individual_product_ids?.length || 0,
                      individual_product_ids: savedData?.individual_product_ids || [],
                    });
                    savedMaterials.push(material.material_name);
                    
                    // Verify individual_product_ids were actually saved
                    if (material.material_type === 'product' && material.individual_product_ids && material.individual_product_ids.length > 0) {
                      if (!savedData?.individual_product_ids || savedData.individual_product_ids.length === 0) {
                        console.error(`❌ WARNING: Individual products not saved in response for ${material.material_name}`);
                        console.error(`   Expected: ${material.individual_product_ids.length} products`);
                        console.error(`   Got: ${savedData?.individual_product_ids?.length || 0} products`);
                      }
                    }
                  }
                } catch (err) {
                  const errorMsg = err instanceof Error ? err.message : 'Unknown error';
                  console.error(`❌ Exception saving ${material.material_name}:`, err);
                  materialErrors.push(`${material.material_name}: ${errorMsg}`);
                }
              }
              
              // If ANY material consumption failed, show error and STOP
              if (materialErrors.length > 0) {
                console.error('❌ Material consumption errors:', materialErrors);
                toast({
                  title: 'Error',
                  description: `Failed to save materials: ${materialErrors.join(', ')}. Production not started.`,
                  variant: 'destructive',
                });
                setSubmitting(false);
                return; // STOP - Don't continue if material consumption fails
              }
            } else {
              console.log('✅ All materials already saved, skipping creation');
            }

            // Step 2.5: VERIFY all materials are saved - CRITICAL CHECK
            // Wait a bit to ensure database has updated
            await new Promise(resolve => setTimeout(resolve, 500));
            
            console.log('🔍 Verifying all materials are saved...');
            const { data: verifyConsumption } = await ProductionService.getMaterialConsumption(batch.id);
            console.log('🔍 Verified consumption records:', verifyConsumption?.length || 0);
            console.log('🔍 Verified records:', verifyConsumption?.map((m: any) => ({
              id: m.id,
              name: m.material_name,
              type: m.material_type,
              material_id: m.material_id,
              individual_product_ids: m.individual_product_ids?.length || 0,
              individual_product_ids_array: m.individual_product_ids || [],
            })));

            const verifiedMaterialIds = new Set((verifyConsumption || []).map((m: any) => m.material_id));
            const allMaterialsSaved = consumedMaterials.every(m => verifiedMaterialIds.has(m.material_id));

            if (!allMaterialsSaved) {
              const missingIds = consumedMaterials
                .filter(m => !verifiedMaterialIds.has(m.material_id))
                .map(m => m.material_name);
              
              console.error('❌ Missing materials in verification:', missingIds);
              toast({
                title: 'Error',
                description: `Failed to verify material consumption. Missing: ${missingIds.join(', ')}. Cannot proceed to machine stage.`,
                variant: 'destructive',
              });
              setSubmitting(false);
              return; // STOP - Don't continue if verification fails
            }

            // Verify individual_product_ids are saved for products (only if they were provided)
            const productMaterials = consumedMaterials.filter(m => m.material_type === 'product');
            console.log('🔍 Verifying product materials:', productMaterials.length);
            
            for (const material of productMaterials) {
              const savedRecord = verifyConsumption?.find((m: any) => m.material_id === material.material_id);
              console.log(`🔍 Checking ${material.material_name}:`, {
                savedRecord: !!savedRecord,
                savedRecordId: savedRecord?.id,
                original_individual_ids: material.individual_product_ids?.length || 0,
                original_individual_ids_array: material.individual_product_ids || [],
                saved_individual_ids: savedRecord?.individual_product_ids?.length || 0,
                saved_individual_ids_array: savedRecord?.individual_product_ids || [],
              });

              // Only require individual_product_ids if they were provided in consumedMaterials
              if (material.individual_product_ids && material.individual_product_ids.length > 0) {
                if (!savedRecord) {
                  console.error(`❌ Material consumption record not found for ${material.material_name}`);
                  toast({
                    title: 'Error',
                    description: `Material consumption record not found for ${material.material_name}. Cannot proceed to machine stage.`,
                    variant: 'destructive',
                  });
                  setSubmitting(false);
                  return;
                }
                
                if (!savedRecord.individual_product_ids || savedRecord.individual_product_ids.length === 0) {
                  console.error(`❌ Individual products not saved for ${material.material_name}`);
                  console.error(`   Expected: ${material.individual_product_ids.length} products`);
                  console.error(`   Expected IDs: ${material.individual_product_ids.join(', ')}`);
                  console.error(`   Got: ${savedRecord.individual_product_ids?.length || 0} products`);
                  console.error(`   Saved record:`, savedRecord);
                  
                  toast({
                    title: 'Error',
                    description: `Individual products not saved for ${material.material_name}. Please check console for details. Cannot proceed to machine stage.`,
                    variant: 'destructive',
                  });
                  setSubmitting(false);
                  return; // STOP - Individual products must be saved if they were provided
                } else if (savedRecord.individual_product_ids.length !== material.individual_product_ids.length) {
                  console.warn(`⚠️ Individual products count mismatch for ${material.material_name}`);
                  console.warn(`   Expected: ${material.individual_product_ids.length} products`);
                  console.warn(`   Got: ${savedRecord.individual_product_ids.length} products`);
                  // Don't block - just warn
                } else {
                  console.log(`✅ Individual products saved for ${material.material_name}: ${savedRecord.individual_product_ids.length} products`);
                }
              } else {
                console.log(`ℹ️ No individual products required for ${material.material_name} (bulk product or not selected)`);
              }
            }

            console.log('✅ All materials verified and saved to MaterialConsumption');

            // Step 3: Check if production flow already exists, if not create it
            let flow: any = null;
            const { data: existingFlow } = await ProductionService.getProductionFlowByBatchId(batch.id);
            
            if (existingFlow) {
              flow = existingFlow;
              console.log('✅ Production flow already exists, using existing flow');
            } else {
              // Create new flow if it doesn't exist
              const { data: createdFlow, error: flowError } = await ProductionService.createProductionFlow({
                production_batch_id: batch.id,
                flow_name: `Production Flow for ${selectedProduct.name}`,
                description: `Batch ${batch.batch_number}`,
              });

              if (flowError || !createdFlow) {
                toast({
                  title: 'Error',
                  description: flowError || 'Failed to create production flow. Production not started.',
                  variant: 'destructive',
                });
                setSubmitting(false);
                return; // STOP - Don't continue if flow creation fails
              }
              flow = createdFlow;
            }

            // Step 4: Check if machine step already exists, if not create it
            try {
              const { data: existingSteps } = await ProductionService.getProductionFlowSteps(flow.id);
              const hasMachineStep = existingSteps && existingSteps.some((step: any) => step.step_type === 'machine_operation');
              
              if (!hasMachineStep) {
                // Only create step if it doesn't exist
                const user = await AuthService.getCurrentUser();
                const now = new Date().toISOString();
                const { error: stepError } = await ProductionService.createProductionFlowStep({
                  production_flow_id: flow.id,
                  step_number: 1,
                  step_name: 'Machine Operation',
                  step_type: 'machine_operation',
                  machine_id: machine.id,
                  machine_name: machine.machine_name,
                  description: `Production on ${machine.machine_name} - ${machine.shift || 'day'} shift`,
                  inspector: user?.full_name || user?.email || 'Unknown',
                  shift: machine.shift || 'day',
                  start_time: now, // Mark when we transition from planning to machine stage
                  status: 'in_progress', // Machine stage starts immediately
                });

                if (stepError) {
                  toast({
                    title: 'Error',
                    description: stepError || 'Failed to create machine step. Production not started.',
                    variant: 'destructive',
                  });
                  setSubmitting(false);
                  return; // STOP - Don't continue if step creation fails
                }
              } else {
                console.log('✅ Machine step already exists, skipping creation');
              }
            } catch (err) {
              const errorMsg = err instanceof Error ? err.message : 'Unknown error';
              toast({
                title: 'Error',
                description: `Failed to check/create machine step: ${errorMsg}. Production not started.`,
                variant: 'destructive',
              });
              setSubmitting(false);
              return; // STOP - Don't continue if step creation fails
            }

            // Step 5: Update batch status to 'in_production' and update stage statuses - CRITICAL: Must succeed before navigation
            const { data: updatedBatch, error: statusError } = await ProductionService.updateBatch(batch.id, {
              status: 'in_production',
              planning_stage: {
                status: 'completed',
                completed_at: new Date().toISOString(),
                completed_by: actorName,
              },
              machine_stage: {
                status: 'in_progress',
                started_at: new Date().toISOString(),
                started_by: actorName,
                ...(scheduleDate ? { schedule_date: scheduleDate } : {}),
              },
            });

            if (statusError || !updatedBatch) {
              toast({
                title: 'Error',
                description: statusError || 'Failed to update batch status. Production not started. Cannot navigate to machine stage.',
                variant: 'destructive',
              });
              console.error('Batch status update failed:', statusError);
              setSubmitting(false);
              return; // STOP - Don't navigate if status update failed
            }

            // Verify the status was actually updated
            if (updatedBatch.status !== 'in_production' && updatedBatch.status !== 'in_progress') {
              toast({
                title: 'Error',
                description: `Batch status was not updated correctly. Expected 'in_production', got '${updatedBatch.status}'. Cannot navigate to machine stage.`,
                variant: 'destructive',
              });
              console.error('Batch status mismatch. Expected in_production, got:', updatedBatch.status);
              setSubmitting(false);
              return; // STOP - Don't navigate if status is wrong
            }

            // ALL STEPS SUCCEEDED - Now safe to proceed
            toast({
              title: 'Success',
              description: `Production started with machine: ${machine.machine_name}`,
            });

            // Delete draft state after successful batch creation
            if (selectedProduct) {
              try {
                await ProductionService.deleteDraftPlanningState(selectedProduct.id);
              } catch (err) {
                console.warn('Failed to delete draft state (non-critical):', err);
              }
            }

            // Navigate to machine stage ONLY if ALL steps succeeded
            // replace:true removes planning page from history so back button can't return to it
            navigate(`/production/${batch.id}/machine`, { replace: true });
          } catch (error) {
            console.error('Error creating batch:', error);
            const errorMsg = error instanceof Error ? error.message : 'Unknown error';
            toast({
              title: 'Error',
              description: `Failed to start production: ${errorMsg}. Cannot navigate to machine stage.`,
              variant: 'destructive',
            });
          } finally {
            setSubmitting(false);
          }
        }}
        selectedMachineId={selectedMachine?.id}
      />

      {/* Edit Batch Dialog */}
      {currentBatch && (
        <ProductionFormDialog
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          onSubmit={handleEditSuccess}
          selectedBatch={currentBatch}
          submitting={isEditing}
        />
      )}

      {/* Sub-Production Modal — start production for a low-stock material */}
      {subProductionMaterial && (
        <AssignUserModal
          open={showSubProductionModal}
          onClose={() => { setShowSubProductionModal(false); setSubProductionMaterial(null); }}
          title={`Sub-Produce: ${subProductionMaterial.name}`}
          description={`"${subProductionMaterial.name}" is low or out of stock. Select a user to start a production batch for this material.`}
          confirmLabel="Start Sub-Production"
          onAssign={async (_userId, _userName) => {
            if (!selectedProduct) {
              throw new Error('Current product not found for sub-production assignment');
            }

            // Assignment-first flow: create production task for selected user.
            // Do not navigate to New Batch page here.
            const attachedOrderIds = getAttachedOrderIdsFromNotes(currentBatch?.notes);
            const attachedOrderNumbers = getAttachedOrderNumbersFromNotes(currentBatch?.notes);
            const primaryOrderId = currentBatch?.order_id || attachedOrderIds[0];
            const primaryOrderNumber = currentBatch?.order_number || attachedOrderNumbers[0];
            const orderId = primaryOrderId || `SUB-${selectedProduct.id}`;
            const orderNumber = primaryOrderNumber || currentBatch?.batch_number || 'SUB-PRODUCTION';
            const customerName = (currentBatch as any)?.customer_name || '';
            const plannedQty =
              Math.max(
                1,
                Math.ceil(
                  Number(
                    materials.find((m) => m.material_id === subProductionMaterial.id)?.required_quantity || 0
                  )
                )
              );

            const { error } = await ProductionService.createTask({
              order_id: orderId,
              order_number: orderNumber,
              customer_name: customerName,
              stage_product_id: subProductionMaterial.id,
              stage_product_name: subProductionMaterial.name,
              final_product_id: selectedProduct.id,
              final_product_name: selectedProduct.name,
              planned_quantity: plannedQty,
              assigned_to_id: _userId,
              assigned_to_name: _userName,
              notes: `Sub-production task created from planning stage for "${selectedProduct.name}".`,
              parent_batch_id: currentBatch?.id || null,
            });

            if (error) {
              throw new Error(error);
            }

            // Mark this material as already assigned so the button changes immediately
            setExistingSubTasks(prev => ({
              ...prev,
              [subProductionMaterial.id]: { assigned_to_name: _userName, status: 'assigned' },
            }));

            toast({
              title: 'Task Assigned',
              description: `${subProductionMaterial.name} assigned to ${_userName}.`,
            });
          }}
        />
      )}

      {/* Assign to Next Person Modal */}
      {currentBatch && (
        <AssignUserModal
          open={showAssignModal}
          onClose={() => setShowAssignModal(false)}
          title="Forward Planning Stage"
          description="Select a user to forward this planning stage work to."
          confirmLabel="Forward"
          onAssign={async (userId, userName) => {
            const { error } = await ProductionService.assignStage(currentBatch.id, 'planning', userId, userName);
            if (error) throw new Error(error);
            setCurrentBatch(prev => prev ? {
              ...prev,
              current_stage: 'planning',
              current_stage_assigned_to: userId,
              current_stage_assigned_to_name: userName,
            } : prev);
            toast({ title: 'Forwarded', description: `Planning stage forwarded to ${userName}` });
          }}
        />
      )}

      {/* Remove Material Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showRemoveMaterialDialog}
        onClose={() => {
          setShowRemoveMaterialDialog(false);
          setMaterialToRemove(null);
        }}
        onConfirm={confirmRemoveMaterial}
        title={
          recipe && recipe.materials && recipe.materials.some((m: any) => m.material_id === materialToRemove?.id)
            ? "Remove Material from Recipe"
            : "Remove Material"
        }
        description={
          recipe && recipe.materials && recipe.materials.some((m: any) => m.material_id === materialToRemove?.id)
            ? `⚠️ Warning: "${materialToRemove?.name}" is saved in the recipe.\n\nRemoving it will:\n• Delete it from the saved recipe in the backend\n• Remove it from this section\n\nThis action cannot be undone. Are you sure you want to continue?`
            : `Are you sure you want to remove "${materialToRemove?.name}" from this section?`
        }
        confirmText="Remove"
        cancelText="Cancel"
        variant={recipe && recipe.materials && recipe.materials.some((m: any) => m.material_id === materialToRemove?.id) ? "danger" : "warning"}
      />

      {/* Remove Consumption Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showRemoveConsumptionDialog}
        onClose={() => { setShowRemoveConsumptionDialog(false); setConsumptionToRemove(null); }}
        onConfirm={() => {
          if (consumptionToRemove) handleRemoveMaterialFromDraft(consumptionToRemove.id);
          setShowRemoveConsumptionDialog(false);
          setConsumptionToRemove(null);
        }}
        title="Remove Consumption"
        description={`Remove "${consumptionToRemove?.name}" from the consumed materials list?\n\nThis will undo its contribution to this production batch.`}
        confirmText="Remove"
        cancelText="Cancel"
        variant="warning"
      />

      {/* Mobile Help Modal */}
      {mobileHelpOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md max-h-[85vh] flex flex-col shadow-xl animate-in slide-in-from-bottom duration-200">
            {/* Header */}
            <div className="px-5 py-4 border-b border-gray-150 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                  <Info className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-gray-900">Planning Guide</h3>
              </div>
              <button
                onClick={() => setMobileHelpOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="p-5 overflow-y-auto space-y-4 text-sm text-gray-650 leading-relaxed">
              <div>
                <h4 className="font-bold text-gray-900 mb-1">1. Adjust Quantity Per SQM</h4>
                <p>Type the base quantity (Per 1 SQM) for each material. The system will automatically calculate how much is needed for 1 Roll, and the total needed for the entire batch.</p>
              </div>
              <div>
                <h4 className="font-bold text-gray-900 mb-1">2. Auto-Calculated Banners</h4>
                <p>Products will show a purple banner detailing exactly how many child rolls are needed to produce the target amount, based on the dimensions of the parent and child products.</p>
              </div>
              <div>
                <h4 className="font-bold text-gray-900 mb-1">3. Actions</h4>
                <div className="space-y-2 mt-2">
                  <div className="flex gap-3 items-start">
                    <span className="p-1 rounded bg-amber-50 border border-amber-200 text-amber-700 shrink-0"><Factory className="w-3.5 h-3.5" /></span>
                    <span><strong>Sub-Produce:</strong> Create sub-batches for low/out-of-stock products.</span>
                  </div>
                  <div className="flex gap-3 items-start">
                    <span className="p-1 rounded bg-blue-50 border border-blue-200 text-blue-700 shrink-0"><Package className="w-3.5 h-3.5" /></span>
                    <span><strong>Select Rolls:</strong> Pick specific rolls from inventory for the product.</span>
                  </div>
                  <div className="flex gap-3 items-start">
                    <span className="p-1 rounded bg-red-50 border border-red-200 text-red-700 shrink-0"><Trash2 className="w-3.5 h-3.5" /></span>
                    <span><strong>Trash Icon:</strong> Remove a material from the recipe (and list).</span>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="font-bold text-gray-900 mb-1">4. Add to Production</h4>
                <p>Once all materials are configured, tap "Add Materials to Production" to lock them in. Then, allocate a machine and shift to start production.</p>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-gray-50 border-t border-gray-150 rounded-b-2xl">
              <button
                onClick={() => setMobileHelpOpen(false)}
                className="w-full py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-semibold shadow-sm transition-colors text-sm"
              >
                Got it!
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
