import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Loader2 } from 'lucide-react';
import { ProductionService, type ProductionBatch } from '@/services/productionService';
import { ProductService } from '@/services/productService';
import { IndividualProductService } from '@/services/individualProductService';
import { WasteService, type WasteItem } from '@/services/wasteService';
import { useToast } from '@/hooks/use-toast';
import IndividualProductsStageHeader from '@/components/production/individual/IndividualProductsStageHeader';
import IndividualProductsTable from '@/components/production/individual/IndividualProductsTable';
import ConsumedMaterialsDisplay from '@/components/production/machine/ConsumedMaterialsDisplay';
import ProductionStageProgress from '@/components/production/planning/ProductionStageProgress';
import ExpectedProductDetails from '@/components/production/planning/ExpectedProductDetails';
import ProductionOverviewStats from '@/components/production/planning/ProductionOverviewStats';
import WastageSummary from '@/components/production/individual/WastageSummary';
import type { Product } from '@/types/product';
import type { IndividualProduct } from '@/types/product';

export default function ProductionIndividualProducts() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [batch, setBatch] = useState<ProductionBatch | null>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const [individualProducts, setIndividualProducts] = useState<IndividualProduct[]>([]);
  const [consumedMaterials, setConsumedMaterials] = useState<any[]>([]);
  const [wasteItems, setWasteItems] = useState<WasteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id, refreshKey]);

  const loadData = async () => {
    try {
      setLoading(true);
      console.log('🔄 Loading individual products stage data...');
      
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
        
        // Load individual products by batch_number (which should be the batch ID)
        try {
          const { products } = await IndividualProductService.getIndividualProducts({
            product_id: batchData.product_id,
          });
          
          // Filter by batch_number matching the batch ID
          // Note: Status update from "in_production" to "used" is now handled
          // in ProductionWastage.tsx before navigation
          const batchProducts = products.filter((p: IndividualProduct) => 
            p.batch_number === id || p.batch_number === batchData.batch_number
          );
          
          console.log('✅ Individual products loaded:', batchProducts.length);
          console.log('📊 Product statuses:', batchProducts.map(p => `${p.id}: ${p.status}`).join(', '));
          setIndividualProducts(batchProducts);
        } catch (error) {
          console.error('Error loading individual products:', error);
          setIndividualProducts([]);
        }
        
        // Load material consumption
        const { data: consumptionData } = await ProductionService.getMaterialConsumption(id!);
        if (consumptionData && consumptionData.length > 0) {
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
        }

        // Load wastage data
        try {
          const allWaste = await WasteService.getAllWaste();
          const batchWaste = allWaste.filter(
            (item) => item.production_batch_id === id || item.batch_id === id
          );
          console.log('✅ Wastage items loaded:', batchWaste.length);
          setWasteItems(batchWaste);
        } catch (error) {
          console.error('Error loading wastage data:', error);
          setWasteItems([]);
        }
      }
    } catch (error) {
      console.error('Error loading individual products stage data:', error);
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

  const handleComplete = async () => {
    // Check if products are actually created (not temp IDs)
    const createdProducts = individualProducts.filter(p => 
      p.id && !p.id.startsWith('temp-')
    );

    if (createdProducts.length === 0) {
      toast({
        title: 'Cannot Complete Production',
        description: 'No individual products have been created and added to stock. Please create and save at least one individual product before completing.',
        variant: 'destructive',
      });
      return;
    }

    // Validate that all created products have required fields
    const requiredFields = ['final_weight', 'final_width', 'final_length', 'quality_grade'];
    const incompleteProducts = createdProducts.filter(p => 
      requiredFields.some(field => !p[field as keyof IndividualProduct] || 
        (typeof p[field as keyof IndividualProduct] === 'string' && 
         (p[field as keyof IndividualProduct] as string).trim() === ''))
    );

    if (incompleteProducts.length > 0) {
      toast({
        title: 'Cannot Complete Production',
        description: `${incompleteProducts.length} products have incomplete data. Please fill in all required fields (Final Weight, Final Width, Final Length, Quality Grade).`,
        variant: 'destructive',
      });
      return;
    }

    // Update batch status to completed
    try {
      await ProductionService.updateBatch(id!, {
        status: 'completed',
      });

      toast({
        title: 'Success',
        description: `Production batch completed successfully! ${createdProducts.length} individual product(s) created and added to stock.`,
      });

      navigate('/production');
    } catch (error) {
      console.error('Error completing production:', error);
      toast({
        title: 'Error',
        description: 'Failed to complete production batch',
        variant: 'destructive',
      });
    }
  };

  const createdProducts = individualProducts.filter(p => 
    p.id && !p.id.startsWith('temp-')
  );

  const canComplete = createdProducts.length > 0 && createdProducts.every(p => 
    p.final_weight && p.final_width && p.final_length && p.quality_grade
  );

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
        <IndividualProductsStageHeader
          batch={batch}
          onBack={() => navigate(`/production/${id}/wastage`)}
          onComplete={handleComplete}
          onRefresh={handleRefresh}
          canComplete={canComplete}
        />

        {/* Production Progress Tracker */}
        <ProductionStageProgress currentStage="individual" />

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

        {/* Wastage Summary */}
        {wasteItems.length > 0 && (
          <WastageSummary wasteItems={wasteItems} />
        )}

        {/* Individual Products Table */}
        <IndividualProductsTable
          individualProducts={individualProducts}
          onUpdate={handleRefresh}
          product={product ? {
            weight_unit: product.weight_unit,
            width_unit: product.width_unit,
            length_unit: product.length_unit,
            weight: product.weight,
            width: product.width,
            length: product.length,
          } : undefined}
          plannedQuantity={batch?.planned_quantity || 0}
          batchId={id}
          productId={product?.id}
          onComplete={handleComplete}
          canComplete={canComplete}
        />
      </div>
    </Layout>
  );
}
