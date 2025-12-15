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
import AddMaterialDialog from '@/components/materials/AddMaterialDialog';
import AddToInventoryDialog from '@/components/materials/AddToInventoryDialog';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Package, Plus, Loader2, X } from 'lucide-react';
import type { RawMaterial, MaterialFilters as MaterialFiltersType } from '@/types/material';
import { MaterialService } from '@/services/materialService';
import { ManageStockService } from '@/services/manageStockService';
import { SupplierService, type Supplier } from '@/services/supplierService';
import type { Notification } from '@/services/notificationService';
import { useToast } from '@/hooks/use-toast';
import { TruncatedText } from '@/components/ui/TruncatedText';
import { canDelete } from '@/utils/permissions';

type TabValue = 'inventory' | 'waste-recovery' | 'analytics' | 'notifications';

export default function MaterialList() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<TabValue>('inventory');
  const [materials, setMaterials] = useState<RawMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');
  const [filters, setFilters] = useState<MaterialFiltersType>({
    search: '',
    category: [],
    status: '',
    type: [],
    color: [],
    supplier: [],
    page: 1,
    limit: 50,
  });
  const [totalMaterials, setTotalMaterials] = useState(0);

  // Stats state
  const [materialStats, setMaterialStats] = useState({
    totalMaterials: 0,
    lowStockAlerts: 0,
    outOfStock: 0,
  });
  const [fullStats, setFullStats] = useState<any>(null); // Full stats for analytics tab
  const [statsLoading, setStatsLoading] = useState(false);

  // Notifications state
  const [notifications, setNotifications] = useState<Notification[]>([]);
  
  // Waste recovery state
  const [wasteCount, setWasteCount] = useState(0);

  // Dialog states
  const [isAddMaterialOpen, setIsAddMaterialOpen] = useState(false);
  const [isAddToInventoryOpen, setIsAddToInventoryOpen] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<RawMaterial | null>(null);
  const [editMode, setEditMode] = useState<'create' | 'edit'>('create');
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [materialToDelete, setMaterialToDelete] = useState<RawMaterial | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [canDeleteMaterials, setCanDeleteMaterials] = useState(false);

  // Restock dialog states
  const [isRestockDialogOpen, setIsRestockDialogOpen] = useState(false);
  const [selectedRestockMaterial, setSelectedRestockMaterial] = useState<RawMaterial | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [restockForm, setRestockForm] = useState({
    supplier: '',
    type: '',
    quantity: '',
    costPerUnit: '',
    expectedDelivery: '',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);

  // Check delete permission on mount
  useEffect(() => {
    setCanDeleteMaterials(canDelete('materials'));
  }, []);

  // Load materials FIRST, then stats in background
  const [hasLoadedInitial, setHasLoadedInitial] = useState(false);
  useEffect(() => {
    if (!hasLoadedInitial) {
      // Load suppliers for form - non-blocking
      loadSuppliers();
      loadNotifications(); // For unread count badge - non-blocking
      setHasLoadedInitial(true);
    }
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
        loadMaterialsFast();
        lastLoadedFiltersRef.current = currentFiltersKey;
      }
    }
  }, [filters, activeTab]);

  // Reload materials when page becomes visible ONLY if coming back from another window
  // (not when switching tabs within the app)
  const lastVisitRef = useRef(Date.now());
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && activeTab === 'inventory') {
        // Only reload if page was hidden for more than 30 seconds (likely went to another app)
        const timeSinceLastVisit = Date.now() - lastVisitRef.current;
        if (timeSinceLastVisit > 30000) {
    loadMaterials();
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
      const { materials: data, total } = await MaterialService.getMaterials(filters);
      setMaterials(data);
      setTotalMaterials(total || data.length);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load materials');
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  };

  // Full reload with stats (used after create/edit/delete)
  const loadMaterials = async () => {
    try {
      setLoading(true);
      setError(null);
      const { materials: data, total } = await MaterialService.getMaterials(filters);
      setMaterials(data);
      setTotalMaterials(total || data.length);
      // Also refresh stats
      loadStats();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load materials');
    } finally {
      setLoading(false);
    }
  };

  const statsLoadingRef = useRef(false);
  const loadStats = async () => {
    if (statsLoadingRef.current) return;

    try {
      statsLoadingRef.current = true;
      setStatsLoading(true);
      const stats = await MaterialService.getMaterialStats();

      // Save full stats for analytics tab
      setFullStats(stats);

      // Save summary for stat boxes
      setMaterialStats({
        totalMaterials: stats.totalMaterials || 0,
        lowStockAlerts: stats.lowStock || 0,
        outOfStock: stats.outOfStock || 0,
      });
    } catch (err) {
      console.error('Failed to load stats:', err);
      setMaterialStats({
        totalMaterials: totalMaterials || 0,
        lowStockAlerts: 0,
        outOfStock: 0,
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

  const handleStatusFilter = (value: string) => {
    setFilters({ ...filters, status: value, page: 1 });
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

  // Get all suppliers grouped by category they serve
  const getAllSuppliersGroupedByCategory = () => {
    const categoryMap = new Map<string, Array<{
      supplier: Supplier;
      type?: string;
      costPerUnit?: number;
      unit?: string;
      materialName?: string;
    }>>();

    // Group suppliers by categories they've supplied materials for
    materials.forEach((material) => {
      if (material.supplier_name && material.category) {
        const category = material.category;
        if (!categoryMap.has(category)) {
          categoryMap.set(category, []);
        }

        const categorySuppliers = categoryMap.get(category)!;
        const supplier = suppliers.find((s) => s.name === material.supplier_name);
        
        if (supplier) {
          // Check if supplier already exists in this category
          const existingSupplier = categorySuppliers.find((s) => s.supplier.id === supplier.id);
          if (!existingSupplier) {
            categorySuppliers.push({
              supplier,
              type: material.type,
              costPerUnit: material.cost_per_unit,
              unit: material.unit,
              materialName: material.name,
            });
          }
        }
      }
    });

    // Also add suppliers that don't have materials yet (in "Other" category)
    suppliers.forEach((supplier) => {
      let found = false;
      for (const [, categorySuppliers] of categoryMap) {
        if (categorySuppliers.some((s) => s.supplier.id === supplier.id)) {
          found = true;
          break;
        }
      }
      if (!found) {
        if (!categoryMap.has('Other')) {
          categoryMap.set('Other', []);
        }
        categoryMap.get('Other')!.push({ supplier });
      }
    });

    return categoryMap;
  };


  // Get suppliers for a specific category (for the info box)
  const getSuppliersForCategory = (category: string) => {
    const grouped = getAllSuppliersGroupedByCategory();
    return grouped.get(category) || [];
  };

  // Get supplier details by name (for form pre-fill)
  const getSupplierDetails = (supplierName: string, materialCategory?: string, materialName?: string) => {
    // First, try to find from materials matching category and name
    if (materialCategory && materialName) {
      const materialMatch = materials.find(
        (m) =>
          m.supplier_name === supplierName &&
          m.category === materialCategory &&
          m.name === materialName
      );
      if (materialMatch) {
        return {
          type: materialMatch.type || '',
          costPerUnit: materialMatch.cost_per_unit || 0,
          unit: materialMatch.unit || '',
        };
      }
    }

    // Then try to find from any material with this supplier
    const materialMatch = materials.find((m) => m.supplier_name === supplierName);
    if (materialMatch) {
      return {
        type: materialMatch.type || '',
        costPerUnit: materialMatch.cost_per_unit || 0,
        unit: materialMatch.unit || '',
      };
    }

    // Return empty if not found
    return {
      type: '',
      costPerUnit: 0,
      unit: '',
    };
  };

  const handleOrder = (material: RawMaterial) => {
    setSelectedRestockMaterial(material);

    // Get suppliers for this material's category
    const categorySuppliers = getSuppliersForCategory(material.category);

    // Pre-fill with first available supplier from category if any
    if (categorySuppliers.length > 0) {
      const firstSupplier = categorySuppliers[0];
      const supplierDetails = getSupplierDetails(
        firstSupplier.supplier.name,
        material.category,
        material.name
      );
      const materialIsOutOfStock = material.status === 'out-of-stock';
      setRestockForm({
        supplier: firstSupplier.supplier.name,
        type: supplierDetails.type || firstSupplier.type || '',
        quantity: '',
        costPerUnit: supplierDetails.costPerUnit > 0 
          ? supplierDetails.costPerUnit.toString() 
          : (firstSupplier.costPerUnit?.toString() || ''),
        expectedDelivery: '',
        notes: `${materialIsOutOfStock ? 'Order' : 'Restock'} for ${material.name}`,
      });
    } else {
      // Reset form if no suppliers available
      const materialIsOutOfStock = material.status === 'out-of-stock';
      setRestockForm({
        supplier: '',
        type: '',
        quantity: '',
        costPerUnit: '',
        expectedDelivery: '',
        notes: `${materialIsOutOfStock ? 'Order' : 'Restock'} for ${material.name}`,
      });
    }

    setIsRestockDialogOpen(true);
  };

  const handleRestockSupplierChange = (supplierName: string) => {
    if (supplierName === 'new_supplier') {
      setRestockForm((prev) => ({
        ...prev,
        supplier: 'new_supplier',
        type: '',
        costPerUnit: '',
      }));
      return;
    }

    if (!selectedRestockMaterial) return;

    // Get supplier details for this material
    const supplierDetails = getSupplierDetails(
      supplierName,
      selectedRestockMaterial.category,
      selectedRestockMaterial.name
    );

    setRestockForm((prev) => ({
      ...prev,
      supplier: supplierName,
      type: supplierDetails.type || prev.type,
      costPerUnit: supplierDetails.costPerUnit > 0 
        ? supplierDetails.costPerUnit.toString() 
        : prev.costPerUnit,
    }));
  };

  const handleRestockSubmit = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }

    // STRICT VALIDATION - Check all required fields first
    if (!selectedRestockMaterial || !restockForm.supplier || !restockForm.quantity || !restockForm.costPerUnit) {
      toast({
        title: 'Missing Required Fields',
        description: 'Please fill in all required fields before submitting.',
        variant: 'destructive',
      });
      return;
    }

    // Parse and validate quantity - MUST BE > 0
    const quantity = parseFloat(restockForm.quantity);
    if (isNaN(quantity) || quantity <= 0 || quantity === 0) {
      toast({
        title: 'Invalid Quantity',
        description: 'Quantity must be greater than 0. Minimum value is 0.01.',
        variant: 'destructive',
      });
      setRestockForm({ ...restockForm, quantity: '' });
      return;
    }

    // Parse and validate cost per unit - MUST BE > 0
    const costPerUnit = parseFloat(restockForm.costPerUnit);
    if (isNaN(costPerUnit) || costPerUnit <= 0 || costPerUnit === 0) {
      toast({
        title: 'Invalid Price',
        description: 'Cost per unit must be greater than 0. Minimum value is 0.01.',
        variant: 'destructive',
      });
      setRestockForm({ ...restockForm, costPerUnit: '' });
      return;
    }

    try {
      setSubmitting(true);

      // Create order (restock or new order based on material status)
      const orderIsOutOfStock = selectedRestockMaterial.status === 'out-of-stock';
      const totalCost = quantity * costPerUnit;

      // Get supplier ID if exists
      const supplierData = suppliers.find((s) => s.name === restockForm.supplier);
      const supplierId = supplierData?.id;

      const orderData = {
        supplier_name: restockForm.supplier === 'new_supplier' ? restockForm.supplier : restockForm.supplier,
        supplier_id: supplierId,
        order_date: new Date().toISOString().split('T')[0],
        expected_delivery: restockForm.expectedDelivery || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        total_amount: totalCost,
        status: 'pending' as const,
        material_details: {
          materialName: selectedRestockMaterial.name,
          materialType: restockForm.type,
          materialCategory: selectedRestockMaterial.category,
          materialBatchNumber: `BATCH-${Date.now()}`,
          quantity: quantity,
          unit: selectedRestockMaterial.unit,
          costPerUnit: costPerUnit,
          minThreshold: selectedRestockMaterial.min_threshold || 100,
          maxCapacity: selectedRestockMaterial.max_capacity || 1000,
          qualityGrade: 'A',
          isRestock: !orderIsOutOfStock,
          userNotes: restockForm.notes || '',
        },
        // Also include items array for backend compatibility
        items: [{
          material_id: selectedRestockMaterial.id,
          material_name: selectedRestockMaterial.name,
          quantity: quantity,
          unit: selectedRestockMaterial.unit,
          unit_price: costPerUnit,
          total_price: totalCost,
        }],
      };

      const orderResult = await ManageStockService.createOrder(orderData);

      if (!orderResult.success) {
        throw new Error(orderResult.error || 'Failed to create order');
      }

      toast({
        title: orderIsOutOfStock ? 'Material Order Created!' : 'Restock Order Created!',
        description: `${selectedRestockMaterial.name} ${orderIsOutOfStock ? 'order' : 'restock order'} has been created.`,
      });

      // Close dialog and reset form
      setIsRestockDialogOpen(false);
      setRestockForm({
        supplier: '',
        type: '',
        quantity: '',
        costPerUnit: '',
        expectedDelivery: '',
        notes: '',
      });
      setSelectedRestockMaterial(null);
    } catch (error) {
      console.error('Error creating restock order:', error);
      toast({
        title: 'Error Creating Restock Order',
        description: error instanceof Error ? error.message : 'There was an error creating the restock order. Please try again.',
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
    console.log('Import CSV');
    // TODO: Implement CSV import
    alert('CSV import feature coming soon');
  };

  const handleAddToInventory = () => {
    setIsAddToInventoryOpen(true);
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
      loadMaterials();
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
  const loadNotifications = async () => {
    if (notificationsLoadingRef.current) return;

    try {
      notificationsLoadingRef.current = true;
      const { NotificationService } = await import('@/services/notificationService');
      const materialNotifications = await NotificationService.getNotificationsByModule('materials');
      const unreadNotifications = (materialNotifications || []).filter(n => n.status === 'unread');
      setNotifications(unreadNotifications);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      notificationsLoadingRef.current = false;
    }
  };

  // Calculate unread notifications count
  const unreadCount = notifications.filter(n => n.status === 'unread').length;

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

  return (
    <Layout>
            <div>
        {/* Page Header */}
        <MaterialHeader
          onImportCSV={handleImportCSV}
          onAddToInventory={handleAddToInventory}
          onAddMaterial={handleCreate}
        />

        {/* Stats Boxes */}
        <MaterialStatsBoxes
          totalMaterials={materialStats.totalMaterials}
          lowStockAlerts={materialStats.lowStockAlerts}
          outOfStock={materialStats.outOfStock}
          loading={statsLoading}
        />

        {/* Tabs */}
        <MaterialTabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
          unreadCount={unreadCount}
          wasteCount={wasteCount}
        />

        {/* Filters - Only show on inventory tab */}
        {activeTab === 'inventory' && (
          <MaterialFilters
            filters={filters}
            viewMode={viewMode}
            onSearchChange={handleSearch}
            onCategoryChange={handleCategoryFilter}
            onStatusChange={handleStatusFilter}
            onTypeChange={handleTypeFilter}
            onColorChange={handleColorFilter}
            onSupplierChange={handleSupplierFilter}
            onViewModeChange={setViewMode}
          />
        )}

        {/* Inventory Tab Content */}
        {activeTab === 'inventory' && (
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
            canDelete={canDeleteMaterials}
          />
        )}

        {/* Waste Recovery Tab Content */}
        {activeTab === 'waste-recovery' && (
          <WasteRecoveryTab onRefresh={handleWasteRefresh} />
        )}

        {/* Analytics Tab Content */}
        {activeTab === 'analytics' && (
          <MaterialAnalyticsTab initialStats={fullStats} />
        )}

        {/* Notifications Tab Content */}
        {activeTab === 'notifications' && (
          <MaterialNotificationsTab />
        )}
                        </div>

      {/* Dialogs */}
      <AddMaterialDialog
        isOpen={isAddMaterialOpen}
        onClose={handleCloseDialog}
        onSuccess={handleMaterialSuccess}
        material={selectedMaterial}
        mode={editMode}
      />
      <AddToInventoryDialog
        isOpen={isAddToInventoryOpen}
        onClose={() => setIsAddToInventoryOpen(false)}
        onSuccess={handleMaterialSuccess}
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
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] flex flex-col">
            {/* Fixed Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
                        <div>
                <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  {selectedRestockMaterial.status === 'out-of-stock' ? 'Order' : 'Restock'}{' '}
                  <TruncatedText text={selectedRestockMaterial.name} maxLength={40} as="span" />
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  {selectedRestockMaterial.status === 'out-of-stock'
                    ? 'Order this material from available suppliers'
                    : 'Restock this material from available suppliers'}
                </p>
                        </div>
                          <button
                onClick={() => setIsRestockDialogOpen(false)}
                type="button"
                className="text-gray-400 hover:text-gray-600 transition-colors"
                          >
                <X className="w-5 h-5" />
                          </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Material Info Card */}
              <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                <div className="flex items-center gap-3">
                  {selectedRestockMaterial.image_url && (
                    <img
                      src={selectedRestockMaterial.image_url}
                      alt={selectedRestockMaterial.name}
                      className="w-16 h-16 rounded-lg object-cover border border-gray-200"
                    />
                  )}
                    <div className="flex-1">
                    <div className="font-semibold text-gray-900">
                      <TruncatedText text={selectedRestockMaterial.name} maxLength={50} as="span" />
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      Current stock: <span className="font-medium">{selectedRestockMaterial.current_stock} {selectedRestockMaterial.unit}</span>
                    </div>
                    <div className="text-sm text-gray-600">
                      Category: <span className="font-medium">{selectedRestockMaterial.category}</span>
                    </div>
                  </div>
                </div>
                    </div>

              {/* Available Suppliers */}
              {/* Available Suppliers by Category */}
              {(() => {
                const categorySuppliers = getSuppliersForCategory(selectedRestockMaterial.category);
                return categorySuppliers.length > 0 && (
                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-2">
                      Available Suppliers from {selectedRestockMaterial.category} Category
                    </Label>
                    <div className="space-y-2 max-h-32 overflow-y-auto border border-gray-200 rounded-lg p-3 bg-gray-50">
                      {categorySuppliers.map((item, index) => (
                        <div key={index} className="p-2 border border-gray-200 rounded-md text-sm bg-white">
                          <div className="font-medium text-gray-900">{item.supplier.name}</div>
                          {item.type && item.costPerUnit && item.unit && (
                            <div className="text-xs text-gray-600 mt-0.5">
                              Type: {item.type} | Cost: ₹{item.costPerUnit} | Unit: {item.unit}
                            </div>
                          )}
                    </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Supplier Selection */}
              <div>
                <Label htmlFor="restockSupplier" className="text-sm font-medium text-gray-700 mb-1 block">
                  Select Supplier *
                </Label>
                <Select
                  value={restockForm.supplier}
                  onValueChange={handleRestockSupplierChange}
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Select supplier" />
                  </SelectTrigger>
                  <SelectContent className="bg-white max-h-[300px]">
                    {suppliers.map((supplier) => {
                      const supplierDetails = getSupplierDetails(
                        supplier.name,
                        selectedRestockMaterial.category,
                        selectedRestockMaterial.name
                      );
                      return (
                        <SelectItem 
                          key={supplier.id} 
                          value={supplier.name}
                          className="bg-white hover:bg-gray-100"
                        >
                          <div className="flex flex-col">
                            <span className="font-medium">{supplier.name}</span>
                            {supplierDetails.type && supplierDetails.costPerUnit > 0 && (
                              <span className="text-xs text-gray-500">
                                {supplierDetails.type} • ₹{supplierDetails.costPerUnit} • {supplierDetails.unit || 'unit'}
                              </span>
                            )}
                          </div>
                        </SelectItem>
                      );
                    })}
                    <div className="border-t border-gray-200 my-1" />
                    <SelectItem value="new_supplier" className="bg-white hover:bg-gray-100">
                      <div className="flex items-center gap-2 text-blue-600">
                        <Plus className="w-4 h-4" />
                        Add New Supplier
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                {restockForm.supplier === 'new_supplier' && (
                  <Input
                    placeholder="Enter new supplier name"
                    className="mt-2"
                    onChange={(e) => setRestockForm({ ...restockForm, supplier: e.target.value })}
                  />
                )}
              </div>

              {/* Type and Quantity */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="restockType" className="text-sm font-medium text-gray-700 mb-1 block">
                    Material Type *
                  </Label>
                  <Input
                    id="restockType"
                    value={restockForm.type}
                    readOnly
                    disabled
                    className="bg-gray-100 cursor-not-allowed"
                    placeholder="Auto-filled from supplier"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Cannot be changed
                  </p>
                </div>
                <div>
                  <Label htmlFor="restockQuantity" className="text-sm font-medium text-gray-700 mb-1 block">
                    Quantity to Order *
                  </Label>
                  <Input
                    id="restockQuantity"
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={restockForm.quantity}
                    onChange={(e) => {
                      const value = e.target.value;
                      // Allow empty string for typing, but validate on blur/submit
                      if (value === '' || /^\d*\.?\d*$/.test(value)) {
                        // Prevent setting to exactly "0" - require at least 0.01
                        if (value !== '0') {
                          setRestockForm({ ...restockForm, quantity: value });
                        }
                      }
                    }}
                    onBlur={(e) => {
                      const value = parseFloat(e.target.value);
                      if (isNaN(value) || value <= 0) {
                        setRestockForm({ ...restockForm, quantity: '' });
                      }
                    }}
                    placeholder="Enter quantity (min: 0.01)"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Unit: {selectedRestockMaterial.unit}
                  </p>
                </div>
              </div>

              {/* Cost per Unit and Expected Delivery */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="restockCostPerUnit" className="text-sm font-medium text-gray-700 mb-1 block">
                    Cost per Unit (₹) *
                  </Label>
                  <Input
                    id="restockCostPerUnit"
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={restockForm.costPerUnit}
                    onChange={(e) => {
                      const value = e.target.value;
                      // Allow empty string for typing, but validate on blur/submit
                      if (value === '' || /^\d*\.?\d*$/.test(value)) {
                        // Prevent setting to exactly "0" - require at least 0.01
                        if (value !== '0') {
                          setRestockForm({ ...restockForm, costPerUnit: value });
                        }
                      }
                    }}
                    onBlur={(e) => {
                      const value = parseFloat(e.target.value);
                      if (isNaN(value) || value <= 0) {
                        setRestockForm({ ...restockForm, costPerUnit: '' });
                      }
                    }}
                    placeholder="Enter cost per unit (min: 0.01)"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Editable
                  </p>
                </div>
                <div>
                  <Label htmlFor="restockExpectedDelivery" className="text-sm font-medium text-gray-700 mb-1 block">
                    Expected Delivery Date
                  </Label>
                  <Input
                    id="restockExpectedDelivery"
                    type="date"
                    value={restockForm.expectedDelivery}
                    onChange={(e) => setRestockForm({ ...restockForm, expectedDelivery: e.target.value })}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <Label htmlFor="restockNotes" className="text-sm font-medium text-gray-700 mb-1 block">
                  Notes
                </Label>
                <Textarea
                  id="restockNotes"
                  value={restockForm.notes}
                  onChange={(e) => setRestockForm({ ...restockForm, notes: e.target.value })}
                  placeholder="Additional notes for this restock order"
                  rows={3}
                  className="resize-none"
                />
              </div>

              {/* Total Cost Calculation */}
              {restockForm.quantity && restockForm.costPerUnit && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="text-sm font-semibold text-blue-900">
                    Total Cost: ₹{(parseFloat(restockForm.quantity) * parseFloat(restockForm.costPerUnit)).toFixed(2)}
                  </div>
                  <div className="text-xs text-blue-700 mt-1">
                    {restockForm.quantity} {selectedRestockMaterial.unit} × ₹{restockForm.costPerUnit} per {selectedRestockMaterial.unit}
                  </div>
                </div>
              )}
            </div>

            {/* Fixed Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 flex-shrink-0">
              <Button
                variant="outline"
                onClick={() => setIsRestockDialogOpen(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button 
                onClick={(e) => {
                  e.preventDefault();
                  handleRestockSubmit(e);
                }} 
                disabled={
                  submitting || 
                  !restockForm.quantity || 
                  !restockForm.costPerUnit || 
                  restockForm.quantity === '0' ||
                  restockForm.costPerUnit === '0' ||
                  parseFloat(restockForm.quantity || '0') <= 0 || 
                  parseFloat(restockForm.costPerUnit || '0') <= 0 ||
                  isNaN(parseFloat(restockForm.quantity || '0')) ||
                  isNaN(parseFloat(restockForm.costPerUnit || '0'))
                }
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Order'
                )}
              </Button>
            </div>
          </div>
      </div>
      )}
    </Layout>
  );
}
