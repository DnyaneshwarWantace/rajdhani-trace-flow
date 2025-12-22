import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { ProductionService, type CreateProductionBatchData } from '@/services/productionService';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import type { Product } from '@/types/product';
import ProductionCreateHeader from '@/components/production/create/ProductionCreateHeader';
import ProductSearchSection from '@/components/production/create/ProductSearchSection';
import SelectedProductCard from '@/components/production/create/SelectedProductCard';
import BatchDetailsForm from '@/components/production/create/BatchDetailsForm';

export default function ProductionCreate() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<CreateProductionBatchData>({
    product_id: '',
    planned_quantity: 0,
    priority: 'medium',
    operator: user?.full_name || user?.email || '',
    supervisor: user?.full_name || user?.email || '',
    notes: '',
    completion_date: '',
  });

  // Auto-fill operator and supervisor with logged-in user
  useEffect(() => {
    if (user) {
      const userName = user.full_name || user.email || '';
      setFormData((prev) => ({
        ...prev,
        operator: userName,
        supervisor: userName,
      }));
    }
  }, [user]);

  // Check if product was passed from product page
  useEffect(() => {
    const productFromState = location.state?.product as Product | undefined;
    if (productFromState) {
      setSelectedProduct(productFromState);
      setFormData((prev) => ({
        ...prev,
        product_id: productFromState.id,
        operator: user?.full_name || user?.email || prev.operator,
        supervisor: user?.full_name || user?.email || prev.supervisor,
      }));
    }
  }, [location.state, user]);

  const handleProductSelect = (product: Product) => {
    setSelectedProduct(product);
    setFormData((prev) => ({ ...prev, product_id: product.id }));
  };

  const handleProductClear = () => {
    setSelectedProduct(null);
    setFormData((prev) => ({ ...prev, product_id: '' }));
  };

  const handleFormChange = (data: CreateProductionBatchData) => {
    setFormData(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.product_id || formData.planned_quantity <= 0) {
      toast({
        title: 'Validation Error',
        description: 'Please select a product and enter a valid quantity',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSubmitting(true);
      const { data, error } = await ProductionService.createBatch(formData);
      if (error) {
        toast({ title: 'Error', description: error, variant: 'destructive' });
        return;
      }
      if (data) {
        toast({ title: 'Success', description: 'Production batch created successfully' });
        navigate(`/production/planning?batchId=${data.id}`);
      }
    } catch (error) {
      console.error('Error creating batch:', error);
      toast({ title: 'Error', description: 'Failed to create batch', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50">
        <ProductionCreateHeader onBack={() => navigate('/production')} />

        <div className="px-2 sm:px-3 lg:px-4 py-6">
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column - Product Selection */}
              <div className="space-y-4">
                <ProductSearchSection
                  onSelect={handleProductSelect}
                  selectedProductId={selectedProduct?.id || null}
                />

                {selectedProduct && (
                  <SelectedProductCard product={selectedProduct} onClear={handleProductClear} />
                )}
              </div>

              {/* Right Column - Batch Details */}
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Batch Details</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <BatchDetailsForm 
                      formData={formData} 
                      onChange={handleFormChange}
                      selectedProduct={selectedProduct}
                    />
                  </CardContent>
                </Card>

                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate('/production')}
                    className="flex-1"
                    disabled={submitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 bg-primary-600 hover:bg-primary-700 text-white"
                    disabled={submitting || !formData.product_id || formData.planned_quantity <= 0}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      'Create Batch'
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
}
