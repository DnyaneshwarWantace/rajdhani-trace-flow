import { useState, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Loader2, Save, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import MaterialSelectionDialog from '@/components/production/planning/MaterialSelectionDialog';

export default function PlanningStage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showMaterialDialog, setShowMaterialDialog] = useState(false);
  const [formData, setFormData] = useState({
    planned_quantity: 0,
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
    completion_date: '',
    notes: '',
  });
  const [materials, setMaterials] = useState<any[]>([]); // Recipe materials (top section)
  const [consumedMaterials, setConsumedMaterials] = useState<any[]>([]); // Confirmed materials (bottom section)
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [recipeModified, setRecipeModified] = useState(false);
  const [draftSaveTimeout, setDraftSaveTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);

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

  // Debounced draft save whenever materials or form data change
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
  }, [materials, formData, selectedProduct]);

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
      setFormData({
        planned_quantity: batch.planned_quantity,
        priority: batch.priority as 'low' | 'medium' | 'high' | 'urgent',
        completion_date: batch.completion_date || '',
        notes: batch.notes || '',
      });
      loadRecipeAndCalculate(product, batch.planned_quantity);
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
          planned_quantity: draft.form_data.planned_quantity || 0,
          priority: draft.form_data.priority || 'medium',
          completion_date: draft.form_data.completion_date || '',
          notes: draft.form_data.notes || '',
        });
      }
      if (draft?.materials) {
        setMaterials(draft.materials);
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

              // For products: always count in rolls, not SQM
              unit = 'rolls';

              // For products: quantity_per_sqm represents pieces needed per SQM of parent
              // So required quantity is quantity_per_sqm * totalSQM of parent
              requiredQuantity = recipeMaterial.quantity_per_sqm * totalSQM;

              // Available quantity is the count of products
              availableQuantity = materialProduct.individual_stock_tracking
                ? materialProduct.current_stock || materialProduct.individual_products_count || 0
                : materialProduct.base_quantity || materialProduct.current_stock || 0;
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

          return {
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
      });
    } catch (error) {
      console.error('Error saving draft state to backend:', error);
    }
  };

  const updateRecipeInDatabase = async (updatedMaterials: any[]) => {
    if (!recipe || !selectedProduct) return;

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

      await RecipeService.updateRecipe(recipe.id, { materials: materialsPayload });

      // Update local state with a fully-typed RecipeMaterial[]
      const updatedRecipe: Recipe = {
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

      setRecipe(updatedRecipe);

      toast({
        title: 'Recipe Updated',
        description: 'Recipe has been automatically updated',
      });
    } catch (error) {
      console.error('Error updating recipe:', error);
      toast({
        title: 'Error',
        description: 'Failed to update recipe automatically',
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

            // Get available quantity for product
            availableQuantity = childProduct.individual_stock_tracking
              ? childProduct.current_stock || childProduct.individual_products_count || 0
              : childProduct.base_quantity || childProduct.current_stock || 0;
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

        return {
          ...m,
          quantity_per_sqm: quantityPerSqm,
          unit,
          required_quantity: requiredQuantity,
          available_quantity: availableQuantity,
          status,
          shortage,
        };
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
      setConsumedMaterials([...consumedMaterials, ...materials]);

      // 4. Clear materials from requirements section
      setMaterials([]);

      toast({
        title: 'Success',
        description: `${materials.length} material(s) added to production${
          insufficientMaterials.length > 0
            ? '. Note: Some materials have insufficient stock.'
            : ''
        }`,
      });
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
            unit={selectedProduct.unit || 'SQM'}
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
            onAddMaterial={() => setShowMaterialDialog(true)}
            onRemoveMaterial={handleRemoveMaterial}
            onUpdateQuantity={handleUpdateQuantity}
             onSelectIndividualProducts={() => {
              toast({
                title: 'Coming Soon',
                description: 'Individual product selection will be available soon',
              });
            }}
          />

          {/* Add to Production Button */}
          <div className="flex justify-end">
            <Button
              onClick={handleAddToProduction}
              disabled={submitting || formData.planned_quantity <= 0 || materials.length === 0}
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
                onRemoveMaterial={(materialId) => {
                  const updatedConsumed = consumedMaterials.filter((m) => m.material_id !== materialId);
                  setConsumedMaterials(updatedConsumed);
                  toast({
                    title: 'Material Removed',
                    description: 'Material removed from production',
                  });
                }}
              />

              {/* Start Production Flow Button */}
              <div className="flex justify-end gap-4">
                {consumedMaterials.some((m) => m.status === 'low' || m.status === 'unavailable') && (
                  <div className="flex items-center gap-2 text-red-600">
                    <AlertCircle className="w-5 h-5" />
                    <span className="text-sm font-medium">
                      Cannot start production - insufficient materials
                    </span>
                  </div>
                )}
                <Button
                  onClick={async () => {
                    if (!selectedProduct) return;

                    setSubmitting(true);
                    try {
                      const batchData = {
                        product_id: selectedProduct.id,
                        planned_quantity: formData.planned_quantity,
                        priority: formData.priority,
                        completion_date: formData.completion_date || undefined,
                        notes: formData.notes,
                      };

                      const { error } = await ProductionService.createBatch(batchData);

                      if (error) {
                        toast({
                          title: 'Error',
                          description: error,
                          variant: 'destructive',
                        });
                        return;
                      }

                      toast({
                        title: 'Success',
                        description: 'Production batch created successfully',
                      });

                      navigate('/production');
                    } catch (error) {
                      console.error('Error creating batch:', error);
                      toast({
                        title: 'Error',
                        description: 'Failed to create production batch',
                        variant: 'destructive',
                      });
                    } finally {
                      setSubmitting(false);
                    }
                  }}
                  disabled={
                    submitting ||
                    consumedMaterials.length === 0 ||
                    consumedMaterials.some((m) => m.status === 'low' || m.status === 'unavailable')
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
    </Layout>
  );
}
