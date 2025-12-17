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
        } else {
          // If no flow exists, try to load from PlanningDraftState
          // The flow might be created later, so we'll still show material consumption
          console.log('No production flow found for batch:', id);
        }
        
        // Load material consumption (this should work even without flow)
        const { data: consumptionData } = await ProductionService.getMaterialConsumption(id!);
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
          }));
          setConsumedMaterials(consumed);
        } else {
          // Try to load from PlanningDraftState if no consumption records yet
          try {
            const { data: draftState } = await ProductionService.getDraftPlanningState(batchData.product_id);
            if (draftState?.consumed_materials && draftState.consumed_materials.length > 0) {
              // Set consumed materials from draft state
              setConsumedMaterials(draftState.consumed_materials);
            }
          } catch (error) {
            console.error('Error loading draft state:', error);
          }
        }
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

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
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
          onWastage={() => navigate(`/production/${id}/wastage`)}
          onRefresh={handleRefresh}
        />

        {/* Production Progress Tracker */}
        <ProductionStageProgress currentStage="machine" />

        {/* Product Details */}
        {product && (
          <>
            <ProductionOverviewStats
              targetQuantity={batch?.planned_quantity || 0}
              unit={product.unit || 'units'}
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
          onStepUpdate={handleRefresh}
        />

        {/* Wastage Button at Bottom */}
        <div className="flex justify-end mt-6">
          <Button
            onClick={() => navigate(`/production/${id}/wastage`)}
            className="bg-orange-600 hover:bg-orange-700 text-white"
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

