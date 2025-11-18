import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  ArrowLeft, AlertTriangle, Plus, Trash2, Save, Factory, Info
} from "lucide-react";
import { generateUniqueId } from "@/lib/storageUtils";
import { RawMaterialService as MongoDBRawMaterialService } from "@/services/api/rawMaterialService";
import ProductService from "@/services/api/productService";
import RecipeService from "@/services/api/recipeService";
// TODO: Replace ProductionFlowService with MongoDB implementation when available
import WasteService from "@/services/api/wasteService";
import { DropdownService } from "@/services/api/dropdownService";
import MaterialConsumptionService from "@/services/api/materialConsumptionService";
import { IndividualProductService } from "@/services/api/individualProductService";
import ProductionProgressBar from "@/components/production/ProductionProgressBar";
import { ProductionService } from "@/services/api/productionService";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
// Supabase removed from this page in favor of MongoDB services
// Removed Select-based dropdown for Waste Type; using custom chip UI

interface MaterialConsumption {
  materialId: string;
  materialName: string;
  quantity: number;
  unit: string;
  cost: number;
  consumedAt: string;
}

interface WasteItem {
  materialId: string;
  materialName: string;
  materialType?: 'raw_material' | 'product'; // Track if it's a raw material or product
  quantity: number;
  unit: string;
  wasteType: string;
  canBeReused: boolean;
  notes: string;
  individualProductIds?: string[]; // For products - which individual products are wasted
}

interface ProductionProduct {
  id: string;
  productId: string;
  productName: string;
  category: string;
  color: string;
  size: string;
  pattern: string;
  targetQuantity: number;
  priority: "normal" | "high" | "urgent";
  status: "planning" | "active" | "completed";
  expectedCompletion: string;
  createdAt: string;
  materialsConsumed: MaterialConsumption[];
  wasteGenerated: WasteItem[];
  expectedProduct: {
    name: string;
    category: string;
    length: string;
    width: string;
    weight: string;
    materialComposition: string;
    qualityGrade: string;
  };
  notes: string;
}

interface RawMaterial {
  id: string;
  name: string;
  brand: string;
  category: string;
  currentStock: number;
  unit: string;
  costPerUnit: number;
  supplier: string;
  supplierId: string;
  status: "in-stock" | "low-stock" | "out-of-stock" | "overstock";
  location?: string;
  batchNumber?: string;
}

export default function WasteGeneration() {
  const { batchId } = useParams();
  const productId = batchId; // Alias for backward compatibility with existing code
  const navigate = useNavigate();
  const [productionProduct, setProductionProduct] = useState<ProductionProduct | null>(null);
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [recipeMaterials, setRecipeMaterials] = useState<any[]>([]);
  const [isAddingWaste, setIsAddingWaste] = useState(false);
  const [productionFlow, setProductionFlow] = useState<any>(null);
  const [productionSteps, setProductionSteps] = useState<any[]>([]);
  
  // Waste form
  const [newWaste, setNewWaste] = useState({
    materialId: "",
    materialName: "",
    quantity: "",
    unit: "",
    wasteType: "",
    canBeReused: false,
    notes: ""
  });
  const [wasteTypes, setWasteTypes] = useState<string[]>([]);
  
  // Individual product selection for waste tracking
  const [selectedIndividualProducts, setSelectedIndividualProducts] = useState<any[]>([]);
  const [availableIndividualProducts, setAvailableIndividualProducts] = useState<any[]>([]);
  
  // Track whether we're showing consumed materials or recipe materials
  const [isShowingConsumedMaterials, setIsShowingConsumedMaterials] = useState(false);

  // Load waste type options from MongoDB dropdowns (category: waste_type)
  const loadWasteTypes = async () => {
    try {
      // Prefer consolidated production dropdowns endpoint
      const prodDropdowns = await DropdownService.getProductionDropdownData();
      const types = prodDropdowns?.waste_types?.filter((o: any) => o.is_active !== false).map((o: any) => o.value) || [];
      if (types.length > 0) {
        setWasteTypes(types);
        return;
      }
    } catch (e) {
      console.error('Error loading waste types from production dropdowns:', e);
    }
    try {
      // Fallback: direct category fetch
      const options = await DropdownService.getOptionsByCategory('waste_type');
      const types = (options || []).filter((o: any) => o.is_active !== false).map((o: any) => o.value);
      if (types.length > 0) {
        setWasteTypes(types);
        return;
      }
    } catch (e) {
      console.error('Error loading waste types from category:', e);
    }
    // No hardcoded fallback - show empty if no options available
    console.warn('⚠️ No waste types found in backend. Please add waste types in Dropdown Master.');
    setWasteTypes([]);
  };

  // Load consumed materials from database
  const loadRecipeMaterials = async (productId: string) => {
    try {
      console.log('🔍 Loading consumed materials for production batch:', productId);
      
      // Load material consumption from MongoDB using the batch ID
      const { data: consumptionResp, error: consumptionError } = await MaterialConsumptionService.getMaterialConsumption({
        production_batch_id: productId
      });
      if (consumptionError) {
        console.error('Error loading material consumption:', consumptionError);
      }
      const materialConsumption = consumptionResp?.data || [];

      console.log('✅ Found material consumption records:', materialConsumption.length || 0);
      if (materialConsumption && materialConsumption.length > 0) {
        console.log('📋 Materials actually consumed in production:', materialConsumption.map(m => ({
          name: m.material_name,
          type: m.material_type,
          quantity: m.quantity_used,
          unit: m.unit
        })));
      }
      
      // If no material consumption found, try to get from recipe as fallback
      let materialsFromRecipe = [];
      if (!materialConsumption || materialConsumption.length === 0) {
        console.log('🔍 No material consumption found, loading from recipe as fallback...');
        
        // Get the recipe for this product
        const { data: recipe, error: recipeError } = await RecipeService.getRecipeByProductId(productId);
        
        if (recipeError) {
          console.error('Error loading recipe:', recipeError);
          return;
        }

        if (recipe && recipe.materials) {
          console.log('✅ Found recipe with materials:', recipe.materials.length);
          console.log('📋 Recipe materials (fallback):', recipe.materials.map((m: any) => ({
            name: m.material_name,
            type: m.material_type,
            quantity: m.quantity_per_sqm,
            unit: m.unit
          })));
          materialsFromRecipe = recipe.materials;
        }
      }
      
      // Use material consumption if available, otherwise use recipe materials
      const materialsToUse = (materialConsumption && materialConsumption.length > 0) ? materialConsumption : materialsFromRecipe;
      const showingConsumedMaterials = (materialConsumption && materialConsumption.length > 0);
      setIsShowingConsumedMaterials(showingConsumedMaterials);
      
      if (materialsToUse.length > 0) {
        console.log('✅ Using materials:', materialsToUse.length, (materialConsumption && materialConsumption.length > 0) ? 'from material consumption' : 'from recipe');
        
        // Load raw materials and products to get full details
        const [rawMaterialsResult, productsResult] = await Promise.all([
          MongoDBRawMaterialService.getRawMaterials(),
          ProductService.getProducts()
        ]);

        const rawMaterialsData = rawMaterialsResult?.data || [];
        let productsData = productsResult?.data || [];
        
        // Calculate individual counts for products that are in the recipe
        // Get all material IDs from the recipe
        const materialIdsInRecipe = materialsToUse.map((m: any) => m.material_id || m.materialId);
        
        // Find which material IDs correspond to products (check if they exist in productsData)
        const productIdsInRecipe = materialIdsInRecipe.filter((materialId: string) => {
          // Check if material_type is explicitly 'product'
          const materialData = materialsToUse.find((m: any) => (m.material_id || m.materialId) === materialId);
          if (materialData && (materialData.material_type || 'raw_material') === 'product') {
            return true;
          }
          // Also check if the material_id exists in productsData (fallback detection)
          return productsData.some((p: any) => p.id === materialId);
        });
        
        if (productIdsInRecipe.length > 0) {
          console.log('📦 Loading individual product counts for products in recipe:', productIdsInRecipe);
          
          // Load individual products for each product in the recipe
          const individualCountsMap = new Map<string, number>();
          
          try {
            const countPromises = productIdsInRecipe.map(async (productId: string) => {
              try {
                const { data: individualProducts, error } = await IndividualProductService.getIndividualProductsByProductId(productId);
                if (!error && individualProducts) {
                  const availableCount = individualProducts.filter((ip: any) => ip.status === 'available').length;
                  individualCountsMap.set(productId, availableCount);
                  console.log(`✅ Product ${productId}: ${availableCount} individual products available`);
                  return { productId, count: availableCount };
                } else {
                  console.warn(`⚠️ Error loading individual products for ${productId}:`, error);
                }
              } catch (error) {
                console.warn(`⚠️ Error loading individual products for ${productId}:`, error);
              }
              return { productId, count: 0 };
            });
            
            await Promise.all(countPromises);
            console.log('📊 Individual counts map:', Array.from(individualCountsMap.entries()));
          } catch (error) {
            console.error('❌ Error loading individual product counts:', error);
          }
          
          // Update productsData with calculated individual counts
          productsData = productsData.map((product: any) => {
            const count = individualCountsMap.get(product.id);
            if (count !== undefined) {
              console.log(`📦 Updating product ${product.id} with count: ${count}`);
              return {
                ...product,
                individual_count: count, // For frontend use
                individual_products_count: count // Match backend field name
              };
            }
            // Use individual_products_count from backend if available, otherwise calculate
            const backendCount = product.individual_products_count || product.individual_count || 0;
            return {
              ...product,
              individual_count: backendCount, // For frontend use
              individual_products_count: backendCount // Match backend field name
            };
          });
        } else {
          console.log('⚠️ No products found in recipe, skipping individual count calculation');
          // No products in recipe, use backend values or set to 0
          productsData = productsData.map((product: any) => {
            const backendCount = product.individual_products_count || product.individual_count || 0;
            return {
              ...product,
              individual_count: backendCount, // For frontend use
              individual_products_count: backendCount // Match backend field name
            };
          });
        }
        
        console.log('📦 Available products for waste tracking:', productsData.map(p => ({
          id: p.id,
          name: p.name,
          individual_count: (p as any).individual_count || p.individual_products_count || 0
        })));

        // Map materials to full material/product details - properly distinguish between products and raw materials
        const mappedMaterials = materialsToUse.map((materialData: any) => {
          // Handle both production materials and recipe materials
          const materialId = materialData.materialId || materialData.material_id;
          const materialName = materialData.materialName || materialData.material_name;
          const materialType = materialData.material_type || 'raw_material';
          
          // For products: use actual_consumed_quantity (fractional) if available, otherwise use quantity_used
          // For raw materials: use quantity_used
          let quantity = 0;
          if (materialType === 'product') {
            quantity = materialData.actual_consumed_quantity !== undefined 
              ? materialData.actual_consumed_quantity 
              : (materialData.quantity || materialData.quantity_used || 0);
          } else {
            quantity = materialData.quantity || materialData.quantity_used || 0;
          }
          
          const unit = materialData.unit || 'units';
          
          console.log('🔍 Processing material:', {
            materialId,
            materialName,
            materialType,
            quantity,
            unit,
            rawData: materialData
          });
          
          // Determine if this is a product or raw material based on material_type from consumption data
          // If material_type is not set correctly, fallback to checking if it exists in products
          let isProduct = materialType === 'product';
          
          // Fallback: if material_type is 'raw_material' but material_id exists in products, treat as product
          if (!isProduct && materialType === 'raw_material') {
            const productExists = productsData.find((p: any) => p.id === materialId);
            if (productExists) {
              console.log('🔄 Fallback: Treating as product because material_id exists in products:', materialId);
              isProduct = true;
            } else if (materialId.startsWith('PRO-')) {
              // Additional fallback: if material_id starts with "PRO-", it's likely a product
              console.log('🔄 Fallback: Treating as product because material_id starts with "PRO-":', materialId);
              isProduct = true;
            }
          }
          
          let material = null;
          
          if (isProduct) {
            // For products, find in products data
            console.log('🔍 Looking for product with ID:', materialId);
            const product = productsData.find((p: any) => p.id === materialId);
            console.log('🔍 Found product:', product ? 'YES' : 'NO', product ? { id: product.id, name: product.name } : null);
            if (product) {
              // Use individual_products_count from backend, fallback to individual_count, then 0
              const productCount = product.individual_products_count || (product as any).individual_count || 0;
              material = {
                id: product.id,
                name: product.name,
                current_stock: productCount,
                cost_per_unit: 0, // Products don't have cost in this context
                category: product.category || 'Product',
                brand: '',
                supplier_name: 'Product Inventory',
                status: 'in-stock',
                unit: product.unit || 'units'
              };
            }
          } else {
            // For raw materials, find in raw materials data
            material = rawMaterialsData.find((m: any) => m.id === materialId);
          }
          
          if (material) {
            return {
              id: materialId,
              name: materialName,
              type: isProduct ? 'product' : 'raw_material', // Properly distinguish between products and raw materials
              quantity: quantity,
              unit: unit,
              currentStock: material.current_stock || 0,
              costPerUnit: material.cost_per_unit || 0,
              category: material.category || 'Unknown',
              brand: (material as any)?.brand || '',
              supplier: material.supplier_name || '',
              status: material.status || 'in-stock',
              isProduct: isProduct, // Keep track if it was originally a product
              individual_product_ids: materialData.individual_product_ids || [] // Include individual product IDs from consumption data
            };
          }
          
          return null;
        }).filter(Boolean);

        setRecipeMaterials(mappedMaterials);
        console.log('✅ Recipe materials loaded:', mappedMaterials.length);
        console.log('📋 Final mapped materials:', mappedMaterials.map(m => ({
          id: m.id,
          name: m.name,
          type: m.type,
          isProduct: m.isProduct,
          currentStock: m.currentStock
        })));
      } else {
        console.log('⚠️ No recipe found for product:', productId);
        setRecipeMaterials([]);
      }
    } catch (error) {
      console.error('❌ Error loading recipe materials:', error);
      setRecipeMaterials([]);
    }
  };

  useEffect(() => {
    if (!batchId) {
      console.error('❌ No batchId provided in route parameters');
      // Set a fallback to prevent infinite loading
      const fallbackProduct: ProductionProduct = {
        id: 'unknown',
        productId: 'unknown',
        productName: 'Unknown Batch',
        category: 'Unknown',
        color: 'Unknown',
        size: 'Unknown',
        pattern: 'Unknown',
        targetQuantity: 1,
        priority: 'normal',
        status: 'active',
        expectedCompletion: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        materialsConsumed: [],
        wasteGenerated: [],
        expectedProduct: {
          name: 'Unknown Batch',
          category: 'Unknown',
          length: '',
          width: '',
          weight: '',
          materialComposition: '',
          qualityGrade: 'A+'
        },
        notes: ''
      };
      setProductionProduct(fallbackProduct);
      return;
    }

    // Load production product data (MongoDB)
    const loadProductionData = async () => {
      try {
        console.log('🔍 Loading production data for batchId:', batchId);
        
        // Load material consumption for this batch to populate materialsConsumed
        const { data: consumptionResp } = await MaterialConsumptionService.getMaterialConsumption({
          production_batch_id: batchId
        });
        const materialsConsumed = (consumptionResp?.data || []).map((m: any) => ({
          materialId: m.material_id,
          materialName: m.material_name || 'Unknown Material',
          quantity: m.quantity_used || 0,
          unit: m.unit || 'units',
          cost: m.total_cost || (m.cost_per_unit || 0) * (m.quantity_used || 0),
          consumedAt: m.consumed_at
        }));

        const productionProduct: ProductionProduct = {
          id: batchId || 'unknown',
          productId: batchId || 'unknown',
          productName: 'Production Batch',
          category: 'Carpet',
          color: 'N/A',
          size: 'N/A',
          pattern: 'N/A',
          targetQuantity: 1,
          priority: 'normal',
          status: 'active',
          expectedCompletion: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          createdAt: new Date().toISOString(),
          materialsConsumed,
          wasteGenerated: [],
          expectedProduct: {
            name: 'Production Batch',
            category: 'Carpet',
            length: 'N/A',
            width: 'N/A',
            weight: 'N/A',
            materialComposition: 'N/A',
            qualityGrade: 'A'
          },
          notes: ''
        };
        setProductionProduct(productionProduct);
        setProductionFlow(null);
        setProductionSteps([]);
        
        // Load recipe or material list for UI
        await loadRecipeMaterials(batchId);
      } catch (error) {
        console.error('❌ Error loading production data:', error);
        // Set a fallback production product to prevent infinite loading
        const fallbackProduct: ProductionProduct = {
          id: batchId || 'unknown',
          productId: batchId || 'unknown',
          productName: 'Unknown Product',
          category: 'Unknown',
          color: 'Unknown',
          size: 'Unknown',
          pattern: 'Unknown',
          targetQuantity: 1,
          priority: 'normal',
          status: 'active',
          expectedCompletion: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          materialsConsumed: [],
          wasteGenerated: [],
          expectedProduct: {
            name: 'Unknown Product',
            category: 'Unknown',
            length: '',
            width: '',
            weight: '',
            materialComposition: '',
            qualityGrade: 'A+'
          },
          notes: ''
        };
        setProductionProduct(fallbackProduct);
      }
    };
    
    loadProductionData();
    loadWasteTypes();
  }, [batchId]);

  useEffect(() => {
    if (!batchId) return;

    const loadFlowAndSteps = async () => {
      try {
        // Load flow by batchId
        const { data: flow } = await ProductionService.getProductionFlowByBatchId(batchId);
        if (flow) {
          setProductionFlow(flow);
          // Load steps for this flow
          const { data: steps } = await ProductionService.getProductionFlowSteps(flow.id);
          if (steps) {
            setProductionSteps(steps);
          } else {
            setProductionSteps([]);
          }
        } else {
          setProductionFlow(null);
          setProductionSteps([]);
        }
      } catch (err) {
        console.error('Error loading production flow/steps for waste page:', err);
        setProductionFlow(null);
        setProductionSteps([]);
      }
    };

    loadFlowAndSteps();
  }, [batchId]);

  // Load raw materials from MongoDB
  useEffect(() => {
    const loadRawMaterials = async () => {
      try {
        const result = await MongoDBRawMaterialService.getRawMaterials();
        if (result?.data) {
          // Map Supabase RawMaterial to local interface
          const mappedMaterials = result.data.map((material: any) => ({
            id: material.id,
            name: material.name,
            brand: material.brand || '',
            category: material.category,
            currentStock: material.current_stock,
            unit: material.unit,
            costPerUnit: material.cost_per_unit,
            supplier: material.supplier_name || '',
            supplierId: material.supplier_id || '',
            status: material.status || 'in-stock',
            location: material.location,
            batchNumber: material.batch_number
          })) as RawMaterial[];
          setRawMaterials(mappedMaterials);
        }
      } catch (error) {
        console.error('Error loading raw materials:', error);
        setRawMaterials([]);
      }
    };

    loadRawMaterials();
  }, []);

  // Handle waste material selection change
  const handleWasteMaterialSelection = async (materialId: string) => {
    const selectedMaterial = recipeMaterials.find(m => m.id === materialId);
    if (selectedMaterial) {
      // For products, get actual consumed quantity and auto-calculate wastage
      let autoWasteQuantity = '';
      let actualConsumedQuantity = selectedMaterial.quantity || 0;
      
      if (selectedMaterial.type === 'product') {
        // Get actual consumed quantity from material consumption record
        // For products: use actual_consumed_quantity (fractional, e.g., 0.4) if available, otherwise use quantity_used
        try {
          const { data: consumptionResp } = await MaterialConsumptionService.getMaterialConsumption({
            production_batch_id: batchId,
            material_id: materialId
          });
          
          if (consumptionResp?.data && consumptionResp.data.length > 0) {
            const consumptionRecord = consumptionResp.data[0] as any;
            // Use actual_consumed_quantity if available (fractional consumption), otherwise fall back to quantity_used
            actualConsumedQuantity = consumptionRecord.actual_consumed_quantity !== undefined 
              ? consumptionRecord.actual_consumed_quantity 
              : (consumptionRecord.quantity_used || selectedMaterial.quantity || 0);
            console.log('📊 Consumption record:', {
              quantity_used: consumptionRecord.quantity_used,
              actual_consumed_quantity: consumptionRecord.actual_consumed_quantity,
              using: actualConsumedQuantity
            });
          }
        } catch (error) {
          console.warn('Could not fetch consumption record, using material quantity:', error);
        }
        
        // Calculate whole products needed (round up)
        const wholeProductsNeeded = Math.ceil(actualConsumedQuantity);
        
        // Auto-calculate wastage: whole products - actual consumed
        if (wholeProductsNeeded > actualConsumedQuantity) {
          autoWasteQuantity = (wholeProductsNeeded - actualConsumedQuantity).toFixed(4);
        } else {
          autoWasteQuantity = '0';
        }
      }
      
      setNewWaste({
        ...newWaste,
        materialId: selectedMaterial.id,
        materialName: selectedMaterial.name,
        unit: selectedMaterial.type === 'product' ? 'product' : selectedMaterial.unit,
        quantity: autoWasteQuantity // Auto-fill wastage quantity for products
      });
      
      // If it's a product, load individual products that were used in production
      if (selectedMaterial.type === 'product') {
        // Use the selectedMaterial which already has individual_product_ids from loadRecipeMaterials
        console.log('🔍 Selected material:', selectedMaterial);
        console.log('🔍 Individual product IDs from material:', selectedMaterial.individual_product_ids);
        console.log('🔍 Actual consumed quantity:', actualConsumedQuantity);
        
        if (selectedMaterial.individual_product_ids && selectedMaterial.individual_product_ids.length > 0) {
          await loadIndividualProductsForWaste(selectedMaterial.id, selectedMaterial, actualConsumedQuantity);
        } else {
          console.log('⚠️ No individual product IDs found for selected material, trying to load from material consumption...');
          // Fallback: try to load from material consumption directly
          await loadIndividualProductsForWaste(selectedMaterial.id, selectedMaterial, actualConsumedQuantity);
        }
      } else {
        setSelectedIndividualProducts([]);
        setAvailableIndividualProducts([]);
      }
    }
  };

  // Load individual products that were actually used in production
  const loadIndividualProductsForWaste = async (productId: string, materialConsumptionData: any, actualConsumedQuantity: number = 0) => {
    try {
      console.log('🔍 Loading individual products that were used in production:', productId);
      console.log('🔍 Actual consumed quantity:', actualConsumedQuantity);
      
      // Get the individual_product_ids from the material consumption data
      let individualProductIds = materialConsumptionData.individual_product_ids || [];
      
      // If no individual_product_ids in the material data, try to load from material consumption API
      if (individualProductIds.length === 0) {
        console.log('⚠️ No individual_product_ids in material data, fetching from material consumption API...');
        try {
          const { data: consumptionResp } = await MaterialConsumptionService.getMaterialConsumption({
            production_batch_id: batchId,
            material_id: productId
          });
          
          if (consumptionResp?.data && consumptionResp.data.length > 0) {
            const consumptionRecord = consumptionResp.data[0];
            individualProductIds = consumptionRecord.individual_product_ids || [];
            console.log('✅ Found individual_product_ids from API:', individualProductIds.length);
          }
        } catch (apiError) {
          console.warn('⚠️ Error fetching from material consumption API:', apiError);
        }
      }
      
      console.log('🔍 Material consumption data for individual products:', {
        materialId: productId,
        materialName: materialConsumptionData.name || materialConsumptionData.material_name,
        individual_product_ids: individualProductIds,
        actualConsumedQuantity,
        rawData: materialConsumptionData
      });
      
      if (individualProductIds.length === 0) {
        console.log('⚠️ No individual products were used for this material in production');
        setAvailableIndividualProducts([]);
        setSelectedIndividualProducts([]);
        return;
      }
      
      console.log('📋 Individual product IDs used in production:', individualProductIds);
      
      // Load only the specific individual products that were used
      // Fetch individual products by IDs using the service
      const fetched = await Promise.all(
        individualProductIds.map((id: string) => IndividualProductService.getIndividualProductById(id))
      );
      const individualProducts = fetched
        .map(r => r.data)
        .filter(Boolean);
      console.log('✅ Loaded individual products that were used in production:', individualProducts.length || 0);
      setAvailableIndividualProducts(individualProducts || []);
      
      // Auto-select individual products based on whole products needed
      // If 2.3 products were consumed, we need 3 whole products, so auto-select all 3
      const wholeProductsNeeded = Math.ceil(actualConsumedQuantity);
      const productsToSelect = individualProducts.slice(0, wholeProductsNeeded);
      
      console.log(`🔄 Auto-selecting ${productsToSelect.length} individual products (${actualConsumedQuantity} consumed, ${wholeProductsNeeded} whole products needed)`);
      setSelectedIndividualProducts(productsToSelect);
    } catch (error) {
      console.error('Error loading individual products for waste:', error);
      setAvailableIndividualProducts([]);
      setSelectedIndividualProducts([]);
    }
  };

  const updateProductionProduct = (updatedProduct: ProductionProduct) => {
    // Local state update only; backend flow integration handled elsewhere
    console.log('Updated production product:', updatedProduct);
    setProductionProduct(updatedProduct);
  };

  const addWasteItem = () => {
    if (!productionProduct || !newWaste.materialId || !newWaste.quantity) return;
    
    if (!newWaste.wasteType || !newWaste.wasteType.trim()) {
      alert('Please select a waste type');
      return;
    }

    // Find the material from recipeMaterials to get material_type
    const selectedMaterial = recipeMaterials.find(m => m.id === newWaste.materialId);
    const materialType = selectedMaterial?.type || selectedMaterial?.isProduct ? 'product' : 'raw_material';

    // For products, if individual products are selected, use those IDs
    let individualProductIds: string[] = [];
    if (materialType === 'product' && selectedIndividualProducts.length > 0) {
      individualProductIds = selectedIndividualProducts.map(p => p.id);
    }

    const waste: WasteItem = {
      materialId: newWaste.materialId,
      materialName: newWaste.materialName,
      materialType: materialType as 'raw_material' | 'product',
      quantity: parseFloat(newWaste.quantity),
      unit: newWaste.unit,
      wasteType: newWaste.wasteType,
      canBeReused: newWaste.canBeReused,
      notes: newWaste.notes,
      individualProductIds: individualProductIds.length > 0 ? individualProductIds : undefined
    };

    const updatedProduct: ProductionProduct = {
      ...productionProduct,
      wasteGenerated: [...(productionProduct.wasteGenerated || []), waste]
    };

    updateProductionProduct(updatedProduct);
    
    // Don't auto-complete the waste step - user must explicitly choose to complete or skip
    
    // Reset form
    setNewWaste({
      materialId: "",
      materialName: "",
      quantity: "",
      unit: "",
      wasteType: "",
      canBeReused: false,
      notes: ""
    });
    setSelectedIndividualProducts([]);
    setAvailableIndividualProducts([]);
    setIsAddingWaste(false);
  };

  const removeWasteItem = (index: number) => {
    if (!productionProduct) return;
    
    const updatedWasteItems = productionProduct.wasteGenerated?.filter((_, i) => i !== index) || [];
    const updatedProduct: ProductionProduct = {
      ...productionProduct,
      wasteGenerated: updatedWasteItems
    };
    
    updateProductionProduct(updatedProduct);
  };

  const completeWasteTracking = async () => {
    if (!productionProduct) return;

    // 1. Deduct consumed materials from inventory (both raw materials and products)
    // This is when materials are actually consumed - mark individual products as consumed
    console.log('🔄 Deducting consumed materials from inventory...');
    if (productionProduct.materialsConsumed && productionProduct.materialsConsumed.length > 0) {
      for (const consumed of productionProduct.materialsConsumed) {
        try {
          // Get the material consumption record for this material
          const { data: consumptionResp } = await MaterialConsumptionService.getMaterialConsumption({
            production_batch_id: productionProduct.id,
            material_id: consumed.materialId
          });
          
          if (consumptionResp?.data && consumptionResp.data.length > 0) {
            const consumptionRecord = consumptionResp.data[0];
            
            // Update the consumption record to trigger actual deduction
            // This will mark individual products as consumed if they exist
            await MaterialConsumptionService.updateMaterialConsumption(consumptionRecord.id, {
              // Trigger actual deduction by updating the record
              // The backend will handle marking individual products as consumed
              notes: `${consumptionRecord.notes || ''}\nActual consumption completed at waste generation step`
            });
            
            // For raw materials, deduct stock manually (same as before)
            const material = rawMaterials.find(m => m.id === consumed.materialId);
            if (material) {
              const newStock = material.currentStock - consumed.quantity;
              await MongoDBRawMaterialService.updateRawMaterial(material.id, {
                current_stock: Math.max(0, newStock)
              });
              console.log(`✅ Deducted ${consumed.quantity} ${consumed.unit} of ${consumed.materialName} (raw material)`);
            } else {
              // For products, the backend will handle deduction when we trigger it
              console.log(`✅ Processing product consumption: ${consumed.materialName}`);
            }
          }
        } catch (error) {
          console.error(`❌ Error deducting material ${consumed.materialName}:`, error);
        }
      }
    }

    // 2. Add waste items to waste management system
    if (productionProduct.wasteGenerated && productionProduct.wasteGenerated.length > 0) {
      console.log('🗑️ Adding waste items to waste management system...');

      for (const waste of productionProduct.wasteGenerated) {
        try {
          // Check if this waste is from consumed materials or additional waste
          const isFromConsumedMaterial = productionProduct.materialsConsumed?.some(
            consumed => consumed.materialId === waste.materialId
          );
          
          // Calculate waste percentage based on consumed material
          const consumedMaterial = productionProduct.materialsConsumed?.find(
            consumed => consumed.materialId === waste.materialId
          );
          const wastePercentage = consumedMaterial && consumedMaterial.quantity > 0
            ? (waste.quantity / consumedMaterial.quantity) * 100
            : 0;

          // 1. Create waste record in ProductionWaste table
          const result = await WasteService.createWaste({
            material_id: waste.materialId,
            material_name: waste.materialName,
            material_type: waste.materialType || 'raw_material', // Include material type
            quantity: waste.quantity,
            unit: waste.unit,
            waste_type: waste.wasteType, // This will be mapped correctly (Scrap/Defective/Excess)
            can_be_reused: waste.canBeReused,
            production_batch_id: productionProduct.id,
            production_product_id: productionProduct.id,
            product_id: productionFlow?.product_id || productionProduct.productId,
            product_name: productionFlow?.product_name || productionProduct.productName,
            waste_category: waste.canBeReused ? 'reusable' : 'disposable', // Set based on can_be_reused
            waste_percentage: wastePercentage,
            generation_date: new Date().toISOString(),
            generation_stage: 'production',
            reason: waste.notes || 'Waste generated during production',
            notes: `${waste.notes || ''} ${isFromConsumedMaterial ? '(From consumed material)' : '(Additional waste - not deducted from inventory)'}`,
            individual_product_ids: waste.individualProductIds || [] // Pass individual product IDs for products
          } as any);
          
          if (result.error) {
            console.error(`❌ Error creating waste item for ${waste.materialName}:`, result.error);
          } else {
            console.log(`✅ Added waste item: ${waste.quantity} ${waste.unit} of ${waste.materialName} (${waste.wasteType})`);
          }

          // 2. Update material consumption record with waste_quantity
          // Find the material consumption record for this material and batch
          try {
            const { data: consumptionResp } = await MaterialConsumptionService.getMaterialConsumption({
              production_batch_id: productionProduct.id,
              material_id: waste.materialId
            });
            
            if (consumptionResp?.data && consumptionResp.data.length > 0) {
              // Update the most recent consumption record with waste quantity
              const consumptionRecord = consumptionResp.data[0];
              
              // Map waste type from ProductionWaste enum to MaterialConsumption enum
              let wasteTypeForConsumption: 'scrap' | 'defective' | 'excess' | 'normal' = 'normal';
              if (waste.wasteType === 'cutting_waste' || waste.wasteType === 'scrap') {
                wasteTypeForConsumption = 'scrap';
              } else if (waste.wasteType === 'defective_products' || waste.wasteType === 'defective') {
                wasteTypeForConsumption = 'defective';
              } else if (waste.wasteType === 'excess_material' || waste.wasteType === 'excess') {
                wasteTypeForConsumption = 'excess';
              }
              
              // Update consumption record with waste details and individual product IDs from waste
              const updateData: any = {
                waste_quantity: waste.quantity,
                waste_type: wasteTypeForConsumption,
                notes: `${consumptionRecord.notes || ''}\nWaste: ${waste.quantity} ${waste.unit} (${waste.wasteType})`
              };
              
              // If waste has individual_product_ids, update the consumption record with them
              // This ensures the backend knows which individual products to mark as consumed
              if (waste.individualProductIds && waste.individualProductIds.length > 0) {
                updateData.individual_product_ids = waste.individualProductIds;
              }
              
              await MaterialConsumptionService.updateMaterialConsumption(consumptionRecord.id, updateData);
              
              console.log(`✅ Updated material consumption record with waste: ${waste.quantity} ${waste.unit}`);
            }
          } catch (updateError) {
            console.error(`⚠️ Could not update material consumption with waste for ${waste.materialName}:`, updateError);
            // Don't fail the whole process if this update fails
          }
        } catch (error) {
          console.error(`❌ Error processing waste item ${waste.materialName}:`, error);
        }
      }
      
      console.log('✅ All waste items added to waste management system');
    }
    
    // 3. Mark waste generation step as completed (persist in MongoDB)
    const existingWasteStep: any = productionSteps.find((s: any) => s.step_type === 'wastage_tracking');
    if (existingWasteStep) {
      try {
        await ProductionService.updateProductionFlowStep(existingWasteStep.id, {
          status: 'completed',
          end_time: new Date().toISOString(),
          notes: `Waste tracking completed with ${(productionProduct?.wasteGenerated || []).length} items.`
        } as any);
      } catch (e) {
        console.error('Error persisting waste step completion:', e);
      }
    } else if (productionFlow?.id) {
      // Create a waste step as completed if it doesn't exist yet
      try {
        const { error: stepError } = await ProductionService.createProductionFlowStep({
          flow_id: productionFlow.id,
          step_name: 'Waste Generation',
          step_type: 'wastage_tracking',
          status: 'completed',
          order_index: (productionSteps?.length || 0) + 1,
          inspector_name: 'Admin',
          notes: `Waste tracking completed with ${(productionProduct?.wasteGenerated || []).length} items.`
        });
        if (stepError) {
          console.error('Error creating waste step:', stepError);
        }
      } catch (e) {
        console.error('Error creating waste step:', e);
      }
    }
    
    // Navigate directly to individual details section (Complete page)
    navigate(`/production/complete/${productId}`);
  };

  const skipWasteGeneration = async () => {
    if (!productionFlow) {
      console.warn('No production flow found; proceeding without step persistence');
    }

    try {
      console.log('Skipping waste generation for flow:', productionFlow?.id);
      
      // 1. Deduct consumed materials from inventory (both raw materials and products)
      // This is when materials are actually consumed - mark individual products as consumed (same as raw materials)
      console.log('🔄 Deducting consumed materials from inventory (wastage step skipped but materials still consumed)...');
      if (productionProduct.materialsConsumed && productionProduct.materialsConsumed.length > 0) {
        for (const consumed of productionProduct.materialsConsumed) {
          try {
            // Get the material consumption record for this material
            const { data: consumptionResp } = await MaterialConsumptionService.getMaterialConsumption({
              production_batch_id: productionProduct.id,
              material_id: consumed.materialId
            });
            
            if (consumptionResp?.data && consumptionResp.data.length > 0) {
              const consumptionRecord = consumptionResp.data[0];
              
              // Update the consumption record - this will trigger marking individual products as consumed
              await MaterialConsumptionService.updateMaterialConsumption(consumptionRecord.id, {
                notes: `${consumptionRecord.notes || ''}\nActual consumption completed at waste generation step (waste skipped)`
              });
              
              // For raw materials, deduct stock manually
              const material = rawMaterials.find(m => m.id === consumed.materialId);
              if (material) {
                const newStock = material.currentStock - consumed.quantity;
                await MongoDBRawMaterialService.updateRawMaterial(material.id, {
                  current_stock: Math.max(0, newStock)
                });
                console.log(`✅ Deducted ${consumed.quantity} ${consumed.unit} of ${consumed.materialName} (raw material)`);
              } else {
                // For products, the backend will handle marking individual products as consumed
                console.log(`✅ Processing product consumption: ${consumed.materialName} - individual products will be marked as consumed`);
              }
            }
          } catch (error) {
            console.error(`❌ Error deducting material ${consumed.materialName}:`, error);
          }
        }
      }
      
      // Note: Material consumption was already recorded at the Plan Material stage
      // Stock deduction happens automatically via the backend
      console.log('✅ Material consumption completed (waste skipped)');
      
      // 2. Handle any additional waste items (even when skipping, user might have added some)
      if (productionProduct.wasteGenerated && productionProduct.wasteGenerated.length > 0) {
        console.log('🗑️ Adding additional waste items to waste management system (skipping mode)...');
        
        for (const waste of productionProduct.wasteGenerated) {
          try {
            // Calculate waste percentage based on consumed material
            const consumedMaterial = productionProduct.materialsConsumed?.find(
              consumed => consumed.materialId === waste.materialId
            );
            const wastePercentage = consumedMaterial && consumedMaterial.quantity > 0
              ? (waste.quantity / consumedMaterial.quantity) * 100
              : 0;

            const result = await WasteService.createWaste({
              material_id: waste.materialId,
              material_name: waste.materialName,
              material_type: waste.materialType || 'raw_material',
              quantity: waste.quantity,
              unit: waste.unit,
              waste_type: waste.wasteType,
              can_be_reused: waste.canBeReused,
              production_batch_id: productionProduct.id,
              production_product_id: productionProduct.id,
              product_id: productionFlow?.product_id || productionProduct.productId,
              product_name: productionFlow?.product_name || productionProduct.productName,
              waste_category: 'production',
              waste_percentage: wastePercentage,
              generation_date: new Date().toISOString(),
              generation_stage: 'production',
              reason: waste.notes || 'Waste generated during production (skipped)',
              notes: `${waste.notes || ''} (Additional waste - not deducted from inventory, waste generation skipped)`,
              individual_product_ids: waste.individualProductIds || [] // Pass individual product IDs for products
            } as any);
            
            if (result.error) {
              console.error(`❌ Error creating waste item for ${waste.materialName}:`, result.error);
            } else {
              console.log(`✅ Added waste item: ${waste.quantity} ${waste.unit} of ${waste.materialName} (${waste.wasteType})`);
            }

            // Update material consumption record with waste_quantity
            try {
              const { data: consumptionResp } = await MaterialConsumptionService.getMaterialConsumption({
                production_batch_id: productionProduct.id,
                material_id: waste.materialId
              });
              
              if (consumptionResp?.data && consumptionResp.data.length > 0) {
                const consumptionRecord = consumptionResp.data[0];
                
                let wasteTypeForConsumption: 'scrap' | 'defective' | 'excess' | 'normal' = 'normal';
                if (waste.wasteType === 'cutting_waste' || waste.wasteType === 'scrap') {
                  wasteTypeForConsumption = 'scrap';
                } else if (waste.wasteType === 'defective_products' || waste.wasteType === 'defective') {
                  wasteTypeForConsumption = 'defective';
                } else if (waste.wasteType === 'excess_material' || waste.wasteType === 'excess') {
                  wasteTypeForConsumption = 'excess';
                }
                
                // Update consumption record with waste details and individual product IDs from waste
                const updateData: any = {
                  waste_quantity: waste.quantity,
                  waste_type: wasteTypeForConsumption,
                  notes: `${consumptionRecord.notes || ''}\nWaste: ${waste.quantity} ${waste.unit} (${waste.wasteType}) - skipped`
                };
                
                // If waste has individual_product_ids, update the consumption record with them
                if (waste.individualProductIds && waste.individualProductIds.length > 0) {
                  updateData.individual_product_ids = waste.individualProductIds;
                }
                
                await MaterialConsumptionService.updateMaterialConsumption(consumptionRecord.id, updateData);
              }
            } catch (updateError) {
              console.error(`⚠️ Could not update material consumption with waste for ${waste.materialName}:`, updateError);
            }
          } catch (error) {
            console.error(`❌ Error processing waste item ${waste.materialName}:`, error);
          }
        }
        
        console.log('✅ Additional waste items added to waste management system');
      }
      
      // Find the waste tracking step (local only)
      let wasteStep = productionSteps.find(step => step.stepType === 'wastage_tracking');
      
      if (wasteStep) {
        // Update the existing waste step to completed (skipped) locally
        const updatedSteps = productionSteps.map(step => 
          step.id === wasteStep.id 
            ? { 
                ...step, 
                status: 'completed' as const, 
                end_time: new Date().toISOString(),
                inspector_name: 'Admin',
                notes: 'Waste generation skipped - no waste was generated during this production process.'
              }
            : step
        );
        setProductionSteps(updatedSteps);
        // Persist to MongoDB
        try {
          await ProductionService.updateProductionFlowStep(wasteStep.id, {
            status: 'completed',
            end_time: new Date().toISOString(),
            notes: 'Waste generation skipped.'
          } as any);
        } catch (e) {
          console.error('Error persisting waste step skip:', e);
        }
        
        console.log('Waste generation step skipped and marked as completed (local)');
      } else {
        // Create a new waste tracking step locally and mark it as completed (skipped)
        const newStep = {
          id: generateUniqueId('STEP'),
          flow_id: productionFlow?.id || generateUniqueId('FLOW'),
          step_name: 'Waste Generation',
          step_type: 'wastage_tracking',
          order_index: productionSteps.length + 1,
          machine_id: null,
          inspector_name: 'Admin',
          notes: 'Waste generation skipped - no waste was generated during this production process.',
          status: 'completed' as const,
          start_time: new Date().toISOString(),
          end_time: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        setProductionSteps([...productionSteps, newStep]);
        console.log('Waste generation step created and marked as skipped (local)');
      }
      
      // Navigate directly to individual details section (Complete page)
      navigate(`/production/complete/${productId}`);
    } catch (error) {
      console.error('Error skipping waste generation:', error);
      // Still navigate to complete page even if there's an error
      navigate(`/production/complete/${productId}`);
    }
  };

  if (!productionProduct) {
    return <div className="p-6">Loading...</div>;
  }

  const totalWasteQuantity = (productionProduct.wasteGenerated || []).reduce((sum, w) => sum + w.quantity, 0);

  // Get inspector name from first machine operation step
  const inspectorName = productionSteps
    .find((step: any) => step.step_type === 'machine_operation' && step.inspector_name)?.inspector_name || '';

  return (
    <div className="flex-1 space-y-6 p-6">
      <Header 
        title={`Waste Generation: ${productionProduct.productName}`}
        subtitle={`Track waste generated during production process${inspectorName ? ` • Inspector: ${inspectorName}` : ''}`}
      />

      {/* Status Alert */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-6 h-6 text-amber-600" />
          <div>
            <h4 className="font-medium text-amber-800">Waste Tracking In Progress</h4>
            <p className="text-sm text-amber-700 mt-1">
              You must either complete waste tracking or skip this step to proceed to individual product creation.
            </p>
          </div>
        </div>
      </div>

      {/* Production Progress Bar */}
      <ProductionProgressBar
        currentStep="wastage_tracking"
        steps={[
          {
            id: "material_selection",
            name: "Material Selection",
            status: "completed",
            stepType: "material_selection"
          },
          {
            id: "machine_operation",
            name: "Machine Operations",
            status: productionSteps?.some((s: any) => s.step_type === 'machine_operation') ? "completed" : "pending",
            stepType: "machine_operation"
          },
          {
            id: "wastage_tracking",
            name: "Waste Generation",
            status: productionSteps?.find((s: any) => s.step_type === 'wastage_tracking')?.status === 'completed' ? "completed" : 
                   productionSteps?.find((s: any) => s.step_type === 'wastage_tracking')?.status === 'in_progress' ? "in_progress" : "pending",
            stepType: "wastage_tracking"
          },
          {
            id: "testing_individual",
            name: "Individual Details",
            status: "pending",
            stepType: "testing_individual"
          }
        ]}
        machineSteps={productionSteps?.filter((s: any) => s.step_type === 'machine_operation') || []}
        className="mb-6"
      />

      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" onClick={() => navigate(`/production/${productId}/dynamic-flow`)}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Production Flow
        </Button>
      </div>

      {/* Production Recipe Materials */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Factory className="w-5 h-5" />
            Materials Used in Production
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recipeMaterials.length > 0 ? (
            <div className="space-y-3">
              {recipeMaterials.map((material) => (
                <div key={material.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{material.name}</span>
                      <Badge variant={material.type === 'product' ? 'default' : 'secondary'}>
                        {material.type === 'product' ? 'Product' : 'Raw Material'}
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-500">
                      Consumed: {material.type === 'product' 
                        ? `${material.quantity} ${material.quantity === 1 ? 'product' : 'products'}`
                        : `${material.quantity} ${material.unit}`
                      } • 
                      Available: {material.type === 'product'
                        ? `${material.currentStock} ${material.currentStock === 1 ? 'product' : 'products'}`
                        : `${material.currentStock} ${material.unit}`
                      } • 
                      Category: {material.category}
                    </div>
                    {material.type === 'product' && material.individual_product_ids && material.individual_product_ids.length > 0 && (
                      <div className="text-xs text-blue-600 mt-1 flex flex-wrap gap-1 items-center">
                        <span>Individual Products:</span>
                        {material.individual_product_ids.slice(0, 3).map((id: string, idx: number) => (
                          <Badge key={idx} variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                            {id}
                          </Badge>
                        ))}
                        {material.individual_product_ids.length > 3 && (
                          <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                            +{material.individual_product_ids.length - 3} more
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">
                      {material.currentStock >= material.quantity ? (
                        <span className="text-green-600">✓ Sufficient Stock</span>
                      ) : (
                        <span className="text-red-600">⚠ Low Stock</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-gray-500">
              <Factory className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <p>No recipe materials found</p>
              <p className="text-sm">Recipe materials will appear here when available</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Waste Generation Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Waste Tracking Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {productionProduct.wasteGenerated?.length || 0}
              </div>
              <div className="text-sm text-gray-500">Waste Items</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {totalWasteQuantity.toFixed(2)}
              </div>
              <div className="text-sm text-gray-500">Total Waste Quantity</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {(productionProduct.wasteGenerated || []).filter(w => w.canBeReused).length}
              </div>
              <div className="text-sm text-gray-500">Reusable Items</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add Waste Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Waste Generation Tracking
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAddingWaste(!isAddingWaste)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Waste Item
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isAddingWaste && (
            <div className="space-y-4 mb-6 p-4 border rounded-lg">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <Info className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-900">Waste Tracking</span>
                </div>
                <p className="text-sm text-blue-700">
                  Track waste generated during production. Shows materials and products that were actually consumed in this production batch (including products used as ingredients in recipes).
                </p>
              </div>
              
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">Select Material/Product *</Label>
                  <div className="space-y-2">
                    {recipeMaterials.length > 0 ? (
                      recipeMaterials.map((material) => (
                        <div
                          key={material.id}
                          className={`border rounded-lg p-3 cursor-pointer transition-all hover:shadow-md ${
                            newWaste.materialId === material.id 
                              ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200' 
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                          onClick={() => handleWasteMaterialSelection(material.id)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-medium text-gray-900">{material.name}</h4>
                                <Badge variant={material.type === 'product' ? 'default' : 'secondary'} className="text-xs">
                                  {material.type === 'product' ? 'Product' : 'Raw Material'}
                                </Badge>
                              </div>
                              <div className="text-sm text-gray-600 space-y-1">
                                <div className="flex items-center gap-4">
                                  <span>Consumed: <span className="font-medium">
                                    {material.type === 'product' 
                                      ? `${material.quantity} ${material.quantity === 1 ? 'product' : 'products'}`
                                      : `${material.quantity} ${material.unit}`
                                    }
                                  </span></span>
                                  <span>Available: <span className={`font-medium ${
                                    material.currentStock >= material.quantity ? 'text-green-600' : 'text-red-600'
                                  }`}>
                                    {material.type === 'product'
                                      ? `${material.currentStock} ${material.currentStock === 1 ? 'product' : 'products'}`
                                      : `${material.currentStock} ${material.unit}`
                                    }
                                  </span></span>
                                </div>
                                {material.type === 'product' && material.individual_product_ids && material.individual_product_ids.length > 0 && (
                                  <div className="text-xs text-blue-600 flex flex-wrap gap-1 items-center">
                                    <span>Individual Products:</span>
                                    {material.individual_product_ids.slice(0, 3).map((id: string, idx: number) => (
                                      <Badge key={idx} variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                                        {id}
                                      </Badge>
                                    ))}
                                    {material.individual_product_ids.length > 3 && (
                                      <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                                        +{material.individual_product_ids.length - 3} more
                                      </Badge>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="ml-3">
                              <div className={`w-4 h-4 rounded-full border-2 ${
                                newWaste.materialId === material.id 
                                  ? 'border-blue-500 bg-blue-500' 
                                  : 'border-gray-300'
                              }`}>
                                {newWaste.materialId === material.id && (
                                  <div className="w-2 h-2 bg-white rounded-full m-0.5"></div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                        <p>No materials available for waste tracking</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Individual Products Used in Production */}
              {newWaste.materialId && recipeMaterials.find(m => m.id === newWaste.materialId)?.type === 'product' && (
                <div className="mt-4">
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">Individual Products Used in Production</Label>
                  
                  {availableIndividualProducts.length > 0 ? (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <div className="text-sm text-green-800 mb-2">
                        {availableIndividualProducts.length} individual product(s) available for waste tracking:
                      </div>
                      <div className="space-y-2">
                        {availableIndividualProducts.map((product) => (
                          <div key={product.id} className="flex items-center justify-between bg-white rounded p-2 border">
                            <div className="flex-1">
                              <div className="text-sm font-medium text-gray-900">ID: {product.id}</div>
                              <div className="text-xs text-gray-600">
                                Weight: {product.finalWeight || 'N/A'}g • 
                                Width: {product.finalWidth || 'N/A'}cm • Length: {product.finalLength || 'N/A'}cm
                              </div>
                            </div>
                            <div className="ml-3">
                              <input
                                type="checkbox"
                                checked={selectedIndividualProducts.some(p => p.id === product.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedIndividualProducts(prev => [...prev, product]);
                                  } else {
                                    setSelectedIndividualProducts(prev => prev.filter(p => p.id !== product.id));
                                  }
                                }}
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                      {selectedIndividualProducts.length > 0 && (
                        <div className="mt-2 text-xs text-green-700">
                          {selectedIndividualProducts.length} product(s) selected for waste tracking
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                      <div className="text-sm text-yellow-800">
                        No individual products were used for this material in production
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Waste Quantity *</Label>
                  <Input
                    type="text"
                    value={newWaste.quantity}
                    onChange={(e) => {
                      // Allow only numbers, decimals, and leading zeros
                      const value = e.target.value;
                      if (value === '' || /^\d*\.?\d*$/.test(value)) {
                        setNewWaste({...newWaste, quantity: value});
                      }
                    }}
                    placeholder="0"
                    required
                  />
                  {newWaste.materialId && recipeMaterials.find(m => m.id === newWaste.materialId)?.type === 'product' && (
                    <p className="text-xs text-blue-600 mt-1">
                      {(() => {
                        const material = recipeMaterials.find(m => m.id === newWaste.materialId);
                        if (material) {
                          const consumed = material.quantity || 0;
                          const wholeNeeded = Math.ceil(consumed);
                          const wastage = wholeNeeded > consumed ? (wholeNeeded - consumed).toFixed(4) : '0';
                          return `Consumed: ${consumed} product(s) • Whole products needed: ${wholeNeeded} • Auto-calculated wastage: ${wastage} product(s)`;
                        }
                        return 'For products: Individual products auto-selected based on consumption';
                      })()}
                    </p>
                  )}
                </div>
                <div>
                  <Label>Unit</Label>
                  <Input
                    value={newWaste.unit}
                    onChange={(e) => setNewWaste({...newWaste, unit: e.target.value})}
                    placeholder="Auto-filled from selection"
                    readOnly
                  />
                </div>
                <div>
                  <Label>Waste Type</Label>
                  <Select
                    value={newWaste.wasteType}
                    onValueChange={(value) => setNewWaste({ ...newWaste, wasteType: value as any })}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select waste type" />
                    </SelectTrigger>
                    <SelectContent>
                      {wasteTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type.charAt(0).toUpperCase() + type.slice(1).replace(/_/g, ' ')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="canBeReused"
                  checked={newWaste.canBeReused}
                  onChange={(e) => setNewWaste({...newWaste, canBeReused: e.target.checked})}
                />
                <Label htmlFor="canBeReused">Can be reused/recycled</Label>
              </div>
              
              <div>
                <Label>Notes</Label>
                <Textarea
                  value={newWaste.notes}
                  onChange={(e) => setNewWaste({...newWaste, notes: e.target.value})}
                  placeholder="Waste description and handling notes"
                />
              </div>
              
              <div className="flex gap-2">
                <Button onClick={addWasteItem} className="bg-orange-600 hover:bg-orange-700">
                  <Save className="w-4 h-4 mr-2" />
                  Add Waste Item
                </Button>
                <Button variant="outline" onClick={() => setIsAddingWaste(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Existing Waste Items */}
          <div className="space-y-2">
            <h4 className="font-medium flex items-center gap-2">
              Recorded Waste Items
              {productionProduct.wasteGenerated && productionProduct.wasteGenerated.length > 0 && (
                <Badge variant="outline" className="text-xs">
                  {productionProduct.wasteGenerated.length} items
                </Badge>
              )}
            </h4>
            
            {productionProduct.wasteGenerated?.map((waste, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                <div className="flex-1">
                  <div className="font-medium">{waste.materialName}</div>
                  <div className="text-sm text-gray-500">
                    {waste.materialType === 'product'
                      ? `${waste.quantity} ${waste.quantity === 1 ? 'product' : 'products'}`
                      : `${waste.quantity} ${waste.unit}`
                    } • {waste.wasteType} • {waste.canBeReused ? "Reusable" : "Non-reusable"}
                  </div>
                  {waste.individualProductIds && waste.individualProductIds.length > 0 && (
                    <div className="text-xs text-blue-600 mt-1 flex flex-wrap gap-1">
                      <span className="font-medium">Individual Products:</span>
                      {waste.individualProductIds.slice(0, 5).map((id: string, idx: number) => (
                        <Badge key={idx} variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                          {id}
                        </Badge>
                      ))}
                      {waste.individualProductIds.length > 5 && (
                        <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                          +{waste.individualProductIds.length - 5} more
                        </Badge>
                      )}
                    </div>
                  )}
                  {waste.notes && <div className="text-sm text-gray-600 mt-1">{waste.notes}</div>}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={waste.canBeReused ? "default" : "destructive"}>
                    {waste.wasteType}
                  </Badge>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => removeWasteItem(index)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
            
            {(!productionProduct.wasteGenerated || productionProduct.wasteGenerated.length === 0) && (
              <div className="text-center py-8 text-gray-500">
                <AlertTriangle className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>No waste items recorded yet</p>
                <p className="text-sm">Click "Add Waste Item" to start tracking waste</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Complete Waste Tracking */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">

            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">Complete Waste Tracking</h3>
                <p className="text-sm text-gray-600">
                  Once you've recorded all waste items, proceed to the next step in production
                </p>
              </div>
              <Button 
                onClick={completeWasteTracking}
                className="bg-green-600 hover:bg-green-700"
              >
                <Factory className="w-4 h-4 mr-2" />
                Complete & Continue
              </Button>
            </div>
            
            {/* Skip Option */}
            <div className="border-t pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-orange-700">No Waste Generated</h4>
                  <p className="text-sm text-gray-600">
                    If no waste was generated during this production process, you can skip this step
                  </p>
                </div>
                <Button 
                  onClick={skipWasteGeneration}
                  variant="outline"
                  className="border-orange-200 text-orange-700 hover:bg-orange-50"
                >
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Skip Waste Generation
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}

