import { useState, useEffect, type ReactNode } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Loader2, Search, CheckCircle2, Factory,
  AlertTriangle, CheckCircle, XCircle, Layers,
  UserPlus, X, ArrowDown, Archive, ShoppingCart
} from 'lucide-react';
import { UserService } from '@/services/userService';
import { PermissionService } from '@/services/permissionService';
import { RecipeService } from '@/services/recipeService';
import { MaterialService } from '@/services/materialService';
import { ProductService } from '@/services/productService';
import { ProductionService } from '@/services/productionService';
import { OrderService } from '@/services/orderService';
import { IndividualProductSelectionDialog } from '@/components/orders/IndividualProductSelectionDialog';
import { useToast } from '@/hooks/use-toast';
import type { User as UserType } from '@/types/auth';
import type { Order, OrderItem } from '@/services/orderService';
import type { Recipe, RecipeMaterial } from '@/types/recipe';
import type { RawMaterial } from '@/types/material';
import { getApiUrl } from '@/utils/apiConfig';
import ProductAttributePreview from '@/components/ui/ProductAttributePreview';

// Cache role permission results to avoid re-fetching the same role multiple times
const rolePermCache: Record<string, Record<string, boolean>> = {};
const userPermCache: Record<string, Record<string, boolean>> = {};

function hasProductionAssignmentAccess(actionPermissions: Record<string, boolean> | undefined): boolean {
  if (!actionPermissions) return false;
  const canView = actionPermissions['production_view'] === true;
  const canWork =
    actionPermissions['production_create'] === true ||
    actionPermissions['production_edit'] === true;
  return canView && canWork;
}

async function getRoleActionPerms(role: string): Promise<Record<string, boolean>> {
  if (rolePermCache[role]) return rolePermCache[role];
  try {
    const API_URL = (await import('@/utils/apiConfig')).getApiUrl();
    const token = localStorage.getItem('auth_token');
    const res = await fetch(`${API_URL}/permissions/role/${encodeURIComponent(role)}/public`, {
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    });
    if (!res.ok) return {};
    const data = await res.json();
    const ap = data?.data?.action_permissions ?? {};
    rolePermCache[role] = ap;
    return ap;
  } catch {
    return {};
  }
}

async function getUserActionPerms(userId: string): Promise<Record<string, boolean> | null> {
  if (userPermCache[userId]) return userPermCache[userId];
  try {
    const perms = await PermissionService.getUserPermissionsPublic(userId);
    const ap = perms?.action_permissions ?? {};
    userPermCache[userId] = ap;
    return ap;
  } catch {
    // This can fail for non-admin viewers; caller handles fallback.
    return null;
  }
}

async function isEligibleForProductionAssignment(user: UserType): Promise<boolean> {
  // Always allow high-privilege roles.
  if (user.role === 'admin' || user.role === 'super-admin') {
    return true;
  }

  // Prefer user-level permissions (supports per-user overrides).
  const userActionPerms = await getUserActionPerms(user.id);
  if (userActionPerms) {
    return hasProductionAssignmentAccess(userActionPerms);
  }

  // Fallback to role-level public permissions.
  try {
    const roleActionPerms = await getRoleActionPerms(user.role);
    if (Object.keys(roleActionPerms).length > 0) {
      return hasProductionAssignmentAccess(roleActionPerms);
    }
  } catch {
    // Ignore and fail open below.
  }

  // If permissions endpoint is unavailable, do not hide potentially valid users.
  return true;
}

interface RecipeNode {
  productId: string;
  productName: string;
  recipe: Recipe | null;
  materials: MaterialWithStock[];
  subProductNodes: RecipeNode[];
  // stock of this product itself (for sub-products)
  productStock?: number;
  // SQM per roll of this product (length × width)
  productSqm?: number;
}

interface MaterialWithStock extends RecipeMaterial {
  stock?: number;
  available_stock?: number;
  stockStatus: 'available' | 'low' | 'out';
}

interface ProductAssignment {
  productId: string;
  productName: string;
  assignedUser: UserType | null;
}

interface SendToProductionModalProps {
  open: boolean;
  onClose: () => void;
  order: Order;
  productItem: OrderItem;
}

function resolveProductAvailableStock(product: any): number {
  if (!product) return 0;

  const toFiniteNonNegative = (value: unknown): number | null => {
    const num = Number(value);
    return Number.isFinite(num) ? Math.max(num, 0) : null;
  };

  const currentStock = toFiniteNonNegative(product.current_stock);
  const availableStock = toFiniteNonNegative(product.available_stock);
  const stockCount = toFiniteNonNegative(product.stock_count);
  const individualCount = toFiniteNonNegative(product.individual_products_count);

  if (product.individual_stock_tracking === true) {
    // Only trust individualCount if > 0 — a 0 may mean records simply weren't created,
    // not that stock is genuinely empty. Fall back to current_stock in that case.
    if (individualCount !== null && individualCount > 0) return individualCount;
    if (currentStock !== null && currentStock > 0) return currentStock;
    if (availableStock !== null) return availableStock;
    if (stockCount !== null) return stockCount;
    return 0;
  }

  if (availableStock !== null) return availableStock;
  if (currentStock !== null) return currentStock;
  return stockCount ?? 0;
}

// Flatten tree into ordered steps: deepest sub-products first, main product last
function flattenToSteps(node: RecipeNode): RecipeNode[] {
  const steps: RecipeNode[] = [];
  function collect(n: RecipeNode) {
    for (const sub of n.subProductNodes) collect(sub);
    steps.push(n);
  }
  collect(node);
  return steps;
}

export default function SendToProductionModal({
  open,
  onClose,
  order,
  productItem,
}: SendToProductionModalProps) {
  const { toast } = useToast();

  const [users, setUsers] = useState<UserType[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [recipeTree, setRecipeTree] = useState<RecipeNode | null>(null);
  const [loadingRecipe, setLoadingRecipe] = useState(false);
  const [orderStatus, setOrderStatus] = useState(order.status || 'pending');
  const [acceptingOrder, setAcceptingOrder] = useState(false);
  const [showRollSelectionDialog, setShowRollSelectionDialog] = useState(false);
  const [assignments, setAssignments] = useState<Record<string, ProductAssignment & { picking: boolean; search: string }>>({});
  const [submitting, setSubmitting] = useState(false);
  const [stepQuantities, setStepQuantities] = useState<Record<string, number>>({});
  // Raw material ordering: materialId → { ordering, pickingUser, search, assignedUser }
  const [matOrderState, setMatOrderState] = useState<Record<string, {
    ordering: boolean; pickingUser: boolean; search: string; assignedUser: UserType | null;
  }>>({});
  const [reservedSelections, setReservedSelections] = useState<any[]>([]);
  const assignmentStorageKey = `production_task_assignments:${order.id}:${productItem.productId}`;

  useEffect(() => {
    if (open && productItem.productId) {
      loadUsers();
      loadRecipeTree(productItem.productId, productItem.productName);
    }
    const initialSelected = Array.isArray((productItem as any).selectedProducts)
      ? (productItem as any).selectedProducts
      : Array.isArray((productItem as any).selected_individual_products)
        ? (productItem as any).selected_individual_products
        : [];
    setReservedSelections(initialSelected);
    setOrderStatus(order.status || 'pending');
    if (!open) {
      setAssignments({});
      setRecipeTree(null);
      setStepQuantities({});
      setShowRollSelectionDialog(false);
    }
  }, [open, productItem.productId]);

  // Compute how many rolls of each step product are needed for the order quantity.
  // quantity_per_sqm is in rolls-per-sqm, so: child_rolls = parent_rolls × parent_sqm × quantity_per_sqm
  useEffect(() => {
    if (!recipeTree) return;
    const reservedForOrder = orderStatus === 'accepted' ? reservedSelections.length : 0;
    const qty = Math.max(Number(productItem.quantity || 0) - reservedForOrder, 0);
    const map: Record<string, number> = {};
    const dfs = (node: RecipeNode, parentQtyRolls: number) => {
      map[node.productId] = parentQtyRolls;
      const parentSqm = node.productSqm ?? 0;
      for (const sub of node.subProductNodes) {
        const mat = node.materials.find(m => m.material_id === sub.productId);
        const qtyPerSqm = mat ? Number(mat.quantity_per_sqm || 0) : 0;
        // rolls needed = parent_rolls × sqm_per_parent_roll × qty_per_sqm
        const childRolls = parentSqm > 0 && qtyPerSqm > 0
          ? parentQtyRolls * parentSqm * qtyPerSqm
          : parentQtyRolls;
        dfs(sub, childRolls);
      }
    };
    dfs(recipeTree, qty);
    setStepQuantities(map);
  }, [recipeTree, orderStatus, productItem.quantity, reservedSelections.length]);

  useEffect(() => {
    if (!open || users.length === 0 || !recipeTree) return;
    try {
      const raw = localStorage.getItem(assignmentStorageKey);
      if (!raw) return;
      const parsed: Record<string, { userId: string; userName: string }> = JSON.parse(raw);
      const restored: Record<string, ProductAssignment & { picking: boolean; search: string }> = {};
      Object.entries(parsed).forEach(([productId, saved]) => {
        const matched = users.find((u) => u.id === saved.userId);
        if (matched) {
          restored[productId] = {
            productId,
            productName: '',
            assignedUser: matched,
            picking: false,
            search: '',
          };
        }
      });
      if (Object.keys(restored).length > 0) {
        setAssignments((prev) => ({ ...restored, ...prev }));
      }
    } catch {
      // ignore malformed saved assignment data
    }
  }, [open, users, recipeTree, assignmentStorageKey]);

  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const all = await UserService.getAssignableUsers();
      const active = all.filter(u => !u.status || u.status === 'active');
      const results = await Promise.all(
        active.map(u => isEligibleForProductionAssignment(u).then(ok => ok ? u : null))
      );
      setUsers(results.filter((u): u is UserType => u !== null));
    } catch { /* silently fail */ }
    finally { setLoadingUsers(false); }
  };

  const loadRecipeNode = async (productId: string, productName: string, depth = 0): Promise<RecipeNode> => {
    const recipe = await RecipeService.getRecipeByProductId(productId);
    const materials: MaterialWithStock[] = [];
    const subProductNodes: RecipeNode[] = [];

    if (recipe?.materials) {
      await Promise.all(
        recipe.materials.map(async (mat) => {
          let stock = 0;
          let available = 0;
          if (mat.material_type === 'raw_material') {
            try {
              const raw: RawMaterial = await MaterialService.getMaterialById(mat.material_id);
              stock = raw.current_stock ?? 0;
              available = raw.available_stock ?? stock;
            } catch { /* ignore */ }
          } else if (mat.material_type === 'product') {
            try {
              const prod = await ProductService.getProductById(mat.material_id);
              stock = resolveProductAvailableStock(prod);
              available = stock;
            } catch { /* ignore */ }
          }
          const needed = mat.quantity_per_sqm;
          const stockStatus: 'available' | 'low' | 'out' =
            available <= 0 ? 'out' : available < needed ? 'low' : 'available';
          materials.push({ ...mat, stock, available_stock: available, stockStatus });
          if (mat.material_type === 'product' && depth < 2) {
            const subNode = await loadRecipeNode(mat.material_id, mat.material_name, depth + 1);
            subProductNodes.push(subNode);
          }
        })
      );
    }

    // Fetch product data once: stock (for every step) + SQM for roll→roll calculations
    let productStock: number | undefined;
    let productSqm: number | undefined;
    try {
      const prod = await ProductService.getProductById(productId);
      productStock = resolveProductAvailableStock(prod);
      const l = parseFloat(prod.length || '0');
      const w = parseFloat(prod.width || '0');
      if (l > 0 && w > 0) productSqm = l * w;
    } catch { /* ignore */ }

    return { productId, productName, recipe, materials, subProductNodes, productStock, productSqm };
  };

  const loadRecipeTree = async (productId: string, productName: string) => {
    setLoadingRecipe(true);
    setRecipeTree(null);
    try {
      const tree = await loadRecipeNode(productId, productName);
      setRecipeTree(tree);
    } catch (err) {
      console.error('Failed to load recipe tree:', err);
    } finally {
      setLoadingRecipe(false);
    }
  };

  // ── Assignment helpers ────────────────────────────────────────────────────

  const openPicker = (productId: string, productName: string) => {
    setAssignments(prev => ({
      ...prev,
      [productId]: { productId, productName, assignedUser: prev[productId]?.assignedUser ?? null, picking: true, search: '' },
    }));
  };

  const closePicker = (productId: string) => {
    setAssignments(prev => ({ ...prev, [productId]: { ...prev[productId], picking: false } }));
  };

  const pickUser = (productId: string, productName: string, user: UserType) => {
    setAssignments(prev => ({
      ...prev,
      [productId]: { productId, productName, assignedUser: user, picking: false, search: '' },
    }));
  };

  const clearAssignment = (productId: string) => {
    setAssignments(prev => { const n = { ...prev }; delete n[productId]; return n; });
  };

  const setPickerSearch = (productId: string, search: string) => {
    setAssignments(prev => ({ ...prev, [productId]: { ...prev[productId], search } }));
  };

  const handleSaveReservedRolls = async (selectedProducts: any[]) => {
    const API_URL = getApiUrl();
    const token = localStorage.getItem('auth_token');
    const response = await fetch(`${API_URL}/orders/items/save-individual-products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify({
        orderItemId: (productItem as any).id,
        individualProductIds: selectedProducts.map((p: any) => p.id),
      }),
    });

    const result = await response.json();
    if (!response.ok || !result.success) {
      throw new Error(result.error || 'Failed to save reserved rolls');
    }

    setReservedSelections(selectedProducts);
    window.dispatchEvent(
      new CustomEvent('order-updated', {
        detail: {
          orderId: order.id,
          reason: 'rolls_reserved',
          selectedCount: selectedProducts.length,
        },
      })
    );
    toast({
      title: 'Rolls reserved',
      description: `${selectedProducts.length} roll(s) selected for this order item.`,
    });
  };

  const handleAcceptOrderAndReserve = async () => {
    if (orderStatus === 'accepted') return;
    setAcceptingOrder(true);
    try {
      const { data, error } = await OrderService.updateOrderStatus(order.id, 'accepted');
      if (error) {
        throw new Error(error);
      }
      setOrderStatus(data?.status || 'accepted');
      window.dispatchEvent(
        new CustomEvent('order-updated', {
          detail: {
            orderId: order.id,
            reason: 'status_accepted',
          },
        })
      );
      toast({
        title: 'Order accepted',
        description: 'Reserved individual products for this order are now considered in production planning.',
      });
    } catch (err: any) {
      toast({
        title: 'Failed to accept order',
        description: err?.message || 'Could not accept order right now.',
        variant: 'destructive',
      });
    } finally {
      setAcceptingOrder(false);
    }
  };

  // ── Submit ────────────────────────────────────────────────────────────────

  const mainProductId = productItem.productId || '';
  const mainAssignment = mainProductId ? assignments[mainProductId] : undefined;
  const orderQuantity = Number(productItem.quantity || 0);
  const reservedRollsForOrder = orderStatus === 'accepted' ? reservedSelections.length : 0;
  const globalAvailableRolls = recipeTree?.productStock ?? 0;
  const netProductionQuantity = Math.max(orderQuantity - reservedRollsForOrder, 0);

  const stepNeedsProduction = (node: RecipeNode): boolean => {
    // If no recipe exists for this step, user may still need to produce manually.
    if (!node.recipe) return true;
    // If any required material is low/out, this step needs production planning.
    return node.materials.some((m) => m.stockStatus === 'out' || m.stockStatus === 'low');
  };

  const getCreationTargetStep = (): RecipeNode | null => {
    if (!recipeTree) return null;
    const orderedSteps = flattenToSteps(recipeTree); // deepest first, main last

    // First preference: earliest assigned step in the chain (Stage 1 first).
    for (const step of orderedSteps) {
      if (assignments[step.productId]?.assignedUser) {
        return step;
      }
    }

    // Second preference: first step that needs production and has assignment.
    for (const step of orderedSteps) {
      if (stepNeedsProduction(step) && assignments[step.productId]?.assignedUser) {
        return step;
      }
    }

    // Final fallback: main product step.
    return orderedSteps[orderedSteps.length - 1] ?? recipeTree;
  };

  const handleGoToProduction = async () => {
    setSubmitting(true);
    try {
      const targetStep = getCreationTargetStep();
      if (!targetStep) {
        throw new Error('Unable to resolve production step');
      }

      const targetAssignment = assignments[targetStep.productId]?.assignedUser
        || (targetStep.productId === productItem.productId ? mainAssignment?.assignedUser : null);

      if (!targetAssignment) {
        toast({
          title: 'Assignment required',
          description: `Please assign personnel for "${targetStep.productName}" before sending to production.`,
          variant: 'destructive',
        });
        return;
      }

      // Compute required quantity for the target stage product from final order quantity
      // using recipe chain multipliers (A -> B -> C style).
      const getStageRequiredQuantity = async (
        finalProductId: string,
        stageProductId: string,
        finalQuantity: number
      ): Promise<number> => {
        if (!finalProductId || !stageProductId || !Number.isFinite(finalQuantity) || finalQuantity <= 0) return 0;
        if (finalProductId === stageProductId) return finalQuantity;

        const recipeCache: Record<string, Recipe | null> = {};
        const visited = new Set<string>();

        const dfsMultiplier = async (productId: string): Promise<number | null> => {
          if (!productId || visited.has(productId)) return null;
          visited.add(productId);

          if (!recipeCache[productId]) {
            recipeCache[productId] = await RecipeService.getRecipeByProductId(productId);
          }
          const recipe = recipeCache[productId];
          const productMaterials = (recipe?.materials || []).filter((m) => m.material_type === 'product');

          for (const material of productMaterials) {
            const childId = material.material_id;
            const coeff = Number(material.quantity_per_sqm || 0);
            if (!childId || coeff <= 0) continue;

            if (childId === stageProductId) {
              return coeff;
            }

            const childMultiplier = await dfsMultiplier(childId);
            if (childMultiplier !== null) {
              return coeff * childMultiplier;
            }
          }
          return null;
        };

        const multiplier = await dfsMultiplier(finalProductId);
        if (multiplier === null) return finalQuantity;
        return finalQuantity * multiplier;
      };

      const requiredStageQuantityRaw = await getStageRequiredQuantity(
        productItem.productId || '',
        targetStep.productId,
        netProductionQuantity
      );
      const requiredStageQuantity = Math.ceil(requiredStageQuantityRaw * 1000) / 1000;
      if (requiredStageQuantity <= 0) {
        toast({
          title: 'No production required',
          description: `Order quantity is already covered by reserved rolls (${reservedRollsForOrder} rolls).`,
        });
        onClose();
        return;
      }

      // If already in active production, don't create duplicate task.
      const { data: existingBatches } = await ProductionService.getBatches({
        order_id: order.id,
        product_id: targetStep.productId,
      });

      const activeExisting = (existingBatches || []).find((b) => {
        const status = (b.status || '').toLowerCase();
        return status !== 'completed' && status !== 'cancelled';
      });

      if (activeExisting) {
        const assignedName =
          activeExisting.current_stage_assigned_to_name ||
          activeExisting.assigned_to_name ||
          'a user';
        toast({
          title: 'Already assigned',
          description: `"${targetStep.productName}" is already in production with ${assignedName} (Batch ${activeExisting.batch_number}).`,
        });
        onClose();
        return;
      }

      // Assignment-only flow: create real backend production task (no batch).
      const { error: taskError } = await ProductionService.createTask({
        order_id: order.id,
        order_item_id: (productItem as any).id || undefined,
        order_number: order.orderNumber || order.id,
        customer_name: order.customerName || '',
        stage_product_id: targetStep.productId,
        stage_product_name: targetStep.productName,
        final_product_id: productItem.productId || '',
        final_product_name: productItem.productName,
        planned_quantity: requiredStageQuantity,
        assigned_to_id: targetAssignment.id,
        assigned_to_name: targetAssignment.full_name,
        notes: `Assigned from order ${order.orderNumber || order.id}`,
      });
      if (taskError) {
        throw new Error(taskError);
      }

      try {
        const serializableAssignments: Record<string, { userId: string; userName: string }> = {};
        Object.entries(assignments).forEach(([productId, value]) => {
          if (value.assignedUser) {
            serializableAssignments[productId] = {
              userId: value.assignedUser.id,
              userName: value.assignedUser.full_name,
            };
          }
        });
        if (Object.keys(serializableAssignments).length > 0) {
          localStorage.setItem(assignmentStorageKey, JSON.stringify(serializableAssignments));
        }
      } catch {
        // ignore local storage errors
      }

      toast({
        title: 'Task assigned',
        description: `Assigned "${targetStep.productName}" (${requiredStageQuantity}) to ${targetAssignment.full_name}. No batch created.`,
      });
      onClose();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to create production batch', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  // ── UI helpers ────────────────────────────────────────────────────────────

  const getRoleBadgeColor = (role: string) => {
    switch (role?.toLowerCase()) {
      case 'admin': return 'bg-red-100 text-red-800';
      case 'manager': return 'bg-purple-100 text-purple-800';
      case 'supervisor': return 'bg-blue-100 text-blue-800';
      case 'operator': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const handleOrderRawMaterial = async (mat: MaterialWithStock) => {
    const state = matOrderState[mat.material_id];
    setMatOrderState(prev => ({ ...prev, [mat.material_id]: { ...prev[mat.material_id], ordering: true } }));
    try {
      const result = await OrderService.createMaterialProcurementTask(order.id, {
        material_id: mat.material_id,
        assigned_to_id: state?.assignedUser?.id,
      });
      if (!result.success) {
        toast({ title: 'Error', description: result.error || 'Failed to create task', variant: 'destructive' });
        return;
      }
      toast({
        title: 'Raw Material Task Created',
        description: state?.assignedUser
          ? `${mat.material_name} ordering assigned to ${state.assignedUser.full_name}`
          : `${mat.material_name} ordering task sent to all eligible users`,
      });
      setMatOrderState(prev => {
        const n = { ...prev };
        delete n[mat.material_id];
        return n;
      });
    } catch {
      toast({ title: 'Error', description: 'Failed to create task', variant: 'destructive' });
    } finally {
      setMatOrderState(prev => ({ ...prev, [mat.material_id]: { ...prev[mat.material_id], ordering: false } }));
    }
  };

  const getStockChip = (mat: MaterialWithStock) => {
    const qty = mat.available_stock ?? mat.stock ?? 0;
    if (mat.stockStatus === 'available') return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
        <CheckCircle className="w-3 h-3" />{qty} {mat.unit} available
      </span>
    );
    if (mat.stockStatus === 'low') return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
        <AlertTriangle className="w-3 h-3" />Low — {qty} {mat.unit}
      </span>
    );
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
        <XCircle className="w-3 h-3" />Out of stock
      </span>
    );
  };

  // ── Inline user picker ────────────────────────────────────────────────────

  const renderUserPicker = (productId: string, productName: string) => {
    const state = assignments[productId];
    const search = state?.search ?? '';
    const filtered = users.filter(u => {
      const q = search.toLowerCase();
      return u.full_name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q) || u.role?.toLowerCase().includes(q);
    });

    return (
      <div className="mt-3 border border-blue-200 rounded-xl bg-white shadow-md overflow-hidden">
        <div className="px-3 py-2.5 border-b border-gray-100 flex items-center gap-2 bg-gray-50">
          <Search className="w-4 h-4 text-gray-400 shrink-0" />
          <input
            className="flex-1 text-sm outline-none placeholder:text-gray-400 bg-transparent"
            placeholder="Search by name, email or role..."
            value={search}
            onChange={e => setPickerSearch(productId, e.target.value)}
            autoFocus
          />
          <button onClick={() => closePicker(productId)} className="text-gray-400 hover:text-gray-600 p-0.5">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="max-h-48 overflow-y-auto divide-y divide-gray-50">
          {loadingUsers ? (
            <div className="flex items-center justify-center py-6 text-gray-400 text-sm gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading users...
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-6 px-4 text-center text-xs text-gray-400 leading-relaxed">
              {search
                ? 'No users match your search.'
                : 'No eligible users found for production assignment.'}
            </div>
          ) : (
            filtered.map(user => (
              <button
                key={user.id}
                type="button"
                onClick={() => pickUser(productId, productName, user)}
                className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-blue-50 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-bold text-gray-700 shrink-0">
                  {user.full_name?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-gray-900 truncate">{user.full_name}</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-gray-400 truncate">{user.email}</span>
                    {user.role && (
                      <span className={`text-xs px-2 py-0 rounded-full font-medium ${getRoleBadgeColor(user.role)}`}>
                        {user.role}
                      </span>
                    )}
                  </div>
                </div>
                <CheckCircle2 className="w-4 h-4 text-blue-400 opacity-0 group-hover:opacity-100" />
              </button>
            ))
          )}
        </div>
      </div>
    );
  };

  // ── Step card (one per product in the flow) ───────────────────────────────

  const renderStepCard = (node: RecipeNode, stepNumber: number, totalSteps: number) => {
    const isMain = node.productId === productItem.productId;
    const stepQty = stepQuantities[node.productId] ?? 0;
    const assignment = assignments[node.productId];
    const isPicking = assignment?.picking ?? false;
    const assignedUser = assignment?.assignedUser ?? null;

    const outMaterials = node.materials.filter(m => m.stockStatus === 'out');
    const lowMaterials = node.materials.filter(m => m.stockStatus === 'low');
    // Stock banner variant
    let banner: { color: string; icon: ReactNode; text: string } | null = null;
    if (node.recipe) {
      if (outMaterials.length > 0) {
        banner = {
          color: 'bg-red-50 border-red-200 text-red-800',
          icon: <XCircle className="w-4 h-4 text-red-500 shrink-0" />,
          text: `${outMaterials.length} material${outMaterials.length > 1 ? 's' : ''} out of stock — consider producing this first, but your call`,
        };
      } else if (lowMaterials.length > 0) {
        banner = {
          color: 'bg-amber-50 border-amber-200 text-amber-800',
          icon: <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />,
          text: `${lowMaterials.length} material${lowMaterials.length > 1 ? 's' : ''} running low — may need restocking`,
        };
      } else {
        banner = {
          color: 'bg-green-50 border-green-200 text-green-800',
          icon: <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />,
          text: 'All materials in stock — ready to produce directly',
        };
      }
    }

    return (
      <div key={node.productId} className="relative">
        {/* Step connector line going up (not for first step) */}
        {stepNumber > 1 && (
          <div className="flex justify-center -mt-1 mb-2">
            <div className="flex flex-col items-center gap-0.5">
              <div className="w-px h-4 bg-gray-300" />
              <ArrowDown className="w-4 h-4 text-gray-400" />
              <div className="text-xs text-gray-400 font-medium">needed to make Step {stepNumber}</div>
            </div>
          </div>
        )}

        {/* Card */}
        <div className={`rounded-2xl border-2 ${isMain ? 'border-blue-400 bg-white' : 'border-gray-200 bg-gray-50'} overflow-hidden`}>
          {/* Card top bar */}
          <div className={`px-5 py-3 flex items-center justify-between ${isMain ? 'bg-blue-600' : 'bg-gray-700'}`}>
            <div className="flex items-center gap-3">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${isMain ? 'bg-white text-blue-600' : 'bg-white text-gray-700'}`}>
                {stepNumber}
              </div>
              <div>
                <div className="text-white font-bold text-base leading-tight">{node.productName}</div>
                <div className="text-xs mt-0.5 opacity-80 text-white">
                  {isMain
                    ? `Main product · Order: ${orderQuantity} rolls · Available: ${globalAvailableRolls} · Reserved: ${reservedRollsForOrder} · Need: ${Math.round(stepQty * 1000) / 1000} rolls`
                    : `Sub-product · Step ${stepNumber} of ${totalSteps}${stepQty > 0 ? ` · Need: ${Math.round(stepQty * 1000) / 1000} rolls` : ''}`}
                </div>
              </div>
            </div>

            {/* Current stock for every step (main and sub-products) */}
            {node.productStock !== undefined && (
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
                node.productStock > 0 ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
              }`}>
                <Archive className="w-3.5 h-3.5" />
                {node.productStock > 0 ? `${node.productStock} rolls in stock` : 'No stock'}
              </div>
            )}
          </div>

          {/* Card body */}
          <div className="px-5 py-4 space-y-4">
            {/* Stock suggestion banner */}
            {banner && (
              <div className={`flex items-start gap-2.5 px-4 py-3 rounded-xl border text-sm ${banner.color}`}>
                {banner.icon}
                <span className="leading-snug">{banner.text}</span>
              </div>
            )}

            {!node.recipe && (
              <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm text-gray-600">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                No recipe found — operator will plan materials manually on the production page
              </div>
            )}

            {/* Materials table */}
            {node.recipe && node.materials.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Materials needed</p>
                <div className="rounded-xl border border-gray-200 overflow-hidden bg-white">
                  {node.materials.map((mat, i) => {
                    const isOutRaw = mat.stockStatus === 'out' && mat.material_type === 'raw_material';
                    const mos = matOrderState[mat.material_id];
                    return (
                    <div key={mat.id} className={`flex flex-col gap-2 px-4 py-3 ${i > 0 ? 'border-t border-gray-100' : ''}`}>
                      <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {mat.material_type === 'product' ? (
                          <div className="w-7 h-7 rounded-lg bg-purple-100 flex items-center justify-center shrink-0">
                            <Layers className="w-3.5 h-3.5 text-purple-600" />
                          </div>
                        ) : (
                          <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                            <div className="w-2.5 h-2.5 rounded-full bg-gray-400" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate">{mat.material_name}</div>
                          <div className="text-xs text-gray-400 mt-0.5">
                            {mat.material_type === 'product' && stepQty > 0 && node.productSqm ? (() => {
                              const totalSqm = stepQty * node.productSqm;
                              const rollsNeeded = totalSqm * mat.quantity_per_sqm;
                              return (
                                <span className="font-semibold text-purple-700">
                                  Need: <span className="text-gray-900">{rollsNeeded % 1 === 0 ? rollsNeeded.toFixed(0) : rollsNeeded.toFixed(3)} {mat.unit}</span>
                                  <span className="ml-1 text-gray-400 font-normal">({stepQty} rolls × {node.productSqm.toFixed(2)} sqm = {totalSqm.toFixed(2)} sqm total)</span>
                                </span>
                              );
                            })() : (
                              <>
                                Need: <span className="font-medium text-gray-600">{mat.quantity_per_sqm.toFixed(6)} {mat.unit}/sqm</span>
                                {stepQty > 0 && node.productSqm && (
                                  <span className="ml-1 font-semibold text-gray-800">
                                    = {(mat.quantity_per_sqm * stepQty * node.productSqm).toFixed(3)} {mat.unit} total
                                  </span>
                                )}
                              </>
                            )}
                            {mat.material_type === 'product' && <span className="ml-2 text-purple-500 font-medium">sub-product</span>}
                            </div>
                          </div>
                        </div>
                        {getStockChip(mat)}
                      </div>

                      {/* Order raw material section */}
                      {isOutRaw && (
                        <div className="ml-9 rounded-lg border border-dashed border-red-200 bg-red-50 p-3">
                          {mos?.assignedUser ? (
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-red-600 flex items-center justify-center text-xs font-bold text-white">
                                  {mos.assignedUser.full_name?.charAt(0)?.toUpperCase() || '?'}
                                </div>
                                <span className="text-xs font-medium text-red-800">{mos.assignedUser.full_name}</span>
                                <CheckCircle className="w-3.5 h-3.5 text-green-600" />
                              </div>
                              <div className="flex items-center gap-1.5">
                                <button onClick={() => setMatOrderState(prev => ({ ...prev, [mat.material_id]: { ...prev[mat.material_id], assignedUser: null } }))} className="text-gray-400 hover:text-red-500">
                                  <X className="w-3.5 h-3.5" />
                                </button>
                                <Button size="sm" variant="destructive" className="h-7 text-xs gap-1" disabled={mos?.ordering} onClick={() => handleOrderRawMaterial(mat)}>
                                  {mos?.ordering ? <Loader2 className="w-3 h-3 animate-spin" /> : <ShoppingCart className="w-3 h-3" />}
                                  Order
                                </Button>
                              </div>
                            </div>
                          ) : mos?.pickingUser ? (
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-2 bg-white rounded border border-gray-200 px-2 py-1.5">
                                <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                <input
                                  className="flex-1 text-xs outline-none placeholder:text-gray-400"
                                  placeholder="Search user..."
                                  value={mos.search}
                                  onChange={e => setMatOrderState(prev => ({ ...prev, [mat.material_id]: { ...prev[mat.material_id], search: e.target.value } }))}
                                  autoFocus
                                />
                                <button onClick={() => setMatOrderState(prev => ({ ...prev, [mat.material_id]: { ...prev[mat.material_id], pickingUser: false, search: '' } }))}>
                                  <X className="w-3.5 h-3.5 text-gray-400" />
                                </button>
                              </div>
                              <div className="max-h-32 overflow-y-auto space-y-0.5">
                                {users.filter(u => {
                                  const q = (mos.search || '').toLowerCase();
                                  return !q || u.full_name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q);
                                }).map(u => (
                                  <button key={u.id} className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-white text-left text-xs"
                                    onClick={() => setMatOrderState(prev => ({ ...prev, [mat.material_id]: { ...prev[mat.material_id], assignedUser: u, pickingUser: false, search: '' } }))}>
                                    <div className="w-5 h-5 rounded-full bg-gray-300 flex items-center justify-center text-xs font-bold text-white shrink-0">
                                      {u.full_name?.charAt(0)?.toUpperCase() || '?'}
                                    </div>
                                    <span className="font-medium text-gray-800">{u.full_name}</span>
                                    <span className="text-gray-400">{u.role}</span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-xs text-red-700">Out of stock — assign someone to order it</p>
                              <div className="flex items-center gap-1.5">
                                <Button size="sm" variant="outline" className="h-7 text-xs gap-1 border-red-200 text-red-700 hover:bg-red-100"
                                  onClick={() => setMatOrderState(prev => ({ ...prev, [mat.material_id]: { ...prev[mat.material_id], ordering: false, pickingUser: true, search: '', assignedUser: null } }))}>
                                  <UserPlus className="w-3 h-3" />
                                  Assign
                                </Button>
                                <Button size="sm" variant="destructive" className="h-7 text-xs gap-1" disabled={mos?.ordering} onClick={() => handleOrderRawMaterial(mat)}>
                                  {mos?.ordering ? <Loader2 className="w-3 h-3 animate-spin" /> : <ShoppingCart className="w-3 h-3" />}
                                  Order (All)
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Assign section */}
            <div className={`rounded-xl border-2 border-dashed p-4 ${assignedUser ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-white'}`}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-gray-800">
                    {isMain ? 'Assign production to' : 'Assign this sub-production to'}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {assignedUser ? `Will be handled by ${assignedUser.full_name}` : 'Pick assigned personnel who will handle this step'}
                  </p>
                </div>
                {assignedUser ? (
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 bg-white border border-green-300 rounded-full pl-1 pr-3 py-1">
                      <div className="w-7 h-7 rounded-full bg-green-600 flex items-center justify-center text-sm font-bold text-white">
                        {assignedUser.full_name?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <span className="text-sm font-semibold text-green-800 max-w-32 truncate">{assignedUser.full_name}</span>
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                    </div>
                    <button onClick={() => clearAssignment(node.productId)} className="text-gray-400 hover:text-red-500 transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openPicker(node.productId, node.productName)}
                    className="gap-2 border-gray-300 hover:border-blue-400 hover:text-blue-600"
                  >
                    <UserPlus className="w-4 h-4" />
                    Assign Personnel
                  </Button>
                )}
              </div>

              {isPicking && renderUserPicker(node.productId, node.productName)}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  const assignedCount = Object.values(assignments).filter(a => a.assignedUser).length;
  const steps = recipeTree ? flattenToSteps(recipeTree) : [];

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-3xl max-h-[92vh] flex flex-col gap-0 p-0">
        {/* Header */}
        <div className="px-7 pt-6 pb-5 border-b border-gray-100 bg-white rounded-t-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5 text-xl">
              <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center">
                <Factory className="w-5 h-5 text-white" />
              </div>
              Send to Production
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-500 mt-2 leading-relaxed">
            Each step below shows what needs to be produced and in what order.
            Start from <strong>Step 1</strong> (deepest sub-product) and work up to the main product.
            Assign personnel to each step you want to schedule now.
          </p>
          <ProductAttributePreview
            color={productItem.color}
            pattern={productItem.pattern}
            length={productItem.length}
            width={productItem.width}
            lengthUnit={productItem.length_unit}
            widthUnit={productItem.width_unit}
            size="large"
            className="mt-2"
          />
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            Reserved stock rule: if this order is accepted and has reserved individual rolls, planning uses remaining quantity only. Otherwise, produce the full order quantity.
          </div>
          <div className="mt-3 flex items-center justify-between gap-3">
            <div className="text-xs text-gray-600">
              Order status: <span className="font-semibold uppercase">{orderStatus}</span> · Available: <span className="font-semibold">{globalAvailableRolls}</span> · Reserved for this order: <span className="font-semibold">{reservedRollsForOrder}</span> · Need to make: <span className="font-semibold">{Math.round(netProductionQuantity * 1000) / 1000}</span>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => setShowRollSelectionDialog(true)}>
                Select Rolls
              </Button>
              {orderStatus !== 'accepted' && (
                <Button
                  size="sm"
                  onClick={handleAcceptOrderAndReserve}
                  disabled={acceptingOrder}
                  className="gap-2"
                >
                  {acceptingOrder ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Accept Order
                </Button>
              )}
            </div>
          </div>
          <p className="mt-2 text-xs text-gray-500">
            After accepting, click <strong>Select Rolls</strong> and reserve individual rolls for this order item. Only reserved rolls reduce the required production quantity.
          </p>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-7 py-5 space-y-1 bg-gray-50">
          {loadingRecipe ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-3">
              <Loader2 className="w-8 h-8 animate-spin" />
              <span className="text-sm">Loading recipe tree & stock levels...</span>
            </div>
          ) : steps.length > 0 ? (
            <div className="space-y-0">
              {steps.map((node, i) => renderStepCard(node, i + 1, steps.length))}
            </div>
          ) : recipeTree ? (
            // Single product, no sub-products
            renderStepCard(recipeTree, 1, 1)
          ) : (
            // Fallback — no tree loaded
            <div className="rounded-2xl border-2 border-blue-400 bg-white overflow-hidden">
              <div className="px-5 py-3 bg-blue-600 flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center text-sm font-bold text-blue-600">1</div>
                <div>
                  <div className="text-white font-bold text-base">{productItem.productName}</div>
                  <div className="text-xs text-blue-100 mt-0.5">
                    Main product · Order: {orderQuantity} rolls · Available: {globalAvailableRolls} · Reserved: {reservedRollsForOrder} · Need: {Math.round(netProductionQuantity * 1000) / 1000} rolls
                  </div>
                </div>
              </div>
              <div className="px-5 py-4 space-y-3">
                <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-600">
                  <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  No recipe found — operator will plan materials manually
                </div>
                <div className="rounded-xl border-2 border-dashed border-gray-200 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-800">Assign production to</p>
                      <p className="text-xs text-gray-500 mt-0.5">Pick assigned personnel for this batch</p>
                    </div>
                    {mainProductId && assignments[mainProductId]?.assignedUser ? (
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-2 bg-white border border-green-300 rounded-full pl-1 pr-3 py-1">
                          <div className="w-7 h-7 rounded-full bg-green-600 flex items-center justify-center text-sm font-bold text-white">
                            {assignments[mainProductId].assignedUser!.full_name?.charAt(0)?.toUpperCase()}
                          </div>
                          <span className="text-sm font-semibold text-green-800">
                            {assignments[mainProductId].assignedUser!.full_name}
                          </span>
                        </div>
                        <button onClick={() => clearAssignment(mainProductId)} className="text-gray-400 hover:text-red-500">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => mainProductId && openPicker(mainProductId, productItem.productName)}
                        className="gap-2"
                      >
                        <UserPlus className="w-4 h-4" />
                        Assign Personnel
                      </Button>
                    )}
                  </div>
                  {mainProductId && assignments[mainProductId]?.picking && renderUserPicker(mainProductId, productItem.productName)}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-7 py-4 border-t border-gray-100 bg-white rounded-b-xl flex items-center justify-between gap-3">
          <div className="text-sm text-gray-400">
            {assignedCount > 0
              ? <span className="text-green-700 font-medium">{assignedCount} step{assignedCount > 1 ? 's' : ''} assigned</span>
              : 'No assignments yet — you can assign later in the production stage'}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onClose} disabled={submitting} className="px-5">
              Cancel
            </Button>
            <Button
              onClick={handleGoToProduction}
              disabled={submitting}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 gap-2"
            >
              {submitting
                ? <><Loader2 className="w-4 h-4 animate-spin" />Creating...</>
                : <><Factory className="w-4 h-4" />Send to Production</>}
            </Button>
          </div>
        </div>
      </DialogContent>
      <IndividualProductSelectionDialog
        isOpen={showRollSelectionDialog}
        onClose={() => setShowRollSelectionDialog(false)}
        orderItem={{
          id: (productItem as any).id,
          product_id: productItem.productId,
          product_name: productItem.productName,
          quantity: Number(productItem.quantity || 0),
          selected_individual_products: reservedSelections,
        }}
        onSave={handleSaveReservedRolls}
      />
    </Dialog>
  );
}
