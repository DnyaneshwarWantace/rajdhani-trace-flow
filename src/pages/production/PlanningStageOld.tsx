import { useState, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { ProductionService } from '@/services/productionService';
import { RecipeService } from '@/services/recipeService';
import { MaterialService } from '@/services/materialService';
import { ProductService } from '@/services/productService';
import { useToast } from '@/hooks/use-toast';
import type { Product } from '@/types/product';
import type { Recipe } from '@/types/recipe';
import { calculateSQM } from '@/utils/sqmCalculator';
import PlanningStageHeader from '@/components/production/planning/PlanningStageHeader';
import ProductionStageProgress from '@/components/production/planning/ProductionStageProgress';
import ProductionOverviewStats from '@/components/production/planning/ProductionOverviewStats';
import ExpectedProductDetails from '@/components/production/planning/ExpectedProductDetails';
import MaterialRequirementsTable from '@/components/production/planning/MaterialRequirementsTable';

export default function PlanningStage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    planned_quantity: 0,
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
    completion_date: '',
    notes: '',
  });
  const [materials, setMaterials] = useState<any[]>([]);
  const [recipe, setRecipe] = useState<Recipe | null>(null);

  // Check if batchId was passed via query params or product was passed from product selection
  useEffect(() => {
    const batchId = searchParams.get('batchId');
    const productFromState = location.state?.product as Product | undefined;

    if (batchId) {
      // Load batch and product from batchId
      loadBatchAndProduct(batchId);
    } else if (productFromState) {
      setSelectedProduct(productFromState);
      loadDraftStateAndRecipe(productFromState);
      loadProductionSteps(productFromState);
    } else {
      // If no product or batchId, redirect back to create page
      navigate('/production/create');
    }
  }, [location.state, searchParams, navigate]);

  const loadBatchAndProduct = async (batchId: string) => {
    try {
      const { data: batch, error: batchError } = await ProductionService.getBatchById(batchId);
      if (batchError || !batch) {
        toast({ title: 'Error', description: 'Failed to load batch', variant: 'destructive' });
        navigate('/production');
        return;
      }

      const product = await ProductService.getProductById(batch.product_id);
      if (!product) {
        toast({ title: 'Error', description: 'Failed to load product', variant: 'destructive' });
        navigate('/production');
        return;
      }

      setSelectedProduct(product);
      setFormData({
        planned_quantity: batch.planned_quantity,
        priority: batch.priority as 'low' | 'medium' | 'high' | 'urgent',
        completion_date: batch.completion_date || '',
        notes: batch.notes || '',
      });
      loadDraftStateAndRecipe(product, true);
      loadProductionSteps(product);
    } catch (error) {
      console.error('Error loading batch:', error);
      toast({ title: 'Error', description: 'Failed to load batch', variant: 'destructive' });
      navigate('/production');
    }
  };

  // Recalculate materials when quantity changes
  useEffect(() => {
    if (selectedProduct && recipe && formData.planned_quantity > 0) {
      calculateMaterialRequirements(selectedProduct, recipe, formData.planned_quantity);
    }
  }, [formData.planned_quantity, selectedProduct, recipe]);

  const loadDraftStateAndRecipe = async (product: Product, skipDraftFormData = false) => {
    setLoadingMaterials(true);
    try {
      // First, try to load draft state from backend
      const { data: draftState, error: draftError } = await ProductionService.getDraftPlanningState(product.id);

      if (draftState && !draftError) {
        // Restore form data from draft only if not loading from existing batch
        if (draftState.form_data && !skipDraftFormData) {
          setFormData({
            planned_quantity: draftState.form_data.planned_quantity || 0,
            priority: draftState.form_data.priority || 'medium',
            completion_date: draftState.form_data.completion_date || '',
            notes: draftState.form_data.notes || '',
          });
        }
        
        // Restore modified recipe if exists
        if (draftState.recipe_data) {
          setModifiedRecipe(draftState.recipe_data as Recipe);
          setRecipe(draftState.recipe_data as Recipe);
          toast({
            title: 'Draft Restored',
            description: 'Your previous planning state has been restored.',
          });
        }
      }

      // Load recipe for this product (if not already loaded from draft)
      if (!recipe) {
        const recipeData = await RecipeService.getRecipeByProductId(product.id);
        
        if (recipeData) {
          setRecipe(recipeData);
          if (!modifiedRecipe) {
            setModifiedRecipe(recipeData);
          }
          await autoSaveRecipe();
        } else {
          setRecipe(null);
          setMaterials([]);
          if (!draftState) {
            toast({
              title: 'No Recipe Found',
              description: 'This product does not have a recipe. Please add a recipe first.',
            });
          }
          return;
        }
      }

      // Calculate material requirements if quantity is set
      const quantityToUse = draftState?.form_data?.planned_quantity || formData.planned_quantity;
      if (quantityToUse > 0) {
        const recipeToUse = modifiedRecipe || recipe;
        if (recipeToUse) {
          await calculateMaterialRequirements(product, recipeToUse, quantityToUse);
        }
      }
    } catch (error) {
      console.error('Error loading draft state and recipe:', error);
      // Fallback to loading recipe normally
      const recipeData = await RecipeService.getRecipeByProductId(product.id);
      if (recipeData) {
        setRecipe(recipeData);
        setModifiedRecipe(recipeData);
      } else {
        setRecipe(null);
        setMaterials([]);
      }
    } finally {
      setLoadingMaterials(false);
    }
  };

  const saveDraftStateToBackend = async () => {
    if (!selectedProduct) return;

    try {
      const draftState = {
        formData: formData,
        recipeData: modifiedRecipe ? {
          id: modifiedRecipe.id,
          product_id: modifiedRecipe.product_id,
          materials: modifiedRecipe.materials,
        } : null,
      };

      await ProductionService.saveDraftPlanningState(selectedProduct.id, draftState);
      console.log('Draft planning state auto-saved to backend');
    } catch (error) {
      console.error('Error saving draft state to backend:', error);
      // Don't show error toast for auto-save failures
    }
  };

  const autoSaveRecipe = async () => {
    // Recipe is already in backend when loaded
    console.log('Recipe loaded for product:', selectedProduct?.name);
  };

  const saveOrUpdateRecipe = async () => {
    // Use modified recipe if available, otherwise use original recipe
    const recipeToSave = modifiedRecipe || recipe;
    if (!recipeToSave || !selectedProduct) return;

    try {
      // Prepare materials data for recipe update
      const materialsData = recipeToSave.materials?.map((material) => ({
        material_id: material.material_id,
        material_name: material.material_name,
        material_type: material.material_type,
        quantity_per_sqm: material.quantity_per_sqm,
        unit: material.unit,
        cost_per_unit: material.cost_per_unit || 0,
        specifications: material.specifications,
        quality_requirements: material.quality_requirements,
        is_optional: material.is_optional || false,
        waste_factor: material.waste_factor || 0,
      })) || [];

      // Update recipe in backend
      await RecipeService.updateRecipe(recipeToSave.id, { materials: materialsData });
      console.log('Recipe auto-saved/updated to backend for product:', selectedProduct.name);
    } catch (error) {
      console.error('Error saving/updating recipe:', error);
      throw error;
    }
  };

  // Function to update recipe materials (when user modifies them) - for future use
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const updateRecipeMaterial = (materialId: string, updates: Partial<any>) => {
    const currentRecipe = modifiedRecipe || recipe;
    if (!currentRecipe) return;

    const updatedMaterials = currentRecipe.materials?.map((material) => {
      if (material.material_id === materialId) {
        return { ...material, ...updates };
      }
      return material;
    }) || [];

    const updatedRecipe = {
      ...currentRecipe,
      materials: updatedMaterials,
    };

    setModifiedRecipe(updatedRecipe);
    setRecipe(updatedRecipe); // Also update main recipe state
  };

  // Function to add new material to recipe - for future use
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const addRecipeMaterial = (newMaterial: any) => {
    const currentRecipe = modifiedRecipe || recipe;
    if (!currentRecipe) return;

    const updatedMaterials = [...(currentRecipe.materials || []), newMaterial];
    const updatedRecipe = {
      ...currentRecipe,
      materials: updatedMaterials,
    };

    setModifiedRecipe(updatedRecipe);
    setRecipe(updatedRecipe);
  };

  // Function to remove material from recipe - for future use
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const removeRecipeMaterial = (materialId: string) => {
    const currentRecipe = modifiedRecipe || recipe;
    if (!currentRecipe) return;

    const updatedMaterials = currentRecipe.materials?.filter(
      (material) => material.material_id !== materialId
    ) || [];

    const updatedRecipe = {
      ...currentRecipe,
      materials: updatedMaterials,
    };

    setModifiedRecipe(updatedRecipe);
    setRecipe(updatedRecipe);
  };

  const calculateMaterialRequirements = async (
    product: Product,
    recipeData: Recipe,
    quantity: number
  ) => {
    if (!recipeData.materials || recipeData.materials.length === 0) {
      setMaterials([]);
      setAllMaterialsSufficient(true);
      return;
    }

    try {
      // Calculate total SQM needed
      const productLength = parseFloat(product.length || '0');
      const productWidth = parseFloat(product.width || '0');
      const lengthUnit = product.length_unit || 'm';
      const widthUnit = product.width_unit || 'm';
      
      const sqmPerUnit = calculateSQM(productLength, productWidth, lengthUnit, widthUnit);
      const totalSQM = quantity * sqmPerUnit;

      // Calculate required materials
      const materialRequirements = await Promise.all(
        recipeData.materials.map(async (recipeMaterial) => {
          // Calculate required quantity: quantity_per_sqm * total_sqm
          const requiredQuantity = recipeMaterial.quantity_per_sqm * totalSQM;
          
          // Get available stock
          let availableQuantity = 0;
          let materialName = recipeMaterial.material_name;
          
          try {
            if (recipeMaterial.material_type === 'raw_material') {
              const material = await MaterialService.getMaterialById(recipeMaterial.material_id);
              availableQuantity = material.current_stock || 0;
              materialName = material.name;
            } else if (recipeMaterial.material_type === 'product') {
              const materialProduct = await ProductService.getProductById(recipeMaterial.material_id);
              // For products, use appropriate stock field
              availableQuantity = materialProduct.individual_stock_tracking
                ? materialProduct.current_stock || materialProduct.individual_products_count || 0
                : materialProduct.base_quantity || materialProduct.current_stock || 0;
              materialName = materialProduct.name;
            }
          } catch (error) {
            console.error(`Error fetching material ${recipeMaterial.material_id}:`, error);
            availableQuantity = 0;
          }

          // Determine status
          const shortage = Math.max(0, requiredQuantity - availableQuantity);
          let status: 'available' | 'low' | 'unavailable' = 'available';
          if (shortage > 0) {
            status = availableQuantity === 0 ? 'unavailable' : 'low';
          }

          return {
            material_id: recipeMaterial.material_id,
            material_name: materialName,
            required_quantity: requiredQuantity,
            available_quantity: availableQuantity,
            unit: recipeMaterial.unit,
            status,
            material_type: recipeMaterial.material_type,
            shortage,
          };
        })
      );

      setMaterials(materialRequirements);

      // Check material statuses
      const allSufficient = materialRequirements.every(m => m.status === 'available');
      const hasUnavailable = materialRequirements.some(m => m.status === 'unavailable');
      const hasLow = materialRequirements.some(m => m.status === 'low');
      
      setAllMaterialsSufficient(allSufficient);
      setHasUnavailableMaterials(hasUnavailable);
      setHasLowStockMaterials(hasLow);

      // Send notifications for insufficient materials
      if (!allSufficient) {
        await sendInsufficientMaterialNotifications(materialRequirements);
      }
    } catch (error) {
      console.error('Error calculating material requirements:', error);
      setMaterials([]);
      setAllMaterialsSufficient(false);
    }
  };

  const sendInsufficientMaterialNotifications = async (materials: any[]) => {
    const insufficientMaterials = materials.filter(m => m.status !== 'available');
    
    for (const material of insufficientMaterials) {
      try {
        // Check if notification already exists
        const existingNotifications = await NotificationService.getNotifications({
          module: material.material_type === 'raw_material' ? 'materials' : 'products',
          type: 'restock_request',
          limit: 100,
        });

        const hasExisting = existingNotifications.data.some(
          (n: any) => n.related_id === material.material_id && n.status === 'unread'
        );

        if (!hasExisting) {
          await NotificationService.createNotification({
            type: 'restock_request',
            title: `Insufficient ${material.material_name}`,
            message: `Required: ${material.required_quantity.toFixed(2)} ${material.unit}, Available: ${material.available_quantity.toFixed(2)} ${material.unit}. Shortage: ${material.shortage.toFixed(2)} ${material.unit}`,
            priority: material.status === 'unavailable' ? 'urgent' : 'high',
            module: material.material_type === 'raw_material' ? 'materials' : 'products',
            related_id: material.material_id,
            related_data: {
              required: material.required_quantity,
              available: material.available_quantity,
              shortage: material.shortage,
              unit: material.unit,
            },
            created_by: user?.email || 'system',
          });
        }
      } catch (error) {
        console.error(`Error sending notification for ${material.material_name}:`, error);
      }
    }
  };

  const loadProductionSteps = async (_product: Product) => {
    try {
      // TODO: Load production steps from recipe
      // For now, showing default steps
      setSteps([
        {
          step_number: 1,
          step_name: 'Material Preparation',
          description: 'Prepare and organize all required materials',
          estimated_duration: 30,
          status: 'pending' as const,
        },
        {
          step_number: 2,
          step_name: 'Production Process',
          description: 'Execute the main production process',
          estimated_duration: 120,
          status: 'pending' as const,
        },
        {
          step_number: 3,
          step_name: 'Quality Inspection',
          description: 'Inspect and verify product quality',
          estimated_duration: 20,
          status: 'pending' as const,
        },
      ]);
    } catch (error) {
      console.error('Error loading steps:', error);
      setSteps([]);
    }
  };

  const handleFormChange = (data: typeof formData) => {
    setFormData(data);
  };

  const handleSaveToPlanning = async () => {
    if (!selectedProduct || formData.planned_quantity <= 0) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a valid quantity',
        variant: 'destructive',
      });
      return;
    }

    // Block only if materials are completely unavailable (not low stock)
    if (hasUnavailableMaterials) {
      toast({
        title: 'Unavailable Materials',
        description: 'Cannot save to planning. Some materials are completely unavailable. Please restock before proceeding.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSubmitting(true);

      // Auto-save/update recipe to backend when saving to planning stage
      if (recipe) {
        await saveOrUpdateRecipe();
      }

      const batchData: CreateProductionBatchData = {
        product_id: selectedProduct.id,
        planned_quantity: formData.planned_quantity,
        priority: formData.priority,
        operator: user?.full_name || user?.email || '',
        supervisor: user?.full_name || user?.email || '',
        notes: formData.notes,
        completion_date: formData.completion_date,
      };

      const { data, error } = await ProductionService.createBatch(batchData);
      if (error) {
        toast({ title: 'Error', description: error, variant: 'destructive' });
        return;
      }
      if (data) {
        // Clear draft state after successful save
        await ProductionService.deleteDraftPlanningState(selectedProduct.id);
        
        toast({ 
          title: 'Success', 
          description: 'Production batch added to planning stage successfully. Recipe has been saved to backend.' 
        });
        navigate('/production');
      }
    } catch (error) {
      console.error('Error saving to planning:', error);
      toast({ 
        title: 'Error', 
        description: 'Failed to save to planning stage', 
        variant: 'destructive' 
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartProduction = async () => {
    if (!selectedProduct || formData.planned_quantity <= 0) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a valid quantity',
        variant: 'destructive',
      });
      return;
    }

    // Block starting production if ANY materials are insufficient (low or unavailable)
    if (!allMaterialsSufficient) {
      toast({
        title: 'Insufficient Materials',
        description: 'Cannot start production. Some materials are insufficient (low stock or unavailable). Please restock before starting production.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSubmitting(true);

      // Auto-save/update recipe to backend when starting production
      if (recipe) {
        await saveOrUpdateRecipe();
      }

      const batchData: CreateProductionBatchData = {
        product_id: selectedProduct.id,
        planned_quantity: formData.planned_quantity,
        priority: formData.priority,
        operator: user?.full_name || user?.email || '',
        supervisor: user?.full_name || user?.email || '',
        notes: formData.notes,
        completion_date: formData.completion_date,
      };

      const { data, error } = await ProductionService.createBatch(batchData);
      if (error) {
        toast({ title: 'Error', description: error, variant: 'destructive' });
        return;
      }
      if (data) {
        // Update batch status to in_production
        await ProductionService.updateBatch(data.id, { status: 'in_production' });
        
        // Clear draft state after successful start
        await ProductionService.deleteDraftPlanningState(selectedProduct.id);
        
        toast({ 
          title: 'Success', 
          description: 'Production started successfully. Recipe has been saved to backend.' 
        });
        navigate('/production');
      }
    } catch (error) {
      console.error('Error starting production:', error);
      toast({ 
        title: 'Error', 
        description: 'Failed to start production', 
        variant: 'destructive' 
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (!selectedProduct) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-600 mb-4">No product selected</p>
            <Button onClick={() => navigate('/production/new')}>
              Select Product
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  const productLength = selectedProduct ? parseFloat(selectedProduct.length || '0') : 0;
  const productWidth = selectedProduct ? parseFloat(selectedProduct.width || '0') : 0;
  const lengthUnit = selectedProduct?.length_unit || 'm';
  const widthUnit = selectedProduct?.width_unit || 'm';
  const sqmPerUnit = selectedProduct ? calculateSQM(productLength, productWidth, lengthUnit, widthUnit) : 0;
  const totalSQM = formData.planned_quantity * sqmPerUnit;

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50">
        <PlanningStageHeader onBack={() => navigate('/production')} />

        <div className="max-w-7xl mx-auto px-2 sm:px-3 lg:px-4 py-6 space-y-6">
          {/* Stage Progress */}
          <ProductionStageProgress currentStage="planning" />

          {/* Production Overview Stats */}
          <ProductionOverviewStats
            targetQuantity={formData.planned_quantity}
            unit={selectedProduct?.unit || 'SQM'}
            materialsUsed={materials.length}
            expectedLength={productLength}
            expectedWidth={productWidth}
            expectedWeight={selectedProduct ? parseFloat(selectedProduct.weight || '0') : undefined}
          />

          {/* Expected Product Details */}
          {selectedProduct && (
            <ExpectedProductDetails product={selectedProduct} />
          )}

          {/* Material Requirements Table */}
          <MaterialRequirementsTable
            materials={materials}
            targetQuantity={formData.planned_quantity}
            totalSQM={totalSQM}
            recipeBased={true}
          />
        </div>
      </div>
    </Layout>
  );
}

