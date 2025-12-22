import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProductionService, type ProductionBatch } from '@/services/productionService';
import { ProductService } from '@/services/productService';
import { useToast } from '@/hooks/use-toast';
import MachineStageHeader from '@/components/production/machine/MachineStageHeader';
import MachineStepsList from '@/components/production/machine/MachineStepsList';
import ConsumedMaterialsDisplay from '@/components/production/machine/ConsumedMaterialsDisplay';
import ProductionStageProgress from '@/components/production/planning/ProductionStageProgress';
import ExpectedProductDetails from '@/components/production/planning/ExpectedProductDetails';
import ProductionOverviewStats from '@/components/production/planning/ProductionOverviewStats';
import type { Product } from '@/types/product';

export default function MachineStage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [batch, setBatch] = useState<ProductionBatch | null>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [productionFlow, setProductionFlow] = useState<any>(null);
  const [consumedMaterials, setConsumedMaterials] = useState<any[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [machineShift, setMachineShift] = useState<'day' | 'night' | undefined>(undefined);
  const [isMachineCompleted, setIsMachineCompleted] = useState(false);

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id, refreshKey]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load batch
      const { data: batchData } = await ProductionService.getBatchById(id!);
      if (batchData) {
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
        
        // Load production flow
        const { data: flowData } = await ProductionService.getProductionFlowByBatchId(id!);
        if (flowData) {
          setProductionFlow(flowData);
          
          // Get shift from machine step
          const machineStep = flowData.production_flow_steps?.find((s: any) => 
            s.step_type === 'machine_operation' || 
            s.step_name?.toLowerCase().includes('machine')
          ) || flowData.steps?.find((s: any) => 
            s.step_type === 'machine_operation' || 
            s.step_name?.toLowerCase().includes('machine')
          );
          
          if (machineStep?.shift) {
            setMachineShift(machineStep.shift);
          }
        } else {
          // If no flow exists, try to load from PlanningDraftState
          // The flow might be created later, so we'll still show material consumption
          console.log('No production flow found for batch:', id);
        }
        
        // Load material consumption - MUST exist for machine stage
        const { data: consumptionData } = await ProductionService.getMaterialConsumption(id!);
        if (consumptionData && consumptionData.length > 0) {
          // Convert to consumed materials format with all details
          const consumed = consumptionData.map((m: any) => ({
            material_id: m.material_id,
            material_name: m.material_name,
            material_type: m.material_type,
            quantity_per_sqm: m.quantity_per_sqm || 0,
            required_quantity: m.quantity_used || m.required_quantity || 0,
            actual_consumed_quantity: m.actual_consumed_quantity || m.quantity_used || 0,
            whole_product_count: m.whole_product_count || m.quantity_used || 0,
            unit: m.unit,
            individual_product_ids: m.individual_product_ids || [], // CRITICAL: Must have individual_product_ids for products
            individual_products: m.individual_products || [], // CRITICAL: Full individual product details
          }));
          
          // Validate that products have individual_product_ids
          const productMaterials = consumed.filter(m => m.material_type === 'product');
          const missingIndividualProducts = productMaterials.filter(
            m => !m.individual_product_ids || m.individual_product_ids.length === 0
          );
          
          if (missingIndividualProducts.length > 0) {
            console.error('⚠️ Products missing individual_product_ids:', missingIndividualProducts.map(m => m.material_name));
            toast({
              title: 'Warning',
              description: `Some products are missing individual product IDs. Please go back to planning stage and select individual products.`,
              variant: 'destructive',
            });
          }
          
          setConsumedMaterials(consumed);
          console.log('✅ Loaded consumed materials:', consumed.length, 'items');
          console.log('📦 Individual product IDs:', consumed
            .filter(m => m.material_type === 'product')
            .map(m => ({ name: m.material_name, ids: m.individual_product_ids?.length || 0 }))
          );
        } else {
          // No consumption records - this should not happen if planning was done correctly
          toast({
            title: 'Error',
            description: 'No material consumption records found. Please complete planning stage first.',
            variant: 'destructive',
          });
          console.error('❌ No MaterialConsumption records found for batch:', id);
        }

        // Check machine completion status after loading all data
        await checkMachineCompletion();
      }
    } catch (error) {
      console.error('Error loading machine stage data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load production data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const checkMachineCompletion = async () => {
    try {
      // Reload production flow to get latest step statuses
      const { data: latestFlowData } = await ProductionService.getProductionFlowByBatchId(id!);

      if (!latestFlowData) {
        setIsMachineCompleted(false);
        return;
      }

      const flowId = latestFlowData.id || latestFlowData.flow_id;
      const { data: flowSteps } = await ProductionService.getProductionFlowSteps(flowId);

      const machineSteps = (flowSteps || []).filter((s: any) =>
        s.step_type === 'machine_operation' ||
        s.step_name?.toLowerCase().includes('machine')
      );

      if (machineSteps.length === 0) {
        setIsMachineCompleted(false);
        return;
      }

      // Check if all machine steps are completed
      const allCompleted = machineSteps.every((s: any) => s.status === 'completed');

      // Also check if consumed materials exist and products have individual IDs
      const productMaterials = consumedMaterials.filter(m => m.material_type === 'product');
      const hasIndividualProducts = productMaterials.every(
        m => m.individual_product_ids && m.individual_product_ids.length > 0
      );

      setIsMachineCompleted(
        allCompleted &&
        consumedMaterials.length > 0 &&
        (productMaterials.length === 0 || hasIndividualProducts)
      );
    } catch (error) {
      console.error('Error checking machine completion:', error);
      setIsMachineCompleted(false);
    }
  };

  // Separate function to check completion without full refresh
  const checkCompletionOnly = async () => {
    await checkMachineCompletion();
  };

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  const validateMachineStageCompletion = async (): Promise<{ valid: boolean; error?: string }> => {
    try {
      // Reload production flow to get latest step statuses
      const { data: latestFlowData } = await ProductionService.getProductionFlowByBatchId(id!);
      
      // Check 1: Production flow must exist
      if (!latestFlowData) {
        return {
          valid: false,
          error: 'Production flow not found. Please ensure machine operations are set up correctly.'
        };
      }

      // Get latest flow steps
      const flowId = latestFlowData.id || latestFlowData.flow_id;
      const { data: flowSteps } = await ProductionService.getProductionFlowSteps(flowId);
      
      // Check 2: Machine step must exist
      const machineSteps = (flowSteps || []).filter((s: any) => 
        s.step_type === 'machine_operation' || 
        s.step_name?.toLowerCase().includes('machine')
      );

      if (machineSteps.length === 0) {
        return {
          valid: false,
          error: 'No machine steps found. Please complete machine operations first.'
        };
      }

      // Check 3: All machine steps must be completed
      const incompleteSteps = machineSteps.filter((s: any) => s.status !== 'completed');
      if (incompleteSteps.length > 0) {
        const stepNames = incompleteSteps.map((s: any) => s.step_name || 'Machine Operation').join(', ');
        return {
          valid: false,
          error: `Please complete all machine steps before moving to wastage stage. Incomplete: ${stepNames}`
        };
      }

      // Check 4: Material consumption must exist
      if (!consumedMaterials || consumedMaterials.length === 0) {
        return {
          valid: false,
          error: 'Material consumption records not found. Please ensure materials are consumed.'
        };
      }

      // Check 5: Products must have individual_product_ids
      const productMaterials = consumedMaterials.filter(m => m.material_type === 'product');
      const missingIndividualProducts = productMaterials.filter(
        m => !m.individual_product_ids || m.individual_product_ids.length === 0
      );
      
      if (missingIndividualProducts.length > 0) {
        const materialNames = missingIndividualProducts.map(m => m.material_name).join(', ');
        return {
          valid: false,
          error: `Some products are missing individual product IDs: ${materialNames}. Please go back to planning stage and select individual products.`
        };
      }

      // All validations passed
      return { valid: true };
    } catch (error) {
      console.error('Error validating machine stage:', error);
      return {
        valid: false,
        error: 'Error validating machine stage. Please try again.'
      };
    }
  };

  const handleNavigateToWastage = async () => {
    const validation = await validateMachineStageCompletion();
    
    if (!validation.valid) {
      toast({
        title: 'Cannot Proceed to Wastage Stage',
        description: validation.error || 'Machine stage is not complete.',
        variant: 'destructive',
      });
      return;
    }

    // Validation passed - navigate to wastage stage
    navigate(`/production/${id}/wastage`);
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
        <MachineStageHeader
          batch={batch}
          onBack={() => navigate(`/production/${id}/planning`)}
          onWastage={handleNavigateToWastage}
          onRefresh={handleRefresh}
          shift={machineShift}
          wastageDisabled={!isMachineCompleted}
        />

        {/* Production Progress Tracker */}
        <ProductionStageProgress currentStage="machine" />

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

        {/* Machine Steps */}
        <MachineStepsList
          batchId={id!}
          productionFlow={productionFlow}
          onStepUpdate={checkCompletionOnly}
        />

        {/* Wastage Button at Bottom */}
        <div className="flex justify-end mt-6">
          <Button
            onClick={handleNavigateToWastage}
            disabled={!isMachineCompleted}
            className="bg-orange-600 hover:bg-orange-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            size="lg"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Wastage Stage
          </Button>
        </div>
      </div>
    </Layout>
  );
}

