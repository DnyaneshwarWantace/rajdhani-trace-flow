import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import ProductFormModal from '@/components/products/ProductFormModal';
import InventoryStatsBoxes from '@/components/products/InventoryStatsBoxes';
import ProductTabs from '@/components/products/ProductTabs';
import InventoryTab from '@/components/products/InventoryTab';
import AnalyticsTab from '@/components/products/AnalyticsTab';
import NotificationsTab from '@/components/products/NotificationsTab';
import ProductWastageTab from '@/components/products/ProductWastageTab';
import ProductQRCodeDialog from '@/components/products/ProductQRCodeDialog';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { TruncatedText } from '@/components/ui/TruncatedText';
import type { Product, ProductFilters } from '@/types/product';
import { ProductService } from '@/services/productService';
import type { Notification } from '@/services/notificationService';
import { useToast } from '@/hooks/use-toast';
import { canDelete } from '@/utils/permissions';

type TabValue = 'inventory' | 'analytics' | 'notifications' | 'wastage';

export default function ProductList() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<TabValue>('inventory');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'table' | 'grouped'>('table');
  const [totalProducts, setTotalProducts] = useState(0);
  const [filters, setFilters] = useState<ProductFilters>({
    search: '',
    category: [],
    status: '',
    color: [],
    pattern: [],
    length: [],
    width: [],
    weight: [],
    page: 1,
    limit: 50,
  });

  // User state for delete permission check
  const [canDeleteProducts, setCanDeleteProducts] = useState(false);

  // Stats state for inventory tab
  const [inventoryStats, setInventoryStats] = useState({
    totalProducts: 0,
    lowStockAlerts: 0,
    availablePieces: 0,
  });
  const [statsLoading, setStatsLoading] = useState(false);

  // Analytics state - TODO: Will be used when AnalyticsTab is implemented
  // const [analyticsLoading, setAnalyticsLoading] = useState(false);
  // const [stats, setStats] = useState<AnalyticsStats>({...});

  // Notifications state
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Modal states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [formMode, setFormMode] = useState<'create' | 'edit' | 'duplicate'>('create');

  // QR Code Dialog state
  const [isQRCodeDialogOpen, setIsQRCodeDialogOpen] = useState(false);
  const [selectedQRProduct, setSelectedQRProduct] = useState<Product | null>(null);

  // Delete dialog state
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Check delete permission on mount
  useEffect(() => {
    setCanDeleteProducts(canDelete('products'));
  }, []);

  // Load notifications count on mount
  useEffect(() => {
    loadNotifications();
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
      setInventoryStats({
        totalProducts: statsData.total_products || 0,
        lowStockAlerts: (statsData.low_stock_products || 0) + (statsData.out_of_stock_products || 0),
        availablePieces: statsData.available_individual_products || 0,
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

      // Backend expects 'status' parameter with values: 'in-stock', 'low-stock', 'out-of-stock'
      // Only send status if it's not empty
      const statusParam = filters.status && filters.status !== 'all' ? filters.status : undefined;

      const { products: data, total } = await ProductService.getProducts({
        ...filters,
        status: statusParam,
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
    // TODO: Implement analytics loading when AnalyticsTab component is created
    console.log('Loading analytics...');
  };

  const loadNotifications = async () => {
    try {
      // Load notifications from all modules to find production planning low stock alerts
      const { NotificationService } = await import('@/services/notificationService');
      const productionNotifications = await NotificationService.getNotificationsByModule('production');
      const productNotifications = await NotificationService.getNotificationsByModule('products');
      const materialNotifications = await NotificationService.getNotificationsByModule('materials');
      
      // Combine all notifications to check for production planning alerts
      const allNotifications = [
        ...(productionNotifications || []), 
        ...(productNotifications || []),
        ...(materialNotifications || [])
      ];
      
      // Filter notifications: Show:
      // 1. Low stock notifications from production planning
      // 2. Production-related notifications (production_request, production module, etc.)
      const filteredNotifications = allNotifications.filter(n => {
        // Exclude activity logs
        if (n.related_data?.activity_log_id) {
          return false;
        }
        
        // Check if it's a production-related notification
        const isProductionRelated = 
          n.module === 'production' ||
          n.type === 'production_request' ||
          (n.title || '').toLowerCase().includes('production');
        
        // Check if it's a low stock notification from production planning
        // Only show if it's about a PRODUCT shortage, not a MATERIAL shortage
        const isProductLowStockFromProductionPlanning = () => {
          if (n.type !== 'low_stock') {
            return false;
          }
          
          const title = (n.title || '').toLowerCase();
          const hasProductionPlanningInTitle = title.includes('production planning');
          
          // Check material_type in related_data
          // If material_type === 'raw_material', it's a material shortage (exclude)
          // If material_type === 'product', it's a product shortage (include)
          const materialType = n.related_data?.material_type;
          
          // Exclude material-related low stock notifications
          if (materialType === 'raw_material') {
            return false;
          }
          
          // Show if:
          // 1. Title includes "Production Planning" AND material_type is 'product' (product shortage)
          // 2. Has batch_id/batch_number (from production) AND material_type is 'product'
          const hasBatchId = !!n.related_data?.batch_id;
          const hasBatchNumber = !!n.related_data?.batch_number;
          const isProductMaterial = materialType === 'product';
          
          return (hasProductionPlanningInTitle && isProductMaterial) || 
                 ((hasBatchId || hasBatchNumber) && isProductMaterial);
        };
        
        // Check if it's product-related (same logic as ProductNotifications page)
        const isProductRelated = 
          n.module === 'products' || 
          n.related_data?.action_category === 'PRODUCT' ||
          n.related_data?.action?.includes('PRODUCT_');
        
        // Include if:
        // 1. It's product-related (module === 'products' or action_category === 'PRODUCT')
        // 2. It's production-related (module === 'production' or type === 'production_request')
        // 3. It's a product low stock notification from production planning
        return isProductRelated || isProductionRelated || isProductLowStockFromProductionPlanning();
      });
      
      setNotifications(filteredNotifications);
      console.log('📢 Loaded production and stock notifications:', filteredNotifications.length);
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  // Filter handlers
  const handleSearch = (value: string) => {
    setFilters({ ...filters, search: value, page: 1 });
  };

  const handleCategoryFilter = (values: string[]) => {
    setFilters({ ...filters, category: values, page: 1 });
  };

  const handleStatusFilter = (value: string) => {
    setFilters({ ...filters, status: value, page: 1 });
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
    navigate(`/products/${product.id || product._id}/stock`);
  };

  const handleProduction = (product: Product) => {
    // Navigate to production create page with product data
    navigate('/production/new', {
      state: { product }
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

  const handleDelete = (product: Product) => {
    setProductToDelete(product);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!productToDelete) return;

    setIsDeleting(true);
    try {
      // Prioritize custom id field over MongoDB _id
      const productId = productToDelete.id || productToDelete._id;
      if (!productId) {
        throw new Error('Product ID not found');
      }
      await ProductService.deleteProduct(productId);

      // Optimistically remove from local state without full reload
      setProducts(prev => prev.filter(p => (p.id || p._id) !== productId));
      setTotalProducts(prev => prev - 1);
      setInventoryStats(prev => ({
        ...prev,
        totalProducts: prev.totalProducts - 1,
      }));

      toast({
        title: 'Success',
        description: 'Product deleted successfully',
      });

      setIsDeleteDialogOpen(false);
      setProductToDelete(null);
    } catch (error) {
      console.error('Error deleting product:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete product',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Calculate unread notifications count
  const unreadCount = notifications.filter(n => n.status === 'unread').length;

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
        </div>

        {/* Stats Boxes - Always Visible */}
        <InventoryStatsBoxes
          totalProducts={inventoryStats.totalProducts}
          lowStockAlerts={inventoryStats.lowStockAlerts}
          availablePieces={inventoryStats.availablePieces}
          loading={statsLoading}
        />

        {/* Tabs */}
        <ProductTabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
          unreadCount={unreadCount}
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
                      onView={handleView}
                      onEdit={handleEdit}
                      onDuplicate={handleDuplicate}
            onStock={handleStock}
                      onProduction={handleProduction}
            onQRCode={handleQRCode}
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

        {/* QR Code Dialog */}
        <ProductQRCodeDialog
          open={isQRCodeDialogOpen}
          onOpenChange={setIsQRCodeDialogOpen}
          product={selectedQRProduct}
        />

        {/* Delete Confirmation Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent className="max-w-[90vw] sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Delete Product</DialogTitle>
            </DialogHeader>
            <div className="text-sm text-muted-foreground break-words overflow-hidden">
              Are you sure you want to delete{' '}
              <span className="font-semibold text-gray-900 break-all">
                {productToDelete?.name ? (
                  <TruncatedText text={`"${productToDelete.name}"`} maxLength={50} as="span" />
                ) : (
                  '"this product"'
                )}
              </span>
              ? This action cannot be undone.
            </div>
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsDeleteDialogOpen(false);
                  setProductToDelete(null);
                }}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
