import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { ProductService } from "@/services";
import { individualProductService } from "@/services/individualProductService";
import { ProductRecipeService } from "@/services/productRecipeService";
import { NotificationService } from "@/services/notificationService";
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
import { DropdownService, DropdownOption } from "@/services/dropdownService";
import { supabase, supabaseAdmin } from "@/lib/supabase";
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
  Bell, Factory, Clock, ArrowRight, Copy, Trash2
} from "lucide-react";

interface ProductMaterial {
  materialId: string;
  materialName: string;
  quantity: number;
  unit: string;
  cost: number;
}

interface Product {
  id: string;
  qrCode: string;
  name: string;
  category: string;
  color: string;
  pattern: string;
  quantity: number;
  unit: string;
  expiryDate?: string;
  materialsUsed: ProductMaterial[];
  status: "in-stock" | "low-stock" | "out-of-stock" | "expired" | "in-production";
  notes: string;
  imageUrl?: string;
  weight: string;
  thickness: string;
  width: string;
  height: string;
  manufacturingDate?: string;
  individualStockTracking?: boolean;
  actual_quantity?: number;
  actual_status?: "in-stock" | "low-stock" | "out-of-stock" | "expired" | "in-production"; // Calculated status based on actual stock
  individual_products?: any[];
}

interface IndividualProduct {
  id: string;
  qrCode: string;
  productId: string;
  productName?: string;
  color?: string;
  pattern?: string;
  weight?: string;
  thickness?: string;
  width?: string;
  height?: string;
  materialsUsed: ProductMaterial[];
  finalWeight: string;
  finalThickness: string;
  finalWidth: string;
  finalHeight: string;
  finalPileHeight?: string;
  finalQualityGrade?: string;
  qualityGrade: string;
  inspector?: string;
  notes: string;
  status: "available" | "sold" | "damaged";
  location?: string;
  addedDate?: string;
  productionDate?: string;
  completionDate?: string;
}

const statusStyles = {
  "in-stock": "bg-success text-success-foreground",
  "low-stock": "bg-warning text-warning-foreground",
  "out-of-stock": "bg-destructive text-destructive-foreground",
  "expired": "bg-destructive text-destructive-foreground",
  "in-production": "bg-orange-100 text-orange-800 border-orange-200"
};

export default function Products() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [isImportProductsOpen, setIsImportProductsOpen] = useState(false);
  const [isEditProductOpen, setIsEditProductOpen] = useState(false);
  const [isDuplicateProductOpen, setIsDuplicateProductOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [duplicateProduct, setDuplicateProduct] = useState<Product | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showQRCode, setShowQRCode] = useState(false);
  const [selectedQRProduct, setSelectedQRProduct] = useState<Product | null>(null);
  const [selectedQRIndividualProduct, setSelectedQRIndividualProduct] = useState<IndividualProduct | null>(null);
  const [productsWithRecipes, setProductsWithRecipes] = useState<Set<string>>(new Set());

  // Dynamic dropdown state - now using database options
  const [dropdownOptions, setDropdownOptions] = useState<{
    units: DropdownOption[];
    colors: DropdownOption[];
    patterns: DropdownOption[];
    thicknesses: DropdownOption[];
    weights: DropdownOption[];
    categories: DropdownOption[];
    heights: DropdownOption[];
    widths: DropdownOption[];
  }>({
    units: [],
    colors: [],
    patterns: [],
    thicknesses: [],
    weights: [],
    categories: [],
    heights: [],
    widths: [],
  });
  const [colorSearchTerm, setColorSearchTerm] = useState("");
  const [unitSearchTerm, setUnitSearchTerm] = useState("");
  const [weightSearchTerm, setWeightSearchTerm] = useState("");
  const [thicknessSearchTerm, setThicknessSearchTerm] = useState("");
  const [heightSearchTerm, setHeightSearchTerm] = useState("");
  const [widthSearchTerm, setWidthSearchTerm] = useState("");
  // Load dropdown options from database
  const loadDropdownOptions = async () => {
    try {
      const options = await DropdownService.getProductDropdownData();
      setDropdownOptions(options);
    } catch (error) {
      console.error('Error loading dropdown options:', error);
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
    if (!weightSearchTerm.trim()) return dropdownOptions.weights.map(opt => opt.value);
    return dropdownOptions.weights
      .filter(opt => opt.value.toLowerCase().includes(weightSearchTerm.toLowerCase()))
      .map(opt => opt.value);
  };

  const getFilteredThicknesses = () => {
    if (!thicknessSearchTerm.trim()) return dropdownOptions.thicknesses.map(opt => opt.value);
    return dropdownOptions.thicknesses
      .filter(opt => opt.value.toLowerCase().includes(thicknessSearchTerm.toLowerCase()))
      .map(opt => opt.value);
  };

  const getFilteredHeights = () => {
    if (!heightSearchTerm.trim()) return dropdownOptions.heights.map(opt => opt.value);
    return dropdownOptions.heights
      .filter(opt => opt.value.toLowerCase().includes(heightSearchTerm.toLowerCase()))
      .map(opt => opt.value);
  };

  const getFilteredWidths = () => {
    if (!widthSearchTerm.trim()) return dropdownOptions.widths.map(opt => opt.value);
    return dropdownOptions.widths
      .filter(opt => opt.value.toLowerCase().includes(widthSearchTerm.toLowerCase()))
      .map(opt => opt.value);
  };

  
  // Load products and dropdown options from Supabase on component mount
  useEffect(() => {
    const loadProducts = async () => {
      try {
        // Load dropdown options first
        await loadDropdownOptions();
        
        const result = await ProductService.getProducts();
        console.log("Loaded products from Supabase:", result);
        if (result.error) {
          console.error("Error loading products:", result.error);
          setProducts([]);
        } else {
          setProducts(result.data || []);
          
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

  // Check which products have recipes
  const checkProductsWithRecipes = async (products: Product[]) => {
    const productsWithRecipesSet = new Set<string>();
    
    // Only check recipes if we have products
    if (!products || products.length === 0) {
      setProductsWithRecipes(productsWithRecipesSet);
      return;
    }
    
    console.log('🔍 Checking recipes for', products.length, 'products...');
    
    for (const product of products) {
      try {
        const recipe = await getProductRecipe(product.id);
        if (recipe && recipe.recipe_materials && recipe.recipe_materials.length > 0) {
          productsWithRecipesSet.add(product.id);
          console.log('✅ Found recipe for product:', product.name);
        }
      } catch (error) {
        // Silently handle recipe errors - don't spam console
        console.log(`ℹ️ No recipe found for product ${product.name} (${product.id})`);
      }
    }
    
    console.log('🔍 Recipe check complete. Products with recipes:', productsWithRecipesSet.size);
    setProductsWithRecipes(productsWithRecipesSet);
  };
  
  // New product form state with essential fields only
  const [newProduct, setNewProduct] = useState({
    name: "",
    category: "",
    color: "",
    pattern: "",
    quantity: "",
    unit: "",
    notes: "",
    weight: "",
    thickness: "",
    width: "",
    height: "",
    manufacturingDate: new Date().toISOString().split('T')[0] // Default to current date
  });

  // Materials section state
  const [rawMaterials, setRawMaterials] = useState<any[]>([]);
  const [productMaterials, setProductMaterials] = useState<ProductMaterial[]>([]);
  const [newMaterial, setNewMaterial] = useState({
    materialId: "",
    materialName: "",
    quantity: "",
    unit: "",
    cost: ""
  });
  const [showAddMaterial, setShowAddMaterial] = useState(false);
  
  // Add new item states
  const [newCategoryInput, setNewCategoryInput] = useState("");
  const [newColorInput, setNewColorInput] = useState("");
  const [newPatternInput, setNewPatternInput] = useState("");
  const [newUnitInput, setNewUnitInput] = useState("");
  const [newLocationInput, setNewLocationInput] = useState("");
  const [newPileHeightInput, setNewPileHeightInput] = useState("");
  const [newThicknessInput, setNewThicknessInput] = useState("");
  const [newWeightInput, setNewWeightInput] = useState("");
  const [newHeightInput, setNewHeightInput] = useState("");
  const [newWidthInput, setNewWidthInput] = useState("");
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [showAddColor, setShowAddColor] = useState(false);
  const [showAddPattern, setShowAddPattern] = useState(false);
  const [showAddUnit, setShowAddUnit] = useState(false);
  const [showAddLocation, setShowAddLocation] = useState(false);
  const [showAddPileHeight, setShowAddPileHeight] = useState(false);
  const [showAddThickness, setShowAddThickness] = useState(false);
  const [showAddWeight, setShowAddWeight] = useState(false);
  const [showAddHeight, setShowAddHeight] = useState(false);
  const [showAddWidth, setShowAddWidth] = useState(false);
  const [materialsApplicable, setMaterialsApplicable] = useState(true);
  const [individualStockTracking, setIndividualStockTracking] = useState(true);

  // Load dynamic options and raw materials from localStorage
  useEffect(() => {
    const loadDynamicOptions = () => {
      // Load dynamic dropdown options
      // Dropdown options are now loaded from database via loadDropdownOptions()
    };

    const loadRawMaterials = async () => {
      try {
        // Load raw materials from Supabase using admin client to bypass RLS
        const { data, error } = await supabaseAdmin
          .from('raw_materials')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (error) {
          console.error('Error loading raw materials:', error);
          setRawMaterials([]);
        } else {
          console.log('Raw materials from database:', data);
          
          // Map database fields to UI interface
          const mappedMaterials = (data || []).map((item: any) => ({
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
          
          console.log('Mapped raw materials:', mappedMaterials);
          setRawMaterials(mappedMaterials);
        }
      } catch (error) {
        console.error('Error loading raw materials:', error);
        setRawMaterials([]);
      }
    };

    loadDynamicOptions();
    loadRawMaterials();
  }, []);

  // Load notifications and check for low stock on component mount
  useEffect(() => {
    const loadNotifications = async () => {
      try {
        // Load production notifications
        const { data: productionNotifications, error: productionError } = await NotificationService.getNotificationsByModule('production');
        if (productionError) {
          console.error('Error loading production notifications:', productionError);
        }
        
        // Load product notifications
        const { data: productNotifications, error: productError } = await NotificationService.getNotificationsByModule('products');
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
      await NotificationService.markAsRead(notificationId);
    // Update local state
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
      console.log('🗑️ Notification marked as read:', notificationId);
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleResolveNotification = async (notificationId: string) => {
    try {
      await NotificationService.markAsDismissed(notificationId);
    // Update local state
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
      console.log('🗑️ Notification dismissed:', notificationId);
    } catch (error) {
      console.error('Error resolving notification:', error);
    }
  };

  const handleClearAllNotifications = async () => {
    try {
      // Mark all notifications as dismissed
      const notificationPromises = notifications.map(notification => 
        NotificationService.markAsDismissed(notification.id)
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
  const handleDuplicateProduct = (product: Product) => {
    console.log("Original product being duplicated:", product);
    
    // Create a copy of the product with new ID and QR code
    const duplicatedProduct: Product = {
      ...product,
      id: IDGenerator.generateProductId(),
      qrCode: generateQRCode(),
    };
    
    console.log("Duplicated product:", duplicatedProduct);
    
    setDuplicateProduct(duplicatedProduct);
    setIsDuplicateProductOpen(true);
  };

  const handleSaveDuplicateProduct = async () => {
    if (!duplicateProduct) return;
    
    // Validation - required fields
    if (!duplicateProduct.name || !duplicateProduct.category || !duplicateProduct.unit) {
      console.error("Please fill in all required fields: Name, Category, and Unit");
      return;
    }

    try {
      console.log("Creating duplicate product in database:", duplicateProduct);
      
      // Create the duplicate product in the database using ProductService
      const result = await ProductService.createProduct({
        id: duplicateProduct.id,
        name: duplicateProduct.name,
        category: duplicateProduct.category,
        color: duplicateProduct.color,
        pattern: duplicateProduct.pattern,
        unit: duplicateProduct.unit,
        individual_stock_tracking: duplicateProduct.individualStockTracking,
        min_stock_level: 0,
        max_stock_level: 1000,
        base_quantity: duplicateProduct.quantity,
        qr_code: duplicateProduct.qrCode,
        weight: duplicateProduct.weight,
        thickness: duplicateProduct.thickness,
        width: duplicateProduct.width,
        height: duplicateProduct.height,
        image_url: duplicateProduct.imageUrl
      });

      if (result.error) {
        console.error("Error creating duplicate product:", result.error);
        return;
      }

      console.log("✅ Duplicate product created successfully:", result.data);
      
      // Refresh the products list to show the new duplicate
      const updatedResult = await ProductService.getProducts();
      if (updatedResult.data) {
        setProducts(updatedResult.data);
      }

      // Generate individual products if quantity > 0 and individual stock tracking is enabled
      if (duplicateProduct.quantity > 0 && duplicateProduct.individualStockTracking) {
        console.log(`Generating ${duplicateProduct.quantity} individual products for ${duplicateProduct.name}`);
        
        // Get current date
        const currentDate = new Date().toISOString().split('T')[0];
        
        // Generate individual products for each quantity
        for (let i = 0; i < duplicateProduct.quantity; i++) {
          try {
            const { error } = await ProductService.createIndividualProduct({
              product_id: duplicateProduct.id,
              production_date: currentDate,
              final_weight: duplicateProduct.weight,
              final_thickness: duplicateProduct.thickness,
              quality_grade: 'A' as 'A+' | 'A' | 'B' | 'C',
              location: '',
              production_notes: `Auto-generated from ${duplicateProduct.name}`
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

      // Reset form and close dialog
      setDuplicateProduct(null);
      setIsDuplicateProductOpen(false);
      
      console.log("Product duplicated successfully:", duplicateProduct.name);
    } catch (error) {
      console.error("Error duplicating product:", error);
    }
  };

  const handleEditProduct = async (product: Product) => {
    setSelectedProduct(product);
    setIsEditProductOpen(true);
    
    // Load existing recipe for this product
    try {
      const existingRecipe = await getProductRecipe(product.id);
      if (existingRecipe && existingRecipe.recipe_materials) {
        // Convert recipe materials to product materials format
        const recipeMaterials = existingRecipe.recipe_materials.map((material: any) => ({
          materialId: material.material_id,
          materialName: material.material_name,
          quantity: material.quantity,
          unit: material.unit,
          cost: material.cost_per_unit || 0
        }));
        setProductMaterials(recipeMaterials);
        console.log('✅ Loaded existing recipe for product:', product.name, recipeMaterials);
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
      return;
    }

    try {
      // Update the product in the database
      const { error } = await ProductService.updateProduct(selectedProduct.id, {
        name: selectedProduct.name,
        category: selectedProduct.category,
        color: selectedProduct.color,
        pattern: selectedProduct.pattern,
        unit: selectedProduct.unit,
        weight: selectedProduct.weight,
        thickness: selectedProduct.thickness,
        width: selectedProduct.width,
        height: selectedProduct.height
      });

      if (error) {
        console.error("Error updating product in database:", error);
        alert("Failed to update product in database. Please try again.");
        return;
      }

      // Update the product in the local products array
      const updatedProducts = products.map(p => 
        p.id === selectedProduct.id ? selectedProduct : p
      );
      setProducts(updatedProducts);
      replaceStorage('rajdhani_products', updatedProducts);

      // Reset form and close dialog
      setSelectedProduct(null);
      setIsEditProductOpen(false);
      
      // Refresh recipe status for this product
      if (productMaterials.length > 0) {
        const updatedSet = new Set(productsWithRecipes);
        updatedSet.add(selectedProduct.id);
        setProductsWithRecipes(updatedSet);
      }
      
      console.log("Product updated successfully:", selectedProduct.name);
    } catch (error) {
      console.error("Error updating product:", error);
    }
  };

  const handleAddProduct = async () => {
    // Validation - required fields
    if (!newProduct.name || !newProduct.category || !newProduct.quantity || !newProduct.unit) {
      console.error("Please fill in all required fields: Name, Category, Quantity, and Unit");
      return;
    }

    let productId: string; // Declare productId at function scope

    try {
      const generatedProductId = IDGenerator.generateProductId();
      
      // Material costs are tracked individually, no total product cost needed

      // Create the product object with essential fields only
      const product: Product = {
        id: generatedProductId,
        qrCode: generateQRCode(),
        name: newProduct.name,
        category: newProduct.category,
        color: newProduct.color || "NA",
        pattern: newProduct.pattern || "Standard",
        quantity: parseInt(newProduct.quantity),
        unit: newProduct.unit,
        materialsUsed: productMaterials,
        status: "in-stock",
        notes: newProduct.notes || "",
        imageUrl: imagePreview || "",
        weight: newProduct.weight || "NA",
        thickness: newProduct.thickness || "NA",
        width: newProduct.width || "NA",
        height: newProduct.height || "NA",
        manufacturingDate: newProduct.manufacturingDate || new Date().toISOString().split('T')[0],
        individualStockTracking: individualStockTracking
      };

      // Save to Supabase
      try {
        const { data: createdProduct, error } = await ProductService.createProduct({
          name: product.name,
          category: product.category,
          color: product.color,
          pattern: product.pattern,
          unit: product.unit,
          individual_stock_tracking: product.individualStockTracking,
          base_quantity: product.individualStockTracking ? 0 : product.quantity, // Use 0 for individual tracking, actual quantity for bulk
          min_stock_level: 10,
          max_stock_level: 1000,
          weight: product.weight,
          thickness: product.thickness,
          width: product.width,
          height: product.height,
          image_url: product.imageUrl
        });
        
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

        // Verify the product exists in the database before creating individual products
        console.log(`🔍 Verifying product ${productId} exists in database...`);

        // Retry verification with exponential backoff
        let verifyProduct = null;
        let verificationAttempts = 0;
        const maxVerificationAttempts = 5;

        while (!verifyProduct && verificationAttempts < maxVerificationAttempts) {
          verificationAttempts++;
          console.log(`Verification attempt ${verificationAttempts}/${maxVerificationAttempts}...`);

          const { data, error } = await supabaseAdmin
            .from('products')
            .select('id, name')
            .eq('id', productId)
            .single();

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
        
        // Reload products from Supabase
        const result = await ProductService.getProducts();
        if (result.error) {
          console.error("Error reloading products:", result.error);
        } else {
          setProducts(result.data || []);
        }
      } catch (error) {
        console.error("Error saving product:", error);
        alert("Failed to save product. Please try again.");
        return;
      }

      // Create individual stock items only if individual tracking is enabled
      if (individualStockTracking) {
      const individualProducts: IndividualProduct[] = [];
        const currentDate = new Date().toISOString().split('T')[0];
        
      for (let i = 0; i < product.quantity; i++) {
        // Add a small delay to ensure unique IDs
        await new Promise(resolve => setTimeout(resolve, 10));
        const individualProductId = IDGenerator.generateIndividualProductId();
        const serialNumber = `${product.name.replace(/\s+/g, '').substring(0, 6).toUpperCase()}-${String(i + 1).padStart(3, '0')}`;
        
        const individualProduct: IndividualProduct = {
          id: individualProductId,
          qrCode: IDGenerator.generateQRCode(),
          productId: productId,
            productName: product.name,
            color: product.color,
            pattern: product.pattern,
            weight: product.weight,
            thickness: product.thickness,
            width: product.width,
            height: product.height,
            materialsUsed: product.materialsUsed || [],
            qualityGrade: 'A',
            status: 'available',
            location: 'Warehouse A - General Storage', // Default location for new individual products
            addedDate: currentDate,
            notes: `Item ${i + 1} of ${product.quantity} - Auto-created from product entry`,
          finalWeight: product.weight,
          finalThickness: product.thickness,
          finalWidth: product.width,
          finalHeight: product.height,
            finalQualityGrade: 'A',
            productionDate: currentDate,
            completionDate: currentDate
        };
        individualProducts.push(individualProduct);
      }

      // Save individual products to database
      console.log(`🔄 Creating ${individualProducts.length} individual products for product ${productId}...`);

      // Final verification that the product still exists just before creating individual products
      console.log(`🔍 Final verification that product ${productId} exists before creating individual products...`);
      const { data: finalVerifyProduct, error: finalVerifyError } = await supabaseAdmin
        .from('products')
        .select('id, name')
        .eq('id', productId)
        .single();

      if (finalVerifyError || !finalVerifyProduct) {
        console.error("Final product verification failed:", finalVerifyError);
        alert(`Product ${productId} not found in database. Individual products cannot be created.`);
        return;
      }

      console.log(`✅ Final verification successful: ${finalVerifyProduct.name} (${finalVerifyProduct.id})`);

      // TEMPORARY WORKAROUND: If foreign key constraint fails, try without individual products
      let individualProductsCreated = 0;
      let hasForeignKeyError = false;
      
      for (const individualProduct of individualProducts) {
        try {
          console.log(`Creating individual product: ${individualProduct.id} for product: ${productId}`);

          // Retry creating individual product with exponential backoff
          let success = false;
          let attempts = 0;
          const maxAttempts = 3;

          while (!success && attempts < maxAttempts) {
            attempts++;
            console.log(`Individual product creation attempt ${attempts}/${maxAttempts}...`);

            const { error } = await individualProductService.createIndividualProduct({
              id: individualProduct.id,
              product_id: productId,
              product_name: individualProduct.productName,
              color: individualProduct.color,
              pattern: individualProduct.pattern,
              weight: individualProduct.weight,
              thickness: individualProduct.thickness,
              width: individualProduct.width,
              height: individualProduct.height,
              final_weight: individualProduct.finalWeight,
              final_thickness: individualProduct.finalThickness,
              final_width: individualProduct.finalWidth,
              final_height: individualProduct.finalHeight,
              quality_grade: individualProduct.qualityGrade as 'A+' | 'A' | 'B' | 'C',
              status: individualProduct.status as 'available' | 'sold' | 'damaged' | 'in-production' | 'completed',
              location: individualProduct.location,
              notes: individualProduct.notes,
              added_date: individualProduct.addedDate,
              production_date: individualProduct.productionDate,
              completion_date: individualProduct.completionDate,
              inspector: individualProduct.inspector
            });

            if (error) {
              console.error(`❌ Error creating individual product (attempt ${attempts}):`, error);
              console.error('Product ID:', productId);
              console.error('Individual Product ID:', individualProduct.id);

              // Check if it's a foreign key constraint error
              if (error.message && error.message.includes('foreign key constraint')) {
                if (attempts < maxAttempts) {
                  // Wait before retry for foreign key constraint errors
                  const delay = 200 * attempts; // 200ms, 400ms
                  console.log(`Foreign key constraint error, waiting ${delay}ms before retry...`);
                  await new Promise(resolve => setTimeout(resolve, delay));
                  continue;
                } else {
                  hasForeignKeyError = true;
                  console.error('🚨 Foreign key constraint error detected after retries - stopping individual product creation');
                  break; // Stop trying to create more individual products
                }
              } else {
                // For other errors, don't retry
                break;
              }
            } else {
              console.log('✅ Individual product created successfully:', individualProduct.productName);
              individualProductsCreated++;
              success = true;
            }
          }

          if (hasForeignKeyError) {
            break; // Stop creating more individual products
          }

        } catch (err) {
          console.error('Error creating individual product:', err);
        }
      }
      
      // Summary of individual product creation
      if (hasForeignKeyError) {
        console.warn(`⚠️ Foreign key constraint error prevented individual product creation. Product created successfully but individual products failed.`);
        console.warn(`🔧 Please run the SQL script: force-fix-foreign-key.sql in your Supabase SQL editor`);
        alert(`Product "${product.name}" created successfully, but individual products failed due to database constraint issue. Please run the SQL fix script.`);
      } else {
        console.log(`✅ Successfully created ${individualProductsCreated} individual products for product "${product.name}"`);
      }
      }

      // Save recipe if materials were added
      if (productMaterials.length > 0) {
        console.log('Product materials before creating recipe:', productMaterials);
        
        const mappedMaterials = productMaterials.map(material => ({
          id: material.materialId,
          name: material.materialName,
          quantity: material.quantity,
          unit: material.unit,
          cost_per_unit: material.cost,
          selectedQuantity: material.quantity
        }));
        
        console.log('Mapped materials for recipe:', mappedMaterials);
        
        try {
          const recipe = createRecipeFromMaterials(
            productId,
            product.name,
            mappedMaterials,
            'admin'
          );
          await saveProductRecipe(recipe);
          console.log('✅ Recipe saved for product:', product.name, recipe);
        } catch (error) {
          console.error('❌ Error saving recipe for product:', product.name, error);
          // Don't fail the entire product creation if recipe saving fails
        }
      }

      // Update local state
      setProducts([...products, product]);

      // Reset form
      setNewProduct({
        name: "",
        category: "",
        color: "",
        pattern: "",
        quantity: "",
        unit: "",
        notes: "",
        weight: "",
        thickness: "",
        width: "",
        height: "",
        manufacturingDate: new Date().toISOString().split('T')[0]
      });
      setProductMaterials([]);
      setNewMaterial({
        materialId: "",
        materialName: "",
        quantity: "",
        unit: "",
        cost: ""
      });
      setImagePreview("");
      setSelectedImage(null);
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
        : `Product "${product.name}" added successfully!\nBulk quantity: ${product.quantity} ${product.unit} (no individual QR codes).`;
      
      console.log(successMessage);
      
    } catch (error) {
      console.error('Error adding product:', error);
      console.error('Error adding product. Please try again.');
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


  const addNewThickness = async () => {
    if (newThicknessInput.trim()) {
      const result = await DropdownService.addOption('thickness', newThicknessInput.trim());
      if (result.success) {
        await loadDropdownOptions();
      setNewProduct({...newProduct, thickness: newThicknessInput.trim()});
      setNewThicknessInput("");
      setShowAddThickness(false);
      }
    }
  };

  const addNewWeight = async () => {
    if (newWeightInput.trim()) {
      const result = await DropdownService.addOption('weight', newWeightInput.trim());
      if (result.success) {
        await loadDropdownOptions();
      setNewProduct({...newProduct, weight: newWeightInput.trim()});
      setNewWeightInput("");
      setShowAddWeight(false);
      }
    }
  };

  const addNewHeight = async () => {
    if (newHeightInput.trim()) {
      const result = await DropdownService.addOption('height', newHeightInput.trim());
      if (result.success) {
        await loadDropdownOptions();
        setNewProduct({...newProduct, height: newHeightInput.trim()});
        setNewHeightInput("");
        setShowAddHeight(false);
      }
    }
  };

  const addNewWidth = async () => {
    if (newWidthInput.trim()) {
      const result = await DropdownService.addOption('width', newWidthInput.trim());
      if (result.success) {
        await loadDropdownOptions();
        setNewProduct({...newProduct, width: newWidthInput.trim()});
        setNewWidthInput("");
        setShowAddWidth(false);
      }
    }
  };

  // Delete functions for dropdown options
  const deleteCategory = async (category: string) => {
    const result = await DropdownService.deleteOption('category', category);
    if (result.success) {
      await loadDropdownOptions();
      // Reset category if it was selected
      if (newProduct.category === category) {
        setNewProduct({...newProduct, category: ""});
      }
    }
  };

  const deleteColor = async (color: string) => {
    const result = await DropdownService.deleteOption('color', color);
    if (result.success) {
      await loadDropdownOptions();
      // Reset color if it was selected
      if (newProduct.color === color) {
        setNewProduct({...newProduct, color: ""});
      }
    }
  };

  const deletePattern = async (pattern: string) => {
    const result = await DropdownService.deleteOption('pattern', pattern);
    if (result.success) {
      await loadDropdownOptions();
      // Reset pattern if it was selected
      if (newProduct.pattern === pattern) {
        setNewProduct({...newProduct, pattern: ""});
      }
    }
  };

  const deleteUnit = async (unit: string) => {
    const result = await DropdownService.deleteOption('unit', unit);
    if (result.success) {
      await loadDropdownOptions();
      // Reset unit if it was selected
      if (newProduct.unit === unit) {
        setNewProduct({...newProduct, unit: ""});
      }
    }
  };

  const deleteWeight = async (weight: string) => {
    const result = await DropdownService.deleteOption('weight', weight);
    if (result.success) {
      await loadDropdownOptions();
      // Reset weight if it was selected
      if (newProduct.weight === weight) {
        setNewProduct({...newProduct, weight: ""});
      }
    }
  };

  const deleteThickness = async (thickness: string) => {
    const result = await DropdownService.deleteOption('thickness', thickness);
    if (result.success) {
      await loadDropdownOptions();
      // Reset thickness if it was selected
      if (newProduct.thickness === thickness) {
        setNewProduct({...newProduct, thickness: ""});
      }
    }
  };

  const deleteHeight = async (height: string) => {
    const result = await DropdownService.deleteOption('height', height);
    if (result.success) {
      await loadDropdownOptions();
      // Reset height if it was selected
      if (newProduct.height === height) {
        setNewProduct({...newProduct, height: ""});
      }
    }
  };

  const deleteWidth = async (width: string) => {
    const result = await DropdownService.deleteOption('width', width);
    if (result.success) {
      await loadDropdownOptions();
      // Reset width if it was selected
      if (newProduct.width === width) {
        setNewProduct({...newProduct, width: ""});
      }
    }
  };

  // Handle image upload
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    console.log('Image upload triggered, file:', file);
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select a valid image file');
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('Image size should be less than 5MB');
        return;
      }
      
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        console.log('Image preview generated, length:', result.length);
        setImagePreview(result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Remove image
  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview("");
  };

  // Material handling functions
  const handleMaterialSelection = (materialId: string) => {
    if (materialId === "add_new") {
      // Navigate to materials page to add new material
      navigate('/materials');
      return;
    }
    
    console.log('Material selection changed:', { materialId, availableMaterials: rawMaterials.length });
    
    const selectedMaterial = rawMaterials.find(m => m.id === materialId);
    if (selectedMaterial) {
      console.log('Selected material found:', selectedMaterial);
      setNewMaterial({
        materialId: selectedMaterial.id,
        materialName: selectedMaterial.name, // Auto-fill from raw material inventory
        quantity: "",
        unit: selectedMaterial.unit || "",
        cost: selectedMaterial.costPerUnit?.toString() || ""
      });
    } else {
      console.error('Selected material not found for ID:', materialId);
      console.error('Available materials:', rawMaterials.map(m => ({ id: m.id, name: m.name })));
    }
  };

  const addProductMaterial = () => {
    if (!newMaterial.materialId) {
      console.error("Please select a material");
      return;
    }

    const selectedMaterial = rawMaterials.find(m => m.id === newMaterial.materialId);
    if (!selectedMaterial) {
      console.error("Selected material not found for ID:", newMaterial.materialId);
      console.error("Available materials:", rawMaterials.map(m => ({ id: m.id, name: m.name })));
      return;
    }

    console.log("Adding material to product:", {
      selectedMaterial,
      materialId: selectedMaterial.id,
      materialName: selectedMaterial.name
    });

    const material: ProductMaterial = {
      materialId: selectedMaterial.id,
      materialName: selectedMaterial.name, // Use exact name from raw material inventory
      quantity: 1, // Default quantity for recipe reference
      unit: selectedMaterial.unit || "piece", // Use material's unit or default
      cost: selectedMaterial.costPerUnit || 0 // Use material's cost
    };

    console.log("Created product material:", material);
    setProductMaterials([...productMaterials, material]);
    setNewMaterial({
      materialId: "",
      materialName: "",
      quantity: "",
      unit: "",
      cost: ""
    });
  };

  const removeProductMaterial = (index: number) => {
    setProductMaterials(productMaterials.filter((_, i) => i !== index));
  };

  // Filter and sort products
  const filteredProducts = (products || [])
    .filter(product => {
      if (!product) return false;
      
      const matchesSearch = (product.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (product.qrCode || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (product.color || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = categoryFilter === "all" || product.category === categoryFilter;
      
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
      
      return matchesSearch && matchesCategory && matchesStatus;
    })
    .sort((a, b) => (a?.name || '').localeCompare(b?.name || ''));

  const dynamicCategories = [...new Set((products || []).map(p => p?.category).filter(Boolean))];
  const totalProducts = (products || []).length;
  const lowStockCount = (products || []).filter(p => p?.actual_status === "low-stock" || p?.actual_status === "out-of-stock").length;
  const totalValue = 0; // Pricing removed - will be set manually per order

  // Calculate available pieces for each product (excluding sold and damaged)
  const getAvailablePieces = (productId: string) => {
    const product = products.find(p => p.id === productId);
    
    // Use the quantity that comes from ProductService (which handles both individual and bulk products)
    
    // Return the quantity from ProductService (handles both individual and bulk products)
    return product?.quantity || 0;
  };

  // Get individual products for a specific product
  const getIndividualProducts = (productId: string) => {
    const product = products.find(p => p.id === productId);
    return product?.individual_products || [];
  };

  // Handle adding product to production
  const handleAddToProduction = async (product: Product) => {
    console.log('Adding product to production:', product);
    
    // Update product status to "in-production"
    const updatedProducts = products.map(p => 
      p.id === product.id ? { ...p, status: "in-production" as const } : p
    );
    setProducts(updatedProducts);
    replaceStorage('rajdhani_products', updatedProducts);
    
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
        const notification = await NotificationService.createNotification({
          type: 'production_request',
          title: 'Production Request',
          message: `Product "${product.name}" has been requested for production by ${user?.name || 'Inventory Manager'}. Please add this product to the production queue.`,
          module: 'production',
          priority: 'medium',
          status: 'unread',
          related_id: product.id,
          related_data: {
            productId: product.id,
            productName: product.name,
            category: product.category,
            requestedBy: user?.name || 'Inventory Manager',
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
  };

  // Handle showing QR code for main product
  const handleShowProductQR = (product: Product) => {
    setSelectedQRProduct(product);
    setSelectedQRIndividualProduct(null);
    setShowQRCode(true);
  };

  // Handle showing QR code for individual product
  const handleShowIndividualProductQR = (individualProduct: IndividualProduct) => {
    setSelectedQRIndividualProduct(individualProduct);
    setSelectedQRProduct(null);
    setShowQRCode(true);
  };

  // Generate QR data for main product
  const generateMainProductQRData = (product: Product): MainProductQRData => {
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
  const generateIndividualProductQRData = (individualProduct: IndividualProduct, mainProduct: Product): IndividualProductQRData => {
    return {
      id: individualProduct.id,
      product_id: individualProduct.productId,
      product_name: individualProduct.productName || mainProduct.name,
      batch_id: individualProduct.id, // Using individual product ID as batch ID
      serial_number: individualProduct.qrCode,
      production_date: individualProduct.productionDate || individualProduct.addedDate || new Date().toISOString().split('T')[0],
      quality_grade: individualProduct.qualityGrade || 'A',
      dimensions: {
        length: parseFloat(individualProduct.width?.replace(/[^\d.]/g, '') || '0'),
        width: parseFloat(individualProduct.height?.replace(/[^\d.]/g, '') || '0'),
        thickness: parseFloat(individualProduct.thickness?.replace(/[^\d.]/g, '') || '0')
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
      created_at: individualProduct.addedDate || new Date().toISOString()
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
              <Dialog open={isAddProductOpen} onOpenChange={setIsAddProductOpen}>
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
                    {/* Basic Information */}
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
                    </div>

                    <div className="grid grid-cols-2 gap-4">

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
                                    {pattern}
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
                              
                              {/* N/A Option - Always at bottom */}
                              <SelectItem value="N/A" className="text-gray-500 italic">
                                N/A (No Pattern)
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="quantity">Quantity *</Label>
                        <Input
                          id="quantity"
                          type="number"
                          value={newProduct.quantity}
                          onChange={(e) => setNewProduct({...newProduct, quantity: e.target.value})}
                          placeholder="5"
                          required
                        />
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

                    <div className="grid grid-cols-2 gap-4">
                      {/* Weight field */}
                      <div>
                        <Label htmlFor="weight">Weight *</Label>
                        {showAddWeight ? (
                          <div className="flex gap-2">
                        <Input
                              placeholder="Enter new weight (e.g., 1200gsm)"
                              value={newWeightInput}
                              onChange={(e) => setNewWeightInput(e.target.value)}
                            />
                            <Button size="sm" onClick={addNewWeight}>Add</Button>
                            <Button size="sm" variant="outline" onClick={() => setShowAddWeight(false)}>Cancel</Button>
                          </div>
                        ) : (
                          <Select
                          value={newProduct.weight}
                            onValueChange={(value) => {
                              if (value === "add_new") {
                                setShowAddWeight(true);
                              } else {
                                setNewProduct({...newProduct, weight: value});
                                setWeightSearchTerm(""); // Clear search when weight is selected
                              }
                            }}
                          >
                            <SelectTrigger>
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
                              
                              {/* Weight Options */}
                              {getFilteredWeights().map(weight => (
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
                              ))}
                              
                              {/* Show message if no weights found */}
                              {getFilteredWeights().length === 0 && (
                                <div className="p-2 text-sm text-gray-500 text-center">
                                  No weights found matching "{weightSearchTerm}"
                                </div>
                              )}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    </div>

                    {/* Height and Width Dropdowns */}
                    <div className="grid grid-cols-2 gap-4">
                    <div>
                        <Label htmlFor="height">Height *</Label>
                        {showAddHeight ? (
                          <div className="flex gap-2">
                      <Input
                              placeholder="Enter new height (e.g., 2.74m)"
                              value={newHeightInput}
                              onChange={(e) => setNewHeightInput(e.target.value)}
                            />
                            <Button size="sm" onClick={addNewHeight}>Add</Button>
                            <Button size="sm" variant="outline" onClick={() => setShowAddHeight(false)}>Cancel</Button>
                          </div>
                        ) : (
                          <Select value={newProduct.height} onValueChange={(value) => {
                            if (value === "add_new") {
                              setShowAddHeight(true);
                            } else {
                              setNewProduct({...newProduct, height: value});
                              setHeightSearchTerm(""); // Clear search when height is selected
                            }
                          }}>
                          <SelectTrigger>
                              <SelectValue placeholder="Select height" />
                          </SelectTrigger>
                          <SelectContent>
                            {/* Search Input */}
                            <div className="p-2 border-b">
                              <Input
                                  placeholder="Search heights..."
                                  value={heightSearchTerm}
                                  onChange={(e) => setHeightSearchTerm(e.target.value)}
                                className="h-8"
                      />
                    </div>

                              {/* Add New Height Option - Always at top */}
                            <SelectItem value="add_new" className="text-blue-600 font-medium">
                                + Add New Height
                            </SelectItem>
                            
                              <SelectItem value="N/A" className="text-gray-500 italic">
                                N/A (No Height)
                              </SelectItem>
                              
                              {/* Height Options */}
                              {getFilteredHeights().map(height => (
                                <div key={height} className="flex items-center justify-between px-2 py-1.5 hover:bg-accent rounded-sm">
                                  <SelectItem value={height} className="flex-1 p-0 h-auto">
                                    {height}
                                  </SelectItem>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      deleteHeight(height);
                                    }}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              ))}
                              
                              {/* Show message if no heights found */}
                              {getFilteredHeights().length === 0 && (
                              <div className="p-2 text-sm text-gray-500 text-center">
                                  No heights found matching "{heightSearchTerm}"
                              </div>
                            )}
                          </SelectContent>
                        </Select>
                        )}
                      </div>
                      <div>
                        <Label htmlFor="width">Width *</Label>
                        {showAddWidth ? (
                          <div className="flex gap-2">
                        <Input
                              placeholder="Enter new width (e.g., 1.83m)"
                              value={newWidthInput}
                              onChange={(e) => setNewWidthInput(e.target.value)}
                            />
                            <Button size="sm" onClick={addNewWidth}>Add</Button>
                            <Button size="sm" variant="outline" onClick={() => setShowAddWidth(false)}>Cancel</Button>
                      </div>
                        ) : (
                          <Select value={newProduct.width} onValueChange={(value) => {
                            if (value === "add_new") {
                              setShowAddWidth(true);
                            } else {
                              setNewProduct({...newProduct, width: value});
                              setWidthSearchTerm(""); // Clear search when width is selected
                            }
                          }}>
                            <SelectTrigger>
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
                              
                              {/* Width Options */}
                              {getFilteredWidths().map(width => (
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
                              ))}
                              
                              {/* Show message if no widths found */}
                              {getFilteredWidths().length === 0 && (
                                <div className="p-2 text-sm text-gray-500 text-center">
                                  No widths found matching "{widthSearchTerm}"
                    </div>
                              )}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    </div>

                    {/* Thickness field */}
                    <div className="grid grid-cols-2 gap-4">
                    <div>
                        <Label htmlFor="thickness">Thickness *</Label>
                        {showAddThickness ? (
                        <div className="flex gap-2">
                          <Input
                              placeholder="Enter new thickness (e.g., 15mm)"
                              value={newThicknessInput}
                              onChange={(e) => setNewThicknessInput(e.target.value)}
                            />
                            <Button size="sm" onClick={addNewThickness}>Add</Button>
                            <Button size="sm" variant="outline" onClick={() => setShowAddThickness(false)}>Cancel</Button>
                          </div>
                        ) : (
                        <Select
                        value={newProduct.thickness}
                          onValueChange={(value) => {
                            if (value === "add_new") {
                              setShowAddThickness(true);
                            } else {
                              setNewProduct({...newProduct, thickness: value});
                              setThicknessSearchTerm(""); // Clear search when thickness is selected
                            }
                          }}
                        >
                            <SelectTrigger>
                            <SelectValue placeholder="Select thickness" />
                            </SelectTrigger>
                            <SelectContent>
                            {/* Search Input */}
                            <div className="p-2 border-b">
                              <Input
                                placeholder="Search thicknesses..."
                                value={thicknessSearchTerm}
                                onChange={(e) => setThicknessSearchTerm(e.target.value)}
                                className="h-8"
                      />
                    </div>

                            {/* Add New Thickness Option - Always at top */}
                              <SelectItem value="add_new" className="text-blue-600 font-medium">
                              + Add New Thickness
                              </SelectItem>
                            
                            <SelectItem value="N/A" className="text-gray-500 italic">
                              N/A (No Thickness)
                            </SelectItem>
                            
                            {/* Thickness Options */}
                            {getFilteredThicknesses().map(thickness => (
                              <div key={thickness} className="flex items-center justify-between px-2 py-1.5 hover:bg-accent rounded-sm">
                                <SelectItem value={thickness} className="flex-1 p-0 h-auto">
                                  {thickness}
                                </SelectItem>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteThickness(thickness);
                                  }}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            ))}
                            
                            {/* Show message if no thicknesses found */}
                            {getFilteredThicknesses().length === 0 && (
                              <div className="p-2 text-sm text-gray-500 text-center">
                                No thicknesses found matching "{thicknessSearchTerm}"
                              </div>
                            )}
                            </SelectContent>
                          </Select>
                        )}
                      </div>

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

                    </div>

                    {/* Materials Section - Moved to Bottom */}
                    <div className="border-t pt-4">
                      <div className="flex items-center justify-between mb-4">
                        <Label className="text-lg font-medium">Materials Used</Label>
                        <div className="text-sm text-muted-foreground bg-blue-50 px-3 py-1 rounded-lg">
                          💡 Materials added here will be saved as recipe for future production
                        </div>
                      </div>
                      
                      {/* Materials Applicable Selection */}
                      <div className="mb-4">
                        <Label className="text-sm font-medium mb-2 block">Does this product use materials?</Label>
                        <div className="flex gap-4">
                          <label className="flex items-center space-x-2">
                            <input
                              type="radio"
                              name="materialsApplicable"
                              value="yes"
                              checked={materialsApplicable === true}
                              onChange={() => setMaterialsApplicable(true)}
                              className="text-blue-600"
                            />
                            <span className="text-sm">Yes, add materials</span>
                          </label>
                          <label className="flex items-center space-x-2">
                            <input
                              type="radio"
                              name="materialsApplicable"
                              value="no"
                              checked={materialsApplicable === false}
                              onChange={() => {
                                setMaterialsApplicable(false);
                                // Clear any existing materials when NA is selected
                                setProductMaterials([]);
                              }}
                              className="text-blue-600"
                            />
                            <span className="text-sm">No, not applicable (NA)</span>
                          </label>
                        </div>
                      </div>
                      
                      {/* Add Material Form - Only show if materials are applicable */}
                      {materialsApplicable && (
                        <div className="bg-gray-50 p-4 rounded-lg mb-4">
                          <div className="space-y-4">
                            <div>
                              <Label htmlFor="materialSelect">Select Raw Material</Label>
                              <Select value={newMaterial.materialId} onValueChange={handleMaterialSelection}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Choose from existing raw materials" />
                                </SelectTrigger>
                                <SelectContent>
                                  {rawMaterials.map((material) => (
                                    <SelectItem key={material.id} value={material.id}>
                                      {material.name}
                                    </SelectItem>
                                  ))}
                                  <SelectItem value="add_new" className="text-blue-600 font-medium">
                                    + Add New Material
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          
                          <Button onClick={addProductMaterial} className="w-full mt-4">
                            <Plus className="w-4 h-4 mr-2" />
                            Add Material to Recipe
                          </Button>
                        </div>
                      )}

                      {/* Added Materials List - Only show if materials are applicable */}
                      {materialsApplicable && productMaterials.length > 0 && (
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Added Materials:</Label>
                          {productMaterials.map((material, index) => (
                            <div key={index} className="flex items-center justify-between bg-blue-50 p-3 rounded-lg">
                              <div className="flex-1">
                                <div className="font-medium">{material.materialName}</div>
                                <div className="text-sm text-gray-600">
                                  Raw material for recipe
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
                    </div>

                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsAddProductOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleAddProduct}>
                        Add Product
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
                  <CardTitle className="text-sm font-medium">Total Value</CardTitle>
                  <Package className="h-4 w-4 text-success" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">₹{(totalValue || 0).toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">
                    Inventory value
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
                                {getAvailablePieces(product.id || '')} {product.unit || 'pieces'}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Price: On Request
                              </div>
                              {getAvailablePieces(product.id || '') !== (product.quantity || 0) && (
                                <div className="text-xs text-muted-foreground">
                                  Total: {product.quantity || 0} {product.unit || 'pieces'}
                                </div>
                              )}
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
                                onClick={() => handleDuplicateProduct(product)}
                                className="border-green-500 text-green-600 hover:bg-green-50"
                                title="Duplicate Product"
                              >
                                <Copy className="w-4 h-4" />
                              </Button>
                              {hasIndividualStock(product.id) && (
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={async () => await handleAddToProduction(product)}
                                className="border-blue-500 text-blue-600 hover:bg-blue-50"
                              >
                                <Play className="w-4 h-4" />
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
                                <div className="font-medium">{availableStock} {product?.unit || 'units'}</div>
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
                                >
                                  <Factory className="w-4 h-4 mr-1" />
                                  Produce
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
                                <div>Required: {notification.relatedData.requiredQuantity} units</div>
                              )}
                              {notification.relatedData.availableStock !== undefined && (
                                <div>Available: {notification.relatedData.availableStock} units</div>
                              )}
                              {notification.relatedData.shortfall && (
                                <div>Shortfall: {notification.relatedData.shortfall} units</div>
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
                            >
                              <ArrowRight className="w-3 h-3 mr-1" />
                              Add to Production
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
        <Dialog open={isDuplicateProductOpen} onOpenChange={setIsDuplicateProductOpen}>
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
                      readOnly
                      className="bg-gray-50 cursor-not-allowed"
                      placeholder="Product name (read-only)"
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
                </div>

                <div className="grid grid-cols-2 gap-4">
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
                        <SelectItem value="N/A" className="text-gray-500 italic">
                          N/A (No Pattern)
                        </SelectItem>
                        {dropdownOptions.patterns.map(opt => opt.value).map((pattern) => (
                          <SelectItem key={pattern} value={pattern}>
                            {pattern}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
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
                    <Label htmlFor="duplicate-quantity">Quantity *</Label>
                    <Input
                      id="duplicate-quantity"
                      type="number"
                      value={duplicateProduct.quantity}
                      onChange={(e) => setDuplicateProduct({...duplicateProduct, quantity: parseInt(e.target.value) || 0})}
                      placeholder="Enter quantity"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
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
                  <div>
                    <Label htmlFor="duplicate-thickness">Thickness</Label>
                    <Select
                      value={duplicateProduct.thickness}
                      onValueChange={(value) => setDuplicateProduct({...duplicateProduct, thickness: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select thickness" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="N/A" className="text-gray-500 italic">
                          N/A (No Thickness)
                        </SelectItem>
                        {getFilteredThicknesses().map(thickness => (
                          <SelectItem key={thickness} value={thickness}>
                            {thickness}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
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

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="duplicate-height">Height</Label>
                    <Input
                      id="duplicate-height"
                      value={duplicateProduct.height}
                      onChange={(e) => setDuplicateProduct({...duplicateProduct, height: e.target.value})}
                      placeholder="Enter height (e.g., 2.74m)"
                    />
                  </div>
                  <div>
                    <Label htmlFor="duplicate-location">Location</Label>
                    <Input
                      id="duplicate-location"
                      value=""
                      onChange={() => {}} // Location is not used for main products
                      placeholder="Location set during production"
                      disabled
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
              <Button variant="outline" onClick={() => setIsDuplicateProductOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveDuplicateProduct}>
                Save as New Product
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Product Dialog */}
        <Dialog open={isEditProductOpen} onOpenChange={setIsEditProductOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Product</DialogTitle>
              <DialogDescription>
                Update the product details.
              </DialogDescription>
            </DialogHeader>
            
            {selectedProduct && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-name">Product Name *</Label>
                    <Input
                      id="edit-name"
                      value={selectedProduct.name}
                      onChange={(e) => setSelectedProduct({...selectedProduct, name: e.target.value})}
                      placeholder="Enter product name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-category">Category *</Label>
                    <Select
                      value={selectedProduct.category}
                      onValueChange={(value) => setSelectedProduct({...selectedProduct, category: value})}
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
                    <Label htmlFor="edit-color">Color</Label>
                    <Select
                      value={selectedProduct.color}
                      onValueChange={(value) => setSelectedProduct({...selectedProduct, color: value})}
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
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-pattern">Pattern</Label>
                    <Select
                      value={selectedProduct.pattern}
                      onValueChange={(value) => setSelectedProduct({...selectedProduct, pattern: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select pattern" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="N/A" className="text-gray-500 italic">
                          N/A (No Pattern)
                        </SelectItem>
                        {dropdownOptions.patterns.map(opt => opt.value).map((pattern) => (
                          <SelectItem key={pattern} value={pattern}>
                            {pattern}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-unit">Unit *</Label>
                    <Select
                      value={selectedProduct.unit}
                      onValueChange={(value) => setSelectedProduct({...selectedProduct, unit: value})}
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
                    <Label htmlFor="edit-quantity">Quantity *</Label>
                    <Input
                      id="edit-quantity"
                      type="number"
                      value={selectedProduct.quantity}
                      onChange={(e) => setSelectedProduct({...selectedProduct, quantity: parseInt(e.target.value) || 0})}
                      placeholder="Enter quantity"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-weight">Weight</Label>
                    <Select
                      value={selectedProduct.weight}
                      onValueChange={(value) => setSelectedProduct({...selectedProduct, weight: value})}
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
                  <div>
                    <Label htmlFor="edit-thickness">Thickness</Label>
                    <Select
                      value={selectedProduct.thickness}
                      onValueChange={(value) => setSelectedProduct({...selectedProduct, thickness: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select thickness" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="N/A" className="text-gray-500 italic">
                          N/A (No Thickness)
                        </SelectItem>
                        {getFilteredThicknesses().map(thickness => (
                          <SelectItem key={thickness} value={thickness}>
                            {thickness}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-location">Location</Label>
                    <Input
                      id="edit-location"
                      value=""
                      onChange={() => {}} // Location is not used for main products
                      placeholder="Location set during production"
                      disabled
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="edit-notes">Notes</Label>
                  <Textarea
                    id="edit-notes"
                    value={selectedProduct.notes}
                    onChange={(e) => setSelectedProduct({...selectedProduct, notes: e.target.value})}
                    placeholder="Enter product notes"
                    rows={3}
                  />
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditProductOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveEditProduct}>
                Update Product
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
                  <p><strong>Available Stock:</strong> {getAvailablePieces(selectedQRProduct.id)} {selectedQRProduct.unit}</p>
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
      </div>
    );
  }