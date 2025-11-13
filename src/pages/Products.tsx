import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { MongoDBProductService, IndividualProductService } from "@/services";
import { MongoDBRecipeService } from "@/services/api/recipeService";
import MongoDBNotificationService from "@/services/api/notificationService";
import { rawMaterialService } from "@/services/rawMaterialService";
import { mapMongoDBProductToFrontend, mapFrontendProductToMongoDB, mapFrontendIndividualProductToMongoDB, type Product as FrontendProduct, type IndividualProduct as FrontendIndividualProduct } from "@/utils/typeMapping";
import { 
  getFromStorage, 
  saveToStorage, 
  replaceStorage, 
  saveProductRecipe, 
  createRecipeFromMaterials, 
  getProductRecipe,
  getNotifications, 
  markNotificationAsRead, 
  resolveNotification 
} from "@/lib/storageUtils";
import { IDGenerator } from "@/lib/idGenerator";
import { QRCodeService, IndividualProductQRData, MainProductQRData } from "@/lib/qrCode";
import { DropdownService } from "@/services";
import type { DropdownOption } from "@/services/api/dropdownService";
import { uploadImageToR2, deleteImageFromR2 } from "@/services/api/r2Service";
// Supabase removed - now using MongoDB via backend API
import { QRCodeDisplay } from "@/components/qr/QRCodeDisplay";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { 
  Plus, Search, Package, AlertTriangle, Upload, Image, X, Download, 
  FileSpreadsheet, CheckCircle, AlertCircle, QrCode, Calendar, 
  Edit, Eye, Filter, SortAsc, SortDesc, Hash, Play, RefreshCw,
  Bell, Factory, Clock, ArrowRight, Copy, Trash2, ChevronDown
} from "lucide-react";

interface ProductMaterial {
  materialId: string;
  materialName: string;
  quantity: number;
  unit: string;
  cost: number;
  selectedQuantity?: number;
}

// Using imported types from typeMapping

const statusStyles = {
  "in-stock": "bg-success text-success-foreground",
  "low-stock": "bg-warning text-warning-foreground",
  "out-of-stock": "bg-destructive text-destructive-foreground",
  "expired": "bg-destructive text-destructive-foreground",
  "in-production": "bg-orange-100 text-orange-800 border-orange-200"
};

export default function Products() {
  const navigate = useNavigate();
  const { user, hasPageAccess } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  
  // Check page permission
  const hasProductsAccess = hasPageAccess('products');
  
  // Redirect if no access
  useEffect(() => {
    if (!hasProductsAccess) {
      navigate('/access-denied', { state: { pageName: 'Products' } });
    }
  }, [hasProductsAccess, navigate]);
  
  // Don't render if no permission
  if (!hasProductsAccess) {
    return null;
  }
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [subcategoryFilter, setSubcategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [isImportProductsOpen, setIsImportProductsOpen] = useState(false);
  const [isEditProductOpen, setIsEditProductOpen] = useState(false);
  const [isDuplicateProductOpen, setIsDuplicateProductOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<FrontendProduct | null>(null);
  const [duplicateProduct, setDuplicateProduct] = useState<FrontendProduct | null>(null);
  const [products, setProducts] = useState<FrontendProduct[]>([]);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageUrl, setImageUrl] = useState<string>(""); // Store R2 URL
  const [duplicateSelectedImage, setDuplicateSelectedImage] = useState<File | null>(null); // Store file for duplicate product
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showQRCode, setShowQRCode] = useState(false);
  const [selectedQRProduct, setSelectedQRProduct] = useState<FrontendProduct | null>(null);
  const [selectedQRIndividualProduct, setSelectedQRIndividualProduct] = useState<FrontendIndividualProduct | null>(null);
  const [productsWithRecipes, setProductsWithRecipes] = useState<Set<string>>(new Set());
  const [isAddingToProduction, setIsAddingToProduction] = useState<string | null>(null);
  const [isDuplicatingProduct, setIsDuplicatingProduct] = useState<string | null>(null);

  // Dynamic dropdown state - now using database options
  const [dropdownOptions, setDropdownOptions] = useState<{
    units: DropdownOption[];
    colors: DropdownOption[];
    patterns: DropdownOption[];
    weights: DropdownOption[];
    categories: DropdownOption[];
    subcategories: DropdownOption[];
    lengths: DropdownOption[];
    widths: DropdownOption[];
  }>({
    units: [],
    colors: [],
    patterns: [],
    weights: [],
    categories: [],
    subcategories: [],
    lengths: [],
    widths: [],
  });
  const [colorSearchTerm, setColorSearchTerm] = useState("");
  const [unitSearchTerm, setUnitSearchTerm] = useState("");
  const [weightSearchTerm, setWeightSearchTerm] = useState("");
  const [lengthSearchTerm, setLengthSearchTerm] = useState("");
  const [widthSearchTerm, setWidthSearchTerm] = useState("");
  
  // Add New Unit Dialog state
  const [isAddUnitDialogOpen, setIsAddUnitDialogOpen] = useState(false);
  const [newUnitNameInput, setNewUnitNameInput] = useState("");
  const [currentUnitType, setCurrentUnitType] = useState<'weight' | 'length' | 'width'>('weight');
  const [currentUnitPlaceholder, setCurrentUnitPlaceholder] = useState("");
  
  // Load dropdown options from database
  const loadDropdownOptions = async () => {
    try {
      const options = await DropdownService.getProductDropdownData();
      setDropdownOptions(options);
    } catch (error) {
      console.error('Error loading dropdown options:', error);
    }
  };

  // Load unit options from database using MongoDB
  const loadUnitOptions = async () => {
    try {
      // Load weight units from MongoDB
      const weightUnitsData = await DropdownService.getOptionsByCategory('weight_units');
      if (weightUnitsData) {
        setWeightUnits(weightUnitsData.map(item => item.value));
      }

      // Load length units from MongoDB - try both singular and plural categories
      const lengthUnitsDataPlural = await DropdownService.getOptionsByCategory('length_units');
      const lengthUnitsDataSingular = await DropdownService.getOptionsByCategory('length_unit');
      const allLengthUnits = [
        ...(lengthUnitsDataPlural || []).map(item => item.value),
        ...(lengthUnitsDataSingular || []).map(item => item.value)
      ];
      // Remove duplicates - use all units from backend, no filtering
      const uniqueLengthUnits = Array.from(new Set(allLengthUnits));
      setLengthUnits(uniqueLengthUnits);

      // Load width units from MongoDB - try both singular and plural categories
      const widthUnitsDataPlural = await DropdownService.getOptionsByCategory('width_units');
      const widthUnitsDataSingular = await DropdownService.getOptionsByCategory('width_unit');
      const allWidthUnits = [
        ...(widthUnitsDataPlural || []).map(item => item.value),
        ...(widthUnitsDataSingular || []).map(item => item.value)
      ];
      // Remove duplicates - use all units from backend, no filtering
      const uniqueWidthUnits = Array.from(new Set(allWidthUnits));
      setWidthUnits(uniqueWidthUnits);

    } catch (error) {
      console.error('Error loading unit options:', error);
    }
  };
  
  // Filter functions for all dropdowns
  const getFilteredColors = () => {
    if (!colorSearchTerm.trim()) return dropdownOptions.colors.map(opt => opt.value);
    return dropdownOptions.colors
      .filter(opt => opt.value.toLowerCase().includes(colorSearchTerm.toLowerCase()))
      .map(opt => opt.value);
  };


  const getFilteredUnits = () => {
    if (!unitSearchTerm.trim()) return dropdownOptions.units.map(opt => opt.value);
    return dropdownOptions.units
      .filter(opt => opt.value.toLowerCase().includes(unitSearchTerm.toLowerCase()))
      .map(opt => opt.value);
  };

  const getFilteredWeights = () => {
    // Return combined values as-is (e.g., "600 GSM", "4 mm", "5 m")
    // Don't parse - show full combined values in dropdown
    const weights = dropdownOptions.weights.map(opt => opt.value);
    
    if (!weightSearchTerm.trim()) return weights;
    
    return weights.filter(w => 
      w.toLowerCase().includes(weightSearchTerm.toLowerCase())
    );
  };


  const getFilteredLengths = () => {
    // Return combined values as-is (e.g., "5 m", "10 ft")
    const lengths = dropdownOptions.lengths.map(opt => opt.value);
    
    if (!lengthSearchTerm.trim()) return lengths;
    
    return lengths.filter(l => 
      l.toLowerCase().includes(lengthSearchTerm.toLowerCase())
    );
  };

  const getFilteredWidths = () => {
    // Return combined values as-is (e.g., "10 m", "5 ft")
    const widths = dropdownOptions.widths.map(opt => opt.value);
    
    if (!widthSearchTerm.trim()) return widths;
    
    return widths.filter(w => 
      w.toLowerCase().includes(widthSearchTerm.toLowerCase())
    );
  };

  
  // Load products and dropdown options from Supabase on component mount
  useEffect(() => {
    const loadProducts = async () => {
      try {
        // Load dropdown options first
        await loadDropdownOptions();
        
        // Load unit options
        await loadUnitOptions();
        
        const result = await MongoDBProductService.getProducts();
        console.log("Loaded products from MongoDB:", result);
        if (result.error) {
          console.error("Error loading products:", result.error);
          setProducts([]);
        } else {
          const mappedProducts = (result.data || []).map(mapMongoDBProductToFrontend);
          setProducts(mappedProducts);
          
          // Load individual products for each product
          await loadIndividualProductsForAllProducts(mappedProducts);
          
          // Check which products have recipes
          await checkProductsWithRecipes(result.data || []);
        }
      } catch (error) {
        console.error("Error loading products:", error);
        setProducts([]);
      }
    };
    
    loadProducts();
  }, []);

  // Calculate product status based on available stock
  const calculateProductStatus = (product: any) => {
    if (product.individualStockTracking) {
      // For individual tracking products, check available individual products
      const availableCount = product.individual_products?.filter((ip: any) => ip.status === 'available').length || 0;
      if (availableCount === 0) {
        return 'out-of-stock';
      } else if (availableCount <= product.minStockLevel) {
        return 'low-stock';
      } else {
        return 'in-stock';
      }
    } else {
      // For bulk products, check base quantity
      if (product.baseQuantity === 0) {
        return 'out-of-stock';
      } else if (product.baseQuantity <= product.minStockLevel) {
        return 'low-stock';
      } else {
        return 'in-stock';
      }
    }
  };

  // Load individual products for all products
  const loadIndividualProductsForAllProducts = async (products: any[]) => {
    const updatedProducts = [...products];
    
    for (let i = 0; i < updatedProducts.length; i++) {
      const product = updatedProducts[i];
      if (product.individualStockTracking) {
        try {
          const { data: individualProducts, error } = await IndividualProductService.getIndividualProductsByProductId(product.id);
          if (individualProducts && !error) {
            const mappedIndividualProducts = individualProducts.map((ip: any) => ({
              id: ip.id,
              qrCode: ip.qr_code,
              productId: ip.product_id,
              productName: ip.product_name,
              color: ip.color,
              pattern: ip.pattern,
              length: ip.length,
              width: ip.width,
              weight: ip.weight,
              finalLength: ip.final_length,
              finalWidth: ip.final_width,
              finalWeight: ip.final_weight,
              qualityGrade: ip.quality_grade,
              status: ip.status,
              location: ip.location,
              productionDate: ip.production_date,
              completionDate: ip.completion_date,
              inspector: ip.inspector,
              notes: ip.notes,
              soldDate: ip.sold_date,
              customerId: ip.customer_id,
              orderId: ip.order_id,
              createdAt: ip.created_at,
              updatedAt: ip.updated_at
            }));
            updatedProducts[i] = { ...product, individual_products: mappedIndividualProducts };
          }
        } catch (error) {
          // Skip if no individual products found
        }
      }
      
      // Calculate and update the product status based on available stock
      const calculatedStatus = calculateProductStatus(updatedProducts[i]);
      updatedProducts[i] = { 
        ...updatedProducts[i], 
        actual_status: calculatedStatus,
        status: calculatedStatus
      };
    }
    
    setProducts(updatedProducts);
  };

  // Check which products have recipes using MongoDB
  const checkProductsWithRecipes = async (products: any[]) => {
    const productsWithRecipesSet = new Set<string>();
    
    // Only check recipes if we have products
    if (!products || products.length === 0) {
      setProductsWithRecipes(productsWithRecipesSet);
      return;
    }
    
    console.log('🔍 Checking recipes for', products.length, 'products using MongoDB...');
    
    for (const product of products) {
      try {
        const { data: recipe, error } = await MongoDBRecipeService.getRecipeByProductId(product.id);
        // Only log if there's an actual error (not a 404, which is expected for products without recipes)
        if (error) {
          // Only log non-404 errors
          if (!error.includes('404') && !error.includes('Not Found')) {
            console.warn(`⚠️ Error checking recipe for product ${product.name}:`, error);
          }
        } else if (recipe && recipe.materials && recipe.materials.length > 0) {
          productsWithRecipesSet.add(product.id);
          console.log('✅ Found MongoDB recipe for product:', product.name);
        }
        // Silently ignore 404s (no recipe found) - this is expected and normal
      } catch (error) {
        // Silently handle recipe errors - don't spam console
        // 404 errors are expected for products without recipes
      }
    }
    
    console.log('🔍 MongoDB Recipe check complete. Products with recipes:', productsWithRecipesSet.size);
    setProductsWithRecipes(productsWithRecipesSet);
  };
  
  // New product form state with essential fields only
  const [newProduct, setNewProduct] = useState({
    name: "",
    category: "",
    subcategory: "",
    color: "",
    pattern: "",
    quantity: "",
    unit: "",
    notes: "",
    weight: "",
    weightUnit: "",
    width: "",
    widthUnit: "",
    length: "",
    lengthUnit: "",
    qualityGrade: "A", // Default quality grade
    manufacturingDate: new Date().toISOString().split('T')[0] // Default to current date
  });

  // Materials section state
  const [rawMaterials, setRawMaterials] = useState<any[]>([]);
  const [availableProducts, setAvailableProducts] = useState<any[]>([]);
  const [productMaterials, setProductMaterials] = useState<ProductMaterial[]>([]);
  const [duplicateProductMaterials, setDuplicateProductMaterials] = useState<ProductMaterial[]>([]);
  const [newMaterial, setNewMaterial] = useState({
    materialId: "",
    materialName: "",
    quantity: "",
    unit: "",
    cost: "",
    selectedQuantity: 0
  });
  const [showAddMaterial, setShowAddMaterial] = useState(false);
  
  // Enhanced material selection state
  const [showMaterialSelector, setShowMaterialSelector] = useState(false);
  const [materialSearchTerm, setMaterialSearchTerm] = useState("");
  const [selectedMaterialType, setSelectedMaterialType] = useState<"all" | "raw_material" | "product">("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedSupplier, setSelectedSupplier] = useState<string>("all");
  
  // Two-step selection state
  const [selectionStep, setSelectionStep] = useState<"type" | "filter">("type");
  const [chosenType, setChosenType] = useState<"product" | "material" | null>(null);
  
  // Product-specific filters
  const [selectedColor, setSelectedColor] = useState<string>("all");
  const [selectedLength, setSelectedLength] = useState<string>("all");
  const [selectedWidth, setSelectedWidth] = useState<string>("all");
  const [selectedWeight, setSelectedWeight] = useState<string>("all");
  
  // Helper functions for enhanced material selection
  const getFilteredMaterials = () => {
    let filtered: any[] = [];
    
    // First filter by chosen type
    if (chosenType === "product") {
      filtered = availableProducts.map(p => ({ ...p, type: 'product' }));
    } else if (chosenType === "material") {
      // Map raw materials to include current_stock field for consistency
      filtered = rawMaterials.map(m => ({ 
        ...m, 
        type: 'material',
        current_stock: m.currentStock || 0 // Map currentStock to current_stock
      }));
    } else {
      // Map both types with consistent field names
      const mappedRawMaterials = rawMaterials.map(m => ({ 
        ...m, 
        type: 'material',
        current_stock: m.currentStock || 0 // Map currentStock to current_stock
      }));
      const mappedProducts = availableProducts.map(p => ({ ...p, type: 'product' }));
      filtered = [...mappedRawMaterials, ...mappedProducts];
    }
    
    // Filter by search term
    if (materialSearchTerm) {
      filtered = filtered.filter(item => 
        item.name.toLowerCase().includes(materialSearchTerm.toLowerCase()) ||
        item.category?.toLowerCase().includes(materialSearchTerm.toLowerCase()) ||
        item.brand?.toLowerCase().includes(materialSearchTerm.toLowerCase())
      );
    }
    
    // Apply type-specific filters
    if (chosenType === "material") {
      // Material-specific filters
      if (selectedCategory !== "all") {
        filtered = filtered.filter(item => item.category === selectedCategory);
      }
      if (selectedSupplier !== "all") {
        filtered = filtered.filter(item => item.supplier_name === selectedSupplier);
      }
    } else if (chosenType === "product") {
      // Product-specific filters
      if (selectedColor !== "all") {
        filtered = filtered.filter(item => item.color === selectedColor);
      }
      if (selectedLength !== "all") {
        filtered = filtered.filter(item => item.length === selectedLength);
      }
      if (selectedWidth !== "all") {
        filtered = filtered.filter(item => item.width === selectedWidth);
      }
      if (selectedWeight !== "all") {
        filtered = filtered.filter(item => item.weight === selectedWeight);
      }
    }
    
    return filtered;
  };
  
  const getUniqueCategories = () => {
    const categories = new Set<string>();
    rawMaterials.forEach(m => m.category && categories.add(m.category));
    availableProducts.forEach(p => p.category && categories.add(p.category));
    return Array.from(categories).sort();
  };
  
  const getUniqueSuppliers = () => {
    const suppliers = new Set<string>();
    rawMaterials.forEach(m => m.supplier_name && suppliers.add(m.supplier_name));
    return Array.from(suppliers).sort();
  };
  
  // Product-specific helper functions
  const getUniqueProductColors = () => {
    const colors = new Set<string>();
    availableProducts.forEach(p => p.color && colors.add(p.color));
    return Array.from(colors).sort();
  };
  
  
  const getUniqueProductLengths = () => {
    const lengths = new Set<string>();
    availableProducts.forEach(p => p.length && lengths.add(p.length));
    return Array.from(lengths).sort();
  };
  
  const getUniqueProductWidths = () => {
    const widths = new Set<string>();
    availableProducts.forEach(p => p.width && widths.add(p.width));
    return Array.from(widths).sort();
  };
  
  const getUniqueProductWeights = () => {
    const weights = new Set<string>();
    availableProducts.forEach(p => p.weight && weights.add(p.weight));
    return Array.from(weights).sort();
  };
  
  // Add new item states
  const [newCategoryInput, setNewCategoryInput] = useState("");
  const [newSubcategoryInput, setNewSubcategoryInput] = useState("");
  const [newColorInput, setNewColorInput] = useState("");
  const [newPatternInput, setNewPatternInput] = useState("");
  const [newUnitInput, setNewUnitInput] = useState("");
  const [newLocationInput, setNewLocationInput] = useState("");
  const [newPileHeightInput, setNewPileHeightInput] = useState("");
  const [newWeightInput, setNewWeightInput] = useState("");
  const [newLengthInput, setNewLengthInput] = useState("");
  const [newWidthInput, setNewWidthInput] = useState("");
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [showAddSubcategory, setShowAddSubcategory] = useState(false);
  const [showAddColor, setShowAddColor] = useState(false);
  const [showAddPattern, setShowAddPattern] = useState(false);
  const [showAddUnit, setShowAddUnit] = useState(false);
  const [showAddLocation, setShowAddLocation] = useState(false);
  const [showAddPileHeight, setShowAddPileHeight] = useState(false);
  const [showAddWeight, setShowAddWeight] = useState(false);
  const [showAddLength, setShowAddLength] = useState(false);
  const [showAddWidth, setShowAddWidth] = useState(false);
  const [materialsApplicable, setMaterialsApplicable] = useState(true);
  const [individualStockTracking, setIndividualStockTracking] = useState(true);
  const [isCreatingProduct, setIsCreatingProduct] = useState(false);

  // Unit options for weight, length, width (loaded from database)
  const [weightUnits, setWeightUnits] = useState<string[]>([]);
  const [lengthUnits, setLengthUnits] = useState<string[]>([]);
  const [widthUnits, setWidthUnits] = useState<string[]>([]);

  // Load dynamic options and raw materials from localStorage
  useEffect(() => {
    const loadDynamicOptions = () => {
      // Load dynamic dropdown options
      // Dropdown options are now loaded from database via loadDropdownOptions()
    };

    const loadRawMaterials = async () => {
      try {
        // Load raw materials from MongoDB
        const { data, error } = await rawMaterialService.getRawMaterials();
        
        if (error) {
          console.error('Error loading raw materials:', error);
          setRawMaterials([]);
        } else {
          console.log('Raw materials from MongoDB:', data);
          
          // Map database fields to UI interface
          const materialsArray = Array.isArray(data) ? data : [data];
          const mappedMaterials = materialsArray.map((item: any) => ({
            id: item.id,
            name: item.name,
            brand: item.type || '',
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
          
          console.log('Mapped raw materials:', mappedMaterials);
          setRawMaterials(mappedMaterials);
        }
      } catch (error) {
        console.error('Error loading raw materials:', error);
        setRawMaterials([]);
      }
    };

    const loadAvailableProducts = async () => {
      try {
        // Load products that can be used as recipe ingredients from MongoDB
        const { data, error } = await MongoDBProductService.getProducts();
        
        if (error) {
          console.error('Error loading products for recipe ingredients:', error);
          setAvailableProducts([]);
          return;
        }
        
        // Map products to include individual product count
        const productsWithIndividualCount = (data || []).map(product => ({
          ...product,
          individual_count: product.individual_products_count || 0
        }));
        
        console.log('✅ Loaded products for recipe ingredients:', productsWithIndividualCount?.length || 0);
        console.log('🔍 Sample product data:', productsWithIndividualCount?.[0]); // Debug: see what fields are available
        setAvailableProducts(productsWithIndividualCount);
      } catch (error) {
        console.error('Error loading products for recipe ingredients:', error);
        setAvailableProducts([]);
      }
    };

    loadDynamicOptions();
    loadRawMaterials();
    loadAvailableProducts();
  }, []);

  // Load notifications and check for low stock on component mount
  useEffect(() => {
    const loadNotifications = async () => {
      try {
        // Load production notifications
        const { data: productionNotifications, error: productionError } = await MongoDBNotificationService.getNotificationsByModule('production');
        if (productionError) {
          console.error('Error loading production notifications:', productionError);
        }
        
        // Load product notifications
        const { data: productNotifications, error: productError } = await MongoDBNotificationService.getNotificationsByModule('products');
        if (productError) {
          console.error('Error loading product notifications:', productError);
        }
        
        // Filter for unread notifications
        const unreadProductionNotifications = productionNotifications?.filter(n => n.status === 'unread') || [];
        const unreadProductNotifications = productNotifications?.filter(n => n.status === 'unread') || [];
    
    // Combine both types of notifications
        const combinedNotifications = [...unreadProductionNotifications, ...unreadProductNotifications];
    
    setNotifications(combinedNotifications);
    console.log('📢 Loaded notifications:', combinedNotifications.length);
        console.log('📢 Production notifications:', unreadProductionNotifications.length);
        console.log('📢 Product notifications:', unreadProductNotifications.length);
      } catch (error) {
        console.error('Error loading notifications:', error);
      }
    };
    
    loadNotifications();
  }, []);

  // Handle notification actions
  const handleMarkAsRead = async (notificationId: string) => {
    try {
      // Update notification status in MongoDB - change status to 'read'
      await MongoDBNotificationService.updateNotification(notificationId, { 
        status: 'read'
      });
    // Update local state
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
      console.log('🗑️ Notification marked as read:', notificationId);
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleResolveNotification = async (notificationId: string) => {
    try {
      // Update notification status in MongoDB to 'dismissed' (resolved)
      await MongoDBNotificationService.updateNotification(notificationId, { 
        status: 'dismissed'
      });
    // Update local state
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
      console.log('🗑️ Notification dismissed:', notificationId);
    } catch (error) {
      console.error('Error resolving notification:', error);
    }
  };

  const handleClearAllNotifications = async () => {
    try {
      // Mark all notifications as dismissed - change status to 'dismissed'
      const notificationPromises = notifications.map(notification => 
        MongoDBNotificationService.updateNotification(notification.id, {
          status: 'dismissed'
        })
      );
      await Promise.all(notificationPromises);
      
    setNotifications([]);
    console.log('🗑️ All notifications cleared');
    } catch (error) {
      console.error('Error clearing all notifications:', error);
    }
  };

  const handleAddToProductionFromNotification = async (notification: any) => {
    if (!notification.relatedData?.productId) return;
    const product = products.find(p => p.id === notification.relatedData.productId);
    if (product) {
      await handleAddToProduction(product);
      handleResolveNotification(notification.id);
    }
  };

  // Generate unique QR code
  const generateQRCode = () => {
    return IDGenerator.generateQRCode();
  };

  // Check if product has individual stock items
  const hasIndividualStock = (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (product && product.individualStockTracking !== undefined) {
      return product.individualStockTracking;
    }
    // Fallback: check if individual products exist in the product data
    return product && product.individual_products && product.individual_products.length > 0;
  };


  // Handle adding new product
  const handleDuplicateProduct = async (product: FrontendProduct) => {
    console.log("Original product being duplicated:", product);
    
    // Set loading state for this specific product
    setIsDuplicatingProduct(product.id);
    
    try {
      // Create a copy of the product with new ID and QR code
      const duplicatedProduct: FrontendProduct = {
        ...product,
        id: await IDGenerator.generateProductId(),
        qrCode: await generateQRCode(),
      };
      
      console.log("Duplicated product:", duplicatedProduct);

      // Load the recipe from the original product
      try {
        const { data: existingRecipe, error } = await MongoDBRecipeService.getRecipeByProductId(product.id);
        if (existingRecipe && existingRecipe.materials) {
          // Convert recipe materials to product materials format
          const recipeMaterials = existingRecipe.materials.map((material: any) => ({
            materialId: material.material_id,
            materialName: material.material_name,
            quantity: material.quantity_per_sqm,
            unit: material.unit,
            cost: material.cost_per_unit || 0
          }));
          setDuplicateProductMaterials(recipeMaterials);
          console.log("✅ Loaded recipe with", recipeMaterials.length, "materials for duplication");
        } else {
          setDuplicateProductMaterials([]);
          console.log("ℹ️ No recipe found for original product");
        }
      } catch (recipeError) {
        console.error("Error loading recipe for duplication:", recipeError);
        setDuplicateProductMaterials([]);
      }
      
      setDuplicateProduct(duplicatedProduct);
      setIsDuplicateProductOpen(true);
    } catch (error) {
      console.error("Error preparing duplicate product:", error);
    } finally {
      // Clear loading state
      setIsDuplicatingProduct(null);
    }
  };

  const handleSaveDuplicateProduct = async () => {
    if (!duplicateProduct) return;
    
    // Validation - required fields
    if (!duplicateProduct.name || !duplicateProduct.category || !duplicateProduct.unit) {
      console.error("Please fill in all required fields: Name, Category, and Unit");
      alert("Please fill in all required fields: Name, Category, and Unit");
      return;
    }

    // Upload image if one was selected (before creating product)
    let finalImageUrl = duplicateProduct.imageUrl || "";
    // Check if imageUrl is a data URL (preview) - means we need to upload
    if (duplicateSelectedImage && duplicateProduct.imageUrl && duplicateProduct.imageUrl.startsWith('data:')) {
      setUploadingImage(true);
      try {
        const uploadResult = await uploadImageToR2(duplicateSelectedImage, 'products');
        if (uploadResult.error) {
          toast({
            title: "Upload Failed",
            description: uploadResult.error,
            variant: "destructive"
          });
          setUploadingImage(false);
          return;
        }
        finalImageUrl = uploadResult.url;
      } catch (error: any) {
        toast({
          title: "Upload Failed",
          description: error.message || "Failed to upload image",
          variant: "destructive"
        });
        setUploadingImage(false);
        return;
      } finally {
        setUploadingImage(false);
      }
    }

    // Recipe is optional - user can add it later when editing the product

    // Set loading state for the original product being duplicated
    const originalProduct = products.find(p => p.name === duplicateProduct.name && p.id !== duplicateProduct.id);
    if (originalProduct) {
      setIsDuplicatingProduct(originalProduct.id);
    }

    try {
      console.log("Creating duplicate product in database:", duplicateProduct);
      
      // Create the duplicate product in the database using MongoDBProductService
      const result = await MongoDBProductService.createProduct({
        name: duplicateProduct.name,
        category: duplicateProduct.category,
        subcategory: duplicateProduct.subcategory || undefined,
        color: duplicateProduct.color,
        pattern: duplicateProduct.pattern,
        unit: duplicateProduct.unit,
        individual_stock_tracking: duplicateProduct.individualStockTracking,
        min_stock_level: 0,
        max_stock_level: 1000,
        base_quantity: duplicateProduct.quantity,
        qr_code: duplicateProduct.qrCode,
        weight: duplicateProduct.weight,
        width: duplicateProduct.width,
        length: duplicateProduct.length,
        length_unit: duplicateProduct.lengthUnit,
        width_unit: duplicateProduct.widthUnit,
        image_url: finalImageUrl
      });

      if (result.error) {
        console.error("Error creating duplicate product:", result.error);
        return;
      }

      console.log("✅ Duplicate product created successfully:", result.data);
      
      // Generate proper QR code with product data after successful creation
      try {
        const qrCodeURL = await QRCodeService.generateMainProductQR(generateMainProductQRData(duplicateProduct));
        if (qrCodeURL) {
          console.log('✅ QR code generated for duplicate product:', duplicateProduct.id);
        } else {
          console.warn('⚠️ Failed to generate QR code for duplicate product:', duplicateProduct.id);
        }
      } catch (qrError) {
        console.warn('⚠️ Error generating QR code for duplicate product:', duplicateProduct.id, qrError);
      }
      
      // Refresh the products list to show the new duplicate
      const updatedResult = await MongoDBProductService.getProducts();
      if (updatedResult.data) {
        const mappedProducts = updatedResult.data.map(mapMongoDBProductToFrontend);
        setProducts(mappedProducts);
      }

      // Generate individual products if quantity > 0 and individual stock tracking is enabled
      if (duplicateProduct.quantity > 0 && duplicateProduct.individualStockTracking) {
        console.log(`Generating ${duplicateProduct.quantity} individual products for ${duplicateProduct.name}`);
        
        // Get current date
        const currentDate = new Date().toISOString().split('T')[0];
        
        // Generate individual products for each quantity
        for (let i = 0; i < duplicateProduct.quantity; i++) {
          try {
            const inspectorName = user?.full_name || '';
            const { error } = await IndividualProductService.createIndividualProducts(duplicateProduct.id, 1, {
              batch_number: `BATCH-${Date.now()}`,
              quality_grade: duplicateProduct.qualityGrade || 'A', // Use product's quality grade or default to A
              inspector: inspectorName, // Use logged-in user name as inspector
              notes: `Item ${i + 1} of ${duplicateProduct.quantity} - Auto-created from product duplication`
            });
            
            if (error) {
              console.error('Error creating individual product:', error);
            } else {
              console.log(`✅ Individual product ${i + 1} created successfully`);
            }
          } catch (err) {
            console.error('Error creating individual product:', err);
          }
        }
        
        console.log(`Generated ${duplicateProduct.quantity} individual products for ${duplicateProduct.name}`);
      }

      // Save recipe if materials were added
      if (duplicateProductMaterials.length > 0) {
        console.log('Saving recipe with materials:', duplicateProductMaterials);

        const mappedMaterials = duplicateProductMaterials.map((material) => {
          // Determine if it's a raw material or product
          const isRawMaterial = rawMaterials.some(rm => rm.id === material.materialId);
          const materialType: 'raw_material' | 'product' = isRawMaterial ? 'raw_material' : 'product';

          return {
            material_id: material.materialId,
            material_name: material.materialName,
            material_type: materialType,
            quantity_per_sqm: parseFloat(material.quantity.toString()),
            unit: material.unit
          };
        });

        try {
          // Create recipe for the duplicate product
          const { error: recipeError } = await MongoDBRecipeService.createRecipe({
            product_id: duplicateProduct.id,
            materials: mappedMaterials
          });

          if (recipeError) {
            console.error('Error creating recipe for duplicate product:', recipeError);
            alert('Product created but failed to save recipe. Please edit the product to add the recipe.');
          } else {
            console.log('✅ Recipe saved successfully for duplicate product:', duplicateProduct.name);
          }
        } catch (err) {
          console.error('Error creating recipe for duplicate product:', err);
        }
      }

      // Reset form and close dialog
      setDuplicateProduct(null);
      setDuplicateProductMaterials([]);
      setIsDuplicateProductOpen(false);
      
      console.log("Product duplicated successfully:", duplicateProduct.name);
    } catch (error) {
      console.error("Error duplicating product:", error);
    } finally {
      // Clear loading state
      setIsDuplicatingProduct(null);
    }
  };

  const handleEditProduct = async (product: FrontendProduct) => {
    setSelectedProduct(product);
    setIsEditProductOpen(true);
    
    // Reset image state when opening edit dialog
    setSelectedImage(null);
    setImagePreview("");
    setImageUrl(product.imageUrl || "");
    
    // Load existing recipe for this product using MongoDB
    try {
      const { data: existingRecipe, error } = await MongoDBRecipeService.getRecipeByProductId(product.id);
      if (existingRecipe && existingRecipe.materials) {
        // Convert recipe materials to product materials format
        const recipeMaterials = existingRecipe.materials.map((material: any) => ({
          materialId: material.material_id,
          materialName: material.material_name,
          quantity: material.quantity_per_sqm,
          unit: material.unit,
          cost: material.cost_per_unit || 0
        }));
        setProductMaterials(recipeMaterials);
        console.log('✅ Loaded existing MongoDB recipe for product:', product.name, recipeMaterials);
      } else {
        // No existing recipe, use product's materialsUsed if available
        if (product.materialsUsed && product.materialsUsed.length > 0) {
          setProductMaterials(product.materialsUsed);
          console.log('ℹ️ Using product materialsUsed for:', product.name);
        } else {
          setProductMaterials([]);
          console.log('ℹ️ No materials found for product:', product.name);
        }
      }
    } catch (error) {
      console.log('ℹ️ No recipe found for product:', product.name, '(this is normal)');
      // Fallback to product's materialsUsed
      if (product.materialsUsed && product.materialsUsed.length > 0) {
        setProductMaterials(product.materialsUsed);
        console.log('ℹ️ Using product materialsUsed as fallback for:', product.name);
      } else {
        setProductMaterials([]);
      }
    }
  };

  const handleSaveEditProduct = async () => {
    if (!selectedProduct) return;
    
    // Validation - required fields
    if (!selectedProduct.name || !selectedProduct.category || !selectedProduct.unit) {
      console.error("Please fill in all required fields: Name, Category, and Unit");
      alert("Please fill in all required fields: Name, Category, and Unit");
      return;
    }

    // Upload new image if one was selected
    let finalImageUrl = selectedProduct.imageUrl || "";
    if (selectedImage) {
      if (imageUrl) {
        // Image already uploaded
        finalImageUrl = imageUrl;
      } else {
        // Upload image now
        setUploadingImage(true);
        try {
          const uploadResult = await uploadImageToR2(selectedImage, 'products');
          if (uploadResult.error) {
            toast({
              title: "Upload Failed",
              description: uploadResult.error,
              variant: "destructive"
            });
            setUploadingImage(false);
            return;
          }
          finalImageUrl = uploadResult.url;
          setImageUrl(uploadResult.url);
        } catch (error: any) {
          toast({
            title: "Upload Failed",
            description: error.message || "Failed to upload image",
            variant: "destructive"
          });
          setUploadingImage(false);
          return;
        } finally {
          setUploadingImage(false);
        }
      }
    }

    try {
      // Update the product in the database
      const { error } = await MongoDBProductService.updateProduct(selectedProduct.id, {
        name: selectedProduct.name,
        category: selectedProduct.category,
        subcategory: selectedProduct.subcategory || undefined,
        color: selectedProduct.color,
        pattern: selectedProduct.pattern,
        unit: selectedProduct.unit,
        weight: selectedProduct.weight,
        width: selectedProduct.width,
        length: selectedProduct.length,
        notes: selectedProduct.notes,
        image_url: finalImageUrl
      });

      if (error) {
        console.error("Error updating product in database:", error);
        alert("Failed to update product in database. Please try again.");
        return;
      }

      // Update or create recipe if materials were modified
      if (productMaterials.length > 0) {
        console.log('Updating recipe with materials:', productMaterials);

         const mappedMaterials = productMaterials.map((material) => {
           // Determine if it's a raw material or product
           const isRawMaterial = rawMaterials.some(rm => rm.id === material.materialId);
           const materialType: 'raw_material' | 'product' = isRawMaterial ? 'raw_material' : 'product';

           return {
             material_id: material.materialId,
             material_name: material.materialName,
             material_type: materialType,
             quantity_per_sqm: parseFloat(material.quantity.toString()),
             unit: material.unit
           };
         });

        // Check if recipe exists
        const { data: existingRecipe } = await MongoDBRecipeService.getRecipeByProductId(selectedProduct.id);

        if (existingRecipe) {
          // Update existing recipe
          const { error: recipeError } = await MongoDBRecipeService.updateRecipe(existingRecipe.id, {
            materials: mappedMaterials
          });

          if (recipeError) {
            console.error('Error updating recipe:', recipeError);
            alert('Product updated but failed to update recipe. Please try again.');
          } else {
            console.log('✅ Recipe updated successfully for product:', selectedProduct.name);
          }
        } else {
          // Create new recipe
          const { error: recipeError } = await MongoDBRecipeService.createRecipe({
            product_id: selectedProduct.id,
            materials: mappedMaterials
          });

          if (recipeError) {
            console.error('Error creating recipe:', recipeError);
            alert('Product updated but failed to create recipe. Please try again.');
          } else {
            console.log('✅ Recipe created successfully for product:', selectedProduct.name);
          }
        }
      } else {
        // If no materials, delete the recipe if it exists
        const { data: existingRecipe } = await MongoDBRecipeService.getRecipeByProductId(selectedProduct.id);
        if (existingRecipe) {
          await MongoDBRecipeService.deleteRecipe(existingRecipe.id);
          console.log('Recipe deleted for product:', selectedProduct.name);
        }
      }

      // Update the product in the local products array
      const updatedProducts = products.map(p => 
        p.id === selectedProduct.id ? selectedProduct : p
      );
      setProducts(updatedProducts);
      
      // Refresh recipe status for this product
      if (productMaterials.length > 0) {
        const updatedSet = new Set(productsWithRecipes);
        updatedSet.add(selectedProduct.id);
        setProductsWithRecipes(updatedSet);
      } else {
        const updatedSet = new Set(productsWithRecipes);
        updatedSet.delete(selectedProduct.id);
        setProductsWithRecipes(updatedSet);
      }

      // Reset form and close dialog
      setSelectedProduct(null);
      setProductMaterials([]);
      setIsEditProductOpen(false);

      console.log("✅ Product updated successfully:", selectedProduct.name);
      alert("Product updated successfully!");
    } catch (error) {
      console.error("Error updating product:", error);
      alert("An error occurred while updating the product. Please try again.");
    }
  };

  // SQM Calculation function
  const calculateSQM = (length: string, width: string, lengthUnit: string, widthUnit: string): number => {
    const lengthValue = parseFloat(length) || 0;
    const widthValue = parseFloat(width) || 0;
    
    // Convert to meters for consistent calculation
    let lengthInMeters = lengthValue;
    let widthInMeters = widthValue;
    
    // Convert length to meters
    switch (lengthUnit.toLowerCase()) {
      case 'mm': lengthInMeters = lengthValue / 1000; break;
      case 'cm': lengthInMeters = lengthValue / 100; break;
      case 'feet': lengthInMeters = lengthValue * 0.3048; break;
      case 'inches': lengthInMeters = lengthValue * 0.0254; break;
      case 'yards': lengthInMeters = lengthValue * 0.9144; break;
      case 'm': case 'meter': case 'meters': lengthInMeters = lengthValue; break;
    }
    
    // Convert width to meters
    switch (widthUnit.toLowerCase()) {
      case 'mm': widthInMeters = widthValue / 1000; break;
      case 'cm': widthInMeters = widthValue / 100; break;
      case 'feet': widthInMeters = widthValue * 0.3048; break;
      case 'inches': widthInMeters = widthValue * 0.0254; break;
      case 'yards': widthInMeters = widthValue * 0.9144; break;
      case 'm': case 'meter': case 'meters': widthInMeters = widthValue; break;
    }
    
    return lengthInMeters * widthInMeters;
  };

  // Helper function to show conversion
  const getConversionDisplay = (value: string, unit: string): string => {
    const numValue = parseFloat(value) || 0;
    const unitLower = unit.toLowerCase();
    
    if (unitLower === 'feet') {
      const meters = numValue * 0.3048;
      return `(${meters.toFixed(2)}m)`;
    } else if (unitLower === 'm' || unitLower === 'meter' || unitLower === 'meters') {
      const feet = numValue / 0.3048;
      return `(${feet.toFixed(2)}ft)`;
    }
    return '';
  };

  // Auto-calculate recipe ratio for products using actual units
  const calculateProductRatio = (sourceProduct: any, targetProduct: any): number => {
    // Use the actual units from the product data (no hardcoded defaults)
    const sourceLengthUnit = (sourceProduct as any).length_unit || sourceProduct.lengthUnit || '';
    const sourceWidthUnit = (sourceProduct as any).width_unit || sourceProduct.widthUnit || '';
    const targetLengthUnit = targetProduct.lengthUnit || '';
    const targetWidthUnit = targetProduct.widthUnit || '';
    
    // If units are missing, return 0 (can't calculate ratio)
    if (!sourceLengthUnit || !sourceWidthUnit || !targetLengthUnit || !targetWidthUnit) {
      return 0;
    }
    
    const sourceSQM = calculateSQM(sourceProduct.length, sourceProduct.width, sourceLengthUnit, sourceWidthUnit);
    const targetSQM = calculateSQM(targetProduct.length, targetProduct.width, targetLengthUnit, targetWidthUnit);
    
    // Calculate how many units of source product are needed for 1 SQM of target product
    // Formula: 1 / sourceSQM (units of source per 1 SQM of target)
    const unitsPerSQM = sourceSQM > 0 ? 1 / sourceSQM : 0;
    
    console.log(`🔄 Ratio calculation for 1 SQM: Source product (${sourceProduct.length} ${sourceLengthUnit} × ${sourceProduct.width} ${sourceWidthUnit} = ${sourceSQM.toFixed(4)} SQM per unit) → ${unitsPerSQM.toFixed(4)} units needed per 1 SQM of target product`);
    
    if (sourceSQM === 0) return 0;
    return unitsPerSQM;
  };

  const handleAddProduct = async () => {
    // Set loading state
    setIsCreatingProduct(true);

    // Upload image if one was selected (before creating product)
    let finalImageUrl = imageUrl || "";
    if (selectedImage && !imageUrl) {
      setUploadingImage(true);
      try {
        const uploadResult = await uploadImageToR2(selectedImage, 'products');
        if (uploadResult.error) {
          toast({
            title: "Upload Failed",
            description: uploadResult.error,
            variant: "destructive"
          });
          setUploadingImage(false);
          setIsCreatingProduct(false);
          return;
        }
        finalImageUrl = uploadResult.url;
        setImageUrl(uploadResult.url);
      } catch (error: any) {
        toast({
          title: "Upload Failed",
          description: error.message || "Failed to upload image",
          variant: "destructive"
        });
        setUploadingImage(false);
        setIsCreatingProduct(false);
        return;
      } finally {
        setUploadingImage(false);
      }
    }

    // Validation - required fields
    if (!newProduct.name || !newProduct.category || !newProduct.quantity || !newProduct.unit) {
      console.error("Please fill in all required fields: Name, Category, Quantity (SQM), and Unit");
      setIsCreatingProduct(false);
      return;
    }
    
    // Validation - length and width are compulsory for SQM calculation
    if (!newProduct.length || !newProduct.width) {
      console.error("Length and Width are required for SQM calculation");
      alert("Length and Width are required! These dimensions are needed to calculate the recipe based on 1 SQM of the product.");
      setIsCreatingProduct(false);
      return;
    }

    // Use the units exactly as selected from dropdown (trim whitespace)
    const lengthUnit = newProduct.lengthUnit ? newProduct.lengthUnit.trim() : '';
    const widthUnit = newProduct.widthUnit ? newProduct.widthUnit.trim() : '';
    
    if (!lengthUnit || !widthUnit) {
      console.error("Length unit and Width unit are required");
      alert("Length unit and Width unit are required! Please select units from the dropdown.");
      setIsCreatingProduct(false);
      return;
    }

    // Ensure the selected units exist in length_unit and width_unit categories (singular, for backend validation)
    // Backend checks against 'length_unit' (singular) category, not 'length_units' (plural)
    try {
      const lengthUnitsCheck = await DropdownService.getOptionsByCategory('length_unit');
      const lengthUnitExists = lengthUnitsCheck && lengthUnitsCheck.some((u: any) => u.value === lengthUnit);
      
      if (!lengthUnitExists) {
        console.log(`⚠️ Unit "${lengthUnit}" not found in length_unit category, adding it...`);
        const addResult = await DropdownService.addOption('length_unit', lengthUnit);
        if (!addResult.success) {
          console.error(`❌ Failed to add unit "${lengthUnit}" to length_unit category:`, addResult.error);
          alert(`Failed to add unit "${lengthUnit}" to the database. Please add it manually from the Dropdown Master page first.`);
          setIsCreatingProduct(false);
          return;
        }
        console.log(`✅ Successfully added unit "${lengthUnit}" to length_unit category`);
      }
      
      const widthUnitsCheck = await DropdownService.getOptionsByCategory('width_unit');
      const widthUnitExists = widthUnitsCheck && widthUnitsCheck.some((u: any) => u.value === widthUnit);
      
      if (!widthUnitExists) {
        console.log(`⚠️ Unit "${widthUnit}" not found in width_unit category, adding it...`);
        const addResult = await DropdownService.addOption('width_unit', widthUnit);
        if (!addResult.success) {
          console.error(`❌ Failed to add unit "${widthUnit}" to width_unit category:`, addResult.error);
          alert(`Failed to add unit "${widthUnit}" to the database. Please add it manually from the Dropdown Master page first.`);
          setIsCreatingProduct(false);
          return;
        }
        console.log(`✅ Successfully added unit "${widthUnit}" to width_unit category`);
      }
    } catch (error) {
      console.error('Error ensuring units exist in backend categories:', error);
      alert("Error validating units. Please try again.");
      setIsCreatingProduct(false);
      return;
    }

    // Calculate SQM for this product using the selected units
    // Note: calculateSQM handles unit conversion, so we pass the units as-is
    const productSQM = calculateSQM(newProduct.length, newProduct.width, lengthUnit, widthUnit);
    console.log(`📐 Product SQM calculated: ${productSQM.toFixed(4)} SQM`);
    
    // Show SQM calculation to user with selected units
    if (productSQM > 0) {
      console.log(`📊 Product dimensions: ${newProduct.length} ${lengthUnit} × ${newProduct.width} ${widthUnit} = ${productSQM.toFixed(4)} SQM`);
    }
    
    // Recipe is optional - user can add it later when editing the product

    let productId: string; // Declare productId at function scope

    try {
      const generatedProductId = await IDGenerator.generateProductId();
      
      // Material costs are tracked individually, no total product cost needed

      // Create the product object with essential fields only
      // Use normalized units (lowercase) to ensure backend compatibility
      const product: FrontendProduct = {
        id: generatedProductId,
        qrCode: await generateQRCode(),
        name: newProduct.name,
        category: newProduct.category,
        color: newProduct.color || "",
        pattern: newProduct.pattern || "",
        quantity: parseInt(newProduct.quantity),
        unit: newProduct.unit,
        materialsUsed: productMaterials,
        status: "in-stock",
        notes: newProduct.notes || "",
        imageUrl: finalImageUrl || "",
        weight: newProduct.weight || "NA",
        weightUnit: newProduct.weightUnit,
        width: newProduct.width || "NA",
        widthUnit: widthUnit, // Use unit exactly as selected from dropdown
        length: newProduct.length || "NA",
        lengthUnit: lengthUnit, // Use unit exactly as selected from dropdown
        manufacturingDate: newProduct.manufacturingDate || new Date().toISOString().split('T')[0],
        individualStockTracking: individualStockTracking,
        baseQuantity: parseInt(newProduct.quantity),
        minStockLevel: 10,
        maxStockLevel: 1000,
        hasRecipe: false,
        individualProductsCount: 0,
        actual_quantity: parseInt(newProduct.quantity),
        actual_status: "in-stock",
        individual_products: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Save to MongoDB
      try {
        console.log('🔍 Creating product with units:', {
          length: product.length,
          lengthUnit: product.lengthUnit,
          width: product.width,
          widthUnit: product.widthUnit
        });
        
        const mongoProductData = mapFrontendProductToMongoDB({
          ...product,
          baseQuantity: product.individualStockTracking ? 0 : product.quantity,
          minStockLevel: 10,
          maxStockLevel: 1000,
          lengthUnit: lengthUnit, // Use unit exactly as selected (will match database)
          widthUnit: widthUnit    // Use unit exactly as selected (will match database)
        });
        
        console.log('🔍 MongoDB product data being sent:', {
          length: mongoProductData.length,
          length_unit: mongoProductData.length_unit,
          width: mongoProductData.width,
          width_unit: mongoProductData.width_unit
        });
        
        const { data: createdProduct, error } = await MongoDBProductService.createProduct(mongoProductData);
        
        if (error) {
          console.error("Error creating product:", error);
          alert("Failed to create product. Please try again.");
          return;
        }

        productId = createdProduct?.id!; // Assign the database-returned ID
        if (!productId) {
          console.error("Product created but no ID returned");
          alert("Failed to get product ID. Please try again.");
          return;
        }
        
        // Generate proper QR code with product data after successful creation
        try {
          const qrCodeURL = await QRCodeService.generateMainProductQR(generateMainProductQRData(products.find(p => p.id === productId)!));
          if (qrCodeURL) {
            console.log('✅ QR code generated for main product:', productId);
          } else {
            console.warn('⚠️ Failed to generate QR code for main product:', productId);
          }
        } catch (qrError) {
          console.warn('⚠️ Error generating QR code for main product:', productId, qrError);
        }

        // Verify the product exists in MongoDB before creating individual products
        console.log(`🔍 Verifying product ${productId} exists in MongoDB...`);

        // Retry verification with exponential backoff
        let verifyProduct = null;
        let verificationAttempts = 0;
        const maxVerificationAttempts = 5;

        while (!verifyProduct && verificationAttempts < maxVerificationAttempts) {
          verificationAttempts++;
          console.log(`Verification attempt ${verificationAttempts}/${maxVerificationAttempts}...`);

          const { data, error } = await MongoDBProductService.getProductById(productId);

          if (!error && data) {
            verifyProduct = data;
            break;
          }

          if (verificationAttempts < maxVerificationAttempts) {
            // Wait with exponential backoff (100ms, 200ms, 400ms, 800ms)
            const delay = 100 * Math.pow(2, verificationAttempts - 1);
            console.log(`Product not found yet, waiting ${delay}ms before retry...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }

        if (!verifyProduct) {
          console.error("Product verification failed after multiple attempts");
          alert("Failed to verify product creation. Please try again.");
          return;
        }

        console.log(`✅ Product verified: ${verifyProduct.name} (${verifyProduct.id})`);

        // Add additional delay to ensure database consistency
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Reload products from MongoDB (initial reload - will be updated again after individual products are created)
        const result = await MongoDBProductService.getProducts();
        if (result.error) {
          console.error("Error reloading products:", result.error);
        } else {
          const mappedProducts = (result.data || []).map(mapMongoDBProductToFrontend);
          setProducts(mappedProducts);
          // Load individual products for immediate feedback (will be reloaded again after individual products are created)
          await loadIndividualProductsForAllProducts(mappedProducts);
        }
      } catch (error) {
        console.error("Error saving product:", error);
        alert("Failed to save product. Please try again.");
        return;
      }

      // Create individual stock items only if individual tracking is enabled
      if (individualStockTracking) {
      // Final verification that the product still exists just before creating individual products
      console.log(`🔍 Final verification that product ${productId} exists before creating individual products...`);
        const { data: finalVerifyProduct, error: finalVerifyError } = await MongoDBProductService.getProductById(productId);

      if (finalVerifyError || !finalVerifyProduct) {
        console.error("Final product verification failed:", finalVerifyError);
        alert(`Product ${productId} not found in database. Individual products cannot be created.`);
        return;
      }

      console.log(`✅ Final verification successful: ${finalVerifyProduct.name} (${finalVerifyProduct.id})`);

        // Create individual products using the bulk API
        try {
          console.log(`🔄 Creating ${product.quantity} individual products for product ${productId}...`);
          
          // Get logged-in user name for inspector
          const inspectorName = user?.full_name || '';
          
          const { data: createdIndividualProducts, error } = await IndividualProductService.createIndividualProducts(
            productId, 
            product.quantity, 
            {
              batch_number: `BATCH-${Date.now()}`,
              quality_grade: newProduct.qualityGrade, // Use selected quality grade
              inspector: inspectorName, // Use logged-in user name as inspector
              notes: `Auto-created ${product.quantity} individual products for ${product.name}`
            }
          );

            if (error) {
            console.error('❌ Error creating individual products:', error);
            alert(`Product "${product.name}" created successfully, but individual products failed: ${error}`);
                } else {
            console.log('✅ Successfully created individual products:', createdIndividualProducts);
            console.log(`✅ Created ${createdIndividualProducts.created_count} individual products for product "${product.name}"`);
          }
        } catch (err) {
          console.error('❌ Error creating individual products:', err);
          alert(`Product "${product.name}" created successfully, but individual products failed: ${err.message}`);
        }
      }

      // Save recipe if materials were added - USING MONGODB
      if (productMaterials.length > 0) {
        console.log('Product materials before creating recipe:', productMaterials);
        
        const mappedMaterials = productMaterials.map((material) => {
          // Determine if it's a raw material or product
          const isRawMaterial = rawMaterials.some(rm => rm.id === material.materialId);
          const materialType = isRawMaterial ? 'raw_material' : 'product';
          
          return {
            material_id: material.materialId,
            material_name: material.materialName,
            material_type: materialType as 'raw_material' | 'product',
            quantity_per_sqm: parseFloat(material.quantity.toString()),
            unit: material.unit
          };
        });
        
        console.log('Mapped materials for MongoDB recipe:', mappedMaterials);
        
        try {
          // Use MongoDB RecipeService instead of Supabase
          const { data: recipe, error: recipeError } = await MongoDBRecipeService.createRecipe({
            product_id: productId,
            materials: mappedMaterials,
            created_by: 'admin'
          });
          
          if (recipeError) {
            console.error('❌ Error saving recipe to MongoDB:', recipeError);
          } else {
            console.log('✅ Recipe saved to MongoDB for product:', product.name, recipe);
          }
        } catch (error) {
          console.error('❌ Error saving recipe for product:', product.name, error);
          // Don't fail the entire product creation if recipe saving fails
        }
      }

      // Reload all products from database to get updated quantities (including individual products count)
      console.log('🔄 Reloading products from database to get updated quantities...');
      try {
        const result = await MongoDBProductService.getProducts();
        if (result.error) {
          console.error("Error reloading products:", result.error);
        } else {
          const mappedProducts = (result.data || []).map(mapMongoDBProductToFrontend);
          setProducts(mappedProducts);
          
          // Load individual products for all products (including the newly created one)
          await loadIndividualProductsForAllProducts(mappedProducts);
          
          // Check which products have recipes
          await checkProductsWithRecipes(result.data || []);
          
          console.log('✅ Products reloaded with updated quantities');
        }
      } catch (error) {
        console.error("Error reloading products:", error);
      }

      // Reset form
      setNewProduct({
        name: "",
        category: "",
        subcategory: "",
        color: "",
        pattern: "",
        quantity: "",
        unit: "",
        notes: "",
        weight: "",
        weightUnit: "GSM",
        width: "",
        widthUnit: "",
        length: "",
        lengthUnit: "",
        qualityGrade: "A", // Reset to default
        manufacturingDate: new Date().toISOString().split('T')[0]
      });
      setProductMaterials([]);
      setNewMaterial({
        materialId: "",
        materialName: "",
        quantity: "",
        unit: "",
        cost: "",
        selectedQuantity: 0
      });
      setImagePreview("");
      setSelectedImage(null);
      setImageUrl("");
      setMaterialsApplicable(true); // Reset to default
      setIndividualStockTracking(true); // Reset to default
      setIsAddProductOpen(false);

      // Update recipe status if materials were added
      if (productMaterials.length > 0) {
        const updatedSet = new Set(productsWithRecipes);
        updatedSet.add(productId);
        setProductsWithRecipes(updatedSet);
      }

      const successMessage = individualStockTracking
        ? `Product "${product.name}" added successfully!\n${product.quantity} individual stock items created with unique QR codes.`
        : `Product "${product.name}" added successfully!\nBulk quantity: ${product.quantity} products (no individual QR codes).`;
      
      console.log(successMessage);
      
    } catch (error) {
      console.error('Error adding product:', error);
      console.error('Error adding product. Please try again.');
    } finally {
      // Reset loading state
      setIsCreatingProduct(false);
    }
  };

  // Functions to add new options to dropdowns
  const addNewCategory = async () => {
    if (newCategoryInput.trim()) {
      const result = await DropdownService.addOption('category', newCategoryInput.trim());
      if (result.success) {
        // Reload dropdown options to include the new category
        await loadDropdownOptions();
      setNewProduct({...newProduct, category: newCategoryInput.trim()});
      setNewCategoryInput("");
      setShowAddCategory(false);
      }
    }
  };

  const addNewSubcategory = async () => {
    if (newSubcategoryInput.trim()) {
      const result = await DropdownService.addOption('subcategory', newSubcategoryInput.trim());
      if (result.success) {
        // Reload dropdown options to include the new subcategory
        await loadDropdownOptions();
        setNewProduct({...newProduct, subcategory: newSubcategoryInput.trim()});
        setNewSubcategoryInput("");
        setShowAddSubcategory(false);
      }
    }
  };

  const addNewColor = async () => {
    if (newColorInput.trim()) {
      const result = await DropdownService.addOption('color', newColorInput.trim());
      if (result.success) {
        await loadDropdownOptions();
      setNewProduct({...newProduct, color: newColorInput.trim()});
      setNewColorInput("");
      setColorSearchTerm(""); // Clear search term when new color is added
      setShowAddColor(false);
    }
    }
  };


  const addNewPattern = async () => {
    if (newPatternInput.trim()) {
      const result = await DropdownService.addOption('pattern', newPatternInput.trim());
      if (result.success) {
        await loadDropdownOptions();
      setNewProduct({...newProduct, pattern: newPatternInput.trim()});
      setNewPatternInput("");
      setShowAddPattern(false);
      }
    }
  };

  const addNewUnit = async () => {
    if (newUnitInput.trim()) {
      const result = await DropdownService.addOption('unit', newUnitInput.trim());
      if (result.success) {
        await loadDropdownOptions();
      setNewProduct({...newProduct, unit: newUnitInput.trim()});
      setNewUnitInput("");
      setShowAddUnit(false);
    }
    }
  };

  // Location function removed - locations are only for individual products



  const addNewWeight = async () => {
    if (newWeightInput.trim() && newProduct.weightUnit) {
      // Unit is required - store as combined value
      const combinedValue = `${newWeightInput.trim()} ${newProduct.weightUnit.trim()}`;
      
      // If unit is new, save it to database
      if (!weightUnits.includes(newProduct.weightUnit)) {
        await addNewUnitToDatabase('weight', newProduct.weightUnit);
        await loadDropdownOptions();
      }
      
      // Store combined value in dropdown (e.g., "600 GSM")
      const result = await DropdownService.addOption('weight', combinedValue);
      if (result.success) {
        await loadDropdownOptions();
        // Set value and unit separately in the form
        setNewProduct({
          ...newProduct,
          weight: newWeightInput.trim(),
          weightUnit: newProduct.weightUnit
        });
        setNewWeightInput("");
        setShowAddWeight(false);
      }
    } else {
      toast({
        title: "Validation Error",
        description: "Please enter a weight value and select a unit",
        variant: "destructive",
      });
    }
  };

  // Handle adding new unit from dialog
  const handleAddNewUnit = async () => {
    if (!newUnitNameInput.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a unit name",
        variant: "destructive",
      });
      return;
    }

    const unitValue = newUnitNameInput.trim();
    
    // Set the unit in the product state based on type
    if (currentUnitType === 'weight') {
      setNewProduct({...newProduct, weightUnit: unitValue});
    } else if (currentUnitType === 'length') {
      setNewProduct({...newProduct, lengthUnit: unitValue});
    } else if (currentUnitType === 'width') {
      setNewProduct({...newProduct, widthUnit: unitValue});
    }

    // Save to database (for length and width, this saves to both plural and singular categories)
    await addNewUnitToDatabase(currentUnitType, unitValue);
    
    // Reload unit options to show the new unit
    await loadUnitOptions();
    
    // Close dialog and reset
    setIsAddUnitDialogOpen(false);
    setNewUnitNameInput("");
    
    toast({
      title: "Success",
      description: `Unit "${unitValue}" added successfully`,
    });
  };

  // Add new unit to database using MongoDB
  const addNewUnitToDatabase = async (unitType: string, unitValue: string) => {
    try {
      // For length and width, save to both plural (for frontend dropdowns) and singular (for backend validation)
      if (unitType === 'length' || unitType === 'width') {
        // Save to plural category (for frontend dropdown)
        const resultPlural = await DropdownService.addOption(`${unitType}_units`, unitValue);
        // Save to singular category (for backend validation - backend checks 'length_unit' not 'length_units')
        const resultSingular = await DropdownService.addOption(`${unitType}_unit`, unitValue);
        
        if (resultPlural.success || resultSingular.success) {
          console.log(`✅ Added new ${unitType} unit: ${unitValue} (to both ${unitType}_units and ${unitType}_unit categories)`);
          await loadUnitOptions();
          return true;
        } else {
          console.error(`Error adding new ${unitType} unit:`, resultPlural.error || resultSingular.error);
          return false;
        }
      } else {
        // For other units (weight), just save to plural category
        const result = await DropdownService.addOption(`${unitType}_units`, unitValue);
        if (result.success) {
          console.log(`✅ Added new ${unitType} unit: ${unitValue}`);
          await loadUnitOptions();
          return true;
        } else {
          console.error(`Error adding new ${unitType} unit:`, result.error);
          return false;
        }
      }
    } catch (error) {
      console.error(`Error adding new ${unitType} unit:`, error);
      return false;
    }
  };

  const addNewLength = async () => {
    if (newLengthInput.trim() && newProduct.lengthUnit) {
      // Unit is required - store as combined value
      const combinedValue = `${newLengthInput.trim()} ${newProduct.lengthUnit.trim()}`;
      
      // If unit is new, save it to database
      if (!lengthUnits.includes(newProduct.lengthUnit)) {
        await addNewUnitToDatabase('length', newProduct.lengthUnit);
        await loadDropdownOptions();
      }
      
      // Store combined value in dropdown (e.g., "5 m")
      console.log('🔍 Adding length:', { combinedValue, length: newLengthInput.trim(), unit: newProduct.lengthUnit });
      const result = await DropdownService.addOption('length', combinedValue);
      if (result.success) {
        await loadDropdownOptions();
        // Set value and unit separately in the form - use the exact combined value format
        setNewProduct({
          ...newProduct,
          length: newLengthInput.trim(),
          lengthUnit: newProduct.lengthUnit.trim() // Ensure unit is trimmed
        });
        setNewLengthInput("");
        setShowAddLength(false);
        console.log('✅ Length added successfully:', { length: newLengthInput.trim(), unit: newProduct.lengthUnit.trim() });
      } else {
        console.error('❌ Failed to add length:', result.error);
      }
    } else {
      toast({
        title: "Validation Error",
        description: "Please enter a length value and select a unit",
        variant: "destructive",
      });
    }
  };

  const addNewWidth = async () => {
    if (newWidthInput.trim() && newProduct.widthUnit) {
      // Unit is required - store as combined value
      const combinedValue = `${newWidthInput.trim()} ${newProduct.widthUnit.trim()}`;
      
      // If unit is new, save it to database
      if (!widthUnits.includes(newProduct.widthUnit)) {
        await addNewUnitToDatabase('width', newProduct.widthUnit);
        await loadDropdownOptions();
      }
      
      // Store combined value in dropdown (e.g., "10 m")
      console.log('🔍 Adding width:', { combinedValue, width: newWidthInput.trim(), unit: newProduct.widthUnit });
      const result = await DropdownService.addOption('width', combinedValue);
      if (result.success) {
        await loadDropdownOptions();
        // Set value and unit separately in the form - use the exact combined value format
        setNewProduct({
          ...newProduct,
          width: newWidthInput.trim(),
          widthUnit: newProduct.widthUnit.trim() // Ensure unit is trimmed
        });
        setNewWidthInput("");
        setShowAddWidth(false);
        console.log('✅ Width added successfully:', { width: newWidthInput.trim(), unit: newProduct.widthUnit.trim() });
      } else {
        console.error('❌ Failed to add width:', result.error);
      }
    } else {
      toast({
        title: "Validation Error",
        description: "Please enter a width value and select a unit",
        variant: "destructive",
      });
    }
  };

  // Helper function to parse value with unit (e.g., "3 M" -> { value: "3", unit: "M" })
  const parseValueWithUnit = (combinedValue: string): { value: string; unit: string } => {
    if (!combinedValue || combinedValue === "N/A" || combinedValue === "add_new") {
      return { value: "", unit: "" };
    }
    
    // Match patterns like "3 M", "4 mm", "400 GSM", "3.5 m", etc.
    const match = combinedValue.match(/^([\d.]+)\s*(.+)$/);
    if (match) {
      return {
        value: match[1].trim(),
        unit: match[2].trim()
      };
    }
    
    // If no match, return as is (for backward compatibility)
    return { value: combinedValue, unit: "" };
  };

  // Helper function to find and delete dropdown option by category and value
  const deleteDropdownOption = async (category: string, value: string, resetField?: string) => {
    try {
      // Find the option in the appropriate category
      let option: DropdownOption | undefined;
      
      switch (category) {
        case 'category':
          option = dropdownOptions.categories.find(opt => opt.value === value);
          break;
        case 'color':
          option = dropdownOptions.colors.find(opt => opt.value === value);
          break;
        case 'pattern':
          option = dropdownOptions.patterns.find(opt => opt.value === value);
          break;
        case 'unit':
          option = dropdownOptions.units.find(opt => opt.value === value);
          break;
        case 'weight':
          option = dropdownOptions.weights.find(opt => opt.value === value);
          break;
        case 'length':
          option = dropdownOptions.lengths.find(opt => opt.value === value);
          break;
        case 'width':
          option = dropdownOptions.widths.find(opt => opt.value === value);
          break;
        case 'subcategory':
          option = dropdownOptions.subcategories.find(opt => opt.value === value);
          break;
        default:
          // Try to find in all categories
          const allOptions = [
            ...dropdownOptions.categories,
            ...dropdownOptions.subcategories,
            ...dropdownOptions.colors,
            ...dropdownOptions.patterns,
            ...dropdownOptions.units,
            ...dropdownOptions.weights,
            ...dropdownOptions.lengths,
            ...dropdownOptions.widths
          ];
          option = allOptions.find(opt => opt.category === category && opt.value === value);
      }

      if (!option) {
        toast({
          title: "Error",
          description: `Option "${value}" not found in ${category}`,
          variant: "destructive",
        });
        return;
      }

      // Delete using the option ID
      const result = await DropdownService.deleteOption(option.id);
      if (result.success) {
        await loadDropdownOptions();
        // Reset field if provided
        if (resetField && newProduct[resetField as keyof typeof newProduct] === value) {
          setNewProduct({...newProduct, [resetField]: ""});
        }
        toast({
          title: "Success",
          description: `"${value}" deleted successfully`,
        });
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to delete option",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error deleting dropdown option:', error);
      toast({
        title: "Error",
        description: "Failed to delete option",
        variant: "destructive",
      });
    }
  };

  // Delete functions for dropdown options
  const deleteSubcategory = async (subcategory: string) => {
    await deleteDropdownOption('subcategory', subcategory, 'subcategory');
  };

  const deleteCategory = async (category: string) => {
    await deleteDropdownOption('category', category, 'category');
  };

  const deleteColor = async (color: string) => {
    await deleteDropdownOption('color', color, 'color');
  };

  const deletePattern = async (pattern: string) => {
    await deleteDropdownOption('pattern', pattern, 'pattern');
  };

  const deleteUnit = async (unit: string) => {
    await deleteDropdownOption('unit', unit, 'unit');
  };

  const deleteWeight = async (weight: string) => {
    await deleteDropdownOption('weight', weight, 'weight');
  };


  const deleteLength = async (length: string) => {
    await deleteDropdownOption('length', length, 'length');
  };

  const deleteWidth = async (width: string) => {
    await deleteDropdownOption('width', width, 'width');
  };

  // Handle image selection (only stores file and creates preview, does NOT upload)
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    console.log('Image selected, file:', file);
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid File",
          description: "Please select a valid image file",
          variant: "destructive"
        });
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: "Image size should be less than 5MB",
          variant: "destructive"
        });
        return;
      }
      
      // Store file for later upload
      setSelectedImage(file);
      
      // Create preview (data URL for display)
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        console.log('Image preview generated');
        setImagePreview(result);
      };
      reader.readAsDataURL(file);
      
      // Clear any previous uploaded URL (will be set when user clicks save)
      setImageUrl("");
    }
  };

  // Remove image
  const removeImage = async () => {
    // Delete from R2 if URL exists
    if (imageUrl) {
      try {
        await deleteImageFromR2(imageUrl);
        console.log('✅ Image deleted from R2');
      } catch (error) {
        console.error('Error deleting image from R2:', error);
        // Continue with removal even if delete fails
      }
    }
    setSelectedImage(null);
    setImagePreview("");
    setImageUrl("");
  };

  // Material handling functions
  const handleMaterialSelection = (materialId: string) => {
    if (materialId === "add_new") {
      // Navigate to materials page to add new material
      navigate('/materials');
      return;
    }
    
    console.log('Material selection changed:', { materialId, availableMaterials: rawMaterials.length, availableProducts: availableProducts.length });
    
    // Check if it's a raw material
    let selectedMaterial = rawMaterials.find(m => m.id === materialId);
    let isProduct = false;
    
    // If not found in raw materials, check if it's a product
    if (!selectedMaterial) {
      selectedMaterial = availableProducts.find(p => p.id === materialId);
      isProduct = true;
    }
    
    if (selectedMaterial) {
      console.log('Selected material found:', selectedMaterial);
      setNewMaterial({
        materialId: selectedMaterial.id,
        materialName: selectedMaterial.name, // Auto-fill from raw material inventory
        quantity: "",
        unit: selectedMaterial.unit || "",
        cost: selectedMaterial.costPerUnit?.toString() || "",
        selectedQuantity: 0
      });
    } else {
      console.error('Selected material not found for ID:', materialId);
      console.error('Available materials:', rawMaterials.map(m => ({ id: m.id, name: m.name })));
    }
  };

  // Enhanced material selection handler with auto-ratio calculation
  const handleEnhancedMaterialSelection = (material: any) => {
    let autoCalculatedQuantity = "";
    
    // Only auto-calculate for PRODUCTS (not raw materials)
    // Use the type field from getFilteredMaterials() which sets type: 'product' or type: 'material'
    const isProduct = material.type === 'product';
    
    if (isProduct) {
      // This is a product - auto-calculate the ratio for 1 SQM
      // Check if both source product (material) and target product (newProduct) have required fields
      const sourceLengthUnit = (material as any).length_unit || material.lengthUnit || '';
      const sourceWidthUnit = (material as any).width_unit || material.widthUnit || '';
      
      if (!material.length || !material.width || !sourceLengthUnit || !sourceWidthUnit) {
        console.warn(`⚠️ Cannot auto-calculate: Source product (${material.name}) is missing required fields. Length: ${material.length}, Width: ${material.width}, LengthUnit: ${sourceLengthUnit}, WidthUnit: ${sourceWidthUnit}`);
        alert(`The selected product "${material.name}" is missing length, width, or their units. Please update the product details first.`);
      } else if (!newProduct.length || !newProduct.width || !newProduct.lengthUnit || !newProduct.widthUnit) {
        console.warn(`⚠️ Cannot auto-calculate: Target product (${newProduct.name || 'new product'}) is missing required fields. Length: ${newProduct.length}, Width: ${newProduct.width}, LengthUnit: ${newProduct.lengthUnit}, WidthUnit: ${newProduct.widthUnit}`);
        alert(`Please fill in Length, Width, and their units for the target product first, then select the product as recipe ingredient.`);
      } else {
        // Both products have required fields - calculate the ratio
        const ratio = calculateProductRatio(material, newProduct);
        console.log(`🔄 Calculation result: ratio = ${ratio} for product ${material.name}`);
        if (ratio > 0 && !isNaN(ratio) && isFinite(ratio)) {
          autoCalculatedQuantity = ratio.toFixed(4);
          console.log(`✅ Auto-calculated ratio for PRODUCT: ${material.name} needs ${autoCalculatedQuantity} units for 1 SQM of target product`);
        } else {
          console.warn(`⚠️ Invalid ratio calculated (${ratio}) for product ${material.name}. Check if both products have valid dimensions.`);
          alert(`Could not calculate the ratio. Please check that both products have valid length and width values.`);
        }
      }
    } else {
      // This is a raw material - let user type manually
      console.log(`📝 RAW MATERIAL selected: ${material.name} - User will type quantity manually`);
    }
    
    setNewMaterial({
      materialId: material.id,
      materialName: material.name,
      quantity: autoCalculatedQuantity, // Empty for raw materials, auto-filled for products
      unit: material.unit || "",
      cost: material.costPerUnit?.toString() || "",
      selectedQuantity: 0
    });
    // Don't close popup automatically - let user see the selection and close manually
    // Reset filters but keep popup open so user can see selection
    setMaterialSearchTerm("");
    setSelectedCategory("all");
    setSelectedSupplier("all");
    setSelectedColor("all");
    setSelectedLength("all");
    setSelectedWidth("all");
    setSelectedWeight("all");
  };

  const addProductMaterial = () => {
    if (!newMaterial.materialId) {
      console.error("Please select a material");
      return;
    }

    if (!newMaterial.quantity || parseFloat(newMaterial.quantity) <= 0) {
      console.error("Please enter a valid quantity");
      alert("Please enter a valid quantity (supports decimals like 0.5, 2.5, 0.2)");
      return;
    }

    // Check if it's a raw material first
    let selectedMaterial = rawMaterials.find(m => m.id === newMaterial.materialId);
    let isProduct = false;
    
    // If not found in raw materials, check if it's a product
    if (!selectedMaterial) {
      selectedMaterial = availableProducts.find(p => p.id === newMaterial.materialId);
      isProduct = true;
    }

    if (!selectedMaterial) {
      console.error("Selected material not found for ID:", newMaterial.materialId);
      console.error("Available raw materials:", rawMaterials.map(m => ({ id: m.id, name: m.name })));
      console.error("Available products:", availableProducts.map(p => ({ id: p.id, name: p.name })));
      return;
    }

    console.log("Adding material to product:", {
      selectedMaterial,
      materialId: selectedMaterial.id,
      materialName: selectedMaterial.name,
      isProduct
    });

    const material: ProductMaterial = {
      materialId: selectedMaterial.id,
      materialName: selectedMaterial.name,
      quantity: parseFloat(newMaterial.quantity || "1"), // Use the quantity from form (supports decimals)
      unit: newMaterial.unit || selectedMaterial.unit || "piece",
      cost: isProduct ? 0 : (selectedMaterial.costPerUnit || 0) // Products don't have cost in recipe
    };

    console.log("Created product material:", material);
    setProductMaterials([...productMaterials, material]);
    setNewMaterial({
      materialId: "",
      materialName: "",
      quantity: "",
      unit: "",
      cost: "",
      selectedQuantity: 0
    });
  };

  const removeProductMaterial = (index: number) => {
    setProductMaterials(productMaterials.filter((_, i) => i !== index));
  };

  const removeDuplicateProductMaterial = (index: number) => {
    setDuplicateProductMaterials(duplicateProductMaterials.filter((_, i) => i !== index));
  };

  // Filter and sort products
  const filteredProducts = (products || [])
    .filter(product => {
      if (!product) return false;
      
      const matchesSearch = (product.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (product.qrCode || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (product.color || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = categoryFilter === "all" || product.category === categoryFilter;
      const matchesSubcategory = subcategoryFilter === "all" || (product.subcategory && product.subcategory === subcategoryFilter);
      
      let matchesStatus = true;
      if (statusFilter === "low-stock") {
        matchesStatus = product.actual_status === "low-stock";
      } else if (statusFilter === "out-of-stock") {
        matchesStatus = product.actual_status === "out-of-stock";
      } else if (statusFilter === "in-stock") {
        matchesStatus = product.actual_status === "in-stock";
      } else if (statusFilter === "in-production") {
        matchesStatus = product.actual_status === "in-production";
      }
      
      return matchesSearch && matchesCategory && matchesSubcategory && matchesStatus;
    })
    .sort((a, b) => (a?.name || '').localeCompare(b?.name || ''));

  const dynamicCategories = [...new Set((products || []).map(p => p?.category).filter(Boolean))];
  const dynamicSubcategories = [...new Set((products || []).map(p => p?.subcategory).filter(Boolean))];
  const totalProducts = (products || []).length;
  const lowStockCount = (products || []).filter(p => p?.actual_status === "low-stock" || p?.actual_status === "out-of-stock").length;

  // Calculate available pieces for each product (excluding sold and damaged)
  const getAvailablePieces = (productId: string) => {
    const product = products.find(p => p.id === productId);
    
    if (!product) return 0;
    
    // For products with individual stock tracking, count only available individual products
    if (product.individualStockTracking && product.individual_products) {
      const availableCount = product.individual_products.filter((ip: any) => ip.status === 'available').length;
      return availableCount;
    }
    
    // For bulk products, use baseQuantity, quantity, or actual_quantity as fallback
    // Ensure we return a number, not undefined or null
    const qty = product.baseQuantity ?? product.quantity ?? product.actual_quantity ?? 0;
    return typeof qty === 'number' ? qty : 0;
  };

  // Get individual products for a specific product
  const getIndividualProducts = (productId: string) => {
    const product = products.find(p => p.id === productId);
    return product?.individual_products || [];
  };

  // Get individual product breakdown for display
  const getIndividualProductBreakdown = (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (!product || !product.individual_products) return null;
    
    const individualProducts = product.individual_products;
    const available = individualProducts.filter((ip: any) => ip.status === 'available').length;
    const sold = individualProducts.filter((ip: any) => ip.status === 'sold').length;
    const damaged = individualProducts.filter((ip: any) => ip.status === 'damaged').length;
    const total = individualProducts.length;
    
    return { available, sold, damaged, total };
  };

  // Handle adding product to production
  const handleAddToProduction = async (product: FrontendProduct) => {
    console.log('Adding product to production:', product);
    
    // Set loading state for this specific product
    setIsAddingToProduction(product.id);
    
    try {
      // Update product status to "in-production"
      const updatedProducts = products.map(p => 
        p.id === product.id ? { ...p, status: "in-production" as const } : p
      );
      setProducts(updatedProducts);
      // Products are saved to Supabase database only
      
      // Check user role - only production and admin users can navigate to production pages
      if (user?.role === 'production' || user?.role === 'admin') {
      // Get all individual stock details for this product
      const productIndividualStocks = product.individual_products || [];

      // Create complete product data with individual stock details
      const completeProductData = {
        ...product,
        status: "in-production" as const,
        individualStocks: productIndividualStocks
      };

      console.log('Navigating to production with data:', completeProductData);
      navigate('/production/new-batch', { 
        state: { 
          selectedProduct: completeProductData
        }
      });
    } else {
      // For inventory users, send notification to production team
      try {
        const notification = await MongoDBNotificationService.createNotification({
          type: 'production_request',
          title: 'Production Request',
          message: `Product "${product.name}" has been requested for production by ${user?.full_name || 'Inventory Manager'}. Please add this product to the production queue.`,
          module: 'production',
          priority: 'medium',
          status: 'unread',
          related_id: product.id,
          related_data: {
            productId: product.id,
            productName: product.name,
            category: product.category,
            requestedBy: user?.full_name || 'Inventory Manager',
            requestedByRole: user?.role || 'inventory',
            requestedAt: new Date().toISOString()
          },
          created_by: user?.id || 'system'
        });

        if (notification.data) {
          console.log('✅ Production request notification sent:', notification.data);
          alert(`✅ Product "${product.name}" has been sent to production queue. The production team will be notified and handle the manufacturing process.`);
        } else {
          console.error('❌ Failed to send notification:', notification.error);
          alert(`⚠️ Product "${product.name}" status updated, but notification to production team failed. Please contact the production manager directly.`);
        }
      } catch (error) {
        console.error('❌ Error sending production request notification:', error);
        alert(`⚠️ Product "${product.name}" status updated, but notification to production team failed. Please contact the production manager directly.`);
      }
    }
    } catch (error) {
      console.error('❌ Error adding product to production:', error);
      alert(`⚠️ Failed to add product "${product.name}" to production. Please try again.`);
    } finally {
      // Clear loading state
      setIsAddingToProduction(null);
    }
  };

  // Handle showing QR code for main product
  const handleShowProductQR = (product: FrontendProduct) => {
    setSelectedQRProduct(product);
    setSelectedQRIndividualProduct(null);
    setShowQRCode(true);
  };

  // Handle showing QR code for individual product
  const handleShowIndividualProductQR = (individualProduct: FrontendIndividualProduct) => {
    setSelectedQRIndividualProduct(individualProduct);
    setSelectedQRProduct(null);
    setShowQRCode(true);
  };

  // Generate QR data for main product
  const generateMainProductQRData = (product: FrontendProduct): MainProductQRData => {
    const productIndividualStocks = product.individual_products || [];

    const availableCount = productIndividualStocks.filter(p => p.status === 'available').length;
    const soldCount = productIndividualStocks.filter(p => p.status === 'sold').length;
    const damagedCount = productIndividualStocks.filter(p => p.status === 'damaged').length;
    const inProductionCount = productIndividualStocks.filter(p => p.status === 'in-production').length;

    return {
      product_id: product.id,
      product_name: product.name,
      description: product.notes || '',
      category: product.category,
      total_quantity: product.quantity || productIndividualStocks.length,
      available_quantity: availableCount,
      recipe: {
        materials: (product.materialsUsed || []).map(material => ({
          material_id: material.materialId,
          material_name: material.materialName,
          quantity: material.quantity,
          unit: material.unit
        })),
        production_time: 0, // Default value
        difficulty_level: 'Medium' // Default value
      },
      machines_required: [], // Default empty array
      production_steps: [], // Default empty array
      quality_standards: {
        min_weight: 0,
        max_weight: 1000,
        dimensions_tolerance: 0.1,
        quality_criteria: ['Grade A', 'No defects']
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  };

  // Generate QR data for individual product
  const generateIndividualProductQRData = (individualProduct: FrontendIndividualProduct, mainProduct: FrontendProduct): IndividualProductQRData => {
    return {
      id: individualProduct.id,
      product_id: individualProduct.productId,
      product_name: individualProduct.productName || mainProduct.name,
      batch_id: individualProduct.id, // Using individual product ID as batch ID
      serial_number: individualProduct.qrCode,
      production_date: individualProduct.productionDate || new Date().toISOString().split('T')[0],
      quality_grade: individualProduct.qualityGrade || 'A',
      dimensions: {
        length: parseFloat(individualProduct.length?.replace(/[^\d.]/g, '') || '0'),
        width: parseFloat(individualProduct.width?.replace(/[^\d.]/g, '') || '0')
      },
      weight: parseFloat(individualProduct.weight?.replace(/[^\d.]/g, '') || '0'),
      color: individualProduct.color || 'N/A',
      pattern: individualProduct.pattern || 'N/A',
      material_composition: (individualProduct.materialsUsed || []).map(m => m.materialName),
      production_steps: [
        {
          step_name: 'Production',
          completed_at: individualProduct.completionDate || new Date().toISOString(),
          operator: individualProduct.inspector || 'System',
          quality_check: true
        }
      ],
      machine_used: ['Production Line'], // Default value
      inspector: individualProduct.inspector || 'System',
      status: individualProduct.status as 'active' | 'sold' | 'damaged' | 'returned',
      created_at: individualProduct.createdAt || new Date().toISOString()
    };
  };

  return (
    <div className="flex-1 space-y-4 sm:space-y-6 p-3 sm:p-4 lg:p-6">
      <Header 
        title="Product Inventory"
        subtitle="Track products & manage inventory"
      />

      <Tabs defaultValue="inventory" className="space-y-4 sm:space-y-6">
        <div className="flex flex-col gap-4">
          <TabsList className="w-full sm:w-fit grid grid-cols-3 sm:flex">
            <TabsTrigger value="inventory" className="text-xs sm:text-sm">
              <span className="hidden sm:inline">Product </span>Inventory
            </TabsTrigger>
            <TabsTrigger value="analytics" className="text-xs sm:text-sm">Analytics</TabsTrigger>
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
          
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input 
                  placeholder="Search products..."
                  className="pl-10" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex gap-2 sm:gap-3">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-full sm:w-36 lg:w-48">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {dynamicCategories.map(category => (
                    <SelectItem key={category} value={category}>{category}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={subcategoryFilter} onValueChange={setSubcategoryFilter}>
                  <SelectTrigger className="w-full sm:w-36 lg:w-48">
                  <SelectValue placeholder="All Subcategories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Subcategories</SelectItem>
                  {dynamicSubcategories.map(subcategory => (
                    <SelectItem key={subcategory} value={subcategory}>{subcategory}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="in-stock">In Stock</SelectItem>
                  <SelectItem value="low-stock">Low Stock</SelectItem>
                  <SelectItem value="out-of-stock">Out of Stock</SelectItem>
                  <SelectItem value="in-production">In Production</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              {/* Add Product Button */}
                <Dialog open={isAddProductOpen} onOpenChange={(open) => {
                  setIsAddProductOpen(open);
                  if (!open) {
                    setIsCreatingProduct(false);
                    // Reset image states when dialog closes
                    setSelectedImage(null);
                    setImagePreview("");
                    setImageUrl("");
                  }
                }}>
                <DialogTrigger asChild>
                  <Button className="flex items-center gap-2 w-full sm:w-auto">
                    <Plus className="w-4 h-4" />
                    <span className="sm:hidden">Add New Product</span>
                    <span className="hidden sm:inline">Add Product</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Add New Product to Inventory</DialogTitle>
                    <DialogDescription>
                      Add a finished carpet product to your inventory with unique QR code tracking.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="productName">Product Name *</Label>
                      <Input
                        id="productName"
                        value={newProduct.name}
                        onChange={(e) => setNewProduct({...newProduct, name: e.target.value})}
                        placeholder="e.g., Traditional Persian Carpet"
                        required
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      {/* Category Dropdown */}
                      <div>
                        <Label htmlFor="category">Category *</Label>
                        {showAddCategory ? (
                          <div className="flex gap-2">
                            <Input
                              placeholder="Enter new category"
                              value={newCategoryInput}
                              onChange={(e) => setNewCategoryInput(e.target.value)}
                            />
                            <Button size="sm" onClick={addNewCategory}>Add</Button>
                            <Button size="sm" variant="outline" onClick={() => setShowAddCategory(false)}>Cancel</Button>
                          </div>
                        ) : (
                          <Select value={newProduct.category} onValueChange={(value) => {
                            if (value === "add_new") {
                              setShowAddCategory(true);
                            } else {
                              // Auto-set color to NA for Plain Carpet
                              if (value === "Plain Carpet") {
                                setNewProduct({...newProduct, category: value, color: "NA"});
                              } else {
                                setNewProduct({...newProduct, category: value});
                              }
                            }
                          }}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="N/A" className="text-gray-500 italic">
                                N/A (No Category)
                              </SelectItem>
                              {dropdownOptions.categories.map(opt => opt.value).map(category => (
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
                                + Add New Category
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      </div>

                      {/* Subcategory Dropdown */}
                      <div>
                        <Label htmlFor="subcategory">Subcategory</Label>
                        {showAddSubcategory ? (
                          <div className="flex gap-2">
                            <Input
                              placeholder="Enter new subcategory"
                              value={newSubcategoryInput}
                              onChange={(e) => setNewSubcategoryInput(e.target.value)}
                            />
                            <Button size="sm" onClick={addNewSubcategory}>Add</Button>
                            <Button size="sm" variant="outline" onClick={() => setShowAddSubcategory(false)}>Cancel</Button>
                          </div>
                        ) : (
                          <Select value={newProduct.subcategory || 'N/A'} onValueChange={(value) => {
                            if (value === "add_new") {
                              setShowAddSubcategory(true);
                            } else {
                              setNewProduct({...newProduct, subcategory: value === 'N/A' ? '' : value});
                            }
                          }}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select subcategory (optional)" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="N/A" className="text-gray-500 italic">
                                N/A (No Subcategory)
                              </SelectItem>
                              {dropdownOptions.subcategories.map(opt => opt.value).map(subcategory => (
                                <div key={subcategory} className="flex items-center justify-between px-2 py-1.5 hover:bg-accent rounded-sm">
                                  <SelectItem value={subcategory} className="flex-1 p-0 h-auto">
                                    {subcategory}
                                  </SelectItem>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      deleteSubcategory(subcategory);
                                    }}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              ))}
                              <SelectItem value="add_new" className="text-blue-600 font-medium">
                                + Add New Subcategory
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">

                      {/* Color Dropdown */}
                      <div>
                        <Label htmlFor="color">Color</Label>
                        {showAddColor ? (
                          <div className="flex gap-2">
                            <Input
                              placeholder="Enter new color"
                              value={newColorInput}
                              onChange={(e) => setNewColorInput(e.target.value)}
                            />
                            <Button size="sm" onClick={addNewColor}>Add</Button>
                            <Button size="sm" variant="outline" onClick={() => setShowAddColor(false)}>Cancel</Button>
                          </div>
                        ) : (
                          <Select value={newProduct.color} onValueChange={(value) => {
                            if (value === "add_new") {
                              setShowAddColor(true);
                            } else {
                              setNewProduct({...newProduct, color: value});
                              setColorSearchTerm(""); // Clear search when color is selected
                            }
                          }}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select color" />
                            </SelectTrigger>
                            <SelectContent>
                              {/* Search Input */}
                              <div className="p-2 border-b">
                                <Input
                                  placeholder="Search colors..."
                                  value={colorSearchTerm}
                                  onChange={(e) => setColorSearchTerm(e.target.value)}
                                  className="h-8"
                                />
                              </div>
                              
                              {/* Add New Color Option - Always at top */}
                              <SelectItem value="add_new" className="text-blue-600 font-medium">
                                + Add New Color
                              </SelectItem>
                              
                              {/* Color Options */}
                              {getFilteredColors().map(color => (
                                <div key={color} className="flex items-center justify-between px-2 py-1.5 hover:bg-accent rounded-sm">
                                  <SelectItem value={color} className="flex-1 p-0 h-auto">
                                  {color === "NA" ? (
                                    <span className="text-gray-500 italic">NA (No Color)</span>
                                  ) : (
                                    color
                                  )}
                                </SelectItem>
                                  {color !== "NA" && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        deleteColor(color);
                                      }}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  )}
                                </div>
                              ))}
                              
                              {/* Show message if no colors found */}
                              {getFilteredColors().length === 0 && (
                                <div className="p-2 text-sm text-gray-500 text-center">
                                  No colors found matching "{colorSearchTerm}"
                                </div>
                              )}
                            </SelectContent>
                          </Select>
                        )}
                      </div>

                      {/* Pattern Dropdown */}
                      <div>
                        <Label htmlFor="pattern">Pattern</Label>
                        {showAddPattern ? (
                          <div className="flex gap-2">
                            <Input
                              placeholder="Enter new pattern"
                              value={newPatternInput}
                              onChange={(e) => setNewPatternInput(e.target.value)}
                            />
                            <Button size="sm" onClick={addNewPattern}>Add</Button>
                            <Button size="sm" variant="outline" onClick={() => setShowAddPattern(false)}>Cancel</Button>
                          </div>
                        ) : (
                          <Select value={newProduct.pattern} onValueChange={(value) => {
                            if (value === "add_new") {
                              setShowAddPattern(true);
                            } else {
                              setNewProduct({...newProduct, pattern: value});
                            }
                          }}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select pattern" />
                            </SelectTrigger>
                            <SelectContent>
                              {/* Add New Pattern Option - Always at top */}
                              <SelectItem value="add_new" className="text-blue-600 font-medium">
                                + Add New Pattern
                              </SelectItem>
                              
                              {/* Pattern Options */}
                              {dropdownOptions.patterns.map(opt => opt.value).map(pattern => (
                                <div key={pattern} className="flex items-center justify-between px-2 py-1.5 hover:bg-accent rounded-sm">
                                  <SelectItem value={pattern} className="flex-1 p-0 h-auto">
                                  {pattern === "NA" ? (
                                    <span className="text-gray-500 italic">NA (No Pattern)</span>
                                  ) : (
                                    pattern
                                  )}
                                  </SelectItem>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      deletePattern(pattern);
                                    }}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {/* Base Quantity Field */}
                      <div>
                        <Label htmlFor="quantity">Base Quantity *</Label>
                        <Input
                          id="quantity"
                          type="number"
                          value={newProduct.quantity}
                          onChange={(e) => setNewProduct({...newProduct, quantity: e.target.value})}
                          placeholder="Enter quantity (e.g., 10)"
                          min="0"
                          required
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Initial stock quantity
                        </p>
                      </div>
                      
                      {/* Unit Dropdown */}
                      <div>
                        <Label htmlFor="unit">Unit *</Label>
                        {showAddUnit ? (
                          <div className="flex gap-2">
                            <Input
                              placeholder="Enter new unit (e.g., bundles)"
                              value={newUnitInput}
                              onChange={(e) => setNewUnitInput(e.target.value)}
                            />
                            <Button size="sm" onClick={addNewUnit}>Add</Button>
                            <Button size="sm" variant="outline" onClick={() => setShowAddUnit(false)}>Cancel</Button>
                          </div>
                        ) : (
                          <Select value={newProduct.unit} onValueChange={(value) => {
                            if (value === "add_new") {
                              setShowAddUnit(true);
                            } else {
                              setNewProduct({...newProduct, unit: value});
                              setUnitSearchTerm(""); // Clear search when unit is selected
                            }
                          }}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select unit" />
                            </SelectTrigger>
                            <SelectContent>
                              {/* Search Input */}
                              <div className="p-2 border-b">
                                <Input
                                  placeholder="Search units..."
                                  value={unitSearchTerm}
                                  onChange={(e) => setUnitSearchTerm(e.target.value)}
                                  className="h-8"
                                />
                              </div>
                              
                              {/* Add New Unit Option - Always at top */}
                              <SelectItem value="add_new" className="text-blue-600 font-medium">
                                + Add New Unit
                              </SelectItem>
                              
                              {/* Unit Options */}
                              {getFilteredUnits().map(unit => (
                                <div key={unit} className="flex items-center justify-between px-2 py-1.5 hover:bg-accent rounded-sm">
                                  <SelectItem value={unit} className="flex-1 p-0 h-auto">
                                    {unit}
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
                              
                              {/* Show message if no units found */}
                              {getFilteredUnits().length === 0 && (
                                <div className="p-2 text-sm text-gray-500 text-center">
                                  No units found matching "{unitSearchTerm}"
                                </div>
                              )}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    </div>

                    {/* Individual Stock Tracking Option */}
                    <div className="mb-4">
                      <Label className="text-sm font-medium mb-2 block">Individual Stock Tracking</Label>
                      <div className="flex gap-4">
                        <label className="flex items-center space-x-2">
                          <input
                            type="radio"
                            name="individualStockTracking"
                            value="yes"
                            checked={individualStockTracking === true}
                            onChange={() => setIndividualStockTracking(true)}
                            className="text-blue-600"
                          />
                          <span className="text-sm">Yes, track individual pieces (with QR codes)</span>
                        </label>
                        <label className="flex items-center space-x-2">
                          <input
                            type="radio"
                            name="individualStockTracking"
                            value="no"
                            checked={individualStockTracking === false}
                            onChange={() => setIndividualStockTracking(false)}
                            className="text-blue-600"
                          />
                          <span className="text-sm">No, bulk tracking only (no QR codes)</span>
                        </label>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {individualStockTracking 
                          ? "Each piece will have a unique QR code for individual tracking" 
                          : "Product will be tracked as bulk quantity without individual QR codes"
                        }
                      </div>
                    </div>

                    {/* Quality Grade Selection - Hidden (Auto-set to A) */}
                    <div className="mb-4 hidden">
                      <Label className="text-sm font-medium mb-2 block">Quality Grade for Individual Products</Label>
                      <Select value={newProduct.qualityGrade} onValueChange={(value) => setNewProduct({...newProduct, qualityGrade: value})}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select quality grade" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="A+">A+ (Premium)</SelectItem>
                          <SelectItem value="A">A (High)</SelectItem>
                          <SelectItem value="B">B (Good)</SelectItem>
                          <SelectItem value="C">C (Standard)</SelectItem>
                        </SelectContent>
                      </Select>
                      <div className="text-xs text-muted-foreground mt-1">
                        Quality grade automatically set to A for all products
                      </div>
                    </div>

                    {/* Length and Width Dropdowns */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="length">Length *</Label>
                        <p className="text-xs text-gray-500 mb-2">Required for SQM calculation</p>
                        {newProduct.length && newProduct.width && (
                          <div className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded mb-2">
                            📐 SQM: {calculateSQM(newProduct.length, newProduct.width, newProduct.lengthUnit, newProduct.widthUnit).toFixed(4)} m²
                            <br />
                            <span className="text-gray-600">
                              {newProduct.length}{newProduct.lengthUnit} {getConversionDisplay(newProduct.length, newProduct.lengthUnit)} × {newProduct.width}{newProduct.widthUnit} {getConversionDisplay(newProduct.width, newProduct.widthUnit)}
                            </span>
                          </div>
                        )}
                        {showAddLength ? (
                          <div className="space-y-2">
                          <div className="flex gap-2">
                        <Input
                                placeholder="Enter length value (e.g., 5)"
                                value={newLengthInput}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  if (/^\d*\.?\d*$/.test(value)) {
                                    setNewLengthInput(value);
                                  }
                                }}
                                className="flex-1"
                              />
                              {/* Unit dropdown - select from existing units or add new */}
                              <Select
                                value={newProduct.lengthUnit || ""}
                                onValueChange={(value) => {
                                  if (value === "add_new_unit") {
                                    // Open dialog to add new unit
                                    setCurrentUnitType('length');
                                    setCurrentUnitPlaceholder("e.g., feet, m, cm, inch");
                                    setNewUnitNameInput("");
                                    setIsAddUnitDialogOpen(true);
                                  } else {
                                    setNewProduct({...newProduct, lengthUnit: value || ""});
                                  }
                                }}
                              >
                                <SelectTrigger className="w-32">
                                  <SelectValue placeholder="Select unit *" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="add_new_unit" className="text-blue-600 font-medium">
                                    + Add New Unit
                                  </SelectItem>
                                  {lengthUnits.length > 0 ? (
                                    lengthUnits.map(unit => (
                                      <SelectItem key={unit} value={unit}>
                                        {unit}
                                      </SelectItem>
                                    ))
                                  ) : (
                                    <div className="p-2 text-sm text-gray-500 text-center">
                                      No units available
                                    </div>
                                  )}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="flex gap-2">
                              <Button size="sm" onClick={addNewLength} disabled={!newLengthInput.trim() || !newProduct.lengthUnit}>
                                Add {newLengthInput || "value"} {newProduct.lengthUnit || "unit"}
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => setShowAddLength(false)}>Cancel</Button>
                            </div>
                      </div>
                        ) : (
                          <div className="flex gap-2">
                          <Select value={
                            // Try to find exact match in dropdown options first
                            (() => {
                              const combinedValue = newProduct.length && newProduct.lengthUnit 
                                ? `${newProduct.length} ${newProduct.lengthUnit}`.trim()
                                : newProduct.length || "";
                              
                              // Check if this exact value exists in dropdown options
                              const exactMatch = getFilteredLengths().find(l => l === combinedValue);
                              if (exactMatch) return exactMatch;
                              
                              // If no exact match, try to find by parsing
                              if (newProduct.length && newProduct.lengthUnit) {
                                const searchValue = `${newProduct.length} ${newProduct.lengthUnit}`.trim();
                                const found = getFilteredLengths().find(l => {
                                  const parsed = parseValueWithUnit(l);
                                  return parsed.value === newProduct.length && parsed.unit === newProduct.lengthUnit;
                                });
                                return found || searchValue;
                              }
                              
                              return combinedValue;
                            })()
                          } onValueChange={(value) => {
                            if (value === "add_new") {
                              setShowAddLength(true);
                            } else if (value === "N/A") {
                              setNewProduct({...newProduct, length: "", lengthUnit: ""});
                              setLengthSearchTerm("");
                            } else {
                              // Parse combined value (e.g., "5 m" -> length: "5", lengthUnit: "m")
                              const parsed = parseValueWithUnit(value);
                              console.log('🔍 Selected length:', { value, parsed });
                              setNewProduct({
                                ...newProduct,
                                length: parsed.value || value, // Set the numeric value
                                lengthUnit: parsed.unit || "" // Set the unit if available
                              });
                              setLengthSearchTerm(""); // Clear search when length is selected
                            }
                          }}>
                              <SelectTrigger className="flex-1">
                                <SelectValue placeholder="Select length" />
                              </SelectTrigger>
                            <SelectContent>
                              {/* Search Input */}
                              <div className="p-2 border-b">
                        <Input
                                  placeholder="Search lengths..."
                                  value={lengthSearchTerm}
                                  onChange={(e) => setLengthSearchTerm(e.target.value)}
                                  className="h-8"
                        />
                      </div>
                              
                              {/* Add New Length Option - Always at top */}
                              <SelectItem value="add_new" className="text-blue-600 font-medium">
                                + Add New Length
                              </SelectItem>
                              
                              <SelectItem value="N/A" className="text-gray-500 italic">
                                N/A (No Length)
                              </SelectItem>
                              
                              {/* Length Options - Show combined values with delete button */}
                              {getFilteredLengths().map(length => {
                                return (
                                  <div key={length} className="flex items-center justify-between px-2 py-1.5 hover:bg-accent rounded-sm">
                                    <SelectItem value={length} className="flex-1 p-0 h-auto">
                                      {length}
                                    </SelectItem>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        deleteLength(length);
                                      }}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                );
                              })}
                              
                              {/* Show message if no lengths found */}
                              {getFilteredLengths().length === 0 && (
                                <div className="p-2 text-sm text-gray-500 text-center">
                                  No lengths found matching "{lengthSearchTerm}"
                    </div>
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                        )}
                      </div>
                    <div>
                        <Label htmlFor="width">Width *</Label>
                        <p className="text-xs text-gray-500 mb-2">Required for SQM calculation</p>
                        {showAddWidth ? (
                          <div className="space-y-2">
                        <div className="flex gap-2">
                          <Input
                                placeholder="Enter width value (e.g., 10)"
                              value={newWidthInput}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  if (/^\d*\.?\d*$/.test(value)) {
                                    setNewWidthInput(value);
                                  }
                                }}
                                className="flex-1"
                              />
                              {/* Unit dropdown - select from existing units or add new */}
                              <Select
                                value={newProduct.widthUnit || ""}
                                onValueChange={(value) => {
                                  if (value === "add_new_unit") {
                                    // Open dialog to add new unit
                                    setCurrentUnitType('width');
                                    setCurrentUnitPlaceholder("e.g., feet, m, cm, inch");
                                    setNewUnitNameInput("");
                                    setIsAddUnitDialogOpen(true);
                                  } else {
                                    setNewProduct({...newProduct, widthUnit: value || ""});
                                  }
                                }}
                              >
                                <SelectTrigger className="w-32">
                                  <SelectValue placeholder="Select unit *" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="add_new_unit" className="text-blue-600 font-medium">
                                    + Add New Unit
                                  </SelectItem>
                                  {widthUnits.length > 0 ? (
                                    widthUnits.map(unit => (
                                      <SelectItem key={unit} value={unit}>
                                        {unit}
                                      </SelectItem>
                                    ))
                                  ) : (
                                    <div className="p-2 text-sm text-gray-500 text-center">
                                      No units available
                                    </div>
                                  )}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="flex gap-2">
                              <Button size="sm" onClick={addNewWidth} disabled={!newWidthInput.trim() || !newProduct.widthUnit}>
                                Add {newWidthInput || "value"} {newProduct.widthUnit || "unit"}
                              </Button>
                            <Button size="sm" variant="outline" onClick={() => setShowAddWidth(false)}>Cancel</Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                          <Select value={
                            // Try to find exact match in dropdown options first
                            (() => {
                              const combinedValue = newProduct.width && newProduct.widthUnit 
                                ? `${newProduct.width} ${newProduct.widthUnit}`.trim()
                                : newProduct.width || "";
                              
                              // Check if this exact value exists in dropdown options
                              const exactMatch = getFilteredWidths().find(w => w === combinedValue);
                              if (exactMatch) return exactMatch;
                              
                              // If no exact match, try to find by parsing
                              if (newProduct.width && newProduct.widthUnit) {
                                const searchValue = `${newProduct.width} ${newProduct.widthUnit}`.trim();
                                const found = getFilteredWidths().find(w => {
                                  const parsed = parseValueWithUnit(w);
                                  return parsed.value === newProduct.width && parsed.unit === newProduct.widthUnit;
                                });
                                return found || searchValue;
                              }
                              
                              return combinedValue;
                            })()
                          } onValueChange={(value) => {
                            if (value === "add_new") {
                              setShowAddWidth(true);
                            } else if (value === "N/A") {
                              setNewProduct({...newProduct, width: "", widthUnit: ""});
                              setWidthSearchTerm("");
                            } else {
                              // Parse combined value (e.g., "10 m" -> width: "10", widthUnit: "m")
                              const parsed = parseValueWithUnit(value);
                              console.log('🔍 Selected width:', { value, parsed });
                              setNewProduct({
                                ...newProduct,
                                width: parsed.value || value, // Set the numeric value
                                widthUnit: parsed.unit || "" // Set the unit if available
                              });
                              setWidthSearchTerm(""); // Clear search when width is selected
                            }
                          }}>
                              <SelectTrigger className="flex-1">
                                <SelectValue placeholder="Select width" />
                              </SelectTrigger>
                            <SelectContent>
                            {/* Search Input */}
                            <div className="p-2 border-b">
                              <Input
                                  placeholder="Search widths..."
                                  value={widthSearchTerm}
                                  onChange={(e) => setWidthSearchTerm(e.target.value)}
                                className="h-8"
                      />
                    </div>

                              {/* Add New Width Option - Always at top */}
                              <SelectItem value="add_new" className="text-blue-600 font-medium">
                                + Add New Width
                              </SelectItem>
                            
                            <SelectItem value="N/A" className="text-gray-500 italic">
                                N/A (No Width)
                            </SelectItem>
                            
                              {/* Width Options - Show combined values with delete button */}
                              {getFilteredWidths().map(width => {
                                return (
                                  <div key={width} className="flex items-center justify-between px-2 py-1.5 hover:bg-accent rounded-sm">
                                    <SelectItem value={width} className="flex-1 p-0 h-auto">
                                      {width}
                                    </SelectItem>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        deleteWidth(width);
                                      }}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                );
                              })}
                            
                              {/* Show message if no widths found */}
                              {getFilteredWidths().length === 0 && (
                              <div className="p-2 text-sm text-gray-500 text-center">
                                  No widths found matching "{widthSearchTerm}"
                              </div>
                            )}
                            </SelectContent>
                          </Select>
                        </div>
                        )}
                      </div>
                    </div>

                    {/* Weight field - Full width */}
                    <div>
                      <Label htmlFor="weight">Weight *</Label>
                        {showAddWeight ? (
                          <div className="space-y-2">
                          <div className="flex gap-2">
                        <Input
                                placeholder="Enter weight value (e.g., 3)"
                              value={newWeightInput}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  if (/^\d*\.?\d*$/.test(value)) {
                                    setNewWeightInput(value);
                                  }
                                }}
                                className="flex-1"
                              />
                              {/* Unit dropdown - select from existing units or add new */}
                              <Select
                                value={newProduct.weightUnit || ""}
                                onValueChange={(value) => {
                                  if (value === "add_new_unit") {
                                    // Open dialog to add new unit
                                    setCurrentUnitType('weight');
                                    setCurrentUnitPlaceholder("e.g., GSM, kg, g, lb");
                                    setNewUnitNameInput("");
                                    setIsAddUnitDialogOpen(true);
                                  } else {
                                    setNewProduct({...newProduct, weightUnit: value || ""});
                                  }
                                }}
                              >
                                <SelectTrigger className="w-32">
                                  <SelectValue placeholder="Select unit *" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="add_new_unit" className="text-blue-600 font-medium">
                                    + Add New Unit
                                  </SelectItem>
                                  {weightUnits.length > 0 ? (
                                    weightUnits.map(unit => (
                                      <SelectItem key={unit} value={unit}>
                                        {unit}
                                      </SelectItem>
                                    ))
                                  ) : (
                                    <div className="p-2 text-sm text-gray-500 text-center">
                                      No units available
                                    </div>
                                  )}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="flex gap-2">
                              <Button size="sm" onClick={addNewWeight} disabled={!newWeightInput.trim() || !newProduct.weightUnit}>
                                Add {newWeightInput || "value"} {newProduct.weightUnit || "unit"}
                              </Button>
                            <Button size="sm" variant="outline" onClick={() => setShowAddWeight(false)}>Cancel</Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                          <Select
                          value={newProduct.weight && newProduct.weightUnit ? `${newProduct.weight} ${newProduct.weightUnit}` : newProduct.weight || ""}
                            onValueChange={(value) => {
                              if (value === "add_new") {
                                setShowAddWeight(true);
                              } else if (value === "N/A") {
                                setNewProduct({...newProduct, weight: "", weightUnit: ""});
                                setWeightSearchTerm("");
                              } else {
                                // Parse combined value (e.g., "600 GSM" -> weight: "600", weightUnit: "GSM")
                                const parsed = parseValueWithUnit(value);
                                setNewProduct({
                                  ...newProduct,
                                  weight: parsed.value || value, // Set the numeric value
                                  weightUnit: parsed.unit || "" // Set the unit if available
                                });
                                setWeightSearchTerm(""); // Clear search when weight is selected
                              }
                            }}
                          >
                              <SelectTrigger className="flex-1">
                                <SelectValue placeholder="Select weight" />
                              </SelectTrigger>
                            <SelectContent>
                              {/* Search Input */}
                              <div className="p-2 border-b">
                                <Input
                                  placeholder="Search weights..."
                                  value={weightSearchTerm}
                                  onChange={(e) => setWeightSearchTerm(e.target.value)}
                                  className="h-8"
                        />
                      </div>

                              {/* Add New Weight Option - Always at top */}
                              <SelectItem value="add_new" className="text-blue-600 font-medium">
                                + Add New Weight
                              </SelectItem>

                              <SelectItem value="N/A" className="text-gray-500 italic">
                                N/A (No Weight)
                              </SelectItem>

                              {/* Weight Options - Show combined values (e.g., "600 GSM", "4 mm") */}
                              {getFilteredWeights().map(weight => {
                                return (
                                  <div key={weight} className="flex items-center justify-between px-2 py-1.5 hover:bg-accent rounded-sm">
                                    <SelectItem value={weight} className="flex-1 p-0 h-auto">
                                      {weight}
                                    </SelectItem>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        deleteWeight(weight);
                                      }}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                );
                              })}

                              {/* Show message if no weights found */}
                              {getFilteredWeights().length === 0 && (
                                <div className="p-2 text-sm text-gray-500 text-center">
                                  No weights found matching "{weightSearchTerm}"
                                </div>
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                        )}
                    </div>

                    <div>
                      <Label htmlFor="notes">Notes</Label>
                        <Textarea
                          id="notes"
                          value={newProduct.notes}
                          onChange={(e) => setNewProduct({...newProduct, notes: e.target.value})}
                          placeholder="Additional notes about the product..."
                          className="min-h-[60px]"
                        />
                      </div>
                      
                      {/* Image Upload */}
                      <div>
                        <Label>Product Image (Optional)</Label>
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
                                variant="outline"
                                size="sm"
                                className="absolute top-2 right-2"
                                onClick={removeImage}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          ) : (
                            <div 
                              className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 text-center hover:border-muted-foreground/50 transition-colors cursor-pointer"
                              onClick={() => document.getElementById('product-image')?.click()}
                            >
                              <Image className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                              <p className="text-sm text-muted-foreground mb-2">Click to upload product image</p>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  document.getElementById('product-image')?.click();
                                }}
                              >
                                <Upload className="w-4 h-4 mr-2" />
                                Choose Image
                              </Button>
                              <input
                                id="product-image"
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleImageUpload}
                              />
                            </div>
                          )}
                        </div>
                      </div>

                    {/* Materials Section - Moved to Bottom */}
                    <div className="border-t pt-4">
                      <div className="flex items-center justify-between mb-4">
                        <Label className="text-lg font-medium">Materials Used</Label>
                        <div className="text-sm text-muted-foreground bg-blue-50 px-3 py-1 rounded-lg">
                          💡 Materials added here will be saved as recipe for 1 SQM of this product
                        </div>
                      </div>
                      
                      {/* Recipe Creation - Optional */}
                      <div className="mb-4">
                        <Label className="text-sm font-medium">Recipe Creation (Optional)</Label>
                        <p className="text-xs text-gray-500">You can add materials to create the recipe now, or add it later when editing the product</p>
                      </div>
                      
                      {/* Add Material Form - Optional */}
                        <div className="bg-gray-50 p-4 rounded-lg mb-4">
                          <div className="space-y-4">
                            <div>
                            <Label htmlFor="materialSelect">Select Material or Product *</Label>
                            <div className="space-y-2">
                              {/* Current Selection Display */}
                              {newMaterial.materialId ? (
                                <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                  <div className="flex-1">
                                    <div className="font-medium text-blue-900">{newMaterial.materialName}</div>
                                    <div className="text-sm text-blue-700">
                                      {rawMaterials.find(m => m.id === newMaterial.materialId) ? 'Raw Material' : 'Product'}
                            </div>
                          </div>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setNewMaterial({
                                      materialId: "",
                                      materialName: "",
                                      quantity: "",
                                      unit: "",
                                      cost: "",
                                      selectedQuantity: 0
                                    })}
                                    className="text-red-600 hover:text-red-700"
                                  >
                                    <X className="w-4 h-4" />
                                  </Button>
                                </div>
                              ) : (
                                <Button
                                  variant="outline"
                                  onClick={() => setShowMaterialSelector(true)}
                                  className="w-full h-12 border-dashed border-2 border-gray-300 hover:border-blue-400 hover:bg-blue-50"
                                >
                                  <Search className="w-4 h-4 mr-2" />
                                  Click to search and select material or product
                                </Button>
                              )}
                              
                              {/* Add New Material Button */}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => navigate('/materials')}
                                className="w-full text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              >
                                <Plus className="w-4 h-4 mr-2" />
                                Add New Material
                              </Button>
                            </div>
                          </div>
                          
                          {/* Quantity for Base Unit */}
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="materialQuantity">Quantity *</Label>
                              <Input
                                id="materialQuantity"
                                type="text"
                                value={newMaterial.quantity}
                                onChange={(e) => {
                                  // Allow only numbers, decimals, and leading zeros
                                  const value = e.target.value;
                                  if (value === '' || /^\d*\.?\d*$/.test(value)) {
                                    setNewMaterial({...newMaterial, quantity: value});
                                  }
                                }}
                                placeholder={newMaterial.materialId && availableProducts.some(p => p.id === newMaterial.materialId) ? "Auto-calculated for products" : "e.g., 0.5, 2.5, 0.2"}
                              />
                              <p className="text-xs text-gray-500 mt-1">
                                {newMaterial.materialId && availableProducts.some(p => p.id === newMaterial.materialId) 
                                  ? "Auto-calculated for products, or edit manually" 
                                  : "Quantity needed for 1 SQM of this product (supports decimals like 0.5kg, 0.2 pieces)"
                                }
                              </p>
                            </div>
                            <div>
                              <Label htmlFor="materialUnit">Unit *</Label>
                              <Input
                                id="materialUnit"
                                value={newMaterial.unit}
                                onChange={(e) => setNewMaterial({...newMaterial, unit: e.target.value})}
                                placeholder="e.g., kg, meters, pieces"
                              />
                            </div>
                          </div>
                        </div>
                        
                        <Button 
                          onClick={addProductMaterial} 
                          className="w-full mt-4"
                          disabled={!newMaterial.materialId || !newMaterial.quantity || !newMaterial.unit}
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Add Material to Recipe
                          </Button>
                        </div>

                      {/* Added Materials List - Show if recipe has materials */}
                      {productMaterials.length > 0 && (
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Recipe Materials:</Label>
                          {productMaterials.map((material, index) => (
                            <div key={index} className="flex items-center justify-between bg-blue-50 p-3 rounded-lg">
                              <div className="flex-1">
                                <div className="font-medium">{material.materialName}</div>
                                <div className="text-sm text-gray-600">
                                  {material.quantity} {material.unit}
                                </div>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => removeProductMaterial(index)}
                                className="text-red-600 hover:bg-red-50"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {/* Recipe Info Message */}
                      {productMaterials.length === 0 && (
                        <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-blue-600" />
                            <span className="text-sm text-blue-800 font-medium">No Recipe Added</span>
                          </div>
                          <p className="text-sm text-blue-700 mt-1">
                            You can create the product without a recipe and add it later when editing the product.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <DialogFooter>
                      <Button variant="outline" onClick={() => {
                        setIsAddProductOpen(false);
                        setIsCreatingProduct(false);
                      }}>
                        Cancel
                      </Button>
                      <Button 
                        onClick={handleAddProduct}
                        disabled={isCreatingProduct}
                      >
                        {isCreatingProduct ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Creating Product...
                          </>
                        ) : (
                          "Add Product"
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                {/* Enhanced Material Selector Dialog */}
                <Dialog open={showMaterialSelector} onOpenChange={(open) => {
                  setShowMaterialSelector(open);
                  if (!open) {
                    // Reset state when dialog closes
                    setSelectionStep("type");
                    setChosenType(null);
                    setMaterialSearchTerm("");
                    setSelectedCategory("all");
                    setSelectedSupplier("all");
                    setSelectedColor("all");
                    setSelectedLength("all");
                    setSelectedWidth("all");
                    setSelectedWeight("all");
                  }
                }}>
                  <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <Search className="w-5 h-5" />
                        Select Material or Product
                      </DialogTitle>
                      <DialogDescription>
                        {selectionStep === "type" 
                          ? "First, choose whether you want to add a Product or Raw Material to your recipe"
                          : `Now filter and select from available ${chosenType === "product" ? "Products" : "Raw Materials"}`
                        }
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-4">
                      {/* Step 1: Choose Type */}
                      {selectionStep === "type" && (
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Product Option */}
                            <div 
                              className="p-6 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
                              onClick={() => {
                                setChosenType("product");
                                setSelectionStep("filter");
                              }}
                            >
                              <div className="text-center">
                                <Package className="w-12 h-12 mx-auto mb-3 text-blue-600" />
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">Product</h3>
                                <p className="text-sm text-gray-600 mb-3">
                                  Select from existing products in your inventory
                                </p>
                                <div className="text-xs text-gray-500">
                                  Available: {availableProducts.length} products
                                </div>
                              </div>
                            </div>
                            
                            {/* Material Option */}
                            <div 
                              className="p-6 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-green-400 hover:bg-green-50 transition-colors"
                              onClick={() => {
                                setChosenType("material");
                                setSelectionStep("filter");
                              }}
                            >
                              <div className="text-center">
                                <Factory className="w-12 h-12 mx-auto mb-3 text-green-600" />
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">Raw Material</h3>
                                <p className="text-sm text-gray-600 mb-3">
                                  Select from raw materials in your inventory
                                </p>
                                <div className="text-xs text-gray-500">
                                  Available: {rawMaterials.length} materials
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Step 2: Filter and Select */}
                      {selectionStep === "filter" && (
                        <div className="space-y-4">
                          {/* Back Button */}
                          <div className="flex items-center gap-2">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => {
                                setSelectionStep("type");
                                setChosenType(null);
                                setMaterialSearchTerm("");
                                setSelectedCategory("all");
                                setSelectedSupplier("all");
                                setSelectedColor("all");
                                setSelectedLength("all");
                                setSelectedWidth("all");
                                setSelectedWeight("all");
                              }}
                            >
                              <ArrowRight className="w-4 h-4 mr-1 rotate-180" />
                              Back to Type Selection
                            </Button>
                            <Badge variant="outline" className="ml-2">
                              {chosenType === "product" ? "Products" : "Raw Materials"}
                            </Badge>
                          </div>
                          
                          {/* Search Bar */}
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <Input
                              placeholder={`Search ${chosenType === "product" ? "products" : "materials"} by name, category, or brand...`}
                              value={materialSearchTerm}
                              onChange={(e) => setMaterialSearchTerm(e.target.value)}
                              className="pl-10"
                            />
                          </div>
                          
                          {/* Type-specific Filters */}
                          {chosenType === "material" && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* Category Filter */}
                              <div>
                                <Label className="text-sm font-medium">Category</Label>
                                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="all">All Categories</SelectItem>
                                    {getUniqueCategories().map(category => (
                                      <SelectItem key={category} value={category}>{category}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              
                              {/* Supplier Filter */}
                              <div>
                                <Label className="text-sm font-medium">Supplier</Label>
                                <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="all">All Suppliers</SelectItem>
                                    {getUniqueSuppliers().map(supplier => (
                                      <SelectItem key={supplier} value={supplier}>{supplier}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          )}
                          
                          {chosenType === "product" && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              {/* Color Filter */}
                              <div>
                                <Label className="text-sm font-medium">Color</Label>
                                <Select value={selectedColor} onValueChange={setSelectedColor}>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="all">All Colors</SelectItem>
                                    {getUniqueProductColors().map(color => (
                                      <SelectItem key={color} value={color}>{color}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              
                              {/* Length Filter */}
                              <div>
                                <Label className="text-sm font-medium">Length</Label>
                                <Select value={selectedLength} onValueChange={setSelectedLength}>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="all">All Lengths</SelectItem>
                                    {getUniqueProductLengths().map(length => (
                                      <SelectItem key={length} value={length}>{length}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              
                              {/* Width Filter */}
                              <div>
                                <Label className="text-sm font-medium">Width</Label>
                                <Select value={selectedWidth} onValueChange={setSelectedWidth}>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="all">All Widths</SelectItem>
                                    {getUniqueProductWidths().map(width => (
                                      <SelectItem key={width} value={width}>{width}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              
                              {/* Weight Filter */}
                              <div>
                                <Label className="text-sm font-medium">Weight</Label>
                                <Select value={selectedWeight} onValueChange={setSelectedWeight}>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="all">All Weights</SelectItem>
                                    {getUniqueProductWeights().map(weight => (
                                      <SelectItem key={weight} value={weight}>{weight}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          )}
                          
                          {/* Selected Material Display */}
                          {newMaterial.materialId && (
                            <div className="p-4 bg-green-50 border-2 border-green-300 rounded-lg">
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <CheckCircle className="w-5 h-5 text-green-600" />
                                    <span className="font-semibold text-green-900">Selected: {newMaterial.materialName}</span>
                                  </div>
                                  <div className="text-sm text-green-700">
                                    {rawMaterials.find(m => m.id === newMaterial.materialId) ? 'Raw Material' : 'Product'}
                                    {newMaterial.quantity && (
                                      <span className="ml-2">• Quantity: {newMaterial.quantity} {newMaterial.unit}</span>
                                    )}
                                  </div>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setNewMaterial({
                                    materialId: "",
                                    materialName: "",
                                    quantity: "",
                                    unit: "",
                                    cost: "",
                                    selectedQuantity: 0
                                  })}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          )}

                          {/* Results */}
                          <div className="max-h-96 overflow-y-auto">
                            {getFilteredMaterials().length > 0 ? (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {getFilteredMaterials().map((material) => {
                                  // Debug: log material data to see what fields are available
                                  console.log('🔍 Material data for display:', material);
                                  
                                  // Get stock value - use individual count for products, current_stock for materials
                                  const stockValue = material.type === 'product' 
                                    ? (material.individual_count || 0) // Use individual product count
                                    : (material.current_stock || 0); // Use current stock for raw materials
                                  
                                  // Check if this material is currently selected
                                  const isSelected = newMaterial.materialId === material.id;
                                  
                                  return (
                                    <div
                                      key={material.id}
                                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 hover:shadow-md ${
                                        isSelected
                                          ? 'border-green-500 bg-green-100 ring-2 ring-green-300'
                                          : material.type === 'product' 
                                            ? 'border-blue-200 bg-blue-50 hover:border-blue-300 hover:bg-blue-100' 
                                            : 'border-green-200 bg-green-50 hover:border-green-300 hover:bg-green-100'
                                      }`}
                                      onClick={() => handleEnhancedMaterialSelection(material)}
                                    >
                                      <div className="space-y-3">
                                        <div className="flex items-center gap-3">
                                          <div className={`p-2 rounded-lg ${
                                            material.type === 'product' ? 'bg-blue-100' : 'bg-green-100'
                                          }`}>
                                            {material.type === 'product' ? (
                                              <Package className="w-5 h-5 text-blue-600" />
                                            ) : (
                                              <Factory className="w-5 h-5 text-green-600" />
                                            )}
                                          </div>
                                          <div className="flex-1">
                                            <h3 className="font-semibold text-gray-900 text-sm">{material.name}</h3>
                                            <Badge 
                                              variant={material.type === 'product' ? 'default' : 'secondary'}
                                              className="text-xs mt-1"
                                            >
                                              {material.type === 'product' ? 'Product' : 'Raw Material'}
                                            </Badge>
                                          </div>
                                        </div>
                                        
                                        <div className="text-xs text-gray-600 space-y-1">
                                          <div><span className="font-medium">Category:</span> {material.category || 'N/A'}</div>
                                          <div><span className="font-medium">Unit:</span> {material.unit || 'N/A'}</div>
                                          {material.brand && <div><span className="font-medium">Brand:</span> {material.brand}</div>}
                                          {material.supplier_name && <div><span className="font-medium">Supplier:</span> {material.supplier_name}</div>}
                                          {chosenType === "product" && (
                                            <>
                                              {material.color && <div><span className="font-medium">Color:</span> {material.color}</div>}
                                              {material.length && <div><span className="font-medium">Length:</span> {material.length}</div>}
                                              {material.width && <div><span className="font-medium">Width:</span> {material.width}</div>}
                                              {material.weight && <div><span className="font-medium">Weight:</span> {material.weight}</div>}
                                            </>
                                          )}
                                        </div>
                                        
                                        <div className="pt-2 border-t border-gray-200">
                                          <div className="flex items-center justify-between">
                                            <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                                              stockValue >= 1
                                                ? 'bg-green-100 text-green-800'
                                                : 'bg-red-100 text-red-800'
                                            }`}>
                                              Stock: {stockValue} {material.unit}
                                            </div>
                                            <div className="text-xs font-medium">
                                              {stockValue >= 1 ? (
                                                <span className="text-green-600">✓ Available</span>
                                              ) : (
                                                <span className="text-red-600">⚠ Out of Stock</span>
                                              )}
                                            </div>
                                          </div>
                                          {material.costPerUnit && (
                                            <div className="text-xs text-gray-600 mt-1">
                                              Cost: ₹{material.costPerUnit}/{material.unit}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="p-8 text-center text-gray-500">
                                <Search className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                                <p className="text-lg font-medium mb-2">No {chosenType === "product" ? "products" : "materials"} found</p>
                                <p className="text-sm">Try adjusting your search terms or filters</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <DialogFooter>
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          setShowMaterialSelector(false);
                          // Reset filters when closing
                          setSelectionStep("type");
                          setChosenType(null);
                          setMaterialSearchTerm("");
                          setSelectedCategory("all");
                          setSelectedSupplier("all");
                          setSelectedColor("all");
                          setSelectedLength("all");
                          setSelectedWidth("all");
                          setSelectedWeight("all");
                        }}
                      >
                        {newMaterial.materialId ? 'Done' : 'Cancel'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </div>

          <TabsContent value="inventory" className="space-y-4 sm:space-y-6">
            {/* Overview Cards */}
            <div className="grid gap-4 sm:gap-6 grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Products</CardTitle>
                  <Package className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalProducts}</div>
                  <p className="text-xs text-muted-foreground">
                    Different product types
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Low Stock Alerts</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-warning" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-warning">{lowStockCount}</div>
                  <p className="text-xs text-muted-foreground">
                    Need attention
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Available Pieces</CardTitle>
                  <QrCode className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{(products || []).reduce((sum, p) => sum + getAvailablePieces(p?.id || ''), 0)}</div>
                  <p className="text-xs text-muted-foreground">
                    Ready for sale
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Products Table */}
            <Card>
              <CardHeader>
                <CardTitle>Product Inventory</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-4 font-medium text-muted-foreground">Product</th>
                        <th className="text-left p-4 font-medium text-muted-foreground">QR Code</th>
                        <th className="text-left p-4 font-medium text-muted-foreground">Category</th>
                        <th className="text-left p-4 font-medium text-muted-foreground">Stock</th>
                        <th className="text-left p-4 font-medium text-muted-foreground">Status</th>
                        <th className="text-left p-4 font-medium text-muted-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProducts.map((product, index) => (
                        <tr key={product?.id || `product-${index}`} className="border-b hover:bg-muted/50">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                                {product.imageUrl ? (
                                  <img 
                                    src={product.imageUrl} 
                                    alt={product.name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center bg-muted">
                                    <Image className="w-6 h-6 text-muted-foreground" />
                                  </div>
                                )}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-foreground">{product.name || 'Unnamed Product'}</span>
                                  {productsWithRecipes.has(product.id) && (
                                    <Badge variant="secondary" className="text-xs">
                                      📋 Recipe
                                    </Badge>
                                  )}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {product.color || 'Unknown'} • {product.pattern || 'Unknown'}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              {product.qrCode ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleShowProductQR(product)}
                                >
                                  <QrCode className="w-4 h-4" />
                                </Button>
                              ) : (
                                <span className="text-muted-foreground text-sm">No QR Code</span>
                              )}
                            </div>
                          </td>
                          <td className="p-4">
                            <Badge variant="outline">{product.category || 'Unknown'}</Badge>
                          </td>
                          <td className="p-4">
                            <div className="space-y-1">
                              <div className="font-medium text-foreground">
                                {getAvailablePieces(product.id || '')} Products
                              </div>
                              {(() => {
                                // Calculate total SQM for all products
                                const quantity = getAvailablePieces(product.id || '');
                                const perProductSQM = calculateSQM(
                                  product.length || '0',
                                  product.width || '0',
                                  product.lengthUnit || 'feet',
                                  product.widthUnit || 'feet'
                                );
                                const totalSQM = quantity * perProductSQM;

                                return (
                                  <div className="text-xs text-muted-foreground">
                                    Total: {totalSQM.toFixed(4)} SQM
                                  </div>
                                );
                              })()}
                              {(() => {
                                const breakdown = getIndividualProductBreakdown(product.id || '');
                                if (breakdown) {
                                  return (
                                    <div className="text-xs text-muted-foreground">
                                      Total: {breakdown.total} • Available: {breakdown.available} • Sold: {breakdown.sold} • Damaged: {breakdown.damaged}
                                    </div>
                                  );
                                } else if (getAvailablePieces(product.id || '') !== (product.quantity || 0)) {
                                  return (
                                <div className="text-xs text-muted-foreground">
                                  Total Products: {product.quantity || 0}
                                </div>
                                  );
                                }
                                return null;
                              })()}
                            </div>
                          </td>
                          <td className="p-4">
                            <Badge className={statusStyles[product.actual_status || 'in-stock']}>
                              {(product.actual_status || 'in-stock').replace("-", " ")}
                            </Badge>
                          </td>
                          <td className="p-4">
                            <div className="flex gap-2">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => navigate(`/product/${product.id}`)}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              {hasIndividualStock(product.id) && (
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => navigate(`/product-stock/${product.id}`)}
                              >
                                <Hash className="w-4 h-4" />
                              </Button>
                              )}
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleEditProduct(product)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={async () => await handleDuplicateProduct(product)}
                                className="border-green-500 text-green-600 hover:bg-green-50"
                                title="Duplicate Product"
                                disabled={isDuplicatingProduct === product.id}
                              >
                                {isDuplicatingProduct === product.id ? (
                                  <RefreshCw className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Copy className="w-4 h-4" />
                                )}
                              </Button>
                              {hasIndividualStock(product.id) && (
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={async () => await handleAddToProduction(product)}
                                className="border-blue-500 text-blue-600 hover:bg-blue-50"
                                disabled={isAddingToProduction === product.id}
                              >
                                {isAddingToProduction === product.id ? (
                                  <RefreshCw className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Play className="w-4 h-4" />
                                )}
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4 sm:space-y-6">
            {/* Analytics Dashboard */}
            <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
              {/* Stock Level Distribution */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Stock Distribution</CardTitle>
                  <Package className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>In Stock</span>
                      <span className="font-medium">{products.filter(p => getAvailablePieces(p?.id || '') > 5).length}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Low Stock</span>
                      <span className="font-medium text-warning">{products.filter(p => {
                        const stock = getAvailablePieces(p?.id || '');
                        return stock > 0 && stock <= 5;
                      }).length}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Out of Stock</span>
                      <span className="font-medium text-destructive">{products.filter(p => getAvailablePieces(p?.id || '') === 0).length}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Category Breakdown */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">By Category</CardTitle>
                  <Package className="h-4 w-4 text-success" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {dynamicCategories.slice(0, 3).map(category => {
                      const count = products.filter(p => p?.category === category).length;
                      return (
                        <div key={category} className="flex justify-between text-sm">
                          <span className="truncate">{category}</span>
                          <span className="font-medium">{count}</span>
                        </div>
                      );
                    })}
                    {dynamicCategories.length > 3 && (
                      <div className="text-xs text-muted-foreground">+{dynamicCategories.length - 3} more</div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Value Analytics */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Value Metrics</CardTitle>
                  <Package className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Avg. Price</span>
                      <span className="font-medium">On Request</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Highest Value</span>
                      <span className="font-medium">On Request</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Total Pieces</span>
                      <span className="font-medium">{products.reduce((sum, p) => sum + getAvailablePieces(p?.id || ''), 0)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Stock Alerts */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Stock Alerts</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-warning" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Need Reorder</span>
                      <span className="font-medium text-warning">{products.filter(p => {
                        const stock = getAvailablePieces(p?.id || '');
                        return stock > 0 && stock <= 5;
                      }).length}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Critical (≤2)</span>
                      <span className="font-medium text-destructive">{products.filter(p => {
                        const stock = getAvailablePieces(p?.id || '');
                        return stock > 0 && stock <= 2;
                      }).length}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Good Stock</span>
                      <span className="font-medium text-success">{products.filter(p => getAvailablePieces(p?.id || '') > 5).length}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Low Stock Products Table */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-warning" />
                  Products Requiring Attention
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-4 font-medium text-muted-foreground">Product</th>
                        <th className="text-left p-4 font-medium text-muted-foreground">Available Stock</th>
                        <th className="text-left p-4 font-medium text-muted-foreground">Status</th>
                        <th className="text-left p-4 font-medium text-muted-foreground">Value at Risk</th>
                        <th className="text-left p-4 font-medium text-muted-foreground">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {products
                        .filter(product => getAvailablePieces(product?.id || '') <= 5)
                        .sort((a, b) => getAvailablePieces(a?.id || '') - getAvailablePieces(b?.id || ''))
                        .map((product, index) => {
                          const availableStock = getAvailablePieces(product?.id || '');
                          const valueAtRisk = 0; // Pricing removed - will be calculated manually per order
                          return (
                            <tr key={product?.id || `low-stock-${index}`} className="border-b hover:bg-muted/50">
                              <td className="p-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded overflow-hidden bg-muted flex-shrink-0">
                                    {product?.imageUrl ? (
                                      <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center">
                                        <Package className="w-4 h-4 text-muted-foreground" />
                                      </div>
                                    )}
                                  </div>
                                  <div>
                                    <div className="font-medium">{product?.name}</div>
                                    <div className="text-sm text-muted-foreground">{product?.category}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="p-4">
                                <div className="font-medium">{availableStock} Products</div>
                                <div className="text-xs text-muted-foreground">
                                  {(availableStock * calculateSQM(
                                    product?.length || '0',
                                    product?.width || '0',
                                    product?.lengthUnit || 'feet',
                                    product?.widthUnit || 'feet'
                                  )).toFixed(4)} SQM
                                </div>
                              </td>
                              <td className="p-4">
                                <Badge className={`${
                                  availableStock === 0 ? 'bg-destructive text-destructive-foreground' :
                                  availableStock <= 2 ? 'bg-destructive text-destructive-foreground' :
                                  'bg-warning text-warning-foreground'
                                }`}>
                                  {availableStock === 0 ? 'Out of Stock' :
                                   availableStock <= 2 ? 'Critical' : 'Low Stock'}
                                </Badge>
                              </td>
                              <td className="p-4">
                                <div className="font-medium">₹{valueAtRisk.toLocaleString()}</div>
                              </td>
                              <td className="p-4">
                                {hasIndividualStock(product.id) ? (
                                <Button 
                                  size="sm" 
                                  onClick={async () => await handleAddToProduction(product)}
                                  className="bg-orange-600 hover:bg-orange-700"
                                  disabled={isAddingToProduction === product.id}
                                >
                                  {isAddingToProduction === product.id ? (
                                    <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
                                  ) : (
                                    <Factory className="w-4 h-4 mr-1" />
                                  )}
                                  {isAddingToProduction === product.id ? 'Adding...' : 'Produce'}
                                </Button>
                                ) : (
                                  <span className="text-sm text-muted-foreground">Bulk Product</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      {products.filter(product => getAvailablePieces(product?.id || '') <= 5).length === 0 && (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-muted-foreground">
                            <CheckCircle className="w-8 h-8 mx-auto mb-2 text-success" />
                            All products have adequate stock levels
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-6">
            {/* Notifications Section */}
            {notifications.length > 0 ? (
              <Card className="border-orange-200 bg-orange-50">
                 <CardHeader className="pb-3">
                   <div className="flex items-center justify-between">
                     <div className="flex items-center gap-2">
                       <Bell className="w-5 h-5 text-orange-600" />
                       <CardTitle className="text-orange-800">Production Requests & Alerts</CardTitle>
                       <Badge variant="destructive" className="ml-2">
                         {notifications.length}
                       </Badge>
                     </div>
                     <Button
                       variant="outline"
                       size="sm"
                       onClick={handleClearAllNotifications}
                       className="text-red-600 border-red-300 hover:bg-red-50"
                     >
                       Clear All
                     </Button>
                   </div>
                 </CardHeader>
                <CardContent className="space-y-3">
                  {notifications.map((notification) => (
                    <div key={notification.id} className="p-4 bg-white rounded-lg border border-orange-200">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Factory className="w-4 h-4 text-orange-600" />
                            <h4 className="font-semibold text-orange-800">{notification.title}</h4>
                            <Badge variant="outline" className="text-orange-600 border-orange-300">
                              {notification.priority}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-700 mb-2">{notification.message}</p>
                          {notification.relatedData && (
                            <div className="text-xs text-gray-500">
                              {notification.relatedData.productName && (
                                <div>Product: {notification.relatedData.productName}</div>
                              )}
                              {notification.relatedData.requiredQuantity && (
                                <div>Required: {notification.relatedData.requiredQuantity} products</div>
                              )}
                              {notification.relatedData.availableStock !== undefined && (
                                <div>Available: {notification.relatedData.availableStock} products</div>
                              )}
                              {notification.relatedData.shortfall && (
                                <div>Shortfall: {notification.relatedData.shortfall} products</div>
                              )}
                              {notification.relatedData.threshold && (
                                <div>Threshold: {notification.relatedData.threshold} units</div>
                              )}
                            </div>
                          )}
                          <div className="text-xs text-gray-400 mt-2">
                            <Clock className="w-3 h-3 inline mr-1" />
                            {new Date(notification.createdAt).toLocaleString()}
                          </div>
                        </div>
                        <div className="flex flex-col gap-2 ml-4">
                          {notification.type === 'production_request' || notification.type === 'low_stock' || notification.type === 'order_alert' ? (
                            notification.relatedData && hasIndividualStock(notification.relatedData.productId) ? (
                            <Button
                              size="sm"
                              className="bg-orange-600 hover:bg-orange-700"
                              onClick={async () => await handleAddToProductionFromNotification(notification)}
                              disabled={isAddingToProduction === notification.relatedData?.productId}
                            >
                              {isAddingToProduction === notification.relatedData?.productId ? (
                                <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                              ) : (
                                <ArrowRight className="w-3 h-3 mr-1" />
                              )}
                              {isAddingToProduction === notification.relatedData?.productId ? 'Adding...' : 'Add to Production'}
                            </Button>
                            ) : (
                              <span className="text-sm text-muted-foreground">Bulk Product</span>
                            )
                          ) : null}
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-orange-600 border-orange-300 hover:bg-orange-50"
                            onClick={() => handleMarkAsRead(notification.id)}
                          >
                            Mark as Read
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-600 hover:bg-red-50"
                            onClick={() => handleResolveNotification(notification.id)}
                          >
                            Dismiss
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <CheckCircle className="w-12 h-12 mx-auto mb-4 text-success" />
                  <h3 className="text-lg font-semibold mb-2">All Caught Up!</h3>
                  <p className="text-muted-foreground">No pending notifications or production requests.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </div>
        </Tabs>

        {/* Duplicate Product Dialog */}
        <Dialog open={isDuplicateProductOpen} onOpenChange={(open) => {
          setIsDuplicateProductOpen(open);
          if (!open) {
            // Reset image states when dialog closes
            setDuplicateSelectedImage(null);
          }
        }}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Duplicate Product</DialogTitle>
              <DialogDescription>
                Edit the product details and save as a new product.
              </DialogDescription>
            </DialogHeader>
            
            {duplicateProduct && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="duplicate-name">Product Name *</Label>
                    <Input
                      id="duplicate-name"
                      value={duplicateProduct.name}
                      onChange={(e) => setDuplicateProduct({...duplicateProduct, name: e.target.value})}
                      placeholder="Enter product name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="duplicate-category">Category *</Label>
                    <Select
                      value={duplicateProduct.category}
                      onValueChange={(value) => setDuplicateProduct({...duplicateProduct, category: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="N/A" className="text-gray-500 italic">
                          N/A (No Category)
                        </SelectItem>
                        {dropdownOptions.categories.map(opt => opt.value).map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="duplicate-subcategory">Subcategory</Label>
                    <Select
                      value={duplicateProduct.subcategory || 'N/A'}
                      onValueChange={(value) => setDuplicateProduct({...duplicateProduct, subcategory: value === 'N/A' ? '' : value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select subcategory (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="N/A" className="text-gray-500 italic">
                          None (No Subcategory)
                        </SelectItem>
                        {dropdownOptions.subcategories.map(opt => opt.value).map((subcategory) => (
                          <SelectItem key={subcategory} value={subcategory}>
                            {subcategory}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="duplicate-unit">Unit *</Label>
                    <Select
                      value={duplicateProduct.unit}
                      onValueChange={(value) => setDuplicateProduct({...duplicateProduct, unit: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select unit" />
                      </SelectTrigger>
                      <SelectContent>
                        {getFilteredUnits().map((unit) => (
                          <SelectItem key={unit} value={unit}>
                            {unit}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="duplicate-color">Color</Label>
                    <Select
                      value={duplicateProduct.color}
                      onValueChange={(value) => setDuplicateProduct({...duplicateProduct, color: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select color" />
                      </SelectTrigger>
                      <SelectContent>
                        {getFilteredColors().map((color) => (
                          <SelectItem key={color} value={color}>
                            {color}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="duplicate-pattern">Pattern</Label>
                    <Select
                      value={duplicateProduct.pattern}
                      onValueChange={(value) => setDuplicateProduct({...duplicateProduct, pattern: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select pattern" />
                      </SelectTrigger>
                      <SelectContent>
                        {dropdownOptions.patterns.map(opt => opt.value).map((pattern) => (
                          <SelectItem key={pattern} value={pattern}>
                            {pattern === "NA" ? (
                              <span className="text-gray-500 italic">NA (No Pattern)</span>
                            ) : (
                              pattern
                            )}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Weight - Full Width */}
                <div>
                  <Label htmlFor="duplicate-weight">Weight</Label>
                  <Select
                    value={duplicateProduct.weight}
                    onValueChange={(value) => setDuplicateProduct({...duplicateProduct, weight: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select weight" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="N/A" className="text-gray-500 italic">
                        N/A (No Weight)
                      </SelectItem>
                      {getFilteredWeights().map(weight => (
                        <SelectItem key={weight} value={weight}>
                          {weight}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Length and Width */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="duplicate-length">Length</Label>
                    <Input
                      id="duplicate-length"
                      value={duplicateProduct.length}
                      onChange={(e) => setDuplicateProduct({...duplicateProduct, length: e.target.value})}
                      placeholder="Enter length (e.g., 2.74m)"
                    />
                  </div>
                  <div>
                    <Label htmlFor="duplicate-width">Width</Label>
                    <Input
                      id="duplicate-width"
                      value={duplicateProduct.width}
                      onChange={(e) => setDuplicateProduct({...duplicateProduct, width: e.target.value})}
                      placeholder="Enter width (e.g., 1.83m)"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="duplicate-notes">Notes</Label>
                  <Textarea
                    id="duplicate-notes"
                    value={duplicateProduct.notes}
                    onChange={(e) => setDuplicateProduct({...duplicateProduct, notes: e.target.value})}
                    placeholder="Enter product notes"
                    rows={3}
                  />
                </div>

                {/* Image Upload */}
                <div>
                  <Label>Product Image (Optional)</Label>
                  <div className="mt-2">
                    {duplicateProduct.imageUrl ? (
                      <div className="relative inline-block">
                        <img
                          src={duplicateProduct.imageUrl}
                          alt="Product preview"
                          className="w-32 h-32 object-cover rounded-lg border"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="absolute top-2 right-2"
                          onClick={() => {
                            setDuplicateProduct({...duplicateProduct, imageUrl: ''});
                            setDuplicateSelectedImage(null);
                          }}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <div
                        className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 text-center hover:border-muted-foreground/50 transition-colors cursor-pointer"
                        onClick={() => document.getElementById('duplicate-product-image')?.click()}
                      >
                        <Image className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground mb-2">Click to upload product image</p>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            document.getElementById('duplicate-product-image')?.click();
                          }}
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          Choose Image
                        </Button>
                        <input
                          id="duplicate-product-image"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              // Validate file type
                              if (!file.type.startsWith('image/')) {
                                toast({
                                  title: "Invalid File",
                                  description: "Please select a valid image file",
                                  variant: "destructive"
                                });
                                return;
                              }
                              
                              // Validate file size (max 5MB)
                              if (file.size > 5 * 1024 * 1024) {
                                toast({
                                  title: "File Too Large",
                                  description: "Image size should be less than 5MB",
                                  variant: "destructive"
                                });
                                return;
                              }
                              
                              // Store file for later upload (when user clicks save)
                              setDuplicateSelectedImage(file);
                              
                              // Create preview (data URL for display)
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                setDuplicateProduct({...duplicateProduct, imageUrl: reader.result as string});
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Recipe Section */}
                <div className="space-y-3 border-t pt-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-semibold">Recipe / Materials</Label>
                  </div>

                  {/* Recipe Materials List */}
                  {duplicateProductMaterials && duplicateProductMaterials.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Recipe Materials:</Label>
                      {duplicateProductMaterials.map((material: any, index: number) => (
                        <div key={index} className="flex items-center justify-between bg-blue-50 p-3 rounded-lg">
                          <div className="flex-1">
                            <div className="font-medium">{material.materialName}</div>
                            <div className="text-sm text-gray-600">
                              {material.quantity} {material.unit}
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removeDuplicateProductMaterial(index)}
                            className="text-red-500 hover:text-red-700"
                          >
                            Remove
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* No Recipe Message */}
                  {(!duplicateProductMaterials || duplicateProductMaterials.length === 0) && (
                    <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-blue-600" />
                        <span className="text-sm text-blue-800 font-medium">No Recipe Added</span>
                      </div>
                      <p className="text-sm text-blue-700 mt-1">
                        You can create the product without a recipe and add it later when editing the product.
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="generate-individual-products"
                    checked={duplicateProduct.individualStockTracking || false}
                    onChange={(e) => setDuplicateProduct({...duplicateProduct, individualStockTracking: e.target.checked})}
                    className="rounded border-gray-300"
                  />
                  <Label htmlFor="generate-individual-products" className="text-sm">
                    Generate individual product details for each piece (Recommended for carpets)
                  </Label>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setIsDuplicateProductOpen(false);
                setDuplicateProductMaterials([]);
              }}>
                Cancel
              </Button>
              <Button 
                onClick={handleSaveDuplicateProduct}
                disabled={isDuplicatingProduct !== null}
              >
                {isDuplicatingProduct ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Save as New Product'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Product Dialog */}
        <Dialog open={isEditProductOpen} onOpenChange={(open) => {
          setIsEditProductOpen(open);
          if (!open) {
            // Reset image states when dialog closes
            setSelectedImage(null);
            setImagePreview("");
            setImageUrl("");
          }
        }}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Product</DialogTitle>
              <DialogDescription>
                Update the product details and recipe.
              </DialogDescription>
            </DialogHeader>
            
            {selectedProduct && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="edit-name">Product Name *</Label>
                  <Input
                    id="edit-name"
                    value={selectedProduct.name}
                    onChange={(e) => setSelectedProduct({...selectedProduct, name: e.target.value})}
                    placeholder="e.g., Traditional Persian Carpet"
                    required
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  {/* Category Dropdown */}
                  <div>
                    <Label htmlFor="edit-category">Category *</Label>
                    {showAddCategory ? (
                      <div className="flex gap-2">
                        <Input
                          placeholder="Enter new category"
                          value={newCategoryInput}
                          onChange={(e) => setNewCategoryInput(e.target.value)}
                        />
                        <Button size="sm" onClick={addNewCategory}>Add</Button>
                        <Button size="sm" variant="outline" onClick={() => setShowAddCategory(false)}>Cancel</Button>
                      </div>
                    ) : (
                      <Select value={selectedProduct.category} onValueChange={(value) => {
                        if (value === "add_new") {
                          setShowAddCategory(true);
                        } else {
                          // Auto-set color to NA for Plain Carpet
                          if (value === "Plain Carpet") {
                            setSelectedProduct({...selectedProduct, category: value, color: "NA"});
                          } else {
                            setSelectedProduct({...selectedProduct, category: value});
                          }
                        }
                      }}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="N/A" className="text-gray-500 italic">
                            N/A (No Category)
                          </SelectItem>
                          {dropdownOptions.categories.map(opt => opt.value).map(category => (
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
                            + Add New Category
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  {/* Subcategory Dropdown */}
                  <div>
                    <Label htmlFor="edit-subcategory">Subcategory</Label>
                    {showAddSubcategory ? (
                      <div className="flex gap-2">
                        <Input
                          placeholder="Enter new subcategory"
                          value={newSubcategoryInput}
                          onChange={(e) => setNewSubcategoryInput(e.target.value)}
                        />
                        <Button size="sm" onClick={addNewSubcategory}>Add</Button>
                        <Button size="sm" variant="outline" onClick={() => setShowAddSubcategory(false)}>Cancel</Button>
                      </div>
                    ) : (
                      <Select value={selectedProduct.subcategory || 'N/A'} onValueChange={(value) => {
                        if (value === "add_new") {
                          setShowAddSubcategory(true);
                        } else {
                          setSelectedProduct({...selectedProduct, subcategory: value === 'N/A' ? '' : value});
                        }
                      }}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select subcategory (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="N/A" className="text-gray-500 italic">
                            N/A (No Subcategory)
                          </SelectItem>
                          {dropdownOptions.subcategories.map(opt => opt.value).map(subcategory => (
                            <div key={subcategory} className="flex items-center justify-between px-2 py-1.5 hover:bg-accent rounded-sm">
                              <SelectItem value={subcategory} className="flex-1 p-0 h-auto">
                                {subcategory}
                              </SelectItem>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteSubcategory(subcategory);
                                }}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                          <SelectItem value="add_new" className="text-blue-600 font-medium">
                            + Add New Subcategory
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Color Dropdown */}
                  <div>
                    <Label htmlFor="edit-color">Color</Label>
                    {showAddColor ? (
                      <div className="flex gap-2">
                        <Input
                          placeholder="Enter new color"
                          value={newColorInput}
                          onChange={(e) => setNewColorInput(e.target.value)}
                        />
                        <Button size="sm" onClick={addNewColor}>Add</Button>
                        <Button size="sm" variant="outline" onClick={() => setShowAddColor(false)}>Cancel</Button>
                      </div>
                    ) : (
                      <Select value={selectedProduct.color} onValueChange={(value) => {
                        if (value === "add_new") {
                          setShowAddColor(true);
                        } else {
                          setSelectedProduct({...selectedProduct, color: value});
                          setColorSearchTerm(""); // Clear search when color is selected
                        }
                      }}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select color" />
                        </SelectTrigger>
                        <SelectContent>
                          {/* Search Input */}
                          <div className="p-2 border-b">
                            <Input
                              placeholder="Search colors..."
                              value={colorSearchTerm}
                              onChange={(e) => setColorSearchTerm(e.target.value)}
                              className="h-8"
                            />
                          </div>
                          
                          {/* Add New Color Option - Always at top */}
                          <SelectItem value="add_new" className="text-blue-600 font-medium">
                            + Add New Color
                          </SelectItem>
                          
                          {/* Color Options */}
                          {getFilteredColors().map(color => (
                            <div key={color} className="flex items-center justify-between px-2 py-1.5 hover:bg-accent rounded-sm">
                              <SelectItem value={color} className="flex-1 p-0 h-auto">
                                {color === "NA" ? (
                                  <span className="text-gray-500 italic">NA (No Color)</span>
                                ) : (
                                  color
                                )}
                              </SelectItem>
                              {color !== "NA" && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteColor(color);
                                  }}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          ))}
                          
                          {/* Show message if no colors found */}
                          {getFilteredColors().length === 0 && (
                            <div className="p-2 text-sm text-gray-500 text-center">
                              No colors found matching "{colorSearchTerm}"
                            </div>
                          )}
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  {/* Pattern Dropdown */}
                  <div>
                    <Label htmlFor="edit-pattern">Pattern</Label>
                    {showAddPattern ? (
                      <div className="flex gap-2">
                        <Input
                          placeholder="Enter new pattern"
                          value={newPatternInput}
                          onChange={(e) => setNewPatternInput(e.target.value)}
                        />
                        <Button size="sm" onClick={addNewPattern}>Add</Button>
                        <Button size="sm" variant="outline" onClick={() => setShowAddPattern(false)}>Cancel</Button>
                      </div>
                    ) : (
                      <Select value={selectedProduct.pattern} onValueChange={(value) => {
                        if (value === "add_new") {
                          setShowAddPattern(true);
                        } else {
                          setSelectedProduct({...selectedProduct, pattern: value});
                        }
                      }}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select pattern" />
                        </SelectTrigger>
                        <SelectContent>
                          {/* Add New Pattern Option - Always at top */}
                          <SelectItem value="add_new" className="text-blue-600 font-medium">
                            + Add New Pattern
                          </SelectItem>
                          
                          {/* Pattern Options */}
                          {dropdownOptions.patterns.map(opt => opt.value).map(pattern => (
                            <div key={pattern} className="flex items-center justify-between px-2 py-1.5 hover:bg-accent rounded-sm">
                              <SelectItem value={pattern} className="flex-1 p-0 h-auto">
                                {pattern === "NA" ? (
                                  <span className="text-gray-500 italic">NA (No Pattern)</span>
                                ) : (
                                  pattern
                                )}
                              </SelectItem>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deletePattern(pattern);
                                }}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Base Quantity Field - Read Only */}
                  <div>
                    <Label htmlFor="edit-quantity">Base Quantity</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="edit-quantity"
                        type="number"
                        value={selectedProduct.baseQuantity || selectedProduct.quantity || 0}
                        readOnly
                        disabled
                        className="bg-gray-100 cursor-not-allowed"
                      />
                      <span className="text-sm text-muted-foreground">(Read Only)</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Quantity cannot be edited. Use inventory management to update stock.
                    </p>
                  </div>
                  
                  {/* Unit Dropdown */}
                  <div>
                    <Label htmlFor="edit-unit">Unit *</Label>
                    {showAddUnit ? (
                      <div className="flex gap-2">
                        <Input
                          placeholder="Enter new unit (e.g., bundles)"
                          value={newUnitInput}
                          onChange={(e) => setNewUnitInput(e.target.value)}
                        />
                        <Button size="sm" onClick={addNewUnit}>Add</Button>
                        <Button size="sm" variant="outline" onClick={() => setShowAddUnit(false)}>Cancel</Button>
                      </div>
                    ) : (
                      <Select value={selectedProduct.unit} onValueChange={(value) => {
                        if (value === "add_new") {
                          setShowAddUnit(true);
                        } else {
                          setSelectedProduct({...selectedProduct, unit: value});
                          setUnitSearchTerm(""); // Clear search when unit is selected
                        }
                      }}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select unit" />
                        </SelectTrigger>
                        <SelectContent>
                          {/* Search Input */}
                          <div className="p-2 border-b">
                            <Input
                              placeholder="Search units..."
                              value={unitSearchTerm}
                              onChange={(e) => setUnitSearchTerm(e.target.value)}
                              className="h-8"
                            />
                          </div>
                          
                          {/* Add New Unit Option - Always at top */}
                          <SelectItem value="add_new" className="text-blue-600 font-medium">
                            + Add New Unit
                          </SelectItem>
                          
                          {/* Unit Options */}
                          {getFilteredUnits().map(unit => (
                            <div key={unit} className="flex items-center justify-between px-2 py-1.5 hover:bg-accent rounded-sm">
                              <SelectItem value={unit} className="flex-1 p-0 h-auto">
                                {unit}
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
                          
                          {/* Show message if no units found */}
                          {getFilteredUnits().length === 0 && (
                            <div className="p-2 text-sm text-gray-500 text-center">
                              No units found matching "{unitSearchTerm}"
                            </div>
                          )}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>

                {/* Individual Stock Tracking Option - Read Only */}
                <div className="mb-4">
                  <Label className="text-sm font-medium mb-2 block">Individual Stock Tracking</Label>
                  <div className="flex gap-4">
                    <label className="flex items-center space-x-2 cursor-not-allowed opacity-70">
                      <input
                        type="radio"
                        name="edit-individualStockTracking"
                        value="yes"
                        checked={selectedProduct.individualStockTracking === true}
                        disabled
                        readOnly
                        className="text-blue-600 cursor-not-allowed"
                      />
                      <span className="text-sm">Yes, track individual pieces (with QR codes)</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-not-allowed opacity-70">
                      <input
                        type="radio"
                        name="edit-individualStockTracking"
                        value="no"
                        checked={selectedProduct.individualStockTracking === false}
                        disabled
                        readOnly
                        className="text-blue-600 cursor-not-allowed"
                      />
                      <span className="text-sm">No, bulk tracking only (no QR codes)</span>
                    </label>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Individual stock tracking cannot be changed after product creation. Current setting: <strong>{selectedProduct.individualStockTracking ? "Individual tracking enabled" : "Bulk tracking enabled"}</strong>
                  </div>
                </div>

                {/* Length and Width Dropdowns */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-length">Length *</Label>
                    <p className="text-xs text-gray-500 mb-2">Required for SQM calculation</p>
                    {selectedProduct.length && selectedProduct.width && selectedProduct.lengthUnit && selectedProduct.widthUnit && (
                      <div className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded mb-2">
                        📐 SQM: {calculateSQM(selectedProduct.length, selectedProduct.width, selectedProduct.lengthUnit, selectedProduct.widthUnit).toFixed(4)} m²
                        <br />
                        <span className="text-gray-600">
                          {selectedProduct.length}{selectedProduct.lengthUnit} {getConversionDisplay(selectedProduct.length, selectedProduct.lengthUnit)} × {selectedProduct.width}{selectedProduct.widthUnit} {getConversionDisplay(selectedProduct.width, selectedProduct.widthUnit)}
                        </span>
                      </div>
                    )}
                    {showAddLength ? (
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <Input
                            placeholder="Enter length value (e.g., 5)"
                            value={newLengthInput}
                            onChange={(e) => {
                              const value = e.target.value;
                              if (/^\d*\.?\d*$/.test(value)) {
                                setNewLengthInput(value);
                              }
                            }}
                            className="flex-1"
                          />
                          {/* Unit dropdown - select from existing units or add new */}
                          <Select
                            value={selectedProduct.lengthUnit || ""}
                            onValueChange={(value) => {
                              if (value === "add_new_unit") {
                                setCurrentUnitType('length');
                                setCurrentUnitPlaceholder("e.g., feet, m, cm, inch");
                                setNewUnitNameInput("");
                                setIsAddUnitDialogOpen(true);
                              } else {
                                setSelectedProduct({...selectedProduct, lengthUnit: value || ""});
                              }
                            }}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue placeholder="Select unit *" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="add_new_unit" className="text-blue-600 font-medium">
                                + Add New Unit
                              </SelectItem>
                              {lengthUnits.length > 0 ? (
                                lengthUnits.map(unit => (
                                  <SelectItem key={unit} value={unit}>
                                    {unit}
                                  </SelectItem>
                                ))
                              ) : (
                                <div className="p-2 text-sm text-gray-500 text-center">
                                  No units available
                                </div>
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={async () => {
                            if (newLengthInput.trim() && selectedProduct.lengthUnit) {
                              const combinedValue = `${newLengthInput.trim()} ${selectedProduct.lengthUnit.trim()}`;
                              if (!lengthUnits.includes(selectedProduct.lengthUnit)) {
                                await addNewUnitToDatabase('length', selectedProduct.lengthUnit);
                                await loadDropdownOptions();
                              }
                              const result = await DropdownService.addOption('length', combinedValue);
                              if (result.success) {
                                await loadDropdownOptions();
                                setSelectedProduct({
                                  ...selectedProduct,
                                  length: newLengthInput.trim(),
                                  lengthUnit: selectedProduct.lengthUnit.trim()
                                });
                                setNewLengthInput("");
                                setShowAddLength(false);
                              }
                            }
                          }} disabled={!newLengthInput.trim() || !selectedProduct.lengthUnit}>
                            Add {newLengthInput || "value"} {selectedProduct.lengthUnit || "unit"}
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setShowAddLength(false)}>Cancel</Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <Select value={
                          (() => {
                            const combinedValue = selectedProduct.length && selectedProduct.lengthUnit 
                              ? `${selectedProduct.length} ${selectedProduct.lengthUnit}`.trim()
                              : selectedProduct.length || "";
                            
                            const exactMatch = getFilteredLengths().find(l => l === combinedValue);
                            if (exactMatch) return exactMatch;
                            
                            if (selectedProduct.length && selectedProduct.lengthUnit) {
                              const searchValue = `${selectedProduct.length} ${selectedProduct.lengthUnit}`.trim();
                              const found = getFilteredLengths().find(l => {
                                const parsed = parseValueWithUnit(l);
                                return parsed.value === selectedProduct.length && parsed.unit === selectedProduct.lengthUnit;
                              });
                              return found || searchValue;
                            }
                            
                            return combinedValue;
                          })()
                        } onValueChange={(value) => {
                          if (value === "add_new") {
                            setShowAddLength(true);
                          } else if (value === "N/A") {
                            setSelectedProduct({...selectedProduct, length: "", lengthUnit: ""});
                            setLengthSearchTerm("");
                          } else {
                            const parsed = parseValueWithUnit(value);
                            setSelectedProduct({
                              ...selectedProduct,
                              length: parsed.value || value,
                              lengthUnit: parsed.unit || ""
                            });
                            setLengthSearchTerm("");
                          }
                        }}>
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Select length" />
                          </SelectTrigger>
                          <SelectContent>
                            {/* Search Input */}
                            <div className="p-2 border-b">
                              <Input
                                placeholder="Search lengths..."
                                value={lengthSearchTerm}
                                onChange={(e) => setLengthSearchTerm(e.target.value)}
                                className="h-8"
                              />
                            </div>
                            
                            {/* Add New Length Option - Always at top */}
                            <SelectItem value="add_new" className="text-blue-600 font-medium">
                              + Add New Length
                            </SelectItem>
                            
                            <SelectItem value="N/A" className="text-gray-500 italic">
                              N/A (No Length)
                            </SelectItem>
                            
                            {/* Length Options - Show combined values with delete button */}
                            {getFilteredLengths().map(length => {
                              return (
                                <div key={length} className="flex items-center justify-between px-2 py-1.5 hover:bg-accent rounded-sm">
                                  <SelectItem value={length} className="flex-1 p-0 h-auto">
                                    {length}
                                  </SelectItem>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      deleteLength(length);
                                    }}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              );
                            })}
                            
                            {/* Show message if no lengths found */}
                            {getFilteredLengths().length === 0 && (
                              <div className="p-2 text-sm text-gray-500 text-center">
                                No lengths found matching "{lengthSearchTerm}"
                              </div>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="edit-width">Width *</Label>
                    <p className="text-xs text-gray-500 mb-2">Required for SQM calculation</p>
                    {showAddWidth ? (
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <Input
                            placeholder="Enter width value (e.g., 10)"
                            value={newWidthInput}
                            onChange={(e) => {
                              const value = e.target.value;
                              if (/^\d*\.?\d*$/.test(value)) {
                                setNewWidthInput(value);
                              }
                            }}
                            className="flex-1"
                          />
                          {/* Unit dropdown - select from existing units or add new */}
                          <Select
                            value={selectedProduct.widthUnit || ""}
                            onValueChange={(value) => {
                              if (value === "add_new_unit") {
                                setCurrentUnitType('width');
                                setCurrentUnitPlaceholder("e.g., feet, m, cm, inch");
                                setNewUnitNameInput("");
                                setIsAddUnitDialogOpen(true);
                              } else {
                                setSelectedProduct({...selectedProduct, widthUnit: value || ""});
                              }
                            }}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue placeholder="Select unit *" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="add_new_unit" className="text-blue-600 font-medium">
                                + Add New Unit
                              </SelectItem>
                              {widthUnits.length > 0 ? (
                                widthUnits.map(unit => (
                                  <SelectItem key={unit} value={unit}>
                                    {unit}
                                  </SelectItem>
                                ))
                              ) : (
                                <div className="p-2 text-sm text-gray-500 text-center">
                                  No units available
                                </div>
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={async () => {
                            if (newWidthInput.trim() && selectedProduct.widthUnit) {
                              const combinedValue = `${newWidthInput.trim()} ${selectedProduct.widthUnit.trim()}`;
                              if (!widthUnits.includes(selectedProduct.widthUnit)) {
                                await addNewUnitToDatabase('width', selectedProduct.widthUnit);
                                await loadDropdownOptions();
                              }
                              const result = await DropdownService.addOption('width', combinedValue);
                              if (result.success) {
                                await loadDropdownOptions();
                                setSelectedProduct({
                                  ...selectedProduct,
                                  width: newWidthInput.trim(),
                                  widthUnit: selectedProduct.widthUnit.trim()
                                });
                                setNewWidthInput("");
                                setShowAddWidth(false);
                              }
                            }
                          }} disabled={!newWidthInput.trim() || !selectedProduct.widthUnit}>
                            Add {newWidthInput || "value"} {selectedProduct.widthUnit || "unit"}
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setShowAddWidth(false)}>Cancel</Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <Select value={
                          (() => {
                            const combinedValue = selectedProduct.width && selectedProduct.widthUnit 
                              ? `${selectedProduct.width} ${selectedProduct.widthUnit}`.trim()
                              : selectedProduct.width || "";
                            
                            const exactMatch = getFilteredWidths().find(w => w === combinedValue);
                            if (exactMatch) return exactMatch;
                            
                            if (selectedProduct.width && selectedProduct.widthUnit) {
                              const searchValue = `${selectedProduct.width} ${selectedProduct.widthUnit}`.trim();
                              const found = getFilteredWidths().find(w => {
                                const parsed = parseValueWithUnit(w);
                                return parsed.value === selectedProduct.width && parsed.unit === selectedProduct.widthUnit;
                              });
                              return found || searchValue;
                            }
                            
                            return combinedValue;
                          })()
                        } onValueChange={(value) => {
                          if (value === "add_new") {
                            setShowAddWidth(true);
                          } else if (value === "N/A") {
                            setSelectedProduct({...selectedProduct, width: "", widthUnit: ""});
                            setWidthSearchTerm("");
                          } else {
                            const parsed = parseValueWithUnit(value);
                            setSelectedProduct({
                              ...selectedProduct,
                              width: parsed.value || value,
                              widthUnit: parsed.unit || ""
                            });
                            setWidthSearchTerm("");
                          }
                        }}>
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Select width" />
                          </SelectTrigger>
                          <SelectContent>
                            {/* Search Input */}
                            <div className="p-2 border-b">
                              <Input
                                placeholder="Search widths..."
                                value={widthSearchTerm}
                                onChange={(e) => setWidthSearchTerm(e.target.value)}
                                className="h-8"
                              />
                            </div>

                            {/* Add New Width Option - Always at top */}
                            <SelectItem value="add_new" className="text-blue-600 font-medium">
                              + Add New Width
                            </SelectItem>
                            
                            <SelectItem value="N/A" className="text-gray-500 italic">
                              N/A (No Width)
                            </SelectItem>
                            
                            {/* Width Options - Show combined values with delete button */}
                            {getFilteredWidths().map(width => {
                              return (
                                <div key={width} className="flex items-center justify-between px-2 py-1.5 hover:bg-accent rounded-sm">
                                  <SelectItem value={width} className="flex-1 p-0 h-auto">
                                    {width}
                                  </SelectItem>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      deleteWidth(width);
                                    }}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              );
                            })}
                            
                            {/* Show message if no widths found */}
                            {getFilteredWidths().length === 0 && (
                              <div className="p-2 text-sm text-gray-500 text-center">
                                No widths found matching "{widthSearchTerm}"
                              </div>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                </div>

                {/* Weight field - Full width */}
                <div>
                  <Label htmlFor="edit-weight">Weight *</Label>
                  {showAddWeight ? (
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <Input
                          placeholder="Enter weight value (e.g., 3)"
                          value={newWeightInput}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (/^\d*\.?\d*$/.test(value)) {
                              setNewWeightInput(value);
                            }
                          }}
                          className="flex-1"
                        />
                        {/* Unit dropdown - select from existing units or add new */}
                        <Select
                          value={selectedProduct.weightUnit || ""}
                          onValueChange={(value) => {
                            if (value === "add_new_unit") {
                              setCurrentUnitType('weight');
                              setCurrentUnitPlaceholder("e.g., GSM, kg, g, lb");
                              setNewUnitNameInput("");
                              setIsAddUnitDialogOpen(true);
                            } else {
                              setSelectedProduct({...selectedProduct, weightUnit: value || ""});
                            }
                          }}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue placeholder="Select unit *" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="add_new_unit" className="text-blue-600 font-medium">
                              + Add New Unit
                            </SelectItem>
                            {weightUnits.length > 0 ? (
                              weightUnits.map(unit => (
                                <SelectItem key={unit} value={unit}>
                                  {unit}
                                </SelectItem>
                              ))
                            ) : (
                              <div className="p-2 text-sm text-gray-500 text-center">
                                No units available
                              </div>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={async () => {
                          if (newWeightInput.trim() && selectedProduct.weightUnit) {
                            const combinedValue = `${newWeightInput.trim()} ${selectedProduct.weightUnit.trim()}`;
                            if (!weightUnits.includes(selectedProduct.weightUnit)) {
                              await addNewUnitToDatabase('weight', selectedProduct.weightUnit);
                              await loadDropdownOptions();
                            }
                            const result = await DropdownService.addOption('weight', combinedValue);
                            if (result.success) {
                              await loadDropdownOptions();
                              setSelectedProduct({
                                ...selectedProduct,
                                weight: newWeightInput.trim(),
                                weightUnit: selectedProduct.weightUnit
                              });
                              setNewWeightInput("");
                              setShowAddWeight(false);
                            }
                          }
                        }} disabled={!newWeightInput.trim() || !selectedProduct.weightUnit}>
                          Add {newWeightInput || "value"} {selectedProduct.weightUnit || "unit"}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setShowAddWeight(false)}>Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Select
                        value={selectedProduct.weight && selectedProduct.weightUnit ? `${selectedProduct.weight} ${selectedProduct.weightUnit}` : selectedProduct.weight || ""}
                        onValueChange={(value) => {
                          if (value === "add_new") {
                            setShowAddWeight(true);
                          } else if (value === "N/A") {
                            setSelectedProduct({...selectedProduct, weight: "", weightUnit: ""});
                            setWeightSearchTerm("");
                          } else {
                            const parsed = parseValueWithUnit(value);
                            setSelectedProduct({
                              ...selectedProduct,
                              weight: parsed.value || value,
                              weightUnit: parsed.unit || ""
                            });
                            setWeightSearchTerm("");
                          }
                        }}
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Select weight" />
                        </SelectTrigger>
                        <SelectContent>
                          {/* Search Input */}
                          <div className="p-2 border-b">
                            <Input
                              placeholder="Search weights..."
                              value={weightSearchTerm}
                              onChange={(e) => setWeightSearchTerm(e.target.value)}
                              className="h-8"
                            />
                          </div>

                          {/* Add New Weight Option - Always at top */}
                          <SelectItem value="add_new" className="text-blue-600 font-medium">
                            + Add New Weight
                          </SelectItem>

                          <SelectItem value="N/A" className="text-gray-500 italic">
                            N/A (No Weight)
                          </SelectItem>

                          {/* Weight Options - Show combined values (e.g., "600 GSM", "4 mm") */}
                          {getFilteredWeights().map(weight => {
                            return (
                              <div key={weight} className="flex items-center justify-between px-2 py-1.5 hover:bg-accent rounded-sm">
                                <SelectItem value={weight} className="flex-1 p-0 h-auto">
                                  {weight}
                                </SelectItem>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteWeight(weight);
                                  }}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            );
                          })}

                          {/* Show message if no weights found */}
                          {getFilteredWeights().length === 0 && (
                            <div className="p-2 text-sm text-gray-500 text-center">
                              No weights found matching "{weightSearchTerm}"
                            </div>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                <div>
                  <Label htmlFor="edit-notes">Notes</Label>
                  <Textarea
                    id="edit-notes"
                    value={selectedProduct.notes}
                    onChange={(e) => setSelectedProduct({...selectedProduct, notes: e.target.value})}
                    placeholder="Additional notes about the product..."
                    className="min-h-[60px]"
                  />
                </div>

                {/* Image Upload */}
                <div>
                  <Label>Product Image (Optional)</Label>
                  <div className="mt-2">
                    {(imageUrl || selectedProduct.imageUrl || imagePreview) ? (
                      <div className="relative">
                        <img 
                          src={imageUrl || selectedProduct.imageUrl || imagePreview} 
                          alt="Preview" 
                          className="w-32 h-32 object-cover rounded-lg border"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="absolute top-2 right-2"
                          onClick={async () => {
                            // Delete old image from R2 if it exists
                            const oldImageUrl = imageUrl || selectedProduct.imageUrl;
                            if (oldImageUrl && oldImageUrl.startsWith('http')) {
                              await deleteImageFromR2(oldImageUrl);
                            }
                            setSelectedImage(null);
                            setImagePreview("");
                            setImageUrl("");
                            setSelectedProduct({...selectedProduct, imageUrl: ''});
                          }}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <div 
                        className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 text-center hover:border-muted-foreground/50 transition-colors cursor-pointer"
                        onClick={() => document.getElementById('edit-product-image')?.click()}
                      >
                        <Image className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground mb-2">Click to upload product image</p>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            document.getElementById('edit-product-image')?.click();
                          }}
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          Choose Image
                        </Button>
                        <input
                          id="edit-product-image"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleImageUpload}
                          disabled={uploadingImage}
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Materials Section - Moved to Bottom */}
                <div className="border-t pt-4">
                  <div className="flex items-center justify-between mb-4">
                    <Label className="text-lg font-medium">Materials Used</Label>
                    <div className="text-sm text-muted-foreground bg-blue-50 px-3 py-1 rounded-lg">
                      💡 Materials added here will be saved as recipe for 1 SQM of this product
                    </div>
                  </div>
                  
                  {/* Recipe Creation - Optional */}
                  <div className="mb-4">
                    <Label className="text-sm font-medium">Recipe Creation (Optional)</Label>
                    <p className="text-xs text-gray-500">You can add materials to create the recipe now, or add it later when editing the product</p>
                  </div>
                  
                  {/* Add Material Form - Optional */}
                  <div className="bg-gray-50 p-4 rounded-lg mb-4">
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="edit-materialSelect">Select Material or Product *</Label>
                        <div className="space-y-2">
                          {/* Current Selection Display */}
                          {newMaterial.materialId ? (
                            <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
                              <div className="flex-1">
                                <div className="font-medium text-blue-900">{newMaterial.materialName}</div>
                                <div className="text-sm text-blue-700">
                                  {rawMaterials.find(m => m.id === newMaterial.materialId) ? 'Raw Material' : 'Product'}
                                </div>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setNewMaterial({
                                  materialId: "",
                                  materialName: "",
                                  quantity: "",
                                  unit: "",
                                  cost: "",
                                  selectedQuantity: 0
                                })}
                                className="text-red-600 hover:text-red-700"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          ) : (
                            <Button
                              variant="outline"
                              onClick={() => setShowMaterialSelector(true)}
                              className="w-full h-12 border-dashed border-2 border-gray-300 hover:border-blue-400 hover:bg-blue-50"
                            >
                              <Search className="w-4 h-4 mr-2" />
                              Click to search and select material or product
                            </Button>
                          )}
                          
                          {/* Add New Material Button */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate('/materials')}
                            className="w-full text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Add New Material
                          </Button>
                        </div>
                      </div>
                      
                      {/* Quantity for Base Unit */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="edit-materialQuantity">Quantity *</Label>
                          <Input
                            id="edit-materialQuantity"
                            type="text"
                            value={newMaterial.quantity}
                            onChange={(e) => {
                              // Allow only numbers, decimals, and leading zeros
                              const value = e.target.value;
                              if (value === '' || /^\d*\.?\d*$/.test(value)) {
                                setNewMaterial({...newMaterial, quantity: value});
                              }
                            }}
                            placeholder={newMaterial.materialId && availableProducts.some(p => p.id === newMaterial.materialId) ? "Auto-calculated for products" : "e.g., 0.5, 2.5, 0.2"}
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            {newMaterial.materialId && availableProducts.some(p => p.id === newMaterial.materialId) 
                              ? "Auto-calculated for products, or edit manually" 
                              : "Quantity needed for 1 SQM of this product (supports decimals like 0.5kg, 0.2 pieces)"
                            }
                          </p>
                        </div>
                        <div>
                          <Label htmlFor="edit-materialUnit">Unit *</Label>
                          <Input
                            id="edit-materialUnit"
                            value={newMaterial.unit}
                            onChange={(e) => setNewMaterial({...newMaterial, unit: e.target.value})}
                            placeholder="e.g., kg, meters, pieces"
                          />
                        </div>
                      </div>
                    </div>

                    <Button
                      onClick={addProductMaterial}
                      className="w-full mt-4"
                      disabled={!newMaterial.materialId || !newMaterial.quantity || !newMaterial.unit}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Material to Recipe
                    </Button>
                  </div>

                  {/* Added Materials List */}
                  {productMaterials.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Recipe Materials:</Label>
                      {productMaterials.map((material, index) => (
                        <div key={index} className="flex items-center justify-between bg-blue-50 p-3 rounded-lg">
                          <div className="flex-1">
                            <div className="font-medium">{material.materialName}</div>
                            <div className="text-sm text-gray-600">
                              {material.quantity} {material.unit}
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removeProductMaterial(index)}
                            className="text-red-600 hover:bg-red-50"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* No Recipe Message */}
                  {productMaterials.length === 0 && (
                    <div className="bg-gray-50 border border-gray-200 p-3 rounded-lg">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-gray-600" />
                        <span className="text-sm text-gray-800 font-medium">No Recipe Set</span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        Add materials to create a recipe for this product.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setIsEditProductOpen(false);
                setProductMaterials([]);
                setSelectedImage(null);
                setImagePreview("");
                setImageUrl("");
              }}>
                Cancel
              </Button>
              <Button onClick={handleSaveEditProduct} disabled={uploadingImage}>
                {uploadingImage ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  'Update Product'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* QR Code Display Dialog */}
        <Dialog open={showQRCode} onOpenChange={setShowQRCode}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {selectedQRProduct ? 'Product QR Code' : 'Individual Product QR Code'}
              </DialogTitle>
              <DialogDescription>
                {selectedQRProduct 
                  ? 'Scan this QR code to view product overview, stock levels, and recipe details'
                  : 'Scan this QR code to view individual product details and specifications'
                }
              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800 font-medium">📱 How to scan:</p>
                <ol className="text-xs text-blue-700 mt-1 space-y-1">
                  <li>1. Open your phone's camera app</li>
                  <li>2. Point it at the QR code</li>
                  <li>3. Tap the link that appears</li>
                  <li>4. View the beautiful product details!</li>
                </ol>
              </div>
              </DialogDescription>
            </DialogHeader>
            
            {selectedQRProduct && (
              <div className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  <p><strong>Product:</strong> {selectedQRProduct.name}</p>
                  <p><strong>Category:</strong> {selectedQRProduct.category}</p>
                  <p><strong>Available Stock:</strong> {getAvailablePieces(selectedQRProduct.id)} Products</p>
                  <p><strong>Total SQM:</strong> {(
                    getAvailablePieces(selectedQRProduct.id) *
                    calculateSQM(
                      selectedQRProduct.length || '0',
                      selectedQRProduct.width || '0',
                      selectedQRProduct.lengthUnit || 'feet',
                      selectedQRProduct.widthUnit || 'feet'
                    )
                  ).toFixed(4)} SQM</p>
                </div>
                
                <QRCodeDisplay
                  data={generateMainProductQRData(selectedQRProduct)}
                  type="main"
                  title={`${selectedQRProduct.name} - Product Overview`}
                />
              </div>
            )}

            {selectedQRIndividualProduct && (
              <div className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  <p><strong>Product:</strong> {selectedQRIndividualProduct.productName}</p>
                  <p><strong>QR Code:</strong> {selectedQRIndividualProduct.qrCode}</p>
                  <p><strong>Status:</strong> {selectedQRIndividualProduct.status}</p>
                  <p><strong>Quality Grade:</strong> {selectedQRIndividualProduct.qualityGrade}</p>
                </div>
                
                <QRCodeDisplay
                  data={generateIndividualProductQRData(selectedQRIndividualProduct, products.find(p => p.id === selectedQRIndividualProduct.productId)!)}
                  type="individual"
                  title={`${selectedQRIndividualProduct.productName} - Individual Product`}
                />
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowQRCode(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add New Unit Dialog */}
        <Dialog open={isAddUnitDialogOpen} onOpenChange={setIsAddUnitDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add New Unit</DialogTitle>
              <DialogDescription>
                Enter a new {currentUnitType} unit. {currentUnitPlaceholder && `Examples: ${currentUnitPlaceholder}`}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="new-unit">Unit Name</Label>
                <Input
                  id="new-unit"
                  placeholder={currentUnitPlaceholder}
                  value={newUnitNameInput}
                  onChange={(e) => setNewUnitNameInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddNewUnit();
                    }
                  }}
                  autoFocus
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setIsAddUnitDialogOpen(false);
                setNewUnitNameInput("");
              }}>
                Cancel
              </Button>
              <Button onClick={handleAddNewUnit} disabled={!newUnitNameInput.trim()}>
                Add Unit
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }