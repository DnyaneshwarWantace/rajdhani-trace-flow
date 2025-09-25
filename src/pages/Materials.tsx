import { useState, useEffect } from "react";
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
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { RawMaterialService } from "@/services/rawMaterialService";
import { NotificationService } from "@/services/notificationService";
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
 *    - Checks ALL fields: name, brand, category, supplier, price, quality, unit
 *    - If EXACT match found = RESTOCK (update existing)
 *    - If ANY field different = NEW MATERIAL (create new entry)
 *
 * This ensures materials with same name but different specifications
 * are treated as separate products, maintaining inventory accuracy.
 */

interface RawMaterial {
  id: string;
  name: string;
  brand: string;
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
  materialBrand?: string;
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
  wasteType: string;
  quantity: number;
  unit: string;
  generatedAt: string;
  status: 'available_for_reuse' | 'added_to_inventory';
  addedAt?: string;
}

interface Settings {
  customCategories: string[];
  customUnits: string[];
  lastStockUpdate: {
    timestamp: string;
    user: string;
  } | null;
}

// Supabase utility functions to replace rawMaterialsStorage
const supabaseStorage = {
  // Raw Materials functions
  async getAll(): Promise<RawMaterial[]> {
    try {
      const { data, error } = await supabase
        .from('raw_materials')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Map database field names to UI interface field names
      const mappedData = (data || []).map((item: any) => ({
        id: item.id,
        name: item.name,
        brand: item.brand || '',
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
        imageUrl: item.image_url,
        materialsUsed: [],
        supplierPerformance: parseFloat(item.supplier_performance) || 0
      }));
      
      return mappedData;
    } catch (error) {
      console.error('Error fetching raw materials:', error);
      return [];
    }
  },

  async add(material: Omit<RawMaterial, 'id'>): Promise<RawMaterial> {
    try {
      // Map UI field names to database field names
      const dbMaterial = {
        name: material.name,
        brand: material.brand,
        category: material.category,
        current_stock: material.currentStock,
        unit: material.unit,
        min_threshold: material.minThreshold,
        max_capacity: material.maxCapacity,
        reorder_point: material.reorderPoint,
        last_restocked: material.lastRestocked,
        daily_usage: material.dailyUsage,
        status: material.status,
        supplier_name: material.supplier,
        supplier_id: material.supplierId,
        cost_per_unit: material.costPerUnit,
        total_value: material.totalValue,
        batch_number: material.batchNumber,
        quality_grade: material.qualityGrade,
        image_url: material.imageUrl,
        supplier_performance: material.supplierPerformance,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('raw_materials')
        .insert(dbMaterial)
        .select()
        .single();

      if (error) throw error;
      
      // Map the returned data back to UI format
      return {
        id: data.id,
        name: data.name,
        brand: data.brand || '',
        category: data.category,
        currentStock: parseFloat(data.current_stock) || 0,
        unit: data.unit,
        minThreshold: parseFloat(data.min_threshold) || 0,
        maxCapacity: parseFloat(data.max_capacity) || 0,
        reorderPoint: parseFloat(data.reorder_point) || 0,
        lastRestocked: data.last_restocked || new Date().toISOString().split('T')[0],
        dailyUsage: parseFloat(data.daily_usage) || 0,
        status: data.status as "in-stock" | "low-stock" | "out-of-stock" | "overstock" | "in-transit",
        supplier: data.supplier_name || '',
        supplierId: data.supplier_id || '',
        costPerUnit: parseFloat(data.cost_per_unit) || 0,
        totalValue: parseFloat(data.total_value) || 0,
        batchNumber: data.batch_number || '',
        qualityGrade: data.quality_grade,
        imageUrl: data.image_url,
        materialsUsed: [],
        supplierPerformance: parseFloat(data.supplier_performance) || 0
      };
    } catch (error) {
      console.error('Error adding raw material:', error);
      throw error;
    }
  },

  async update(id: string, updates: Partial<RawMaterial>): Promise<RawMaterial> {
    try {
      // Map UI field names to database field names
      const dbUpdates: any = {
        updated_at: new Date().toISOString()
      };
      
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.brand !== undefined) dbUpdates.brand = updates.brand;
      if (updates.category !== undefined) dbUpdates.category = updates.category;
      if (updates.currentStock !== undefined) dbUpdates.current_stock = updates.currentStock;
      if (updates.unit !== undefined) dbUpdates.unit = updates.unit;
      if (updates.minThreshold !== undefined) dbUpdates.min_threshold = updates.minThreshold;
      if (updates.maxCapacity !== undefined) dbUpdates.max_capacity = updates.maxCapacity;
      if (updates.reorderPoint !== undefined) dbUpdates.reorder_point = updates.reorderPoint;
      if (updates.lastRestocked !== undefined) dbUpdates.last_restocked = updates.lastRestocked;
      if (updates.dailyUsage !== undefined) dbUpdates.daily_usage = updates.dailyUsage;
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.supplier !== undefined) dbUpdates.supplier_name = updates.supplier;
      if (updates.supplierId !== undefined) dbUpdates.supplier_id = updates.supplierId;
      if (updates.costPerUnit !== undefined) dbUpdates.cost_per_unit = updates.costPerUnit;
      if (updates.totalValue !== undefined) dbUpdates.total_value = updates.totalValue;
      if (updates.batchNumber !== undefined) dbUpdates.batch_number = updates.batchNumber;
      if (updates.qualityGrade !== undefined) dbUpdates.quality_grade = updates.qualityGrade;
      if (updates.imageUrl !== undefined) dbUpdates.image_url = updates.imageUrl;
      if (updates.supplierPerformance !== undefined) dbUpdates.supplier_performance = updates.supplierPerformance;

      const { data, error } = await supabase
        .from('raw_materials')
        .update(dbUpdates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      // Map the returned data back to UI format
      return {
        id: data.id,
        name: data.name,
        brand: data.brand || '',
        category: data.category,
        currentStock: parseFloat(data.current_stock) || 0,
        unit: data.unit,
        minThreshold: parseFloat(data.min_threshold) || 0,
        maxCapacity: parseFloat(data.max_capacity) || 0,
        reorderPoint: parseFloat(data.reorder_point) || 0,
        lastRestocked: data.last_restocked || new Date().toISOString().split('T')[0],
        dailyUsage: parseFloat(data.daily_usage) || 0,
        status: data.status as "in-stock" | "low-stock" | "out-of-stock" | "overstock" | "in-transit",
        supplier: data.supplier_name || '',
        supplierId: data.supplier_id || '',
        costPerUnit: parseFloat(data.cost_per_unit) || 0,
        totalValue: parseFloat(data.total_value) || 0,
        batchNumber: data.batch_number || '',
        qualityGrade: data.quality_grade,
        imageUrl: data.image_url,
        materialsUsed: [],
        supplierPerformance: parseFloat(data.supplier_performance) || 0
      };
    } catch (error) {
      console.error('Error updating raw material:', error);
      throw error;
    }
  },

  async delete(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('raw_materials')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting raw material:', error);
      throw error;
    }
  },

  async needsInitialization(): Promise<boolean> {
    try {
      const { count, error } = await supabase
        .from('raw_materials')
        .select('*', { count: 'exact', head: true });

      if (error) throw error;
      return count === 0;
    } catch (error) {
      console.error('Error checking initialization:', error);
      return true;
    }
  },

  // Purchase Orders functions
  async getPurchaseOrders(): Promise<MaterialPurchase[]> {
    try {
      const { data, error } = await supabase
        .from('purchase_orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching purchase orders:', error);
      return [];
    }
  },

  async addPurchaseOrder(order: Omit<MaterialPurchase, 'id'>): Promise<MaterialPurchase> {
    try {
      // Store material details in notes as JSON, but keep user notes separate
      const materialDetails = {
        materialName: order.materialName,
        materialBrand: order.materialBrand || 'Unknown',
        materialCategory: order.materialCategory || 'Other',
        materialBatchNumber: order.materialBatchNumber || `BATCH-${Date.now()}`,
        quantity: order.quantity,
        unit: order.unit,
        costPerUnit: order.costPerUnit,
        minThreshold: order.minThreshold || 100,
        maxCapacity: order.maxCapacity || 1000,
        qualityGrade: order.qualityGrade || 'A',
        isRestock: order.isRestock || false,
        userNotes: order.notes || '' // Store user notes separately
      };

      // Map interface fields to database schema fields
      const dbOrder = {
        id: generateUniqueId('PO'),
        order_number: `PO-${Date.now()}`,
        supplier_id: null, // Set to null since we're not managing suppliers properly
        supplier_name: order.supplierName,
        order_date: order.purchaseDate.split('T')[0], // Convert to date format
        expected_delivery: order.expectedDelivery,
        status: order.status === 'ordered' ? 'pending' : order.status,
        total_amount: order.totalCost,
        notes: materialDetails.userNotes || '', // Store only user notes
        material_details: materialDetails // Store material details in proper column
      };

      const { data, error } = await supabase
        .from('purchase_orders')
        .insert(dbOrder)
        .select()
        .single();

      if (error) throw error;
      
      // Map database response back to interface format
      return {
        id: data.id,
        materialId: order.materialId,
        materialName: order.materialName,
        supplierId: data.supplier_id,
        supplierName: data.supplier_name,
        quantity: order.quantity,
        unit: order.unit,
        costPerUnit: order.costPerUnit,
        totalCost: data.total_amount,
        purchaseDate: data.order_date,
        expectedDelivery: data.expected_delivery,
        status: data.status,
        inspector: order.inspector,
        inspectionDate: order.inspectionDate,
        notes: data.notes
      };
    } catch (error) {
      console.error('Error adding purchase order:', error);
      throw error;
    }
  },

  // Suppliers functions
  async getSuppliers(): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .order('name');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      return [];
    }
  },

  // Notifications functions
  async getNotifications(): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('module', 'materials')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching notifications:', error);
      return [];
    }
  },

  async addNotification(notification: any): Promise<void> {
    try {
      const newNotification = {
        ...notification,
        id: generateUniqueId('NOTIF'),
        created_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('notifications')
        .insert(newNotification);

      if (error) throw error;
    } catch (error) {
      console.error('Error adding notification:', error);
    }
  },

  // Waste Management functions - DISABLED (table doesn't exist)
  // async getWasteManagement(): Promise<WasteItem[]> {
  //   try {
  //     const { data, error } = await supabase
  //       .from('waste_management')
  //       .select('*')
  //       .order('generated_at', { ascending: false });

  //     if (error) throw error;
  //     return data || [];
  //   } catch (error) {
  //     console.error('Error fetching waste management:', error);
  //     return [];
  //   }
  // },

  // async updateWasteManagement(wasteData: WasteItem[]): Promise<void> {
  //   try {
  //     // Delete existing data and insert new data
  //     await supabase.from('waste_management').delete().neq('id', '');

  //     if (wasteData.length > 0) {
  //       const { error } = await supabase
  //         .from('waste_management')
  //         .insert(wasteData);

  //       if (error) throw error;
  //     }
  //   } catch (error) {
  //     console.error('Error updating waste management:', error);
  //   }
  // },

  // Settings functions
  async getSettings(): Promise<Settings> {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('*')
        .eq('key', 'materials_settings')
        .single();

      if (error && error.code !== 'PGRST116' && error.code !== 'PGRST205') {
        console.warn('Settings table not found, using defaults:', error);
      }

      if (data?.value) {
        return JSON.parse(data.value);
      }

      return {
        customCategories: [],
        customUnits: [],
        lastStockUpdate: null
      };
    } catch (error) {
      console.warn('Error fetching settings, using defaults:', error);
      return {
        customCategories: [],
        customUnits: [],
        lastStockUpdate: null
      };
    }
  },

  async updateSettings(settings: Settings): Promise<void> {
    try {
      const { error } = await supabase
        .from('app_settings')
        .upsert({
          key: 'materials_settings',
          value: JSON.stringify(settings),
          updated_at: new Date().toISOString()
        });

      if (error && error.code !== 'PGRST205') {
        console.warn('Settings table not found, settings not saved:', error);
      }
    } catch (error) {
      console.warn('Error updating settings:', error);
    }
  }
};

const statusStyles = {
  "in-stock": "bg-success text-success-foreground",
  "low-stock": "bg-warning text-warning-foreground",
  "out-of-stock": "bg-destructive text-destructive-foreground",
  "overstock": "bg-blue-100 text-blue-800 border-blue-200",
  "in-transit": "bg-orange-100 text-orange-800 border-orange-200"
};

export default function Materials() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  // State management
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isAddMaterialOpen, setIsAddMaterialOpen] = useState(false);
  const [isAddToInventoryOpen, setIsAddToInventoryOpen] = useState(false);
  const [isImportInventoryOpen, setIsImportInventoryOpen] = useState(false);
  const [isOrderDialogOpen, setIsOrderDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<RawMaterial | null>(null);
  const [wasteRecoveryRefresh, setWasteRecoveryRefresh] = useState(0);
  const [inventoryImagePreview, setInventoryImagePreview] = useState<string>("");
  const [imagePreview, setImagePreview] = useState<string>("");

  const [newMaterial, setNewMaterial] = useState({
    name: "",
    brand: "",
    category: "",
    currentStock: "",
    unit: "",
    minThreshold: "",
    maxCapacity: "",
    supplier: "",
    costPerUnit: "",
    expectedDelivery: "",
    imageUrl: ""
  });

  const [newInventoryMaterial, setNewInventoryMaterial] = useState({
    name: "",
    brand: "",
    category: "",
    currentStock: "",
    unit: "",
    minThreshold: "",
    maxCapacity: "",
    supplier: "",
    costPerUnit: "",
    imageUrl: ""
  });

  // Dynamic dropdown states
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [customUnits, setCustomUnits] = useState<string[]>([]);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [showAddUnit, setShowAddUnit] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newUnitName, setNewUnitName] = useState("");
  const [settings, setSettings] = useState<Settings>({
    customCategories: [],
    customUnits: [],
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
    brand: "",
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
      await markNotificationAsRead(notificationId);
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
      await resolveNotification(notificationId);
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
      await Promise.all(notifications.map(n => markNotificationAsRead(n.id)));
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

  // Initialize and load data from Supabase
  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      try {
        // Load raw materials
        const materials = await supabaseStorage.getAll();
        const uniqueMaterials = removeDuplicateBatchNumbers(materials);
        setRawMaterials(uniqueMaterials);

        // Load notifications for materials module
        const { data: materialNotifications, error: notificationError } = await NotificationService.getNotificationsByModule('materials');
        if (notificationError) {
          console.error('Error loading material notifications:', notificationError);
        } else {
          const unreadNotifications = materialNotifications?.filter(n => n.status === 'unread') || [];
          setNotifications(unreadNotifications);
          console.log('📢 Loaded material notifications:', unreadNotifications.length);
        }

        // Load settings (custom categories, units, etc.)
        const settingsData = await supabaseStorage.getSettings();
        setSettings(settingsData);
        setCustomCategories(settingsData.customCategories || []);
        setCustomUnits(settingsData.customUnits || []);

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

  // Refresh data when component becomes visible
  useEffect(() => {
    const handleFocus = async () => {
      console.log('🔄 Refreshing materials data on page focus');
      try {
        const materials = await supabaseStorage.getAll();
        const uniqueMaterials = removeDuplicateBatchNumbers(materials);
        setRawMaterials(uniqueMaterials);
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
  }, []);

  // Get waste recovery count for the dashboard
  const getWasteRecoveryCount = async () => {
    try {
      // TODO: Implement when waste_management table is created
      return 0;
    } catch (error) {
      console.error('Error getting waste recovery count:', error);
      return 0;
    }
  };

  // Update settings in Supabase
  const updateCustomCategories = async (newCategories: string[]) => {
    try {
      const updatedSettings = { ...settings, customCategories: newCategories };
      await supabaseStorage.updateSettings(updatedSettings);
      setSettings(updatedSettings);
      setCustomCategories(newCategories);
    } catch (error) {
      console.error('Error updating custom categories:', error);
      toast({
        title: "Error",
        description: "Failed to update custom categories",
        variant: "destructive",
      });
    }
  };

  const updateCustomUnits = async (newUnits: string[]) => {
    try {
      const updatedSettings = { ...settings, customUnits: newUnits };
      await supabaseStorage.updateSettings(updatedSettings);
      setSettings(updatedSettings);
      setCustomUnits(newUnits);
    } catch (error) {
      console.error('Error updating custom units:', error);
      toast({
        title: "Error",
        description: "Failed to update custom units",
        variant: "destructive",
      });
    }
  };

  const updateLastStockUpdate = async (timestamp: string, user: string = 'admin') => {
    try {
      const updatedSettings = {
        ...settings,
        lastStockUpdate: { timestamp, user }
      };
      await supabaseStorage.updateSettings(updatedSettings);
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

  // Get filtered materials
  const filteredMaterials = rawMaterials.filter(material => {
    const matchesSearch = material.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         material.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         material.supplier.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === "all" || material.category === categoryFilter;
    const matchesStatus = statusFilter === "all" || material.status === statusFilter;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Get stock statistics
  const stockStats = {
    inStock: rawMaterials.filter(m => m.status === "in-stock").length,
    lowStock: rawMaterials.filter(m => m.status === "low-stock").length,
    outOfStock: rawMaterials.filter(m => m.status === "out-of-stock").length,
    overstock: rawMaterials.filter(m => m.status === "overstock").length
  };

  // Get unique categories and units for filters
  const categories = [...new Set(rawMaterials.map(m => m.category))];
  const units = [...new Set(rawMaterials.map(m => m.unit))];

  // Get all available categories (default + custom)
  const getAllCategories = () => {
    const defaultCategories = ["Yarn", "Dye", "Chemical", "Fabric", "Other"];
    return [...defaultCategories, ...customCategories];
  };

  // Get all available units (default + custom)
  const getAllUnits = () => {
    const defaultUnits = ["rolls", "liters", "kg", "sqm", "pieces"];
    return [...defaultUnits, ...customUnits];
  };

  // Get available suppliers for restocking based on material category
  const getAvailableSuppliersForRestock = (materialCategory: string, materialName: string) => {
    // Get suppliers from same category (e.g., all dye suppliers for dye materials)
    const categorySuppliers = rawMaterials
      .filter(m => m.category === materialCategory)
      .map(m => ({
        name: m.supplier,
        brand: m.brand,
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
        brand: m.brand,
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

  // Handle adding new category
  const handleAddCategory = () => {
    if (newCategoryName.trim() && !customCategories.includes(newCategoryName.trim())) {
      const updatedCategories = [...customCategories, newCategoryName.trim()];
      setCustomCategories(updatedCategories);
      setNewInventoryMaterial({...newInventoryMaterial, category: newCategoryName.trim()});
      setNewCategoryName("");
      setShowAddCategory(false);
    }
  };

  // Handle adding new unit
  const handleAddUnit = () => {
    if (newUnitName.trim() && !customUnits.includes(newUnitName.trim())) {
      const updatedUnits = [...customUnits, newUnitName.trim()];
      setCustomUnits(updatedUnits);
      setNewInventoryMaterial({...newInventoryMaterial, unit: newUnitName.trim()});
      setNewUnitName("");
      setShowAddUnit(false);
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
        brand: newMaterial.brand,
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
      const result = await RawMaterialService.createRawMaterial({
        name: newMaterial.name,
        brand: newMaterial.brand,
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
        image_url: newMaterial.imageUrl
      });

      if (result.error) {
        throw new Error(result.error);
      }

      const addedMaterial = result.data;

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
        materialBrand: newMaterial.brand,
        materialCategory: newMaterial.category,
        materialBatchNumber: generateUniqueId('BATCH'),
        minThreshold: parseFloat(newMaterial.minThreshold) || 10,
        maxCapacity: parseFloat(newMaterial.maxCapacity) || 1000,
        qualityGrade: "A",
        isRestock: false
      };

      // Add to material orders storage
      await supabaseStorage.addPurchaseOrder(orderData);

      // Update last stock update
      await updateLastStockUpdate(new Date().toISOString());

      // Refresh materials list
      const updatedMaterials = await supabaseStorage.getAll();
      setRawMaterials(removeDuplicateBatchNumbers(updatedMaterials));

      // Reset forms and close dialog
      setNewMaterial({
        name: "", brand: "", category: "", currentStock: "",
        unit: "", minThreshold: "", maxCapacity: "", supplier: "", costPerUnit: "",
        expectedDelivery: "", imageUrl: ""
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
        brand: newInventoryMaterial.brand,
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
      const result = await RawMaterialService.createRawMaterial({
        name: newInventoryMaterial.name,
        brand: newInventoryMaterial.brand,
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
        image_url: newInventoryMaterial.imageUrl
      });

      if (result.error) {
        throw new Error(result.error);
      }

      const addedMaterial = result.data;

      // Update last stock update
      await updateLastStockUpdate(new Date().toISOString());

      // Refresh materials list
      const updatedMaterials = await supabaseStorage.getAll();
      setRawMaterials(removeDuplicateBatchNumbers(updatedMaterials));

      // Reset form and close dialog
      setNewInventoryMaterial({
        name: "", brand: "", category: "", currentStock: "",
        unit: "", minThreshold: "", maxCapacity: "", supplier: "", costPerUnit: "", imageUrl: ""
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
        brand: material.brand,
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
        imageUrl: material.imageUrl || "",
        materialsUsed: [],
        supplierPerformance: 85
      }));

      // Add materials to Supabase using RawMaterialService
      for (const material of validMaterials) {
        const result = await RawMaterialService.createRawMaterial({
          name: material.name,
          brand: material.brand,
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
          image_url: material.imageUrl
        });

        if (result.error) {
          console.error(`Error adding material ${material.name}:`, result.error);
        }
      }

      // Update last stock update
      await updateLastStockUpdate(new Date().toISOString());

      // Refresh materials list
      const updatedMaterials = await supabaseStorage.getAll();
      setRawMaterials(removeDuplicateBatchNumbers(updatedMaterials));

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

    const updatedCategories = [...customCategories, newCategoryName.trim()];
    await updateCustomCategories(updatedCategories);
    setNewCategoryName("");
    setShowAddCategory(false);

    toast({
      title: "Category Added",
      description: `"${newCategoryName}" has been added to custom categories.`,
    });
  };

  // Handle adding custom unit
  const handleAddCustomUnit = async () => {
    if (!newUnitName.trim()) return;

    const updatedUnits = [...customUnits, newUnitName.trim()];
    await updateCustomUnits(updatedUnits);
    setNewUnitName("");
    setShowAddUnit(false);

    toast({
      title: "Unit Added",
      description: `"${newUnitName}" has been added to custom units.`,
    });
  };

  // Delete functions for dropdown options
  const deleteCategory = async (category: string) => {
    if (confirm(`Are you sure you want to delete the category "${category}"? This will affect all materials using this category.`)) {
      const updatedCategories = customCategories.filter(c => c !== category);
      await updateCustomCategories(updatedCategories);
      
      // Reset category if it was selected in any form
      if (newMaterial.category === category) {
        setNewMaterial({...newMaterial, category: ""});
      }
      if (newInventoryMaterial.category === category) {
        setNewInventoryMaterial({...newInventoryMaterial, category: ""});
      }
      
      toast({
        title: "Category Deleted",
        description: `"${category}" has been removed from categories.`,
      });
    }
  };

  const deleteUnit = async (unit: string) => {
    if (confirm(`Are you sure you want to delete the unit "${unit}"? This will affect all materials using this unit.`)) {
      const updatedUnits = customUnits.filter(u => u !== unit);
      await updateCustomUnits(updatedUnits);
      
      // Reset unit if it was selected in any form
      if (newMaterial.unit === unit) {
        setNewMaterial({...newMaterial, unit: ""});
      }
      if (newInventoryMaterial.unit === unit) {
        setNewInventoryMaterial({...newInventoryMaterial, unit: ""});
      }
      
      toast({
        title: "Unit Deleted",
        description: `"${unit}" has been removed from units.`,
      });
    }
  };

  // Handle waste management operations
  const handleReturnToInventory = async (waste: WasteItem) => {
    try {
      // TODO: Implement when waste_management table is created
      // For now, just add the material to inventory

      // Find existing material with same name or create new one
      const existingMaterial = rawMaterials.find(m =>
        m.name.toLowerCase() === waste.productName.toLowerCase()
      );

      if (existingMaterial) {
        // Update existing material stock
        const updatedMaterial = {
          ...existingMaterial,
          currentStock: existingMaterial.currentStock + waste.quantity,
          lastRestocked: new Date().toISOString()
        };
        updatedMaterial.status = calculateMaterialStatus(updatedMaterial);
        updatedMaterial.totalValue = updatedMaterial.currentStock * updatedMaterial.costPerUnit;

        await supabaseStorage.update(existingMaterial.id, updatedMaterial);
      } else {
        // Create new material from waste
        const newMaterial = {
          name: waste.productName,
          brand: "Recovered",
          category: "Waste Recovery",
          batchNumber: generateUniqueId('RECOVERED'),
          currentStock: waste.quantity,
          unit: waste.unit,
          minThreshold: 10,
          maxCapacity: 1000,
          reorderPoint: 10,
          lastRestocked: new Date().toISOString(),
          dailyUsage: 0,
          status: "in-stock" as RawMaterial['status'],
          supplier: "Waste Recovery",
          supplierId: generateUniqueId('SUP'),
          costPerUnit: 0,
          totalValue: 0,
          qualityGrade: "B",
          imageUrl: "",
          materialsUsed: [],
          supplierPerformance: 75
        };

        newMaterial.status = calculateMaterialStatus(newMaterial as RawMaterial) as RawMaterial['status'];
        await supabaseStorage.add(newMaterial as Omit<RawMaterial, 'id'>);
      }

      // Refresh materials and waste data
      const updatedMaterials = await supabaseStorage.getAll();
      setRawMaterials(removeDuplicateBatchNumbers(updatedMaterials));
      setWasteRecoveryRefresh(prev => prev + 1);

      toast({
        title: "Waste Recovered",
        description: `${waste.quantity} ${waste.unit} of ${waste.productName} returned to inventory.`,
      });

    } catch (error) {
      console.error('Error returning waste to inventory:', error);
      toast({
        title: "Error",
        description: "Failed to return waste to inventory",
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
        brand: firstSupplier.brand,
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
        brand: "",
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
        brand: "",
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
        brand: selectedSupplier.brand,
        costPerUnit: selectedSupplier.costPerUnit.toString()
      }));
    } else {
      setRestockForm(prev => ({
        ...prev,
        supplier: supplierName,
        brand: "",
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
        materialBrand: restockForm.brand,
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

      // Add to material orders storage
      await supabaseStorage.addPurchaseOrder(orderData);

      // Close dialog and reset form
      setIsRestockDialogOpen(false);
      setRestockForm({
        supplier: "",
        brand: "",
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
            materialBrand: restockForm.brand,
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
    <div className="min-h-screen bg-background p-6">
      <Header title="Raw Materials" />

      <div className="max-w-7xl mx-auto mt-8">
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
                    Upload a CSV file with material data. Required columns: name, brand, category, currentStock, unit, costPerUnit
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
                    Add a new raw material directly to your inventory system. This is for adding materials that you already have in stock.
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
                      <Input
                        id="inventorySupplier"
                        value={newInventoryMaterial.supplier}
                        onChange={(e) => setNewInventoryMaterial({...newInventoryMaterial, supplier: e.target.value})}
                        placeholder="e.g., ABC Textiles Ltd."
                        required
                      />
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
                    <Label htmlFor="inventoryBrand">Brand Name *</Label>
                    <Input
                      id="inventoryBrand"
                      value={newInventoryMaterial.brand}
                      onChange={(e) => setNewInventoryMaterial({...newInventoryMaterial, brand: e.target.value})}
                      placeholder="e.g., TextilePro"
                      required
                    />
                  </div>

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
                        type="number"
                        value={newInventoryMaterial.currentStock}
                        onChange={(e) => setNewInventoryMaterial({...newInventoryMaterial, currentStock: e.target.value})}
                        placeholder="100"
                        required
                      />
                      <p className="text-xs text-muted-foreground mt-1">Current quantity in stock</p>
                    </div>
                    <div>
                      <Label htmlFor="inventoryMinThreshold">Min Threshold *</Label>
                      <Input
                        id="inventoryMinThreshold"
                        type="number"
                        value={newInventoryMaterial.minThreshold}
                        onChange={(e) => setNewInventoryMaterial({...newInventoryMaterial, minThreshold: e.target.value})}
                        placeholder="50"
                        required
                      />
                      <p className="text-xs text-muted-foreground mt-1">Reorder point</p>
                    </div>
                    <div>
                      <Label htmlFor="inventoryMaxCapacity">Max Capacity *</Label>
                      <Input
                        id="inventoryMaxCapacity"
                        type="number"
                        value={newInventoryMaterial.maxCapacity}
                        onChange={(e) => setNewInventoryMaterial({...newInventoryMaterial, maxCapacity: e.target.value})}
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
                        type="number"
                        value={newInventoryMaterial.costPerUnit}
                        onChange={(e) => setNewInventoryMaterial({...newInventoryMaterial, costPerUnit: e.target.value})}
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
                        <Input
                        id="supplier"
                        value={newMaterial.supplier}
                        onChange={(e) => setNewMaterial({...newMaterial, supplier: e.target.value})}
                        placeholder="e.g., ABC Textiles Ltd."
                        />
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
                              if (newCategoryName.trim() && !customCategories.includes(newCategoryName.trim())) {
                                const updatedCategories = [...customCategories, newCategoryName.trim()];
                                setCustomCategories(updatedCategories);
                                setNewMaterial({...newMaterial, category: newCategoryName.trim()});
                                
                                // Save to Supabase settings
                                const updatedSettings = { ...settings, customCategories: updatedCategories };
                                await supabaseStorage.updateSettings(updatedSettings);
                                setSettings(updatedSettings);
                                
                                setNewCategoryName("");
                                setShowAddCategory(false);
                              }
                            }}>Add</Button>
                            <Button type="button" size="sm" variant="outline" onClick={() => {setShowAddCategory(false); setNewCategoryName("");}}>Cancel</Button>
                        </div>
                        )}
                      </div>
                    </div>
                  </div>

                      <div>
                    <Label htmlFor="brand">Brand Name *</Label>
                    <Input
                      id="brand"
                      value={newMaterial.brand}
                      onChange={(e) => setNewMaterial({...newMaterial, brand: e.target.value})}
                      placeholder="e.g., TextilePro"
                    />
                  </div>

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
                            if (newUnitName.trim() && !customUnits.includes(newUnitName.trim())) {
                              const updatedUnits = [...customUnits, newUnitName.trim()];
                              setCustomUnits(updatedUnits);
                              setNewMaterial({...newMaterial, unit: newUnitName.trim()});
                              
                              // Save to Supabase settings
                              const updatedSettings = { ...settings, customUnits: updatedUnits };
                              await supabaseStorage.updateSettings(updatedSettings);
                              setSettings(updatedSettings);
                              
                              setNewUnitName("");
                              setShowAddUnit(false);
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
                        type="number"
                        value={newMaterial.currentStock || ""}
                        onChange={(e) => setNewMaterial({...newMaterial, currentStock: e.target.value})}
                        placeholder="100"
                      />
                      <p className="text-xs text-muted-foreground mt-1">Quantity to order for this material</p>
                    </div>
                    <div>
                      <Label htmlFor="minThreshold">Min Threshold</Label>
                      <Input
                        id="minThreshold"
                          type="number"
                          value={newMaterial.minThreshold}
                          onChange={(e) => setNewMaterial({...newMaterial, minThreshold: e.target.value})}
                        placeholder="100"
                        />
                      </div>
                      <div>
                      <Label htmlFor="maxCapacity">Max Capacity</Label>
                        <Input
                        id="maxCapacity"
                          type="number"
                          value={newMaterial.maxCapacity}
                          onChange={(e) => setNewMaterial({...newMaterial, maxCapacity: e.target.value})}
                        placeholder="500"
                        />
                      </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                      <div>
                      <Label htmlFor="costPerUnit">Cost/Unit (₹)</Label>
                        <Input
                        id="costPerUnit"
                          type="number"
                          value={newMaterial.costPerUnit}
                        onChange={(e) => setNewMaterial({...newMaterial, costPerUnit: e.target.value})}
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
              Waste Recovery (0)
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
                        <p className="text-sm text-muted-foreground mb-2">{material.brand}</p>
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
                <div className="overflow-x-auto">
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
                              <div className="text-sm text-muted-foreground">{material.brand}</div>
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
                </div>
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
                        <span className="text-muted-foreground">Brand:</span>
                        <span>{selectedMaterial.brand}</span>
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
                    brand: selectedMaterial.brand,
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
                          Brand: {supplier.brand} | Cost: ₹{supplier.costPerUnit} | Unit: {supplier.unit}
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
                              {supplier.brand} • ₹{supplier.costPerUnit} • {supplier.unit}
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

                {/* Brand (Auto-filled based on supplier) */}
                <div>
                  <Label htmlFor="restockBrand">Brand Name *</Label>
                  <Input
                    id="restockBrand"
                    value={restockForm.brand}
                    onChange={(e) => setRestockForm({...restockForm, brand: e.target.value})}
                    placeholder="Brand will be auto-filled based on supplier"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Brand from selected supplier (editable)
                  </p>
                </div>

                {/* Quantity */}
                <div>
                  <Label htmlFor="restockQuantity">Quantity to Order *</Label>
                  <Input
                    id="restockQuantity"
                    type="number"
                    value={restockForm.quantity}
                    onChange={(e) => setRestockForm({...restockForm, quantity: e.target.value})}
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
                    type="number"
                    value={restockForm.costPerUnit}
                    onChange={(e) => setRestockForm({...restockForm, costPerUnit: e.target.value})}
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

// Waste Recovery Tab Component
function WasteRecoveryTab({
  wasteRecoveryRefresh,
  onReturnToInventory
}: {
  wasteRecoveryRefresh: number;
  onReturnToInventory: (waste: WasteItem) => void;
}) {
  const [wasteData, setWasteData] = useState<WasteItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadWasteData = async () => {
      setLoading(true);
      try {
        // TODO: Implement when waste_management table is created
        setWasteData([]);
      } catch (error) {
        console.error('Error loading waste data:', error);
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
                    <th className="text-left p-3">Status</th>
                    <th className="text-left p-3">Material</th>
                    <th className="text-left p-3">Quantity</th>
                    <th className="text-left p-3">Waste Type</th>
                    <th className="text-left p-3">Product Info</th>
                    <th className="text-left p-3">Generated</th>
                    <th className="text-left p-3">Actions</th>
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
}