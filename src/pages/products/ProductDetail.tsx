import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { ProductService } from '@/services/productService';
import { formatIndianDate } from '@/utils/formatHelpers';
import type { Product } from '@/types/product';
import ProductDetailHeader from '@/components/products/detail/ProductDetailHeader';
import ProductDetailTitle from '@/components/products/detail/ProductDetailTitle';
import ProductDetailStats from '@/components/products/detail/ProductDetailStats';
import ProductDetailInfo from '@/components/products/detail/ProductDetailInfo';
import ProductDetailDimensions from '@/components/products/detail/ProductDetailDimensions';
import ProductDetailStock from '@/components/products/detail/ProductDetailStock';
import ProductDetailRecipe from '@/components/products/detail/ProductDetailRecipe';
import { RecipeService } from '@/services/recipeService';
import type { Recipe } from '@/types/recipe';
import { ArrowLeft, Loader2, Factory, Package, Edit2, Ruler, Weight, ChevronRight } from 'lucide-react';
import ProductFormModal from '@/components/products/ProductFormModal';
import { useLiveSyncRefresh } from '@/hooks/useLiveSyncRefresh';
import ProductAttributePreview from '@/components/ui/ProductAttributePreview';
import { calculateStockStatus } from '@/utils/stockStatus';

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3.5">
      <p className="text-[9.5px] text-gray-400 font-semibold uppercase tracking-wide leading-none mb-1.5">{label}</p>
      <p className="text-sm font-bold text-gray-900 leading-tight break-words">{value || '—'}</p>
    </div>
  );
}

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [recipeLoading, setRecipeLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);

  useEffect(() => { if (id) loadProduct(); }, [id]);

  const loadProduct = async () => {
    try {
      setLoading(true); setError(null);
      if (!id) throw new Error('Product ID is required');
      const data = await ProductService.getProductById(id);
      setProduct(data);
      if (data.has_recipe) loadRecipe(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load product');
    } finally { setLoading(false); }
  };

  const loadRecipe = async (productId: string) => {
    try {
      setRecipeLoading(true);
      setRecipe(await RecipeService.getRecipeByProductId(productId));
    } catch { setRecipe(null); }
    finally { setRecipeLoading(false); }
  };

  useLiveSyncRefresh({
    modules: ['products', 'recipes', 'production', 'individual_products'],
    onRefresh: () => { if (id) loadProduct(); },
    pollingMs: 8000,
  });

  if (loading) return (
    <Layout>
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
      </div>
    </Layout>
  );

  if (error || !product) return (
    <Layout>
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
        <p className="text-red-600 font-medium mb-4">{error || 'Product not found'}</p>
        <button onClick={() => navigate(-1)} className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl">
          Go Back
        </button>
      </div>
    </Layout>
  );

  const stockStatus = calculateStockStatus(product);
  const stats = product.individual_product_stats;
  const hasSiblingStats = product.individual_stock_tracking && stats;

  const siblingStrip = hasSiblingStats
    ? [
        { label: 'Available',   value: stats.available,     color: 'text-green-600' },
        { label: 'In Prod',     value: stats.in_production, color: 'text-orange-500' },
        { label: 'Sold',        value: stats.sold,          color: 'text-blue-600' },
        { label: 'Reserved',    value: stats.reserved,      color: 'text-purple-600' },
        { label: 'Damaged',     value: stats.damaged,       color: 'text-red-600' },
        { label: 'Total',       value: stats.total,         color: 'text-gray-900' },
      ]
    : null;

  const stockStatusColor = stockStatus === 'out-of-stock'
    ? { text: 'text-red-600', bg: 'bg-red-50', dot: '#EF4444' }
    : stockStatus === 'low-stock'
    ? { text: 'text-orange-500', bg: 'bg-orange-50', dot: '#F97316' }
    : { text: 'text-green-600', bg: 'bg-green-50', dot: '#22C55E' };

  return (
    <Layout>
      {/* ── MOBILE ─────────────────────────────────────────────── */}
      <div className="lg:hidden -mx-3 sm:-mx-4 -mt-4">

        {/* Header */}
        <div className="bg-white border-b border-gray-100 px-4 pt-4 pb-3">
          <div className="flex items-center justify-between gap-2 mb-3">
            <button
              onClick={() => navigate(-1)}
              className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 bg-white shrink-0"
            >
              <ArrowLeft className="w-4 h-4 text-gray-600" />
            </button>
            <button
              onClick={() => setIsEditOpen(true)}
              className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 bg-white shrink-0"
            >
              <Edit2 className="w-4 h-4 text-gray-600" />
            </button>
          </div>

          {/* Product name + category */}
          <h1 className="text-xl font-bold text-gray-900 leading-tight">{product.name}</h1>
          {product.category && (
            <p className="text-xs text-gray-400 mt-0.5">{product.category}</p>
          )}

          {/* Attributes + status */}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <ProductAttributePreview
              color={product.color}
              pattern={product.pattern}
              length={product.length}
              width={product.width}
              lengthUnit={product.length_unit}
              widthUnit={product.width_unit}
              size="large"
            />
            <span className={`flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full ${stockStatusColor.bg} ${stockStatusColor.text}`}>
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: stockStatusColor.dot }} />
              {stockStatus.replace('-', ' ')}
            </span>
          </div>
        </div>

        {/* Product image */}
        {product.image_url && (
          <div className="bg-white border-b border-gray-100 flex items-center justify-center" style={{ height: 200 }}>
            <img src={product.image_url} alt={product.name} className="max-h-full max-w-full object-contain" />
          </div>
        )}

        {/* Individual item breakdown strip */}
        {siblingStrip && (
          <div className="mx-4 mt-3">
            <p className="text-[9.5px] text-gray-400 font-bold uppercase tracking-widest mb-2">Individual Stock Breakdown</p>
            <div className="flex border border-gray-200 rounded-xl overflow-hidden bg-white text-center">
              {siblingStrip.map((s, i) => (
                <div
                  key={s.label}
                  className={`flex-1 flex flex-col items-center py-2.5 ${i > 0 ? 'border-l border-gray-200' : ''}`}
                >
                  <span className={`text-sm font-extrabold tracking-tight ${s.color}`}>{s.value}</span>
                  <span className="text-[8px] text-gray-400 font-medium mt-0.5 uppercase tracking-wide leading-none">{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Basic Information tiles */}
        <div className="px-4 mt-4">
          <p className="text-[9.5px] text-gray-400 font-bold uppercase tracking-widest mb-2">Basic Information</p>
          <div className="grid grid-cols-2 gap-2">
            {product.category && <InfoTile label="Category" value={product.category} />}
            {product.subcategory && <InfoTile label="Subcategory" value={product.subcategory} />}
            {product.unit && <InfoTile label="Unit" value={product.unit} />}
            {product.current_stock != null && <InfoTile label="Current Stock" value={`${product.current_stock} rolls`} />}
            {product.min_stock_level != null && <InfoTile label="Min Level" value={`${product.min_stock_level} rolls`} />}
            {product.max_stock_level != null && <InfoTile label="Max Level" value={`${product.max_stock_level} rolls`} />}
            {product.reorder_point != null && <InfoTile label="Reorder Point" value={`${product.reorder_point} rolls`} />}
            {product.created_at && <InfoTile label="Created" value={formatIndianDate(product.created_at)} />}
            {product.updated_at && <InfoTile label="Updated" value={formatIndianDate(product.updated_at)} />}
          </div>
        </div>

        {/* Dimensions tiles */}
        {(product.length || product.width || product.weight) && (
          <div className="px-4 mt-4">
            <p className="text-[9.5px] text-gray-400 font-bold uppercase tracking-widest mb-2">Dimensions</p>
            <div className="grid grid-cols-2 gap-2">
              {product.length && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3.5 flex items-center gap-2">
                  <Ruler className="w-4 h-4 text-blue-400 shrink-0" />
                  <div>
                    <p className="text-[9.5px] text-gray-400 font-semibold uppercase tracking-wide leading-none mb-1">Length</p>
                    <p className="text-sm font-bold text-gray-900">{product.length} {product.length_unit}</p>
                  </div>
                </div>
              )}
              {product.width && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3.5 flex items-center gap-2">
                  <Ruler className="w-4 h-4 text-blue-400 rotate-90 shrink-0" />
                  <div>
                    <p className="text-[9.5px] text-gray-400 font-semibold uppercase tracking-wide leading-none mb-1">Width</p>
                    <p className="text-sm font-bold text-gray-900">{product.width} {product.width_unit}</p>
                  </div>
                </div>
              )}
              {product.weight && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3.5 flex items-center gap-2">
                  <Weight className="w-4 h-4 text-orange-400 shrink-0" />
                  <div>
                    <p className="text-[9.5px] text-gray-400 font-semibold uppercase tracking-wide leading-none mb-1">GSM</p>
                    <p className="text-sm font-bold text-gray-900">{product.weight} {product.weight_unit}</p>
                  </div>
                </div>
              )}
              {product.sqm != null && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3.5">
                  <p className="text-[9.5px] text-gray-400 font-semibold uppercase tracking-wide leading-none mb-1">SQM</p>
                  <p className="text-sm font-bold text-gray-900">{product.sqm}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Notes */}
        {product.notes && (
          <div className="mx-4 mt-4 bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="text-[9.5px] text-gray-400 font-bold uppercase tracking-widest mb-2">Notes</p>
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{product.notes}</p>
          </div>
        )}

        {/* Quick action buttons */}
        <div className="px-4 mt-4 pb-28 space-y-2">
          <button
            onClick={() => navigate(`/products/${product.id}/stock`, { state: { from: 'product-detail' } })}
            className="w-full flex items-center justify-between px-4 py-3.5 bg-white border border-gray-100 rounded-2xl shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
                <Package className="w-4 h-4 text-blue-600" />
              </div>
              <div className="text-left">
                <p className="text-sm font-bold text-gray-900">View Individual Stock</p>
                <p className="text-xs text-gray-400">{hasSiblingStats ? `${stats.total} items tracked` : 'Manage stock items'}</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-300" />
          </button>

          <button
            onClick={() => navigate('/production/new', { state: { product, from: 'product-detail', productId: id } })}
            className="w-full flex items-center justify-between px-4 py-3.5 bg-white border border-gray-100 rounded-2xl shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center">
                <Factory className="w-4 h-4 text-green-600" />
              </div>
              <div className="text-left">
                <p className="text-sm font-bold text-gray-900">Create Production Batch</p>
                <p className="text-xs text-gray-400">Start a new production run</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-300" />
          </button>
        </div>
      </div>

      {/* ── DESKTOP ────────────────────────────────────────────── */}
      <div className="hidden lg:block min-h-screen bg-gray-50">
        <div className="bg-white border-b border-gray-200 px-2 sm:px-3 lg:px-4 py-4">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 font-medium px-2 py-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Products
          </button>
        </div>
        <div className="bg-white border-b border-gray-200">
          <ProductDetailHeader product={product} />
        </div>
        <ProductDetailTitle product={product} />
        <div className="bg-white border-b border-gray-200">
          <ProductDetailStats product={product} />
        </div>
        <div className="max-w-7xl mx-auto px-2 sm:px-3 lg:px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <ProductDetailInfo product={product} />
              <ProductDetailDimensions product={product} />
              <ProductDetailStock product={product} />
              {product.has_recipe && (
                <ProductDetailRecipe recipe={recipe} product={product} loading={recipeLoading} />
              )}
              {product.notes && (
                <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Notes</h3>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{product.notes}</p>
                </div>
              )}
            </div>
            <div className="space-y-6">
              <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
                <div className="space-y-3">
                  <button onClick={() => setIsEditOpen(true)} className="w-full flex items-center gap-2 justify-start px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors">
                    <Edit2 className="w-4 h-4" /> Edit Product
                  </button>
                  <button onClick={() => navigate(`/products/${product.id}/stock`, { state: { from: 'product-detail' } })} className="w-full flex items-center gap-2 justify-start px-4 py-2 border border-gray-200 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
                    <Package className="w-4 h-4" /> Stock
                  </button>
                  <button onClick={() => navigate('/production/new', { state: { product, from: 'product-detail', productId: id } })} className="w-full flex items-center gap-2 justify-start px-4 py-2 border border-green-200 bg-green-50 rounded-lg text-sm font-semibold text-green-700 hover:bg-green-100 transition-colors">
                    <Factory className="w-4 h-4" /> Create Production Batch
                  </button>
                </div>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Additional Information</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Created</span>
                    <span className="font-medium">{formatIndianDate(product.created_at)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Last Updated</span>
                    <span className="font-medium">{formatIndianDate(product.updated_at)}</span>
                  </div>
                  {product.manufacturing_date && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Manufacturing Date</span>
                      <span className="font-medium">{formatIndianDate(product.manufacturing_date)}</span>
                    </div>
                  )}
                  {product.qr_code && (
                    <div className="pt-3 border-t border-gray-200">
                      <span className="text-gray-600 block mb-1">QR Code</span>
                      <span className="font-mono text-xs text-gray-900 break-all">{product.qr_code}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ProductFormModal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        onSuccess={() => { setIsEditOpen(false); loadProduct(); }}
        product={product}
        mode="edit"
      />
    </Layout>
  );
}
