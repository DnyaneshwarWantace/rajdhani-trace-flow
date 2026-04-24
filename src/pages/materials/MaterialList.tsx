import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import MaterialHeader from '@/components/materials/MaterialHeader';
import MaterialStatsBoxes from '@/components/materials/MaterialStatsBoxes';
import MaterialTabs from '@/components/materials/MaterialTabs';
import MaterialFilters from '@/components/materials/MaterialFilters';
import MaterialInventoryTab from '@/components/materials/MaterialInventoryTab';
import WasteRecoveryTab from '@/components/materials/WasteRecoveryTab';
import MaterialAnalyticsTab from '@/components/materials/MaterialAnalyticsTab';
import MaterialNotificationsTab from '@/components/materials/MaterialNotificationsTab';
import MaterialAssignedTasksTab from '@/components/materials/MaterialAssignedTasksTab';
import AddMaterialDialog from '@/components/materials/AddMaterialDialog';
import AddToInventoryDialog from '@/components/materials/AddToInventoryDialog';
import RecordPeriodicUsageDialog from '@/components/materials/RecordPeriodicUsageDialog';
import ImportCSVDialog from '@/components/materials/ImportCSVDialog';
import ExportMaterialsDialog from '@/components/materials/ExportMaterialsDialog';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Package, Loader2, X, Bell } from 'lucide-react';
import type { RawMaterial, MaterialFilters as MaterialFiltersType, PeriodicDueMaterial } from '@/types/material';
import { toPeriodicDueMaterial } from '@/types/material';
import { MaterialService } from '@/services/materialService';
import { SupplierService, type Supplier } from '@/services/supplierService';
import type { Notification } from '@/services/notificationService';
import { useToast } from '@/hooks/use-toast';
import { TruncatedText } from '@/components/ui/TruncatedText';
import { canCreate, canDelete, canView } from '@/utils/permissions';
import PermissionDenied from '@/components/ui/PermissionDenied';
import { useLiveSyncRefresh } from '@/hooks/useLiveSyncRefresh';

type TabValue = 'inventory' | 'assigned-tasks' | 'waste-recovery' | 'analytics' | 'notifications';

export interface MaterialListProps {
  /** When set, only materials with this category are shown (e.g. "Ink" for Ink Management). */
  categoryFilter?: string;
  /** Page title (e.g. "Ink Management"). */
  pageTitle?: string;
  /** Page subtitle. */
  pageSubtitle?: string;
}

export default function MaterialList({ categoryFilter, pageTitle, pageSubtitle }: MaterialListProps = {}) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<TabValue>('inventory');
  const [materials, setMaterials] = useState<RawMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');
  const [filters, setFilters] = useState<MaterialFiltersType>({
    search: '',
    category: categoryFilter ? [categoryFilter] : [],
    status: [],
    type: [],
    color: [],
    supplier: [],
    page: 1,
    limit: 50,
    sortBy: 'name',
    sortOrder: 'asc',
  });
  const [totalMaterials, setTotalMaterials] = useState(0);

  // Stats state
  const [materialStats, setMaterialStats] = useState({
    totalMaterials: 0,
    inStock: 0,
    lowStockAlerts: 0,
    outOfStock: 0,
    overstock: 0,
  });
  const [fullStats, setFullStats] = useState<any>(null); // Full stats for analytics tab
  const [statsLoading, setStatsLoading] = useState(false);

  // Notifications state - load count from cache immediately
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(true); // Start with true to prevent empty state flash
  const [notificationCount, setNotificationCount] = useState(() => {
    const cached = localStorage.getItem('material_notification_count');
    return cached ? parseInt(cached, 10) : 0;
  });
  
  // Waste recovery state
  const [wasteCount, setWasteCount] = useState(0);
  const [assignedTasks, setAssignedTasks] = useState<any[]>([]);
  const activeAssignedTasks = assignedTasks.filter((task) => {
    const taskStatus = String(task?.related_data?.task_status || '').toLowerCase();
    const notificationStatus = String(task?.status || '').toLowerCase();
    const hasCreatedPurchaseOrder = Boolean(task?.related_data?.purchase_order_id);

    if (hasCreatedPurchaseOrder) return false;
    if (notificationStatus === 'dismissed') return false;
    if (taskStatus === 'completed' || taskStatus === 'cancelled') return false;
    return taskStatus === 'assigned' || taskStatus === 'in_progress' || taskStatus === '';
  });

  const [assignedTasksLoading, setAssignedTasksLoading] = useState(false);

  // Dialog states
  const [isAddMaterialOpen, setIsAddMaterialOpen] = useState(false);
  const [isAddToInventoryOpen, setIsAddToInventoryOpen] = useState(false);
  const [isImportCSVDialogOpen, setIsImportCSVDialogOpen] = useState(false);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<RawMaterial | null>(null);
  const [editMode, setEditMode] = useState<'create' | 'edit'>('create');
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [materialToDelete, setMaterialToDelete] = useState<RawMaterial | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [canDeleteMaterials, setCanDeleteMaterials] = useState(false);

  // Periodic usage (e.g. Ink) - 10-day reminder: load due materials and show reminder + toast
  const [periodicDueMaterials, setPeriodicDueMaterials] = useState<PeriodicDueMaterial[]>([]);
  const [isFixedReminderDay, setIsFixedReminderDay] = useState(false);
  const [periodicDueLoading, setPeriodicDueLoading] = useState(false);
  const [isRecordPeriodicOpen, setIsRecordPeriodicOpen] = useState(false);
  const [selectedPeriodicMaterial, setSelectedPeriodicMaterial] = useState<PeriodicDueMaterial | null>(null);
  const periodicReminderShownRef = useRef(false);

  // Restock dialog states
  const [isRestockDialogOpen, setIsRestockDialogOpen] = useState(false);
  const [selectedRestockMaterial, setSelectedRestockMaterial] = useState<RawMaterial | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [restockForm, setRestockForm] = useState({
    supplier: '',
    quantity: '',
    costPerUnit: '',
    invoiceNumber: '',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);

  // Check delete permission on mount
  useEffect(() => {
    setCanDeleteMaterials(canDelete('materials'));
  }, []);

  // Load materials FIRST, then stats in background
  const [hasLoadedInitial, setHasLoadedInitial] = useState(false);
  const notificationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!hasLoadedInitial) {
      // Load suppliers for form - non-blocking
      loadSuppliers();
      loadNotifications(true); // Initial load silent - no spinner; badge updates when ready
      loadAssignedTasks();
      setHasLoadedInitial(true);

      // Auto-refresh notifications every 60 seconds (silent - no loading spinner)
      // Only create interval once on initial load
      if (!notificationIntervalRef.current) {
        notificationIntervalRef.current = setInterval(() => {
          loadNotifications(true);
        }, 60000); // Changed from 30 seconds to 60 seconds
      }
    }

    return () => {
      if (notificationIntervalRef.current) {
        clearInterval(notificationIntervalRef.current);
        notificationIntervalRef.current = null;
      }
    };
  }, []);

  // Load stats AFTER materials are loaded (in background)
  useEffect(() => {
    if (materials.length > 0 && materialStats.totalMaterials === 0) {
      // Stats load in background after materials are visible
      loadStats();
    }
  }, [materials]);

  // Track last loaded filters to prevent unnecessary reloads
  const lastLoadedFiltersRef = useRef<string | null>(null);

  // Load inventory materials ONLY when filters actually change (not when switching tabs)
  useEffect(() => {
    if (activeTab === 'inventory') {
      const currentFiltersKey = JSON.stringify(filters);

      // Only load if filters changed OR first time loading
      if (lastLoadedFiltersRef.current !== currentFiltersKey) {
        lastLoadedFiltersRef.current = currentFiltersKey;
        loadMaterialsFast();
      }
    }
  }, [filters, activeTab]);

  // Load notifications with loading state when switching to notifications tab
  const hasLoadedNotificationsRef = useRef(false);
  useEffect(() => {
    if (activeTab === 'notifications' && !hasLoadedNotificationsRef.current) {
      hasLoadedNotificationsRef.current = true;
      loadNotifications(false); // Show loading spinner on first visit
    }
  }, [activeTab]);

  // Load periodic-due (10-day reminder) when on inventory tab
  const loadPeriodicDueMaterials = async () => {
    try {
      setPeriodicDueLoading(true);
      const { materials, isFixedReminderDay: fixedDay } = await MaterialService.getPeriodicDueMaterials();
      setPeriodicDueMaterials(materials || []);
      setIsFixedReminderDay(!!fixedDay);
      if (fixedDay && !periodicReminderShownRef.current) {
        periodicReminderShownRef.current = true;
        toast({
          title: 'Every 10 days reminder',
          description: 'Day 10, 20, 30. Record usage from the table row if needed.',
        });
      }
    } catch {
      setPeriodicDueMaterials([]);
      setIsFixedReminderDay(false);
    } finally {
      setPeriodicDueLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'inventory') loadPeriodicDueMaterials();
  }, [activeTab]);

  // Reload materials when page becomes visible ONLY if coming back from another window
  // (not when switching tabs within the app)
  const lastVisitRef = useRef(Date.now());
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && activeTab === 'inventory') {
        // Only reload if page was hidden for more than 30 seconds (likely went to another app)
        const timeSinceLastVisit = Date.now() - lastVisitRef.current;
        if (timeSinceLastVisit > 30000) {
          loadMaterialsFast();
        }
      } else if (document.visibilityState === 'hidden') {
        lastVisitRef.current = Date.now();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [activeTab]);

  // Track if already loading to prevent duplicate calls
  const loadingRef = useRef(false);

  // Fast materials load - only fetches materials, no stats
  const loadMaterialsFast = async () => {
    if (loadingRef.current) return; // Prevent duplicate calls

    try {
      loadingRef.current = true;
      setLoading(true);
      setError(null);

      // Build API filters - when categoryFilter is set (e.g. Ink Management), always filter by it
      const apiFilters: any = {
        category: categoryFilter ? [categoryFilter] : (filters.category && filters.category.length > 0 ? filters.category : undefined),
        status: filters.status && filters.status.length > 0 ? filters.status : undefined,
        type: filters.type && filters.type.length > 0 ? filters.type : undefined,
        color: filters.color && filters.color.length > 0 ? filters.color : undefined,
        supplier: filters.supplier && filters.supplier.length > 0 ? filters.supplier : undefined,
        page: filters.search ? 1 : filters.page, // Reset page if searching
        limit: filters.search ? 10000 : filters.limit, // Fetch all if searching
        sortBy: filters.sortBy || 'name',
        sortOrder: filters.sortOrder || 'asc',
      };

      // Remove undefined values
      Object.keys(apiFilters).forEach(key => apiFilters[key] === undefined && delete apiFilters[key]);

      let { materials: data, total } = await MaterialService.getMaterials(apiFilters);

      // Apply client-side search if search term exists
      if (filters.search && filters.search.trim()) {
        const searchLower = filters.search.toLowerCase().trim();
        data = data.filter((m: any) =>
          m.name?.toLowerCase().includes(searchLower) ||
          m.id?.toLowerCase().includes(searchLower) ||
          m.material_id?.toLowerCase().includes(searchLower) ||
          m.category?.toLowerCase().includes(searchLower) ||
          m.type?.toLowerCase().includes(searchLower) ||
          m.color?.toLowerCase().includes(searchLower) ||
          m.supplier_name?.toLowerCase().includes(searchLower) ||
          m.batch_number?.toLowerCase().includes(searchLower)
        );
        // Update total for search results
        total = data.length;
        // Apply pagination after client-side filtering
        const page = filters.page || 1;
        const limit = filters.limit || 50;
        const startIdx = (page - 1) * limit;
        const endIdx = startIdx + limit;
        data = data.slice(startIdx, endIdx);
        // Apply client-side sorting for search results
        const dir = filters.sortOrder === 'desc' ? -1 : 1;
        data = data.sort((a: any, b: any) => {
          switch (filters.sortBy) {
            case 'stock':
              return ((a.current_stock || 0) - (b.current_stock || 0)) * dir;
            case 'category':
              return (a.category || '').localeCompare(b.category || '') * dir;
            case 'type':
              return (a.type || '').localeCompare(b.type || '') * dir;
            case 'supplier':
              return (a.supplier_name || '').localeCompare(b.supplier_name || '') * dir;
            case 'recent':
              return (new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()) * (dir === 1 ? -1 : 1);
            case 'name':
            default:
              return (a.name || '').localeCompare(b.name || '') * dir;
          }
        });
      }
      // Note: When there's no search, API already handles pagination, so no need to slice again

      setMaterials(data);
      setTotalMaterials(total || data.length);
      // Do not reload stats on filter/sort - keep cards stable like Products and Orders pages
    } catch (err) {
      console.error('Error loading materials:', err);
      setError(err instanceof Error ? err.message : 'Failed to load materials');
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  };

  const statsLoadingRef = useRef(false);
  const loadStats = async () => {
    if (statsLoadingRef.current) return;

    try {
      statsLoadingRef.current = true;
      setStatsLoading(true);
      const stats = await MaterialService.getMaterialStats(categoryFilter);

      // Save full stats for analytics tab
      setFullStats(stats);

      // Save summary for stat boxes
      setMaterialStats({
        totalMaterials: stats.totalMaterials || 0,
        inStock: stats.inStock ?? 0,
        lowStockAlerts: stats.lowStock || 0,
        outOfStock: stats.outOfStock || 0,
        overstock: stats.overstock ?? 0,
      });
    } catch (err) {
      console.error('Failed to load stats:', err);
      setMaterialStats({
        totalMaterials: totalMaterials || 0,
        inStock: 0,
        lowStockAlerts: 0,
        outOfStock: 0,
        overstock: 0,
      });
    } finally {
      setStatsLoading(false);
      statsLoadingRef.current = false;
    }
  };

  // Filter handlers
  const handleSearch = (value: string) => {
    setFilters({ ...filters, search: value, page: 1 });
  };

  const handleCategoryFilter = (values: string[]) => {
    setFilters({ ...filters, category: values, page: 1 });
  };

  const handleStatusFilter = (values: string[]) => {
    setFilters({ ...filters, status: values, page: 1 });
  };

  const handleTypeFilter = (values: string[]) => {
    setFilters({ ...filters, type: values, page: 1 });
  };

  const handleColorFilter = (values: string[]) => {
    setFilters({ ...filters, color: values, page: 1 });
  };

  const handleSupplierFilter = (values: string[]) => {
    setFilters({ ...filters, supplier: values, page: 1 });
  };

  const handlePageChange = (page: number) => {
    setFilters({ ...filters, page });
  };

  const handleLimitChange = (limit: number) => {
    setFilters({ ...filters, limit, page: 1 });
  };

  const handleSortChange = (sortBy: string, sortOrder: 'asc' | 'desc') => {
    setFilters({ ...filters, sortBy, sortOrder, page: 1 });
  };

  // Material handlers
  const handleView = (material: RawMaterial) => {
    navigate(`/materials/${material.id}`);
  };

  const handleEdit = (material: RawMaterial) => {
    setSelectedMaterial(material);
    setEditMode('edit');
    setIsAddMaterialOpen(true);
  };

  const handleDelete = (material: RawMaterial) => {
    setMaterialToDelete(material);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!materialToDelete) return;

    setIsDeleting(true);
    try {
      // Prioritize custom id field (e.g., "MAT-251210-001") over MongoDB _id
      // Backend can handle both, but custom id is preferred
      const materialId = materialToDelete.id || materialToDelete._id;
      if (!materialId) {
        throw new Error('Material ID not found');
      }
      await MaterialService.deleteMaterial(materialId);

      // Optimistically remove from local state without full reload
      setMaterials(prev => prev.filter(m => (m.id || m._id) !== materialId));
      setTotalMaterials(prev => prev - 1);

      toast({
        title: 'Success',
        description: `Material "${materialToDelete.name}" has been deleted successfully`,
      });
      setIsDeleteDialogOpen(false);
      setMaterialToDelete(null);

      // Refresh stats in background without showing loading state
      loadStats();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete material',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const suppliersLoadingRef = useRef(false);
  const loadSuppliers = async () => {
    if (suppliersLoadingRef.current) return;

    try {
      suppliersLoadingRef.current = true;
      const result = await SupplierService.getSuppliers();
      if (result.data) {
        setSuppliers(result.data);
      }
    } catch (error) {
      console.error('Error loading suppliers:', error);
    } finally {
      suppliersLoadingRef.current = false;
    }
  };

  const handleRecordUsage = (material: RawMaterial) => {
    setSelectedPeriodicMaterial(toPeriodicDueMaterial(material));
    setIsRecordPeriodicOpen(true);
  };

  const handleOrder = (material: RawMaterial) => {
    setSelectedRestockMaterial(material);
    setRestockForm({
      supplier: material.supplier_name || '',
      quantity: '',
      costPerUnit: material.cost_per_unit != null && material.cost_per_unit > 0
        ? material.cost_per_unit.toString()
        : '',
      invoiceNumber: '',
      notes: '',
    });
    setIsRestockDialogOpen(true);
  };

  const loadAssignedTasks = async () => {
    try {
      setAssignedTasksLoading(true);
      const { OrderService } = await import('@/services/orderService');
      const result = await OrderService.getMyMaterialProcurementTasks();
      setAssignedTasks(result.data || []);
    } catch {
      setAssignedTasks([]);
    } finally {
      setAssignedTasksLoading(false);
    }
  };

  useLiveSyncRefresh({
    modules: ['materials', 'manage_stock', 'orders'],
    onRefresh: () => {
      loadAssignedTasks();
      if (activeTab === 'inventory') {
        loadMaterialsFast();
      }
      if (activeTab === 'notifications') {
        loadNotifications(true);
      }
      loadStats();
    },
    pollingMs: 6000,
  });

  const handleCreateOrderFromAssignedTask = async (task: any) => {
    const shortages = task?.related_data?.shortages || [];
    const primary = shortages[0] || {
      material_id: task?.related_data?.material_id,
      material_name: task?.related_data?.material_name,
      need_to_add: task?.related_data?.need_to_add,
      order_quantity: task?.related_data?.order_quantity,
    };
    if (!primary?.material_id) {
      toast({
        title: 'Error',
        description: 'Material information is missing in this task.',
        variant: 'destructive',
      });
      return;
    }
    try {
      const material = await MaterialService.getMaterialById(primary.material_id);
      handleOrder(material);
      setRestockForm((prev) => ({
        ...prev,
        quantity: primary.need_to_add && primary.need_to_add > 0
          ? String(primary.need_to_add)
          : String(primary.order_quantity || ''),
        notes: `Task: ${task?.related_data?.order_number || ''} · ${primary.material_name || ''}`.trim(),
      }));
      toast({
        title: 'Assigned Task Opened',
        description: 'Use this form to create the purchase order for your assigned task.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to load material for assigned task',
        variant: 'destructive',
      });
    }
  };


  const handleRestockSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!selectedRestockMaterial || !restockForm.quantity || !restockForm.costPerUnit || !restockForm.invoiceNumber) {
      toast({
        title: 'Missing Required Fields',
        description: 'Please fill in quantity, price, and invoice number.',
        variant: 'destructive',
      });
      return;
    }

    const quantity = parseFloat(restockForm.quantity);
    if (isNaN(quantity) || quantity <= 0) {
      toast({ title: 'Invalid Quantity', description: 'Quantity must be greater than 0.', variant: 'destructive' });
      setRestockForm({ ...restockForm, quantity: '' });
      return;
    }

    const costPerUnit = parseFloat(restockForm.costPerUnit);
    if (isNaN(costPerUnit) || costPerUnit <= 0) {
      toast({ title: 'Invalid Price', description: 'Cost per unit must be greater than 0.', variant: 'destructive' });
      setRestockForm({ ...restockForm, costPerUnit: '' });
      return;
    }

    try {
      setSubmitting(true);

      const { getApiUrl } = await import('@/utils/apiConfig');
      const API_URL = getApiUrl();
      const token = localStorage.getItem('auth_token');

      const response = await fetch(
        `${API_URL}/raw-materials/${encodeURIComponent(selectedRestockMaterial.id)}/adjust-stock`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` }),
          },
          body: JSON.stringify({
            quantity,
            reason: 'purchase',
            operator: 'user',
            notes: restockForm.notes || undefined,
            supplier_name: restockForm.supplier || undefined,
            cost_per_unit: costPerUnit,
            invoice_number: restockForm.invoiceNumber,
          }),
        }
      );

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to restock material');
      }

      toast({
        title: 'Restocked!',
        description: `${selectedRestockMaterial.name} stock updated by +${quantity} ${selectedRestockMaterial.unit}.`,
      });

      setIsRestockDialogOpen(false);
      setRestockForm({ supplier: '', quantity: '', costPerUnit: '', invoiceNumber: '', notes: '' });
      setSelectedRestockMaterial(null);
      loadAssignedTasks();

      // Refresh materials list
      const { materials: data, total } = await MaterialService.getMaterials(filters);
      setMaterials(data);
      setTotalMaterials(total || data.length);
      loadStats();
    } catch (error) {
      console.error('Error restocking material:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to restock. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreate = () => {
    setSelectedMaterial(null);
    setEditMode('create');
    setIsAddMaterialOpen(true);
  };

  const handleImportCSV = () => {
    setIsImportCSVDialogOpen(true);
  };

  const handleAddToInventory = () => {
    setIsAddToInventoryOpen(true);
  };

  const handleExport = () => {
    setIsExportDialogOpen(true);
  };

  const handleMaterialSuccess = async () => {
    // Reload data in background without showing full page loading
    try {
      const { materials: data, total } = await MaterialService.getMaterials(filters);
      setMaterials(data);
      setTotalMaterials(total || data.length);
      loadStats();
    } catch (err) {
      console.error('Error refreshing materials:', err);
      // Fallback to full reload if silent refresh fails
      loadMaterialsFast();
    }
    setSelectedMaterial(null);
    setEditMode('create');
  };

  const handleCloseDialog = () => {
    setIsAddMaterialOpen(false);
    setSelectedMaterial(null);
    setEditMode('create');
  };

  const notificationsLoadingRef = useRef(false);
  /** @param silent - if true, refresh in background without showing loading spinner (e.g. for interval refresh) */
  const loadNotifications = async (silent = false) => {
    if (notificationsLoadingRef.current) return;

    try {
      notificationsLoadingRef.current = true;
      if (!silent) setNotificationsLoading(true);
      const { NotificationService } = await import('@/services/notificationService');

      // Load ALL material notifications at once
      const materialNotifications = await NotificationService.getNotifications({
        module: 'materials',
        limit: 5000 // Load all
      });

      const allNotifs = materialNotifications.data || [];

      // Filter out activity logs - only show real notifications (both read and unread)
      const realNotifications = allNotifs.filter(n => {
        // Exclude activity logs (they have activity_log_id in related_data)
        if (n.related_data?.activity_log_id) return false;

        // Only include notification types, not info/success logs
        const notificationTypes = ['low_stock', 'restock_request', 'order_alert', 'warning', 'error'];
        return notificationTypes.includes(n.type);
      });

      const unreadCount = realNotifications.filter(n => n.status === 'unread').length;

      // Show ALL notifications (both read and unread)
      setNotifications(realNotifications);

      // Update count and cache for fast display
      setNotificationCount(unreadCount);
      localStorage.setItem('material_notification_count', unreadCount.toString());

      console.log('✅ Loaded ALL material notifications:', realNotifications.length);
    } catch (error) {
      console.error('Error loading notifications:', error);
      setNotifications([]);
    } finally {
      notificationsLoadingRef.current = false;
      // ALWAYS set loading to false, even if silent (fixes infinite loading bug)
      setNotificationsLoading(false);
    }
  };


  const loadWasteCount = async () => {
    try {
      const { WasteService } = await import('@/services/wasteService');
      const count = await WasteService.getWasteCount();
      setWasteCount(count);
    } catch (error) {
      console.error('Error loading waste count:', error);
    }
  };

  const handleWasteRefresh = async () => {
    // Reload data in background without showing full page loading
    loadWasteCount();
    try {
      const { materials: data, total } = await MaterialService.getMaterials(filters);
      setMaterials(data);
      setTotalMaterials(total || data.length);
      loadStats();
    } catch (err) {
      console.error('Error refreshing materials:', err);
    }
  };

  if (!canView('materials')) {
    return <Layout><PermissionDenied /></Layout>;
  }

  return (
    <Layout>
            <div>
        {/* Page Header - only show Export, Add to Inventory, Grid/Table on Inventory tab */}
        <MaterialHeader
          title={pageTitle}
          subtitle={pageSubtitle}
          onImportCSV={activeTab === 'inventory' && canCreate('materials') ? handleImportCSV : undefined}
          onExport={activeTab === 'inventory' ? handleExport : undefined}
          onAddToInventory={activeTab === 'inventory' ? handleAddToInventory : undefined}
          onAddMaterial={canCreate('materials') ? handleCreate : undefined}
          viewMode={viewMode}
          onViewModeChange={activeTab === 'inventory' ? setViewMode : undefined}
        />

        {/* Stats Boxes – when categoryFilter (e.g. Ink), stats are for that category only */}
        <MaterialStatsBoxes
          totalMaterials={materialStats.totalMaterials}
          inStock={materialStats.inStock}
          lowStockAlerts={materialStats.lowStockAlerts}
          outOfStock={materialStats.outOfStock}
          overstock={materialStats.overstock}
          loading={statsLoading}
          totalLabel={categoryFilter ? 'Total Ink Materials' : undefined}
        />

        {/* Tabs – hidden on Ink Management (categoryFilter); only inventory is shown there */}
        {!categoryFilter && (
          <MaterialTabs
            activeTab={activeTab}
            onTabChange={setActiveTab}
            unreadCount={notificationCount}
            wasteCount={wasteCount}
            assignedTaskCount={activeAssignedTasks.length}
          />
        )}

        {/* 10-day reminder – info only, on fixed days (10, 20, 30). Record from table row. */}
        {(activeTab === 'inventory' || categoryFilter) && (periodicDueLoading ? (
          <div className="mb-4 py-2 text-sm text-gray-500">Checking…</div>
        ) : isFixedReminderDay ? (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2">
            <Bell className="h-5 w-5 text-amber-600 shrink-0" aria-hidden="true" />
            <span className="text-sm font-medium text-amber-800">Every 10 days reminder (day 10, 20, 30).</span>
          </div>
        ) : null)}

        {/* Filters - Only show on inventory tab (or always when Ink Management) */}
        {(activeTab === 'inventory' || categoryFilter) && (
          <MaterialFilters
            filters={filters}
            onSearchChange={handleSearch}
            onCategoryChange={categoryFilter ? undefined : handleCategoryFilter}
            onStatusChange={handleStatusFilter}
            onTypeChange={handleTypeFilter}
            onColorChange={handleColorFilter}
            onSupplierChange={handleSupplierFilter}
            onSortChange={handleSortChange}
            excludeCategories={categoryFilter ? undefined : ['Ink']}
          />
        )}

        {/* Inventory Tab Content */}
        {(activeTab === 'inventory' || categoryFilter) && (
          <MaterialInventoryTab
            materials={materials}
            loading={loading}
            error={error}
            filters={filters}
            viewMode={viewMode}
            totalMaterials={totalMaterials}
            onSearchChange={handleSearch}
            onCategoryChange={handleCategoryFilter}
            onStatusChange={handleStatusFilter}
            onViewModeChange={setViewMode}
            onPageChange={handlePageChange}
            onLimitChange={handleLimitChange}
            onView={handleView}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onOrder={handleOrder}
            onRecordUsage={handleRecordUsage}
            canDelete={canDeleteMaterials}
          />
        )}

        {/* Waste Recovery / Analytics / Notifications – only on Materials page, not Ink Management */}
        {!categoryFilter && activeTab === 'waste-recovery' && (
          <WasteRecoveryTab onRefresh={handleWasteRefresh} />
        )}
        {!categoryFilter && activeTab === 'assigned-tasks' && (
          <MaterialAssignedTasksTab
            tasks={activeAssignedTasks}
            loading={assignedTasksLoading}
            onCreateOrder={handleCreateOrderFromAssignedTask}
          />
        )}
        {!categoryFilter && activeTab === 'analytics' && (
          <MaterialAnalyticsTab initialStats={fullStats} />
        )}
        {!categoryFilter && activeTab === 'notifications' && (
          <MaterialNotificationsTab
            notifications={notifications}
            loading={notificationsLoading}
          />
        )}
                        </div>

      {/* Dialogs */}
      <AddMaterialDialog
        isOpen={isAddMaterialOpen}
        onClose={handleCloseDialog}
        onSuccess={handleMaterialSuccess}
        material={selectedMaterial}
        mode={editMode}
        fixedCategory={categoryFilter}
        excludeCategories={categoryFilter ? undefined : ['Ink']}
      />
      <RecordPeriodicUsageDialog
        isOpen={isRecordPeriodicOpen}
        onClose={() => {
          setIsRecordPeriodicOpen(false);
          setSelectedPeriodicMaterial(null);
        }}
        onSuccess={() => {
          loadMaterialsFast();
          loadPeriodicDueMaterials();
        }}
        materials={
          selectedPeriodicMaterial
            ? [
                selectedPeriodicMaterial,
                ...periodicDueMaterials.filter(
                  (m) => (m.id || m._id) !== (selectedPeriodicMaterial.id || selectedPeriodicMaterial._id),
                ),
              ]
            : periodicDueMaterials
        }
        preselectedMaterial={selectedPeriodicMaterial}
      />
      <AddToInventoryDialog
        isOpen={isAddToInventoryOpen}
        onClose={() => setIsAddToInventoryOpen(false)}
        onSuccess={handleMaterialSuccess}
        fixedCategory={categoryFilter}
        excludeCategories={categoryFilter ? undefined : ['Ink']}
      />

      {/* CSV Import Dialog */}
      <ImportCSVDialog
        open={isImportCSVDialogOpen}
        onOpenChange={setIsImportCSVDialogOpen}
        onSuccess={handleMaterialSuccess}
      />

      {/* Export Dialog */}
      <ExportMaterialsDialog
        open={isExportDialogOpen}
        onOpenChange={setIsExportDialogOpen}
        materials={materials}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-[90vw] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Delete Material</DialogTitle>
          </DialogHeader>
          <div className="text-sm text-muted-foreground break-words overflow-hidden">
            Are you sure you want to delete{' '}
            <span className="font-semibold text-gray-900 break-all">
              {materialToDelete?.name ? (
                <TruncatedText text={`"${materialToDelete.name}"`} maxLength={50} as="span" />
              ) : (
                '"this material"'
              )}
            </span>
            ? This action cannot be undone.
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteDialogOpen(false);
                setMaterialToDelete(null);
              }}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Restock Dialog */}
      {isRestockDialogOpen && selectedRestockMaterial && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Restock{' '}
                  <TruncatedText text={selectedRestockMaterial.name} maxLength={40} as="span" />
                </h2>
                <p className="text-sm text-gray-500 mt-1">Stock will be updated immediately</p>
              </div>
              <button
                onClick={() => setIsRestockDialogOpen(false)}
                type="button"
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Material Info */}
              <div className="p-3 border border-gray-200 rounded-lg bg-gray-50 flex items-center gap-3">
                {selectedRestockMaterial.image_url && (
                  <img
                    src={selectedRestockMaterial.image_url}
                    alt={selectedRestockMaterial.name}
                    className="w-12 h-12 rounded-lg object-cover border border-gray-200 flex-shrink-0"
                  />
                )}
                <div>
                  <div className="font-medium text-gray-900">
                    <TruncatedText text={selectedRestockMaterial.name} maxLength={50} as="span" />
                  </div>
                  <div className="text-sm text-gray-500">
                    Current stock: <span className="font-medium text-gray-700">{selectedRestockMaterial.current_stock} {selectedRestockMaterial.unit}</span>
                    {selectedRestockMaterial.cost_per_unit != null && selectedRestockMaterial.cost_per_unit > 0 && (
                      <span className="ml-3">Last price: <span className="font-medium text-gray-700">₹{selectedRestockMaterial.cost_per_unit}</span></span>
                    )}
                  </div>
                </div>
              </div>

              {/* Supplier */}
              <div>
                <Label htmlFor="restockSupplier" className="text-sm font-medium text-gray-700 mb-1 block">
                  Supplier Name
                  {selectedRestockMaterial.supplier_name && (
                    <span className="text-xs text-gray-400 font-normal ml-1">(pre-filled from material, editable)</span>
                  )}
                </Label>
                <Input
                  id="restockSupplier"
                  value={restockForm.supplier}
                  onChange={(e) => setRestockForm({ ...restockForm, supplier: e.target.value })}
                  placeholder="Enter supplier name"
                  list="restock-suppliers-list"
                />
                <datalist id="restock-suppliers-list">
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.name} />
                  ))}
                </datalist>
              </div>

              {/* Quantity + Price */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="restockQuantity" className="text-sm font-medium text-gray-700 mb-1 block">
                    Quantity *
                  </Label>
                  <Input
                    id="restockQuantity"
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={restockForm.quantity}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === '' || (/^\d*\.?\d*$/.test(v) && v !== '0')) {
                        setRestockForm({ ...restockForm, quantity: v });
                      }
                    }}
                    onBlur={(e) => {
                      if (isNaN(parseFloat(e.target.value)) || parseFloat(e.target.value) <= 0)
                        setRestockForm({ ...restockForm, quantity: '' });
                    }}
                    placeholder={`Min 0.01 ${selectedRestockMaterial.unit}`}
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">Unit: {selectedRestockMaterial.unit}</p>
                </div>
                <div>
                  <Label htmlFor="restockCostPerUnit" className="text-sm font-medium text-gray-700 mb-1 block">
                    Price per {selectedRestockMaterial.unit} (₹) *
                  </Label>
                  <Input
                    id="restockCostPerUnit"
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={restockForm.costPerUnit}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === '' || (/^\d*\.?\d*$/.test(v) && v !== '0')) {
                        setRestockForm({ ...restockForm, costPerUnit: v });
                      }
                    }}
                    onBlur={(e) => {
                      if (isNaN(parseFloat(e.target.value)) || parseFloat(e.target.value) <= 0)
                        setRestockForm({ ...restockForm, costPerUnit: '' });
                    }}
                    placeholder="Enter price"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">Becomes new current price</p>
                </div>
              </div>

              {/* Invoice Number */}
              <div>
                <Label htmlFor="restockInvoice" className="text-sm font-medium text-gray-700 mb-1 block">
                  Invoice Number *
                </Label>
                <Input
                  id="restockInvoice"
                  value={restockForm.invoiceNumber}
                  onChange={(e) => setRestockForm({ ...restockForm, invoiceNumber: e.target.value })}
                  placeholder="Enter invoice / bill number"
                  required
                />
              </div>

              {/* Notes */}
              <div>
                <Label htmlFor="restockNotes" className="text-sm font-medium text-gray-700 mb-1 block">
                  Notes <span className="text-gray-400 font-normal">(optional)</span>
                </Label>
                <Textarea
                  id="restockNotes"
                  value={restockForm.notes}
                  onChange={(e) => setRestockForm({ ...restockForm, notes: e.target.value })}
                  placeholder="Any additional notes"
                  rows={2}
                  className="resize-none"
                />
              </div>

              {/* Total Cost */}
              {restockForm.quantity && restockForm.costPerUnit &&
                parseFloat(restockForm.quantity) > 0 && parseFloat(restockForm.costPerUnit) > 0 && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="text-sm font-semibold text-green-900">
                    Total: ₹{(parseFloat(restockForm.quantity) * parseFloat(restockForm.costPerUnit)).toFixed(2)}
                  </div>
                  <div className="text-xs text-green-700 mt-0.5">
                    {restockForm.quantity} {selectedRestockMaterial.unit} × ₹{restockForm.costPerUnit}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 flex-shrink-0">
              <Button variant="outline" onClick={() => setIsRestockDialogOpen(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button
                onClick={(e) => { e.preventDefault(); handleRestockSubmit(e); }}
                className="bg-primary-600 hover:bg-primary-700 text-white"
                disabled={
                  submitting ||
                  !restockForm.quantity ||
                  !restockForm.costPerUnit ||
                  !restockForm.invoiceNumber ||
                  parseFloat(restockForm.quantity || '0') <= 0 ||
                  parseFloat(restockForm.costPerUnit || '0') <= 0
                }
              >
                {submitting ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Restocking...</>
                ) : (
                  'Restock Now'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
