import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Loader2, Package, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProductionService, type ProductionBatch } from '@/services/productionService';
import { ProductService } from '@/services/productService';
import { IndividualProductService } from '@/services/individualProductService';
import { WasteService } from '@/services/wasteService';
import { useToast } from '@/hooks/use-toast';
import { getApiUrl } from '@/utils/apiConfig';
import WastageStageHeader from '@/components/production/wastage/WastageStageHeader';
import ConsumedMaterialsDisplay from '@/components/production/machine/ConsumedMaterialsDisplay';
import WastageManagement from '@/components/production/wastage/WastageManagement';
import ProductionStageProgress from '@/components/production/planning/ProductionStageProgress';
import ExpectedProductDetails from '@/components/production/planning/ExpectedProductDetails';
import ProductionOverviewStats from '@/components/production/planning/ProductionOverviewStats';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Product } from '@/types/product';
import type { IndividualProduct } from '@/types/product';

export default function ProductionWastage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [batch, setBatch] = useState<ProductionBatch | null>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [consumedMaterials, setConsumedMaterials] = useState<any[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [noWastageMaterials, setNoWastageMaterials] = useState<Set<string>>(new Set());
  const [wasteItems, setWasteItems] = useState<any[]>([]);
  const [canNavigate, setCanNavigate] = useState(false);

  useEffect(() => {
    if (id) {
      console.log('Loading wastage stage data for batch:', id);
      loadData();
    }
  }, [id, refreshKey]);

  const loadData = async () => {
    try {
      setLoading(true);
      console.log('🔄 Loading wastage stage data...');
      
      // Load batch
      const { data: batchData } = await ProductionService.getBatchById(id!);
      if (batchData) {
        console.log('✅ Batch loaded:', batchData.batch_number);
        // Fetch product details
        let enrichedBatch = { ...batchData };
        if (batchData.product_id) {
          try {
            const productData = await ProductService.getProductById(batchData.product_id);
            enrichedBatch.product_name = productData.name;
            setProduct(productData);
          } catch (error) {
            console.error('Error fetching product:', error);
          }
        }
        
        setBatch(enrichedBatch);
        
        // Load material consumption
        const { data: consumptionData } = await ProductionService.getMaterialConsumption(id!);
        console.log('📦 Material consumption data:', consumptionData?.length || 0, 'items');
        if (consumptionData && consumptionData.length > 0) {
          // Convert to consumed materials format
          const consumed = consumptionData.map((m: any) => ({
            material_id: m.material_id,
            material_name: m.material_name,
            material_type: m.material_type,
            quantity_per_sqm: m.quantity_per_sqm || 0,
            required_quantity: m.quantity_used || m.required_quantity || 0,
            actual_consumed_quantity: m.actual_consumed_quantity || m.quantity_used || 0,
            whole_product_count: m.whole_product_count || m.quantity_used || 0,
            unit: m.unit,
            individual_product_ids: m.individual_product_ids || [],
            individual_products: m.individual_products || [], // Full individual product details
          }));
          console.log('✅ Consumed materials set:', consumed.length);
          setConsumedMaterials(consumed);
        } else {
          // Try to load from PlanningDraftState if no consumption records yet
          try {
            const { data: draftState } = await ProductionService.getDraftPlanningState(batchData.product_id);
            if (draftState?.consumed_materials && draftState.consumed_materials.length > 0) {
              setConsumedMaterials(draftState.consumed_materials);
            }
          } catch (error) {
            console.error('Error loading draft state:', error);
          }
        }

        // Load waste items to check which materials have wastage
        try {
          const allWaste = await WasteService.getAllWaste();
          const batchWaste = allWaste.filter(
            (item) => item.production_batch_id === id || item.batch_id === id
          );
          setWasteItems(batchWaste);
          console.log('✅ Waste items loaded:', batchWaste.length);
        } catch (error) {
          console.error('Error loading waste items:', error);
          setWasteItems([]);
        }
      }
    } catch (error) {
      console.error('Error loading wastage stage data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load production data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshKey(prev => prev + 1);
    // Reload waste items to check wastage status
    try {
      const allWaste = await WasteService.getAllWaste();
      const batchWaste = allWaste.filter(
        (item) => item.production_batch_id === id || item.batch_id === id
      );
      setWasteItems(batchWaste);
      console.log('✅ Waste items reloaded:', batchWaste.length);
    } catch (error) {
      console.error('Error reloading waste items:', error);
    }
  };

  // Calculate wastage potential for a product material
  const getProductWastagePotential = (material: any) => {
    const isProduct = material.material_type === 'product' || 
                     (material.material_id && material.material_id.startsWith('PRO-'));
    
    if (!isProduct) return null;
    
    let wholeCount = material.whole_product_count;
    let consumed = material.actual_consumed_quantity || material.required_quantity || 0;
    
    if (!wholeCount && consumed > 0) {
      wholeCount = Math.ceil(consumed);
    }
    
    if (!wholeCount && material.quantity_used) {
      wholeCount = material.quantity_used;
    }
    
    if (!wholeCount || !consumed) return null;
    
    const wastage = wholeCount - consumed;
    if (wastage <= 0) return null;
    
    return {
      quantity: wastage,
      wholeCount: Math.ceil(wastage),
      hasWastage: true,
    };
  };

  // Check if wastage exists for a material
  const hasWastageForMaterial = (materialId: string) => {
    // Check both material_id and product_id (for product materials, material_id might be the product_id)
    const hasWastage = wasteItems.some((waste) => 
      waste.material_id === materialId || 
      waste.product_id === materialId ||
      (waste.material_type === 'product' && waste.material_id === materialId)
    );
    console.log(`🔍 Checking wastage for material ${materialId}:`, {
      hasWastage,
      wasteItemsCount: wasteItems.length,
      matchingWaste: wasteItems.filter(w => w.material_id === materialId || w.product_id === materialId)
    });
    return hasWastage;
  };

  // Check if material has "No Wastage" selected
  const hasNoWastageSelected = (materialId: string) => {
    return noWastageMaterials.has(materialId);
  };

  // Get product materials with wastage potential
  const getProductMaterialsWithWastagePotential = () => {
    return consumedMaterials.filter((m) => {
      const isProduct = m.material_type === 'product' || 
                       (m.material_id && m.material_id.startsWith('PRO-'));
      if (!isProduct) return false;
      const wastagePotential = getProductWastagePotential(m);
      return wastagePotential !== null;
    });
  };

  // Check if all product materials with wastage potential are handled
  const canNavigateToIndividualProducts = () => {
    const productMaterialsWithWastage = getProductMaterialsWithWastagePotential();
    
    console.log('🔍 Checking if can navigate to individual products:', {
      productMaterialsWithWastageCount: productMaterialsWithWastage.length,
      wasteItemsCount: wasteItems.length,
      wasteItems: wasteItems.map(w => ({ 
        id: w.id,
        material_id: w.material_id, 
        product_id: w.product_id, 
        material_name: w.material_name,
        material_type: w.material_type
      }))
    });
    
    // If no product materials with wastage potential, allow navigation
    if (productMaterialsWithWastage.length === 0) {
      console.log('✅ No product materials with wastage potential - allowing navigation');
      return true;
    }

    // Check if all product materials with wastage potential have either:
    // 1. Wastage recorded, OR
    // 2. "No Wastage" selected
    const allHandled = productMaterialsWithWastage.every((material) => {
      const hasWastage = hasWastageForMaterial(material.material_id);
      const noWastage = hasNoWastageSelected(material.material_id);
      const isHandled = hasWastage || noWastage;
      console.log(`  Material ${material.material_name} (${material.material_id}): hasWastage=${hasWastage}, noWastage=${noWastage}, isHandled=${isHandled}`);
      return isHandled;
    });

    console.log(`✅ Can navigate: ${allHandled}`);
    return allHandled;
  };

  // Update canNavigate state whenever wasteItems or noWastageMaterials change
  useEffect(() => {
    const canNav = canNavigateToIndividualProducts();
    setCanNavigate(canNav);
  }, [wasteItems, noWastageMaterials, consumedMaterials]);

  const handleMarkNoWastage = (materialId: string) => {
    setNoWastageMaterials(prev => new Set(prev).add(materialId));
    toast({
      title: 'No Wastage Selected',
      description: 'This material has been marked as having no wastage',
    });
  };

  const handleNavigateToIndividualProducts = async () => {
    if (!batch || !batch.product_id) {
      toast({
        title: 'Error',
        description: 'Batch or product information is missing',
        variant: 'destructive',
      });
      return;
    }

    try {
      setUpdatingStatus(true);
      console.log('🔄 Starting status update before navigation...');

      // First, check if there are any individual products in "in_production" status
      // that need to be updated (these are products used as materials)
      const { products: allProducts } = await IndividualProductService.getIndividualProducts({
        product_id: batch.product_id,
      });

      // Get material consumption records to find which individual products are used as materials
      const { data: consumptionData } = await ProductionService.getMaterialConsumption(id!);
      
      // Collect all individual product IDs that are used as materials in this batch
      const usedProductIds = new Set<string>();
      if (consumptionData && consumptionData.length > 0) {
        consumptionData.forEach((m: any) => {
          if (m.material_type === 'product' && m.individual_product_ids && Array.isArray(m.individual_product_ids)) {
            m.individual_product_ids.forEach((id: string) => usedProductIds.add(id));
          }
        });
      }

      // Filter products that are used as materials and still in "in_production"
      const productsToUpdate = allProducts.filter((p: IndividualProduct) => {
        const isUsedAsMaterial = usedProductIds.has(p.id);
        const isInProduction = p.status === 'in_production';
        return isUsedAsMaterial && isInProduction;
      });

      console.log(`🔍 Found ${productsToUpdate.length} individual products in "in_production" that need to be updated to "used"`);

      // Update material consumption status from 'in_production' to 'used' (both raw materials and products)
      // This will automatically update individual products via backend logic
      console.log('🔄 Updating material consumption status to "used"...');
      let statusUpdateSuccess = false;
      let updatedProductCount = 0;
      
      try {
        if (consumptionData && consumptionData.length > 0) {
          // Update both raw materials and products
          const materialsToUpdate = consumptionData.filter((m: any) => 
            m.consumption_status === 'in_production'
          );
          
          if (materialsToUpdate.length > 0) {
            console.log(`🔄 Updating ${materialsToUpdate.length} material consumption records to "used"...`);
            
            const API_URL = getApiUrl();
            const token = localStorage.getItem('auth_token');
            
            const updatePromises = materialsToUpdate.map(async (consumption: any) => {
              try {
                const response = await fetch(`${API_URL}/production/material-consumption/${consumption.id}`, {
                  method: 'PUT',
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                  },
                  body: JSON.stringify({
                    consumption_status: 'used'
                  }),
                });
                
                if (response.ok) {
                  console.log(`✅ Updated ${consumption.material_name} (${consumption.material_type}) consumption status to "used"`);
                  return true;
                } else {
                  const error = await response.json();
                  console.error(`❌ Error updating ${consumption.material_name}:`, error);
                  return false;
                }
              } catch (error) {
                console.error(`❌ Error updating ${consumption.material_name}:`, error);
                return false;
              }
            });
            
            const results = await Promise.all(updatePromises);
            const successCount = results.filter(r => r === true).length;
            statusUpdateSuccess = successCount > 0;
            
            console.log(`✅ Updated ${successCount}/${materialsToUpdate.length} material consumption records to "used"`);
            
            if (successCount > 0) {
              // Wait a moment for backend to process individual product updates
              await new Promise(resolve => setTimeout(resolve, 500));
              
              // Verify that individual products were actually updated
              const { products: updatedProducts } = await IndividualProductService.getIndividualProducts({
                product_id: batch.product_id,
              });
              
              const stillInProduction = updatedProducts.filter((p: IndividualProduct) => 
                usedProductIds.has(p.id) && p.status === 'in_production'
              );
              
              updatedProductCount = productsToUpdate.length - stillInProduction.length;
              
              if (stillInProduction.length > 0) {
                console.warn(`⚠️ ${stillInProduction.length} individual products are still in "in_production" status`);
                toast({
                  title: 'Warning',
                  description: `${stillInProduction.length} product(s) are still in "in_production" status. Please try again.`,
                  variant: 'destructive',
                });
                setUpdatingStatus(false);
                return; // Don't navigate if status wasn't updated
              }
              
              toast({
                title: 'Status Updated',
                description: `Updated ${updatedProductCount} product(s) from "in_production" to "used"`,
              });
            }
          } else {
            console.log('ℹ️ No materials with "in_production" status found to update');
            // If there are no materials to update, check if there are any products that need updating
            if (productsToUpdate.length > 0) {
              console.warn(`⚠️ Found ${productsToUpdate.length} products in "in_production" but no material consumption records to update`);
              toast({
                title: 'Warning',
                description: 'Some products are still in "in_production" status. Please complete wastage first.',
                variant: 'destructive',
              });
              setUpdatingStatus(false);
              return;
            }
          }
        }
      } catch (error) {
        console.error('❌ Error updating material consumption status:', error);
        toast({
          title: 'Error',
          description: 'Failed to update material consumption status',
          variant: 'destructive',
        });
        setUpdatingStatus(false);
        return; // Don't navigate if update fails
      }

      // Validate that status was actually changed before allowing navigation
      if (productsToUpdate.length > 0 && !statusUpdateSuccess) {
        toast({
          title: 'Error',
          description: 'Failed to update product status. Cannot proceed to individual products stage.',
          variant: 'destructive',
        });
        setUpdatingStatus(false);
        return;
      }

      // Mark wastage stage as completed before navigating
      console.log('✅ Marking wastage stage as completed...');
      try {
        await ProductionService.updateBatch(id!, {
          wastage_stage: {
            status: 'completed',
            completed_at: new Date().toISOString(),
            completed_by: 'User', // You can get this from auth context
          },
        });
        console.log('✅ Wastage stage marked as completed');
      } catch (error) {
        console.error('❌ Error marking wastage stage as completed:', error);
        // Continue with navigation even if this fails
      }

      // Navigate to individual products stage
      console.log('✅ Navigation to individual products stage...');
      navigate(`/production/${id}/individual-products`);
    } catch (error) {
      console.error('❌ Error updating product statuses:', error);
      toast({
        title: 'Error',
        description: 'Failed to update product statuses. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setUpdatingStatus(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      </Layout>
    );
  }

  if (!batch) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-gray-600">Batch not found</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <WastageStageHeader
          batch={batch}
          onBack={() => navigate(`/production/${id}/machine`)}
          onIndividualProducts={handleNavigateToIndividualProducts}
          onRefresh={handleRefresh}
        />

        {/* Production Progress Tracker */}
        <ProductionStageProgress currentStage="wastage" />

        {/* Product Details */}
        {product && (
          <>
            <ProductionOverviewStats
              targetQuantity={batch?.planned_quantity || 0}
              unit={product.count_unit || 'rolls'}
              materialsUsed={consumedMaterials.length}
              expectedLength={product.length ? parseFloat(product.length) : undefined}
              expectedWidth={product.width ? parseFloat(product.width) : undefined}
              expectedWeight={product.weight ? parseFloat(product.weight) : undefined}
            />
            <ExpectedProductDetails product={product} />
          </>
        )}

        {/* Consumed Materials */}
        <ConsumedMaterialsDisplay
          materials={consumedMaterials}
          product={product}
          targetQuantity={batch?.planned_quantity || 0}
        />

        {/* Wastage Management */}
        <WastageManagement
          batchId={id!}
          consumedMaterials={consumedMaterials}
          onRefresh={handleRefresh}
        />

        {/* Product Materials Wastage Status */}
        {(() => {
          const productMaterialsWithWastage = getProductMaterialsWithWastagePotential();
          if (productMaterialsWithWastage.length === 0) {
            return null;
          }

          return (
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4">Product Materials Wastage Status</h3>
                <div className="space-y-3">
                  {productMaterialsWithWastage.map((material) => {
                    const hasWastage = hasWastageForMaterial(material.material_id);
                    const noWastage = hasNoWastageSelected(material.material_id);
                    const wastagePotential = getProductWastagePotential(material);
                    const isHandled = hasWastage || noWastage;

                    return (
                      <div
                        key={material.material_id}
                        className={`p-4 border rounded-lg ${
                          isHandled ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {isHandled ? (
                              <CheckCircle className="w-5 h-5 text-green-600" />
                            ) : (
                              <XCircle className="w-5 h-5 text-yellow-600" />
                            )}
                            <div>
                              <h4 className="font-semibold text-gray-900">{material.material_name}</h4>
                              {wastagePotential && (
                                <p className="text-sm text-gray-600">
                                  Potential wastage: {wastagePotential.wholeCount} {material.unit}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {hasWastage && (
                              <Badge className="bg-green-100 text-green-700">Wastage Recorded</Badge>
                            )}
                            {noWastage && (
                              <Badge className="bg-blue-100 text-blue-700">No Wastage</Badge>
                            )}
                            {!isHandled && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleMarkNoWastage(material.material_id)}
                                className="text-blue-600 border-blue-300 hover:bg-blue-50"
                              >
                                Mark No Wastage
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {!canNavigateToIndividualProducts() && (
                  <div className="mt-4 p-3 bg-yellow-100 border border-yellow-300 rounded-lg">
                    <p className="text-sm text-yellow-800">
                      ⚠️ Please select wastage or mark "No Wastage" for all product materials before proceeding.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })()}

        {/* Individual Products Button at Bottom */}
        <div className="flex justify-end mt-6">
          <Button
            onClick={handleNavigateToIndividualProducts}
            className="bg-purple-600 hover:bg-purple-700 text-white"
            size="lg"
            disabled={updatingStatus || !canNavigate}
          >
            {updatingStatus ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Updating Status...
              </>
            ) : (
              <>
                <Package className="w-4 h-4 mr-2" />
                Individual Products Stage
              </>
            )}
          </Button>
        </div>
      </div>
    </Layout>
  );
}
