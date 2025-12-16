import { Loader2 } from 'lucide-react';
import ProductTable from '@/components/products/ProductTable';
import ProductCard from '@/components/products/ProductCard';
import ProductGroupedView from '@/components/products/ProductGroupedView';
import InventoryFilters from './InventoryFilters';
import ProductPagination from './ProductPagination';
import type { Product, ProductFilters } from '@/types/product';

interface InventoryTabProps {
  products: Product[];
  loading: boolean;
  error: string | null;
  filters: ProductFilters;
  viewMode: 'grid' | 'table' | 'grouped';
  totalProducts: number;
  onSearchChange: (value: string) => void;
  onCategoryChange: (values: string[]) => void;
  onStatusChange: (value: string) => void;
  onColorChange?: (values: string[]) => void;
  onPatternChange?: (values: string[]) => void;
  onLengthChange?: (values: string[]) => void;
  onWidthChange?: (values: string[]) => void;
  onWeightChange?: (values: string[]) => void;
  onViewModeChange: (mode: 'grid' | 'table' | 'grouped') => void;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
  onView: (product: Product) => void;
  onEdit: (product: Product) => void;
  onDuplicate: (product: Product) => void;
  onStock: (product: Product) => void;
  onProduction: (product: Product) => void;
  onQRCode?: (product: Product) => void;
  onDelete?: (product: Product) => void;
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
  onViewModeChange,
  onPageChange,
  onLimitChange,
  onView,
  onEdit,
  onDuplicate,
  onStock,
  onProduction,
  onQRCode,
  onDelete,
  canDelete = false,
}: InventoryTabProps) {
  return (
    <>
      <InventoryFilters
        filters={filters}
        viewMode={viewMode}
        onSearchChange={onSearchChange}
        onCategoryChange={onCategoryChange}
        onStatusChange={onStatusChange}
        onColorChange={onColorChange}
        onPatternChange={onPatternChange}
        onLengthChange={onLengthChange}
        onWidthChange={onWidthChange}
        onWeightChange={onWeightChange}
        onViewModeChange={onViewModeChange}
      />

      {/* Loading State */}
      {loading && (
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

      {/* Products List */}
      {!loading && !error && (
        <>
          {/* Desktop View */}
          <div className="hidden lg:block">
            {viewMode === 'table' ? (
              <ProductTable
                products={products}
                onView={onView}
                onEdit={onEdit}
                onDuplicate={onDuplicate}
                onStock={onStock}
                onProduction={onProduction}
                onQRCode={onQRCode}
                onDelete={onDelete}
                canDelete={canDelete}
              />
            ) : viewMode === 'grouped' ? (
              <ProductGroupedView
                products={products}
                onView={onView}
                onEdit={onEdit}
                onDelete={onDelete}
                onDuplicate={onDuplicate}
                onStock={onStock}
                onProduction={onProduction}
                onQRCode={onQRCode}
                canDelete={canDelete}
              />
            ) : (
              // Masonry-style grid using CSS columns
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

          {/* Mobile View - Always Grid */}
          <div className="lg:hidden">
            {/* Masonry-style grid on mobile/tablet as well */}
            <div className="columns-1 sm:columns-2 gap-4 space-y-4">
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
          </div>

          {/* Pagination */}
          <ProductPagination
            totalProducts={totalProducts}
            filters={filters}
            onPageChange={onPageChange}
            onLimitChange={onLimitChange}
          />
        </>
      )}
    </>
  );
}

