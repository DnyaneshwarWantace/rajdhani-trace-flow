import { useState, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Loader2, Save, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProductionService } from '@/services/productionService';
import { RecipeService } from '@/services/recipeService';
import { MaterialService } from '@/services/materialService';
import { ProductService } from '@/services/productService';
import { AuthService } from '@/services/authService';
import { useToast } from '@/hooks/use-toast';
import type { Product } from '@/types/product';
import type { Recipe } from '@/types/recipe';
import { calculateSQM } from '@/utils/sqmCalculator';
import PlanningStageHeader from '@/components/production/planning/PlanningStageHeader';
import ProductionStageProgress from '@/components/production/planning/ProductionStageProgress';
import ProductionOverviewStats from '@/components/production/planning/ProductionOverviewStats';
import ExpectedProductDetails from '@/components/production/planning/ExpectedProductDetails';
import MaterialRequirementsTable from '@/components/production/planning/MaterialRequirementsTable';
import MaterialSelectionDialog from '@/components/production/planning/MaterialSelectionDialog';
import MachineSelectionDialog from '@/components/production/planning/MachineSelectionDialog';
import IndividualProductSelectionDialog from '@/components/production/planning/IndividualProductSelectionDialog';

export default function PlanningStage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showMaterialDialog, setShowMaterialDialog] = useState(false);
  const [showMachineDialog, setShowMachineDialog] = useState(false);
  const [showIndividualProductDialog, setShowIndividualProductDialog] = useState(false);
  const [selectedMaterialForIndividual, setSelectedMaterialForIndividual] = useState<{id: string, name: string, required: number} | null>(null);
  const [selectedMachine, setSelectedMachine] = useState<any | null>(null);
  const [formData, setFormData] = useState({
    planned_quantity: 0,
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
    completion_date: '',
    notes: '',
  });
  const [materials, setMaterials] = useState<any[]>([]); // Recipe materials (top section)
  const [consumedMaterials, setConsumedMaterials] = useState<any[]>([]); // Confirmed materials (bottom section)
  const [selectedIndividualProducts, setSelectedIndividualProducts] = useState<Record<string, any[]>>({}); // Store selected individual products per material (top section)
  const [consumedIndividualProducts, setConsumedIndividualProducts] = useState<Record<string, any[]>>({}); // Store individual products for consumed materials (bottom section)
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [recipeModified, setRecipeModified] = useState(false);
  const [draftSaveTimeout, setDraftSaveTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [currentBatchId, setCurrentBatchId] = useState<string | null>(null); // Track current batch ID

  // Check if batchId was passed via query params or product was passed from product selection
  useEffect(() => {
    const batchId = searchParams.get('batchId');
    const productFromState = location.state?.product as Product | undefined;

    if (batchId) {
      loadBatchAndProduct(batchId);
    } else if (productFromState) {
      setSelectedProduct(productFromState);
      loadRecipeAndCalculate(productFromState);
    } else {
      navigate('/production/create');
    }
  }, [location.state, searchParams, navigate]);

  // Recalculate materials when quantity changes
  useEffect(() => {
    if (selectedProduct && recipe && formData.planned_quantity > 0) {
      calculateMaterialRequirements(selectedProduct, recipe, formData.planned_quantity);
    }
  }, [formData.planned_quantity, selectedProduct, recipe]);

  // Debounced draft save whenever materials, consumed materials, or form data change
  useEffect(() => {
    if (!selectedProduct) return;

    if (draftSaveTimeout) {
      clearTimeout(draftSaveTimeout);
    }

    const timeout = setTimeout(() => {
      saveDraftStateToBackend();
    }, 1000);

    setDraftSaveTimeout(timeout);

    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [materials, consumedMaterials, formData, selectedProduct]);

  const loadBatchAndProduct = async (batchId: string) => {
    setLoading(true);
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
      setCurrentBatchId(batch.id); // Store the batch ID
      setFormData({
        planned_quantity: batch.planned_quantity,
        priority: batch.priority as 'low' | 'medium' | 'high' | 'urgent',
        completion_date: batch.completion_date || '',
        notes: batch.notes || '',
      });

      // If batch is already in production, load consumed materials instead of recipe
      if (batch.status === 'in_production' || batch.status === 'in_progress') {
        // Load consumed materials from MaterialConsumption
        const { data: materialConsumption } = await ProductionService.getMaterialConsumption(batchId);
        if (materialConsumption && materialConsumption.length > 0) {
          // Convert material consumption to consumed materials format
          const consumed = materialConsumption.map((mc: any) => ({
            material_id: mc.material_id,
            material_name: mc.material_name,
            material_type: mc.material_type,
            quantity_per_sqm: mc.quantity_per_sqm || 0,
            required_quantity: mc.quantity_used || mc.required_quantity || 0,
            actual_consumed_quantity: mc.actual_consumed_quantity || mc.quantity_used || 0,
            whole_product_count: mc.whole_product_count || mc.quantity_used || 0,
            unit: mc.unit,
            individual_product_ids: mc.individual_product_ids || [],
            status: 'available' as const,
            available_quantity: 0,
            shortage: 0,
          }));
          setConsumedMaterials(consumed);
          
          // Load individual products for consumed materials
          const individualProductsMap: Record<string, any[]> = {};
          for (const material of consumed) {
            if (material.material_type === 'product' && material.individual_product_ids && material.individual_product_ids.length > 0) {
              try {
                const { IndividualProductService } = await import('@/services/individualProductService');
                const individualProducts = await Promise.all(
                  material.individual_product_ids.map((id: string) =>
                    IndividualProductService.getIndividualProductById(id)
                  )
                );
                individualProductsMap[material.material_id] = individualProducts
                  .filter((ip: any) => ip.data)
                  .map((ip: any) => ip.data);
              } catch (error) {
                console.error(`Error loading individual products for ${material.material_name}:`, error);
              }
            }
          }
          setConsumedIndividualProducts(individualProductsMap);
          
          // Clear materials (recipe) since we're showing consumed materials
          setMaterials([]);
        }
      } else {
        // Batch is still in planning, load recipe
        loadRecipeAndCalculate(product, batch.planned_quantity);
      }
    } catch (error) {
      console.error('Error loading batch:', error);
      toast({ title: 'Error', description: 'Failed to load batch', variant: 'destructive' });
      navigate('/production');
    } finally {
      setLoading(false);
    }
  };

  const loadRecipeAndCalculate = async (product: Product, quantity?: number) => {
    setLoading(true);
    try {
      // Attempt to restore draft state (materials + form data)
      const { data: draft } = await ProductionService.getDraftPlanningState(product.id);

      if (draft?.form_data) {
        setFormData({
          planned_quantity: quantity || draft.form_data.planned_quantity || 0, // Use batch quantity parameter, not draft
          priority: draft.form_data.priority || 'medium',
          completion_date: draft.form_data.completion_date || '',
          notes: draft.form_data.notes || '',
        });
      }
      if (draft?.materials) {
        setMaterials(draft.materials);
      }
      if (draft?.consumed_materials) {
        setConsumedMaterials(draft.consumed_materials);

        // Load individual products for consumed materials
        const individualProductsMap: Record<string, any[]> = {};
        for (const material of draft.consumed_materials) {
          if (material.material_type === 'product' && material.individual_product_ids && material.individual_product_ids.length > 0) {
            try {
              const { IndividualProductService } = await import('@/services/individualProductService');
              const allProducts: any[] = [];
              // Fetch each individual product by ID
              for (const productId of material.individual_product_ids) {
                try {
                  const product = await IndividualProductService.getIndividualProductById(productId);
                  allProducts.push(product);
                } catch (err) {
                  console.error(`Error loading individual product ${productId}:`, err);
                }
              }
              individualProductsMap[material.material_id] = allProducts;
            } catch (error) {
              console.error(`Error loading individual products for material ${material.material_id}:`, error);
            }
          }
        }
        setConsumedIndividualProducts(individualProductsMap);
      }

      const recipeData = await RecipeService.getRecipeByProductId(product.id);

      if (recipeData) {
        setRecipe(recipeData);
        if (quantity && quantity > 0) {
          calculateMaterialRequirements(product, recipeData, quantity);
        } else if (draft?.form_data?.planned_quantity) {
          calculateMaterialRequirements(product, recipeData, draft.form_data.planned_quantity);
        }
      } else {
        setRecipe(null);
        setMaterials([]);
        toast({
          title: 'No Recipe Found',
          description: 'This product does not have a recipe configured.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error loading recipe:', error);
      setRecipe(null);
      setMaterials([]);
    } finally {
      setLoading(false);
    }
  };

  const calculateMaterialRequirements = async (
    product: Product,
    recipeData: Recipe,
    quantity: number
  ) => {
    if (!recipeData.materials || recipeData.materials.length === 0) {
      setMaterials([]);
      return;
    }

    try {
      const productLength = parseFloat(product.length || '0');
      const productWidth = parseFloat(product.width || '0');
      const lengthUnit = product.length_unit || 'm';
      const widthUnit = product.width_unit || 'm';

      const sqmPerUnit = calculateSQM(productLength, productWidth, lengthUnit, widthUnit);
      const totalSQM = quantity * sqmPerUnit;

      const materialRequirements = await Promise.all(
        recipeData.materials.map(async (recipeMaterial) => {
          let requiredQuantity = recipeMaterial.quantity_per_sqm * totalSQM;
          let availableQuantity = 0;
          let materialName = recipeMaterial.material_name;
          let unit = recipeMaterial.unit;

          try {
            if (recipeMaterial.material_type === 'raw_material') {
              const material = await MaterialService.getMaterialById(recipeMaterial.material_id);
              availableQuantity = material.current_stock || 0;
              materialName = material.name;
              unit = material.unit || recipeMaterial.unit;
            } else if (recipeMaterial.material_type === 'product') {
              const materialProduct = await ProductService.getProductById(recipeMaterial.material_id);

              // For products: use count_unit (e.g., "rolls") for counting, not unit (e.g., "sqm")
              unit = materialProduct.count_unit || 'rolls';

              // For products: quantity_per_sqm represents pieces needed per SQM of parent
              // So required quantity is quantity_per_sqm * totalSQM of parent
              requiredQuantity = recipeMaterial.quantity_per_sqm * totalSQM;

              // Get available individual products count (only status='available')
              if (materialProduct.individual_stock_tracking) {
                const { IndividualProductService } = await import('@/services/individualProductService');
                const { total: availableCount } = await IndividualProductService.getIndividualProductsByProductId(
                  recipeMaterial.material_id,
                  { status: 'available' }
                );
                availableQuantity = availableCount || 0;
              } else {
                availableQuantity = materialProduct.current_stock || 0;
              }

              materialName = materialProduct.name;
            }
          } catch (error) {
            console.error(`Error fetching material ${recipeMaterial.material_id}:`, error);
            availableQuantity = 0;
          }

          const shortage = Math.max(0, requiredQuantity - availableQuantity);
          let status: 'available' | 'low' | 'unavailable' = 'available';
          if (shortage > 0) {
            status = availableQuantity === 0 ? 'unavailable' : 'low';
          }

          // For products: calculate actual_consumed_quantity and whole_product_count
          const materialData: any = {
            material_id: recipeMaterial.material_id,
            material_name: materialName,
            material_type: recipeMaterial.material_type,
            quantity_per_sqm: recipeMaterial.quantity_per_sqm,
            required_quantity: requiredQuantity,
            available_quantity: availableQuantity,
            unit: unit,
            status,
            shortage,
          };

          if (recipeMaterial.material_type === 'product') {
            // For products: actual_consumed_quantity = required_quantity (fractional)
            // whole_product_count = Math.ceil(required_quantity) (whole products needed)
            materialData.actual_consumed_quantity = requiredQuantity;
            materialData.whole_product_count = Math.ceil(requiredQuantity);
            materialData.individual_product_ids = []; // Will be populated when user selects individual products
          } else {
            // For raw materials: actual_consumed_quantity = required_quantity
            materialData.actual_consumed_quantity = requiredQuantity;
            materialData.whole_product_count = 0; // Not applicable
            materialData.individual_product_ids = [];
          }

          return materialData;
        })
      );

      setMaterials(materialRequirements);
    } catch (error) {
      console.error('Error calculating material requirements:', error);
      setMaterials([]);
    }
  };

  // Persist draft state (materials + form data) to backend for refresh/other users
  const saveDraftStateToBackend = async () => {
    if (!selectedProduct) return;

    try {
      await ProductionService.saveDraftPlanningState(selectedProduct.id, {
        formData,
        materials,
        consumedMaterials,
        productionBatchId: currentBatchId ?? undefined,
      });
    } catch (error) {
      console.error('Error saving draft state to backend:', error);
    }
  };

  const updateRecipeInDatabase = async (updatedMaterials: any[]) => {
    if (!selectedProduct) return;

    try {
      // Prepare payload for backend
      const materialsPayload = updatedMaterials.map((m) => ({
        material_id: m.material_id,
        material_name: m.material_name,
        material_type: m.material_type,
        quantity_per_sqm: m.quantity_per_sqm,
        unit: m.unit,
        cost_per_unit: m.cost_per_unit ?? 0,
        specifications: m.specifications ?? '',
        quality_requirements: m.quality_requirements ?? '',
        is_optional: m.is_optional ?? false,
        waste_factor: m.waste_factor ?? 0,
      }));

      let updatedRecipe: Recipe;

      if (recipe) {
        // Recipe exists - update it
        updatedRecipe = await RecipeService.updateRecipe(recipe.id, { materials: materialsPayload });
        
        // Update local state with a fully-typed RecipeMaterial[]
        updatedRecipe = {
          ...recipe,
          materials: materialsPayload.map((m) => {
            const existing =
              recipe.materials?.find((rm) => rm.material_id === m.material_id);
            return {
              id: existing?.id || `${m.material_id}-temp`,
              recipe_id: recipe.id,
              material_id: m.material_id,
              material_name: m.material_name,
              material_type: m.material_type,
              quantity_per_sqm: m.quantity_per_sqm,
              unit: m.unit,
              cost_per_unit: m.cost_per_unit ?? 0,
              specifications: m.specifications ?? '',
              quality_requirements: m.quality_requirements ?? '',
              is_optional: m.is_optional ?? false,
              waste_factor: m.waste_factor ?? 0,
              total_cost_per_sqm: existing?.total_cost_per_sqm ?? 0,
              created_at: existing?.created_at || new Date().toISOString(),
            };
          }),
        };
      } else {
        // Recipe doesn't exist in state - check if it exists in database first
        const existingRecipe = await RecipeService.getRecipeByProductId(selectedProduct.id);

        if (existingRecipe) {
          // Recipe exists in database, update it
          updatedRecipe = await RecipeService.updateRecipe(existingRecipe.id, {
            materials: materialsPayload,
          });
          setRecipe(existingRecipe); // Update state with existing recipe
        } else {
          // Recipe truly doesn't exist - create it
          updatedRecipe = await RecipeService.createRecipe(selectedProduct.id, {
            materials: materialsPayload,
            description: `Recipe for ${selectedProduct.name}`,
            created_by: 'system',
          });

          // Reload the recipe to get full data with materials
          const loadedRecipe = await RecipeService.getRecipeByProductId(selectedProduct.id);
          if (loadedRecipe) {
            updatedRecipe = loadedRecipe;
          }
        }
      }

      setRecipe(updatedRecipe);

      toast({
        title: recipe ? 'Recipe Updated' : 'Recipe Created',
        description: recipe 
          ? 'Recipe has been automatically updated'
          : 'Recipe has been automatically created',
      });
    } catch (error) {
      console.error('Error saving recipe:', error);
      toast({
        title: 'Error',
        description: recipe 
          ? 'Failed to update recipe automatically'
          : 'Failed to create recipe automatically',
        variant: 'destructive',
      });
    }
  };

  const handleMaterialSelect = async (selectedMaterials: any[]) => {
    if (!selectedProduct) return;

    const productLength = parseFloat(selectedProduct.length || '0');
    const productWidth = parseFloat(selectedProduct.width || '0');
    const lengthUnit = selectedProduct.length_unit || 'm';
    const widthUnit = selectedProduct.width_unit || 'm';
    const sqmPerUnit = calculateSQM(productLength, productWidth, lengthUnit, widthUnit);
    const totalSQM = formData.planned_quantity * sqmPerUnit;

    const newMaterialsWithCalc = await Promise.all(
      selectedMaterials.map(async (m) => {
        let quantityPerSqm = m.quantity_per_sqm || 0;
        let unit = m.unit;
        let availableQuantity = 0;

        if (m.material_type === 'product') {
          try {
            const childProduct = await ProductService.getProductById(m.material_id);

            // For products: always use 'rolls' as unit (counting individual products)
            unit = 'rolls';

            // Calculate child product's SQM
            const childLength = parseFloat(childProduct.length || '0');
            const childWidth = parseFloat(childProduct.width || '0');
            const childLengthUnit = childProduct.length_unit || 'm';
            const childWidthUnit = childProduct.width_unit || 'm';
            const childSqm = calculateSQM(childLength, childWidth, childLengthUnit, childWidthUnit);

            // Calculate how many pieces are needed per 1 SQM of parent product if not provided
            if (!quantityPerSqm || quantityPerSqm === 0) {
              quantityPerSqm = childSqm > 0 ? 1 / childSqm : 1;
            }

            // Get available quantity for product (only available individual products)
            if (childProduct.individual_stock_tracking) {
              const { IndividualProductService } = await import('@/services/individualProductService');
              const { total: availableCount } = await IndividualProductService.getIndividualProductsByProductId(
                m.material_id,
                { status: 'available' }
              );
              availableQuantity = availableCount || 0;
            } else {
              availableQuantity = childProduct.current_stock || 0;
            }
          } catch (error) {
            console.error('Error fetching product details for auto-calc:', error);
            if (!quantityPerSqm || quantityPerSqm === 0) {
              quantityPerSqm = 1; // Default
            }
            unit = 'rolls';
            availableQuantity = 0;
          }
        } else if (m.material_type === 'raw_material') {
          try {
            const material = await MaterialService.getMaterialById(m.material_id);
            availableQuantity = material.current_stock || 0;
            unit = material.unit || m.unit;
          } catch (error) {
            console.error('Error fetching material details:', error);
            availableQuantity = 0;
          }
        }

        // Calculate required quantity and status
        const requiredQuantity = quantityPerSqm * totalSQM;
        const shortage = Math.max(0, requiredQuantity - availableQuantity);
        let status: 'available' | 'low' | 'unavailable' = 'available';
        if (shortage > 0) {
          status = availableQuantity === 0 ? 'unavailable' : 'low';
        }

        const materialData: any = {
          ...m,
          quantity_per_sqm: quantityPerSqm,
          unit,
          required_quantity: requiredQuantity,
          available_quantity: availableQuantity,
          status,
          shortage,
        };

        // For products: calculate actual_consumed_quantity and whole_product_count
        if (m.material_type === 'product') {
          // For products: actual_consumed_quantity = required_quantity (fractional)
          // whole_product_count = Math.ceil(required_quantity) (whole products needed)
          materialData.actual_consumed_quantity = requiredQuantity;
          materialData.whole_product_count = Math.ceil(requiredQuantity);
          materialData.individual_product_ids = m.individual_product_ids || []; // Preserve if already selected
        } else {
          // For raw materials: actual_consumed_quantity = required_quantity
          materialData.actual_consumed_quantity = requiredQuantity;
          materialData.whole_product_count = 0; // Not applicable
          materialData.individual_product_ids = [];
        }

        return materialData;
      })
    );

    const updatedMaterials = [...materials];
    const existingIds = new Set(updatedMaterials.map((m) => m.material_id));
    const toAdd = newMaterialsWithCalc.filter((m) => !existingIds.has(m.material_id));
    const finalMaterials = [...updatedMaterials, ...toAdd];

    setMaterials(finalMaterials);
    setRecipeModified(true); // mark for save on Add to Production
  };

  const handleRemoveMaterial = (materialId: string) => {
    const updatedMaterials = materials.filter((m) => m.material_id !== materialId);
    setMaterials(updatedMaterials);
    setRecipeModified(true); // mark for save on Add to Production
  };

  const handleUpdateQuantity = (materialId: string, quantityPerSqm: number) => {
    const updatedMaterials = materials.map((m) => {
      if (m.material_id === materialId) {
        const productLength = parseFloat(selectedProduct?.length || '0');
        const productWidth = parseFloat(selectedProduct?.width || '0');
        const lengthUnit = selectedProduct?.length_unit || 'm';
        const widthUnit = selectedProduct?.width_unit || 'm';
        const sqmPerUnit = calculateSQM(productLength, productWidth, lengthUnit, widthUnit);
        const totalSQM = formData.planned_quantity * sqmPerUnit;
        const requiredQuantity = quantityPerSqm * totalSQM;

        return {
          ...m,
          quantity_per_sqm: quantityPerSqm,
          required_quantity: requiredQuantity,
        };
      }
      return m;
    });

    setMaterials(updatedMaterials);
    setRecipeModified(true); // mark for save on Add to Production
  };

  const handleAddToProduction = async () => {
    if (!selectedProduct || formData.planned_quantity <= 0) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a valid quantity',
        variant: 'destructive',
      });
      return;
    }

    if (materials.length === 0) {
      toast({
        title: 'Validation Error',
        description: 'Please add materials to production',
        variant: 'destructive',
      });
      return;
    }

    // Validate that all materials have quantity_per_sqm > 0
    const materialsWithZeroQuantity = materials.filter((m) => !m.quantity_per_sqm || m.quantity_per_sqm <= 0);
    if (materialsWithZeroQuantity.length > 0) {
      toast({
        title: 'Validation Error',
        description: `Please enter quantity per sqm (greater than 0) for: ${materialsWithZeroQuantity.map(m => m.material_name).join(', ')}`,
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    try {
      // 1. Persist latest recipe changes only when user confirms add
      if (recipeModified) {
        await updateRecipeInDatabase(materials);
        setRecipeModified(false);
      }

      // 2. Check for insufficient materials and send notifications
      const insufficientMaterials = materials.filter(
        (m) => m.status === 'low' || m.status === 'unavailable'
      );

      if (insufficientMaterials.length > 0) {
        insufficientMaterials.forEach((material) => {
          toast({
            title: 'Insufficient Stock',
            description: `${material.material_name}: Required ${material.required_quantity.toFixed(
              2
            )} ${material.unit}, Available ${material.available_quantity} ${
              material.unit
            }. Shortage: ${material.shortage?.toFixed(2)} ${material.unit}`,
            variant: 'destructive',
          });
        });
      }

      // 3. Move ALL materials (including insufficient ones) to consumed section
      // Prevent duplicates by checking if material already exists
      const existingMaterialIds = new Set(consumedMaterials.map((m) => m.material_id));
      const newMaterialsToAdd = materials.filter((m) => !existingMaterialIds.has(m.material_id));
      
      // For products: calculate actual_consumed_quantity and whole_product_count
      const materialsWithProductDetails = newMaterialsToAdd.map((m) => {
        if (m.material_type === 'product') {
          // For products:
          // - actual_consumed_quantity = required_quantity (fractional, e.g., 0.8)
          // - whole_product_count = Math.ceil(required_quantity) (e.g., 1)
          const actualConsumed = m.required_quantity || 0;
          const wholeProductCount = Math.ceil(actualConsumed);

          // Get selected individual product IDs from state
          const selectedProducts = selectedIndividualProducts[m.material_id] || [];
          const productIds = selectedProducts.map(p => p.id);

          return {
            ...m,
            actual_consumed_quantity: actualConsumed,
            whole_product_count: wholeProductCount,
            individual_product_ids: productIds,
          };
        } else {
          // For raw materials: actual_consumed_quantity = required_quantity
          return {
            ...m,
            actual_consumed_quantity: m.required_quantity || 0,
            whole_product_count: 0, // Not applicable for raw materials
            individual_product_ids: [],
          };
        }
      });
      
      if (materialsWithProductDetails.length > 0) {
        // Update individual product statuses to 'in_production'
        for (const material of materialsWithProductDetails) {
          if (material.material_type === 'product' && material.individual_product_ids && material.individual_product_ids.length > 0) {
            try {
              const { IndividualProductService } = await import('@/services/individualProductService');
              for (const productId of material.individual_product_ids) {
                try {
                  await IndividualProductService.updateIndividualProduct(productId, {
                    status: 'in_production'
                  });
                } catch (err) {
                  console.error(`Error updating status for product ${productId}:`, err);
                }
              }
              // Add the loaded products to consumedIndividualProducts state
              const products = selectedIndividualProducts[material.material_id] || [];
              setConsumedIndividualProducts(prev => ({
                ...prev,
                [material.material_id]: products
              }));
            } catch (error) {
              console.error(`Error updating product statuses for material ${material.material_id}:`, error);
            }
          }
        }

        setConsumedMaterials([...consumedMaterials, ...materialsWithProductDetails]);

        // 4. Clear ALL materials from requirements section that are now in production
        // This includes both newly added materials AND materials that were already in production
        // (to prevent confusion where same material appears in both sections)
        const allProductionMaterialIds = new Set([
          ...consumedMaterials.map((m) => m.material_id),
          ...newMaterialsToAdd.map((m) => m.material_id),
        ]);
        setMaterials(materials.filter((m) => !allProductionMaterialIds.has(m.material_id)));

        toast({
          title: 'Success',
          description: `${newMaterialsToAdd.length} new material(s) added to production${
            insufficientMaterials.length > 0
              ? '. Note: Some materials have insufficient stock.'
              : ''
          }`,
        });
      } else {
        // Even if no new materials, remove duplicates from requirements section
        const allProductionMaterialIds = new Set(consumedMaterials.map((m) => m.material_id));
        const remainingMaterials = materials.filter((m) => !allProductionMaterialIds.has(m.material_id));
        
        if (remainingMaterials.length < materials.length) {
          setMaterials(remainingMaterials);
          toast({
            title: 'Info',
            description: 'Removed duplicate materials from requirements section',
            variant: 'default',
          });
        } else {
          toast({
            title: 'Info',
            description: 'All materials are already added to production',
            variant: 'default',
          });
        }
      }
    } catch (error) {
      console.error('Error adding materials to production:', error);
      toast({
        title: 'Error',
        description: 'Failed to add materials to production',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary-600 mx-auto mb-4" />
            <p className="text-gray-600">Loading planning stage...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!selectedProduct) {
    return null;
  }

  const productLength = parseFloat(selectedProduct.length || '0');
  const productWidth = parseFloat(selectedProduct.width || '0');
  const lengthUnit = selectedProduct.length_unit || 'm';
  const widthUnit = selectedProduct.width_unit || 'm';
  const sqmPerUnit = calculateSQM(productLength, productWidth, lengthUnit, widthUnit);
  const totalSQM = formData.planned_quantity * sqmPerUnit;

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50">
        <PlanningStageHeader onBack={() => navigate('/production')} />

        <div className="px-2 sm:px-3 lg:px-4 py-6 space-y-6">
          {/* Stage Progress */}
          <ProductionStageProgress currentStage="planning" />

          {/* Production Overview Stats */}
          <ProductionOverviewStats
            targetQuantity={formData.planned_quantity}
            unit={selectedProduct.count_unit || 'rolls'}
            materialsUsed={materials.length}
            expectedLength={productLength}
            expectedWidth={productWidth}
            expectedWeight={parseFloat(selectedProduct.weight || '0')}
          />

          {/* Expected Product Details */}
          <ExpectedProductDetails product={selectedProduct} />

          {/* Material Requirements Table */}
          <MaterialRequirementsTable
            materials={materials}
            targetQuantity={formData.planned_quantity}
            totalSQM={totalSQM}
            recipeBased={recipe ? true : false}
            selectedIndividualProducts={selectedIndividualProducts}
            onAddMaterial={() => setShowMaterialDialog(true)}
            onRemoveMaterial={handleRemoveMaterial}
            onUpdateQuantity={handleUpdateQuantity}
            onSelectIndividualProducts={(materialId: string) => {
              const material = materials.find(m => m.material_id === materialId);
              if (material) {
                setSelectedMaterialForIndividual({
                  id: materialId,
                  name: material.material_name,
                  required: material.required_quantity
                });
                setShowIndividualProductDialog(true);
              }
            }}
          />

          {/* Add to Production Button */}
          <div className="flex justify-end">
            <Button
              onClick={handleAddToProduction}
              disabled={
                submitting ||
                formData.planned_quantity <= 0 ||
                materials.length === 0
              }
              className="bg-primary-600 hover:bg-primary-700"
              size="lg"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Adding to Production...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Add Materials to Production
                </>
              )}
            </Button>
          </div>

          {/* Materials Consumed in Production Section */}
          {consumedMaterials.length > 0 && (
            <>
              <div className="border-t-4 border-gray-300 pt-6 mt-8">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Materials Consumed in Production</h2>
                <p className="text-sm text-gray-600 mb-4">{consumedMaterials.length} material(s) added</p>
              </div>

              <MaterialRequirementsTable
                materials={consumedMaterials}
                targetQuantity={formData.planned_quantity}
                totalSQM={totalSQM}
                recipeBased={false}
                selectedIndividualProducts={consumedIndividualProducts}
                onSelectIndividualProducts={(materialId: string) => {
                  const material = consumedMaterials.find(m => m.material_id === materialId);
                  if (material) {
                    setSelectedMaterialForIndividual({
                      id: materialId,
                      name: material.material_name,
                      required: material.required_quantity
                    });
                    setShowIndividualProductDialog(true);
                  }
                }}
                onRemoveMaterial={async (materialId) => {
                  const materialToRemove = consumedMaterials.find((m) => m.material_id === materialId);

                  // Update individual product statuses back to 'available' if removed
                  if (materialToRemove?.material_type === 'product' && materialToRemove.individual_product_ids && materialToRemove.individual_product_ids.length > 0) {
                    try {
                      const { IndividualProductService } = await import('@/services/individualProductService');
                      for (const productId of materialToRemove.individual_product_ids) {
                        try {
                          await IndividualProductService.updateIndividualProduct(productId, {
                            status: 'available'
                          });
                        } catch (err) {
                          console.error(`Error updating status for product ${productId}:`, err);
                        }
                      }
                      // Remove from consumedIndividualProducts state
                      setConsumedIndividualProducts(prev => {
                        const updated = { ...prev };
                        delete updated[materialId];
                        return updated;
                      });
                    } catch (error) {
                      console.error(`Error updating product statuses:`, error);
                    }
                  }

                  const updatedConsumed = consumedMaterials.filter((m) => m.material_id !== materialId);
                  setConsumedMaterials(updatedConsumed);

                  // Also update recipe to remove this material
                  if (materialToRemove && selectedProduct) {
                    try {
                      if (recipe) {
                        // Recipe exists - update it
                        const currentMaterials = recipe.materials || [];
                        const updatedRecipeMaterials = currentMaterials.filter(
                          (m) => m.material_id !== materialId
                        );
                        await RecipeService.updateRecipe(recipe.id, { materials: updatedRecipeMaterials });
                        
                        // Update local recipe state
                        setRecipe({
                          ...recipe,
                          materials: updatedRecipeMaterials,
                        });
                      } else {
                        // Recipe doesn't exist - create it with remaining materials
                        const remainingMaterials = updatedConsumed.map((m) => ({
                          material_id: m.material_id,
                          material_name: m.material_name,
                          material_type: m.material_type,
                          quantity_per_sqm: m.quantity_per_sqm,
                          unit: m.unit,
                          cost_per_unit: m.cost_per_unit ?? 0,
                          specifications: m.specifications ?? '',
                          quality_requirements: m.quality_requirements ?? '',
                          is_optional: m.is_optional ?? false,
                          waste_factor: m.waste_factor ?? 0,
                        }));

                        if (remainingMaterials.length > 0) {
                          await RecipeService.createRecipe(selectedProduct.id, {
                            materials: remainingMaterials,
                            description: `Recipe for ${selectedProduct.name}`,
                            created_by: 'system',
                          });
                          
                          // Reload the recipe to get full data with materials
                          const loadedRecipe = await RecipeService.getRecipeByProductId(selectedProduct.id);
                          if (loadedRecipe) {
                            setRecipe(loadedRecipe);
                          }
                        }
                      }
                      
                      toast({
                        title: 'Material Removed',
                        description: 'Material removed from production and recipe updated',
                      });
                    } catch (error) {
                      console.error('Error updating recipe after removal:', error);
                      toast({
                        title: 'Material Removed',
                        description: 'Material removed from production, but recipe update failed',
                        variant: 'destructive',
                      });
                    }
                  } else {
                    toast({
                      title: 'Material Removed',
                      description: 'Material removed from production',
                    });
                  }
                }}
              />

              {/* Start Production Flow Button */}
              <div className="flex justify-end gap-4">
                {!recipe && (
                  <div className="flex items-center gap-2 text-amber-600">
                    <AlertCircle className="w-5 h-5" />
                    <span className="text-sm font-medium">
                      Please set the recipe first before starting production
                    </span>
                  </div>
                )}
                <Button
                  onClick={() => {
                    // Open machine selection dialog first
                    setShowMachineDialog(true);
                  }}
                  disabled={
                    submitting ||
                    consumedMaterials.length === 0 ||
                    !recipe
                  }
                  className="bg-green-600 hover:bg-green-700"
                  size="lg"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Starting Production Flow...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Start Production Flow
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Material Selection Dialog */}
      <MaterialSelectionDialog
        isOpen={showMaterialDialog}
        onClose={() => setShowMaterialDialog(false)}
        onSelect={handleMaterialSelect}
        existingMaterials={materials.map((m) => ({
          material_id: m.material_id,
          material_name: m.material_name,
          material_type: m.material_type,
          quantity_per_sqm: m.quantity_per_sqm,
          unit: m.unit,
        }))}
      />

      {/* Individual Product Selection Dialog */}
      {selectedMaterialForIndividual && (
        <IndividualProductSelectionDialog
          isOpen={showIndividualProductDialog}
          onClose={() => {
            setShowIndividualProductDialog(false);
            setSelectedMaterialForIndividual(null);
          }}
          materialId={selectedMaterialForIndividual.id}
          materialName={selectedMaterialForIndividual.name}
          requiredQuantity={selectedMaterialForIndividual.required}
          preSelectedProductIds={
            (selectedIndividualProducts[selectedMaterialForIndividual.id]?.map(p => p.id) || []).length > 0
              ? selectedIndividualProducts[selectedMaterialForIndividual.id]?.map(p => p.id) || []
              : consumedIndividualProducts[selectedMaterialForIndividual.id]?.map(p => p.id) || []
          }
          onSelect={(selectedProducts) => {
            // Check if this is from consumed materials section
            const isConsumed = consumedMaterials.some(m => m.material_id === selectedMaterialForIndividual.id);

            if (isConsumed) {
              // Update consumed individual products and consumed materials
              setConsumedIndividualProducts(prev => ({
                ...prev,
                [selectedMaterialForIndividual.id]: selectedProducts
              }));

              // Update individual_product_ids in consumed materials
              setConsumedMaterials(prev => prev.map(m =>
                m.material_id === selectedMaterialForIndividual.id
                  ? { ...m, individual_product_ids: selectedProducts.map(p => p.id) }
                  : m
              ));
            } else {
              // Update for planning section
              setSelectedIndividualProducts(prev => ({
                ...prev,
                [selectedMaterialForIndividual.id]: selectedProducts
              }));
            }

            toast({
              title: 'Products Selected',
              description: `${selectedProducts.length} individual products selected`,
            });
          }}
        />
      )}

      {/* Machine Selection Dialog */}
      <MachineSelectionDialog
        isOpen={showMachineDialog}
        onClose={() => {
          // Allow closing the dialog (cancel/X button)
          setShowMachineDialog(false);
        }}
        onSelect={async (machine, shift) => {
          if (!machine) {
            toast({
              title: 'Machine Required',
              description: 'Please select a machine to continue',
              variant: 'destructive',
            });
            return;
          }

          // Add shift to machine object
          const machineWithShift = { ...machine, shift: shift || 'day' };
          setSelectedMachine(machineWithShift);
          setShowMachineDialog(false);

          // After machine selection, create the batch and set up production flow
          if (!selectedProduct) return;

          setSubmitting(true);
          let batch: any = null;
          
          try {
            // Step 1: Check if batch already exists (from URL params or previous creation)
            // If batch exists, use it; otherwise create a new one
            if (currentBatchId) {
              // Batch already exists - load it and update with machine
              const { data: existingBatch, error: batchError } = await ProductionService.getBatchById(currentBatchId);
              
              if (batchError || !existingBatch) {
                toast({
                  title: 'Error',
                  description: batchError || 'Failed to load existing batch. Cannot start production.',
                  variant: 'destructive',
                });
                setSubmitting(false);
                return;
              }

              // Update batch with machine_id if not already set
              const existingMachineId = (existingBatch as any).machine_id;
              if (!existingMachineId || existingMachineId !== machine.id) {
                const { data: updatedBatch, error: updateError } = await ProductionService.updateBatch(currentBatchId, {
                  machine_id: machine.id,
                } as any);

                if (updateError || !updatedBatch) {
                  toast({
                    title: 'Error',
                    description: updateError || 'Failed to update batch with machine. Cannot start production.',
                    variant: 'destructive',
                  });
                  setSubmitting(false);
                  return;
                }

                batch = updatedBatch;
              } else {
                batch = existingBatch;
              }
            } else {
              // No existing batch - create a new one
              const batchData = {
                product_id: selectedProduct.id,
                planned_quantity: formData.planned_quantity,
                priority: formData.priority,
                completion_date: formData.completion_date || undefined,
                notes: formData.notes,
                machine_id: machine.id,
              };

              const { data: createdBatch, error: batchError } = await ProductionService.createBatch(batchData);

              if (batchError || !createdBatch) {
                toast({
                  title: 'Error',
                  description: batchError || 'Failed to create batch. Cannot start production.',
                  variant: 'destructive',
                });
                setSubmitting(false);
                return; // STOP - Don't continue if batch creation fails
              }

              batch = createdBatch;
              setCurrentBatchId(batch.id); // Store the new batch ID
            }

            // Step 2: ALWAYS ensure MaterialConsumption records exist and match consumedMaterials
            // This is CRITICAL - all data must be saved before proceeding
            console.log('📦 Starting material consumption save process...');
            console.log('📦 Consumed materials to save:', consumedMaterials.length);
            console.log('📦 Consumed materials data:', consumedMaterials.map(m => ({
              name: m.material_name,
              type: m.material_type,
              individual_product_ids: m.individual_product_ids?.length || 0,
              whole_product_count: m.whole_product_count,
              actual_consumed_quantity: m.actual_consumed_quantity,
            })));

            if (consumedMaterials.length === 0) {
              toast({
                title: 'Error',
                description: 'No materials added to production. Cannot start production without materials.',
                variant: 'destructive',
              });
              setSubmitting(false);
              return; // STOP - No materials means no production
            }

            // Check existing consumption records
            const { data: existingConsumption } = await ProductionService.getMaterialConsumption(batch.id);
            console.log('📦 Existing consumption records:', existingConsumption?.length || 0);
            const existingMaterialIds = new Set((existingConsumption || []).map((m: any) => m.material_id));
            
            // Validate that ALL consumed materials are saved
            const materialsToSave = consumedMaterials.filter(m => !existingMaterialIds.has(m.material_id));
            console.log('📦 Materials to save:', materialsToSave.length, materialsToSave.map(m => m.material_name));

            if (materialsToSave.length > 0) {
              // Create/update MaterialConsumption records for ALL consumed materials
              const materialErrors: string[] = [];
              const savedMaterials: string[] = [];

              for (const material of materialsToSave) {
                try {
                  console.log(`💾 Saving material: ${material.material_name}`, {
                    material_id: material.material_id,
                    material_type: material.material_type,
                    individual_product_ids: material.individual_product_ids?.length || 0,
                    whole_product_count: material.whole_product_count,
                    actual_consumed_quantity: material.actual_consumed_quantity,
                  });

                  // For products: quantity_used = whole_product_count, actual_consumed_quantity = actual fractional consumption
                  const quantityUsed = material.material_type === 'product' 
                    ? (material.whole_product_count || Math.ceil(material.actual_consumed_quantity || material.required_quantity || 0))
                    : (material.actual_consumed_quantity || material.required_quantity || 0);
                  
                  const actualConsumedQty = material.material_type === 'product'
                    ? (material.actual_consumed_quantity || material.required_quantity || 0)
                    : (material.actual_consumed_quantity || material.required_quantity || 0);

                  // For products, individual_product_ids are optional (can be empty for bulk products)
                  // Only validate if whole_product_count > 0 (meaning individual products are expected)
                  if (material.material_type === 'product' && material.whole_product_count > 0) {
                    if (!material.individual_product_ids || material.individual_product_ids.length === 0) {
                      console.warn(`⚠️ Product ${material.material_name} has whole_product_count=${material.whole_product_count} but no individual_product_ids`);
                      // Don't block - allow saving but log warning
                    }
                  }

                  const consumptionPayload = {
                    production_batch_id: batch.id,
                    material_id: material.material_id,
                    material_name: material.material_name,
                    material_type: material.material_type,
                    quantity_used: quantityUsed,
                    actual_consumed_quantity: actualConsumedQty,
                    unit: material.unit,
                    quantity_per_sqm: material.quantity_per_sqm,
                    individual_product_ids: material.individual_product_ids || [],
                    // For raw materials: set consumption_status to 'in_production' (will change to 'used' when wastage completes)
                    // For products: don't deduct (tracked via individual products)
                    consumption_status: material.material_type === 'raw_material' ? 'in_production' : undefined,
                    deduct_now: false, // Don't deduct immediately - will deduct when status changes to 'used'
                  };

                  console.log(`💾 Payload for ${material.material_name}:`, {
                    ...consumptionPayload,
                    individual_product_ids_count: consumptionPayload.individual_product_ids.length,
                  });

                  const { error: consumptionError, data: savedData } = await ProductionService.createMaterialConsumption(consumptionPayload);
                  
                  if (consumptionError) {
                    console.error(`❌ Error saving ${material.material_name}:`, consumptionError);
                    materialErrors.push(`${material.material_name}: ${consumptionError}`);
                  } else {
                    console.log(`✅ Saved ${material.material_name}:`, {
                      id: savedData?.id,
                      individual_product_ids_count: savedData?.individual_product_ids?.length || 0,
                      individual_product_ids: savedData?.individual_product_ids || [],
                    });
                    savedMaterials.push(material.material_name);
                    
                    // Verify individual_product_ids were actually saved
                    if (material.material_type === 'product' && material.individual_product_ids && material.individual_product_ids.length > 0) {
                      if (!savedData?.individual_product_ids || savedData.individual_product_ids.length === 0) {
                        console.error(`❌ WARNING: Individual products not saved in response for ${material.material_name}`);
                        console.error(`   Expected: ${material.individual_product_ids.length} products`);
                        console.error(`   Got: ${savedData?.individual_product_ids?.length || 0} products`);
                      }
                    }
                  }
                } catch (err) {
                  const errorMsg = err instanceof Error ? err.message : 'Unknown error';
                  console.error(`❌ Exception saving ${material.material_name}:`, err);
                  materialErrors.push(`${material.material_name}: ${errorMsg}`);
                }
              }
              
              // If ANY material consumption failed, show error and STOP
              if (materialErrors.length > 0) {
                console.error('❌ Material consumption errors:', materialErrors);
                toast({
                  title: 'Error',
                  description: `Failed to save materials: ${materialErrors.join(', ')}. Production not started.`,
                  variant: 'destructive',
                });
                setSubmitting(false);
                return; // STOP - Don't continue if material consumption fails
              }
            } else {
              console.log('✅ All materials already saved, skipping creation');
            }

            // Step 2.5: VERIFY all materials are saved - CRITICAL CHECK
            // Wait a bit to ensure database has updated
            await new Promise(resolve => setTimeout(resolve, 500));
            
            console.log('🔍 Verifying all materials are saved...');
            const { data: verifyConsumption } = await ProductionService.getMaterialConsumption(batch.id);
            console.log('🔍 Verified consumption records:', verifyConsumption?.length || 0);
            console.log('🔍 Verified records:', verifyConsumption?.map((m: any) => ({
              id: m.id,
              name: m.material_name,
              type: m.material_type,
              material_id: m.material_id,
              individual_product_ids: m.individual_product_ids?.length || 0,
              individual_product_ids_array: m.individual_product_ids || [],
            })));

            const verifiedMaterialIds = new Set((verifyConsumption || []).map((m: any) => m.material_id));
            const allMaterialsSaved = consumedMaterials.every(m => verifiedMaterialIds.has(m.material_id));

            if (!allMaterialsSaved) {
              const missingIds = consumedMaterials
                .filter(m => !verifiedMaterialIds.has(m.material_id))
                .map(m => m.material_name);
              
              console.error('❌ Missing materials in verification:', missingIds);
              toast({
                title: 'Error',
                description: `Failed to verify material consumption. Missing: ${missingIds.join(', ')}. Cannot proceed to machine stage.`,
                variant: 'destructive',
              });
              setSubmitting(false);
              return; // STOP - Don't continue if verification fails
            }

            // Verify individual_product_ids are saved for products (only if they were provided)
            const productMaterials = consumedMaterials.filter(m => m.material_type === 'product');
            console.log('🔍 Verifying product materials:', productMaterials.length);
            
            for (const material of productMaterials) {
              const savedRecord = verifyConsumption?.find((m: any) => m.material_id === material.material_id);
              console.log(`🔍 Checking ${material.material_name}:`, {
                savedRecord: !!savedRecord,
                savedRecordId: savedRecord?.id,
                original_individual_ids: material.individual_product_ids?.length || 0,
                original_individual_ids_array: material.individual_product_ids || [],
                saved_individual_ids: savedRecord?.individual_product_ids?.length || 0,
                saved_individual_ids_array: savedRecord?.individual_product_ids || [],
              });

              // Only require individual_product_ids if they were provided in consumedMaterials
              if (material.individual_product_ids && material.individual_product_ids.length > 0) {
                if (!savedRecord) {
                  console.error(`❌ Material consumption record not found for ${material.material_name}`);
                  toast({
                    title: 'Error',
                    description: `Material consumption record not found for ${material.material_name}. Cannot proceed to machine stage.`,
                    variant: 'destructive',
                  });
                  setSubmitting(false);
                  return;
                }
                
                if (!savedRecord.individual_product_ids || savedRecord.individual_product_ids.length === 0) {
                  console.error(`❌ Individual products not saved for ${material.material_name}`);
                  console.error(`   Expected: ${material.individual_product_ids.length} products`);
                  console.error(`   Expected IDs: ${material.individual_product_ids.join(', ')}`);
                  console.error(`   Got: ${savedRecord.individual_product_ids?.length || 0} products`);
                  console.error(`   Saved record:`, savedRecord);
                  
                  toast({
                    title: 'Error',
                    description: `Individual products not saved for ${material.material_name}. Please check console for details. Cannot proceed to machine stage.`,
                    variant: 'destructive',
                  });
                  setSubmitting(false);
                  return; // STOP - Individual products must be saved if they were provided
                } else if (savedRecord.individual_product_ids.length !== material.individual_product_ids.length) {
                  console.warn(`⚠️ Individual products count mismatch for ${material.material_name}`);
                  console.warn(`   Expected: ${material.individual_product_ids.length} products`);
                  console.warn(`   Got: ${savedRecord.individual_product_ids.length} products`);
                  // Don't block - just warn
                } else {
                  console.log(`✅ Individual products saved for ${material.material_name}: ${savedRecord.individual_product_ids.length} products`);
                }
              } else {
                console.log(`ℹ️ No individual products required for ${material.material_name} (bulk product or not selected)`);
              }
            }

            console.log('✅ All materials verified and saved to MaterialConsumption');

            // Step 3: Check if production flow already exists, if not create it
            let flow: any = null;
            const { data: existingFlow } = await ProductionService.getProductionFlowByBatchId(batch.id);
            
            if (existingFlow) {
              flow = existingFlow;
              console.log('✅ Production flow already exists, using existing flow');
            } else {
              // Create new flow if it doesn't exist
              const { data: createdFlow, error: flowError } = await ProductionService.createProductionFlow({
                production_batch_id: batch.id,
                flow_name: `Production Flow for ${selectedProduct.name}`,
                description: `Batch ${batch.batch_number}`,
              });

              if (flowError || !createdFlow) {
                toast({
                  title: 'Error',
                  description: flowError || 'Failed to create production flow. Production not started.',
                  variant: 'destructive',
                });
                setSubmitting(false);
                return; // STOP - Don't continue if flow creation fails
              }
              flow = createdFlow;
            }

            // Step 4: Check if machine step already exists, if not create it
            try {
              const { data: existingSteps } = await ProductionService.getProductionFlowSteps(flow.id);
              const hasMachineStep = existingSteps && existingSteps.some((step: any) => step.step_type === 'machine_operation');
              
              if (!hasMachineStep) {
                // Only create step if it doesn't exist
                const user = await AuthService.getCurrentUser();
                const now = new Date().toISOString();
                const { error: stepError } = await ProductionService.createProductionFlowStep({
                  production_flow_id: flow.id,
                  step_number: 1,
                  step_name: 'Machine Operation',
                  step_type: 'machine_operation',
                  machine_id: machine.id,
                  machine_name: machine.machine_name,
                  description: `Production on ${machine.machine_name} - ${machine.shift || 'day'} shift`,
                  inspector: user?.full_name || user?.email || 'Unknown',
                  shift: machine.shift || 'day',
                  start_time: now, // Mark when we transition from planning to machine stage
                  status: 'in_progress', // Machine stage starts immediately
                });

                if (stepError) {
                  toast({
                    title: 'Error',
                    description: stepError || 'Failed to create machine step. Production not started.',
                    variant: 'destructive',
                  });
                  setSubmitting(false);
                  return; // STOP - Don't continue if step creation fails
                }
              } else {
                console.log('✅ Machine step already exists, skipping creation');
              }
            } catch (err) {
              const errorMsg = err instanceof Error ? err.message : 'Unknown error';
              toast({
                title: 'Error',
                description: `Failed to check/create machine step: ${errorMsg}. Production not started.`,
                variant: 'destructive',
              });
              setSubmitting(false);
              return; // STOP - Don't continue if step creation fails
            }

            // Step 5: Update batch status to 'in_production' - CRITICAL: Must succeed before navigation
            const { data: updatedBatch, error: statusError } = await ProductionService.updateBatch(batch.id, {
              status: 'in_production',
            });

            if (statusError || !updatedBatch) {
              toast({
                title: 'Error',
                description: statusError || 'Failed to update batch status. Production not started. Cannot navigate to machine stage.',
                variant: 'destructive',
              });
              console.error('Batch status update failed:', statusError);
              setSubmitting(false);
              return; // STOP - Don't navigate if status update failed
            }

            // Verify the status was actually updated
            if (updatedBatch.status !== 'in_production' && updatedBatch.status !== 'in_progress') {
              toast({
                title: 'Error',
                description: `Batch status was not updated correctly. Expected 'in_production', got '${updatedBatch.status}'. Cannot navigate to machine stage.`,
                variant: 'destructive',
              });
              console.error('Batch status mismatch. Expected in_production, got:', updatedBatch.status);
              setSubmitting(false);
              return; // STOP - Don't navigate if status is wrong
            }

            // ALL STEPS SUCCEEDED - Now safe to proceed
            toast({
              title: 'Success',
              description: `Production started with machine: ${machine.machine_name}`,
            });

            // Delete draft state after successful batch creation
            if (selectedProduct) {
              try {
                await ProductionService.deleteDraftPlanningState(selectedProduct.id);
              } catch (err) {
                console.warn('Failed to delete draft state (non-critical):', err);
              }
            }

            // Navigate to machine stage ONLY if ALL steps succeeded
            navigate(`/production/${batch.id}/machine`);
          } catch (error) {
            console.error('Error creating batch:', error);
            const errorMsg = error instanceof Error ? error.message : 'Unknown error';
            toast({
              title: 'Error',
              description: `Failed to start production: ${errorMsg}. Cannot navigate to machine stage.`,
              variant: 'destructive',
            });
          } finally {
            setSubmitting(false);
          }
        }}
        selectedMachineId={selectedMachine?.id}
      />
    </Layout>
  );
}
