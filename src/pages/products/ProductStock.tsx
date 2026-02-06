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
import { useToast } from '@/hooks/use-toast';
import { getAppBaseUrl } from '@/lib/utils';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import type {
  Product,
  IndividualProduct,
  IndividualProductFormData,
  StockStats,
} from '@/types/product';

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
    'Serial Number',
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
    p.serial_number || '',
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
    'Serial Number',
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
    p.serial_number || '',
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

/** Get QR code image URL for an individual product (same as QRCodeDialog) */
function getQRCodeImageURL(individualProduct: IndividualProduct): string {
  const qrCodeData = JSON.stringify({
    type: 'individual',
    individualProductId: individualProduct.id,
    productId: individualProduct.product_id,
  });
  const dataUrl = `${getAppBaseUrl()}/qr-result?data=${encodeURIComponent(qrCodeData)}`;
  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(dataUrl)}`;
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
  const [error, setError] = useState<string | null>(null);
  const [totalProducts, setTotalProducts] = useState(0);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Sorting
  const [sortBy, setSortBy] = useState<'qr_code' | 'status' | 'created_at'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(50);

  // QR Code Dialog
  const [showQRCode, setShowQRCode] = useState(false);
  const [selectedQRProduct, setSelectedQRProduct] = useState<IndividualProduct | null>(null);

  // Edit Dialog
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<IndividualProduct | null>(null);

  // Export / Download all QR
  const [downloadingAllQR, setDownloadingAllQR] = useState(false);
  const { toast } = useToast();

  // Selection for "Download selected QR codes"
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

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
  }, [productId, searchTerm, statusFilter, startDate, endDate, currentPage, limit, sortBy, sortOrder]);

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
        search: searchTerm || undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        limit,
        offset,
        sortBy,
        sortOrder,
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
    reserved: allIndividualProducts.filter((p) => p.status === 'reserved').length,
    sold: allIndividualProducts.filter((p) => p.status === 'sold').length,
    damaged: allIndividualProducts.filter((p) => p.status === 'damaged').length,
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

  const handleStatusChange = (values: string[]) => {
    setStatusFilter(values);
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

  const handleSortChange = (newSortBy: 'qr_code' | 'status' | 'created_at', newSortOrder: 'asc' | 'desc') => {
    setSortBy(newSortBy);
    setSortOrder(newSortOrder);
    setCurrentPage(1);
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

  const downloadQRCodesForProducts = async (list: IndividualProduct[]) => {
    if (list.length === 0) return;
    const productName = product?.name || 'Product';
    const baseName = sanitizeFileName(productName);
    setDownloadingAllQR(true);
    toast({ title: 'Preparing ZIP…', description: `Adding ${list.length} QR code(s) to zip. Please wait.` });
    try {
      const zip = new JSZip();
      for (let i = 0; i < list.length; i++) {
        const ip = list[i];
        const url = getQRCodeImageURL(ip);
        const res = await fetch(url);
        const blob = await res.blob();
        zip.file(`${baseName}-${ip.id}.png`, blob);
      }
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const objectUrl = window.URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = `${baseName}-qr-codes.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(objectUrl);
      toast({ title: 'Done', description: `Downloaded ${list.length} QR code(s) in ${baseName}-qr-codes.zip` });
    } catch (err) {
      console.error('Error downloading QR codes:', err);
      toast({ title: 'Error', description: 'Failed to create zip. Try again.', variant: 'destructive' });
    } finally {
      setDownloadingAllQR(false);
    }
  };

  const handleDownloadAllQRCodes = async () => {
    if (allIndividualProducts.length === 0) {
      toast({ title: 'No data', description: 'No individual products to download QR codes for', variant: 'destructive' });
      return;
    }
    await downloadQRCodesForProducts(allIndividualProducts);
  };

  const handleDownloadSelectedQRCodes = async () => {
    if (selectedIds.size === 0) return;
    const list = allIndividualProducts.filter((p) => selectedIds.has(p.id));
    if (list.length === 0) {
      toast({ title: 'No data', description: 'Selected items could not be found. Try refreshing.', variant: 'destructive' });
      return;
    }
    await downloadQRCodesForProducts(list);
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
          onDownloadAllQRCodes={handleDownloadAllQRCodes}
          onDownloadSelectedQRCodes={handleDownloadSelectedQRCodes}
          onClearSelection={handleClearSelection}
          downloadingAllQR={downloadingAllQR}
          individualProductCount={allIndividualProducts.length}
          selectedCount={selectedIds.size}
        />

        <div className="p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6">
          <StockStatsCards stats={stats} />

          <ProductStockFilters
            searchTerm={searchTerm}
            statusFilter={statusFilter}
            startDate={startDate}
            endDate={endDate}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onSearchChange={handleSearchChange}
            onStatusChange={handleStatusChange}
            onStartDateChange={handleStartDateChange}
            onEndDateChange={handleEndDateChange}
            onSortChange={handleSortChange}
          />

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
