import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { ProductService } from '@/services/productService';
import { formatIndianDate } from '@/utils/formatHelpers';
import type { Product } from '@/types/product';
import ProductDetailHeader from '@/components/products/detail/ProductDetailHeader';
import ProductDetailStats from '@/components/products/detail/ProductDetailStats';
import ProductDetailInfo from '@/components/products/detail/ProductDetailInfo';
import ProductDetailDimensions from '@/components/products/detail/ProductDetailDimensions';
import ProductDetailStock from '@/components/products/detail/ProductDetailStock';
import ProductDetailActions from '@/components/products/detail/ProductDetailActions';
import ProductDetailRecipe from '@/components/products/detail/ProductDetailRecipe';
import { RecipeService } from '@/services/recipeService';
import type { Recipe } from '@/types/recipe';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import ProductFormModal from '@/components/products/ProductFormModal';

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [recipeLoading, setRecipeLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);

  useEffect(() => {
    if (id) {
      loadProduct();
    }
  }, [id]);

  const loadProduct = async () => {
    try {
      setLoading(true);
      setError(null);
      if (!id) {
        throw new Error('Product ID is required');
      }
      const data = await ProductService.getProductById(id);
      setProduct(data);
      
      // Load recipe for this product
      if (data.has_recipe) {
        loadRecipe(id);
      }
    } catch (err) {
      console.error('Error loading product:', err);
      setError(err instanceof Error ? err.message : 'Failed to load product');
    } finally {
      setLoading(false);
    }
  };

  const loadRecipe = async (productId: string) => {
    try {
      setRecipeLoading(true);
      const recipeData = await RecipeService.getRecipeByProductId(productId);
      setRecipe(recipeData);
    } catch (err) {
      console.error('Error loading recipe:', err);
      setRecipe(null);
    } finally {
      setRecipeLoading(false);
    }
  };

  const handleEdit = () => {
    setIsEditOpen(true);
  };

  const handleStock = () => {
    // Navigate to individual product detail page (to be created later)
    // For now, this will be a placeholder
    if (product?.individual_stock_tracking) {
      navigate(`/products/${product.id}/stock`, {
        state: { from: 'product-detail' }
      });
    } else {
      // If not tracking individually, show stock adjustment or stock management
      navigate(`/products/${product?.id}/stock`, {
        state: { from: 'product-detail' }
      });
    }
  };

  const handleBack = () => {
    navigate('/products');
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

  if (error || !product) {
    return (
      <Layout>
        <div>
          <Button variant="outline" onClick={handleBack} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Products
          </Button>
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <p className="text-red-600 font-medium">{error || 'Product not found'}</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50">
        {/* Back Button */}
        <div className="bg-white border-b border-gray-200 px-2 sm:px-3 lg:px-4 py-4">
          <Button variant="ghost" onClick={handleBack} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Products
          </Button>
        </div>

        {/* Header with Image */}
        <div className="bg-white border-b border-gray-200">
          <ProductDetailHeader product={product} />
        </div>

        {/* Stats Cards */}
        <div className="bg-white border-b border-gray-200">
          <ProductDetailStats product={product} />
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-2 sm:px-3 lg:px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Main Info */}
            <div className="lg:col-span-2 space-y-6">
              {/* Basic Information */}
              <ProductDetailInfo product={product} />

              {/* Dimensions */}
              <ProductDetailDimensions product={product} />

              {/* Stock Management */}
              <ProductDetailStock product={product} />

              {/* Recipe */}
              {product.has_recipe && (
                <ProductDetailRecipe recipe={recipe} product={product} loading={recipeLoading} />
              )}

              {/* Notes */}
              {product.notes && (
                <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Notes</h3>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                    {product.notes}
                  </p>
                </div>
              )}
            </div>

            {/* Right Column - Quick Actions */}
            <div className="space-y-6">
              {/* Quick Actions Card */}
              <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
                <ProductDetailActions
                  onEdit={handleEdit}
                  onStock={handleStock}
                />
              </div>

              {/* Additional Info */}
              <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Additional Information</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Created</span>
                    <span className="font-medium text-gray-900">
                      {formatIndianDate(product.created_at)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Last Updated</span>
                    <span className="font-medium text-gray-900">
                      {formatIndianDate(product.updated_at)}
                    </span>
                  </div>
                  {product.manufacturing_date && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Manufacturing Date</span>
                      <span className="font-medium text-gray-900">
                        {formatIndianDate(product.manufacturing_date)}
                      </span>
                    </div>
                  )}
                  {product.qr_code && (
                    <div className="pt-3 border-t border-gray-200">
                      <span className="text-gray-600 block mb-2">QR Code</span>
                      <span className="font-mono text-xs text-gray-900 break-all">
                        {product.qr_code}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <ProductFormModal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        onSuccess={() => {
          setIsEditOpen(false);
          loadProduct();
        }}
        product={product}
        mode="edit"
      />
    </Layout>
  );
}

