import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import StockStatsCards from '@/components/products/stock/StockStatsCards';
import ProductStockHeader from '@/components/products/stock/ProductStockHeader';
import ProductStockFilters from '@/components/products/stock/ProductStockFilters';
import ProductStockGrid from '@/components/products/stock/ProductStockGrid';
import IndividualProductPagination from '@/components/products/stock/IndividualProductPagination';
import ProductStockError from '@/components/products/stock/ProductStockError';
import QRCodeDialog from '@/components/products/stock/QRCodeDialog';
import EditIndividualProductDialog from '@/components/products/stock/EditIndividualProductDialog';
import { ProductService } from '@/services/productService';
import { IndividualProductService } from '@/services/individualProductService';
import type {
  Product,
  IndividualProduct,
  IndividualProductFormData,
  StockStats,
} from '@/types/product';

export default function ProductStock() {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const fromPage = location.state?.from || 'stock-page';

  const [product, setProduct] = useState<Product | null>(null);
  const [individualProducts, setIndividualProducts] = useState<IndividualProduct[]>([]);
  const [allIndividualProducts, setAllIndividualProducts] = useState<IndividualProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalProducts, setTotalProducts] = useState(0);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [qualityFilter, setQualityFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(50);

  // QR Code Dialog
  const [showQRCode, setShowQRCode] = useState(false);
  const [selectedQRProduct, setSelectedQRProduct] = useState<IndividualProduct | null>(null);

  // Edit Dialog
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<IndividualProduct | null>(null);

  useEffect(() => {
    if (productId) {
      loadProduct();
      loadAllIndividualProducts(); // Load all for stats
    }
  }, [productId]);

  useEffect(() => {
    if (productId) {
      loadIndividualProducts();
    }
  }, [productId, searchTerm, statusFilter, qualityFilter, startDate, endDate, currentPage, limit]);

  const loadProduct = async () => {
    if (!productId) return;

    try {
      const productData = await ProductService.getProductById(productId);
      setProduct(productData);
    } catch (err) {
      console.error('Error loading product:', err);
    }
  };

  const loadAllIndividualProducts = async () => {
    if (!productId) return;

    try {
      // Load all products without pagination for stats
      const result = await IndividualProductService.getIndividualProductsByProductId(productId, {
        limit: 10000, // High limit to get all products
      });
      setAllIndividualProducts(result.products);
    } catch (err) {
      console.error('Error loading all individual products:', err);
    }
  };

  const loadIndividualProducts = async () => {
    if (!productId) {
      setError('Product ID is required');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const offset = (currentPage - 1) * limit;
      const result = await IndividualProductService.getIndividualProductsByProductId(productId, {
        status: statusFilter,
        quality_grade: qualityFilter,
        search: searchTerm || undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        limit,
        offset,
      });

      setIndividualProducts(result.products);
      setTotalProducts(result.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Calculate stats from all products (not just current page)
  const stats: StockStats = {
    available: allIndividualProducts.filter((p) => p.status === 'available').length,
    in_production: allIndividualProducts.filter((p) => p.status === 'in_production').length,
    used: allIndividualProducts.filter((p) => p.status === 'used').length,
    quality_check: allIndividualProducts.filter((p) => p.status === 'quality_check').length,
    reserved: allIndividualProducts.filter((p) => p.status === 'reserved').length,
    sold: allIndividualProducts.filter((p) => p.status === 'sold').length,
    damaged: allIndividualProducts.filter((p) => p.status === 'damaged').length,
    returned: allIndividualProducts.filter((p) => p.status === 'returned').length,
    total: allIndividualProducts.length,
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleLimitChange = (newLimit: number) => {
    setLimit(newLimit);
    setCurrentPage(1); // Reset to first page when changing limit
  };

  const handleFilterChange = () => {
    setCurrentPage(1); // Reset to first page when filters change
  };

  const handleView = (individualProduct: IndividualProduct) => {
    navigate(`/products/${productId}/stock/${individualProduct.id}`, {
      state: { from: fromPage }
    });
  };

  const handleEdit = (individualProduct: IndividualProduct) => {
    setEditingProduct(individualProduct);
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = async (id: string, data: Partial<IndividualProductFormData>) => {
    try {
      await IndividualProductService.updateIndividualProduct(id, data);

      // Reload data to ensure consistency
      await loadIndividualProducts();
      await loadAllIndividualProducts(); // Reload for updated stats
    } catch (error) {
      console.error('Error updating individual product:', error);
      throw error;
    }
  };

  const handleQRCodeClick = (individualProduct: IndividualProduct) => {
    setSelectedQRProduct(individualProduct);
    setShowQRCode(true);
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    handleFilterChange();
  };

  const handleStatusChange = (value: string) => {
    setStatusFilter(value);
    handleFilterChange();
  };

  const handleQualityChange = (value: string) => {
    setQualityFilter(value);
    handleFilterChange();
  };

  const handleStartDateChange = (value: string) => {
    setStartDate(value);
    handleFilterChange();
  };

  const handleEndDateChange = (value: string) => {
    setEndDate(value);
    handleFilterChange();
  };

  if (loading && !individualProducts.length) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </Layout>
    );
  }

  if (error || !product || !productId) {
    return (
      <Layout>
        <ProductStockError error={error || 'Product not found'} />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50">
        <ProductStockHeader product={product} productId={productId} />

        <div className="p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6">
          <StockStatsCards stats={stats} />

          <ProductStockFilters
            searchTerm={searchTerm}
            statusFilter={statusFilter}
            qualityFilter={qualityFilter}
            startDate={startDate}
            endDate={endDate}
            onSearchChange={handleSearchChange}
            onStatusChange={handleStatusChange}
            onQualityChange={handleQualityChange}
            onStartDateChange={handleStartDateChange}
            onEndDateChange={handleEndDateChange}
          />

          <ProductStockGrid
            products={individualProducts}
            product={product}
            productId={productId}
            searchTerm={searchTerm}
            statusFilter={statusFilter}
            qualityFilter={qualityFilter}
            onView={handleView}
            onEdit={handleEdit}
            onQRCodeClick={handleQRCodeClick}
            loading={loading}
          />

          <IndividualProductPagination
            totalProducts={totalProducts}
            currentPage={currentPage}
            limit={limit}
            onPageChange={handlePageChange}
            onLimitChange={handleLimitChange}
          />
        </div>

        <QRCodeDialog
          open={showQRCode}
          onOpenChange={setShowQRCode}
          individualProduct={selectedQRProduct}
          product={product}
        />

        <EditIndividualProductDialog
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          individualProduct={editingProduct}
          onSave={handleSaveEdit}
        />
      </div>
    </Layout>
  );
}
