import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Loader2, AlertCircle, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ProductionService, type ProductionBatch } from '@/services/productionService';
import { ProductService } from '@/services/productService';
import { useToast } from '@/hooks/use-toast';
import ProductionDetailHeader from '@/components/production/detail/ProductionDetailHeader';
import ProductionDetailInfo from '@/components/production/detail/ProductionDetailInfo';
import ProductionDetailStats from '@/components/production/detail/ProductionDetailStats';
import ProductionStagesDetailed from '@/components/production/detail/ProductionStagesDetailed';
import ProductionIndividualProducts from '@/components/production/detail/ProductionIndividualProducts';
import ProductionFormDialog from '@/components/production/ProductionFormDialog';
import type { CreateProductionBatchData} from '@/services/productionService';

export default function ProductionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [batch, setBatch] = useState<ProductionBatch | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (id) {
      loadBatch();
    }
  }, [id]);

  const loadBatch = async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const { data, error: batchError } = await ProductionService.getBatchById(id);
      
      if (batchError) {
        setError(batchError);
        return;
      }

      if (data) {
        // Enrich with product details if needed
        let enrichedBatch = data;
        // Check if product details are missing or invalid (N/A, empty, etc.)
        const needsEnrichment = !data.product_name || 
          !data.category || 
          data.category === 'N/A' || 
          !data.length || 
          data.length === 'N/A';
        
        if (needsEnrichment && data.product_id) {
          try {
            const product = await ProductService.getProductById(data.product_id);
            enrichedBatch = {
              ...data,
              // Preserve cancellation_details
              cancellation_details: data.cancellation_details,
              product_name: product.name || data.product_name || 'N/A',
              category: product.category || data.category || 'N/A',
              subcategory: product.subcategory || data.subcategory || 'N/A',
              length: product.length || data.length || 'N/A',
              width: product.width || data.width || 'N/A',
              length_unit: product.length_unit || data.length_unit || '',
              width_unit: product.width_unit || data.width_unit || '',
              weight: product.weight || data.weight || 'N/A',
              weight_unit: product.weight_unit || data.weight_unit || '',
              color: product.color || data.color || 'N/A',
              pattern: product.pattern || data.pattern || 'N/A',
            };
          } catch (error) {
            console.error('Error fetching product:', error);
            // Keep existing data if product fetch fails
            enrichedBatch = {
              ...data,
              // Preserve cancellation_details
              cancellation_details: data.cancellation_details,
              product_name: data.product_name || 'Product Not Found',
              category: data.category || 'N/A',
              subcategory: data.subcategory || 'N/A',
              length: data.length || 'N/A',
              width: data.width || 'N/A',
              weight: data.weight || 'N/A',
              color: data.color || 'N/A',
              pattern: data.pattern || 'N/A',
            };
          }
        }
        console.log('Batch data loaded:', enrichedBatch);
        console.log('Batch status:', enrichedBatch.status);
        console.log('Cancellation details:', enrichedBatch.cancellation_details);
        console.log('Full cancellation_details object:', JSON.stringify(enrichedBatch.cancellation_details, null, 2));
        setBatch(enrichedBatch);
      }
    } catch (err) {
      console.error('Error loading batch:', err);
      setError(err instanceof Error ? err.message : 'Failed to load batch');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigate('/production');
  };

  const handleEditSuccess = async (data: CreateProductionBatchData) => {
    try {
      setSubmitting(true);
      if (!id) return;

      const { data: updatedBatch, error: updateError } = await ProductionService.updateBatch(id, data);
      if (updateError) {
        toast({ title: 'Error', description: updateError, variant: 'destructive' });
        return;
      }
      if (updatedBatch) {
        toast({ title: 'Success', description: 'Batch updated successfully' });
        setIsEditOpen(false);
        loadBatch();
      }
    } catch (error) {
      console.error('Error updating batch:', error);
      toast({ title: 'Error', description: 'Failed to update batch', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-primary-600 mx-auto mb-4" />
            <p className="text-gray-600">Loading batch details...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error || !batch) {
    return (
      <Layout>
        <div>
          <Card>
            <CardContent className="p-12 text-center">
              <AlertCircle className="w-16 h-16 mx-auto text-red-500 mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Batch Not Found</h2>
              <p className="text-gray-600 mb-6">{error || 'The batch you are looking for does not exist.'}</p>
              <Button onClick={handleBack} className="bg-primary-600 hover:bg-primary-700 text-white">
                Back to Production
              </Button>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <ProductionDetailHeader
          batch={batch}
          onBack={handleBack}
        />

        <ProductionDetailStats batch={batch} />

        <ProductionDetailInfo batch={batch} />

        {/* Cancellation Details - Show only if batch is cancelled */}
        {batch.status === 'cancelled' && (
          <Card className="border-red-200 bg-red-50">
            <CardHeader className="border-b border-red-200">
              <CardTitle className="flex items-center gap-2 text-red-800">
                <XCircle className="w-5 h-5" />
                Cancellation Details
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">Cancelled By</p>
                  <p className="text-base text-gray-900">
                    {batch.cancellation_details?.cancelled_by || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">Cancelled At</p>
                  <p className="text-base text-gray-900">
                    {batch.cancellation_details?.cancelled_at
                      ? new Date(batch.cancellation_details.cancelled_at).toLocaleString('en-IN', {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })
                      : 'N/A'}
                  </p>
                </div>
                <div className="md:col-span-1">
                  <p className="text-sm font-medium text-gray-700 mb-1">Reason</p>
                  <p className="text-base text-gray-900">
                    {batch.cancellation_details?.cancellation_reason || 'No reason provided'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Production Stages - Planning, Machine, Wastage, Final Products */}
        <ProductionStagesDetailed batch={batch} />

        {/* Individual Products Created in This Batch */}
        {batch.status === 'completed' && (
          <ProductionIndividualProducts batch={batch} />
        )}

        <ProductionFormDialog
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          onSubmit={handleEditSuccess}
          selectedBatch={batch}
          submitting={submitting}
        />
      </div>
    </Layout>
  );
}

