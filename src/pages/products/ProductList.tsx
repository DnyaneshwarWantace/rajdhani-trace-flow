import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import ProductFormModal from '@/components/products/ProductFormModal';
import BulkProductUploadDialog from '@/components/products/BulkProductUploadDialog';
import InventoryStatsBoxes from '@/components/products/InventoryStatsBoxes';
import ProductTabs from '@/components/products/ProductTabs';
import InventoryTab from '@/components/products/InventoryTab';
import AnalyticsTab, { prefetchProductAnalytics } from '@/components/products/AnalyticsTab';
import NotificationsTab from '@/components/products/NotificationsTab';
import ProductWastageTab from '@/components/products/ProductWastageTab';
import ProductQRCodeDialog from '@/components/products/ProductQRCodeDialog';
import type { Product, ProductFilters } from '@/types/product';
import { ProductService } from '@/services/productService';
import { exportProductsToCSV, exportProductsToExcel } from '@/utils/exportProductUtils';
import { useToast } from '@/hooks/use-toast';
import { canCreate, canEdit, canDelete, canView } from '@/utils/permissions';
import PermissionDenied from '@/components/ui/PermissionDenied';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Download, FileSpreadsheet, FileText, Loader2, List, Grid3x3, Layers, Upload } from 'lucide-react';
import { useLiveSyncRefresh } from '@/hooks/useLiveSyncRefresh';

type TabValue = 'inventory' | 'analytics' | 'notifications' | 'wastage';

export default function ProductList() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<TabValue>('inventory');
  const [exporting, setExporting] = useState<'csv' | 'excel' | null>(null);
  const [exportPopoverOpen, setExportPopoverOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'table' | 'grouped'>('table');
  const [totalProducts, setTotalProducts] = useState(0);
  const [filters, setFilters] = useState<ProductFilters>({
    search: '',
    category: [],
    status: [],
    color: [],
    pattern: [],
    length: [],
    width: [],
    weight: [],
    page: 1,
    limit: 50,
    sortBy: 'name',
    sortOrder: 'asc',
  });


  // Stats state for inventory tab
  const [inventoryStats, setInventoryStats] = useState({
    totalProducts: 0,
    inStock: 0,
    lowStock: 0,
    outOfStock: 0,
  });
  const [statsLoading, setStatsLoading] = useState(false);

  // Analytics state - TODO: Will be used when AnalyticsTab is implemented
  // const [analyticsLoading, setAnalyticsLoading] = useState(false);
  // const [stats, setStats] = useState<AnalyticsStats>({...});

  // Notifications state - load count from cache immediately
  const [notificationCount, setNotificationCount] = useState(() => {
    const cached = localStorage.getItem('product_notification_count');
    return cached ? parseInt(cached, 10) : 0;
  });

  // Modal states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [formMode, setFormMode] = useState<'create' | 'edit' | 'duplicate'>('create');

  // QR Code Dialog state
  const [isQRCodeDialogOpen, setIsQRCodeDialogOpen] = useState(false);
  const [selectedQRProduct, setSelectedQRProduct] = useState<Product | null>(null);


  // Load notifications count on mount and prefetch analytics in background
  useEffect(() => {
    loadNotifications();
    // Warm analytics cache so Analytics tab opens faster
    prefetchProductAnalytics();
  }, []);

  // Load stats only when activeTab changes (not when filters change)
  useEffect(() => {
    if (activeTab === 'inventory') {
      loadInventoryStats();
    } else if (activeTab === 'analytics') {
      loadAnalytics();
    } else if (activeTab === 'notifications') {
      loadNotifications();
    }
    // wastage tab loads its own data
  }, [activeTab]);

  // Load products when filters change
  useEffect(() => {
    if (activeTab === 'inventory') {
      loadProducts();
    }
  }, [activeTab, filters]);


  const loadInventoryStats = async () => {
    try {
      setStatsLoading(true);
      const statsData = await ProductService.getProductStats();
      const total = statsData.total_products || 0;
      setInventoryStats({
        totalProducts: total,
        inStock: statsData.in_stock_products ?? 0,
        lowStock: statsData.low_stock_products || 0,
        outOfStock: statsData.out_of_stock_products || 0,
      });
    } catch (err) {
      console.error('Failed to load inventory stats:', err);
    } finally {
      setStatsLoading(false);
    }
  };

  const loadProducts = async () => {
    try {
      setLoading(true);
      setError(null);

      const { products: data, total } = await ProductService.getProducts({
        ...filters,
        sortBy: filters.sortBy || 'name',
        sortOrder: filters.sortOrder || 'asc',
      });

      // Backend handles sorting - no need to sort on frontend
      setProducts(data);
      setTotalProducts(total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const loadAnalytics = async () => {
    // AnalyticsTab handles its own loading; keep this for future hooks/logging if needed.
    console.log('Analytics tab activated');
  };

  const loadNotifications = async () => {
    try {
      const { NotificationService } = await import('@/services/notificationService');

      // Load only product notifications - fast query
      const { data } = await NotificationService.getNotifications({
        module: 'products',
        limit: 1000
      });

      // Filter out activity logs only
      const filteredNotifications = data.filter(n => !n.related_data?.activity_log_id);

      // Update count and cache in localStorage for fast display
      const unread = filteredNotifications.filter(n => n.status === 'unread').length;
      setNotificationCount(unread);
      localStorage.setItem('product_notification_count', unread.toString());
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  useLiveSyncRefresh({
    modules: ['products', 'individual_products', 'production', 'orders', 'recipes'],
    onRefresh: () => {
      if (activeTab === 'inventory') loadProducts();
      if (activeTab === 'notifications') loadNotifications();
      loadInventoryStats();
    },
    pollingMs: 6000,
  });

  // Filter handlers
  const handleSearch = (value: string) => {
    setFilters({ ...filters, search: value, page: 1 });
  };

  const handleCategoryFilter = (values: string[]) => {
    setFilters({ ...filters, category: values, page: 1 });
  };

  const handleStatusFilter = (values: string[]) => {
    setFilters({ ...filters, status: values, page: 1 });
  };

  const handleColorFilter = (values: string[]) => {
    setFilters({ ...filters, color: values, page: 1 });
  };

  const handlePatternFilter = (values: string[]) => {
    setFilters({ ...filters, pattern: values, page: 1 });
  };

  const handleLengthFilter = (values: string[]) => {
    setFilters({ ...filters, length: values, page: 1 });
  };

  const handleWidthFilter = (values: string[]) => {
    setFilters({ ...filters, width: values, page: 1 });
  };

  const handleWeightFilter = (values: string[]) => {
    setFilters({ ...filters, weight: values, page: 1 });
  };

  const handlePageChange = (page: number) => {
    setFilters({ ...filters, page });
  };

  const handleLimitChange = (limit: number) => {
    setFilters({ ...filters, limit, page: 1 });
  };

  const handleSortChange = (sortBy: string, sortOrder: 'asc' | 'desc') => {
    setFilters({ ...filters, sortBy, sortOrder, page: 1 });
  };

  // Product handlers
  const handleView = (product: Product) => {
    // Backend uses 'id' field, not '_id'
    navigate(`/products/${product.id || product._id}`);
  };

  const handleEdit = (product: Product) => {
    setSelectedProduct(product);
    setFormMode('edit');
    setIsFormOpen(true);
  };

  const handleDuplicate = (product: Product) => {
    setSelectedProduct(product);
    setFormMode('duplicate');
    setIsFormOpen(true);
  };

  const handleStock = (product: Product) => {
    // Navigate to product stock page showing individual products
    navigate(`/products/${product.id || product._id}/stock`, {
      state: { from: 'product-list' }
    });
  };

  const handleProduction = (product: Product) => {
    // Navigate to production create page with product data
    navigate('/production/new', {
      state: { 
        product,
        from: 'product-list'
      }
    });
  };

  const handleQRCode = (product: Product) => {
    setSelectedQRProduct(product);
    setIsQRCodeDialogOpen(true);
  };

  const handleCreate = () => {
    setSelectedProduct(null);
    setFormMode('create');
    setIsFormOpen(true);
  };

  const handleExport = async (format: 'csv' | 'excel') => {
    setExportPopoverOpen(false);
    setExporting(format);
    try {
      const { products: toExport } = await ProductService.getProducts({
        ...filters,
        limit: 10000,
        page: 1,
      });
      if (!toExport?.length) {
        toast({ title: 'No Data', description: 'No products to export', variant: 'destructive' });
        return;
      }
      if (format === 'csv') {
        exportProductsToCSV(toExport);
        toast({ title: 'Export Successful', description: `Exported ${toExport.length} products to CSV` });
      } else {
        exportProductsToExcel(toExport);
        toast({ title: 'Export Successful', description: `Exported ${toExport.length} products to Excel` });
      }
    } catch (err) {
      console.error('Export failed:', err);
      toast({
        title: 'Export Failed',
        description: err instanceof Error ? err.message : 'Failed to export products',
        variant: 'destructive',
      });
    } finally {
      setExporting(null);
    }
  };

  // Calculate unread notifications count

  if (!canView('products')) {
    return <Layout><PermissionDenied /></Layout>;
  }

  return (
    <Layout>
      <div>
        {/* Page Header */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Products</h1>
              <p className="text-gray-600 mt-1">Manage your product catalog</p>
            </div>
            {activeTab === 'inventory' && (
              <div className="flex items-center gap-3">
                {/* View Mode Toggle - same icons as Orders/Customers/Suppliers (List, Grid3x3, Layers for grouped) */}
                <div className="flex items-center gap-1 border border-gray-300 rounded-lg p-1">
                  <Button
                    variant={viewMode === 'table' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('table')}
                    className={`hidden lg:inline-flex ${viewMode === 'table' ? 'bg-primary-600 text-white' : ''}`}
                    title="Table View"
                  >
                    <List className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'grid' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('grid')}
                    className={viewMode === 'grid' ? 'bg-primary-600 text-white' : ''}
                    title="Grid View"
                  >
                    <Grid3x3 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'grouped' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('grouped')}
                    className={`hidden lg:inline-flex ${viewMode === 'grouped' ? 'bg-primary-600 text-white' : ''}`}
                    title="Grouped View"
                  >
                    <Layers className="w-4 h-4" />
                  </Button>
                </div>

                {/* Export Dropdown */}
                <Popover open={exportPopoverOpen} onOpenChange={setExportPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2 border-gray-300"
                      disabled={!!exporting}
                    >
                      {exporting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Download className="w-4 h-4" />
                      )}
                      <span className="hidden sm:inline">Export</span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-48 p-2" align="end">
                    <button
                      onClick={() => handleExport('csv')}
                      className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <FileText className="w-4 h-4" />
                      Export as CSV
                    </button>
                    <button
                      onClick={() => handleExport('excel')}
                      className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <FileSpreadsheet className="w-4 h-4" />
                      Export as Excel
                    </button>
                  </PopoverContent>
                </Popover>

                {/* Add Product Button - only if user has create permission */}
                {canCreate('products') && (
                  <Button
                    onClick={() => setIsBulkUploadOpen(true)}
                    variant="outline"
                    className="inline-flex items-center justify-center gap-2 border-gray-300"
                  >
                    <Upload className="w-4 h-4" />
                    <span className="font-medium">Bulk Upload</span>
                  </Button>
                )}

                {/* Add Product Button - only if user has create permission */}
                {canCreate('products') && (
                  <button
                    onClick={handleCreate}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors shadow-sm"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span className="font-medium">Add Product</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Stats Boxes - Always Visible */}
        <InventoryStatsBoxes
          totalProducts={inventoryStats.totalProducts}
          inStock={inventoryStats.inStock}
          lowStock={inventoryStats.lowStock}
          outOfStock={inventoryStats.outOfStock}
          loading={statsLoading}
        />

        {/* Tabs */}
        <ProductTabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
          unreadCount={notificationCount}
        />

        {/* Inventory Tab Content */}
        {activeTab === 'inventory' && (
          <InventoryTab
                      products={products}
            loading={loading}
            error={error}
            filters={filters}
            viewMode={viewMode}
            totalProducts={totalProducts}
            onSearchChange={handleSearch}
            onCategoryChange={handleCategoryFilter}
            onStatusChange={handleStatusFilter}
            onColorChange={handleColorFilter}
            onPatternChange={handlePatternFilter}
            onLengthChange={handleLengthFilter}
            onWidthChange={handleWidthFilter}
            onWeightChange={handleWeightFilter}
            onViewModeChange={setViewMode}
            onPageChange={handlePageChange}
            onLimitChange={handleLimitChange}
            onSortChange={handleSortChange}
                      onView={handleView}
                      onEdit={handleEdit}
                      onDuplicate={handleDuplicate}
                      onStock={handleStock}
                      onProduction={handleProduction}
                      onQRCode={handleQRCode}
                      canEdit={canEdit('products')}
                      canDelete={canDelete('products')}
          />
        )}

        {/* Analytics Tab Content */}
        {activeTab === 'analytics' && <AnalyticsTab products={products} />}

        {/* Notifications Tab Content - Only shows product-related notifications */}
        {activeTab === 'notifications' && (
          <NotificationsTab products={products} />
        )}

        {/* Wastage Tab Content */}
        {activeTab === 'wastage' && <ProductWastageTab />}

        {/* Modals */}
        <ProductFormModal
          isOpen={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          onSuccess={loadProducts}
          product={selectedProduct}
          mode={formMode}
        />

        <BulkProductUploadDialog
          open={isBulkUploadOpen}
          onOpenChange={setIsBulkUploadOpen}
          onSuccess={loadProducts}
        />

        {/* QR Code Dialog */}
        <ProductQRCodeDialog
          open={isQRCodeDialogOpen}
          onOpenChange={setIsQRCodeDialogOpen}
          product={selectedQRProduct}
        />

      </div>
    </Layout>
  );
}
