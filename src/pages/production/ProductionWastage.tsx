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

        // CRITICAL FIX: Fix stage statuses if inconsistent
        const planningStageStatus = batchData.planning_stage?.status;
        const machineStageStatus = batchData.machine_stage?.status;
        const wastageStageStatus = batchData.wastage_stage?.status;

        let needsUpdate = false;
        const updateData: any = {};

        // Fix planning_stage if we're past it
        if (planningStageStatus !== 'completed' && (machineStageStatus || wastageStageStatus === 'in_progress' || wastageStageStatus === 'completed')) {
          console.log('⚠️ Planning stage is not marked as completed, but we are past it. Fixing planning_stage status...');
          updateData.planning_stage = {
            status: 'completed',
            completed_at: new Date().toISOString(),
            completed_by: 'System',
          };
          needsUpdate = true;
        }

        // Fix machine_stage if we're on wastage but machine is not completed
        if (machineStageStatus !== 'completed' && (wastageStageStatus === 'in_progress' || wastageStageStatus === 'completed')) {
          console.log('⚠️ Machine stage is not marked as completed, but wastage stage is active. Fixing machine_stage status...');
          updateData.machine_stage = {
            status: 'completed',
            completed_at: new Date().toISOString(),
            completed_by: 'System',
          };
          needsUpdate = true;
        }

        if (needsUpdate) {
          try {
            await ProductionService.updateBatch(id!, updateData);
            console.log('✅ Stage statuses fixed');
            // Reload the batch to get updated data
            const { data: updatedBatchData } = await ProductionService.getBatchById(id!);
            if (updatedBatchData) {
              Object.assign(batchData, updatedBatchData);
            }
          } catch (error) {
            console.error('❌ Error fixing stage statuses:', error);
          }
        }

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

      // Get material consumption records to find which individual products are used as materials
      const { data: consumptionData } = await ProductionService.getMaterialConsumption(id!);
      
      // Collect all individual product IDs that are used as materials in this batch
      const usedProductIds = new Set<string>();
      const materialProductIds = new Set<string>(); // Track which material products we need to query
      
      if (consumptionData && consumptionData.length > 0) {
        consumptionData.forEach((m: any) => {
          if (m.material_type === 'product' && m.individual_product_ids && Array.isArray(m.individual_product_ids)) {
            m.individual_product_ids.forEach((id: string) => usedProductIds.add(id));
            // Track the material product ID so we can fetch its individual products
            if (m.material_id) {
              materialProductIds.add(m.material_id);
            }
          }
        });
      }

      // CRITICAL FIX: Fetch individual products from EACH material product, not the batch product
      // Individual products used as materials belong to the material product, not the batch product
      const allProducts: IndividualProduct[] = [];
      if (materialProductIds.size > 0) {
        console.log(`🔍 Fetching individual products from ${materialProductIds.size} material product(s):`, Array.from(materialProductIds));
        for (const materialProductId of materialProductIds) {
          try {
            const { products } = await IndividualProductService.getIndividualProducts({
              product_id: materialProductId,
            });
            allProducts.push(...products);
            console.log(`✅ Found ${products.length} individual products for material product ${materialProductId}`);
          } catch (error) {
            console.error(`❌ Error fetching individual products for material ${materialProductId}:`, error);
          }
        }
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
          // First, fetch the actual consumption records to get their IDs
          // The summary doesn't include IDs, so we need to fetch the actual records
          const API_URL = getApiUrl();
          const token = localStorage.getItem('auth_token');
          
          // Fetch actual consumption records for this batch
          const consumptionRecordsResponse = await fetch(
            `${API_URL}/material-consumption?production_batch_id=${id}`,
            {
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
            }
          );
          
          let actualConsumptionRecords: any[] = [];
          if (consumptionRecordsResponse.ok) {
            const recordsData = await consumptionRecordsResponse.json();
            actualConsumptionRecords = recordsData.data || [];
            console.log(`📦 Fetched ${actualConsumptionRecords.length} actual consumption records with IDs`);
          }
          
          // Update materials that:
          // 1. Have consumption_status === 'in_production' (raw materials), OR
          // 2. Are product-type materials with individual products in 'in_production' status
          const materialsToUpdate = consumptionData.filter((m: any) => {
            // For raw materials: check consumption_status
            if (m.material_type === 'raw_material' && m.consumption_status === 'in_production') {
              return true;
            }
            // For products: ALWAYS update if they have individual_product_ids
            // Products don't use consumption_status the same way - they track via individual product statuses
            // The backend will check the actual individual product statuses and update them
            if (m.material_type === 'product' && m.individual_product_ids && m.individual_product_ids.length > 0) {
              // Always update product-type materials if they have individual_product_ids
              // The backend will handle checking the actual status and updating accordingly
              return true; // Always update product-type materials - backend will verify status
            }
            return false;
          });
          
          if (materialsToUpdate.length > 0) {
            console.log(`🔄 Updating ${materialsToUpdate.length} material consumption records to "used"...`);
            
            const updatePromises = materialsToUpdate.map(async (material: any) => {
              try {
                // Find the actual consumption record(s) for this material
                const recordsToUpdate = actualConsumptionRecords.filter((record: any) => 
                  record.material_id === material.material_id && 
                  record.production_batch_id === id &&
                  record.status === 'active'
                );
                
                if (recordsToUpdate.length === 0) {
                  console.warn(`⚠️ No consumption records found for material ${material.material_name} (${material.material_id})`);
                  return false;
                }
                
                // Update all records for this material
                const recordUpdatePromises = recordsToUpdate.map(async (record: any) => {
                  try {
                    const response = await fetch(`${API_URL}/material-consumption/${record.id}`, {
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
                      console.log(`✅ Updated consumption record ${record.id} for ${material.material_name} (${material.material_type}) to "used"`);
                      return true;
                    } else {
                      const error = await response.json();
                      console.error(`❌ Error updating record ${record.id} for ${material.material_name}:`, error);
                      return false;
                    }
                  } catch (error) {
                    console.error(`❌ Error updating record for ${material.material_name}:`, error);
                    return false;
                  }
                });
                
                const recordResults = await Promise.all(recordUpdatePromises);
                return recordResults.some(r => r === true); // Return true if at least one record was updated
              } catch (error) {
                console.error(`❌ Error updating ${material.material_name}:`, error);
                return false;
              }
            });
            
            const results = await Promise.all(updatePromises);
            const successCount = results.filter(r => r === true).length;
            statusUpdateSuccess = successCount > 0;
            
            console.log(`✅ Updated ${successCount}/${materialsToUpdate.length} material consumption records to "used"`);
            
            if (successCount > 0) {
              // Wait a moment for backend to process individual product updates
              await new Promise(resolve => setTimeout(resolve, 1000));
              
              // CRITICAL: Verify that individual products were actually updated from 'in_production' to 'used'
              // Fetch from ALL material products, not just batch product
              const updatedProducts: IndividualProduct[] = [];
              if (materialProductIds.size > 0) {
                for (const materialProductId of materialProductIds) {
                  try {
                    const { products } = await IndividualProductService.getIndividualProducts({
                      product_id: materialProductId,
                    });
                    updatedProducts.push(...products);
                  } catch (error) {
                    console.error(`❌ Error fetching updated products for material ${materialProductId}:`, error);
                  }
                }
              }
              
              const stillInProduction = updatedProducts.filter((p: IndividualProduct) => 
                usedProductIds.has(p.id) && p.status === 'in_production'
              );
              
              const successfullyUpdated = updatedProducts.filter((p: IndividualProduct) => 
                usedProductIds.has(p.id) && p.status === 'used'
              );
              
              updatedProductCount = successfullyUpdated.length;
              
              // BLOCK navigation if ANY products are still in 'in_production'
              if (stillInProduction.length > 0) {
                console.error(`❌ ${stillInProduction.length} individual products are still in "in_production" status`);
                console.error(`❌ Products that failed to update:`, stillInProduction.map(p => p.id));
                toast({
                  title: 'Error: Status Not Updated',
                  description: `${stillInProduction.length} product(s) are still in "in_production" status. Cannot proceed to next stage. Please try again or contact support.`,
                  variant: 'destructive',
                  duration: 10000,
                });
                setUpdatingStatus(false);
                return; // BLOCK navigation - status was not changed
              }
              
              // Only proceed if ALL products were successfully updated to 'used'
              if (updatedProductCount === productsToUpdate.length && productsToUpdate.length > 0) {
                console.log(`✅ All ${updatedProductCount} individual products successfully updated from "in_production" to "used"`);
                toast({
                  title: 'Status Updated Successfully',
                  description: `All ${updatedProductCount} product(s) updated from "in_production" to "used"`,
                });
                statusUpdateSuccess = true; // Mark as successful
              } else if (productsToUpdate.length === 0) {
                // No products to update - this is fine
                console.log('ℹ️ No products in "in_production" status to update');
                statusUpdateSuccess = true;
              } else {
                // Some products were updated but not all - this shouldn't happen but block navigation
                console.error(`❌ Only ${updatedProductCount}/${productsToUpdate.length} products were updated`);
                toast({
                  title: 'Error: Incomplete Status Update',
                  description: `Only ${updatedProductCount}/${productsToUpdate.length} product(s) were updated. Cannot proceed.`,
                  variant: 'destructive',
                });
                setUpdatingStatus(false);
                return; // BLOCK navigation
              }
            } else {
              // No materials were updated successfully
              if (productsToUpdate.length > 0) {
                console.error('❌ Failed to update material consumption - no materials were updated');
                toast({
                  title: 'Error: Status Update Failed',
                  description: 'Failed to update material consumption status. Cannot proceed to next stage.',
                  variant: 'destructive',
                });
                setUpdatingStatus(false);
                return; // BLOCK navigation
              }
            }
          } else {
            console.log('ℹ️ No materials found to update');
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

      // CRITICAL VALIDATION: Only allow navigation if status was successfully changed
      // If there were products to update, they MUST all be updated to 'used' before proceeding
      if (productsToUpdate.length > 0) {
        if (!statusUpdateSuccess) {
          console.error('❌ Status update failed - blocking navigation');
          toast({
            title: 'Error: Cannot Proceed',
            description: 'Failed to update product status from "in_production" to "used". Cannot proceed to individual products stage. Please try again.',
            variant: 'destructive',
            duration: 10000,
          });
          setUpdatingStatus(false);
          return; // BLOCK navigation
        }
        
        // Double-check: Verify one more time that all products are now 'used'
        // Fetch from ALL material products, not just batch product
        const finalCheck: IndividualProduct[] = [];
        if (materialProductIds.size > 0) {
          for (const materialProductId of materialProductIds) {
            try {
              const { products } = await IndividualProductService.getIndividualProducts({
                product_id: materialProductId,
              });
              finalCheck.push(...products);
            } catch (error) {
              console.error(`❌ Error fetching final check products for material ${materialProductId}:`, error);
            }
          }
        }
        
        const stillInProductionFinal = finalCheck.filter((p: IndividualProduct) => 
          usedProductIds.has(p.id) && p.status === 'in_production'
        );
        
        if (stillInProductionFinal.length > 0) {
          console.error(`❌ Final check failed: ${stillInProductionFinal.length} products still in "in_production"`);
          toast({
            title: 'Error: Status Not Changed',
            description: `${stillInProductionFinal.length} product(s) are still in "in_production" status. Status was not changed. Cannot proceed.`,
            variant: 'destructive',
            duration: 10000,
          });
          setUpdatingStatus(false);
          return; // BLOCK navigation - status was not changed
        }
        
        console.log('✅ Final validation passed: All products are now "used"');
      }

      // Mark wastage stage as completed and start final stage (individual products) before navigating
      console.log('✅ Marking wastage stage as completed and starting final stage...');
      try {
        const { data: updatedBatch, error: updateError } = await ProductionService.updateBatch(id!, {
          wastage_stage: {
            status: 'completed',
            completed_at: new Date().toISOString(),
            completed_by: 'User', // You can get this from auth context
          },
          final_stage: {
            status: 'in_progress',
            started_at: new Date().toISOString(),
            started_by: 'User', // You can get this from auth context
          },
        });
        
        if (updateError || !updatedBatch) {
          console.error('❌ Error marking wastage stage as completed:', updateError);
          toast({
            title: 'Warning',
            description: 'Wastage stage completion status may not have been saved. Please verify before proceeding.',
            variant: 'destructive',
          });
          // Still allow navigation if status update was successful
        } else {
          console.log('✅ Wastage stage marked as completed successfully');
          // Verify the update
          if (updatedBatch.wastage_stage?.status !== 'completed') {
            console.error('❌ Wastage stage status was not updated correctly');
            toast({
              title: 'Warning',
              description: 'Wastage stage status may not have been updated correctly.',
              variant: 'destructive',
            });
          }
        }
      } catch (error) {
        console.error('❌ Error marking wastage stage as completed:', error);
        toast({
          title: 'Warning',
          description: 'Failed to update wastage stage status. Please verify before proceeding.',
          variant: 'destructive',
        });
        // Still allow navigation if product status update was successful
      }

      // Only navigate if we got here (all validations passed)
      console.log('✅ All validations passed - Navigating to individual products stage...');
      setUpdatingStatus(false);
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
          onBack={() => navigate('/production')}
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
          productId={batch?.product_id}
          productName={batch?.product_name || product?.name}
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
