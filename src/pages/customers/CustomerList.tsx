import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Loader2, Plus, Grid3x3, List } from 'lucide-react';
import { CustomerService, type Customer, type CreateCustomerData } from '@/services/customerService';
import { OrderService } from '@/services/orderService';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import CustomerStatsBoxes from '@/components/customers/CustomerStatsBoxes';
import CustomerFilters from '@/components/customers/CustomerFilters';
import CustomerTable from '@/components/customers/CustomerTable';
import CustomerGrid from '@/components/customers/CustomerGrid';
import CustomerEmptyState from '@/components/customers/CustomerEmptyState';
import CustomerFormDialog from '@/components/customers/CustomerFormDialog';
import CustomerDeleteDialog from '@/components/customers/CustomerDeleteDialog';
import type { Order } from '@/services/orderService';
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

export default function CustomerList() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState<CreateCustomerData>({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    customer_type: 'individual',
    company_name: '',
    gst_number: '',
    credit_limit: '0.00',
    notes: '',
    permanentAddress: {
      address: '',
      city: '',
      state: '',
      pincode: '',
    },
    deliveryAddress: {
      address: '',
      city: '',
      state: '',
      pincode: '',
    },
    sameAsPermanent: true,
  });

  const [stats, setStats] = useState({
    total: 0,
    business: 0,
    individual: 0,
    totalRevenue: 0,
  });

  useEffect(() => {
    loadCustomers();
    loadOrders();
  }, [searchTerm, typeFilter]);

  useEffect(() => {
    // Apply pagination to filtered customers
    const filtered = allCustomers.filter((customer) => {
      const matchesSearch =
        customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.phone?.includes(searchTerm);
      const matchesType = typeFilter === 'all' || customer.customer_type === typeFilter;
      return matchesSearch && matchesType;
    });

    const start = (page - 1) * limit;
    const end = start + limit;
    setCustomers(filtered.slice(start, end));
  }, [allCustomers, page, limit, searchTerm, typeFilter]);

  const loadOrders = async () => {
    try {
      const { data, error } = await OrderService.getOrders({ limit: 1000 });
      if (error) {
        console.error('Error loading orders:', error);
        setOrders([]);
        return;
      }
      if (data) {
        setOrders(data);
      } else {
        setOrders([]);
      }
    } catch (error) {
      console.error('Error loading orders:', error);
      setOrders([]);
    }
  };

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const { data, error } = await CustomerService.getCustomers({});

      if (error) {
        toast({ title: 'Error', description: error, variant: 'destructive' });
        return;
      }

      if (data) {
        // Sort by created_at descending (newest first)
        const sortedData = [...data].sort((a, b) => {
          const dateA = new Date(a.created_at || 0).getTime();
          const dateB = new Date(b.created_at || 0).getTime();
          return dateB - dateA;
        });

        setAllCustomers(sortedData);

        // Calculate total revenue from orders
        const totalRevenue = orders.reduce((sum, order) => {
          const hasCustomer = data.some(c =>
            (order.customerId && order.customerId === c.id) ||
            (!order.customerId && c.name && order.customerName?.toLowerCase().trim() === c.name.toLowerCase().trim())
          );

          if (hasCustomer && order.totalAmount) {
            return sum + Number(order.totalAmount);
          }
          return sum;
        }, 0);

        setStats({
          total: data.length,
          business: data.filter((c) => c.customer_type === 'business').length,
          individual: data.filter((c) => c.customer_type === 'individual').length,
          totalRevenue: totalRevenue,
        });
      }
    } catch (error) {
      console.error('Error loading customers:', error);
      toast({ title: 'Error', description: 'Failed to load customers', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      state: '',
      pincode: '',
      customer_type: 'individual',
      company_name: '',
      gst_number: '',
      notes: '',
      permanentAddress: {
        address: '',
        city: '',
        state: '',
        pincode: '',
      },
      deliveryAddress: {
        address: '',
        city: '',
        state: '',
        pincode: '',
      },
      sameAsPermanent: true,
    });
    setSelectedCustomer(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (customer: Customer) => {
    setSelectedCustomer(customer);

    // Parse JSON address fields if they exist
    let permanentAddr = { address: '', city: '', state: '', pincode: '' };
    let deliveryAddr = { address: '', city: '', state: '', pincode: '' };

    if (customer.permanent_address) {
      try {
        permanentAddr = JSON.parse(customer.permanent_address);
      } catch (e) {
        // Fallback to old fields
        permanentAddr = {
          address: customer.address || '',
          city: customer.city || '',
          state: customer.state || '',
          pincode: customer.pincode || '',
        };
      }
    } else {
      // Use old fields as permanent address
      permanentAddr = {
        address: customer.address || '',
        city: customer.city || '',
        state: customer.state || '',
        pincode: customer.pincode || '',
      };
    }

    if (customer.delivery_address) {
      try {
        deliveryAddr = JSON.parse(customer.delivery_address);
      } catch (e) {
        deliveryAddr = permanentAddr;
      }
    } else {
      deliveryAddr = permanentAddr;
    }

    setFormData({
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      address: customer.address || '',
      city: customer.city || '',
      state: customer.state || '',
      pincode: customer.pincode || '',
      customer_type: customer.customer_type,
      company_name: customer.company_name || '',
      gst_number: customer.gst_number || '',
      notes: customer.notes || '',
      permanentAddress: permanentAddr,
      deliveryAddress: deliveryAddr,
      sameAsPermanent: JSON.stringify(permanentAddr) === JSON.stringify(deliveryAddr),
    });
    setIsDialogOpen(true);
  };

  const handleView = (customer: Customer) => {
    navigate(`/customers/${customer.id}`);
  };

  const handleDelete = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsDeleteDialogOpen(true);
  };




  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.phone.trim()) {
      toast({ title: 'Validation Error', description: 'Please fill in required fields (Name and Phone)', variant: 'destructive' });
      return;
    }

    // Validate GST number if provided
    if (formData.gst_number && formData.gst_number.trim().length > 0 && formData.gst_number.length !== 15) {
      toast({ title: 'Validation Error', description: 'GST number must be exactly 15 characters', variant: 'destructive' });
      return;
    }

    try {
      setSubmitting(true);

      // Prepare data with serialized addresses
      const submitData = {
        ...formData,
        permanent_address: formData.permanentAddress ? JSON.stringify(formData.permanentAddress) : undefined,
        delivery_address: formData.deliveryAddress ? JSON.stringify(formData.deliveryAddress) : undefined,
        // Backward compatibility - keep old fields
        address: formData.permanentAddress?.address || formData.address,
        city: formData.permanentAddress?.city || formData.city,
        state: formData.permanentAddress?.state || formData.state,
        pincode: formData.permanentAddress?.pincode || formData.pincode,
      };

      // Remove form-only fields
      delete submitData.permanentAddress;
      delete submitData.deliveryAddress;
      delete submitData.sameAsPermanent;

      if (selectedCustomer) {
        const { data, error} = await CustomerService.updateCustomer(selectedCustomer.id, submitData);
        if (error) {
          toast({ title: 'Error', description: error, variant: 'destructive' });
          return;
        }
        if (data) {
          toast({ title: 'Success', description: 'Customer updated successfully' });
          setIsDialogOpen(false);
          loadCustomers();
        }
      } else {
        const { data, error } = await CustomerService.createCustomer(submitData);
        if (error) {
          toast({ title: 'Error', description: error, variant: 'destructive' });
          return;
        }
        if (data) {
          toast({ title: 'Success', description: 'Customer created successfully' });
          setIsDialogOpen(false);
          loadCustomers();
        }
      }
    } catch (error) {
      console.error('Error saving customer:', error);
      toast({ title: 'Error', description: 'Failed to save customer', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedCustomer) return;
    setIsDeleting(true);
    try {
      const { data, error } = await CustomerService.deleteCustomer(selectedCustomer.id);
      if (error) {
        toast({ title: 'Error', description: error, variant: 'destructive' });
        return;
      }
      if (data) {
        toast({ title: 'Success', description: 'Customer deleted successfully' });
        setIsDeleteDialogOpen(false);
        setSelectedCustomer(null);
        loadCustomers();
      }
    } catch (error) {
      console.error('Error deleting customer:', error);
      toast({ title: 'Error', description: 'Failed to delete customer', variant: 'destructive' });
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
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Customers</h1>
              <p className="text-sm text-gray-600">Manage your customer database</p>
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
                Add Customer
              </Button>
            </div>
          </div>
        </div>

        <CustomerStatsBoxes
          total={stats.total}
          business={stats.business}
          individual={stats.individual}
          totalRevenue={stats.totalRevenue}
        />

        <CustomerFilters
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          typeFilter={typeFilter}
          onTypeFilterChange={setTypeFilter}
        />

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
          </div>
        ) : customers.length === 0 ? (
          <CustomerEmptyState onCreate={handleCreate} />
        ) : viewMode === 'table' ? (
          <CustomerTable
            customers={customers}
            onView={handleView}
            onEdit={handleEdit}
            onDelete={handleDelete}
            canDelete={user?.role === 'admin' || false}
          />
        ) : (
          <CustomerGrid
            customers={customers}
            orders={orders}
            onEdit={handleEdit}
            onDelete={handleDelete}
            canDelete={user?.role === 'admin' || false}
          />
        )}

        {/* Pagination */}
        {!loading && customers.length > 0 && (() => {
          const filtered = allCustomers.filter((customer) => {
            const matchesSearch =
              customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
              customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
              customer.phone?.includes(searchTerm);
            const matchesType = typeFilter === 'all' || customer.customer_type === typeFilter;
            return matchesSearch && matchesType;
          });
          const totalCustomers = filtered.length;
          const totalPages = Math.ceil(totalCustomers / limit);
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
                  Showing {(page - 1) * limit + 1} to {Math.min(page * limit, totalCustomers)} of {totalCustomers} customers
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

        <CustomerFormDialog
          isOpen={isDialogOpen}
          onClose={() => setIsDialogOpen(false)}
          onSubmit={handleSubmit}
          formData={formData}
          onFormDataChange={setFormData}
          selectedCustomer={selectedCustomer}
          submitting={submitting}
        />

        <CustomerDeleteDialog
          isOpen={isDeleteDialogOpen}
          onClose={() => setIsDeleteDialogOpen(false)}
          onConfirm={handleConfirmDelete}
          customer={selectedCustomer}
          isDeleting={isDeleting}
        />
      </div>
    </Layout>
  );
}
