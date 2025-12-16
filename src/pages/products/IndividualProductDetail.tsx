import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { ProductService } from '@/services/productService';
import { IndividualProductService } from '@/services/individualProductService';
import IndividualProductHeader from '@/components/products/stock/detail/IndividualProductHeader';
import IndividualProductStats from '@/components/products/stock/detail/IndividualProductStats';
import IndividualProductInfo from '@/components/products/stock/detail/IndividualProductInfo';
import IndividualProductDimensions from '@/components/products/stock/detail/IndividualProductDimensions';
import IndividualProductQRCode from '@/components/products/stock/detail/IndividualProductQRCode';
import IndividualProductHistory from '@/components/products/stock/detail/IndividualProductHistory';
import EditIndividualProductDialog from '@/components/products/stock/EditIndividualProductDialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, AlertTriangle, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Product, IndividualProduct, IndividualProductFormData } from '@/types/product';

export default function IndividualProductDetail() {
  const { productId, individualProductId } = useParams<{
    productId: string;
    individualProductId: string;
  }>();
  const navigate = useNavigate();
  const location = useLocation();

  const [product, setProduct] = useState<Product | null>(null);
  const [individualProduct, setIndividualProduct] = useState<IndividualProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('details');

  useEffect(() => {
    loadData();
  }, [productId, individualProductId]);

  const loadData = async () => {
    if (!productId || !individualProductId) {
      setError('Product ID and Individual Product ID are required');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Load product details
      const productData = await ProductService.getProductById(productId);
      setProduct(productData);

      // Load individual product
      const individualProductData = await IndividualProductService.getIndividualProductById(
        individualProductId
      );
      setIndividualProduct(individualProductData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    // Check where we came from based on location state
    const fromPage = location.state?.from;
    
    if (fromPage === 'product-detail') {
      // If we came from product detail page, go back to product detail
      navigate(`/products/${productId}`);
    } else {
      // Default: go back to stock page (product list -> stock -> individual)
      navigate(`/products/${productId}/stock`);
    }
  };

  const handleEdit = () => {
    setIsEditDialogOpen(true);
  };

  const handleViewQRCode = () => {
    setActiveTab('qrcode');
  };

  const handleSaveEdit = async (id: string, data: Partial<IndividualProductFormData>) => {
    try {
      await IndividualProductService.updateIndividualProduct(id, data);
      await loadData(); // Reload data after update
    } catch (error) {
      console.error('Error updating individual product:', error);
      throw error;
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-primary-600 mx-auto mb-4" />
            <p className="text-gray-600">Loading product details...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error || !product || !individualProduct || !productId) {
    return (
      <Layout>
        <div className="p-6">
          <div className="max-w-2xl mx-auto text-center py-12">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Product Not Found</h2>
            <p className="text-gray-600 mb-6">
              {error || 'The individual product you are looking for does not exist.'}
            </p>
            <Button onClick={() => navigate(`/products/${productId}/stock`)}>
              Back to Stock
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <IndividualProductHeader
          individualProduct={individualProduct}
          product={product}
          onBack={handleBack}
          onEdit={handleEdit}
          onViewQRCode={handleViewQRCode}
        />

        {/* Stats Cards */}
        <IndividualProductStats individualProduct={individualProduct} />

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Product Context Card */}
          <Card className="mb-6 shadow-sm">
            <CardContent className="pt-6">
            <div className="flex items-center space-x-4">
                {product.image_url ? (
                <img
                  src={product.image_url}
                  alt={product.name}
                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg object-cover border border-gray-200 flex-shrink-0"
                  />
                ) : (
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center flex-shrink-0">
                    <Package className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400" />
                      </div>
                    )}
                <div className="min-w-0 flex-1">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 line-clamp-2 break-words">
                    {product.name}
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-600 mt-1 break-words line-clamp-1">
                    {`${product.category}${product.color ? ` • ${product.color}` : ''}${product.pattern ? ` • ${product.pattern}` : ''}`}
                  </p>
                </div>
                    </div>
            </CardContent>
          </Card>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="bg-white border border-gray-200">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="qrcode">QR Code</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-6">
              <IndividualProductInfo individualProduct={individualProduct} />
              <IndividualProductDimensions
                individualProduct={individualProduct}
                product={product}
              />
            </TabsContent>

            <TabsContent value="qrcode">
              <IndividualProductQRCode 
                individualProduct={individualProduct} 
                productId={productId}
              />
            </TabsContent>

            <TabsContent value="history">
              <IndividualProductHistory individualProduct={individualProduct} />
            </TabsContent>
          </Tabs>
        </div>

        {/* Edit Dialog */}
        <EditIndividualProductDialog
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          individualProduct={individualProduct}
          onSave={handleSaveEdit}
        />
      </div>
    </Layout>
  );
}
