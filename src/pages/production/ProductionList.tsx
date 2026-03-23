import { useState, useEffect } from 'react';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Loader2, Plus, Grid3x3, List, ArrowLeft } from 'lucide-react';
import { ProductionService, type ProductionBatch } from '@/services/productionService';
import { ProductService } from '@/services/productService';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import ProductionStatsBoxes from '@/components/production/ProductionStatsBoxes';
import ProductionSectionTabs from '@/components/production/ProductionSectionTabs';
import ProductionFilters from '@/components/production/ProductionFilters';
import ProductionTable from '@/components/production/ProductionTable';
import ProductionGrid from '@/components/production/ProductionGrid';
import ProductionEmptyState from '@/components/production/ProductionEmptyState';
import { canView, canDelete, canCreate, canEdit } from '@/utils/permissions';
import PermissionDenied from '@/components/ui/PermissionDenied';
import ProductionDeleteDialog from '@/components/production/ProductionDeleteDialog';
import ProductionDuplicateDialog from '@/components/production/ProductionDuplicateDialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination-primitives';

export default function ProductionList() {
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { productId: productIdFromPath } = useParams<{ productId?: string }>();
  const [allBatches, setAllBatches] = useState<ProductionBatch[]>([]);
  const [filteredBatches, setFilteredBatches] = useState<ProductionBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<'all' | 'planned' | 'active' | 'completed' | 'cancelled'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string[]>([]);
  const [categoryFilter, _setCategoryFilter] = useState<string[]>([]);
  const [subcategoryFilter, _setSubcategoryFilter] = useState<string[]>([]);
  const [colorFilter, _setColorFilter] = useState<string[]>([]);
  const [patternFilter, _setPatternFilter] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'start_date' | 'batch_number' | 'product_name' | 'priority' | 'completion_date'>('start_date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [totalBatches, setTotalBatches] = useState(0);
  const [productNameForTitle, setProductNameForTitle] = useState<string | null>(null);

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<ProductionBatch | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDuplicateDialogOpen, setIsDuplicateDialogOpen] = useState(false);
  const [batchToDuplicate, setBatchToDuplicate] = useState<ProductionBatch | null>(null);
  const [isDuplicating, setIsDuplicating] = useState(false);


  const [stats, setStats] = useState({
    all: 0,
    planned: 0,
    active: 0,
    completed: 0,
    cancelled: 0,
  });

  // Product-scoped page: from path /production/product/:productId or query ?productId=
  const searchParams = new URLSearchParams(location.search);
  const productIdFilter = productIdFromPath || searchParams.get('productId') || '';
  const isProductScoped = Boolean(productIdFilter);

  useEffect(() => {
    loadBatches();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productIdFilter]);

  // Fetch product name for product-scoped page header
  useEffect(() => {
    if (!productIdFilter) {
      setProductNameForTitle(null);
      return;
    }
    let cancelled = false;
    ProductService.getProductById(productIdFilter)
      .then((p) => {
        if (!cancelled) setProductNameForTitle(p.name);
      })
      .catch(() => {
        if (!cancelled) setProductNameForTitle(null);
      });
    return () => { cancelled = true; };
  }, [productIdFilter]);

  useEffect(() => {
    if (allBatches.length > 0) {
      calculateStats(allBatches);
    }
  }, [allBatches]);

  useEffect(() => {
    filterBatches();
  }, [activeSection, allBatches, searchTerm, priorityFilter, sortBy, sortOrder, page, limit]);

  useEffect(() => {
    // Reset to page 1 when filters change
    setPage(1);
  }, [activeSection, searchTerm, priorityFilter, categoryFilter, subcategoryFilter, colorFilter, patternFilter]);

  // Backend now bulk-enriches batches with product details; only fetch when still missing
  const enrichBatchesWithProductNames = async (batches: ProductionBatch[]): Promise<ProductionBatch[]> => {
    const needsEnrichment = batches.filter(
      (b) => b.product_id && (!b.product_name || !b.category || !b.length)
    );
    if (needsEnrichment.length === 0) return batches;

    const enriched = await Promise.all(
      needsEnrichment.map(async (batch) => {
        try {
          const product = await ProductService.getProductById(batch.product_id);
          return {
            ...batch,
            product_name: product.name,
            category: product.category,
            subcategory: product.subcategory,
            length: product.length,
            width: product.width,
            length_unit: product.length_unit,
            width_unit: product.width_unit,
            weight: product.weight,
            weight_unit: product.weight_unit,
            color: product.color,
            pattern: product.pattern,
          };
        } catch (error) {
          console.error(`Error fetching product ${batch.product_id}:`, error);
          return {
            ...batch,
            product_name: batch.product_name || 'Product Not Found',
            category: batch.category ?? 'N/A',
            subcategory: batch.subcategory ?? 'N/A',
            length: batch.length ?? 'N/A',
            width: batch.width ?? 'N/A',
            length_unit: batch.length_unit ?? '',
            width_unit: batch.width_unit ?? '',
            weight: batch.weight ?? 'N/A',
            weight_unit: batch.weight_unit ?? '',
            color: batch.color ?? 'N/A',
            pattern: batch.pattern ?? 'N/A',
          };
        }
      })
    );
    const enrichedIds = new Set(needsEnrichment.map((b) => b.id));
    return batches.map((b) =>
      enrichedIds.has(b.id) ? enriched.find((e) => e.id === b.id)! : b
    );
  };

  const loadBatches = async () => {
    try {
      setLoading(true);
      const { data, error } = await ProductionService.getBatches(
        productIdFilter ? { product_id: productIdFilter } : {}
      );

      if (error) {
        toast({ title: 'Error', description: error, variant: 'destructive' });
        setAllBatches([]);
        return;
      }

      if (data) {
        // Fetch product names for batches that don't have them
        const batchesWithProductNames = await enrichBatchesWithProductNames(data);
        setAllBatches(batchesWithProductNames);
        // Stats will be calculated in useEffect when allBatches updates
      } else {
        setAllBatches([]);
        setStats({ all: 0, planned: 0, active: 0, completed: 0, cancelled: 0 });
      }
    } catch (error) {
      console.error('Error loading batches:', error);
      toast({ title: 'Error', description: 'Failed to load production batches', variant: 'destructive' });
      setAllBatches([]);
    } finally {
      setLoading(false);
    }
  };

  const filterBatches = () => {
    let filtered = [...allBatches];

    // Filter by section (status)
    switch (activeSection) {
      case 'planned':
        filtered = allBatches.filter(b => b.status === 'planned');
        break;
      case 'active':
        // Active includes both 'in_progress' and 'in_production' statuses
        filtered = allBatches.filter(b => {
          const status = b.status?.toLowerCase();
          return status === 'in_progress' || status === 'in_production';
        });
        break;
      case 'completed':
        filtered = allBatches.filter(b => b.status === 'completed');
        break;
      case 'cancelled':
        filtered = allBatches.filter(b => b.status === 'cancelled');
        break;
      case 'all':
      default:
        filtered = allBatches;
        break;
    }

    // Filter by search term
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(batch => 
        batch.batch_number.toLowerCase().includes(searchLower) ||
        (batch.product_name && batch.product_name.toLowerCase().includes(searchLower))
      );
    }

    // Filter by priority (multi-select)
    if (priorityFilter.length > 0) {
      filtered = filtered.filter(batch => priorityFilter.includes(batch.priority));
    }

    // Filter by category
    if (categoryFilter.length > 0) {
      filtered = filtered.filter(batch => batch.category && categoryFilter.includes(batch.category));
    }

    // Filter by subcategory
    if (subcategoryFilter.length > 0) {
      filtered = filtered.filter(batch => batch.subcategory && subcategoryFilter.includes(batch.subcategory));
    }

    // Filter by color
    if (colorFilter.length > 0) {
      filtered = filtered.filter(batch => batch.color && colorFilter.includes(batch.color));
    }

    // Filter by pattern
    if (patternFilter.length > 0) {
      filtered = filtered.filter(batch => batch.pattern && patternFilter.includes(batch.pattern));
    }

    // Apply sorting
    const sortDirection = sortOrder === 'desc' ? -1 : 1;
    filtered.sort((a, b) => {
      let compareValue = 0;

      switch (sortBy) {
        case 'batch_number':
          compareValue = (a.batch_number || '').localeCompare(b.batch_number || '');
          break;
        case 'product_name':
          compareValue = (a.product_name || '').localeCompare(b.product_name || '');
          break;
        case 'priority':
          const priorityOrder: Record<string, number> = { urgent: 4, high: 3, medium: 2, low: 1 };
          compareValue = (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
          break;
        case 'completion_date':
          const dateA = a.completion_date ? new Date(a.completion_date).getTime() : 0;
          const dateB = b.completion_date ? new Date(b.completion_date).getTime() : 0;
          compareValue = dateA - dateB;
          break;
        case 'start_date':
        default:
          const startA = a.start_date ? new Date(a.start_date).getTime() : 0;
          const startB = b.start_date ? new Date(b.start_date).getTime() : 0;
          compareValue = startA - startB; // Sort by start date
          break;
      }

      return sortDirection * compareValue;
    });

    setTotalBatches(filtered.length);

    // Apply pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedBatches = filtered.slice(startIndex, endIndex);

    setFilteredBatches(paginatedBatches);
  };

  const calculateStats = (batchesList: ProductionBatch[]) => {
    const all = batchesList.length;
    // Planned: only batches with status 'planned'
    const planned = batchesList.filter(b => b.status === 'planned').length;
    // Active includes both 'in_progress' and 'in_production' statuses
    const active = batchesList.filter(b => {
      const status = b.status?.toLowerCase();
      return status === 'in_progress' || status === 'in_production';
    }).length;
    // Completed: only batches with status 'completed'
    const completed = batchesList.filter(b => b.status === 'completed').length;
    // Cancelled: only batches with status 'cancelled'
    const cancelled = batchesList.filter(b => b.status === 'cancelled').length;

    setStats({ all, planned, active, completed, cancelled });
  };

  const handleCreate = () => {
    navigate('/production/create');
  };

  const handleView = (batch: ProductionBatch) => {
    navigate(`/production/${batch.id}`);
  };

  const handleDelete = (batch: ProductionBatch) => {
    setSelectedBatch(batch);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async (reason: string) => {
    if (!selectedBatch) return;
    setIsDeleting(true);
    try {
      const { data, error } = await ProductionService.deleteBatch(selectedBatch.id, reason);
      if (error) {
        toast({ title: 'Error', description: error, variant: 'destructive' });
        return;
      }
      if (data) {
        toast({ title: 'Success', description: 'Production batch cancelled successfully' });
        setIsDeleteDialogOpen(false);
        setSelectedBatch(null);
        loadBatches();
      }
    } catch (error) {
      console.error('Error cancelling batch:', error);
      toast({ title: 'Error', description: 'Failed to cancel batch', variant: 'destructive' });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDuplicate = (batch: ProductionBatch) => {
    setBatchToDuplicate(batch);
    setIsDuplicateDialogOpen(true);
  };

  const handleConfirmDuplicate = async (quantity: number, completionDate: string) => {
    if (!batchToDuplicate) return;
    setIsDuplicating(true);
    try {
      const { data, error } = await ProductionService.duplicateBatch(batchToDuplicate.id, quantity, completionDate);
      if (error) {
        toast({ title: 'Error', description: error, variant: 'destructive' });
        return;
      }
      if (data) {
        toast({ title: 'Success', description: 'Production batch duplicated successfully' });
        setIsDuplicateDialogOpen(false);
        setBatchToDuplicate(null);
        loadBatches();
      }
    } catch (error) {
      console.error('Error duplicating batch:', error);
      toast({ title: 'Error', description: 'Failed to duplicate batch', variant: 'destructive' });
    } finally {
      setIsDuplicating(false);
    }
  };

  if (!canView('production')) {
    return <Layout><PermissionDenied /></Layout>;
  }

  return (
    <Layout>
      <div>
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
              {isProductScoped ? (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mb-2 -ml-2 text-gray-600 hover:text-gray-900"
                    onClick={() => navigate('/production')}
                  >
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    Back to Production
                  </Button>
                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                    Production history for {productNameForTitle ?? '…'}
                  </h1>
                  <p className="text-sm text-gray-600">All production batches for this product</p>
                </>
              ) : (
                <>
                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Production</h1>
                  <p className="text-sm text-gray-600">Manage production batches and track progress</p>
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              {/* View Toggle - Hidden on mobile/tablet */}
              <div className="hidden lg:flex items-center gap-1 border border-gray-300 rounded-lg p-1">
                <Button
                  variant={viewMode === 'table' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('table')}
                  className={viewMode === 'table' ? 'bg-primary-600 text-white' : ''}
                >
                  <List className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className={viewMode === 'grid' ? 'bg-primary-600 text-white' : ''}
                >
                  <Grid3x3 className="w-4 h-4" />
                </Button>
              </div>
              {!isProductScoped && (
                <Button
                  onClick={handleCreate}
                  className="w-full sm:w-auto bg-primary-600 hover:bg-primary-700 text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Batch
                </Button>
              )}
            </div>
          </div>
        </div>

        <ProductionStatsBoxes
          all={stats.all}
          planned={stats.planned}
          active={stats.active}
          completed={stats.completed}
          cancelled={stats.cancelled}
        />

        <ProductionSectionTabs
          activeSection={activeSection}
          onSectionChange={setActiveSection}
          allCount={stats.all}
          plannedCount={stats.planned}
          activeCount={stats.active}
          completedCount={stats.completed}
          cancelledCount={stats.cancelled}
        />

        <ProductionFilters
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          priorityFilter={priorityFilter}
          onPriorityFilterChange={setPriorityFilter}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSortChange={(newSortBy, newSortOrder) => {
            setSortBy(newSortBy);
            setSortOrder(newSortOrder);
            setPage(1);
          }}
        />

        {loading ? (
            <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
            </div>
        ) : filteredBatches.length === 0 ? (
          <ProductionEmptyState onCreate={handleCreate} />
        ) : viewMode === 'table' ? (
          <ProductionTable
            batches={filteredBatches}
            onView={handleView}
            onDelete={handleDelete}
            onDuplicate={handleDuplicate}
            canDelete={canDelete('production')}
            allBatches={allBatches}
          />
        ) : (
          <ProductionGrid
            batches={filteredBatches}
            onDelete={handleDelete}
            onDuplicate={handleDuplicate}
            canDelete={canDelete('production')}
            allBatches={allBatches}
          />
        )}

        {/* Pagination */}
        {!loading && filteredBatches.length > 0 && (() => {
          const totalPages = Math.ceil(totalBatches / limit);
          const pages: (number | 'ellipsis')[] = [];

          if (totalPages <= 7) {
            for (let i = 1; i <= totalPages; i++) {
              pages.push(i);
            }
          } else {
            pages.push(1);
            if (page > 3) pages.push('ellipsis');

            const start = Math.max(2, page - 1);
            const end = Math.min(totalPages - 1, page + 1);

            for (let i = start; i <= end; i++) {
              if (i !== 1 && i !== totalPages) {
                pages.push(i);
              }
            }

            if (page < totalPages - 2) pages.push('ellipsis');
            if (totalPages > 1) pages.push(totalPages);
          }

          return (
            <div className="mt-6">
              <Pagination className="w-full">
                <PaginationContent className="w-full justify-center flex-wrap gap-1">
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => {
                        if (page > 1) setPage(page - 1);
                      }}
                      className={`${page === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'} h-8 w-8 sm:h-10 sm:w-auto text-xs sm:text-sm`}
                    />
                  </PaginationItem>

                  {pages.map((p, index) => (
                    <PaginationItem key={index} className={p === 'ellipsis' ? 'hidden sm:block' : ''}>
                      {p === 'ellipsis' ? (
                        <PaginationEllipsis />
                      ) : (
                        <PaginationLink
                          isActive={p === page}
                          onClick={() => setPage(p as number)}
                          className={`cursor-pointer h-8 w-8 sm:h-10 sm:w-10 text-xs sm:text-sm p-0 ${
                            Math.abs((p as number) - page) > 1 && (p as number) !== 1 && (p as number) !== totalPages
                              ? 'hidden sm:flex'
                              : ''
                          }`}
                        >
                          {p}
                        </PaginationLink>
                      )}
                    </PaginationItem>
                  ))}

                  <PaginationItem>
                    <PaginationNext
                      onClick={() => {
                        if (page < totalPages) setPage(page + 1);
                      }}
                      className={`${page >= totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'} h-8 w-8 sm:h-10 sm:w-auto text-xs sm:text-sm`}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>

              <div className="mt-3 sm:mt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-xs sm:text-sm text-gray-600 text-center sm:text-left">
                  Showing {(page - 1) * limit + 1} to {Math.min(page * limit, totalBatches)} of {totalBatches} batches
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs sm:text-sm text-gray-600 whitespace-nowrap">Per page:</label>
                  <Select
                    value={limit.toString()}
                    onValueChange={(value) => {
                      setLimit(Number(value));
                      setPage(1);
                    }}
                  >
                    <SelectTrigger className="w-16 sm:w-20 h-8 sm:h-10 text-xs sm:text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          );
        })()}

        <ProductionDeleteDialog
          isOpen={isDeleteDialogOpen}
          onClose={() => setIsDeleteDialogOpen(false)}
          onConfirm={handleConfirmDelete}
          batch={selectedBatch}
          isDeleting={isDeleting}
        />

        <ProductionDuplicateDialog
          isOpen={isDuplicateDialogOpen}
          onClose={() => {
            setIsDuplicateDialogOpen(false);
            setBatchToDuplicate(null);
          }}
          onConfirm={handleConfirmDuplicate}
          batch={batchToDuplicate}
          isDuplicating={isDuplicating}
        />
      </div>
    </Layout>
  );
}

