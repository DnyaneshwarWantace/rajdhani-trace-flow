import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Loader2, Plus, Grid3x3, List } from 'lucide-react';
import { SupplierService, type Supplier, type CreateSupplierData } from '@/services/supplierService';
import { ManageStockService, type StockOrder } from '@/services/manageStockService';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import SupplierStatsBoxes from '@/components/suppliers/SupplierStatsBoxes';
import SupplierFilters from '@/components/suppliers/SupplierFilters';
import SupplierTable from '@/components/suppliers/SupplierTable';
import SupplierGrid from '@/components/suppliers/SupplierGrid';
import SupplierEmptyState from '@/components/suppliers/SupplierEmptyState';
import SupplierFormDialog from '@/components/suppliers/SupplierFormDialog';
import SupplierDeleteDialog from '@/components/suppliers/SupplierDeleteDialog';

export default function SupplierList() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [orders, setOrders] = useState<StockOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState<CreateSupplierData>({
    name: '',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    gst_number: '',
  });

  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    totalOrders: 0,
    totalValue: 0,
  });

  useEffect(() => {
    loadSuppliers();
    loadOrders();
  }, [searchTerm, statusFilter]);

  const loadOrders = async () => {
    try {
      const { data } = await ManageStockService.getOrders({ limit: 1000 });
      if (data) {
        setOrders(data);
      }
    } catch (error) {
      console.error('Error loading orders:', error);
      setOrders([]);
    }
  };

  const loadSuppliers = async () => {
    try {
      setLoading(true);
      const { data, error } = await SupplierService.getSuppliers({
        search: searchTerm,
        status: statusFilter !== 'all' ? statusFilter : undefined,
      });

      if (error) {
        toast({ title: 'Error', description: error, variant: 'destructive' });
        return;
      }

      if (data) {
        setSuppliers(data);
        setStats({
          total: data.length,
          active: data.filter((s) => s.status === 'active').length,
          totalOrders: data.reduce((sum, s) => sum + (s.total_orders || 0), 0),
          totalValue: data.reduce((sum, s) => sum + (s.total_value || 0), 0),
        });
      }
    } catch (error) {
      console.error('Error loading suppliers:', error);
      toast({ title: 'Error', description: 'Failed to load suppliers', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setFormData({
      name: '',
      contact_person: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      state: '',
      pincode: '',
      gst_number: '',
    });
    setSelectedSupplier(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setFormData({
      name: supplier.name,
      contact_person: supplier.contact_person || '',
      email: supplier.email || '',
      phone: supplier.phone || '',
      address: supplier.address || '',
      city: supplier.city || '',
      state: supplier.state || '',
      pincode: supplier.pincode || '',
      gst_number: supplier.gst_number || '',
    });
    setIsDialogOpen(true);
  };

  const handleView = (supplier: Supplier) => {
    navigate(`/suppliers/${supplier.id}`);
  };

  const handleDelete = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setIsDeleteDialogOpen(true);
  };


  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast({ title: 'Validation Error', description: 'Please fill in required field: Name', variant: 'destructive' });
      return;
    }

    // Validate GST number if provided
    if (formData.gst_number && formData.gst_number.trim().length > 0 && formData.gst_number.length !== 15) {
      toast({ title: 'Validation Error', description: 'GST number must be exactly 15 characters', variant: 'destructive' });
      return;
    }

    try {
      setSubmitting(true);
      if (selectedSupplier) {
        const { data, error } = await SupplierService.updateSupplier(selectedSupplier.id, formData);
        if (error) {
          toast({ title: 'Error', description: error, variant: 'destructive' });
          return;
        }
        if (data) {
          toast({ title: 'Success', description: 'Supplier updated successfully' });
          setIsDialogOpen(false);
          loadSuppliers();
        }
      } else {
        const { data, error } = await SupplierService.createSupplier(formData);
        if (error) {
          toast({ title: 'Error', description: error, variant: 'destructive' });
          return;
        }
        if (data) {
          toast({ title: 'Success', description: 'Supplier created successfully' });
          setIsDialogOpen(false);
          loadSuppliers();
        }
      }
    } catch (error) {
      console.error('Error saving supplier:', error);
      toast({ title: 'Error', description: 'Failed to save supplier', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedSupplier) return;
    setIsDeleting(true);
    try {
      const { data, error } = await SupplierService.deleteSupplier(selectedSupplier.id);
      if (error) {
        toast({ title: 'Error', description: error, variant: 'destructive' });
        return;
      }
      if (data) {
        toast({ title: 'Success', description: 'Supplier deleted successfully' });
        setIsDeleteDialogOpen(false);
        setSelectedSupplier(null);
        loadSuppliers();
      }
    } catch (error) {
      console.error('Error deleting supplier:', error);
      toast({ title: 'Error', description: 'Failed to delete supplier', variant: 'destructive' });
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
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Suppliers</h1>
              <p className="text-sm text-gray-600">Manage your supplier database</p>
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
                Add Supplier
              </Button>
            </div>
          </div>
        </div>

        <SupplierStatsBoxes
          total={stats.total}
          active={stats.active}
          totalOrders={stats.totalOrders}
          totalValue={stats.totalValue}
        />

        <SupplierFilters
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
        />

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
          </div>
        ) : suppliers.length === 0 ? (
          <SupplierEmptyState onCreate={handleCreate} />
        ) : viewMode === 'table' ? (
          <SupplierTable
            suppliers={suppliers}
            onView={handleView}
            onEdit={handleEdit}
            onDelete={handleDelete}
            canDelete={user?.role === 'admin' || false}
          />
        ) : (
          <SupplierGrid
            suppliers={suppliers}
            orders={orders}
            onEdit={handleEdit}
            onDelete={handleDelete}
            canDelete={user?.role === 'admin' || false}
          />
        )}


        <SupplierFormDialog
          isOpen={isDialogOpen}
          onClose={() => setIsDialogOpen(false)}
          onSubmit={handleSubmit}
          formData={formData}
          onFormDataChange={setFormData}
          selectedSupplier={selectedSupplier}
          submitting={submitting}
        />

        <SupplierDeleteDialog
          isOpen={isDeleteDialogOpen}
          onClose={() => setIsDeleteDialogOpen(false)}
          onConfirm={handleConfirmDelete}
          supplier={selectedSupplier}
          isDeleting={isDeleting}
        />
      </div>
    </Layout>
  );
}
