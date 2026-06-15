import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Loader2, Plus, Grid3x3, List, Upload } from 'lucide-react';
import { SupplierService, type Supplier, type CreateSupplierData } from '@/services/supplierService';
import { ManageStockService, type StockOrder } from '@/services/manageStockService';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { isValidPhoneNumber } from 'libphonenumber-js';
import SupplierStatsBoxes from '@/components/suppliers/SupplierStatsBoxes';
import SupplierFilters from '@/components/suppliers/SupplierFilters';
import SupplierTable from '@/components/suppliers/SupplierTable';
import SupplierGrid from '@/components/suppliers/SupplierGrid';
import SupplierEmptyState from '@/components/suppliers/SupplierEmptyState';
import { canView, canCreate } from '@/utils/permissions';
import PermissionDenied from '@/components/ui/PermissionDenied';
import SupplierFormDialog from '@/components/suppliers/SupplierFormDialog';
import SupplierDeleteDialog from '@/components/suppliers/SupplierDeleteDialog';
import BulkSupplierUploadDialog from '@/components/suppliers/BulkSupplierUploadDialog';
import { useLiveSyncRefresh } from '@/hooks/useLiveSyncRefresh';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination-primitives';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

function fmtDate(d?: string) {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' });
  } catch {
    return d;
  }
}

function inrShort(n: number): string {
  if (n == null || isNaN(n)) return '—';
  const a = Math.abs(n);
  if (a >= 1e7) return '₹' + (n / 1e7).toFixed(2).replace(/\.00$/, '') + 'Cr';
  if (a >= 1e5) return '₹' + (n / 1e5).toFixed(2).replace(/\.00$/, '') + 'L';
  if (a >= 1e3) return '₹' + (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'K';
  return '₹' + n.toLocaleString('en-IN');
}

export default function SupplierList() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [allSuppliers, setAllSuppliers] = useState<Supplier[]>([]);
  const [orders, setOrders] = useState<StockOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
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
    totalOrders: 0,
    totalValue: 0,
  });

  useEffect(() => {
    loadSuppliers();
    loadOrders();
  }, []);


  useEffect(() => {
    // Apply pagination to filtered suppliers
    const filtered = allSuppliers.filter((supplier) => {
      const matchesSearch =
        supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        supplier.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        supplier.phone?.includes(searchTerm);
      return matchesSearch;
    });

    const start = (page - 1) * limit;
    const end = start + limit;
    setSuppliers(filtered.slice(start, end));
  }, [allSuppliers, page, limit, searchTerm]);

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
        search: searchTerm || undefined,
      });

      if (error) {
        toast({ title: 'Error', description: error, variant: 'destructive' });
        return;
      }

      if (data) {
        setAllSuppliers(data);
        setStats({
          total: data.length,
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

  useLiveSyncRefresh({
    modules: ['suppliers', 'manage_stock', 'materials'],
    onRefresh: () => {
      loadSuppliers();
      loadOrders();
    },
    pollingMs: 6000,
  });

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

    // Phone validation - REQUIRED FIELD
    if (!formData.phone || formData.phone.trim() === '' || formData.phone.trim() === '+91') {
      toast({ title: 'Validation Error', description: 'Please fill in required field: Phone Number', variant: 'destructive' });
      return;
    }

    // Phone validation - check if it's just a country code
    const isJustCountryCode = /^\+\d{1,4}$/.test(formData.phone.trim());
    if (isJustCountryCode) {
      toast({ title: 'Validation Error', description: 'Please enter a complete phone number', variant: 'destructive' });
      return;
    }

    // Phone validation using libphonenumber-js (validates according to country code)
    if (!isValidPhoneNumber(formData.phone)) {
      toast({ title: 'Validation Error', description: 'Please enter a valid phone number for the selected country', variant: 'destructive' });
      return;
    }

    // Validate GST number if provided (only check length, not format pattern)
    const cleanGST = formData.gst_number?.replace(/[^a-zA-Z0-9]/g, '').toUpperCase() || '';
    if (formData.gst_number && formData.gst_number.trim().length > 0 && cleanGST.length !== 15) {
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


  if (!canView('suppliers')) {
    return <Layout><PermissionDenied /></Layout>;
  }

  return (
    <Layout>
      <div>
        {/* ─── DESKTOP layout ────────────────────────────────────────────── */}
        <div className="hidden lg:block">
          {/* Desktop header */}
          <div className="mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Suppliers</h1>
                <p className="text-sm text-gray-600">Manage your supplier database</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 border border-gray-300 rounded-lg p-0">
                  <Button variant={viewMode === 'table' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('table')} className={`h-10 w-10 p-0 ${viewMode === 'table' ? 'bg-primary-600 text-white' : ''}`}><List className="w-4 h-4" /></Button>
                  <Button variant={viewMode === 'grid' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('grid')} className={`h-10 w-10 p-0 ${viewMode === 'grid' ? 'bg-primary-600 text-white' : ''}`}><Grid3x3 className="w-4 h-4" /></Button>
                </div>
                {canCreate('suppliers') && (
                  <>
                    <Button variant="outline" onClick={() => setIsBulkUploadOpen(true)} className="w-full sm:w-auto"><Upload className="w-4 h-4 mr-2" />Import</Button>
                    <Button onClick={handleCreate} className="w-full sm:w-auto bg-primary-600 hover:bg-primary-700 text-white"><Plus className="w-4 h-4 mr-2" />Add Supplier</Button>
                  </>
                )}
              </div>
            </div>
          </div>

          <SupplierStatsBoxes total={stats.total} totalOrders={stats.totalOrders} totalValue={stats.totalValue} />
          <SupplierFilters searchTerm={searchTerm} onSearchChange={setSearchTerm} />

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
            </div>
          ) : suppliers.length === 0 ? (
            <SupplierEmptyState onCreate={handleCreate} />
          ) : (
            <>
              {viewMode === 'table' ? (
                <SupplierTable suppliers={suppliers} onView={handleView} onEdit={handleEdit} onDelete={handleDelete} canDelete={user?.role === 'admin' || user?.role === 'super-admin'} />
              ) : (
                <SupplierGrid suppliers={suppliers} orders={orders} onEdit={handleEdit} onDelete={handleDelete} canDelete={user?.role === 'admin' || user?.role === 'super-admin'} />
              )}

              {/* Desktop pagination */}
              {(() => {
                const filtered = allSuppliers.filter((supplier) => {
                  const matchesSearch =
                    supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    supplier.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    supplier.phone?.includes(searchTerm);
                  return matchesSearch;
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
            </>
          )}
        </div>

        {/* ─── MOBILE layout ──────────────────────────────────────────────── */}
        <div className="lg:hidden -m-2 sm:-m-3 flex flex-col min-h-screen bg-gray-50 pb-24">
          {/* White header block — matches app */}
          <div className="bg-white border-b border-gray-200 px-4 pt-3 pb-3">
            {/* Title row */}
            <div className="flex items-center justify-between mb-0.5">
              <h1 className="text-2xl font-bold text-gray-900">Suppliers</h1>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsBulkUploadOpen(true)}
                  className="w-9 h-9 border border-gray-200 rounded-xl bg-white flex items-center justify-center text-gray-600 active:bg-gray-50 transition-colors"
                  title="Import CSV"
                >
                  <Upload className="w-4 h-4" />
                </button>
                {canCreate('suppliers') && (
                  <button
                    onClick={handleCreate}
                    className="flex items-center justify-center w-9 h-9 rounded-xl bg-[#0066FF] text-white active:bg-blue-700 transition-colors shadow-sm"
                    title="Add Supplier"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
            <p className="text-xs text-gray-400 mb-2">{stats.total.toLocaleString()} suppliers</p>

            {/* Stats strip — single bordered row like the app */}
            <div className="flex border border-gray-200 rounded-xl overflow-hidden bg-white text-center">
              {[
                { label: 'Total', value: stats.total, color: 'text-gray-900' },
                { label: 'Orders', value: stats.totalOrders, color: 'text-orange-600' },
                { label: 'Value', value: inrShort(stats.totalValue), color: 'text-green-600' },
              ].map((s, i) => (
                <div
                  key={s.label}
                  className={`flex-1 flex flex-col items-center py-1.5 ${i > 0 ? 'border-l border-gray-200' : ''}`}
                >
                  <span className={`text-sm font-extrabold tracking-tight ${s.color}`}>
                    {loading ? '…' : s.value}
                  </span>
                  <span className="text-[9px] text-gray-400 font-medium mt-0.5 uppercase tracking-wide">
                    {s.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Search bar */}
          <div className="px-4 pt-2.5 pb-1">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.35-4.35"/></svg>
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search suppliers..."
                className="w-full pl-9 pr-4 h-[44px] rounded-xl border border-gray-200 bg-white text-[14px] font-medium placeholder-gray-400 outline-none focus:border-blue-400 shadow-sm transition-colors"
              />
            </div>
          </div>

          {/* List Content */}
          <div className="px-4 pb-12 flex flex-col gap-3">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
              </div>
            ) : suppliers.length === 0 ? (
              <SupplierEmptyState onCreate={handleCreate} />
            ) : (
              <>
                {suppliers.map(supplier => {
                  const location = [supplier.city, supplier.state].filter(Boolean).join(', ');
                  return (
                    <div
                      key={supplier.id}
                      className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm"
                    >
                      <div onClick={() => handleView(supplier)} className="p-4 cursor-pointer active:bg-gray-50 transition-colors">
                        <div className="flex items-start gap-3">
                          <div className="w-11 h-11 rounded-xl bg-green-50 flex items-center justify-center text-green-600 font-extrabold text-lg shrink-0 select-none">
                            {supplier.name[0]?.toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-[14px] font-extrabold text-gray-900 leading-tight truncate">{supplier.name}</h4>
                            <span className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-wider block">Supplier</span>
                            {supplier.contact_person && (
                              <p className="text-[12px] text-gray-500 font-medium mt-1 truncate">Contact: {supplier.contact_person}</p>
                            )}
                            
                            <div className="space-y-1 mt-2.5">
                              {supplier.phone && (
                                <div className="flex items-center gap-2 text-[11.5px] text-gray-500 font-semibold">
                                  <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
                                  <span>{supplier.phone}</span>
                                </div>
                              )}
                              {supplier.email && (
                                <div className="flex items-center gap-2 text-[11.5px] text-gray-500 font-semibold truncate">
                                  <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="m3 8 7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                                  <span className="truncate">{supplier.email}</span>
                                </div>
                              )}
                              {location && (
                                <div className="flex items-center gap-2 text-[11.5px] text-gray-500 font-semibold truncate">
                                  <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                                  <span className="truncate">{location}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Info stats row */}
                      <div className="grid grid-cols-3 gap-2 mt-4 pt-3.5 border-t border-gray-100 text-center">
                        <div>
                          <span className="text-[13px] font-extrabold text-gray-900 leading-none block">{supplier.total_orders ?? 0}</span>
                          <span className="text-[9.5px] text-gray-400 font-bold mt-1 uppercase tracking-wider block">Orders</span>
                        </div>
                        <div className="border-l border-gray-100">
                          <span className="text-[13px] font-extrabold text-gray-900 leading-none block">{inrShort(Number(supplier.total_value || 0))}</span>
                          <span className="text-[9.5px] text-gray-400 font-bold mt-1 uppercase tracking-wider block">Value</span>
                        </div>
                        <div className="border-l border-gray-100">
                          <span className="text-[12px] font-extrabold text-gray-900 leading-none block truncate px-0.5">{fmtDate(supplier.created_at)}</span>
                          <span className="text-[9.5px] text-gray-400 font-bold mt-1 uppercase tracking-wider block">Since</span>
                        </div>
                      </div>

                      {/* Action footer */}
                      <div className="flex border-t border-gray-100 bg-gray-50/50">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleView(supplier); }}
                          className="flex-1 h-10 flex items-center justify-center gap-1.5 text-[12.5px] text-gray-700 font-bold active:bg-gray-100 transition-colors border-r border-gray-100"
                        >
                          <svg className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z"/><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"/></svg>
                          <span>View</span>
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleEdit(supplier); }}
                          className="flex-1 h-10 flex items-center justify-center gap-1.5 text-[12.5px] text-[#0066FF] font-bold active:bg-gray-100 transition-colors"
                        >
                          <svg className="w-3.5 h-3.5 text-[#0066FF]" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.83 20.013a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125"/></svg>
                          <span>Edit</span>
                        </button>
                      </div>
                    </div>
                  );
                })}

                {/* Mobile Pagination */}
                {(() => {
                  const filtered = allSuppliers.filter((supplier) => {
                    const matchesSearch =
                      supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      supplier.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      supplier.phone?.includes(searchTerm);
                    return matchesSearch;
                  });
                  const totalSuppliers = filtered.length;
                  const totalPages = Math.ceil(totalSuppliers / limit);
                  if (totalPages <= 1) return null;
                  return (
                    <div className="mt-4 flex items-center justify-between px-1">
                      <button
                        onClick={() => page > 1 && setPage(page - 1)}
                        disabled={page === 1}
                        className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-semibold text-gray-700 disabled:opacity-50 active:bg-gray-50"
                      >
                        Previous
                      </button>
                      <span className="text-xs text-gray-500 font-medium">
                        Page {page} of {totalPages}
                      </span>
                      <button
                        onClick={() => page < totalPages && setPage(page + 1)}
                        disabled={page >= totalPages}
                        className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-semibold text-gray-700 disabled:opacity-50 active:bg-gray-50"
                      >
                        Next
                      </button>
                    </div>
                  );
                })()}
              </>
            )}
          </div>
        </div>

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

        <BulkSupplierUploadDialog
          open={isBulkUploadOpen}
          onOpenChange={setIsBulkUploadOpen}
          onSuccess={loadSuppliers}
        />
      </div>
    </Layout>
  );
}
