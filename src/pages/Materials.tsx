import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { DropdownService } from "@/services/api/dropdownService";
import { PurchaseOrderService } from "@/services/api/purchaseOrderService";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search, TrendingDown, Package, AlertTriangle, Recycle, ShoppingCart, History, Upload, Image, X, Download, FileSpreadsheet, CheckCircle, AlertCircle, Clock, RotateCcw, Trash2, Bell } from "lucide-react";
import React from "react";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { useNavigate, useLocation } from "react-router-dom";
import { rawMaterialService } from "@/services/rawMaterialService";
import MongoDBNotificationService from "@/services/api/notificationService";
import { WasteManagementService } from "@/services/wasteManagementService";
import WasteService from "@/services/api/wasteService";
import { useToast } from "@/hooks/use-toast";
import { getFromStorage, fixNestedArray, markNotificationAsRead, resolveNotification } from "@/lib/storageUtils";

// Generate unique ID function
const generateUniqueId = (prefix: string): string => {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substr(2, 5);
  return `${prefix}_${timestamp}_${randomStr}`;
};

/*
 * MATERIAL HANDLING LOGIC:
 *
 * 1. "Create Material Order" (Materials page):
 *    - ALWAYS creates NEW materials
 *    - Even if name is same, different supplier/price/quality = NEW material
 *    - Order goes to Manage Stock page
 *    - When delivered, checks for EXACT matches in existing inventory
 *
 * 2. "Add to Inventory" (Materials page):
 *    - ALWAYS creates NEW materials
 *    - For adding materials directly to inventory
 *    - No merging with existing materials
 *
 * 3. "Restock" (Manage Stock page):
 *    - Only when order is delivered
 *    - Checks ALL fields: name, type, category, supplier, price, quality, unit
 *    - If EXACT match found = RESTOCK (update existing)
 *    - If ANY field different = NEW MATERIAL (create new entry)
 *
 * This ensures materials with same name but different specifications
 * are treated as separate products, maintaining inventory accuracy.
 */

interface RawMaterial {
  id: string;
  name: string;
  type: string;
  category: string;
  currentStock: number;
  unit: string;
  minThreshold: number;
  maxCapacity: number;
  reorderPoint: number;
  lastRestocked: string;
  dailyUsage: number;
  status: "in-stock" | "low-stock" | "out-of-stock" | "overstock" | "in-transit";
  supplier: string;
  supplierId: string;
  costPerUnit: number;
  totalValue: number;
  batchNumber: string;
  qualityGrade?: string;
  color?: string;
  imageUrl?: string;
  materialsUsed: MaterialConsumption[];
  supplierPerformance: number;
}

interface MaterialConsumption {
  id: string;
  productionBatchId: string;
  stepId: number;
  stepName: string;
  consumedQuantity: number;
  wasteQuantity: number;
  consumptionDate: string;
  operator: string;
  productId?: string;
  individualProductId?: string;
}

interface MaterialPurchase {
  id: string;
  materialId: string;
  materialName: string;
  materialType?: string;
  materialCategory?: string;
  materialBatchNumber?: string;
  supplierId: string;
  supplierName: string;
  quantity: number;
  unit: string;
  costPerUnit: number;
  totalCost: number;
  purchaseDate: string;
  expectedDelivery: string;
  status: "ordered" | "in-transit" | "received" | "inspected";
  inspector: string;
  inspectionDate: string;
  notes: string;
  minThreshold?: number;
  maxCapacity?: number;
  qualityGrade?: string;
  isRestock?: boolean;
}

interface StockAlert {
  id: string;
  materialId: string;
  materialName: string;
  alertType: "low-stock" | "out-of-stock" | "overstock" | "expiry";
  currentLevel: number;
  threshold: number;
  severity: "low" | "medium" | "high" | "critical";
  message: string;
  date: string;
  status: "active" | "acknowledged" | "resolved";
}

interface WasteItem {
  id: string;
  productionId: string;
  productName: string;
  materialType?: 'raw_material' | 'product'; // Track if it's a raw material or product
  wasteType: string;
  quantity: number;
  unit: string;
  generatedAt: string;
  status: 'available_for_reuse' | 'added_to_inventory' | 'disposed' | 'reused';
  addedAt?: string;
}

interface Settings {
  customCategories: string[];
  customUnits: string[];
  defaultThresholds: {
    min: number;
    max: number;
    reorder: number;
  };
  notifications: {
    lowStock: boolean;
    reorder: boolean;
    expiry: boolean;
  };
  lastStockUpdate: {
    timestamp: string;
    user: string;
  } | null;
}

// MongoDB service is now used instead of Supabase

const statusStyles = {
  "in-stock": "bg-success text-success-foreground",
  "low-stock": "bg-warning text-warning-foreground",
  "out-of-stock": "bg-destructive text-destructive-foreground",
  "overstock": "bg-blue-100 text-blue-800 border-blue-200",
  "in-transit": "bg-orange-100 text-orange-800 border-orange-200"
};

// Waste Recovery Tab Component
const WasteRecoveryTab = ({
  wasteRecoveryRefresh,
  onReturnToInventory
}: {
  wasteRecoveryRefresh: number;
  onReturnToInventory: (waste: WasteItem) => void;
}) => {
  const [wasteData, setWasteData] = useState<WasteItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadWasteData = async () => {
      setLoading(true);
      try {
        // Load waste data from MongoDB
        const { data: wasteItems } = await WasteService.getAllWaste();
        console.log(`✅ Loaded ${wasteItems?.length || 0} waste items from MongoDB`);
        
        // Map MongoDB waste data to WasteItem interface
        const mappedWaste: WasteItem[] = (wasteItems || []).map((item: any) => {
          // Debug: Log the actual item data
          console.log('🔍 Waste item from backend:', {
            id: item.id,
            waste_type: item.waste_type,
            can_be_reused: item.can_be_reused,
            waste_category: item.waste_category,
            status: item.status,
            added_at: item.added_at,
            material_name: item.material_name
          });

          // Determine status correctly:
          // - If can_be_reused is true AND hasn't been added yet (no added_at), status = 'available_for_reuse'
          // - If has been added (has added_at or status is 'added_to_inventory' or 'reused'), status = 'added_to_inventory'
          // - Otherwise (can_be_reused is false and not added), status = 'disposed'
          let status: 'available_for_reuse' | 'added_to_inventory' | 'disposed' | 'reused';
          
          // Check if already added to inventory
          const isAdded = item.added_at || item.status === 'added_to_inventory' || item.status === 'reused';
          
          if (isAdded) {
            status = 'added_to_inventory';
          } else {
            // Check if can be reused - check both can_be_reused field and waste_category
            const canBeReused = item.can_be_reused === true || item.can_be_reused === 'true' || item.waste_category === 'reusable';
            if (canBeReused) {
              status = 'available_for_reuse';
            } else {
              status = 'disposed';
            }
          }
          
          console.log('✅ Mapped status:', status, 'for item:', item.id);
          
          return {
            id: item.id,
            productionId: item.production_batch_id || item.batch_id || '',
            productName: item.material_name || '',
            materialType: item.material_type || 'raw_material', // Include material type
            wasteType: WasteService.mapWasteTypeToDisplay(item.waste_type || ''),
            quantity: item.quantity || 0,
            unit: item.unit || '',
            generatedAt: item.created_at || item.generation_date || new Date().toISOString(),
            status: status,
            addedAt: item.added_at || (status === 'added_to_inventory' ? item.updated_at : null)
          };
        });
        
        setWasteData(mappedWaste);
      } catch (error) {
        console.error('Error loading waste data:', error);
        setWasteData([]);
      } finally {
        setLoading(false);
      }
    };

    loadWasteData();
  }, [wasteRecoveryRefresh]);

  if (loading) {
    return <div className="text-center py-8">Loading waste recovery data...</div>;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Recycle className="w-5 h-5" />
            Waste Recovery Management
          </CardTitle>
          <CardDescription>
            Recover reusable materials from production waste and return them to inventory
          </CardDescription>
        </CardHeader>
        <CardContent>
          {wasteData.length === 0 ? (
            <div className="text-center py-8">
              <Recycle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground mb-2">
                No waste data found
              </h3>
              <p className="text-sm text-muted-foreground">
                Waste materials from production will appear here for recovery.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-4 font-medium text-muted-foreground">Status</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">Material</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">Quantity</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">Waste Type</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">Product Info</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">Generated</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {wasteData.map((waste) => (
                    <tr key={waste.id} className="border-b hover:bg-muted/50">
                      <td className="p-3">
                        <Badge variant={
                          waste.status === 'available_for_reuse' ? 'default' :
                          waste.status === 'added_to_inventory' ? 'outline' : 'secondary'
                        }>
                          {waste.status === 'available_for_reuse' ? 'Reusable' :
                           waste.status === 'added_to_inventory' ? 'Added' : 'Disposed'}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <div className="font-medium">{waste.productName}</div>
                        <div className="text-sm text-muted-foreground">
                          {waste.quantity} {waste.unit}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="font-medium">{waste.quantity}</div>
                        <div className="text-sm text-muted-foreground">{waste.unit}</div>
                      </td>
                      <td className="p-3">
                        <div className="text-sm">{waste.wasteType}</div>
                      </td>
                      <td className="p-3">
                        <div className="text-sm font-medium">{waste.productName}</div>
                        <div className="text-xs text-muted-foreground">
                          {waste.materialType === 'product' ? '📦 Product' : '🔧 Raw Material'}
                        </div>
                        <div className="text-xs text-muted-foreground">Production: {waste.productionId}</div>
                        <div className="text-xs text-blue-600">Waste Type: {waste.wasteType}</div>
                      </td>
                      <td className="p-3 text-sm text-muted-foreground">
                        <div>{new Date(waste.generatedAt).toLocaleDateString()}</div>
                        <div className="text-xs">{new Date(waste.generatedAt).toLocaleTimeString()}</div>
                        {waste.addedAt && (
                          <div className="text-xs text-green-600 mt-1">
                            Added: {new Date(waste.addedAt).toLocaleDateString()}
                          </div>
                        )}
                      </td>
                      <td className="p-3">
                        {waste.status === 'available_for_reuse' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onReturnToInventory(waste)}
                            className="text-green-600 hover:text-green-700 border-green-200 hover:border-green-300"
                          >
                            <Package className="w-4 h-4 mr-1" />
                            Return to Inventory
                          </Button>
                        )}
                        {waste.status === 'added_to_inventory' && (
                          <div className="text-sm text-green-600 font-medium">
                            ✓ Added
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
};

export default function Materials() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { hasPageAccess } = useAuth();
  
  // Check page permission
  const hasMaterialsAccess = hasPageAccess('materials');
  
  // Redirect if no access
  useEffect(() => {
    if (!hasMaterialsAccess) {
      navigate('/access-denied', { state: { pageName: 'Materials' } });
    }
  }, [hasMaterialsAccess, navigate]);
  
  // Don't render if no permission
  if (!hasMaterialsAccess) {
    return null;
  }

  // State management
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
  const [allMaterialsForStats, setAllMaterialsForStats] = useState<RawMaterial[]>([]); // For stats calculation
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [totalMaterials, setTotalMaterials] = useState(0);
  const [isAddMaterialOpen, setIsAddMaterialOpen] = useState(false);
  const [isAddToInventoryOpen, setIsAddToInventoryOpen] = useState(false);
  const [isImportInventoryOpen, setIsImportInventoryOpen] = useState(false);
  const [isOrderDialogOpen, setIsOrderDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<RawMaterial | null>(null);
  const [wasteRecoveryRefresh, setWasteRecoveryRefresh] = useState(0);
  const [wasteRecoveryCount, setWasteRecoveryCount] = useState(0);
  const [inventoryImagePreview, setInventoryImagePreview] = useState<string>("");
  const [imagePreview, setImagePreview] = useState<string>("");

  const [newMaterial, setNewMaterial] = useState({
    name: "",
    type: "other",
    category: "",
    currentStock: "",
    unit: "",
    minThreshold: "",
    maxCapacity: "",
    supplier: "",
    costPerUnit: "",
    expectedDelivery: "",
    color: "NA",
    imageUrl: ""
  });

  const [newInventoryMaterial, setNewInventoryMaterial] = useState({
    name: "",
    type: "other",
    category: "",
    currentStock: "",
    unit: "",
    minThreshold: "",
    maxCapacity: "",
    supplier: "",
    costPerUnit: "",
    color: "NA",
    imageUrl: ""
  });

  // Dynamic dropdown states
  const [materialCategories, setMaterialCategories] = useState<string[]>([]);
  const [materialUnits, setMaterialUnits] = useState<string[]>([]);
  const [materialTypes, setMaterialTypes] = useState<string[]>([]);
  const [materialColors, setMaterialColors] = useState<string[]>([]);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [showAddUnit, setShowAddUnit] = useState(false);
  const [showAddColor, setShowAddColor] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newUnitName, setNewUnitName] = useState("");
  const [newColorName, setNewColorName] = useState("");
  const [settings, setSettings] = useState<Settings>({
    customCategories: [],
    customUnits: [],
    defaultThresholds: {
      min: 10,
      max: 1000,
      reorder: 50
    },
    notifications: {
      lowStock: true,
      reorder: true,
      expiry: true
    },
    lastStockUpdate: null
  });

  const [orderDetails, setOrderDetails] = useState({
    quantity: "",
    unit: "",
    supplier: "",
    costPerUnit: "",
    expectedDelivery: "",
    notes: ""
  });

  // Restock functionality states
  const [isRestockDialogOpen, setIsRestockDialogOpen] = useState(false);
  const [selectedRestockMaterial, setSelectedRestockMaterial] = useState<RawMaterial | null>(null);
  const [restockForm, setRestockForm] = useState({
    supplier: "",
    type: "",
    quantity: "",
    costPerUnit: "",
    expectedDelivery: "",
    notes: ""
  });

  // Remove materials with duplicate batch numbers (only for materials that actually have batch numbers)
  const removeDuplicateBatchNumbers = (materials: RawMaterial[]) => {
    const seen = new Set<string>();
    const uniqueMaterials = materials.filter(material => {
      // Only check for duplicates if the material actually has a batch number
      if (!material.batchNumber) {
        return true; // Keep materials without batch numbers
      }
      
      if (seen.has(material.batchNumber)) {
        console.log(`Removing duplicate batch number: ${material.batchNumber} for material: ${material.name}`);
        return false;
      }
      seen.add(material.batchNumber);
      return true;
    });

    if (uniqueMaterials.length !== materials.length) {
      console.log(`Removed ${materials.length - uniqueMaterials.length} materials with duplicate batch numbers`);
    }

    return uniqueMaterials;
  };

  // Handle notification actions
  const handleMarkAsRead = async (notificationId: string) => {
    try {
      // Update notification status in MongoDB - change status to 'read'
      await MongoDBNotificationService.updateNotification(notificationId, { 
        status: 'read'
      });
      
      // Remove from local state
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      
      toast({
        title: "Notification marked as read",
        description: "The notification has been marked as read.",
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      toast({
        title: "Error",
        description: "Failed to mark notification as read.",
        variant: "destructive",
      });
    }
  };

  const handleResolveNotification = async (notificationId: string) => {
    try {
      // Update notification status in MongoDB to 'dismissed' (resolved)
      await MongoDBNotificationService.updateNotification(notificationId, { 
        status: 'dismissed'
      });
      
      // Remove from local state
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      
      toast({
        title: "Notification resolved",
        description: "The notification has been resolved and removed.",
      });
    } catch (error) {
      console.error('Error resolving notification:', error);
      toast({
        title: "Error",
        description: "Failed to resolve notification.",
        variant: "destructive",
      });
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      // Update all notifications in MongoDB - change status to 'read'
      await Promise.all(notifications.map(n => 
        MongoDBNotificationService.updateNotification(n.id, { 
          status: 'read'
        })
      ));
      
      // Clear local state
      setNotifications([]);
      
      toast({
        title: "All notifications marked as read",
        description: "All material notifications have been marked as read.",
      });
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      toast({
        title: "Error",
        description: "Failed to mark all notifications as read.",
        variant: "destructive",
      });
    }
  };

  // Helper function to map MongoDB data to UI format
  const mapMongoDBToUI = (materials: any[]): RawMaterial[] => {
    const mappedMaterials = materials.map((item: any) => ({
      id: item.id,
      name: item.name,
      type: item.type || '',
      category: item.category,
      currentStock: parseFloat(item.current_stock) || 0,
      unit: item.unit,
      minThreshold: parseFloat(item.min_threshold) || 0,
      maxCapacity: parseFloat(item.max_capacity) || 0,
      reorderPoint: parseFloat(item.reorder_point) || 0,
      lastRestocked: item.last_restocked || new Date().toISOString().split('T')[0],
      dailyUsage: parseFloat(item.daily_usage) || 0,
      status: item.status as "in-stock" | "low-stock" | "out-of-stock" | "overstock" | "in-transit",
      supplier: item.supplier_name || '',
      supplierId: item.supplier_id || '',
      costPerUnit: parseFloat(item.cost_per_unit) || 0,
      totalValue: parseFloat(item.total_value) || 0,
      batchNumber: item.batch_number || '',
      qualityGrade: item.quality_grade,
      color: item.color,
      imageUrl: item.image_url,
      materialsUsed: [],
      supplierPerformance: parseFloat(item.supplier_performance) || 0
    }));
    return removeDuplicateBatchNumbers(mappedMaterials);
  };

  // Load materials with filters and pagination
  const loadMaterials = async () => {
    try {
      const offset = (currentPage - 1) * itemsPerPage;
      
      // Build filter object
      const filters: any = {
        limit: itemsPerPage,
        offset: offset
      };
      
      if (searchTerm) filters.search = searchTerm;
      if (categoryFilter !== 'all') filters.category = categoryFilter;
      if (statusFilter !== 'all') filters.status = statusFilter;
      
      const materialsResponse = await rawMaterialService.getRawMaterials(filters);
      
      if (materialsResponse.success && materialsResponse.data) {
        const materials = Array.isArray(materialsResponse.data) ? materialsResponse.data : [materialsResponse.data];
        const uniqueMaterials = mapMongoDBToUI(materials);
        setRawMaterials(uniqueMaterials);
        
        // Update total count from backend
        if (materialsResponse.count !== undefined) {
          setTotalMaterials(materialsResponse.count);
        }
        
        console.log(`✅ Loaded ${uniqueMaterials.length} raw materials (page ${currentPage}, total: ${materialsResponse.count || 0})`);
      } else {
        console.error('Error loading raw materials:', materialsResponse.error);
        toast({
          title: "Error",
          description: "Failed to load raw materials from database",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error loading materials:', error);
      toast({
        title: "Error",
        description: "Failed to load materials",
        variant: "destructive",
      });
    }
  };

  // Load all materials for stats calculation (without pagination)
  const loadAllMaterialsForStats = async () => {
    try {
      const materialsResponse = await rawMaterialService.getRawMaterials({ limit: 10000, offset: 0 });
      if (materialsResponse.success && materialsResponse.data) {
        const materials = Array.isArray(materialsResponse.data) ? materialsResponse.data : [materialsResponse.data];
        const uniqueMaterials = mapMongoDBToUI(materials);
        setAllMaterialsForStats(uniqueMaterials);
      }
    } catch (error) {
      console.error('Error loading all materials for stats:', error);
    }
  };

  // Initialize and load data from MongoDB
  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      try {
        // Load all materials for stats
        await loadAllMaterialsForStats();
        
        // Load paginated materials
        await loadMaterials();

        // Load suppliers from MongoDB
        const suppliersResponse = await rawMaterialService.getSuppliers();
        if (suppliersResponse.success && suppliersResponse.data) {
          setSuppliers(suppliersResponse.data);
          console.log('✅ Loaded', suppliersResponse.data.length, 'suppliers from MongoDB');
        } else {
          console.error('Error loading suppliers:', suppliersResponse.error);
        }

        // Load notifications for materials module
        const { data: materialNotifications, error: notificationError } = await MongoDBNotificationService.getNotificationsByModule('materials');
        if (notificationError) {
          console.error('Error loading material notifications:', notificationError);
        } else {
          const unreadNotifications = materialNotifications?.filter(n => n.status === 'unread') || [];
          setNotifications(unreadNotifications);
          console.log('📢 Loaded material notifications:', unreadNotifications.length);
        }

        // Load waste recovery count
        await loadWasteRecoveryCount();

        // Load settings (custom categories, units, etc.)
        // Settings will be loaded from MongoDB later
        const settingsData: Settings = {
          customCategories: [],
          customUnits: [],
          defaultThresholds: {
            min: 10,
            max: 1000,
            reorder: 50
          },
          notifications: {
            lowStock: true,
            reorder: true,
            expiry: true
          },
          lastStockUpdate: null
        };
        setSettings(settingsData);

        // Load material dropdowns from database
        await loadMaterialDropdowns();

        // Process any pre-filled order data from navigation
        if (location.state?.prefillOrder) {
          const { materialName, supplier, quantity, unit, costPerUnit } = location.state.prefillOrder;
          setOrderDetails({
            quantity: quantity?.toString() || "",
            unit: unit || "",
            supplier: supplier || "",
            costPerUnit: costPerUnit?.toString() || "",
            expectedDelivery: "",
            notes: ""
          });
          setIsOrderDialogOpen(true);
        }
      } catch (error) {
        console.error('Error loading initial data:', error);
        toast({
          title: "Error",
          description: "Failed to load materials data",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, [location.state, toast]);

  // Reload materials when filters or pagination changes
  useEffect(() => {
    if (!loading) {
      loadMaterials();
    }
  }, [currentPage, itemsPerPage, searchTerm, categoryFilter, statusFilter]);

  // Reset to page 1 when filters change
  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1);
    }
  }, [searchTerm, categoryFilter, statusFilter]);

  // Refresh data when component becomes visible
  useEffect(() => {
    const handleFocus = async () => {
      console.log('🔄 Refreshing materials data on page focus');
      try {
        await loadAllMaterialsForStats();
        await loadMaterials();
      } catch (error) {
        console.error('Error refreshing materials data:', error);
      }
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('🔄 Refreshing materials data on visibility change');
        handleFocus();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [currentPage, itemsPerPage, searchTerm, categoryFilter, statusFilter]);

  // Get waste recovery count for the dashboard
  const getWasteRecoveryCount = async () => {
    try {
      const { data: stats } = await WasteManagementService.getWasteStats();
      // Count items that are available for reuse (can be returned to inventory)
      return stats?.byStatus.available_for_reuse || 0;
    } catch (error) {
      console.error('Error getting waste recovery count:', error);
      return 0;
    }
  };

  // Load waste recovery count
  const loadWasteRecoveryCount = async () => {
    try {
      console.log('🔍 Loading waste recovery count...');
      const count = await getWasteRecoveryCount();
      console.log('📊 Waste recovery count:', count);
      setWasteRecoveryCount(count);
    } catch (error) {
      console.error('Error loading waste recovery count:', error);
      setWasteRecoveryCount(0);
    }
  };

  // Update settings in Supabase
  // Note: Custom categories and units are now managed through the DropdownMaster system

  const updateLastStockUpdate = async (timestamp: string, user: string = 'admin') => {
    try {
      const updatedSettings = {
        ...settings,
        lastStockUpdate: { timestamp, user }
      };
      // Settings will be updated via MongoDB service later
      setSettings(updatedSettings);
    } catch (error) {
      console.error('Error updating last stock update:', error);
    }
  };

  // Calculate material status
  const calculateMaterialStatus = (material: RawMaterial): RawMaterial['status'] => {
    if (material.currentStock <= 0) return "out-of-stock";
    if (material.currentStock <= material.minThreshold) return "low-stock";
    if (material.currentStock >= material.maxCapacity) return "overstock";
    return "in-stock";
  };

  // Materials are already filtered on the server, so use rawMaterials directly
  const filteredMaterials = rawMaterials;

  // Get stock statistics from all materials (not just current page)
  const stockStats = {
    inStock: allMaterialsForStats.filter(m => m.status === "in-stock").length,
    lowStock: allMaterialsForStats.filter(m => m.status === "low-stock").length,
    outOfStock: allMaterialsForStats.filter(m => m.status === "out-of-stock").length,
    overstock: allMaterialsForStats.filter(m => m.status === "overstock").length
  };

  // Get unique categories and units for filters (from all materials, not just current page)
  const categories = [...new Set(allMaterialsForStats.map(m => m.category))];
  const units = [...new Set(allMaterialsForStats.map(m => m.unit))];

  // Load material categories and units from MongoDB
  const loadMaterialDropdowns = async () => {
    try {
      // Load material categories from MongoDB
      const categoriesResponse = await rawMaterialService.getDropdownOptions('material_category');
      if (categoriesResponse.success && categoriesResponse.data) {
        setMaterialCategories(categoriesResponse.data.map(c => c.value));
        console.log('✅ Loaded material categories from MongoDB:', categoriesResponse.data.length);
      } else {
        console.error('Error loading material categories:', categoriesResponse.error);
        setMaterialCategories([]);
      }

      // Load material units from MongoDB
      const unitsResponse = await rawMaterialService.getDropdownOptions('material_unit');
      if (unitsResponse.success && unitsResponse.data) {
        setMaterialUnits(unitsResponse.data.map(u => u.value));
        console.log('✅ Loaded material units from MongoDB:', unitsResponse.data.length);
      } else {
        console.error('Error loading material units:', unitsResponse.error);
        setMaterialUnits([]);
      }

      // Load material types from MongoDB
      const typesResponse = await rawMaterialService.getDropdownOptions('material_type');
      if (typesResponse.success && typesResponse.data) {
        setMaterialTypes(typesResponse.data.map(t => t.value));
        console.log('✅ Loaded material types from MongoDB:', typesResponse.data.length);
      } else {
        console.error('Error loading material types:', typesResponse.error);
        setMaterialTypes([]);
      }

      // Load material colors from MongoDB
      const colorsResponse = await rawMaterialService.getDropdownOptions('material_color');
      if (colorsResponse.success && colorsResponse.data) {
        setMaterialColors(colorsResponse.data.map(c => c.value));
        console.log('✅ Loaded material colors from MongoDB:', colorsResponse.data.length);
      } else {
        console.error('Error loading material colors:', colorsResponse.error);
        setMaterialColors([]);
      }
    } catch (error) {
      console.error('Error loading material dropdowns:', error);
    }
  };

  // Get all available categories from database
  const getAllCategories = () => {
    return materialCategories;
  };

  // Get all available units from database
  const getAllUnits = () => {
    return materialUnits;
  };

  const getAllColors = () => {
    return materialColors;
  };

  // Get available suppliers for restocking based on material category
  const getAvailableSuppliersForRestock = (materialCategory: string, materialName: string) => {
    // Get suppliers from same category (e.g., all dye suppliers for dye materials)
    const categorySuppliers = rawMaterials
      .filter(m => m.category === materialCategory)
      .map(m => ({
        name: m.supplier,
        type: m.type,
        costPerUnit: m.costPerUnit,
        unit: m.unit,
        materialName: m.name
      }))
      .filter((supplier, index, self) =>
        // Remove duplicate suppliers, keep unique ones
        index === self.findIndex(s => s.name === supplier.name)
      );

    // Also include suppliers from exact material name matches
    const exactSuppliers = rawMaterials
      .filter(m => m.name.toLowerCase() === materialName.toLowerCase())
      .map(m => ({
        name: m.supplier,
        type: m.type,
        costPerUnit: m.costPerUnit,
        unit: m.unit,
        materialName: m.name
      }));

    // Combine and remove duplicates
    const allSuppliers = [...categorySuppliers, ...exactSuppliers];
    const uniqueSuppliers = allSuppliers.filter((supplier, index, self) =>
      index === self.findIndex(s => s.name === supplier.name)
    );

    return uniqueSuppliers;
  };

  // Get all available suppliers from database
  const getAllAvailableSuppliers = () => {
    return suppliers.map(supplier => ({
      name: supplier.name,
      id: supplier.id,
      contact_person: supplier.contact_person,
      email: supplier.email,
      phone: supplier.phone
    }));
  };

  // Handle image upload
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Remove selected image
  const removeImage = () => {
    setImagePreview("");
    setNewMaterial({ ...newMaterial, imageUrl: "" });
  };

  // Handle inventory image upload
  const handleInventoryImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setInventoryImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Remove selected inventory image
  const removeInventoryImage = () => {
    setInventoryImagePreview("");
    setNewInventoryMaterial({ ...newInventoryMaterial, imageUrl: "" });
  };

  // Handle adding new category to database
  const handleAddCategory = async () => {
    if (newCategoryName.trim() && !materialCategories.includes(newCategoryName.trim())) {
      try {
        const { success, error } = await DropdownService.addOption(
          'material_category',
          newCategoryName.trim(),
          materialCategories.length + 1
        );

        if (!success) {
          console.error('Error adding material category:', error);
          toast({
            title: "Error",
            description: "Failed to add category. Please try again.",
            variant: "destructive"
          });
        } else {
          // Reload categories from database
          await loadMaterialDropdowns();
          setNewInventoryMaterial({...newInventoryMaterial, category: newCategoryName.trim()});
          setNewCategoryName("");
          setShowAddCategory(false);
          toast({
            title: "Category Added",
            description: `"${newCategoryName.trim()}" has been added to the database.`,
          });
        }
      } catch (error) {
        console.error('Error adding material category:', error);
        toast({
          title: "Error",
          description: "Failed to add category. Please try again.",
          variant: "destructive"
        });
      }
    }
  };

  // Handle adding new unit to database
  const handleAddUnit = async () => {
    if (newUnitName.trim() && !materialUnits.includes(newUnitName.trim())) {
      try {
        const { success, error } = await DropdownService.addOption(
          'material_unit',
          newUnitName.trim(),
          materialUnits.length + 1
        );

        if (!success) {
          console.error('Error adding material unit:', error);
          toast({
            title: "Error",
            description: "Failed to add unit. Please try again.",
            variant: "destructive"
          });
        } else {
          // Reload units from database
          await loadMaterialDropdowns();
          setNewInventoryMaterial({...newInventoryMaterial, unit: newUnitName.trim()});
          setNewUnitName("");
          setShowAddUnit(false);
          toast({
            title: "Unit Added",
            description: `"${newUnitName.trim()}" has been added to the database.`,
          });
        }
      } catch (error) {
        console.error('Error adding material unit:', error);
        toast({
          title: "Error",
          description: "Failed to add unit. Please try again.",
          variant: "destructive"
        });
      }
    }
  };

  // Handle adding new color to database
  const handleAddColor = async () => {
    if (newColorName.trim() && !materialColors.includes(newColorName.trim())) {
      try {
        const { success, error } = await DropdownService.addOption(
          'material_color',
          newColorName.trim(),
          materialColors.length + 1
        );

        if (!success) {
          console.error('Error adding material color:', error);
          toast({
            title: "Error",
            description: "Failed to add color. Please try again.",
            variant: "destructive"
          });
        } else {
          // Reload colors from database
          await loadMaterialDropdowns();
          setNewInventoryMaterial({...newInventoryMaterial, color: newColorName.trim()});
          setNewColorName("");
          setShowAddColor(false);
          toast({
            title: "Color Added",
            description: `"${newColorName.trim()}" has been added to the database.`,
          });
        }
      } catch (error) {
        console.error('Error adding material color:', error);
        toast({
          title: "Error",
          description: "Failed to add color. Please try again.",
          variant: "destructive"
        });
      }
    }
  };

  // Handle creating material order
  const handleCreateOrder = async () => {
    try {
      // Validate quantity before creating order
      console.log('🔍 Debug - newMaterial.currentStock:', newMaterial.currentStock, typeof newMaterial.currentStock);
      
      const orderQuantity = parseFloat(newMaterial.currentStock) || 0;
      console.log('🔍 Debug - parsed orderQuantity:', orderQuantity);
      
      if (!newMaterial.currentStock || newMaterial.currentStock === '' || orderQuantity <= 0) {
        console.log('❌ Validation failed - quantity is invalid');
        toast({
          title: "❌ Invalid Quantity",
          description: `Please enter a valid quantity greater than 0. Current value: "${newMaterial.currentStock}"`,
          variant: "destructive",
        });
        return;
      }

      // Create new material with 0 stock and in-transit status
      const materialData = {
        name: newMaterial.name,
        type: newMaterial.type,
        category: newMaterial.category,
        batchNumber: generateUniqueId('BATCH'),
        currentStock: 0, // Orders start with 0 stock
        unit: newMaterial.unit,
        minThreshold: parseFloat(newMaterial.minThreshold) || 10,
        maxCapacity: parseFloat(newMaterial.maxCapacity) || 1000,
        reorderPoint: parseFloat(newMaterial.minThreshold) || 10,
        lastRestocked: null, // No restock date yet
        dailyUsage: 0,
        status: "in-transit" as const, // Show as in-transit
        supplier: newMaterial.supplier,
        supplierId: generateUniqueId('SUP'),
        costPerUnit: parseFloat(newMaterial.costPerUnit) || 0,
        totalValue: 0, // Will be calculated when delivered
        qualityGrade: "A",
        imageUrl: newMaterial.imageUrl,
        materialsUsed: [],
        supplierPerformance: 85
      };

      // Add to Supabase using RawMaterialService
      const result = await rawMaterialService.createRawMaterial({
        name: newMaterial.name,
        type: newMaterial.type,
        category: newMaterial.category,
        current_stock: 0, // Orders start with 0 stock
        unit: newMaterial.unit,
        min_threshold: parseFloat(newMaterial.minThreshold) || 10,
        max_capacity: parseFloat(newMaterial.maxCapacity) || 1000,
        reorder_point: parseFloat(newMaterial.minThreshold) || 10,
        daily_usage: 0,
        supplier_name: newMaterial.supplier,
        cost_per_unit: parseFloat(newMaterial.costPerUnit) || 0,
        batch_number: generateUniqueId('BATCH'),
        color: newMaterial.type === 'color' ? newMaterial.color : 'NA',
        image_url: newMaterial.imageUrl
      });

      if (result.error) {
        throw new Error(result.error);
      }

      const addedMaterial = Array.isArray(result.data) ? result.data[0] : result.data;

      // Create purchase order with the material details
      const orderData: Omit<MaterialPurchase, 'id'> = {
        materialId: addedMaterial.id,
        materialName: newMaterial.name,
        supplierId: addedMaterial.supplier_id,
        supplierName: newMaterial.supplier,
        quantity: orderQuantity,
        unit: newMaterial.unit,
        costPerUnit: parseFloat(newMaterial.costPerUnit) || 0,
        totalCost: orderQuantity * (parseFloat(newMaterial.costPerUnit) || 0),
        purchaseDate: new Date().toISOString(),
        expectedDelivery: newMaterial.expectedDelivery,
        status: "ordered",
        inspector: "",
        inspectionDate: "",
        notes: orderDetails.notes,
        materialType: newMaterial.type,
        materialCategory: newMaterial.category,
        materialBatchNumber: generateUniqueId('BATCH'),
        minThreshold: parseFloat(newMaterial.minThreshold) || 10,
        maxCapacity: parseFloat(newMaterial.maxCapacity) || 1000,
        qualityGrade: "A",
        isRestock: false
      };

      // Create purchase order in MongoDB
      const { data: purchaseOrder, error: orderError } = await PurchaseOrderService.createPurchaseOrder({
        id: generateUniqueId('PO'),
        order_number: `PO-${Date.now()}`,
        supplier_id: addedMaterial.supplier_id,
        supplier_name: newMaterial.supplier,
        order_date: new Date().toISOString(),
        expected_delivery: newMaterial.expectedDelivery,
        total_amount: orderQuantity * (parseFloat(newMaterial.costPerUnit) || 0),
        status: 'pending',
        notes: orderDetails.notes,
        material_details: {
          materialName: newMaterial.name,
          materialBrand: newMaterial.type,
          materialCategory: newMaterial.category,
          materialBatchNumber: generateUniqueId('BATCH'),
          quantity: orderQuantity,
          unit: newMaterial.unit,
          costPerUnit: parseFloat(newMaterial.costPerUnit) || 0,
          minThreshold: parseFloat(newMaterial.minThreshold) || 10,
          maxCapacity: parseFloat(newMaterial.maxCapacity) || 1000,
          qualityGrade: "A"
        }
      });

      if (orderError) {
        console.error('Error creating purchase order:', orderError);
        toast({
          title: "Warning",
          description: "Material created but purchase order failed. Please check Manage Stock page.",
          variant: "destructive",
        });
      }

      // Update last stock update
      await updateLastStockUpdate(new Date().toISOString());

      // Refresh materials list
      await loadAllMaterialsForStats();
      await loadMaterials();

      // Reset forms and close dialog
      setNewMaterial({
        name: "",
        type: "other",
        category: "",
        currentStock: "",
        unit: "",
        minThreshold: "",
        maxCapacity: "",
        supplier: "",
        costPerUnit: "",
        expectedDelivery: "",
        color: "NA",
        imageUrl: ""
      });
      setOrderDetails({
        quantity: "", unit: "", supplier: "", costPerUnit: "", expectedDelivery: "", notes: ""
      });
      setIsOrderDialogOpen(false);

      toast({
        title: "Material Order Created",
        description: `Order for ${newMaterial.name} has been created and sent to Manage Stock.`,
      });

    } catch (error) {
      console.error('Error creating material order:', error);
      toast({
        title: "Error",
        description: "Failed to create material order",
        variant: "destructive",
      });
    }
  };

  // Handle adding material to inventory directly
  const handleAddToInventory = async () => {
    try {
      const inventoryData = {
        name: newInventoryMaterial.name,
        type: newInventoryMaterial.type,
        category: newInventoryMaterial.category,
        batchNumber: generateUniqueId('BATCH'), // Auto-generate batch number
        currentStock: parseFloat(newInventoryMaterial.currentStock) || 0,
        unit: newInventoryMaterial.unit,
        minThreshold: parseFloat(newInventoryMaterial.minThreshold) || 10,
        maxCapacity: parseFloat(newInventoryMaterial.maxCapacity) || 1000,
        reorderPoint: parseFloat(newInventoryMaterial.minThreshold) || 10,
        lastRestocked: new Date().toISOString(),
        dailyUsage: 0,
        status: "in-stock",
        supplier: newInventoryMaterial.supplier,
        supplierId: generateUniqueId('SUP'),
        costPerUnit: parseFloat(newInventoryMaterial.costPerUnit) || 0,
        totalValue: (parseFloat(newInventoryMaterial.currentStock) || 0) * (parseFloat(newInventoryMaterial.costPerUnit) || 0),
        qualityGrade: "A",
        imageUrl: newInventoryMaterial.imageUrl,
        materialsUsed: [],
        supplierPerformance: 85
      };

      // Calculate status based on stock levels
      inventoryData.status = calculateMaterialStatus(inventoryData as RawMaterial) as RawMaterial['status'];

      // Add to Supabase using RawMaterialService
      const result = await rawMaterialService.createRawMaterial({
        name: newInventoryMaterial.name,
        type: newInventoryMaterial.type,
        category: newInventoryMaterial.category,
        current_stock: parseFloat(newInventoryMaterial.currentStock) || 0,
        unit: newInventoryMaterial.unit,
        min_threshold: parseFloat(newInventoryMaterial.minThreshold) || 10,
        max_capacity: parseFloat(newInventoryMaterial.maxCapacity) || 1000,
        reorder_point: parseFloat(newInventoryMaterial.minThreshold) || 10,
        daily_usage: 0,
        supplier_name: newInventoryMaterial.supplier,
        cost_per_unit: parseFloat(newInventoryMaterial.costPerUnit) || 0,
        batch_number: generateUniqueId('BATCH'), // Auto-generate batch number
        color: newInventoryMaterial.type === 'color' ? newInventoryMaterial.color : 'NA',
        image_url: newInventoryMaterial.imageUrl
      });

      if (result.error) {
        throw new Error(result.error);
      }

      const addedMaterial = result.data;

      // Update last stock update
      await updateLastStockUpdate(new Date().toISOString());

      // Refresh materials list
      await loadAllMaterialsForStats();
      await loadMaterials();

      // Reset form and close dialog
      setNewInventoryMaterial({
        name: "",
        type: "other",
        category: "",
        currentStock: "",
        unit: "",
        minThreshold: "",
        maxCapacity: "",
        supplier: "",
        costPerUnit: "",
        color: "NA",
        imageUrl: ""
      });
      setIsAddToInventoryOpen(false);

      toast({
        title: "Material Added",
        description: `${newInventoryMaterial.name} has been added to inventory.`,
      });

    } catch (error) {
      console.error('Error adding material to inventory:', error);
      toast({
        title: "Error",
        description: "Failed to add material to inventory",
        variant: "destructive",
      });
    }
  };

  // Handle importing inventory from CSV
  const handleImportInventory = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      const headers = lines[0].split(',').map(h => h.trim());

      const materials = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim());
        const material: any = {};
        headers.forEach((header, index) => {
          material[header] = values[index] || '';
        });
        return material;
      });

      // Validate and process materials
      const validMaterials = materials.filter(material =>
        material.name && material.brand && material.category
      ).map(material => ({
        name: material.name,
        type: material.type,
        category: material.category,
        batchNumber: generateUniqueId('BATCH'), // Auto-generate batch number
        currentStock: parseFloat(material.currentStock) || 0,
        unit: material.unit || 'kg',
        minThreshold: parseFloat(material.minThreshold) || 10,
        maxCapacity: parseFloat(material.maxCapacity) || 1000,
        reorderPoint: parseFloat(material.minThreshold) || 10,
        lastRestocked: new Date().toISOString(),
        dailyUsage: 0,
        status: "in-stock" as RawMaterial['status'],
        supplier: material.supplier || 'Unknown',
        supplierId: generateUniqueId('SUP'),
        costPerUnit: parseFloat(material.costPerUnit) || 0,
        totalValue: (parseFloat(material.currentStock) || 0) * (parseFloat(material.costPerUnit) || 0),
        qualityGrade: material.qualityGrade || "A",
        color: material.color || 'NA',
        imageUrl: material.imageUrl || "",
        materialsUsed: [],
        supplierPerformance: 85
      }));

      // Add materials to Supabase using RawMaterialService
      for (const material of validMaterials) {
        const result = await rawMaterialService.createRawMaterial({
          name: material.name,
          type: material.type,
          category: material.category,
          current_stock: material.currentStock,
          unit: material.unit,
          min_threshold: material.minThreshold,
          max_capacity: material.maxCapacity,
          reorder_point: material.reorderPoint,
          daily_usage: material.dailyUsage,
          supplier_name: material.supplier,
          cost_per_unit: material.costPerUnit,
          batch_number: material.batchNumber,
          color: material.type === 'color' ? (material.color || 'NA') : 'NA',
          image_url: material.imageUrl
        });

        if (result.error) {
          console.error(`Error adding material ${material.name}:`, result.error);
        }
      }

      // Update last stock update
      await updateLastStockUpdate(new Date().toISOString());

      // Refresh materials list
      await loadAllMaterialsForStats();
      await loadMaterials();

      setIsImportInventoryOpen(false);
      toast({
        title: "Import Successful",
        description: `Imported ${validMaterials.length} materials from CSV.`,
      });

    } catch (error) {
      console.error('Error importing inventory:', error);
      toast({
        title: "Import Failed",
        description: "Failed to import inventory from CSV file",
        variant: "destructive",
      });
    }
  };

  // Handle adding custom category
  const handleAddCustomCategory = async () => {
    if (!newCategoryName.trim()) return;

    try {
      const { success, error } = await DropdownService.addOption(
        'material_category',
        newCategoryName.trim(),
        materialCategories.length + 1
      );

      if (!success) {
        console.error('Error adding material category:', error);
        toast({
          title: "Error",
          description: "Failed to add category. Please try again.",
          variant: "destructive"
        });
      } else {
        // Reload categories from database
        await loadMaterialDropdowns();
        setNewCategoryName("");
        setShowAddCategory(false);
        toast({
          title: "Category Added",
          description: `"${newCategoryName}" has been added to the database.`,
        });
      }
    } catch (error) {
      console.error('Error adding material category:', error);
      toast({
        title: "Error",
        description: "Failed to add category. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Handle adding custom unit
  const handleAddCustomUnit = async () => {
    if (!newUnitName.trim()) return;

    try {
      const { success, error } = await DropdownService.addOption(
        'material_unit',
        newUnitName.trim(),
        materialUnits.length + 1
      );

      if (!success) {
        console.error('Error adding material unit:', error);
        toast({
          title: "Error",
          description: "Failed to add unit. Please try again.",
          variant: "destructive"
        });
      } else {
        // Reload units from database
        await loadMaterialDropdowns();
        setNewUnitName("");
        setShowAddUnit(false);
        toast({
          title: "Unit Added",
          description: `"${newUnitName}" has been added to the database.`,
        });
      }
    } catch (error) {
      console.error('Error adding material unit:', error);
      toast({
        title: "Error",
        description: "Failed to add unit. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Delete functions for dropdown options (now handled by DropdownMaster)
  const deleteCategory = async (category: string) => {
    try {
      // Get all material categories to find the option ID
      const options = await DropdownService.getOptionsByCategory('material_category');
      const optionToDelete = options.find(option => option.value === category);
      
      if (!optionToDelete) {
    toast({
          title: "Error",
          description: "Category not found",
          variant: "destructive",
        });
        return;
      }

      // Delete the option from MongoDB
      const { success, error } = await DropdownService.deleteOption(optionToDelete.id);
      
      if (success) {
        // Reload categories and update state
        await loadMaterialDropdowns();
        toast({
          title: "Category Deleted",
          description: `"${category}" has been removed from the database.`,
        });
      } else {
        toast({
          title: "Error",
          description: `Failed to delete category: ${error}`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error deleting category:', error);
      toast({
        title: "Error",
        description: "Failed to delete category",
        variant: "destructive",
      });
    }
  };

  const deleteUnit = async (unit: string) => {
    try {
      // Get all material units to find the option ID
      const options = await DropdownService.getOptionsByCategory('material_unit');
      const optionToDelete = options.find(option => option.value === unit);
      
      if (!optionToDelete) {
    toast({
          title: "Error",
          description: "Unit not found",
          variant: "destructive",
        });
        return;
      }

      // Delete the option from MongoDB
      const { success, error } = await DropdownService.deleteOption(optionToDelete.id);
      
      if (success) {
        // Reload units and update state
        await loadMaterialDropdowns();
        toast({
          title: "Unit Deleted",
          description: `"${unit}" has been removed from the database.`,
        });
      } else {
        toast({
          title: "Error",
          description: `Failed to delete unit: ${error}`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error deleting unit:', error);
      toast({
        title: "Error",
        description: "Failed to delete unit",
        variant: "destructive",
      });
    }
  };

  // Handle waste management operations
  const handleReturnToInventory = async (waste: WasteItem) => {
    try {
      // Use the MongoDB API instead of Supabase
      const result = await WasteService.returnWasteToInventory(waste.id);
      
      if (result.success) {
        // Reload raw materials and trigger waste data refresh
        await loadAllMaterialsForStats();
        await loadMaterials();
        setWasteRecoveryRefresh(prev => prev + 1);
        
        // Update waste recovery count
        await loadWasteRecoveryCount();

        toast({
          title: "✅ Material Returned to Inventory",
          description: `${waste.quantity} ${waste.unit} of ${waste.productName} has been returned to inventory.`,
        });
      } else {
        toast({
          title: "❌ Error",
          description: result.error || "Failed to return material to inventory.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error returning waste to inventory:', error);
      toast({
        title: "❌ Error",
        description: "Failed to return material to inventory.",
        variant: "destructive",
      });
    }
  };

  // Handle opening restock dialog
  const handleOpenRestockDialog = (material: RawMaterial) => {
    setSelectedRestockMaterial(material);

    // Get available suppliers for this material
    const availableSuppliers = getAvailableSuppliersForRestock(material.category, material.name);

    // Pre-fill with first available supplier if any
    if (availableSuppliers.length > 0) {
      const firstSupplier = availableSuppliers[0];
      const materialIsOutOfStock = material.status === "out-of-stock";
      setRestockForm({
        supplier: firstSupplier.name,
        type: firstSupplier.type,
        quantity: "",
        costPerUnit: firstSupplier.costPerUnit.toString(),
        expectedDelivery: "",
        notes: `${materialIsOutOfStock ? 'Order' : 'Restock'} for ${material.name}`
      });
    } else {
      // Reset form if no suppliers available
      const materialIsOutOfStock = material.status === "out-of-stock";
      setRestockForm({
        supplier: "",
        type: "",
        quantity: "",
        costPerUnit: "",
        expectedDelivery: "",
        notes: `${materialIsOutOfStock ? 'Order' : 'Restock'} for ${material.name}`
      });
    }

    setIsRestockDialogOpen(true);
  };

  // Handle supplier change in restock form
  const handleRestockSupplierChange = (supplierName: string) => {
    if (supplierName === "new_supplier") {
      setRestockForm(prev => ({
        ...prev,
        supplier: "new_supplier",
        type: "",
        costPerUnit: ""
      }));
      return;
    }

    const availableSuppliers = getAvailableSuppliersForRestock(
      selectedRestockMaterial?.category || "",
      selectedRestockMaterial?.name || ""
    );

    const selectedSupplier = availableSuppliers.find(s => s.name === supplierName);

    if (selectedSupplier) {
      setRestockForm(prev => ({
        ...prev,
        supplier: supplierName,
        type: selectedSupplier.type,
        costPerUnit: selectedSupplier.costPerUnit.toString()
      }));
    } else {
      setRestockForm(prev => ({
        ...prev,
        supplier: supplierName,
        type: "",
        costPerUnit: ""
      }));
    }
  };

  // Handle restock submission
  const handleRestockSubmit = async () => {
    if (!selectedRestockMaterial || !restockForm.supplier || !restockForm.quantity || !restockForm.costPerUnit) {
      toast({
        title: "⚠️ Missing Required Fields",
        description: "Please fill in all required fields before submitting.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Create order (restock or new order based on material status)
      const orderIsOutOfStock = selectedRestockMaterial.status === "out-of-stock";
      const orderData: Omit<MaterialPurchase, 'id'> = {
        materialId: selectedRestockMaterial.id,
        materialName: selectedRestockMaterial.name,
        materialType: restockForm.type,
        materialCategory: selectedRestockMaterial.category,
        materialBatchNumber: generateUniqueId('BATCH'),
        supplierId: generateUniqueId('SUP'),
        supplierName: restockForm.supplier === "new_supplier" ? restockForm.supplier : restockForm.supplier,
        quantity: parseInt(restockForm.quantity),
        unit: selectedRestockMaterial.unit,
        costPerUnit: parseFloat(restockForm.costPerUnit),
        totalCost: parseInt(restockForm.quantity) * parseFloat(restockForm.costPerUnit),
        purchaseDate: new Date().toISOString().split('T')[0],
        expectedDelivery: restockForm.expectedDelivery || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: "ordered" as const,
        inspector: "",
        inspectionDate: "",
        notes: restockForm.notes || "",
        minThreshold: selectedRestockMaterial.minThreshold,
        maxCapacity: selectedRestockMaterial.maxCapacity,
        qualityGrade: "A",
        isRestock: !orderIsOutOfStock
      };

      // Purchase order will be added via MongoDB service later

      // Close dialog and reset form
      setIsRestockDialogOpen(false);
      setRestockForm({
        supplier: "",
        type: "",
        quantity: "",
        costPerUnit: "",
        expectedDelivery: "",
        notes: ""
      });

      // Navigate to Manage Stock with the order details
      navigate("/manage-stock", {
        state: {
          prefillOrder: {
            materialName: selectedRestockMaterial.name,
            materialType: restockForm.type,
            materialCategory: selectedRestockMaterial.category,
            materialBatchNumber: generateUniqueId('BATCH'),
            supplier: restockForm.supplier,
            quantity: restockForm.quantity,
            unit: selectedRestockMaterial.unit,
            costPerUnit: restockForm.costPerUnit,
            expectedDelivery: restockForm.expectedDelivery,
            minThreshold: selectedRestockMaterial.minThreshold,
            maxCapacity: selectedRestockMaterial.maxCapacity,
            isRestock: !orderIsOutOfStock
          }
        }
      });

      // Show success message
      toast({
        title: orderIsOutOfStock ? "✅ Material Order Created!" : "✅ Restock Order Created!",
        description: `${selectedRestockMaterial.name} ${orderIsOutOfStock ? 'order' : 'restock order'} has been created and sent to Manage Stock.`,
        variant: "default",
      });
    } catch (error) {
      console.error("Error creating restock order:", error);
      toast({
        title: "❌ Error Creating Restock Order",
        description: "There was an error creating the restock order. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <Header title="Raw Materials" />
        <div className="max-w-7xl mx-auto mt-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-lg">Loading materials...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 sm:space-y-6 p-3 sm:p-4 lg:p-6">
      <Header title="Raw Materials" />
      
      <div className="space-y-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Raw Materials</h1>
            <p className="text-muted-foreground">
              Manage your raw material inventory, orders, and suppliers
            </p>
          </div>

          <div className="flex gap-3">
            <Dialog open={isImportInventoryOpen} onOpenChange={setIsImportInventoryOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Upload className="w-4 h-4 mr-2" />
                  Import CSV
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Import Inventory from CSV</DialogTitle>
                  <DialogDescription>
                    Upload a CSV file with material data. Required columns: name, type, category, currentStock, unit, costPerUnit
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <Input
                    type="file"
                    accept=".csv"
                    onChange={handleImportInventory}
                  />
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={isAddToInventoryOpen} onOpenChange={setIsAddToInventoryOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Package className="w-4 h-4 mr-2" />
                  Add to Inventory
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add Material to Inventory</DialogTitle>
                  <DialogDescription>
                    Add a new raw material directly to your stock. This is for adding materials that you already have in stock.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  {/* Image Upload Section */}
                    <div>
                    <Label>Material Image (Optional)</Label>
                    <div className="mt-2">
                      {inventoryImagePreview ? (
                        <div className="relative">
                          <img
                            src={inventoryImagePreview}
                            alt="Preview"
                            className="w-32 h-32 object-cover rounded-lg border"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                            onClick={removeInventoryImage}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center hover:border-muted-foreground/50 transition-colors">
                          <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                          <p className="text-sm text-muted-foreground mb-2">Click to upload image</p>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => document.getElementById('inventory-image-upload')?.click()}
                          >
                            <Image className="w-4 h-4 mr-2" />
                            Upload Image
                          </Button>
                          <input
                            id="inventory-image-upload"
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleInventoryImageUpload}
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="inventoryMaterialName">Material Name *</Label>
                      <Input
                      id="inventoryMaterialName"
                        value={newInventoryMaterial.name}
                        onChange={(e) => setNewInventoryMaterial({...newInventoryMaterial, name: e.target.value})}
                      placeholder="e.g., Cotton Yarn (Premium)"
                      required
                      />
                    </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="inventorySupplier">Supplier Name *</Label>
                      <Select
                        value={newInventoryMaterial.supplier}
                        onValueChange={(value) => setNewInventoryMaterial({...newInventoryMaterial, supplier: value})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select supplier" />
                        </SelectTrigger>
                        <SelectContent>
                          {suppliers.map((supplier) => (
                            <SelectItem key={supplier.id} value={supplier.name}>
                              {supplier.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="inventoryCategory">Category *</Label>
                      <div className="space-y-2">
                        <Select value={newInventoryMaterial.category} onValueChange={(value) => {
                          if (value === "add_new") {
                            setShowAddCategory(true);
                          } else {
                            setNewInventoryMaterial({...newInventoryMaterial, category: value});
                          }
                        }}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            {getAllCategories().map(category => (
                              <div key={category} className="flex items-center justify-between px-2 py-1.5 hover:bg-accent rounded-sm">
                                <SelectItem value={category} className="flex-1 p-0 h-auto">
                                  {category}
                                </SelectItem>
                        <Button
                                  variant="ghost"
                          size="sm"
                                  className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteCategory(category);
                                  }}
                                >
                                  <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                            ))}
                            <SelectItem value="add_new" className="text-blue-600 font-medium">
                              <div className="flex items-center gap-2">
                                <Plus className="w-4 h-4" />
                                Add New Category
                    </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        {showAddCategory && (
                      <div className="flex gap-2">
                            <Input
                              value={newCategoryName}
                              onChange={(e) => setNewCategoryName(e.target.value)}
                              placeholder="Enter new category"
                              className="flex-1"
                            />
                            <Button type="button" size="sm" onClick={handleAddCategory}>Add</Button>
                            <Button type="button" size="sm" variant="outline" onClick={() => {setShowAddCategory(false); setNewCategoryName("");}}>Cancel</Button>
                      </div>
                        )}
                    </div>
                    </div>
                  </div>

                    <div>
                    <Label htmlFor="inventoryType">Material Type *</Label>
                    <Select
                      value={newInventoryMaterial.type}
                      onValueChange={(value) => {
                        setNewInventoryMaterial({
                          ...newInventoryMaterial,
                          type: value,
                          color: value !== 'color' ? 'NA' : newInventoryMaterial.color
                        });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {materialTypes.map(type => (
                          <SelectItem key={type} value={type}>
                            {type.charAt(0).toUpperCase() + type.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                    {newInventoryMaterial.type === 'color' && (
                    <div>
                      <Label htmlFor="inventoryColor">Color *</Label>
                      <Input
                        id="inventoryColor"
                        value={newInventoryMaterial.color}
                        onChange={(e) => setNewInventoryMaterial({...newInventoryMaterial, color: e.target.value})}
                        placeholder="e.g., Red, Blue, Green"
                        required
                      />
                    </div>
                    )}

                    <div>
                      <Label htmlFor="inventoryUnit">Unit *</Label>
                    <div className="space-y-2">
                      <Select value={newInventoryMaterial.unit} onValueChange={(value) => {
                        if (value === "add_new") {
                          setShowAddUnit(true);
                        } else {
                          setNewInventoryMaterial({...newInventoryMaterial, unit: value});
                        }
                      }}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select unit" />
                          </SelectTrigger>
                          <SelectContent>
                          {getAllUnits().map(unit => (
                            <div key={unit} className="flex items-center justify-between px-2 py-1.5 hover:bg-accent rounded-sm">
                              <SelectItem value={unit} className="flex-1 p-0 h-auto">
                                {unit.charAt(0).toUpperCase() + unit.slice(1)}
                              </SelectItem>
                        <Button
                                variant="ghost"
                          size="sm"
                                className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteUnit(unit);
                                }}
                              >
                                <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                          ))}
                          <SelectItem value="add_new" className="text-blue-600 font-medium">
                            <div className="flex items-center gap-2">
                              <Plus className="w-4 h-4" />
                              Add New Unit
                    </div>
                          </SelectItem>
                          </SelectContent>
                        </Select>
                      {showAddUnit && (
                        <div className="flex gap-2">
                      <Input
                            value={newUnitName}
                            onChange={(e) => setNewUnitName(e.target.value)}
                            placeholder="Enter new unit"
                            className="flex-1"
                          />
                          <Button type="button" size="sm" onClick={handleAddUnit}>Add</Button>
                          <Button type="button" size="sm" variant="outline" onClick={() => {setShowAddUnit(false); setNewUnitName("");}}>Cancel</Button>
                  </div>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="inventoryCurrentStock">Current Stock *</Label>
                      <Input
                        id="inventoryCurrentStock"
                        type="text"
                        value={newInventoryMaterial.currentStock}
                        onChange={(e) => {
                          // Allow only numbers and leading zeros
                          const value = e.target.value;
                          if (value === '' || /^\d*\.?\d*$/.test(value)) {
                            setNewInventoryMaterial({...newInventoryMaterial, currentStock: value});
                          }
                        }}
                        placeholder="100"
                        required
                      />
                      <p className="text-xs text-muted-foreground mt-1">Current quantity in stock</p>
                    </div>
                    <div>
                      <Label htmlFor="inventoryMinThreshold">Min Threshold *</Label>
                      <Input
                        id="inventoryMinThreshold"
                        type="text"
                        value={newInventoryMaterial.minThreshold}
                        onChange={(e) => {
                          // Allow only numbers and leading zeros
                          const value = e.target.value;
                          if (value === '' || /^\d*\.?\d*$/.test(value)) {
                            setNewInventoryMaterial({...newInventoryMaterial, minThreshold: value});
                          }
                        }}
                        placeholder="50"
                        required
                      />
                      <p className="text-xs text-muted-foreground mt-1">Reorder point</p>
                    </div>
                    <div>
                      <Label htmlFor="inventoryMaxCapacity">Max Capacity *</Label>
                      <Input
                        id="inventoryMaxCapacity"
                        type="text"
                        value={newInventoryMaterial.maxCapacity}
                        onChange={(e) => {
                          // Allow only numbers and leading zeros
                          const value = e.target.value;
                          if (value === '' || /^\d*\.?\d*$/.test(value)) {
                            setNewInventoryMaterial({...newInventoryMaterial, maxCapacity: value});
                          }
                        }}
                        placeholder="500"
                        required
                      />
                      <p className="text-xs text-muted-foreground mt-1">Maximum storage capacity</p>
                    </div>
                  </div>
                    <div>
                    <Label htmlFor="inventoryCostPerUnit">Cost/Unit (₹) *</Label>
                      <Input
                      id="inventoryCostPerUnit"
                        type="text"
                        value={newInventoryMaterial.costPerUnit}
                        onChange={(e) => {
                          // Allow only numbers and leading zeros
                          const value = e.target.value;
                          if (value === '' || /^\d*\.?\d*$/.test(value)) {
                            setNewInventoryMaterial({...newInventoryMaterial, costPerUnit: value});
                          }
                        }}
                      placeholder="450"
                      required
                      />
                    <p className="text-xs text-muted-foreground mt-1">Cost per unit</p>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-sm text-blue-800">
                      <strong>Note:</strong> This material will be added directly to your inventory.
                      Use "Order Now" or "Restock" buttons to create purchase orders when stock is low.
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddToInventoryOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddToInventory}>
                    Add to Inventory
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={isOrderDialogOpen} onOpenChange={setIsOrderDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Material Order
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create Material Procurement Order</DialogTitle>
                  <DialogDescription>
                    Create a new material order that will be sent to Manage Stock for procurement. The material will be added with 0 quantity first, then orders will manage stock levels.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  {/* Image Upload Section */}
                      <div>
                    <Label>Material Image (Optional)</Label>
                    <div className="mt-2">
                      {imagePreview ? (
                        <div className="relative">
                          <img
                            src={imagePreview}
                            alt="Preview"
                            className="w-32 h-32 object-cover rounded-lg border"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                            onClick={removeImage}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center hover:border-muted-foreground/50 transition-colors">
                          <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                          <p className="text-sm text-muted-foreground mb-2">Click to upload image</p>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => document.getElementById('image-upload')?.click()}
                          >
                            <Image className="w-4 h-4 mr-2" />
                            Upload Image
                          </Button>
                          <input
                            id="image-upload"
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleImageUpload}
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="materialName">Material Name</Label>
                        <Input
                      id="materialName"
                          value={newMaterial.name}
                          onChange={(e) => setNewMaterial({...newMaterial, name: e.target.value})}
                      placeholder="e.g., Cotton Yarn (Premium)"
                        />
                      </div>
                  <div className="grid grid-cols-2 gap-4">
                      <div>
                      <Label htmlFor="supplier">Supplier Name *</Label>
                        <Select
                        value={newMaterial.supplier}
                        onValueChange={(value) => setNewMaterial({...newMaterial, supplier: value})}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select supplier" />
                          </SelectTrigger>
                          <SelectContent>
                            {suppliers.map((supplier) => (
                              <SelectItem key={supplier.id} value={supplier.name}>
                                {supplier.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                      <Label htmlFor="category">Category *</Label>
                      <div className="space-y-2">
                        <Select value={newMaterial.category} onValueChange={(value) => {
                          if (value === "add_new") {
                            setShowAddCategory(true);
                          } else {
                            setNewMaterial({...newMaterial, category: value});
                          }
                        }}>
                        <SelectTrigger>
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent>
                            {getAllCategories().map(category => (
                              <div key={category} className="flex items-center justify-between px-2 py-1.5 hover:bg-accent rounded-sm">
                                <SelectItem value={category} className="flex-1 p-0 h-auto">
                                  {category}
                                </SelectItem>
                          <Button
                                  variant="ghost"
                            size="sm"
                                  className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteCategory(category);
                                  }}
                                >
                                  <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                            ))}
                            <SelectItem value="add_new" className="text-blue-600 font-medium">
                              <div className="flex items-center gap-2">
                                <Plus className="w-4 h-4" />
                                Add New Category
                      </div>
                            </SelectItem>
                            </SelectContent>
                          </Select>
                        {showAddCategory && (
                        <div className="flex gap-2">
                            <Input
                              value={newCategoryName}
                              onChange={(e) => setNewCategoryName(e.target.value)}
                              placeholder="Enter new category"
                              className="flex-1"
                            />
                            <Button type="button" size="sm" onClick={async () => {
                              if (newCategoryName.trim() && !materialCategories.includes(newCategoryName.trim())) {
                                try {
                                  const { success, error } = await DropdownService.addOption(
                                    'material_category',
                                    newCategoryName.trim(),
                                    materialCategories.length + 1
                                  );

                                  if (!success) {
                                    console.error('Error adding material category:', error);
                                    toast({
                                      title: "Error",
                                      description: "Failed to add category. Please try again.",
                                      variant: "destructive"
                                    });
                                  } else {
                                    await loadMaterialDropdowns();
                                    setNewMaterial({...newMaterial, category: newCategoryName.trim()});
                                    setNewCategoryName("");
                                    setShowAddCategory(false);
                                    toast({
                                      title: "Category Added",
                                      description: `"${newCategoryName.trim()}" has been added to the database.`,
                                    });
                                  }
                                } catch (error) {
                                  console.error('Error adding material category:', error);
                                  toast({
                                    title: "Error",
                                    description: "Failed to add category. Please try again.",
                                    variant: "destructive"
                                  });
                                }
                              }
                            }}>Add</Button>
                            <Button type="button" size="sm" variant="outline" onClick={() => {setShowAddCategory(false); setNewCategoryName("");}}>Cancel</Button>
                        </div>
                        )}
                      </div>
                    </div>
                  </div>

                      <div>
                    <Label htmlFor="type">Material Type *</Label>
                    <Select
                      value={newMaterial.type}
                      onValueChange={(value) => {
                        setNewMaterial({
                          ...newMaterial,
                          type: value,
                          color: value !== 'color' ? 'NA' : newMaterial.color
                        });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {materialTypes.map(type => (
                          <SelectItem key={type} value={type}>
                            {type.charAt(0).toUpperCase() + type.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                      {newMaterial.type === 'color' && (
                      <div>
                        <Label htmlFor="color">Color *</Label>
                        <Input
                          id="color"
                          value={newMaterial.color}
                          onChange={(e) => setNewMaterial({...newMaterial, color: e.target.value})}
                          placeholder="e.g., Red, Blue, Green"
                          required
                        />
                      </div>
                      )}

                    <div>
                    <Label htmlFor="unit">Unit *</Label>
                    <div className="space-y-2">
                          <Select value={newMaterial.unit} onValueChange={(value) => {
                        if (value === "add_new") {
                          setShowAddUnit(true);
                        } else {
                            setNewMaterial({...newMaterial, unit: value});
                        }
                          }}>
                        <SelectTrigger>
                              <SelectValue placeholder="Select unit" />
                            </SelectTrigger>
                            <SelectContent>
                          {getAllUnits().map(unit => (
                            <div key={unit} className="flex items-center justify-between px-2 py-1.5 hover:bg-accent rounded-sm">
                              <SelectItem value={unit} className="flex-1 p-0 h-auto">
                                {unit.charAt(0).toUpperCase() + unit.slice(1)}
                              </SelectItem>
                          <Button
                                variant="ghost"
                            size="sm"
                                className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteUnit(unit);
                                }}
                              >
                                <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                          ))}
                          <SelectItem value="add_new" className="text-blue-600 font-medium">
                            <div className="flex items-center gap-2">
                              <Plus className="w-4 h-4" />
                              Add New Unit
                      </div>
                          </SelectItem>
                            </SelectContent>
                          </Select>
                      {showAddUnit && (
                        <div className="flex gap-2">
                      <Input
                            value={newUnitName}
                            onChange={(e) => setNewUnitName(e.target.value)}
                            placeholder="Enter new unit"
                            className="flex-1"
                          />
                          <Button type="button" size="sm" onClick={async () => {
                            if (newUnitName.trim() && !materialUnits.includes(newUnitName.trim())) {
                              try {
                                const { success, error } = await DropdownService.addOption(
                                  'material_unit',
                                  newUnitName.trim(),
                                  materialUnits.length + 1
                                );

                                if (!success) {
                                  console.error('Error adding material unit:', error);
                                  toast({
                                    title: "Error",
                                    description: "Failed to add unit. Please try again.",
                                    variant: "destructive"
                                  });
                                } else {
                                  await loadMaterialDropdowns();
                                  setNewMaterial({...newMaterial, unit: newUnitName.trim()});
                                  setNewUnitName("");
                                  setShowAddUnit(false);
                                  toast({
                                    title: "Unit Added",
                                    description: `"${newUnitName.trim()}" has been added to the database.`,
                                  });
                                }
                              } catch (error) {
                                console.error('Error adding material unit:', error);
                                toast({
                                  title: "Error",
                                  description: "Failed to add unit. Please try again.",
                                  variant: "destructive"
                                });
                              }
                            }
                          }}>Add</Button>
                          <Button type="button" size="sm" variant="outline" onClick={() => {setShowAddUnit(false); setNewUnitName("");}}>Cancel</Button>
                        </div>
                      )}
                      </div>
                    </div>
                  <div className="grid grid-cols-3 gap-4">
                      <div>
                      <Label htmlFor="orderStock">Order Stock</Label>
                        <Input
                        id="orderStock"
                        type="text"
                        value={newMaterial.currentStock || ""}
                        onChange={(e) => {
                          // Allow only numbers and leading zeros
                          const value = e.target.value;
                          if (value === '' || /^\d*\.?\d*$/.test(value)) {
                            setNewMaterial({...newMaterial, currentStock: value});
                          }
                        }}
                        placeholder="100"
                      />
                      <p className="text-xs text-muted-foreground mt-1">Quantity to order for this material</p>
                    </div>
                    <div>
                      <Label htmlFor="minThreshold">Min Threshold</Label>
                      <Input
                        id="minThreshold"
                          type="text"
                          value={newMaterial.minThreshold}
                          onChange={(e) => {
                            // Allow only numbers and leading zeros
                            const value = e.target.value;
                            if (value === '' || /^\d*\.?\d*$/.test(value)) {
                              setNewMaterial({...newMaterial, minThreshold: value});
                            }
                          }}
                        placeholder="100"
                        />
                      </div>
                      <div>
                      <Label htmlFor="maxCapacity">Max Capacity</Label>
                        <Input
                        id="maxCapacity"
                          type="text"
                          value={newMaterial.maxCapacity}
                          onChange={(e) => {
                            // Allow only numbers and leading zeros
                            const value = e.target.value;
                            if (value === '' || /^\d*\.?\d*$/.test(value)) {
                              setNewMaterial({...newMaterial, maxCapacity: value});
                            }
                          }}
                        placeholder="500"
                        />
                      </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                      <div>
                      <Label htmlFor="costPerUnit">Cost/Unit (₹)</Label>
                        <Input
                        id="costPerUnit"
                          type="text"
                          value={newMaterial.costPerUnit}
                        onChange={(e) => {
                          // Allow only numbers and leading zeros
                          const value = e.target.value;
                          if (value === '' || /^\d*\.?\d*$/.test(value)) {
                            setNewMaterial({...newMaterial, costPerUnit: value});
                          }
                        }}
                        placeholder="450"
                        />
                      </div>
                    </div>

                      <div>
                    <Label htmlFor="expectedDelivery">Expected Delivery Date</Label>
                        <Input
                      id="expectedDelivery"
                          type="date"
                      value={newMaterial.expectedDelivery || ""}
                      onChange={(e) => setNewMaterial({...newMaterial, expectedDelivery: e.target.value})}
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsOrderDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateOrder}>
                    Create Order
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Add Custom Category Dialog */}
        <Dialog open={showAddCategory} onOpenChange={setShowAddCategory}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add Custom Category</DialogTitle>
              <DialogDescription>
                Add a new category for materials
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="new-category">Category Name</Label>
                <Input
                  id="new-category"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Enter category name"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddCategory(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddCustomCategory}>
                Add Category
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add Custom Unit Dialog */}
        <Dialog open={showAddUnit} onOpenChange={setShowAddUnit}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add Custom Unit</DialogTitle>
              <DialogDescription>
                Add a new unit of measurement
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="new-unit">Unit Name</Label>
                <Input
                  id="new-unit"
                  value={newUnitName}
                  onChange={(e) => setNewUnitName(e.target.value)}
                  placeholder="Enter unit name"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddUnit(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddCustomUnit}>
                Add Unit
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <CheckCircle className="h-8 w-8 text-green-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-muted-foreground">In Stock</p>
                  <p className="text-2xl font-bold text-green-600">{stockStats.inStock}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <AlertTriangle className="h-8 w-8 text-yellow-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-muted-foreground">Low Stock</p>
                  <p className="text-2xl font-bold text-yellow-600">{stockStats.lowStock}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <AlertCircle className="h-8 w-8 text-red-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-muted-foreground">Out of Stock</p>
                  <p className="text-2xl font-bold text-red-600">{stockStats.outOfStock}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <TrendingDown className="h-8 w-8 text-blue-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-muted-foreground">Overstock</p>
                  <p className="text-2xl font-bold text-blue-600">{stockStats.overstock}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Search materials..."
                    className="pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map(category => (
                    <SelectItem key={category} value={category}>{category}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="in-stock">In Stock</SelectItem>
                  <SelectItem value="low-stock">Low Stock</SelectItem>
                  <SelectItem value="out-of-stock">Out of Stock</SelectItem>
                  <SelectItem value="overstock">Overstock</SelectItem>
                  <SelectItem value="in-transit">In Transit</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="overview">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="inventory">Inventory</TabsTrigger>
            <TabsTrigger value="waste-recovery">
              Waste Recovery ({wasteRecoveryCount})
            </TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="notifications" className="text-xs sm:text-sm">
              <span className="hidden sm:inline">Notifications</span>
              <span className="sm:hidden">Alerts</span>
              {notifications.length > 0 && (
                <Badge variant="destructive" className="ml-1 sm:ml-2 text-xs">
                  {notifications.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Materials Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredMaterials.map((material) => (
                <Card key={material.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg mb-1">{material.name}</h3>
                        <p className="text-sm text-muted-foreground mb-2">{material.type}</p>
                        <Badge
                          variant="secondary"
                          className={`text-xs ${statusStyles[material.status]}`}
                        >
                          {material.status.replace('-', ' ')}
                        </Badge>
                      </div>
                      {material.imageUrl && (
                        <Image className="w-12 h-12 text-muted-foreground" />
                      )}
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Stock:</span>
                        <span className="font-medium">{material.currentStock} {material.unit}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Category:</span>
                        <span>{material.category}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Supplier:</span>
                        <span>{material.supplier}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Cost/Unit:</span>
                        <span>₹{material.costPerUnit}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Total Value:</span>
                        <span className="font-medium">₹{(material.totalValue || 0).toFixed(2)}</span>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => {
                          setSelectedMaterial(material);
                          setIsDetailsDialogOpen(true);
                        }}
                      >
                        Details
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleOpenRestockDialog(material)}
                      >
                        <ShoppingCart className="w-4 h-4 mr-1" />
                        Order
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {filteredMaterials.length === 0 && (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-8">
                    <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium text-muted-foreground mb-2">
                      No materials found
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Try adjusting your search criteria or add new materials.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Pagination */}
            {totalMaterials > itemsPerPage && (
              <div className="mt-6 flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, totalMaterials)} of {totalMaterials} materials
                </div>
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious 
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          if (currentPage > 1) {
                            setCurrentPage(currentPage - 1);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }
                        }}
                        className={currentPage === 1 ? 'pointer-events-none opacity-50' : ''}
                      />
                    </PaginationItem>
                    {Array.from({ length: Math.ceil(totalMaterials / itemsPerPage) }, (_, i) => i + 1)
                      .filter(page => {
                        // Show first page, last page, current page, and pages around current
                        return page === 1 || 
                               page === Math.ceil(totalMaterials / itemsPerPage) ||
                               (page >= currentPage - 1 && page <= currentPage + 1);
                      })
                      .map((page, index, array) => {
                        // Add ellipsis if there's a gap
                        const showEllipsisBefore = index > 0 && array[index - 1] !== page - 1;
                        return (
                          <React.Fragment key={page}>
                            {showEllipsisBefore && (
                              <PaginationItem>
                                <PaginationEllipsis />
                              </PaginationItem>
                            )}
                            <PaginationItem>
                              <PaginationLink
                                href="#"
                                onClick={(e) => {
                                  e.preventDefault();
                                  setCurrentPage(page);
                                  window.scrollTo({ top: 0, behavior: 'smooth' });
                                }}
                                isActive={currentPage === page}
                              >
                                {page}
                              </PaginationLink>
                            </PaginationItem>
                          </React.Fragment>
                        );
                      })}
                    <PaginationItem>
                      <PaginationNext 
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          if (currentPage < Math.ceil(totalMaterials / itemsPerPage)) {
                            setCurrentPage(currentPage + 1);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }
                        }}
                        className={currentPage >= Math.ceil(totalMaterials / itemsPerPage) ? 'pointer-events-none opacity-50' : ''}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </TabsContent>

          <TabsContent value="inventory">
            <Card>
              <CardHeader>
                <CardTitle>Material Inventory</CardTitle>
                <CardDescription>
                  Detailed inventory view with stock levels and reorder points
                </CardDescription>
              </CardHeader>
              <CardContent>
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-4 font-medium text-muted-foreground">Material</th>
                        <th className="text-left p-4 font-medium text-muted-foreground">Category</th>
                        <th className="text-left p-4 font-medium text-muted-foreground">Current Stock</th>
                        <th className="text-left p-4 font-medium text-muted-foreground">Status</th>
                        <th className="text-left p-4 font-medium text-muted-foreground">Supplier</th>
                        <th className="text-left p-4 font-medium text-muted-foreground">Cost/Unit</th>
                        <th className="text-left p-4 font-medium text-muted-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredMaterials.map((material) => {
                        const stockPercent = (material.currentStock / material.maxCapacity) * 100;

                        return (
                        <tr key={material.id} className="border-b hover:bg-muted/50">
                            <td className="p-4">
                              <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                                  {material.imageUrl ? (
                                    <img
                                      src={material.imageUrl}
                                      alt={material.name}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-muted">
                                      <Image className="w-6 h-6 text-muted-foreground" />
                                    </div>
                                  )}
                                </div>
                            <div>
                                <div className="font-medium text-foreground">{material.name}</div>
                              <div className="text-sm text-muted-foreground">{material.type}</div>
                                </div>
                            </div>
                          </td>
                            <td className="p-4">
                              <Badge variant="outline">{material.category}</Badge>
                            </td>
                            <td className="p-4">
                              <div className="space-y-1">
                                <div className="font-medium text-foreground">
                                  {material.currentStock} {material.unit}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {stockPercent.toFixed(1)}% of capacity
                                </div>
                                <div className="w-24 bg-muted rounded-full h-1.5">
                                  <div
                                    className="h-1.5 rounded-full bg-primary"
                                    style={{ width: `${Math.min(stockPercent, 100)}%` }}
                                  />
                              </div>
                            </div>
                          </td>
                            <td className="p-4">
                              <Badge className={statusStyles[material.status]}>
                                {material.status.replace("-", " ")}
                            </Badge>
                          </td>
                            <td className="p-4">
                              <div className="text-sm text-foreground">{material.supplier}</div>
                            </td>
                            <td className="p-4">
                              <div className="font-medium text-foreground">
                                ₹{material.costPerUnit}
                            </div>
                          </td>
                            <td className="p-4">
                            <div className="flex gap-2">
                                <Button
                                  variant={material.status === "out-of-stock" ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => handleOpenRestockDialog(material)}
                                >
                                  {material.status === "out-of-stock" ? "Order Now" : "Restock"}
                              </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedMaterial(material);
                                    setIsDetailsDialogOpen(true);
                                  }}
                                >
                                  Details
                              </Button>
                            </div>
                          </td>
                        </tr>
                        );
                      })}
                    </tbody>
                  </table>

                {/* Pagination */}
                {totalMaterials > itemsPerPage && (
                  <div className="mt-4 flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, totalMaterials)} of {totalMaterials} materials
                    </div>
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious 
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              if (currentPage > 1) {
                                setCurrentPage(currentPage - 1);
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                              }
                            }}
                            className={currentPage === 1 ? 'pointer-events-none opacity-50' : ''}
                          />
                        </PaginationItem>
                        {Array.from({ length: Math.ceil(totalMaterials / itemsPerPage) }, (_, i) => i + 1)
                          .filter(page => {
                            // Show first page, last page, current page, and pages around current
                            return page === 1 || 
                                   page === Math.ceil(totalMaterials / itemsPerPage) ||
                                   (page >= currentPage - 1 && page <= currentPage + 1);
                          })
                          .map((page, index, array) => {
                            // Add ellipsis if there's a gap
                            const showEllipsisBefore = index > 0 && array[index - 1] !== page - 1;
                            return (
                              <React.Fragment key={page}>
                                {showEllipsisBefore && (
                                  <PaginationItem>
                                    <PaginationEllipsis />
                                  </PaginationItem>
                                )}
                                <PaginationItem>
                                  <PaginationLink
                                    href="#"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      setCurrentPage(page);
                                      window.scrollTo({ top: 0, behavior: 'smooth' });
                                    }}
                                    isActive={currentPage === page}
                                  >
                                    {page}
                                  </PaginationLink>
                                </PaginationItem>
                              </React.Fragment>
                            );
                          })}
                        <PaginationItem>
                          <PaginationNext 
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              if (currentPage < Math.ceil(totalMaterials / itemsPerPage)) {
                                setCurrentPage(currentPage + 1);
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                              }
                            }}
                            className={currentPage >= Math.ceil(totalMaterials / itemsPerPage) ? 'pointer-events-none opacity-50' : ''}
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="waste-recovery">
            <WasteRecoveryTab
              wasteRecoveryRefresh={wasteRecoveryRefresh}
              onReturnToInventory={handleReturnToInventory}
            />
          </TabsContent>

          <TabsContent value="analytics">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Stock Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {categories.map(category => {
                      const categoryMaterials = rawMaterials.filter(m => m.category === category);
                      const totalValue = categoryMaterials.reduce((sum, m) => sum + m.totalValue, 0);

                      return (
                        <div key={category} className="flex items-center justify-between p-3 border rounded">
                          <div>
                            <div className="font-medium">{category}</div>
                            <div className="text-sm text-muted-foreground">
                              {categoryMaterials.length} materials
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-medium">₹{totalValue.toFixed(2)}</div>
                            <div className="text-sm text-muted-foreground">Total Value</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Top Suppliers</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[...new Set(rawMaterials.map(m => m.supplier).filter(Boolean))].map((supplier, index) => {
                      const supplierMaterials = rawMaterials.filter(m => m.supplier === supplier);
                      const totalValue = supplierMaterials.reduce((sum, m) => sum + (m.totalValue || 0), 0);
                      const avgPerformance = supplierMaterials.reduce((sum, m) => sum + (m.supplierPerformance || 0), 0) / supplierMaterials.length;

                      return (
                        <div key={`supplier-${index}-${supplier}`} className="flex items-center justify-between p-3 border rounded">
                          <div>
                            <div className="font-medium">{supplier}</div>
                            <div className="text-sm text-muted-foreground">
                              {supplierMaterials.length} materials
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-medium">₹{totalValue.toFixed(2)}</div>
                            <div className="text-sm text-muted-foreground">
                              Performance: {avgPerformance.toFixed(1)}%
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-6">
            {/* Notifications Section */}
            {notifications.length > 0 ? (
              <Card className="border-orange-200 bg-orange-50">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Bell className="w-5 h-5 text-orange-600" />
                      <CardTitle className="text-orange-800">Raw Material Alerts & Restock Requests</CardTitle>
                      <Badge variant="destructive" className="ml-2">
                        {notifications.length}
                      </Badge>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleMarkAllAsRead}
                      className="text-orange-700 border-orange-300 hover:bg-orange-100"
                    >
                      Mark All as Read
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {notifications.map((notification) => (
                    <div key={notification.id} className="p-4 bg-white border border-orange-200 rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <AlertTriangle className="w-4 h-4 text-orange-600" />
                            <h4 className="font-semibold text-orange-800">{notification.title}</h4>
                            <Badge
                              variant={notification.priority === 'high' ? 'destructive' : 'secondary'}
                              className="text-xs"
                            >
                              {notification.priority?.toUpperCase()}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-700 mb-3">{notification.message}</p>

                          {notification.related_data && (
                            <div className="text-xs text-gray-600 space-y-1">
                              <div>📦 Material: {notification.related_data.materialName}</div>
                              <div>📊 Required: {notification.related_data.requiredQuantity} units</div>
                              <div>📋 Available: {notification.related_data.availableStock} units</div>
                              <div>⚠️ Shortfall: {notification.related_data.shortfall} units</div>
                              {notification.related_data.orderNumber && (
                                <div>🔗 Order: {notification.related_data.orderNumber}</div>
                              )}
                            </div>
                          )}

                          <div className="text-xs text-gray-500 mt-2">
                            {new Date(notification.created_at).toLocaleString()}
                          </div>
                        </div>

                        <div className="flex gap-2 ml-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleMarkAsRead(notification.id)}
                            className="text-xs px-2 py-1"
                          >
                            Mark Read
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleResolveNotification(notification.id)}
                            className="text-xs px-2 py-1 text-green-700 border-green-300 hover:bg-green-50"
                          >
                            Resolve
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <CheckCircle className="w-12 h-12 text-green-500 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Notifications</h3>
                  <p className="text-gray-600 text-center max-w-md">
                    All material notifications have been handled. You'll see restock requests and low stock alerts here when they come in from orders.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Material Details Dialog */}
        <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
          <DialogContent className="sm:max-w-3xl">
            <DialogHeader>
              <DialogTitle>Material Details</DialogTitle>
              <DialogDescription>
                Complete information about {selectedMaterial?.name}
              </DialogDescription>
            </DialogHeader>
            {selectedMaterial && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-medium">Basic Information</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Name:</span>
                        <span>{selectedMaterial.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Type:</span>
                        <span>{selectedMaterial.type}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Category:</span>
                        <span>{selectedMaterial.category}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Batch Number:</span>
                        <span>{selectedMaterial.batchNumber}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Quality Grade:</span>
                        <span>{selectedMaterial.qualityGrade}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Color:</span>
                        <span>{selectedMaterial.color || 'N/A'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-medium">Stock Information</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Current Stock:</span>
                        <span className="font-medium">{selectedMaterial.currentStock} {selectedMaterial.unit}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Min Threshold:</span>
                        <span>{selectedMaterial.minThreshold} {selectedMaterial.unit}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Max Capacity:</span>
                        <span>{selectedMaterial.maxCapacity} {selectedMaterial.unit}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Reorder Point:</span>
                        <span>{selectedMaterial.reorderPoint} {selectedMaterial.unit}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Daily Usage:</span>
                        <span>{selectedMaterial.dailyUsage} {selectedMaterial.unit}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-medium">Financial Information</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Cost per Unit:</span>
                        <span>₹{selectedMaterial.costPerUnit}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Total Value:</span>
                        <span className="font-medium">₹{selectedMaterial.totalValue.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-medium">Supplier Information</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Supplier:</span>
                        <span>{selectedMaterial.supplier}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Performance:</span>
                        <span>{selectedMaterial.supplierPerformance}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Last Restocked:</span>
                        <span>{new Date(selectedMaterial.lastRestocked).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium">Material Usage History</h4>
                  {selectedMaterial.materialsUsed.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-2">Production Batch</th>
                            <th className="text-left p-2">Step</th>
                            <th className="text-left p-2">Consumed</th>
                            <th className="text-left p-2">Waste</th>
                            <th className="text-left p-2">Date</th>
                            <th className="text-left p-2">Operator</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedMaterial.materialsUsed.slice(0, 5).map((usage) => (
                            <tr key={usage.id} className="border-b">
                              <td className="p-2">{usage.productionBatchId}</td>
                              <td className="p-2">{usage.stepName}</td>
                              <td className="p-2">{usage.consumedQuantity} {selectedMaterial.unit}</td>
                              <td className="p-2">{usage.wasteQuantity} {selectedMaterial.unit}</td>
                              <td className="p-2">{new Date(usage.consumptionDate).toLocaleDateString()}</td>
                              <td className="p-2">{usage.operator}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No usage history available</p>
                  )}
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDetailsDialogOpen(false)}>
                Close
              </Button>
              <Button onClick={() => {
                if (selectedMaterial) {
                  setOrderDetails({
                    quantity: "",
                    unit: selectedMaterial.unit,
                    supplier: selectedMaterial.supplier,
                    costPerUnit: selectedMaterial.costPerUnit.toString(),
                    expectedDelivery: "",
                    notes: ""
                  });
                  setNewMaterial({
                    ...newMaterial,
                    name: selectedMaterial.name,
                    type: selectedMaterial.type,
                    category: selectedMaterial.category,
                    unit: selectedMaterial.unit,
                    supplier: selectedMaterial.supplier,
                    costPerUnit: selectedMaterial.costPerUnit.toString()
                  });
                  setIsDetailsDialogOpen(false);
                  handleOpenRestockDialog(selectedMaterial);
                }
              }}>
                <ShoppingCart className="w-4 h-4 mr-2" />
                Create Order
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Restock Dialog */}
        <Dialog open={isRestockDialogOpen} onOpenChange={setIsRestockDialogOpen}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                {selectedRestockMaterial?.status === "out-of-stock" ? "Order" : "Restock"} {selectedRestockMaterial?.name}
              </DialogTitle>
              <DialogDescription>
                {selectedRestockMaterial?.status === "out-of-stock"
                  ? "Order this material from available suppliers"
                  : "Restock this material from available suppliers"
                }
              </DialogDescription>
            </DialogHeader>

            {selectedRestockMaterial && (
              <div className="space-y-4">
                {/* Material Info */}
                <div className="p-3 border rounded-md bg-muted">
                  <div className="flex items-center gap-3">
                    {selectedRestockMaterial.imageUrl && (
                      <img
                        src={selectedRestockMaterial.imageUrl}
                        alt={selectedRestockMaterial.name}
                        className="w-12 h-12 rounded object-cover"
                      />
                    )}
                    <div>
                      <div className="font-medium">{selectedRestockMaterial.name}</div>
                      <div className="text-sm text-muted-foreground">
                        Current stock: {selectedRestockMaterial.currentStock} {selectedRestockMaterial.unit}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Category: {selectedRestockMaterial.category}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Available Suppliers from Same Category */}
                <div>
                  <Label>Available Suppliers from {selectedRestockMaterial.category} Category</Label>
                  <div className="space-y-2 max-h-32 overflow-y-auto border rounded-md p-2 bg-muted/50">
                    {getAvailableSuppliersForRestock(selectedRestockMaterial.category, selectedRestockMaterial.name).map((supplier, index) => (
                      <div key={index} className="p-2 border rounded-md text-sm bg-background">
                        <div className="font-medium">{supplier.name}</div>
                        <div className="text-muted-foreground text-xs">
                          Type: {supplier.type} | Cost: ₹{supplier.costPerUnit} | Unit: {supplier.unit}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Supplier Selection */}
                <div>
                  <Label htmlFor="restockSupplier">Select Supplier *</Label>
                  <Select
                    value={restockForm.supplier}
                    onValueChange={handleRestockSupplierChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select supplier" />
                    </SelectTrigger>
                    <SelectContent>
                      {getAvailableSuppliersForRestock(selectedRestockMaterial.category, selectedRestockMaterial.name).map((supplier, index) => (
                        <SelectItem key={index} value={supplier.name}>
                          <div className="flex flex-col">
                            <span className="font-medium">{supplier.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {supplier.type} • ₹{supplier.costPerUnit} • {supplier.unit}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                      <SelectItem value="new_supplier">
                        <div className="flex items-center gap-2 text-blue-600">
                          <Plus className="w-4 h-4" />
                          Add New Supplier
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  {restockForm.supplier === "new_supplier" && (
                    <Input
                      placeholder="Enter new supplier name"
                      className="mt-2"
                      onChange={(e) => setRestockForm({...restockForm, supplier: e.target.value})}
                    />
                  )}
                </div>

                {/* Type (Auto-filled based on supplier) */}
                <div>
                  <Label htmlFor="restockType">Material Type *</Label>
                  <Input
                    id="restockType"
                    value={restockForm.type}
                    onChange={(e) => setRestockForm({...restockForm, type: e.target.value})}
                    placeholder="Type will be auto-filled based on supplier"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Type from selected supplier (editable)
                  </p>
                </div>

                {/* Quantity */}
                <div>
                  <Label htmlFor="restockQuantity">Quantity to Order *</Label>
                  <Input
                    id="restockQuantity"
                    type="text"
                    value={restockForm.quantity}
                    onChange={(e) => {
                      // Allow only numbers and leading zeros
                      const value = e.target.value;
                      if (value === '' || /^\d*\.?\d*$/.test(value)) {
                        setRestockForm({...restockForm, quantity: value});
                      }
                    }}
                    placeholder="Enter quantity to restock"
                    min="1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Unit: {selectedRestockMaterial.unit}
                  </p>
                </div>

                {/* Cost per Unit (Auto-filled based on supplier) */}
                <div>
                  <Label htmlFor="restockCostPerUnit">Cost per Unit (₹) *</Label>
                  <Input
                    id="restockCostPerUnit"
                    type="text"
                    value={restockForm.costPerUnit}
                    onChange={(e) => {
                      // Allow only numbers and leading zeros
                      const value = e.target.value;
                      if (value === '' || /^\d*\.?\d*$/.test(value)) {
                        setRestockForm({...restockForm, costPerUnit: value});
                      }
                    }}
                    placeholder="Cost will be auto-filled based on supplier"
                    min="0"
                    step="0.01"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Cost from selected supplier (editable)
                  </p>
                </div>

                {/* Expected Delivery */}
                <div>
                  <Label htmlFor="restockExpectedDelivery">Expected Delivery Date</Label>
                  <Input
                    id="restockExpectedDelivery"
                    type="date"
                    value={restockForm.expectedDelivery}
                    onChange={(e) => setRestockForm({...restockForm, expectedDelivery: e.target.value})}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>

                {/* Notes */}
                <div>
                  <Label htmlFor="restockNotes">Notes</Label>
                  <Textarea
                    id="restockNotes"
                    value={restockForm.notes}
                    onChange={(e) => setRestockForm({...restockForm, notes: e.target.value})}
                    placeholder="Additional notes for this restock order"
                    rows={3}
                  />
                </div>

                {/* Total Cost Calculation */}
                {restockForm.quantity && restockForm.costPerUnit && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                    <div className="text-sm font-medium text-blue-900">
                      Total Cost: ₹{(parseFloat(restockForm.quantity) * parseFloat(restockForm.costPerUnit)).toFixed(2)}
                    </div>
                    <div className="text-xs text-blue-700">
                      {restockForm.quantity} {selectedRestockMaterial.unit} × ₹{restockForm.costPerUnit} per {selectedRestockMaterial.unit}
                    </div>
                  </div>
                )}
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsRestockDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleRestockSubmit}>
                {selectedRestockMaterial?.status === "out-of-stock" ? "Create Order" : "Create Restock Order"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
