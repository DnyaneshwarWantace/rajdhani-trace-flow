import { useNavigate } from 'react-router-dom';
import IndividualProductCard from './IndividualProductCard';
import ProductStockTable from './ProductStockTable';
import ProductStockEmpty from './ProductStockEmpty';
import type { IndividualProduct, Product } from '@/types/product';

interface ProductStockGridProps {
  products: IndividualProduct[];
  product: Product;
  productId: string;
  searchTerm: string;
  statusFilter: string[];
  onView: (product: IndividualProduct) => void;
  onEdit: (product: IndividualProduct) => void;
  onQRCodeClick: (product: IndividualProduct) => void;
  loading?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
  onSelectAllOnPage?: () => void;
  onSelectAll?: () => void;
  allSelected?: boolean;
}

export default function ProductStockGrid({
  products,
  product,
  productId,
  searchTerm,
  statusFilter,
  onView,
  onEdit,
  onQRCodeClick,
  loading = false,
  selectedIds,
  onToggleSelect,
  onSelectAllOnPage,
  onSelectAll,
  allSelected = false,
}: ProductStockGridProps) {
  const navigate = useNavigate();

  const hasFilters = searchTerm !== '' || statusFilter.length > 0;

  if (loading && products.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <h2 className="text-lg font-semibold text-gray-900">
          Individual Products ({products.length})
        </h2>
        {(onSelectAll || onSelectAllOnPage) && products.length > 0 && (
          <div className="flex items-center gap-3">
            {onSelectAll && (
              <button
                type="button"
                onClick={onSelectAll}
                className="text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                {allSelected ? 'Deselect all' : 'Select all'}
              </button>
            )}
            {onSelectAllOnPage && (
              <button
                type="button"
                onClick={onSelectAllOnPage}
                className="text-sm text-gray-600 hover:text-gray-800"
              >
                {products.every((p) => selectedIds?.has(p.id)) ? 'Deselect all on page' : 'Select all on page'}
              </button>
            )}
          </div>
        )}
      </div>

      {products.length === 0 ? (
        <ProductStockEmpty hasFilters={hasFilters} />
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden lg:block">
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <ProductStockTable
                products={products}
                product={product}
                onView={onView}
                onEdit={onEdit}
                onQRCodeClick={onQRCodeClick}
                selectedIds={selectedIds}
                onToggleSelect={onToggleSelect}
                onSelectAllOnPage={onSelectAllOnPage}
                onSelectAll={onSelectAll}
                allSelected={allSelected}
              />
            </div>
          </div>

          {/* Mobile Grid View */}
          <div className="lg:hidden">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {products.map((item) => (
                <IndividualProductCard
                  key={item.id}
                  individualProduct={item}
                  onClick={() => navigate(`/products/${productId}/stock/${item.id}`)}
                  lengthUnit={product?.length_unit}
                  widthUnit={product?.width_unit}
                  weightUnit={product?.weight_unit}
                  selected={selectedIds?.has(item.id)}
                  onToggleSelect={onToggleSelect ? () => onToggleSelect(item.id) : undefined}
                />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

