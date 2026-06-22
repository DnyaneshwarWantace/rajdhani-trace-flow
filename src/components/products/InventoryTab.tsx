import { Loader2, Eye, Edit, Copy, QrCode, BarChart3, Factory, Search, LayoutGrid, AlignJustify, Package } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import ProductTable from '@/components/products/ProductTable';
import ProductCard from '@/components/products/ProductCard';
import ProductGroupedView from '@/components/products/ProductGroupedView';
import InventoryFilters from './InventoryFilters';
import ProductPagination from './ProductPagination';
import type { Product, ProductFilters } from '@/types/product';
import { calculateStockStatus } from '@/utils/stockStatus';
import { useDropdownVisualMaps } from '@/hooks/useDropdownVisualMaps';

function MobileProductCard({
  product, onView, onEdit, onDuplicate, onStock, onProduction, onQRCode, canEdit,
}: {
  product: Product;
  onView?: (p: Product) => void;
  onEdit?: (p: Product) => void;
  onDuplicate?: (p: Product) => void;
  onStock?: (p: Product) => void;
  onProduction?: (p: Product) => void;
  onQRCode?: (p: Product) => void;
  canEdit?: boolean;
}) {
  const { colorCodeMap } = useDropdownVisualMaps();
  const status = calculateStockStatus(product);

  const stockBadge = ({
    'in-stock':     { label: 'In Stock',  bg: 'bg-green-500' },
    'active':       { label: 'In Stock',  bg: 'bg-green-500' },
    'low-stock':    { label: 'Low',       bg: 'bg-amber-500' },
    'out-of-stock': { label: 'Out',       bg: 'bg-red-500' },
    'inactive':     { label: 'Inactive',  bg: 'bg-gray-500' },
  } as Record<string, { label: string; bg: string }>)[status] ?? { label: status, bg: 'bg-gray-400' };

  const stockCount = product.individual_stock_tracking && product.individual_product_stats
    ? product.individual_product_stats.available
    : product.current_stock ?? 0;

  const colorCode = product.color ? colorCodeMap[product.color] : undefined;
  const stockColor = status === 'out-of-stock' ? 'text-red-600' : 'text-green-600';

  const dimStr = product.length && product.width
    ? `${product.length} ${product.length_unit || 'ft'} × ${product.width} ${product.width_unit || 'ft'}`
    : null;
  const gsmStr = product.weight ? `${product.weight} GSM` : null;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
      {/* Image / color area */}
      <div
        className="relative w-full aspect-[4/3] bg-gray-100 cursor-pointer"
        onClick={() => onView?.(product)}
      >
        {product.image_url ? (
          <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
        ) : colorCode ? (
          <div className="w-full h-full" style={{ backgroundColor: colorCode }} />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-3xl font-bold text-gray-300">{product.name?.charAt(0)}</span>
          </div>
        )}

        {/* Stock badge top-left */}
        <span className={`absolute top-2 left-2 text-[10px] font-bold text-white px-2 py-0.5 rounded-full ${stockBadge.bg}`}>
          {stockBadge.label}
        </span>

        {/* Recipe badge top-right */}
        {(product as any).has_recipe && (
          <span className="absolute top-2 right-2 text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
            Recipe
          </span>
        )}
      </div>

      {/* Info */}
      <div className="px-3 pt-2.5 pb-1 flex-1 cursor-pointer" onClick={() => onView?.(product)}>
        <p className="text-sm font-bold text-gray-900 leading-tight line-clamp-2 mb-0.5">{product.name}</p>
        {product.category && (
          <p className="text-xs text-gray-400 mb-1">{product.category}</p>
        )}

        {/* Color dot + name */}
        {product.color && (
          <div className="flex items-center gap-1.5 mb-1">
            {colorCode && (
              <div className="w-3 h-3 rounded-full border border-gray-200 shrink-0" style={{ backgroundColor: colorCode }} />
            )}
            <span className="text-xs text-gray-500">{product.color}</span>
          </div>
        )}

        {/* Dimensions · GSM */}
        {(dimStr || gsmStr) && (
          <p className="text-xs text-gray-500 mb-1">
            {[dimStr, gsmStr].filter(Boolean).join(' · ')}
          </p>
        )}

        {/* Roll count */}
        <p className={`text-xs font-bold ${stockColor} mb-2`}>
          {stockCount} rolls
        </p>
      </div>

      {/* Action icons row */}
      <div className="border-t border-gray-100 py-1.5 flex items-center justify-around">
        <ActionBtn icon={<Eye className="w-3.5 h-3.5" />} label="View" onClick={() => onView?.(product)} color="text-blue-500" activeColor="active:bg-blue-50" />
        {canEdit && <ActionBtn icon={<Edit className="w-3.5 h-3.5" />} label="Edit" onClick={() => onEdit?.(product)} color="text-green-500" activeColor="active:bg-green-50" />}
        {canEdit && <ActionBtn icon={<Copy className="w-3.5 h-3.5" />} label="Copy" onClick={() => onDuplicate?.(product)} color="text-gray-500" activeColor="active:bg-gray-50" />}
        <ActionBtn icon={<QrCode className="w-3.5 h-3.5" />} label="QR" onClick={() => onQRCode?.(product)} color="text-purple-500" activeColor="active:bg-purple-50" />
        <ActionBtn icon={<BarChart3 className="w-3.5 h-3.5" />} label="Stock" onClick={() => onStock?.(product)} color="text-orange-500" activeColor="active:bg-orange-50" />
        <ActionBtn icon={<Factory className="w-3.5 h-3.5" />} label="Prod" onClick={() => onProduction?.(product)} color="text-violet-500" activeColor="active:bg-violet-50" />
      </div>
    </div>
  );
}

function ActionBtn({ icon, label, onClick, color = 'text-gray-500', activeColor = 'active:bg-gray-50' }: { icon: React.ReactNode; label: string; onClick?: () => void; color?: string; activeColor?: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-0.5 py-0.5 flex-1 ${color} ${activeColor}`}
    >
      {icon}
      <span className="text-[9px] font-semibold leading-none">{label}</span>
    </button>
  );
}

function MobileProductListCard({
  product, onView, onEdit, onDuplicate, onStock, onProduction, onQRCode, canEdit,
}: {
  product: Product;
  onView?: (p: Product) => void;
  onEdit?: (p: Product) => void;
  onDuplicate?: (p: Product) => void;
  onStock?: (p: Product) => void;
  onProduction?: (p: Product) => void;
  onQRCode?: (p: Product) => void;
  canEdit?: boolean;
}) {
  const { colorCodeMap } = useDropdownVisualMaps();
  const status = calculateStockStatus(product);

  const stockBadge = ({
    'in-stock':     { label: 'In Stock', bg: 'bg-green-500' },
    'active':       { label: 'In Stock', bg: 'bg-green-500' },
    'low-stock':    { label: 'Low',      bg: 'bg-amber-500' },
    'out-of-stock': { label: 'Out',      bg: 'bg-red-500' },
    'inactive':     { label: 'Inactive', bg: 'bg-gray-500' },
  } as Record<string, { label: string; bg: string }>)[status] ?? { label: status, bg: 'bg-gray-400' };

  const stockCount = product.individual_stock_tracking && product.individual_product_stats
    ? product.individual_product_stats.available
    : product.current_stock ?? 0;

  const colorCode = product.color ? colorCodeMap[product.color] : undefined;
  const stockColor = status === 'out-of-stock' ? 'text-red-600' : 'text-green-600';
  const dimStr = product.length && product.width
    ? `${product.length} ${product.length_unit || 'ft'} × ${product.width} ${product.width_unit || 'ft'}`
    : null;
  const gsmStr = product.weight ? `${product.weight} GSM` : null;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Top: image left, details right */}
      <div className="flex cursor-pointer" onClick={() => onView?.(product)}>
        {/* Image — full height, ~40% width */}
        <div className="relative w-[38%] shrink-0 bg-gray-100" style={{ minHeight: 130 }}>
          {product.image_url ? (
            <img src={product.image_url} alt={product.name} className="absolute inset-0 w-full h-full object-cover" />
          ) : colorCode ? (
            <div className="absolute inset-0" style={{ backgroundColor: colorCode }} />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-3xl font-bold text-gray-200">{product.name?.charAt(0)}</span>
            </div>
          )}
          {/* Status badge */}
          <span className={`absolute top-2 left-2 text-[9px] font-bold text-white px-2 py-0.5 rounded-full ${stockBadge.bg}`}>
            {stockBadge.label}
          </span>
        </div>

        {/* Details */}
        <div className="flex-1 min-w-0 p-3">
          <div className="flex items-start justify-between gap-1">
            <p className="text-sm font-bold text-gray-900 leading-tight">{product.name}</p>
            {(product as any).has_recipe && (
              <span className="text-[9px] font-bold text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded-full shrink-0">Recipe</span>
            )}
          </div>
          {product.category && <p className="text-xs text-gray-400 mt-0.5">{product.category}</p>}
          {product.color && (
            <div className="flex items-center gap-1.5 mt-1">
              {colorCode
                ? <div className="w-3 h-3 rounded-full border border-gray-200 shrink-0" style={{ backgroundColor: colorCode }} />
                : <div className="w-3 h-3 rounded-full bg-gray-300 shrink-0" />}
              <span className="text-xs text-gray-600 font-medium">{product.color}</span>
            </div>
          )}
          {dimStr && <p className="text-xs text-gray-400 mt-1">{dimStr}</p>}
          {gsmStr && <p className="text-xs text-gray-400">{gsmStr}</p>}
          <p className={`text-sm font-bold ${stockColor} mt-1.5`}>{stockCount} Rolls</p>
        </div>
      </div>

      {/* Actions row — full width below */}
      <div className="border-t border-gray-100 py-1.5 flex items-center justify-around">
        <ActionBtn icon={<Eye className="w-3.5 h-3.5" />} label="View" onClick={() => onView?.(product)} color="text-blue-500" activeColor="active:bg-blue-50" />
        {canEdit && <ActionBtn icon={<Edit className="w-3.5 h-3.5" />} label="Edit" onClick={() => onEdit?.(product)} color="text-green-500" activeColor="active:bg-green-50" />}
        {canEdit && <ActionBtn icon={<Copy className="w-3.5 h-3.5" />} label="Copy" onClick={() => onDuplicate?.(product)} color="text-gray-500" activeColor="active:bg-gray-50" />}
        <ActionBtn icon={<QrCode className="w-3.5 h-3.5" />} label="QR" onClick={() => onQRCode?.(product)} color="text-purple-500" activeColor="active:bg-purple-50" />
        <ActionBtn icon={<BarChart3 className="w-3.5 h-3.5" />} label="Stock" onClick={() => onStock?.(product)} color="text-orange-500" activeColor="active:bg-orange-50" />
        <ActionBtn icon={<Factory className="w-3.5 h-3.5" />} label="Prod" onClick={() => onProduction?.(product)} color="text-violet-500" activeColor="active:bg-violet-50" />
      </div>
    </div>
  );
}

interface InventoryTabProps {
  products: Product[];
  loading: boolean;
  error: string | null;
  filters: ProductFilters;
  viewMode: 'grid' | 'table' | 'grouped';
  totalProducts: number;
  onSearchChange: (value: string) => void;
  onCategoryChange: (values: string[]) => void;
  onStatusChange: (values: string[]) => void;
  onColorChange?: (values: string[]) => void;
  onPatternChange?: (values: string[]) => void;
  onLengthChange?: (values: string[]) => void;
  onWidthChange?: (values: string[]) => void;
  onWeightChange?: (values: string[]) => void;
  onViewModeChange: (mode: 'grid' | 'table' | 'grouped') => void;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
  onSortChange?: (sortBy: string, sortOrder: 'asc' | 'desc') => void;
  onView: (product: Product) => void;
  onEdit: (product: Product) => void;
  onDuplicate: (product: Product) => void;
  onStock: (product: Product) => void;
  onProduction: (product: Product) => void;
  onQRCode?: (product: Product) => void;
  onDelete?: (product: Product) => void;
  canEdit?: boolean;
  canDelete?: boolean;
}

export default function InventoryTab({
  products,
  loading,
  error,
  filters,
  viewMode,
  totalProducts,
  onSearchChange,
  onCategoryChange,
  onStatusChange,
  onColorChange,
  onPatternChange,
  onLengthChange,
  onWidthChange,
  onWeightChange,
  onViewModeChange: _onViewModeChange,
  onPageChange,
  onLimitChange,
  onSortChange,
  onView,
  onEdit,
  onDuplicate,
  onStock,
  onProduction,
  onQRCode,
  onDelete,
  canEdit = true,
  canDelete = false,
}: InventoryTabProps) {
  // Mobile view toggle: 'list' = 1 per row, 'grid' = 2 per row
  const [mobileView, setMobileView] = useState<'list' | 'grid'>('list');

  // Infinite scroll state for mobile
  const [mobileProducts, setMobileProducts] = useState<Product[]>([]);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const currentPage = filters.page || 1;
  const hasMore = mobileProducts.length < totalProducts;
  // Track whether we're in a mobile infinite-scroll load (page > 1)
  const isLoadingMore = loading && currentPage > 1;
  // Initial load: page 1 and no products yet
  const isInitialLoad = loading && currentPage === 1 && mobileProducts.length === 0;

  // Reset accumulated list when filters change (page resets to 1)
  useEffect(() => {
    if (currentPage === 1) {
      setMobileProducts(products);
    } else {
      setMobileProducts(prev => {
        const ids = new Set(prev.map(p => p._id || p.id));
        return [...prev, ...products.filter(p => !ids.has(p._id || p.id))];
      });
    }
  }, [products, currentPage]);

  // Intersection observer — load next page when sentinel visible
  useEffect(() => {
    if (!sentinelRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loading && hasMore) {
          onPageChange(currentPage + 1);
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [loading, hasMore, currentPage, onPageChange]);

  return (
    <>
      {/* Filters — hidden on mobile (shown via bottom sheet) */}
      <div className="hidden lg:block">
        <InventoryFilters
          filters={filters}
          onSearchChange={onSearchChange}
          onCategoryChange={onCategoryChange}
          onStatusChange={onStatusChange}
          onColorChange={onColorChange}
          onPatternChange={onPatternChange}
          onLengthChange={onLengthChange}
          onWidthChange={onWidthChange}
          onWeightChange={onWeightChange}
          onSortChange={onSortChange}
        />
      </div>

      {/* Mobile search bar + view toggle — always visible */}
      <div className="lg:hidden mb-3 flex items-center gap-2">
        <div className="flex-1 flex items-center gap-3 bg-white border border-gray-200 rounded-2xl px-4 py-2.5 shadow-sm">
          <Search className="w-4 h-4 text-gray-400 shrink-0" />
          <input
            type="text"
            value={filters.search || ''}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search products..."
            className="flex-1 text-sm outline-none bg-transparent text-gray-900 placeholder-gray-400"
          />
        </div>
        {/* View toggle */}
        <div className="flex items-center bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden shrink-0">
          <button
            onClick={() => setMobileView('list')}
            className={`w-9 h-9 flex items-center justify-center transition-colors ${mobileView === 'list' ? 'bg-blue-600 text-white' : 'text-gray-400'}`}
          >
            <AlignJustify className="w-4 h-4" />
          </button>
          <button
            onClick={() => setMobileView('grid')}
            className={`w-9 h-9 flex items-center justify-center transition-colors ${mobileView === 'grid' ? 'bg-blue-600 text-white' : 'text-gray-400'}`}
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Initial Loading State — only on first load before any products show */}
      {isInitialLoad && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-primary-600 mx-auto mb-4" />
            <p className="text-gray-600">Loading products...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-red-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-red-800">{error}</p>
          </div>
        </div>
      )}

      {/* Products List — show even while loading more pages */}
      {!error && (mobileProducts.length > 0 || products.length > 0 || !loading) && (
        <>
          {/* Desktop View */}
          <div className="hidden lg:block">
            {loading && currentPage === 1 ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <Loader2 className="w-12 h-12 animate-spin text-primary-600 mx-auto mb-4" />
                  <p className="text-gray-600">Loading products...</p>
                </div>
              </div>
            ) : viewMode === 'table' ? (
              <ProductTable
                products={products}
                onView={onView}
                onEdit={onEdit}
                onDuplicate={onDuplicate}
                onStock={onStock}
                onProduction={onProduction}
                onQRCode={onQRCode}
                canEdit={canEdit}
              />
            ) : viewMode === 'grouped' ? (
              <ProductGroupedView
                products={products}
                onView={onView}
                onEdit={onEdit}
                onDelete={onDelete}
                canEdit={canEdit}
                canDelete={canDelete}
                onDuplicate={onDuplicate}
                onStock={onStock}
                onProduction={onProduction}
                onQRCode={onQRCode}
              />
            ) : (
              <div className="columns-1 md:columns-2 xl:columns-3 gap-4 space-y-4">
                {products.map((product) => (
                  <div key={product._id} className="break-inside-avoid">
                    <ProductCard
                      product={product}
                      onView={onView}
                      onEdit={onEdit}
                      onDuplicate={onDuplicate}
                      onStock={onStock}
                      onProduction={onProduction}
                      onQRCode={onQRCode}
                      onDelete={onDelete}
                      canDelete={canDelete}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Mobile View — list (1-per-row) or grid (2-per-row) */}
          {mobileView === 'list' ? (
            <div className="lg:hidden flex flex-col gap-2.5 pb-24">
              {mobileProducts.map((product) => (
                <MobileProductListCard
                  key={product._id || product.id}
                  product={product}
                  onView={onView}
                  onEdit={onEdit}
                  onDuplicate={onDuplicate}
                  onStock={onStock}
                  onProduction={onProduction}
                  onQRCode={onQRCode}
                  canEdit={canEdit}
                />
              ))}
            </div>
          ) : (
            <div className="lg:hidden flex gap-3 pb-24">
              <div className="flex-1 flex flex-col gap-3">
                {mobileProducts.filter((_, i) => i % 2 === 0).map((product) => (
                  <MobileProductCard
                    key={product._id || product.id}
                    product={product}
                    onView={onView}
                    onEdit={onEdit}
                    onDuplicate={onDuplicate}
                    onStock={onStock}
                    onProduction={onProduction}
                    onQRCode={onQRCode}
                    canEdit={canEdit}
                  />
                ))}
              </div>
              <div className="flex-1 flex flex-col gap-3">
                {mobileProducts.filter((_, i) => i % 2 === 1).map((product) => (
                  <MobileProductCard
                    key={product._id || product.id}
                    product={product}
                    onView={onView}
                    onEdit={onEdit}
                    onDuplicate={onDuplicate}
                    onStock={onStock}
                    onProduction={onProduction}
                    onQRCode={onQRCode}
                    canEdit={canEdit}
                  />
                ))}
              </div>
            </div>
          )}
          {/* Empty state when filters return no results */}
          {!isInitialLoad && !isLoadingMore && mobileProducts.length === 0 && (
            <div className="lg:hidden flex flex-col items-center justify-center py-16 text-center px-4">
              <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-3">
                <Package className="w-7 h-7 text-gray-300" />
              </div>
              <p className="text-sm font-bold text-gray-700 mb-1">No Products Found</p>
              <p className="text-xs text-gray-400">Try adjusting your filters or search</p>
            </div>
          )}
          {/* Infinite scroll sentinel */}
          <div ref={sentinelRef} className="lg:hidden h-4" />
          {/* Loading spinner only for subsequent pages */}
          {isLoadingMore && (
            <div className="lg:hidden flex justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            </div>
          )}

          {/* Pagination — desktop only */}
          <div className="hidden lg:block">
            <ProductPagination
              totalProducts={totalProducts}
              filters={filters}
              onPageChange={onPageChange}
              onLimitChange={onLimitChange}
            />
          </div>
        </>
      )}
    </>
  );
}

