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
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function SupplierList() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [allSuppliers, setAllSuppliers] = useState<Supplier[]>([]);
  const [orders, setOrders] = useState<StockOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  
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

  useEffect(() => {
    // Apply pagination to filtered suppliers
    const filtered = allSuppliers.filter((supplier) => {
      const matchesSearch =
        supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        supplier.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        supplier.phone?.includes(searchTerm);
      const matchesStatus = statusFilter === 'all' || supplier.status === statusFilter;
      return matchesSearch && matchesStatus;
    });

    const start = (page - 1) * limit;
    const end = start + limit;
    setSuppliers(filtered.slice(start, end));
  }, [allSuppliers, page, limit, searchTerm, statusFilter]);

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
      const { data, error } = await SupplierService.getSuppliers({});

      if (error) {
        toast({ title: 'Error', description: error, variant: 'destructive' });
        return;
      }

      if (data) {
        setAllSuppliers(data);
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

        {/* Pagination */}
        {!loading && suppliers.length > 0 && (() => {
          const filtered = allSuppliers.filter((supplier) => {
            const matchesSearch =
              supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
              supplier.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
              supplier.phone?.includes(searchTerm);
            const matchesStatus = statusFilter === 'all' || supplier.status === statusFilter;
            return matchesSearch && matchesStatus;
          });
          const totalSuppliers = filtered.length;
          const totalPages = Math.ceil(totalSuppliers / limit);
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
                  Showing {(page - 1) * limit + 1} to {Math.min(page * limit, totalSuppliers)} of {totalSuppliers} suppliers
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs sm:text-sm text-gray-600 whitespace-nowrap">Per page:</label>
                  <Select
                    value={limit.toString()}
                    onValueChange={(value) => {
                      setLimit(parseInt(value));
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
