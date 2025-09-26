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
  ArrowLeft, Package, Factory, Plus, Trash2, Save,
  Truck, AlertTriangle, FileSpreadsheet, CheckCircle, Info, Search,
  XCircle, X, Settings, User
  } from "lucide-react";
  import { generateUniqueId } from "@/lib/storageUtils";
import { ProductService } from "@/services/ProductService";
import { ProductRecipeService } from "@/services/productRecipeService";
import { RawMaterialService } from "@/services/rawMaterialService";
import { MachineService, Machine } from "@/services/machineService";
import { ProductionFlowService } from "@/services/productionFlowService";
import { supabase } from "@/lib/supabase";
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
  cost: number;
  consumedAt: string;
}

interface WasteItem {
  materialId: string;
  materialName: string;
  quantity: number;
  unit: string;
  wasteType: "scrap" | "defective" | "excess";
  canBeReused: boolean;
  notes: string;
}

interface ExpectedProduct {
  name: string;
  category: string;
  height: string;
  width: string;
  weight: string;
  thickness: string;
  materialComposition: string;
  qualityGrade: string;
}

interface ProductionProduct {
  id: string;
  productId: string;
  productName: string;
  category: string;
  color: string;
  height: string;
  width: string;
  pattern: string;
  targetQuantity: number;
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
  brand?: string;
  category: string;
  current_stock: number;
  unit: string;
  cost_per_unit: number;
  supplier_name?: string;
  status: "in-stock" | "low-stock" | "out-of-stock" | "overstock" | "in-transit";
  batch_number?: string;
}

export default function ProductionDetail() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const [productionProduct, setProductionProduct] = useState<ProductionProduct | null>(null);
  const [isAddingMaterial, setIsAddingMaterial] = useState(false);
  const [isEditingExpected, setIsEditingExpected] = useState(false);
  const [isMaterialSelectionOpen, setIsMaterialSelectionOpen] = useState(false);
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
  const [materialSearchTerm, setMaterialSearchTerm] = useState("");
  const [selectedMaterials, setSelectedMaterials] = useState<Array<RawMaterial & { selectedQuantity: number }>>([]);
  const [notifications, setNotifications] = useState<Array<{id: string, type: 'success' | 'warning' | 'error', title: string, message: string, timestamp: Date}>>([]);
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
    description: ""
  });
  
  // Material consumption form
  const [newMaterial, setNewMaterial] = useState({
    materialId: "",
    materialName: "",
    quantity: "",
    unit: "",
    cost: ""
  });


  // Expected product form
  const [expectedProduct, setExpectedProduct] = useState<ExpectedProduct>({
    name: "",
    category: "",
    height: "",
    width: "",
    weight: "",
    thickness: "",
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
            const product: ProductionProduct = {
              id: productId,
              productId: actualProduct.id,
              productName: actualProduct.name,
              category: actualProduct.category,
              color: actualProduct.color || 'NA',
              height: actualProduct.height || 'AN',
              width: actualProduct.width || 'NA',
              pattern: actualProduct.pattern || 'NA',
              targetQuantity: 1,
              priority: "normal",
              status: "planning",
              expectedCompletion: new Date().toISOString(),
              createdAt: new Date().toISOString(),
              materialsConsumed: [],
              wasteGenerated: [],
              expectedProduct: {
                name: actualProduct.name,
                category: actualProduct.category,
                height: actualProduct.height || '8 ft',
                width: actualProduct.width || '10 ft',
                weight: actualProduct.weight || '45 kg',
                thickness: actualProduct.thickness || '12 mm',
                materialComposition: actualProduct.materialComposition || '',
                qualityGrade: "A+"
              },
              notes: ""
            };
            setProductionProduct(product);
            
            // Auto-fill expected product details from actual product data
            setExpectedProduct({
              name: actualProduct.name,
              category: actualProduct.category,
              height: actualProduct.height || '8 ft',
              width: actualProduct.width || '10 ft',
              weight: actualProduct.weight || '45 kg',
              thickness: actualProduct.thickness || '12 mm',
              materialComposition: actualProduct.materialComposition || '',
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
              height: "N/A",
              width: "N/A",
              pattern: "N/A",
              targetQuantity: 1,
              priority: "normal",
              status: "planning",
              expectedCompletion: new Date().toISOString(),
              createdAt: new Date().toISOString(),
              materialsConsumed: [],
              wasteGenerated: [],
              expectedProduct: {
                name: "Product Not Found",
                category: "Unknown",
                height: "",
                width: "",
                weight: "",
                thickness: "",
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
        const { data: materials, error } = await RawMaterialService.getRawMaterials();
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
    
    loadRawMaterials().then(() => {
      // Load recipe after raw materials are loaded so stock quantities are available
      if (productId) {
        const actualProductId = productId;
        loadProductRecipe(actualProductId);
      }
    });

    // Load machines from Supabase
    const loadMachines = async () => {
      try {
        const machinesData = await MachineService.getMachines();
        setMachines(machinesData);
        console.log('✅ Loaded', machinesData.length, 'machines from Supabase:', machinesData);
      } catch (error) {
        console.error('Error loading machines:', error);
        // Fallback to empty array if loading fails
        setMachines([]);
        // For debugging - add some test machines
        console.log('Setting fallback machines for debugging');
        setMachines([
          { id: 'MACHINE_001', name: 'BR3C-Cutter', description: 'Test machine' },
          { id: 'MACHINE_002', name: 'Needle Punching Machine', description: 'Test machine 2' }
        ]);
      }
    };
    
    loadMachines();
    
    // Production flow functionality removed
  }, [productId, navigate]);

  // Load product recipe
  const loadProductRecipe = async (productId: string) => {
    try {
      const recipeResponse = await ProductRecipeService.getRecipeByProductId(productId);
      if (recipeResponse && recipeResponse.data) {
        const recipe = recipeResponse.data;
        setProductRecipe(recipe);
        console.log('Product recipe loaded:', recipe);

        // Auto-populate materials from recipe if available
        if (recipe.recipe_materials && recipe.recipe_materials.length > 0) {
          // Get current raw materials - either from state or fetch fresh
          let currentRawMaterials = rawMaterials;
          if (currentRawMaterials.length === 0) {
            try {
              const { data: materials } = await RawMaterialService.getRawMaterials();
              currentRawMaterials = materials || [];
              console.log('Fetched raw materials for recipe loading:', currentRawMaterials.length);
            } catch (error) {
              console.error('Error fetching raw materials for recipe:', error);
            }
          }

          const recipeMaterials = recipe.recipe_materials.map((material: any) => {
            const rawMaterial = currentRawMaterials.find(rm => rm.id === material.material_id);

            return {
              id: material.material_id,
              name: material.material_name,
              brand: rawMaterial?.brand || material.brand || '',
              category: rawMaterial?.category || material.category || '',
              current_stock: rawMaterial?.current_stock || 0,
              unit: material.unit,
              cost_per_unit: rawMaterial?.cost_per_unit || material.cost_per_unit || 0,
              supplier_name: rawMaterial?.supplier_name || material.supplier_name || "From Recipe",
              status: rawMaterial?.status || 'in-stock',
              batch_number: rawMaterial?.batch_number || material.batch_number || '',
              selectedQuantity: material.quantity || 1
            };
          });

          setSelectedMaterials(recipeMaterials);
          setMaterialsFromRecipe(true);

          showNotification(
            "📋 Recipe Loaded",
            `Loaded recipe with ${recipe.recipe_materials.length} materials`,
            'success'
          );
        }
      } else {
        console.log('No recipe found for product:', productId);
      }
    } catch (error) {
      console.error('Error loading product recipe:', error);
    }
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
        unit: selectedMaterial.unit,
        cost: selectedMaterial.cost_per_unit.toString()
      });
    }
  };

  // Handle material selection from popup
  const handleMaterialSelectionFromPopup = (material: RawMaterial) => {
    setNewMaterial({
      materialId: material.id,
      materialName: material.name,
      quantity: "",
      unit: material.unit,
      cost: material.cost_per_unit.toString()
    });
    setIsMaterialSelectionOpen(false);
  };

  // Add material to selection with quantity
  const addMaterialToSelection = (material: RawMaterial, quantity: number) => {
    const existingIndex = selectedMaterials.findIndex(m => m.id === material.id);
    if (existingIndex >= 0) {
      // Update existing material quantity
      const updated = [...selectedMaterials];
      updated[existingIndex].selectedQuantity = quantity;
      setSelectedMaterials(updated);
    } else {
      // Add new material
      setSelectedMaterials([...selectedMaterials, { ...material, selectedQuantity: quantity }]);
    }
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

      // Calculate total cost
      const totalCost = productionProduct.materialsConsumed.reduce((sum, material) =>
        sum + (material.quantity * material.cost), 0
      );

      // Check if recipe already exists for this product
      console.log('Checking for existing recipe for product_id:', productionProduct.productId);
      const { data: existingRecipe, error: existingRecipeError } = await supabase
        .from('product_recipes')
        .select('id')
        .eq('product_id', productionProduct.productId)
        .single();

      console.log('Existing recipe check result:', { existingRecipe, existingRecipeError });

      // Handle 406 Not Acceptable or other RLS errors by treating as no existing recipe
      if (existingRecipeError && existingRecipeError.code !== 'PGRST116') {
        console.warn('Error checking existing recipe (treating as new):', existingRecipeError);
      }

      let recipeId: string;

      if (existingRecipe && !existingRecipeError) {
        // Update existing recipe
        recipeId = existingRecipe.id;
        await supabase
          .from('product_recipes')
          .update({
            product_name: productionProduct.productName,
            total_cost: totalCost,
            updated_at: new Date().toISOString()
          })
          .eq('id', recipeId);

        // Delete existing recipe materials for this specific recipe only
        console.log('Deleting existing recipe materials for recipe_id:', recipeId);
        const { data: deletedMaterials, error: deleteError } = await supabase
          .from('recipe_materials')
          .delete()
          .eq('recipe_id', recipeId)
          .select();

        if (deleteError) {
          console.error('Error deleting recipe materials:', deleteError);
        } else {
          console.log('Deleted recipe materials:', deletedMaterials);
        }
      } else {
        // Create new recipe with custom ID
        recipeId = `RECIPE_${Date.now()}`;
        console.log('Creating new recipe with ID:', recipeId, 'for product_id:', productionProduct.productId);
        const { data: newRecipe, error: recipeError } = await supabase
          .from('product_recipes')
          .insert({
            id: recipeId,
            product_id: productionProduct.productId,
            product_name: productionProduct.productName,
            total_cost: totalCost,
            created_by: 'Production Team'
          })
          .select('id')
          .single();

        if (recipeError) {
          console.error('Error creating recipe:', recipeError);
          console.error('Recipe error details:', recipeError);
          return;
        }
        console.log('✅ Recipe created with ID:', recipeId);
      }

      // Insert recipe materials with custom IDs (include quantity for recipe loading)
      const recipeMaterials = productionProduct.materialsConsumed.map((material, index) => ({
        id: `RECIPE_MAT_${Date.now()}_${index}`,
        recipe_id: recipeId,
        material_id: material.materialId,
        material_name: material.materialName,
        quantity: material.quantity,
        unit: material.unit,
        cost_per_unit: material.cost / material.quantity,
        total_cost: material.cost
      }));

      console.log('Attempting to save recipe materials for recipe_id:', recipeId);
      console.log('Recipe materials data:', recipeMaterials);

      const { data: recipeMaterialsData, error: materialsError } = await supabase
        .from('recipe_materials')
        .insert(recipeMaterials)
        .select();

      if (materialsError) {
        console.error('❌ Error saving recipe materials:', materialsError);
        console.error('Recipe materials data that failed:', recipeMaterials);
        
        // Show user-friendly error message
        showNotification(
          "Recipe Error", 
          `Failed to save product recipe: ${materialsError.message}`, 
          "error"
        );
      } else {
        console.log('✅ Product recipe saved to database:', recipeMaterialsData);
        // Success notification will be shown after all operations complete
      }
    } catch (error) {
      console.error('Error saving product recipe:', error);
      showNotification(
        "Recipe Error", 
        "Failed to save product recipe. Please try again.", 
        "error"
      );
    }
  };

  // Update production product function
  const updateProductionProduct = async (updatedProduct: ProductionProduct) => {
    try {
      // Save material consumption to Supabase
      if (updatedProduct.materialsConsumed && updatedProduct.materialsConsumed.length > 0) {
        // Use the batch ID from production flow if available, otherwise use product ID
        const batchId = productionFlow?.production_product_id || updatedProduct.id;
        
        // First, clear existing material consumption for this batch/product
        await supabase
          .from('material_consumption')
          .delete()
          .eq('production_product_id', batchId);

        // Then insert updated material consumption with custom IDs
        const materialConsumptionData = updatedProduct.materialsConsumed.map((material, index) => ({
          id: `MAT_CONSUME_${Date.now()}_${index}`,
          production_product_id: batchId, // Use batch ID instead of product ID
          material_id: material.materialId,
          material_name: material.materialName,
          quantity_used: material.quantity,
          unit: material.unit,
          cost_per_unit: material.cost / material.quantity,
          total_cost: material.cost,
          consumed_at: material.consumedAt,
          created_at: new Date().toISOString(),
        }));

        console.log('Attempting to save material consumption:', materialConsumptionData);

        const { data: materialData, error: materialError } = await supabase
          .from('material_consumption')
          .insert(materialConsumptionData)
          .select();

        if (materialError) {
          console.error('❌ Error saving material consumption:', materialError);
          console.error('Data that failed to insert:', materialConsumptionData);
          
          // Show user-friendly error message
          showNotification(
            "Database Error", 
            `Failed to save material consumption: ${materialError.message}`, 
            "error"
          );
        } else {
          console.log('✅ Material consumption saved to database:', materialData);
          // Success notification will be shown after all operations complete
        }

        // Also save as recipe for future reference
        await saveProductRecipe(updatedProduct);
      }

      // Update local state
      setProductionProduct(updatedProduct);
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

    showNotification(
      `🗑️ Material Removed`,
      `Material removed from production.`,
      'success'
    );
  };

  // Update product materials in Supabase (TODO: Implement when product service is ready)
  const updateProductMaterialsInStorage = (productId: string, materials: Array<RawMaterial & { selectedQuantity: number }>) => {
    // TODO: Update product materials in Supabase
    console.log('Updating product materials for:', productId, materials);
  };

  // Show notification
  const showNotification = (title: string, message: string, type: 'success' | 'warning' | 'error') => {
    const notification = {
      id: `notification-${Date.now()}`,
      type,
      title,
      message,
      timestamp: new Date()
    };
    
    setNotifications(prev => [...(prev || []), notification]);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
      setNotifications(prev => (prev || []).filter(n => n.id !== notification.id));
    }, 5000);
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

  // Add all selected materials to production
  const addSelectedMaterialsToProduction = async () => {
    if (!productionProduct) return;

    // Filter out materials with insufficient stock
    const availableMaterials = selectedMaterials.filter(material => 
      material.current_stock >= material.selectedQuantity
    );

    const unavailableMaterials = selectedMaterials.filter(material => 
      material.current_stock < material.selectedQuantity
    );

    // Show warning if some materials are unavailable
    if (unavailableMaterials.length > 0) {
      showNotification(
        `⚠️ ${unavailableMaterials.length} Material${unavailableMaterials.length > 1 ? 's' : ''} Not Added`,
        `Materials with insufficient stock were not added. Use the "Notify" button to request restocking.`,
        'warning'
      );
    }

    // Only add materials with sufficient stock
    if (availableMaterials.length === 0) {
      showNotification(
        `❌ No Materials Added`,
        `All selected materials have insufficient stock. Please notify for restocking or adjust quantities.`,
        'error'
      );
      return;
    }

    const newMaterials: MaterialConsumption[] = availableMaterials.map(material => ({
      materialId: material.id,
      materialName: material.name,
      quantity: material.selectedQuantity,
      unit: material.unit,
      cost: material.cost_per_unit * material.selectedQuantity,
      consumedAt: new Date().toISOString()
    }));

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
          quantity: combinedMaterials[existingIndex].quantity + newMaterial.quantity,
          cost: combinedMaterials[existingIndex].cost + newMaterial.cost
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
    
    // Note: Material inventory will be deducted only after waste generation step
    // This allows for proper waste tracking and management
    
    // Material tracking simplified - focus on machine operations
    
    // Production flow functionality removed
    
    // Show single comprehensive success notification
    showNotification(
      "✅ Materials Added",
      `${availableMaterials.length} material${availableMaterials.length > 1 ? 's' : ''} successfully added to production`,
      'success'
    );
    
    setSelectedMaterials([]);
    setIsMaterialSelectionOpen(false);
  };

  // Update raw material inventory (deduct consumed quantities)
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
        await RawMaterialService.updateRawMaterial(material.id, {
          current_stock: material.current_stock
        });
      } catch (error) {
        console.error(`Error updating material ${material.name}:`, error);
      }
    }
    setRawMaterials(updatedMaterials);
  };

  // Get filtered materials for search
  const getFilteredMaterials = () => {
    return rawMaterials.filter(material => 
      material.name.toLowerCase().includes(materialSearchTerm.toLowerCase()) ||
      material.category.toLowerCase().includes(materialSearchTerm.toLowerCase())
    );
  };

  // Machine management functions
  const addNewMachine = async () => {
    if (!newMachineForm.name.trim()) {
      showNotification("Error", "Machine name is required", "error");
      return;
    }

    try {
      const newMachine = await MachineService.createMachine({
      name: newMachineForm.name,
      description: newMachineForm.description || ""
      });

      // Update local state
      setMachines(prev => [...prev, newMachine]);

    // Reset form
      setNewMachineForm({ name: "", description: "" });
    setShowAddMachinePopup(false);
    
    showNotification("Success", `Machine "${newMachine.name}" added successfully`, "success");
    } catch (error) {
      console.error('Error adding machine:', error);
      showNotification("Error", "Failed to add machine. Please try again.", "error");
    }
  };

  const handleMachineSelection = () => {
    if (!selectedMachineId || !inspectorName.trim()) {
      showNotification("Error", "Please select a machine and enter inspector name", "error");
      return;
    }

    const selectedMachine = machines.find(m => m.id === selectedMachineId);
    if (!selectedMachine) {
      showNotification("Error", "Selected machine not found", "error");
      return;
    }

    // Add machine step to production flow
    addMachineStepToFlow(selectedMachine, inspectorName);
    
    // Update production status from "planning" to "active" when machine is added
    if (productionProduct && productionProduct.status === "planning") {
      const updatedProduct: ProductionProduct = {
        ...productionProduct,
        status: "active"
      };
      updateProductionProduct(updatedProduct);
      
      showNotification(
        "✅ Production Started",
        "Production status updated to Active. Machine operation has been added to the flow.",
        "success"
      );
    }

    // Reset form
    setSelectedMachineId("");
    setInspectorName("");
    setShowMachineSelectionPopup(false);
  };

  const addMachineStepToFlow = async (machine: any, inspector: string) => {
    if (!productionProduct) return;

    try {
      console.log('Adding machine step to flow:', machine, inspector);
      console.log('Production product ID:', productionProduct.id);

      let flow = productionFlow; // Use existing flow if available
      
      // Only create a new production flow if one doesn't exist
      if (!flow) {
        // Generate unique production batch ID to avoid reusing completed flows
        const productionBatchId = `PRO-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        console.log('Creating new production flow with batch ID:', productionBatchId);
        
        // Create new production flow
        flow = await ProductionFlowService.createProductionFlow({
          production_product_id: productionBatchId, // Use unique batch ID instead of product ID
          flow_name: `${productionProduct.productName} Production Flow - Batch ${productionBatchId}`
        });
        
        // Store the flow in state for navigation
        setProductionFlow(flow);
        console.log('✅ New production flow created and stored in state');
      } else {
        console.log('✅ Using existing production flow:', flow.id);
      }

      // Update any existing material consumption records to use the batch ID
      if (productionProduct.materialsConsumed && productionProduct.materialsConsumed.length > 0) {
        console.log('Updating material consumption records to use batch ID:', flow.production_product_id);
        
        // Update existing material consumption records to use batch ID
        const { error: updateError } = await supabase
          .from('material_consumption')
          .update({ production_product_id: flow.production_product_id })
          .eq('production_product_id', productionProduct.id);
        
        if (updateError) {
          console.error('Error updating material consumption records:', updateError);
        } else {
          console.log('✅ Updated material consumption records to use batch ID');
        }
      }

      // Add machine step to flow
      const newStep = await ProductionFlowService.addStepToFlow({
        flow_id: flow.id,
        step_name: `${machine.name} Operation`,
        step_type: 'machine_operation',
        order_index: 1, // You can make this dynamic based on existing steps
        machine_id: machine.id,
        inspector_name: inspector,
        notes: `Machine operation performed by ${inspector}`
      });

      console.log('✅ Machine step added successfully:', newStep);
      showNotification("Success", `Machine step "${machine.name}" added to production flow`, "success");

      // Navigate to dynamic flow page after successfully adding machine
      if (flow && flow.production_product_id) {
        navigate(`/production/${flow.production_product_id}/dynamic-flow`);
      }
    } catch (error) {
      console.error('Error adding machine step to flow:', error);
      showNotification("Error", "Failed to add machine step to flow", "error");
    }
  };

  const skipToWasteGeneration = async () => {
    if (!productionProduct) return;

    try {
      console.log('Skipping machine operations and going to waste generation');

      let flow = productionFlow; // Use existing flow if available
      
      // Only create a new production flow if one doesn't exist
      if (!flow) {
        // Generate unique production batch ID to avoid reusing completed flows
        const productionBatchId = `PRO-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        console.log('Creating new production flow with batch ID:', productionBatchId);
        
        // Create new production flow
        flow = await ProductionFlowService.createProductionFlow({
          production_product_id: productionBatchId, // Use unique batch ID instead of product ID
          flow_name: `${productionProduct.productName} Production Flow - Batch ${productionBatchId}`
        });
        
        // Store the flow in state for navigation
        setProductionFlow(flow);
        console.log('✅ New production flow created and stored in state');
      } else {
        console.log('✅ Using existing production flow:', flow.id);
      }

      // Update any existing material consumption records to use the batch ID
      if (productionProduct.materialsConsumed && productionProduct.materialsConsumed.length > 0) {
        console.log('Updating material consumption records to use batch ID:', flow.production_product_id);
        
        // Update existing material consumption records to use batch ID
        const { error: updateError } = await supabase
          .from('material_consumption')
          .update({ production_product_id: flow.production_product_id })
          .eq('production_product_id', productionProduct.id);
        
        if (updateError) {
          console.error('Error updating material consumption records:', updateError);
        } else {
          console.log('✅ Updated material consumption records to use batch ID');
        }
      }

      // Create a completed machine step to represent skipped machine operations
      const skippedStep = await ProductionFlowService.addStepToFlow({
        flow_id: flow.id,
        step_name: 'N/A',
        step_type: 'machine_operation',
        order_index: 1,
        machine_id: null, // No specific machine since it was skipped
        inspector_name: 'System',
        notes: 'Machine operations were skipped - went directly to waste generation'
      });

      // Mark the step as completed since it was skipped
      if (skippedStep) {
        await ProductionFlowService.completeFlowStep(skippedStep.id, 'Machine operations skipped by user');
        console.log('✅ Skipped machine step marked as completed:', skippedStep);
      }

      showNotification("Success", "Machine operations skipped and marked as completed", "success");

      // Navigate to waste generation page after successfully skipping
      if (flow && flow.production_product_id) {
        navigate(`/production/${flow.production_product_id}/waste-generation`);
      }
    } catch (error) {
      console.error('Error creating skipped machine step:', error);
      showNotification("Warning", "Skipped to waste generation but couldn't update flow status", "warning");
    }
    setShowMachineSelectionPopup(false);
  };

  const addMaterialConsumption = async () => {
    if (!productionProduct || !newMaterial.materialId || !newMaterial.quantity) return;

    const material: MaterialConsumption = {
      materialId: newMaterial.materialId,
      materialName: newMaterial.materialName,
      quantity: parseFloat(newMaterial.quantity),
      unit: newMaterial.unit,
      cost: parseFloat(newMaterial.cost) || 0,
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
        quantity: combinedMaterials[existingIndex].quantity + material.quantity,
        cost: combinedMaterials[existingIndex].cost + material.cost
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
      unit: "",
      cost: ""
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
      showNotification(
        "⚠️ Materials Required", 
        "Please add at least one material before proceeding to individual product details.", 
        "error"
      );
            return;
          }
    
    
    // Navigate to individual product details page without changing status
    // Status will be changed to "completed" only when individual products are finalized
    // Use the production batch ID from the flow, not the product ID
    if (productionFlow && productionFlow.production_product_id) {
      navigate(`/production/complete/${productionFlow.production_product_id}`);
    } else {
      console.error('No production flow found to navigate to complete page');
    }
  };

  if (!productionProduct) {
    return <Loading message="Loading production details..." />;
  }


    return (
    <div className="flex-1 space-y-6 p-6">
      {/* Notifications */}
      {notifications && notifications.length > 0 && (
        <div className="fixed top-4 right-4 z-50 space-y-2">
          {notifications.map(notification => (
            <div
              key={notification.id}
              className={`max-w-sm p-4 rounded-lg shadow-lg border-l-4 ${
                notification.type === 'success' ? 'bg-green-50 border-green-400' :
                notification.type === 'warning' ? 'bg-yellow-50 border-yellow-400' :
                'bg-red-50 border-red-400'
              }`}
            >
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  {notification.type === 'success' && <CheckCircle className="w-5 h-5 text-green-400" />}
                  {notification.type === 'warning' && <AlertTriangle className="w-5 h-5 text-yellow-400" />}
                  {notification.type === 'error' && <XCircle className="w-5 h-5 text-red-400" />}
                    </div>
                <div className="ml-3 flex-1">
                  <h4 className={`text-sm font-medium ${
                    notification.type === 'success' ? 'text-green-800' :
                    notification.type === 'warning' ? 'text-yellow-800' :
                    'text-red-800'
                  }`}>
                    {notification.title}
                  </h4>
                  <p className={`text-sm mt-1 whitespace-pre-line ${
                    notification.type === 'success' ? 'text-green-700' :
                    notification.type === 'warning' ? 'text-yellow-700' :
                    'text-red-700'
                  }`}>
                    {notification.message}
                  </p>
                </div>
                <button
                  onClick={() => setNotifications(prev => prev.filter(n => n.id !== notification.id))}
                  className="ml-2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
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
              // Navigate to dynamic production flow page
              // Use the batch ID from the production flow, not the product ID
              if (productionFlow && productionFlow.production_product_id) {
                navigate(`/production/${productionFlow.production_product_id}/dynamic-flow`);
              } else {
                console.error('No production flow found to navigate to dynamic flow');
              }
              break;
            case 'wastage_tracking':
              // Navigate to waste generation page
              // Use the batch ID from the production flow, not the product ID
              if (productionFlow && productionFlow.production_product_id) {
                navigate(`/production/${productionFlow.production_product_id}/waste-generation`);
              } else {
                console.error('No production flow found to navigate to waste generation');
              }
              break;
            case 'testing_individual':
              // Navigate to complete/individual details page
              // Use the batch ID from the production flow, not the product ID
              if (productionFlow && productionFlow.production_product_id) {
                navigate(`/production/complete/${productionFlow.production_product_id}`);
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
              onClick={() => {
                // Check if materials are added
                if (!productionProduct.materialsConsumed || productionProduct.materialsConsumed.length === 0) {
                  showNotification(
                    "⚠️ Materials Required", 
                    "Please add at least one material before starting production flow.", 
                    "error"
                  );
                  return;
                }
                // Show machine selection popup instead of direct navigation
                setSelectedMachineId("");
                setInspectorName("");
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

        {productionProduct.status === "active" && (
          <Button 
            onClick={() => {
              setSelectedMachineId("");
              setInspectorName("");
              setShowMachineSelectionPopup(true);
            }}
            className="bg-green-600 hover:bg-green-700"
          >
            <Factory className="w-4 h-4 mr-2" />
            Add Machine Operation
          </Button>
        )}
        
        
      </div>

      {/* Material Planning Section */}
      {/* Production Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Factory className="w-5 h-5" />
            Production Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                {productionProduct.targetQuantity}
              </div>
              <div className="text-sm text-gray-500">Target Quantity</div>
                       </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {productionProduct.materialsConsumed?.length || 0}
                        </div>
              <div className="text-sm text-gray-500">Materials Used</div>
                        </div>
             <div className="text-center">
               <div className="text-2xl font-bold text-purple-600">
                 {expectedProduct.height || "N/A"}
               </div>
               <div className="text-sm text-gray-500">Height</div>
                        </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                 {expectedProduct.width || "N/A"}
                      </div>
               <div className="text-sm text-gray-500">Width</div>
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
                  <Label>Height</Label>
                  <Input
                    value={expectedProduct.height}
                    onChange={(e) => setExpectedProduct({...expectedProduct, height: e.target.value})}
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
                      <div>
                  <Label>Thickness</Label>
                  <Input
                    value={expectedProduct.thickness}
                    onChange={(e) => setExpectedProduct({...expectedProduct, thickness: e.target.value})}
                    placeholder="e.g., 12 mm"
                  />
                </div>
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
                <span className="text-gray-500">Height:</span>
                <p className="font-medium">{expectedProduct.height || "Not set"}</p>
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
                        </CardTitle>
                       <Button
                         variant="outline"
                         size="sm"
              onClick={() => setIsMaterialSelectionOpen(true)}
                       >
              <Plus className="w-4 h-4 mr-2" />
              Select Materials
                       </Button>
                  </div>
                </CardHeader>
        <CardContent>
          {/* Selected Materials Table (Excel-like) */}
          {selectedMaterials.length > 0 && (
                  <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <h4 className="font-medium">Selected Materials</h4>
                    </div>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="p-3 text-left font-medium hidden lg:table-cell">Material ID</th>
                      <th className="p-3 text-left font-medium">Name</th>
                      <th className="p-3 text-left font-medium hidden md:table-cell">Brand/Supplier</th>
                      <th className="p-3 text-left font-medium hidden lg:table-cell">Unit Price (₹)</th>
                      <th className="p-3 text-left font-medium hidden md:table-cell">Available Qty</th>
                      <th className="p-3 text-left font-medium">Using Qty</th>
                      <th className="p-3 text-left font-medium hidden lg:table-cell">Total Cost (₹)</th>
                      <th className="p-3 text-left font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedMaterials.map((material, index) => (
                      <tr key={material.id || `material-${index}`} className={`border-t hover:bg-gray-50 ${material.current_stock === 0 ? 'bg-red-50' : ''}`}>
                        <td className="p-3 font-mono text-xs hidden lg:table-cell">
                          {material.id}
                          {material.supplier_name === "From Recipe" && (
                            <span className="ml-1 text-blue-600" title="Material from saved recipe">📋</span>
                          )}
                        </td>
                        <td className="p-3 font-medium">
                          {material.name}
                          {material.supplier_name === "From Recipe" && (
                            <Badge variant="secondary" className="ml-2 text-xs">Recipe</Badge>
                          )}
                        </td>
                        <td className="p-3 hidden md:table-cell">
                          {material.supplier_name === "From Recipe" ? (
                            <span className="text-blue-600">From Recipe</span>
                          ) : (
                            material.supplier_name
                          )}
                        </td>
                        <td className="p-3 hidden lg:table-cell">₹{material.cost_per_unit}</td>
                        <td className="p-3 hidden md:table-cell">
                          {material.current_stock} {material.unit}
                          {material.current_stock === 0 && material.supplier_name === "From Recipe" && (
                            <span className="ml-1 text-red-600 text-xs">Not in inventory</span>
                          )}
                        </td>
                        <td className="p-3">
                          <div className="space-y-1">
                                                       <Input
                              type="number"
                              value={material.selectedQuantity || 1}
                              onChange={(e) => addMaterialToSelection(material, parseFloat(e.target.value) || 1)}
                              className={`w-20 ${(material.selectedQuantity || 1) > material.current_stock ? 'border-red-300 bg-red-50' : ''}`}
                              min="1"
                            />
                            {(material.selectedQuantity || 1) > material.current_stock && (
                              <div className="space-y-1">
                                <div className="text-xs text-red-600 flex items-center gap-1">
                                  <AlertTriangle className="w-3 h-3" />
                                  Shortage: {(material.selectedQuantity || 1) - material.current_stock} {material.unit}
                  </div>
                        <Button 
                             size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    const shortage = (material.selectedQuantity || 1) - material.current_stock;
                                    sendMaterialShortageNotification(material, shortage);
                                    showNotification(
                                      `📋 Notification Sent`,
                                      `Shortage notification sent to Material Inventory for ${material.name}`,
                                      'success'
                                    );
                                  }}
                                  className="text-xs h-6 px-2 bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100"
                                >
                                  <AlertTriangle className="w-3 h-3 mr-1" />
                                  Notify
                        </Button>
                         </div>
                            )}
                          </div>
                        </td>
                        <td className="p-3 font-medium hidden lg:table-cell">₹{((material.cost_per_unit || 0) * (material.selectedQuantity || 1)).toFixed(2)}</td>
                        <td className="p-3">
                      <Button 
                        variant="outline"
                             size="sm"
                            onClick={() => removeMaterialFromSelection(material.id)}
                            className="text-red-600 hover:text-red-700"
                           >
                            <Trash2 className="w-4 h-4" />
                      </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                    </div>
              <div className="flex justify-between items-center mt-4">
                <div className="text-sm text-gray-600">
                  Total Cost: ₹{selectedMaterials.reduce((sum, m) => sum + ((m.cost_per_unit || 0) * (m.selectedQuantity || 1)), 0).toFixed(2)}
                            </div>
                <Button onClick={addSelectedMaterialsToProduction} className="bg-blue-600 hover:bg-blue-700">
                  <Save className="w-4 h-4 mr-2" />
                  Add to Production
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
              const rawMaterial = rawMaterials.find(rm => rm.id === material.materialId);
              const isAvailable = rawMaterial && rawMaterial.current_stock > 0;
              
              return (
                <div key={material.materialId || `material-${index}`} className={`flex items-center justify-between p-3 rounded-lg ${
                  isAvailable ? 'bg-gray-50' : 'bg-red-50 border border-red-200'
                }`}>
                      <div>
                        <div className="font-medium">{material.materialName}</div>
                        <div className="text-sm text-gray-500">
                          ID: {material.materialId} • Brand: {rawMaterial?.brand || "Unknown"} • Supplier: {rawMaterial?.supplier_name || "Unknown"}
                        </div>
                        <div className="text-sm text-gray-500">
                          {material.quantity} {material.unit} • ₹{material.cost} • {new Date(material.consumedAt).toLocaleDateString()}
                      </div>
                        <div className="text-sm text-gray-500">
                          Available: {rawMaterial?.current_stock || 0} {material.unit} • Unit Price: ₹{rawMaterial?.cost_per_unit || material.cost / material.quantity}
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


      {/* Raw Material Selection Popup */}
      <Dialog open={isMaterialSelectionOpen} onOpenChange={setIsMaterialSelectionOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
           <DialogHeader>
            <DialogTitle>Select Raw Materials from Inventory</DialogTitle>
             <DialogDescription>
              Search and select materials from your raw material inventory. Set quantities and add to production.
             </DialogDescription>
           </DialogHeader>
           
          {/* Search Bar */}
          <div className="flex items-center gap-4 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search materials by name or category..."
                value={materialSearchTerm}
                onChange={(e) => setMaterialSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="text-sm text-gray-500">
              {getFilteredMaterials().length} materials found
            </div>
               </div>
               
          {/* Materials Grid */}
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            <div className="grid gap-4">
              {getFilteredMaterials().map((material) => (
                <MaterialSelectionCard
                  key={material.id}
                  material={material}
                  onAddToSelection={addMaterialToSelection}
                  isSelected={selectedMaterials.some(m => m.id === material.id)}
                />
              ))}
                       </div>
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
              <div className="flex justify-between items-center mt-4">
                <div className="font-medium">
                  Total Cost: ₹{(selectedMaterials || []).reduce((sum, m) => sum + ((m.cost_per_unit || 0) * (m.selectedQuantity || 1)), 0).toFixed(2)}
             </div>
                <div className="flex flex-col items-end gap-2">
                  {selectedMaterials && selectedMaterials.some(m => (m.selectedQuantity || 1) > m.current_stock) && (
                    <div className="text-xs text-orange-600 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      Some materials have insufficient stock
               </div>
                  )}
                  <Button 
                    onClick={addSelectedMaterialsToProduction} 
                    className="bg-blue-600 hover:bg-blue-700"
                    disabled={!selectedMaterials || selectedMaterials.length === 0}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Add Available Materials
                  </Button>
             </div>
           </div>
             </div>
          )}

           <DialogFooter>
            <Button variant="outline" onClick={() => setIsMaterialSelectionOpen(false)}>
              Cancel
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
              Add Machine
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-600">
              Select machine and inspector or skip to waste generation.
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
                placeholder="Enter inspector name"
                className="w-full"
              />
            </div>
            
            {/* Machine Selection */}
            <div className="space-y-3">
              <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Select Machine * ({machines.length} available)
              </Label>
              <Select value={selectedMachineId} onValueChange={setSelectedMachineId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose a machine..." />
                </SelectTrigger>
                <SelectContent>
                  {machines.length === 0 ? (
                    <SelectItem value="no-machines" disabled>
                      No machines available
                    </SelectItem>
                  ) : (
                    machines.map((machine) => (
                    <SelectItem key={machine.id} value={machine.id}>
                        {machine.name}
                    </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            
            {/* Add New Machine */}
            <div className="pt-2 border-t border-gray-100">
              <Button 
                variant="outline"
                onClick={() => setShowAddMachinePopup(true)}
                className="w-full border-dashed border-gray-300 hover:border-blue-300 hover:bg-blue-50"
                size="sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add New Machine
              </Button>
            </div>
          </div>
          
          <DialogFooter className="space-y-2 pt-4 border-t border-gray-100">
            <Button 
              onClick={handleMachineSelection}
              disabled={!selectedMachineId || !inspectorName.trim()}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
            >
              <Factory className="w-4 h-4 mr-2" />
              Add Machine
            </Button>
            
            <div className="grid grid-cols-2 gap-3 w-full">
              <Button 
                variant="outline"
                onClick={skipToWasteGeneration}
                className="border-orange-200 text-orange-700 hover:bg-orange-50"
                size="sm"
              >
                <Trash2 className="w-3 h-3 mr-1" />
                Skip
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowMachineSelectionPopup(false)}
                size="sm"
              >
                Cancel
              </Button>
            </div>
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
              <Label htmlFor="machine-name">Machine Name:</Label>
              <Input
                id="machine-name"
                value={newMachineForm.name}
                onChange={(e) => setNewMachineForm({...newMachineForm, name: e.target.value})}
                placeholder="Enter machine name"
              />
            </div>
            
            <div>
              <Label htmlFor="machine-description">Description:</Label>
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
              disabled={!newMachineForm.name.trim()}
            >
              <Save className="w-4 h-4 mr-2" />
              Add Machine
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
     </div>
   );
 }

// Material Selection Card Component
interface MaterialSelectionCardProps {
  material: RawMaterial;
  onAddToSelection: (material: RawMaterial, quantity: number) => void;
  isSelected: boolean;
}

function MaterialSelectionCard({ material, onAddToSelection, isSelected }: MaterialSelectionCardProps) {
  const handleAddToSelection = () => {
    // Add with default quantity of 1, will be editable on main page
    onAddToSelection(material, 1);
  };

  return (
    <div className={`flex items-center justify-between p-4 border rounded-lg ${isSelected ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50'}`}>
      <div className="flex-1">
        <div className="font-medium">{material.name}</div>
        <div className="text-sm text-gray-500">
          {material.category} • {material.current_stock} {material.unit} available • ₹{material.cost_per_unit} per {material.unit}
        </div>
        <div className="text-xs text-gray-400">
          Brand: {material.brand} • Supplier: {material.supplier_name}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Badge 
          variant={material.status === "in-stock" ? "default" : "destructive"}
        >
          {material.status === "in-stock" ? "In Stock" : material.status}
        </Badge>
        <Button 
          size="sm" 
          variant={isSelected ? "default" : "outline"}
          onClick={handleAddToSelection}
          disabled={isSelected}
        >
          {isSelected ? "Added" : "Add"}
        </Button>
      </div>
     </div>
   );
 }
