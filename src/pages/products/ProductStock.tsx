import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import StockStatsCards from '@/components/products/stock/StockStatsCards';
import ProductStockHeader from '@/components/products/stock/ProductStockHeader';
import ProductStockFilters from '@/components/products/stock/ProductStockFilters';
import ProductStockGrid from '@/components/products/stock/ProductStockGrid';
import ProductStockError from '@/components/products/stock/ProductStockError';
import QRCodeDialog from '@/components/products/stock/QRCodeDialog';
import EditIndividualProductDialog from '@/components/products/stock/EditIndividualProductDialog';
import IndividualProductPagination from '@/components/products/stock/IndividualProductPagination';
import { ProductService } from '@/services/productService';
import { IndividualProductService } from '@/services/individualProductService';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';
import { downloadQRsAsPdf, type ProductInfo } from '@/utils/qrPdfExport';
import { useDropdownVisualMaps } from '@/hooks/useDropdownVisualMaps';
import type {
  Product,
  IndividualProduct,
  IndividualProductFormData,
  StockStats,
} from '@/types/product';
import { useLiveSyncRefresh } from '@/hooks/useLiveSyncRefresh';

/** Sanitize string for use in file names */
function sanitizeFileName(s: string): string {
  return s.replace(/[^a-zA-Z0-9\-_.]/g, '_').replace(/_+/g, '_').slice(0, 100);
}

/** Build CSV content from individual products */
function buildIndividualProductsCSV(products: IndividualProduct[], productName: string): string {
  const headers = [
    'Individual Product ID',
    'QR Code',
    'Product Name',
    'Status',
    'Roll Number',
    'Location',
    'Inspector',
    'Production Date',
    'Batch Number',
    'Final Length',
    'Final Width',
    'Final Weight',
    'Notes',
    'Created At',
    'Updated At',
  ];
  const rows = products.map((p) => [
    p.id,
    p.qr_code || '',
    p.product_name || productName,
    p.status,
    p.roll_number || '',
    p.location || '',
    p.inspector || '',
    p.production_date || '',
    p.batch_number || '',
    p.final_length || '',
    p.final_width || '',
    p.final_weight || '',
    (p.notes || '').replace(/"/g, '""'),
    p.created_at || '',
    p.updated_at || '',
  ]);
  const escape = (val: string) => (val.includes(',') || val.includes('"') || val.includes('\n') ? `"${val}"` : val);
  const csvRows = [headers.map(escape).join(','), ...rows.map((r) => r.map(escape).join(','))];
  return '\uFEFF' + csvRows.join('\r\n'); // BOM for Excel
}

/** Build Excel workbook from individual products (same columns as CSV) */
function buildIndividualProductsExcel(products: IndividualProduct[], productName: string): XLSX.WorkBook {
  const headers = [
    'Individual Product ID',
    'QR Code',
    'Product Name',
    'Status',
    'Roll Number',
    'Location',
    'Inspector',
    'Production Date',
    'Batch Number',
    'Final Length',
    'Final Width',
    'Final Weight',
    'Notes',
    'Created At',
    'Updated At',
  ];
  const rows = products.map((p) => [
    p.id,
    p.qr_code || '',
    p.product_name || productName,
    p.status,
    p.roll_number || '',
    p.location || '',
    p.inspector || '',
    p.production_date || '',
    p.batch_number || '',
    p.final_length || '',
    p.final_width || '',
    p.final_weight || '',
    p.notes || '',
    p.created_at || '',
    p.updated_at || '',
  ]);
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Individual Products');
  return wb;
}

export default function ProductStock() {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const fromPage = location.state?.from || 'stock-page';

  const [product, setProduct] = useState<Product | null>(null);
  const [individualProducts, setIndividualProducts] = useState<IndividualProduct[]>([]);
  const [allIndividualProducts, setAllIndividualProducts] = useState<IndividualProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const PAGE_SIZE = 50;
  const offsetRef = useRef(0);
  const sentinelRef = useRef<HTMLDivElement>(null);
  // Desktop pagination
  const [desktopPage, setDesktopPage] = useState(1);
  const [desktopLimit, setDesktopLimit] = useState(50);
  const [desktopProducts, setDesktopProducts] = useState<IndividualProduct[]>([]);
  const [desktopTotal, setDesktopTotal] = useState(0);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [locationFilter, setLocationFilter] = useState<string[]>([]);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Sorting
  const [sortBy, setSortBy] = useState<'qr_code' | 'status' | 'created_at'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // QR Code Dialog
  const [showQRCode, setShowQRCode] = useState(false);
  const [selectedQRProduct, setSelectedQRProduct] = useState<IndividualProduct | null>(null);

  // Edit Dialog
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<IndividualProduct | null>(null);

  // Export / Download QR PDF
  const [downloadingQrPdf, setDownloadingQrPdf] = useState(false);
  const { toast } = useToast();
  const { patternImageMap } = useDropdownVisualMaps();

  // Selection for "Download selected QR codes"
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (productId) {
      loadProduct();
      loadAllIndividualProducts();
    }
  }, [productId]);

  // Reset and reload when filters/sort change (mobile infinite scroll)
  useEffect(() => {
    if (!productId) return;
    offsetRef.current = 0;
    setIndividualProducts([]);
    setHasMore(true);
    loadIndividualProducts(0, true);
  }, [productId, searchTerm, statusFilter, locationFilter, startDate, endDate, sortBy, sortOrder]);

  // Desktop: reset to page 1 when filters change
  useEffect(() => {
    setDesktopPage(1);
  }, [productId, searchTerm, statusFilter, locationFilter, startDate, endDate, sortBy, sortOrder]);


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

  const loadIndividualProducts = useCallback(async (offset: number, isReset = false) => {
    if (!productId) {
      setError('Product ID is required');
      setLoading(false);
      return;
    }
    try {
      if (isReset) setLoading(true);
      else setLoadingMore(true);
      setError(null);

      const result = await IndividualProductService.getIndividualProductsByProductId(productId, {
        status: statusFilter.length > 0 ? statusFilter : undefined,
        location: locationFilter.length > 0 ? locationFilter : undefined,
        search: searchTerm || undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        limit: PAGE_SIZE,
        offset,
        sortBy,
        sortOrder,
      });

      setIndividualProducts(prev => isReset ? result.products : [...prev, ...result.products]);
      offsetRef.current = offset + result.products.length;
      setHasMore(result.products.length === PAGE_SIZE);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [productId, searchTerm, statusFilter, locationFilter, startDate, endDate, sortBy, sortOrder]);

  // Desktop pagination load
  const loadDesktopProducts = useCallback(async () => {
    if (!productId) return;
    try {
      const result = await IndividualProductService.getIndividualProductsByProductId(productId, {
        status: statusFilter.length > 0 ? statusFilter : undefined,
        location: locationFilter.length > 0 ? locationFilter : undefined,
        search: searchTerm || undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        limit: desktopLimit,
        offset: (desktopPage - 1) * desktopLimit,
        sortBy,
        sortOrder,
      });
      setDesktopProducts(result.products);
      setDesktopTotal(result.total ?? allIndividualProducts.length);
    } catch (err) {
      console.error('Error loading desktop products:', err);
    }
  }, [productId, desktopPage, desktopLimit, searchTerm, statusFilter, locationFilter, startDate, endDate, sortBy, sortOrder, allIndividualProducts.length]);

  useEffect(() => {
    loadDesktopProducts();
  }, [loadDesktopProducts]);

  // Infinite scroll — load more when sentinel enters viewport
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
          loadIndividualProducts(offsetRef.current);
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, loading, loadIndividualProducts]);

  useLiveSyncRefresh({
    modules: ['individual_products', 'products', 'production'],
    onRefresh: () => {
      if (!productId) return;
      loadProduct();
      loadAllIndividualProducts();
      loadDesktopProducts();
      offsetRef.current = 0;
      setIndividualProducts([]);
      setHasMore(true);
      loadIndividualProducts(0, true);
    },
    pollingMs: 6000,
  });

  // Calculate stats from all products (not just current page)
  const stats: StockStats = {
    available: allIndividualProducts.filter((p) => p.status === 'available').length,
    in_production: allIndividualProducts.filter((p) => p.status === 'in_production').length,
    used: allIndividualProducts.filter((p) => p.status === 'used').length,
    reserved: allIndividualProducts.filter((p) => p.status === 'reserved').length,
    sold: allIndividualProducts.filter((p) => p.status === 'sold').length,
    damaged: allIndividualProducts.filter((p) => p.status === 'damaged').length,
    total: allIndividualProducts.length,
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
      await loadDesktopProducts();
      offsetRef.current = 0;
      setIndividualProducts([]);
      setHasMore(true);
      await loadIndividualProducts(0, true);
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

  const handleSearchChange = (value: string) => setSearchTerm(value);
  const handleStatusChange = (values: string[]) => setStatusFilter(values);
  const handleLocationChange = (values: string[]) => setLocationFilter(values);
  const handleStartDateChange = (value: string) => setStartDate(value);
  const handleEndDateChange = (value: string) => setEndDate(value);

  const handleSortChange = (newSortBy: 'qr_code' | 'status' | 'created_at', newSortOrder: 'asc' | 'desc') => {
    setSortBy(newSortBy);
    setSortOrder(newSortOrder);
  };

  const handleExportCSV = () => {
    if (allIndividualProducts.length === 0) {
      toast({ title: 'No data', description: 'No individual products to export', variant: 'destructive' });
      return;
    }
    const productName = product?.name || 'Product';
    const csv = buildIndividualProductsCSV(allIndividualProducts, productName);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${sanitizeFileName(productName)}-individual-products.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    toast({ title: 'Exported', description: `${allIndividualProducts.length} individual products exported to CSV` });
  };

  const handleExportExcel = () => {
    if (allIndividualProducts.length === 0) {
      toast({ title: 'No data', description: 'No individual products to export', variant: 'destructive' });
      return;
    }
    const productName = product?.name || 'Product';
    const wb = buildIndividualProductsExcel(allIndividualProducts, productName);
    XLSX.writeFile(wb, `${sanitizeFileName(productName)}-individual-products.xlsx`);
    toast({ title: 'Exported', description: `${allIndividualProducts.length} individual products exported to Excel` });
  };

  const handleDownloadQrPdf = async (list?: IndividualProduct[]) => {
    const items = list ?? allIndividualProducts;
    const withQr = items.filter((p) => p.qr_code);
    if (withQr.length === 0) {
      toast({ title: 'No QR codes', description: 'No QR codes available.', variant: 'destructive' });
      return;
    }
    setDownloadingQrPdf(true);
    toast({ title: 'Generating PDF…', description: `Preparing ${withQr.length} QR codes, please wait.` });
    try {
      const productName = product?.name || 'Product';
      const productInfo: ProductInfo = {
        name: productName,
        color: product?.color,
        pattern: product?.pattern,
        patternImageUrl: product?.pattern ? patternImageMap[product.pattern] : undefined,
        length: product?.length,
        length_unit: product?.length_unit,
        width: product?.width,
        width_unit: product?.width_unit,
        weight: product?.weight,
        weight_unit: product?.weight_unit,
      };
      await downloadQRsAsPdf(
        withQr,
        `QR Codes — ${productName}`,
        `${sanitizeFileName(productName)}-qr-codes.pdf`,
        undefined,
        productInfo
      );
      toast({ title: 'PDF Downloaded', description: `${withQr.length} QR codes saved as PDF.` });
    } catch {
      toast({ title: 'Error', description: 'Failed to generate PDF.', variant: 'destructive' });
    } finally {
      setDownloadingQrPdf(false);
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  /** Select/deselect all items on the current page */
  const handleSelectAllOnPage = () => {
    const pageIds = individualProducts.map((p) => p.id);
    const allSelected = pageIds.every((id) => selectedIds.has(id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) pageIds.forEach((id) => next.delete(id));
      else pageIds.forEach((id) => next.add(id));
      return next;
    });
  };

  /** Select/deselect all items across all pages (uses allIndividualProducts) */
  const handleSelectAll = () => {
    const allIds = allIndividualProducts.map((p) => p.id);
    const allSelected = allIds.length > 0 && allIds.every((id) => selectedIds.has(id));
    setSelectedIds(allSelected ? new Set() : new Set(allIds));
  };

  const allSelected = allIndividualProducts.length > 0 && allIndividualProducts.every((p) => selectedIds.has(p.id));

  const handleClearSelection = () => setSelectedIds(new Set());

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
        <ProductStockHeader
          product={product}
          productId={productId}
          onExportCSV={handleExportCSV}
          onExportExcel={handleExportExcel}
          onDownloadQrPdf={selectedIds.size > 0 ? () => handleDownloadQrPdf(allIndividualProducts.filter((p) => selectedIds.has(p.id))) : undefined}
          onDownloadAllQrPdf={() => handleDownloadQrPdf()}
          onClearSelection={handleClearSelection}
          downloadingQrPdf={downloadingQrPdf}
          individualProductCount={allIndividualProducts.length}
          selectedCount={selectedIds.size}
        />

        <div className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 lg:py-6 space-y-3 sm:space-y-4 lg:space-y-6">
          <StockStatsCards stats={stats} />

          <ProductStockFilters
            searchTerm={searchTerm}
            statusFilter={statusFilter}
            locationFilter={locationFilter}
            startDate={startDate}
            endDate={endDate}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onSearchChange={handleSearchChange}
            onStatusChange={handleStatusChange}
            onLocationChange={handleLocationChange}
            onStartDateChange={handleStartDateChange}
            onEndDateChange={handleEndDateChange}
            onSortChange={handleSortChange}
          />

          {/* Desktop: paginated grid */}
          <div className="hidden lg:block">
            <ProductStockGrid
              products={desktopProducts}
              product={product}
              productId={productId}
              searchTerm={searchTerm}
              statusFilter={statusFilter}
              onView={handleView}
              onEdit={handleEdit}
              onQRCodeClick={handleQRCodeClick}
              loading={loading}
              selectedIds={selectedIds}
              onToggleSelect={handleToggleSelect}
              onSelectAllOnPage={handleSelectAllOnPage}
              onSelectAll={handleSelectAll}
              allSelected={allSelected}
            />
            <IndividualProductPagination
              totalProducts={desktopTotal}
              currentPage={desktopPage}
              limit={desktopLimit}
              onPageChange={setDesktopPage}
              onLimitChange={(l) => { setDesktopLimit(l); setDesktopPage(1); }}
            />
          </div>

          {/* Mobile: infinite scroll grid */}
          <div className="lg:hidden">
            <ProductStockGrid
              products={individualProducts}
              product={product}
              productId={productId}
              searchTerm={searchTerm}
              statusFilter={statusFilter}
              onView={handleView}
              onEdit={handleEdit}
              onQRCodeClick={handleQRCodeClick}
              loading={loading}
              selectedIds={selectedIds}
              onToggleSelect={handleToggleSelect}
              onSelectAllOnPage={handleSelectAllOnPage}
              onSelectAll={handleSelectAll}
              allSelected={allSelected}
            />
            {/* Infinite scroll sentinel */}
            <div ref={sentinelRef} className="h-4" />
            {loadingMore && (
              <div className="flex justify-center py-4">
                <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-primary-600" />
              </div>
            )}
          </div>

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
