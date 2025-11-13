import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  ArrowLeft, Package, Factory, Plus, Trash2, Save,
  Truck, AlertTriangle, FileSpreadsheet, CheckCircle, Info, Search,
  XCircle, X, Settings, User, QrCode
  } from "lucide-react";
  import { generateUniqueId } from "@/lib/storageUtils";
import ProductService from "@/services/api/productService";
import RecipeService from "@/services/api/recipeService";
import { RawMaterialService as MongoDBRawMaterialService } from "@/services/api/rawMaterialService";
import { IndividualProductService } from "@/services/api/individualProductService";
import { MachineService, Machine } from "@/services/api/machineService";
import MaterialConsumptionService from "@/services/api/materialConsumptionService";
import { ProductionService } from "@/services/api/productionService";
import { MongoDBNotificationService } from "@/services/api/notificationService";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loading } from "@/components/ui/loading";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ProductionProgressBar from "@/components/production/ProductionProgressBar";

interface MaterialConsumption {
  materialId: string;
  materialName: string;
  quantity: number;
  unit: string;
  consumedAt: string;
  individualProductIds?: string[]; // For individual products
}

interface WasteItem {
  materialId: string;
  materialName: string;
  quantity: number;
  unit: string;
  wasteType: string;
  canBeReused: boolean;
  notes: string;
}

interface ExpectedProduct {
  name: string;
  category: string;
  length: string;
  width: string;
  weight: string;
  materialComposition: string;
  qualityGrade: string;
}

interface ProductionProduct {
  id: string;
  productId: string;
  productName: string;
  category: string;
  color: string;
  length: string;
  width: string;
  pattern: string;
  targetQuantity: number;
  unit: string;
  priority: "normal" | "high" | "urgent";
  status: "planning" | "active" | "completed";
  expectedCompletion: string;
  createdAt: string;
  materialsConsumed: MaterialConsumption[];
  wasteGenerated: WasteItem[];
  expectedProduct: ExpectedProduct;
  notes: string;
}

interface RawMaterial {
  id: string;
  name: string;
  type?: string;
  category: string;
  current_stock: number;
  unit: string;
  cost_per_unit: number;
  supplier_name?: string;
  status: "in-stock" | "low-stock" | "out-of-stock" | "overstock" | "in-transit";
  batch_number?: string;
  selectedQuantity?: number;
  baseQuantity?: number;
  totalQuantity?: number;
  material_type?: 'product' | 'raw_material';
  selectedIndividualProducts?: any[];
}

export default function ProductionDetail() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [productionProduct, setProductionProduct] = useState<ProductionProduct | null>(null);
  const [isAddingMaterial, setIsAddingMaterial] = useState(false);
  const [isEditingExpected, setIsEditingExpected] = useState(false);
  const [isMaterialSelectionOpen, setIsMaterialSelectionOpen] = useState(false);
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [individualProducts, setIndividualProducts] = useState<any[]>([]);
  const [materialSearchTerm, setMaterialSearchTerm] = useState("");
  const [selectedMaterials, setSelectedMaterials] = useState<Array<RawMaterial & { selectedQuantity: number }>>([]);
  const [materialTypeFilter, setMaterialTypeFilter] = useState<'all' | 'materials' | 'products' | 'individual'>('all');
  const [selectedIndividualProducts, setSelectedIndividualProducts] = useState<{[key: string]: any[]}>({});
  const [showIndividualProductDetails, setShowIndividualProductDetails] = useState(false);
  const [selectedIndividualProductDetails, setSelectedIndividualProductDetails] = useState<any>(null);
  
  // Individual product selection for recipe
  const [showIndividualProductSelection, setShowIndividualProductSelection] = useState(false);
  const [currentSelectingProduct, setCurrentSelectingProduct] = useState<any>(null);
  const [selectedIndividualProductsForRecipe, setSelectedIndividualProductsForRecipe] = useState<{[key: string]: any[]}>({});
  
  // QR Code display
  const [showQRCode, setShowQRCode] = useState(false);
  const [selectedQRProduct, setSelectedQRProduct] = useState<any>(null);
  const [materialsFromRecipe, setMaterialsFromRecipe] = useState(false);
  const [productRecipe, setProductRecipe] = useState<any>(null);
  
  // Machine selection popup states
  const [showMachineSelectionPopup, setShowMachineSelectionPopup] = useState(false);
  const [showAddMachinePopup, setShowAddMachinePopup] = useState(false);
  const [selectedMachineId, setSelectedMachineId] = useState("");
  const [inspectorName, setInspectorName] = useState("");
  const [machines, setMachines] = useState<Machine[]>([]);
  const [productionFlow, setProductionFlow] = useState<any>(null);
  
  // New machine form
  const [newMachineForm, setNewMachineForm] = useState({
    name: "",
    machine_type: "",
    description: ""
  });
  
  // Material consumption form
  const [newMaterial, setNewMaterial] = useState({
    materialId: "",
    materialName: "",
    quantity: "",
    unit: ""
  });


  // Expected product form
  const [expectedProduct, setExpectedProduct] = useState<ExpectedProduct>({
    name: "",
    category: "",
    length: "",
    width: "",
    weight: "",
    materialComposition: "",
    qualityGrade: ""
  });


  useEffect(() => {
    const loadProductData = async () => {
      if (productId) {
        try {
          // Load actual product data from Supabase
          const response = await ProductService.getProducts();
          const products = response.data || [];
          
          // Use the product ID directly (no PROD_ prefix needed)
          const actualProductId = productId;
          const actualProduct = products.find((p: any) => p.id === actualProductId);
          
          console.log('Looking for product ID:', actualProductId);
          console.log('Available products:', products.map(p => p.id));
          
          if (actualProduct) {
            // Get target quantity from navigation state first
            let targetQuantity = location.state?.targetQuantity;
            let batchId = location.state?.batchId;
            
            // If not in state, try to load from production batch in database
            if (!targetQuantity) {
              try {
                // If we have a batchId from state, use it to get the specific batch
                let batchToUse = null;
                
                if (batchId) {
                  // Get specific batch by ID
                  const { data: specificBatch, error: batchError } = await ProductionService.getProductionBatchById(batchId);
                  if (!batchError && specificBatch) {
                    batchToUse = specificBatch;
                    console.log('✅ Found batch by ID:', batchId);
                  }
                }
                
                // If no specific batch found, search by product_id
                if (!batchToUse) {
                  const { data: batches, error } = await ProductionService.getProductionBatches({
                    product_id: actualProductId
                  });
                  
                  if (!error && batches && batches.length > 0) {
                    // Find the most recent batch that's not completed
                    const activeBatch = batches.find((b: any) => 
                      b.status !== 'completed' && b.status !== 'cancelled'
                    ) || batches[0];
                    
                    if (activeBatch) {
                      batchToUse = activeBatch;
                      batchId = activeBatch.id;
                    }
                  }
                }
                
                if (batchToUse && batchToUse.batch_size) {
                  targetQuantity = batchToUse.batch_size;
                  console.log('✅ Loaded targetQuantity from database batch:', targetQuantity, 'batch_id:', batchId);
                }
              } catch (error) {
                console.log('⚠️ Error loading batch from database:', error);
              }
            }
            
            // Default to 1 only if not found in state or database
            if (!targetQuantity) {
              targetQuantity = 1;
            }
            
            console.log('✅ Product found:', actualProduct.name);
            console.log('📐 Product dimensions:', actualProduct.length, '×', actualProduct.width);
            console.log('📊 Target quantity:', targetQuantity);
            
            const product: ProductionProduct = {
              id: productId,
              productId: actualProduct.id,
              productName: actualProduct.name,
              category: actualProduct.category,
              color: actualProduct.color || 'NA',
              length: actualProduct.length || 'N/A',
              width: actualProduct.width || 'N/A',
              pattern: actualProduct.pattern || 'NA',
              targetQuantity: targetQuantity,
              unit: actualProduct.unit,
              priority: "normal",
              status: "planning",
              expectedCompletion: new Date().toISOString(),
              createdAt: new Date().toISOString(),
              materialsConsumed: [],
              wasteGenerated: [],
              expectedProduct: {
                name: actualProduct.name,
                category: actualProduct.category,
                length: actualProduct.length || '8 ft',
                width: actualProduct.width || '10 ft',
                weight: actualProduct.weight || '45 kg',
                materialComposition: '',
                qualityGrade: "A+"
              },
              notes: ""
            };
            setProductionProduct(product);
            
            // Auto-fill expected product details from actual product data
            setExpectedProduct({
              name: actualProduct.name,
              category: actualProduct.category,
              length: actualProduct.length|| '8 ft',
              width: actualProduct.width || '10 ft',
              weight: actualProduct.weight || '45 kg',
              materialComposition: '',
              qualityGrade: "A+"
            });
            
          } else {
            console.error('Product not found:', actualProductId);
            // Fallback to mock data if product not found
            const fallbackProduct: ProductionProduct = {
              id: productId,
              productId: actualProductId,
              productName: "Product Not Found",
              category: "Unknown",
              color: "N/A",
              length: "N/A",
              width: "N/A",
              pattern: "N/A",
              targetQuantity: 1,
              unit: '',
              priority: "normal",
              status: "planning",
              expectedCompletion: new Date().toISOString(),
              createdAt: new Date().toISOString(),
              materialsConsumed: [],
              wasteGenerated: [],
              expectedProduct: {
                name: "Product Not Found",
                category: "Unknown",
                length: "",
                width: "",
                weight: "",
                materialComposition: "",
                qualityGrade: "A+"
              },
              notes: ""
            };
            setProductionProduct(fallbackProduct);
          }
        } catch (error) {
          console.error('Error loading product data:', error);
        }
      }
    };
    
    loadProductData();
    
    // Load raw materials from Supabase
    const loadRawMaterials = async () => {
      try {
        const { data: materials, error } = await MongoDBRawMaterialService.getRawMaterials();
        if (error) {
          console.error('Error loading raw materials:', error);
        } else {
          // Use materials directly from Supabase (already in correct format)
          const mappedMaterials = materials || [];
          setRawMaterials(mappedMaterials);
          console.log('✅ Loaded', mappedMaterials.length, 'raw materials from Supabase');
          return mappedMaterials;
        }
      } catch (error) {
        console.error('Error loading raw materials:', error);
      }
      return [];
    };

    // Load products for recipe ingredients
    const loadProducts = async () => {
      try {
        // Load products from MongoDB
        const { data: productsData, error } = await ProductService.getProducts();
        
        if (error) {
          console.error('Error loading products:', error);
        } else {
          // Map products to include individual product count
          const productsWithIndividualCount = (productsData || []).map(product => ({
            ...product,
            individual_count: 0 // TODO: Calculate from individual products
          }));
          
          setProducts(productsWithIndividualCount);
          console.log('✅ Loaded', productsWithIndividualCount?.length || 0, 'products for recipe ingredients');
          return productsWithIndividualCount || [];
        }
      } catch (error) {
        console.error('Error loading products:', error);
      }
      return [];
    };

    // Load individual products for products with individual tracking
    const loadIndividualProducts = async () => {
      try {
        const { data: individualProductsData, error } = await IndividualProductService.getAllAvailableIndividualProducts();
        if (error) {
          console.error('Error loading individual products:', error);
        } else {
          setIndividualProducts(individualProductsData || []);
          console.log('✅ Loaded', individualProductsData?.length || 0, 'individual products');
          return individualProductsData || [];
        }
      } catch (error) {
        console.error('Error loading individual products:', error);
      }
      return [];
    };

    // Load all data first, then load recipe AFTER product is loaded
    Promise.all([
      loadRawMaterials(),
      loadProducts(),
      loadIndividualProducts()
    ]).then(async () => {
      // Wait a bit for productionProduct to be set, then load recipe
      // Recipe loading will recalculate if productionProduct is available
      setTimeout(() => {
        if (productId) {
          const actualProductId = productId;
          console.log('Loading recipe after all data is ready...');
          loadProductRecipe(actualProductId);
        }
      }, 100);
    });

    // Load machines from MongoDB
    const loadMachines = async () => {
      try {
        const { data: machinesData, error } = await MachineService.getMachines();
        if (error) {
          console.error('Error loading machines:', error);
          setMachines([]);
        } else {
          // Map backend fields to frontend format
          const mappedMachines = (machinesData || []).map((machine: any) => ({
            id: machine.id,
            name: machine.machine_name || machine.name,
            description: machine.notes || machine.description || "",
            status: machine.status,
            created_at: machine.created_at,
            updated_at: machine.updated_at
          }));
          setMachines(mappedMachines);
          console.log('✅ Loaded', mappedMachines.length, 'machines from MongoDB:', mappedMachines);
        }
      } catch (error) {
        console.error('Error loading machines:', error);
        setMachines([]);
      }
    };
    
    loadMachines();
    
    // Production flow functionality removed
  }, [productId, navigate]);

  // Auto-fill inspector name when machine selection dialog opens
  useEffect(() => {
    if (showMachineSelectionPopup && user?.full_name) {
      // Only auto-fill if field is empty
      if (!inspectorName || inspectorName.trim() === '') {
        setInspectorName(user.full_name);
      }
    }
  }, [showMachineSelectionPopup, user?.full_name, inspectorName]);

  // Recalculate materials when productionProduct dimensions change OR when recipe loads OR when materials are first set
  useEffect(() => {
    // Only recalculate if we have both recipe and product with valid dimensions
    if (productRecipe?.materials && productRecipe.materials.length > 0 &&
        productionProduct && productionProduct.length && productionProduct.width &&
        selectedMaterials.length > 0) {

      const length = parseFloat(productionProduct.length.toString().replace(/[^\d.]/g, '')) || 0;
      const width = parseFloat(productionProduct.width.toString().replace(/[^\d.]/g, '')) || 0;

      // Only recalculate if dimensions are valid (not 0)
      if (length > 0 && width > 0) {
        // Only recalculate if materials were just added from recipe (baseQuantity equals quantity_per_sqm from recipe)
        // Don't recalculate if user has manually edited the values
        const needsRecalculation = selectedMaterials.some(m => {
          const recipeQty = (m as any).quantity_per_sqm;
          // Only recalculate if baseQuantity matches recipe quantity exactly (meaning it hasn't been manually edited)
          return m.baseQuantity === recipeQty && recipeQty !== undefined && recipeQty !== null;
        });

        // Only recalculate on initial load or when dimensions change, not when user is editing
        if (needsRecalculation) {
          console.log('🔄 Recalculating materials due to productionProduct dimensions update...');
          console.log('📐 Dimensions:', length, '×', width, '=', length * width, 'sqm');
          const calculatedMaterials = calculateMaterialsForProduction(productRecipe, productionProduct.targetQuantity || 1);

          // Update only the quantities, keep other material properties
          setSelectedMaterials(prevMaterials => {
            const updated = prevMaterials.map((material) => {
              const calculated = calculatedMaterials.find((cm: any) => cm.material_id === material.id);
              const recipeQty = (material as any).quantity_per_sqm;
              // Only update if this material hasn't been manually edited (baseQuantity still matches recipe)
              if (calculated && material.baseQuantity === recipeQty) {
                console.log(`  ✅ ${material.name}: base=${calculated.baseQuantity}, total=${calculated.requiredQuantity}`);
                return {
                  ...material,
                  selectedQuantity: calculated.requiredQuantity || material.selectedQuantity,
                  baseQuantity: calculated.baseQuantity || material.baseQuantity,
                  totalQuantity: calculated.requiredQuantity || material.totalQuantity
                };
              }
              // Keep user's manual edits
              return material;
            });

            // Only update if values actually changed to avoid infinite loops
            const hasChanges = updated.some((m, i) =>
              m.totalQuantity !== prevMaterials[i]?.totalQuantity ||
              m.baseQuantity !== prevMaterials[i]?.baseQuantity
            );

            return hasChanges ? updated : prevMaterials;
          });
          console.log('✅ Materials recalculated after productionProduct update');
        }
      }
    }
  }, [productionProduct?.length, productionProduct?.width, productionProduct?.targetQuantity, productRecipe?.id]);

  // Load product recipe
  const loadProductRecipe = async (productId: string) => {
    try {
      const recipeResponse = await RecipeService.getRecipeByProductId(productId);
      if (recipeResponse && recipeResponse.data) {
        const recipe = recipeResponse.data;
        console.log('🔍 Raw recipe data from API:', recipe);
        
        // Ensure recipe has proper ID fields (MongoDB uses _id, API may return id)
        const recipeId = recipe.id || (recipe as any)._id || recipe.product_id;
        const productIdFromRecipe = recipe.product_id || productId;
        
        console.log('🔍 Recipe ID fields:', { 
          id: recipeId, 
          _id: (recipe as any)._id, 
          product_id: productIdFromRecipe,
          hasId: !!recipeId 
        });
        
        // Set recipe with proper ID fields
        const recipeWithId = {
          ...recipe,
          id: recipeId,
          product_id: productIdFromRecipe
        };
        
        setProductRecipe(recipeWithId);
        console.log('Product recipe loaded with ID:', recipeId);

        // Auto-populate materials from recipe if available
        if (recipe.materials && recipe.materials.length > 0) {
          // Get current raw materials - either from state or fetch fresh
          let currentRawMaterials = rawMaterials;
          if (currentRawMaterials.length === 0) {
            try {
              const { data: materials } = await MongoDBRawMaterialService.getRawMaterials();
              currentRawMaterials = materials || [];
              console.log('Fetched raw materials for recipe loading:', currentRawMaterials.length);
            } catch (error) {
              console.error('Error fetching raw materials for recipe:', error);
            }
          }

          // Get current products - either from state or fetch fresh
          let currentProducts = products;
          if (currentProducts.length === 0) {
            try {
              // Use the same query as loadProducts to ensure individual_count is included
              const { data: productsData, error } = await ProductService.getProducts();
              
              if (error) {
                console.error('Error fetching products for recipe:', error);
                currentProducts = [];
              } else {
                // Map products to include individual product count
                currentProducts = (productsData || []).map(product => ({
                  ...product,
                  individual_count: 0 // TODO: Calculate from individual products
                }));
                console.log('Fetched products for recipe loading:', currentProducts.length);
              }
            } catch (error) {
              console.error('Error fetching products for recipe:', error);
              currentProducts = [];
            }
          }
          
          console.log('Available products for recipe:', currentProducts.map(p => ({ id: p.id, name: p.name })));

          // Wait for productionProduct to have dimensions before calculating
          // If dimensions are not available yet, the useEffect will recalculate later
          const hasDimensions = productionProduct?.length && productionProduct?.width;
          const length = parseFloat((productionProduct?.length || "0").toString().replace(/[^\d.]/g, '')) || 0;
          const width = parseFloat((productionProduct?.width || "0").toString().replace(/[^\d.]/g, '')) || 0;
          
          if (!hasDimensions || length === 0 || width === 0) {
            console.warn('⚠️ Product dimensions not available yet, will recalculate when dimensions are loaded');
            // Set materials with base quantities only for now, will be recalculated by useEffect
            const recipeMaterials = recipe.materials.map((material: any) => {
              const rawMaterial = currentRawMaterials.find(rm => rm.id === material.material_id);
              const productMaterial = currentProducts.find(p => p.id === material.material_id);
              
              let stockValue = 0;
              if (productMaterial) {
                stockValue = productMaterial.individual_count || 0;
              } else if (rawMaterial) {
                stockValue = rawMaterial.current_stock || 0;
              }
              
              return {
                id: material.material_id,
                name: material.material_name,
                type: rawMaterial?.type || material.type || '',
                category: rawMaterial?.category || material.category || '',
                current_stock: stockValue,
                unit: productMaterial?.unit || rawMaterial?.unit || material.unit,
                cost_per_unit: rawMaterial?.cost_per_unit || material.cost_per_unit || 0,
                supplier_name: rawMaterial?.supplier_name || material.supplier_name || (productMaterial ? "Product Inventory" : "From Recipe"),
                status: rawMaterial?.status || 'in-stock',
                batch_number: rawMaterial?.batch_number || material.batch_number || '',
                selectedQuantity: material.quantity_per_sqm || 1,
                baseQuantity: material.quantity_per_sqm || 1,
                totalQuantity: material.quantity_per_sqm || 1, // Will be recalculated by useEffect
                material_type: (productMaterial ? 'product' : 'raw_material') as 'product' | 'raw_material'
              };
            });
            
            setSelectedMaterials(recipeMaterials);
            setMaterialsFromRecipe(true);
            return; // Exit early, useEffect will recalculate when dimensions are available
          }

          // Calculate materials based on current production quantity
          const calculatedMaterials = calculateMaterialsForProduction(recipe, productionProduct?.targetQuantity || 1);

          const recipeMaterials = await Promise.all(calculatedMaterials.map(async (material: any) => {
            // Check if it's a raw material or a product
            const rawMaterial = currentRawMaterials.find(rm => rm.id === material.material_id);
            const productMaterial = currentProducts.find(p => p.id === material.material_id);
            
            // Use whichever is found (raw material or product)
            const foundMaterial = rawMaterial || productMaterial;

            // Determine stock based on material type
            let stockValue = 0;
            if (productMaterial) {
              // For products, use individual product count
              stockValue = productMaterial.individual_count || 0;
              
              // If individual_count is 0, try to fetch individual products directly
              if (stockValue === 0) {
                try {
                  const { data: individualProducts, error } = await IndividualProductService.getIndividualProductsByProductId(material.material_id);
                  
                  if (!error && individualProducts) {
                    stockValue = individualProducts.length;
                    console.log(`📦 Fetched individual products directly for ${material.material_name}:`, stockValue);
                  }
                } catch (error) {
                  console.warn(`Error fetching individual products for ${material.material_name}:`, error);
                }
              }
              
              console.log(`📦 Product in recipe: ${material.material_name}`, {
                id: material.material_id,
                individual_count: productMaterial.individual_count,
                individual_products: productMaterial.individual_products,
                stockValue,
                material_type: 'product'
              });
            } else if (rawMaterial) {
              // For raw materials, use current_stock
              stockValue = rawMaterial.current_stock || 0;
              console.log(`🔧 Raw Material in recipe: ${material.material_name}`, {
                id: material.material_id,
                current_stock: rawMaterial.current_stock,
                stockValue,
                material_type: 'raw_material'
              });
            } else {
              console.warn(`⚠️ Material not found: ${material.material_name} (${material.material_id})`);
            }

            return {
              id: material.material_id,
              name: material.material_name,
              type: rawMaterial?.type || material.type || '',
              category: foundMaterial?.category || material.category || '',
              current_stock: stockValue,
              unit: productMaterial?.unit || rawMaterial?.unit || material.unit,
              cost_per_unit: rawMaterial?.cost_per_unit || material.cost_per_unit || 0,
              supplier_name: rawMaterial?.supplier_name || material.supplier_name || (productMaterial ? "Product Inventory" : "From Recipe"),
              status: foundMaterial?.status || 'in-stock',
              batch_number: rawMaterial?.batch_number || material.batch_number || '',
              selectedQuantity: material.requiredQuantity || material.quantity_per_sqm || 1,
              baseQuantity: material.quantity_per_sqm || 1,
              totalQuantity: material.requiredQuantity || material.quantity_per_sqm || 1,
              material_type: (productMaterial ? 'product' : 'raw_material') as 'product' | 'raw_material' // Add material type for identification
            };
          }));

          console.log('✅ Setting selected materials with material_type:', recipeMaterials.map(m => ({ 
            name: m.name, 
            material_type: m.material_type, 
            current_stock: m.current_stock 
          })));
          setSelectedMaterials(recipeMaterials);
          setMaterialsFromRecipe(true);

          toast({
            title: "Recipe loaded",
            description: `${recipe.materials.length} materials loaded for ${productionProduct?.targetQuantity || 1} ${productionProduct?.unit}`,
          });
        }
      } else {
        console.log('No recipe found for product:', productId);
      }
    } catch (error) {
      console.error('Error loading product recipe:', error);
    }
  };

  // Calculate materials needed for production quantity based on base unit recipe
  const calculateMaterialsForProduction = (recipe: any, productionQuantity: number) => {
    if (!recipe || !recipe.materials) {
      return [];
    }

    // Always use "sqm" as base unit for recipes with base quantity 1
    const baseUnit = "sqm";
    const baseQuantity = 1; // Always 1 for 1 sqm
    console.log(`🧮 Calculating materials for ${productionQuantity} units based on recipe with base quantity ${baseQuantity} for 1 ${baseUnit}`);

    // Calculate total area needed
    // Parse length and width - handle strings like "3 m" or "3m" or just "3"
    const lengthStr = productionProduct?.length || "0";
    const widthStr = productionProduct?.width || "0";
    
    // Extract numeric value from string (handles "3 m", "3m", "3", etc.)
    const productLength = parseFloat(lengthStr.toString().replace(/[^\d.]/g, '')) || 0;
    const productWidth = parseFloat(widthStr.toString().replace(/[^\d.]/g, '')) || 0;
    
    const areaPerUnit = productLength * productWidth; // sqm per unit
    const totalArea = productionQuantity * areaPerUnit; // total sqm needed

    console.log(`📐 Product dimensions: ${lengthStr} × ${widthStr} = ${productLength}m × ${productWidth}m = ${areaPerUnit} sqm per unit`);
    console.log(`📊 Total area needed: ${productionQuantity} units × ${areaPerUnit} sqm = ${totalArea} sqm`);
    console.log(`🔢 Base quantity: ${baseQuantity} (for 1 sqm)`);

    return recipe.materials.map((material: any) => {
      const materialQuantityPerSqm = material.quantity_per_sqm || 1; // quantity per 1 sqm
      let requiredQuantity = materialQuantityPerSqm * totalArea; // total sqm needed

      // Check if this material is a PRODUCT (not raw material)
      const materialProduct = products.find(p => p.id === material.material_id);

      if (materialProduct) {
        // This is a product - convert SQM to pieces based on product dimensions
        const matLength = parseFloat((materialProduct.length || "0").toString().replace(/[^\d.]/g, '')) || 0;
        const matWidth = parseFloat((materialProduct.width || "0").toString().replace(/[^\d.]/g, '')) || 0;
        const sqmPerPiece = matLength * matWidth; // sqm per piece of this product

        if (sqmPerPiece > 0) {
          // Convert sqm to pieces: total sqm needed ÷ sqm per piece
          const piecesNeeded = requiredQuantity / sqmPerPiece;
          console.log(`  - 🔄 ${material.material_name} (PRODUCT): ${requiredQuantity} sqm ÷ ${sqmPerPiece} sqm/piece = ${piecesNeeded} pieces`);
          requiredQuantity = piecesNeeded;
        } else {
          console.log(`  - ⚠️ ${material.material_name} (PRODUCT): No dimensions, treating as ${requiredQuantity} units`);
        }
      } else {
        console.log(`  - ${material.material_name} (RAW MATERIAL): ${materialQuantityPerSqm} ${material.unit} for 1 sqm × ${totalArea} sqm = ${requiredQuantity} ${material.unit}`);
      }

      return {
        ...material,
        requiredQuantity: requiredQuantity,
        baseQuantity: materialQuantityPerSqm
      };
    });
  };

  // Handle production quantity change and recalculate materials
  const handleProductionQuantityChange = async (newQuantity: number) => {
    if (!productionProduct) return;

    // Update production product quantity
    const updatedProduct = {
      ...productionProduct,
      targetQuantity: newQuantity
    };
    setProductionProduct(updatedProduct);

    // Save to database batch if batch exists
    try {
      // Try to find the batch ID from state first
      let batchId = location.state?.batchId;
      
      // If no batchId in state, try to find from database
      if (!batchId && productionProduct?.productId) {
        const { data: batches, error } = await ProductionService.getProductionBatches({
          product_id: productionProduct.productId
        });
        
        if (!error && batches && batches.length > 0) {
          // Find the most recent batch that's not completed
          const activeBatch = batches.find((b: any) => 
            b.status !== 'completed' && b.status !== 'cancelled'
          ) || batches[0];
          
          if (activeBatch) {
            batchId = activeBatch.id;
            console.log('✅ Found batch ID from database:', batchId);
          }
        }
      }
      
      // Update batch in database if batch ID found
      if (batchId) {
        const { data: updatedBatch, error: updateError } = await ProductionService.updateProductionBatch(batchId, {
          batch_size: newQuantity
        });
        
        if (updateError) {
          console.error('❌ Error updating batch_size in database:', updateError);
        } else {
          console.log('✅ Updated batch_size in database:', newQuantity, 'for batch:', batchId);
        }
      } else {
        console.warn('⚠️ No batch ID found, cannot save targetQuantity to database');
      }
    } catch (error) {
      console.error('⚠️ Error updating batch_size in database:', error);
      // Don't fail the operation if database update fails
    }

    // Recalculate materials if recipe exists
    if (productRecipe && productRecipe.recipe_materials) {
      const calculatedMaterials = calculateMaterialsForProduction(productRecipe, newQuantity);
      
      // Get current raw materials for stock information
      let currentRawMaterials = rawMaterials;
      if (currentRawMaterials.length === 0) {
        // Try to get fresh data
        MongoDBRawMaterialService.getRawMaterials().then(({ data: materials }) => {
          currentRawMaterials = materials || [];
          updateMaterialsFromCalculation(calculatedMaterials, currentRawMaterials);
        });
      } else {
        updateMaterialsFromCalculation(calculatedMaterials, currentRawMaterials);
      }
    }
  };

  // Update materials based on calculation
  const updateMaterialsFromCalculation = async (calculatedMaterials: any[], currentRawMaterials: any[]) => {
    // Get current products with individual counts
    let currentProducts = products;
    if (currentProducts.length === 0) {
      try {
        const { data: productsData, error } = await ProductService.getProducts();
        
        if (!error && productsData) {
          currentProducts = productsData.map(product => ({
            ...product,
            individual_count: 0 // TODO: Calculate from individual products
          }));
        }
      } catch (error) {
        console.error('Error fetching products for recalculation:', error);
      }
    }

    const recipeMaterials = await Promise.all(calculatedMaterials.map(async (material: any) => {
      const rawMaterial = currentRawMaterials.find(rm => rm.id === material.material_id);
      const productMaterial = currentProducts.find(p => p.id === material.material_id);
      
      // Determine stock based on material type
      let stockValue = 0;
      if (productMaterial) {
        // For products, use individual product count
        stockValue = productMaterial.individual_count || 0;
        
        // If individual_count is 0, try to fetch individual products directly
        if (stockValue === 0) {
          try {
            const { data: individualProducts, error } = await IndividualProductService.getIndividualProductsByProductId(material.material_id);
            
            if (!error && individualProducts) {
              stockValue = individualProducts.length;
              console.log(`📦 Fetched individual products directly for ${material.material_name}:`, stockValue);
            }
          } catch (error) {
            console.warn(`Error fetching individual products for ${material.material_name}:`, error);
          }
        }
      } else if (rawMaterial) {
        stockValue = rawMaterial.current_stock || 0;
      }

      return {
        id: material.material_id,
        name: material.material_name,
        brand: rawMaterial?.brand || material.brand || '',
        category: rawMaterial?.category || material.category || '',
        current_stock: stockValue,
        unit: productMaterial?.unit || rawMaterial?.unit || material.unit,
        cost_per_unit: rawMaterial?.cost_per_unit || material.cost_per_unit || 0,
        supplier_name: rawMaterial?.supplier_name || material.supplier_name || (productMaterial ? "Product Inventory" : "From Recipe"),
        status: rawMaterial?.status || 'in-stock',
        batch_number: rawMaterial?.batch_number || material.batch_number || '',
        selectedQuantity: material.requiredQuantity || material.quantity_per_sqm || 1,
        baseQuantity: material.baseQuantity || material.quantity_per_sqm || 1,
        totalQuantity: material.requiredQuantity || material.quantity_per_sqm || 1,
        material_type: (productMaterial ? 'product' : 'raw_material') as 'product' | 'raw_material' // Add material type for identification
      };
    }));

    setSelectedMaterials(recipeMaterials);
    setMaterialsFromRecipe(true);

    toast({
      title: "Materials recalculated",
      description: "Material quantities updated for new production quantity",
    });
  };

  // Handle material quantity change (two-way calculation)
  const handleMaterialQuantityChange = (materialId: string, newTotalQuantity: number, isBaseQuantity: boolean = false) => {
    if (!productionProduct) return;

    const productionQuantity = productionProduct.targetQuantity || 1;
    
    // Calculate total area needed
    const productLength = parseFloat(productionProduct?.length || "0");
    const productWidth = parseFloat(productionProduct?.width || "0");
    const areaPerUnit = productLength * productWidth; // sqm per unit
    const totalArea = productionQuantity * areaPerUnit; // total sqm needed
    
    // If totalArea is 0, don't calculate (dimensions not set yet)
    if (totalArea === 0) {
      // Just update the field being edited without calculation
      setSelectedMaterials(prevMaterials => {
        return prevMaterials.map(material => {
          if (material.id === materialId) {
            if (isBaseQuantity) {
              return {
                ...material,
                baseQuantity: newTotalQuantity
              };
            } else {
              return {
                ...material,
                totalQuantity: newTotalQuantity,
                selectedQuantity: newTotalQuantity
              };
            }
          }
          return material;
        });
      });
      return;
    }
    
    setSelectedMaterials(prevMaterials => {
      return prevMaterials.map(material => {
        if (material.id === materialId) {
          let newBaseQuantity, newTotalQuantityCalculated;

          // Check if this material is a PRODUCT
          const materialProduct = products.find(p => p.id === material.id);

          if (isBaseQuantity) {
            // User changed base quantity (per 1 sqm), calculate total based on total area
            newBaseQuantity = newTotalQuantity;
            newTotalQuantityCalculated = newBaseQuantity * totalArea; // Multiply by total sqm

            // If it's a product, convert SQM to pieces
            if (materialProduct) {
              const matLength = parseFloat((materialProduct.length || "0").toString().replace(/[^\d.]/g, '')) || 0;
              const matWidth = parseFloat((materialProduct.width || "0").toString().replace(/[^\d.]/g, '')) || 0;
              const sqmPerPiece = matLength * matWidth;

              if (sqmPerPiece > 0) {
                newTotalQuantityCalculated = newTotalQuantityCalculated / sqmPerPiece; // Convert to pieces
              }
            }
          } else {
            // User changed total quantity, calculate base
            newTotalQuantityCalculated = newTotalQuantity;

            // If it's a product, convert pieces back to SQM for base calculation
            let sqmForBaseCalc = newTotalQuantity;
            if (materialProduct) {
              const matLength = parseFloat((materialProduct.length || "0").toString().replace(/[^\d.]/g, '')) || 0;
              const matWidth = parseFloat((materialProduct.width || "0").toString().replace(/[^\d.]/g, '')) || 0;
              const sqmPerPiece = matLength * matWidth;

              if (sqmPerPiece > 0) {
                sqmForBaseCalc = newTotalQuantity * sqmPerPiece; // Convert pieces to SQM
              }
            }

            newBaseQuantity = totalArea > 0 ? sqmForBaseCalc / totalArea : 0;
          }

          return {
            ...material,
            baseQuantity: newBaseQuantity,
            totalQuantity: newTotalQuantityCalculated,
            selectedQuantity: newTotalQuantityCalculated
          };
        }
        return material;
      });
    });
  };

  // NOTE: Recipe updates saved locally until machine step is added
  // When machine step is added, recipe is updated in database

  // SQM Calculation function (same as Products.tsx)
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

  // Auto-calculate recipe ratio for products (same as Products.tsx)
  const calculateProductRatio = (sourceProduct: any, targetProduct: any): number => {
    if (!sourceProduct || !targetProduct) return 0;
    
    // Use the actual units from the product data
    const sourceLengthUnit = sourceProduct.length_unit || sourceProduct.lengthUnit || 'feet';
    const sourceWidthUnit = sourceProduct.width_unit || sourceProduct.widthUnit || 'feet';
    const targetLengthUnit = targetProduct.length_unit || targetProduct.lengthUnit || 'feet';
    const targetWidthUnit = targetProduct.width_unit || targetProduct.widthUnit || 'feet';
    
    const sourceSQM = calculateSQM(
      sourceProduct.length || '0',
      sourceProduct.width || '0',
      sourceLengthUnit,
      sourceWidthUnit
    );
    const targetSQM = calculateSQM(
      targetProduct.length || '0',
      targetProduct.width || '0',
      targetLengthUnit,
      targetWidthUnit
    );
    
    console.log(`🔄 Ratio calculation: Source (${sourceProduct.length} ${sourceLengthUnit} × ${sourceProduct.width} ${sourceWidthUnit} = ${sourceSQM.toFixed(4)} SQM) / Target (${targetProduct.length} ${targetLengthUnit} × ${targetProduct.width} ${targetWidthUnit} = ${targetSQM.toFixed(4)} SQM) = ${targetSQM > 0 && sourceSQM > 0 ? (targetSQM / sourceSQM).toFixed(4) : '0'}`);
    
    if (sourceSQM === 0) return 0;
    return targetSQM / sourceSQM;
  };

  // Get available materials (in stock)
  const getAvailableMaterials = () => {
    return rawMaterials.filter(material => material.status === "in-stock" && material.current_stock > 0);
  };

  // Handle material selection change
  const handleMaterialSelection = (materialId: string) => {
    const selectedMaterial = rawMaterials.find(m => m.id === materialId);
    if (selectedMaterial) {
      setNewMaterial({
        materialId: selectedMaterial.id,
        materialName: selectedMaterial.name,
        quantity: "",
        unit: selectedMaterial.unit
      });
    }
  };

  // Handle material selection from popup with auto-calculation for products
  const handleMaterialSelectionFromPopup = (material: any) => {
    let autoCalculatedQuantity = "";
    
    // Check if it's a product (has length/width or is in products array)
    const isProduct = products.some(p => p.id === material.id) || 
                     (material.length && material.width) ||
                     material.individual_count !== undefined;
    
    if (isProduct && productionProduct) {
      // This is a product - auto-calculate the ratio for 1 SQM
      const ratio = calculateProductRatio(material, productionProduct);
      if (ratio > 0) {
        autoCalculatedQuantity = ratio.toFixed(4);
        console.log(`🔄 Auto-calculated ratio for PRODUCT: ${material.name} needs ${autoCalculatedQuantity} for 1 SQM of ${productionProduct.productName}`);
      }
    } else {
      // This is a raw material - let user type manually
      console.log(`📝 RAW MATERIAL selected: ${material.name} - User will type quantity manually`);
    }
    
    setNewMaterial({
      materialId: material.id,
      materialName: material.name,
      quantity: autoCalculatedQuantity, // Empty for raw materials, auto-filled for products
      unit: material.unit || ""
    });
    setIsMaterialSelectionOpen(false);
  };

  // Add material to selection with quantity (baseQuantity is per SQM)
  const addMaterialToSelection = (material: any, quantity: number) => {
    const existingIndex = selectedMaterials.findIndex(m => m.id === material.id);
    const quantityPerSqm = parseFloat(quantity.toString()) || 0;

    // Calculate total SQM for production
    const productionQuantity = productionProduct?.targetQuantity || 1;
    const productLength = parseFloat(productionProduct?.length || "0");
    const productWidth = parseFloat(productionProduct?.width || "0");
    const areaPerUnit = productLength * productWidth; // sqm per unit
    const totalArea = productionQuantity * areaPerUnit; // total sqm needed

    // Calculate total quantity based on quantity per SQM
    let totalQuantity = quantityPerSqm * totalArea;

    // Check if this material is a PRODUCT (not raw material)
    const materialProduct = products.find(p => p.id === material.id);
    const isProduct = products.some(p => p.id === material.id);

    if (materialProduct) {
      // This is a product - convert SQM to pieces based on product dimensions
      const matLength = parseFloat((materialProduct.length || "0").toString().replace(/[^\d.]/g, '')) || 0;
      const matWidth = parseFloat((materialProduct.width || "0").toString().replace(/[^\d.]/g, '')) || 0;
      const sqmPerPiece = matLength * matWidth; // sqm per piece of this product

      if (sqmPerPiece > 0) {
        // Convert sqm to pieces: total sqm needed ÷ sqm per piece
        const piecesNeeded = totalQuantity / sqmPerPiece;
        console.log(`  - 🔄 ${material.name} (PRODUCT): ${totalQuantity} sqm ÷ ${sqmPerPiece} sqm/piece = ${piecesNeeded} pieces`);
        totalQuantity = piecesNeeded;
      }
    }

    if (existingIndex >= 0) {
      // Update existing material quantity
      const updated = [...selectedMaterials];
      updated[existingIndex].baseQuantity = quantityPerSqm; // Store per SQM quantity
      updated[existingIndex].totalQuantity = totalQuantity; // Total quantity for production (pieces for products, units for raw materials)
      updated[existingIndex].selectedQuantity = totalQuantity; // Also update selectedQuantity
      setSelectedMaterials(updated);
    } else {
      // Add new material with baseQuantity (per SQM) and totalQuantity (for total production)
      const isProduct = products.some(p => p.id === material.id);
      setSelectedMaterials([...selectedMaterials, { 
        ...material, 
        baseQuantity: quantityPerSqm, // Store per SQM quantity
        totalQuantity: totalQuantity, // Total quantity for production
        selectedQuantity: totalQuantity, // Also set selectedQuantity to total
        material_type: isProduct ? 'product' as const : 'raw_material' as const
      }]);
    }
  };

  // Individual product selection functions for recipe
  const getAvailableIndividualProductsForRecipe = (productId: string) => {
    return individualProducts.filter(product => 
      product.product_id === productId && 
      product.status === 'available'
    );
  };

  const handleIndividualProductSelectionForRecipe = (productId: string, individualProduct: any, isSelected: boolean) => {
    setSelectedIndividualProductsForRecipe(prev => {
      const current = prev[productId] || [];
      let updated;
      
      if (isSelected) {
        if (!current.find(p => p.id === individualProduct.id)) {
          updated = [...current, individualProduct];
        } else {
          updated = current;
        }
      } else {
        updated = current.filter(p => p.id !== individualProduct.id);
      }
      
      return {
        ...prev,
        [productId]: updated
      };
    });
  };

  const autoSelectOldestProductsForRecipe = (productId: string, quantity: number) => {
    const available = getAvailableIndividualProductsForRecipe(productId);
    const sorted = available.sort((a, b) => {
      const dateA = new Date(a.manufacturingDate || a.productionDate || a.completionDate || 0);
      const dateB = new Date(b.manufacturingDate || b.productionDate || b.completionDate || 0);
      return dateA.getTime() - dateB.getTime();
    });
    
    const toSelect = sorted.slice(0, quantity);
    setSelectedIndividualProductsForRecipe(prev => ({
      ...prev,
      [productId]: toSelect
    }));
  };

  const handleSelectIndividualProducts = (product: any) => {
    setCurrentSelectingProduct({
      ...product,
      requiredQuantity: 1 // Default quantity, can be made editable
    });
    setShowIndividualProductSelection(true);
  };

  // Remove material from selection
  const removeMaterialFromSelection = (materialId: string) => {
    setSelectedMaterials(selectedMaterials.filter(m => m.id !== materialId));
  };

  // Save product recipe to database
  const saveProductRecipe = async (productionProduct: ProductionProduct) => {
    try {
      if (!productionProduct.materialsConsumed || productionProduct.materialsConsumed.length === 0) {
        return;
      }

      // Calculate total cost (removed since products don't have costs)
      const totalCost = 0;

      // Check if recipe already exists for this product
      console.log('Checking for existing recipe for product_id:', productionProduct.productId);
      const { data: existingRecipe, error: existingRecipeError } = await RecipeService.getRecipeByProductId(productionProduct.productId);

      console.log('Existing recipe check result:', { existingRecipe, existingRecipeError });

      let recipeId: string;

      if (existingRecipe && !existingRecipeError) {
        // Update existing recipe
        recipeId = existingRecipe.id;
        // TODO: Update recipe in MongoDB
        console.log('TODO: Update existing recipe in MongoDB');

        // TODO: Delete existing recipe materials for this specific recipe only
        console.log('TODO: Delete existing recipe materials for recipe_id:', recipeId);
      } else {
        // Create new recipe with custom ID
        recipeId = `RECIPE_${Date.now()}`;
        console.log('Creating new recipe with ID:', recipeId, 'for product_id:', productionProduct.productId);
        // TODO: Create recipe in MongoDB
        console.log('TODO: Create recipe in MongoDB');
      }

      // Insert recipe materials with custom IDs (include quantity for recipe loading)
      const recipeMaterials = productionProduct.materialsConsumed.map((material, index) => ({
        id: `RECIPE_MAT_${Date.now()}_${index}`,
        recipe_id: recipeId,
        material_id: material.materialId,
        material_name: material.materialName,
        quantity: material.quantity,
        unit: material.unit
      }));

      console.log('Attempting to save recipe materials for recipe_id:', recipeId);
      console.log('Recipe materials data:', recipeMaterials);

      // TODO: Save recipe materials in MongoDB
      console.log('TODO: Save recipe materials in MongoDB');
      console.log('Recipe materials data:', recipeMaterials);
    } catch (error) {
      console.error('Error saving product recipe:', error);
      toast({
        title: "Recipe error",
        description: "Failed to save product recipe. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Update production product function (local state only - no immediate database updates)
  const updateProductionProduct = async (updatedProduct: ProductionProduct) => {
    try {
      // Only update local state - no immediate database updates
      // Recipe will be saved only when production flow starts
      console.log('📝 Updating production product locally (recipe will be saved when production starts)');
      
      // Update local state
      setProductionProduct(updatedProduct);
      
      // Show notification that changes are local
      toast({
        title: "Changes saved",
        description: "Recipe modifications saved locally. Will be applied when production starts.",
      });
    } catch (error) {
      console.error('Error updating production product:', error);
    }
  };

  // Remove material from production
  const removeMaterialFromProduction = async (materialId: string) => {
    if (!productionProduct) return;

    const updatedMaterials = (productionProduct.materialsConsumed || []).filter(
      material => material.materialId !== materialId
    );

    const updatedProduct: ProductionProduct = {
      ...productionProduct,
      materialsConsumed: updatedMaterials
    };

    updateProductionProduct(updatedProduct);

    toast({
      title: "Material removed",
      description: "Material removed from production",
    });
  };

  // Update product materials in Supabase (TODO: Implement when product service is ready)
  const updateProductMaterialsInStorage = (productId: string, materials: Array<RawMaterial & { selectedQuantity: number }>) => {
    // TODO: Update product materials in Supabase
    console.log('Updating product materials for:', productId, materials);
  };

  // Show notification using toast (replaced old popup notifications)
  const showNotification = (title: string, message: string, type: 'success' | 'warning' | 'error') => {
    toast({
      title: title,
      description: message,
      variant: type === 'error' ? 'destructive' : type === 'warning' ? 'default' : 'default',
    });
  };

  // Send material shortage notification to material inventory
  const sendMaterialShortageNotification = (material: RawMaterial, shortage: number) => {
    const shortageNotification = {
      id: `shortage-${Date.now()}`,
      type: 'material-shortage',
      materialId: material.id,
      materialName: material.name,
      requiredQuantity: shortage,
      unit: material.unit,
      current_stock: material.current_stock,
      supplier_name: material.supplier_name,
      cost_per_unit: material.cost_per_unit,
      estimatedCost: shortage * material.cost_per_unit,
      createdAt: new Date().toISOString(),
      status: 'pending',
      priority: 'high',
      source: 'production'
    };

    // Notifications will be handled by Supabase notification service
    
    // Debug: Log to console
    console.log('Notification sent:', shortageNotification);
    console.log('Notification created for material shortage');
  };

  // Add all selected materials and individual products to production
  const addSelectedMaterialsToProduction = async () => {
    if (!productionProduct) return;

    // Check materials and send notifications for low stock
    const unavailableMaterials = selectedMaterials.filter(material => 
      material.current_stock < material.selectedQuantity
    );

    // Send notifications for materials with insufficient stock
    for (const material of unavailableMaterials) {
      const shortage = material.selectedQuantity - material.current_stock;
      
      // Check if notification already exists to prevent duplicates
      const { exists: hasExistingNotification } = await MongoDBNotificationService.notificationExists(
        'restock_request',
        material.id,
        'unread'
      );

      if (!hasExistingNotification) {
        // Determine module based on material type
        const module = material.material_type === 'product' ? 'products' : 'materials';
        
        await MongoDBNotificationService.createNotification({
          type: 'restock_request',
          title: `Material Shortage Alert - ${material.name}`,
          message: `Production batch ${productionProduct.id} requires ${material.selectedQuantity} ${material.unit} of ${material.name}. Available: ${material.current_stock} ${material.unit}. Shortage: ${shortage} ${material.unit}.`,
          priority: 'high',
          status: 'unread',
          module: module as any,
          related_id: material.id,
          related_data: {
            materialId: material.id,
            materialName: material.name,
            requiredQuantity: material.selectedQuantity,
            availableStock: material.current_stock,
            shortage: shortage,
            unit: material.unit,
            materialType: material.material_type,
            productionBatchId: productionProduct.id,
            productName: productionProduct.productName
          },
          created_by: 'system'
        });
        
        console.log(`📢 Material shortage notification sent for ${material.name}`);
      }
    }

    // Filter out materials with insufficient stock
    const availableMaterials = selectedMaterials.filter(material => 
      material.current_stock >= material.selectedQuantity
    );

    // Process individual products
    const individualProductMaterials: MaterialConsumption[] = [];
    Object.entries(selectedIndividualProducts).forEach(([productId, individuals]) => {
      if (individuals.length > 0) {
        const product = products.find(p => p.id === productId);
        if (product) {
          individualProductMaterials.push({
            materialId: productId,
            materialName: `${product.name} (${individuals.length} individual${individuals.length > 1 ? 's' : ''})`,
            quantity: individuals.length,
            unit: product.unit,
            consumedAt: new Date().toISOString(),
            individualProductIds: individuals.map(ind => ind.id) // Store individual product IDs
          });
        }
      }
    });

    // Show warning if some materials are unavailable
    if (unavailableMaterials.length > 0) {
      toast({
        title: `${unavailableMaterials.length} material${unavailableMaterials.length > 1 ? 's' : ''} low stock`,
        description: "Notifications sent for materials needing restocking. Materials with sufficient stock have been added.",
      });
    }

    // Only add materials with sufficient stock or individual products
    if (availableMaterials.length === 0 && individualProductMaterials.length === 0) {
      toast({
        title: "No materials added",
        description: "All selected materials have insufficient stock. Notifications have been sent for restocking.",
        variant: "destructive",
      });
      return;
    }

        const newMaterials: MaterialConsumption[] = [
          ...availableMaterials.map(material => ({
            materialId: material.id,
            materialName: material.name,
            quantity: material.selectedQuantity,
            unit: material.unit,
            consumedAt: new Date().toISOString(),
            individualProductIds: material.selectedIndividualProducts?.map((p: any) => p.id) || undefined
          })),
          ...individualProductMaterials
        ];

    // Combine materials with same ID (add quantities together)
    const existingMaterials = productionProduct.materialsConsumed || [];
    const combinedMaterials = [...existingMaterials];
    
    newMaterials.forEach(newMaterial => {
      const existingIndex = combinedMaterials.findIndex(
        existing => existing.materialId === newMaterial.materialId
      );
      
      if (existingIndex >= 0) {
        // Combine with existing material
        combinedMaterials[existingIndex] = {
          ...combinedMaterials[existingIndex],
          quantity: combinedMaterials[existingIndex].quantity + newMaterial.quantity
        };
      } else {
        // Add new material
        combinedMaterials.push(newMaterial);
      }
    });

    const updatedProduct: ProductionProduct = {
      ...productionProduct,
      materialsConsumed: combinedMaterials
    };

    updateProductionProduct(updatedProduct);
    
    // Material consumption will be saved when production flow starts (machine is added)
    console.log('📝 Materials selected and ready for production flow');
    
    // Note: Material inventory will be deducted only after waste generation step
    // This allows for proper waste tracking and management
    
    // Material tracking simplified - focus on machine operations
    
    // Production flow functionality removed
    
    // Show single comprehensive success notification
    const totalAdded = availableMaterials.length + individualProductMaterials.length;
    toast({
      title: "Materials added",
      description: `${totalAdded} item${totalAdded > 1 ? 's' : ''} added to production`,
    });
    
    // Don't clear selectedMaterials - we need them for when production flow starts
    // setSelectedMaterials([]);
    // setSelectedIndividualProducts({});
    setIsMaterialSelectionOpen(false);
  };

  // Update raw material inventory (deduct consumed quantities for raw materials only)
  // Note: Products used as ingredients don't need inventory updates in the same way
  const updateRawMaterialInventory = async (consumedMaterials: Array<RawMaterial & { selectedQuantity: number }>) => {
    const updatedMaterials = rawMaterials.map(material => {
      const consumed = consumedMaterials.find(cm => cm.id === material.id);
      if (consumed) {
        const newQuantity = material.current_stock - consumed.selectedQuantity;
          return {
          ...material,
          current_stock: Math.max(0, newQuantity), // Ensure quantity doesn't go below 0
          status: newQuantity <= 0 ? "out-of-stock" as const : 
                  newQuantity <= 10 ? "low-stock" as const : "in-stock" as const
        };
      }
      return material;
    });
    
    // Update raw materials in Supabase
    for (const material of updatedMaterials) {
      try {
        await MongoDBRawMaterialService.updateRawMaterial(material.id, {
          current_stock: material.current_stock
        });
      } catch (error) {
        console.error(`Error updating material ${material.name}:`, error);
      }
    }
    setRawMaterials(updatedMaterials);
  };

  // Get filtered materials and products for search
  const getFilteredMaterials = () => {
    const searchTerm = materialSearchTerm.toLowerCase();
    
    // Filter raw materials
    const filteredMaterials = rawMaterials.filter(material => 
      material.name.toLowerCase().includes(searchTerm) ||
      material.category.toLowerCase().includes(searchTerm)
    ).map(material => ({
      ...material,
      type: 'material' as const, // This is the item type indicator (material vs product)
      materialType: material.type || 'Unknown', // This is the raw material type (Yarn, Raw Material, etc.)
      displayName: material.name,
      displayCategory: material.category,
      current_stock: material.current_stock,
      unit: material.unit,
      cost_per_unit: material.cost_per_unit
    }));

    // Filter products (excluding the current production product)
    const filteredProducts = products.filter(product => 
      product.id !== productionProduct?.productId && // Don't include the product being produced
      (product.name.toLowerCase().includes(searchTerm) ||
       product.category.toLowerCase().includes(searchTerm))
    ).map(product => {
      // For products, use individual product count
      const individualCount = product.individual_count || 0;
      return {
        id: product.id,
        name: product.name,
        brand: product.brand || '',
        category: product.category,
        current_stock: individualCount, // Use individual product count for products
        unit: product.unit,
        cost_per_unit: 0, // Products don't have cost_per_unit in the same way
        supplier_name: 'Product Inventory',
        status: individualCount > 0 ? 'in-stock' as const : 'out-of-stock' as const,
        batch_number: '',
        type: 'product' as const,
        displayName: `${product.name} (Product)`,
        displayCategory: `Product - ${product.category}`,
        productData: product
      };
    });

    // Apply type filter
    if (materialTypeFilter === 'materials') {
      return filteredMaterials;
    } else if (materialTypeFilter === 'products') {
      return filteredProducts;
    } else if (materialTypeFilter === 'individual') {
      return []; // Individual products will be shown separately
    } else {
      return [...filteredMaterials, ...filteredProducts];
    }
  };

  // Get individual products for a specific product
  const getIndividualProductsForProduct = (productId: string) => {
    return individualProducts.filter(individual => individual.product_id === productId);
  };

  // Check if a product has individual tracking
  const hasIndividualTracking = (productId: string) => {
    const product = products.find(p => p.id === productId);
    return product?.individual_stock_tracking === true;
  };

  // Show individual product details
  const showIndividualProductDetailsPopup = (individual: any, product: any) => {
    setSelectedIndividualProductDetails({ ...individual, product });
    setShowIndividualProductDetails(true);
  };

  // Machine management functions
  const addNewMachine = async () => {
    if (!newMachineForm.name.trim()) {
      toast({
        title: "Error",
        description: "Machine name is required",
        variant: "destructive",
      });
      return;
    }
    if (!newMachineForm.machine_type.trim()) {
      toast({
        title: "Error",
        description: "Machine type is required",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: newMachine, error } = await MachineService.createMachine({
        machine_name: newMachineForm.name,
        machine_type: newMachineForm.machine_type,
        notes: newMachineForm.description || ""
      });

      if (error) {
        throw new Error(error);
      }

      // Update local state - map backend fields to frontend format
      if (newMachine) {
        const machineData = newMachine as any; // Backend may return machine_name instead of name
        const mappedMachine = {
          id: machineData.id,
          name: machineData.machine_name || machineData.name,
          description: machineData.notes || machineData.description || "",
          status: machineData.status,
          created_at: machineData.created_at,
          updated_at: machineData.updated_at
        };
        setMachines(prev => [...prev, mappedMachine]);
        // Auto-select the newly added machine
        setSelectedMachineId(mappedMachine.id);
        toast({
          title: "Machine added",
          description: `"${mappedMachine.name}" added successfully`,
        });
      }

      // Reset form
      setNewMachineForm({ name: "", machine_type: "", description: "" });
      setShowAddMachinePopup(false);
    } catch (error) {
      console.error('Error adding machine:', error);
      toast({
        title: "Error",
        description: "Failed to add machine. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleMachineSelection = async () => {
    if (!selectedMachineId || !inspectorName.trim()) {
      toast({
        title: "Error",
        description: "Please select a machine and enter inspector name",
        variant: "destructive",
      });
      return;
    }

    const selectedMachine = machines.find(m => m.id === selectedMachineId);
    if (!selectedMachine) {
      toast({
        title: "Error",
        description: "Selected machine not found",
        variant: "destructive",
      });
      return;
    }

    // NOTE: We do NOT update the recipe in the database here
    // The modified materials are only used for this specific production batch
    // The master recipe remains unchanged in the database
    console.log('ℹ️ Using modified materials for this production batch (recipe not updated in database)');

    // Close popup immediately
    setShowMachineSelectionPopup(false);
    
    // Update production status from "planning" to "active" when machine is added
    if (productionProduct && productionProduct.status === "planning") {
      const updatedProduct: ProductionProduct = {
        ...productionProduct,
        status: "active"
      };
      updateProductionProduct(updatedProduct);
      
      toast({
        title: "Production started",
        description: "Production status updated to Active",
      });
    }

    // Add machine step to production flow - this will navigate to dynamic flow page
    await addMachineStepToFlow(selectedMachine, inspectorName);
    
    // Reset form
    setSelectedMachineId("");
    setInspectorName("");
  };

  const addMachineStepToFlow = async (machine: any, inspector: string) => {
    if (!productionProduct) return;

    try {
      console.log('Adding machine step to flow:', machine, inspector);
      console.log('Production product ID:', productionProduct.id);

      // IMPORTANT: Update recipe ONLY when starting production flow (not when modifying materials)
      // This ensures recipe is updated only once when production actually starts
      if (selectedMaterials.length > 0) {
        console.log('💾 Updating recipe in database when starting production flow...');
        
        // Convert selectedMaterials to recipe format
        const recipeMaterials = selectedMaterials.map(material => {
          // Check if this is a product or raw material
          const isProduct = products.some(p => p.id === material.id);
          
          // Calculate quantity_per_sqm based on baseQuantity (which is per sqm)
          const quantityPerSqm = material.baseQuantity || material.selectedQuantity || 0;
          
          return {
            material_id: material.id,
            material_name: material.name,
            material_type: isProduct ? 'product' as const : 'raw_material' as const,
            quantity_per_sqm: quantityPerSqm,
            unit: material.unit
          };
        });

        // Try to update existing recipe, or create new one if it doesn't exist
        const recipeId = productRecipe?.id || (productRecipe as any)?._id;
        
        if (recipeId) {
          // Recipe exists - update it
          console.log('📝 Updating existing recipe:', recipeId);
          const { error: recipeUpdateError } = await RecipeService.updateRecipe(
            recipeId,
            {
              materials: recipeMaterials
            }
          );

          if (recipeUpdateError) {
            console.error('❌ Error updating recipe:', recipeUpdateError);
            console.warn('⚠️ Continuing with production despite recipe update failure');
            toast({
              title: "Recipe update failed",
              description: "Could not update recipe, but production will continue",
              variant: "destructive",
            });
          } else {
            console.log('✅ Recipe updated successfully in database');
            toast({
              title: "Recipe updated",
              description: "Recipe changes saved successfully",
            });
          }
        } else {
          // Recipe doesn't exist - create new one
          console.log('📝 Creating new recipe for product:', productionProduct.productId);
          const { data: newRecipe, error: createError } = await RecipeService.createRecipe({
            product_id: productionProduct.productId,
            materials: recipeMaterials,
            description: `Recipe for ${productionProduct.productName}`,
            created_by: 'system'
          });

          if (createError) {
            console.error('❌ Error creating recipe:', createError);
            console.warn('⚠️ Continuing with production despite recipe creation failure');
            toast({
              title: "Recipe creation failed",
              description: "Could not create recipe, but production will continue",
              variant: "destructive",
            });
          } else {
            console.log('✅ Recipe created successfully:', newRecipe?.id);
            toast({
              title: "Recipe created",
              description: "Recipe saved successfully",
            });
            // Update local recipe state
            if (newRecipe) {
              setProductRecipe(newRecipe);
            }
          }
        }
      }

      let flow = productionFlow; // Use existing flow if available
      
      // Get batch ID from location state or look up from production batches
      let batchIdFromState = location.state?.batchId;
      console.log('🔍 Batch ID from location state:', batchIdFromState);
      
      // If no batchId in state, try to find the production batch for this product
      if (!batchIdFromState && productionProduct?.productId) {
        try {
          console.log('🔍 No batchId in state, looking up production batch for product:', productionProduct.productId);
          // Look for batches with any status (planned, in_progress, etc.)
          const { data: batches, error } = await ProductionService.getProductionBatches({
            product_id: productionProduct.productId
          });
          
          console.log('🔍 Found batches:', batches?.length || 0, batches);
          
          if (!error && batches && batches.length > 0) {
            // Find the most recent batch that's not completed
            const activeBatch = batches.find((b: any) => 
              b.status !== 'completed' && b.status !== 'cancelled'
            ) || batches[0];
            
            if (activeBatch) {
              batchIdFromState = activeBatch.id;
              console.log('✅ Found production batch:', batchIdFromState, 'with status:', activeBatch.status);
            }
          } else {
            console.log('⚠️ No batches found for product:', productionProduct.productId);
          }
        } catch (error) {
          console.log('⚠️ Error looking up production batch:', error);
        }
      }
      
      console.log('🔍 Final batch ID to use:', batchIdFromState);
      
      // Only create a new production flow if one doesn't exist
      if (!flow) {
        // First, try to load existing flow if we have a batch ID (silently, 404 is expected)
        if (batchIdFromState) {
          const { data: existingFlow, error: flowError } = await ProductionService.getProductionFlowByBatchId(batchIdFromState);
          if (!flowError && existingFlow) {
            console.log('✅ Found existing production flow for batch:', batchIdFromState);
            flow = existingFlow;
            setProductionFlow(flow);
          }
          // Note: 404 is expected for new batches, no need to log
        }
        
        // If still no flow, create a new one
        if (!flow) {
          // IMPORTANT: We MUST have a batch ID to create a flow
          // Flow ID must match Batch ID exactly for production page to find it
          if (!batchIdFromState) {
            console.error('❌ Cannot create flow without batch ID');
            toast({
              title: "Error",
              description: "Cannot start production without a batch. Please create a batch first.",
              variant: "destructive",
            });
            return;
          }
          
          const productionBatchId = batchIdFromState; // Use batch ID directly (no fallback generation)
          
          console.log('Creating new production flow with batch ID:', productionBatchId);
          
          try {
            // Create new production flow in MongoDB
            // IMPORTANT: Flow ID must equal Batch ID for production page to find it
            const flowData = {
              id: productionBatchId, // Flow ID = Batch ID exactly
              production_product_id: productionBatchId, // Also set this to batch ID
              flow_name: `${productionProduct.productName} Production Flow - Batch ${productionBatchId}`,
              status: 'active' as const,
              current_step: 1
            };
            
            const { data: createdFlow, error: flowError } = await ProductionService.createProductionFlow(flowData);
            
            if (flowError || !createdFlow) {
              throw new Error(flowError || 'Failed to create production flow');
            }
            
            flow = {
              id: createdFlow.id,
              production_product_id: createdFlow.production_product_id,
              flow_name: createdFlow.flow_name,
              status: createdFlow.status,
              current_step: createdFlow.current_step
            };
            
            if (!flow || !flow.id) {
              throw new Error('Flow creation returned null or invalid flow');
            }
            
            // Store the flow in state for navigation
            setProductionFlow(flow);
            console.log('✅ New production flow created and saved to MongoDB:', flow);
            console.log('✅ Flow ID matches Batch ID:', flow.id === productionBatchId);
            
            // Update batch status to 'in_progress' if we have a batch ID
            if (batchIdFromState && batchIdFromState.startsWith('BATCH-')) {
              try {
                await ProductionService.updateProductionBatch(batchIdFromState, {
                  status: 'in_production' as any
                });
                console.log('✅ Updated batch status to in_production:', batchIdFromState);
              } catch (error) {
                console.warn('⚠️ Could not update batch status:', error);
              }
            }
          } catch (flowError) {
            console.error('❌ Error creating production flow:', flowError);
            throw new Error('Failed to create production flow: ' + (flowError instanceof Error ? flowError.message : 'Unknown error'));
          }
        }
      } else {
        console.log('✅ Using existing production flow:', flow.id);
      }

      // Ensure flow is properly set before proceeding
      if (!flow || !flow.id || !flow.production_product_id) {
        console.error('❌ Flow validation failed:', flow);
        toast({
          title: "Error",
          description: "Failed to create production flow",
          variant: "destructive",
        });
        return;
      }

      // Get the batch ID (flow.production_product_id contains the batch ID)
      const batchIdForConsumption = flow.production_product_id; // This is the batch ID (set when flow was created)
      
      // Save materials to material_consumption table with the correct batch ID
      console.log('🔍 DEBUG: selectedMaterials.length:', selectedMaterials.length);
      console.log('🔍 DEBUG: selectedMaterials:', selectedMaterials);
      
      if (selectedMaterials.length > 0) {
        console.log('💾 Saving materials to material_consumption table with batch ID:', batchIdForConsumption);
        console.log('💾 Flow details:', { id: flow.id, production_product_id: flow.production_product_id, flow_name: flow.flow_name });
        console.log('💾 Selected materials count:', selectedMaterials.length);
        
        // Persist to backend as planned (no stock deduction yet)
        const savePromises = selectedMaterials.map(async (material) => {
          try {
            const quantityUsed = material.selectedQuantity || material.totalQuantity || 0;
            const materialConsumptionData: any = {
              production_batch_id: batchIdForConsumption,
              production_product_id: batchIdForConsumption,
              production_flow_id: flow.id,
              material_id: material.id,
              material_name: material.name,
              material_type: material.material_type || 'raw_material',
              quantity_used: quantityUsed,
              unit: material.unit,
              operator: 'Production Operator',
              individual_product_ids: material.selectedIndividualProducts?.map((p: any) => p.id) || [],
              waste_quantity: 0,
              waste_type: 'normal' as const,
              notes: `Planned at PLAN MATERIAL stage for batch ${batchIdForConsumption} (${productionProduct.productName})`,
              deduct_now: false
            };
            const { data: savedConsumption, error: consumptionError } = await MaterialConsumptionService.createMaterialConsumption(materialConsumptionData);
            if (consumptionError) {
              console.error('❌ Error planning consumption for', material.name, ':', consumptionError);
              return null;
            }
            return savedConsumption;
          } catch (e) {
            console.error('❌ Error planning consumption for', material.name, ':', e);
            return null;
          }
        });
        await Promise.all(savePromises);
        console.log('ℹ️ PLAN MATERIAL stage: saved planned consumption (no stock deduction).');
      } else {
        console.log('⚠️ No materials to save - selectedMaterials is empty');
        console.log('⚠️ This means material consumption will not be recorded');
      }

      // Informative log
      console.log('✅ Materials planned for batch ID (no stock deduction yet):', batchIdForConsumption);

      // Add machine step to flow in MongoDB
      const stepData = {
        id: `STEP_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        flow_id: flow.id,
        step_name: `${machine.name} Operation`,
        step_type: 'machine_operation',
        order_index: 1, // You can make this dynamic based on existing steps
        machine_id: machine.id,
        inspector_name: inspector,
        notes: `Machine operation performed by ${inspector}`
      };

      const { data: createdStep, error: stepError } = await ProductionService.createProductionFlowStep(stepData);
      
      if (stepError) {
        console.error('❌ Error creating production flow step:', stepError);
        toast({
          title: "Warning",
          description: `Machine step created but failed to save: ${stepError}`,
        });
      } else {
        console.log('✅ Machine step created and saved to MongoDB:', createdStep);
        toast({
          title: "Production flow started",
          description: `Machine "${machine.name}" added to production flow`,
        });
      }

      const newStep = createdStep || stepData;

      // Navigate to dynamic flow page after successfully adding machine
      console.log('🔍 Final flow check before navigation:', flow);
      console.log('🔍 Flow ID:', flow?.id);
      console.log('🔍 Flow production_product_id:', flow?.production_product_id);
      
      if (flow && flow.id) {
        console.log('🔄 Navigating to dynamic flow page with batch ID:', flow.id);
        // Use the unique batch ID for navigation, not the product ID
        const navigationPath = `/production/${flow.id}/dynamic-flow`;
        console.log('Navigation path:', navigationPath);
        console.log('Flow object:', flow);
        console.log('Batch ID for navigation:', flow.id);

        // Store data in sessionStorage as a fallback (in case navigation state is lost)
        const flowData = {
          flow: flow,
          productionProduct: productionProduct,
          selectedMaterials: selectedMaterials,
          initialStep: newStep // Include the machine step that was just added
        };
        sessionStorage.setItem(`production-flow-${flow.id}`, JSON.stringify(flowData));
        console.log('✅ Flow data stored in sessionStorage for batch:', flow.id);
        console.log('✅ Including initial machine step:', newStep);

        // Navigate with state containing the flow and product information
        navigate(navigationPath, {
          state: flowData
        });
        console.log('✅ Navigation command sent with flow, product data, and machine step');
      } else {
        console.error('❌ Cannot navigate: Missing flow or flow ID', flow);
        toast({
          title: "Error",
          description: "Production flow was created but navigation failed",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error adding machine step to flow:', error);
      toast({
        title: "Error",
        description: "Failed to add machine step to flow",
        variant: "destructive",
      });
    }
  };

  // REMOVED: skipToWasteGeneration function - machine step is now mandatory


  const updateExpectedProduct = async () => {
    if (!productionProduct) return;

    const expectedProduct = {
      ...productionProduct,
      targetQuantity: productionProduct.targetQuantity || 0
    };

    await updateProductionProduct(expectedProduct);
    setIsEditingExpected(false);
  };


  const addMaterialConsumption = async () => {
    if (!productionProduct || !newMaterial.materialId || !newMaterial.quantity) return;

    const material: MaterialConsumption = {
      materialId: newMaterial.materialId,
      materialName: newMaterial.materialName,
      quantity: parseFloat(newMaterial.quantity),
      unit: newMaterial.unit,
      consumedAt: new Date().toISOString()
    };

    // Combine materials with same ID (add quantities together)
    const existingMaterials = productionProduct.materialsConsumed || [];
    const combinedMaterials = [...existingMaterials];
    
    const existingIndex = combinedMaterials.findIndex(
      existing => existing.materialId === material.materialId
    );
    
    if (existingIndex >= 0) {
      // Combine with existing material
      combinedMaterials[existingIndex] = {
        ...combinedMaterials[existingIndex],
        quantity: combinedMaterials[existingIndex].quantity + material.quantity
      };
    } else {
      // Add new material
      combinedMaterials.push(material);
    }

    const updatedProduct: ProductionProduct = {
      ...productionProduct,
      materialsConsumed: combinedMaterials
    };

    updateProductionProduct(updatedProduct);
    
    // Note: Material inventory will be deducted only after waste generation step
    // This allows for proper waste tracking and management
    
    // Material tracking simplified
    
    // Reset form
    setNewMaterial({
      materialId: "",
      materialName: "",
      quantity: "",
      unit: ""
    });
    setIsAddingMaterial(false);
  };


  const saveExpectedProduct = () => {
    if (!productionProduct) return;

    const updatedProduct: ProductionProduct = {
      ...productionProduct,
      expectedProduct: expectedProduct
    };

    updateProductionProduct(updatedProduct);
    setIsEditingExpected(false);
  };


  const completeProduction = () => {
    if (!productionProduct) return;
    
    // Check if materials have been added
    if (!productionProduct.materialsConsumed || productionProduct.materialsConsumed.length === 0) {
      toast({
        title: "Materials required",
        description: "Please add at least one material before proceeding",
        variant: "destructive",
      });
            return;
          }
    
    
    // Navigate to individual product details page without changing status
    // Status will be changed to "completed" only when individual products are finalized
    if (productionFlow?.id) {
      navigate(`/production/complete/${productionFlow.id}`);
    } else {
      console.error('No production flow found to navigate to complete page');
    }
  };

  if (!productionProduct) {
    return <Loading message="Loading production details..." />;
  }


    return (
    <div className="flex-1 space-y-6 p-6">
      <Header 
        title={`Production: ${productionProduct.productName}`}
        subtitle={`Track material consumption and waste generation`}
      />

      {/* Production Progress Bar */}
      <ProductionProgressBar
        currentStep={
          productionProduct.status === "planning" ? "material_selection" :
          productionProduct.status === "active" ? "machine_operation" :
          "testing_individual"
        }
        steps={[
          {
            id: "material_selection",
            name: "Material Selection",
            status: productionProduct.materialsConsumed?.length > 0 ? "completed" : "in_progress",
            stepType: "material_selection"
          },
          {
            id: "machine_operation",
            name: "Machine Operations",
            status: productionFlow?.steps?.some((s: any) => s.stepType === 'machine_operation') ? "in_progress" : "pending",
            stepType: "machine_operation"
          },
          {
            id: "wastage_tracking",
            name: "Waste Generation",
            status: "pending",
            stepType: "wastage_tracking"
          },
          {
            id: "testing_individual",
            name: "Individual Details",
            status: "pending",
            stepType: "testing_individual"
          }
        ]}
        machineSteps={productionFlow?.steps?.filter((s: any) => s.stepType === 'machine_operation') || []}
        className="mb-6"
        onStepClick={(stepType) => {
          switch (stepType) {
            case 'material_selection':
              // Stay on current page (material selection is handled here)
              break;
            case 'machine_operation':
              // Navigate to dynamic production flow page using batch ID
              if (productionFlow?.id) {
                navigate(`/production/${productionFlow.id}/dynamic-flow`);
              } else {
                console.error('No production flow found to navigate to dynamic flow');
              }
              break;
            case 'wastage_tracking':
              // Navigate to waste generation page using batch ID
              if (productionFlow?.id) {
                navigate(`/production/${productionFlow.id}/waste-generation`);
              } else {
                console.error('No production flow found to navigate to waste generation');
              }
              break;
            case 'testing_individual':
              // Navigate to complete/individual details page using batch ID
              if (productionFlow?.id) {
                navigate(`/production/complete/${productionFlow.id}`);
              } else {
                console.error('No production flow found to navigate to complete page');
              }
              break;
          }
        }}
      />

      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" onClick={() => navigate('/production')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Production
            </Button> 
        
        {productionProduct.status === "planning" && (
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-600">
              Add materials for planning phase
              {(!productionProduct.materialsConsumed || productionProduct.materialsConsumed.length === 0) && (
                <span className="text-red-600 ml-2">⚠️ Materials required</span>
              )}
            </div>
            <Button 
              onClick={async () => {
                // Check if materials are added
                if (!productionProduct.materialsConsumed || productionProduct.materialsConsumed.length === 0) {
                  toast({
                    title: "Materials required",
                    description: "Please add at least one material before starting production flow",
                    variant: "destructive",
                  });
                  return;
                }
                
                // Recipe will be updated when user selects machine or skips to waste generation
                
                // Show machine selection popup instead of direct navigation
                setSelectedMachineId("");
                // Auto-fill inspector name with current user's name
                setInspectorName(user?.full_name || "");
                setShowMachineSelectionPopup(true);
              }}
              className="bg-blue-600 hover:bg-blue-700"
              disabled={!productionProduct.materialsConsumed || productionProduct.materialsConsumed.length === 0}
            >
              <Factory className="w-4 h-4 mr-2" />
              Start Production Flow
            </Button>
          </div>
        )}

        
        
      </div>

      {/* Material Planning Section */}
      {/* Enhanced Production Overview */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-800">
            <Factory className="w-5 h-5" />
            Production Overview
            {materialsFromRecipe && (
              <Badge variant="secondary" className="ml-2 bg-green-100 text-green-700">
                📋 Recipe-based
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Target Quantity Card */}
            <div className="bg-white rounded-lg p-4 shadow-sm border border-blue-100">
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Input
                    type="text"
                    value={productionProduct.targetQuantity}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === '' || /^\d+$/.test(value)) {
                        const numValue = parseInt(value) || 1;
                        handleProductionQuantityChange(numValue);
                      }
                    }}
                    className="w-20 text-center text-2xl font-bold text-blue-600 border-blue-200 focus:border-blue-400"
                    min="1"
                  />
                  <span className="text-sm text-gray-600 font-medium">
                    {productionProduct?.unit}
                  </span>
                </div>
                <div className="text-sm text-gray-600 font-medium">Target Quantity</div>
                {productRecipe && (
                  <div className="text-xs text-green-600 mt-1 bg-green-50 px-2 py-1 rounded">
                    Recipe: Base quantity 1 for 1 sqm (Product: {parseFloat(productionProduct?.length || "0")}m × {parseFloat(productionProduct?.width || "0")}m = {(parseFloat(productionProduct?.length || "0") * parseFloat(productionProduct?.width || "0")).toFixed(2)} sqm per unit)
                  </div>
                )}
              </div>
            </div>
            {/* Materials Used Card */}
            <div className="bg-white rounded-lg p-4 shadow-sm border border-green-100">
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600 mb-1">
                  {productionProduct.materialsConsumed?.length || 0}
                </div>
                <div className="text-sm text-gray-600 font-medium">Materials Used</div>
                <div className="text-xs text-gray-500 mt-1">
                  {selectedMaterials.length} selected
                </div>
              </div>
            </div>

            {/* Expected Length Card */}
            <div className="bg-white rounded-lg p-4 shadow-sm border border-purple-100">
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600 mb-1">
                  {expectedProduct.length || "N/A"}
                </div>
                <div className="text-sm text-gray-600 font-medium">Expected Length</div>
                <div className="text-xs text-gray-500 mt-1">
                  {expectedProduct.width || "N/A"} width
                </div>
              </div>
            </div>

            {/* Expected Weight Card */}
            <div className="bg-white rounded-lg p-4 shadow-sm border border-orange-100">
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600 mb-1">
                  {expectedProduct.weight || "N/A"}
                </div>
                <div className="text-sm text-gray-600 font-medium">Expected Weight</div>
              </div>
            </div>
            </div>
        </CardContent>
      </Card>

      {/* Expected Product Details */}
      <Card>
        <CardHeader>
                  <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Expected Product Details
                        </CardTitle>
                      <Button 
                        variant="outline"
              size="sm"
              onClick={() => setIsEditingExpected(!isEditingExpected)}
            >
              {isEditingExpected ? "Cancel" : "Edit"}
                      </Button>
                  </div>
        </CardHeader>
        <CardContent>
          {isEditingExpected ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                  <div>
                  <Label>Product Name</Label>
                  <Input
                    value={expectedProduct.name}
                    onChange={(e) => setExpectedProduct({...expectedProduct, name: e.target.value})}
                    placeholder="Expected product name"
                  />
                  </div>
                <div>
                  <Label>Category</Label>
                  <Input
                    value={expectedProduct.category}
                    onChange={(e) => setExpectedProduct({...expectedProduct, category: e.target.value})}
                    placeholder="Product category"
                  />
                </div>
                </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Length</Label>
                  <Input
                    value={expectedProduct.length}
                    onChange={(e) => setExpectedProduct({...expectedProduct, length: e.target.value})}
                    placeholder="e.g., 8'"
                  />
              </div>
                <div>
                  <Label>Width</Label>
                  <Input
                    value={expectedProduct.width}
                    onChange={(e) => setExpectedProduct({...expectedProduct, width: e.target.value})}
                    placeholder="e.g., 10'"
                  />
              </div>
                <div>
                  <Label>Weight</Label>
                  <Input
                    value={expectedProduct.weight}
                    onChange={(e) => setExpectedProduct({...expectedProduct, weight: e.target.value})}
                    placeholder="e.g., 45 kg"
                  />
                  </div>
                </div>
              <div className="grid grid-cols-2 gap-4">
                  </div>
              <div>
                <Label>Material Composition</Label>
                <Input
                  value={expectedProduct.materialComposition}
                  onChange={(e) => setExpectedProduct({...expectedProduct, materialComposition: e.target.value})}
                  placeholder="e.g., 80% Cotton, 20% Wool"
                />
                </div>
              <div>
                <Label>Quality Grade</Label>
                <Input
                  value={expectedProduct.qualityGrade}
                  onChange={(e) => setExpectedProduct({...expectedProduct, qualityGrade: e.target.value})}
                  placeholder="e.g., A+, A, B"
                />
              </div>
              <Button onClick={saveExpectedProduct} className="bg-blue-600 hover:bg-blue-700">
                <Save className="w-4 h-4 mr-2" />
                Save Expected Product
              </Button>
                  </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                <span className="text-gray-500">Name:</span>
                <p className="font-medium">{expectedProduct.name || "Not set"}</p>
                  </div>
                    <div>
                <span className="text-gray-500">Category:</span>
                <p className="font-medium">{expectedProduct.category || "Not set"}</p>
                    </div>
                    <div>
                <span className="text-gray-500">Length:</span>
                <p className="font-medium">{expectedProduct.length || "Not set"}</p>
                </div>
                    <div>
                <span className="text-gray-500">Width:</span>
                <p className="font-medium">{expectedProduct.width || "Not set"}</p>
                </div>
                    <div>
                <span className="text-gray-500">Weight:</span>
                <p className="font-medium">{expectedProduct.weight || "Not set"}</p>
              </div>
            </div>
            )}
        </CardContent>
      </Card>

            {/* Material Consumption Tracking */}
      <Card>
        <CardHeader>
                  <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Truck className="w-5 h-5" />
              Material Consumption
              {materialsFromRecipe && productRecipe && (
                <Badge variant="secondary" className="ml-2">
                  📋 Auto-calculated from recipe
                </Badge>
              )}
                        </CardTitle>
                       <Button
                         variant="outline"
                         size="sm"
              onClick={() => setIsMaterialSelectionOpen(true)}
                       >
              <Plus className="w-4 h-4 mr-2" />
              Select Materials & Products
                       </Button>
                  </div>
                  {materialsFromRecipe && productRecipe && (
                    <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center gap-2 text-sm text-green-700">
                        <CheckCircle className="w-4 h-4" />
                        <span>
                          Materials calculated for {productionProduct?.targetQuantity || 1} units 
                          ({(parseFloat(productionProduct?.length || "0") * parseFloat(productionProduct?.width || "0") * (productionProduct?.targetQuantity || 1)).toFixed(2)} sqm total)
                          based on recipe with base quantity 1 for 1 sqm
                        </span>
                      </div>
                    </div>
                  )}
                </CardHeader>
        <CardContent>
          {/* Enhanced Materials Table with Two-Way Calculation */}
          {selectedMaterials.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-4">
                <h4 className="font-medium text-lg">Material Requirements</h4>
                {materialsFromRecipe && (
                  <Badge variant="outline" className="text-green-600 border-green-200">
                    📋 Recipe-based
                  </Badge>
                )}
              </div>
              
              <div className="space-y-4">
                {selectedMaterials.map((material, index) => (
                  <div key={material.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex flex-col lg:flex-row gap-4">
                      
                      {/* Left Section - Material Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <div className="font-medium text-gray-900 truncate">{material.name}</div>
                          {material.material_type === 'product' && (
                            <Badge variant="outline" className="text-xs bg-green-100 text-green-700 flex-shrink-0">
                              Product
                            </Badge>
                          )}
                          {material.selectedIndividualProducts && material.selectedIndividualProducts.length > 0 && (
                            <Badge variant="outline" className="text-xs bg-blue-100 text-blue-700 flex-shrink-0">
                              {material.selectedIndividualProducts.length} Selected
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-gray-500 truncate">{material.type || material.supplier_name || 'Unknown'}</div>
                        <div className="text-xs text-gray-400">ID: {material.id}</div>
                      </div>

                      {/* Middle Section - Quantities and Stock */}
                      <div className="flex flex-col sm:flex-row gap-4 flex-1">
                        {/* Base Unit Quantity */}
                        <div className="flex-1 min-w-0">
                          <Label className="text-xs text-gray-600 mb-1 block">For 1 sqm (base quantity: 1)</Label>
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={material.baseQuantity ?? ''}
                              onChange={(e) => {
                                const value = e.target.value;
                                // Allow empty string and valid numbers
                                if (value === '' || /^\d*\.?\d*$/.test(value)) {
                                  const numValue = value === '' ? 0 : parseFloat(value) || 0;
                                  handleMaterialQuantityChange(material.id, numValue, true);
                                }
                              }}
                              className="w-full text-sm"
                              placeholder="Enter quantity per sqm"
                            />
                            <span className="text-xs text-gray-500 whitespace-nowrap">{material.unit}</span>
                          </div>
                        </div>

                        {/* Production Quantity */}
                        <div className="flex-1 min-w-0">
                          <Label className="text-xs text-gray-600 mb-1 block">Total for {productionProduct?.targetQuantity || 1} products ({(parseFloat(productionProduct?.length || "0") * parseFloat(productionProduct?.width || "0") * (productionProduct?.targetQuantity || 1)).toFixed(2)} sqm)</Label>
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={material.totalQuantity ?? material.selectedQuantity ?? ''}
                              onChange={(e) => {
                                const value = e.target.value;
                                // Allow empty string and valid numbers
                                if (value === '' || /^\d*\.?\d*$/.test(value)) {
                                  const numValue = value === '' ? 0 : parseFloat(value) || 0;
                                  handleMaterialQuantityChange(material.id, numValue, false);
                                }
                              }}
                              className="w-full text-sm font-medium"
                              placeholder="Enter total quantity"
                            />
                            <span className="text-xs text-gray-500 whitespace-nowrap">{material.unit}</span>
                          </div>
                        </div>

                        {/* Stock Info */}
                        <div className="flex-1 min-w-0">
                          <Label className="text-xs text-gray-600 mb-1 block">Available Stock</Label>
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-medium ${
                              material.current_stock >= (material.totalQuantity || material.selectedQuantity) 
                                ? 'text-green-600' 
                                : 'text-red-600'
                            }`}>
                              {material.current_stock} {material.unit}
                            </span>
                            {material.current_stock < (material.totalQuantity || material.selectedQuantity) && (
                              <Badge variant="destructive" className="text-xs flex-shrink-0">
                                Shortage
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right Section - Actions */}
                      <div className="flex flex-col gap-2 min-w-0">
                        {/* Individual Product Selection Button for Products */}
                        {material.material_type === 'product' && material.current_stock > 0 && (
                          <Button 
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              // Find the product in the products array
                              const product = products.find(p => p.id === material.id);
                              if (product) {
                                setCurrentSelectingProduct({
                                  ...product,
                                  requiredQuantity: Math.ceil(material.totalQuantity || material.selectedQuantity)
                                });
                                setShowIndividualProductSelection(true);
                              }
                            }}
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 whitespace-nowrap"
                          >
                            <Package className="w-4 h-4 mr-1" />
                            Select Individual
                          </Button>
                        )}
                        
                        <Button 
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedMaterials(prev => prev.filter((_, i) => i !== index));
                            toast({
                              title: "Material removed",
                              description: `${material.name} removed from production`,
                            });
                          }}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Add to Production Button */}
              <div className="mt-4 flex justify-end">
                <Button 
                  onClick={addSelectedMaterialsToProduction} 
                  className="bg-blue-600 hover:bg-blue-700"
                  size="lg"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Add Materials to Production
                </Button>
              </div>
            </div>
          )}
          
          {/* Consumed Materials List */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-3">
              <h4 className="font-medium">Materials Consumed in Production</h4>
              <Badge variant="outline" className="text-xs text-gray-500">
                {productionProduct.materialsConsumed?.length || 0} materials added
              </Badge>
                  </div>
            {productionProduct.materialsConsumed?.map((material, index) => {
              // Check if it's a raw material or a product
              const rawMaterial = rawMaterials.find(rm => rm.id === material.materialId);
              const productMaterial = products.find(p => p.id === material.materialId);
              const foundMaterial = rawMaterial || productMaterial;
              
              // Determine availability and stock based on material type
              let isAvailable = false;
              let currentStock = 0;
              let materialType = "Unknown";
              let supplier = "Unknown";
              let costPerUnit = 0;
              
              if (rawMaterial) {
                // It's a raw material
                isAvailable = rawMaterial.current_stock > 0;
                currentStock = rawMaterial.current_stock || 0;
                materialType = rawMaterial.type || "Unknown";
                supplier = rawMaterial.supplier_name || "Unknown";
                costPerUnit = rawMaterial.cost_per_unit || 0;
              } else if (productMaterial) {
                // It's a product
                isAvailable = (productMaterial.individual_count || 0) > 0;
                currentStock = productMaterial.individual_count || 0;
                materialType = productMaterial.type || "Product";
                supplier = "Product Inventory";
                costPerUnit = 0; // Products don't have cost_per_unit in the same way
              }
              
              return (
                <div key={material.materialId || `material-${index}`} className={`flex items-center justify-between p-3 rounded-lg ${
                  isAvailable ? 'bg-gray-50' : 'bg-red-50 border border-red-200'
                }`}>
                      <div>
                        <div className="font-medium">{material.materialName}</div>
                        <div className="text-sm text-gray-500">
                          {rawMaterial ? (
                            `ID: ${material.materialId} • Type: ${materialType} • Supplier: ${supplier}`
                          ) : productMaterial ? (
                            `ID: ${material.materialId} • Color: ${productMaterial.color || 'N/A'} • Pattern: ${productMaterial.pattern || 'N/A'}`
                          ) : (
                            `ID: ${material.materialId} • Type: ${materialType} • Supplier: ${supplier}`
                          )}
                        </div>
                        <div className="text-sm text-gray-500">
                          {material.quantity} {material.unit} • {new Date(material.consumedAt).toLocaleDateString()}
                      </div>
                        <div className="text-sm text-gray-500">
                          Available: {currentStock} {material.unit}
                      </div>
                    {!isAvailable && (
                      <div className="text-xs text-red-600 flex items-center gap-1 mt-1">
                        <AlertTriangle className="w-3 h-3" />
                        Not in inventory - needs to be purchased
              </div>
            )}
                  </div>
                  <div className="flex items-center gap-2">
                    {!isAvailable && (
                      <Badge variant="destructive" className="text-xs">
                        Out of Stock
                      </Badge>
                    )}
                    <Badge variant="outline">{material.materialId}</Badge>
                    <Button 
                      variant="outline"
                      size="sm"
                      onClick={() => removeMaterialFromProduction(material.materialId)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                    </div>
                    </div>
              );
            })}
            {(!productionProduct.materialsConsumed || productionProduct.materialsConsumed.length === 0) && (
              <div className="text-center py-8 text-gray-500">
                <Truck className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>No materials consumed yet</p>
                <p className="text-sm">Click "Select Materials" to start tracking</p>
                  </div>
                )}
              </div>
          </CardContent>
        </Card>


      {/* Material & Product Selection Popup */}
      <Dialog open={isMaterialSelectionOpen} onOpenChange={setIsMaterialSelectionOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
           <DialogHeader>
            <DialogTitle>Select Materials & Products for Recipe</DialogTitle>
             <DialogDescription>
              Search and select from raw materials and products in your inventory. Products can be used as ingredients in recipes.
             </DialogDescription>
           </DialogHeader>
           
          {/* Search Bar and Filters */}
          <div className="space-y-4 mb-4">
            <div className="flex items-center gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search materials and products by name or category..."
                  value={materialSearchTerm}
                  onChange={(e) => setMaterialSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="text-sm text-gray-500">
                {getFilteredMaterials().length} items found
              </div>
            </div>
            
            {/* Filter Buttons */}
            <div className="flex gap-2">
              <Button
                variant={materialTypeFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setMaterialTypeFilter('all')}
              >
                All ({rawMaterials.length + products.filter(p => p.id !== productionProduct?.productId).length})
              </Button>
              <Button
                variant={materialTypeFilter === 'materials' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setMaterialTypeFilter('materials')}
              >
                Raw Materials ({rawMaterials.length})
              </Button>
              <Button
                variant={materialTypeFilter === 'products' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setMaterialTypeFilter('products')}
              >
                Products ({products.filter(p => p.id !== productionProduct?.productId).length})
              </Button>
              <Button
                variant={materialTypeFilter === 'individual' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setMaterialTypeFilter('individual')}
              >
                Individual Products ({individualProducts.length})
              </Button>
            </div>
          </div>
               
          {/* Materials Grid */}
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            {materialTypeFilter === 'individual' ? (
              /* Individual Products Grid */
              <div className="space-y-4">
                {products.filter(p => p.id !== productionProduct?.productId && hasIndividualTracking(p.id)).map((product) => {
                  const productIndividualProducts = getIndividualProductsForProduct(product.id);
                  return (
                    <div key={product.id} className="border rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <h4 className="font-medium">{product.name}</h4>
                        <Badge variant="outline" className="text-xs bg-purple-100 text-purple-700">
                          Individual Tracking
                        </Badge>
                        <span className="text-sm text-gray-500">({productIndividualProducts.length} available)</span>
                      </div>
                      
                      <div className="grid gap-2 max-h-40 overflow-y-auto">
                        {productIndividualProducts.map((individual) => (
                          <IndividualProductSelectionCard
                            key={individual.id}
                            individual={individual}
                            product={product}
                            onSelect={(individual) => {
                              setSelectedIndividualProducts(prev => {
                                const currentSelected = prev[product.id] || [];
                                const isSelected = currentSelected.some(s => s.id === individual.id);
                                
                                if (isSelected) {
                                  // Remove from selection
                                  return {
                                    ...prev,
                                    [product.id]: currentSelected.filter(s => s.id !== individual.id)
                                  };
                                } else {
                                  // Add to selection
                                  return {
                                    ...prev,
                                    [product.id]: [...currentSelected, individual]
                                  };
                                }
                              });
                            }}
                            onShowDetails={showIndividualProductDetailsPopup}
                            selected={selectedIndividualProducts[product.id]?.some(s => s.id === individual.id) || false}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Regular Materials Grid */
              <div className="grid gap-4">
                {getFilteredMaterials().map((material) => (
                  <MaterialSelectionCard
                    key={material.id}
                    material={material}
                    onAddToSelection={addMaterialToSelection}
                    onSelectIndividualProducts={handleSelectIndividualProducts}
                    isSelected={selectedMaterials.some(m => m.id === material.id)}
                    onAddAsRecipeIngredient={(material, _) => {
                      // Auto-calculate quantity for product as recipe ingredient
                      if (productionProduct && material.type === 'product') {
                        const ratio = calculateProductRatio(material, productionProduct);
                        if (ratio > 0) {
                          const quantityPerSqm = ratio;
                          addMaterialToSelection(material, quantityPerSqm);
                          toast({
                            title: "Product added to recipe",
                            description: `${material.name} added with auto-calculated quantity: ${quantityPerSqm.toFixed(4)} per SQM`,
                          });
                        } else {
                          toast({
                            title: "Cannot calculate",
                            description: "Unable to calculate ratio. Please add manually.",
                          });
                        }
                      }
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Selected Materials Summary */}
          {selectedMaterials.length > 0 && (
            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">Selected Materials ({selectedMaterials.length})</h4>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {selectedMaterials.map((material) => (
                  <div key={material.id} className="flex items-center justify-between p-2 bg-blue-50 rounded">
                       <div className="flex-1">
                      <span className="font-medium">{material.name}</span>
                      <span className="text-sm text-gray-500 ml-2">
                        {material.selectedQuantity || 1} {material.unit} • ₹{((material.cost_per_unit || 0) * (material.selectedQuantity || 1)).toFixed(2)}
                      </span>
                       </div>
                       <Button 
                         variant="outline" 
                         size="sm"
                      onClick={() => removeMaterialFromSelection(material.id)}
                           className="text-red-600 hover:text-red-700"
                         >
                           <Trash2 className="w-4 h-4" />
                         </Button>
                   </div>
                 ))}
               </div>
              <div className="flex justify-end items-center mt-4">
                <div className="flex flex-col items-end gap-2">
                  {selectedMaterials && selectedMaterials.some(m => (m.selectedQuantity || 1) > m.current_stock) && (
                    <div className="text-xs text-orange-600 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      Some materials have insufficient stock
               </div>
                  )}
             </div>
           </div>
             </div>
          )}

           <DialogFooter>
            <Button variant="outline" onClick={() => setIsMaterialSelectionOpen(false)}>
              {selectedMaterials && selectedMaterials.length > 0 ? 'Done' : 'Cancel'}
             </Button>
           </DialogFooter>
         </DialogContent>
       </Dialog>

      {/* Machine Selection Popup - Enhanced UI */}
      <Dialog open={showMachineSelectionPopup} onOpenChange={setShowMachineSelectionPopup}>
        <DialogContent className="max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
          <DialogHeader className="space-y-2">
            <DialogTitle className="flex items-center gap-2">
              <Factory className="w-5 h-5 text-blue-600" />
              Select Production Machine
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-600">
              Choose the machine for this production batch. This machine will be used for the entire production process.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Inspector Name */}
            <div className="space-y-3">
              <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <User className="w-4 h-4" />
                Inspector Name *
              </Label>
              <Input
                value={inspectorName}
                onChange={(e) => setInspectorName(e.target.value)}
                placeholder={user?.full_name || "Enter inspector name"}
                className="w-full"
              />
              {user?.full_name && (
                <p className="text-xs text-muted-foreground">
                  Currently logged in as: <span className="font-medium">{user.full_name}</span>
                </p>
              )}
            </div>
            
            {/* Machine Selection */}
            <div className="space-y-3">
              <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Select Machine * ({machines.length} available)
              </Label>
              <Select value={selectedMachineId} onValueChange={(value) => {
                if (value === "add-new-machine") {
                  setShowAddMachinePopup(true);
                } else {
                  setSelectedMachineId(value);
                }
              }}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose a machine..." />
                </SelectTrigger>
                <SelectContent>
                  {machines.map((machine) => (
                    <SelectItem key={machine.id} value={machine.id}>
                      {machine.name}
                    </SelectItem>
                  ))}
                  <SelectItem value="add-new-machine" className="text-blue-600 font-medium">
                    + Add New Machine
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            
          </div>
          
          <DialogFooter className="space-y-2 pt-4 border-t border-gray-100">
            <Button 
              onClick={handleMachineSelection}
              disabled={!selectedMachineId || !inspectorName.trim()}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
            >
              <Factory className="w-4 h-4 mr-2" />
              Start Production with Selected Machine
            </Button>
            
            <Button 
              variant="outline" 
              onClick={() => setShowMachineSelectionPopup(false)}
              size="sm"
              className="w-full"
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Machine Popup */}
      <Dialog open={showAddMachinePopup} onOpenChange={setShowAddMachinePopup}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Add New Machine
            </DialogTitle>
            <DialogDescription>
              Add a new machine to the system for production use.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="machine-name">Machine Name *</Label>
              <Input
                id="machine-name"
                value={newMachineForm.name}
                onChange={(e) => setNewMachineForm({...newMachineForm, name: e.target.value})}
                placeholder="Enter machine name"
              />
            </div>
            
            <div>
              <Label htmlFor="machine-type">Machine Type *</Label>
              <Input
                id="machine-type"
                value={newMachineForm.machine_type}
                onChange={(e) => setNewMachineForm({...newMachineForm, machine_type: e.target.value})}
                placeholder="e.g., Cutting, Stitching, Printing, etc."
              />
            </div>
            
            <div>
              <Label htmlFor="machine-description">Description (Optional)</Label>
              <Textarea
                id="machine-description"
                value={newMachineForm.description}
                onChange={(e) => setNewMachineForm({...newMachineForm, description: e.target.value})}
                placeholder="Enter machine description"
                rows={3}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowAddMachinePopup(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={addNewMachine}
              className="bg-blue-600 hover:bg-blue-700"
              disabled={!newMachineForm.name.trim() || !newMachineForm.machine_type.trim()}
            >
              <Save className="w-4 h-4 mr-2" />
              Add Machine
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Individual Product Details Popup */}
      <Dialog open={showIndividualProductDetails} onOpenChange={setShowIndividualProductDetails}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Individual Product Details
            </DialogTitle>
            <DialogDescription>
              Detailed information about the selected individual product
            </DialogDescription>
          </DialogHeader>
          
          {selectedIndividualProductDetails && (
            <div className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Product ID</Label>
                    <div className="text-lg font-mono bg-gray-100 p-2 rounded">
                      {selectedIndividualProductDetails.id}
                    </div>
                  </div>
                  
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Product Name</Label>
                    <div className="text-lg font-medium">
                      {selectedIndividualProductDetails.product?.name}
                    </div>
                  </div>
                  
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Status</Label>
                    <Badge 
                      variant={selectedIndividualProductDetails.status === 'available' ? 'default' : 'secondary'}
                      className="ml-2"
                    >
                      {selectedIndividualProductDetails.status || 'Available'}
                    </Badge>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Category</Label>
                    <div className="text-sm">
                      {selectedIndividualProductDetails.product?.category}
                    </div>
                  </div>
                  
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Unit</Label>
                    <div className="text-sm">
                      {selectedIndividualProductDetails.product?.unit}
                    </div>
                  </div>
                  
                  <div>
                    <Label className="text-sm font-medium text-gray-600">QR Code</Label>
                    <div className="text-xs font-mono bg-gray-100 p-2 rounded break-all">
                      {selectedIndividualProductDetails.qr_code || 'Not generated'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Manufacturing Information */}
              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">Manufacturing Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Manufacturing Date</Label>
                    <div className="text-sm">
                      {selectedIndividualProductDetails.manufacturing_date 
                        ? new Date(selectedIndividualProductDetails.manufacturing_date).toLocaleDateString()
                        : 'Not specified'
                      }
                    </div>
                  </div>
                  
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Created At</Label>
                    <div className="text-sm">
                      {selectedIndividualProductDetails.created_at 
                        ? new Date(selectedIndividualProductDetails.created_at).toLocaleString()
                        : 'Not available'
                      }
                    </div>
                  </div>
                </div>
              </div>

              {/* Product Specifications */}
              {selectedIndividualProductDetails.product && (
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3">Product Specifications</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedIndividualProductDetails.product.length && (
                      <div>
                        <Label className="text-sm font-medium text-gray-600">Length</Label>
                        <div className="text-sm">{selectedIndividualProductDetails.product.length}</div>
                      </div>
                    )}
                    
                    {selectedIndividualProductDetails.product.width && (
                      <div>
                        <Label className="text-sm font-medium text-gray-600">Width</Label>
                        <div className="text-sm">{selectedIndividualProductDetails.product.width}</div>
                      </div>
                    )}
                    
                    {selectedIndividualProductDetails.product.weight && (
                      <div>
                        <Label className="text-sm font-medium text-gray-600">Weight</Label>
                        <div className="text-sm">{selectedIndividualProductDetails.product.weight}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Additional Details */}
              {(selectedIndividualProductDetails.notes || selectedIndividualProductDetails.product?.notes) && (
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3">Notes</h4>
                  <div className="text-sm bg-gray-50 p-3 rounded">
                    {selectedIndividualProductDetails.notes || selectedIndividualProductDetails.product?.notes}
                  </div>
                </div>
              )}
            </div>
          )}
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowIndividualProductDetails(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Individual Product Selection Dialog for Recipe */}
      <Dialog open={showIndividualProductSelection} onOpenChange={setShowIndividualProductSelection}>
        <DialogContent className="max-w-7xl max-h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Select Individual Products - {currentSelectingProduct?.name}
            </DialogTitle>
            <DialogDescription>
              Choose specific individual products for this recipe. You can auto-select the required quantity or manually select specific pieces.
            </DialogDescription>
          </DialogHeader>
          
          {currentSelectingProduct && (
            <div className="flex-1 flex flex-col space-y-4 overflow-hidden">
              {/* Summary */}
              <div className="flex-shrink-0 flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="text-sm">
                  <span className="font-medium">Required Quantity: {currentSelectingProduct.requiredQuantity || 1} pieces</span>
                  <span className="text-blue-600 ml-2 font-medium">• Select individual products for production</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-sm text-muted-foreground">
                    Available: {getAvailableIndividualProductsForRecipe(currentSelectingProduct.id).length} pieces
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => autoSelectOldestProductsForRecipe(currentSelectingProduct.id, currentSelectingProduct.requiredQuantity || 1)}
                    disabled={getAvailableIndividualProductsForRecipe(currentSelectingProduct.id).length === 0}
                  >
                    Auto-Select Required
                  </Button>
                </div>
              </div>

              {/* Excel-like Table */}
              <div className="flex-1 overflow-auto">
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-gray-700 border-r">Select</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-700 border-r">ID</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-700 border-r">QR Code</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-700 border-r">Manufactured</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-700 border-r">Weight</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-700 border-r">Quality</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-700 border-r">Location</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-700">Inspector</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getAvailableIndividualProductsForRecipe(currentSelectingProduct.id).length === 0 ? (
                        <tr>
                          <td colSpan={8} className="px-3 py-8 text-center text-muted-foreground">
                            <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p>No individual products available</p>
                            <p className="text-xs mt-1">Individual pieces will appear here when available in inventory</p>
                          </td>
                        </tr>
                      ) : (
                        getAvailableIndividualProductsForRecipe(currentSelectingProduct.id).map((product) => {
                          const selectedProducts = selectedIndividualProductsForRecipe[currentSelectingProduct.id] || [];
                          const isSelected = selectedProducts.some(p => p.id === product.id);
                          const isDisabled = !isSelected && selectedProducts.length >= (currentSelectingProduct.requiredQuantity || 1);

                          return (
                            <tr
                              key={product.id} 
                              className={`hover:bg-gray-50 transition-colors ${
                                isSelected ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                              } ${isDisabled ? 'opacity-50' : ''}`}
                            >
                              <td className="px-3 py-2 border-r">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    if (!isDisabled) {
                                      handleIndividualProductSelectionForRecipe(currentSelectingProduct.id, product, !isSelected);
                                    }
                                  }}
                                  disabled={isDisabled}
                                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                                />
                              </td>
                              <td className="px-3 py-2 border-r font-mono text-xs">{product.id}</td>
                              <td className="px-3 py-2 border-r">
                                {(product.qrCode || product.qr_code) ? (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedQRProduct({
                                        ...product,
                                        qrCode: product.qrCode || product.qr_code,
                                        manufacturingDate: product.manufacturingDate || product.manufacturing_date || product.production_date,
                                        qualityGrade: product.qualityGrade || product.quality_grade
                                      });
                                      setShowQRCode(true);
                                    }}
                                    className="text-xs h-6 px-2"
                                    title={`QR Code: ${product.qrCode || product.qr_code}`}
                                  >
                                    <QrCode className="w-3 h-3 mr-1" />
                                    QR
                                  </Button>
                                ) : (
                                  <div className="text-xs font-mono text-gray-400">
                                    No QR Code
                                  </div>
                                )}
                              </td>
                              <td className="px-3 py-2 border-r">
                                {(product.manufacturingDate) && product.manufacturingDate !== 'null' ? 
                                  new Date(product.manufacturingDate).toLocaleDateString() : 
                                  (product.productionDate) && product.productionDate !== 'null' ? 
                                    new Date(product.productionDate).toLocaleDateString() : 
                                    (product.completionDate) && product.completionDate !== 'null' ? 
                                      new Date(product.completionDate).toLocaleDateString() : 'N/A'}
                              </td>
                              <td className="px-3 py-2 border-r">{product.weight}</td>
                              <td className="px-3 py-2 border-r">
                                <Badge className={
                                  product.qualityGrade === "A+" ? "bg-green-100 text-green-800" :
                                  product.qualityGrade === "A" ? "bg-blue-100 text-blue-800" :
                                  product.qualityGrade === "B" ? "bg-yellow-100 text-yellow-800" :
                                  "bg-white text-gray-800 border border-gray-300"
                                }>
                                  {product.qualityGrade}
                                </Badge>
                              </td>
                              <td className="px-3 py-2 border-r">{product.location}</td>
                              <td className="px-3 py-2">{product.inspector || 'N/A'}</td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowIndividualProductSelection(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => {
                // Update the selected materials with individual product selection
                const selectedProducts = selectedIndividualProductsForRecipe[currentSelectingProduct.id] || [];
                if (selectedProducts.length > 0) {
                  // Update the material in selectedMaterials with individual product IDs
                  setSelectedMaterials(prev => prev.map(material => {
                    if (material.id === currentSelectingProduct.id) {
                      return {
                        ...material,
                        selectedIndividualProducts: selectedProducts,
                        selectedQuantity: selectedProducts.length,
                        totalQuantity: selectedProducts.length
                      };
                    }
                    return material;
                  }));
                  
                  toast({
                    title: "Individual products selected",
                    description: `${selectedProducts.length} products selected for ${currentSelectingProduct.name}`,
                  });
                  
                  setShowIndividualProductSelection(false);
                }
              }}
              disabled={!selectedIndividualProductsForRecipe[currentSelectingProduct?.id]?.length}
            >
              Update Recipe ({selectedIndividualProductsForRecipe[currentSelectingProduct?.id]?.length || 0} selected)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* QR Code Display Dialog */}
      <Dialog open={showQRCode} onOpenChange={setShowQRCode}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="w-5 h-5" />
              QR Code - {selectedQRProduct?.id}
            </DialogTitle>
            <DialogDescription>
              QR Code for this individual product
            </DialogDescription>
          </DialogHeader>
          
          {selectedQRProduct && (
            <div className="flex flex-col items-center space-y-4">
              <div className="p-4 bg-white border-2 border-gray-200 rounded-lg">
                <div className="text-center">
                  <div className="text-2xl font-mono mb-2">{selectedQRProduct.qrCode || selectedQRProduct.qr_code || 'Not available'}</div>
                  <div className="text-sm text-gray-500">Product ID: {selectedQRProduct.id}</div>
                </div>
              </div>
              <div className="text-sm text-gray-600 text-center">
                <p>Manufactured: {(selectedQRProduct.manufacturingDate || selectedQRProduct.manufacturing_date || selectedQRProduct.production_date) ? 
                  new Date(selectedQRProduct.manufacturingDate || selectedQRProduct.manufacturing_date || selectedQRProduct.production_date).toLocaleDateString() : 'N/A'}</p>
                <p>Quality: {selectedQRProduct.qualityGrade || selectedQRProduct.quality_grade || 'N/A'}</p>
              </div>
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

// Material Selection Card Component
interface MaterialSelectionCardProps {
  material: any; // Can be RawMaterial or Product
  onAddToSelection: (material: any, quantity: number) => void;
  onSelectIndividualProducts?: (product: any) => void;
  isSelected: boolean;
  onAddAsRecipeIngredient?: (material: any, quantity: number) => void; // For products - add with auto-calculated quantity
}

function MaterialSelectionCard({ material, onAddToSelection, onSelectIndividualProducts, isSelected, onAddAsRecipeIngredient }: MaterialSelectionCardProps) {
  const handleAddToSelection = () => {
    // Add with default quantity of 1, will be editable on main page
    onAddToSelection(material, 1);
  };

  const handleAddAsRecipeIngredient = () => {
    // For products - add with auto-calculated quantity as recipe ingredient
    if (onAddAsRecipeIngredient) {
      onAddAsRecipeIngredient(material, 0); // Quantity will be calculated in parent
    }
  };

  const handleProductSelection = () => {
    // For products, show individual product selection dialog
    if (material.type === 'product' && onSelectIndividualProducts) {
      onSelectIndividualProducts(material);
      return;
    }
    // For raw materials, add directly
    handleAddToSelection();
  };

  return (
    <div className={`flex items-center justify-between p-4 border rounded-lg ${isSelected ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50'}`}>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <div className="font-medium">{material.displayName || material.name}</div>
          {material.type === 'product' && (
            <Badge variant="outline" className="text-xs bg-green-100 text-green-700">
              Product
            </Badge>
          )}
          {material.type === 'material' && (
            <Badge variant="outline" className="text-xs bg-blue-100 text-blue-700">
              Raw Material
            </Badge>
          )}
        </div>
        <div className="text-sm text-gray-500">
          {material.displayCategory || material.category} • {material.current_stock} {material.unit} available
          {material.type === 'material' && ` • ₹${material.cost_per_unit} per ${material.unit}`}
        </div>
        <div className="text-xs text-gray-400">
          {material.type === 'product' ? (
            `Product ID: ${material.id} • From Product Inventory`
          ) : (
            `Type: ${material.materialType || material.type || 'Unknown'} • Supplier: ${material.supplier_name}`
          )}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Badge 
          variant={material.status === "in-stock" ? "default" : "destructive"}
        >
          {material.status === "in-stock" ? "In Stock" : material.status}
        </Badge>
        <div className="flex gap-2">
          {material.type === 'product' && onAddAsRecipeIngredient && (
            <Button 
              size="sm" 
              variant={isSelected ? "default" : "outline"}
              onClick={handleAddAsRecipeIngredient}
              disabled={isSelected}
              title="Add as recipe ingredient with auto-calculated quantity per SQM"
            >
              Add to Recipe
            </Button>
          )}
          <Button 
            size="sm" 
            variant={isSelected ? "default" : "outline"}
            onClick={handleProductSelection}
            disabled={isSelected}
          >
            {isSelected ? "Added" : (material.type === 'product' ? "Select Individual Products" : "Add")}
          </Button>
        </div>
      </div>
     </div>
   );
 }

// Individual Product Selection Card Component
interface IndividualProductSelectionCardProps {
  individual: any;
  product: any;
  onSelect: (individual: any) => void;
  onShowDetails: (individual: any, product: any) => void;
  selected: boolean;
}

function IndividualProductSelectionCard({ individual, product, onSelect, onShowDetails, selected }: IndividualProductSelectionCardProps) {
  const handleToggle = () => {
    onSelect(individual);
  };

  return (
    <div className={`flex items-center justify-between p-3 border rounded-lg ${selected ? 'bg-purple-50 border-purple-200' : 'hover:bg-gray-50'}`}>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <div className="font-medium text-sm">{individual.id}</div>
          <Badge variant="outline" className="text-xs bg-purple-100 text-purple-700">
            Individual
          </Badge>
        </div>
        <div className="text-xs text-gray-500">
          {product.name} • {individual.status || 'Available'}
        </div>
        {individual.manufacturing_date && (
          <div className="text-xs text-gray-400">
            Made: {new Date(individual.manufacturing_date).toLocaleDateString()}
          </div>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onShowDetails(individual, product)}
          className="text-xs h-6 px-2"
        >
          <Info className="w-3 h-3 mr-1" />
          Details
        </Button>
        <input
          type="checkbox"
          checked={selected}
          onChange={handleToggle}
          className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
        />
      </div>
    </div>
  );
 }
