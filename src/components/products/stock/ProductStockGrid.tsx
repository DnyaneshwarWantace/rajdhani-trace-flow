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
  statusFilter: string;
  qualityFilter: string;
  onView: (product: IndividualProduct) => void;
  onEdit: (product: IndividualProduct) => void;
  onQRCodeClick: (product: IndividualProduct) => void;
  loading?: boolean;
}

export default function ProductStockGrid({
  products,
  product,
  productId,
  searchTerm,
  statusFilter,
  qualityFilter,
  onView,
  onEdit,
  onQRCodeClick,
  loading = false,
}: ProductStockGridProps) {
  const navigate = useNavigate();

  const hasFilters = searchTerm !== '' || statusFilter !== 'all' || qualityFilter !== 'all';

  if (loading && products.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">
          Individual Products ({products.length})
        </h2>
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
                />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

