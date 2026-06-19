import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import ProductFormModal from '@/components/products/ProductFormModal';
import MobileProductForm from '@/components/products/mobile/MobileProductForm';
import BulkProductUploadDialog from '@/components/products/BulkProductUploadDialog';
import InventoryStatsBoxes from '@/components/products/InventoryStatsBoxes';
import ProductTabs from '@/components/products/ProductTabs';
import InventoryTab from '@/components/products/InventoryTab';
import InventoryFilters from '@/components/products/InventoryFilters';
import MobileFilterSheet from '@/components/products/MobileFilterSheet';
import AnalyticsTab, { prefetchProductAnalytics } from '@/components/products/AnalyticsTab';
import NotificationsTab from '@/components/products/NotificationsTab';
import ProductWastageTab from '@/components/products/ProductWastageTab';
import ProductQRCodeDialog from '@/components/products/ProductQRCodeDialog';
import type { Product, ProductFilters } from '@/types/product';
import { ProductService } from '@/services/productService';
import { calculateStockStatus } from '@/utils/stockStatus';
import { exportProductsToCSV, exportProductsToExcel } from '@/utils/exportProductUtils';
import { useToast } from '@/hooks/use-toast';
import { canCreate, canEdit, canDelete, canView } from '@/utils/permissions';
import PermissionDenied from '@/components/ui/PermissionDenied';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Download, FileSpreadsheet, FileText, Loader2, List, Grid3x3, Layers, Upload, SlidersHorizontal, AlignJustify, X } from 'lucide-react';
import { useLiveSyncRefresh } from '@/hooks/useLiveSyncRefresh';

type TabValue = 'inventory' | 'analytics' | 'notifications' | 'wastage';

export default function ProductList() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<TabValue>('inventory');
  const [exporting, setExporting] = useState<'csv' | 'excel' | null>(null);
  const [exportPopoverOpen, setExportPopoverOpen] = useState(false);
  const [showMobileExport, setShowMobileExport] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'table' | 'grouped'>('table');
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [showMobileSort, setShowMobileSort] = useState(false);
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
      if ((filters.page || 1) === 1) setError(null);

      const { products: data, total } = await ProductService.getProducts({
        ...filters,
        sortBy: filters.sortBy || 'name',
        sortOrder: filters.sortOrder || 'asc',
      });

      // Safety filter: keep stock-status filtering aligned with displayed status badges.
      // This prevents "In Stock" filter from showing items with 0 available individual stock.
      const selectedStatuses = Array.isArray(filters.status)
        ? filters.status
        : (filters.status ? [filters.status] : []);
      const selectedStockStatuses = selectedStatuses.filter((s): s is 'in-stock' | 'low-stock' | 'out-of-stock' =>
        s === 'in-stock' || s === 'low-stock' || s === 'out-of-stock'
      );

      const filteredData = selectedStockStatuses.length > 0
        ? data.filter((product) => {
            const computedStockStatus = calculateStockStatus(product);
            return (
              computedStockStatus === 'in-stock' ||
              computedStockStatus === 'low-stock' ||
              computedStockStatus === 'out-of-stock'
            ) && selectedStockStatuses.includes(computedStockStatus);
          })
        : data;

      // Backend handles sorting; frontend only applies stock-status safety filtering.
      setProducts(filteredData);
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

  const handleDelete = async (product: Product) => {
    if (!window.confirm(`Delete "${product.name}"? This cannot be undone.`)) return;
    try {
      await ProductService.deleteProduct(product.id || (product as any)._id);
      toast({ title: 'Product deleted', description: `"${product.name}" has been deleted.` });
      loadProducts();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to delete product', variant: 'destructive' });
    }
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
      toast({ title: 'Export Started', description: 'Generating product catalog file, please wait...' });
      
      const firstRes = await ProductService.getProducts({
        ...filters,
        limit: 100,
        page: 1,
      });
      
      let allProducts = [...(firstRes.products || [])];
      const total = firstRes.total || 0;
      
      if (total > 100) {
        const pages = Math.ceil(total / 100);
        const restPromises = Array.from({ length: pages - 1 }, (_, i) =>
          ProductService.getProducts({
            ...filters,
            limit: 100,
            page: i + 2,
          })
        );
        const restResults = await Promise.all(restPromises);
        restResults.forEach(res => {
          if (res.products) {
            allProducts.push(...res.products);
          }
        });
      }

      if (!allProducts.length) {
        toast({ title: 'No Data', description: 'No products to export', variant: 'destructive' });
        return;
      }
      if (format === 'csv') {
        exportProductsToCSV(allProducts);
        toast({ title: 'Export Successful', description: `Exported ${allProducts.length} products to CSV` });
      } else {
        exportProductsToExcel(allProducts);
        toast({ title: 'Export Successful', description: `Exported ${allProducts.length} products to Excel` });
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
        {/* ─── MOBILE header ───────────────────────────────────────────── */}
        <div className="lg:hidden flex items-center justify-between mb-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Products</h1>
          </div>
          <div className="flex items-center gap-2">
            {canCreate('products') && (
              <button onClick={() => setIsBulkUploadOpen(true)} className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 bg-white">
                <Upload className="w-4 h-4 text-gray-600" />
              </button>
            )}
            <button
              onClick={() => !exporting && setShowMobileExport(true)}
              disabled={!!exporting}
              className={`w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 bg-white transition-opacity ${exporting ? 'opacity-55 cursor-not-allowed' : 'active:bg-gray-50'}`}
            >
              {exporting ? (
                <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
              ) : (
                <Download className="w-4 h-4 text-gray-600" />
              )}
            </button>
            {canCreate('products') && (
              <button onClick={handleCreate} className="w-9 h-9 flex items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              </button>
            )}
          </div>
        </div>

        {/* ─── DESKTOP Page Header ─────────────────────────────────────── */}
        <div className="hidden lg:block mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Products</h1>
              <p className="text-gray-600 mt-1">Manage your product catalog</p>
            </div>
            {activeTab === 'inventory' && (
              <div className="flex items-center gap-3">
                {/* View Mode Toggle */}
                <div className="flex items-center gap-1 border border-gray-300 rounded-lg p-0">
                  <Button
                    variant={viewMode === 'table' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('table')}
                    className={`hidden lg:inline-flex h-10 w-10 p-0 ${viewMode === 'table' ? 'bg-primary-600 text-white' : ''}`}
                    title="Table View"
                  >
                    <List className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'grid' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('grid')}
                    className={`h-10 w-10 p-0 ${viewMode === 'grid' ? 'bg-primary-600 text-white' : ''}`}
                    title="Grid View"
                  >
                    <Grid3x3 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'grouped' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('grouped')}
                    className={`hidden lg:inline-flex h-10 w-10 p-0 ${viewMode === 'grouped' ? 'bg-primary-600 text-white' : ''}`}
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
                      onDelete={handleDelete}
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

        {/* Mobile bottom SORT | FILTER bar */}
        {activeTab === 'inventory' && (
          <div className="lg:hidden fixed bottom-16 left-0 right-0 z-40 flex border-t border-gray-200 bg-white">
            <button
              onClick={() => { setShowMobileSort(true); setShowMobileFilters(false); }}
              className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold text-gray-700 border-r border-gray-200"
            >
              <AlignJustify className="w-4 h-4" />
              SORT
            </button>
            <button
              onClick={() => { setShowMobileFilters(true); setShowMobileSort(false); }}
              className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold text-gray-700"
            >
              <SlidersHorizontal className="w-4 h-4" />
              FILTER
            </button>
          </div>
        )}

        {/* Mobile Filter Sheet — two-panel like the app */}
        {showMobileFilters && (
          <MobileFilterSheet
            filters={filters}
            onApply={(newFilters) => {
              setFilters({ ...filters, ...newFilters, page: 1 });
              setShowMobileFilters(false);
            }}
            onClose={() => setShowMobileFilters(false)}
          />
        )}

        {/* Mobile Sort Sheet */}
        {showMobileSort && (
          <>
            <div className="lg:hidden fixed inset-0 z-50 bg-black/40" onClick={() => setShowMobileSort(false)} />
            <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl" style={{ zIndex: 51 }}>
              <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-gray-100">
                <p className="text-base font-bold text-gray-900">Sort By</p>
                <button onClick={() => setShowMobileSort(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100">
                  <X className="w-4 h-4 text-gray-600" />
                </button>
              </div>
              <div className="px-5 py-3 pb-10 space-y-1">
                {[
                  { value: 'name', label: 'Name' },
                  { value: 'stock', label: 'Stock' },
                  { value: 'category', label: 'Category' },
                  { value: 'recent', label: 'Recently Added' },
                ].map((opt) => (
                  <div key={opt.value}>
                    <button
                      onClick={() => { handleSortChange(opt.value, filters.sortOrder || 'asc'); setShowMobileSort(false); }}
                      className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium ${filters.sortBy === opt.value ? 'bg-blue-50 text-blue-700 font-bold' : 'text-gray-700'}`}
                    >
                      {opt.label}
                    </button>
                    <div className="h-px bg-gray-100 mx-1" />
                  </div>
                ))}
                <div className="pt-2">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 px-1">Order</p>
                  <div className="flex gap-2">
                    <button onClick={() => { handleSortChange(filters.sortBy || 'name', 'asc'); setShowMobileSort(false); }} className={`flex-1 py-2.5 rounded-xl text-sm font-semibold ${filters.sortOrder === 'asc' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}>Ascending</button>
                    <button onClick={() => { handleSortChange(filters.sortBy || 'name', 'desc'); setShowMobileSort(false); }} className={`flex-1 py-2.5 rounded-xl text-sm font-semibold ${filters.sortOrder === 'desc' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}>Descending</button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
        {/* Mobile Export Sheet */}
        {showMobileExport && (
          <>
            <div className="lg:hidden fixed inset-0 z-50 bg-black/40" onClick={() => setShowMobileExport(false)} />
            <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl p-5 pb-9" style={{ zIndex: 51 }}>
              <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-5">
                <div>
                  <p className="text-base font-bold text-gray-900">Export Catalog</p>
                  <p className="text-xs text-gray-400 mt-0.5">Export {totalProducts} products to your device</p>
                </div>
                <button onClick={() => setShowMobileExport(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100">
                  <X className="w-4 h-4 text-gray-600" />
                </button>
              </div>
              <div className="space-y-3">
                <button
                  onClick={() => { handleExport('csv'); setShowMobileExport(false); }}
                  className="flex w-full items-center gap-3 rounded-xl border border-gray-200 p-3.5 hover:bg-gray-50 active:bg-gray-100 transition-colors"
                >
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-gray-900">Export as CSV</p>
                    <p className="text-xs text-gray-400">Plain text format, good for simple imports</p>
                  </div>
                </button>

                <button
                  onClick={() => { handleExport('excel'); setShowMobileExport(false); }}
                  className="flex w-full items-center gap-3 rounded-xl border border-gray-200 p-3.5 hover:bg-gray-50 active:bg-gray-100 transition-colors"
                >
                  <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center text-green-600 shrink-0">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-gray-900">Export as Excel</p>
                    <p className="text-xs text-gray-400">Formatted spreadsheet, preserves headers</p>
                  </div>
                </button>
              </div>
            </div>
          </>
        )}

        {/* Modals — desktop uses centered dialog, mobile uses full-screen native form */}
        <div className="hidden lg:block">
          <ProductFormModal
            isOpen={isFormOpen}
            onClose={() => setIsFormOpen(false)}
            onSuccess={loadProducts}
            product={selectedProduct}
            mode={formMode}
          />
        </div>
        <div className="lg:hidden">
          <MobileProductForm
            isOpen={isFormOpen}
            onClose={() => setIsFormOpen(false)}
            onSuccess={loadProducts}
            product={selectedProduct}
            mode={formMode}
          />
        </div>

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
