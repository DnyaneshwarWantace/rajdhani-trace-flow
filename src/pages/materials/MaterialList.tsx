import { useState, useEffect } from 'react';
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
  DialogDescription,
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
    category: '',
    status: '',
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

  useEffect(() => {
    if (activeTab === 'inventory') {
      loadMaterials();
      loadStats();
    } else if (activeTab === 'analytics') {
      loadStats();
    } else if (activeTab === 'notifications') {
      loadNotifications();
    } else if (activeTab === 'waste-recovery') {
      loadWasteCount();
    }
  }, [activeTab, filters]);

  useEffect(() => {
    loadSuppliers();
  }, []);

  // Load waste count on mount and when needed
  useEffect(() => {
    loadWasteCount();
  }, []);

  // Reload materials when page becomes visible (e.g., when returning from Manage Stock page)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
    loadMaterials();
        loadStats();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  const loadMaterials = async () => {
    try {
      setLoading(true);
      setError(null);
      const { materials: data, total } = await MaterialService.getMaterials(filters);
      setMaterials(data);
      setTotalMaterials(total || data.length);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load materials');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      setStatsLoading(true);
      // Fetch stats from backend (without pagination/filters for accurate totals)
      const stats = await MaterialService.getMaterialStats();
      setMaterialStats({
        totalMaterials: stats.totalMaterials || 0,
        lowStockAlerts: stats.lowStock || 0,
        outOfStock: stats.outOfStock || 0,
      });
    } catch (err) {
      console.error('Failed to load stats:', err);
      // Fallback: use total from pagination if stats endpoint fails
      setMaterialStats({
        totalMaterials: totalMaterials || 0,
        lowStockAlerts: 0,
        outOfStock: 0,
      });
    } finally {
      setStatsLoading(false);
    }
  };

  // Filter handlers
  const handleSearch = (value: string) => {
    setFilters({ ...filters, search: value, page: 1 });
  };

  const handleCategoryFilter = (value: string) => {
    setFilters({ ...filters, category: value, page: 1 });
  };

  const handleStatusFilter = (value: string) => {
    setFilters({ ...filters, status: value, page: 1 });
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
      await MaterialService.deleteMaterial(materialToDelete._id || materialToDelete.id);
      toast({
        title: 'Success',
        description: `Material "${materialToDelete.name}" has been deleted successfully`,
      });
      setIsDeleteDialogOpen(false);
      setMaterialToDelete(null);
      loadMaterials();
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

  const loadSuppliers = async () => {
    try {
      const result = await SupplierService.getSuppliers();
      if (result.data) {
        setSuppliers(result.data);
      }
    } catch (error) {
      console.error('Error loading suppliers:', error);
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

  const handleRestockSubmit = async () => {
    if (!selectedRestockMaterial || !restockForm.supplier || !restockForm.quantity || !restockForm.costPerUnit) {
      toast({
        title: 'Missing Required Fields',
        description: 'Please fill in all required fields before submitting.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSubmitting(true);

      // Create order (restock or new order based on material status)
      const orderIsOutOfStock = selectedRestockMaterial.status === 'out-of-stock';
      const quantity = parseFloat(restockForm.quantity);
      const costPerUnit = parseFloat(restockForm.costPerUnit);
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

  const handleMaterialSuccess = () => {
    loadMaterials();
    loadStats();
    setSelectedMaterial(null);
    setEditMode('create');
  };

  const handleCloseDialog = () => {
    setIsAddMaterialOpen(false);
    setSelectedMaterial(null);
    setEditMode('create');
  };

  const loadNotifications = async () => {
    try {
      // Load material-related notifications
      const { NotificationService } = await import('@/services/notificationService');
      const materialNotifications = await NotificationService.getNotificationsByModule('materials');
      
      // Filter for unread notifications only
      const unreadNotifications = (materialNotifications || []).filter(n => n.status === 'unread');
      
      setNotifications(unreadNotifications);
      console.log('📢 Loaded material notifications:', unreadNotifications.length);
    } catch (error) {
      console.error('Error loading notifications:', error);
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

  const handleWasteRefresh = () => {
    loadWasteCount();
    loadMaterials();
    loadStats();
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
          />
        )}

        {/* Waste Recovery Tab Content */}
        {activeTab === 'waste-recovery' && (
          <WasteRecoveryTab onRefresh={handleWasteRefresh} />
        )}

        {/* Analytics Tab Content */}
        {activeTab === 'analytics' && (
          <MaterialAnalyticsTab />
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Material</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{materialToDelete?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
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
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
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
                  {selectedRestockMaterial.status === 'out-of-stock' ? 'Order' : 'Restock'} {selectedRestockMaterial.name}
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
                    <div className="font-semibold text-gray-900">{selectedRestockMaterial.name}</div>
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
                    type="text"
                    value={restockForm.quantity}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === '' || /^\d*\.?\d*$/.test(value)) {
                        setRestockForm({ ...restockForm, quantity: value });
                      }
                    }}
                    placeholder="Enter quantity"
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
                    type="text"
                    value={restockForm.costPerUnit}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === '' || /^\d*\.?\d*$/.test(value)) {
                        setRestockForm({ ...restockForm, costPerUnit: value });
                      }
                    }}
                    placeholder="Auto-filled from supplier"
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
              <Button onClick={handleRestockSubmit} disabled={submitting}>
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
