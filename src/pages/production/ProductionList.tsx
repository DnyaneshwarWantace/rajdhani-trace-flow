import { useState, useEffect } from 'react';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Loader2, Plus, Grid3x3, List } from 'lucide-react';
import { ProductionService, type ProductionBatch, type CreateProductionBatchData } from '@/services/productionService';
import { ProductService } from '@/services/productService';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import ProductionStatsBoxes from '@/components/production/ProductionStatsBoxes';
import ProductionSectionTabs from '@/components/production/ProductionSectionTabs';
import ProductionFilters from '@/components/production/ProductionFilters';
import ProductionTable from '@/components/production/ProductionTable';
import ProductionGrid from '@/components/production/ProductionGrid';
import ProductionEmptyState from '@/components/production/ProductionEmptyState';
import ProductionFormDialog from '@/components/production/ProductionFormDialog';
import ProductionDeleteDialog from '@/components/production/ProductionDeleteDialog';

export default function ProductionList() {
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [allBatches, setAllBatches] = useState<ProductionBatch[]>([]);
  const [filteredBatches, setFilteredBatches] = useState<ProductionBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<'all' | 'planned' | 'active' | 'completed'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<ProductionBatch | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [submitting, setSubmitting] = useState(false);


  const [stats, setStats] = useState({
    all: 0,
    planned: 0,
    active: 0,
    completed: 0,
  });

  useEffect(() => {
    loadBatches();
  }, []);

  useEffect(() => {
    if (allBatches.length > 0) {
      calculateStats(allBatches);
    }
  }, [allBatches]);

  useEffect(() => {
    filterBatches();
  }, [activeSection, allBatches, searchTerm, priorityFilter]);

  const enrichBatchesWithProductNames = async (batches: ProductionBatch[]): Promise<ProductionBatch[]> => {
    const enrichedBatches = await Promise.all(
      batches.map(async (batch) => {
        // If product_name or other details are missing, fetch them from product_id
        if (!batch.product_name || !batch.category || !batch.length) {
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
              product_name: 'Product Not Found',
              category: 'N/A',
              subcategory: 'N/A',
              length: 'N/A',
              width: 'N/A',
              length_unit: '',
              width_unit: '',
              weight: 'N/A',
              weight_unit: '',
              color: 'N/A',
              pattern: 'N/A',
            };
          }
        }
        return batch;
      })
    );
    return enrichedBatches;
  };

  const loadBatches = async () => {
    try {
      setLoading(true);
      const { data, error } = await ProductionService.getBatches({});

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
        setStats({ all: 0, planned: 0, active: 0, completed: 0 });
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

    setFilteredBatches(filtered);
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

    setStats({ all, planned, active, completed });
  };

  const handleCreate = () => {
    navigate('/production/create');
  };

  const handleEdit = (batch: ProductionBatch) => {
    setSelectedBatch(batch);
    setIsDialogOpen(true);
  };

  const handleView = (batch: ProductionBatch) => {
    navigate(`/production/${batch.id}`);
  };

  const handleDelete = (batch: ProductionBatch) => {
    setSelectedBatch(batch);
    setIsDeleteDialogOpen(true);
  };

  const handleSubmit = async (data: CreateProductionBatchData) => {
    if (!selectedBatch) return;
    
    try {
      setSubmitting(true);
      const { data: updatedBatch, error } = await ProductionService.updateBatch(selectedBatch.id, data);
      if (error) {
        toast({ title: 'Error', description: error, variant: 'destructive' });
        return;
      }
      if (updatedBatch) {
        toast({ title: 'Success', description: 'Production batch updated successfully' });
        setIsDialogOpen(false);
        setSelectedBatch(null);
        loadBatches();
      }
    } catch (error) {
      console.error('Error updating batch:', error);
      toast({ title: 'Error', description: 'Failed to update batch', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedBatch) return;
    setIsDeleting(true);
    try {
      const { data, error } = await ProductionService.deleteBatch(selectedBatch.id);
      if (error) {
        toast({ title: 'Error', description: error, variant: 'destructive' });
        return;
      }
      if (data) {
        toast({ title: 'Success', description: 'Production batch deleted successfully' });
        setIsDeleteDialogOpen(false);
        setSelectedBatch(null);
        loadBatches();
      }
    } catch (error) {
      console.error('Error deleting batch:', error);
      toast({ title: 'Error', description: 'Failed to delete batch', variant: 'destructive' });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Layout>
      <div>
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Production</h1>
              <p className="text-sm text-gray-600">Manage production batches and track progress</p>
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
              <Button onClick={handleCreate} className="w-full sm:w-auto bg-primary-600 hover:bg-primary-700 text-white">
                <Plus className="w-4 h-4 mr-2" />
                Create Batch
              </Button>
            </div>
          </div>
        </div>

        <ProductionStatsBoxes
          all={stats.all}
          planned={stats.planned}
          active={stats.active}
          completed={stats.completed}
        />

        <ProductionSectionTabs
          activeSection={activeSection}
          onSectionChange={setActiveSection}
          allCount={stats.all}
          plannedCount={stats.planned}
          activeCount={stats.active}
          completedCount={stats.completed}
        />

        <ProductionFilters
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          priorityFilter={priorityFilter}
          onPriorityFilterChange={setPriorityFilter}
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
            onEdit={handleEdit}
            onDelete={handleDelete}
            canDelete={user?.role === 'admin' || false}
          />
        ) : (
          <ProductionGrid
            batches={filteredBatches}
            onEdit={handleEdit}
            onDelete={handleDelete}
            canDelete={user?.role === 'admin' || false}
          />
        )}

        <ProductionFormDialog
          isOpen={isDialogOpen}
          onClose={() => setIsDialogOpen(false)}
          onSubmit={handleSubmit}
          selectedBatch={selectedBatch}
          submitting={submitting}
        />

        <ProductionDeleteDialog
          isOpen={isDeleteDialogOpen}
          onClose={() => setIsDeleteDialogOpen(false)}
          onConfirm={handleConfirmDelete}
          batch={selectedBatch}
          isDeleting={isDeleting}
        />
      </div>
    </Layout>
  );
}

